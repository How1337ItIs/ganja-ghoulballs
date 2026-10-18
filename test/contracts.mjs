import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {AbiCoder, Interface, keccak256} from 'ethers';
import {hexToBytes} from '@ethereumjs/util';
import {root, ALICE, BOB, CAROL, BASE_ORIGINAL, address, artifact, compileMocks, environment, raw, deploy, call, read, ids} from './evm.mjs';

const testedBuild=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const nftArt=artifact('GanjaGhoulballs'), vaultArt=artifact('GooGraveyard'), rendererArt=artifact('GooRenderer'), mocks=compileMocks();
const results=[];
const gas={profile:'EthereumJS Cancun, chain IDs 31337/8453/84532. Execution gas only; excludes transaction intrinsic gas and Base L1 data fee.'};
function errorName(r,iface=nftArt.iface){try{return iface.parseError(r.data)?.name;}catch{return undefined;}}
function success(r,label='call'){assert(r.ok,`${label}: ${r.error} ${r.data}`);return r;}
function reverted(r,expected){assert(!r.ok,'Expected revert');if(expected)assert.equal(errorName(r),expected);return r;}
async function test(name,fn){await fn();results.push(name);console.log('PASS',name);}
const vm=await environment();
const original=await deploy(vm,mocks.MockOriginalGhoulballs);
const nft=await deploy(vm,nftArt,[original.address]);gas.deploymentExecution=nft.deploymentGas.toString();
const vault={address:await read(vm,nft,'graveyard'),artifact:vaultArt};
const renderer={address:await read(vm,nft,'renderer'),artifact:rendererArt};
await call(vm,original,'mintRange',[ALICE,1,500]);
await call(vm,original,'mintRange',[BOB,1001,100]);

