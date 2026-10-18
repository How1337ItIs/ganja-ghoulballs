import solc from 'solc';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { keccak256 } from 'ethers';

// These pins describe the unchanged upstream source and its reproducible build.
// Keep the original Solidity source-unit name: changing it changes metadata bytes.
export const ORIGINAL_MINTER_PINS = Object.freeze({
  upstream: 'https://github.com/How1337ItIs/ghoulbatch-minter',
  revision: '9a3422c54145118d012649e6a64b4068e3d605e5',
  compiler: '0.8.30+commit.73712a01.Emscripten.clang',
  sourceSha256: '3912d48ce14c11266b45c583c12ce38083c64877e711aaf8ff2080545153fb8a',
  creationBytecodeKeccak256: '0xfd05fc6e651540802d65c5c8337286d616d35136fc873706e605d73cde511d43',
  creationBytecodeBytes: 921,
});
const CONSTRUCTOR_ABI = [{
  inputs: [{ internalType: 'uint256', name: 'quantity', type: 'uint256' }],
  stateMutability: 'nonpayable',
  type: 'constructor',
}];

export async function buildOriginalMinter() {
  const source = await readFile(new URL('../batch-minter/GhoulBatchDeploy.sol', import.meta.url), 'utf8');
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  if (sourceSha256 !== ORIGINAL_MINTER_PINS.sourceSha256) throw new Error('Original minter source does not match the reviewed upstream revision');
  if (solc.version() !== ORIGINAL_MINTER_PINS.compiler) throw new Error('Original minter requires the exact pinned solc 0.8.30 build');
  const settings = {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources: { 'GhoulBatchDeploy.sol': { content: source } },
    settings,
  })));
  for (const message of output.errors ?? []) {
    if (message.severity === 'error') throw new Error(message.formattedMessage);
    console.warn(message.formattedMessage);
  }
  const artifact = output.contracts?.['GhoulBatchDeploy.sol']?.GhoulBatchDeploy;
  const creationBytecode = `0x${artifact?.evm?.bytecode?.object || ''}`;
  if (creationBytecode === '0x' || keccak256(creationBytecode) !== ORIGINAL_MINTER_PINS.creationBytecodeKeccak256 || (creationBytecode.length - 2) / 2 !== ORIGINAL_MINTER_PINS.creationBytecodeBytes) {
    throw new Error('Original minter creation bytecode does not match the reviewed upstream build');
  }
  if (JSON.stringify(artifact.abi) !== JSON.stringify(CONSTRUCTOR_ABI)) throw new Error('Original minter constructor ABI changed');
  const compiled = {
    ...ORIGINAL_MINTER_PINS,
    network: 'Base',
    chainId: 8453,
    collection: '0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C',
    maxSupply: 6667,
    maxPerTransaction: 30,
    creationBytecode,
    constructorAbi: artifact.abi,
    settings,
  };
  await mkdir(new URL('../site/', import.meta.url), { recursive: true });
  await writeFile(new URL('../site/original-minter.json', import.meta.url), `${JSON.stringify(compiled, null, 2)}\n`);
  await writeFile(new URL('../site/GhoulBatchDeploy.sol', import.meta.url), source);
  console.log(`Original minter reproduced: ${compiled.creationBytecodeBytes} bytes; ${compiled.creationBytecodeKeccak256}`);
  return compiled;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await buildOriginalMinter();
