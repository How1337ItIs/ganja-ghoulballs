// Optional fixture refresh, READ ONLY. Never loads accounts, keys or wallets.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Interface,keccak256} from 'ethers';
const root=path.resolve(import.meta.dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'site/config.json')));
if(cfg.chainId!==8453||cfg.ganjaCollection.toLowerCase()!=='0xeec423a9ed7b303e23f41fbc005944fa3fc631b8')throw Error('Unexpected collection configuration.');
const iface=new Interface(['function svg(uint256) view returns(string)','function revealed(uint256) view returns(bool)','function ownerOf(uint256) view returns(address)']);
let id=0;
async function rpc(endpoint,method,params){
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`RPC HTTP ${response.status}`);const result=await response.json();if(result.error)throw Error(result.error.message);return result.result;
}
let lastError;
for(const endpoint of cfg.rpcUrls){
 try{
  if(await rpc(endpoint,'eth_chainId',[])!=='0x2105')throw Error('Wrong chain.');
  const block=await rpc(endpoint,'eth_blockNumber',[]);
  const hashes={};
  for(const role of ['ganjaCollection','renderer']){
   const hash=keccak256(await rpc(endpoint,'eth_getCode',[cfg[role],block]));
   if(hash!==cfg.runtimeCodeHashes[role])throw Error(`${role} code hash mismatch.`);hashes[role]=hash;
  }
  const read=async(name)=>iface.decodeFunctionResult(name,await rpc(endpoint,'eth_call',[{to:cfg.ganjaCollection,data:iface.encodeFunctionData(name,[1])},block]))[0];
  if(await read('revealed')!==true)throw Error('Token 1 has not revealed.');
  const owner=await read('ownerOf'),svg=await read('svg');
  if(typeof svg!=='string'||!svg.includes('<title>Ganja Ghoulballs #1</title>')||svg.length>750000)throw Error('Invalid token 1 SVG.');
  const folder=path.join(root,'test/frontend/fixtures');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'ggoo-live-token-1.svg'),svg);
  const evidence={chainId:8453,collection:cfg.ganjaCollection,renderer:cfg.renderer,tokenId:'1',revealed:true,block:Number(BigInt(block)),owner,codeHashes:hashes,svgSha256:createHash('sha256').update(svg).digest('hex'),svgBytes:Buffer.byteLength(svg),endpoint,readAt:new Date().toISOString(),method:'eth_call(svg(1), revealed(1), ownerOf(1)) and eth_getCode at one pinned block; read only'};
  fs.writeFileSync(path.join(folder,'ggoo-live-token-1.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));process.exit(0);
 }catch(error){lastError=error;console.error(`${endpoint}: ${error.message}`);}
}
throw lastError;
