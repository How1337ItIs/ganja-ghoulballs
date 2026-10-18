/* The existing constructor-only GhoulBatchDeploy helper, pinned to upstream 9a3422c. */
import {Interface, keccak256} from './vendor/ethers.min.js';
export const ORIGINAL_COLLECTION='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
export const ORIGINAL_CAP=6667, ORIGINAL_BATCH_MAX=30;
export const CREATION_HASH='0xfd05fc6e651540802d65c5c8337286d616d35136fc873706e605d73cde511d43';
export const SOURCE_HASH='3912d48ce14c11266b45c583c12ce38083c64877e711aaf8ff2080545153fb8a';
export const CONSTRUCTOR_ABI=[{inputs:[{internalType:'uint256',name:'quantity',type:'uint256'}],stateMutability:'nonpayable',type:'constructor'}];
const constructor=new Interface(CONSTRUCTOR_ABI), events=new Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
const ZERO='0x0000000000000000000000000000000000000000', GAS_CEILING=16777216n;
const lower=value=>typeof value==='string'?value.toLowerCase():'';
export function quantityOf(value){
 if(!/^(?:[1-9]|[12]\d|30)$/.test(String(value)))throw Error('Choose a whole quantity from 1 to 30 original Ghoulballs.');
 return Number(value);
}
export function verifyOriginalArtifact(artifact){
 if(artifact?.compiler!=='0.8.30+commit.73712a01.Emscripten.clang'||artifact.chainId!==8453||artifact.network!=='Base'||lower(artifact.collection)!==ORIGINAL_COLLECTION||artifact.maxSupply!==ORIGINAL_CAP||artifact.maxPerTransaction!==ORIGINAL_BATCH_MAX||artifact.sourceSha256!==SOURCE_HASH||JSON.stringify(artifact.constructorAbi)!==JSON.stringify(CONSTRUCTOR_ABI)||!/^0x[0-9a-f]{1842}$/i.test(artifact.creationBytecode||'')||keccak256(artifact.creationBytecode)!==CREATION_HASH)throw Error('Original batch helper does not match its reviewed source, ABI and creation bytecode.');
 return artifact;
}
export function originalCreationData(artifact,quantity){return verifyOriginalArtifact(artifact).creationBytecode+constructor.encodeDeploy([quantityOf(quantity)]).slice(2);}
export function rpcAmount(value,label){if(typeof value!=='string'||!/^0x[0-9a-f]+$/i.test(value))throw Error('Invalid '+label+' from Base. No transaction requested.');return BigInt(value);}
export const buffered=value=>(value*120n+99n)/100n;
export function originalGasLimit(value){const estimate=rpcAmount(value,'gas estimate'),limit=buffered(estimate);if(estimate<53000n||limit>GAS_CEILING)throw Error('Unsafe original-mint gas estimate. Choose fewer originals or retry the estimate.');return limit;}
export function originalFeeCall(selector,value){return {to:'0x420000000000000000000000000000000000000f',data:selector+value.toString(16).padStart(64,'0')};}
export function assertOriginalTransaction(tx,saved,artifact){
 if(!tx||lower(tx.from)!==lower(saved.recipient)||(tx.to!==null&&tx.to!==undefined)||rpcAmount(tx.chainId,'transaction chain')!==8453n||rpcAmount(tx.value,'transaction value')!==0n||lower(tx.input||tx.data)!==lower(originalCreationData(artifact,saved.quantity)))throw Error('This Base transaction does not match the saved sender, zero-value contract creation and exact original quantity. Do not submit again.');
 if(saved.hash&&tx.hash&&lower(tx.hash)!==lower(saved.hash))throw Error('Returned transaction hash does not match the saved original mint.');
}
export function parseOriginalReceipt(receipt,saved){
 if(lower(receipt?.transactionHash)!==lower(saved.hash))throw Error('Original mint receipt hash does not match. Do not submit again.');
 const ids=[];
 for(const log of receipt.logs||[]){
  if(lower(log.address)!==ORIGINAL_COLLECTION)continue;
  if(lower(log.topics?.[0])!==lower(events.getEvent('Transfer').topicHash))continue;
  if(log.removed)throw Error('Original mint receipt includes a removed event. Do not submit again.');
  let event;try{event=events.parseLog(log);}catch{throw Error('Malformed original mint Transfer event. Do not submit again.');}
  if(lower(event.args.from)!==ZERO||lower(event.args.to)!==lower(saved.recipient)||event.args.tokenId<1n||event.args.tokenId>6667n)throw Error('Original mint receipt has an unexpected recipient, transfer or token ID. Do not submit again.');
  ids.push(String(event.args.tokenId));
 }
 if(ids.length!==quantityOf(saved.quantity)||new Set(ids).size!==ids.length)throw Error('Original mint receipt does not contain exactly the expected unique original NFTs. Do not submit again; inspect the receipt.');
 return ids;
}
