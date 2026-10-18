import {chromium} from 'playwright';
import {Interface,keccak256} from 'ethers';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decodeLineage} from '../../site/lineage.js';
const ROOT=path.resolve(import.meta.dirname,'../..');
const OUT=path.join(ROOT,'artifacts/frontend');fs.mkdirSync(OUT,{recursive:true});
const A='0x1111111111111111111111111111111111111111',B='0x2222222222222222222222222222222222222222';
const OG='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c',G='0x3333333333333333333333333333333333333333',V='0x4444444444444444444444444444444444444444',R='0x5555555555555555555555555555555555555555',D='0x6666666666666666666666666666666666666666',W='0xb0407dbe851f8318bd31404a49e658143c982f23';
const abi=new Interface(['function recipeOf(uint256) view returns((uint256 seed,uint256 scene,uint256 ballCount,bytes palette,(uint256 radius,uint256 xPhase,uint256 yPhase,bytes3 colour)[] balls,uint256 theme,uint256 motion))','function totalSupply() view returns(uint256)','function MAX_SUPPLY() view returns(uint256)','function SACRIFICE_COUNT() view returns(uint256)','function deploymentChainId() view returns(uint256)','function originalCollection() view returns(address)','function graveyard() view returns(address)','function renderer() view returns(address)','function redeemer() view returns(address)','function ownerOf(uint256) view returns(address)','function balanceOf(address) view returns(uint256)','function getApproved(uint256) view returns(address)','function isApprovedForAll(address,address) view returns(bool)','function setApprovalForAll(address,bool)','function mint(uint256[13])','function svg(uint256) view returns(string)','function svgStill(uint256) view returns(string)','function ingredientsOf(uint256) view returns(uint256[13])','function seedOf(uint256) view returns(uint256)','function traitsOf(uint256) view returns(string)', 'function backdrop() view returns(address)', 'function vrfWrapper() view returns(address)', 'function maxRequestPrice() view returns(uint256)', 'function quoteRandomness() view returns(uint256)', 'function CALLBACK_GAS_LIMIT() view returns(uint32)', 'function REQUEST_CONFIRMATIONS() view returns(uint16)', 'function NUM_WORDS() view returns(uint32)', 'function estimateRequestPriceNative(uint32,uint32,uint256) view returns(uint256)', 'function s_configured() view returns(bool)', 'function s_disabled() view returns(bool)', 'function s_vrfCoordinator() view returns(address)', 'function mintBlockOf(uint256) view returns(uint256)', 'function mintedBy(uint256) view returns(address)', 'function ART_VERSION() view returns(string)', 'function revealed(uint256) view returns(bool)', 'function requestIdOf(uint256) view returns(uint256)', 'function requestPaid(uint256) view returns(uint256)', 'function parentGenesOf(uint256) view returns(uint256[13])', 'function parentDigestOf(uint256) view returns(bytes32)', 'function genomeOf(uint256) view returns(uint256)','event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)','event GhoulballsSacrificed(address indexed redeemer,uint256 indexed gooId,uint256[13] originalIds)']);
const ids=Array.from({length:13},(_,i)=>String(i+1)),zero='0x0000000000000000000000000000000000000000';
const originalCode=fs.readFileSync(path.join(ROOT,'reports/original-basescan-runtime.hex'),'utf8').trim();
const gifLiveSvg=fs.readFileSync(path.join(ROOT,'test/frontend/fixtures/ggoo-live-token-1.svg'),'utf8');
const originalRecipes=JSON.parse(fs.readFileSync(path.join(ROOT,'reports/original-trait-probes.json'))).parentExamples;
const code={ganjaCollection:'0x6001600055',graveyard:'0x6002600055',renderer:'0x6003600055',backdrop:'0x6004600055',vrfWrapper:fs.readFileSync(path.join(ROOT,'reports/chainlink-base-wrapper-runtime.hex'),'utf8').trim()};
const pack=(...fields)=>fields.reduce((word,[offset,value])=>word|(BigInt(value)<<BigInt(offset)),0n);
const parentGenes=ids.map((_,i)=>{const count=[1,2,4,6][i%4];return pack([168,count],[176,i%4],[184,i%4],[192,i%4+7],[200,0x112233],[224,7],[232,8],[240,3],...Array.from({length:count},(_,j)=>[j*24,0x507030+i+j]),...Array.from({length:count},(_,j)=>[144+j*4,8]));});
const genome=pack([0,0x607040],[24,0x805060],[48,2],[56,1],[64,2],[72,8],[80,0],[88,2],[96,2],[104,3],[112,0x112233],[136,0],[144,7],[152,8],[160,0],[168,1],[176,2],[184,0],[192,0],[200,0],[208,1],[216,2],[224,3],[232,4],[240,5]);
const baseConfig={chainId:8453,originalCollection:OG,ganjaCollection:G,graveyard:V,renderer:R,backdrop:D,vrfWrapper:W,maxRequestPrice:'10000000000000',deploymentStatus:'deployed-verified',runtimeCodeHashes:Object.fromEntries(Object.entries(code).map(([k,v])=>[k,keccak256(v)])),maxSupply:420,sacrificeCount:13,originalGenesisBlock:100,rpcUrls:['./rpc']};
function staticFile(requestURL) {
 let p=new URL(requestURL,'http://local').pathname;
 if(p==='/ganjaghoulballs'||p.startsWith('/ganjaghoulballs/'))p=p.slice('/ganjaghoulballs'.length)||'/';
 if(p==='/animation-preview')p='/animation-preview.html';
 return path.join(ROOT,'dist',p==='/'?'index.html':p);
}
function mime(file){return file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/ganjaghoulballs'){res.writeHead(308,{Location:'/ganjaghoulballs/'+url.search});res.end();return;}if(url.pathname==='/ggoo'||url.pathname==='/ggoo/'){res.writeHead(302,{Location:'/ganjaghoulballs/'+url.search});res.end();return;}const file=staticFile(req.url);if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',mime(file));res.end(fs.readFileSync(file));}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell')?'/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell':undefined),args:['--no-sandbox','--disable-gpu'],env:{...process.env,XDG_CACHE_HOME:'/tmp/ggoo-browser-cache'}});let passed=0;
const errors=[];
async function fixture(width=390,options={}){
 const state={approved:false,supply:1,rpcChain:'0x2105',owner:A,receiptStatus:'0x1',pending:false,revealed:true,configured:true,disabled:false,coordinator:'0xd5d517abe5cf79b7e95ec98db0f0277788aff634',quote:1000000000000n,reserve:1000000000000000n,ownerDelay:0,receiptRecipient:A,missingMint:false,badCode:false,badWiring:false,...options};
 const page=await browser.newPage({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700,reducedMotion:options.reducedMotion||'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 state.simulatedTransactions=[];state.quotedGasPrices=[];state.abiCalls=[];state.requests=[];page.on('request',r=>state.requests.push(r.url()));
 const targetOrigin=options.secure?'https://midaswhale.wtf':origin;
 if(options.secure)await page.route('https://midaswhale.wtf/**',route=>{const file=staticFile(route.request().url());return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file,contentType:mime(file)}):route.fulfill({status:404,body:'Not found'});});
 await page.route('**/config.json',async r=>{if(options.configDelay)await new Promise(resolve=>setTimeout(resolve,options.configDelay));return r.fulfill({json:{...baseConfig,...options.config}});});
 await page.addInitScript(({A,B,noProvider,initialAccount,initialReadDelay,seedPending})=>{
  let listeners={};window.mockAccount=initialAccount||null;window.initialReadDelay=initialReadDelay||0;window.accountReadCount=0;window.mockChain='0x2105';window.sent=[];window.calls=[];window.mode='success';window.sendRace=false;
  window.emitWallet=(event,value)=>listeners[event]?.(value);if(seedPending)localStorage.setItem('ggoo:pending:8453:'+seedPending.collection,JSON.stringify(seedPending));
  window.changeAccount=a=>{window.mockAccount=a;listeners.accountsChanged?.(a?[a]:[]);};window.changeChain=id=>{window.mockChain=id;listeners.chainChanged?.(id);};
  window.ethereum={on:(name,fn)=>listeners[name]=fn,removeListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];},request:async({method,params})=>{
   window.calls.push({method,params});
   if(method==='eth_accounts'){const captured=window.mockAccount?[window.mockAccount]:[];window.accountReadCount++;if(window.accountReadCount===1&&window.initialReadDelay)await new Promise(r=>setTimeout(r,window.initialReadDelay));return captured;}
   if(method==='eth_requestAccounts'){if(window.mode==='reject')throw{code:4001,message:'Rejected'};if(window.mode==='requestPending')throw{code:-32002,message:'Request already pending'};window.mockAccount=A;return[A];}
   if(method==='eth_chainId')return window.mockChain;
   if(method==='wallet_requestPermissions'){if(window.mode==='reject')throw{code:4001,message:'Rejected'};if(window.mode==='unsupported')throw{code:4200,message:'Unsupported method'};window.changeAccount(B);return[{parentCapability:'eth_accounts'}];}
   if(method==='wallet_switchEthereumChain'){window.changeChain('0x2105');return null;}
   if(method==='eth_estimateGas'){if(window.sendRace)window.changeAccount(B);return'0x50000';}
   if(method==='eth_sendTransaction'){if(window.mode==='transport')throw{code:-32603,message:'Wallet transport interrupted'};if(window.mode==='invalidhash')return'not-a-hash';if(window.mode==='reject')throw{code:4001,message:'Rejected'};window.sent.push(params[0]);return'0x'+String(window.sent.length).padStart(64,'0');}
   throw Error('Unexpected wallet method '+method);
  }};window.mockProvider=window.ethereum;if(noProvider)delete window.ethereum;
 },{A,B,noProvider:!!options.noProvider,initialAccount:options.initialAccount,initialReadDelay:options.initialReadDelay,seedPending:options.seedPending});
 await page.route('**/rpc',async route=>{
  const req=route.request().postDataJSON();let result,error;
  try {
   const {method,params}=req;const holdings=state.ownedByAccount||{[state.owner]:state.ownedIds||ids};
   if(method==='eth_chainId')result=state.rpcChain;
   else if(method==='eth_getCode')result=params[0].toLowerCase()===OG?(state.badOriginal?'0x6000':state.changedOriginal?originalCode.slice(0,-2)+(originalCode.endsWith('00')?'01':'00'):originalCode):state.badCode?'0x6000':code[params[0].toLowerCase()===G?'ganjaCollection':params[0].toLowerCase()===V?'graveyard':params[0].toLowerCase()===R?'renderer':params[0].toLowerCase()===D?'backdrop':'vrfWrapper'];
   else if(method==='eth_gasPrice')result=state.gasPrice??'0x3b9aca00';
   else if(method==='eth_getBalance')result='0x'+state.reserve.toString(16);
   else if(method==='eth_blockNumber')result=state.blockNumber||'0x70';
   else if(method==='eth_getLogs'){state.logCalls=(state.logCalls||0)+1;(state.logRanges||=[]).push([params[0].fromBlock,params[0].toBlock]);const who='0x'+params[0].topics[2].slice(-40),found=holdings[who]||[];if(state.logDelay)await new Promise(r=>setTimeout(r,state.logDelay));if(state.logError)throw Error('History temporarily unavailable');result=state.logsOverride??(state.truncateLogs?[]:found.map(id=>({address:OG,...abi.encodeEventLog(abi.getEvent('Transfer'),[zero,who,id])})));}
   else if(method==='eth_getTransactionReceipt'){
    if(state.pending)result=null;
    else {const sent=await page.evaluate(()=>window.sent);const tx=sent[Number(BigInt(params[0]))-1]||state.sent?.[Number(BigInt(params[0]))-1];if(!tx){result=null;}else{
     const fn=abi.parseTransaction({data:tx.data});let logs=[];
     if(fn.name==='setApprovalForAll')state.approved=true;
     else if(fn.name==='mint'&&!state.missingMint){logs=[{address:G,...abi.encodeEventLog(abi.getEvent('Transfer'),[zero,state.receiptRecipient,2])},{address:G,...abi.encodeEventLog(abi.getEvent('GhoulballsSacrificed'),[state.receiptRecipient,2,ids])}];state.supply=2;if(state.receiptStatus==='0x1'){state.ownedByAccount={...holdings,[state.receiptRecipient]:(holdings[state.receiptRecipient]||[]).filter(id=>!ids.includes(id))};}}
     result={status:state.receiptStatus,blockNumber:'0x70',logs,transactionHash:params[0]};
    }}
   } else if(method==='eth_call'){
    const tx=params[0],fn=abi.parseTransaction({data:tx.data});state.abiCalls.push(fn.name);if(fn.name==='mint')state.simulatedTransactions.push(tx);let value;
    switch(fn.name){
     case 'MAX_SUPPLY':value=420;break;case'SACRIFICE_COUNT':value=13;break;case'deploymentChainId':value=8453;break;
     case'originalCollection':value=state.badWiring?A:OG;break;case'graveyard':value=V;break;case'renderer':value=R;break;case'redeemer':value=G;break;case'backdrop':value=D;break;case'vrfWrapper':value=W;break;case'maxRequestPrice':value=10000000000000n;break;case'CALLBACK_GAS_LIMIT':value=100000;break;case'REQUEST_CONFIRMATIONS':value=3;break;case'NUM_WORDS':value=1;break;case'ART_VERSION':value=state.artVersion||'GANJA_GHOULBALLS_INHERITED_GOO_V3';break;
     case's_configured':value=state.configured;break;case's_disabled':value=state.disabled;break;case's_vrfCoordinator':value=state.coordinator;break;case'mintBlockOf':value=9007199254740993n;break;case'mintedBy':value=A;break;
     case'estimateRequestPriceNative':state.quotedGasPrices.push(String(fn.args[2]));if(state.quote===null)throw Error('Quote unavailable');value=state.quote;break;
     case'quoteRandomness':if(state.quote===null)throw Error('Quote unavailable');value=state.zeroGasQuote??state.quote;break;case'revealed':if(state.revealError)throw Error('Reveal read unavailable');value=state.revealed;break;case'requestIdOf':value=1000n+fn.args[0];break;case'requestPaid':value=1000000000000n;break;case'parentGenesOf':if(!state.revealed)throw Error('Unexpected pre-reveal lineage read');value=parentGenes;break;case'parentDigestOf':value='0x'+'ab'.repeat(32);break;case'genomeOf':if(!state.revealed)throw Error('RevealPending');value=genome;break;
     case'totalSupply':if(state.supply===null)throw Error('Supply unavailable');value=state.supply;break;
     case'balanceOf':if(state.balanceError)throw Error('Balance unavailable');value=state.balance??(holdings[fn.args[0].toLowerCase()]||[]).length;break;
     case'recipeOf':{if(state.recipeError)throw Error('Recipe unavailable');const r=originalRecipes[(Number(fn.args[0])-1)%originalRecipes.length];value=[r.seed,r.scene,r.ballCount,'0x',r.balls.map(b=>[b.radius,b.xPhase,b.yPhase,b.colour]),r.theme,r.motion];break;}
     case'ownerOf':{const owner=tx.to.toLowerCase()===OG?(Object.entries(holdings).find(([_,items])=>items.includes(String(fn.args[0])))?.[0]||V):state.owner;if(state.ownerDelay)await new Promise(r=>setTimeout(r,state.ownerDelay));if(state.ownerError||state.ownerErrorIds?.includes(String(fn.args[0])))throw Error('Owner unavailable');value=owner;break;}
     case'isApprovedForAll':value=state.approved;break;case'getApproved':value=zero;break;
     case'ingredientsOf':value=ids;break;case'seedOf':if(!state.revealed)throw Error('RevealPending');value=state.seedValue??123456789n;break;
     case'traitsOf':value=JSON.stringify(state.revealed?[{trait_type:'Texture',value:'Chocolate hash'},{trait_type:'Mood',value:'Cosmic stoner'}]:[{trait_type:'Reveal',value:'Pending Chainlink VRF'}]);break;
     case'svg':case'svgStill':{const capturedReveal=state.revealed;if(state.artDelay&&fn.name==='svg')await new Promise(r=>setTimeout(r,state.artDelay));if(state.pendingArtDelay&&!capturedReveal)await new Promise(r=>setTimeout(r,state.pendingArtDelay));value=state.svgOverride!==undefined&&String(fn.args[0])==='1'?state.svgOverride:'<svg data-revealed="'+capturedReveal+'" data-mode="'+fn.name+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#251f1a"/><path d="M128 128H384V384H128Z" fill="#75623e"/><path d="M170 220h50v30h-50zm120 0h50v30h-50z" fill="#e15c38"/></svg>';break;}
     case'setApprovalForAll':case'mint':result='0x';break;
     default:throw Error('Unexpected ABI '+fn.name);
    }
    if(result===undefined)result=abi.encodeFunctionResult(fn.name,[value]);
   }else throw Error('Unexpected RPC '+method);
  }catch(e){error={code:-32000,message:e.message};}
  await route.fulfill({json:{jsonrpc:'2.0',id:req.id,...(error?{error}:{result})}});
 });
 await page.goto(targetOrigin+(options.startPath||'/'));if(options.deferReady)await page.waitForFunction(()=>typeof document.querySelector('#connect-wallet').onclick==='function');else await page.waitForFunction(()=>!document.querySelector('#contract-status').textContent.includes('CHECKING'));
 return {page,state};
}
async function connect(p){await p.locator('#connect-wallet').click();await p.waitForFunction(()=>document.querySelector('#wallet-address').textContent.length===42);}
async function manual(p,value){await p.locator('#manual-fallback').evaluate(el=>el.open=true);await p.locator('#manual-ids').fill(value);}
async function select(p){await manual(p,ids.join(', '));await p.locator('#verify-ids').click();try{await p.waitForFunction(()=>document.querySelector('#selection-feedback').textContent.includes('All 13 originals'));}catch(e){console.error('Selection diagnostic',await p.locator('#selection-feedback').textContent(),await p.locator('#mint-state-message').textContent());throw e;}}
async function mintReview(p){await p.locator('#consent').check();await p.locator('#main-mint-button').click();await p.waitForFunction(()=>document.querySelector('#review-dialog').open);await p.locator('#review-consent').check();}
async function pass(name){passed++;console.log('PASS',name);}
async function expectPreviewMode(page,still){
 const images=page.locator('.goo-picture img, .study-card img');assert.equal(await images.count(),5);
 for(const image of await images.all())await image.scrollIntoViewIfNeeded();
 await page.waitForFunction(still=>[...document.querySelectorAll('.goo-picture img, .study-card img')].every(img=>img.complete&&img.naturalWidth>0&&(img.currentSrc.endsWith('-still.svg')===still)),still);
}
async function expectChainImageMode(page,selector,mode){await page.waitForFunction(({selector,mode})=>[...document.querySelectorAll(selector)].length>0&&[...document.querySelectorAll(selector)].every(img=>decodeURIComponent(img.getAttribute('src')||'').includes('data-mode="'+mode+'"')),{selector,mode});}
async function suppressAutomaticGifDownload(page){
 await page.evaluate(()=>{
  window.gifAutoDownloadAttempts=0;window.gifCreatedUrls=[];window.gifRevokedUrls=[];
  const click=HTMLAnchorElement.prototype.click,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  HTMLAnchorElement.prototype.click=function(){if(this.id==='token-save-gif'){window.gifAutoDownloadAttempts++;return;}return click.call(this);};
  URL.createObjectURL=function(blob){const url=create(blob);window.gifCreatedUrls.push(url);return url;};
  URL.revokeObjectURL=function(url){window.gifRevokedUrls.push(url);return revoke(url);};
 });
}
async function expectNoSavedGif(page){
 assert.equal(await page.locator('#token-save-gif').isVisible(),false);
 assert.equal(await page.locator('#token-save-gif').getAttribute('href'),null);
}

