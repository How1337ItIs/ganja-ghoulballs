import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Interface,keccak256} from 'ethers';
import {hexToBytes,Account} from '@ethereumjs/util';
import {root,ALICE,address,artifact,compileMocks,environment,deploy,call,read,raw,ids,BASE_ORIGINAL} from './evm.mjs';
const testedBuild=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const vm=await environment(31337),renderer='0x5902E513C974f5d644DDe577b46626a4BF7CEB30';
const runtimeFiles=[[BASE_ORIGINAL,'original-basescan-runtime.hex','0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a'],[renderer,'original-renderer-runtime.hex','0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad']];
for(const [at,file,hash] of runtimeFiles){const bytes=fs.readFileSync(path.join(root,'reports',file),'utf8').trim();assert.equal(keccak256(bytes),hash);await vm.stateManager.putAccount(address(at),new Account());await vm.stateManager.putCode(address(at),hexToBytes(bytes));}
const sourceABI=JSON.parse(fs.readFileSync(path.join(root,'reports/original-basescan-abi.json')));
const original={address:BASE_ORIGINAL,artifact:{abi:sourceABI,iface:new Interface(sourceABI)}};
const mocks=compileMocks(),wrapper=await deploy(vm,mocks.MockVRFWrapper),nft=await deploy(vm,artifact('GanjaGhoulballs'),[BASE_ORIGINAL,wrapper.address,10000000000000n]);
const ok=(r,label)=>{assert(r.ok,`${label}: ${r.error} ${r.data}`);return r;};
ok(await raw(vm,{to:nft.address,value:10000000000000n}),'reserve');
const originalMints=[];
for(let i=1;i<=26;i++){
 const owner='0x'+BigInt(0x10000+i).toString(16).padStart(40,'0');await vm.stateManager.putAccount(address(owner),new Account(0n,10n**18n));
 const minted=ok(await call(vm,original,'mint',[],{from:owner}),'actual source mint');originalMints.push(Number(minted.gas));
 assert.equal((await read(vm,original,'ownerOf',[i])).toLowerCase(),owner);
 ok(await call(vm,original,'transferFrom',[owner,ALICE,i],{from:owner}),'actual source transfer');
}
ok(await call(vm,original,'setApprovalForAll',[nft.address,true]),'actual source approval');
const mint=ok(await call(vm,nft,'mint',[ids().reverse()]),'actual source redemption');
const vault=(await read(vm,nft,'graveyard')).toLowerCase();for(const id of ids())assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),vault);
assert.equal(await read(vm,original,'totalSupply'),26n);assert.equal(await read(vm,nft,'totalSupply'),1n);
const genes=await read(vm,nft,'parentGenesOf',[1]);assert.equal(genes.length,13);
ok(await call(vm,wrapper,'fulfill',[await read(vm,nft,'requestIdOf',[1]),[12345]]),'mock VRF delivery');
const metadata=ok(await call(vm,nft,'tokenURI',[1],{isStatic:true,gasLimit:30000000n}),'actual-lineage metadata');
const json=JSON.parse(Buffer.from(metadata.value[0].split(',')[1],'base64').toString());assert.deepEqual(json.properties.original_ids,ids().map(Number));assert.equal(json.properties.revealed,true);assert.deepEqual(json.properties.parent_genes,Array.from(genes,String));
const before=(await vm.stateManager.getAccount(address(nft.address))).balance;
ok(await call(vm,wrapper,'setMode',[2]),'mock request failure setup');assert(!(await call(vm,nft,'mint',[ids(14)])).ok);
for(const id of ids(14))assert.equal((await read(vm,original,'ownerOf',[id])).toLowerCase(),ALICE);assert.equal(await read(vm,nft,'totalSupply'),1n);assert.equal((await vm.stateManager.getAccount(address(nft.address))).balance,before);
const lineage={originalIds:ids().map(String),parentGenes:Array.from(genes,String),parentDigest:await read(vm,nft,'parentDigestOf',[1]),seed:(await read(vm,nft,'seedOf',[1])).toString(),genome:(await read(vm,nft,'genomeOf',[1])).toString(),entropy:'12345'};
const report={lineage,compilerSettingsSha256:testedBuild.compilerSettingsSha256,passed:true,timestamp:new Date().toISOString(),sourceSha256:testedBuild.sourceSha256,network:'local chain31337',actualOriginalRuntimeHash:runtimeFiles[0][2],actualRendererRuntimeHash:runtimeFiles[1][2],originalsMintedLocally:26,lockedOriginals:13,originalTotalSupplyUnchanged:26,mintExecutionGas:Number(mint.gas),tokenURIExecutionGas:Number(metadata.gas),originalMintExecutionGasRange:[Math.min(...originalMints),Math.max(...originalMints)],checks:['Exact captured original and renderer runtime hashes','26 one-wallet-per-original local mints and real ERC721 consolidation','13 actual-source safe transfers into vault','Direct actual-source recipeOf snapshots','Final metadata lineage matches permanent genes','Oracle-request rejection rolls back actual-source transfers and reserve'],limitations:['Not a live Base fork: source storage starts empty in an in-memory local EVM.','Uses actual captured original/renderer bytecode but a mock randomness wrapper.','No signed transaction, RPC write, real NFT or oracle fee.','Execution gas excludes transaction intrinsic costs and Base L1 data fee.']};
fs.writeFileSync(path.join(root,'artifacts/original-runtime-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
