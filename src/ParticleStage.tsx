import {useLayoutEffect,useRef} from 'react';
import {createPosterParticles,waitFonts,type Poster} from './render';
import {drawParticles,type ParticleField} from './particle-canvas';
import {sampleParticles,stepMagnet,particlePlaybackTime,particleTempo,PARTICLE_DURATION} from './particles.mjs';

export function ParticleStage({state,width,height,paused,replay,onError,particleDuration,particleClock}:{state:Poster;width:number;height:number;paused:boolean;replay:number;particleDuration?:number;particleClock?:()=>number;onError?:(message:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),pausedRef=useRef(paused),refresh=useRef<()=>void>(()=>{});
 pausedRef.current=paused;
 useLayoutEffect(()=>{
  const element=canvas.current;if(!element||!width||!height)return;
  const ctx=element.getContext('2d');if(!ctx)return;
  const dpr=Math.min(devicePixelRatio||1,2,2048/Math.max(width,height));
  element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let alive=true,field:ParticleField|undefined,request=0,last=0,elapsed=0,moving=false,pointerDirty=false;
  let pointer:{x:number;y:number}|null=null;
  const duration=particleDuration??PARTICLE_DURATION*particleTempo(state.pace);
  const animationTime=()=>particlePlaybackTime(elapsed,state.pace,duration);
  const render=()=>{
   if(!field)return;
   ctx.clearRect(0,0,element.width,element.height);
   drawParticles(ctx,field,state,element.width,element.height,animationTime(),media.matches,false);
  };
  const needsFrame=()=>!pausedRef.current&&!document.hidden&&!media.matches&&!!field&&(state.repeat||elapsed<duration||moving||pointerDirty);
  const tick=(now:number)=>{
   request=0;if(!alive||!needsFrame())return;
   // Render at 30fps; a suspended tab cannot advance or destabilize the spring.
   if(last&&now-last<1000/30-1){request=requestAnimationFrame(tick);return;}
   const dt=last?Math.min((now-last)/1000,.05):0;last=now;
   elapsed=particleClock?particleClock():elapsed+dt*1000;
   sampleParticles(field!.particles,state.animation,animationTime(),field!.width,field!.height,state.repeat);
   pointerDirty=false;
   moving=stepMagnet(field!.particles,pointer,dt||1/30,Math.min(field!.width,field!.height)*.15);
   render();if(needsFrame())request=requestAnimationFrame(tick);
  };
  const update=()=>{
   cancelAnimationFrame(request);request=0;last=0;
   if(pausedRef.current)pointer=null;
   if(media.matches&&field){pointer=null;moving=false;for(const p of field.particles){p.offsetX=p.offsetY=p.forceVX=p.forceVY=0;}sampleParticles(field.particles,state.animation,0,field.width,field.height,false,true);render();}
   if(needsFrame())request=requestAnimationFrame(tick);
  };
  refresh.current=update;
  const move=(event:PointerEvent)=>{
   if(!field||!state.particleInteraction||media.matches||pausedRef.current)return;
   // Touch only in the full-screen viewer. No preventDefault/capture: scrolling
   // and the editor's native gestures keep ownership of touch input.
   if(event.pointerType==='touch'&&!element.closest('.viewer'))return;
   const bounds=element.getBoundingClientRect();
   pointer={x:(event.clientX-bounds.left)*field.width/bounds.width,y:(event.clientY-bounds.top)*field.height/bounds.height};
   pointerDirty=true;if(!request)update();
  };
  const leave=()=>{pointer=null;pointerDirty=true;if(!request)update();};
  const visibility=()=>{pointer=null;update();};
  element.addEventListener('pointermove',move);element.addEventListener('pointerdown',move);
  element.addEventListener('pointerleave',leave);element.addEventListener('pointerup',leave);element.addEventListener('pointercancel',leave);
  media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);
  waitFonts(state).then(()=>{
   if(!alive)return;
   field=createPosterParticles(state,width,height);
   elapsed=particleClock?.()??0;
   sampleParticles(field.particles,state.animation,animationTime(),field.width,field.height,state.repeat,media.matches);render();update();
  }).catch(()=>{if(alive)onError?.('No se pudieron dibujar las partículas. Prueba otra tipografía o recarga.');});
  return()=>{
   alive=false;cancelAnimationFrame(request);refresh.current=()=>{};
   element.removeEventListener('pointermove',move);element.removeEventListener('pointerdown',move);
   element.removeEventListener('pointerleave',leave);element.removeEventListener('pointerup',leave);element.removeEventListener('pointercancel',leave);
   media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);
  };
 },[state,width,height,replay,onError,particleDuration,particleClock]);
 useLayoutEffect(()=>refresh.current(),[paused]);
 return <canvas ref={canvas} className="particle-canvas" aria-hidden="true"/>;
}
