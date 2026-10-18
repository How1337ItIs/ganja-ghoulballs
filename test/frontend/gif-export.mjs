import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';

// Exercise the actual browser exporter and decode the resulting GIF. No RPC,
// wallet, rendering service, or network dependency is used by this harness.
const ROOT=path.resolve(import.meta.dirname,'../..');
const OUT=path.join(ROOT,'artifacts/frontend/gif-export');
fs.mkdirSync(OUT,{recursive:true});
const sample=fs.readFileSync(path.join(ROOT,'reports/onchain-metadata-sample.svg'),'utf8');
const sampleHash=createHash('sha256').update(sample).digest('hex');
const live=fs.readFileSync(path.join(ROOT,'test/frontend/fixtures/ggoo-live-token-1.svg'),'utf8');
const liveProvenance=JSON.parse(fs.readFileSync(path.join(ROOT,'test/frontend/fixtures/ggoo-live-token-1.json'),'utf8'));
assert.equal(createHash('sha256').update(live).digest('hex'),liveProvenance.svgSha256);
assert.equal(liveProvenance.chainId,8453);assert.equal(liveProvenance.revealed,true);
const candidates=[process.env.CHROMIUM_PATH,
  '/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  ...(process.platform==='win32'?[1243,1200,1194].map(v=>path.join(process.env.LOCALAPPDATA||'','ms-playwright',`chromium_headless_shell-${v}`,'chrome-headless-shell-win64','chrome-headless-shell.exe')):[]),
].filter(Boolean);
const executablePath=candidates.find(file=>fs.existsSync(file));
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/gif-harness'){
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}#native,#static{width:256px;height:256px;display:inline-block;vertical-align:top}#native svg,#static img{display:block;width:256px;height:256px}</style></head><body><div id="native"></div><div id="static"></div></body></html>');
    return;
  }
  const file=path.resolve(ROOT,'site','.'+pathname);
  if(!file.startsWith(path.join(ROOT,'site')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404);res.end();return;
  }
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/plain');
  res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:600,height:300}});
const unexpectedRequests=[],pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith(origin)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))unexpectedRequests.push(request.url());});
const checks=[],comparisons=[],liveNativeFrames=new Map();
async function pass(name){checks.push(name);console.log('PASS',name);}
async function compareFrame(svg,time,label,{maxMean=1.2,maxChangedFraction=.035,tokenId=1}={}){
  const frame=await page.evaluate(async({svg,time,tokenId})=>{
    const animation=window.gifModule.prepareSvgAnimation(svg,{tokenId,revealed:true});
    const frame=animation.frameAt(time);animation.dispose();
    const host=document.querySelector('#native');host.innerHTML=svg;
    const native=host.querySelector('svg');native.pauseAnimations();native.setCurrentTime(time);
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(frame);
    document.querySelector('#static').replaceChildren(image);await image.decode();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return frame;
  },{svg,time,tokenId});
  assert.doesNotMatch(frame,/<(?:animate|animateTransform|animateMotion|set)\b/i,'exported frame must be static');
  const left=await page.locator('#native').screenshot(),right=await page.locator('#static').screenshot();
  if(label==='live-token-1')liveNativeFrames.set(Math.round(time*10),left);
  const a=await sharp(left).removeAlpha().raw().toBuffer(),b=await sharp(right).removeAlpha().raw().toBuffer();
  assert.equal(a.length,b.length);
  let absolute=0,changed=0;
  for(let i=0;i<a.length;i+=3){let delta=0;for(let c=0;c<3;c++)delta+=Math.abs(a[i+c]-b[i+c]);absolute+=delta;if(delta>48)changed++;}
  const mean=absolute/a.length,changedFraction=changed/(a.length/3);
  const item={label,time,mean,changedFraction};comparisons.push(item);
  if(mean>maxMean||changedFraction>maxChangedFraction){
    fs.writeFileSync(path.join(OUT,`${label}-${time}-native.png`),left);
    fs.writeFileSync(path.join(OUT,`${label}-${time}-export.png`),right);
  }
  assert.ok(mean<=maxMean&&changedFraction<=maxChangedFraction,`${label} at ${time}s diverges from native SVG: mean=${mean.toFixed(4)}, changed=${changedFraction.toFixed(5)}`);
  return frame;
}

