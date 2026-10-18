export const CHAIN_ID = 8453;
export const CHAIN_HEX = '0x2105';
export const ORIGINAL = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
// Exact-match SolVideoNFT runtime displayed by Basescan on 2026-10-18.
// The live wallet RPC must independently return these exact bytes before use.
export const ORIGINAL_RUNTIME_HASH = '0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a';
export const ORIGINAL_RUNTIME_BYTES = 8229;
export const MAX_REVIEW_AGE_MS = 120000;
export const INTENT_KEY = 'ganja-ghoulballs:deployment-intent:v1';
export const toHex = value => `0x${BigInt(value).toString(16)}`;
export function validateManifest(manifest, artifact, hashes, { allowUnreviewed = false } = {}) {
  if (!manifest || !artifact || manifest.schemaVersion !== 1) throw new Error('Release artifacts are missing or unsupported. Deployment is locked.');
  if (manifest.chainId !== CHAIN_ID || manifest.originalCollection?.toLowerCase() !== ORIGINAL) throw new Error('Unexpected network or original collection. Deployment is locked.');
  if (manifest.originalRuntimeHash !== ORIGINAL_RUNTIME_HASH || manifest.originalRuntimeBytes !== ORIGINAL_RUNTIME_BYTES) throw new Error('Original collection runtime reference does not match the verified release. Deployment is locked.');
  if (manifest.maxSupply !== 420 || manifest.originalsPerMint !== 13) throw new Error('Release economics do not match 420 supply / 13 originals.');
  if (artifact.contractName !== 'GanjaGhoulballs' || !/^0x[0-9a-f]+$/i.test(artifact.bytecode) || artifact.bytecode.length < 100) throw new Error('Invalid creation bytecode.');
  const constructor = artifact.abi?.find(item => item.type === 'constructor');
  if (constructor?.inputs?.length !== 1 || constructor.inputs[0].type !== 'address' || constructor.stateMutability !== 'nonpayable') throw new Error('Unexpected constructor interface.');
  if (manifest.creationBytecodeHash !== hashes.creation || manifest.deploymentDataHash !== hashes.deployment) throw new Error('Artifact hash mismatch. Do not sign.');
  if (!allowUnreviewed) validateReleaseApproval(manifest);
  return true;
}
export function validateOriginalRuntime(code, hashFunction) {
  if (typeof code !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(code) ||
      (code.length - 2) / 2 !== ORIGINAL_RUNTIME_BYTES || hashFunction(code) !== ORIGINAL_RUNTIME_HASH) {
    throw new Error('Original Ghoulballs runtime does not match the verified explorer reference. Stop; no deployment request was made.');
  }
  return true;
}
export function validateReleaseApproval(manifest) {
  if (!manifest.reviewed || !/^[0-9a-f]{40}$/i.test(manifest.sourceCommit || '') || !manifest.reviewSummary) throw new Error('Release review has not unlocked this exact bytecode. Deployment is locked.');
  return true;
}
export function estimateGasLimit(estimate, blockLimit) {
  const limit = (BigInt(estimate) * 125n + 99n) / 100n;
  if (limit <= 21000n || limit > BigInt(blockLimit)) throw new Error('Estimated deployment gas does not fit the latest block.');
  return limit;
}
export function createTransaction({ account, data, nonce, gas, maxFeePerGas, maxPriorityFeePerGas }) {
  if (!/^0x[0-9a-f]{40}$/i.test(account) || !/^0x[0-9a-f]+$/i.test(data)) throw new Error('Invalid deployment parameters.');
  return {
    from: account, chainId: CHAIN_HEX, value: '0x0', data,
    nonce: toHex(nonce), gas: toHex(gas),
    maxFeePerGas: toHex(maxFeePerGas), maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),
  };
}
export function requireFresh(review, current, now = Date.now()) {
  if (!review || now - review.time > MAX_REVIEW_AGE_MS) throw new Error('The simulation is more than two minutes old. Simulate again.');
  if (current.chain !== CHAIN_HEX) throw new Error('Select Base mainnet in your wallet, then simulate again.');
  if (current.account?.toLowerCase() !== review.account.toLowerCase()) throw new Error('Wallet account changed. Simulate again.');
  if (BigInt(current.nonce) !== review.nonce) throw new Error('Wallet nonce changed. Simulate again.');
}
export function runtimeMatches(code, compiled) {
  if (!/^0x[0-9a-f]*$/i.test(code || '') || !compiled?.deployedBytecode || code.length !== compiled.deployedBytecode.length) return false;
  let actual = code.slice(2).toLowerCase(), expected = compiled.deployedBytecode.slice(2).toLowerCase();
  for (const reference of Object.values(compiled.immutableReferences || {}).flat()) {
    const start = reference.start * 2, length = reference.length * 2;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length <= 0 || start + length > actual.length) return false;
    actual = actual.slice(0, start) + '0'.repeat(length) + actual.slice(start + length);
    expected = expected.slice(0, start) + '0'.repeat(length) + expected.slice(start + length);
  }
  return actual === expected;
}
