import {useI18n} from './useI18n';
import {useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ParticleStage} from './ParticleStage';
import {waitFonts,type Poster} from './render';
import {galaxyTime,galaxyBurst} from './galaxy.mjs';
import type {createGalaxyRenderer} from './galaxy-renderer';

type Props={state:Poster;width:number;height:number;paused:boolean;replay:number;particleDuration?:number;particleClock?:()=>number;onError?:(message:string)=>void};
export function GalaxyStage({state,width,height,paused,replay,particleDuration,particleClock,onError}:Props){
 const {t}=useI18n();
 const canvas=useRef<HTMLDivElement>(null),pausedRef=useRef(paused),refresh=useRef(()=>{});
 const playback=useRef({state,replay,elapsed:0});
 const [fallback,setFallback]=useState(false),[ready,setReady]=useState(false);
 pausedRef.current=paused;
 const fallbackState=useMemo(()=>({...state,animation:'particle-assemble'}),[state]);
 useLayoutEffect(()=>{
  const host=canvas.current;if(!host)return;
  // A disposed context can dispatch its loss event asynchronously. Give each
  // lifetime a fresh canvas, so replay/resize cannot reuse that lost context.
  const element=document.createElement('canvas');
  element.className=`particle-canvas galaxy-canvas${state.particleInteraction?' galaxy-interactive':''}`;
  host.append(element);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  if(playback.current.state!==state||playback.current.replay!==replay)playback.current={state,replay,elapsed:0};
  let active=true,renderer:ReturnType<typeof createGalaxyRenderer>|undefined,request=0,last=0,elapsed=playback.current.elapsed,lost=false,burstAt=-Infinity;
  let yaw=0,pitch=0,zoom=1,vx=0,vy=0,lastPinch=0,dragged=false,downAt=0,startX=0,startY=0;
  const pointers=new Map<number,{x:number;y:number}>();
  const nowTime=()=>galaxyTime(particleClock?.()??elapsed,state.pace,particleDuration,state.repeat,media.matches);
  const canInteract=()=>state.particleInteraction&&!media.matches&&!pausedRef.current&&!document.hidden&&!particleClock&&nowTime()>=6500;
  const clearPointers=()=>{for(const id of pointers.keys())if(element.hasPointerCapture(id))element.releasePointerCapture(id);pointers.clear();vx=vy=0;lastPinch=0;};
  function draw(){
   if(!renderer||lost)return;
   renderer.draw(nowTime(),media.matches,{yaw:media.matches?0:yaw,pitch:media.matches?0:pitch,zoom:media.matches?1:zoom,burst:media.matches?0:galaxyBurst(elapsed-burstAt)});
  }
  function tick(now:number){
   request=0;if(!active||lost||!renderer||pausedRef.current||document.hidden||media.matches)return;
   if(last&&now-last<1000/30-1){request=requestAnimationFrame(tick);return;}
   const dt=last?Math.min(now-last,100):0;last=now;elapsed+=dt;playback.current.elapsed=elapsed;
   if(!pointers.size){yaw=Math.max(-.3,Math.min(.3,yaw+vx*dt));pitch=Math.max(-.18,Math.min(.18,pitch+vy*dt));vx*=Math.exp(-dt/140);vy*=Math.exp(-dt/140);}
   try{draw();}catch{lost=true;setFallback(true);return;}
   // A held message uses no RAF unless an interaction still needs to settle.
   if(state.repeat||nowTime()<12000||Math.abs(vx)+Math.abs(vy)>.00001||elapsed-burstAt<2600)request=requestAnimationFrame(tick);
  }
  function update(){
   cancelAnimationFrame(request);request=0;last=0;
   if(pausedRef.current||document.hidden||media.matches)clearPointers();
   if(!renderer||lost)return;
   try{draw();}catch{lost=true;setFallback(true);return;}
   if(!pausedRef.current&&!document.hidden&&!media.matches)request=requestAnimationFrame(tick);
  }
  refresh.current=update;
  const down=(e:PointerEvent)=>{
   if(!canInteract()||(e.pointerType==='touch'&&!element.closest('.viewer'))||e.button!==0)return;
   if(!pointers.size){dragged=false;downAt=performance.now();startX=e.clientX;startY=e.clientY;}
   else dragged=true;
   pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});element.setPointerCapture(e.pointerId);vx=vy=0;
  };
  const move=(e:PointerEvent)=>{
   const old=pointers.get(e.pointerId);if(!old||!canInteract())return;
   const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(Math.hypot(e.clientX-startX,e.clientY-startY)>6)dragged=true;
   if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch&&distance)zoom=Math.max(.8,Math.min(1.7,zoom*lastPinch/distance));lastPinch=distance;}
   else{yaw=Math.max(-.3,Math.min(.3,yaw+dx*.003));pitch=Math.max(-.18,Math.min(.18,pitch+dy*.003));vx=dx*.00008;vy=dy*.00008;}
   update();
  };
  const up=(e:PointerEvent)=>{
   if(!pointers.has(e.pointerId))return;
   pointers.delete(e.pointerId);if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);lastPinch=0;
   if(e.type==='pointerup'&&!dragged&&performance.now()-downAt<450&&canInteract())burstAt=elapsed;
   if(e.type!=='pointerup')vx=vy=0;
   update();
  };
  const wheel=(e:WheelEvent)=>{if(!canInteract()||!element.closest('.viewer'))return;e.preventDefault();zoom=Math.max(.8,Math.min(1.7,zoom*Math.exp(e.deltaY*.001)));update();};
  const contextLost=(event:Event)=>{event.preventDefault();lost=true;cancelAnimationFrame(request);clearPointers();setFallback(true);};
  // Three's own restoration listener must rebuild its state before we draw,
  // including when paused/reduced-motion means there will be no next RAF.
  const restored=()=>{
   cancelAnimationFrame(request);
   request=requestAnimationFrame(()=>{request=0;if(!active)return;lost=false;setFallback(false);update();});
  };
  element.addEventListener('webglcontextlost',contextLost);element.addEventListener('webglcontextrestored',restored);
  element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',up);element.addEventListener('lostpointercapture',up);element.addEventListener('wheel',wheel,{passive:false});
  media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  setFallback(false);setReady(false);
  Promise.all([import('./galaxy-renderer'),waitFonts(state)]).then(([module])=>{
   if(!active)return;
   renderer=module.createGalaxyRenderer(state,width,height,{canvas:element});setReady(true);update();
  }).catch(()=>{if(active){setFallback(true);setReady(true);}});
  return()=>{
   active=false;cancelAnimationFrame(request);refresh.current=()=>{};clearPointers();
   media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);
   element.removeEventListener('webglcontextlost',contextLost);element.removeEventListener('webglcontextrestored',restored);
   element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',up);element.removeEventListener('lostpointercapture',up);element.removeEventListener('wheel',wheel);
   renderer?.dispose();element.remove();
  };
 },[state,width,height,replay,particleDuration,particleClock]);
 useLayoutEffect(()=>refresh.current(),[paused]);
 return <><div ref={canvas} className="galaxy-layer" style={{visibility:fallback?'hidden':'visible'}} aria-hidden="true"/>
  {(!ready||fallback)&&<ParticleStage state={fallbackState} width={width} height={height} paused={!ready||paused} replay={replay} particleDuration={particleDuration} particleClock={particleClock} onError={onError}/>}
  {fallback&&<span className="galaxy-fallback" role="status">{t("Vista 2D · WebGL no disponible")}</span>}
 </>;
}
