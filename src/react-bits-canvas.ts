/* Canvas adaptations of React Bits Orb, Lightning, Dither, DotGrid, RippleGrid,
 * Waves, PixelSnow and FloatingLines. Copyright (c) 2026 David Haz.
 * MIT + Commons Clause: public/licenses/react-bits.txt.
 * https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Backgrounds
 * Geometry/pixel algorithms are evaluated at explicit, periodic times instead
 * of integrating pointer/spring history. Preview, PNG and GIF share this code.
 */
import type {Palette} from './silk-renderer';
import {perlin} from './react-bits-noise';
import {seededRandom} from './particles.mjs';

const TAU=Math.PI*2;
const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const fract=(n:number)=>n-Math.floor(n);
type Scene=(ctx:CanvasRenderingContext2D,w:number,h:number,p:number,s:Palette)=>void;

const orb:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),cx=w/2,cy=h/2,radius=unit*.34;
 const points=Array.from({length:241},(_,i)=>{
  const a=i/240*TAU,r=radius+unit*.025*perlin(Math.cos(a)+Math.cos(p)*.4,Math.sin(a)+Math.sin(p)*.4);
  return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];
 });
 const haze=ctx.createRadialGradient(cx,cy,radius*.72,cx,cy,radius*1.25);
 haze.addColorStop(0,s.accent+'00');haze.addColorStop(.55,s.accent+'33');haze.addColorStop(1,s.accent+'00');
 ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 ctx.strokeStyle=s.accent;ctx.shadowColor=s.accent;ctx.shadowBlur=unit*.035;ctx.lineWidth=unit*.012;ctx.globalAlpha=.45;ctx.stroke();
 ctx.shadowBlur=0;ctx.lineWidth=Math.max(1,unit*.003);ctx.globalAlpha=.95;
 const light=ctx.createLinearGradient(cx-radius,cy,cx+radius,cy);
 light.addColorStop(0,s.accent);light.addColorStop(.6,mix(s.accent,'#ffffff',.55));light.addColorStop(1,s.accent);ctx.strokeStyle=light;ctx.stroke();
 const angle=p,r=radius+unit*.025*perlin(Math.cos(angle)+Math.cos(p)*.4,Math.sin(angle)+Math.sin(p)*.4),x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
 const head=ctx.createRadialGradient(x,y,0,x,y,unit*.055);
 head.addColorStop(0,'#ffffff');head.addColorStop(.12,mix(s.accent,'#ffffff',.6));head.addColorStop(1,s.accent+'00');
 ctx.fillStyle=head;ctx.fillRect(x-unit*.055,y-unit*.055,unit*.11,unit*.11);
};

const lightning:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),tx=Math.cos(p)*.65,ty=Math.sin(p)*.65;
 const bolt=(offset:number,start:number,end:number,branch=false)=>{
  const points=Array.from({length:193},(_,i)=>{
   const y=start+(end-start)*i/192;
   let noise=0,amp=.5,freq=2;
   for(let k=0;k<6;k++){noise+=amp*perlin(y*freq+tx,ty+offset*7);amp*=.5;freq*=2;}
   const lane=branch?offset+(y-start)*.5:offset;
   return [w/2+unit*(lane+noise*.35),h*y];
  });
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle=s.accent;ctx.shadowColor=s.accent;ctx.shadowBlur=unit*.025;ctx.lineWidth=unit*.008;ctx.globalAlpha=branch?.35:.5;ctx.stroke();
  ctx.shadowBlur=0;ctx.lineWidth=Math.max(.8,unit*(branch?.0018:.003));ctx.globalAlpha=branch?.55:.95;ctx.strokeStyle=mix(s.accent,'#ffffff',branch?.2:.7);ctx.stroke();
 };
 ctx.lineJoin='round';ctx.lineCap='round';bolt(0,-.05,1.05);bolt(-.16,.25,.85,true);bolt(.12,.55,1.05,true);
};

// The original Bayer 8x8 ordering, applied to a nested four-octave wave field.
const BAYER=[0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21];
const dither:Scene=(ctx,w,h,p,s)=>{
 const cols=128,rows=Math.max(32,Math.round(cols*h/w)),cw=w/cols,ch=h/rows,aspect=w/h;
 const fbm=(x:number,y:number)=>{
  let value=0,amp=1;
  for(let k=0;k<4;k++){value+=amp*Math.abs(perlin(x,y));x*=2.2;y*=2.2;amp*=.5;}
  return value;
 };
 ctx.fillStyle=s.accent;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const u=(x/cols-.5)*aspect*3,v=(y/rows-.5)*3,warp=fbm(u+.5*Math.cos(p),v+.5*Math.sin(p));
  const value=Math.min(.95,fbm(u+warp,v+warp)*1.5);
  if(value>(BAYER[(y%8)*8+x%8]+.5)/64)ctx.fillRect(x*cw,y*ch,Math.ceil(cw),Math.ceil(ch));
 }
};

const dotGrid:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),cell=unit/17,cx=w*(.5+.22*Math.cos(p)),cy=h*(.5+.22*Math.sin(p));
 ctx.fillStyle=s.accent;
 for(let y=cell*.5;y<h;y+=cell)for(let x=cell*.5;x<w;x+=cell){
  const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy),energy=Math.exp(-((d/unit)**2)*12),wave=Math.sin(d/unit*16-p)*energy;
  const pull=unit*.025*wave/(d||1),px=x+dx*pull,py=y+dy*pull;
  ctx.globalAlpha=.2+.8*energy;ctx.beginPath();ctx.arc(px,py,unit*(.0025+.003*energy),0,TAU);ctx.fill();
 }
};

