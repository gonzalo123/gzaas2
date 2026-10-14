import {sampleParticles,createParticles} from './particles.mjs';
import type {Poster} from './render';
export type ParticleField={particles:ReturnType<typeof createParticles>;width:number;height:number};
// Eight batches keep Canvas work bounded. A translucent larger dot is the glow;
// no per-particle shadow blur, DOM nodes, gradients, or objects per frame.
export function drawParticles(ctx:CanvasRenderingContext2D,field:ParticleField,state:Poster,width:number,height:number,time:number,settled=false,sample=true){
 const {particles}=field;
 if(sample)sampleParticles(particles,state.animation,time,field.width,field.height,state.repeat,settled);
 ctx.save();ctx.scale(width/field.width,height/field.height);
 for(let bucket=0;bucket<8;bucket++){
  ctx.fillStyle=bucket===0?state.accent:state.fg;
  for(const halo of [true,false]){
   ctx.globalAlpha=halo?.07:.78+(bucket%3)*.1;ctx.beginPath();
   for(const p of particles){if(p.bucket!==bucket)continue;const x=p.x+p.offsetX,y=p.y+p.offsetY,r=p.radius*(halo?2.2:1);ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}
   ctx.fill();
  }
 }
 ctx.restore();
}
