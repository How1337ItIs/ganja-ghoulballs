// Synthetic post-reveal renderer coverage, never a pre-mint offspring predictor.
import {AbiCoder,keccak256,toUtf8Bytes} from 'ethers';
export const INHERITED_DOMAIN='GANJA_GHOULBALLS_INHERITED_GOO_V3';
const abi=AbiCoder.defaultAbiCoder();
export const SKY=[0x15102e,0x0b1838,0x291135,0x2c153b];
export const THEMES=['Midnight','Lagoon','Ultraviolet','Sunset'];
export const MOTIONS=['Ricochet','Orbit','Float','Figure Eight'];
export function packGenome(g){
 const fields=[[g.body,0],[g.accent,24],[g.count,48],[g.scene,56],[g.motion,64],[g.radius,72],[g.flags??0,80],[g.baseCount??g.count,88],[g.baseMotion??g.motion,96],[3,104],[g.sky,112],[g.theme,136],[g.xPhase,144],[g.yPhase,152],[g.bodyDonor??0,160],[g.accentDonor??1,168],[g.skyDonor??2,176],[g.bodyBall??0,184],[g.accentBall??0,192]];
 return fields.reduce((a,[v,n])=>a|(BigInt(v)<<BigInt(n)),0n);
}
// Exact integer HSV/RGB calculation from verified Base GenerativeVideo/Vaporwave.
// Security review rebuilt that source byte-for-byte against its deployed runtime.
export function originalNeon(seed,i=0){
 const h=BigInt(keccak256(abi.encode(['uint256','uint256'],[seed,i])));
 const hue=Number((h>>136n)%360n),s=120+Number((h>>152n)%110n),v=220+Number((h>>168n)%36n),rem=Math.floor(hue%60*255/60);
 const p=Math.floor(v*(255-s)/255),q=Math.floor(v*(255-Math.floor(s*rem/255))/255),t=Math.floor(v*(255-Math.floor(s*(255-rem)/255))/255);
 const [r,g,b]=[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][Math.floor(hue/60)];return r*65536+g*256+b;
}
export function fixture(index){
 const seed=BigInt(keccak256(toUtf8Bytes(`${INHERITED_DOMAIN}:QA_REVEALED:${index}`)));
 const theme=Math.floor(index/4)%4;
 const g={body:originalNeon(seed,0),accent:originalNeon(seed,1),count:[1,2,4,6][index%4],scene:index%6,motion:Math.floor(index/16)%4,radius:5+index%6,sky:SKY[theme],theme,xPhase:Number(seed%107n),yPhase:Number((seed>>16n)%107n),bodyDonor:index%13,accentDonor:(index+7)%13,skyDonor:(index+3)%13};
 // A donor-led 75/25 mix with a second actual neon colour preserves hue and bright variety.
 const mix=(a,b)=>[16,8,0].reduce((out,n)=>out|Math.floor((((a>>n)&255)*3+((b>>n)&255))/4)<<n,0);
 g.body=mix(g.body,originalNeon(seed,2));g.accent=mix(g.accent,originalNeon(seed,3));
 return {id:index+1,minter:'0x1111111111111111111111111111111111111111',mintBlock:String(52753172+index),seed:seed.toString(),genome:packGenome(g).toString(),genes:g,fixtureType:'SYNTHETIC POST-REVEAL GENOME COVERAGE; NOT A LIVE RECIPE PREDICTION'};
}
