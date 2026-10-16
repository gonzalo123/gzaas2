import {useLayoutEffect,useRef} from 'react';
import {waitFonts,type Poster} from './render';
import {TEXT_DURATION,textTempo} from './text-motion.mjs';

export function ReactBitsTextStage({state,width,height,paused,replay,onError,particleDuration,particleClock}:{state:Poster;width:number;height:number;paused:boolean;replay:number;particleDuration?:number;particleClock?:()=>number;onError?:(message:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),pausedRef=useRef(paused),refresh=useRef(()=>{});
 const clock=useRef({state,replay,elapsed:0});pausedRef.current=paused;
 if(clock.current.state!==state||clock.current.replay!==replay)clock.current={state,replay,elapsed:0};
 useLayoutEffect(()=>{
  const element=canvas.current;if(!element||!width||!height)return;
  const ctx=element.getContext('2d');if(!ctx)return;
  const dpr=Math.min(devicePixelRatio||1,2,2048/Math.max(width,height));
  element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let alive=true,request=0,last=0,renderer:ReturnType<typeof import('./react-bits-text-renderer')['createTextRenderer']>|undefined;
  const duration=particleDuration??TEXT_DURATION*textTempo(state.pace);
  const draw=()=>{if(!renderer)return;renderer.draw(particleClock?.()??clock.current.elapsed,media.matches);ctx.clearRect(0,0,element.width,element.height);ctx.drawImage(renderer.canvas,0,0);};
  const needsFrame=()=>alive&&!!renderer&&!pausedRef.current&&!document.hidden&&!media.matches&&(state.repeat||clock.current.elapsed<duration);
  const tick=(now:number)=>{
   request=0;if(!needsFrame())return;
   if(last&&now-last<1000/30-1){request=requestAnimationFrame(tick);return;}
   clock.current.elapsed+=last?Math.min(now-last,80):0;last=now;draw();
   if(needsFrame())request=requestAnimationFrame(tick);
  };
  const update=()=>{cancelAnimationFrame(request);last=0;draw();if(needsFrame())request=requestAnimationFrame(tick);};
  refresh.current=update;media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  Promise.all([waitFonts(state),import('./react-bits-text-renderer')]).then(([,module])=>{
   if(!alive)return;renderer=module.createTextRenderer(state,element.width,element.height,particleDuration);update();
  }).catch(()=>{if(alive)onError?.('No se pudo animar el texto. Prueba a recargar.');});
  return()=>{alive=false;cancelAnimationFrame(request);renderer?.dispose();refresh.current=()=>{};media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
 },[state,width,height,replay,onError,particleDuration,particleClock]);
 useLayoutEffect(()=>refresh.current(),[paused]);
 return <canvas ref={canvas} className="react-bits-text-canvas" aria-hidden="true"/>;
}
