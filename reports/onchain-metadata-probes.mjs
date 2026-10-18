// Local-only dependency and immutability checks. No RPC, signing, or real NFTs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {keccak256,toUtf8Bytes} from 'ethers';
import {root,ALICE,BOB,artifact,compileMocks,environment,deploy,call,read} from '../test/evm.mjs';

const manifest=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const source=Object.fromEntries(Object.keys(manifest.sourceSha256).map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
for(const [file,text] of Object.entries(source)) assert.equal(createHash('sha256').update(text).digest('hex'),manifest.sourceSha256[file]);
const external=/\b(?:https?|ftp|ipfs|ipns|ar|arweave|file|blob|javascript):|(?:^|[\s"'(])\/\//i;
const allowedTags=new Set(['svg','g','path','rect','circle','ellipse','polygon','polyline','line','title','desc','defs','clipPath','mask','linearGradient','radialGradient','stop','animate','animateTransform','animateMotion','set','use']);
let examinedElements=0,examinedAttributes=0,negativeTests=0;
function inspectSVG(svg,{animated}={}){
  assert(!/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(svg),'External document declarations are forbidden');
  const dom=new JSDOM(svg,{contentType:'image/svg+xml'}); // No scripts or resource loading enabled.
  const doc=dom.window.document, nodes=[...doc.querySelectorAll('*')], ids=new Set(nodes.map(n=>n.getAttribute('id')).filter(Boolean));
  assert.equal(doc.documentElement.localName,'svg');
  for(const node of nodes){
    examinedElements++;
    assert.equal(node.namespaceURI,'http://www.w3.org/2000/svg');
    assert(allowedTags.has(node.localName),`Unsupported or dependency-bearing SVG tag ${node.localName}`);
    for(const attr of node.attributes){
      examinedAttributes++;
      if(attr.name==='xmlns'){assert.equal(attr.value,'http://www.w3.org/2000/svg');continue;}
      if(attr.name==='xmlns:xlink'){assert.equal(attr.value,'http://www.w3.org/1999/xlink');continue;}
      assert(!/^on/i.test(attr.name),'JavaScript event attribute');
      assert(!external.test(attr.value),`External/protocol reference in ${attr.name}`);
      assert(!/@import|@font-face|expression\s*\(/i.test(attr.value),'CSS external/font/script dependency');
      if(['href','xlink:href','src'].includes(attr.name)) assert(attr.value.startsWith('#')&&ids.has(attr.value.slice(1)),'Only resolved in-document references are allowed');
      for(const match of attr.value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) assert(match[1].startsWith('#')&&ids.has(match[1].slice(1)),'Only resolved in-document CSS references are allowed');
    }
  }
  const animations=nodes.filter(n=>['animate','animateTransform','animateMotion','set'].includes(n.localName)).length;
  if(animated===true)assert(animations>0,'Expected native SVG animation');
  if(animated===false)assert.equal(animations,0,'Still image contains animation');
  dom.window.close();return {elements:nodes.length,animations};
}
function decodeMetadata(uri){
  const prefix='data:application/json;base64,';assert(uri.startsWith(prefix),'Metadata must be an inline JSON data URI');
  const json=JSON.parse(Buffer.from(uri.slice(prefix.length),'base64').toString('utf8'));
  assert.equal(typeof json.image,'string');assert(json.image.startsWith('data:image/svg+xml;base64,'),'Image must be inline SVG');
  const walk=(value,key='root')=>{
    if(typeof value==='string'){
      if(key==='image')return;
      assert(!external.test(value),`External dependency in metadata ${key}`);
      assert(!value.startsWith('data:'),`Unexpected extra asset at ${key}`);
    }else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))walk(v,k);
  };walk(json);
  const svg=Buffer.from(json.image.slice('data:image/svg+xml;base64,'.length),'base64').toString('utf8');
  return {json,svg,...inspectSVG(svg,{animated:true})};
}
function mustReject(fn){assert.throws(fn);negativeTests++;}
const bare='<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
for(const body of [
  '<image href="https://example.invalid/a.png"/>','<script>alert(1)</script>','<foreignObject/>',
  '<style>@import "https://example.invalid/a.css";</style>','<style>@font-face{src:url(https://example.invalid/a.woff)}</style>',
  '<rect fill="url(https://example.invalid/a.svg#x)"/>','<use href="https://example.invalid/a.svg#x"/>',
  '<text font-family="sans-serif">A</text>','<rect onclick="alert(1)"/>','<use href="#missing"/>',
])mustReject(()=>inspectSVG(bare.replace('</svg>',body+'</svg>')));
mustReject(()=>inspectSVG('<!DOCTYPE svg SYSTEM "https://example.invalid/a.dtd">'+bare));
mustReject(()=>decodeMetadata('https://example.invalid/1.json'));
for(const extra of [{image:'https://example.invalid/a.svg'},{animation_url:'https://example.invalid/a.html'}])mustReject(()=>decodeMetadata('data:application/json;base64,'+Buffer.from(JSON.stringify({image:'data:image/svg+xml;base64,'+Buffer.from(bare).toString('base64'),...extra})).toString('base64')));

const main=artifact('GanjaGhoulballs'),rendererArt=artifact('GooRenderer'),vault=artifact('GooGraveyard');
const writes=a=>a.abi.filter(x=>x.type==='function'&&!['view','pure'].includes(x.stateMutability)).map(x=>x.name).sort();
assert.deepEqual(writes(main),['approve','mint','safeTransferFrom','safeTransferFrom','setApprovalForAll','transferFrom']);
assert.deepEqual(writes(rendererArt),[]);assert(rendererArt.abi.filter(x=>x.type==='function').every(x=>x.stateMutability==='pure'));
assert.deepEqual(writes(vault),[]);
for(const text of Object.values(source))assert(!/\b(delegatecall|selfdestruct)\s*\(/.test(text),'Proxy or destruction path');
for(const name of ['originalCollection','graveyard','renderer','deploymentChainId']) assert(new RegExp('\\bimmutable\\s+'+name+'\\b').test(source['contracts/GanjaGhoulballs.sol']),`${name} must remain immutable`);

const vm=await environment(), mocks=compileMocks();const original=await deploy(vm,mocks.MockOriginalGhoulballs);const nft=await deploy(vm,main,[original.address]);
assert((await call(vm,original,'setApprovalForAll',[nft.address,true])).ok);
const gas=JSON.parse(fs.readFileSync(path.join(root,'artifacts/gas-profile.json')));assert.deepEqual(gas.sourceSha256,manifest.sourceSha256);
const samples=[];let firstURI;
for(const entry of gas.details){
  for(const id of entry.ingredientIds)assert((await call(vm,original,'mintRange',[ALICE,id,1])).ok);
  assert((await call(vm,nft,'mint',[entry.ingredientIds])).ok);
  assert.equal((await read(vm,nft,'seedOf',[entry.tokenId])).toString(),entry.seed);
  const uri=await read(vm,nft,'tokenURI',[entry.tokenId]);const decoded=decodeMetadata(uri);
  const still=await read(vm,nft,'svgStill',[entry.tokenId]);inspectSVG(still,{animated:false});
  assert.deepEqual(decoded.json.properties.original_ids,entry.ingredientIds);
  assert.equal(decoded.json.properties.graveyard.toLowerCase(),(await read(vm,nft,'graveyard')).toLowerCase());
  assert.equal(decoded.json.properties.original_collection.toLowerCase(),original.address);
  if(entry.tokenId===1){firstURI=uri;fs.writeFileSync(path.join(root,'reports/onchain-metadata-sample.json'),JSON.stringify(decoded.json,null,2)+'\n');fs.writeFileSync(path.join(root,'reports/onchain-metadata-sample.svg'),decoded.svg);}
  samples.push({tokenId:entry.tokenId,seed:entry.seed,target:entry.target,metadataKeccak256:keccak256(toUtf8Bytes(uri)),svgKeccak256:keccak256(toUtf8Bytes(decoded.svg)),nativeAnimationElements:decoded.animations});
  console.log(`PASS local token ${entry.tokenId}/${gas.details.length}: inline JSON + animated SVG + still SVG, no external dependencies`);
}
assert((await call(vm,nft,'transferFrom',[ALICE,BOB,1])).ok);assert.equal(await read(vm,nft,'tokenURI',[1]),firstURI,'Metadata changed after transfer');
const artFiles=fs.readdirSync(path.join(root,'artifacts/art')).filter(f=>f.endsWith('.svg'));
for(const file of artFiles)inspectSVG(fs.readFileSync(path.join(root,'artifacts/art',file),'utf8'),{animated:!file.includes('-still')});
const result={timestamp:new Date().toISOString(),status:'passed',scope:'Local in-memory mock mint and decoded data-URI dependency crawl; no live GGOO token or external-checker GGOO score claimed',sourceSha256:manifest.sourceSha256,mintedMetadataSamples:samples.length,stillSVGSamples:samples.length,additionalRendererFixtureSVGs:artFiles.length,examinedElements,examinedAttributes,negativeTests,externalDependenciesFound:0,scriptOrFontDependenciesFound:0,metadataUnchangedAfterTransfer:true,immutableOriginalVaultRendererAndChain:true,rendererFunctionsAllPure:true,noProxyOrDestructionPathInSource:true,samples};
fs.writeFileSync(path.join(root,'reports/onchain-metadata-probes.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:undefined},null,2));
