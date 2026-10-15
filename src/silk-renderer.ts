/* Silk fold equation adapted from React Bits by David Haz.
 * https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Silk/Silk.tsx
 * MIT + Commons Clause; see public/licenses/react-bits.txt.
 * Gzaas adaptation: two colors, periodic time, explicit frame rendering and CPU fallback.
 */
import type {Poster} from './render';

export type Palette = Pick<Poster,'bg'|'accent'|'pace'|'backdropMotion'>;
const vertex = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform vec3 baseColor;
uniform vec3 accentColor;
uniform float phase;
void main(){
 vec2 tex=gl_FragCoord.xy/resolution;
 float time=3.0*sin(phase);
 tex.x+=0.035*(cos(phase)-1.0);
 tex.y+=0.03*sin(8.0*tex.x-time);
 float pattern=0.6+0.4*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*time)+sin(20.0*(tex.x+tex.y-0.1*time)));
 float n=clamp((pattern-0.2)/0.8,0.0,1.0);
 float fold=pow(n,1.7);
 float sheen=0.12*pow(n,8.0);
 vec3 color=mix(baseColor*0.65,accentColor,0.08+0.72*fold)+sheen*accentColor;
 gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
}`;
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);

function gpuPainter(width:number,height:number,base:number[],accent:number[],fragmentSource:string){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 if(!gl)return null;
 const shaders:WebGLShader[]=[];
 let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
 const dispose=()=>{
  if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);
  for(const shader of shaders)gl.deleteShader(shader);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
 };
 try{
  for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragmentSource]] as const){
   const shader=gl.createShader(kind);if(!shader)throw Error('Silk shader');
   shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Silk shader');
  }
  program=gl.createProgram();if(!program)throw Error('Silk program');
  for(const shader of shaders)gl.attachShader(program,shader);
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Silk program');
  gl.useProgram(program);
  buffer=gl.createBuffer();if(!buffer)throw Error('Silk buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  gl.uniform2f(gl.getUniformLocation(program,'resolution'),width,height);
  gl.uniform3fv(gl.getUniformLocation(program,'baseColor'),base);
  gl.uniform3fv(gl.getUniformLocation(program,'accentColor'),accent);
  const phaseLocation=gl.getUniformLocation(program,'phase');
  gl.viewport(0,0,width,height);
  return {canvas,dispose,draw(phase:number){
   if(gl.isContextLost())return false;
   gl.uniform1f(phaseLocation,phase);gl.drawArrays(gl.TRIANGLES,0,3);
   return !gl.isContextLost();
  }};
 }catch{dispose();return null;}
}

export type ShaderPattern={
 fragment:string;
 sample:(u:number,v:number,phase:number,aspect:number,base:number[],accent:number[])=>number[];
 softwareSize:number;
};
const silkPattern:ShaderPattern={fragment,softwareSize:480,sample(u,v,phase,_aspect,base,accent){
 const time=3*Math.sin(phase);u+=.035*(Math.cos(phase)-1);v+=.03*Math.sin(8*u-time);
 const n=.5+.5*Math.sin(5*(u+v+Math.cos(3*u+5*v)+.02*time)+Math.sin(20*(u+v-.1*time)));
 const mix=.08+.72*n**1.7,sheen=.12*n**8;
 return base.map((value,c)=>value*.65*(1-mix)+accent[c]*(mix+sheen));
}};

// CPU thumbnails and fallback evaluate the same equations as the GPU shaders.
function softwarePainter(width:number,height:number,base:number[],accent:number[],pattern:ShaderPattern){
 const canvas=document.createElement('canvas'),scale=Math.min(1,pattern.softwareSize/Math.max(width,height));
 const w=canvas.width=Math.max(1,Math.round(width*scale)),h=canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const image=ctx.createImageData(w,h);
 return {canvas,draw(phase:number){
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const color=pattern.sample((x+.5)/w,1-(y+.5)/h,phase,width/height,base,accent),index=(y*w+x)*4;
   for(let c=0;c<3;c++)image.data[index+c]=255*color[c];
   image.data[index+3]=255;
  }
  ctx.putImageData(image,0,0);
 }};
}

/** No wall clock or RAF here: preview, PNG and GIF all draw explicit times. */
export function createShaderRenderer(state:Palette,width:number,height:number,software:boolean,pattern:ShaderPattern){
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const base=rgb(state.bg),accent=rgb(state.accent);
 let gpu=software?null:gpuPainter(canvas.width,canvas.height,base,accent,pattern.fragment);
 let cpu:ReturnType<typeof softwarePainter>|undefined,lastTime:number|undefined,disposed=false;
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 return {canvas,
  draw(milliseconds:number){
   if(disposed)return;
   const time=state.backdropMotion?Math.max(0,milliseconds)%(6000*tempo):0;
   if(time===lastTime)return;
   const phase=time/(6000*tempo)*Math.PI*2;
   if(gpu&&!gpu.draw(phase)){gpu.dispose();gpu=null;}
   if(!gpu){cpu??=softwarePainter(canvas.width,canvas.height,base,accent,pattern);cpu.draw(phase);}
   canvas.dataset.backend=gpu?'webgl':'software';
   ctx.drawImage((gpu??cpu)!.canvas,0,0,canvas.width,canvas.height);lastTime=time;
  },
  dispose(){if(disposed)return;disposed=true;gpu?.dispose();gpu=null;cpu=undefined;}
 };
}

export function createSilkRenderer(state:Palette,width:number,height:number,software=false){
 return createShaderRenderer(state,width,height,software,silkPattern);
}
