import {chromium} from 'playwright';
import {Interface,keccak256} from 'ethers';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ROOT=path.resolve(import.meta.dirname,'../..');
const OUT=path.join(ROOT,'artifacts/frontend');fs.mkdirSync(OUT,{recursive:true});
const A='0x1111111111111111111111111111111111111111',B='0x2222222222222222222222222222222222222222';
const OG='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c',G='0x3333333333333333333333333333333333333333',V='0x4444444444444444444444444444444444444444',R='0x5555555555555555555555555555555555555555';
const abi=new Interface(['function totalSupply() view returns(uint256)','function MAX_SUPPLY() view returns(uint256)','function SACRIFICE_COUNT() view returns(uint256)','function deploymentChainId() view returns(uint256)','function originalCollection() view returns(address)','function graveyard() view returns(address)','function renderer() view returns(address)','function redeemer() view returns(address)','function ownerOf(uint256) view returns(address)','function balanceOf(address) view returns(uint256)','function getApproved(uint256) view returns(address)','function isApprovedForAll(address,address) view returns(bool)','function setApprovalForAll(address,bool)','function mint(uint256[13])','function svg(uint256) view returns(string)','function svgStill(uint256) view returns(string)','function ingredientsOf(uint256) view returns(uint256[13])','function seedOf(uint256) view returns(uint256)','function traitsOf(uint256) view returns(string)','event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)','event GhoulballsSacrificed(address indexed redeemer,uint256 indexed gooId,uint256[13] originalIds)']);
const ids=Array.from({length:13},(_,i)=>String(i+1)),zero='0x0000000000000000000000000000000000000000';
const code={ganjaCollection:'0x6001600055',graveyard:'0x6002600055',renderer:'0x6003600055'};
const baseConfig={chainId:8453,originalCollection:OG,ganjaCollection:G,graveyard:V,renderer:R,deploymentStatus:'deployed-verified',runtimeCodeHashes:Object.fromEntries(Object.entries(code).map(([k,v])=>[k,keccak256(v)])),maxSupply:420,sacrificeCount:13,originalGenesisBlock:100,rpcUrls:['./rpc']};
function staticFile(requestURL) {
 let p=new URL(requestURL,'http://local').pathname;
 if(p==='/ganjaghoulballs'||p.startsWith('/ganjaghoulballs/'))p=p.slice('/ganjaghoulballs'.length)||'/';
 if(p==='/animation-preview')p='/animation-preview.html';
 return path.join(ROOT,'site',p==='/'?'index.html':p);
}
function mime(file){return file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/ganjaghoulballs'){res.writeHead(308,{Location:'/ganjaghoulballs/'+url.search});res.end();return;}if(url.pathname==='/ggoo'||url.pathname==='/ggoo/'){res.writeHead(302,{Location:'/ganjaghoulballs/'+url.search});res.end();return;}const file=staticFile(req.url);if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',mime(file));res.end(fs.readFileSync(file));}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell')?'/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell':undefined),args:['--no-sandbox']});let passed=0;
const errors=[];
async function fixture(width=390,options={}){
 const state={approved:false,supply:1,rpcChain:'0x2105',owner:A,receiptStatus:'0x1',pending:false,ownerDelay:0,receiptRecipient:A,missingMint:false,badCode:false,badWiring:false,...options};
 const page=await browser.newPage({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700,reducedMotion:options.reducedMotion||'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 state.requests=[];page.on('request',r=>state.requests.push(r.url()));
 const targetOrigin=options.secure?'https://midaswhale.wtf':origin;
 if(options.secure)await page.route('https://midaswhale.wtf/**',route=>{const file=staticFile(route.request().url());return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file,contentType:mime(file)}):route.fulfill({status:404,body:'Not found'});});
 await page.route('**/config.json',r=>r.fulfill({json:{...baseConfig,...options.config}}));
 await page.addInitScript(({A,B})=>{
  let listeners={};window.mockAccount=null;window.mockChain='0x2105';window.sent=[];window.calls=[];window.mode='success';window.sendRace=false;
  window.changeAccount=a=>{window.mockAccount=a;listeners.accountsChanged?.(a?[a]:[]);};window.changeChain=id=>{window.mockChain=id;listeners.chainChanged?.(id);};
  window.ethereum={on:(name,fn)=>listeners[name]=fn,request:async({method,params})=>{
   window.calls.push({method,params});
   if(method==='eth_accounts')return window.mockAccount?[window.mockAccount]:[];
   if(method==='eth_requestAccounts'){window.mockAccount=A;return[A];}
   if(method==='eth_chainId')return window.mockChain;
   if(method==='wallet_requestPermissions'){if(window.mode==='reject')throw{code:4001,message:'Rejected'};if(window.mode==='unsupported')throw{code:4200,message:'Unsupported method'};window.changeAccount(B);return[{parentCapability:'eth_accounts'}];}
   if(method==='wallet_switchEthereumChain'){window.changeChain('0x2105');return null;}
   if(method==='eth_estimateGas'){if(window.sendRace)window.changeAccount(B);return'0x50000';}
   if(method==='eth_sendTransaction'){if(window.mode==='transport')throw{code:-32603,message:'Wallet transport interrupted'};if(window.mode==='invalidhash')return'not-a-hash';if(window.mode==='reject')throw{code:4001,message:'Rejected'};window.sent.push(params[0]);return'0x'+String(window.sent.length).padStart(64,'0');}
   throw Error('Unexpected wallet method '+method);
  }};
 },{A,B});
 await page.route('**/rpc',async route=>{
  const req=route.request().postDataJSON();let result,error;
  try {
   const {method,params}=req;
   if(method==='eth_chainId')result=state.rpcChain;
   else if(method==='eth_getCode')result=state.badCode?'0x6000':code[params[0].toLowerCase()===G?'ganjaCollection':params[0].toLowerCase()===V?'graveyard':'renderer'];
   else if(method==='eth_blockNumber')result='0x70';
   else if(method==='eth_getLogs')result=ids.map(id=>({address:OG,...abi.encodeEventLog(abi.getEvent('Transfer'),[zero,A,id])}));
   else if(method==='eth_getTransactionReceipt'){
    if(state.pending)result=null;
    else {const sent=await page.evaluate(()=>window.sent);const tx=sent[Number(BigInt(params[0]))-1]||state.sent?.[Number(BigInt(params[0]))-1];if(!tx){result=null;}else{
     const fn=abi.parseTransaction({data:tx.data});let logs=[];
     if(fn.name==='setApprovalForAll')state.approved=true;
     else if(fn.name==='mint'&&!state.missingMint){logs=[{address:G,...abi.encodeEventLog(abi.getEvent('Transfer'),[zero,state.receiptRecipient,2])},{address:G,...abi.encodeEventLog(abi.getEvent('GhoulballsSacrificed'),[state.receiptRecipient,2,ids])}];state.supply=2;}
     result={status:state.receiptStatus,blockNumber:'0x70',logs,transactionHash:params[0]};
    }}
   } else if(method==='eth_call'){
    const tx=params[0],fn=abi.parseTransaction({data:tx.data});let value;
    switch(fn.name){
     case 'MAX_SUPPLY':value=420;break;case'SACRIFICE_COUNT':value=13;break;case'deploymentChainId':value=8453;break;
     case'originalCollection':value=state.badWiring?A:OG;break;case'graveyard':value=V;break;case'renderer':value=R;break;case'redeemer':value=G;break;
     case'totalSupply':if(state.supply===null)throw Error('Supply unavailable');value=state.supply;break;
     case'balanceOf':value=13;break;
     case'ownerOf':if(state.ownerDelay)await new Promise(r=>setTimeout(r,state.ownerDelay));value=state.owner;break;
     case'isApprovedForAll':value=state.approved;break;case'getApproved':value=zero;break;
     case'ingredientsOf':value=ids;break;case'seedOf':value=123456789n;break;
     case'traitsOf':value=JSON.stringify([{trait_type:'Texture',value:'Chocolate hash'},{trait_type:'Mood',value:'Cosmic stoner'}]);break;
     case'svg':case'svgStill':if(state.artDelay&&fn.name==='svg')await new Promise(r=>setTimeout(r,state.artDelay));value='<svg data-mode="'+fn.name+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#251f1a"/><path d="M128 128H384V384H128Z" fill="#75623e"/><path d="M170 220h50v30h-50zm120 0h50v30h-50z" fill="#e15c38"/></svg>';break;
     case'setApprovalForAll':case'mint':result='0x';break;
     default:throw Error('Unexpected ABI '+fn.name);
    }
    if(result===undefined)result=abi.encodeFunctionResult(fn.name,[value]);
   }else throw Error('Unexpected RPC '+method);
  }catch(e){error={code:-32000,message:e.message};}
  await route.fulfill({json:{jsonrpc:'2.0',id:req.id,...(error?{error}:{result})}});
 });
 await page.goto(targetOrigin+(options.startPath||'/'));await page.waitForFunction(()=>!document.querySelector('#contract-status').textContent.includes('CHECKING'));
 return {page,state};
}
async function connect(p){await p.locator('#connect-wallet').click();await p.waitForFunction(()=>document.querySelector('#wallet-address').textContent.length===42);}
async function select(p){await p.locator('#manual-ids').fill(ids.join(', '));await p.locator('#verify-ids').click();await p.waitForFunction(()=>document.querySelector('#selection-feedback').textContent.includes('All 13 originals'));}
async function mintReview(p){await p.locator('#consent').check();await p.locator('#main-mint-button').click();await p.locator('#review-consent').check();}
async function pass(name){passed++;console.log('PASS',name);}
async function expectPreviewMode(page,still){
 const images=page.locator('.goo-picture img, .study-card img');assert.equal(await images.count(),5);
 for(const image of await images.all())await image.scrollIntoViewIfNeeded();
 await page.waitForFunction(still=>[...document.querySelectorAll('.goo-picture img, .study-card img')].every(img=>img.complete&&img.naturalWidth>0&&(img.currentSrc.endsWith('-still.svg')===still)),still);
}
async function expectChainImageMode(page,selector,mode){await page.waitForFunction(({selector,mode})=>[...document.querySelectorAll(selector)].length>0&&[...document.querySelectorAll(selector)].every(img=>decodeURIComponent(img.getAttribute('src')||'').includes('data-mode="'+mode+'"')),{selector,mode});}

