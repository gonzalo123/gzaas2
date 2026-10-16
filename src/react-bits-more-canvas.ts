/* Prism, Light Pillar, Grid Scan, Pixel Blast and Galaxy adapted from React Bits.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause: public/licenses/react-bits.txt.
 * Geometry and periodic fields replace interactive/history-dependent rendering. */
import type {Palette} from './silk-renderer';
import {perlin} from './react-bits-noise';
import {textNoise} from './text-motion.mjs';
const TAU=Math.PI*2;
const fract=(n:number)=>n-Math.floor(n);
const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
type Scene=(ctx:CanvasRenderingContext2D,w:number,h:number,p:number,s:Palette)=>void;

const prism:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),angle=p,tilt=.2,project=([x,y,z]:number[])=>{
  const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=-x*Math.sin(angle)+z*Math.cos(angle),ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=3+rz*Math.cos(tilt)+y*Math.sin(tilt);
  return {x:w/2+rx/depth*unit*1.25,y:h/2+ry/depth*unit*1.25,z:rz};
 };
 const vertices=[[0,-1.18,0],...Array.from({length:3},(_,i)=>[Math.cos(i*TAU/3)*1.1,.8,Math.sin(i*TAU/3)*1.1])].map(project);
 const faces=[1,2,3].map((i,k)=>({v:[vertices[0],vertices[i],vertices[k===2?1:i+1]],index:k})).sort((a,b)=>b.v.reduce((n,v)=>n+v.z,0)-a.v.reduce((n,v)=>n+v.z,0));
 ctx.lineJoin='round';
 for(const face of faces){
  const grad=ctx.createLinearGradient(w*.2,h*.1,w*.8,h*.95);grad.addColorStop(0,mix(s.accent,'#ffffff',.65));grad.addColorStop(.45,s.accent);grad.addColorStop(1,s.bg);
  ctx.save();ctx.beginPath();face.v.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fillStyle=grad;ctx.globalAlpha=.32+.1*face.index;ctx.shadowColor=s.accent;ctx.shadowBlur=unit*.065;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=mix(s.accent,'#ffffff',.6);ctx.lineWidth=unit*.002;ctx.globalAlpha=.7;ctx.stroke();ctx.clip();
  for(let j=0;j<24;j++){const y=h*(j/24)+Math.sin(p)*unit*.018;ctx.globalAlpha=.045+.08*(.5+.5*Math.sin(j*.65+p));ctx.fillStyle=s.accent;ctx.fillRect(0,y,w,unit*.009);}ctx.restore();
 }
};

const pillar:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),center=w/2+Math.sin(p)*unit*.035;
 for(let i=0;i<180;i++){
  const y=i/180*h,turn=y/h*7+Math.sin(p)*1.2,radius=unit*(.065+.018*Math.cos(turn-p)),x=center+unit*.025*Math.sin(turn+p);
  const g=ctx.createLinearGradient(x-radius*2.8,0,x+radius*2.8,0);g.addColorStop(0,s.accent+'00');g.addColorStop(.3,s.accent+'11');g.addColorStop(.44,s.accent+'66');g.addColorStop(.5,mix(s.accent,'#ffffff',.5));g.addColorStop(.56,s.accent+'66');g.addColorStop(.7,s.accent+'11');g.addColorStop(1,s.accent+'00');
  ctx.globalAlpha=.48+.18*Math.sin(turn*3+p);ctx.fillStyle=g;ctx.fillRect(x-radius*2.8,y,radius*5.6,h/180+1);
 }
};