try{
 if(!process.env.GGOO_GIF_WIRING_ONLY){
 for(const width of [320,390]){
  const {page,state}=await fixture(width,{revealed:false});
  const actions=page.locator('#mint-actions .mint-button:visible');
  assert.equal(await actions.count(),1);assert.match(await actions.textContent(),/CONNECT WALLET/);
  assert.equal(await page.locator('#original-picker').isVisible(),false);assert.equal(await page.locator('#mint-consent').isVisible(),false);
  await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);
  assert.equal(await actions.count(),0);assert.match(await page.locator('#mint-flow-title').textContent(),/Choose 13/);
  await page.locator('#inventory').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'mint-ux-select-'+width+'.png')});
  await select(page);assert.equal(await actions.count(),1);assert.equal(await page.locator('#approve-button').isVisible(),true);assert.equal(await page.locator('#mint-consent').isVisible(),false);assert.equal(await page.evaluate(()=>window.sent.length),0);
  assert.match(await page.locator('#approval-note').textContent(),/ANY.*future.*not limited/s);
  await page.locator('#mint-actions').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'mint-ux-approve-'+width+'.png')});
  await page.locator('#approve-button').click();assert.equal(await page.locator('#review-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);assert.equal(await page.locator('#review-consent').isChecked(),false);
  await page.locator('#review-consent').check();await page.locator('#confirm-review').click();await page.waitForFunction(()=>!document.querySelector('#consent').disabled&&!document.querySelector('#mint-consent').hidden);
  assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await actions.count(),0);assert.equal(await page.locator('#mint-consent').isVisible(),true);assert.equal(await page.locator('#approve-button').isVisible(),false);
  assert.match(await page.locator('#mint-flow-title').textContent(),/acknowledgment/);assert.equal(await page.evaluate(()=>window.sent.length),1);
  const metrics=await page.locator('#mint-consent').evaluate(el=>{const s=getComputedStyle(el);return{height:el.getBoundingClientRect().height,size:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),opacity:s.opacity,color:s.color,background:s.backgroundColor};});
  assert.ok(metrics.height>=44&&metrics.size>=14&&metrics.line>=21);assert.equal(metrics.opacity,'1');
  await page.locator('#mint-actions').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:path.join(OUT,'mint-ux-acknowledgment-'+width+'.png')});
  await page.locator('#mint-consent .lock-heading').click();assert.equal(await page.locator('#consent').isChecked(),true);assert.equal(await actions.count(),1);assert.equal(await page.locator('#main-mint-button').isEnabled(),true);
  await page.locator('#main-mint-button').click();await page.waitForFunction(()=>document.querySelector('#review-dialog').open);assert.equal(await page.locator('#review-consent').isChecked(),false);assert.equal(await page.locator('#confirm-review').isDisabled(),true);assert.equal(await page.locator('#review-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.equal(await page.locator('#review-dialog .critical').evaluateAll(els=>els.every(el=>parseFloat(getComputedStyle(el).fontSize)>=14)),true);
  await page.screenshot({path:path.join(OUT,'mint-ux-review-'+width+'.png')});assert.equal(await page.evaluate(()=>window.sent.length),1);
  state.pending=true;await page.locator('#review-consent').check();await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===2);assert.equal(await actions.count(),0);assert.equal(await page.locator('#mint-consent').isVisible(),false);
  state.pending=false;await page.waitForFunction(()=>document.querySelector('#mint-flow-title').textContent.includes('awaiting randomness'));assert.match(await page.locator('#mint-state-message').textContent(),/MINT CONFIRMED/);assert.match(await page.locator('#mint-flow-description').textContent(),/permanently locked.*automatic.*no second/s);
  await page.locator('#transaction-result').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'mint-ux-receipt-'+width+'.png')});
  state.revealed=true;await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('REVEALED'));assert.match(await page.locator('#mint-flow-title').textContent(),/is revealed/);assert.equal(await page.evaluate(()=>window.sent.length),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.close();await pass('readable '+width+'px connect/select/approval/unchecked acknowledgment/review/receipt/reveal flow has one applicable action and no automatic sends');
 }


 {
  const saved={hash:'0x'+'1'.padStart(64,'0'),phase:'submitted',kind:'approve',recipient:A,ids,collection:G,chainId:8453,submittedAt:Date.now()};const {page}=await fixture(390,{pending:true,initialReadDelay:999999,seedPending:saved});await page.waitForFunction(()=>document.querySelector('#main-mint-button span').textContent==='TRANSACTION PENDING');assert.equal(await page.locator('#connect-wallet').isDisabled(),true);assert.match(await page.locator('#transaction-result').textContent(),new RegExp(A));assert.deepEqual(await page.evaluate(G=>JSON.parse(localStorage.getItem('ggoo:pending:8453:'+G)),G),saved);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('durable pending lock restores before a never-settling initial wallet read');
 }
 {
  const {page}=await fixture();await connect(page);await page.evaluate(()=>{const request=window.ethereum.request;let delayed=false;window.ethereum.request=async args=>{const result=await request(args);if(args.method==='eth_accounts'&&!delayed){delayed=true;await new Promise(resolve=>window.finishAccountRead=resolve);}return result;};});await page.locator('#refresh-account').click();await page.waitForFunction(()=>typeof window.finishAccountRead==='function');await page.evaluate(()=>window.emitWallet('disconnect'));await page.evaluate(()=>window.finishAccountRead());await page.waitForFunction(()=>!document.querySelector('#connect-wallet').disabled);assert.equal(await page.locator('#wallet-details').isVisible(),false);assert.equal(await page.locator('#wallet-address').textContent(),'');await page.close();await pass('late account read cannot reconnect after provider disconnect');
 }
 {
  const {page}=await fixture();await page.evaluate(()=>{const request=window.ethereum.request;window.ethereum.request=async args=>{if(args.method==='eth_requestAccounts'){window.calls.push(args);await new Promise(resolve=>window.finishConnect=resolve);window.mockAccount='0x1111111111111111111111111111111111111111';return[window.mockAccount];}return request(args);};});await page.locator('#connect-wallet').click();await page.waitForFunction(()=>typeof window.finishConnect==='function');await page.evaluate(()=>{window.emitWallet('disconnect');window.finishConnect();});await page.waitForFunction(()=>!document.querySelector('#wallet-connect-injected').disabled);assert.equal(await page.locator('#wallet-details').isVisible(),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('permission response after disconnect cannot resurrect the wallet session');
 }
 for(const changed of ['account','owner-read-failure']){
  const {page,state}=await fixture(390,{pending:true});await connect(page);await select(page);await page.locator('#approve-button').click();await page.locator('#review-consent').check();await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);
  if(changed==='account')await page.evaluate(B=>window.changeAccount(B),B);else state.ownerError=true;
  state.pending=false;await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.toLowerCase().includes('approval confirmed'));await page.waitForFunction(()=>!document.querySelector('#connect-wallet').disabled);assert.equal(await page.locator('#consent').isDisabled(),true);assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),1);assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);
  if(changed==='owner-read-failure'){assert.equal(await page.locator('#verify-ids').isVisible(),true);assert.match(await page.locator('#verify-ids').textContent(),/CHECK 13 ORIGINALS/);state.ownerError=false;await page.locator('#verify-ids').click();await page.waitForFunction(()=>!document.querySelector('#consent').disabled);assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.evaluate(()=>window.sent.length),1);}
  await page.close();await pass('approval receipt '+changed+' stays fail-closed; retry action remains beside acknowledgment');
 }
 for(const [width,mount] of [[320,'/'],[390,'/ganjaghoulballs/']]){
  const suffix='?ref=android&recipient='+B+'#gallery';const {page}=await fixture(width,{noProvider:true,secure:true,startPath:mount+suffix});
  assert.equal(await page.evaluate(()=>window.calls.length),0);await page.locator('#connect-wallet').click();assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('#metamask-link').isVisible(),true);assert.equal(await page.evaluate(()=>document.querySelector('#wallet-dialog').contains(document.activeElement)),true);
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.querySelector('#manual-ids').dispatchEvent(new Event('input'));});
  assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('#metamask-link').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.equal(await page.locator('#metamask-link').getAttribute('href'),'https://link.metamask.io/dapp/midaswhale.wtf'+mount+suffix);assert.equal(await page.locator('#wallet-page-url').inputValue(),'https://midaswhale.wtf'+mount+suffix);
  await page.screenshot({path:path.join(OUT,'wallet-chooser-android-'+width+'.png')});await page.keyboard.press('Escape');assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),false);await page.locator('#connect-wallet').click();await page.locator('#wallet-dialog-close').click();await page.locator('#connect-wallet').click();
  let handoff;await page.route('https://link.metamask.io/**',route=>{handoff=route.request().url();return route.fulfill({contentType:'text/html',body:'MetaMask handoff captured by test. No app opened.'});});await page.locator('#metamask-link').click();await page.waitForURL('https://link.metamask.io/**');assert.equal(handoff,'https://link.metamask.io/dapp/midaswhale.wtf'+mount+suffix.split('#')[0]);assert.equal(new URL(page.url()).hash,'#gallery');await page.close();await pass('Android no-provider chooser '+width+' remains visible through render, closes/reopens and sends correct user-click deep link');
 }
 for(const options of [{configDelay:1200,deferReady:true},{badCode:true}]){
  const {page}=await fixture(390,{noProvider:true,secure:true,...options});await page.locator('#connect-wallet').click();assert.equal(await page.locator('#metamask-link').isVisible(),true);await page.waitForFunction(()=>!document.querySelector('#contract-status').textContent.includes('CHECKING'));assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('#metamask-link').isVisible(),true);assert.equal(await page.evaluate(()=>window.calls.length),0);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await page.close();await pass('wallet chooser independent of '+(options.badCode?'failed':'delayed')+' deployment verification');
 }
 {
  const {page}=await fixture(390,{noProvider:true,secure:true});await page.locator('#connect-wallet').click();await page.evaluate(()=>{window.ethereum=window.mockProvider;window.dispatchEvent(new Event('ethereum#initialized'));});assert.equal(await page.locator('#wallet-connect-injected').isVisible(),true);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);await page.locator('#wallet-connect-injected').click();await page.waitForFunction(()=>document.querySelector('#wallet-address').textContent.length===42&&!document.querySelector('#wallet-dialog').open);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#connect-wallet').click();assert.equal((await page.locator('#wallet-dialog-address').textContent()).toLowerCase(),A);await page.locator('#wallet-dialog-switch').click();await page.waitForFunction(B=>document.querySelector('#wallet-dialog-address').textContent.toLowerCase()===B,B);assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),B);await page.locator('#wallet-dialog-disconnect').click();assert.equal(await page.locator('#wallet-details').isVisible(),false);assert.equal(await page.locator('#wallet-connect-injected').isVisible(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('late provider connects only on tap; header opens account manager with switch and disconnect');
 }
 for(const mode of ['reject','requestPending']){
  const {page}=await fixture();await page.evaluate(mode=>window.mode=mode,mode);await page.locator('#connect-wallet').click();await page.waitForFunction(()=>!document.querySelector('#wallet-connect-injected').disabled);assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),true);assert.match(await page.locator('#wallet-dialog-status').textContent(),mode==='reject'?/Cancelled/:/already has a request/);assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.method==='eth_requestAccounts').length),1);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('connect '+mode+' has visible feedback and no automatic retry');
 }
 {
  const {page}=await fixture();await page.evaluate(()=>{const request=window.ethereum.request;window.ethereum.request=async args=>{if(args.method==='eth_requestAccounts'){window.calls.push(args);await new Promise(resolve=>window.finishConnect=resolve);window.mockAccount='0x1111111111111111111111111111111111111111';return[window.mockAccount];}return request(args);};});await page.locator('#connect-wallet').click();await page.waitForFunction(()=>typeof window.finishConnect==='function');assert.equal(await page.locator('#connect-wallet').isDisabled(),true);assert.equal(await page.locator('#wallet-connect-injected').isDisabled(),true);await page.evaluate(()=>document.querySelector('#connect-wallet').onclick());assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.method==='eth_requestAccounts').length),1);await page.evaluate(()=>window.finishConnect());await page.waitForFunction(()=>!document.querySelector('#wallet-dialog').open);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('unresolved wallet request prevents duplicate connection prompts');
 }
 {
  const {page}=await fixture(390,{initialAccount:B,initialReadDelay:1000});await page.locator('#connect-wallet').click();await page.waitForFunction(A=>document.querySelector('#wallet-address').textContent.toLowerCase()===A,A);await page.waitForTimeout(1100);assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),A);assert.equal(await page.locator('#wallet-dialog').evaluate(el=>el.open),false);await page.close();await pass('delayed startup account read cannot overwrite explicit Connect');
 }
 {
  const {page}=await fixture();await connect(page);await page.evaluate(()=>{const request=window.ethereum.request;let delayed=false;window.ethereum.request=async args=>{const result=await request(args);if(args.method==='eth_accounts'&&!delayed){delayed=true;await new Promise(resolve=>window.finishAccountRead=resolve);}return result;};});await page.locator('#refresh-account').click();await page.waitForFunction(()=>typeof window.finishAccountRead==='function');await page.evaluate(B=>window.changeAccount(B),B);await page.evaluate(()=>window.finishAccountRead());await page.waitForFunction(()=>!document.querySelector('#refresh-account').disabled);assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),B);await page.close();await pass('delayed refresh cannot overwrite a newer accountsChanged event');
 }
 {
  const {page}=await fixture();await connect(page);await page.evaluate(B=>{window.oldChangeAccount=window.changeAccount;const handlers={};window.ethereum={on:(event,fn)=>handlers[event]=fn,request:async({method})=>{window.calls.push({method});if(method==='eth_requestAccounts'||method==='eth_accounts')return[B];if(method==='eth_chainId')return'0x2105';throw Error('Unexpected replacement request');}};window.replacementEvent=(event,value)=>handlers[event]?.(value);window.dispatchEvent(new Event('ethereum#initialized'));},B);assert.equal(await page.locator('#wallet-details').isVisible(),false);await page.locator('#connect-wallet').click();await page.waitForFunction(B=>document.querySelector('#wallet-address').textContent.toLowerCase()===B,B);await page.evaluate(A=>window.oldChangeAccount(A),A);assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),B);await page.evaluate(()=>window.replacementEvent('chainChanged','0x1'));assert.equal(await page.locator('#manual-ids').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('replacement provider invalidates old account and ignores old provider events');
 }
 for(const width of [320,360,390,412,768,1440]){
  const {page}=await fixture(width,{config:{deploymentStatus:'awaiting-contract-deployment',ganjaCollection:null,graveyard:null,renderer:null}});
  assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await connect(page);
  await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);assert.equal(await page.locator('#manual-ids').isDisabled(),false);assert.equal(await page.locator('#manual-fallback').evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>window.sent.length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no overflow '+width);
  assert.equal(await page.locator('#wallet-address').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.locator('#renderer-studies').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.study-card img')].every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  await page.screenshot({path:path.join(OUT,`predeploy-${width}.png`),fullPage:true});if(width===390){await page.screenshot({path:path.join(OUT,'hero-mobile-390.png')});await page.locator('.mint-panel').screenshot({path:path.join(OUT,'mint-panel-mobile-390.png')});}
  await page.close();await pass('predeploy fail-closed and layout '+width);
 }
 for(const [label,options] of [['wrong RPC chain',{rpcChain:'0x1'}],['wrong code',{badCode:true}],['wrong wiring',{badWiring:true}],['missing runtime hashes',{config:{runtimeCodeHashes:{}}}],['wrong source',{config:{originalCollection:A}}],['wrong count',{config:{sacrificeCount:15}}]]){
  const {page}=await fixture(390,options);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.match(await page.locator('#contract-status').textContent(),/SAFETY LOCK/);await page.close();await pass('reject '+label);
 }
 {
  const {page,state}=await fixture();await connect(page);assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.method==='eth_requestAccounts').length),1);
  await page.locator('#switch-account').click();assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),B);
  await page.evaluate(()=>window.mode='reject');await page.locator('#switch-account').click();assert.match(await page.locator('#mint-state-message').textContent(),/Cancelled/);
  await page.evaluate(()=>window.mode='unsupported');await page.locator('#switch-account').click();assert.equal(await page.locator('#wallet-help').getAttribute('open'),'');await page.locator('#wallet-dialog-close').click();
  await page.evaluate(A=>window.changeAccount(A),A);await page.evaluate(()=>window.mode='success');
  await page.evaluate(()=>window.changeChain('0x1'));assert.equal(await page.locator('#manual-ids').isDisabled(),true);await page.locator('#switch-base').click();await page.waitForFunction(()=>!document.querySelector('#manual-ids').disabled);
  for(const input of ['0, 1','1, 1','6668','1.5','1e2',Array.from({length:14},(_,i)=>i+1).join(',')]){await manual(page,input);assert.equal(await page.locator('#selected-count').textContent(),'0');assert.equal(await page.locator('#verify-ids').isDisabled(),true);}
  await page.locator('#scan-inventory').click();await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');
  await page.locator('#verify-ids').click();await page.waitForFunction(()=>!document.querySelector('#approve-button').hidden);assert.match(await page.locator('#approval-note').textContent(),/ANY.*future.*not limited/s);
  await page.locator('#approve-button').click();await page.waitForFunction(()=>document.querySelector('#review-dialog').open);assert.match(await page.locator('#review-copy').textContent(),/ALL originals.*future/s);await page.locator('#review-consent').check();await page.locator('#confirm-review').click();
  await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('approval confirmed'));
  assert.equal(await page.evaluate(()=>window.sent.length),1,'approval never auto-mints');assert.equal(abi.parseTransaction({data:(await page.evaluate(()=>window.sent[0])).data}).name,'setApprovalForAll');
  await page.waitForFunction(()=>!document.querySelector('#consent').disabled);assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);await page.locator('#consent').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'approval-ready-mobile-390.png')});await mintReview(page);assert.match(await page.locator('#review-copy').textContent(),/PERMANENT LOCK/);await page.screenshot({path:path.join(OUT,'mint-confirmation-390.png'),fullPage:true});await page.locator('#review-dialog').screenshot({path:path.join(OUT,'mint-dialog-mobile-390.png')});
  await page.locator('#confirm-review').click();await page.waitForFunction(()=>/MINT CONFIRMED|REVEALED/.test(document.querySelector('#mint-state-message').textContent));
  const tx=await page.evaluate(()=>window.sent[1]);assert.equal(tx.from,A);assert.equal(tx.to,G);assert.equal(tx.value,'0x0');assert.equal(tx.chainId,'0x2105');assert.equal(tx.data.slice(0,10),'0x04266e47');assert.deepEqual(abi.decodeFunctionData('mint',tx.data)[0].map(String),ids);
  await page.locator('#transaction-result a[href="#token/2"]').click();await page.waitForFunction(()=>document.querySelectorAll('#token-ingredients a').length===13);assert.equal(await page.locator('#token-facts').textContent().then(s=>s.includes(V)),true);
  await page.screenshot({path:path.join(OUT,'provenance-390.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.close();await pass('complete approval + atomic mint + exact receipt + provenance + inventory + account/network switch');
 }
 {
  const {page,state}=await fixture(360,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.changeAccount('0x2222222222222222222222222222222222222222'));assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('account change invalidates review and consent');
 }
 {
  const {page,state}=await fixture(390,{approved:true});await connect(page);await manual(page,ids.join(','));state.ownerDelay=100;await page.locator('#verify-ids').click();await page.evaluate(B=>window.changeAccount(B),B);await page.waitForTimeout(600);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#consent').isChecked(),false);await page.close();await pass('stale ownership results cannot verify another account');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.sendRace=true);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').classList.contains('error'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('account race after estimate blocks send');
 }
 {
  const {page,state}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);state.supply=420;await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('420'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('sold out during confirmation blocks send');
 }
 {
  const {page}=await fixture(390,{supply:null});await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);assert.equal(await page.locator('#manual-ids').isDisabled(),false);assert.equal(await page.locator('#verify-ids').isDisabled(),true);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await page.close();await pass('unknown supply never enables mint');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.mode='reject');await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('Cancelled'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('wallet rejection has no automatic retry');
 }
 {
  const {page,state}=await fixture(390,{approved:true,pending:true});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);await page.evaluate(B=>window.changeAccount(B),B);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#switch-account').isDisabled(),true);assert.match(await page.locator('#transaction-result').textContent(),new RegExp(A));state.pending=false;await page.waitForFunction(()=>/MINT CONFIRMED|REVEALED/.test(document.querySelector('#mint-state-message').textContent));assert.match(await page.locator('#mint-state-message').textContent(),new RegExp(A));await page.close();await pass('pending receipt remains pinned to submitted recipient after wallet change');
 }
 {
  const {page}=await fixture(390,{approved:true,receiptRecipient:B});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('does not contain'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),1);await page.close();await pass('wrong-recipient receipt locks mint and cannot claim success');
 }
 for(const mode of ['transport','invalidhash']) {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(mode=>window.mode=mode,mode);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));
  assert.equal(await page.locator('#main-mint-button').isDisabled(),true);const stored=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')).map(k=>JSON.parse(localStorage[k])));assert.equal(stored[0].hash,null);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);
  await page.locator('#transaction-result input[type="checkbox"]').check();await page.getByRole('button',{name:'CLEAR UNSENT REQUEST'}).click();assert.match(await page.locator('#mint-state-message').textContent(),/Unsent request cleared/);await page.close();await pass('durable uncertain '+mode+' outcome requires explicit history resolution across reload');
 }
 {
  const {page,state}=await fixture(390,{approved:true,pending:true});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);state.sent=await page.evaluate(()=>window.sent);await page.reload();await page.waitForFunction(()=>document.querySelector('#main-mint-button span').textContent==='TRANSACTION PENDING');assert.equal(await page.evaluate(()=>window.sent.length),0);state.pending=false;await page.waitForFunction(()=>/MINT CONFIRMED|REVEALED/.test(document.querySelector('#mint-state-message').textContent));await page.close();await pass('submitted receipt resumes after reload without signing again');
 }
 {
  const {page}=await fixture(390,{approved:true,receiptStatus:'0x0'});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('reverted'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')).length),0);await page.close();await pass('reverted receipt claims no lock and requires fresh verification');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.locator('#cancel-review').click();assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);await page.locator('#main-mint-button').click();await page.waitForFunction(()=>document.querySelector('#review-dialog').open);await page.keyboard.press('Escape');assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('cancel and Escape close review without a transaction');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('ggoo:pending'))throw new DOMException('Quota exceeded','QuotaExceededError');return set.call(this,k,v);};});await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('storage'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('storage failure blocks wallet submission before any send');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'}});await page.getByRole('button',{name:'Pause animations',exact:true}).click();await page.locator('.goo-specimen').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.goo-specimen').complete&&document.querySelector('.goo-specimen').currentSrc.endsWith('renderer-preview-still.svg'));
  const stillA=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-still-t0.png')});await page.waitForTimeout(1400);const stillB=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-still-t1.png')});assert.equal(stillA.equals(stillB),true,'explicitly paused SVG pixels remain static');
  await page.getByRole('button',{name:'Play animations',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.goo-specimen').complete&&document.querySelector('.goo-specimen').currentSrc.endsWith('/renderer-preview.svg'));await page.waitForTimeout(200);const movingA=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-animated-t0.png')});await page.waitForTimeout(1400);const movingB=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-animated-t1.png')});assert.equal(movingA.equals(movingB),false,'native animated SVG changes real rendered pixels');await page.close();await pass('native renderer SMIL changes pixels while explicitly paused output remains identical');
 }
 for(const mount of ['/ganjaghoulballs','/ganjaghoulballs/']) {
  const query='?ref=goo&recipient='+B;const {page,state}=await fixture(390,{approved:true,startPath:mount+query+'#gallery'});await connect(page);await select(page);
  assert.equal((await page.locator('#wallet-address').textContent()).toLowerCase(),A,'URL recipient never overrides wallet');
  await page.locator('.hero-actions .cta').click();assert.equal(new URL(page.url()).pathname,'/ganjaghoulballs/');assert.equal(new URL(page.url()).search,query);assert.equal(await page.locator('#selected-count').textContent(),'13','same-page navigation preserves selection');assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.method==='eth_requestAccounts').length),1);
  await page.locator('#gallery-content a[href="#token/1"]').click();await page.waitForFunction(()=>document.querySelectorAll('#token-ingredients a').length===13);assert.equal(new URL(page.url()).pathname,'/ganjaghoulballs/');assert.equal(new URL(page.url()).search,query);
  assert.ok(state.requests.some(url=>new URL(url).pathname==='/ganjaghoulballs/config.json'));
  for(const url of state.requests.filter(url=>new URL(url).origin===origin)){const path=new URL(url).pathname;assert.equal(/^\/(assets|vendor)\//.test(path)||/^\/(app\.js|style\.css|config\.json)$/.test(path),false,'no root-escaped local asset '+path);}
  await page.locator('#animation-preview-link').click();assert.equal(new URL(page.url()).pathname,'/ganjaghoulballs/animation-preview.html');assert.equal(new URL(page.url()).search,query);await page.waitForFunction(()=>[...document.querySelectorAll('figure img')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('figure img').count(),4);await page.locator('#back-to-collection').click();await page.waitForFunction(()=>document.querySelector('#contract-status').textContent.includes('VERIFIED'));assert.equal(new URL(page.url()).pathname,'/ganjaghoulballs/');assert.equal(new URL(page.url()).search,query);await page.close();await pass('nested '+mount+' assets, config, vendor, token route, query and preview navigation');
 }
 {
  const query='?ref=alias&recipient='+B;const {page}=await fixture(390,{startPath:'/ggoo'+query+'#token/1'});await page.waitForFunction(()=>document.querySelectorAll('#token-ingredients a').length===13);assert.equal(new URL(page.url()).pathname,'/ganjaghoulballs/');assert.equal(new URL(page.url()).search,query);assert.equal(new URL(page.url()).hash,'#token/1');assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);await page.close();await pass('ggoo alias redirect preserves query and direct token fragment');
 }
 {
  const query='?ref=mobile&recipient='+B;const {page}=await fixture(390,{secure:true,startPath:'/ganjaghoulballs/'+query+'#token/1'});await page.waitForFunction(()=>!document.querySelector('#metamask-link').hidden);assert.equal(await page.locator('#metamask-link').getAttribute('href'),'https://link.metamask.io/dapp/midaswhale.wtf/ganjaghoulballs/'+query+'#token/1');await page.locator('.hero-actions .cta').click();await page.waitForFunction(()=>document.querySelector('#metamask-link').href.endsWith('#summon'));assert.equal(new URL(page.url()).search,query);await page.close();await pass('HTTPS mobile-wallet deeplink preserves mounted path, query and current token fragment');
 }
 {
  const {page}=await fixture(390,{approved:true,startPath:'/ganjaghoulballs/?ref=pending'});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.mode='transport');await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));await page.goto(origin+'/?ref=other-mount');await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')));assert.deepEqual(keys,['ggoo:pending:8453:'+G]);await page.close();await pass('same-domain root and nested mount share durable pending protection for same chain and collection');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'},reducedMotion:'reduce'});await expectPreviewMode(page,false);assert.equal(await page.locator('#motion-toggle').textContent(),'Pause animations');assert.match(await page.locator('#motion-note').textContent(),/playing/);
  await page.locator('.goo-specimen').scrollIntoViewIfNeeded();const a=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'motion-autoplay-t0.png')});await page.waitForTimeout(1300);const b=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'motion-autoplay-t1.png')});assert.equal(a.equals(b),false,'site default displays actual moving native SVG even with OS reduced motion');
  await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectPreviewMode(page,true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.screenshot({path:path.join(OUT,'motion-control-mobile-390.png'),fullPage:true});await page.close();await pass('site autoplay default includes OS reduced motion; explicit Pause switches all five native sources and real pixels');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'},reducedMotion:'no-preference'});await expectPreviewMode(page,false);assert.equal(await page.locator('#motion-toggle').textContent(),'Pause animations');await page.getByRole('button',{name:'Pause animations',exact:true}).focus();await page.keyboard.press('Enter');await expectPreviewMode(page,true);assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');await page.keyboard.press('Space');await expectPreviewMode(page,false);await page.emulateMedia({reducedMotion:'reduce'});await expectPreviewMode(page,false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('normal motion starts playing; keyboard-accessible Pause/Play and explicit choice survive OS preference change');
 }
 {
  const {page}=await fixture(390,{supply:2,reducedMotion:'reduce'});await page.locator('#gallery-content').scrollIntoViewIfNeeded();await expectChainImageMode(page,'.gallery-art','svg');await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art','svgStill');await page.getByRole('button',{name:'Play animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art','svg');await page.locator('#gallery-content a[href="#token/1"]').click();await expectChainImageMode(page,'#token-art','svg');await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art, #token-art','svgStill');assert.equal(await page.locator('#token-ingredients a').count(),13);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);await page.close();await pass('same control switches onchain gallery and provenance between svg and svgStill without wallet activity');
 }
 {
  const {page,state}=await fixture(390,{supply:2,reducedMotion:'reduce',artDelay:400});await page.getByRole('button',{name:'Pause animations',exact:true}).click();await page.locator('#gallery-content').scrollIntoViewIfNeeded();await expectChainImageMode(page,'.gallery-art','svgStill');await page.getByRole('button',{name:'Play animations',exact:true}).click();await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art','svgStill');await page.waitForTimeout(550);await expectChainImageMode(page,'.gallery-art','svgStill');assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('late animated RPC responses cannot overwrite a newer Pause choice');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'},reducedMotion:'reduce'});await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectPreviewMode(page,true);await page.reload();await expectPreviewMode(page,true);assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');await page.goto(origin+'/ganjaghoulballs/?ref=motion');await expectPreviewMode(page,true);await page.emulateMedia({reducedMotion:'no-preference'});await expectPreviewMode(page,true);await page.getByRole('button',{name:'Play animations',exact:true}).click();await expectPreviewMode(page,false);await page.reload();await expectPreviewMode(page,false);await page.close();await pass('explicit Pause/Play survives reload, root/nested mount navigation and OS changes in this tab session');
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:850},javaScriptEnabled:false,reducedMotion:'reduce'});await page.goto(origin);await expectPreviewMode(page,false);await page.close();await pass('no-JavaScript HTML defaults all five native previews to animated even with OS reduced motion');
 }
 for(const [label,options] of [['missing backdrop',{config:{backdrop:null}}],['wrong wrapper',{config:{vrfWrapper:A}}],['wrong wrapper runtime pin',{config:{runtimeCodeHashes:{...baseConfig.runtimeCodeHashes,vrfWrapper:keccak256('0x6000')}}}],['missing request cap',{config:{maxRequestPrice:null}}],['mismatched immutable cap',{config:{maxRequestPrice:'20000000000000'}}],['wrong art version',{artVersion:'OLD_ART'}]]){
  const {page}=await fixture(390,options);assert.match(await page.locator('#contract-status').textContent(),/SAFETY LOCK/);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('reject '+label+' before wallet writes');
 }
 for(const [label,options] of [['empty reserve',{reserve:0n}],['over-cap quote',{quote:10000000000001n}],['unknown quote',{quote:null}],['zero quote',{quote:0n}],['disabled oracle',{disabled:true}],['unconfigured oracle',{configured:false}],['changed coordinator',{coordinator:A}]]){
  const {page}=await fixture(390,options);await connect(page);await select(page);assert.equal(await page.locator('#approve-button').isDisabled(),true);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.match(await page.locator('#oracle-reserve').textContent(),/paused/i);await page.close();await pass(label+' blocks approval and mint without charging user');
 }
 for(const kind of ['approve','mint']){
  const {page,state}=await fixture(390,{approved:kind==='mint'});await connect(page);await select(page);if(kind==='mint')await mintReview(page);else{await page.locator('#approve-button').click();await page.locator('#review-consent').check();}state.reserve=0n;await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('reserve is too low'));assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')).length),0);await page.close();await pass('reserve drop during '+kind+' confirmation is rechecked before any send');
 }
 {
  const {page,state}=await fixture(390,{revealed:false,startPath:'/#token/1'});await page.waitForFunction(()=>document.querySelector('#token-status').textContent.includes('AWAITING RANDOMNESS'));assert.equal(await page.locator('#token-ingredients a').count(),13);assert.equal(await page.locator('#token-lineage').isVisible(),false);assert.equal(state.abiCalls.some(n=>['seedOf','genomeOf','parentGenesOf'].includes(n)),false);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ggoo:svg:'))),false);assert.match(await page.locator('#token-status').textContent(),/permanently locked already/);await page.locator('#token-page').screenshot({path:path.join(OUT,'pending-reveal-mobile-390.png')});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#token-status').textContent.includes('AWAITING RANDOMNESS'));assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ggoo:svg:'))),false);state.revealed=true;state.seedValue=0n;await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));await page.waitForFunction(()=>!document.querySelector('#token-lineage').hidden);assert.equal(await page.locator('.lineage-parent').count(),13);assert.match(await page.locator('#token-facts').textContent(),/GENERATION SEED0/);assert.match(await page.locator('#token-facts').textContent(),/MINT BLOCK9007199254740993/);assert.match(await page.locator('#token-lineage').textContent(),/Count: #1 \(1\) \+ #2 \(2\) → inherited 2/);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ggoo:svg:'))),true);await page.locator('#token-lineage summary').click();await page.locator('#token-page').screenshot({path:path.join(OUT,'revealed-lineage-mobile-390.png')});await page.close();await pass('pending cocoon never persists; read-only reveal replaces art and exposes actual parent lineage even with zero seed');
 }
 {
  const {page,state}=await fixture(390,{approved:true,revealed:false});await connect(page);await select(page);await mintReview(page);assert.match(await page.locator('#review-copy').textContent(),/originals are locked immediately/);assert.match(await page.locator('#review-copy').textContent(),/remain unrevealed permanently/);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('MINT CONFIRMED'));assert.match(await page.locator('#mint-state-message').textContent(),/permanently locked now/);assert.equal(await page.evaluate(()=>window.sent.length),1);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ggoo:pending'))),false);state.revealed=true;await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('REVEALED.'));assert.equal(await page.evaluate(()=>window.sent.length),1);assert.match(await page.locator('#transaction-result').textContent(),/No additional transaction/);await page.close();await pass('exact mint receipt unlocks transaction lock while reveal remains pending; oracle completion never sends a second transaction');
 }
 for(const kind of ['approve','mint'])for(const change of ['provider','coordinator','runtime']){
  const {page,state}=await fixture(390,{approved:kind==='mint'});await connect(page);await select(page);if(kind==='mint')await mintReview(page);else{await page.locator('#approve-button').click();await page.locator('#review-consent').check();}if(change==='provider')state.disabled=true;else if(change==='coordinator')state.coordinator=A;else state.badCode=true;await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').classList.contains('error'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass(change+' change during '+kind+' review blocks wallet send');
 }
 {
  const {page,state}=await fixture(390,{quote:10000000000001n,zeroGasQuote:100n,gasPrice:'0x77359400'});await connect(page);await select(page);assert.equal(await page.locator('#approve-button').isDisabled(),true);assert.ok(state.quotedGasPrices.length>0);assert.equal(state.quotedGasPrices.every(p=>p==='2000000000'),true);assert.equal(state.abiCalls.includes('quoteRandomness'),false,'never trust a default zero-gas-price quote');assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('explicit nonzero fee quote exceeds cap even though no default-gas-price quote is used');
 }
 {
  const {page,state}=await fixture(390,{approved:true,gasPrice:'0x77359400'});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);const tx=await page.evaluate(()=>window.sent[0]);assert.equal(tx.gasPrice,'0x77359400');const estimated=await page.evaluate(()=>window.calls.find(c=>c.method==='eth_estimateGas').params[0]);assert.equal(estimated.gasPrice,tx.gasPrice);assert.equal(state.simulatedTransactions.at(-1).gasPrice,tx.gasPrice);assert.equal(state.quotedGasPrices.every(p=>p==='2000000000'),true);await page.close();await pass('mint oracle budget, wallet estimate and send share the same explicit Base gas price');
 }
 for(const direct of [false,true]){
  const {page,state}=await fixture(390,{revealed:false,pendingArtDelay:800,startPath:direct?'/#token/1':'/'});if(!direct)await page.locator('#gallery-content').scrollIntoViewIfNeeded();await page.waitForTimeout(100);assert.ok(state.abiCalls.includes('svg'));state.revealed=true;await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));const selector=direct?'#token-art':'.gallery-art';await page.waitForFunction(selector=>decodeURIComponent(document.querySelector(selector).getAttribute('src')||'').includes('data-revealed="true"'),selector);await page.waitForTimeout(950);assert.match(decodeURIComponent(await page.locator(selector).first().getAttribute('src')),/data-revealed="true"/);if(direct)assert.equal(await page.locator('#token-lineage').isVisible(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('late pending cocoon cannot overwrite revealed art on '+(direct?'direct provenance':'gallery'));
 }
 {
  const decoded=decodeLineage(ids,parentGenes,genome);assert.equal(decoded.parents[0].word,String(parentGenes[0]));assert.equal(decoded.loci[0].a.id,'1');assert.equal(decoded.loci[0].b.id,'2');assert.equal(decoded.mutations,0);assert.equal(decoded.motion,2);assert.ok(parentGenes[0]>BigInt(Number.MAX_SAFE_INTEGER));assert.throws(()=>decodeLineage(ids,parentGenes,genome^(1n<<104n)));assert.throws(()=>decodeLineage(ids,parentGenes,genome|(13n<<160n)));assert.throws(()=>decodeLineage(ids.slice().reverse(),parentGenes,genome));assert.throws(()=>decodeLineage(ids,parentGenes.slice(1),genome));const mutated=decodeLineage(ids,parentGenes,genome|(15n<<80n));assert.equal(mutated.mutations,15);await pass('uint256 v3 lineage decoding preserves full precision and validates version, canonical IDs, donors and mutation flags');
 }
 {
  const many=Array.from({length:15},(_,i)=>String(i+1)),{page,state}=await fixture(390,{ownedIds:many,config:{deploymentStatus:'awaiting-contract-deployment',ganjaCollection:null,graveyard:null,renderer:null}});
  assert.equal(state.logCalls||0,0,'no discovery before a wallet is connected');await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===15&&document.querySelector('#scan-progress').hidden);
  assert.equal(await page.locator('#manual-fallback').evaluate(el=>el.open),false);assert.match(await page.locator('#inventory-status').textContent(),/15 originals found/);assert.equal(await page.locator('#verify-ids').isDisabled(),true);
  for(let i=0;i<14;i++)await page.locator('.id-chip').nth(i).click();assert.equal(await page.locator('#selected-count').textContent(),'13');assert.equal(await page.locator('.id-chip[aria-pressed="true"]').count(),13);assert.match(await page.locator('#toast').textContent(),/13 selected/);
  await page.waitForFunction(()=>document.querySelector('.original-traits').textContent.includes('Midnight'));assert.equal(state.abiCalls.some(x=>['tokenURI','imageURI','getApproved','isApprovedForAll'].includes(x)),false);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('.mint-panel').screenshot({path:path.join(OUT,'owned-selection-mobile-390.png')});
  await page.locator('#clear-selection').click();await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');await page.close();await pass('prelaunch connect automatically finds owned cards, real recipe traits and capped 13 selection without approvals or heavy artwork');
 }
 for(const count of [0,5]){
  const {page}=await fixture(320,{ownedIds:ids.slice(0,count),config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelector('#og-balance').textContent!=='—'&&document.querySelector('#scan-progress').hidden);assert.equal(await page.locator('.id-chip').count(),count);assert.equal(await page.locator('#select-thirteen').isDisabled(),true);assert.match(await page.locator('#inventory-status').textContent(),count?/need 8 additional/:/No original Ghoulballs/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.close();await pass('automatic discovery explains '+count+' originals without inventing an eligible set');
 }
 {
  const {page}=await fixture(390,{reserve:0n});await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');await page.locator('#verify-ids').click();await page.waitForFunction(()=>document.querySelector('#selection-feedback').textContent.includes('All 13 originals'));assert.equal(await page.locator('#approve-button').isVisible(),false);assert.equal(await page.locator('#approve-button').isDisabled(),true);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('unfunded GGOO reserve does not block read-only original selection and still blocks approval');
 }
 {
  const {page,state}=await fixture(390,{badOriginal:true,config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('code could not be verified'));assert.equal(await page.locator('.id-chip').count(),0);assert.equal(state.logCalls||0,0);assert.equal(state.abiCalls.includes('balanceOf'),false);assert.equal(await page.locator('#manual-ids').isDisabled(),true);await page.close();await pass('wrong original runtime blocks prelaunch discovery before any balance or history read');
 }
 {
  const {page,state}=await fixture(390,{logDelay:450,ownedByAccount:{[A]:ids,[B]:['31','32']},config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>!document.querySelector('#cancel-inventory').hidden);await page.waitForTimeout(70);await page.evaluate(B=>window.changeAccount(B),B);await page.waitForTimeout(70);state.ownedByAccount[A]=['101','102','103'];state.logDelay=0;await page.evaluate(A=>window.changeAccount(A),A);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===3);await page.waitForTimeout(650);assert.deepEqual(await page.locator('.id-chip strong').allTextContents(),['#101','#102','#103']);assert.equal(await page.locator('#og-balance').textContent(),'3');assert.match(await page.locator('#inventory-status').textContent(),/3 originals found/);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('account A to B to A epoch rejects late scan results and stale finally handlers');
 }
 {
  const {page,state}=await fixture(390,{logDelay:400,config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForTimeout(60);await page.evaluate(()=>window.changeChain('0x1'));assert.equal(await page.locator('#cancel-inventory').isVisible(),false);assert.equal(await page.locator('#manual-ids').isDisabled(),true);state.logDelay=0;state.ownedIds=['21','22'];await page.locator('#switch-base').click();await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===2);await page.waitForTimeout(550);assert.deepEqual(await page.locator('.id-chip strong').allTextContents(),['#21','#22']);assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.method==='eth_requestAccounts').length),1);await page.close();await pass('chain-away and Base return cancel old reads and automatically discover the current wallet');
 }
 {
  const {page,state}=await fixture(390,{logDelay:450,config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>!document.querySelector('#cancel-inventory').hidden);await page.locator('#cancel-inventory').click();await page.waitForTimeout(550);assert.match(await page.locator('#inventory-status').textContent(),/Search stopped/);assert.equal(await page.locator('.id-chip').count(),0);state.logDelay=0;await page.locator('#scan-inventory').click();await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('Stop search prevents stale rendering and explicit refresh resumes read-only discovery');
 }
 for(const failure of ['truncateLogs','logError','ownerError','balanceError']){
  const {page,state}=await fixture(390,{[failure]:true,blockNumber:'0x1000',config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('Discovery incomplete'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.doesNotMatch(await page.locator('#inventory-status').textContent(),/No original Ghoulballs found/);state[failure]=false;const before=state.logRanges?.length||0;await page.locator('#scan-inventory').click();await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('13 originals found'));assert.equal(await page.locator('.id-chip').count(),13);if(failure==='truncateLogs')assert.equal(state.logRanges[before][0],'0x64','incomplete logs reset cursor to original genesis');await page.close();await pass(failure+' is reported as incomplete and retry recovers without a poisoned history cursor');
 }
 {
  const good=id=>({address:OG,...abi.encodeEventLog(abi.getEvent('Transfer'),[zero,A,id])});const wrong=[{...good('14'),address:G},{...good('15'),topics:[abi.getEvent('Transfer').topicHash,'0x'+'0'.repeat(64),'0x'+B.slice(2).padStart(64,'0'),'0x'+(15).toString(16).padStart(64,'0')]},{...good('16'),topics:['0x'+'ab'.repeat(32),...good('16').topics.slice(1)]}];
  const {page}=await fixture(390,{logsOverride:[...ids.map(good),...wrong],config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);assert.deepEqual(await page.locator('.id-chip strong').allTextContents(),ids.map(id=>'#'+id));await page.close();await pass('discovery rejects logs from another collection, recipient or event topic');
 }
 {
  const {page,state}=await fixture(390,{recipeError:true,config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.waitForFunction(()=>document.querySelector('.original-traits').textContent.includes('unavailable'));await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('unavailable original art or traits never blocks token-ID card selection');
 }
 {
  const {page,state}=await fixture(390,{ownerErrorIds:['200','201'],config:{deploymentStatus:'awaiting-contract-deployment'}});await page.evaluate(({A,OG})=>localStorage.setItem('ggoo:inventory:8453:'+OG+':'+A,JSON.stringify({block:999999999,ids:['200','201','1']})),{A,OG});await connect(page);await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('13 originals found'));assert.deepEqual(await page.locator('.id-chip strong').allTextContents(),ids.map(id=>'#'+id));assert.equal(state.logRanges[0][0],'0x64');await page.close();await pass('future cached cursor and unowned cached IDs cannot hide or impersonate current originals');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('No original Ghoulballs found'));assert.equal(await page.locator('.id-chip').count(),0);assert.equal(await page.locator('#selected-count').textContent(),'0');assert.equal(await page.evaluate(()=>window.sent.length),1);await page.close();await pass('confirmed mint automatically refreshes ownership and excludes permanently locked parents');
 }
 {
  const {page}=await fixture(390,{badCode:true});await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');assert.equal(await page.locator('#verify-ids').isDisabled(),true);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.match(await page.locator('#contract-status').textContent(),/SAFETY LOCK/);await page.close();await pass('verified original discovery remains available when GGOO deployment verification fails');
 }
 for(const kind of ['approve','mint']){
  const {page,state}=await fixture(390,{approved:kind==='mint'});await connect(page);await select(page);if(kind==='mint')await mintReview(page);else{await page.locator('#approve-button').click();await page.locator('#review-consent').check();}state.badOriginal=true;await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('Original Ghoulballs code'));assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await page.close();await pass('changed original runtime during '+kind+' review blocks wallet send');
 }
 {
  const {page,state}=await fixture(390,{approved:true});await connect(page);await select(page);await page.locator('#consent').check();state.badOriginal=true;await page.locator('#scan-inventory').click();await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('code could not be verified'));assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#manual-ids').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('failed original runtime refresh invalidates prior ownership consent and every write gate');
 }
 {
  const {page,state}=await fixture(390,{changedOriginal:true,config:{deploymentStatus:'awaiting-contract-deployment'}});await connect(page);await page.waitForFunction(()=>document.querySelector('#inventory-status').textContent.includes('code could not be verified'));assert.equal(state.logCalls||0,0);assert.equal(await page.locator('#manual-ids').isDisabled(),true);await page.close();await pass('same-length mutated original runtime is rejected by hash before read-only discovery');
 }
 {
  const {page,state}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'}});await page.evaluate(()=>localStorage.setItem('ggoo:recipe:8453:0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a:1',JSON.stringify({count:2,theme:0,motion:1,colors:['url(https://invalid.example/steal)','<img src=x onerror=alert(1)>']})));await connect(page);await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#inventory').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.original-colors').children.length>0);assert.equal(await page.locator('.original-colors span').first().evaluate(el=>/^rgb\(/.test(el.style.backgroundColor)),true);assert.equal(state.requests.some(url=>url.includes('invalid.example')),false);assert.equal(state.abiCalls.includes('recipeOf'),true);assert.equal(state.abiCalls.some(fn=>fn==='tokenURI'||fn==='imageURI'),false);assert.equal(await page.locator('.original-card img').count(),0);await page.close();await pass('malformed cached recipe colors are discarded and replaced by actual bounded recipe data without external artwork calls');
 }
 }
 // Optional focused invocation: GGOO_GIF_WIRING_ONLY=1. The normal suite keeps
 // every prior assertion and adds these seven checks against the built app.
 {
  const {page,state}=await fixture(320,{svgOverride:gifLiveSvg,startPath:'/ganjaghoulballs/#token/1'});
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);
  assert.equal(await page.locator('#token-share-x').isVisible(),true);
  const intent=new URL(await page.locator('#token-share-x').getAttribute('href'));
  assert.equal(intent.origin,'https://x.com');assert.equal(intent.pathname,'/intent/post');
  assert.equal(intent.searchParams.get('url'),origin+'/ganjaghoulballs/#token/1');assert.match(intent.searchParams.get('text'),/#1/);
  assert.match(await page.locator('#token-export-status').textContent(),/6-second.*loop restarts/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const automaticDownload=page.waitForEvent('download');await page.locator('#token-download-gif').click();const automatic=await automaticDownload;
  assert.equal(automatic.suggestedFilename(),'ggoo-1-animated-preview.gif');
  const automaticPath=path.join(OUT,'token-page-auto-token-1.gif');await automatic.saveAs(automaticPath);
  assert.equal(fs.readFileSync(automaticPath).subarray(0,6).toString(),'GIF89a');
  assert.equal(await page.locator('#token-save-gif').isVisible(),true);
  const savedHref=await page.locator('#token-save-gif').getAttribute('href');assert.match(savedHref,/^blob:/);
  assert.equal(await page.evaluate(async url=>new TextDecoder().decode((await (await fetch(url)).arrayBuffer()).slice(0,6)),savedHref),'GIF89a','successful automatic download retains a usable manual file');
  const readsBeforeHandoff=state.abiCalls.filter(name=>name==='svg').length;
  const handoff=await page.evaluate(async url=>{
   document.querySelector('#token-save-gif').click();document.querySelector('#token-download-gif').click();
   await new Promise(resolve=>setTimeout(resolve,200));
   return {header:new TextDecoder().decode((await (await fetch(url)).arrayBuffer()).slice(0,6)),status:document.querySelector('#token-export-status').textContent,saveHidden:document.querySelector('#token-save-gif').hidden,href:document.querySelector('#token-save-gif').getAttribute('href')};
  },savedHref);
  assert.equal(handoff.header,'GIF89a','starting another export preserves the full prior download handoff');
  assert.match(handoff.status,/handoff/);assert.equal(handoff.saveHidden,true);assert.equal(handoff.href,null);
  assert.equal(state.abiCalls.filter(name=>name==='svg').length,readsBeforeHandoff,'new export waits before its SVG read while the old download is handed off');
  await page.waitForFunction(url=>!document.querySelector('#token-save-gif').hidden&&document.querySelector('#token-save-gif').href!==url&&!document.querySelector('#token-download-gif').disabled,savedHref);
  assert.equal(await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},savedHref),true,'prior URL is revoked after handoff');
  assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('revealed controls preserve nested X link, automatic download keeps a usable Save GIF, and immediate re-export honors the handoff at 320px');
 }
 {
  const {page,state}=await fixture(390,{svgOverride:gifLiveSvg,startPath:'/ganjaghoulballs/#token/1'});let downloads=0;page.on('download',()=>downloads++);
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);
  await expectNoSavedGif(page);await suppressAutomaticGifDownload(page);await page.locator('#token-download-gif').click();
  await page.waitForFunction(()=>!document.querySelector('#token-save-gif').hidden&&!document.querySelector('#token-download-gif').disabled);
  assert.equal(downloads,0,'suppressed automatic download must leave a manual fallback');
  assert.equal(await page.evaluate(()=>window.gifAutoDownloadAttempts),1);
  const save=page.locator('#token-save-gif'),href=await save.getAttribute('href');assert.match(href,/^blob:/);assert.match(await save.textContent(),/SAVE GIF/i);
  assert.equal(await save.getAttribute('download'),'ggoo-1-animated-preview.gif');
  const rpcBefore=state.abiCalls.filter(name=>name==='svg').length,urlsBefore=await page.evaluate(()=>window.gifCreatedUrls.length);
  const downloaded=page.waitForEvent('download');await save.click();const download=await downloaded;
  assert.equal(download.suggestedFilename(),'ggoo-1-animated-preview.gif');
  const destination=path.join(OUT,'token-page-live-token-1.gif');await download.saveAs(destination);
  assert.equal(fs.readFileSync(destination).subarray(0,6).toString(),'GIF89a');
  assert.equal(state.abiCalls.filter(name=>name==='svg').length,rpcBefore,'manual Save GIF must not fetch the SVG again');
  assert.equal(await page.evaluate(()=>window.gifCreatedUrls.length),urlsBefore,'manual Save GIF must reuse the completed file without rerendering');
  assert.equal(await save.getAttribute('href'),href,'manual save remains available');assert.equal(await save.isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.token-export').screenshot({path:path.join(OUT,'gif-save-fallback-390.png')});
  assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('manual Save GIF downloads the completed GIF89a after automatic download suppression without rerendering or RPC');
 }
 {
  const {page}=await fixture(390,{revealed:false,startPath:'/ganjaghoulballs/#token/1'});
  await page.waitForFunction(()=>document.querySelector('#token-status').textContent.includes('AWAITING RANDOMNESS'));
  assert.equal(await page.locator('#token-download-gif').isDisabled(),true);assert.equal(await page.locator('#token-share-x').isVisible(),false);
  await expectNoSavedGif(page);
  assert.match(await page.locator('#token-export-status').textContent(),/reveal|pending/i);
  assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('pending token cannot download a GIF or expose a revealed-art X share action');
 }
 {
  const {page,state}=await fixture(390,{svgOverride:gifLiveSvg,startPath:'/ganjaghoulballs/#token/1'});let downloads=0;page.on('download',()=>downloads++);
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);state.artDelay=550;
  await page.locator('#token-download-gif').click();await page.locator('#token-gif-cancel').click();
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);await page.waitForTimeout(150);
  assert.equal(downloads,0);assert.equal(await page.locator('#token-gif-cancel').isVisible(),false);assert.equal(await page.evaluate(()=>window.sent.length),0);
  await expectNoSavedGif(page);
  await page.close();await pass('cancelling during a slow onchain SVG read prevents download and restores the token controls');
 }
 {
  const {page,state}=await fixture(390,{svgOverride:gifLiveSvg,supply:2,startPath:'/ganjaghoulballs/#token/1'});let downloads=0;page.on('download',()=>downloads++);
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);state.artDelay=550;
  await page.locator('#token-download-gif').click();await page.evaluate(()=>{location.hash='token/2';});
  await page.waitForFunction(()=>document.querySelector('#token-title').textContent.includes('#2'));
  await page.waitForTimeout(800);assert.equal(downloads,0);assert.equal(await page.locator('#token-gif-cancel').isVisible(),false);
  await expectNoSavedGif(page);
  assert.equal(new URL(await page.locator('#token-share-x').getAttribute('href')).searchParams.get('url'),origin+'/ganjaghoulballs/#token/2');
  assert.doesNotMatch(await page.locator('#token-export-status').textContent(),/GIF download ready/);assert.equal(await page.evaluate(()=>window.sent.length),0);
  await page.close();await pass('changing token routes cancels stale export and keeps the new token share link');
 }
 {
  const {page,state}=await fixture(390,{svgOverride:gifLiveSvg,startPath:'/ganjaghoulballs/#token/1'});let downloads=0;page.on('download',()=>downloads++);
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);state.svgOverride='<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  await page.locator('#token-download-gif').click();await page.waitForFunction(()=>document.querySelector('#token-export-status').textContent.includes('GIF export unavailable'));
  assert.equal(downloads,0);assert.equal(await page.locator('#token-download-gif').isDisabled(),false);assert.equal(await page.locator('#token-gif-cancel').isVisible(),false);
  await expectNoSavedGif(page);
  assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('malformed export SVG produces a visible error and permits an explicit retry without downloading');
 }
 {
  const {page}=await fixture(320,{svgOverride:gifLiveSvg,supply:2,startPath:'/ganjaghoulballs/#token/1'});
  await page.waitForFunction(()=>!document.querySelector('#token-download-gif').disabled);await suppressAutomaticGifDownload(page);
  await page.locator('#token-download-gif').click();await page.waitForFunction(()=>!document.querySelector('#token-save-gif').hidden&&!document.querySelector('#token-download-gif').disabled);
  const first=await page.locator('#token-save-gif').getAttribute('href');assert.match(first,/^blob:/);
  assert.equal(await page.evaluate(url=>window.gifRevokedUrls.includes(url),first),false,'completed file stays alive for a user gesture');
  await page.locator('#token-download-gif').click();
  await page.waitForFunction(url=>window.gifRevokedUrls.includes(url),first);await expectNoSavedGif(page);
  await page.waitForFunction(url=>!document.querySelector('#token-save-gif').hidden&&document.querySelector('#token-save-gif').href!==url&&!document.querySelector('#token-download-gif').disabled,first);
  const second=await page.locator('#token-save-gif').getAttribute('href');assert.notEqual(second,first);
  assert.equal(await page.evaluate(()=>window.gifAutoDownloadAttempts),2);assert.equal(await page.evaluate(url=>window.gifRevokedUrls.includes(url),second),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.token-export').screenshot({path:path.join(OUT,'gif-save-fallback-320.png')});
  const manualDownload=page.waitForEvent('download');await page.locator('#token-save-gif').click();await manualDownload;
  await page.evaluate(()=>{location.hash='token/2';});await page.waitForFunction(()=>document.querySelector('#token-title').textContent.includes('#2'));
  await expectNoSavedGif(page);await page.waitForFunction(url=>window.gifRevokedUrls.includes(url),second,{timeout:2000});
  assert.equal(await page.evaluate(url=>window.gifRevokedUrls.includes(url),second),true,'route change revokes the previous token GIF after its bounded download handoff');
  assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('consecutive exports replace and revoke the prior GIF, and token navigation clears the saved file at 320px');
 }
 assert.ok(fs.readFileSync(path.join(ROOT,'site/app.js'),'utf8').includes('ggoo:svg:8453:${lower(cfg.ganjaCollection)}:${cfg.runtimeCodeHashes.ganjaCollection}'),'SVG cache is isolated by Base collection and deployed main code');
 assert.deepEqual(errors,[]);console.log(`PASS ${passed} frontend/mobile scenarios. All wallets, approvals, transfers and RPC writes mocked. No live transaction sent.`);
 fs.writeFileSync(path.join(OUT,process.env.GGOO_GIF_WIRING_ONLY?'gif-wiring-report.json':'qa-report.json'),JSON.stringify({passed,viewportWidths:process.env.GGOO_GIF_WIRING_ONLY?[320,390]:[320,360,390,412,768,1440],pageErrors:errors,liveTransactions:0,note:'Mocked EIP-1193 wallet and mocked Base RPC, headless Chromium. No physical mobile wallet was tested.'},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
