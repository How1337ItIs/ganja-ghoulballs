/* Read-only decoding of the documented v3 onchain chromosome layout. No recipe preview. */
export const THEMES=['Midnight','Lagoon','Ultraviolet','Sunset'];
export const MOTIONS=['Ricochet','Orbit','Float','Figure Eight'];
const field=(word,offset,width=8)=>Number((word>>BigInt(offset))&((1n<<BigInt(width))-1n));
const color=(word,offset)=>'#'+field(word,offset,24).toString(16).padStart(6,'0');
const word256=value=>{const word=BigInt(value);if(word<0n||word>=(1n<<256n))throw Error('Invalid chromosome word.');return word;};
export function decodeLineage(ids,genes,rawGenome) {
 if(ids.length!==13||genes.length!==13)throw Error('Lineage requires exactly 13 parent chromosomes.');
 const parentIds=ids.map(String);if(parentIds.some((id,i)=>!/^\d+$/.test(id)||BigInt(id)<1n||BigInt(id)>6667n||(i&&BigInt(id)<=BigInt(parentIds[i-1]))))throw Error('Invalid canonical parent IDs.');
 const parents=genes.map((value,i)=>{
  const word=word256(value),count=field(word,168),theme=field(word,176),motion=field(word,184),scene=field(word,192);
  if(field(word,240)!==3||field(word,248)!==0||![1,2,4,6].includes(count)||theme>3||motion>3||scene!==[1,2,4,6].indexOf(count)+7)throw Error('Unsupported parent chromosome layout.');
  const radii=Array.from({length:count},(_,j)=>field(word,144+j*4,4));if(radii.some(r=>r<5||r>10))throw Error('Invalid parent radius.');
  return{id:parentIds[i],count,theme,motion,scene,colors:Array.from({length:count},(_,j)=>color(word,j*24)),radii,sky:color(word,200),word:String(word)};
 });
 const word=word256(rawGenome),count=field(word,48),motion=field(word,64),theme=field(word,136),radius=field(word,72),mutations=field(word,80),inheritedCount=field(word,88),inheritedMotion=field(word,96);
 if(field(word,104)!==3||field(word,248)!==0||![1,2,4,6].includes(count)||![1,2,4,6].includes(inheritedCount)||motion>3||inheritedMotion>3||theme>3||radius<5||radius>10||mutations>15)throw Error('Unsupported child genome layout.');
 const donor=offset=>{const i=field(word,offset);if(i>=13)throw Error('Invalid lineage donor index.');return parents[i];};
 const bodyDonor=donor(160),accentDonor=donor(168),skyDonor=donor(176),bodyBall=field(word,184),accentBall=field(word,192);
 if(bodyBall>=bodyDonor.count||accentBall>=accentDonor.count)throw Error('Invalid lineage ball index.');
 const loci=[{name:'Count',field:'count',a:donor(200),b:donor(208),inherited:inheritedCount,final:count,rank:'2 > 4 > 1 > 6'}, {name:'Motion',field:'motion',a:donor(216),b:donor(224),inherited:inheritedMotion,final:motion,rank:'Ricochet > Orbit > Float > Figure Eight'}, {name:'Theme',field:'theme',a:donor(232),b:donor(240),inherited:theme,final:theme,rank:'Midnight > Lagoon > Ultraviolet > Sunset'}];
 if(loci.some(l=>l.a.id===l.b.id)||bodyDonor.id===accentDonor.id)throw Error('Invalid repeated allele donor.');
 return{parents,count,motion,theme,radius,mutations,inheritedCount,inheritedMotion,body:color(word,0),accent:color(word,24),sky:color(word,112),bodyDonor,accentDonor,skyDonor,bodyBall,accentBall,loci,word:String(word)};
}