await test('immutable constructor wiring, 420 cap, 13 ingredients and ERC165',async()=>{
  assert.equal(await read(vm,nft,'MAX_SUPPLY'),420n); assert.equal(await read(vm,nft,'SACRIFICE_COUNT'),13n);
  assert.equal(await read(vm,nft,'deploymentChainId'),31337n);
  assert.equal((await read(vm,nft,'originalCollection')).toLowerCase(),original.address);
  assert.equal((await read(vm,vault,'originalCollection')).toLowerCase(),original.address);
  assert.equal((await read(vm,vault,'redeemer')).toLowerCase(),nft.address);
  for(const id of ['0x01ffc9a7','0x80ac58cd','0x5b5e139f']) assert.equal(await read(vm,nft,'supportsInterface',[id]),true);
  assert.equal(await read(vm,nft,'supportsInterface',['0xffffffff']),false);
});
await test('nonexistent tokens and zero-address balances revert',async()=>{
  for(const method of ['ownerOf','getApproved','seedOf','ingredientsOf','svg','svgStill','traitsOf','tokenURI']) reverted(await call(vm,nft,method,[0]),'NonexistentToken');
  reverted(await call(vm,nft,'ownerOf',[999]),'NonexistentToken');
  reverted(await call(vm,nft,'balanceOf',['0x'+'00'.repeat(20)]),'ZeroAddress');
});
await test('approval required for all ingredients before any custody changes',async()=>{
  reverted(await call(vm,nft,'mint',[ids()]),'IngredientNotApproved');
  for(let i=1;i<=12;i++)success(await call(vm,original,'approve',[nft.address,i]));
  reverted(await call(vm,nft,'mint',[ids()]),'IngredientNotApproved');
  assert.equal(await read(vm,original,'transferCalls'),0n);
  success(await call(vm,original,'approve',[nft.address,13]));
});
await test('atomic mint with 13 per-token approvals, exact provenance and event',async()=>{
  const r=success(await call(vm,nft,'mint',[ids()])); gas.firstMintPerTokenApproval=r.gas.toString();
  assert.equal(await read(vm,nft,'totalSupply'),1n); assert.equal((await read(vm,nft,'ownerOf',[1])).toLowerCase(),ALICE);
  assert.deepEqual(Array.from(await read(vm,nft,'ingredientsOf',[1])),ids());
  let packed=0n;for(let i=0;i<13;i++)packed|=BigInt(i+1)<<BigInt(i*16);
  assert.equal(await read(vm,nft,'packedIngredients',[1]),packed);
  for(const id of ids())assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),vault.address.toLowerCase());
  assert.equal(await read(vm,original,'totalSupply'),600n);
  const event=r.logs.map(([a,t,d])=>{try{return nftArt.iface.parseLog({topics:t.map(x=>'0x'+Buffer.from(x).toString('hex')),data:'0x'+Buffer.from(d).toString('hex')});}catch{return null;}}).find(x=>x?.name==='GhoulballsSacrificed');
  assert(event);assert.equal(event.args.gooId,1n);assert.deepEqual(Array.from(event.args.originalIds),ids());
});
await test('same wallet can mint again with fresh originals; global approval',async()=>{
  success(await call(vm,original,'setApprovalForAll',[nft.address,true]));
  const r=success(await call(vm,nft,'mint',[ids(14)]));gas.secondMintGlobalApproval=r.gas.toString();
  assert.equal(await read(vm,nft,'totalSupply'),2n);assert.equal(await read(vm,nft,'balanceOf',[ALICE]),2n);
  reverted(await call(vm,nft,'mint',[ids()]),'NotIngredientOwner');
});
await test('fixed array rejects 12/14-item function selectors and truncated calldata',async()=>{
  for(const count of [12,14]){const f=new Interface([`function mint(uint256[${count}])`]);reverted(await raw(vm,{to:nft.address,data:f.encodeFunctionData('mint',[Array.from({length:count},(_,i)=>i+100)])}));}
  reverted(await raw(vm,{to:nft.address,data:nftArt.iface.encodeFunctionData('mint',[ids(27)]).slice(0,-64)}));
});
await test('zero, 6668, maxuint, duplicates and nonascending IDs are rejected atomically',async()=>{
  const cases=[ids(27),ids(27),ids(27),ids(27),ids(27)];cases[0][0]=0n;cases[1][12]=6668n;cases[2][12]=(1n<<256n)-1n;cases[3][5]=cases[3][4];[cases[4][3],cases[4][4]]=[cases[4][4],cases[4][3]];
  for(const a of cases)reverted(await call(vm,nft,'mint',[a]),'WrongIngredientOrder');
  assert.equal(await read(vm,nft,'totalSupply'),2n);assert.equal(await read(vm,original,'transferCalls'),26n);
});
await test('wrong owner, nonexistent source and revoked approvals are rejected',async()=>{
  reverted(await call(vm,nft,'mint',[ids(1001)]),'NotIngredientOwner');
  reverted(await call(vm,nft,'mint',[ids(3000)]));
  success(await call(vm,original,'setApprovalForAll',[nft.address,false]));
  reverted(await call(vm,nft,'mint',[ids(27)]),'IngredientNotApproved');
  success(await call(vm,original,'setApprovalForAll',[nft.address,true]));
});
await test('ETH rejected without transferring source NFTs',async()=>{
  reverted(await call(vm,nft,'mint',[ids(27)],{value:1n}));reverted(await raw(vm,{to:nft.address,value:1n}));
  assert.equal(await read(vm,nft,'totalSupply'),2n);
});
await test('13th transfer failure rolls back every earlier original and all mint state',async()=>{
  success(await call(vm,original,'setFailure',[39,0]));reverted(await call(vm,nft,'mint',[ids(27)]));
  assert.equal(await read(vm,nft,'totalSupply'),2n);assert.equal(await read(vm,original,'transferCalls'),26n);
  for(const id of ids(27))assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),ALICE);
  success(await call(vm,original,'setFailure',[0,0]));
});
await test('source returning success without custody is rejected and rolled back',async()=>{
  success(await call(vm,original,'setFailure',[0,39]));reverted(await call(vm,nft,'mint',[ids(27)]),'IngredientNotLocked');
  for(const id of ids(27))assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),ALICE);
  success(await call(vm,original,'setFailure',[0,0]));
});
await test('late malicious source theft of an earlier deposit is detected',async()=>{
  success(await call(vm,original,'setSteal',[39,27]));reverted(await call(vm,nft,'mint',[ids(27)]),'IngredientNotLocked');
  assert.equal(await read(vm,nft,'totalSupply'),2n);
  for(const id of ids(27))assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),ALICE);
  success(await call(vm,original,'setSteal',[0,0]));
});
await test('source transfer callback cannot reenter mint',async()=>{
  success(await call(vm,original,'setCallback',[nft.address,nftArt.iface.encodeFunctionData('mint',[ids(40)])]));
  success(await call(vm,nft,'mint',[ids(27)]));assert.equal(await read(vm,original,'callbackSucceeded'),false);
  assert.equal(await read(vm,nft,'totalSupply'),3n);success(await call(vm,original,'setCallback',['0x'+'00'.repeat(20),'0x']));
});
await test('vault rejects direct safe deposits, non-source callers, and wrong operators',async()=>{
  reverted(await call(vm,original,'safeTransferFrom',[ALICE,vault.address,40]));
  reverted(await call(vm,vault,'onERC721Received',[nft.address,ALICE,40,'0x']));
  reverted(await call(vm,original,'spoofReceiver',[vault.address,ALICE,ALICE,40]));
  assert.equal((await read(vm,original,'ownerOf',[40])).toLowerCase(),ALICE);
});
await test('raw transfers to vault are irretrievable and do not mint or credit provenance',async()=>{
  success(await call(vm,original,'transferFrom',[ALICE,vault.address,40]));
  assert.equal(await read(vm,nft,'totalSupply'),3n);assert.equal((await read(vm,original,'ownerOf',[40])).toLowerCase(),vault.address.toLowerCase());
  reverted(await call(vm,original,'transferFrom',[vault.address,ALICE,40]));
  const names=vaultArt.abi.filter(x=>x.type==='function').map(x=>x.name).sort();assert.deepEqual(names,['onERC721Received','originalCollection','redeemer']);
});
await test('mint recipient revert and wrong selector roll back 13 originals',async()=>{
  const receiver=await deploy(vm,mocks.MintReceiver);await call(vm,original,'mintRange',[receiver.address,2001,26]);
  for(const mode of [1,2]){
    success(await call(vm,receiver,'configure',[nft.address,mode,ids(2014)]));reverted(await call(vm,receiver,'redeem',[original.address,ids(2001)]));
    for(const id of ids(2001))assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),receiver.address);
    assert.equal(await read(vm,nft,'totalSupply'),3n);
  }
  success(await call(vm,receiver,'configure',[nft.address,3,ids(2014)]));success(await call(vm,receiver,'redeem',[original.address,ids(2001)]));
  assert.equal(await read(vm,receiver,'reentrySucceeded'),false);assert.equal(await read(vm,receiver,'reentryError'),nftArt.iface.getError('Reentered').selector);
  assert.equal(await read(vm,nft,'totalSupply'),4n);
  success(await call(vm,receiver,'configure',[nft.address,4,ids(2014)]));success(await call(vm,receiver,'redeem',[original.address,ids(2014)]));
  assert.equal((await read(vm,nft,'ownerOf',[5])).toLowerCase(),'0x000000000000000000000000000000000000beef');
});
await test('ERC721 authorized transfers, approval clearing and invalid recipient rollback',async()=>{
  reverted(await call(vm,nft,'transferFrom',[ALICE,BOB,1],{from:CAROL}),'NotAuthorized');
  reverted(await call(vm,nft,'transferFrom',[BOB,CAROL,1]),'WrongFrom');
  reverted(await call(vm,nft,'transferFrom',[ALICE,'0x'+'00'.repeat(20),1]),'ZeroAddress');
  success(await call(vm,nft,'approve',[CAROL,1]));success(await call(vm,nft,'transferFrom',[ALICE,BOB,1],{from:CAROL}));
  assert.equal(await read(vm,nft,'getApproved',[1]),'0x'+'00'.repeat(20));
  assert.equal(await read(vm,nft,'balanceOf',[BOB]),1n);
  const non=await deploy(vm,mocks.NonReceiver);
  reverted(await call(vm,nft,'safeTransferFrom(address,address,uint256)',[BOB,non.address,1],{from:BOB}),'NonReceiver');
  assert.equal((await read(vm,nft,'ownerOf',[1])).toLowerCase(),BOB);
  success(await call(vm,nft,'setApprovalForAll',[CAROL,true],{from:BOB}));
  success(await call(vm,nft,'safeTransferFrom(address,address,uint256,bytes)',[BOB,ALICE,1,'0x1234'],{from:CAROL}));
});
await test('immutable seed and metadata provenance match canonical encoding after transfer',async()=>{
  const packed=await read(vm,nft,'packedIngredients',[1]);
  const expected=BigInt(keccak256(AbiCoder.defaultAbiCoder().encode(['string','uint256','address','uint256','uint256'],['GANJA_GHOULBALLS_PIXEL_GOO_V2',31337,nft.address,1,packed])));
  assert.equal(await read(vm,nft,'seedOf',[1]),expected);assert.notEqual(await read(vm,nft,'seedOf',[2]),expected);
  const a=success(await call(vm,nft,'tokenURI',[1],{gasLimit:20000000n,isStatic:true}));gas.tokenURI=a.gas.toString();
  const uri=a.value[0]; const json=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());
  assert.deepEqual(json.properties.original_ids,Array.from({length:13},(_,i)=>i+1));assert.equal(json.properties.chain_id,31337);assert.equal(json.properties.original_collection.toLowerCase(),original.address);
  assert.equal(Buffer.from(json.image.split(',')[1],'base64').toString(),await read(vm,nft,'svg',[1]));
  assert.deepEqual(json.attributes,JSON.parse(await read(vm,nft,'traitsOf',[1])));
  assert(!/(?:https?:|ipfs:)/.test(uri));assert(!/(?:<script|<image|<foreignObject|javascript:)/i.test(Buffer.from(json.image.split(',')[1],'base64').toString()));
  success(await call(vm,nft,'transferFrom',[ALICE,BOB,1]));assert.equal(await read(vm,nft,'seedOf',[1]),expected);assert.equal(await read(vm,nft,'tokenURI',[1]),uri);
});
await test('seed, SVG, traits and metadata remain identical across callers and later block timestamps',async()=>{
  const block={header:{number:123456n,coinbase:address(CAROL),timestamp:1999999999n,difficulty:0n,prevRandao:new Uint8Array(32).fill(77),gasLimit:30000000n,baseFeePerGas:1n,getBlobGasPrice:()=>1n}};
  for(const method of ['seedOf','svg','svgStill','traitsOf','tokenURI']){
    const baseline=await read(vm,nft,method,[1]);
    const changed=await read(vm,nft,method,[1],{from:CAROL,block});assert.equal(changed,baseline);
  }
});
await test('constructor rejects wrong chain, wrong Base source, EOA and non-ERC721 source',async()=>{
  const ctor=addr=>nftArt.bytecode+AbiCoder.defaultAbiCoder().encode(['address'],[addr]).slice(2);
  const badChain=await environment(1);reverted(await raw(badChain,{data:ctor(BASE_ORIGINAL)}),'UnsupportedChain');
  const base=await environment(8453);reverted(await raw(base,{data:ctor(ALICE)}),'WrongNetworkSource');
  reverted(await raw(vm,{data:ctor(ALICE)}),'InvalidOriginal');
  const liar=await deploy(vm,mocks.InterfaceLiar);reverted(await raw(vm,{data:ctor(liar.address)}),'InvalidOriginal');
  await base.stateManager.putCode(address(BASE_ORIGINAL),hexToBytes(mocks.ERC721InterfaceStub.deployedBytecode));
  const deployed=await deploy(base,nftArt,[BASE_ORIGINAL]);assert.equal(await read(base,deployed,'deploymentChainId'),8453n);
  const sepolia=await environment(84532);const mock=await deploy(sepolia,mocks.MockOriginalGhoulballs);const testnet=await deploy(sepolia,nftArt,[mock.address]);assert.equal(await read(sepolia,testnet,'deploymentChainId'),84532n);
});
await test('deterministic fuzz: 100 invalid permutations, range and ownership cases preserve state',async()=>{
  let state=0x12345678;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  const supply=await read(vm,nft,'totalSupply'),transfers=await read(vm,original,'transferCalls');
  for(let n=0;n<100;n++){const a=ids(101+(random()%200));const j=random()%12;switch(n%4){case 0:a[j+1]=a[j];break;case 1:[a[j],a[j+1]]=[a[j+1],a[j]];break;case 2:a[12]=BigInt(6668+random());break;case 3:a[12]=1001n;break;}reverted(await call(vm,nft,'mint',[a]));}
  assert.equal(await read(vm,nft,'totalSupply'),supply);assert.equal(await read(vm,original,'transferCalls'),transfers);
});
await test('full 420-token supply invariant: 5460 locked originals, no bypass or wallet cap',async()=>{
  const capVM=await environment();const source=await deploy(capVM,mocks.MockOriginalGhoulballs);const output=await deploy(capVM,nftArt,[source.address]);
  for(let first=1;first<=5473;first+=400)success(await call(capVM,source,'mintRange',[ALICE,first,Math.min(400,5474-first)]));
  success(await call(capVM,source,'setApprovalForAll',[output.address,true]));
  const yard=await read(capVM,output,'graveyard');
  for(let i=0;i<420;i++){
    const ingredients=ids(1+i*13);const r=success(await call(capVM,output,'mint',[ingredients]));
    assert.equal(r.value[0],BigInt(i+1));assert.deepEqual(Array.from(await read(capVM,output,'ingredientsOf',[i+1])),ingredients);
    for(const id of ingredients)assert.equal((await read(capVM,source,'ownerOf',[id])).toLowerCase(),yard.toLowerCase());
    if(i===419)gas.finalMint=r.gas.toString();
    if((i+1)%100===0)console.log(`  Supply invariant: ${i+1}/420 mints verified`);
  }
  assert.equal(await read(capVM,output,'totalSupply'),420n);assert.equal(await read(capVM,output,'balanceOf',[ALICE]),420n);
  assert.equal(await read(capVM,source,'transferCalls'),5460n);assert.equal(await read(capVM,source,'totalSupply'),5473n);
  reverted(await call(capVM,output,'mint',[ids(5461)]),'SoldOut');assert.equal((await read(capVM,source,'ownerOf',[5461])).toLowerCase(),ALICE);
});
const functionNames=nftArt.abi.filter(x=>x.type==='function').map(x=>x.name);
assert(!functionNames.some(x=>/^(?:owner|admin|withdraw|rescue|sweep|upgradeTo|pause|airdrop|ownerMint|setRenderer|setBaseURI)$/.test(x)));
const report={sourceSha256:testedBuild.sourceSha256,timestamp:new Date().toISOString(),compiler:nftArt.compiler,passed:results.length,tests:results,gas,limits:['In-memory Cancun execution, not a public-chain deployment or live Base fork.','Execution gas excludes transaction intrinsic costs and Base L1 data fee.','Mock source cannot establish live original bytecode equivalence.','Security testing is not an independent professional audit.']};
fs.writeFileSync(path.join(root,'artifacts/contract-tests.json'),JSON.stringify(report,null,2));
console.log(`PASS ${results.length} contract test groups (including 100 malformed-recipe cases and all 420 redemptions).`);
console.log(JSON.stringify(gas,null,2));
