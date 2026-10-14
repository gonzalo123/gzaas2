import {sampleTargets,seededRandom,particleTempo} from './particles.mjs';

export const GALAXY_DURATION=12000;
export const isGalaxy=animation=>animation==='particle-galaxy';
export const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function galaxyTime(elapsed,pace='normal',duration,repeat=false,reduced=false){
 if(reduced)return GALAXY_DURATION;
 const time=Math.max(0,Number.isFinite(elapsed)?elapsed:0)*GALAXY_DURATION/(duration??GALAXY_DURATION*particleTempo(pace));
 return repeat?time%GALAXY_DURATION:Math.min(time,GALAXY_DURATION);
}
// Capability/viewport limits, never UA sniffing. Exports use the canonical high tier.
export function galaxyBudget(quality='auto',width=800,height=600,cores=8){
 if(quality==='high')return 6000;
 if(quality==='low')return 2400;
 return cores<=4||Math.min(width,height)<480?3000:4800;
}
/** Three samples per opaque pixel representative: front, side/interior and back.
 * XY never jitters out of the mask, so counters and fine strokes survive.
 */
export function createGalaxy(rgba,width,height,budget=4800,seed=1,thickness=24){
 const targets=sampleTargets(rgba,width,height,budget,seed),random=seededRandom(seed);
 const opaque=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&rgba[(Math.floor(y)*width+Math.floor(x))*4+3]>120;
 const edges=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(opaque(x,y)&&(!opaque(x-1,y)||!opaque(x+1,y)||!opaque(x,y-1)||!opaque(x,y+1)))edges.push(y*width+x);
 const count=targets.length*3,home=new Float32Array(count*3),cloud=new Float32Array(count*3),phase=new Float32Array(count),sizes=new Float32Array(count),rim=new Float32Array(count);
 for(let i=0;i<count;i++){
  const target=targets[Math.floor(i/3)],layer=i%3,j=i*3;
  // Break up the sampling grid without ever moving a sample outside the glyph.
  let px=target.x,py=target.y;
  for(let attempt=0;attempt<4;attempt++){
   const x=target.x+(random()-.5)*target.radius*1.8,y=target.y+(random()-.5)*target.radius*1.8;
   if(x>=0&&x<width&&y>=0&&y<height&&rgba[(Math.floor(y)*width+Math.floor(x))*4+3]>120){px=x;py=y;break;}
  }
  // Trace both outer and inner walls across the full thickness.
  if(layer===1&&edges.length&&random()<.8){const edge=edges[Math.floor(random()*edges.length)];px=edge%width+.5;py=Math.floor(edge/width)+.5;rim[i]=1;}
  else rim[i]=!opaque(px-2,py)||!opaque(px+2,py)||!opaque(px,py-2)||!opaque(px,py+2)?1:0;
  home[j]=px-width/2;home[j+1]=height/2-py;
  home[j+2]=layer===0?thickness/2:layer===2?-thickness/2:(random()-.5)*thickness;
  const radius=Math.sqrt(random()),arm=Math.floor(random()*3),angle=arm*Math.PI*2/3+radius*5+(random()-.5)*.65;
  cloud[j]=Math.cos(angle)*radius*width*1.25;cloud[j+1]=Math.sin(angle)*radius*height*.95;
  cloud[j+2]=(random()-.42)*height*2.6;
  phase[i]=random();sizes[i]=target.radius*(layer===0?.9:layer===1?.62:.58);
 }
 return {home,cloud,phase,sizes,rim,positions:new Float32Array(home),count,width,height};
}
// Analytic, seekable CPU sampling into a persistent GPU buffer; no point allocations.
export function sampleGalaxy(field,time,repeat=false,burst=0){
 const t=Math.max(0,time)/1000,release=repeat?smooth((t-10.6)/1.4):0;
 for(let i=0;i<field.count;i++){
  const j=i*3,p=field.phase[i],gather=smooth((t-1.8-p*.65)/3.5),scatter=Math.max(release,burst);
  const f=gather*(1-scatter),drift=(1-f)*Math.sin(Math.PI*Math.min(t,12)/12);
  const angle=(1-gather)*t*.24+p*6.283,c=Math.cos(angle),s=Math.sin(angle);
  const x=field.cloud[j],y=field.cloud[j+1],z=field.cloud[j+2];
  // Zero drift at both ends gives a continuous deterministic loop seam.
  const cx=x+(-y*s+x*(c-1))*.22*drift,cy=y+(x*s+y*(c-1))*.22*drift;
  const breath=Math.sin(t*1.7+p*12)*.22*smooth((t-5.5)/1.5)*(1-smooth((t-10)/2));
  field.positions[j]=cx*(1-f)+field.home[j]*f;
  field.positions[j+1]=cy*(1-f)+field.home[j+1]*f;
  field.positions[j+2]=(z+Math.sin(t+p*6)*35*drift)*(1-f)+(field.home[j+2]+breath)*f;
 }
 return field.positions;
}
export function galaxyCamera(time,motion=true,repeat=false){
 if(!motion)return {yaw:-.22,pitch:.09,distance:1.06};
 const t=Math.max(0,time)/1000,reveal=smooth((t-1)/5),orbit=smooth((t-6)/2)*(1-smooth((t-8)/2));
 const release=repeat?smooth((t-10.6)/1.4):0;
 return {yaw:(.3*(1-reveal)-.22*reveal+orbit*.48)*(1-release)+.3*release,
  pitch:(-.12*(1-reveal)+.09*reveal+orbit*.075)*(1-release)-.12*release,
  distance:(.68+.38*reveal)*(1-release)+.68*release};
}
export const galaxyBurst=age=>age<0||age>=2600?0:Math.sin(Math.PI*Math.min(1,age/2600))**2*.85;
