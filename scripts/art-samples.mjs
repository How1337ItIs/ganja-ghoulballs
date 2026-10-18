import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AbiCoder,keccak256} from 'ethers';
import {environment,artifact,deploy,call,read,root} from '../test/evm.mjs';
const out=path.join(root,'artifacts/art'); const assets=path.join(root,'site/assets');
fs.mkdirSync(out,{recursive:true}); fs.mkdirSync(assets,{recursive:true});
const vm=await environment(); const renderer=await deploy(vm,artifact('GooRenderer'));
const abi=AbiCoder.defaultAbiCoder(); const DOMAIN='GANJA_GHOULBALLS_PIXEL_GOO_V2';
const hypothetical='0x1111111111111111111111111111111111111111';
const samples=[], distribution={};
for(let id=1;id<=420;id++) {
 const ingredients=Array.from({length:13},(_,i)=>13*(id-1)+i+1);
 const packed=ingredients.reduce((a,id,i)=>a|(BigInt(id)<<BigInt(i*16)),0n);
 const seed=BigInt(keccak256(abi.encode(['string','uint256','address','uint256','uint256'],[DOMAIN,8453,hypothetical,id,packed])));
 const traits=JSON.parse(await read(vm,renderer,'attributes',[seed]));
 const t=Object.fromEntries(traits.map(x=>[x.trait_type,x.value]));
 for(const [k,v]of Object.entries(t)){distribution[k]??={}; distribution[k][v]=(distribution[k][v]||0)+1;}
 samples.push({id,seed:seed.toString(),ingredients,traits:t});
}
const selected=[]; const take=s=>{if(s&&!selected.includes(s))selected.push(s);};
// Curated visual coverage. These fixtures are not predictions of live token rarity.
for(const material of Object.keys(distribution.Material))take(samples.find(s=>s.traits.Material===material&&s.traits['Ball Count']===1)||samples.find(s=>s.traits.Material===material));
for(const bg of Object.keys(distribution.Scene))take(samples.find(s=>s.traits.Scene===bg&&s.traits['Ball Count']===1));
for(const n of [2,4,6])take(samples.find(s=>s.traits['Ball Count']===n));
for(const h of Object.keys(distribution.Headwear))take(samples.find(s=>s.traits.Headwear===h&&s.traits['Ball Count']===1));
take(samples.find(s=>s.traits['Third Eye']==='Yes'&&s.traits['Ball Count']===1));
let maxGas=0n,maxBytes=0;
for(const s of selected){
 const r=await call(vm,renderer,'svg',[BigInt(s.seed),s.id,true],{isStatic:true}); if(!r.ok)throw Error(r.error);
 const animated=r.value[0]; const still=await read(vm,renderer,'svg',[BigInt(s.seed),s.id,false]);
 if(/<script|<image|https?:\/\//i.test(animated.replace('http://www.w3.org/2000/svg','')))throw Error('External dependency');
 if(!animated.includes('<animate'))throw Error('Animation missing'); if(still.includes('<animate'))throw Error('Still output animates');
 fs.writeFileSync(path.join(out,`goo-${s.id}.svg`),animated);fs.writeFileSync(path.join(out,`goo-${s.id}-still.svg`),still);
 fs.writeFileSync(path.join(assets,`goo-preview-${s.id}.svg`),animated);
 fs.writeFileSync(path.join(assets,`goo-preview-${s.id}-still.svg`),still);
 s.gas=Number(r.gas);s.svgBytes=Buffer.byteLength(animated);maxGas=r.gas>maxGas?r.gas:maxGas;maxBytes=Math.max(maxBytes,s.svgBytes);
 console.log('Rendered',s.id,JSON.stringify(s.traits),s.gas,s.svgBytes);
}
const hero=selected.find(s=>s.traits.Material==='Rotten Cannabutter'&&s.traits['Ball Count']===1)||selected[0];
fs.copyFileSync(path.join(out,`goo-${hero.id}.svg`),path.join(assets,'renderer-preview.svg'));
fs.copyFileSync(path.join(out,`goo-${hero.id}-still.svg`),path.join(assets,'renderer-preview-still.svg'));
const manifest={rendererSourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'contracts/GooRenderer.sol'))).digest('hex'),status:'PREDEPLOYMENT RENDERER FIXTURES; NOT MINTED NFTS',domain:DOMAIN,chainId:8453,hypotheticalCollection:hypothetical,ingredientRange:[1,5460],heroId:hero.id,rendererRuntimeBytes:(artifact('GooRenderer').deployedBytecode.length-2)/2,selected,maxGas:Number(maxGas),maxBytes,distribution,syntheticRecipes:samples};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(assets,'preview-manifest.json'),JSON.stringify({status:manifest.status,heroId:hero.id,selected:selected.map(({id,traits})=>({id,traits,src:`./assets/goo-preview-${id}.svg`,stillSrc:`./assets/goo-preview-${id}-still.svg`}))},null,2));
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Compiled renderer art QA</title><style>body{margin:24px;background:#080b10;color:#d2cfb0;font:14px monospace}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}img{width:100%;image-rendering:pixelated}article{border:1px solid #333;padding:10px}p{min-height:60px;line-height:1.5}small img{width:64px;height:64px} @media(max-width:800px){main{grid-template-columns:repeat(2,1fr)}}</style><h1>GGOO | native Solidity SVG</h1><p>Hypothetical deployment fixtures. Canonical 13-original recipes. Static thumbnail below each animated image.</p><main>${selected.map(s=>`<article><img src="goo-${s.id}.svg"><p>#${s.id} / ${s.traits.Material}<br>${s.traits.Scene} / ${s.traits.Headwear}<br>${s.traits['Ball Count']} ghouls / ${s.gas.toLocaleString()} gas</p><small><img src="goo-${s.id}-still.svg"></small></article>`).join('')}</main>`);
console.log(JSON.stringify({hero:hero.id,selected:selected.length,maxGas:Number(maxGas),maxBytes,distribution}));
