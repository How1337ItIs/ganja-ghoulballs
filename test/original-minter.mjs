import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AbiCoder, Interface, getCreateAddress, keccak256} from 'ethers';
import {Account, bytesToHex, hexToBytes} from '@ethereumjs/util';
import solc from 'solc';
import {root, ALICE, BOB, BASE_ORIGINAL, address, environment, raw, deploy, call, read} from './evm.mjs';

// These tests only execute in-memory EthereumJS calls. They do not connect to an
// RPC, request a wallet, sign, or broadcast. The failure-injection mock is not a
// replacement for the captured-production-bytecode checks at the end.
const batch = JSON.parse(fs.readFileSync(path.join(root, 'site/original-minter.json')));
const source = fs.readFileSync(path.join(root, 'batch-minter/GhoulBatchDeploy.sol'), 'utf8');
assert.equal(batch.sourceSha256, createHash('sha256').update(source).digest('hex'));
assert.equal(batch.collection.toLowerCase(), BASE_ORIGINAL);
assert.equal(batch.chainId, 8453);
assert.equal(batch.maxSupply, 6667);
assert.equal(batch.maxPerTransaction, 30);
assert.equal(batch.constructorAbi.find(x => x.type === 'constructor').stateMutability, 'nonpayable');
const batchData = quantity => batch.creationBytecode + AbiCoder.defaultAbiCoder().encode(['uint256'], [quantity]).slice(2);

