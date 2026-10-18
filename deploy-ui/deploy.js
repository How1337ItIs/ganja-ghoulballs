import { ContractFactory, Interface, formatEther, formatUnits, getAddress, getCreateAddress, keccak256, toUtf8Bytes } from './vendor/ethers.js';
import { CHAIN_HEX, CHAIN_ID, INTENT_KEY, ORIGINAL, ORIGINAL_RUNTIME_HASH, ORIGINAL_RUNTIME_BYTES, createTransaction, estimateGasLimit, requireFresh, runtimeMatches, validateManifest, validateOriginalRuntime, validateReleaseApproval } from './lib.mjs';

const byId = id => document.getElementById(id);
const buttons = ['connect', 'switch', 'simulate', 'deploy', 'download', 'check'];
let manifest, artifact, children, deploymentData, wallet, account, review, submittedHash, record;
let releaseReady = false, reviewApproved = false, busy = false, submissionLocked = false, pendingTimer;
function readIntent() {
  const saved = window.localStorage.getItem(INTENT_KEY);
  if (!saved) return null;
  const intent = JSON.parse(saved);
  if (!intent || intent.chainId !== CHAIN_ID || typeof intent.deploymentDataHash !== 'string') throw new Error('Existing deployment lock is unreadable. Stop and review wallet activity before continuing.');
  return intent;
}
function saveIntent(intent) {
  window.localStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  if (!readIntent()) throw new Error('Could not preserve the deployment lock. Transaction was not requested.');
}
function restoreIntent() {
  const intent = readIntent();
  if (!intent) return;
  submissionLocked = true;
  if (/^0x[0-9a-f]{64}$/i.test(intent.transactionHash || '')) {
    submittedHash = intent.transactionHash; byId('txhash').value = submittedHash;
  }
  byId('submitted').textContent = `A previous deployment request is recorded for ${intent.account}. New deployment is locked. Connect and check its receipt, or find the transaction hash in your wallet. Do not submit a second copy.`;
}

