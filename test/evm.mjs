import {createVM} from '@ethereumjs/vm';
import {createCustomCommon, Mainnet, Hardfork} from '@ethereumjs/common';
import {createAddressFromString, hexToBytes, bytesToHex, Account} from '@ethereumjs/util';
import {Interface, AbiCoder} from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

export const root = path.resolve(import.meta.dirname, '..');
export const ALICE = '0x1111111111111111111111111111111111111111';
export const BOB = '0x2222222222222222222222222222222222222222';
export const CAROL = '0x3333333333333333333333333333333333333333';
export const BASE_ORIGINAL = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
export const address = createAddressFromString;
export function artifact(name) { const a = JSON.parse(fs.readFileSync(path.join(root, 'artifacts', name + '.json'))); a.iface = new Interface(a.abi); return a; }
export function compileMocks() {
  const content = fs.readFileSync(path.join(root, 'test/MockOriginalGhoulballs.sol'), 'utf8');
  const output = JSON.parse(solc.compile(JSON.stringify({language:'Solidity', sources:{'Mock.sol':{content}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}})));
  for (const e of output.errors || []) if(e.severity === 'error') throw Error(e.formattedMessage);
  return Object.fromEntries(Object.entries(output.contracts['Mock.sol']).map(([name,c])=>[name,{abi:c.abi,bytecode:'0x'+c.evm.bytecode.object,deployedBytecode:'0x'+c.evm.deployedBytecode.object,iface:new Interface(c.abi)}]));
}
export async function environment(chainId = 31337) {
  const common = createCustomCommon({chainId}, Mainnet, {hardfork: Hardfork.Cancun});
  const vm = await createVM({common});
  for (const a of [ALICE,BOB,CAROL]) await vm.stateManager.putAccount(address(a), new Account(0n, 10n**24n));
  return vm;
}
export async function raw(vm,{to,from=ALICE,data='0x',value=0n,gasLimit=30000000n,isStatic=false,block}={}) {
  // Reset transaction-scoped warm storage accounting. runCall intentionally performs
  // no signing or RPC broadcast; it is an in-memory EVM execution only.
  await vm.evm.journal.cleanup();
  const r = await vm.evm.runCall({caller:address(from),origin:address(from),...(to ? {to:address(to)}:{}), data:hexToBytes(data),value:BigInt(value),gasLimit:BigInt(gasLimit),isStatic,...(block ? {block} : {})});
  const result = {ok:!r.execResult.exceptionError, error:r.execResult.exceptionError?.error, data:bytesToHex(r.execResult.returnValue), gas:r.execResult.executionGasUsed, logs:r.execResult.logs||[], created:r.createdAddress?.toString()};
  return result;
}
export async function deploy(vm,a,args=[],options={}) {
  const ctor=a.abi.find(x=>x.type==='constructor');
  const encoded = ctor?.inputs?.length ? AbiCoder.defaultAbiCoder().encode(ctor.inputs.map(x=>x.type),args).slice(2) : '';
  const r = await raw(vm,{data:a.bytecode+encoded,...options});
  if (!r.ok) throw Error(`Deploy failed: ${r.error} ${r.data}`);
  return {address:r.created,artifact:a,deploymentGas:r.gas};
}
export async function call(vm,c,method,args=[],options={}) {
  const r=await raw(vm,{to:c.address,data:c.artifact.iface.encodeFunctionData(method,args),...options});
  if(r.ok) r.value=c.artifact.iface.decodeFunctionResult(method,r.data);
  return r;
}
export async function read(vm,c,method,args=[],options={}) {
  const r=await call(vm,c,method,args,{...options,isStatic:true});
  if(!r.ok) throw Error(`Read ${method} failed: ${r.error} ${r.data}`);
  return r.value.length===1?r.value[0]:r.value;
}
export function ids(first=1){return Array.from({length:13},(_,i)=>BigInt(first+i));}
