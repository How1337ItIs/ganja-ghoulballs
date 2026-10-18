import solc from 'solc';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = await readFile(new URL('./GhoulBatchDeploy.sol', import.meta.url), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'GhoulBatchDeploy.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': [ 'abi', 'evm.bytecode.object', 'evm.deployedBytecode.object' ] } }
  }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const message of output.errors ?? []) {
  console[message.severity === 'error' ? 'error' : 'warn'](message.formattedMessage);
}
if ((output.errors ?? []).some(x => x.severity === 'error')) process.exit(1);
const artifact = output.contracts?.['GhoulBatchDeploy.sol']?.GhoulBatchDeploy;
if (!artifact?.evm?.bytecode?.object) throw new Error('Missing creation bytecode');
const compiled = {
  compiler: solc.version(),
  network: 'Base',
  chainId: 8453,
  collection: '0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C',
  maxSupply: 6667,
  maxPerTransaction: 30,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  creationBytecode: `0x${artifact.evm.bytecode.object}`,
  constructorAbi: artifact.abi,
};
await mkdir(new URL('./site/', import.meta.url), {recursive:true});
await writeFile(new URL('./site/bytecode.json', import.meta.url), JSON.stringify(compiled, null, 2));
await writeFile(new URL('./site/GhoulBatchDeploy.sol', import.meta.url), source);
console.log(`Ready: ${compiled.compiler}; bytecode ${artifact.evm.bytecode.object.length/2} bytes; SHA-256 ${compiled.sourceSha256}`);