function status(message, error = false) { byId('status').textContent = message; byId('status').classList.toggle('error', error); }
function rows(id, values) {
  const list = byId(id); list.replaceChildren();
  for (const [key, value] of values) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = key; dd.textContent = String(value); list.append(dt, dd);
  }
}
function errorText(error) { return error?.shortMessage || error?.message || 'The wallet request failed. Check its screen before trying anything else.'; }
function refreshButtons() {
  byId('connect').disabled = !releaseReady || busy || !!account;
  byId('switch').disabled = !account || busy || submissionLocked;
  byId('simulate').disabled = !releaseReady || !account || busy || submissionLocked;
  byId('ack').disabled = !review || !review.funded || !reviewApproved || busy || submissionLocked;
  byId('deploy').disabled = !review || !review.funded || !reviewApproved || !byId('ack').checked || busy || submissionLocked;
  byId('download').disabled = !review || busy || submissionLocked;
  byId('check').disabled = !account || busy;
  byId('receipt-download').disabled = !record;
}
function invalidate(message) {
  review = null; byId('ack').checked = false; rows('simulation', []);
  byId('simulation-note').textContent = message || 'Simulate again before requesting deployment.';
  refreshButtons();
}
async function action(fn) {
  if (busy) return;
  busy = true; refreshButtons();
  try { await fn(); } catch (error) { status(errorText(error), true); }
  finally { busy = false; refreshButtons(); }
}
const request = (method, params = []) => wallet.request({ method, params });
function downloadJSON(name, object) {
  const blob = new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function walletState() {
  const [chain, accounts, nonce] = await Promise.all([
    request('eth_chainId'), request('eth_accounts'), request('eth_getTransactionCount', [account, 'pending']),
  ]);
  return { chain: chain.toLowerCase(), account: accounts?.[0], nonce };
}
async function readJSON(file) {
  const response = await fetch(new URL(file, import.meta.url), { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Missing ${file}. Deployment is locked.`);
  return response.json();
}
async function readContract(address, abi, method) {
  const iface = new Interface(abi);
  const result = await request('eth_call', [{ to: address, data: iface.encodeFunctionData(method) }, 'latest']);
  return iface.decodeFunctionResult(method, result)[0];
}

byId('connect').addEventListener('click', () => action(async () => {
  const injected = window.ethereum;
  wallet = injected?.providers?.find(provider => provider.isMetaMask) || injected;
  if (!wallet?.request) throw new Error('No injected wallet found. Open this verified URL in the MetaMask app’s built-in browser, or use a browser with your wallet extension.');
  const accounts = await request('eth_requestAccounts');
  if (!accounts?.[0]) throw new Error('No account was connected.');
  account = getAddress(accounts[0]);
  const chain = await request('eth_chainId');
  rows('wallet', [['Connected sender', account], ['Network', chain.toLowerCase() === CHAIN_HEX ? 'Base mainnet · 8453' : `Wrong network (${chain}). Switch to Base.`]]);
  wallet.on?.('accountsChanged', () => { account = null; invalidate('Wallet account changed. Reconnect and simulate again.'); rows('wallet', [['Wallet', 'Account changed. Reconnect.']]); });
  wallet.on?.('chainChanged', () => invalidate('Wallet network changed. Simulate again on Base.'));
  status('Wallet connected. Nothing has been signed or sent.');
  refreshButtons();
}));
byId('switch').addEventListener('click', () => action(async () => {
  await request('wallet_switchEthereumChain', [{ chainId: CHAIN_HEX }]);
  const chain = await request('eth_chainId');
  if (chain.toLowerCase() !== CHAIN_HEX) throw new Error('Wallet did not switch to Base.');
  invalidate(); rows('wallet', [['Connected sender', account], ['Network', 'Base mainnet · 8453']]);
  status('Base is selected. Simulate the deployment next.');
}));
byId('simulate').addEventListener('click', () => action(async () => {
  invalidate(); status('Checking Base, nonce, source contract, and creation simulation…');
  const state = await walletState();
  if (state.chain !== CHAIN_HEX || state.account?.toLowerCase() !== account.toLowerCase()) throw new Error('Select Base mainnet and the connected sender, then simulate again.');
  const [confirmedNonce, originalCode, block, balance] = await Promise.all([
    request('eth_getTransactionCount', [account, 'latest']), request('eth_getCode', [ORIGINAL, 'latest']),
    request('eth_getBlockByNumber', ['latest', false]), request('eth_getBalance', [account, 'latest']),
  ]);
  if (BigInt(confirmedNonce) !== BigInt(state.nonce)) throw new Error('This wallet has pending transactions. Wait for them to finish before preparing a deterministic deployment.');
  validateOriginalRuntime(originalCode, keccak256);
  const simulationTx = { from: account, data: deploymentData, value: '0x0' };
  const [simulatedRuntime, gasEstimate, gasPrice] = await Promise.all([
    request('eth_call', [simulationTx, 'latest']), request('eth_estimateGas', [simulationTx]), request('eth_gasPrice'),
  ]);
  if (!runtimeMatches(simulatedRuntime, artifact)) throw new Error('Simulated runtime does not match the reviewed collection artifact.');
  const gas = estimateGasLimit(gasEstimate, block.gasLimit);
  let priority;
  try { priority = BigInt(await request('eth_maxPriorityFeePerGas')); } catch { priority = 1000000n; }
  const base = block.baseFeePerGas ? BigInt(block.baseFeePerGas) : BigInt(gasPrice);
  const maxFee = [base * 2n + priority, BigInt(gasPrice)].reduce((a, b) => a > b ? a : b);
  const executionCap = gas * maxFee;
  const funded = BigInt(balance) >= executionCap;
  const nonce = BigInt(state.nonce);
  const collection = getCreateAddress({ from: account, nonce });
  review = {
    time: Date.now(), account, nonce, gas, gasEstimate: BigInt(gasEstimate), maxFee, priority, funded, executionCap,
    blockNumber: block.number, collection,
    originalCodeHash: keccak256(originalCode), originalCodeBytes: (originalCode.length - 2) / 2,
    graveyard: getCreateAddress({ from: collection, nonce: 1 }), renderer: getCreateAddress({ from: collection, nonce: 2 }),
    tx: createTransaction({ account, data: deploymentData, nonce, gas, maxFeePerGas: maxFee, maxPriorityFeePerGas: priority }),
  };
  rows('simulation', [
    ['Result', 'Original runtime matches verified explorer reference; creation eth_call passed; collection runtime template matches; no transaction sent'],
    ['Block', BigInt(block.number).toString()], ['Sender nonce', nonce.toString()],
    ['Original runtime Keccak-256', review.originalCodeHash], ['Original runtime size', `${review.originalCodeBytes} bytes`],
    ['New collection', review.collection], ['New vault', review.graveyard], ['New renderer', review.renderer],
    ['ETH value', '0 ETH'], ['Estimated gas', review.gasEstimate.toString()], ['Requested gas limit', `${gas} (25% margin)`],
    ['Max fee / gas', `${formatUnits(maxFee, 'gwei')} gwei`], ['Max priority / gas', `${formatUnits(priority, 'gwei')} gwei`],
    ['L2 execution fee cap', `${formatEther(executionCap)} ETH, plus any Base L1 data and operator fees; confirm the final total in your wallet`],
    ['Funding check', funded ? 'L2 execution fee cap covered. Additional Base L1 data and operator fees are not included; check the final wallet total.' : 'Insufficient balance for the L2 execution fee cap. Evidence is retained, but sending is disabled.'],
  ]);
  byId('simulation-note').textContent = reviewApproved ? 'Simulation is valid for two minutes. Check the values and tick the confirmation below. A simulation is not a security audit.' : 'Live simulation passed. Sending remains locked pending final release review. Download the simulation record to support that review. A simulation is not a security audit.';
  status(reviewApproved ? 'Simulation passed. Review the exact transaction before opening your wallet confirmation.' : 'Live Base simulation passed. No transaction was sent. Final release review must unlock this exact bytecode before deployment.');
  if (!funded) status('Read-only simulation passed and can be downloaded. The wallet cannot cover execution gas yet, so sending is disabled. Funding and a new simulation are needed before any deployment.');
}));
byId('ack').addEventListener('change', refreshButtons);
byId('download').addEventListener('click', () => {
  if (review) downloadJSON('ganja-ghoulballs-simulation-and-unsigned-transaction.json', {
    manifest, transaction: review.tx,
    simulation: { chainId: CHAIN_ID, observedAt: new Date(review.time).toISOString(), blockNumber: BigInt(review.blockNumber).toString(), account: review.account, nonce: review.nonce.toString(), originalCollection: ORIGINAL, originalCodeHash: review.originalCodeHash, originalCodeBytes: review.originalCodeBytes, originalRuntimeReference: 'matched verified explorer hash and byte length', creationEthCall: 'passed', collectionRuntimeTemplate: 'matched', estimatedGas: review.gasEstimate.toString(), requestedGasLimit: review.gas.toString(), executionFeeCapWei: review.executionCap.toString(), feeScope: 'L2 execution only; excludes any Base L1 data and operator fees. Confirm the final total in the wallet.', executionCapFunded: review.funded, collection: review.collection, graveyard: review.graveyard, renderer: review.renderer },
    note: reviewApproved ? 'Unsigned. Recheck current nonce, network, bytecode, fees, and final wallet confirmation before broadcasting.' : 'NOT APPROVED FOR BROADCAST. Read-only simulation record; final release review is still required.',
  });
});
byId('deploy').addEventListener('click', () => action(async () => {
  if (!reviewApproved || !byId('ack').checked || !review?.funded || submissionLocked) throw new Error('Final release review, a fresh funded simulation, and explicit confirmation are required.');
  validateReleaseApproval(manifest);
  if (readIntent()) { restoreIntent(); throw new Error('A deployment request is already recorded. Check that transaction instead of sending another.'); }
  requireFresh(review, await walletState());
  const finalOriginalCode = await request('eth_getCode', [ORIGINAL, 'latest']);
  validateOriginalRuntime(finalOriginalCode, keccak256);
  if (BigInt(await request('eth_getBalance', [account, 'latest'])) < review.executionCap) throw new Error('Wallet balance no longer covers the execution fee cap. Simulate again.');
  saveIntent({ chainId: CHAIN_ID, account, nonce: review.nonce.toString(), deploymentDataHash: manifest.deploymentDataHash, requestedAt: new Date().toISOString(), state: 'request_started', transactionHash: null });
  submissionLocked = true; refreshButtons();
  status('Review the contract-creation transaction in your own wallet. Only you can confirm it.');
  try {
    submittedHash = await request('eth_sendTransaction', [review.tx]);
  } catch (error) {
    if (error?.code === 4001) { window.localStorage.removeItem(INTENT_KEY); submissionLocked = false; invalidate('You rejected the wallet request. Simulate again if you want to proceed.'); }
    else { invalidate('The wallet response is uncertain. Check your wallet activity and transaction hash before attempting another deployment.'); }
    throw error;
  }
  if (!/^0x[0-9a-f]{64}$/i.test(submittedHash || '')) throw new Error('Wallet returned an unexpected response. Check wallet activity; do not submit again.');
  saveIntent({ ...readIntent(), state: 'submitted', transactionHash: submittedHash });
  byId('txhash').value = submittedHash;
  byId('submitted').textContent = `Submitted: ${submittedHash}. Waiting for the Base receipt. Do not deploy again.`;
  status('Transaction submitted. The site remains disabled until the separate release verification is complete.');
  await checkReceipt(submittedHash);
}));

async function checkReceipt(hash) {
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('Enter a full Base transaction hash.');
  if ((await request('eth_chainId')).toLowerCase() !== CHAIN_HEX) throw new Error('Switch your wallet to Base before checking this transaction.');
  const receipt = await request('eth_getTransactionReceipt', [hash]);
  if (!receipt) {
    byId('receipt').textContent = 'Receipt not available yet. This may be pending. Check your wallet activity before doing anything else.';
    if (hash === submittedHash) pendingTimer = setTimeout(() => checkReceipt(hash).catch(error => status(errorText(error), true)), 5000);
    return;
  }
  clearTimeout(pendingTimer);
  if (BigInt(receipt.status) !== 1n) throw new Error('Deployment transaction reverted. Gas was spent, and no collection was created. Review the failure before retrying.');
  if (!receipt.contractAddress) throw new Error('This receipt is not a contract creation.');
  const transaction = await request('eth_getTransactionByHash', [hash]);
  if (!transaction || transaction.to != null || BigInt(transaction.value) !== 0n || keccak256(transaction.input) !== manifest.deploymentDataHash) throw new Error('This transaction is not the exact reviewed zero-value deployment.');
  const collection = getAddress(receipt.contractAddress);
  if (collection !== getCreateAddress({ from: transaction.from, nonce: BigInt(transaction.nonce) })) throw new Error('Creation address does not match sender and nonce.');
  const [original, vault, renderer, cap, count, deploymentChain] = await Promise.all([
    readContract(collection, artifact.abi, 'originalCollection'), readContract(collection, artifact.abi, 'graveyard'),
    readContract(collection, artifact.abi, 'renderer'), readContract(collection, artifact.abi, 'MAX_SUPPLY'), readContract(collection, artifact.abi, 'SACRIFICE_COUNT'), readContract(collection, artifact.abi, 'deploymentChainId'),
  ]);
  if (original.toLowerCase() !== ORIGINAL || cap !== 420n || count !== 13n || deploymentChain !== 8453n) throw new Error('Deployed collection settings do not match the release.');
  if (getAddress(vault) !== getCreateAddress({ from: collection, nonce: 1 }) || getAddress(renderer) !== getCreateAddress({ from: collection, nonce: 2 })) throw new Error('Child addresses do not match the constructor deployment order.');
  const [vaultOriginal, redeemer] = await Promise.all([
    readContract(vault, children.GooGraveyard.abi, 'originalCollection'), readContract(vault, children.GooGraveyard.abi, 'redeemer'),
  ]);
  if (vaultOriginal.toLowerCase() !== ORIGINAL || getAddress(redeemer) !== collection) throw new Error('Vault immutable addresses do not match this release.');
  const deployed = { GanjaGhoulballs: { address: collection, artifact }, GooGraveyard: { address: vault, artifact: children.GooGraveyard }, GooRenderer: { address: renderer, artifact: children.GooRenderer } };
  const runtimeCodeHashes = {};
  for (const [name, item] of Object.entries(deployed)) {
    const code = await request('eth_getCode', [item.address, 'latest']);
    if (!runtimeMatches(code, item.artifact)) throw new Error(`${name} runtime does not match the reviewed compiler artifact.`);
    runtimeCodeHashes[{ GanjaGhoulballs: 'ganjaCollection', GooGraveyard: 'graveyard', GooRenderer: 'renderer' }[name]] = keccak256(code);
  }
  record = {
    chainId: CHAIN_ID, network: 'Base mainnet', status: 'deployed_receipt_and_runtime_checked',
    originalCollection: ORIGINAL, ganjaCollection: collection, graveyard: getAddress(vault), renderer: getAddress(renderer),
    deployer: getAddress(transaction.from), transactionHash: hash, deployedBlock: Number(BigInt(receipt.blockNumber)),
    blockHash: receipt.blockHash, value: '0x0', gasUsed: BigInt(receipt.gasUsed).toString(),
    compiler: manifest.compiler, mintSupplyCap: 420, originalsPerMint: 13,
    sourceCommit: manifest.sourceCommit, deploymentDataHash: manifest.deploymentDataHash, runtimeCodeHashes,
    sourceVerification: 'pending independent explorer verification',
    note: 'No real NFT approval or mint was performed by this deployment page. Public mint activation requires separate verification.',
  };
  byId('receipt').textContent = JSON.stringify(record, null, 2);
  saveIntent({ chainId: CHAIN_ID, account: record.deployer, nonce: BigInt(transaction.nonce).toString(), deploymentDataHash: manifest.deploymentDataHash, state: 'verified_receipt', transactionHash: hash, collection });
  submissionLocked = true;
  byId('submitted').textContent = `Receipt confirmed. Collection: ${collection}. Download the record for source verification and website configuration.`;
  status('Deployment receipt and all three runtime templates match. Explorer source verification and public mint activation are still separate steps.');
  refreshButtons();
}
byId('check').addEventListener('click', () => action(() => checkReceipt(byId('txhash').value.trim())));
byId('receipt-download').addEventListener('click', () => record && downloadJSON('ganja-ghoulballs-base-deployment.json', record));

async function initialize() {
  for (const id of buttons) byId(id).disabled = true;
  try {
    restoreIntent();
    [manifest, artifact, children] = await Promise.all([
      readJSON('./manifest.json'), readJSON('./artifact.json'),
      Promise.all(['GooGraveyard', 'GooRenderer'].map(async name => [name, await readJSON(`./${name}.json`)])).then(Object.fromEntries),
    ]);
    deploymentData = (await new ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(ORIGINAL)).data;
    rows('release', [
      ['Review status', manifest.reviewed ? 'Reviewed exact bytecode' : 'Locked · awaiting release review'],
      ['Network', 'Base mainnet · chain ID 8453'], ['Constructor original', ORIGINAL], ['New collection', '420 GGOO · 13 originals per later mint'],
      ['Verified original runtime', `${ORIGINAL_RUNTIME_HASH} · ${ORIGINAL_RUNTIME_BYTES} bytes`],
      ['Transaction', 'Contract creation · no recipient · 0 ETH value'], ['Compiler', manifest.compiler],
      ['Creation bytecode Keccak-256', keccak256(artifact.bytecode)], ['Full deployment data Keccak-256', keccak256(deploymentData)],
      ['Source commit', manifest.sourceCommit || 'Not recorded'], ['Review', manifest.reviewSummary || 'Not completed'],
    ]);
    validateManifest(manifest, artifact, { creation: keccak256(artifact.bytecode), deployment: keccak256(deploymentData) }, { allowUnreviewed: true });
    for (const [name, compiled] of Object.entries({ GanjaGhoulballs: artifact, ...children })) {
      if (manifest.runtimeTemplateHashes?.[name] !== keccak256(compiled.deployedBytecode)) throw new Error(`${name} runtime artifact hash mismatch.`);
      if (manifest.artifactHashes?.[name] !== keccak256(toUtf8Bytes(JSON.stringify(compiled)))) throw new Error(`${name} ABI or verification metadata hash mismatch.`);
    }
    releaseReady = true;
    try { reviewApproved = validateReleaseApproval(manifest); } catch { reviewApproved = false; }
    status(reviewApproved ? 'Exact reviewed artifacts loaded. Connect your wallet when you are ready. Nothing is requested automatically.' : 'Artifacts verified. You may connect and run a read-only Base simulation. Sending is locked pending final release review. Nothing is requested automatically.');
  } catch (error) { status(errorText(error), true); }
  refreshButtons();
}
initialize();
