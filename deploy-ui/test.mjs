import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as ethers from 'ethers';
import { CHAIN_HEX, INTENT_KEY, ORIGINAL, ORIGINAL_RUNTIME_HASH, ORIGINAL_RUNTIME_BYTES, createTransaction, estimateGasLimit, requireFresh, runtimeMatches, validateManifest, validateOriginalRuntime } from './lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const originalRuntime = fs.readFileSync(path.join(root, '../reports/original-basescan-runtime.hex'), 'utf8').trim();
const mutatedOriginal = `0x61${originalRuntime.slice(4)}`;
assert.equal((originalRuntime.length - 2) / 2, ORIGINAL_RUNTIME_BYTES);
assert.equal(ethers.keccak256(originalRuntime), ORIGINAL_RUNTIME_HASH);
assert.equal(validateOriginalRuntime(originalRuntime, ethers.keccak256), true);
for (const code of [undefined, null, '0x', '0x6000', `${originalRuntime}00`, originalRuntime.slice(0, -1), mutatedOriginal]) assert.throws(() => validateOriginalRuntime(code, ethers.keccak256), /verified explorer reference/);
const artifact = { contractName: 'GanjaGhoulballs', compiler: 'test-fixture', bytecode: `0x${'60'.repeat(80)}`, deployedBytecode: '0x6000', immutableReferences: {}, abi: [{ type: 'constructor', stateMutability: 'nonpayable', inputs: [{ name: 'original_', type: 'address' }] }] };
const data = (await new ethers.ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(ORIGINAL)).data;
const manifest = {
  schemaVersion: 1, chainId: 8453, originalCollection: ORIGINAL, maxSupply: 420, originalsPerMint: 13,
  originalRuntimeHash: ORIGINAL_RUNTIME_HASH, originalRuntimeBytes: ORIGINAL_RUNTIME_BYTES,
  creationBytecodeHash: ethers.keccak256(artifact.bytecode), deploymentDataHash: ethers.keccak256(data),
  reviewed: true, sourceCommit: '1'.repeat(40), reviewSummary: 'Synthetic test fixture only',
  runtimeTemplateHashes: Object.fromEntries(['GanjaGhoulballs', 'GooGraveyard', 'GooRenderer'].map(name => [name, ethers.keccak256(artifact.deployedBytecode)])),
  artifactHashes: Object.fromEntries(['GanjaGhoulballs', 'GooGraveyard', 'GooRenderer'].map(name => [name, ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(artifact)))])),
};
const hashes = { creation: manifest.creationBytecodeHash, deployment: manifest.deploymentDataHash };
assert.equal(validateManifest(manifest, artifact, hashes), true);
for (const change of [{ reviewed: false }, { chainId: 1 }, { originalsPerMint: 15 }, { sourceCommit: null }, { deploymentDataHash: '0xdead' }, { originalRuntimeHash: ethers.keccak256(mutatedOriginal) }, { originalRuntimeBytes: 8230 }]) assert.throws(() => validateManifest({ ...manifest, ...change }, artifact, hashes));
assert.equal(estimateGasLimit(100000n, 30000000n), 125000n);
assert.throws(() => estimateGasLimit(30000000n, 30000000n));
const account = '0x1111111111111111111111111111111111111111';
const transaction = createTransaction({ account, data, nonce: 1n, gas: 100000n, maxFeePerGas: 3n, maxPriorityFeePerGas: 1n });
assert.equal(transaction.value, '0x0'); assert.equal(transaction.chainId, CHAIN_HEX); assert.ok(!('to' in transaction));
requireFresh({ time: 1000, account, nonce: 1n }, { chain: CHAIN_HEX, account, nonce: '0x1' }, 2000);
assert.throws(() => requireFresh({ time: 1000, account, nonce: 1n }, { chain: CHAIN_HEX, account, nonce: '0x2' }, 2000));
assert.throws(() => requireFresh({ time: 1000, account, nonce: 1n }, { chain: CHAIN_HEX, account, nonce: '0x1' }, 122000));
const masked = { deployedBytecode: '0x60000060', immutableReferences: { '0': [{ start: 1, length: 2 }] } };
assert.equal(runtimeMatches('0x60123460', masked), true, 'Only compiler-marked immutable ranges may differ');
assert.equal(runtimeMatches('0x61123460', masked), false, 'Mutation outside immutable range rejected');
assert.equal(runtimeMatches('0x60123461', masked), false, 'Tail mutation rejected');
assert.equal(runtimeMatches('0x60123460ff', masked), false, 'Runtime length mismatch rejected');
assert.equal(runtimeMatches('0x60123460', { ...masked, immutableReferences: { '0': [{ start: 1, length: 100 }] } }), false, 'Invalid mask rejected');

