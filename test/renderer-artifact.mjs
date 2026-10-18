import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {keccak256,toUtf8Bytes} from 'ethers';import {root} from './evm.mjs';
export function verifyRendererArtifact(artifact){
 const source=fs.readFileSync(path.join(root,'contracts/GooRenderer.sol'),'utf8');
 const settingsFile=fs.readFileSync(path.join(root,'solc-settings.json'));const settings=JSON.parse(settingsFile).settings;
 const metadata=typeof artifact.metadata==='string'?JSON.parse(artifact.metadata):artifact.metadata;
 assert(metadata?.sources?.['contracts/GooRenderer.sol'],'Compiled artifact metadata is required');
 const rendererSourceKeccak256=keccak256(toUtf8Bytes(source));
 assert.equal(metadata.sources['contracts/GooRenderer.sol'].keccak256,rendererSourceKeccak256,'Compile current renderer before labeling fixtures current');
 assert.deepEqual(metadata.settings.optimizer,settings.optimizer,'Artifact optimizer settings must match project');
 assert.equal(metadata.settings.evmVersion,settings.evmVersion);assert.equal(metadata.settings.viaIR,settings.viaIR);
 assert.equal(metadata.settings.compilationTarget['contracts/GooRenderer.sol'],'GooRenderer');
 return {rendererSourceSha256:createHash('sha256').update(source).digest('hex'),rendererSourceKeccak256,compilerSettingsSha256:createHash('sha256').update(settingsFile).digest('hex')};
}
