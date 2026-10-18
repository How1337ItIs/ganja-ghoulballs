import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ContractFactory, keccak256, toUtf8Bytes } from 'ethers';
import { CHAIN_ID, ORIGINAL, ORIGINAL_RUNTIME_HASH, ORIGINAL_RUNTIME_BYTES, VRF_WRAPPER, VRF_WRAPPER_RUNTIME_HASH, VRF_WRAPPER_RUNTIME_BYTES, VRF_COORDINATOR, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, validateOracleManifest, ORIGINAL_RENDERER, ORIGINAL_RENDERER_RUNTIME_HASH, ORIGINAL_RENDERER_RUNTIME_BYTES, validateManifest, validateArtifactLimits } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export async function buildDeployUI(destination = path.join(root, 'dist', 'deploy')) {
  // Fail closed even if a standalone rebuild encounters missing/new artifacts.
  // An old approval must never survive an interrupted or failed release build.
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ schemaVersion: 2, reviewed: false, sourceCommit: null, error: 'Release build incomplete. Deployment is locked.' }, null, 2));
  const artifactPath = path.join(root, 'artifacts', 'GanjaGhoulballs.json');
  if (!fs.existsSync(artifactPath)) throw new Error('Compile contracts before building the deployment page.');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const children = Object.fromEntries(['GooGraveyard', 'GooRenderer', 'GooBackdrop'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'artifacts', `${name}.json`), 'utf8'))]));
  const oracleConfig = JSON.parse(fs.readFileSync(path.join(root, 'deploy-ui', 'oracle-config.json'), 'utf8'));
  const oracle = { wrapper: VRF_WRAPPER, wrapperRuntimeHash: VRF_WRAPPER_RUNTIME_HASH, wrapperRuntimeBytes: VRF_WRAPPER_RUNTIME_BYTES, coordinator: VRF_COORDINATOR, callbackGasLimit: CALLBACK_GAS_LIMIT, requestConfirmations: REQUEST_CONFIRMATIONS, numWords: NUM_WORDS, maxRequestPriceWei: oracleConfig.maxRequestPriceWei, initialReserveWei: null, selectionStatus: oracleConfig.selectionStatus, fundingNote: oracleConfig.note };
  validateOracleManifest(oracle);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode);
  const transaction = await factory.getDeployTransaction(ORIGINAL, VRF_WRAPPER, oracle.maxRequestPriceWei);
  const approval = JSON.parse(fs.readFileSync(path.join(root, 'deploy-ui', 'release-approval.json'), 'utf8'));
  const deploymentDataHash = keccak256(transaction.data);
  const reviewed = approval.approved === true && approval.deploymentDataHash === deploymentDataHash && /^[0-9a-f]{40}$/i.test(approval.sourceCommit || '') && typeof approval.reviewSummary === 'string' && approval.reviewSummary.length > 10;
  const manifest = {
    schemaVersion: 2, chainId: CHAIN_ID, network: 'Base mainnet', originalCollection: ORIGINAL,
    originalRuntimeHash: ORIGINAL_RUNTIME_HASH, originalRuntimeBytes: ORIGINAL_RUNTIME_BYTES,
    originalRenderer: ORIGINAL_RENDERER, originalRendererRuntimeHash: ORIGINAL_RENDERER_RUNTIME_HASH, originalRendererRuntimeBytes: ORIGINAL_RENDERER_RUNTIME_BYTES,
    oracle,
    maxSupply: 420, originalsPerMint: 13, value: '0x0',
    constructor: 'constructor(address original_, address wrapper_, uint256 maxRequestPriceWei_)',
    deploymentDataBytes: (transaction.data.length - 2) / 2,
    creationBytecodeHash: keccak256(artifact.bytecode), deploymentDataHash,
    runtimeTemplateHashes: Object.fromEntries(Object.entries({ GanjaGhoulballs: artifact, ...children }).map(([name, item]) => [name, keccak256(item.deployedBytecode)])),
    artifactHashes: Object.fromEntries(Object.entries({ GanjaGhoulballs: artifact, ...children }).map(([name, item]) => [name, keccak256(toUtf8Bytes(JSON.stringify(item)))])),
    compiler: artifact.compiler, reviewed: !!reviewed,
    sourceCommit: approval.sourceCommit, reviewSummary: approval.reviewSummary,
    note: 'One contract-creation transaction creates the collection, its ownerless vault, immutable renderer, and renderer-owned immutable backdrop. Never mint or approve real NFTs to test deployment.',
  };
  validateManifest(manifest, artifact, { creation: manifest.creationBytecodeHash, deployment: deploymentDataHash, deploymentBytes: (transaction.data.length - 2) / 2 }, { allowUnreviewed: true });
  for (const compiled of [artifact, ...Object.values(children)]) validateArtifactLimits(compiled);
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