try{
 for(const width of [320,360,390,412,768,1440]){
  const {page}=await fixture(width,{config:{deploymentStatus:'awaiting-contract-deployment',ganjaCollection:null,graveyard:null,renderer:null}});
  assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await connect(page);
  assert.equal(await page.locator('#manual-ids').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);
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
  await page.evaluate(()=>window.mode='unsupported');await page.locator('#switch-account').click();assert.equal(await page.locator('#wallet-help').getAttribute('open'),'');
  await page.evaluate(A=>window.changeAccount(A),A);await page.evaluate(()=>window.mode='success');
  await page.evaluate(()=>window.changeChain('0x1'));assert.equal(await page.locator('#manual-ids').isDisabled(),true);await page.locator('#switch-base').click();await page.waitForFunction(()=>!document.querySelector('#manual-ids').disabled);
  for(const input of ['0, 1','1, 1','6668','1.5','1e2',Array.from({length:14},(_,i)=>i+1).join(',')]){await page.locator('#manual-ids').fill(input);assert.equal(await page.locator('#selected-count').textContent(),'0');assert.equal(await page.locator('#verify-ids').isDisabled(),true);}
  await page.locator('#scan-inventory').click();await page.waitForFunction(()=>document.querySelectorAll('.id-chip').length===13);await page.locator('#select-thirteen').click();assert.equal(await page.locator('#selected-count').textContent(),'13');
  await page.locator('#verify-ids').click();await page.waitForFunction(()=>!document.querySelector('#approve-button').hidden);assert.match(await page.locator('#approval-note').textContent(),/ANY.*future.*not limited/s);
  await page.locator('#approve-button').click();assert.match(await page.locator('#review-copy').textContent(),/ALL originals.*future/s);await page.locator('#review-consent').check();await page.locator('#confirm-review').click();
  await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('approval confirmed'));
  assert.equal(await page.evaluate(()=>window.sent.length),1,'approval never auto-mints');assert.equal(abi.parseTransaction({data:(await page.evaluate(()=>window.sent[0])).data}).name,'setApprovalForAll');
  await select(page);await mintReview(page);assert.match(await page.locator('#review-copy').textContent(),/PERMANENT LOCK/);await page.screenshot({path:path.join(OUT,'mint-confirmation-390.png'),fullPage:true});await page.locator('#review-dialog').screenshot({path:path.join(OUT,'mint-dialog-mobile-390.png')});
  await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('IT LIVES'));
  const tx=await page.evaluate(()=>window.sent[1]);assert.equal(tx.from,A);assert.equal(tx.to,G);assert.equal(tx.value,'0x0');assert.equal(tx.chainId,'0x2105');assert.equal(tx.data.slice(0,10),'0x04266e47');assert.deepEqual(abi.decodeFunctionData('mint',tx.data)[0].map(String),ids);
  await page.locator('#transaction-result a[href="#token/2"]').click();await page.waitForFunction(()=>document.querySelectorAll('#token-ingredients a').length===13);assert.equal(await page.locator('#token-facts').textContent().then(s=>s.includes(V)),true);
  await page.screenshot({path:path.join(OUT,'provenance-390.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.close();await pass('complete approval + atomic mint + exact receipt + provenance + inventory + account/network switch');
 }
 {
  const {page,state}=await fixture(360,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.changeAccount('0x2222222222222222222222222222222222222222'));assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('account change invalidates review and consent');
 }
 {
  const {page,state}=await fixture(390,{approved:true});await connect(page);await page.locator('#manual-ids').fill(ids.join(','));state.ownerDelay=100;await page.locator('#verify-ids').click();await page.evaluate(B=>window.changeAccount(B),B);await page.waitForTimeout(600);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#consent').isChecked(),false);await page.close();await pass('stale ownership results cannot verify another account');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.sendRace=true);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').classList.contains('error'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('account race after estimate blocks send');
 }
 {
  const {page,state}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);state.supply=420;await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('420'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('sold out during confirmation blocks send');
 }
 {
  const {page}=await fixture(390,{supply:null});await connect(page);assert.equal(await page.locator('#manual-ids').isDisabled(),true);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);await page.close();await pass('unknown supply never enables mint');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.mode='reject');await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('Cancelled'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('wallet rejection has no automatic retry');
 }
 {
  const {page,state}=await fixture(390,{approved:true,pending:true});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);await page.evaluate(B=>window.changeAccount(B),B);assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.locator('#switch-account').isDisabled(),true);assert.match(await page.locator('#transaction-result').textContent(),new RegExp(A));state.pending=false;await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('IT LIVES'));assert.match(await page.locator('#mint-state-message').textContent(),new RegExp(A));await page.close();await pass('pending receipt remains pinned to submitted recipient after wallet change');
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
  const {page,state}=await fixture(390,{approved:true,pending:true});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>window.sent.length===1);state.sent=await page.evaluate(()=>window.sent);await page.reload();await page.waitForFunction(()=>document.querySelector('#main-mint-button span').textContent==='TRANSACTION PENDING');assert.equal(await page.evaluate(()=>window.sent.length),0);state.pending=false;await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('IT LIVES'));await page.close();await pass('submitted receipt resumes after reload without signing again');
 }
 {
  const {page}=await fixture(390,{approved:true,receiptStatus:'0x0'});await connect(page);await select(page);await mintReview(page);await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('reverted'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')).length),0);await page.close();await pass('reverted receipt claims no lock and requires fresh verification');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.locator('#cancel-review').click();assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);await page.locator('#main-mint-button').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#review-dialog').evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('cancel and Escape close review without a transaction');
 }
 {
  const {page}=await fixture(390,{approved:true});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('ggoo:pending'))throw new DOMException('Quota exceeded','QuotaExceededError');return set.call(this,k,v);};});await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#mint-state-message').textContent.includes('storage'));assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('storage failure blocks wallet submission before any send');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'}});await page.locator('.goo-specimen').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.goo-specimen').complete&&document.querySelector('.goo-specimen').currentSrc.endsWith('renderer-preview-still.svg'));
  const stillA=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-still-t0.png')});await page.waitForTimeout(1400);const stillB=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-still-t1.png')});assert.equal(stillA.equals(stillB),true,'reduced-motion SVG pixels remain static');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('.goo-specimen').complete&&document.querySelector('.goo-specimen').currentSrc.endsWith('/renderer-preview.svg'));await page.waitForTimeout(200);const movingA=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-animated-t0.png')});await page.waitForTimeout(1400);const movingB=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'renderer-animated-t1.png')});assert.equal(movingA.equals(movingB),false,'native animated SVG changes real rendered pixels');await page.close();await pass('native renderer SMIL changes pixels while reduced-motion still fallback remains identical');
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
  const query='?ref=mobile&recipient='+B;const {page}=await fixture(390,{secure:true,startPath:'/ganjaghoulballs/'+query+'#token/1'});await page.waitForFunction(()=>!document.querySelector('#metamask-link').hidden);assert.equal(await page.locator('#metamask-link').getAttribute('href'),'https://metamask.app.link/dapp/midaswhale.wtf/ganjaghoulballs/'+query+'#token/1');await page.locator('.hero-actions .cta').click();await page.waitForFunction(()=>document.querySelector('#metamask-link').href.endsWith('#summon'));assert.equal(new URL(page.url()).search,query);await page.close();await pass('HTTPS mobile-wallet deeplink preserves mounted path, query and current token fragment');
 }
 {
  const {page}=await fixture(390,{approved:true,startPath:'/ganjaghoulballs/?ref=pending'});await connect(page);await select(page);await mintReview(page);await page.evaluate(()=>window.mode='transport');await page.locator('#confirm-review').click();await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));await page.goto(origin+'/?ref=other-mount');await page.waitForFunction(()=>document.querySelector('#transaction-result').textContent.includes('no transaction hash'));assert.equal(await page.locator('#main-mint-button').isDisabled(),true);assert.equal(await page.evaluate(()=>window.sent.length),0);const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ggoo:pending')));assert.deepEqual(keys,['ggoo:pending:8453:'+G]);await page.close();await pass('same-domain root and nested mount share durable pending protection for same chain and collection');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'},reducedMotion:'reduce'});await expectPreviewMode(page,true);assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');assert.match(await page.locator('#motion-note').textContent(),/reduced-motion/);
  await page.getByRole('button',{name:'Play animations',exact:true}).click();await expectPreviewMode(page,false);assert.equal(await page.locator('#motion-toggle').textContent(),'Pause animations');await page.locator('.goo-specimen').scrollIntoViewIfNeeded();const a=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'motion-opt-in-t0.png')});await page.waitForTimeout(1300);const b=await page.locator('.goo-specimen').screenshot({path:path.join(OUT,'motion-opt-in-t1.png')});assert.equal(a.equals(b),false,'explicit reduced-motion opt-in displays actual moving native SVG');
  await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectPreviewMode(page,true);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.screenshot({path:path.join(OUT,'motion-control-mobile-390.png'),fullPage:true});await page.close();await pass('reduced-motion begins still; explicit Play/Pause switches all five native preview sources and real pixels');
 }
 {
  const {page}=await fixture(390,{config:{deploymentStatus:'awaiting-contract-deployment'},reducedMotion:'no-preference'});await expectPreviewMode(page,false);assert.equal(await page.locator('#motion-toggle').textContent(),'Pause animations');await page.getByRole('button',{name:'Pause animations',exact:true}).focus();await page.keyboard.press('Enter');await expectPreviewMode(page,true);assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');await page.keyboard.press('Space');await expectPreviewMode(page,false);await page.emulateMedia({reducedMotion:'reduce'});await expectPreviewMode(page,false);assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('normal motion starts playing; keyboard-accessible Pause/Play and explicit choice survive OS preference change');
 }
 {
  const {page}=await fixture(390,{supply:2,reducedMotion:'reduce'});await page.locator('#gallery-content').scrollIntoViewIfNeeded();await expectChainImageMode(page,'.gallery-art','svgStill');await page.getByRole('button',{name:'Play animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art','svg');await page.locator('#gallery-content a[href="#token/1"]').click();await expectChainImageMode(page,'#token-art','svg');await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art, #token-art','svgStill');assert.equal(await page.locator('#token-ingredients a').count(),13);assert.equal(await page.evaluate(()=>window.sent.length),0);assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='eth_requestAccounts')),false);await page.close();await pass('same control switches onchain gallery and provenance between svg and svgStill without wallet activity');
 }
 {
  const {page,state}=await fixture(390,{supply:2,reducedMotion:'reduce',artDelay:400});await page.locator('#gallery-content').scrollIntoViewIfNeeded();await expectChainImageMode(page,'.gallery-art','svgStill');await page.getByRole('button',{name:'Play animations',exact:true}).click();await page.getByRole('button',{name:'Pause animations',exact:true}).click();await expectChainImageMode(page,'.gallery-art','svgStill');await page.waitForTimeout(550);await expectChainImageMode(page,'.gallery-art','svgStill');assert.equal(await page.locator('#motion-toggle').textContent(),'Play animations');assert.equal(await page.evaluate(()=>window.sent.length),0);await page.close();await pass('late animated RPC responses cannot overwrite a newer Pause choice');
 }
 assert.ok(fs.readFileSync(path.join(ROOT,'site/app.js'),'utf8').includes('ggoo:svg:8453:${lower(cfg.ganjaCollection)}:${cfg.runtimeCodeHashes.ganjaCollection}'),'SVG cache is isolated by Base collection and deployed main code');
 assert.deepEqual(errors,[]);console.log(`PASS ${passed} frontend/mobile scenarios. All wallets, approvals, transfers and RPC writes mocked. No live transaction sent.`);
 fs.writeFileSync(path.join(OUT,'qa-report.json'),JSON.stringify({passed,viewportWidths:[320,360,390,412,768,1440],pageErrors:errors,liveTransactions:0,note:'Mocked EIP-1193 wallet and mocked Base RPC, headless Chromium. No physical mobile wallet was tested.'},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
