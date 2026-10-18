// A local viewing derivative of the verified collection SVG. No wallet, network,
// renderer service, or metadata changes. Frames sample native SVG timing exactly.
import {GIFEncoder, quantize, applyPalette} from './vendor/gifenc-1.0.3.js';

export const GIF_PREVIEW = Object.freeze({size:256, frameCount:60, durationMs:6000, delayMs:100, maxBytes:8*1024*1024});
const NS='http://www.w3.org/2000/svg';
const TAGS=new Set(['svg','title','desc','g','path','rect','circle','animate','animateTransform','animateMotion']);
const ATTRS=new Set(['xmlns','width','height','viewBox','role','data-mint-block','x','y','cx','cy','r','d','fill','fill-rule','stroke','stroke-width','stroke-opacity','shape-rendering','opacity','transform','attributeName','type','values','dur','begin','repeatCount','keyTimes','path']);
const NUM=/-?(?:\d+(?:\.\d*)?|\.\d+)/g;
const PAINT=/^(?:#[\da-f]{6}|none)$/i;
const PATH=/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/;
const NUMBER=/^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
const ANIMATION_SELECTOR='animate,animateTransform,animateMotion';
let exporting=false;

function fail(message){throw Error(message);}
function tokenNumber(tokenId){const id=String(tokenId);if(!/^[1-9]\d{0,2}$/.test(id)||Number(id)>420)fail('Invalid GGOO token number.');return id;}
function boundedNumbers(value,max=100000){
 const values=value.match(NUM);if(!values?.length||values.some(v=>!Number.isFinite(Number(v))||Math.abs(Number(v))>max))fail('Unsupported SVG numeric value.');
 return values.map(Number);
}
function pathValues(value){if(!PATH.test(value)||!/^M/i.test(value)||value.length>12000)fail('Unsupported SVG path.');boundedNumbers(value);return value;}
function seconds(value,negative=false){
 if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)s$/.test(value||''))fail('Unsupported SVG animation timing.');
 const n=Number(value.slice(0,-1));if(!Number.isFinite(n)||(negative?n>0||n< -60:n<=0||n>60))fail('Unsupported SVG animation timing.');return n;
}
function interpolate(values,times,phase){
 let i=0;while(i<times.length-2&&phase>=times[i+1])i++;
 const f=(phase-times[i])/(times[i+1]-times[i]);return values[i].map((v,j)=>v+(values[i+1][j]-v)*f);
}
const format=n=>String(Math.round(n*1e6)/1e6);
const phaseAt=(t,begin,dur)=>(((t-begin)%dur)+dur)%dur/dur;

/** Reject active SVG content BEFORE any node is inserted or rasterized. This is
 * deliberately the small immutable GooRenderer vocabulary, not a general SVG
 * sanitizer. Unsupported art fails visibly instead of silently losing motion. */