const rippleGrid:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),cell=unit/15;
 const bend=(x:number,y:number)=>{
  const dx=(x-w/2)/unit,dy=(y-h/2)/unit,d=Math.hypot(dx,dy),wave=Math.sin(d*20-p)*Math.exp(-d*.9)*.025/(d||1);
  return [x+dx*wave*unit,y+dy*wave*unit];
 };
 ctx.strokeStyle=s.accent;ctx.lineWidth=Math.max(.7,unit*.001);ctx.globalAlpha=.65;
 for(let x=-cell;x<=w+cell;x+=cell){
  ctx.beginPath();for(let i=0;i<=96;i++){const [px,py]=bend(x,(i/96)*(h+2*cell)-cell);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
 }
 for(let y=-cell;y<=h+cell;y+=cell){
  ctx.beginPath();for(let i=0;i<=96;i++){const [px,py]=bend((i/96)*(w+2*cell)-cell,y);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
 }
};

const waves:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),cell=unit/22,ox=Math.cos(p)*.5,oy=Math.sin(p)*.5;
 ctx.strokeStyle=s.accent;ctx.lineWidth=Math.max(.6,unit*.0012);
 for(let x=-cell*2;x<w+cell*2;x+=cell){
  ctx.globalAlpha=.3+.35*(.5+.5*Math.sin(x/unit*4));ctx.beginPath();
  for(let i=0;i<=96;i++){
   const y=i/96*(h+unit*.1)-unit*.05,n=perlin(x/unit*1.8+ox,y/unit*1.8+oy);
   const px=x+n*unit*.12,py=y+perlin(y/unit+ox,x/unit+oy)*unit*.035;
   i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }ctx.stroke();
 }
};

// PixelSnow's snowflake atlas motif, five depth levels and seeded initial layout.
const FLAKE=['....x....','.x..o..x.','..o.o.o..','...ooo...','xooo@ooox','...ooo...','..o.o.o..','.x..o..x.','....x....'];
const random=seededRandom(38017);
const SNOW=Array.from({length:180},()=>({x:random(),y:random(),level:Math.floor(random()*5),seed:random()*TAU}));
const snow:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h),time=p/TAU;
 ctx.fillStyle=s.accent;
 for(const flake of SNOW){
  const level=flake.level,pixel=unit/340*(.45+level*.2),size=pixel*9;
  const x=fract(flake.x+.025*Math.sin(p+flake.seed))*(w+size*2)-size;
  const y=fract(flake.y+time*(level<3?1:2))*(h+size*2)-size;
  const light=.3+level*.13,twinkle=.85+.15*Math.sin(p+flake.seed);
  if(level<2){ctx.globalAlpha=light*twinkle;ctx.fillRect(x,y,Math.max(1,pixel*2),Math.max(1,pixel*2));continue;}
  for(let row=0;row<9;row++)for(let col=0;col<9;col++){
   const mark=FLAKE[row][col];if(mark==='.')continue;
   ctx.globalAlpha=light*twinkle*(mark==='x'?.45:mark==='o'?.75:1);
   ctx.fillRect(Math.round(x+col*pixel),Math.round(y+row*pixel),Math.ceil(pixel),Math.ceil(pixel));
  }
 }
};

const floating:Scene=(ctx,w,h,p,s)=>{
 const unit=Math.min(w,h);
 ctx.lineWidth=Math.max(.75,unit*.0017);ctx.shadowColor=s.accent;ctx.shadowBlur=unit*.009;
 const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,s.accent);gradient.addColorStop(.5,mix(s.accent,'#ffffff',.4));gradient.addColorStop(1,s.accent);ctx.strokeStyle=gradient;
 for(let group=0;group<3;group++)for(let line=0;line<10;line++){
  ctx.globalAlpha=.25+.55*(1-line/13);ctx.beginPath();
  for(let i=0;i<=160;i++){
   const x=i/160*w,q=x/unit*3,rotate=(group-1)*.25,angle=rotate*Math.log(Math.abs(q)+1);
   const rx=q*Math.cos(angle),spread=(line-4.5)*unit*.012;
   const y=h*(.23+group*.27)+spread+unit*(.12*Math.sin(rx+p+group*1.7)+.07*Math.cos(rx*1.5-p+line*.025));
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }ctx.stroke();
 }
};

const SCENES:Record<string,Scene>={orb,lightning,dither,'dot-grid':dotGrid,'ripple-grid':rippleGrid,'waves-lines':waves,'pixel-snow':snow,'floating-lines':floating};
export function createCanvasBackdrop(state:Palette&{backdrop:string},width:number,height:number){
 const scene=Object.hasOwn(SCENES,state.backdrop)?SCENES[state.backdrop]:undefined;
 if(!scene)return null;
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));canvas.dataset.backend='canvas';
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 let disposed=false,lastTime:number|undefined;
 return {canvas,draw(milliseconds:number){
  if(disposed)return;
  const time=state.backdropMotion?Math.max(0,milliseconds)%(6000*tempo):0;
  if(time===lastTime)return;lastTime=time;
  ctx.save();ctx.fillStyle=state.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  scene(ctx,canvas.width,canvas.height,time/(6000*tempo)*TAU,state);ctx.restore();
 },dispose(){disposed=true;}};
}
