/** Local reproduction of the exact Base parent renderer. No RPC or wallet. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import solc from 'solc';
import {Interface,AbiCoder,keccak256} from 'ethers';
import {hexToBytes,Account} from '@ethereumjs/util';
import {environment,raw,address} from '../test/evm.mjs';
const root=path.resolve(import.meta.dirname,'..');
const names=['GenerativeVideo','SolVideo','MpegVideo','Scene','Vaporwave'];
const sources=Object.fromEntries(names.map(n=>['src/'+n+'.sol',{content:fs.readFileSync(path.join(root,'reports/original-renderer-source/src/'+n+'.sol'),'utf8')}]));
const settings={optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.deployedBytecode.object']}}};
const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings})));
for(const e of out.errors||[]) if(e.severity==='error') throw Error(e.formattedMessage);
const c=out.contracts['src/GenerativeVideo.sol'].GenerativeVideo;
const compiled='0x'+c.evm.deployedBytecode.object;
const captured=fs.readFileSync(path.join(root,'reports/original-renderer-runtime.hex'),'utf8').trim();
assert.equal(compiled,captured,'Complete compiled runtime must match explorer capture, including metadata');
const expected='0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad';
assert.equal(keccak256(captured),expected);
const iface=new Interface(c.abi), coder=AbiCoder.defaultAbiCoder();
const vm=await environment(8453), renderer='0x5902E513C974f5d644DDe577b46626a4BF7CEB30', original='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
await vm.stateManager.putAccount(address(renderer),new Account());
await vm.stateManager.putCode(address(renderer),hexToBytes(captured));
const hash=(types,values)=>BigInt(keccak256(coder.encode(types,values)));
const skies=['08081915102e29134552245c7a3ab0ea5cb4ffbf9ba8fff0','050e210b183818295a3e3d70327ab0d559c7ffcaad94fff0','13091f29113546184176264f9250bcf26d9bffd18cd5b9ff','160b262c153b55214e9039587e55adff8eb8ffe3a39ef5ed'];
function neon(h){
 const hue=(h>>136n)%360n,s=120n+(h>>152n)%110n,v=220n+(h>>168n)%36n;
 const rem=(hue%60n)*255n/60n,p=v*(255n-s)/255n,q=v*(255n-s*rem/255n)/255n,t=v*(255n-s*(255n-rem)/255n)/255n;
 return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][Number(hue/60n)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const samples=[];let assertions=2;
for(let j=1;j<=96;j++){
 const id=j<=13?j:j===14?6667:1+Number(hash(['uint256','string'],[j,'original-parent-probe'])%6667n);
 const seed=hash(['string','uint256','address','uint256'],['SOL_VIDEO_NFT_V1',8453,original,id]);
 const key=hash(['string','uint256'],['GHOULBALLS_VAPOR_V3',seed]);
 const scene=7n+key%4n,count=[1n,2n,4n,6n][Number(scene-7n)],theme=(key>>8n)%4n,motion=(key>>16n)%4n;
 const r=await raw(vm,{to:renderer,data:iface.encodeFunctionData('recipe',[seed]),isStatic:true});
 assert.equal(r.ok,true);const recipe=iface.decodeFunctionResult('recipe',r.data)[0];
 assert.deepEqual([recipe.seed,recipe.scene,recipe.ballCount,recipe.theme,recipe.motion],[seed,scene,count,theme,motion]);assertions+=2;
 let palette=skies[Number(theme)];
 const balls=[];
 for(let i=0;i<6;i++){
   const h=hash(['uint256','uint256'],[seed,i]),radius=5n+(h>>24n)%6n,period=2n*(63n-2n*radius),colour='0x'+neon(h);
   palette+=colour.slice(2);
   if(BigInt(i)<count) balls.push([radius,(h>>40n)%period,(h>>72n)%period,colour]);
 }
 palette+='4a376ff5fff3';
 assert.equal(recipe.palette,'0x'+palette);assert.deepEqual(Array.from(recipe.balls,b=>Array.from(b)),balls);assertions+=2;
 samples.push({parentId:id,seed:seed.toString(),scene:Number(scene),ballCount:Number(count),theme:Number(theme),motion:Number(motion),balls:balls.map(b=>({radius:Number(b[0]),xPhase:Number(b[1]),yPhase:Number(b[2]),colour:b[3]})),executionGas:r.gas.toString(),returnBytes:(r.data.length-2)/2});
}
const report={generatedAt:new Date().toISOString(),scope:'Local Cancun EVM reproduction, not a new RPC observation or real NFT transaction',original,renderer,explorer:'https://basescan.org/address/'+renderer+'#code',runtimeBytes:(captured.length-2)/2,runtimeKeccak256:expected,fullRuntimeMatches:true,compiler:solc.version(),settings,assertions,samples:samples.length,first13RendererExecutionGas:samples.slice(0,13).reduce((a,s)=>a+BigInt(s.executionGas),0n).toString(),sourceSha256:Object.fromEntries(Object.entries(sources).map(([p,v])=>[p,crypto.createHash('sha256').update(v.content).digest('hex')])),parentExamples:samples.slice(0,14)};
fs.writeFileSync(path.join(root,'reports/original-trait-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:true,assertions,samples:samples.length,runtimeBytes:report.runtimeBytes,runtimeKeccak256:expected,first13RendererExecutionGas:report.first13RendererExecutionGas}));