export function prepareSvgAnimation(svg,{tokenId,revealed}={}){
 const id=tokenNumber(tokenId);
 if(revealed!==true)fail('GIF download is available after this GGOO reveals.');
 if(typeof svg!=='string'||svg.length>750000||!/^\s*<svg\b/.test(svg)||/<!|<\?/.test(svg))fail('Malformed or unsupported onchain SVG.');
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 const root=doc.documentElement;
 if(doc.querySelector('parsererror')||root.localName!=='svg'||root.namespaceURI!==NS||root.getAttribute('viewBox')!=='0 0 512 512')fail('Malformed or unsupported onchain SVG.');
 const nodes=[...root.querySelectorAll('*')];
 if(nodes.length>6000)fail('SVG exceeds the local export size limit.');
 for(const el of [root,...nodes]){
  if(!TAGS.has(el.localName)||el.namespaceURI!==NS||(el.localName==='svg'&&el!==root))fail('SVG contains unsupported or active content.');
  for(const a of el.attributes){
   const {name,value}=a;
   if(!ATTRS.has(name)||(a.namespaceURI&&name!=='xmlns')||/url\s*\(|javascript:|data:|https?:|[<>\\]/i.test(value)&&name!=='xmlns')fail('SVG contains external resources or unsupported attributes.');
   if(name==='xmlns'&&(el!==root||value!==NS))fail('Unsupported SVG namespace.');
   if(['fill','stroke'].includes(name)&&!PAINT.test(value))fail('Unsupported SVG paint.');
   if(['width','height','x','y','cx','cy','r','stroke-width','stroke-opacity','opacity'].includes(name)&&(!NUMBER.test(value)||Math.abs(Number(value))>10000))fail('Unsupported SVG geometry.');
   if(['d','path'].includes(name))pathValues(value);
   if(name==='transform'){
    if(!/^(?:(?:translate|rotate|scale)\([\d\s.,-]+\)\s*)+$/.test(value))fail('Unsupported SVG transform.');boundedNumbers(value,10000);
   }
   if(name==='fill-rule'&&!['evenodd','nonzero'].includes(value))fail('Unsupported SVG fill rule.');
   if(name==='shape-rendering'&&value!=='crispEdges')fail('Unsupported SVG rendering mode.');
  }
 }
 if(root.querySelector('title')?.textContent!==`Ganja Ghoulballs #${id}`)fail('SVG does not match this revealed GGOO.');
 const animations=[...root.querySelectorAll(ANIMATION_SELECTOR)];
 if(!animations.length||animations.length>160||!animations.some(a=>a.localName==='animateMotion'))fail('Revealed animated SVG is required for GIF download.');
 const targets=new Set(),descriptors=[];
 for(const a of animations){
  const parent=a.parentElement,kind=a.localName;
  if(!['g','path'].includes(parent.localName)||a.children.length||a.textContent.trim())fail('Unsupported SVG animation target.');
  const allowed=new Set(kind==='animateMotion'?['path','dur','begin','repeatCount']:['attributeName','type','values','dur','begin','repeatCount','keyTimes']);
  if([...a.attributes].some(attr=>!allowed.has(attr.name)))fail('Unsupported SVG animation attributes.');
  const dur=seconds(a.getAttribute('dur')),begin=a.hasAttribute('begin')?seconds(a.getAttribute('begin'),true):0;
  if(Math.abs(begin)>=dur||a.getAttribute('repeatCount')!=='indefinite')fail('Unsupported SVG animation cycle.');
  const attr=kind==='animateMotion'?'transform':a.getAttribute('attributeName');
  const key=nodes.indexOf(parent)+':'+attr;if(targets.has(key))fail('Overlapping SVG animations are unsupported.');targets.add(key);
  if(attr==='transform'&&parent.hasAttribute('transform'))fail('Unsupported animated base transform.');
  const descriptor={parent,kind,attr,dur,begin};
  if(kind==='animateMotion'){
   const path=document.createElementNS(NS,'path');path.setAttribute('d',pathValues(a.getAttribute('path')||''));
   // Detached native geometry supplies the same paced distance metric as SMIL.
   const length=path.getTotalLength();if(!Number.isFinite(length)||length<=0||length>10000)fail('Invalid SVG motion path.');
   descriptor.motionPath=path;descriptor.length=length;
  }else{
   if(kind==='animateTransform'?(attr!=='transform'||!['translate','scale','rotate'].includes(a.getAttribute('type'))):(!['opacity','d'].includes(attr)||a.hasAttribute('type')))fail('Unsupported SVG animation type.');
   const strings=(a.getAttribute('values')||'').split(';');if(strings.length<2||strings.length>16)fail('Unsupported SVG animation values.');
   let template=null;
   descriptor.values=strings.map(value=>{
    if(attr==='d'){pathValues(value);const shape=value.replace(NUM,'#');if(template!==null&&shape!==template)fail('SVG morph paths have incompatible geometry.');template=shape;}
    else if(!/^[\d\s.,-]+$/.test(value))fail('Unsupported SVG animation values.');
    return boundedNumbers(value,10000);
   });
   const count=descriptor.values[0].length;
   if(descriptor.values.some(v=>v.length!==count))fail('Incompatible SVG animation values.');
   if(attr==='opacity'&&(count!==1||descriptor.values.some(v=>v[0]<0||v[0]>1)))fail('Unsupported SVG opacity.');
   descriptor.type=a.getAttribute('type');
   if(kind==='animateTransform'&&(descriptor.type==='rotate'?count!==3:count!==2))fail('Unsupported SVG transform values.');
   descriptor.template=strings[0];
   descriptor.times=a.hasAttribute('keyTimes')?a.getAttribute('keyTimes').split(';').map(Number):strings.map((_,i)=>i/(strings.length-1));
   if(descriptor.times.length!==strings.length||descriptor.times[0]!==0||descriptor.times.at(-1)!==1||descriptor.times.some((v,i)=>!Number.isFinite(v)||v<0||v>1||(i&&v<=descriptor.times[i-1])))fail('Unsupported SVG animation key times.');
  }
  descriptors.push(descriptor);a.remove();
 }
 root.setAttribute('width',String(GIF_PREVIEW.size));root.setAttribute('height',String(GIF_PREVIEW.size));
 const serializer=new XMLSerializer();let disposed=false;
 return {
  animationCount:descriptors.length,
  frameAt(t){
   if(disposed)fail('SVG export has already finished.');if(!Number.isFinite(t)||t<0||t>600)fail('Invalid SVG frame time.');
   for(const d of descriptors){
    const phase=phaseAt(t,d.begin,d.dur);
    if(d.kind==='animateMotion'){const p=d.motionPath.getPointAtLength(d.length*phase);d.parent.setAttribute('transform',`translate(${format(p.x)} ${format(p.y)})`);}
    else{
     const values=interpolate(d.values,d.times,phase);
     if(d.attr==='d'){let i=0;d.parent.setAttribute('d',d.template.replace(NUM,()=>format(values[i++])));}
     else d.parent.setAttribute(d.attr,d.attr==='transform'?`${d.type}(${values.map(format).join(' ')})`:format(values[0]));
    }
   }
   return serializer.serializeToString(root);
  },
  dispose(){disposed=true;descriptors.length=0;root.replaceChildren();}
 };
}

function aborted(signal){if(signal?.aborted)throw new DOMException('GIF export cancelled.','AbortError');}
function yieldFrame(){return new Promise(resolve=>setTimeout(resolve,0));}
async function rasterize(svg,canvas,signal){
 aborted(signal);
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
 try{
  await new Promise((resolve,reject)=>{
   let done=false;
   const finish=error=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);img.onload=null;img.onerror=null;error?reject(error):resolve();};
   const cancel=()=>finish(new DOMException('GIF export cancelled.','AbortError'));
   const timer=setTimeout(()=>finish(Error('SVG frame rendering timed out. Please retry.')),10000);
   signal?.addEventListener('abort',cancel,{once:true});
   img.onload=()=>finish();img.onerror=()=>finish(Error('This browser could not render the SVG frame.'));
   img.src=url;
  });
  aborted(signal);
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)fail('Canvas export is unavailable in this browser.');
  context.fillStyle='#0b1012';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
  return context.getImageData(0,0,canvas.width,canvas.height).data;
 }finally{img.src='';URL.revokeObjectURL(url);}
}