async function until(predicate, description) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw new Error(`Timed out: ${description}`);
}
async function mount(release = manifest, sendError = { code: 4001, message: 'Rejected by test user' }, savedIntent, balance = '0x16345785d8a0000', originalCode = originalRuntime) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/ganjaghoulballs/deploy' });
  const calls = [], fetchedURLs = []; const listeners = {}; let chain = CHAIN_HEX, nonce = '0x0';
  const wallet = { on(event, handler) { listeners[event] = handler; }, async request({ method, params }) {
    calls.push({ method, params });
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account];
    if (method === 'eth_chainId') return chain;
    if (method === 'eth_getTransactionCount') return nonce;
    if (method === 'eth_getCode') return params[0].toLowerCase() === ORIGINAL ? originalCode : artifact.deployedBytecode;
    if (method === 'eth_getBlockByNumber') return { number: '0x10', gasLimit: '0x1c9c380', baseFeePerGas: '0xf4240' };
    if (method === 'eth_getBalance') return balance;
    if (method === 'eth_call') return artifact.deployedBytecode;
    if (method === 'eth_estimateGas') return '0x5b8d80';
    if (method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas') return '0xf4240';
    if (method === 'wallet_switchEthereumChain') { chain = CHAIN_HEX; return null; }
    if (method === 'eth_sendTransaction') throw sendError;
    throw new Error(`Unexpected wallet method: ${method}`);
  } };
  dom.window.ethereum = wallet;
  if (savedIntent) dom.window.localStorage.setItem(INTENT_KEY, savedIntent);
  const context = vm.createContext({ window: dom.window, document: dom.window.document, console, Blob, URL, setTimeout, clearTimeout, fetch: async url => { fetchedURLs.push(String(url)); return { ok: true, json: async () => String(url).endsWith('manifest.json') ? release : artifact }; } });
  const exports = ['ContractFactory', 'Interface', 'formatEther', 'formatUnits', 'getAddress', 'getCreateAddress', 'keccak256', 'toUtf8Bytes'];
  const ethersModule = new vm.SyntheticModule(exports, function () { for (const name of exports) this.setExport(name, ethers[name]); }, { context });
  const lib = new vm.SourceTextModule(fs.readFileSync(path.join(root, 'lib.mjs'), 'utf8'), { context });
  const app = new vm.SourceTextModule(fs.readFileSync(path.join(root, 'deploy.js'), 'utf8'), { context, initializeImportMeta(meta) { meta.url = 'https://example.test/ganjaghoulballs/deploy/deploy.js'; } });
  await app.link(specifier => specifier.includes('ethers') ? ethersModule : lib); await app.evaluate();
  const el = id => dom.window.document.getElementById(id);
  await until(() => !el('status').textContent.startsWith('Loading'), 'initialization');
  return { dom, calls, fetchedURLs, el, listeners, setNonce(value) { nonce = value; }, setChain(value) { chain = value; }, setOriginalCode(value) { originalCode = value; } };
}
for (const badCode of ['0x', '0x6000', mutatedOriginal]) {
  const mismatch = await mount(manifest, undefined, undefined, undefined, badCode);
  mismatch.el('connect').click(); await until(() => !mismatch.el('simulate').disabled, 'runtime-mismatch connect');
  mismatch.el('simulate').click(); await until(() => mismatch.el('status').textContent.includes('verified explorer reference'), 'runtime-mismatch rejection');
  assert.equal(mismatch.el('deploy').disabled, true); assert.equal(mismatch.el('download').disabled, true);
  assert.equal(mismatch.calls.filter(call => ['eth_call','eth_estimateGas','eth_sendTransaction'].includes(call.method)).length, 0, 'Wrong original must stop before constructor simulation or send');
  mismatch.dom.window.close();
}
const changedBeforeSend = await mount();
changedBeforeSend.el('connect').click(); await until(() => !changedBeforeSend.el('simulate').disabled, 'pre-send original check connect');
changedBeforeSend.el('simulate').click(); await until(() => !changedBeforeSend.el('ack').disabled, 'pre-send original check simulation');
changedBeforeSend.setOriginalCode(mutatedOriginal); changedBeforeSend.el('ack').click(); changedBeforeSend.el('deploy').click();
await until(() => changedBeforeSend.el('status').textContent.includes('verified explorer reference'), 'pre-send original mutation rejected');
assert.equal(changedBeforeSend.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
assert.equal(changedBeforeSend.dom.window.localStorage.getItem(INTENT_KEY), null, 'Mismatch blocks before persistent send intent');
changedBeforeSend.dom.window.close();
const locked = await mount({ ...manifest, reviewed: false });
assert.equal(locked.calls.length, 0); assert.equal(locked.el('connect').disabled, false); assert.equal(locked.el('deploy').disabled, true);
locked.el('connect').click(); await until(() => !locked.el('simulate').disabled, 'unreviewed connect');
locked.el('simulate').click(); await until(() => !locked.el('download').disabled, 'unreviewed read-only simulation');
assert.equal(locked.el('ack').disabled, true); assert.equal(locked.el('deploy').disabled, true);
assert.equal(locked.calls.filter(call => call.method === 'eth_sendTransaction').length, 0, 'Unreviewed simulation cannot send');
locked.dom.window.close();
const unfunded = await mount(manifest, undefined, undefined, '0x0');
unfunded.el('connect').click(); await until(() => !unfunded.el('simulate').disabled, 'unfunded connect');
unfunded.el('simulate').click(); await until(() => !unfunded.el('download').disabled, 'unfunded simulation evidence retained');
assert.equal(unfunded.el('ack').disabled, true); assert.equal(unfunded.el('deploy').disabled, true);
assert.equal(unfunded.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
unfunded.dom.window.close();
const page = await mount();
assert.equal(page.calls.length, 0, 'No wallet requests at page load');
assert.deepEqual(page.fetchedURLs.sort(), ['manifest.json','artifact.json','GooGraveyard.json','GooRenderer.json'].map(file => `https://example.test/ganjaghoulballs/deploy/${file}`).sort(), 'Artifacts resolve relative to the module at a nested slashless mount');
assert.equal(page.el('deploy').disabled, true);
page.el('connect').click(); await until(() => !page.el('simulate').disabled, 'connect');
assert.equal(page.calls.filter(call => call.method === 'eth_requestAccounts').length, 1);
page.el('simulate').click(); await until(() => !page.el('ack').disabled, 'simulate');
assert.match(page.el('simulation').textContent, /L2 execution fee cap/); assert.match(page.el('simulation').textContent, /Base L1 data and operator fees/);
assert.equal(page.calls.filter(call => call.method === 'eth_sendTransaction').length, 0, 'Simulation is read-only');
assert.equal(page.el('deploy').disabled, true, 'Explicit acknowledgment required');
page.el('ack').click(); assert.equal(page.el('deploy').disabled, false);
page.el('deploy').click(); await until(() => page.el('status').textContent.includes('Rejected by test user'), 'wallet rejection');
const sent = page.calls.find(call => call.method === 'eth_sendTransaction').params[0];
assert.equal(sent.value, '0x0'); assert.equal(sent.chainId, CHAIN_HEX); assert.ok(!('to' in sent)); assert.equal(ethers.keccak256(sent.data), manifest.deploymentDataHash);
assert.equal(page.el('deploy').disabled, true, 'Wallet rejection clears simulation');
assert.equal(page.dom.window.localStorage.getItem(INTENT_KEY), null, 'Explicit wallet rejection clears persistent intent');
page.dom.window.close();
const uncertain = await mount(manifest, { code: -32000, message: 'Unknown transport result' });
uncertain.el('connect').click(); await until(() => !uncertain.el('simulate').disabled, 'second connect');
uncertain.el('simulate').click(); await until(() => !uncertain.el('ack').disabled, 'second simulate');
uncertain.el('ack').click(); uncertain.el('deploy').click(); await until(() => uncertain.el('status').textContent.includes('Unknown transport result'), 'uncertain send');
assert.equal(uncertain.el('deploy').disabled, true); assert.equal(uncertain.el('simulate').disabled, true, 'Uncertain send must remain locked');
const savedIntent = uncertain.dom.window.localStorage.getItem(INTENT_KEY);
assert.equal(JSON.parse(savedIntent).state, 'request_started');
uncertain.dom.window.close();
const reloaded = await mount(manifest, undefined, savedIntent);
assert.equal(reloaded.calls.length, 0, 'Reload does not contact wallet');
reloaded.el('connect').click(); await until(() => reloaded.el('wallet').textContent.includes(account), 'reload connect');
assert.equal(reloaded.el('simulate').disabled, true, 'Reload preserves uncertain-send lock');
assert.equal(reloaded.el('deploy').disabled, true);
reloaded.dom.window.close();
const badMetadata = await mount({ ...manifest, artifactHashes: {} });
assert.equal(badMetadata.el('connect').disabled, true); assert.ok(badMetadata.el('status').textContent.includes('metadata hash mismatch')); badMetadata.dom.window.close();
console.log('Deployment UI tests passed: release/hash/metadata/network/economics gates, exact verified original runtime hash/length at simulation and pre-send (including same-length mutation), immutable-only runtime mutation rules, zero-value creation, stale/nonce checks, no automatic wallet calls, read-only simulation, explicit confirmation, rejection reset, persistent uncertain-send lock across reload. No real wallet was used.');
