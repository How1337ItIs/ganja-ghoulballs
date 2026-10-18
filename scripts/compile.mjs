import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import solc from 'solc';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'contracts');
const names = fs.readdirSync(sourceDir).filter(f => f.endsWith('.sol')).sort();
const sources = Object.fromEntries(names.map(f => [`contracts/${f}`, {content: fs.readFileSync(path.join(sourceDir, f), 'utf8')}]));
const settingsBytes = fs.readFileSync(path.join(root, 'solc-settings.json'));
const settings = JSON.parse(settingsBytes);
settings.settings.outputSelection['*']['*'] = ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.deployedBytecode.immutableReferences', 'metadata', 'storageLayout'];
const input = {...settings, sources};
const result = JSON.parse(solc.compile(JSON.stringify(input)));
for (const diagnostic of result.errors || []) {
  (diagnostic.severity === 'error' ? console.error : console.warn)(diagnostic.formattedMessage);
}
if ((result.errors || []).some(x => x.severity === 'error')) process.exit(1);
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, {recursive: true});
fs.writeFileSync(path.join(artifacts, 'standard-input.json'), JSON.stringify(input, null, 2));
const manifest = {compilerSettingsSha256: crypto.createHash('sha256').update(settingsBytes).digest('hex'), compiler: solc.version(), evmVersion: input.settings.evmVersion, optimizer: input.settings.optimizer, viaIR: input.settings.viaIR, sourceSha256: {}, contracts: {}};
for (const [file, source] of Object.entries(sources)) manifest.sourceSha256[file] = crypto.createHash('sha256').update(source.content).digest('hex');
for (const [file, contracts] of Object.entries(result.contracts || {})) {
  for (const [name, c] of Object.entries(contracts)) {
    const artifact = {contractName: name, sourceName: file, compiler: solc.version(), abi: c.abi, bytecode: '0x' + c.evm.bytecode.object,
      deployedBytecode: '0x' + c.evm.deployedBytecode.object, immutableReferences: c.evm.deployedBytecode.immutableReferences,
      storageLayout: c.storageLayout, metadata: JSON.parse(c.metadata)};
    fs.writeFileSync(path.join(artifacts, `${name}.json`), JSON.stringify(artifact, null, 2));
    const runtimeBytes = c.evm.deployedBytecode.object.length / 2;
    const initcodeBytes = c.evm.bytecode.object.length / 2;
    const ctorInputs = (c.abi.find(x => x.type === 'constructor')?.inputs || []);
    if (ctorInputs.some(x => !/^(?:address|bool|u?int(?:[0-9]+)?|bytes[0-9]+)$/.test(x.type))) throw Error(`Dynamic constructor sizing needs explicit review: ${name}`);
    const constructorArgumentBytes = ctorInputs.length * 32;
    manifest.contracts[name] = {runtimeBytes, initcodeBytes, constructorArgumentBytes};
    console.log(`${name}: ${runtimeBytes} runtime bytes; ${initcodeBytes} initcode bytes`);
    if (runtimeBytes > 24576 || initcodeBytes + constructorArgumentBytes > 49152) {
      console.error(`${name} exceeds the EIP-170 runtime or EIP-3860 initcode limit`); process.exitCode = 1;
    }
  }
}
fs.writeFileSync(path.join(artifacts, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
