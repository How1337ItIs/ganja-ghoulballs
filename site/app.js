/* GGOO production client. No write is possible until Base code, wiring and economics verify. */
import {Interface, keccak256, getAddress, formatEther} from './vendor/ethers.min.js';
import {decodeLineage, THEMES, MOTIONS} from './lineage.js';
const $ = id => document.getElementById(id);
// The script URL is authoritative for assets/config, independent of root or subpath hosting.
const SITE_ROOT = new URL('./', import.meta.url);
const siteURL = (relative, preserveQuery = false) => { const url = new URL(relative, SITE_ROOT); if(preserveQuery)url.search=location.search; return url.href; };
const ORIGINAL = '0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c';
const BASE = '0x2105', COUNT = 13, CAP = 420;
const ORIGINAL_HASH='0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a';
const COORDINATOR='0xd5d517abe5cf79b7e95ec98db0f0277788aff634';
const WRAPPER='0xb0407dbe851f8318bd31404a49e658143c982f23', WRAPPER_HASH='0x469c7e3d9661f7d7e41033d44b6198bcfdc4a501b0a9466a395f7842f02a2a8f';
const ABI = new Interface([
 'function recipeOf(uint256) view returns((uint256 seed,uint256 scene,uint256 ballCount,bytes palette,(uint256 radius,uint256 xPhase,uint256 yPhase,bytes3 colour)[] balls,uint256 theme,uint256 motion))',
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
 'function backdrop() view returns(address)', 'function vrfWrapper() view returns(address)',
 'function maxRequestPrice() view returns(uint256)', 'function quoteRandomness() view returns(uint256)',
 'function CALLBACK_GAS_LIMIT() view returns(uint32)', 'function REQUEST_CONFIRMATIONS() view returns(uint16)', 'function NUM_WORDS() view returns(uint32)',
 'function estimateRequestPriceNative(uint32,uint32,uint256) view returns(uint256)',
 'function s_configured() view returns(bool)', 'function s_disabled() view returns(bool)', 'function s_vrfCoordinator() view returns(address)',
 'function mintBlockOf(uint256) view returns(uint256)', 'function mintedBy(uint256) view returns(address)',
 'function ART_VERSION() view returns(string)', 'function revealed(uint256) view returns(bool)',
 'function requestIdOf(uint256) view returns(uint256)', 'function requestPaid(uint256) view returns(uint256)',
 'function parentGenesOf(uint256) view returns(uint256[13])', 'function parentDigestOf(uint256) view returns(bytes32)', 'function genomeOf(uint256) view returns(uint256)',
 'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
 'event GhoulballsSacrificed(address indexed redeemer,uint256 indexed gooId,uint256[13] originalIds)',
 'error SoldOut()', 'error NotIngredientOwner(uint256)', 'error WrongIngredientOrder()',
 'error Reentered()', 'error NonReceiver()', 'error ZeroAddress()', 'error IngredientNotApproved(uint256)',
 'error ReserveInsufficient()', 'error RequestTooExpensive()', 'error RevealPending()', 'error InvalidParentRecipe(uint256)', 'error InvalidParentSet()',
 'error IngredientNotLocked(uint256)', 'error NonexistentToken()', 'error NotAuthorized()', 'error WrongFrom()'
]);
const TRANSFER = ABI.getEvent('Transfer').topicHash;
const ZERO = '0x0000000000000000000000000000000000000000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cfg, provider, account = null, chain = null, generation = 0, live = false, minted = null;
let selected = new Set(), owned = [], verified = null, approved = false, busy = null, scanning = false;
let originalReady=false, scanGeneration=0, inventoryTask=null;
const originalCards=new Map(), recipeCache=new Map(), recipeRequests=new Map();
let review = null, pending = null, galleryCursor = null, galleryLoading = false, tokenGeneration = 0;
let toastTimer, providerBound = null, providerListeners = [], walletEpoch = 0, walletSession = 0, reserve=null, latestMint=null, revealPolling=false, reserveGeneration=0, activeTokenId=null;
const revealStates=new Map(), pendingReveals=new Set();
const checkedRpc = new Set();
const lower = a => typeof a === 'string' ? a.toLowerCase() : '';
const validAddress = a => /^0x[0-9a-f]{40}$/i.test(a || '') && lower(a) !== ZERO;
const hashPattern = /^0x[0-9a-f]{64}$/i;
const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
const idsNow = () => [...selected].sort((a,b) => BigInt(a) < BigInt(b) ? -1 : 1);
const snapshot = () => ({account, chain, generation, ids:idsNow(), collection:cfg?.ganjaCollection});
const same = s => s.generation === generation && s.account === account && s.chain === chain && s.ids.join(',') === idsNow().join(',');
const verificationCurrent = () => verified && same(verified);
const selectable = () => originalReady && account && chain===BASE && !busy && !pending;
const writable = () => live && originalReady && account && chain === BASE && Number.isInteger(minted) && minted < CAP && !busy && !pending;
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
 if (/ReserveInsufficient/i.test(msg)) return 'The publisher-funded randomness reserve is too low. Mint is paused; no originals move in a reverted transaction. You do not pay an extra mint fee.';
 if (/RequestTooExpensive/i.test(msg)) return 'The oracle quote exceeds the immutable request cap. Wait for a lower quote. A reverted mint cannot lock your originals.';
 if (/RevealPending/i.test(msg)) return 'This GGOO is minted and awaiting Chainlink randomness. The originals are already permanently locked. No second transaction is required.';
 if (/InvalidParentRecipe|InvalidParentSet/i.test(msg)) return 'The original collection returned an unsupported parent recipe. Mint cannot proceed.';
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
 if(clear) { stopInventory(false); selected.clear(); owned=[]; $('manual-ids').value=''; text('og-balance','—'); text('inventory-status',account ? chain===BASE?'Finding this wallet’s original Ghoulballs…':'Switch to Base to find this wallet’s original Ghoulballs.':'Connect your wallet to automatically find your original Ghoulballs on Base.'); }
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
 if(lower(cfg.vrfWrapper)!==WRAPPER || lower(cfg.runtimeCodeHashes?.vrfWrapper)!==WRAPPER_HASH || typeof cfg.maxRequestPrice!=='string' || !/^[1-9]\d*$/.test(cfg.maxRequestPrice) || BigInt(cfg.maxRequestPrice)>100000000000000n)throw Error('The pinned oracle wrapper or immutable request-price cap is invalid.');
 const names=['ganjaCollection','graveyard','renderer','backdrop','vrfWrapper'];
 if(!names.every(n=>validAddress(cfg[n]) && hashPattern.test(cfg.runtimeCodeHashes?.[n]))) throw Error('Verified deployment addresses or runtime code hashes are missing.');
 if(new Set(names.map(n=>lower(cfg[n]))).size!==5) throw Error('Contract addresses must be distinct.');
 for(const name of names) {
  const code=await rpc('eth_getCode',[cfg[name],'latest']);
  if(!/^0x[0-9a-f]+$/i.test(code) || code.length<4 || lower(keccak256(code))!==lower(cfg.runtimeCodeHashes[name])) throw Error(`Deployed ${name} code does not match the verified runtime hash.`);
 }
 const checks=[
  [cfg.ganjaCollection,'MAX_SUPPLY',CAP], [cfg.ganjaCollection,'SACRIFICE_COUNT',COUNT],
  [cfg.ganjaCollection,'deploymentChainId',8453], [cfg.ganjaCollection,'originalCollection',ORIGINAL],
  [cfg.ganjaCollection,'graveyard',cfg.graveyard], [cfg.ganjaCollection,'renderer',cfg.renderer],
  [cfg.graveyard,'originalCollection',ORIGINAL], [cfg.graveyard,'redeemer',cfg.ganjaCollection],
  [cfg.renderer,'backdrop',cfg.backdrop], [cfg.ganjaCollection,'vrfWrapper',WRAPPER],
  [cfg.ganjaCollection,'maxRequestPrice',cfg.maxRequestPrice], [cfg.ganjaCollection,'CALLBACK_GAS_LIMIT',100000],
  [cfg.ganjaCollection,'REQUEST_CONFIRMATIONS',3], [cfg.ganjaCollection,'NUM_WORDS',1],
  [cfg.ganjaCollection,'ART_VERSION','GANJA_GHOULBALLS_INHERITED_GOO_V3']
 ];
 for(const [address,fn,expected] of checks) { const value=await call(address,fn); if(lower(String(value))!==lower(String(expected))) throw Error(`Contract ${fn} does not match its published configuration.`); }
 return true;
}
function render() {
 const connected=!!account;
 $('wallet-details').hidden=!connected;
 text('wallet-address',account ? getAddress(account) : '');
 text('connect-wallet',connected?short(getAddress(account))+' ↗':'CONNECT WALLET ↗');
 $('connect-wallet').disabled=!!busy||!!pending;
 renderWalletDialog();
 $('switch-base').hidden=!connected || chain===BASE;
 for(const id of ['switch-account','refresh-account','disconnect-wallet','switch-base']) $(id).disabled=!!busy || !!pending;
 $('wallet-summary').hidden=!connected;
 $('scan-inventory').disabled=!connected || chain!==BASE || scanning || !!busy || !!pending;
 $('cancel-inventory').hidden=!scanning;
 $('manual-ids').disabled=!selectable();
 $('verify-ids').disabled=!writable() || selected.size!==COUNT;
 $('select-thirteen').disabled=!selectable() || owned.length<COUNT;
 $('clear-selection').disabled=!selectable() || !selected.size;
 $('consent').disabled=!writable() || !verificationCurrent() || !approved;
 const next=!connected?'connect':chain!==BASE?'network':selected.size!==COUNT?'select':!verificationCurrent()?'verify':null;
 $('mint-next-step').hidden=!!busy||!!pending||!next||next==='verify'&&!live;
 $('mint-next-step').disabled=next==='verify'&&!writable();
 text('mint-next-step',next==='connect'?'CONNECT WALLET TO START':next==='network'?'SWITCH TO BASE':next==='select'?`SELECT ${COUNT} ORIGINALS · ${selected.size} CHOSEN`:'VERIFY THESE 13 ORIGINALS');
 text('selected-count',selected.size);
 renderInventory();
 const needApproval=verificationCurrent() && !approved;
 $('approval-note').hidden=!verificationCurrent();
 text('approval-note',approved?'Approval checked: the GGOO contract may transfer all 13 selected originals. Review the irreversible mint next.':'Approval is a separate transaction. Collection-wide approval allows the GGOO contract to transfer ANY original Ghoulball in this wallet, including future originals, until revoked. It is not limited to the 13 selected here. Approval alone does not lock or mint anything.');
 $('approve-button').hidden=!needApproval; $('approve-button').disabled=!writable()||!reserve?.ready;
 $('main-mint-button').disabled=!(writable() && reserve?.ready && verificationCurrent() && selected.size===COUNT && approved && $('consent').checked);
 const label=!live?'MINTING NOT OPEN':pending?'TRANSACTION PENDING':busy?'CHECKING YOUR WALLET…':minted===null?'SUPPLY UNAVAILABLE · MINT PAUSED':minted>=CAP?'ALL 420 SUMMONED':!reserve?.ready?'ORACLE RESERVE · MINT PAUSED':!connected?'CONNECT WALLET TO START':chain!==BASE?'SWITCH YOUR WALLET TO BASE':!verificationCurrent()?'VERIFY YOUR 13 ORIGINALS':!approved?'APPROVE BEFORE SUMMONING':!$('consent').checked?'ACKNOWLEDGE PERMANENT LOCK':'REVIEW 13 → 1 SUMMON';
 $('main-mint-button').querySelector('span').textContent=label;
 for(const [id,active] of [['step-connect',!connected||chain!==BASE],['step-select',connected&&!verificationCurrent()],['step-approve',needApproval],['step-redeem',verificationCurrent()&&approved]]) $(id).classList.toggle('active',!!active);
 renderMintFlow();
}
function renderMintFlow() {
 const checked=!!verificationCurrent(),eligible=!!(writable()&&reserve?.ready&&checked&&approved);
 const receiptToken=$('transaction-result').dataset.tokenId;
 $('original-picker').hidden=!account||chain!==BASE;
 document.querySelector('.mint-panel').classList.toggle('selection-complete',checked);
 $('selected-ids').hidden=selected.size===0;
 text('selected-ids','Your selection: '+idsNow().map(id=>'#'+id).join(', '));
 // One applicable action: checking is read-only; approval and mint keep their separate reviews.
 $('mint-next-step').hidden=!!busy||!!pending||!!account&&chain===BASE;
 $('verify-ids').hidden=!!busy||!!pending||!live||!account||chain!==BASE||selected.size!==COUNT||checked;
 $('approve-button').hidden=!!busy||!!pending||!checked||approved||!writable()||!reserve?.ready;
 $('approval-note').hidden=!checked||approved;
 $('mint-consent').hidden=!eligible;
 $('main-mint-button').hidden=!eligible||!$('consent').checked;
 $('oracle-reserve').hidden=reserve?.ready===true;
 let step='STEP 1 OF 4',title='Connect your wallet',description='Find the original Ghoulballs you own on Base. Connecting is free and never signs a transaction.';
 if(pending){step='TRANSACTION STATUS';title=pending.hash?'Waiting for the Base receipt':'Check the open wallet request';description='Do not send again. Your transaction details and recovery options are below.';}
 else if(busy){step='IN PROGRESS';title=busy==='connect'?'Continue in your wallet':busy==='verify'||busy==='approval-check'?'Checking your 13 originals':busy==='approve'?'Approval in progress':busy==='mint'?'Mint in progress':'Checking the current wallet';description=busy==='verify'||busy==='approval-check'?'Read-only checks. No signature, transfer or gas is needed.':'Follow the current wallet request. This page will update when the step completes.';}
 else if(!account){}
 else if(chain!==BASE){title='Switch to Base';description='Your connected wallet is on another network. Switch to Base to choose your originals.';}
 else if(receiptToken&&selected.size===0){step='MINT CONFIRMED';title='GGOO #'+receiptToken+(revealStates.get(receiptToken)===true?' is revealed':' is awaiting randomness');description='Its 13 originals are permanently locked. Open your GGOO or receipt below. Reveal is automatic; no second transaction is needed.';}
 else if(selected.size!==COUNT){step='STEP 2 OF 4 · SELECT';title=`Choose 13 originals · ${selected.size} selected`;description=scanning?'Your wallet is being checked. You can select originals as they appear.':'Tap the originals above. Only these 13 will be locked when you confirm the separate mint.';}
 else if(!live){step='MINT UNAVAILABLE';title='Your selection is ready';description='Minting stays paused until the deployed Base contracts can be verified. No approval or mint can be sent.';}
 else if(minted===null||minted>=CAP){step='MINT UNAVAILABLE';title=minted>=CAP?'All 420 GGOOs are minted':'Live supply is unavailable';description='Minting is paused. Your originals have not moved.';}
 else if(!checked){step='STEP 2 OF 4 · CHECK';title='Check your 13 originals';description='Confirm current ownership and approval with a free, read-only check. No wallet prompt or gas.';}
 else if(!reserve?.ready){step='MINT PAUSED';title='Randomness funding needs a check';description='The current oracle quote or reserve is unavailable. No approval or mint is requested. See the network status above.';}
 else if(!approved){step='STEP 3 OF 4 · APPROVE';title='Approve the collection';description='This separate wallet transaction grants permission. It does not lock your originals or mint a GGOO. Network gas applies.';}
 else {step='STEP 4 OF 4 · MINT';title=$('consent').checked?'Review your permanent-lock mint':'Read the permanent-lock acknowledgment';description=$('consent').checked?'Review the exact 13 IDs and recipient before your wallet opens. Nothing moves until you confirm the mint.':'Approval is confirmed. No originals have moved. Read and tick the acknowledgment below to continue.';}
 text('mint-flow-step',step);text('mint-flow-title',title);text('mint-flow-description',description);
}
function updateSupply(value) {
 minted=value; text('live-supply',value===null?'—':value); text('mint-count-now',value===null?'—':value);
 $('mint-progress-bar').style.width=value===null?'0%':`${100*value/CAP}%`; render();
}
async function supplyRead() { const n=await call(cfg.ganjaCollection,'totalSupply'); if(n<0n || n>420n) throw Error('Onchain supply is out of bounds.'); return Number(n); }
async function refreshReserve() {
 if(!live)return;const current=++reserveGeneration;let budget=null,message;
 try {const gasPriceHex=await rpc('eth_gasPrice');if(!/^0x[0-9a-f]+$/i.test(gasPriceHex)||BigInt(gasPriceHex)<=0n)throw Error('Current Base gas price is unavailable.');const gasPrice=BigInt(gasPriceHex);
  const [quote,balanceHex,configured,disabled,coordinator]=await Promise.all([call(WRAPPER,'estimateRequestPriceNative',[100000,1,gasPrice]),rpc('eth_getBalance',[cfg.ganjaCollection,'latest']),call(WRAPPER,'s_configured'),call(WRAPPER,'s_disabled'),call(WRAPPER,'s_vrfCoordinator')]);
  if(configured!==true||disabled!==false||lower(coordinator)!==COORDINATOR)throw Error('Oracle provider is unavailable or its coordinator changed. Review is required before any approval or mint.');
  if(typeof quote!=='bigint'||quote<=0n||!/^0x[0-9a-f]+$/i.test(balanceHex))throw Error('Invalid oracle reserve response.');
  const balance=BigInt(balanceHex),cap=BigInt(cfg.maxRequestPrice);budget={quote,balance,cap,gasPrice,ready:quote<=cap&&balance>=quote};
  message=budget.ready?'Randomness is publisher-funded. 0 ETH protocol mint fee; your wallet pays network gas only.':quote>cap?'Oracle quote exceeds the immutable cap. Mint is paused until the quote falls.':'Publisher randomness reserve needs funding. Mint is paused; do not send an extra mint fee.';
 }catch(e){message='Oracle reserve could not be verified. Mint is paused. '+humanError(e);}
 if(current===reserveGeneration){reserve=budget;text('oracle-reserve',message);render();}return budget;
}
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
function renderWalletDialog() {
 const connected=!!account;
 text('wallet-dialog-title',connected?'Your wallet':'Connect your wallet');
 text('wallet-dialog-address',connected?getAddress(account):'');
 $('wallet-dialog-connected').hidden=!connected;
 $('wallet-dialog-external').hidden=!!provider;
 $('wallet-connect-injected').hidden=!provider||connected;
 $('wallet-dialog-base').hidden=!connected||chain===BASE;
 for(const id of ['wallet-connect-injected','wallet-dialog-switch','wallet-dialog-refresh','wallet-dialog-base','wallet-dialog-disconnect'])$(id).disabled=!!busy||!!pending;
 updateWalletDeeplink();
}
function walletStatus(message,error=false) {text('wallet-dialog-status',message);status(message,error);}
function openWalletDialog(message='') {
 bindProvider();renderWalletDialog();text('wallet-dialog-status',message);
 if(!$('wallet-dialog').open)$('wallet-dialog').showModal();
}
function bindProvider() {
 const next=typeof window.ethereum?.request==='function'?window.ethereum:null;
 if(next===providerBound)return;
 for(const [name,fn] of providerListeners)providerBound?.removeListener?.(name,fn);
 providerListeners=[];provider=next;providerBound=next;walletEpoch++;walletSession++;
 if(account)applyAccount(null,null);
 if(!provider)return;
 const current=provider;
 const listen=(name,fn)=>{const guarded=(...args)=>{if(provider!==current)return;walletEpoch++;fn(...args);};providerListeners.push([name,guarded]);current.on?.(name,guarded);};
 listen('accountsChanged',arr=>{applyAccount(arr?.[0]);syncWallet(current);});
 listen('chainChanged',id=>{chain=lower(id);invalidate(true);if(chain!==BASE)status('Your wallet is on another network. Switch to Base before approving or minting.',true);else if(account)refreshWallet().catch(()=>{});syncWallet(current);});
 listen('disconnect',()=>{walletSession++;applyAccount(null,null);walletStatus('Wallet disconnected. Any submitted transaction is still tracked separately.');});
}
async function readWalletAccount(current=provider) {
 const epoch=++walletEpoch;
 try{const [arr,id]=await Promise.all([current.request({method:'eth_accounts'}),current.request({method:'eth_chainId'})]);
 if(provider!==current||epoch!==walletEpoch)return false;
 applyAccount(arr?.[0],lower(id));return true;
 }catch(e){if(provider!==current||epoch!==walletEpoch)return false;throw e;}
}
async function syncWallet(current=provider){try{if(current&&await readWalletAccount(current)&&account)refreshWallet();}catch{}}
async function connectWallet() {
 if(busy||pending)return;
 openWalletDialog();
 if(account)return;
 if(!provider){walletStatus('No wallet is connected in this browser. Choose Open in MetaMask below, or open this page in your wallet’s browser.');return;}
 const current=provider,session=walletSession;
 busy='connect';render();walletStatus('Continue in your wallet to connect this site. No signature or transaction is requested.');
 try {
  await current.request({method:'eth_requestAccounts'});
  if(provider!==current||session!==walletSession||!await readWalletAccount(current))return;
  if(!account){walletStatus('No account was selected. Unlock your wallet and try Connect browser wallet again.');return;}
  $('wallet-dialog').close();status(chain===BASE?'Wallet connected. Finding your original Ghoulballs automatically.':'Wallet connected on another network. Use Switch to Base.');refreshWallet();
 }catch(e){if(provider===current)walletStatus(humanError(e),true);}finally{busy=null;render();}
}
async function refreshAccount() {
 if(!provider||busy||pending)return;
 const current=provider;busy='account';render();
 try {if(await readWalletAccount(current)){walletStatus(account?'Account refreshed. Check the full recipient address before choosing originals.':'No account connected. Use Connect browser wallet.');refreshWallet();}}
 catch(e){if(provider===current)walletStatus(humanError(e),true);}finally{busy=null;render();}
}
async function switchAccount() {
 if(!provider||busy||pending)return;
 const current=provider,session=walletSession;busy='account';render();
 try {await current.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});if(provider!==current||session!==walletSession||!await readWalletAccount(current))return;walletStatus('Account refreshed. Check the full recipient address before choosing originals.');refreshWallet();}
 catch(e) {if(provider!==current)return;if([4200,-32601].includes(e?.code)||/unsupported|not supported/i.test(e?.message||'')){$('wallet-help').open=true;openWalletDialog('Change accounts inside your wallet, then choose Refresh account here.');status('Change accounts inside your wallet, then choose Refresh account here.');}else walletStatus(humanError(e),true);}
 finally{busy=null;render();}
}
async function switchBase() {
 if(!provider||busy||pending)return;
 const current=provider;busy='network';render();
 try {await current.request({method:'wallet_switchEthereumChain',params:[{chainId:BASE}]});if(provider!==current||!await readWalletAccount(current))return;walletStatus('Base selected. Check the full recipient address before choosing originals.');refreshWallet();}
 catch(e) {if(provider!==current)return;if(e.code===4902)walletStatus('Add Base (chain 8453) in your wallet, then refresh this account. Official network details: base.org.',true);else walletStatus(humanError(e),true);}
 finally{busy=null;render();}
}
async function refreshWallet() {
 if(!account||chain!==BASE||!cfg)return;
 return scanInventory();
}
function parseIds(value) {
 if(!value.trim())return [];
 const parts=value.trim().split(/[\s,]+/);
 if(parts.some(s=>!/^\d+$/.test(s)))throw Error('Use whole token IDs separated by commas or spaces. Nothing was silently removed.');
 const ids=parts.map(s=>BigInt(s).toString());
 if(ids.some(s=>BigInt(s)<1n||BigInt(s)>6667n))throw Error('Original token IDs must be between 1 and 6667.');
 if(new Set(ids).size!==ids.length)throw Error('Duplicate original IDs found. Choose 13 distinct NFTs.');
 if(ids.length>COUNT)throw Error('Too many IDs entered. Choose exactly 13; no IDs have been selected.');
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
 try {await checkOwnership(snap);const isApproved=await checkApproval(snap);await refreshReserve();if(!same(snap))throw Error('Wallet or selection changed. Verify the current selection again.');verified=snap;approved=isApproved;feedback('All 13 originals belong to the displayed wallet. '+(approved?'Approval is active.':'Review the separate collection-wide approval first.'));status('Ownership verified. Your displayed wallet receives the new GGOO.');}
 catch(e){verified=null;approved=false;feedback(humanError(e),true);}
 finally{busy=null;render();}
}
function stopInventory(announce=true) {
 scanGeneration++;scanning=false;inventoryTask=null;$('scan-progress').hidden=true;
 if(announce){text('inventory-status',`Search stopped. ${owned.length} originals found so far. Choose Refresh owned to continue.`);render();}
}
async function verifyOriginal() {
 if(cfg?.chainId!==8453||lower(cfg.originalCollection)!==ORIGINAL)throw Error('Original collection configuration does not match Base.');
 const code=await rpc('eth_getCode',[ORIGINAL,'latest']);
 if(!/^0x[0-9a-f]+$/i.test(code)||(code.length-2)/2!==8229||lower(keccak256(code))!==ORIGINAL_HASH)throw Error('Original Ghoulballs code could not be verified.');
}
function scanInventory() {
 if(!cfg||!account||chain!==BASE||pending)return Promise.resolve();
 if(scanning)return inventoryTask;
 const version=++scanGeneration,snap={account,chain},current=()=>version===scanGeneration&&snap.account===account&&snap.chain===chain;
 const assertCurrent=()=>{if(!current())throw Error('Search cancelled.');};
 const show=message=>{if(current())text('inventory-status',message);};
 const read=async(method,args=[],block='latest')=>{assertCurrent();const value=await call(ORIGINAL,method,args,block);assertCurrent();return value;};
 originalReady=false;scanning=true;$('scan-progress').value=0;$('scan-progress').hidden=false;show('Checking original Ghoulballs on Base…');render();
 inventoryTask=(async()=>{
  const key=`ggoo:inventory:8453:${ORIGINAL}:${snap.account}`,cache=cacheGet(key);
  const candidates=new Set(Array.isArray(cache?.ids)?cache.ids.filter(id=>typeof id==='string'&&/^\d+$/.test(id)&&BigInt(id)>=1n&&BigInt(id)<=6667n):[]);for(const id of owned)candidates.add(id);
  try {
   await verifyOriginal();assertCurrent();originalReady=true;render();
   const height=await rpc('eth_blockNumber');assertCurrent();const latest=Number(BigInt(height)),genesis=cfg.originalGenesisBlock,block='0x'+latest.toString(16);
   if(!Number.isSafeInteger(latest)||latest<genesis)throw Error('RPC block height is invalid.');
   const balance=await read('balanceOf',[snap.account],block);if(balance<0n||balance>6667n)throw Error('Original balance is out of bounds.');text('og-balance',String(balance));
   const check=async ids=>{let checked=0,failures=0;const valid=await mapLimit(ids,5,async id=>{assertCurrent();try{const owner=await read('ownerOf',[id],block);checked++;show(`Checking current ownership: ${checked} / ${ids.length}.`);return lower(owner)===snap.account?id:null;}catch(e){assertCurrent();failures++;return null;}});assertCurrent();owned=valid.filter(Boolean).sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);render();return failures;};
   if(balance===0n){owned=[];selected.clear();$('manual-ids').value='';invalidate();cacheSet(key,{block:latest,ids:[]});show('No original Ghoulballs found in this wallet on Base. You need 13 to summon one GGOO.');return;}
   let failures=candidates.size?await check([...candidates]):0;
   if(owned.length!==Number(balance)){
    let cursor=Number.isSafeInteger(cache?.block)&&cache.block<=latest?Math.max(genesis,cache.block-128):genesis;
    const start=cursor,topic='0x'+snap.account.slice(2).padStart(64,'0');let range=100000;
    while(cursor<=latest){
     assertCurrent();const end=Math.min(latest,cursor+range-1);let logs;
     try{logs=await rpc('eth_getLogs',[{address:ORIGINAL,fromBlock:'0x'+cursor.toString(16),toBlock:'0x'+end.toString(16),topics:[TRANSFER,null,topic]}]);assertCurrent();}
     catch(e){assertCurrent();if(range>100){range=Math.max(100,Math.floor(range/4));continue;}throw e;}
     if(!Array.isArray(logs))throw Error('Invalid original Transfer-event response.');
     for(const log of logs)if(!log.removed&&lower(log.address)===ORIGINAL&&lower(log.topics?.[0])===lower(TRANSFER)&&lower(log.topics?.[2])===topic&&/^0x[0-9a-f]{64}$/i.test(log.topics?.[3]||'')){const id=BigInt(log.topics[3]);if(id>=1n&&id<=6667n)candidates.add(String(id));}
     assertCurrent();cacheSet(key,{block:end,ids:[...candidates]});cursor=end+1;
     $('scan-progress').value=Math.min(100,Math.round(100*(cursor-start)/Math.max(1,latest-start+1)));show(`Finding your originals: ${$('scan-progress').value}% of Base history checked. ${candidates.size} candidates; current owners are checked next.`);
    }
    failures=await check([...candidates]);
   }
   assertCurrent();
   if(owned.length!==Number(balance))throw Error(`Found ${owned.length} of ${balance} originals. Some ownership reads or history are unavailable. Retry the search or use manual IDs.`);
   const before=idsNow().join(',');selected=new Set(idsNow().filter(id=>owned.includes(id)));if(before!==idsNow().join(',')){invalidate();$('manual-ids').value=idsNow().join(', ');}
   cacheSet(key,{block:latest,ids:[...owned]});show(`${owned.length} originals found. ${owned.length<COUNT?`You need ${COUNT-owned.length} additional originals to select 13.`:'Tap the originals you want to permanently lock. Choose exactly 13.'}${!live?' Selection is read-only while minting is not open.':''}`);
  }catch(e){if(current()){if(!originalReady)invalidate();cacheSet(key,{block:cfg.originalGenesisBlock,ids:[...candidates]});show('Discovery incomplete. '+humanError(e)+' Refresh owned to retry the full history; manual IDs are an optional fallback.');}}
  finally{if(current()){scanning=false;inventoryTask=null;$('scan-progress').hidden=true;render();}}
 })();return inventoryTask;
}
const recipeQueue=[];let recipesActive=0;
function pumpRecipes(){while(recipesActive<3&&recipeQueue.length){const [id,card]=recipeQueue.shift();if(!card.isConnected)continue;recipesActive++;loadOriginalRecipe(id,card).finally(()=>{recipesActive--;pumpRecipes();});}}
const recipeObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){recipeObserver.unobserve(entry.target);recipeQueue.push([entry.target.dataset.originalId,entry.target]);pumpRecipes();}}, {root:$('inventory'),rootMargin:'120px'});
function paintRecipe(card,data) {
 card.querySelector('.original-traits').textContent=`${data.count} ball${data.count===1?'':'s'} · ${THEMES[data.theme]} · ${MOTIONS[data.motion]}`;
 const colors=card.querySelector('.original-colors');colors.replaceChildren();for(const color of data.colors){const swatch=document.createElement('span');swatch.style.backgroundColor=color;swatch.title=color;swatch.setAttribute('aria-label','Original ball colour '+color);colors.append(swatch);}
}
async function loadOriginalRecipe(id,card) {
 const key=`ggoo:recipe:8453:${ORIGINAL_HASH}:${id}`;let data=recipeCache.get(id)||cacheGet(key);
 const valid=d=>d&&[1,2,4,6].includes(d.count)&&Number.isInteger(d.theme)&&d.theme>=0&&d.theme<=3&&Number.isInteger(d.motion)&&d.motion>=0&&d.motion<=3&&Array.isArray(d.colors)&&d.colors.length===d.count&&d.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c));
 if(valid(data)){recipeCache.set(id,data);if(card.isConnected)paintRecipe(card,data);return;}
 if(!originalReady)return;
 try {
  let request=recipeRequests.get(id);if(!request){request=call(ORIGINAL,'recipeOf',[id]).then(recipe=>{const value={count:Number(recipe.ballCount),theme:Number(recipe.theme),motion:Number(recipe.motion),colors:recipe.balls.map(b=>'#'+b.colour.slice(2))};if(!valid(value))throw Error('Unsupported original recipe.');recipeCache.set(id,value);cacheSet(key,value);try{const keys=Object.keys(localStorage).filter(k=>k.startsWith('ggoo:recipe:8453:'+ORIGINAL_HASH+':'));for(const old of keys.slice(0,Math.max(0,keys.length-128)))cacheDelete(old);}catch{}return value;});recipeRequests.set(id,request);request.finally(()=>recipeRequests.delete(id)).catch(()=>{});}
  data=await request;if(card.isConnected)paintRecipe(card,data);
 }catch{if(card.isConnected)card.querySelector('.original-traits').textContent='Traits unavailable · selection still works';}
}
function renderInventory() {
 const inventory=$('inventory'),wanted=new Set(owned);for(const [id,card]of originalCards)if(!wanted.has(id)){recipeObserver.unobserve(card);card.remove();originalCards.delete(id);}
 for(const id of owned){let card=originalCards.get(id);if(!card){card=document.createElement('article');card.className='original-card';card.dataset.originalId=id;
  const choose=document.createElement('button');choose.type='button';choose.className='id-chip';choose.innerHTML='<span class="original-kind">OG GHOULBALL</span><strong>#'+id+'</strong><span class="original-choice">SELECT</span>';choose.onclick=()=>{if(!selectable())return;if(selected.has(id))selected.delete(id);else if(selected.size<COUNT)selected.add(id);else{notify('13 selected. Remove one before choosing another.');return;}invalidate();$('manual-ids').value=idsNow().join(', ');};card.append(choose);
  const traits=document.createElement('p');traits.className='original-traits';traits.textContent='Reading original traits…';card.append(traits);const colors=document.createElement('div');colors.className='original-colors';card.append(colors);
  const link=document.createElement('a');link.className='original-link';link.href=`https://basescan.org/nft/${ORIGINAL}/${id}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent='VIEW ORIGINAL ↗';card.append(link);originalCards.set(id,card);inventory.append(card);recipeObserver.observe(card);
 }
 const choose=card.querySelector('.id-chip'),isSelected=selected.has(id);choose.disabled=!selectable();choose.classList.toggle('selected',isSelected);choose.setAttribute('aria-pressed',String(isSelected));choose.setAttribute('aria-label',(isSelected?'Deselect':'Select')+' original Ghoulball #'+id);card.classList.toggle('selected',isSelected);card.querySelector('.original-choice').textContent=isSelected?'✓ SELECTED':'SELECT';
 }
}
function paragraph(parent,value,className='') {const p=document.createElement('p');p.textContent=value;if(className)p.className=className;parent.append(p);}
async function openReview(kind) {
 if(!writable()||!verificationCurrent()||!reserve?.ready||(kind==='mint'&&(!approved||!$('consent').checked)))return;
 const expected=snapshot();$('review-consent').checked=false;busy='review';render();let budget;
 try{budget=await refreshReserve();if(!same(expected)||!verificationCurrent())throw Error('Wallet or selection changed. Verify originals again.');}
 catch(e){status(humanError(e),true);return;}finally{busy=null;render();}
 if(!budget?.ready){status(!budget?'Oracle reserve could not be verified.':humanError(Error(budget.quote>budget.cap?'RequestTooExpensive':'ReserveInsufficient')),true);return;}
 review={...expected,kind};const box=$('review-copy');box.replaceChildren();
 text('review-title',kind==='mint'?'13 originals. Forever.':'Collection-wide approval');
 paragraph(box,'Wallet / GGOO recipient: '+getAddress(review.account));
 paragraph(box,'Network: Base mainnet (8453). Protocol fee: 0 ETH. Your wallet will show the network gas cost.');
 if(kind==='mint') {
  paragraph(box,'PERMANENT LOCK: '+review.ids.map(id=>'#'+id).join(', '),'critical');
  paragraph(box,'These 13 original NFTs will be transferred into the immutable GooGraveyard at '+getAddress(cfg.graveyard)+'. They cannot be withdrawn, traded or recovered. The original ERC-721 supply does not decrease. One pending GGOO will be minted atomically to the wallet above. The originals are locked immediately, even while its final artwork is awaiting randomness.');
  paragraph(box,'REVEAL RISK: Chainlink supplies randomness after minting. The final appearance is a surprise. There is no cancellation, reroll or second transaction. If the oracle never delivers, the NFT can remain unrevealed permanently; its originals still cannot be recovered.','critical');
  paragraph(box,'The oracle budget is checked at a fresh Base gas price, used consistently for simulation and the wallet request. Editing network fees in your wallet can change the oracle quote; the contract’s immutable cap and reserve check remain the final protection.');
  paragraph(box,'The publisher-funded reserve pays for randomness. If its balance is too low, the quote exceeds the cap, or the oracle request fails, the entire mint reverts before any permanent lock takes effect.');
  paragraph(box,'Mint contract: '+getAddress(cfg.ganjaCollection)+'. If any transfer or mint fails, the entire transaction reverts. Gas can still be charged.');
  text('review-consent-label','I authorize permanently locking these exact 13 originals and minting one pending GGOO to the recipient above, accepting that oracle failure can leave it unrevealed permanently.');
 } else {
  paragraph(box,'Spender: '+getAddress(cfg.ganjaCollection),'critical');
  paragraph(box,'The approval is setApprovalForAll on the original collection '+getAddress(ORIGINAL)+'. It grants this GGOO contract permission over ALL originals held by this wallet, including future originals. It is not limited to the selected 13. The contract only accepts a mint initiated by the owner.');
  paragraph(box,'Approval does not lock NFTs. A separate, explicit mint is required afterward. Revoke this operator approval through your wallet or the original contract’s setApprovalForAll(spender, false) function when no longer needed. Network gas applies to approval and revocation.');
  text('review-consent-label','I understand this is collection-wide operator approval and authorize this separate approval transaction.');
 }
 $('review-consent').checked=false;$('confirm-review').disabled=true;$('review-dialog').showModal();$('review-title').focus({preventScroll:true});$('review-dialog').scrollTop=0;
}
async function assertWallet(snap) {
 if(!provider||!same(snap))throw Error('Wallet, chain or selection changed. Review the current selection again.');
 const [accounts,id]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);
 if(lower(accounts?.[0])!==snap.account||lower(id)!==BASE||!same(snap))throw Error('Wallet changed during review. No new transaction was submitted.');
}
async function preflight(snap, kind) {
 await assertWallet(snap);
 try{await verifyOriginal();}catch(e){originalReady=false;verified=null;approved=false;render();throw e;}
 if(!(await verifyDeployment()))throw Error('The verified deployment is unavailable.');
 const total=await supplyRead();updateSupply(total);if(total>=CAP)throw Error('SoldOut');
 await checkOwnership(snap);await assertWallet(snap);
 if(kind==='mint'&&!(await checkApproval(snap)))throw Error('Approval is no longer active. Verify originals again.');
 const budget=await refreshReserve();if(!budget)throw Error('Oracle reserve could not be verified.');if(budget.quote>budget.cap)throw Error('RequestTooExpensive');if(!budget.ready)throw Error('ReserveInsufficient');await assertWallet(snap);return budget;
}
function resultLink(hash,kind,recipient,tokenId) {
 const box=$('transaction-result');box.hidden=false;box.replaceChildren();box.dataset.txHash=hash;box.dataset.tokenId=tokenId?String(tokenId):'';
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
  const budget=await preflight(snap,snap.kind);
  const tx={chainId:BASE,gasPrice:'0x'+budget.gasPrice.toString(16),from:snap.account,to:snap.kind==='mint'?cfg.ganjaCollection:ORIGINAL,data:ABI.encodeFunctionData(snap.kind==='mint'?'mint':'setApprovalForAll',snap.kind==='mint'?[snap.ids]:[cfg.ganjaCollection,true]),value:'0x0'};
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
 } finally {busy=null;render();pollReveals();}
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
    pending=null;cacheDelete(pendingKey());invalidate(true);latestMint={tokenId,recipient:saved.recipient,hash:saved.hash};pendingReveals.add(tokenId);status(`MINT CONFIRMED. GGOO #${tokenId} was minted to ${getAddress(saved.recipient)}. Its 13 originals are permanently locked now. Awaiting Chainlink randomness; no second transaction is needed.`);notify('GGOO #'+tokenId+' minted. Originals locked; awaiting reveal.');
    paragraph($('transaction-result'),'AWAITING RANDOMNESS. Originals are permanently locked already. This page checks the reveal read-only; no further signature is required.');
    await refreshSupply();await refreshReserve();refreshWallet();resetGallery();pollReveals();
   } else {
    const ownsBusy=!busy;if(ownsBusy)busy='approval-check';
    const sameSelection=account===saved.recipient&&chain===BASE&&idsNow().join(',')===saved.ids.join(',');
    pending=null;cacheDelete(pendingKey());invalidate();status('Collection-wide approval confirmed. Checking your selected originals again…');feedback('Approval did not lock or transfer any originals.');
    if(sameSelection&&live&&originalReady&&selected.size===COUNT){
     const snap=snapshot();
     try {
      try{await verifyOriginal();}catch(e){originalReady=false;throw e;}await assertWallet(snap);await checkOwnership(snap);const isApproved=await checkApproval(snap);await refreshReserve();await assertWallet(snap);
      if(!same(snap))throw Error('Wallet or selection changed. Verify the current selection again.');
      verified=snap;approved=isApproved;
      if(!isApproved)throw Error('Approval is not active for these originals. Verify again before continuing.');
      status('Collection-wide approval confirmed. All 13 originals were rechecked. Read and tick the permanent-lock acknowledgment, then review your mint.');feedback('Approval did not lock or transfer any originals. Ownership and approval are verified; the permanent-lock acknowledgment is still yours to choose.');
     }catch(e){verified=null;approved=false;$('consent').checked=false;status('Approval confirmed, but the current selection needs a fresh check. '+humanError(e),true);feedback('No originals were locked. Use Check 13 originals below to retry.',true);}
    }else status('Collection-wide approval confirmed for '+getAddress(saved.recipient)+'. Wallet or selection changed; choose and verify your current 13 originals before minting.');
    if(ownsBusy)busy=null;
   }
   render();return;
  }
  if(!failures)status(`${saved.kind==='mint'?'Mint':'Approval'} submitted for ${getAddress(saved.recipient)}. Waiting for the Base receipt. Do not submit again. This transaction remains tracked if the wallet account changes.`);
  await sleep(document.hidden?12000:4000);
 }
}
// Old-school native SVG loops are the site default. A manual choice lasts this tab session.
let motionOverride=true,motionGeneration=0;
try{motionOverride=sessionStorage.getItem('ggoo:motion')!=='paused';}catch{}
const animationsPlaying=()=>motionOverride;
const svgMemory=new Map();
function cacheSvg(key,svg) {
 try {
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('ggoo:svg:'));
  // Keep regenerable artwork below ~0.6 MB, reserving durable storage for transaction intents.
  while(keys.length>=24){localStorage.removeItem(keys.shift());}
  localStorage.setItem(key,JSON.stringify(svg));
 } catch {} // Artwork caching is optional; never let it affect an onchain read.
}
async function readReveal(id) {
 id=String(id);if(revealStates.get(id)===true)return true;
 const value=await call(cfg.ganjaCollection,'revealed',[id]);if(typeof value!=='boolean')throw Error('Invalid onchain reveal state.');
 // A completed reveal is immutable; an older concurrent read cannot downgrade it.
 if(revealStates.get(id)===true)return true;
 revealStates.set(id,value);if(value)pendingReveals.delete(id);else pendingReveals.add(id);return value;
}
async function tokenSvg(id,still=!animationsPlaying()) {
 const revealed=await readReveal(id);
 const key=`ggoo:svg:8453:${lower(cfg.ganjaCollection)}:${cfg.runtimeCodeHashes.ganjaCollection}:${cfg.runtimeCodeHashes.renderer}:v3:${id}:${still?'still':'animated'}`;
 let svg=revealed?(svgMemory.get(key)||cacheGet(key)):null;
 if(!svg) {svg=await call(cfg.ganjaCollection,still?'svgStill':'svg',[id]);if(typeof svg!=='string'||svg.length>750000||!/^\s*<svg\b/.test(svg)||!svg.trim().endsWith('</svg>'))throw Error('Invalid onchain SVG response.');
  // Pending artwork changes after the callback. Never cache a cocoon as immutable final art.
  if(revealed){svgMemory.set(key,svg);if(svgMemory.size>36)svgMemory.delete(svgMemory.keys().next().value);cacheSvg(key,svg);}
 }
 if(!revealed&&revealStates.get(String(id))===true)return tokenSvg(id,still);
 return {src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),revealed};
}
function updateImageReveal(img,id) {
 const revealed=revealStates.get(String(id))===true;img.dataset.revealed=String(revealed);
 img.alt=`GGOO #${id}: ${revealed?'revealed native onchain SVG':'pending onchain cocoon; originals permanently locked'}`;
 const badge=img.closest('article')?.querySelector('.reveal-badge');if(badge)badge.textContent=revealed?'REVEALED ↗':'AWAITING RANDOMNESS';
}
async function pollReveals() {
 if(!live||document.hidden||revealPolling)return;revealPolling=true;
 try {
  const displayed=new Set([...document.querySelectorAll('.gallery-art[data-token-id], #token-art[data-token-id]')].map(img=>img.dataset.tokenId));if(latestMint)displayed.add(latestMint.tokenId);if(activeTokenId)displayed.add(activeTokenId);
  const ids=[...new Set([...pendingReveals,...(latestMint?[latestMint.tokenId]:[])])].filter(id=>displayed.has(id));let refreshedToken=false;
  await mapLimit(ids,3,async id=>{try{if(!(await readReveal(id)))return;
   for(const img of document.querySelectorAll('.gallery-art[data-token-id], #token-art[data-token-id]'))if(img.dataset.tokenId===id){updateImageReveal(img,id);queueImage(id,img);}
   if(location.hash==='#token/'+id)refreshedToken=true;
   if(latestMint?.tokenId===id&&!busy&&!pending){const minted=latestMint;latestMint=null;if($('transaction-result').dataset.txHash===minted.hash){status(`REVEALED. GGOO #${id} was minted to ${getAddress(minted.recipient)}. Its final art and inherited lineage are now available. The 13 originals remain permanently locked.`);resultLink(minted.hash,'mint',minted.recipient,id);paragraph($('transaction-result'),'REVEALED ON BASE. Final art and inherited lineage are ready. No additional transaction was sent.');}else notify('GGOO #'+id+' has revealed. Its provenance page now shows final art and lineage.');}
  }catch{/* Keep pending and retry read-only. Never request another randomness outcome. */}});
  if(refreshedToken)await routeToken({scroll:false});
 }finally{revealPolling=false;renderMintFlow();}
}
let imageQueue=[],imageActive=0;
function queueImage(id,img) {imageQueue.push({id,img,version:motionGeneration,still:!animationsPlaying()});pumpImages();}
function pumpImages() {while(imageActive<3&&imageQueue.length){const {id,img,version,still}=imageQueue.shift();imageActive++;tokenSvg(id,still).then(art=>{if(img.isConnected&&version===motionGeneration&&img.dataset.tokenId===String(id)){if(!art.revealed&&revealStates.get(String(id))===true){queueImage(id,img);return;}img.src=art.src;img.dataset.rendered='true';img.dataset.motion=still?'paused':'playing';updateImageReveal(img,id);}}).catch(e=>{if(version!==motionGeneration)return;img.alt=`GGOO #${id}: SVG unavailable. Open provenance to retry.`;img.closest('article')?.setAttribute('title',humanError(e));}).finally(()=>{imageActive--;pumpImages();});}}
const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);queueImage(e.target.dataset.tokenId,e.target);}},{rootMargin:'300px'}):null;
function applyMotionPreference() {
 const playing=animationsPlaying();motionGeneration++;
 document.documentElement.dataset.motion=playing?'playing':'paused';
 for(const picture of document.querySelectorAll('.goo-picture, .study-card picture')) {
  // An always/never matching source switches native animated/still renderer outputs.
  // Both choices are native outputs from the same immutable SVG renderer.
  picture.querySelector('source').media=playing?'not all':'all';
 }
 $('motion-toggle').disabled=false;$('motion-toggle').textContent=playing?'Pause animations':'Play animations';
 $('motion-toggle').setAttribute('aria-label',playing?'Pause animations':'Play animations');
 text('motion-note',playing?'Native SVG motion is playing.':'Native SVG motion is paused for this session.');
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
 if(!live){text('gallery-message','These are illustrative art samples. Minted GGOOs will appear here when minting opens.');$('gallery-more').hidden=true;return;}
 if(minted===null){text('gallery-message','Waiting for a verified live supply read.');return;}
 if(!minted){text('gallery-message','No Ganja Ghoulballs summoned yet. The graveyard is hungry.');return;}
 if(galleryLoading)return;galleryLoading=true;
 if(galleryCursor===null)galleryCursor=minted;
 text('gallery-message','Native animated SVG, read from immutable contract code on Base. Tap a ghoul for its traits and all 13 locked originals.');
 const lowerId=Math.max(1,galleryCursor-11);
 for(let id=galleryCursor;id>=lowerId;id--){
  const card=document.createElement('article');card.className='gallery-card';const a=document.createElement('a');a.href='#token/'+id;a.setAttribute('aria-label','View GGOO #'+id+' provenance');
  const img=document.createElement('img');img.className='gallery-art';img.alt=`GGOO #${id}: onchain animated SVG`;img.loading='lazy';img.width=512;img.height=512;img.dataset.tokenId=String(id);
  const meta=document.createElement('div');meta.className='gallery-meta';const name=document.createElement('span');name.textContent='GGOO #'+String(id).padStart(3,'0');const arrow=document.createElement('span');arrow.className='reveal-badge';arrow.textContent='READING REVEAL…';meta.append(name,arrow);a.append(img,meta);card.append(a);$('gallery-content').append(card);if(observer)observer.observe(img);else queueImage(String(id),img);
 }
 galleryCursor=lowerId-1;$('gallery-more').hidden=galleryCursor<1;galleryLoading=false;
}
function fact(label,value,url) {const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=value;dd.append(a);}else dd.textContent=value;$('token-facts').append(dt,dd);}
function updateWalletDeeplink() {
 const url=location.href;
 $('wallet-page-url').value=url;
 if(location.protocol==='https:'){$('metamask-link').href='https://link.metamask.io/dapp/'+location.host+location.pathname+location.search+location.hash;$('metamask-link').hidden=!!pending||!!busy;}
}
function renderLineage(ids,genes,genome) {
 const decoded=decodeLineage(ids,genes,genome),box=$('token-lineage');box.replaceChildren();box.hidden=false;
 const heading=document.createElement('h3');heading.textContent='INHERITED DNA · AFTER REVEAL';box.append(heading);
 paragraph(box,'These are the 13 permanent onchain parent chromosomes and the revealed genome. Dominance is an artistic rule, not biological genetics.');
 const value=(locus,n)=>locus==='motion'?MOTIONS[n]:locus==='theme'?THEMES[n]:String(n);
 for(const locus of decoded.loci){paragraph(box,`${locus.name}: #${locus.a.id} (${value(locus.field,locus.a[locus.field])}) + #${locus.b.id} (${value(locus.field,locus.b[locus.field])}) → inherited ${value(locus.field,locus.inherited)}${locus.final!==locus.inherited?' → mutated '+value(locus.field,locus.final):''}.`);}
 paragraph(box,'Count dominance: 2 > 4 > 1 > 6. Motion/theme ranks: 0 > 1 > 2 > 3. When paired alleles differ, the artistic rule favors the dominant one 75% of the time before mutation; equal alleles express the same value.');
 const mutations=['Count changed one category','Motion changed mode','Body tint shifted','Radius changed by one'].filter((_,i)=>decoded.mutations&(1<<i));
 paragraph(box,'MUTATIONS: '+(mutations.length?mutations.join(' · '):'None of the four bounded mutations')+'.');
 paragraph(box,`Body ${decoded.body}: parent #${decoded.bodyDonor.id}, ball ${decoded.bodyBall+1}. Accent ${decoded.accent}: parent #${decoded.accentDonor.id}, ball ${decoded.accentBall+1}. Sky ${decoded.sky}: parent #${decoded.skyDonor.id}. Before any body-tint mutation, each color mixes 75% donor color with 25% of the equally weighted parent-family mean. Radius ${decoded.radius} derives from parent means, with bounded mutation.`);
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='VIEW ALL 13 PARENT CHROMOSOMES';details.append(summary);
 const grid=document.createElement('div');grid.className='lineage-grid';
 for(const parent of decoded.parents){const card=document.createElement('article');card.className='lineage-parent';const a=document.createElement('a');a.href=`https://basescan.org/nft/${ORIGINAL}/${parent.id}`;a.target='_blank';a.rel='noopener noreferrer';a.textContent='ORIGINAL #'+parent.id+' ↗';card.append(a);paragraph(card,`${parent.count} ball${parent.count===1?'':'s'} · ${THEMES[parent.theme]} · ${MOTIONS[parent.motion]}`);const colors=document.createElement('div');colors.className='lineage-colors';for(const color of parent.colors){const chip=document.createElement('span');chip.style.backgroundColor=color;chip.title=color;chip.setAttribute('aria-label','Parent ball color '+color);colors.append(chip);}card.append(colors);paragraph(card,'Radii '+parent.radii.join(', '));grid.append(card);}details.append(grid);box.append(details);
}
async function routeToken(options={}) {
 updateWalletDeeplink();
 const match=location.hash.match(/^#token\/(\d+)$/),current=++tokenGeneration,renderMotion=motionGeneration;
 $('token-page').hidden=!match;activeTokenId=null;if(!match)return;
 const id=BigInt(match[1]);text('token-title','GGOO #'+id);text('token-status','Reading immutable onchain provenance…');$('token-facts').replaceChildren();$('token-ingredients').replaceChildren();$('token-traits').replaceChildren();$('token-lineage').replaceChildren();$('token-lineage').hidden=true;$('token-art').removeAttribute('src');delete $('token-art').dataset.tokenId;$('token-basescan').hidden=true;$('token-share').disabled=true;
 if(!live){text('token-status','This collection has not passed mainnet verification. No token is claimed or loaded.');return;}
 if(id<1n||id>420n){text('token-status','Token ID must be between 1 and 420.');return;}
 try {
  const [owner,ids,revealed,requestId,paid,mintBlock,minter]=await Promise.all([call(cfg.ganjaCollection,'ownerOf',[id]),call(cfg.ganjaCollection,'ingredientsOf',[id]),readReveal(id),call(cfg.ganjaCollection,'requestIdOf',[id]),call(cfg.ganjaCollection,'requestPaid',[id]),call(cfg.ganjaCollection,'mintBlockOf',[id]),call(cfg.ganjaCollection,'mintedBy',[id])]);
  if(current!==tokenGeneration)return;
  if(ids.length!==COUNT||requestId<=0n||mintBlock<=0n||!validAddress(minter))throw Error('Invalid minted token provenance.');activeTokenId=String(id);
  const [traits,art,final]=await Promise.all([call(cfg.ganjaCollection,'traitsOf',[id]),tokenSvg(String(id)),revealed?Promise.all([call(cfg.ganjaCollection,'seedOf',[id]),call(cfg.ganjaCollection,'genomeOf',[id]),call(cfg.ganjaCollection,'parentGenesOf',[id]),call(cfg.ganjaCollection,'parentDigestOf',[id])]):Promise.resolve(null)]);
  if(current!==tokenGeneration)return;
  if((!revealed&&art.revealed)||(!art.revealed&&revealStates.get(String(id))===true))return routeToken(options);
  $('token-art').dataset.tokenId=String(id);if(renderMotion===motionGeneration){$('token-art').src=art.src;$('token-art').dataset.rendered='true';$('token-art').dataset.motion=animationsPlaying()?'playing':'paused';updateImageReveal($('token-art'),id);}else queueImage(String(id),$('token-art'));
  fact('CURRENT OWNER',getAddress(owner),'https://basescan.org/address/'+owner);fact('ORIGINAL MINTER',getAddress(minter),'https://basescan.org/address/'+minter);
  fact('COLLECTION',getAddress(cfg.ganjaCollection),'https://basescan.org/address/'+cfg.ganjaCollection);
  fact('IMMUTABLE GRAVEYARD',getAddress(cfg.graveyard),'https://basescan.org/address/'+cfg.graveyard);
  fact('REVEAL STATE',revealed?'Revealed onchain':'Awaiting Chainlink VRF · originals already locked');
  fact('MINT BLOCK',String(mintBlock),'https://basescan.org/block/'+mintBlock);fact('ORACLE REQUEST',String(requestId));fact('SPONSOR-PAID REQUEST',formatEther(paid)+' ETH · no extra minter fee');
  if(final){const [seed,genome,genes,digest]=final;renderLineage(ids,genes,genome);fact('GENERATION SEED',String(seed));fact('PARENT DIGEST',digest);fact('CHILD GENOME (UINT256)',String(genome));}
  let attributes;try{attributes=JSON.parse(traits);}catch{attributes=[];}
  for(const trait of (Array.isArray(attributes)?attributes:attributes.attributes||[])){const span=document.createElement('span');span.textContent=String(trait.trait_type)+': '+String(trait.value);$('token-traits').append(span);}
  for(const ingredient of ids){const a=document.createElement('a');a.textContent='#'+ingredient;a.href=`https://basescan.org/nft/${ORIGINAL}/${ingredient}`;a.target='_blank';a.rel='noopener noreferrer';$('token-ingredients').append(a);}
  const url=`https://basescan.org/nft/${cfg.ganjaCollection}/${id}`;$('token-basescan').href=url;$('token-basescan').hidden=false;$('token-share').disabled=false;text('token-status',revealed?'Revealed art, traits and inherited lineage read directly from Base. All 13 originals remain in the permanent vault.':'MINTED · AWAITING RANDOMNESS. The 13 originals are permanently locked already. Final offspring is not known yet. This page checks read-only; no second transaction is required. If the oracle never delivers, it may remain pending permanently. There is no cancellation or reroll.');
  if(options.scroll!==false)$('token-page').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(current===tokenGeneration)text('token-status','Onchain token data is unavailable or invalid. No reveal is claimed. '+humanError(e));}
}
async function initialize() {
 try {
  const res=await fetch(siteURL('config.json'),{cache:'no-store'});if(!res.ok)throw Error('Missing deployment configuration.');cfg=await res.json();
  if(!Array.isArray(cfg.rpcUrls)||!cfg.rpcUrls.length||!Number.isSafeInteger(cfg.originalGenesisBlock)||cfg.originalGenesisBlock<0)throw Error('Invalid RPC or original deployment block configuration.');
  live=await verifyDeployment();
  if(live){const saved=cacheGet(pendingKey());if(saved&&(hashPattern.test(saved.hash)||saved.hash===null)&&saved.chainId===8453&&lower(saved.collection)===lower(cfg.ganjaCollection)&&validAddress(saved.recipient)&&['mint','approve'].includes(saved.kind)&&Array.isArray(saved.ids)&&saved.ids.length===COUNT){pending=saved;}}
  if(live){text('contract-status','● BASE CODE VERIFIED');$('contract-status').classList.add('live');text('launch-banner','BASE MAINNET · Runtime code and immutable contract wiring verified. 13 originals per GGOO. 0 ETH protocol fee.');status('Contract verified on Base. Connect your wallet and choose exactly 13 originals.');await refreshSupply();await refreshReserve();}
  else{text('contract-status','● MINTING NOT OPEN');status('Minting is not open. We are waiting for verified Base contracts. Approvals and minting remain disabled.');updateSupply(null);}
  loadGallery();bindProvider();
  if(pending){const saved=pending;if(!saved.hash){saved.phase='uncertain';cacheSet(pendingKey(),saved);showUncertain(saved);}else if(saved.needsReview){live=false;status('A previously submitted receipt needs manual review. Use its Basescan link before any further mint.',true);resultLink(saved.hash,saved.kind,saved.recipient);}else trackPending().catch(e=>status(humanError(e),true));}
  updateWalletDeeplink();
  if(provider&&!busy) {try{if(await readWalletAccount()&&account)refreshWallet();}catch(e){walletStatus('Wallet connection could not be read. Tap Connect wallet to try again. '+humanError(e),true);}}

  await routeToken();
 }catch(e){live=false;updateSupply(null);text('contract-status','● MINT SAFETY LOCK');status('Cannot verify the Base deployment. All approval and mint controls are disabled. '+humanError(e),true);}
 render();
}
$('motion-toggle').onclick=()=>{motionOverride=!animationsPlaying();try{sessionStorage.setItem('ggoo:motion',motionOverride?'playing':'paused');}catch{}applyMotionPreference();};
applyMotionPreference();
$('animation-preview-link').href=siteURL('animation-preview.html',true);
$('connect-wallet').onclick=connectWallet;$('switch-account').onclick=switchAccount;$('refresh-account').onclick=refreshAccount;$('switch-base').onclick=switchBase;
function disconnectWallet(){if(!busy&&!pending){walletEpoch++;walletSession++;applyAccount(null,chain);walletStatus('Disconnected from this page. You can also revoke this site’s connection in your wallet.');}}
$('disconnect-wallet').onclick=disconnectWallet;
$('wallet-help-open').onclick=()=>openWalletDialog();
$('wallet-dialog-close').onclick=()=>$('wallet-dialog').close();
$('wallet-connect-injected').onclick=connectWallet;
$('wallet-dialog-switch').onclick=switchAccount;$('wallet-dialog-refresh').onclick=refreshAccount;$('wallet-dialog-base').onclick=switchBase;$('wallet-dialog-disconnect').onclick=disconnectWallet;
$('metamask-link').onclick=event=>{if(busy||pending){event.preventDefault();return;}updateWalletDeeplink();};
$('wallet-page-url').onclick=event=>event.target.select();
window.addEventListener('ethereum#initialized',()=>{bindProvider();render();});
window.addEventListener('focus',()=>{bindProvider();render();});
updateWalletDeeplink();
$('scan-inventory').onclick=()=>scanInventory();$('cancel-inventory').onclick=()=>stopInventory();$('manual-ids').oninput=applyManual;$('verify-ids').onclick=verifyIds;
$('select-thirteen').onclick=()=>{if(!selectable())return;selected=new Set(owned.slice(0,COUNT));invalidate();$('manual-ids').value=idsNow().join(', ');};
$('clear-selection').onclick=()=>{if(!selectable())return;selected.clear();invalidate();$('manual-ids').value='';};
$('mint-next-step').onclick=()=>{if(busy||pending)return;if(!account)return connectWallet();if(chain!==BASE)return switchBase();if(selected.size===COUNT)return verifyIds();$('inventory').scrollIntoView({behavior:'smooth',block:'start'});$('select-thirteen').focus({preventScroll:true});};
$('consent').onchange=render;$('approve-button').onclick=()=>openReview('approve');$('main-mint-button').onclick=()=>openReview('mint');
$('cancel-review').onclick=()=>{$('review-dialog').close();review=null;};$('review-dialog').addEventListener('cancel',()=>{review=null;});
$('review-consent').onchange=()=>{$('confirm-review').disabled=!$('review-consent').checked;};$('confirm-review').onclick=submitReview;
$('gallery-more').onclick=loadGallery;window.addEventListener('hashchange',routeToken);
$('token-share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:$('token-title').textContent+' · Ganja Ghoulballs',url:location.href});else{await navigator.clipboard.writeText(location.href);notify('Provenance link copied.');}}catch(e){if(e.name!=='AbortError')notify('Copy this page address to share its provenance.');}};
setInterval(()=>{if(live&&!document.hidden&&!busy&&!pending){refreshSupply();refreshReserve();}},30000);
setInterval(pollReveals,12000);
window.addEventListener('visibilitychange',()=>{if(!document.hidden)pollReveals();});
initialize();
