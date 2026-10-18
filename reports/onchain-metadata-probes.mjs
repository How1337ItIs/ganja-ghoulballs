// Local-only dependency and immutability checks. No RPC, signing, or real NFTs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {keccak256,toUtf8Bytes} from 'ethers';
import {root,ALICE,BOB,artifact,compileMocks,environment,raw,deploy,call,read,address} from '../test/evm.mjs';

const manifest=JSON.parse(fs.readFileSync(path.join(root,'artifacts/build-manifest.json')));
const compilerSettingsSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'solc-settings.json'))).digest('hex');assert.equal(manifest.compilerSettingsSha256,compilerSettingsSha256,'compiler settings changed since build');
const source=Object.fromEntries(Object.keys(manifest.sourceSha256).map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
for(const [file,text] of Object.entries(source)) assert.equal(createHash('sha256').update(text).digest('hex'),manifest.sourceSha256[file]);
const external=/\b(?:https?|ftp|ipfs|ipns|ar|arweave|file|blob|javascript):|(?:^|[\s"'(])\/\//i;
const allowedTags=new Set(['svg','g','path','rect','circle','ellipse','polygon','polyline','line','title','desc','defs','clipPath','mask','linearGradient','radialGradient','stop','animate','animateTransform','animateMotion','set','use']);
let examinedElements=0,examinedAttributes=0,negativeTests=0,decodedBirthmarks=0;
function inspectSVG(svg,{animated,birth}={}){
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
  if(birth){
    assert.equal(doc.documentElement.getAttribute('data-mint-block'),birth.block.toString(),'root contains exact stored birth block');
    const groups=nodes.filter(n=>n.localName==='g'&&n.getAttribute('opacity')==='.18'&&n.children.length===18&&[...n.children].every(c=>c.localName==='rect'&&c.getAttribute('width')==='2'&&c.getAttribute('height')==='2'));
    assert.equal(groups.length,1,'one complete416-bit visual birthmark');let block=0n,minter=0n;
    [...groups[0].children].forEach((rect,i)=>{assert.equal(Number(rect.getAttribute('x')),24+25*i);assert.equal(Number(rect.getAttribute('y')),455+4*(i%4));const fill=rect.getAttribute('fill');assert(/^#[0-9a-f]{6}$/i.test(fill));const word=BigInt('0x'+fill.slice(1));if(i===10||i===17)assert(word<65536n,'padding bits remain zero');if(i<11)block|=word<<BigInt(24*i);else minter|=word<<BigInt(24*(i-11));});
    assert.equal(block,birth.block,'all256 visual birth-block bits');assert.equal(minter,BigInt(birth.minter),'all160 visual original-minter bits');decodedBirthmarks++;
  }
  const animations=nodes.filter(n=>['animate','animateTransform','animateMotion','set'].includes(n.localName)).length;
  if(animated===true)assert(animations>0,'Expected native SVG animation');
  if(animated===false)assert.equal(animations,0,'Still image contains animation');
  dom.window.close();return {elements:nodes.length,animations};
}
function decodeMetadata(uri,{animated=true}={}){
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
  return {json,svg,...inspectSVG(svg,{animated,birth:{block:BigInt(json.properties.mint_block),minter:json.properties.minted_by}})};
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
assert.deepEqual(writes(main),['approve','mint','rawFulfillRandomWords','safeTransferFrom','safeTransferFrom','setApprovalForAll','transferFrom']);
assert.deepEqual(writes(rendererArt),[]);assert(rendererArt.abi.filter(x=>x.type==='function').every(x=>['view','pure'].includes(x.stateMutability)));
const backdropArt=artifact('GooBackdrop');assert.deepEqual(writes(backdropArt),[]);assert(backdropArt.abi.filter(x=>x.type==='function').every(x=>x.stateMutability==='pure'));assert(/\bimmutable\s+backdrop\b/.test(source['contracts/GooRenderer.sol']));
assert.deepEqual(writes(vault),[]);
for(const text of Object.values(source))assert(!/\b(delegatecall|selfdestruct)\s*\(/.test(text),'Proxy or destruction path');
for(const name of ['originalCollection','graveyard','renderer','deploymentChainId','vrfWrapper','maxRequestPrice']) assert(new RegExp('\\bimmutable\\s+'+name+'\\b').test(source['contracts/GanjaGhoulballs.sol']),`${name} must remain immutable`);

const vm=await environment(), mocks=compileMocks();const original=await deploy(vm,mocks.MockOriginalGhoulballs),wrapper=await deploy(vm,mocks.MockVRFWrapper);const nft=await deploy(vm,main,[original.address,wrapper.address,10n**13n]);
assert((await raw(vm,{to:nft.address,value:10n**17n})).ok);
assert((await call(vm,original,'setApprovalForAll',[nft.address,true])).ok);
const samples=[];let firstURI;let pendingMetadataSamples=0;
for(let tokenId=1;tokenId<=39;tokenId++){
  const ingredientIds=Array.from({length:13},(_,i)=>(tokenId-1)*13+1+i);
  assert((await call(vm,original,'mintRange',[ALICE,ingredientIds[0],13])).ok);
  assert((await call(vm,nft,'mint',[ingredientIds])).ok);
  const pending=decodeMetadata(await read(vm,nft,'tokenURI',[tokenId]),{animated:false});assert.equal(pending.json.properties.revealed,false);assert.equal(pending.json.properties.mint_block,(await read(vm,nft,'mintBlockOf',[tokenId])).toString());assert.equal(pending.json.properties.minted_by.toLowerCase(),ALICE);pendingMetadataSamples++;
  const entropy=tokenId===1?0n:tokenId===2?2n**256n-1n:BigInt(keccak256(toUtf8Bytes('GGOO dependency probe '+tokenId)));
  const requestId=await read(vm,nft,'requestIdOf',[tokenId]);assert((await call(vm,wrapper,'fulfill',[requestId,[entropy]])).ok);
  const seed=(await read(vm,nft,'seedOf',[tokenId])).toString();
  const uri=await read(vm,nft,'tokenURI',[tokenId]);const decoded=decodeMetadata(uri);
  const still=await read(vm,nft,'svgStill',[tokenId]);inspectSVG(still,{animated:false,birth:{block:BigInt(decoded.json.properties.mint_block),minter:decoded.json.properties.minted_by}});
  assert.equal(decoded.json.properties.revealed,true);assert.equal(decoded.json.properties.mint_block,pending.json.properties.mint_block);assert.equal(decoded.json.properties.minted_by,pending.json.properties.minted_by);assert.deepEqual(decoded.json.properties.original_ids,ingredientIds);assert.equal(decoded.json.properties.parent_genes.length,13);
  assert.equal(decoded.json.properties.graveyard.toLowerCase(),(await read(vm,nft,'graveyard')).toLowerCase());
  assert.equal(decoded.json.properties.original_collection.toLowerCase(),original.address);
  if(tokenId===1){firstURI=uri;fs.writeFileSync(path.join(root,'reports/onchain-metadata-sample.json'),JSON.stringify(decoded.json,null,2)+'\n');fs.writeFileSync(path.join(root,'reports/onchain-metadata-sample.svg'),decoded.svg);}
  samples.push({tokenId,seed,entropy:entropy.toString(),requestId:requestId.toString(),metadataKeccak256:keccak256(toUtf8Bytes(uri)),svgKeccak256:keccak256(toUtf8Bytes(decoded.svg)),nativeAnimationElements:decoded.animations});
  console.log(`PASS local token ${tokenId}/39: pending + revealed inline JSON/SVG + still SVG, no external dependencies`);
}
assert((await call(vm,nft,'transferFrom',[ALICE,BOB,1])).ok);assert.equal(await read(vm,nft,'tokenURI',[1]),firstURI,'Revealed metadata changed after transfer');
assert((await call(vm,wrapper,'setMode',[1])).ok);assert((await call(vm,original,'setRecipeFault',[10])).ok);assert.equal(await read(vm,nft,'tokenURI',[1]),firstURI,'Revealed metadata still depends on original recipe service');
await vm.stateManager.putCode(address(original.address),new Uint8Array());await vm.stateManager.putCode(address(wrapper.address),new Uint8Array());assert.equal(await read(vm,nft,'tokenURI',[1]),firstURI,'Revealed metadata must survive total local removal of original and oracle code');
const renderer={address:await read(vm,nft,'renderer'),artifact:rendererArt};let birthVisualEdgeCases=0;
for(let i=0;i<16;i++){
  const block=i===0?0n:i===1?(1n<<256n)-1n:i===2?1n<<255n:BigInt(keccak256(toUtf8Bytes('independent birth block '+i)));
  const minter=i===0?'0x'+'00'.repeat(20):i===1?'0x'+'ff'.repeat(20):'0x'+keccak256(toUtf8Bytes('independent original minter '+i)).slice(-40);
  const birth={block,minter},seed=i%2?0n:(1n<<256n)-1n,genome=(1n<<256n)-1n;
  inspectSVG(await read(vm,renderer,'pendingSvg',[(1n<<256n)-1n,block,minter]),{animated:false,birth});
  for(const animated of [false,true])inspectSVG(await read(vm,renderer,'svg',[seed,genome,(1n<<256n)-1n,block,minter,animated]),{animated,birth});
  birthVisualEdgeCases++;
}
const fixtureRoot=path.join(root,'artifacts/art-v3');const fixtureManifest=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'manifest.json')));assert.equal(fixtureManifest.rendererSourceSha256,manifest.sourceSha256['contracts/GooRenderer.sol'],'renderer fixture evidence is stale');
assert.equal(fixtureManifest.compilerSettingsSha256,compilerSettingsSha256,'fixture compiler settings are stale');
const fixtureEntries=[...fixtureManifest.selected.map(x=>({...x,prefix:'goo'})),...fixtureManifest.lineage.map(x=>({...x,prefix:'lineage'}))];
const artFiles=[];
for(const entry of fixtureEntries)for(const animated of [true,false]){
  const file=`${entry.prefix}-${entry.id}${animated?'':'-still'}.svg`;
  assert(!artFiles.includes(file),'duplicate fixture name');artFiles.push(file);
  const svg=fs.readFileSync(path.join(fixtureRoot,file),'utf8');
  assert.equal(svg,await read(vm,renderer,'svg',[entry.seed,entry.genome,entry.id,entry.mintBlock,entry.minter,animated]),'fixture bytes must match the exact current renderer');
  inspectSVG(svg,{animated});
}
const excludedHistoricalFixtureSVGs=fs.readdirSync(fixtureRoot).filter(f=>f.endsWith('.svg')&&!artFiles.includes(f));
const result={compilerSettingsSha256,timestamp:new Date().toISOString(),status:'passed',scope:'Local in-memory mock mint and decoded data-URI dependency crawl; no live GGOO token or external-checker GGOO score claimed',sourceSha256:manifest.sourceSha256,mintedMetadataSamples:samples.length,pendingMetadataSamples,stillSVGSamples:samples.length,additionalRendererFixtureSVGs:artFiles.length,fixtureFiles:artFiles,excludedHistoricalFixtureSVGs,currentFixtureByteEqualityChecked:true,examinedElements,examinedAttributes,negativeTests,decodedBirthmarks,birthVisualEdgeCases,externalDependenciesFound:0,scriptOrFontDependenciesFound:0,metadataUnchangedAfterTransfer:true,immutableOriginalVaultRendererAndChain:true,rendererAndBackdropNoMutators:true,immutableRendererBackdrop:true,metadataIndependentOfOriginalAfterMint:true,metadataIndependentOfOracleAfterReveal:true,metadataStableAfterLocalSourceAndOracleCodeRemoval:true,noProxyOrDestructionPathInSource:true,samples};
fs.writeFileSync(path.join(root,'reports/onchain-metadata-probes.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:undefined},null,2));
