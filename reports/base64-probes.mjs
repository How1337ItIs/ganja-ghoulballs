/** Independent Base64 vector/oracle tests in a local EVM. No RPC or wallet. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import solc from 'solc';
import {Interface} from 'ethers';
import {environment,deploy,call} from '../test/evm.mjs';
const root=path.resolve(import.meta.dirname,'..');
const paths=fs.readdirSync(path.join(root,'contracts')).filter(n=>n.endsWith('.sol')).sort().map(n=>'contracts/'+n);
const sources=Object.fromEntries(paths.map(p=>[p,{content:fs.readFileSync(path.join(root,p),'utf8')}]));
const compilerSettingsBytes=fs.readFileSync(path.join(root,'solc-settings.json'));
const input=JSON.parse(compilerSettingsBytes);
input.sources={...sources,'ReviewBase64.sol':{content:`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {GooBase64} from "contracts/GanjaGhoulballs.sol";
contract ReviewBase64 {
 function encode(bytes calldata b) external pure returns(string memory){return GooBase64.encode(b);}
 function encodeDirty(bytes calldata b) external pure returns(string memory){
  bytes memory data=abi.encodePacked(b,bytes32(type(uint256).max));
  // Keep nonzero bytes in the physical allocation beyond the logical input length.
  assembly {mstore(data,b.length)}
  return GooBase64.encode(data);
 }
}`}};
input.settings.outputSelection={'*':{'*':['abi','evm.bytecode.object']}};
const output=JSON.parse(solc.compile(JSON.stringify(input)));
for(const e of output.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
const a=output.contracts['ReviewBase64.sol'].ReviewBase64;
const artifact={abi:a.abi,bytecode:'0x'+a.evm.bytecode.object,iface:new Interface(a.abi)};
const vm=await environment();const harness=await deploy(vm,artifact);
const sizes=[...Array.from({length:257},(_,i)=>i),511,512,513,1023,1024,1025,4095,4096,4097,32767,32768,32769];
let rng=0xb64a713;const byte=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)&255;};
let calls=0,maxGas=0n;
for(const size of sizes){
 const b=Buffer.from(Array.from({length:size},byte)),expect=b.toString('base64');
 for(const method of ['encode','encodeDirty']){
  const r=await call(vm,harness,method,['0x'+b.toString('hex')],{gasLimit:30000000n,isStatic:true});
  assert(r.ok,`${method} length ${size} reverted: ${r.error}`);assert.equal(r.value[0],expect,`${method} length ${size}`);
  calls++;if(r.gas>maxGas)maxGas=r.gas;
 }
}
for(const value of [0,255,128,61])for(const size of [1,2,3,31,32,33,64,65]){
 const b=Buffer.alloc(size,value);const r=await call(vm,harness,'encodeDirty',['0x'+b.toString('hex')],{isStatic:true});
 assert(r.ok);assert.equal(r.value[0],b.toString('base64'));calls++;
}
const report={compilerSettingsSha256:crypto.createHash('sha256').update(compilerSettingsBytes).digest('hex'),scope:'Independent optimized Base64 oracle comparison, local EVM only',generatedAt:new Date().toISOString(),compiler:solc.version(),sourceSha256:crypto.createHash('sha256').update(sources['contracts/GanjaGhoulballs.sol'].content).digest('hex'),passedCalls:calls,sizes,patterns:'Deterministic binary bytes plus repeated 0x00/0xff/0x80/0x3d; normal and intentionally dirty trailing allocation',oracle:'Node.js Buffer.toString(base64)',maxExecutionGas:maxGas.toString()};
fs.writeFileSync(path.join(root,'reports/base64-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,sizes:`0..256 plus ${sizes.slice(257).join(', ')}`},null,2));
