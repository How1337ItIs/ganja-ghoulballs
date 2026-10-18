import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {Interface} from 'ethers';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Keep XML validation bounded when run alongside compiler/security suites.
if(!global.gc){const child=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=512',fileURLToPath(import.meta.url)],{stdio:'inherit',env:process.env});process.exit(child.status??1);}
import {environment,deploy,call,read,root} from './evm.mjs';
import {fixture,packGenome,MOTIONS,THEMES} from './art-fixtures.mjs';
import {verifyRendererArtifact} from './renderer-artifact.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');
const artifactPath=process.env.RENDERER_ARTIFACT||path.join(root,'artifacts/GooRenderer.json');
const art=JSON.parse(fs.readFileSync(artifactPath));art.iface=new Interface(art.abi);
const provenance=verifyRendererArtifact(art);
assert((art.deployedBytecode.length-2)/2<=24576,'EIP-170 renderer size');
const vm=await environment(),renderer=await deploy(vm,art);
let window=new JSDOM('').window,parser=new window.DOMParser(),serializer=new window.XMLSerializer();
let maxGas=0n,maxSvgBytes=0,animations=0,rotations=0,pathMorphs=0,motionPaths=0;const images=new Set();
function parse(svg){
 const d=parser.parseFromString(svg,'image/svg+xml');assert.equal(d.querySelector('parsererror'),null,'SVG XML parses');
 assert.equal(d.documentElement.getAttribute('viewBox'),'0 0 512 512');
 assert.equal(d.querySelectorAll('script,image,foreignObject,text,style').length,0,'Native geometry only');
 for(const n of d.querySelectorAll('*'))for(const a of n.attributes){assert(!/^on|href$/i.test(a.name));assert(!/url\(|javascript:|data:/i.test(a.value));}
 for(const n of d.querySelectorAll('animate,animateTransform,animateMotion')){
  assert.equal(n.getAttribute('repeatCount'),'indefinite');
  assert(/^(?:[3-9]|10|11)s$/.test(n.getAttribute('dur')),'Restrained native cycle length');
  if(n.hasAttribute('begin')){const begin=Number(n.getAttribute('begin').replace('s',''));assert(begin<=0&&Math.abs(begin)<Number(n.getAttribute('dur').replace('s','')),'Inherited phase bounded to cycle');}
  if(n.tagName==='animateMotion'){assert(/^M/.test(n.getAttribute('path')));assert(!n.hasAttribute('rotate'),'Attached body spin is separately nested');motionPaths++;continue;}
  assert(['opacity','transform','d'].includes(n.getAttribute('attributeName')));
  const values=n.getAttribute('values').split(';');
  if(n.getAttribute('type')==='rotate'){
   const a=values[0].split(' ').map(Number),b=values.at(-1).split(' ').map(Number);
   assert.equal(Math.abs((b[0]-a[0])%360),0,'Rotation endpoints coincide modulo360 degrees');assert.deepEqual(a.slice(1),b.slice(1));rotations++;
  }else assert.equal(values[0],values.at(-1),'Seamless cycle endpoints');
  if(n.getAttribute('attributeName')==='d'){
   const commands=values[0].match(/[a-z]/ig).join('');const numbers=values[0].match(/[-+]?(?:\d*\.)?\d+/g).length;
   for(const value of values){assert.equal(value.match(/[a-z]/ig).join(''),commands,'Morph command topology');assert.equal(value.match(/[-+]?(?:\d*\.)?\d+/g).length,numbers,'Morph parameter count');}pathMorphs++;
  }
 }
 return d;
}
const motionPathsExpected=['M-12-6 12-10-8 10-12-6','M12 0a12 9 0 1 1-24 0a12 9 0 1 1 24 0','M0 0 0-6 0 0','M0 0C8-11 18-11 18 0S8 11 0 0-18-11-18 0-8 11 0 0'];
const hex=n=>'#'+n.toString(16).padStart(6,'0');
for(let i=0;i<1000;i++){
 const s=fixture(i),seed=BigInt(s.seed),genome=BigInt(s.genome),tokenId=i%420+1;
 const result=await call(vm,renderer,'svg',[seed,genome,tokenId,s.mintBlock,s.minter,true],{isStatic:true});assert(result.ok,result.error);const animated=result.value[0];
 const still=await read(vm,renderer,'svg',[seed,genome,tokenId,s.mintBlock,s.minter,false]);const a=parse(animated),b=parse(still);assert.equal(a.documentElement.getAttribute('data-mint-block'),s.mintBlock);
 assert.equal(a.querySelectorAll('animateMotion').length,s.genes.count);for(const n of a.querySelectorAll('animateMotion'))assert.equal(n.getAttribute('path'),motionPathsExpected[s.genes.motion],'Inherited motion has the correct actual travel geometry');
 const moving=[...a.querySelectorAll('animate,animateTransform,animateMotion')];assert(moving.length>0);animations+=moving.length;moving.forEach(n=>n.remove());
 assert.equal(b.querySelectorAll('animate,animateTransform,animateMotion').length,0);assert.equal(serializer.serializeToString(a),serializer.serializeToString(b),'Static renderer equals native geometry without animation elements');
 const attrs=await read(vm,renderer,'attributes',[seed,genome]);const t=Object.fromEntries(JSON.parse(attrs).map(x=>[x.trait_type,x.value]));
 assert(!Object.keys(t).some(name=>/version/i.test(name)),'No marketplace version marketing');assert(!attrs.includes('GANJA_GHOULBALLS_INHERITED_GOO_V3'));
 assert.equal(t['Ball Count'],s.genes.count);assert.equal(t['Body Radius'],s.genes.radius);assert.equal(t.Motion,MOTIONS[s.genes.motion]);assert.equal(t['Inherited Theme'],THEMES[s.genes.theme]);
 assert.equal(t['Body Colour'],hex(s.genes.body));assert.equal(t['Accent Colour'],hex(s.genes.accent));assert.equal(t['Sky Colour'],hex(s.genes.sky));
 for(const color of [t['Body Colour'],t['Accent Colour'],t['Sky Colour']])assert(still.includes(`fill="${color}"`),'Stored inherited colour is actually drawn');
 assert.equal(Number(await read(vm,renderer,'ballCount',[genome])),s.genes.count);
 assert.equal(b.querySelectorAll('[transform^="translate(32 32) scale("]').length,s.genes.count,'Drawn body count agrees with inherited count');
 if(i<420){const raster=await sharp(Buffer.from(still)).resize(64,64).raw().toBuffer({resolveWithObject:true});assert.equal(raster.info.width,64);assert(raster.data.some(v=>v>100));}
 if(i%25===0){assert.equal(await read(vm,renderer,'svg',[seed,genome,tokenId,s.mintBlock,s.minter,true]),animated,'Deterministic revealed art');assert.equal(await read(vm,renderer,'attributes',[seed,genome]),attrs);}
 const artwork=still.replace(/<title>.*?<\/title>/,'').split('<g fill="#a0a381"')[0],hash=createHash('sha256').update(artwork).digest('hex');assert(!images.has(hash),'Distinct synthetic artwork');images.add(hash);
 maxGas=result.gas>maxGas?result.gas:maxGas;maxSvgBytes=Math.max(maxSvgBytes,Buffer.byteLength(animated));if((i+1)%100===0)console.log(`Validated ${i+1}/1000 inherited renderer genomes`);
 if((i+1)%25===0){window.close();window=new JSDOM('').window;parser=new window.DOMParser();serializer=new window.XMLSerializer();global.gc();}
}
// Same reveal seed, changed inherited gene: phenotype must respond instead of ignoring DNA.
const base=fixture(101),variants=[];
for(const motion of [0,1,2,3])variants.push(await read(vm,renderer,'svg',[base.seed,packGenome({...base.genes,motion}),1,base.mintBlock,base.minter,true]));
assert.equal(new Set(variants).size,4,'Four genuinely distinct inherited motion outputs');
for(const [gene,value] of [['body',0x1199aa],['accent',0xef7733],['sky',0x101a21],['radius',5],['count',6],['scene',0],['xPhase',0],['yPhase',0]]){
 const g={...base.genes,[gene]:value};if(g[gene]===base.genes[gene])g[gene]=gene==='radius'?10:gene==='count'?1:gene==='scene'?5:1;
 assert.notEqual(await read(vm,renderer,'svg',[base.seed,packGenome(g),1,base.mintBlock,base.minter,true]),await read(vm,renderer,'svg',[base.seed,base.genome,1,base.mintBlock,base.minter,true]),`Phenotype uses ${gene}`);
}
for(const seed of [0n,1n,(1n<<256n)-1n])for(const genome of [0n,(1n<<256n)-1n]){const svg=await read(vm,renderer,'svg',[seed,genome,420,(1n<<256n)-1n,'0xffffffffffffffffffffffffffffffffffffffff',true]);parse(svg);assert.equal(svg,await read(vm,renderer,'svg',[seed,genome,420,(1n<<256n)-1n,'0xffffffffffffffffffffffffffffffffffffffff',true]));}
const pending=await read(vm,renderer,'pendingSvg',[1,52753172,'0x1111111111111111111111111111111111111111']);parse(pending);assert(pending.includes('Sealed Recipe'));assert(!pending.includes('Body Colour'));assert.equal(parse(pending).querySelectorAll('animate,animateTransform,animateMotion').length,0);
assert(maxGas<3_000_000n,'Renderer SVG call gas budget');
const report={passed:true,...provenance,rendererRuntimeBytes:(art.deployedBytecode.length-2)/2,genomes:1000,uniqueArtImages:images.size,animatedAndStaticPairs:1000,thumbnailRasters:420,animationElementsValidated:animations,rotationElementsValidated:rotations,pathMorphElementsValidated:pathMorphs,motionPathsValidated:motionPaths,maxSvgGas:Number(maxGas),maxSvgBytes,edgeSeedGenomePairs:6,pendingSvg:true,phenotypeGeneMutationChecks:12,notes:['Synthetic post-reveal genome coverage, not a live sacrifice prediction.','Parent snapshot and genetic recombination correctness are covered by separate core genetics tests.','Native SVG syntax, morph topology, periodic endpoints and static counterpart checked. Browser playback/capture is separate visual QA.']};
fs.writeFileSync(path.join(root,'artifacts/art-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));window.close();