try{
  await page.goto(origin+'/gif-harness');
  await page.evaluate(async()=>{window.gifModule=await import('/gif-export.js');});
  const fixtures=await page.evaluate(svg=>{
    const source=new DOMParser().parseFromString(svg,'image/svg+xml');
    const marker='<g><animateMotion path="M0 0L1 1L0 0" dur="1s" repeatCount="indefinite"/></g>';
    const outer=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Ganja Ghoulballs #1</title><rect width="512" height="512" fill="#0b1012"/>${body}${marker}</svg>`;
    const serialize=node=>new XMLSerializer().serializeToString(node).replaceAll(' xmlns="http://www.w3.org/2000/svg"','');
    const first=selector=>serialize(source.querySelector(selector));
    const shape='<path d="M12 10h24v6h12v10H34v20H12z" fill="#dc593d"/>';
    const wrap=animation=>outer(`<g transform="translate(100 100) scale(5)"><g>${shape}${animation}</g></g>`);
    const smoke=source.querySelector('g[stroke="#c6d5b4"]');
    return {
      opacity:wrap(first('animate[keyTimes]')),
      rotate:wrap(first('animateTransform[type="rotate"]')),
      scale:wrap(first('animateTransform[type="scale"]')),
      translate:wrap(first('animateTransform[type="translate"]')),
      motion:wrap(first('animateMotion')),
      smoke:outer(`<g transform="translate(250 320) scale(9)" fill="none" stroke="#c6d5b4" stroke-width="1.2">${[...smoke.children].map(serialize).join('')}</g>`),
    };
  },sample);
  // These timestamps cover exact blink keyTimes, interpolation, both sides of
  // the negative begin offset, two figure-eight lobes and the repeat boundary.
  for(const [name,times] of Object.entries({opacity:[0,1.92,2.07,2.22,2.37,2.52],rotate:[0,1.3,3.9,7],scale:[0,.5,1,2.5],translate:[0,.5,1,2.5],motion:[0,.6,1.5,3,4.5],smoke:[0,.5,1,2,3]})){
    for(const time of times)await compareFrame(fixtures[name],time,name);
    await pass(`${name}: source-derived animation matches native browser timing`);
  }
  for(const time of [0,.7,1.92,2.22,3.3,5.9])await compareFrame(sample,time,'renderer-fixture');
  await pass('renderer validation SVG: combined smoke, spin, figure eight, blink and body motion match native frames');
  for(const time of [0,.7,1.9,2.2,3.3,5.9])await compareFrame(live,time,'live-token-1');
  await pass('pinned public Base token #1 SVG matches native frames; saved source hash matches read-only provenance');
  for(const name of fs.readdirSync(path.join(ROOT,'site/lab/assets')).filter(name=>/^goo-\d+\.svg$/.test(name))){
    const svg=fs.readFileSync(path.join(ROOT,'site/lab/assets',name),'utf8'),tokenId=Number(name.match(/\d+/)[0]);
    for(const time of [.3,2.3])await compareFrame(svg,time,name.replace('.svg',''),{tokenId});
  }
  await pass('all 16 checked-in animated art samples preserve native timing across one to six figures');
  const bounds=await page.evaluate(svg=>{
    const animation=window.gifModule.prepareSvgAnimation(svg,{tokenId:1,revealed:true});
    const count=animation.animationCount;
    animation.dispose();return count;
  },sample);
  assert.ok(bounds>=30,'real artwork should expose all animation layers');

  const safety=await page.evaluate(({svg})=>{
    const harmless='<g><rect width="10" height="10"/><animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite"/><animateMotion path="M0 0L1 1L0 0" dur="1s" repeatCount="indefinite"/></g>';
    const base=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Ganja Ghoulballs #1</title>${body}</svg>`;
    const cases={
      script:base(harmless+'<script>alert(1)</script>'),
      event:base(harmless+'<rect onload="alert(1)"/>'),
      image:base(harmless+'<image href="https://example.invalid/pixel.png"/>'),
      use:base(harmless+'<use href="https://example.invalid/a.svg#art"/>'),
      foreignObject:base(harmless+'<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">text</div></foreignObject>'),
      style:base(harmless+'<style>@import "https://example.invalid/a.css";</style>'),
      inlineStyle:base(harmless+'<rect style="fill:url(https://example.invalid/a.svg#x)"/>'),
      urlPaint:base(harmless+'<rect fill="url(https://example.invalid/a.svg#x)"/>'),
      malformed:'<svg><g></svg>',
      static:base('<rect width="10" height="10"/>'),
      oversized:base(harmless+' '.repeat(3*1024*1024)),
      doctype:'<!DOCTYPE svg [<!ENTITY x SYSTEM "https://example.invalid/x">]>'+base(harmless),
      unknownAnimation:base('<g><animate attributeName="href" values="https://example.invalid/a;https://example.invalid/b" dur="1s" repeatCount="indefinite"/></g>'),
    };
    const results={};
    for(const [name,input] of Object.entries(cases)){
      try{const result=window.gifModule.prepareSvgAnimation(input,{tokenId:1,revealed:true});result.dispose();results[name]=false;}
      catch(error){results[name]=Boolean(error.message);}
    }
    for(const [name,options] of Object.entries({pending:{tokenId:1,revealed:false},zero:{tokenId:0,revealed:true},fraction:{tokenId:1.5,revealed:true},aboveCap:{tokenId:421,revealed:true},missingReveal:{tokenId:1}})){
      try{const result=window.gifModule.prepareSvgAnimation(svg,options);result.dispose();results[name]=false;}catch(error){results[name]=Boolean(error.message);}
    }
    return results;
  },{svg:sample});
  for(const [name,rejected] of Object.entries(safety))assert.equal(rejected,true,`${name} must be rejected before rendering`);
  await pass('unsafe, external, malformed, static, oversized and unrevealed inputs fail before rendering');

  const share=await page.evaluate(()=>{
    const cases=['https://midaswhale.wtf/ganjaghoulballs/?secret=not-shared#old','https://ganja-ghoulballs.vercel.app/?secret=not-shared#old'];
    return cases.map(pageUrl=>window.gifModule.buildTokenShareUrl({tokenId:13,pageUrl}));
  });
  for(const [index,actual] of share.entries()){
    const url=new URL(actual);assert.equal(url.origin,'https://x.com');assert.match(url.pathname,/^\/intent\/(?:post|tweet)$/);
    assert.equal(url.searchParams.get('url'),index===0?'https://midaswhale.wtf/ganjaghoulballs/#token/13':'https://ganja-ghoulballs.vercel.app/#token/13');
    assert.match(url.searchParams.get('text'),/13/);assert.doesNotMatch(actual,/secret|not-shared/);
  }
  await pass('X compose intent preserves nested-path and fallback token deep links without private query data');

  const cancelled=await page.evaluate(async svg=>{
    const controller=new AbortController();controller.abort();
    try{await window.gifModule.createTokenGif({svg,tokenId:1,revealed:true,signal:controller.signal});return false;}
    catch(error){return error.name==='AbortError'||/cancel|abort/i.test(error.message);}
  },sample);
  assert.equal(cancelled,true,'a cancelled export must not produce a download');
  await pass('pre-cancelled export stops without a file');

  const interrupted=await page.evaluate(async svg=>{
    const controller=new AbortController(),progress=[];let concurrent;
    try{
      await window.gifModule.createTokenGif({svg,tokenId:1,revealed:true,signal:controller.signal,onProgress:value=>{
        progress.push(value.completed);
        if(value.completed===0)concurrent=window.gifModule.createTokenGif({svg,tokenId:1,revealed:true}).then(()=>false,error=>/already running/i.test(error.message));
        if(value.completed===3)controller.abort();
      }});
      return {cancelled:false};
    }catch(error){return {cancelled:error.name==='AbortError',concurrentBlocked:await concurrent,progress};}
  },sample);
  assert.deepEqual(interrupted,{cancelled:true,concurrentBlocked:true,progress:[0,1,2,3]});
  await pass('in-flight cancellation stops at the next frame and concurrent exports are blocked');

  const downloadPromise=page.waitForEvent('download');
  const exported=await page.evaluate(async svg=>{
    const progress=[];
    const result=await window.gifModule.downloadTokenGif({svg,tokenId:1,revealed:true,onProgress:value=>progress.push(value)});
    return {bytes:Array.from(new Uint8Array(await result.blob.arrayBuffer())),filename:result.filename,frameCount:result.frameCount,durationMs:result.durationMs,type:result.blob.type,progress};
  },live);
  const gif=Buffer.from(exported.bytes);delete exported.bytes;
  assert.equal(gif.subarray(0,6).toString(),'GIF89a');assert.equal(exported.type,'image/gif');
  assert.match(exported.filename,/1.*\.gif$/);assert.equal(exported.frameCount,60);assert.equal(exported.durationMs,6000);
  assert.ok(gif.length>1000&&gif.length<12*1024*1024,'GIF is bounded and contains real image data');
  assert.ok(exported.progress.length>=2,'export emits progress as it renders');
  assert.deepEqual(exported.progress.map(value=>value.completed),Array.from({length:61},(_,i)=>i));
  assert.ok(exported.progress.every(value=>value.total===60&&value.percent>=0&&value.percent<=100));
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),exported.filename);
  await download.saveAs(path.join(OUT,'live-token-1.gif'));
  assert.ok(fs.readFileSync(path.join(OUT,'live-token-1.gif')).equals(gif),'the browser download must contain the encoded animated GIF');
  const decoded=await sharp(gif,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const metadata=await sharp(gif,{animated:true}).metadata();
  assert.equal(metadata.pages,60);assert.equal(metadata.width,256);assert.equal(metadata.pageHeight,256);assert.equal(metadata.loop,0);
  assert.deepEqual(metadata.delay,Array(60).fill(100));
  const frameBytes=256*256*4,hashes=[];
  for(let i=0;i<60;i++)hashes.push(createHash('sha256').update(decoded.data.subarray(i*frameBytes,(i+1)*frameBytes)).digest('hex'));
  assert.ok(new Set(hashes).size>=55,'decoded frames must preserve motion rather than repeat a still');
  const samples=[0,7,19,22,33,59];
  const decodedComparisons=[];
  for(const frame of samples){
    const native=await sharp(liveNativeFrames.get(frame)).ensureAlpha().raw().toBuffer();
    const actual=decoded.data.subarray(frame*frameBytes,(frame+1)*frameBytes);
    let delta=0;for(let i=0;i<actual.length;i++)delta+=Math.abs(native[i]-actual[i]);
    const mean=delta/actual.length;
    assert.ok(mean<2.5,`decoded GIF frame ${frame} must depict the actual native art, mean delta ${mean}`);
    decodedComparisons.push({frame,time:frame/10,meanRgbaChannelDelta:mean});
  }
  await sharp({create:{width:256*3,height:256*2,channels:4,background:'#0b1012'}}).composite(samples.map((frame,index)=>({input:decoded.data.subarray(frame*frameBytes,(frame+1)*frameBytes),raw:{width:256,height:256,channels:4},left:(index%3)*256,top:Math.floor(index/3)*256}))).png().toFile(path.join(OUT,'live-token-1-contact.png'));
  await pass('browser download decodes to 60 distinct 256px GIF89a frames, 100ms delay and infinite restart');
  assert.deepEqual(unexpectedRequests,[],'export must never fetch external resources');
  assert.deepEqual(pageErrors,[]);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT,'reports/onchain-metadata-sample.svg'))).digest('hex'),sampleHash,'onchain source stays byte-identical');
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({checks,provenance:{rendererFixture:{path:'reports/onchain-metadata-sample.svg',description:'Checked-in contract-renderer validation fixture with synthetic genome; not a live token read.',sha256:sampleHash},liveToken:liveProvenance},comparisonLimits:{maxMeanRgbChannelDelta:1.2,maxChangedPixelFraction:.035,changedPixelThresholdSumRgb:48,maxDecodedGifMeanRgbaDelta:2.5},comparisons,decodedComparisons,export:{...exported,bytes:gif.length,uniqueFrames:new Set(hashes).size},safety,unexpectedRequests},null,2)+'\n');
  console.log(`${checks.length} GIF export checks passed. Evidence: ${OUT}`);
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
