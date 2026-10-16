/* Adapted from React Bits, Copyright (c) 2026 David Haz.
 * MIT + Commons Clause: public/licenses/react-bits.txt.
 * Sources: src/ts-default/Backgrounds/{Iridescence,Threads,ColorBends} in
 * https://github.com/DavidHDev/react-bits
 * Gzaas adaptations: two-color palettes, periodic explicit time, CPU rendering,
 * no pointer input in the renderer, so sharing and export reproduce the design.
 * AnimatedBackdrop adds a pointer response only to the live view.
 */
import {createShaderRenderer,createSilkRenderer,type ShaderPattern,type Palette} from './silk-renderer';
import {extraPatterns} from './react-bits-patterns';
import {createCanvasBackdrop} from './react-bits-canvas';
import {morePatterns} from './react-bits-more-patterns';
import {createMoreCanvasBackdrop} from './react-bits-more-canvas';
import {perlin} from './react-bits-noise';

const header=`precision highp float;
uniform vec2 resolution;
uniform vec3 baseColor;
uniform vec3 accentColor;
uniform float phase;
`;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const iridescence:ShaderPattern={softwareSize:320,fragment:header+`
void main(){
 vec2 uv=(gl_FragCoord.xy/resolution*2.0-1.0)*resolution/min(resolution.x,resolution.y);
 float time=2.0*sin(phase);
 uv+=0.12*vec2(cos(phase)-1.0,sin(phase));
 float d=-time*0.5,a=0.0;
 for(int i=0;i<8;i++){
  float fi=float(i);
  a+=cos(fi-d-a*uv.x);
  d+=sin(uv.y*fi+a);
 }
 d+=time*0.5;
 vec3 col=vec3(cos(uv*vec2(d,a))*0.6+0.4,cos(a+d)*0.5+0.5);
 col=cos(col*cos(vec3(d,a,2.5))*0.5+0.5);
 col=clamp((col-0.45)*1.8,0.0,1.0);
 gl_FragColor=vec4(mix(baseColor*0.65,accentColor,col),1.0);
}`,sample(u,v,phase,aspect,base,accent){
 const x=(u*2-1)*Math.max(1,aspect)+.12*(Math.cos(phase)-1),y=(v*2-1)*Math.max(1,1/aspect)+.12*Math.sin(phase),time=2*Math.sin(phase);
 let d=-time*.5,a=0;
 for(let i=0;i<8;i++){a+=Math.cos(i-d-a*x);d+=Math.sin(y*i+a);}
 d+=time*.5;
 const col=[Math.cos(x*d)*.6+.4,Math.cos(y*a)*.6+.4,Math.cos(a+d)*.5+.5],angles=[d,a,2.5];
 return col.map((c,i)=>{const n=clamp((Math.cos(c*Math.cos(angles[i])*.5+.5)-.45)*1.8);return base[i]*.65*(1-n)+accent[i]*n;});
}};

const colorBends:ShaderPattern={softwareSize:320,fragment:header+`
void main(){
 vec2 p=gl_FragCoord.xy/resolution*2.0-1.0;
 vec2 q=vec2(-p.y*resolution.x/resolution.y,p.x);
 q/=0.5+0.2*dot(q,q);
 q+=0.2*cos(phase)-7.56;
 float time=0.8*sin(phase);
 vec2 weights=vec2(0.0);
 for(int i=0;i<2;i++){
  q-=0.01;
  vec2 r=sin(1.5*q.yx+2.0*cos(q));
  float m=length(r+sin(5.0*r.y-3.0*time+float(i))/4.0);
  float w=1.0-exp(-6.0/exp(6.0*m));
  if(i==0)weights.x=w;else weights.y=w;
 }
 vec3 col=baseColor*(0.45+0.55*weights.y)+accentColor*weights.x*0.9;
 gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`,sample(u,v,phase,aspect,base,accent){
 let x=-(v*2-1)*aspect,y=u*2-1;
 const divisor=.5+.2*(x*x+y*y),offset=.2*Math.cos(phase)-7.56,time=.8*Math.sin(phase);
 x=x/divisor+offset;y=y/divisor+offset;
 const weights:number[]=[];
 for(let i=0;i<2;i++){
  x-=.01;y-=.01;
  const rx=Math.sin(1.5*y+2*Math.cos(x)),ry=Math.sin(1.5*x+2*Math.cos(y)),wave=Math.sin(5*ry-3*time+i)/4;
  weights.push(1-Math.exp(-6/Math.exp(6*Math.hypot(rx+wave,ry+wave))));
 }
 return base.map((c,i)=>clamp(c*(.45+.55*weights[1])+accent[i]*weights[0]*.9));
}};

// Port of Threads' Perlin2D lattice noise. Geometry is inexpensive to draw
// directly in Canvas: thumbnails, preview and exports need no GPU context.
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function createThreadsRenderer(state:Palette,width:number,height:number){
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));
 canvas.dataset.backend='canvas';
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const w=canvas.width,h=canvas.height,tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 let lastTime:number|undefined,disposed=false;
 return {canvas,draw(milliseconds:number){
  if(disposed)return;
  const time=state.backdropMotion?Math.max(0,milliseconds)%(6000*tempo):0;
  if(time===lastTime)return;lastTime=time;
  const phase=time/(6000*tempo)*Math.PI*2,timeScaled=.7*Math.sin(phase),shift=.4*(Math.cos(phase)-1);
  ctx.globalAlpha=1;ctx.fillStyle=state.bg;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle=state.accent;ctx.lineJoin='round';ctx.lineCap='round';
  for(let i=0;i<40;i++){
   const perc=i/40,split=.08+perc*.28;
   ctx.globalAlpha=.85*(1-perc*.65);ctx.lineWidth=Math.max(.5,h*.003*(1-perc*.6));ctx.beginPath();
   for(let step=0;step<=180;step++){
    const x=step/180,amp=smooth(split,.7,x)*.5;
    const n1=perlin(timeScaled*2.5+shift,(x+perc)*2.5),n2=perlin(timeScaled*3.5+shift,(x+timeScaled)*3.5)/1.5;
    const y=.5+(perc-.5)*.55+(n1*(1-x*.3)+n2*x*.3)/2*amp;
    if(!step)ctx.moveTo(x*w,y*h);else ctx.lineTo(x*w,y*h);
   }
   ctx.stroke();
  }
  ctx.globalAlpha=1;
 },dispose(){disposed=true;}};
}

export function createReactBitsRenderer(state:Palette&{backdrop:string},width:number,height:number,software=false){
 switch(state.backdrop){
  case 'silk':return createSilkRenderer(state,width,height,software);
  case 'threads':return createThreadsRenderer(state,width,height);
  case 'iridescence':return createShaderRenderer(state,width,height,software,iridescence);
  case 'color-bends':return createShaderRenderer(state,width,height,software,colorBends);
  default:{
   const canvas=createCanvasBackdrop(state,width,height)??createMoreCanvasBackdrop(state,width,height);
   if(canvas)return canvas;
   const pattern=extraPatterns[state.backdrop]??morePatterns[state.backdrop];
   if(pattern)return createShaderRenderer(state,width,height,software,pattern);
   throw Error('Fondo no compatible.');
  }
 }
}
