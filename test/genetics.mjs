import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AbiCoder,keccak256} from 'ethers';
import {hexToBytes} from '@ethereumjs/util';
import {root,ALICE,address,compileMocks,environment,deploy,call,read,ids} from './evm.mjs';
const compilerSettingsSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'solc-settings.json'))).digest('hex');
const geneticsSourceSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'contracts/GooGenetics.sol'))).digest('hex');
const mocks=compileMocks(),vm=await environment();
const original=await deploy(vm,mocks.MockOriginalGhoulballs),harness=await deploy(vm,mocks.GeneticsHarness),otherHarness=await deploy(vm,mocks.GeneticsHarness);
assert((await call(vm,original,'mintRange',[ALICE,1,100])).ok);
const rendererAddress='0x0000000000000000000000000000000000001234';
const runtime=fs.readFileSync(path.join(root,'reports/original-renderer-runtime.hex'),'utf8').trim();
await vm.stateManager.putCode(address(rendererAddress),hexToBytes(runtime.startsWith('0x')?runtime:'0x'+runtime));
assert.equal(keccak256(runtime.startsWith('0x')?runtime:'0x'+runtime),'0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad');
assert((await call(vm,original,'setRecipeRenderer',[rendererAddress])).ok);
let assertions=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};
const asArray=x=>Array.from(x,BigInt),field=(p,n)=>Number((p>>BigInt(n))&255n),rgb=(p,n)=>Number((p>>BigInt(n))&0xffffffn);
const channels=c=>[(c>>16)&255,(c>>8)&255,c&255];
const color=([r,g,b])=>(r<<16)|(g<<8)|b;
const mean=colors=>color([0,1,2].map(i=>Math.floor(colors.reduce((sum,c)=>sum+channels(c)[i],0)/colors.length)));
const mix=(d,f)=>color(channels(d).map((x,i)=>Math.floor((x*3+channels(f)[i])/4)));
function packOracle(p){
 let out=0n;for(let i=0;i<p.balls.length;i++){out|=BigInt(p.balls[i].colour)<<BigInt(24*i);out|=BigInt(p.balls[i].radius)<<BigInt(144+4*i);}
 const palette=Buffer.from(p.palette.slice(2),'hex');const sky=[];for(let i=0;i<8;i++)sky.push(palette.readUIntBE(i*3,3));
 const x=Number(p.balls.reduce((n,b)=>n+b.xPhase,0n)/p.ballCount),y=Number(p.balls.reduce((n,b)=>n+b.yPhase,0n)/p.ballCount);
 return out|(p.ballCount<<168n)|(p.theme<<176n)|(p.motion<<184n)|(p.scene<<192n)|(BigInt(mean(sky))<<200n)|(BigInt(x)<<224n)|(BigInt(y)<<232n)|(3n<<240n);
}
const snapCall=await call(vm,harness,'snapshot',[original.address,31337,ids()],{isStatic:true});assert(snapCall.ok,snapCall.error);
const [parents,digest]=snapCall.value;const genes=asArray(parents);
for(let id=1;id<=13;id++){
 const recipe=await read(vm,original,'recipeOf',[id]);eq(genes[id-1],packOracle(recipe),'exact source recipe packing');eq(field(genes[id-1],240),3);eq(genes[id-1]>>248n,0n);
}
eq(asArray((await read(vm,otherHarness,'snapshot',[original.address,31337,ids()]))[0]),genes,'not harness/deployment-address dependent');
eq((await read(vm,otherHarness,'snapshot',[original.address,31337,ids()]))[1],digest);
let randomState=0x87234901;const next=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return randomState>>>0;};
for(let k=0;k<100;k++){
 const perm=ids();for(let i=12;i>0;i--){let j=next()%(i+1);[perm[i],perm[j]]=[perm[j],perm[i]];}
 const sorted=await read(vm,harness,'canonicalize',[perm]);eq(asArray(sorted),ids());
 if(k<10){const s=await read(vm,harness,'snapshot',[original.address,31337,perm]);eq(asArray(s[0]),genes);eq(s[1],digest);}
}
for(let i=0;i<13;i++){
 const changed=ids();changed[i]=BigInt(14+i);const s=await read(vm,harness,'snapshot',[original.address,31337,changed]);assert.notEqual(s[1],digest);assertions++;
}
for(const bad of [ids().map((x,i)=>i===0?0n:x),ids().map((x,i)=>i===12?6668n:x),ids().map((x,i)=>i===4?4n:x)]){
 assert(!(await call(vm,harness,'canonicalize',[bad])).ok);assertions++;
}
for(let fault=1;fault<=10;fault++){
 assert((await call(vm,original,'setRecipeFault',[fault])).ok);
 assert(!(await call(vm,harness,'snapshot',[original.address,31337,ids()])).ok,`malformed source recipe ${fault} accepted`);assertions++;
}
assert((await call(vm,original,'setRecipeFault',[0])).ok);
assert(!(await call(vm,harness,'snapshot',[original.address,8453,ids()])).ok,'wrong source seed domain accepted');assertions++;
const parentColors=genes.map(p=>mean(Array.from({length:field(p,168)},(_,j)=>rgb(p,j*24))));
const family=mean(parentColors),familySky=mean(genes.map(p=>rgb(p,200)));
const rng=(seed,domain,max)=>Number(BigInt(keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[seed,domain])))%BigInt(max));
function expression(seed,domain,offset){
 const a=rng(seed,domain,13),b=(a+1+rng(seed,domain+1,12))%13;
 const x=field(genes[a],offset),y=field(genes[b],offset);
 const rank=v=>offset===168?[2,4,1,6].indexOf(v):v;
 const dominant=rng(seed,domain+2,4)!==0;
 return {a,b,value:rank(x)<=rank(y)?(dominant?x:y):(dominant?y:x)};
}
const meanRadius=Math.floor((genes.reduce((s,p)=>s+Math.floor(Array.from({length:field(p,168)},(_,j)=>Number((p>>BigInt(144+j*4))&15n)).reduce((a,b)=>a+b,0)*100/field(p,168)),0)+650)/1300);
const phases=[224,232].map(offset=>Math.floor(genes.reduce((s,p)=>s+field(p,offset),0)/13));
const mutationCounts=[0,0,0,0];let maximumCombineGas=0n;const examples=[];
for(let entropy=0;entropy<1000;entropy++){
 const expectedSeed=BigInt(keccak256(AbiCoder.defaultAbiCoder().encode(['string','bytes32','uint256'],['GGOO_RANDOM_REVEAL_V3',digest,entropy])));
 const seed=await read(vm,harness,'seed',[digest,entropy]);eq(seed,expectedSeed);
 const r=await call(vm,harness,'combine',[genes,seed],{isStatic:true});assert(r.ok);maximumCombineGas=r.gas>maximumCombineGas?r.gas:maximumCombineGas;
 const genome=r.value[0],flags=field(genome,80),bodyDonor=field(genome,160),accentDonor=field(genome,168),skyDonor=field(genome,176),bodyBall=field(genome,184),accentBall=field(genome,192);
 const countPair=expression(seed,301,168),motionPair=expression(seed,311,184),themePair=expression(seed,321,176);
 const baseCount=countPair.value,baseMotion=motionPair.value,theme=themePair.value;
 eq(field(genome,104),3);eq(field(genome,88),baseCount);eq(field(genome,96),baseMotion);eq(field(genome,136),theme);
 eq([200,208,216,224,232,240].map(n=>field(genome,n)),[countPair.a,countPair.b,motionPair.a,motionPair.b,themePair.a,themePair.b]);
 eq(genome>>248n,0n);
 eq(field(genome,144),phases[0]);eq(field(genome,152),phases[1]);assertions+=6;
 assert(bodyDonor<13&&accentDonor<13&&skyDonor<13&&bodyDonor!==accentDonor);
 assert(bodyBall<field(genes[bodyDonor],168)&&accentBall<field(genes[accentDonor],168));
 eq(rgb(genome,24),mix(rgb(genes[accentDonor],accentBall*24),family));eq(rgb(genome,112),mix(rgb(genes[skyDonor],200),familySky));
 const expectedBody=mix(rgb(genes[bodyDonor],bodyBall*24),family),actualBody=rgb(genome,0);
 if(flags&4){const lighter=color(channels(expectedBody).map(x=>Math.min(255,x+8))),darker=color(channels(expectedBody).map(x=>Math.max(0,x-8)));assert([lighter,darker].includes(actualBody));assertions++;}
 else eq(actualBody,expectedBody);
 const count=field(genome,48),motion=field(genome,64),radius=field(genome,72);
 assert([1,2,4,6].includes(count)&&motion<4&&radius>=5&&radius<=10&&field(genome,56)<6);assertions++;
 if(flags&1)eq(Math.abs([1,2,4,6].indexOf(count)-[1,2,4,6].indexOf(baseCount)),1);else eq(count,baseCount);
 if(flags&2){assert.notEqual(motion,baseMotion);assertions++;}else eq(motion,baseMotion);
 if(flags&8)eq(Math.abs(radius-meanRadius),1);else eq(radius,meanRadius);
 for(let bit=0;bit<4;bit++)if(flags&(1<<bit))mutationCounts[bit]++;
 if(entropy<8)examples.push({entropy,seed:seed.toString(),genome:genome.toString(),bodyRGB:actualBody.toString(16).padStart(6,'0'),accentRGB:rgb(genome,24).toString(16).padStart(6,'0'),count,motion,radius,flags,bodyDonor,accentDonor,skyDonor});
}
const report={compilerSettingsSha256,passed:true,timestamp:new Date().toISOString(),geneticsSourceSha256,actualOriginalRendererRuntimeHash:keccak256(runtime.startsWith('0x')?runtime:'0x'+runtime),assertions,parentsVerified:13,orderPermutations:100,everyParentChangesCommitment:13,malformedRecipeCases:10,entropySamples:1000,mutationCounts:{count:mutationCounts[0],motion:mutationCounts[1],tint:mutationCounts[2],radius:mutationCounts[3]},snapshotExecutionGas:Number(snapCall.gas),maxCombineExecutionGas:Number(maximumCombineGas),genes:genes.map(String),parentDigest:digest,examples,limits:['Local EVM, exact verified source renderer runtime with a mock ERC-721 owner layer.','No selected randomness provider or mint integration is tested by this independent genetics suite.','The 1000 entropy words are test inputs, not claimed oracle outputs.']};
fs.writeFileSync(path.join(root,'artifacts/genetics-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,genes:undefined,examples:undefined},null,2));
