/* GGOO production client. No write is possible until Base code, wiring and economics verify. */
import {Interface, keccak256, getAddress} from './vendor/ethers.min.js';
const $ = id => document.getElementById(id);
// The script URL is authoritative for assets/config, independent of root or subpath hosting.
const SITE_ROOT = new URL('./', import.meta.url);
const siteURL = (relative, preserveQuery = false) => { const url = new URL(relative, SITE_ROOT); if(preserveQuery)url.search=location.search; return url.href; };
const ORIGINAL = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
const BASE = '0x2105', COUNT = 13, CAP = 420;
const ABI = new Interface([
 'function totalSupply() view returns(uint256)', 'function MAX_SUPPLY() view returns(uint256)',
 'function SACRIFICE_COUNT() view returns(uint256)', 'function deploymentChainId() view returns(uint256)',
 'function originalCollection() view returns(address)', 'function graveyard() view returns(address)',
 'function renderer() view returns(address)', 'function redeemer() view returns(address)',
 'function ownerOf(uint256) view returns(address)', 'function balanceOf(address) view returns(uint256)',
 'function getApproved(uint256) view returns(address)', 'function isApprovedForAll(address,address) view returns(bool)',
 'function setApprovalForAll(address,bool)', 'function mint(uint256[13])',
 'function svg(uint256) view returns(string)', 'function svgStill(uint256) view returns(string)',
 'function ingredientsOf(uint256) view returns(uint256[13])', 'function seedOf(uint256) view returns(uint256)',
 'function traitsOf(uint256) view returns(string)',
 'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
 'event GhoulballsSacrificed(address indexed redeemer,uint256 indexed gooId,uint256[13] originalIds)',
 'error SoldOut()', 'error NotIngredientOwner(uint256)', 'error WrongIngredientOrder()',
 'error Reentered()', 'error NonReceiver()', 'error ZeroAddress()', 'error IngredientNotApproved(uint256)',
 'error IngredientNotLocked(uint256)', 'error NonexistentToken()', 'error NotAuthorized()', 'error WrongFrom()'
]);
const TRANSFER = ABI.getEvent('Transfer').topicHash;
const ZERO = '0x0000000000000000000000000000000000000000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cfg, provider, account = null, chain = null, generation = 0, live = false, minted = null;
let selected = new Set(), owned = [], verified = null, approved = false, busy = null, scanning = false;
let review = null, pending = null, galleryCursor = null, galleryLoading = false, tokenGeneration = 0;
let toastTimer, providerBound = false;
const checkedRpc = new Set();
const lower = a => typeof a === 'string' ? a.toLowerCase() : '';
const validAddress = a => /^0x[0-9a-f]{40}$/i.test(a || '') && lower(a) !== ZERO;
const hashPattern = /^0x[0-9a-f]{64}$/i;
const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
const idsNow = () => [...selected].sort((a,b) => BigInt(a) < BigInt(b) ? -1 : 1);
const snapshot = () => ({account, chain, generation, ids:idsNow(), collection:cfg?.ganjaCollection});
const same = s => s.generation === generation && s.account === account && s.chain === chain && s.ids.join(',') === idsNow().join(',');
const verificationCurrent = () => verified && same(verified);
const writable = () => live && account && chain === BASE && Number.isInteger(minted) && minted < CAP && !busy && !pending;
const text = (id, value) => { $(id).textContent = value; };
function status(message, error = false) { text('mint-state-message',message); $('mint-state-message').classList.toggle('error',error); }
function feedback(message, error = false) { text('selection-feedback',message); $('selection-feedback').classList.toggle('error',error); }
function notify(message) { text('toast',message); $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),6500); }
function humanError(e) {
 const code = e?.code ?? e?.error?.code;
 if (code === 4001 || code === 'ACTION_REJECTED') return 'Cancelled in your wallet. No new transaction was submitted by this step.';
 if (code === -32002) return 'Your wallet already has a request open. Finish or cancel it there first.';
 let msg = e?.shortMessage || e?.message || String(e);
 const data = e?.data?.data || e?.data || e?.error?.data;
 if(typeof data === 'string') { try { const decoded = ABI.parseError(data); if(decoded) msg=decoded.name; } catch {} }
 if (/SoldOut/i.test(msg)) return 'All 420 Ganja Ghoulballs have been summoned.';
 if (/NotIngredientOwner/i.test(msg)) return 'One of the 13 originals has changed owner. Refresh and verify your selection again.';
 if (/WrongIngredientOrder/i.test(msg)) return 'Choose exactly 13 distinct original IDs, from 1 to 6667.';
 if (/insufficient funds/i.test(msg)) return 'Your wallet needs enough Base ETH for network gas. The protocol mint fee is 0 ETH.';
 return String(msg).slice(0,280);
}
function cacheGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function cacheSet(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} }
function cacheDelete(key) { try { localStorage.removeItem(key); } catch {} }
function pendingKey() { return `ggoo:pending:8453:${lower(cfg?.ganjaCollection)}`; }
function savePendingIntent(value) {
 const encoded=JSON.stringify(value);
 try {localStorage.setItem(pendingKey(),encoded);if(localStorage.getItem(pendingKey())!==encoded)throw Error('Storage read-back mismatch.');}
 catch {throw Error('Browser storage is unavailable or full. No transaction was started. Enable site storage or clear the optional image cache before trying again.');}
}
function invalidate(clear = false) {
 generation++; verified=null; approved=false; $('consent').checked=false;
 if(clear) { selected.clear(); owned=[]; $('manual-ids').value=''; text('og-balance','—'); }
 if($('review-dialog').open) $('review-dialog').close(); review=null;
 render();
}
async function rawRpc(url, method, params) {
 const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),15000);
 try {
  const res=await fetch(siteURL(url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params}),signal:controller.signal});
  if(!res.ok) throw Error(`Base RPC unavailable (${res.status}).`);
  const body=await res.json(); if(body.error) { const e=Error(body.error.message || 'RPC error'); e.data=body.error.data; e.code=body.error.code; throw e; }
  if(body.result === undefined) throw Error('RPC returned no result.'); return body.result;
 } finally { clearTimeout(timeout); }
}
async function rpc(method, params=[]) {
 let last;
 for(const url of cfg?.rpcUrls || []) {
  try {
   if(!checkedRpc.has(url)) { const id=await rawRpc(url,'eth_chainId',[]); if(BigInt(id)!==8453n) throw Error('RPC is not Base mainnet.'); checkedRpc.add(url); }
   return await rawRpc(url,method,params);
  } catch(e) { last=e; }
 }
 throw last || Error('No verified Base RPC is available.');
}
async function call(address, method, args=[], block='latest') {
 const data=ABI.encodeFunctionData(method,args);
 const result=await rpc('eth_call',[{to:address,data,gas:'0x2faf080'},block]);
 return ABI.decodeFunctionResult(method,result)[0];
}
async function verifyDeployment() {
 if(cfg.chainId!==8453 || lower(cfg.originalCollection)!==ORIGINAL || cfg.maxSupply!==CAP || cfg.sacrificeCount!==COUNT) throw Error('Configuration does not match the required Base collection and 13-for-1 economics.');
 if(cfg.deploymentStatus!=='deployed-verified') return false;
 const names=['ganjaCollection','graveyard','renderer'];
 if(!names.every(n=>validAddress(cfg[n]) && hashPattern.test(cfg.runtimeCodeHashes?.[n]))) throw Error('Verified deployment addresses or runtime code hashes are missing.');
 if(new Set(names.map(n=>lower(cfg[n]))).size!==3) throw Error('Contract addresses must be distinct.');
 for(const name of names) {
  const code=await rpc('eth_getCode',[cfg[name],'latest']);
  if(!/^0x[0-9a-f]+$/i.test(code) || code.length<4 || lower(keccak256(code))!==lower(cfg.runtimeCodeHashes[name])) throw Error(`Deployed ${name} code does not match the verified runtime hash.`);
 }
 const checks=[
  [cfg.ganjaCollection,'MAX_SUPPLY',CAP], [cfg.ganjaCollection,'SACRIFICE_COUNT',COUNT],
  [cfg.ganjaCollection,'deploymentChainId',8453], [cfg.ganjaCollection,'originalCollection',ORIGINAL],
  [cfg.ganjaCollection,'graveyard',cfg.graveyard], [cfg.ganjaCollection,'renderer',cfg.renderer],
  [cfg.graveyard,'originalCollection',ORIGINAL], [cfg.graveyard,'redeemer',cfg.ganjaCollection]
 ];
 for(const [address,fn,expected] of checks) { const value=await call(address,fn); if(lower(String(value))!==lower(String(expected))) throw Error(`Contract ${fn} does not match its published configuration.`); }
 return true;
}
function render() {
 const connected=!!account;
 $('wallet-details').hidden=!connected;
 text('wallet-address',account ? getAddress(account) : '');
 text('connect-wallet',connected?short(getAddress(account))+' ↗':'CONNECT WALLET ↗');
 $('switch-base').hidden=!connected || chain===BASE;
 for(const id of ['switch-account','refresh-account','disconnect-wallet','switch-base']) $(id).disabled=!!busy || !!pending;
 $('wallet-summary').hidden=!connected;
 $('scan-inventory').disabled=!connected || !live || scanning || !!busy || !!pending;
 $('manual-ids').disabled=!writable();
 $('verify-ids').disabled=!writable() || selected.size!==COUNT;
 $('select-thirteen').disabled=!writable() || owned.length<COUNT;
 $('clear-selection').disabled=!writable() || !selected.size;
 $('consent').disabled=!writable() || !verificationCurrent() || !approved;
 text('selected-count',selected.size);
 $('inventory').replaceChildren();
 for(const id of owned) {
  const button=document.createElement('button'); button.type='button'; button.className='id-chip'+(selected.has(id)?' selected':''); button.textContent='#'+id; button.setAttribute('aria-pressed',String(selected.has(id))); button.disabled=!writable();
  button.onclick=()=>{ if(selected.has(id))selected.delete(id);else if(selected.size<COUNT)selected.add(id);else {notify('Select exactly 13 originals. Remove one to change your selection.');return;} invalidate(); $('manual-ids').value=idsNow().join(', '); };
  $('inventory').append(button);
 }
 const needApproval=verificationCurrent() && !approved;
 $('approval-note').hidden=!verificationCurrent();
 text('approval-note',approved?'Approval checked: the GGOO contract may transfer all 13 selected originals. Review the irreversible mint next.':'Approval is a separate transaction. Collection-wide approval allows the GGOO contract to transfer ANY original Ghoulball in this wallet, including future originals, until revoked. It is not limited to the 13 selected here. Approval alone does not lock or mint anything.');
 $('approve-button').hidden=!needApproval; $('approve-button').disabled=!writable();
 $('main-mint-button').disabled=!(writable() && verificationCurrent() && selected.size===COUNT && approved && $('consent').checked);
 const label=!live?'AWAITING MAINNET CONTRACT':pending?'TRANSACTION PENDING':busy?'CHECKING YOUR WALLET…':minted===null?'SUPPLY UNAVAILABLE · MINT PAUSED':minted>=CAP?'ALL 420 SUMMONED':!connected?'CONNECT WALLET TO START':chain!==BASE?'SWITCH YOUR WALLET TO BASE':!verificationCurrent()?'VERIFY YOUR 13 ORIGINALS':!approved?'APPROVE BEFORE SUMMONING':!$('consent').checked?'ACKNOWLEDGE PERMANENT LOCK':'REVIEW 13 → 1 SUMMON';
 $('main-mint-button').querySelector('span').textContent=label;
 for(const [id,active] of [['step-connect',!connected||chain!==BASE],['step-select',connected&&!verificationCurrent()],['step-approve',needApproval],['step-redeem',verificationCurrent()&&approved]]) $(id).classList.toggle('active',!!active);
}
function updateSupply(value) {
 minted=value; text('live-supply',value===null?'—':value); text('mint-count-now',value===null?'—':value);
 $('mint-progress-bar').style.width=value===null?'0%':`${100*value/CAP}%`; render();
}
async function supplyRead() { const n=await call(cfg.ganjaCollection,'totalSupply'); if(n<0n || n>420n) throw Error('Onchain supply is out of bounds.'); return Number(n); }
async function refreshSupply() {
 if(!live)return;
 try {const previous=minted;updateSupply(await supplyRead());if(previous!==null&&minted>previous)resetGallery();if(minted===CAP)status('ALL 420 SUMMONED. The collection is sold out.');}
 catch(e) {updateSupply(null);status('Live supply could not be verified. Minting is paused. '+humanError(e),true);}
}
function applyAccount(next, nextChain=chain) {
 const normalized=validAddress(next)?lower(next):null;
 if(account!==normalized || chain!==nextChain) {account=normalized;chain=nextChain;invalidate(true);feedback('Wallet changed. Select and verify originals again.');}
 render();
}
function bindProvider() {
 provider=window.ethereum || null;
 if(!provider || providerBound)return;
 providerBound=true;
 provider.on?.('accountsChanged',arr=>{applyAccount(arr?.[0]);if(account)refreshWallet().catch(()=>{});});
 provider.on?.('chainChanged',id=>{chain=lower(id);invalidate(true);if(chain!==BASE)status('Your wallet is on another network. Switch to Base before approving or minting.',true);else if(account)refreshWallet().catch(()=>{});});
 provider.on?.('disconnect',()=>{applyAccount(null,null);status('Wallet disconnected. Any submitted transaction is still tracked separately.');});
}
async function connectWallet() {
 if(busy||pending)return;
 bindProvider();
 if(!provider) { $('wallet-details').hidden=false;$('wallet-help').open=true;status('Open this site in your Ethereum wallet’s browser, or install a compatible wallet. No wallet was detected.');return; }
 busy='connect';render();
 try {const accounts=await provider.request({method:'eth_requestAccounts'});const id=lower(await provider.request({method:'eth_chainId'}));applyAccount(accounts?.[0],id);status(chain===BASE?'Wallet connected. Select 13 originals when the verified mint opens.':'Wallet connected on another network. Use Switch to Base.');await refreshWallet();}
 catch(e){status(humanError(e),true);}finally{busy=null;render();}
}
async function refreshAccount() {
 if(!provider||busy||pending)return;
 try {const [arr,id]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);applyAccount(arr?.[0],lower(id));await refreshWallet();}catch(e){status(humanError(e),true);}
}
async function switchAccount() {
 if(!provider||busy||pending)return;
 busy='account';render();
 try {await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});const [arr,id]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);applyAccount(arr?.[0],lower(id));status('Account refreshed. Check the full recipient address before choosing originals.');await refreshWallet();}
 catch(e) {if([4200,-32601].includes(e?.code)||/unsupported|not supported/i.test(e?.message||'')){$('wallet-help').open=true;status('Change accounts inside your wallet, then choose Refresh account here.');}else status(humanError(e),true);}
 finally{busy=null;render();}
}
async function switchBase() {
 if(!provider||busy||pending)return;
 try {await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:BASE}]});await refreshAccount();}
 catch(e) {if(e.code===4902)status('Add Base (chain 8453) in your wallet, then refresh this account. Official network details: base.org.',true);else status(humanError(e),true);}
}
async function refreshWallet() {
 if(!account||!cfg)return;
 const snap=snapshot();
 try {const balance=await call(ORIGINAL,'balanceOf',[snap.account]);if(same(snap))text('og-balance',balance.toString());}
 catch(e){if(same(snap))feedback('Could not read original balance. '+humanError(e),true);}
 render();
}
function parseIds(value) {
 if(!value.trim())return [];
 const parts=value.trim().split(/[\s,]+/);
 if(parts.some(s=>!/^\d+$/.test(s)))throw Error('Use whole token IDs separated by commas or spaces. Nothing was silently removed.');
 const ids=parts.map(s=>BigInt(s).toString());
 if(ids.some(s=>BigInt(s)<1n||BigInt(s)>6667n))throw Error('Original token IDs must be between 1 and 6667.');
 if(new Set(ids).size!==ids.length)throw Error('Duplicate original IDs found. Choose 13 distinct NFTs.');
 if(ids.length>COUNT)throw Error('More than 13 IDs entered. Remove the extras; no IDs have been selected.');
 return ids.sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
}
function applyManual() {
 invalidate();selected.clear();
 try {selected=new Set(parseIds($('manual-ids').value));feedback(`${selected.size} of 13 originals selected. Ownership will be checked directly on Base.`);}
 catch(e){feedback(humanError(e),true);}
 render();
}
async function mapLimit(items,limit,work) {
 const results=new Array(items.length);let cursor=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;results[i]=await work(items[i],i);}}));return results;
}
async function checkOwnership(snap) {
 const owners=await mapLimit(snap.ids,4,id=>call(ORIGINAL,'ownerOf',[id]));
 for(let i=0;i<owners.length;i++)if(lower(owners[i])!==snap.account)throw Error(`Original #${snap.ids[i]} is not owned by the selected wallet.`);
}
async function checkApproval(snap) {
 if(await call(ORIGINAL,'isApprovedForAll',[snap.account,cfg.ganjaCollection]))return true;
 const approvals=await mapLimit(snap.ids,4,id=>call(ORIGINAL,'getApproved',[id]));
 return approvals.every(a=>lower(a)===lower(cfg.ganjaCollection));
}
async function verifyIds() {
 if(!writable()||selected.size!==COUNT)return;
 const snap=snapshot();busy='verify';render();status('Verifying all 13 original owners and approvals on Base…');
 try {await checkOwnership(snap);const isApproved=await checkApproval(snap);if(!same(snap))throw Error('Wallet or selection changed. Verify the current selection again.');verified=snap;approved=isApproved;feedback('All 13 originals belong to the displayed wallet. '+(approved?'Approval is active.':'Review the separate collection-wide approval first.'));status('Ownership verified. Your displayed wallet receives the new GGOO.');}
 catch(e){verified=null;approved=false;feedback(humanError(e),true);}
 finally{busy=null;render();}
}
async function scanInventory() {
 if(scanning||!live||!account||busy||pending)return;
 scanning=true;const snap=snapshot();const key=`ggoo:inventory:8453:${ORIGINAL}:${snap.account}`;const cache=cacheGet(key);
 const candidates=new Set(Array.isArray(cache?.ids)?cache.ids.filter(id=>/^\d+$/.test(id)&&BigInt(id)>=1n&&BigInt(id)<=6667n):[]);
 const genesis=cfg.originalGenesisBlock;let cursor=Number.isSafeInteger(cache?.block)?Math.max(genesis,cache.block-128):genesis;
 $('scan-progress').hidden=false;render();feedback('Discovering original Transfer events. You can paste IDs while this read-only scan runs.');
 try {
  const latest=Number(BigInt(await rpc('eth_blockNumber'))),start=cursor;let range=100000;
  if(!Number.isSafeInteger(latest)||latest<genesis)throw Error('RPC block height is invalid.');
  while(cursor<=latest) {
   if(snap.account!==account||snap.chain!==chain)throw Error('Wallet changed. Scan cancelled.');
   const end=Math.min(latest,cursor+range-1);let logs;
   try {logs=await rpc('eth_getLogs',[{address:ORIGINAL,fromBlock:'0x'+cursor.toString(16),toBlock:'0x'+end.toString(16),topics:[TRANSFER,null,'0x'+snap.account.slice(2).padStart(64,'0')]}]);}
   catch(e){if(range>2000){range=Math.max(2000,Math.floor(range/4));continue;}throw e;}
   for(const log of logs)if(!log.removed&&log.topics?.[3]){const id=BigInt(log.topics[3]);if(id>=1n&&id<=6667n)candidates.add(String(id));}
   cacheSet(key,{block:end,ids:[...candidates]});cursor=end+1;
   $('scan-progress').value=Math.round(100*(cursor-start)/Math.max(1,latest-start+1));
   feedback(`Scanning Base blocks: ${Math.min(100,$('scan-progress').value)}%. ${candidates.size} candidate originals found. Ownership is checked next.`);
  }
  let checked=0;const valid=await mapLimit([...candidates],5,async id=>{let owner;try{owner=await call(ORIGINAL,'ownerOf',[id]);}catch{return null;}checked++;if(snap.account===account)feedback(`Checking current ownership: ${checked} / ${candidates.size}.`);return lower(owner)===snap.account?id:null;});
  if(snap.account!==account||snap.chain!==chain)throw Error('Wallet changed. Scan cancelled.');
  owned=valid.filter(Boolean).sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);feedback(`${owned.length} originals currently owned. Choose any 13, or paste IDs to verify directly.`);
 }catch(e){if(snap.account===account)feedback('Automatic scan incomplete. '+humanError(e)+' Paste your 13 IDs for direct ownership verification.',true);}
 finally{scanning=false;$('scan-progress').hidden=true;render();}
}
function paragraph(parent,value,className='') {const p=document.createElement('p');p.textContent=value;if(className)p.className=className;parent.append(p);}
function openReview(kind) {
 if(!writable()||!verificationCurrent()||(kind==='mint'&&(!approved||!$('consent').checked)))return;
 review={...snapshot(),kind};const box=$('review-copy');box.replaceChildren();
 text('review-title',kind==='mint'?'13 originals. Forever.':'Collection-wide approval');
 paragraph(box,'Wallet / GGOO recipient: '+getAddress(review.account));
 paragraph(box,'Network: Base mainnet (8453). Protocol fee: 0 ETH. Your wallet will show the network gas cost.');
 if(kind==='mint') {
  paragraph(box,'PERMANENT LOCK: '+review.ids.map(id=>'#'+id).join(', '),'critical');
  paragraph(box,'These 13 original NFTs will be transferred into the immutable GooGraveyard at '+getAddress(cfg.graveyard)+'. They cannot be withdrawn, traded or recovered. The original ERC-721 supply does not decrease. One GGOO will be minted atomically to the wallet above.');
  paragraph(box,'Mint contract: '+getAddress(cfg.ganjaCollection)+'. If any transfer or mint fails, the entire transaction reverts. Gas can still be charged.');
  text('review-consent-label','I authorize permanently locking these exact 13 originals and minting one GGOO to the recipient above.');
 } else {
  paragraph(box,'Spender: '+getAddress(cfg.ganjaCollection),'critical');
  paragraph(box,'The approval is setApprovalForAll on the original collection '+getAddress(ORIGINAL)+'. It grants this GGOO contract permission over ALL originals held by this wallet, including future originals. It is not limited to the selected 13. The contract only accepts a mint initiated by the owner.');
  paragraph(box,'Approval does not lock NFTs. A separate, explicit mint is required afterward. Revoke this operator approval through your wallet or the original contract’s setApprovalForAll(spender, false) function when no longer needed. Network gas applies to approval and revocation.');
  text('review-consent-label','I understand this is collection-wide operator approval and authorize this separate approval transaction.');
 }
 $('review-consent').checked=false;$('confirm-review').disabled=true;$('review-dialog').showModal();
}
async function assertWallet(snap) {
 if(!provider||!same(snap))throw Error('Wallet, chain or selection changed. Review the current selection again.');
 const [accounts,id]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);
 if(lower(accounts?.[0])!==snap.account||lower(id)!==BASE||!same(snap))throw Error('Wallet changed during review. No new transaction was submitted.');
}
async function preflight(snap, kind) {
 await assertWallet(snap);
 if(!(await verifyDeployment()))throw Error('The verified deployment is unavailable.');
 const total=await supplyRead();updateSupply(total);if(total>=CAP)throw Error('SoldOut');
 await checkOwnership(snap);await assertWallet(snap);
 if(kind==='mint'&&!(await checkApproval(snap)))throw Error('Approval is no longer active. Verify originals again.');
}
function resultLink(hash,kind,recipient,tokenId) {
 const box=$('transaction-result');box.hidden=false;box.replaceChildren();
 paragraph(box,`${kind==='mint'?'Mint':'Approval'} transaction for wallet ${getAddress(recipient)}.`);
 const a=document.createElement('a');a.href=`https://basescan.org/tx/${hash}`;a.target='_blank';a.rel='noopener noreferrer';a.textContent='VIEW TRANSACTION ON BASESCAN ↗';box.append(a);
 if(tokenId) {const b=document.createElement('a');b.href='#token/'+tokenId;b.textContent='VIEW GGOO #'+tokenId+' & ITS 13 ORIGINALS ↗';box.append(document.createElement('br'),b);}
}
function showUncertain(saved) {
 const box=$('transaction-result');box.hidden=false;box.replaceChildren();
 paragraph(box,'A wallet request started for '+getAddress(saved.recipient)+', but no transaction hash is recorded. Minting is locked to prevent a duplicate. Check this wallet’s transaction history on Base before continuing.','critical');
 const label=document.createElement('label');label.textContent='Already submitted? Paste the transaction hash:';label.className='input-label';
 const input=document.createElement('input');input.type='text';input.placeholder='0x… (66 characters)';input.className='hash-input';input.autocomplete='off';input.setAttribute('aria-label','Submitted transaction hash');
 const track=document.createElement('button');track.className='secondary-button';track.textContent='VERIFY & TRACK TRANSACTION';track.type='button';
 track.onclick=async()=>{track.disabled=true;try{
  const hash=input.value.trim();if(!hashPattern.test(hash))throw Error('Enter a valid Base transaction hash.');
  const tx=await rpc('eth_getTransactionByHash',[hash]);
  const expected=ABI.encodeFunctionData(saved.kind==='mint'?'mint':'setApprovalForAll',saved.kind==='mint'?[saved.ids]:[saved.collection,true]);
  if(!tx||lower(tx.from)!==saved.recipient||lower(tx.to)!==lower(saved.kind==='mint'?saved.collection:ORIGINAL)||lower(tx.input||tx.data)!==lower(expected)||BigInt(tx.value||0)!==0n)throw Error('This transaction does not match the saved wallet, target and exact action.');
  pending={...saved,hash,phase:'submitted'};cacheSet(pendingKey(),pending);render();await trackPending();
 }catch(e){status(humanError(e),true);}finally{track.disabled=false;}};
 const clearLabel=document.createElement('label');clearLabel.className='consent';const checkbox=document.createElement('input');checkbox.type='checkbox';const copy=document.createElement('span');copy.textContent='I checked this wallet’s Base history and confirmed that no transaction was submitted or is still awaiting my approval.';clearLabel.append(checkbox,copy);
 const clear=document.createElement('button');clear.className='secondary-button';clear.textContent='CLEAR UNSENT REQUEST';clear.type='button';clear.disabled=true;checkbox.onchange=()=>clear.disabled=!checkbox.checked;
 clear.onclick=()=>{if(!checkbox.checked||pending!==saved)return;pending=null;cacheDelete(pendingKey());invalidate();box.hidden=true;status('Unsent request cleared after your confirmation. Verify your originals again before a new transaction.');};
 box.append(label,input,track,clearLabel,clear);status('Wallet submission outcome is unknown. Check the saved wallet’s Base history before sending another transaction.',true);render();
}
async function submitReview() {
 if(!review||!$('review-consent').checked||busy||pending)return;
 const snap=review;review=null;$('review-dialog').close();busy=snap.kind;render();
 let hash=null;
 try {
  status('Rechecking the exact wallet, deployment, supply and all 13 original owners before opening your wallet…');
  await preflight(snap,snap.kind);
  const tx={chainId:BASE,from:snap.account,to:snap.kind==='mint'?cfg.ganjaCollection:ORIGINAL,data:ABI.encodeFunctionData(snap.kind==='mint'?'mint':'setApprovalForAll',snap.kind==='mint'?[snap.ids]:[cfg.ganjaCollection,true]),value:'0x0'};
  // Simulate the actual transaction from its pinned sender. No transfer occurs in eth_call.
  await rpc('eth_call',[tx,'latest']);await assertWallet(snap);
  const estimate=BigInt(await provider.request({method:'eth_estimateGas',params:[tx]}));
  if(estimate<=0n)throw Error('Wallet returned an invalid gas estimate.');
  tx.gas='0x'+((estimate*120n+99n)/100n).toString(16);await assertWallet(snap);
  status(snap.kind==='mint'?'Confirm the exact 13-original permanent lock in your wallet.':'Confirm collection-wide original NFT approval in your wallet.');
  // Persist before the wallet opens: a reload or transport error must never permit a duplicate send.
  const intent={hash:null,phase:'awaiting-wallet',kind:snap.kind,recipient:snap.account,ids:snap.ids,collection:cfg.ganjaCollection,chainId:8453,submittedAt:Date.now()};savePendingIntent(intent);pending=intent;render();
  hash=await provider.request({method:'eth_sendTransaction',params:[tx]});
  if(!hashPattern.test(hash))throw Error('Wallet did not return a valid transaction hash. Check your wallet history before retrying.');
  pending={hash,phase:'submitted',kind:snap.kind,recipient:snap.account,ids:snap.ids,collection:cfg.ganjaCollection,chainId:8453,submittedAt:Date.now()};cacheSet(pendingKey(),pending);
  resultLink(hash,snap.kind,snap.account);render();await trackPending();
 } catch(e) {
  if(pending && !pending.hash) {
   if(e?.code===4001 || e?.code==='ACTION_REJECTED') {pending=null;cacheDelete(pendingKey());}
   else {pending.phase='uncertain';cacheSet(pendingKey(),pending);showUncertain(pending);}
  }
  status(humanError(e),true);feedback(hash?'A transaction may still be pending. Inspect its Basescan receipt before taking another action.':'If your wallet showed a submitted transaction, inspect its history before retrying. No originals move in a reverted transaction.',true);
  verified=null;approved=false;$('consent').checked=false;
 } finally {busy=null;render();}
}
function parseMintReceipt(receipt, saved) {
 let transfer=null, provenance=null;
 for(const log of receipt.logs||[]) {
  if(lower(log.address)!==lower(saved.collection))continue;
  try {const event=ABI.parseLog(log);if(event.name==='Transfer'&&lower(event.args.from)===ZERO&&lower(event.args.to)===saved.recipient)transfer=event.args.tokenId;
   if(event.name==='GhoulballsSacrificed'&&lower(event.args.redeemer)===saved.recipient)provenance=event.args;
  }catch{}
 }
 if(!transfer||!provenance||transfer!==provenance.gooId||transfer>420n||provenance.originalIds.map(String).join(',')!==saved.ids.join(','))throw Error('The mined receipt does not contain the exact expected mint and provenance events. Do not repeat the mint. Inspect its Basescan receipt.');
 return transfer.toString();
}
async function trackPending() {
 const saved=pending;if(!saved)return;
 resultLink(saved.hash,saved.kind,saved.recipient);let failures=0;
 while(pending===saved) {
  let receipt;
  try {receipt=await rpc('eth_getTransactionReceipt',[saved.hash]);failures=0;}
  catch(e){failures++;status(`Transaction submitted for ${short(saved.recipient)}. Base RPC is temporarily unavailable; checking again. Use the receipt link below.`,true);}
  if(receipt?.blockNumber) {
   if(BigInt(receipt.status)!==1n) {pending=null;cacheDelete(pendingKey());invalidate();status('Transaction reverted on Base. No originals were locked by this transaction. Network gas may have been charged.',true);return;}
   if(saved.kind==='mint') {
    let tokenId;
    try {tokenId=parseMintReceipt(receipt,saved);}catch(e){saved.needsReview=true;cacheSet(pendingKey(),saved);live=false;status(humanError(e),true);return;}
    resultLink(saved.hash,saved.kind,saved.recipient,tokenId);
    pending=null;cacheDelete(pendingKey());invalidate(true);status(`IT LIVES. GGOO #${tokenId} was minted to ${getAddress(saved.recipient)}. The 13 originals are permanently locked.`);notify('GGOO #'+tokenId+' summoned. Receipt and provenance are ready.');
    await refreshSupply();await refreshWallet();resetGallery();
   } else {
    pending=null;cacheDelete(pendingKey());invalidate();status('Collection-wide approval confirmed. Verify your 13 originals again, then review a separate permanent-lock mint.');feedback('Approval did not lock or transfer any originals.');
   }
   render();return;
  }
  if(!failures)status(`${saved.kind==='mint'?'Mint':'Approval'} submitted for ${getAddress(saved.recipient)}. Waiting for the Base receipt. Do not submit again. This transaction remains tracked if the wallet account changes.`);
  await sleep(document.hidden?12000:4000);
 }
}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let motionOverride=null,motionGeneration=0;
const animationsPlaying=()=>motionOverride===null?!motionPreference.matches:motionOverride;
const svgMemory=new Map();
function cacheSvg(key,svg) {
 try {
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('ggoo:svg:'));
  // Keep regenerable artwork below ~0.6 MB, reserving durable storage for transaction intents.
  while(keys.length>=24){localStorage.removeItem(keys.shift());}
  localStorage.setItem(key,JSON.stringify(svg));
 } catch {} // Artwork caching is optional; never let it affect an onchain read.
}
async function tokenSvg(id,still=!animationsPlaying()) {
 const key=`ggoo:svg:8453:${lower(cfg.ganjaCollection)}:${cfg.runtimeCodeHashes.ganjaCollection}:${cfg.runtimeCodeHashes.renderer}:${id}:${still?'still':'animated'}`;
 let svg=svgMemory.get(key)||cacheGet(key);
 if(!svg) {svg=await call(cfg.ganjaCollection,still?'svgStill':'svg',[id]);if(typeof svg!=='string'||svg.length>750000||!/^\s*<svg\b/.test(svg)||!svg.trim().endsWith('</svg>'))throw Error('Invalid onchain SVG response.');svgMemory.set(key,svg);if(svgMemory.size>36)svgMemory.delete(svgMemory.keys().next().value);cacheSvg(key,svg);}
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
let imageQueue=[],imageActive=0;
function queueImage(id,img) {imageQueue.push({id,img,version:motionGeneration,still:!animationsPlaying()});pumpImages();}
function pumpImages() {while(imageActive<3&&imageQueue.length){const {id,img,version,still}=imageQueue.shift();imageActive++;tokenSvg(id,still).then(src=>{if(img.isConnected&&version===motionGeneration&&img.dataset.tokenId===String(id)){img.src=src;img.dataset.rendered='true';img.dataset.motion=still?'paused':'playing';}}).catch(e=>{if(version!==motionGeneration)return;img.alt=`GGOO #${id}: SVG unavailable. Open provenance to retry.`;img.closest('article')?.setAttribute('title',humanError(e));}).finally(()=>{imageActive--;pumpImages();});}}
const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);queueImage(e.target.dataset.tokenId,e.target);}},{rootMargin:'300px'}):null;
function applyMotionPreference() {
 const playing=animationsPlaying();motionGeneration++;
 document.documentElement.dataset.motion=playing?'playing':'paused';
 for(const picture of document.querySelectorAll('.goo-picture, .study-card picture')) {
  // An always/never matching source lets an explicit choice override the OS default.
  // Both choices are native outputs from the same immutable SVG renderer.
  picture.querySelector('source').media=playing?'not all':'all';
 }
 $('motion-toggle').disabled=false;$('motion-toggle').textContent=playing?'Pause animations':'Play animations';
 $('motion-toggle').setAttribute('aria-label',playing?'Pause animations':'Play animations');
 text('motion-note',playing?'Native SVG motion is playing.':motionOverride===null?'Paused to match your device’s reduced-motion setting.':'Native SVG motion is paused.');
 imageQueue=[];
 for(const img of document.querySelectorAll('.gallery-art[data-token-id], #token-art[data-token-id]')) {
  const wasLoaded=!!img.getAttribute('src')||img.dataset.rendered==='true';img.removeAttribute('src');img.dataset.motion=playing?'playing':'paused';
  if(wasLoaded||img.id==='token-art')queueImage(img.dataset.tokenId,img);
  else if(observer)observer.observe(img);else queueImage(img.dataset.tokenId,img);
 }
}
function resetGallery(){galleryCursor=null;$('gallery-content').replaceChildren();loadGallery();}
function loadGallery() {
 $('renderer-studies').hidden=live;
 if(!live){text('gallery-message','PREDEPLOY PREVIEW. No minted GGOOs are claimed here. The live gallery opens after verified Base mainnet deployment.');$('gallery-more').hidden=true;return;}
 if(minted===null){text('gallery-message','Waiting for a verified live supply read.');return;}
 if(!minted){text('gallery-message','No Ganja Ghoulballs summoned yet. The graveyard is hungry.');return;}
 if(galleryLoading)return;galleryLoading=true;
 if(galleryCursor===null)galleryCursor=minted;
 text('gallery-message','Native animated SVG, read from immutable contract code on Base. Tap a ghoul for its traits and all 13 locked originals.');
 const lowerId=Math.max(1,galleryCursor-11);
 for(let id=galleryCursor;id>=lowerId;id--){
  const card=document.createElement('article');card.className='gallery-card';const a=document.createElement('a');a.href='#token/'+id;a.setAttribute('aria-label','View GGOO #'+id+' provenance');
  const img=document.createElement('img');img.className='gallery-art';img.alt=`GGOO #${id}: onchain animated SVG`;img.loading='lazy';img.width=512;img.height=512;img.dataset.tokenId=String(id);
  const meta=document.createElement('div');meta.className='gallery-meta';const name=document.createElement('span');name.textContent='GGOO #'+String(id).padStart(3,'0');const arrow=document.createElement('span');arrow.textContent='PROVENANCE ↗';meta.append(name,arrow);a.append(img,meta);card.append(a);$('gallery-content').append(card);if(observer)observer.observe(img);else queueImage(String(id),img);
 }
 galleryCursor=lowerId-1;$('gallery-more').hidden=galleryCursor<1;galleryLoading=false;
}
function fact(label,value,url) {const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=value;dd.append(a);}else dd.textContent=value;$('token-facts').append(dt,dd);}
function updateWalletDeeplink() {
 if(location.protocol==='https:'){$('metamask-link').href='https://metamask.app.link/dapp/'+location.host+location.pathname+location.search+location.hash;$('metamask-link').hidden=false;}
}
async function routeToken() {
 updateWalletDeeplink();
 const match=location.hash.match(/^#token\/(\d+)$/),current=++tokenGeneration,renderMotion=motionGeneration;
 $('token-page').hidden=!match;if(!match)return;
 const id=BigInt(match[1]);text('token-title','GGOO #'+id);text('token-status','Reading immutable onchain provenance…');$('token-facts').replaceChildren();$('token-ingredients').replaceChildren();$('token-traits').replaceChildren();$('token-art').removeAttribute('src');delete $('token-art').dataset.tokenId;$('token-basescan').hidden=true;$('token-share').disabled=true;
 if(!live){text('token-status','This collection has not passed mainnet verification. No token is claimed or loaded.');return;}
 if(id<1n||id>420n){text('token-status','Token ID must be between 1 and 420.');return;}
 try {
  const [owner,ids,seed,traits,src]=await Promise.all([call(cfg.ganjaCollection,'ownerOf',[id]),call(cfg.ganjaCollection,'ingredientsOf',[id]),call(cfg.ganjaCollection,'seedOf',[id]),call(cfg.ganjaCollection,'traitsOf',[id]),tokenSvg(String(id))]);
  if(current!==tokenGeneration)return;
  if(ids.length!==COUNT)throw Error('Provenance must contain exactly 13 originals.');
  $('token-art').dataset.tokenId=String(id);if(renderMotion===motionGeneration){$('token-art').src=src;$('token-art').dataset.rendered='true';$('token-art').dataset.motion=animationsPlaying()?'playing':'paused';}else queueImage(String(id),$('token-art'));$('token-art').alt='GGOO #'+id+' native onchain SVG';
  fact('CURRENT OWNER',getAddress(owner),'https://basescan.org/address/'+owner);
  fact('COLLECTION',getAddress(cfg.ganjaCollection),'https://basescan.org/address/'+cfg.ganjaCollection);
  fact('IMMUTABLE GRAVEYARD',getAddress(cfg.graveyard),'https://basescan.org/address/'+cfg.graveyard);
  fact('GENERATION SEED',String(seed));
  let attributes;try{attributes=JSON.parse(traits);}catch{attributes=[];}
  for(const trait of (Array.isArray(attributes)?attributes:attributes.attributes||[])){const span=document.createElement('span');span.textContent=String(trait.trait_type)+': '+String(trait.value);$('token-traits').append(span);}
  for(const ingredient of ids){const a=document.createElement('a');a.textContent='#'+ingredient;a.href=`https://basescan.org/nft/${ORIGINAL}/${ingredient}`;a.target='_blank';a.rel='noopener noreferrer';$('token-ingredients').append(a);}
  const url=`https://basescan.org/nft/${cfg.ganjaCollection}/${id}`;$('token-basescan').href=url;$('token-basescan').hidden=false;$('token-share').disabled=false;text('token-status','Art, traits, seed and original IDs read directly from Base. The original ERC-721s remain in the permanent vault.');
  $('token-page').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(current===tokenGeneration)text('token-status','This token is not minted or its onchain data is unavailable. '+humanError(e));}
}
async function initialize() {
 try {
  const res=await fetch(siteURL('config.json'),{cache:'no-store'});if(!res.ok)throw Error('Missing deployment configuration.');cfg=await res.json();
  if(!Array.isArray(cfg.rpcUrls)||!cfg.rpcUrls.length||!Number.isSafeInteger(cfg.originalGenesisBlock)||cfg.originalGenesisBlock<0)throw Error('Invalid RPC or original deployment block configuration.');
  live=await verifyDeployment();
  if(live){text('contract-status','● BASE CODE VERIFIED');$('contract-status').classList.add('live');text('launch-banner','BASE MAINNET · Runtime code and immutable contract wiring verified. 13 originals per GGOO. 0 ETH protocol fee.');status('Contract verified on Base. Connect your wallet and choose exactly 13 originals.');await refreshSupply();}
  else{text('contract-status','● CONTRACT PENDING');status('Renderer preview only. The mainnet deployment is pending. All approvals and minting remain disabled.');updateSupply(null);}
  loadGallery();bindProvider();
  updateWalletDeeplink();
  if(provider) {const [accounts,id]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);applyAccount(accounts?.[0],lower(id));if(account)await refreshWallet();}
  if(live){const saved=cacheGet(pendingKey());if(saved&&(hashPattern.test(saved.hash)||saved.hash===null)&&saved.chainId===8453&&lower(saved.collection)===lower(cfg.ganjaCollection)&&validAddress(saved.recipient)&&['mint','approve'].includes(saved.kind)&&Array.isArray(saved.ids)&&saved.ids.length===COUNT){pending=saved;if(!saved.hash){saved.phase='uncertain';cacheSet(pendingKey(),saved);showUncertain(saved);}else if(saved.needsReview){live=false;status('A previously submitted receipt needs manual review. Use its Basescan link before any further mint.',true);resultLink(saved.hash,saved.kind,saved.recipient);}else trackPending().catch(e=>status(humanError(e),true));}}
  await routeToken();
 }catch(e){live=false;updateSupply(null);text('contract-status','● MINT SAFETY LOCK');status('Cannot verify the Base deployment. All approval and mint controls are disabled. '+humanError(e),true);}
 render();
}
$('motion-toggle').onclick=()=>{motionOverride=!animationsPlaying();applyMotionPreference();};
motionPreference.addEventListener('change',()=>{if(motionOverride===null)applyMotionPreference();});
applyMotionPreference();
$('animation-preview-link').href=siteURL('animation-preview.html',true);
$('connect-wallet').onclick=connectWallet;$('switch-account').onclick=switchAccount;$('refresh-account').onclick=refreshAccount;$('switch-base').onclick=switchBase;
$('disconnect-wallet').onclick=()=>{if(!busy&&!pending){applyAccount(null,chain);status('Disconnected from this page. You can also revoke this site’s connection in your wallet.');}};
$('scan-inventory').onclick=scanInventory;$('manual-ids').oninput=applyManual;$('verify-ids').onclick=verifyIds;
$('select-thirteen').onclick=()=>{if(!writable())return;selected=new Set(owned.slice(0,COUNT));invalidate();$('manual-ids').value=idsNow().join(', ');};
$('clear-selection').onclick=()=>{if(!writable())return;selected.clear();invalidate();$('manual-ids').value='';};
$('consent').onchange=render;$('approve-button').onclick=()=>openReview('approve');$('main-mint-button').onclick=()=>openReview('mint');
$('cancel-review').onclick=()=>{$('review-dialog').close();review=null;};$('review-dialog').addEventListener('cancel',()=>{review=null;});
$('review-consent').onchange=()=>{$('confirm-review').disabled=!$('review-consent').checked;};$('confirm-review').onclick=submitReview;
$('gallery-more').onclick=loadGallery;window.addEventListener('hashchange',routeToken);
$('token-share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:$('token-title').textContent+' · Ganja Ghoulballs',url:location.href});else{await navigator.clipboard.writeText(location.href);notify('Provenance link copied.');}}catch(e){if(e.name!=='AbortError')notify('Copy this page address to share its provenance.');}};
setInterval(()=>{if(live&&!document.hidden&&!busy&&!pending)refreshSupply();},30000);
initialize();
