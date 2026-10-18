const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out=path.resolve(__dirname,'../artifacts/art');const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 const panels=[],thumbs=[];const width=1536,cell=384,height=Math.ceil(m.selected.length/4)*448;
 for(let i=0;i<m.selected.length;i++){
  const s=m.selected[i];const svg=path.join(out,`goo-${s.id}-still.svg`);
  const png=await sharp(svg).resize(384,384).png().toBuffer();fs.writeFileSync(path.join(out,`goo-${s.id}.png`),png);
  panels.push({input:png,left:i%4*cell,top:Math.floor(i/4)*448});
  const caption=`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="64"><rect width="384" height="64" fill="#151a19"/><text x="10" y="22" font-family="monospace" font-size="14" fill="#ddd5af">#${s.id} ${s.traits.Material}</text><text x="10" y="44" font-family="monospace" font-size="12" fill="#a7b38a">${s.traits.Scene} / ${s.traits.Headwear}</text></svg>`;
  panels.push({input:await sharp(Buffer.from(caption)).png().toBuffer(),left:i%4*cell,top:Math.floor(i/4)*448+384});
  thumbs.push({input:await sharp(svg).resize(64,64).png().toBuffer(),left:i%8*80+8,top:Math.floor(i/8)*80+8});
 }
 await sharp({create:{width,height,channels:4,background:'#080b10'}}).composite(panels).png().toFile(path.join(out,'contact-sheet.png'));
 await sharp({create:{width:640,height:Math.ceil(m.selected.length/8)*80,channels:4,background:'#080b10'}}).composite(thumbs).png().toFile(path.join(out,'thumbnails-64px.png'));
 console.log(`Rendered ${m.selected.length} still specimens and 64px thumbnails from compiled SVGs.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
