/** Independent inheritance oracles. Local memory EVM only. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import solc from 'solc';
import {Interface,AbiCoder,keccak256} from 'ethers';import {Account,hexToBytes} from '@ethereumjs/util';
import {environment,raw,address,deploy,call,read} from '../test/evm.mjs';
const root=path.resolve(import.meta.dirname,'..'),source=fs.readFileSync(path.join(root,'contracts/GooGenetics.sol'),'utf8');
const harness='// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24; import {GooGenetics} from "./GooGenetics.sol"; contract GeneticsProbe { function pack(GooGenetics.Recipe memory p) external pure returns(uint256){return GooGenetics.pack(p,42);} function combine(uint256[13] memory p,uint256 s) external pure returns(uint256){return GooGenetics.combine(p,s);} function canonicalize(uint256[13] memory ids) external pure returns(uint256[13] memory){return GooGenetics.canonicalize(ids);} function seed(bytes32 d,uint256 e) external pure returns(uint256){return GooGenetics.seed(d,e);} }';
const compilerSettingsBytes=fs.readFileSync(path.join(root,'solc-settings.json'));
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'GooGenetics.sol':{content:source},'Probe.sol':{content:harness}},settings:{...JSON.parse(compilerSettingsBytes).settings,outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
for(const e of output.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
const artifact=output.contracts['Probe.sol'].GeneticsProbe;artifact.bytecode='0x'+artifact.evm.bytecode.object;artifact.iface=new Interface(artifact.abi);
const vm=await environment(8453),probe=await deploy(vm,artifact);
const renderer='0x5902E513C974f5d644DDe577b46626a4BF7CEB30',original='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
await vm.stateManager.putAccount(address(renderer),new Account());await vm.stateManager.putCode(address(renderer),hexToBytes(fs.readFileSync(path.join(root,'reports/original-renderer-runtime.hex'),'utf8').trim()));
const ri=new Interface(['function recipe(uint256 seed) pure returns(tuple(uint256 seed,uint256 scene,uint256 ballCount,bytes palette,tuple(uint256 radius,uint256 xPhase,uint256 yPhase,bytes3 colour)[] balls,uint256 theme,uint256 motion))']);
const coder=AbiCoder.defaultAbiCoder(),H=(t,v)=>BigInt(keccak256(coder.encode(t,v))),field=(p,o)=>(p>>BigInt(o))&255n;
let assertions=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};const bool=(v,m)=>{assert.ok(v,m);assertions++;};
function rgb(hex){return BigInt('0x'+hex);}
function packJS(p){
 let w=0n,x=0n,y=0n,R=0n,G=0n,B=0n;
 for(let i=0;i<p.balls.length;i++){const b=p.balls[i];w|=BigInt(b.colour)<<BigInt(24*i);w|=b.radius<<BigInt(144+4*i);x+=b.xPhase;y+=b.yPhase;}
 const sky=p.palette.slice(2,50);for(let i=0;i<8;i++){const c=rgb(sky.slice(i*6,i*6+6));R+=c>>16n;G+=(c>>8n)&255n;B+=c&255n;}
 return w|(p.ballCount<<168n)|(p.theme<<176n)|(p.motion<<184n)|(p.scene<<192n)|((((R/8n)<<16n)|((G/8n)<<8n)|(B/8n))<<200n)|((x/p.ballCount)<<224n)|((y/p.ballCount)<<232n)|(3n<<240n);
}
const rnd=(s,d,n)=>H(['uint256','uint256'],[s,d])%BigInt(n);
const mix=(a,b)=>[0n,8n,16n].reduce((r,o)=>r|((((a>>o)&255n)*3n+((b>>o)&255n))/4n<<o),0n);
const tint=(a,l)=>[0n,8n,16n].reduce((r,o)=>{let n=Number((a>>o)&255n)+(l?8:-8);return r|(BigInt(Math.max(0,Math.min(255,n)))<<o);},0n);
function expressJS(ps,s,d,offset){
 const a=rnd(s,d,13),b=(a+1n+rnd(s,d+1,12))%13n;
 const x=field(ps[Number(a)],offset),y=field(ps[Number(b)],offset);
 const priority=offset===168?[2n,4n,1n,6n]:[0n,1n,2n,3n];
 const ranked=[x,y].sort((u,v)=>priority.indexOf(u)-priority.indexOf(v));
 return [ranked[rnd(s,d+2,4)===0n?1:0],a,b];
}
function combineJS(ps,s){
 let R=0n,G=0n,B=0n,SR=0n,SG=0n,SB=0n,counts=0n,radii=0n,px=0n,py=0n;const mv=[0,0,0,0],tv=[0,0,0,0];
 for(const p of ps){const n=field(p,168);let r=0n,g=0n,b=0n,rad=0n;for(let i=0n;i<n;i++){const c=(p>>(24n*i))&0xffffffn;r+=c>>16n;g+=(c>>8n)&255n;b+=c&255n;rad+=(p>>(144n+4n*i))&15n;}R+=r/n;G+=g/n;B+=b/n;const sky=(p>>200n)&0xffffffn;SR+=sky>>16n;SG+=(sky>>8n)&255n;SB+=sky&255n;counts+=n;radii+=rad*100n/n;px+=field(p,224);py+=field(p,232);mv[Number(field(p,184))]++;tv[Number(field(p,176))]++;}
 const winner=a=>BigInt(a.indexOf(Math.max(...a))),family=((R/13n)<<16n)|((G/13n)<<8n)|(B/13n),fsky=((SR/13n)<<16n)|((SG/13n)<<8n)|(SB/13n);
 const bd=rnd(s,101,13),ad=(bd+1n+rnd(s,102,12))%13n,sd=rnd(s,103,13),bb=rnd(s,104,field(ps[Number(bd)],168)),ab=rnd(s,105,field(ps[Number(ad)],168));
 let body=mix((ps[Number(bd)]>>(24n*bb))&0xffffffn,family),accent=mix((ps[Number(ad)]>>(24n*ab))&0xffffffn,family),sky=mix((ps[Number(sd)]>>200n)&0xffffffn,fsky);
 const [bc,ca,cb]=expressJS(ps,s,301,168),[bm,ma,mb]=expressJS(ps,s,311,184),[theme,ta,tb]=expressJS(ps,s,321,176);
 let count=bc,motion=bm,radius=(radii+650n)/1300n,flags=0n;
 if(rnd(s,201,8)===0n){let cat=[1n,2n,4n,6n].indexOf(count);cat=cat===0?1:cat===3?2:rnd(s,202,2)===0n?cat-1:cat+1;count=[1n,2n,4n,6n][cat];flags|=1n;}
 if(rnd(s,203,10)===0n){motion=(motion+1n+rnd(s,204,3))%4n;flags|=2n;}
 if(rnd(s,205,5)===0n){body=tint(body,rnd(s,206,2)===0n);flags|=4n;}
 if(rnd(s,207,10)===0n){radius=radius===5n?6n:radius===10n?9n:rnd(s,208,2)===0n?radius-1n:radius+1n;flags|=8n;}
 const scene=(theme+rnd(s,209,2)*4n)%6n;
 return body|(accent<<24n)|(count<<48n)|(scene<<56n)|(motion<<64n)|(radius<<72n)|(flags<<80n)|(bc<<88n)|(bm<<96n)|(3n<<104n)|(sky<<112n)|(theme<<136n)|((px/13n)<<144n)|((py/13n)<<152n)|(bd<<160n)|(ad<<168n)|(sd<<176n)|(bb<<184n)|(ab<<192n)|(ca<<200n)|(cb<<208n)|(ma<<216n)|(mb<<224n)|(ta<<232n)|(tb<<240n);
}
const recipes=[],parents=[];
for(let id=1;id<=13;id++){
 const seed=H(['string','uint256','address','uint256'],['SOL_VIDEO_NFT_V1',8453,original,id]);
 const r=await raw(vm,{to:renderer,data:ri.encodeFunctionData('recipe',[seed]),isStatic:true});bool(r.ok,'actual parent renderer recipe');
 const p=ri.decodeFunctionResult('recipe',r.data)[0];const plain={seed:p.seed,scene:p.scene,ballCount:p.ballCount,palette:p.palette,balls:Array.from(p.balls,b=>({radius:b.radius,xPhase:b.xPhase,yPhase:b.yPhase,colour:b.colour})),theme:p.theme,motion:p.motion};recipes.push(plain);
 const gene=await read(vm,probe,'pack',[plain]);eq(gene,packJS(plain),'exact parent packing');parents.push(gene);bool(gene>>248n===0n,'reserved top bits clean');
}
for(const ids of [Array.from({length:13},(_,i)=>BigInt(i+1)),Array.from({length:13},(_,i)=>BigInt(13-i)),[13n,3n,7n,9n,2n,8n,1n,4n,12n,5n,11n,10n,6n]]){
 eq(Array.from(await read(vm,probe,'canonicalize',[ids])),Array.from({length:13},(_,i)=>BigInt(i+1)),'canonical set independent of order');
}
eq(Array.from(await read(vm,probe,'canonicalize',[[6667n,...Array.from({length:12},(_,i)=>BigInt(i+1))]])),[...Array.from({length:12},(_,i)=>BigInt(i+1)),6667n],'upper original ID boundary remains canonical and uint16-safe');
for(const value of [0n,6668n,1n,2n**256n-1n]){const ids=Array.from({length:13},(_,i)=>BigInt(i+1));ids[12]=value;eq((await call(vm,probe,'canonicalize',[ids])).ok,false,'reject invalid/duplicate set');}
const clone=p=>structuredClone(p);
for(const mutate of [
 p=>p.ballCount=3n,p=>p.ballCount=(1n<<256n)-1n,p=>p.balls[0].radius=(1n<<256n)-1n,p=>p.balls[0].xPhase=(1n<<256n)-1n,p=>p.theme=(1n<<256n)-1n,p=>p.scene=10n,p=>p.palette='0x',p=>p.theme=4n,p=>p.motion=4n,p=>p.balls.pop(),
 p=>p.balls[0].radius=4n,p=>p.balls[0].radius=11n,p=>p.balls[0].xPhase=2n*(63n-2n*p.balls[0].radius),p=>p.balls[0].yPhase=256n,p=>p.balls[0].colour='0x000000'
]){const p=clone(recipes[0]);mutate(p);eq((await call(vm,probe,'pack',[p])).ok,false,'malformed parent rejected');}
let flagsSeen=0n;const seeds=[0n,2n**256n-1n,...Array.from({length:96},(_,i)=>H(['string','uint256'],['independent-inheritance',i]))];
for(const seed of seeds){
 const g=await read(vm,probe,'combine',[parents,seed]);eq(g,combineJS(parents,seed),'independent full genome oracle');
 bool([1n,2n,4n,6n].includes(field(g,48)),'legal offspring ball count');bool(field(g,56)<6n&&field(g,64)<4n,'scene/motion ranges');
 bool(field(g,72)>=5n&&field(g,72)<=10n,'radius range');bool(field(g,160)!==field(g,168),'distinct actual colour donors');bool(g>>248n===0n,'offspring reserved bits clean');for(const [a,b]of[[200,208],[216,224],[232,240]])bool(field(g,a)<13n&&field(g,b)<13n&&field(g,a)!==field(g,b),'distinct bounded chromosome donors');flagsSeen|=field(g,80);
}
eq(flagsSeen,15n,'sample exercises all four mutations');
let heterozygous=0,dominant=0;const seenDonors=new Set();
for(let i=0;i<512;i++){
 const s=H(['string','uint256'],['independent-dominance',i]),gg=await read(vm,probe,'combine',[parents,s]);
 for(const [domain,offset]of[[301,168],[311,184],[321,176]]){
  const expected=expressJS(parents,s,domain,offset),bits=domain===301?[88,200,208]:domain===311?[96,216,224]:[136,232,240],actual=bits.map(b=>field(gg,b));eq(actual,expected,'independent dominant/recessive expression oracle');
  const [value,a,b]=actual,x=field(parents[Number(a)],offset),y=field(parents[Number(b)],offset);seenDonors.add(Number(a));seenDonors.add(Number(b));
  if(x!==y){heterozygous++;const priority=offset===168?[2n,4n,1n,6n]:[0n,1n,2n,3n];if(priority.indexOf(value)===Math.min(priority.indexOf(x),priority.indexOf(y)))dominant++;}else eq(value,x,'homozygous allele preserved');
 }
}
eq(seenDonors.size,13,'all13 chromosome donors sampled');bool(dominant/heterozygous>0.68&&dominant/heterozygous<0.82,'observed heterozygote expression consistent with75percent dominance');
for(let parent=0;parent<13;parent++){
 const altered=[...parents];const p=clone(recipes[parent]);p.balls=p.balls.map(b=>({...b,colour:'0xffffff'}));let pal=p.palette.slice(2);for(let i=0;i<p.balls.length;i++)pal=pal.slice(0,48+i*6)+'ffffff'+pal.slice(54+i*6);p.palette='0x'+pal;altered[parent]=packJS(p);
 // A changed parent always changes the canonical digest; visible change is tested here with a large bounded colour shift.
 const fixedSeed=123n;const a=await read(vm,probe,'combine',[parents,fixedSeed]),b=await read(vm,probe,'combine',[altered,fixedSeed]);bool(a!==b,'each of13 parents materially contributes to colour');
}
const report={compilerSettingsSha256:crypto.createHash('sha256').update(compilerSettingsBytes).digest('hex'),compiler:solc.version(),generatedAt:new Date().toISOString(),scope:'Independent local genotype-library review; final collection/oracle integration not reviewed by this probe',pass:true,assertions,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),testedSeeds:seeds.length,actualParentRecipes:13,dominance:{heterozygous,dominant,observedDominantFraction:dominant/heterozygous},checks:['Exact Base parent runtime used','Full packed parent/genome fields independently reproduced','Malformed bounded recipes rejected','Canonical set ordering and invalid IDs','Zero/max entropy','All mutation flags observed','All13 parents materially influence fixed-seed colour','1536 independent chromosome-pair expressions; homozygous/dominant/recessive paths'],parentGenes:parents.map(String)};
fs.writeFileSync(path.join(root,'reports/inheritance-probes.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,assertions,sourceSha256:report.sourceSha256,testedSeeds:seeds.length}));

