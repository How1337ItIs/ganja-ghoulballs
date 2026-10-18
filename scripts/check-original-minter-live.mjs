import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { id, keccak256 } from 'ethers';

// Explicitly read-only: this script has no wallet, keys, signing or send method.
const endpoint = 'https://mainnet.base.org';
const original = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
const ggoo = '0xEec423a9eD7b303E23f41fBC005944fa3FC631b8';
const originalCodeHash = '0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a';
const methods = new Set(['eth_chainId', 'eth_blockNumber', 'eth_getCode', 'eth_call']);
async function rpc(method, params = []) {
  if (!methods.has(method)) throw new Error('Only read-only RPC methods are permitted');
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Read-only Base RPC HTTP ${response.status}`);
  const value = await response.json();
  if (value.error || typeof value.result !== 'string') throw new Error(value.error?.message || 'Invalid Base RPC result');
  return value.result;
}
const chainId = Number(BigInt(await rpc('eth_chainId')));
assert.equal(chainId, 8453);
const block = await rpc('eth_blockNumber');
const uint = async (to, signature) => Number(BigInt(await rpc('eth_call', [{ to, data: id(signature).slice(0, 10) }, block])));
const [code, originalSupply, originalMaxSupply, ggooSupply, ggooMaxSupply, sacrificeCount] = await Promise.all([
  rpc('eth_getCode', [original, block]),
  uint(original, 'totalSupply()'), uint(original, 'MAX_SUPPLY()'),
  uint(ggoo, 'totalSupply()'), uint(ggoo, 'MAX_SUPPLY()'), uint(ggoo, 'SACRIFICE_COUNT()'),
]);
assert.equal(keccak256(code), originalCodeHash);
assert.equal(originalMaxSupply, 6667);
assert.equal(ggooMaxSupply, 420);
assert.equal(sacrificeCount, 13);
assert.ok(originalSupply >= 0 && originalSupply <= originalMaxSupply);
assert.ok(ggooSupply >= 0 && ggooSupply <= ggooMaxSupply);
const report = {
  observedAt: new Date().toISOString(), endpoint, chainId, block, blockNumber: Number(BigInt(block)),
  original: { address: original, codeHash: keccak256(code), totalSupply: originalSupply, maxSupply: originalMaxSupply, remaining: originalMaxSupply - originalSupply },
  ggoo: { address: ggoo, totalSupply: ggooSupply, maxSupply: ggooMaxSupply, sacrificeCount },
  limitations: ['Read-only calls at one fixed Base block; no transactions, wallet requests, signing or broadcast.', 'Supply may change after the observation; no originals were reserved or used.'],
};
await fs.writeFile(new URL('../reports/original-minter-live.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