/** Frames are rendered/encoded one at a time, never retained as an RGBA movie.
 * Cancellation yields between frames. Only one export can run in this tab. */
export async function createTokenGif({svg,tokenId,revealed,onProgress=()=>{},signal}={}){
 if(exporting)fail('A GIF export is already running. Cancel it before starting another.');
 aborted(signal);exporting=true;
 let animation,canvas;
 try{
  const id=tokenNumber(tokenId);animation=prepareSvgAnimation(svg,{tokenId:id,revealed});
  canvas=document.createElement('canvas');canvas.width=GIF_PREVIEW.size;canvas.height=GIF_PREVIEW.size;
  const gif=GIFEncoder();
  onProgress({completed:0,total:GIF_PREVIEW.frameCount,percent:0});
  for(let i=0;i<GIF_PREVIEW.frameCount;i++){
   aborted(signal);await yieldFrame();aborted(signal);
   const rgba=await rasterize(animation.frameAt(i*GIF_PREVIEW.delayMs/1000),canvas,signal);
   const palette=quantize(rgba,256),index=applyPalette(rgba,palette);
   gif.writeFrame(index,GIF_PREVIEW.size,GIF_PREVIEW.size,{palette,delay:GIF_PREVIEW.delayMs,repeat:0,dispose:1});
   if(gif.bytesView().length>GIF_PREVIEW.maxBytes)fail('GIF exceeds the 8 MB local export limit.');
   onProgress({completed:i+1,total:GIF_PREVIEW.frameCount,percent:Math.round((i+1)*100/GIF_PREVIEW.frameCount)});
  }
  aborted(signal);gif.finish();
  return {blob:new Blob([gif.bytesView()],{type:'image/gif'}),filename:`ggoo-${id}-animated-preview.gif`,frameCount:GIF_PREVIEW.frameCount,durationMs:GIF_PREVIEW.durationMs};
 }finally{animation?.dispose();if(canvas){canvas.width=1;canvas.height=1;}exporting=false;}
}

export async function downloadTokenGif(options){
 const result=await createTokenGif(options);aborted(options?.signal);
 const url=URL.createObjectURL(result.blob),a=document.createElement('a');
 try{a.href=url;a.download=result.filename;a.rel='noopener';document.body.append(a);a.click();}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 return result;
}

/** X only receives a public token link/caption. The user reviews and publishes;
 * its web intent cannot attach the downloaded GIF. Drop query parameters. */
export function buildTokenShareUrl({tokenId,pageUrl=globalThis.location?.href}={}){
 const id=tokenNumber(tokenId),url=new URL(pageUrl);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)fail('Invalid public token page URL.');
 url.search='';url.hash=`token/${id}`;
 const intent=new URL('https://x.com/intent/post');
 intent.searchParams.set('text',`Ganja Ghoulballs #${id} — fully onchain animated art on Base.`);
 intent.searchParams.set('url',url.href);return intent.href;
}
