// Pure, browser-independent particle engine. Coordinates use a bounded mask space.
export const PARTICLE_DURATION=7000;
export const PARTICLE_LIMIT=6000;
export const isParticle=(animation)=>['particle-assemble','particle-explode','particle-vortex','particle-galaxy'].includes(animation);
export const particleTempo=(pace)=>pace==='slow'?1.45:pace==='fast'?.7:1;
// Trailer scenes compress the same full trajectory into their reading time.
/** @param {number} time @param {string} pace @param {number} [duration] */
export const particlePlaybackTime=(time,pace,duration)=>time*PARTICLE_DURATION/(duration??PARTICLE_DURATION*particleTempo(pace));
export function particleSeed(text){let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function seededRandom(seed){return()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}

/** Uniform grid with an opaque pixel representative per cell preserves thin strokes.
 * @param {ArrayLike<number>} rgba @param {number} width @param {number} height
 * @param {number} budget @param {number} seed
 */
export function sampleTargets(rgba,width,height,budget=4000,seed=1){
 budget=Math.max(1,Math.min(PARTICLE_LIMIT,Math.floor(budget)||1));
 if(width<1||height<1||rgba.length!==width*height*4)return [];
 let ink=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>120)ink++;
 if(!ink)return [];
 const step=Math.max(1,Math.sqrt(ink/budget)),random=seededRandom(seed),targets=[];
 for(let top=0;top<height;top+=step)for(let left=0;left<width;left+=step){
  let chosen=-1,best=Infinity;
  const cx=left+step*.5,cy=top+step*.5;
  for(let y=Math.ceil(top);y<Math.min(height,top+step);y++)for(let x=Math.ceil(left);x<Math.min(width,left+step);x++){
   if(rgba[(y*width+x)*4+3]<=120)continue;
   const d=(x-cx)**2+(y-cy)**2;if(d<best){best=d;chosen=y*width+x;}
  }
  if(chosen>=0)targets.push({x:chosen%width+.5,y:Math.floor(chosen/width)+.5,radius:Math.max(.65,step*.43)});
 }
 // Shuffle before limiting: never truncate the bottom/right of a message.
 for(let i=targets.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
 return targets.slice(0,budget);
}
/** @param {{x:number,y:number,radius:number}[]} targets */
export function createParticles(targets,width,height,seed){
 const random=seededRandom(seed);
 return targets.map(t=>({targetX:t.x,targetY:t.y,x:t.x,y:t.y,vx:0,vy:0,
  cloudX:random()*width,cloudY:random()*height,phase:random(),
  impulse:(.7+random()*.6),radius:t.radius*(.86+random()*.28),bucket:Math.floor(random()*8),
  offsetX:0,offsetY:0,forceVX:0,forceVY:0}));
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Analytic trajectories: any time can be sampled directly, in any order.
 * Each particle stores its own position and velocity; no per-frame allocation.
 * @param {ReturnType<typeof createParticles>} particles
 */
export function sampleParticles(particles,mode,time,width,height,repeat=false,settled=false){
 const milliseconds=Math.max(0,time),t=(repeat?milliseconds%PARTICLE_DURATION:Math.min(milliseconds,PARTICLE_DURATION))/1000;
 for(const p of particles){
  let x=p.targetX,y=p.targetY,vx=0,vy=0;
  if(!settled){
   const u=Math.max(0,t-p.phase*.42),q=Math.min(1,u/4.6),fade=1-smooth(q),df=q<1?-6*q*(1-q)/4.6:0;
   let dx=p.cloudX-p.targetX,dy=p.cloudY-p.targetY;
   if(mode==='particle-explode'){
    const e=Math.max(0,t-.65-p.phase*.22),k=3.6;
    // An impulse followed by a critically damped spring back to the glyph.
    const f=e*Math.exp(-k*e)*9*fade*p.impulse;
    const d=e>0?9*p.impulse*Math.exp(-k*e)*((1-k*e)*fade+e*df):0;
    dx=p.targetX-width/2+(p.cloudX-width/2)*.65;dy=p.targetY-height/2+(p.cloudY-height/2)*.65;
    x+=dx*f;y+=dy*f;vx=dx*d;vy=dy*d;
   }else if(mode==='particle-vortex'){
    const angle=fade*Math.PI*(2.5+p.phase),speed=df*Math.PI*(2.5+p.phase),c=Math.cos(angle),s=Math.sin(angle);
    const cx=p.cloudX-width/2,cy=p.cloudY-height/2,rx=cx*c-cy*s,ry=cx*s+cy*c;
    dx=width/2+rx-p.targetX;dy=height/2+ry-p.targetY;
    x+=dx*fade;y+=dy*fade;vx=dx*df-ry*speed*fade;vy=dy*df+rx*speed*fade;
   }else{
    const k=2.1,decay=Math.exp(-k*u),f=(1+k*u)*decay*fade,d=decay*((1+k*u)*df-k*k*u*fade);
    x+=dx*f;y+=dy*f;vx=dx*d;vy=dy*d;
   }
   // A quiet living hold, fading out at the loop seam / single-play endpoint.
   const breath=smooth((t-3.5)/1.2)*(1-smooth((t-5.7)/1.3))*.23;
   x+=Math.sin(t*2+p.phase*40)*breath;y+=Math.cos(t*1.7+p.phase*30)*breath;
   if(repeat&&mode!=='particle-explode'&&t>5.7){
    const f=smooth((t-5.7)/1.3);
    let endX=p.cloudX,endY=p.cloudY;
    if(mode==='particle-vortex'){const a=Math.PI*(2.5+p.phase),cx=p.cloudX-width/2,cy=p.cloudY-height/2;endX=width/2+cx*Math.cos(a)-cy*Math.sin(a);endY=height/2+cx*Math.sin(a)+cy*Math.cos(a);}
    x+=(endX-x)*f;y+=(endY-y)*f;
   }
  }
  p.x=x;p.y=y;p.vx=vx;p.vy=vy;
 }
}
/** Pointer displacement is separate from the reproducible timeline. Stable substeps
 * cap stalled frames; moving away restores the same analytic trajectory.
 * @param {ReturnType<typeof createParticles>} particles
 * @param {{x:number,y:number}|null} pointer
 */
export function stepMagnet(particles,pointer,deltaTime,radius=65){
 const dt=Math.max(0,Math.min(deltaTime,.05)),steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
 let active=false;
 for(const p of particles){
  for(let i=0;i<steps;i++){
   let fx=0,fy=0;
   if(pointer){const dx=p.x+p.offsetX-pointer.x,dy=p.y+p.offsetY-pointer.y,d=Math.hypot(dx,dy);
    // A soft falloff and bounded force gently part the dots without opening
    // a large hole in the letters. Scale down further for narrow posters.
    if(d<radius){const force=(1-d/radius)**2*Math.min(650,radius*9);fx=(d>0?dx/d:Math.cos(p.phase*6.28))*force;fy=(d>0?dy/d:Math.sin(p.phase*6.28))*force;}}
   p.forceVX+=(fx-95*p.offsetX-22*p.forceVX)*h;p.forceVY+=(fy-95*p.offsetY-22*p.forceVY)*h;
   p.offsetX+=p.forceVX*h;p.offsetY+=p.forceVY*h;
  }
  if(Math.abs(p.offsetX)+Math.abs(p.offsetY)+Math.abs(p.forceVX)+Math.abs(p.forceVY)>.02)active=true;
  else{p.offsetX=0;p.offsetY=0;p.forceVX=0;p.forceVY=0;}
 }
 return active;
}
