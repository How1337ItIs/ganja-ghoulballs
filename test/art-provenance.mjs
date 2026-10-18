import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {Interface} from 'ethers';import {JSDOM} from 'jsdom';
import {environment,deploy,read,root} from './evm.mjs';import {fixture} from './art-fixtures.mjs';import {verifyRendererArtifact} from './renderer-artifact.mjs';
// Engineering decoder: no readable provenance caption appears in the artwork.
export function decodeGlints(document){
 const groups=[...document.querySelectorAll('g[opacity=".18"]')];
 const group=groups.find(g=>g.children.length===18&&[...g.children].every(r=>r.tagName==='rect'&&r.getAttribute('width')==='2'&&r.getAttribute('height')==='2'));
 assert(group,'18 provenance glints');let block=0n,minter=0n;
 [...group.children].forEach((r,i)=>{
  assert.equal(Number(r.getAttribute('x')),24+i*25);assert.equal(Number(r.getAttribute('y')),455+(i%4)*4);
  const word=BigInt(r.getAttribute('fill').replace('#','0x'));
  if(i<11)block|=word<<BigInt(i*24);else minter|=word<<BigInt((i-11)*24);
 });
 assert(block<1n<<256n&&minter<1n<<160n,'Zero-padded upper bits');
 return {block,minter:'0x'+minter.toString(16).padStart(40,'0')};
}
const a=JSON.parse(fs.readFileSync(process.env.RENDERER_ARTIFACT||path.join(root,'artifacts/GooRenderer.json')));a.iface=new Interface(a.abi);const provenance=verifyRendererArtifact(a);
const vm=await environment(),r=await deploy(vm,a),w=new JSDOM('').window,p=new w.DOMParser(),s=fixture(16);
const blocks=[0n,52753172n,0x8000000000000001n,(1n<<256n)-1n],minters=['0x0000000000000000000000000000000000000000','0x1234567890abcdef1234567890abcdef12345678','0xffffffffffffffffffffffffffffffffffffffff'];let cases=0;
for(const block of blocks)for(const minter of minters)for(const mode of ['pending','still','animated']){
 const svg=mode==='pending'?await read(vm,r,'pendingSvg',[1,block,minter]):await read(vm,r,'svg',[s.seed,s.genome,1,block,minter,mode==='animated']);
 const d=p.parseFromString(svg,'image/svg+xml');assert.equal(d.querySelector('parsererror'),null);assert.deepEqual(decodeGlints(d),{block,minter});assert.equal(d.documentElement.getAttribute('data-mint-block'),block.toString());assert.equal(d.querySelectorAll('text,script,image,foreignObject').length,0);cases++;
}
const report={passed:true,...provenance,cases,blockBits:256,originalMinterBits:160,glints:18,exactCurrentAndHighBitValues:true,zeroAndMaximumInputs:true};fs.writeFileSync(path.join(root,'artifacts/art-provenance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));w.close();