const grid:Scene=(ctx,w,h,p,s)=>{
 const cx=w*(.5+.025*Math.cos(p)),cy=h*(.5+.025*Math.sin(p)),unit=Math.min(w,h),scan=.5+.43*Math.sin(p),inner={x:cx-w*.12,y:cy-h*.12,w:w*.24,h:h*.24};
 ctx.lineWidth=Math.max(.6,unit*.0012);ctx.strokeStyle=s.accent;
 const point=(t:number,x:number,y:number)=>({x:(-.22*w+x*w*1.44)*(1-t)+(inner.x+x*inner.w)*t,y:(-.22*h+y*h*1.44)*(1-t)+(inner.y+y*inner.h)*t});
 for(let i=0;i<=24;i++){
  const t=(i/24)**.7,glow=Math.exp(-(((t-scan)/.075)**2)),a=point(t,0,0),b=point(t,1,1);
  ctx.globalAlpha=(.12+.55*glow)*(1-t*.45);ctx.strokeStyle=glow>.5?mix(s.accent,'#ffffff',glow*.55):s.accent;ctx.lineWidth=unit*(.001+.003*glow);ctx.shadowColor=s.accent;ctx.shadowBlur=glow*unit*.018;ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
 }
 ctx.shadowBlur=0;ctx.lineWidth=Math.max(.6,unit*.001);ctx.strokeStyle=s.accent;ctx.globalAlpha=.27;
 for(let i=0;i<=12;i++)for(const [x,y] of [[i/12,0],[i/12,1],[0,i/12],[1,i/12]]){const a=point(0,x,y),b=point(1,x,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
};

const pixels:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),step=unit/40,tx=.7*Math.cos(p),ty=.7*Math.sin(p),wave=.2+.13*Math.sin(p);
 ctx.fillStyle=s.accent;
 for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
  const u=x/unit,v=y/unit,d=Math.hypot((x-w/2)/unit,(y-h/2)/unit),n=perlin(u*2+tx,v*2+ty)*.65+perlin(u*4-tx,v*4-ty)*.2;
  const ring=Math.exp(-(((d-wave)/.055)**2)),a=Math.max(0,Math.min(1,(n+.1)*2+ring*.65));if(a<.09)continue;
  const size=step*(.18+a*.6);ctx.globalAlpha=a*.75;ctx.fillRect(x-size/2,y-size/2,size,size);
 }
};

const stars=Array.from({length:210},(_,i)=>({x:textNoise(i,1)-.5,y:textNoise(i,2)-.5,z:textNoise(i,3),size:textNoise(i,4),phase:textNoise(i,5)*TAU}));
const galaxy:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),turn=.12*Math.sin(p),c=Math.cos(turn),si=Math.sin(turn);
 const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,unit*.6);glow.addColorStop(0,s.accent+'16');glow.addColorStop(1,s.accent+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 for(const star of stars){
  const z=fract(star.z+p/TAU),depth=.22+z*1.3,px=(star.x*c-star.y*si)*unit/depth,py=(star.x*si+star.y*c)*unit/depth,x=w/2+px,y=h/2+py;
  const fade=Math.sin(Math.PI*z)**.5,twinkle=.65+.35*Math.sin(p+star.phase),r=(.5+star.size*1.1)*unit/500/depth;
  ctx.globalAlpha=fade*twinkle*.85;ctx.fillStyle=mix(s.accent,'#ffffff',star.size*.7);ctx.beginPath();ctx.arc(x,y,Math.max(.4,r),0,TAU);ctx.fill();
  if(star.size>.65){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(.5,r*.4);ctx.globalAlpha*=.35;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+px*.025/depth,y+py*.025/depth);ctx.stroke();}
 }
};

const scenes:Record<string,Scene>={prism,'light-pillar':pillar,'grid-scan':grid,'pixel-blast':pixels,galaxy};
export function createMoreCanvasBackdrop(state:Palette&{backdrop:string},width:number,height:number){
 const scene=Object.hasOwn(scenes,state.backdrop)?scenes[state.backdrop]:undefined;if(!scene)return null;
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));canvas.dataset.backend='canvas';
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;let disposed=false,lastTime:number|undefined;
 return {canvas,draw(milliseconds:number){if(disposed)return;const time=state.backdropMotion?Math.max(0,milliseconds)%(6000*tempo):0;if(time===lastTime)return;lastTime=time;ctx.save();ctx.fillStyle=state.bg;ctx.fillRect(0,0,canvas.width,canvas.height);scene(ctx,canvas.width,canvas.height,time/(6000*tempo)*TAU,state);ctx.restore();},dispose(){disposed=true;canvas.width=canvas.height=0;}};
}
