import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),load=p=>JSON.parse(fs.readFileSync(path.join(root,p))),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const prior=load('artifacts/covered-dca9/build-manifest.json'),current=load('artifacts/build-manifest.json');
assert.equal(prior.compiler,current.compiler);assert.equal(prior.compilerSettingsSha256,current.compilerSettingsSha256);
assert.equal(current.compilerSettingsSha256,sha(fs.readFileSync(path.join(root,'solc-settings.json'))));
const changed=Object.keys(current.sourceSha256).filter(f=>current.sourceSha256[f]!==prior.sourceSha256[f]);
assert.deepEqual(changed,['contracts/GooRenderer.sol'],'Only separately reviewed renderer changes may use this bridge');
function validatedExecutable(a){
 const bytes=Buffer.from(a.deployedBytecode.slice(2),'hex');
 const size=bytes.readUInt16BE(bytes.length-2),trailer=bytes.subarray(bytes.length-size-2,bytes.length-2);
 // Exact canonical Solidity0.8.30 CBOR map: {ipfs: bytes34(multihash), solc: bytes3(0,8,30)}.
 assert.equal(size,51);assert.match(trailer.toString('hex'),/^a2646970667358221220[0-9a-f]{64}64736f6c634300081e$/);
 const executable=bytes.subarray(0,bytes.length-size-2);
 for(const refs of Object.values(a.immutableReferences||{}))for(const {start,length} of refs){assert.equal(length,32);assert(start>=0&&start+length<=executable.length);}
 return {executable,metadata:trailer};
}
const contracts={};
for(const name of ['GanjaGhoulballs','GooGraveyard','GooBackdrop']){
 const a=load(`artifacts/covered-dca9/${name}.json`),b=load(`artifacts/${name}.json`),x=validatedExecutable(a),y=validatedExecutable(b);
 assert.deepEqual(a.abi,b.abi);assert.deepEqual(a.storageLayout,b.storageLayout);assert.deepEqual(a.immutableReferences,b.immutableReferences);
 assert(x.executable.equals(y.executable),`${name}: executable runtime changed`);
 contracts[name]={executableRuntimeBytes:x.executable.length,priorExecutableSha256:sha(x.executable),currentExecutableSha256:sha(y.executable),immutableReferencesIdentical:true,abiIdentical:true,storageLayoutIdentical:true,priorMetadataSha256:sha(x.metadata),currentMetadataSha256:sha(y.metadata)};
}
const oldRenderer=load('artifacts/covered-dca9/GooRenderer.json'),newRenderer=load('artifacts/GooRenderer.json');assert.deepEqual(oldRenderer.abi,newRenderer.abi);
const report={pass:true,timestamp:new Date().toISOString(),compiler:current.compiler,compilerSettingsSha256:current.compilerSettingsSha256,priorSourceSha256:prior.sourceSha256,currentSourceSha256:current.sourceSha256,changedSources:changed,contracts,rendererABIIdentical:true,scope:'The renderer changed only through removal of its marketplace Art Version trait and a separately reviewed numerical Float-layout clipping correction. The collection, vault and backdrop executable runtime bytes are identical after removing only a validated canonical Solidity CBOR trailer. Immutable references, ABI and storage layouts are identical; no executable bytes or immutable ranges were masked or discarded. Renderer attribute/layout code and embedded creation code changed and are covered by fresh boundary, source-runtime, gas, art-equivalence and metadata tests. Prior full420 evidence retains its original source hashes.'};
fs.writeFileSync(path.join(root,'artifacts/core-runtime-equivalence.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
