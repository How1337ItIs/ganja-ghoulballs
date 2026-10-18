import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {AbiCoder,keccak256,toUtf8Bytes} from 'ethers';
import {environment,artifact,deploy,call,read,root} from './evm.mjs';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'artifacts/art/manifest.json')));
const sourceHash=createHash('sha256').update(fs.readFileSync(path.join(root,'contracts/GooRenderer.sol'))).digest('hex');
const art=artifact('GooRenderer');
assert((art.deployedBytecode.length-2)/2<24576,'EIP-170 size');
const vm=await environment();const renderer=await deploy(vm,art);
const window=new JSDOM('').window;const parser=new window.DOMParser();const serializer=new window.XMLSerializer();
const images=new Set();let maxGas=0n,maxSvgBytes=0,animations=0;
function parse(svg){
 const doc=parser.parseFromString(svg,'image/svg+xml');
 assert.equal(doc.querySelector('parsererror'),null,'SVG XML parses');
 assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 512 512');
 assert.equal(doc.querySelectorAll('script,image,foreignObject,text,style').length,0,'Native geometry only');
 for(const n of doc.querySelectorAll('*'))for(const a of n.attributes){
  assert(!/^on|href$/i.test(a.name),'No event handlers or external resource references');
  assert(!/url\(|javascript:|data:/i.test(a.value),'No embedded resource URLs');
 }
 for(const n of doc.querySelectorAll('animate,animateTransform')){
  assert.equal(n.getAttribute('repeatCount'),'indefinite');
  assert(['opacity','transform'].includes(n.getAttribute('attributeName')));
  assert(/^(?:[3-9]|10|11)s$/.test(n.getAttribute('dur')),'Restrained 3-11 second cycles');
  const values=n.getAttribute('values').split(';');assert.equal(values[0],values.at(-1),'Seamless cycle endpoints');
 }
 return doc;
}
for(const sample of fixture.syntheticRecipes){
 const seed=BigInt(sample.seed);const result=await call(vm,renderer,'svg',[seed,sample.id,true],{isStatic:true});
 assert(result.ok,result.error);const animated=result.value[0];
 const still=await read(vm,renderer,'svg',[seed,sample.id,false]);
 const a=parse(animated),b=parse(still);const moving=[...a.querySelectorAll('animate,animateTransform')];
 assert(moving.length>0);assert.equal(b.querySelectorAll('animate,animateTransform').length,0);
 animations+=moving.length;moving.forEach(n=>n.remove());
 assert.equal(serializer.serializeToString(a),serializer.serializeToString(b),'Static fallback matches native geometry with animation nodes removed');
 const raster=await sharp(Buffer.from(still)).resize(64,64).raw().toBuffer({resolveWithObject:true});
 assert.equal(raster.info.width,64);assert.equal(raster.info.height,64);
 assert(raster.data.some(v=>v>100),'Visible pixels at thumbnail size');
 assert.equal(Number(await read(vm,renderer,'ballCount',[seed])),sample.traits['Ball Count']);
 const traits=JSON.parse(await read(vm,renderer,'attributes',[seed]));
 assert.deepEqual(Object.fromEntries(traits.map(t=>[t.trait_type,t.value])),sample.traits);
 // Remove token-number title and footer before evaluating art uniqueness.
 const artwork=still.replace(/<title>.*?<\/title>/,'').split('<g fill="#a0a381"')[0];
 const hash=createHash('sha256').update(artwork).digest('hex');assert(!images.has(hash),'Distinct recipe artwork');images.add(hash);
 maxGas=result.gas>maxGas?result.gas:maxGas;maxSvgBytes=Math.max(maxSvgBytes,Buffer.byteLength(animated));
 if(sample.id%42===0)console.log(`Validated ${sample.id}/420 compiled animated + static SVGs`);
}
// Expand recipe-space coverage beyond one full 420-token synthetic collection.
// Sorted unique original IDs are sampled deterministically from the entire 6,667 range.
const abi=AbiCoder.defaultAbiCoder();
for(let i=0;i<580;i++){
 const ids=new Set();let nonce=0;
 while(ids.size<13)ids.add(Number(BigInt(keccak256(toUtf8Bytes(`GGOO_ART_QA_RANDOM_${i}_${nonce++}`)))%6667n)+1);
 const ingredients=[...ids].sort((a,b)=>a-b);assert.equal(ingredients.length,13);
 const packed=ingredients.reduce((a,id,j)=>a|(BigInt(id)<<BigInt(j*16)),0n);
 const tokenId=i%420+1;
 const seed=BigInt(keccak256(abi.encode(['string','uint256','address','uint256','uint256'],[fixture.domain,8453,fixture.hypotheticalCollection,tokenId,packed])));
 const result=await call(vm,renderer,'svg',[seed,tokenId,true],{isStatic:true});assert(result.ok,result.error);
 const animated=result.value[0];assert.equal(await read(vm,renderer,'svg',[seed,tokenId,true]),animated,'Random recipe renderer determinism');
 const still=await read(vm,renderer,'svg',[seed,tokenId,false]);const a=parse(animated),b=parse(still);
 const moving=[...a.querySelectorAll('animate,animateTransform')];assert(moving.length>0);animations+=moving.length;
 assert.equal(b.querySelectorAll('animate,animateTransform').length,0);moving.forEach(n=>n.remove());
 assert.equal(serializer.serializeToString(a),serializer.serializeToString(b),'Random recipe static equivalence');
 const traits=await read(vm,renderer,'attributes',[seed]);assert.equal(await read(vm,renderer,'attributes',[seed]),traits,'Random recipe trait determinism');
 const t=Object.fromEntries(JSON.parse(traits).map(x=>[x.trait_type,x.value]));
 assert.equal(Number(await read(vm,renderer,'ballCount',[seed])),t['Ball Count']);
 const artwork=still.replace(/<title>.*?<\/title>/,'').split('<g fill="#a0a381"')[0];
 const hash=createHash('sha256').update(artwork).digest('hex');assert(!images.has(hash),'Distinct random recipe artwork');images.add(hash);
 maxGas=result.gas>maxGas?result.gas:maxGas;maxSvgBytes=Math.max(maxSvgBytes,Buffer.byteLength(animated));
 if((i+1)%58===0)console.log(`Validated ${420+i+1}/1000 recipe-space samples`);
}
for(const seed of [0n,1n,(1n<<256n)-1n]){
 const one=await read(vm,renderer,'svg',[seed,420,true]);const two=await read(vm,renderer,'svg',[seed,420,true]);
 assert.equal(one,two,'Renderer deterministic');parse(one);
}
assert(maxGas<2_000_000n,'Renderer SVG gas budget');
const report={passed:true,rendererSourceSha256:sourceHash,rendererRuntimeBytes:(art.deployedBytecode.length-2)/2,recipes:1000,canonicalFullCollectionRecipes:420,additionalRandomRecipes:580,uniqueArtImages:images.size,animatedAndStaticPairs:1000,thumbnailRasters:420,animationElementsValidated:animations,maxSvgGas:Number(maxGas),maxSvgBytes,edgeSeeds:3,notes:['Synthetic predeployment recipes, not live NFT rarity.','Animation syntax, seamless endpoints and static equivalence checked. Browser animation playback is a separate visual QA.']};
fs.writeFileSync(path.join(root,'artifacts/art-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));window.close();
