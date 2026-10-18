import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {AbiCoder,keccak256} from 'ethers';
import {root,ALICE,artifact,compileMocks,environment,deploy,call,read,raw,ids} from '../test/evm.mjs';
const testedBuild=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const coder=AbiCoder.defaultAbiCoder(),mocks=compileMocks(),vm=await environment();
const original=await deploy(vm,mocks.MockOriginalGhoulballs),wrapper=await deploy(vm,mocks.MockVRFWrapper);
const nft=await deploy(vm,artifact('GanjaGhoulballs'),[original.address,wrapper.address,10000000000000n]);
assert((await raw(vm,{to:nft.address,value:1000000000000000n})).ok);
const r=(s,d,m)=>Number(BigInt(keccak256(coder.encode(['uint256','uint256'],[s,d])))%BigInt(m));
const field=(p,n)=>Number((p>>BigInt(n))&255n);
const head=s=>{if(r(s,51,1000)<21)return 0;const n=r(s,31,100);return n<25?0:n<45?1:n<70?2:n<85?3:n<95?4:5;};
function expression(parents,s,d,offset){const a=r(s,d,13),b=(a+1+r(s,d+1,12))%13,x=field(parents[a],offset),y=field(parents[b],offset);const rank=v=>offset===168?[2,4,1,6].indexOf(v):v;return rank(x)<=rank(y)?(r(s,d+2,4)!==0?x:y):(r(s,d+2,4)!==0?y:x);}
function traits(parents,s){let count=expression(parents,s,301,168);if(r(s,201,8)===0){let c=[1,2,4,6].indexOf(count);c=c===0?1:c===3?2:r(s,202,2)===0?c-1:c+1;count=[1,2,4,6][c];}return {count,scene:(expression(parents,s,321,176)+r(s,209,2)*4)%6,hat:head(s)};}
const targets=[...[1,2,4].map(balls=>({balls})),...Array.from({length:6},(_,scene)=>Array.from({length:6},(_,hat)=>({balls:6,scene,hat}))).flat()];
const samples=[];let tokenId=0;
await call(vm,original,'setApprovalForAll',[nft.address,true]);
for(const target of targets){
 tokenId++;const ingredients=ids(1+(tokenId-1)*13);assert((await call(vm,original,'mintRange',[ALICE,ingredients[0],13])).ok);
 const minted=await call(vm,nft,'mint',[ingredients]);assert(minted.ok);
 const parents=await read(vm,nft,'parentGenesOf',[tokenId]),digest=await read(vm,nft,'parentDigestOf',[tokenId]);
 let seed,entropy,found=false;
 for(entropy=0;entropy<200000;entropy++){
  seed=BigInt(keccak256(coder.encode(['string','bytes32','uint256'],['GGOO_RANDOM_REVEAL_V3',digest,entropy])));
  const t=traits(parents,seed);if(t.count===target.balls&&(target.scene===undefined||t.scene===target.scene)&&(target.hat===undefined||t.hat===target.hat)){found=true;break;}
 }
 assert(found,'target entropy search exhausted');
 const callback=await call(vm,wrapper,'fulfill',[await read(vm,nft,'requestIdOf',[tokenId]),[entropy]]);assert(callback.ok);
 assert.equal(await read(vm,nft,'seedOf',[tokenId]),seed);
 const entry={tokenId,target,seed:seed.toString(),mockEntropy:entropy,ingredientIds:ingredients.map(Number),mintExecutionGas:minted.gas.toString()};
 for(const method of ['svg','svgStill','tokenURI']){
   const out=await call(vm,nft,method,[tokenId],{isStatic:true,gasLimit:30000000n});assert(out.ok,`${method} exceeded30M gas`);
   entry[`${method}ExecutionGas`]=Number(out.gas);entry[`${method}Bytes`]=Buffer.byteLength(out.value[0]);
   if(method==='tokenURI'){
     const decoded=JSON.parse(Buffer.from(out.value[0].split(',')[1],'base64').toString());assert.equal(decoded.attributes.find(x=>x.trait_type==='Ball Count').value,target.balls);
     if(target.scene!==undefined)assert.equal(decoded.attributes.find(x=>x.trait_type==='Scene').value,['Graveyard Parking Lot','Crypt Hotbox','Deadwood Sesh','Cursed Shakedown','Basement Seance','Astral Ashtray'][target.scene]);
     if(target.hat!==undefined)assert.equal(decoded.attributes.find(x=>x.trait_type==='Headwear').value,['Bare Cranium','Grubby Beanie','Lot Bandana','Crooked Shades','Skull Candle','Smokering Halo'][target.hat]);
     assert.deepEqual(decoded.properties.original_ids,ingredients.map(Number));assert.equal(decoded.properties.parent_genes.length,13);assert.equal(decoded.properties.revealed,true);
   }
 }
 assert(entry.tokenURIExecutionGas<18000000,'tokenURI exceeds18M target');samples.push(entry);
 console.log(`${tokenId}/${targets.length} balls=${target.balls} scene=${target.scene??'-'} hat=${target.hat??'-'} tokenURI=${entry.tokenURIExecutionGas} gas/${entry.tokenURIBytes} bytes`);
}
const report={compilerSettingsSha256:testedBuild.compilerSettingsSha256,sourceSha256:testedBuild.sourceSha256,timestamp:new Date().toISOString(),profile:`Solc0.8.30 optimizer${testedBuild.optimizer.runs} viaIR Cancun, EthereumJS chain31337; execution gas only, no signed transactions or Base L1 data fees`,samples:samples.length,maxTokenURIExecutionGas:Math.max(...samples.map(x=>x.tokenURIExecutionGas)),maxTokenURIBytes:Math.max(...samples.map(x=>x.tokenURIBytes)),maxSVGExecutionGas:Math.max(...samples.map(x=>x.svgExecutionGas)),note:'39 locally minted tokens with mock post-commit oracle entropy:1/2/4 balls plus all36 scene/headwear combinations at6 balls. Search is test-only; the production oracle supplies uncontrollable one-shot entropy. Representative worst-structure sampling, not exhaustive.',details:samples};
fs.writeFileSync(path.join(root,'artifacts/gas-profile.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,details:undefined},null,2));
