import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Interface} from 'ethers';
import {environment,deploy,call,read,root} from '../test/evm.mjs';
import {fixture} from '../test/art-fixtures.mjs';
import {verifyRendererArtifact} from '../test/renderer-artifact.mjs';

// This script writes development fixtures only. It never predicts a real sacrifice,
// modifies the mint UI, or publishes assets. Every SVG comes from the EVM renderer.
const out=path.join(root,'artifacts/art-v3');fs.mkdirSync(out,{recursive:true});
const rendererArtifact=JSON.parse(fs.readFileSync(process.env.RENDERER_ARTIFACT||path.join(root,'artifacts/GooRenderer.json')));
rendererArtifact.iface=new Interface(rendererArtifact.abi);
const provenance=verifyRendererArtifact(rendererArtifact),sourceHash=provenance.rendererSourceSha256;
const vm=await environment(),renderer=await deploy(vm,rendererArtifact);
const selected=[],panels=[],indexes=[16,60,4,40,17,21,25,29,34,38,42,46,51,55,59,63];let maxGas=0n,maxBytes=0;
async function render(s,prefix){
 const result=await call(vm,renderer,'svg',[s.seed,s.genome,s.id,s.mintBlock,s.minter,true],{isStatic:true});if(!result.ok)throw Error(result.error);
 const animated=result.value[0],still=await read(vm,renderer,'svg',[s.seed,s.genome,s.id,s.mintBlock,s.minter,false]);
 s.traits=Object.fromEntries(JSON.parse(await read(vm,renderer,'attributes',[s.seed,s.genome])).map(x=>[x.trait_type,x.value]));
 if(/<script|<image|https?:\/\//i.test(animated.replace('http://www.w3.org/2000/svg','')))throw Error('External SVG dependency');
 if(!animated.includes('<animate')||still.includes('<animate'))throw Error('Animation/static pair mismatch');
 fs.writeFileSync(path.join(out,prefix+'.svg'),animated);fs.writeFileSync(path.join(out,prefix+'-still.svg'),still);
 s.svgBytes=Buffer.byteLength(animated);s.executionGas=Number(result.gas);maxGas=result.gas>maxGas?result.gas:maxGas;maxBytes=Math.max(maxBytes,s.svgBytes);
 return still;
}
for(let n=0;n<indexes.length;n++){
 const s=fixture(indexes[n]),still=await render(s,`goo-${s.id}`);selected.push(s);
 panels.push({input:await sharp(Buffer.from(still)).resize(384,384).png().toBuffer(),left:n%4*384,top:Math.floor(n/4)*440});
 const caption=`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="56"><rect width="384" height="56" fill="#101916"/><text x="8" y="21" fill="#ddd3b4" font-family="monospace" font-size="13">#${s.id} ${s.traits['Inherited Theme']} / ${s.traits.Motion}</text><text x="8" y="42" fill="#a1b58d" font-family="monospace" font-size="12">${s.traits['Body Colour']} / radius ${s.genes.radius} / ${s.genes.count} ghouls</text></svg>`;
 panels.push({input:await sharp(Buffer.from(caption)).png().toBuffer(),left:n%4*384,top:Math.floor(n/4)*440+384});
}
await sharp({create:{width:1536,height:1760,channels:4,background:'#080b10'}}).composite(panels).png().toFile(path.join(out,'contact-sheet.png'));
// When the current genetics suite has passed, also render its real recombination
// outputs from13 mock originals using the byte-for-byte verified original renderer.
const lineage=[],geneticsPath=path.join(root,'artifacts/genetics-tests.json');
if(fs.existsSync(geneticsPath)){
 const report=JSON.parse(fs.readFileSync(geneticsPath)),current=createHash('sha256').update(fs.readFileSync(path.join(root,'contracts/GooGenetics.sol'))).digest('hex');
 if(report.passed&&report.geneticsSourceSha256===current){
  for(const [i,e]of report.examples.entries()){
   const sample={id:i+1,mintBlock:'52753172',minter:'0x1111111111111111111111111111111111111111',seed:e.seed,genome:e.genome,fixtureType:'13 mock originals, verified original recipe code, actual GooGenetics recombination, test entropy',testEntropy:e.entropy,parentDigest:report.parentDigest};
   await render(sample,`lineage-${i+1}`);lineage.push(sample);
  }
 }
}
const manifest={status:'SYNTHETIC POST-REVEAL DEVELOPMENT FIXTURES; NO LIVE OFFSPRING PREDICTION',...provenance,rendererRuntimeBytes:(rendererArtifact.deployedBytecode.length-2)/2,selected,lineage,maxSvgExecutionGas:Number(maxGas),maxSvgBytes:maxBytes};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({rendererSourceSha256:sourceHash,selected:selected.length,lineage:lineage.length,maxSvgExecutionGas:Number(maxGas),maxSvgBytes:maxBytes,output:out},null,2));

// Explicit opt-in publication preparation; this still only writes local files.
// HTML/app behavior remains owned by the frontend, and no network publish occurs.
if(process.argv.includes('--export-site')){
 const lab=path.join(root,'site/lab'),assets=path.join(root,'site/assets');fs.mkdirSync(path.join(lab,'assets'),{recursive:true});fs.mkdirSync(assets,{recursive:true});
 for(const s of selected)for(const suffix of ['', '-still'])fs.copyFileSync(path.join(out,`goo-${s.id}${suffix}.svg`),path.join(lab,'assets',`goo-${s.id}${suffix}.svg`));
 fs.writeFileSync(path.join(lab,'manifest.json'),JSON.stringify(manifest,null,2));
 const strip=[17,61,5,41],heroId=61;
 for(const id of strip)for(const suffix of ['', '-still'])fs.copyFileSync(path.join(out,`goo-${id}${suffix}.svg`),path.join(assets,`goo-preview-${id}${suffix}.svg`));
 for(const suffix of ['', '-still'])fs.copyFileSync(path.join(out,`goo-${heroId}${suffix}.svg`),path.join(assets,`renderer-preview${suffix}.svg`));
 fs.writeFileSync(path.join(assets,'preview-manifest.json'),JSON.stringify({status:'SYNTHETIC POST-REVEAL RENDERER STUDIES; NOT MINTED NFTS OR LIVE RECIPE PREDICTIONS',...provenance,heroId,selected:strip.map(id=>{const s=selected.find(x=>x.id===id);return {id,traits:s.traits,mintBlock:s.mintBlock,minter:s.minter,src:`./assets/goo-preview-${id}.svg`,stillSrc:`./assets/goo-preview-${id}-still.svg`};})},null,2));
 console.log('Prepared canonical lab/home SVG pairs; no network publication.');
}