const mocksSource = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
interface Receiver { function onERC721Received(address,address,uint256,bytes calldata) external returns(bytes4); }
contract OriginalMock {
    uint256 public totalSupply;
    mapping(address => bool) public hasMinted;
    mapping(uint256 => address) private owners;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public mintedBy;
    uint256 public failAt;
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function seedSupply(uint256 supply) external { totalSupply = supply; }
    function setFailure(uint256 tokenId) external { failAt = tokenId; }
    function ownerOf(uint256 tokenId) external view returns(address) { require(owners[tokenId] != address(0), "Missing token"); return owners[tokenId]; }
    function mintTo(address recipient) external returns(uint256 tokenId) {
        require(totalSupply < 6667, "Sold out");
        require(!hasMinted[msg.sender], "Already minted");
        require(recipient != address(0), "Zero recipient");
        hasMinted[msg.sender] = true;
        tokenId = ++totalSupply;
        require(tokenId != failAt, "Injected mint failure");
        owners[tokenId] = recipient;
        balanceOf[recipient]++;
        mintedBy[tokenId] = msg.sender;
        emit Transfer(address(0), recipient, tokenId);
        if (recipient.code.length > 0) {
            require(Receiver(recipient).onERC721Received(msg.sender, address(0), tokenId, "") == Receiver.onERC721Received.selector, "Unsafe recipient");
        }
    }
}
contract SmartRecipient {
    uint256 public callbacks;
    uint256 public mode;
    uint256 public rejectAt;
    bool public entered;
    address public lastOperator;
    bytes public nestedData;
    function configure(uint256 mode_, uint256 rejectAt_, bytes calldata nestedData_) external {
        mode = mode_; rejectAt = rejectAt_; nestedData = nestedData_;
    }
    function mint(bytes memory data) external returns(address) { return createBatch(data); }
    function createBatch(bytes memory data) internal returns(address created) {
        assembly { created := create(0, add(data, 32), mload(data)) }
        if (created == address(0)) assembly { returndatacopy(0, 0, returndatasize()) revert(0, returndatasize()) }
    }
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata) external returns(bytes4) {
        require(msg.sender == 0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C && from == address(0), "Unexpected callback");
        callbacks++; lastOperator = operator;
        if (mode == 1) return 0xffffffff;
        if (mode == 2 && tokenId == rejectAt) revert("Receiver rejected token");
        if (mode == 3 && !entered) { entered = true; createBatch(nestedData); }
        return Receiver.onERC721Received.selector;
    }
}
contract NonReceiver {
    function mint(bytes memory data) external returns(address created) {
        assembly { created := create(0, add(data, 32), mload(data)) }
        require(created != address(0), "Mint failed");
    }
}`;
const compilation = JSON.parse(solc.compile(JSON.stringify({language: 'Solidity', sources: {'Mocks.sol': {content: mocksSource}}, settings: {optimizer: {enabled: true, runs: 200}, evmVersion: 'cancun', outputSelection: {'*': {'*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object']}}}})));
for (const issue of compilation.errors ?? []) if (issue.severity === 'error') throw Error(issue.formattedMessage);
const mocks = Object.fromEntries(Object.entries(compilation.contracts['Mocks.sol']).map(([name, compiled]) => [name, {abi: compiled.abi, iface: new Interface(compiled.abi), bytecode: '0x' + compiled.evm.bytecode.object, deployedBytecode: '0x' + compiled.evm.deployedBytecode.object}]));
const results = [];
const gas = {};
const ok = (result, label = 'call') => {assert(result.ok, `${label}: ${result.error} ${result.data}`); return result;};
const fail = (result, reason) => {
    assert.equal(result.ok, false, 'Expected atomic revert');
    assert.equal(result.logs.length, 0, 'Reverted mint must not expose persisted Transfer events');
    if (reason) assert.equal(AbiCoder.defaultAbiCoder().decode(['string'], '0x' + result.data.slice(10))[0], reason);
    return result;
};
async function test(name, body) {await body(); results.push(name); console.log('PASS', name);}
async function setup({supply = 0, chainId = 8453} = {}) {
    const vm = await environment(chainId);
    await vm.stateManager.putAccount(address(BASE_ORIGINAL), new Account());
    await vm.stateManager.putCode(address(BASE_ORIGINAL), hexToBytes(mocks.OriginalMock.deployedBytecode));
    const original = {address: BASE_ORIGINAL, artifact: mocks.OriginalMock};
    ok(await call(vm, original, 'seedSupply', [supply]));
    return {vm, original};
}
async function mint(vm, quantity, options = {}) {return raw(vm, {data: batchData(quantity), ...options});}
async function assertTokens(vm, original, recipient, first, quantity, expectedSupply = first + quantity - 1) {
    assert.equal(await read(vm, original, 'totalSupply'), BigInt(expectedSupply));
    const senders = new Set();
    for (let id = first; id < first + quantity; id++) {
        assert.equal((await read(vm, original, 'ownerOf', [id])).toLowerCase(), recipient.toLowerCase());
        if (original.artifact === mocks.OriginalMock) {
            const sender = (await read(vm, original, 'mintedBy', [id])).toLowerCase();
            assert.notEqual(sender, recipient.toLowerCase(), 'Fresh child, not recipient, consumes the single mint');
            assert.equal(await read(vm, original, 'hasMinted', [sender]), true);
            assert.equal(await read(vm, original, 'balanceOf', [sender]), 0n);
            assert.equal((await vm.stateManager.getAccount(address(sender))).balance, 0n);
            senders.add(sender);
        }
    }
    if (original.artifact === mocks.OriginalMock) assert.equal(senders.size, quantity, 'Each original uses a different eligible child');
}
function assertTransfers(result, recipient, quantity) {
    const transfers = result.logs.filter(([at, topics]) => bytesToHex(at).toLowerCase() === BASE_ORIGINAL && bytesToHex(topics[0]) === keccak256(Buffer.from('Transfer(address,address,uint256)')));
    assert.equal(transfers.length, quantity);
    for (const [, topics] of transfers) {
        assert.equal(bytesToHex(topics[1]), '0x' + '0'.repeat(64));
        assert.equal(bytesToHex(topics[2]).toLowerCase(), '0x' + recipient.slice(2).toLowerCase().padStart(64, '0'));
    }
}
async function assertEmpty(vm, original, supply, recipient = ALICE) {
    assert.equal(await read(vm, original, 'totalSupply'), BigInt(supply));
    assert.equal(await read(vm, original, 'balanceOf', [recipient]), 0n);
    assert.equal((await call(vm, original, 'ownerOf', [supply + 1])).ok, false);
    assert.equal((await vm.stateManager.getAccount(address(BASE_ORIGINAL))).balance, 0n);
}

for (const quantity of [1, 13, 30]) await test(`${quantity} originals: exact recipient, unique eligible children, no custody or value`, async () => {
    const {vm, original} = await setup();
    const result = ok(await mint(vm, quantity));
    gas[`mock-${quantity}`] = result.gas.toString();
    await assertTokens(vm, original, ALICE, 1, quantity);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), BigInt(quantity));
    assert.equal(await read(vm, original, 'hasMinted', [ALICE]), false);
    assert.equal(await read(vm, original, 'balanceOf', [result.created]), 0n);
    assert.equal((await vm.stateManager.getAccount(address(result.created))).balance, 0n);
    assertTransfers(result, ALICE, quantity);
});
for (const quantity of [0n, 31n, (1n << 256n) - 1n]) await test(`invalid quantity ${quantity} reverts before mint`, async () => {
    const {vm, original} = await setup();
    fail(await mint(vm, quantity), 'Choose 1-30');
    await assertEmpty(vm, original, 0);
});
for (const chainId of [1, 84532]) await test(`chain ${chainId} rejected`, async () => {
    const {vm, original} = await setup({chainId});
    fail(await mint(vm, 1), 'Base only');
    await assertEmpty(vm, original, 0);
});
for (const value of [1n, 10n ** 18n]) await test(`nonzero ETH ${value} rejected without retained value`, async () => {
    const {vm, original} = await setup();
    const before = (await vm.stateManager.getAccount(address(ALICE))).balance;
    fail(await mint(vm, 13, {value}));
    await assertEmpty(vm, original, 0);
    assert.equal((await vm.stateManager.getAccount(address(ALICE))).balance, before);
});
for (const quantity of [1, 13, 30]) await test(`exact final ${quantity} originals succeeds at 6667`, async () => {
    const {vm, original} = await setup({supply: 6667 - quantity});
    const result = ok(await mint(vm, quantity));
    await assertTokens(vm, original, ALICE, 6668 - quantity, quantity);
    assertTransfers(result, ALICE, quantity);
});
for (const [supply, quantity] of [[6667, 1], [6666, 2], [6660, 13]]) await test(`${quantity} requested with ${6667 - supply} remaining reverts atomically`, async () => {
    const {vm, original} = await setup({supply});
    fail(await mint(vm, quantity), 'Not enough left');
    await assertEmpty(vm, original, supply);
});
await test('recipient can mint repeated batches even after consuming its direct mint', async () => {
    const {vm, original} = await setup();
    ok(await call(vm, original, 'mintTo', [ALICE]));
    fail(await call(vm, original, 'mintTo', [ALICE]), 'Already minted');
    ok(await mint(vm, 13));
    ok(await mint(vm, 13));
    await assertTokens(vm, original, ALICE, 2, 26, 27);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), 27n);
    assert.equal(await read(vm, original, 'hasMinted', [ALICE]), true);
});
await test('second wallet receives its own originals, never the first wallet or origin from prior calls', async () => {
    const {vm, original} = await setup();
    ok(await mint(vm, 1));
    const result = ok(await mint(vm, 13, {from: BOB}));
    await assertTokens(vm, original, BOB, 2, 13);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), 1n);
    assert.equal(await read(vm, original, 'balanceOf', [BOB]), 13n);
    assertTransfers(result, BOB, 13);
});
await test('13th child failure rolls back earlier tokens, eligibility, balances, and child deployments', async () => {
    const {vm, original} = await setup();
    ok(await call(vm, original, 'setFailure', [13]));
    const result = fail(await mint(vm, 13), 'Injected mint failure');
    await assertEmpty(vm, original, 0);
    for (let nonce = 1; nonce <= 13; nonce++) {
        const child = getCreateAddress({from: result.created, nonce});
        assert.equal(await read(vm, original, 'hasMinted', [child]), false);
        assert.equal((await vm.stateManager.getCode(address(child))).length, 0);
    }
    ok(await call(vm, original, 'setFailure', [0]));
    ok(await mint(vm, 13));
    await assertTokens(vm, original, ALICE, 1, 13);
});
await test('smart account recipient receives all callbacks and NFTs, not its initiating EOA', async () => {
    const {vm, original} = await setup();
    const receiver = await deploy(vm, mocks.SmartRecipient);
    const result = ok(await call(vm, receiver, 'mint', [batchData(13)]));
    await assertTokens(vm, original, receiver.address, 1, 13);
    assert.equal(await read(vm, receiver, 'callbacks'), 13n);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), 0n);
    assertTransfers(result, receiver.address, 13);
});
for (const [mode, rejectAt] of [[1, 0], [2, 13]]) await test(`receiver rejection mode ${mode} rolls back entire batch and callback state`, async () => {
    const {vm, original} = await setup();
    const receiver = await deploy(vm, mocks.SmartRecipient);
    ok(await call(vm, receiver, 'configure', [mode, rejectAt, '0x']));
    fail(await call(vm, receiver, 'mint', [batchData(13)]));
    await assertEmpty(vm, original, 0, receiver.address);
    assert.equal(await read(vm, receiver, 'callbacks'), 0n);
});
await test('contract without ERC721 receiver cannot strand originals', async () => {
    const {vm, original} = await setup();
    const receiver = await deploy(vm, mocks.NonReceiver);
    fail(await call(vm, receiver, 'mint', [batchData(13)]));
    await assertEmpty(vm, original, 0, receiver.address);
});
await test('receiver-triggered nested batch keeps recipient and ownership correct', async () => {
    const {vm, original} = await setup();
    const receiver = await deploy(vm, mocks.SmartRecipient);
    ok(await call(vm, receiver, 'configure', [3, 0, batchData(1)]));
    const result = ok(await call(vm, receiver, 'mint', [batchData(2)]));
    await assertTokens(vm, original, receiver.address, 1, 3);
    assert.equal(await read(vm, receiver, 'callbacks'), 3n);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), 0n);
    assertTransfers(result, receiver.address, 3);
});
await test('supply consumed during receiver reentry rolls back outer and nested batches', async () => {
    const {vm, original} = await setup({supply: 6665});
    const receiver = await deploy(vm, mocks.SmartRecipient);
    ok(await call(vm, receiver, 'configure', [3, 0, batchData(1)]));
    fail(await call(vm, receiver, 'mint', [batchData(2)]), 'Sold out');
    await assertEmpty(vm, original, 6665, receiver.address);
    assert.equal(await read(vm, receiver, 'callbacks'), 0n);
    assert.equal(await read(vm, receiver, 'entered'), false);
});

// Existing repository evidence pins both deployed runtimes. Their storage is
// deliberately empty here: these are local production-bytecode simulations,
// not a live Base fork and not a proof of the current public remaining supply.
const runtimes = [
    [BASE_ORIGINAL, 'original-basescan-runtime.hex', '0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a'],
    ['0x5902E513C974f5d644DDe577b46626a4BF7CEB30', 'original-renderer-runtime.hex', '0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad']
];
for (const quantity of [1, 13, 30]) await test(`captured original runtime mints ${quantity} directly to the wallet`, async () => {
    const vm = await environment(8453);
    for (const [at, file, expectedHash] of runtimes) {
        const code = fs.readFileSync(path.join(root, 'reports', file), 'utf8').trim();
        assert.equal(keccak256(code), expectedHash);
        await vm.stateManager.putAccount(address(at), new Account());
        await vm.stateManager.putCode(address(at), hexToBytes(code));
    }
    const abi = JSON.parse(fs.readFileSync(path.join(root, 'reports/original-basescan-abi.json')));
    const original = {address: BASE_ORIGINAL, artifact: {abi, iface: new Interface(abi)}};
    const result = ok(await mint(vm, quantity));
    gas[`captured-runtime-${quantity}`] = result.gas.toString();
    await assertTokens(vm, original, ALICE, 1, quantity);
    assert.equal(await read(vm, original, 'balanceOf', [ALICE]), BigInt(quantity));
    assert.equal(await read(vm, original, 'hasMinted', [ALICE]), false);
    assertTransfers(result, ALICE, quantity);
});
const report = {passed: results.length, suite: 'original batch minter local VM', sourceSha256: batch.sourceSha256, creationBytecodeKeccak256: keccak256(batch.creationBytecode), capturedRuntimes: runtimes.map(([at, file, hash]) => ({address: at, file, keccak256: hash})), checks: results, executionGas: gas, limitations: ['Local EthereumJS simulations only; no RPC writes, signing, wallet requests, or real NFTs.', 'Captured runtime storage starts empty; not a live Base fork or live supply check.', 'Execution gas excludes transaction intrinsic gas and Base L1 data fees.']};
fs.writeFileSync(path.join(root, 'reports/original-minter-tests.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
