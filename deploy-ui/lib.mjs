export const CHAIN_ID = 8453;
export const CHAIN_HEX = '0x2105';
export const ORIGINAL = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
// Exact-match SolVideoNFT runtime displayed by Basescan on 2026-10-18.
// The live wallet RPC must independently return these exact bytes before use.
export const ORIGINAL_RUNTIME_HASH = '0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a';
export const ORIGINAL_RUNTIME_BYTES = 8229;
export const ORIGINAL_RENDERER = '0x5902e513c974f5d644dde577b46626a4bf7ceb30';
export const ORIGINAL_RENDERER_RUNTIME_HASH = '0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad';
export const ORIGINAL_RENDERER_RUNTIME_BYTES = 15787;
export const VRF_WRAPPER = '0xb0407dbe851f8318bd31404a49e658143c982f23';
export const VRF_WRAPPER_RUNTIME_HASH = '0x469c7e3d9661f7d7e41033d44b6198bcfdc4a501b0a9466a395f7842f02a2a8f';
export const VRF_WRAPPER_RUNTIME_BYTES = 15377;
export const VRF_COORDINATOR = '0xd5d517abe5cf79b7e95ec98db0f0277788aff634';
export const CALLBACK_GAS_LIMIT = 100000;
export const REQUEST_CONFIRMATIONS = 3;
export const NUM_WORDS = 1;
export const MAX_REQUEST_PRICE_LIMIT = 100000000000000n;
export const WRAPPER_ABI = [
  'function s_configured() view returns (bool)',
  'function s_disabled() view returns (bool)',
  'function s_vrfCoordinator() view returns (address)',
  'function estimateRequestPriceNative(uint32 callbackGasLimit,uint32 numWords,uint256 requestGasPriceWei) view returns (uint256)',
];
export const MAX_REVIEW_AGE_MS = 120000;
export const INTENT_KEY = 'ganja-ghoulballs:deployment-intent:v1';
export const toHex = value => `0x${BigInt(value).toString(16)}`;
export function validateManifest(manifest, artifact, hashes, { allowUnreviewed = false } = {}) {
  if (!manifest || !artifact || manifest.schemaVersion !== 2) throw new Error('Release artifacts are missing or unsupported. Deployment is locked.');
  if (manifest.chainId !== CHAIN_ID || manifest.originalCollection?.toLowerCase() !== ORIGINAL) throw new Error('Unexpected network or original collection. Deployment is locked.');
  if (manifest.originalRuntimeHash !== ORIGINAL_RUNTIME_HASH || manifest.originalRuntimeBytes !== ORIGINAL_RUNTIME_BYTES) throw new Error('Original collection runtime reference does not match the verified release. Deployment is locked.');
  if (manifest.originalRenderer?.toLowerCase() !== ORIGINAL_RENDERER || manifest.originalRendererRuntimeHash !== ORIGINAL_RENDERER_RUNTIME_HASH || manifest.originalRendererRuntimeBytes !== ORIGINAL_RENDERER_RUNTIME_BYTES) throw new Error('Original renderer reference does not match the verified release.');
  if (manifest.maxSupply !== 420 || manifest.originalsPerMint !== 13) throw new Error('Release economics do not match 420 supply / 13 originals.');
  if (artifact.contractName !== 'GanjaGhoulballs' || !/^0x[0-9a-f]+$/i.test(artifact.bytecode) || artifact.bytecode.length < 100) throw new Error('Invalid creation bytecode.');
  validateOracleManifest(manifest.oracle);
  validateArtifactLimits(artifact);
  if (!Number.isInteger(hashes.deploymentBytes) || hashes.deploymentBytes > 49152 || hashes.deploymentBytes <= 0 || manifest.deploymentDataBytes !== hashes.deploymentBytes) throw new Error('Complete constructor initcode exceeds EIP-3860 or its byte length is invalid. Deployment is locked.');
  const constructor = artifact.abi?.find(item => item.type === 'constructor');
  if (constructor?.inputs?.length !== 3 || constructor.inputs.map(input => input.type).join(',') !== 'address,address,uint256' || constructor.stateMutability !== 'nonpayable') throw new Error('Unexpected constructor interface.');
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
export function validateArtifactLimits(artifact) {
  if (!/^0x(?:[0-9a-f]{2})+$/i.test(artifact?.bytecode || '') || !/^0x(?:[0-9a-f]{2})+$/i.test(artifact?.deployedBytecode || '')) throw new Error('Missing or invalid contract bytecode.');
  if ((artifact.bytecode.length - 2) / 2 > 49152) throw new Error(`${artifact.contractName} initcode exceeds EIP-3860.`);
  if ((artifact.deployedBytecode.length - 2) / 2 > 24576) throw new Error(`${artifact.contractName} runtime exceeds EIP-170.`);
  return true;
}
export function validateOriginalRendererRuntime(code, hashFunction) {
  if (typeof code !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(code) || (code.length - 2) / 2 !== ORIGINAL_RENDERER_RUNTIME_BYTES || hashFunction(code) !== ORIGINAL_RENDERER_RUNTIME_HASH) throw new Error('Original renderer runtime does not match the verified explorer reference. Stop; no transaction request was made.');
  return true;
}
export function validateOracleManifest(oracle) {
  if (!oracle || oracle.wrapper?.toLowerCase() !== VRF_WRAPPER || oracle.coordinator?.toLowerCase() !== VRF_COORDINATOR ||
      oracle.wrapperRuntimeHash !== VRF_WRAPPER_RUNTIME_HASH || oracle.wrapperRuntimeBytes !== VRF_WRAPPER_RUNTIME_BYTES ||
      oracle.callbackGasLimit !== CALLBACK_GAS_LIMIT || oracle.requestConfirmations !== REQUEST_CONFIRMATIONS || oracle.numWords !== NUM_WORDS ||
      !/^[1-9][0-9]*$/.test(oracle.maxRequestPriceWei || '') || BigInt(oracle.maxRequestPriceWei) > MAX_REQUEST_PRICE_LIMIT || oracle.initialReserveWei !== null) {
    throw new Error('Unexpected immutable VRF configuration. Deployment is locked.');
  }
  return true;
}
export function validateWrapperRuntime(code, hashFunction) {
  if (typeof code !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(code) ||
      (code.length - 2) / 2 !== VRF_WRAPPER_RUNTIME_BYTES || hashFunction(code) !== VRF_WRAPPER_RUNTIME_HASH) {
    throw new Error('VRF wrapper runtime does not match the verified explorer reference. Stop; no transaction request was made.');
  }
  return true;
}
export function validateWrapperState({ configured, disabled, coordinator, quote }, oracle) {
  if (configured !== true || disabled !== false || coordinator?.toLowerCase() !== VRF_COORDINATOR) throw new Error('Chainlink wrapper is unavailable or its coordinator changed. Stop and review the oracle configuration.');
  if (BigInt(quote) <= 0n || BigInt(quote) > BigInt(oracle.maxRequestPriceWei)) throw new Error('Current oracle request quote exceeds the immutable cap or is invalid. No transaction request was made.');
  return true;
}
export function parseFundingAmount(value) {
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/.test(value || '')) throw new Error('Enter an exact positive ETH amount with at most 18 decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const wei = BigInt(whole) * 1000000000000000000n + BigInt(fraction.padEnd(18, '0'));
  if (wei <= 0n || wei >= (1n << 256n)) throw new Error('Funding amount must be positive and fit an Ethereum transaction.');
  return wei;
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
