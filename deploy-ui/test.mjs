import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as ethers from 'ethers';
import { CHAIN_HEX, INTENT_KEY, ORIGINAL, ORIGINAL_RUNTIME_HASH, ORIGINAL_RUNTIME_BYTES, createTransaction, estimateGasLimit, requireFresh, runtimeMatches, validateManifest, validateOriginalRuntime, VRF_WRAPPER, VRF_WRAPPER_RUNTIME_HASH, VRF_WRAPPER_RUNTIME_BYTES, VRF_COORDINATOR, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, WRAPPER_ABI, validateWrapperRuntime, validateWrapperState, parseFundingAmount, ORIGINAL_RENDERER, ORIGINAL_RENDERER_RUNTIME_HASH, ORIGINAL_RENDERER_RUNTIME_BYTES, validateOriginalRendererRuntime, validateArtifactLimits } from './lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const originalRuntime = fs.readFileSync(path.join(root, '../reports/original-basescan-runtime.hex'), 'utf8').trim();
const parentRendererRuntime = fs.readFileSync(path.join(root, '../reports/original-renderer-runtime.hex'), 'utf8').trim();
const mutatedParentRenderer = `0x60${parentRendererRuntime.slice(4)}`;
assert.equal(validateOriginalRendererRuntime(parentRendererRuntime, ethers.keccak256), true);
for (const code of ['0x', '0x6000', `${parentRendererRuntime}00`, mutatedParentRenderer]) assert.throws(() => validateOriginalRendererRuntime(code, ethers.keccak256), /Original renderer runtime/);
const wrapperRuntime = fs.readFileSync(path.join(root, '../reports/chainlink-base-wrapper-runtime.hex'), 'utf8').trim();
const mutatedWrapper = `0x61${wrapperRuntime.slice(4)}`;
assert.equal(validateWrapperRuntime(wrapperRuntime, ethers.keccak256), true);
for (const code of ['0x', '0x6000', `${wrapperRuntime}00`, mutatedWrapper]) assert.throws(() => validateWrapperRuntime(code, ethers.keccak256), /wrapper runtime/);
assert.equal(parseFundingAmount('0.00001'), 10000000000000n);
assert.equal(parseFundingAmount('1.000000000000000001'), 1000000000000000001n);
for (const value of ['', '0', '-1', '1e3', '0.0000000000000000001', '.1', '01', 'Infinity']) assert.throws(() => parseFundingAmount(value));
const mutatedOriginal = `0x61${originalRuntime.slice(4)}`;
assert.equal((originalRuntime.length - 2) / 2, ORIGINAL_RUNTIME_BYTES);
assert.equal(ethers.keccak256(originalRuntime), ORIGINAL_RUNTIME_HASH);
assert.equal(validateOriginalRuntime(originalRuntime, ethers.keccak256), true);
for (const code of [undefined, null, '0x', '0x6000', `${originalRuntime}00`, originalRuntime.slice(0, -1), mutatedOriginal]) assert.throws(() => validateOriginalRuntime(code, ethers.keccak256), /verified explorer reference/);
const artifact = { contractName: 'GanjaGhoulballs', compiler: 'test-fixture', bytecode: `0x${'60'.repeat(80)}`, deployedBytecode: '0x6000', immutableReferences: {}, abi: [{ type: 'constructor', stateMutability: 'nonpayable', inputs: [{ name: 'original_', type: 'address' }, { name: 'vrfWrapper_', type: 'address' }, { name: 'maxRequestPriceWei_', type: 'uint256' }] }] };
artifact.abi.push(...['originalCollection() view returns (address)', 'graveyard() view returns (address)', 'renderer() view returns (address)', 'backdrop() view returns (address)', 'redeemer() view returns (address)', 'MAX_SUPPLY() view returns (uint256)', 'SACRIFICE_COUNT() view returns (uint256)', 'deploymentChainId() view returns (uint256)', 'vrfWrapper() view returns (address)', 'maxRequestPrice() view returns (uint256)', 'CALLBACK_GAS_LIMIT() view returns (uint256)', 'REQUEST_CONFIRMATIONS() view returns (uint256)', 'NUM_WORDS() view returns (uint256)', ...WRAPPER_ABI].map(signature => ethers.FunctionFragment.from(signature)));
const data = (await new ethers.ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(ORIGINAL, VRF_WRAPPER, '10000000000000')).data;
const manifest = {
  schemaVersion: 2, chainId: 8453, originalCollection: ORIGINAL, maxSupply: 420, originalsPerMint: 13,
  originalRenderer: ORIGINAL_RENDERER, originalRendererRuntimeHash: ORIGINAL_RENDERER_RUNTIME_HASH, originalRendererRuntimeBytes: ORIGINAL_RENDERER_RUNTIME_BYTES,
  oracle: { wrapper: VRF_WRAPPER, wrapperRuntimeHash: VRF_WRAPPER_RUNTIME_HASH, wrapperRuntimeBytes: VRF_WRAPPER_RUNTIME_BYTES, coordinator: VRF_COORDINATOR, callbackGasLimit: CALLBACK_GAS_LIMIT, requestConfirmations: REQUEST_CONFIRMATIONS, numWords: NUM_WORDS, maxRequestPriceWei: '10000000000000', initialReserveWei: null },
  originalRuntimeHash: ORIGINAL_RUNTIME_HASH, originalRuntimeBytes: ORIGINAL_RUNTIME_BYTES,
  deploymentDataBytes: (data.length - 2) / 2,
  creationBytecodeHash: ethers.keccak256(artifact.bytecode), deploymentDataHash: ethers.keccak256(data),
  reviewed: true, sourceCommit: '1'.repeat(40), reviewSummary: 'Synthetic test fixture only',
  runtimeTemplateHashes: Object.fromEntries(['GanjaGhoulballs', 'GooGraveyard', 'GooRenderer', 'GooBackdrop'].map(name => [name, ethers.keccak256(artifact.deployedBytecode)])),
  artifactHashes: Object.fromEntries(['GanjaGhoulballs', 'GooGraveyard', 'GooRenderer', 'GooBackdrop'].map(name => [name, ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(artifact)))])),
};
const hashes = { creation: manifest.creationBytecodeHash, deployment: manifest.deploymentDataHash, deploymentBytes: (data.length - 2) / 2 };
assert.equal(validateManifest(manifest, artifact, hashes), true);
assert.throws(() => validateArtifactLimits({ ...artifact, deployedBytecode: `0x${'60'.repeat(24577)}` }), /EIP-170/);
assert.throws(() => validateArtifactLimits({ ...artifact, bytecode: `0x${'60'.repeat(49153)}` }), /EIP-3860/);
assert.throws(() => validateManifest({ ...manifest, deploymentDataBytes: 49153 }, artifact, { ...hashes, deploymentBytes: 49153 }), /EIP-3860/);
assert.throws(() => validateManifest({ ...manifest, deploymentDataBytes: 1 }, artifact, hashes), /byte length/);
for (const change of [{ reviewed: false }, { chainId: 1 }, { originalsPerMint: 15 }, { sourceCommit: null }, { deploymentDataHash: '0xdead' }, { originalRuntimeHash: ethers.keccak256(mutatedOriginal) }, { originalRuntimeBytes: 8230 }, { oracle: { ...manifest.oracle, wrapper: '0x1111111111111111111111111111111111111111' } }, { oracle: { ...manifest.oracle, maxRequestPriceWei: '100000000000001' } }, { oracle: { ...manifest.oracle, initialReserveWei: '1' } }]) assert.throws(() => validateManifest({ ...manifest, ...change }, artifact, hashes));
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
async function mount(release = manifest, sendError = { code: 4001, message: 'Rejected by test user' }, savedIntent, balance = '0x16345785d8a0000', originalCode = originalRuntime, receiptOptions = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/ganjaghoulballs/deploy' });
  const calls = [], fetchedURLs = []; const listeners = {}; let chain = CHAIN_HEX, nonce = '0x0', oracleQuotes = 0;
  const collection = ethers.getCreateAddress({ from: account, nonce: 0 });
  const vault = ethers.getCreateAddress({ from: collection, nonce: 1 });
  const renderer = ethers.getCreateAddress({ from: collection, nonce: 2 });
  const backdrop = ethers.getCreateAddress({ from: renderer, nonce: 1 });
  const iface = new ethers.Interface(artifact.abi);
  let liveWrapperCode = receiptOptions.wrapperCode ?? wrapperRuntime;
  const defaults = { originalCollection: ORIGINAL, graveyard: vault, renderer, backdrop, redeemer: collection, MAX_SUPPLY: 420n, SACRIFICE_COUNT: 13n, deploymentChainId: 8453n, vrfWrapper: VRF_WRAPPER, maxRequestPrice: 10000000000000n, CALLBACK_GAS_LIMIT: BigInt(CALLBACK_GAS_LIMIT), REQUEST_CONFIRMATIONS: BigInt(REQUEST_CONFIRMATIONS), NUM_WORDS: BigInt(NUM_WORDS), s_configured: true, s_disabled: false, s_vrfCoordinator: VRF_COORDINATOR, estimateRequestPriceNative: 1000000000000n };
  const wallet = { on(event, handler) { listeners[event] = handler; }, async request({ method, params }) {
    calls.push({ method, params });
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account];
    if (method === 'eth_chainId') return chain;
    if (method === 'eth_getTransactionCount') return nonce;
    if (method === 'eth_getCode') return params[0].toLowerCase() === ORIGINAL ? originalCode : params[0].toLowerCase() === ORIGINAL_RENDERER ? (receiptOptions.parentRendererCode ?? parentRendererRuntime) : params[0].toLowerCase() === VRF_WRAPPER ? liveWrapperCode : (receiptOptions.code?.[params[0].toLowerCase()] ?? artifact.deployedBytecode);
    if (method === 'eth_getBlockByNumber') return { number: '0x10', gasLimit: '0x1c9c380', baseFeePerGas: '0xf4240' };
    if (method === 'eth_getBalance') return params[0].toLowerCase() === account.toLowerCase() ? balance : (receiptOptions.reserve ?? '0x0');
    if (method === 'eth_call') {
      if (!params[0].to) return artifact.deployedBytecode;
      if (params[0].data === '0x') return '0x';
      const method = iface.parseTransaction({ data: params[0].data }).name;
      if (method === 'estimateRequestPriceNative') {
        oracleQuotes++;
        if (oracleQuotes === receiptOptions.nonceAfterOracleQuote?.at) nonce = receiptOptions.nonceAfterOracleQuote.value;
        if (oracleQuotes === receiptOptions.intentAfterOracleQuote?.at) dom.window.localStorage.setItem(INTENT_KEY, receiptOptions.intentAfterOracleQuote.value);
      }
      return iface.encodeFunctionResult(method, [receiptOptions.values?.[method] ?? defaults[method]]);
    }
    if (method === 'eth_getTransactionReceipt') return { status: '0x1', contractAddress: collection, blockNumber: '0x10', blockHash: `0x${'3'.repeat(64)}`, gasUsed: '0x5b8d80', ...receiptOptions.receipt };
    if (method === 'eth_getTransactionByHash') return { to: null, value: '0x0', input: data, from: account, nonce: '0x0', ...receiptOptions.transaction };
    if (method === 'eth_estimateGas') return '0x5b8d80';
    if (method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas') return '0xf4240';
    if (method === 'wallet_switchEthereumChain') { chain = CHAIN_HEX; return null; }
    if (method === 'eth_sendTransaction') throw sendError;
    throw new Error(`Unexpected wallet method: ${method}`);
  } };
  dom.window.ethereum = wallet;
  if (receiptOptions.corruptIntentWrite) {
    const originalSetItem = dom.window.Storage.prototype.setItem;
    dom.window.Storage.prototype.setItem = function (key, value) { originalSetItem.call(this, key, key === INTENT_KEY ? JSON.stringify({ ...JSON.parse(value), nonce: '99' }) : value); };
  }
  if (savedIntent) dom.window.localStorage.setItem(INTENT_KEY, savedIntent);
  const context = vm.createContext({ window: dom.window, document: dom.window.document, console, Blob, URL, setTimeout, clearTimeout, fetch: async url => { fetchedURLs.push(String(url)); return { ok: true, json: async () => String(url).endsWith('manifest.json') ? release : artifact }; } });
  const exports = ['ContractFactory', 'Interface', 'formatEther', 'formatUnits', 'getAddress', 'getCreateAddress', 'keccak256', 'toUtf8Bytes'];
  const ethersModule = new vm.SyntheticModule(exports, function () { for (const name of exports) this.setExport(name, ethers[name]); }, { context });
  const lib = new vm.SourceTextModule(fs.readFileSync(path.join(root, 'lib.mjs'), 'utf8'), { context });
  const app = new vm.SourceTextModule(fs.readFileSync(path.join(root, 'deploy.js'), 'utf8'), { context, initializeImportMeta(meta) { meta.url = 'https://example.test/ganjaghoulballs/deploy/deploy.js'; } });
  await app.link(specifier => specifier.includes('ethers') ? ethersModule : lib); await app.evaluate();
  const el = id => dom.window.document.getElementById(id);
  await until(() => !el('status').textContent.startsWith('Loading'), 'initialization');
  return { dom, calls, fetchedURLs, el, listeners, setNonce(value) { nonce = value; }, setChain(value) { chain = value; }, setOriginalCode(value) { originalCode = value; }, setWrapperCode(value) { liveWrapperCode = value; }, setWrapperState(value) { Object.assign(defaults, value); } };
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
for (const options of [
  { parentRendererCode: mutatedParentRenderer }, { parentRendererCode: '0x' },
  { wrapperCode: '0x' }, { wrapperCode: mutatedWrapper },
  { values: { s_configured: false } }, { values: { s_disabled: true } },
  { values: { s_vrfCoordinator: account } }, { values: { estimateRequestPriceNative: 10000000000001n } },
]) {
  const badOracle = await mount(manifest, undefined, undefined, undefined, undefined, options);
  badOracle.el('connect').click(); await until(() => !badOracle.el('simulate').disabled, 'oracle mismatch connect');
  badOracle.el('simulate').click(); await until(() => !badOracle.el('simulate').disabled, 'oracle mismatch stopped');
  assert.equal(badOracle.el('download').disabled, true);
  assert.equal(badOracle.calls.filter(call => call.method === 'eth_call' && !call.params[0].to).length, 0, 'Bad wrapper must block constructor simulation');
  assert.equal(badOracle.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
  badOracle.dom.window.close();
}
const wrapperChanged = await mount();
wrapperChanged.el('connect').click(); await until(() => !wrapperChanged.el('simulate').disabled, 'wrapper pre-send connect');
wrapperChanged.el('simulate').click(); await until(() => !wrapperChanged.el('ack').disabled, 'wrapper pre-send simulation');
wrapperChanged.setWrapperCode(mutatedWrapper); wrapperChanged.el('ack').click(); wrapperChanged.el('deploy').click();
await until(() => wrapperChanged.el('status').textContent.includes('wrapper runtime'), 'wrapper pre-send rejection');
assert.equal(wrapperChanged.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
assert.equal(wrapperChanged.dom.window.localStorage.getItem(INTENT_KEY), null);
wrapperChanged.dom.window.close();
const nonceDuringOracle = await mount(manifest, undefined, undefined, undefined, undefined, { nonceAfterOracleQuote: { at: 2, value: '0x1' } });
nonceDuringOracle.el('connect').click(); await until(() => !nonceDuringOracle.el('simulate').disabled, 'nonce race connect');
nonceDuringOracle.el('simulate').click(); await until(() => !nonceDuringOracle.el('ack').disabled, 'nonce race simulate');
nonceDuringOracle.el('ack').click(); nonceDuringOracle.el('deploy').click();
await until(() => nonceDuringOracle.el('status').textContent.includes('nonce changed'), 'nonce race rejected after oracle RPC');
assert.equal(nonceDuringOracle.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
assert.equal(nonceDuringOracle.dom.window.localStorage.getItem(INTENT_KEY), null);
nonceDuringOracle.dom.window.close();
for (const options of [
  { corruptIntentWrite: true },
  { intentAfterOracleQuote: { at: 2, value: JSON.stringify({ chainId: 8453, account, nonce: '0', deploymentDataHash: manifest.deploymentDataHash, state: 'request_started' }) } },
]) {
  const intentRace = await mount(manifest, undefined, undefined, undefined, undefined, options);
  intentRace.el('connect').click(); await until(() => !intentRace.el('simulate').disabled, 'intent race connect');
  intentRace.el('simulate').click(); await until(() => !intentRace.el('ack').disabled, 'intent race simulate');
  intentRace.el('ack').click(); intentRace.el('deploy').click();
  await until(() => intentRace.el('status').textContent.includes(options.corruptIntentWrite ? 'preserve the deployment lock' : 'Another deployment request'), 'intent race blocked');
  assert.equal(intentRace.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
  intentRace.dom.window.close();
}
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
assert.deepEqual(page.fetchedURLs.sort(), ['manifest.json','artifact.json','GooGraveyard.json','GooRenderer.json','GooBackdrop.json'].map(file => `https://example.test/ganjaghoulballs/deploy/${file}`).sort(), 'Artifacts resolve relative to the module at a nested slashless mount');
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
// Verify all four contracts and constructor wiring from a user-supplied receipt.
async function receiptCase(options = {}) {
  const page = await mount(manifest, undefined, undefined, undefined, undefined, options);
  page.el('connect').click(); await until(() => !page.el('check').disabled, 'receipt connect');
  page.el('txhash').value = `0x${'2'.repeat(64)}`;
  page.el('check').click();
  await until(() => !page.el('check').disabled, 'receipt check complete');
  return page;
}
const received = await receiptCase();
assert.equal(received.el('receipt-download').disabled, false);
const record = JSON.parse(received.el('receipt').textContent);
assert.deepEqual(Object.keys(record.runtimeCodeHashes).sort(), ['backdrop', 'ganjaCollection', 'graveyard', 'renderer', 'vrfWrapper']);
assert.equal(record.vrfWrapper.toLowerCase(), VRF_WRAPPER); assert.equal(record.maxRequestPrice, '10000000000000');
assert.equal(record.runtimeCodeHashes.vrfWrapper, VRF_WRAPPER_RUNTIME_HASH);
assert.equal(record.backdrop, ethers.getCreateAddress({ from: record.renderer, nonce: 1 }));
assert.equal(received.calls.filter(call => call.method === 'eth_sendTransaction').length, 0, 'Receipt inspection never sends');
received.el('funding-amount').value = '0.00001';
received.el('funding-ack').click(); received.el('funding-prepare').click();
await until(() => !received.el('funding-download').disabled, 'unsigned donation handoff');
assert.match(received.el('funding-details').textContent, /0.00001 ETH/);
assert.equal(received.calls.filter(call => call.method === 'eth_sendTransaction').length, 0, 'Funding preparation cannot send');
const fundingCall = received.calls.filter(call => call.method === 'eth_call' && call.params[0].value !== undefined && call.params[0].to).at(-1).params[0];
assert.equal(fundingCall.to, record.ganjaCollection); assert.equal(BigInt(fundingCall.value), 10000000000000n); assert.equal(fundingCall.data, '0x');
received.el('funding-amount').value = '0.1'; received.el('funding-amount').dispatchEvent(new received.dom.window.Event('input'));
assert.equal(received.el('funding-download').disabled, true, 'Changed amount invalidates unsigned handoff');
received.dom.window.close();
const fundingRace = await receiptCase({ nonceAfterOracleQuote: { at: 1, value: '0x1' } });
fundingRace.el('funding-amount').value = '0.00001'; fundingRace.el('funding-ack').click(); fundingRace.el('funding-prepare').click();
await until(() => fundingRace.el('status').textContent.includes('nonce changed'), 'funding nonce race rejected');
assert.equal(fundingRace.el('funding-download').disabled, true);
assert.equal(fundingRace.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
fundingRace.dom.window.close();
for (const options of [
  { values: { deploymentChainId: 1n } },
  { values: { MAX_SUPPLY: 421n } },
  { values: { SACRIFICE_COUNT: 15n } },
  { values: { originalCollection: account } },
  { values: { redeemer: account } },
  { values: { backdrop: account } },
  { values: { vrfWrapper: account } },
  { values: { maxRequestPrice: 1n } },
  { values: { CALLBACK_GAS_LIMIT: 100001n } },
  { values: { REQUEST_CONFIRMATIONS: 1n } },
  { values: { NUM_WORDS: 2n } },
  { wrapperCode: mutatedWrapper },
  { transaction: { value: '0x1' } },
  { transaction: { input: '0x6000' } },
  { receipt: { status: '0x0' } },
]) {
  const badReceipt = await receiptCase(options);
  assert.equal(badReceipt.el('receipt-download').disabled, true, JSON.stringify(options, (_, value) => typeof value === 'bigint' ? String(value) : value));
  assert.equal(badReceipt.calls.filter(call => call.method === 'eth_sendTransaction').length, 0);
  badReceipt.dom.window.close();
}
for (const address of [record.ganjaCollection, record.graveyard, record.renderer, record.backdrop]) {
  const badRuntime = await receiptCase({ code: { [address.toLowerCase()]: '0x6001' } });
  assert.equal(badRuntime.el('receipt-download').disabled, true, 'Any of the four runtime mutations must block the record');
  badRuntime.dom.window.close();
}
const badMetadata = await mount({ ...manifest, artifactHashes: {} });
assert.equal(badMetadata.el('connect').disabled, true); assert.ok(badMetadata.el('status').textContent.includes('metadata hash mismatch')); badMetadata.dom.window.close();
// An incomplete standalone build must invalidate an older reviewed manifest.
const buildProbe = fs.mkdtempSync(path.join(os.tmpdir(), 'ganja-deploy-build-'));
try {
  fs.mkdirSync(path.join(buildProbe, 'deploy-ui')); fs.mkdirSync(path.join(buildProbe, 'dist', 'deploy'), { recursive: true });
  fs.symlinkSync(path.join(root, '..', 'node_modules'), path.join(buildProbe, 'node_modules'));
  for (const file of ['build.mjs', 'lib.mjs', 'oracle-config.json', 'release-approval.json']) fs.copyFileSync(path.join(root, file), path.join(buildProbe, 'deploy-ui', file));
  const probeManifest = path.join(buildProbe, 'dist', 'deploy', 'manifest.json');
  fs.writeFileSync(probeManifest, JSON.stringify({ reviewed: true, sourceCommit: '1'.repeat(40) }));
  const result = spawnSync(process.execPath, [path.join(buildProbe, 'deploy-ui', 'build.mjs')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Compile contracts/);
  const failedManifest = JSON.parse(fs.readFileSync(probeManifest, 'utf8'));
  assert.equal(failedManifest.reviewed, false); assert.equal(failedManifest.sourceCommit, null);
} finally { fs.rmSync(buildProbe, { recursive: true, force: true }); }
console.log('Deployment UI tests passed: release/hash/metadata/network/economics gates, exact verified original runtime hash/length at simulation and pre-send (including same-length mutation), immutable-only runtime mutation rules, four-contract receipt/runtime/wiring verification, wrapper identity/status/coordinator/quote gates, separate unsigned nonwithdrawable oracle-funding handoff, zero-value creation, stale/nonce checks, no automatic wallet calls, read-only simulation, explicit confirmation, rejection reset, persistent uncertain-send lock across reload. No real wallet was used.');
