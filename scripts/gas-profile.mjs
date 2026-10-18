import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {AbiCoder,keccak256} from 'ethers';
import {root,ALICE,artifact,compileMocks,environment,deploy,call,read} from '../test/evm.mjs';
const testedBuild=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const coder=AbiCoder.defaultAbiCoder();const mocks=compileMocks();const vm=await environment();const original=await deploy(vm,mocks.MockOriginalGhoulballs);const nft=await deploy(vm,artifact('GanjaGhoulballs'),[original.address]);
const r=(s,d,m)=>Number(BigInt(keccak256(coder.encode(['uint256','uint256'],[s,d])))%BigInt(m));
const count=s=>{const n=r(s,11,100);return n<44?1:n<76?2:n<94?4:6;};
const head=s=>{if(r(s,51,1000)<21)return 0;const n=r(s,31,100);return n<25?0:n<45?1:n<70?2:n<85?3:n<95?4:5;};
const used=new Set();let state=0x31415926;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const targets=[...[1,2,4].map(balls=>({balls})),...Array.from({length:6},(_,scene)=>Array.from({length:6},(_,hat)=>({balls:6,scene,hat}))).flat()];
const samples=[];let tokenId=0;
await call(vm,original,'setApprovalForAll',[nft.address,true]);
for(const target of targets){
 tokenId++;let seed,ingredients,packed,found=false;
 for(let attempt=0;attempt<200000;attempt++){
  const set=new Set();while(set.size<13){const id=1+random()%6667;if(!used.has(id))set.add(id);}ingredients=[...set].sort((a,b)=>a-b);
  packed=ingredients.reduce((p,id,i)=>p|(BigInt(id)<<BigInt(i*16)),0n);
  seed=BigInt(keccak256(coder.encode(['string','uint256','address','uint256','uint256'],['GANJA_GHOULBALLS_PIXEL_GOO_V2',31337,nft.address,tokenId,packed])));
  if(count(seed)===target.balls&&(target.scene===undefined||r(seed,19,6)===target.scene)&&(target.hat===undefined||head(seed)===target.hat)){found=true;break;}
 }
 assert(found,'target seed search exhausted');
 for(const id of ingredients){const mint=await call(vm,original,'mintRange',[ALICE,id,1]);assert(mint.ok);used.add(id);}
 const minted=await call(vm,nft,'mint',[ingredients]);assert(minted.ok);assert.equal(await read(vm,nft,'seedOf',[tokenId]),seed);
 const entry={tokenId,target,seed:seed.toString(),ingredientIds:ingredients,mintExecutionGas:minted.gas.toString()};
 for(const method of ['svg','svgStill','tokenURI']){
   const out=await call(vm,nft,method,[tokenId],{isStatic:true,gasLimit:20000000n});assert(out.ok,`${method} exceeded20M gas`);
   entry[`${method}ExecutionGas`]=Number(out.gas);entry[`${method}Bytes`]=Buffer.byteLength(out.value[0]);
   if(method==='tokenURI'){
     const decoded=JSON.parse(Buffer.from(out.value[0].split(',')[1],'base64').toString());assert.equal(decoded.attributes.find(x=>x.trait_type==='Ball Count').value,target.balls);
     if(target.scene!==undefined)assert.equal(decoded.attributes.find(x=>x.trait_type==='Scene').value,['Graveyard Parking Lot','Crypt Hotbox','Deadwood Sesh','Cursed Shakedown','Basement Seance','Astral Ashtray'][target.scene]);
     if(target.hat!==undefined)assert.equal(decoded.attributes.find(x=>x.trait_type==='Headwear').value,['Bare Cranium','Grubby Beanie','Lot Bandana','Crooked Shades','Skull Candle','Smokering Halo'][target.hat]);
     assert.deepEqual(decoded.properties.original_ids,ingredients);
   }
 }
 assert(entry.tokenURIExecutionGas<12000000,'tokenURI exceeds12M target');samples.push(entry);
 console.log(`${tokenId}/${targets.length} balls=${target.balls} scene=${target.scene??'-'} hat=${target.hat??'-'} tokenURI=${entry.tokenURIExecutionGas} gas/${entry.tokenURIBytes} bytes`);
}
const report={sourceSha256:testedBuild.sourceSha256,timestamp:new Date().toISOString(),profile:'Solc0.8.30 optimizer200 viaIR Cancun, EthereumJS chain31337; execution gas only, no signed transactions or Base L1 data fees',samples:samples.length,maxTokenURIExecutionGas:Math.max(...samples.map(x=>x.tokenURIExecutionGas)),maxTokenURIBytes:Math.max(...samples.map(x=>x.tokenURIBytes)),maxSVGExecutionGas:Math.max(...samples.map(x=>x.svgExecutionGas)),note:'39 actual locally minted tokens:1/2/4 balls plus all36 scene/headwear combinations at6 balls. This is representative worst-structure sampling, not an exhaustive maximum over every seed.',details:samples};
fs.writeFileSync(path.join(root,'artifacts/gas-profile.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,details:undefined},null,2));
