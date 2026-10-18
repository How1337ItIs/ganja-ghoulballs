/** Independent local review probes. No RPC, signing, or production transfers. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import solc from 'solc';
import {Interface,AbiCoder} from 'ethers';
import {createVM} from '@ethereumjs/vm';
import {createCustomCommon,Mainnet,Hardfork} from '@ethereumjs/common';
import {createAddressFromString,hexToBytes,bytesToHex,Account} from '@ethereumjs/util';
const root=path.resolve(import.meta.dirname,'..');
const actors=['0x1111111111111111111111111111111111111111','0x2222222222222222222222222222222222222222','0x3333333333333333333333333333333333333333'];
const source=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface Receiver { function onERC721Received(address,address,uint256,bytes calldata) external returns(bytes4); }
contract ReviewSource {
 mapping(uint256=>address) public ownerOf;
 mapping(uint256=>address) public getApproved;
 mapping(address=>mapping(address=>bool)) public isApprovedForAll;
 uint public totalSupply; uint public mode; uint public first; uint public last;
 function supportsInterface(bytes4 id) external pure returns(bool){return id==0x80ac58cd || id==0x01ffc9a7;}
 function give(address to,uint start,uint count) external {for(uint i;i<count;i++){require(ownerOf[start+i]==address(0));ownerOf[start+i]=to;totalSupply++;}}
 function setApprovalForAll(address op,bool ok) external {isApprovedForAll[msg.sender][op]=ok;}
 function configure(uint m,uint f,uint l) external {mode=m;first=f;last=l;}
 function safeTransferFrom(address from,address to,uint id) external {
  require(ownerOf[id]==from && (msg.sender==from || isApprovedForAll[from][msg.sender] || getApproved[id]==msg.sender));
  if(mode==1 && id==last) revert("last transfer fails");
  if(mode!=2 || id!=last)ownerOf[id]=to;
  // Malformed source takes back an earlier deposit only after the final transfer.
  if(mode==3 && id==last)ownerOf[first]=from;
  require(Receiver(to).onERC721Received(msg.sender,from,id,"")==0x150b7a02);
 }
}
`;
const contractPaths=fs.readdirSync(path.join(root,'contracts')).filter(n=>n.endsWith('.sol')).sort().map(n=>'contracts/'+n);
const sources=Object.fromEntries(contractPaths.map(p=>[p,{content:fs.readFileSync(path.join(root,p),'utf8')}]));
const input=JSON.parse(fs.readFileSync(path.join(root,'solc-settings.json')));
input.sources={...sources,'ReviewSource.sol':{content:source}};
input.settings.outputSelection={'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}};
const output=JSON.parse(solc.compile(JSON.stringify(input)));
for(const e of output.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
const arts={};for(const cs of Object.values(output.contracts))for(const [name,c]of Object.entries(cs))arts[name]={...c,iface:new Interface(c.abi)};
const addr=createAddressFromString;
const vm=await createVM({common:createCustomCommon({chainId:31337},Mainnet,{hardfork:Hardfork.Cancun})});
for(const a of actors)await vm.stateManager.putAccount(addr(a),new Account(0n,10n**24n));
const checks=[];let assertions=0;
function eq(actual,expected,label){assert.deepEqual(actual,expected,label);assertions++;}
async function raw({to,from=actors[0],data='0x',value=0n,isStatic=false}={}){
 await vm.evm.journal.cleanup();
 const r=await vm.evm.runCall({caller:addr(from),origin:addr(from),...(to?{to:addr(to)}:{}),data:hexToBytes(data),value,gasLimit:50000000n,isStatic});
 return {ok:!r.execResult.exceptionError,data:bytesToHex(r.execResult.returnValue),created:r.createdAddress?.toString()};
}
async function deploy(name,args=[]){const a=arts[name];const c=a.abi.find(x=>x.type==='constructor');const tail=c?.inputs.length?AbiCoder.defaultAbiCoder().encode(c.inputs.map(x=>x.type),args).slice(2):'';const r=await raw({data:'0x'+a.evm.bytecode.object+tail});eq(r.ok,true,'deploy '+name);return {address:r.created,a};}
async function call(c,name,args=[],opts={}){const r=await raw({to:c.address,data:c.a.iface.encodeFunctionData(name,args),...opts});if(r.ok)r.values=c.a.iface.decodeFunctionResult(name,r.data);return r;}
async function read(c,name,args=[]){const r=await call(c,name,args,{isStatic:true});eq(r.ok,true,'read '+name);return r.values[0];}
async function ok(c,name,args=[],opts={}){const r=await call(c,name,args,opts);eq(r.ok,true,name+' succeeds');return r;}
async function fail(c,name,args=[],opts={}){const r=await call(c,name,args,opts);eq(r.ok,false,name+' reverts');return r;}
const og=await deploy('ReviewSource');const goo=await deploy('GanjaGhoulballs',[og.address]);
const graveyard=(await read(goo,'graveyard')).toLowerCase();
const ids=first=>Array.from({length:13},(_,i)=>BigInt(first+i));
await ok(og,'give',[actors[0],1,26]);await ok(og,'setApprovalForAll',[goo.address,true]);
// Final-custody checks must catch both a no-op transfer and theft of an earlier deposit.
for(const mode of [1,2,3]){
 await ok(og,'configure',[mode,1,13]);await fail(goo,'mint',[ids(1)]);
 eq(await read(goo,'totalSupply'),0n,'supply rollback');
 for(const id of ids(1))eq((await read(og,'ownerOf',[id])).toLowerCase(),actors[0],'all deposits rolled back');
}
checks.push('Final-transfer revert, silent no-op, and late theft of an earlier ingredient all roll back every deposit');
await ok(og,'configure',[0,0,0]);
await fail(goo,'mint',[ids(1)],{value:1n});eq(await read(goo,'totalSupply'),0n,'nonzero ETH rejected');
await ok(goo,'mint',[ids(1)]);await ok(goo,'mint',[ids(14)]);
checks.push('Mint rejects 1 wei and allows repeated successful redemptions by the same wallet');
// Distinct owner authorization is independent of having operator approval.
await ok(og,'give',[actors[1],27,13]);await ok(og,'setApprovalForAll',[goo.address,true],{from:actors[1]});
await ok(og,'setApprovalForAll',[actors[0],true],{from:actors[1]});
await fail(goo,'mint',[ids(27)]);eq((await read(og,'ownerOf',[27])).toLowerCase(),actors[1],'operator cannot redeem somebody else');
await ok(goo,'mint',[ids(27)],{from:actors[1]});
checks.push('Source operator authorization does not let an operator sacrifice another owner’s NFTs');
// Keep a separate ownership model while exercising authorization and approval clearing.
const owners=new Map([[1,actors[0]],[2,actors[0]],[3,actors[1]]]);
const provenance=new Map();const seeds=new Map();
for(let id=1;id<=3;id++){provenance.set(id,[...(await read(goo,'ingredientsOf',[id]))]);seeds.set(id,await read(goo,'seedOf',[id]));}
let rng=0x713420;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;};
for(let round=0;round<120;round++){
 const id=1+random()%3;const owner=owners.get(id);const dest=actors[random()%3];const stranger=actors.find(a=>a!==owner);const mode=random()%4;
 // Explicitly revoke old operators so a negative attempt is unambiguously unauthorized.
 for(const a of actors)await ok(goo,'setApprovalForAll',[a,false],{from:owner});
 await ok(goo,'approve',['0x0000000000000000000000000000000000000000',id],{from:owner});
 await fail(goo,'transferFrom',[owner,dest,id],{from:stranger});
 eq((await read(goo,'ownerOf',[id])).toLowerCase(),owner,'unauthorized transfer state unchanged');
 if(mode===0){await ok(goo,'approve',[stranger,id],{from:owner});await ok(goo,'transferFrom',[owner,dest,id],{from:stranger});}
 else if(mode===1){await ok(goo,'setApprovalForAll',[stranger,true],{from:owner});await ok(goo,'safeTransferFrom(address,address,uint256)',[owner,dest,id],{from:stranger});}
 else if(mode===2){await ok(goo,'safeTransferFrom(address,address,uint256,bytes)',[owner,dest,id,'0x123456'],{from:owner});}
 else await ok(goo,'transferFrom',[owner,dest,id],{from:owner});
 owners.set(id,dest);
 eq((await read(goo,'getApproved',[id])).toLowerCase(),'0x0000000000000000000000000000000000000000','approval clears');
 for(const a of actors)eq(await read(goo,'balanceOf',[a]),BigInt([...owners.values()].filter(x=>x===a).length),'balance model');
 eq(await read(goo,'totalSupply'),3n,'transfer supply fixed');
 eq([...(await read(goo,'ingredientsOf',[id]))],provenance.get(id),'provenance immutable');
 eq(await read(goo,'seedOf',[id]),seeds.get(id),'seed immutable');
}
checks.push('120 deterministic model-based transfer rounds: unauthorized attempts revert; owner/token-approved/operator paths, self-transfer, both safe overloads, balances, approval clearing, supply and provenance hold');
for(let id=1;id<=39;id++)eq((await read(og,'ownerOf',[id])).toLowerCase(),graveyard,'original remains in permanent custody');
const report={scope:'Independent automated local security probes, not a formal audit; no chain RPC, wallet, signing, or live NFTs used',generatedAt:new Date().toISOString(),compiler:solc.version(),sourceSha256:Object.fromEntries(Object.entries(sources).map(([p,s])=>[p,crypto.createHash('sha256').update(s.content).digest('hex')])),assertions,checks,runtimeBytes:Object.fromEntries(['GanjaGhoulballs','GooGraveyard','GooRenderer'].map(n=>[n,arts[n].evm.deployedBytecode.object.length/2]))};
fs.writeFileSync(path.join(root,'reports/security-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
