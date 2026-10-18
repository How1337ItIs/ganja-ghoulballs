import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ContractFactory, keccak256, toUtf8Bytes } from 'ethers';
import { CHAIN_ID, ORIGINAL, ORIGINAL_RUNTIME_HASH, ORIGINAL_RUNTIME_BYTES } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export async function buildDeployUI(destination = path.join(root, 'dist', 'deploy')) {
  const artifactPath = path.join(root, 'artifacts', 'GanjaGhoulballs.json');
  if (!fs.existsSync(artifactPath)) throw new Error('Compile contracts before building the deployment page.');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const children = Object.fromEntries(['GooGraveyard', 'GooRenderer'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'artifacts', `${name}.json`), 'utf8'))]));
  const factory = new ContractFactory(artifact.abi, artifact.bytecode);
  const transaction = await factory.getDeployTransaction(ORIGINAL);
  const approval = JSON.parse(fs.readFileSync(path.join(root, 'deploy-ui', 'release-approval.json'), 'utf8'));
  const deploymentDataHash = keccak256(transaction.data);
  const reviewed = approval.approved === true && approval.deploymentDataHash === deploymentDataHash && /^[0-9a-f]{40}$/i.test(approval.sourceCommit || '') && typeof approval.reviewSummary === 'string' && approval.reviewSummary.length > 10;
  const manifest = {
    schemaVersion: 1, chainId: CHAIN_ID, network: 'Base mainnet', originalCollection: ORIGINAL,
    originalRuntimeHash: ORIGINAL_RUNTIME_HASH, originalRuntimeBytes: ORIGINAL_RUNTIME_BYTES,
    maxSupply: 420, originalsPerMint: 13, value: '0x0',
    constructor: 'constructor(address original_)',
    creationBytecodeHash: keccak256(artifact.bytecode), deploymentDataHash,
    runtimeTemplateHashes: Object.fromEntries(Object.entries({ GanjaGhoulballs: artifact, ...children }).map(([name, item]) => [name, keccak256(item.deployedBytecode)])),
    artifactHashes: Object.fromEntries(Object.entries({ GanjaGhoulballs: artifact, ...children }).map(([name, item]) => [name, keccak256(toUtf8Bytes(JSON.stringify(item)))])),
    compiler: artifact.compiler, reviewed: !!reviewed,
    sourceCommit: approval.sourceCommit, reviewSummary: approval.reviewSummary,
    note: 'One contract-creation transaction creates the collection, its ownerless vault, and renderer. Never mint or approve real NFTs to test deployment.',
  };
  fs.mkdirSync(destination, { recursive: true });
  for (const file of ['index.html', 'style.css', 'deploy.js', 'lib.mjs']) fs.copyFileSync(path.join(root, 'deploy-ui', file), path.join(destination, file));
  fs.mkdirSync(path.join(destination, 'vendor'), { recursive: true });
  const ethersRoot = path.resolve(path.dirname(require.resolve('ethers')), '..');
  fs.copyFileSync(path.join(ethersRoot, 'dist', 'ethers.min.js'), path.join(destination, 'vendor', 'ethers.js'));
  fs.copyFileSync(path.join(ethersRoot, 'LICENSE.md'), path.join(destination, 'vendor', 'ETHERS-LICENSE.md'));
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(destination, 'artifact.json'), JSON.stringify(artifact));
  for (const [name, item] of Object.entries(children)) fs.writeFileSync(path.join(destination, `${name}.json`), JSON.stringify(item));
  console.log(`Deployment page built (${reviewed ? 'exact bytecode reviewed' : 'LOCKED pending review'}).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildDeployUI();
