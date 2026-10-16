import {useEffect,useRef} from 'react';
import type {Poster} from './render';
import type {createReactBitsRenderer} from './react-bits-renderer';

type Props={state:Poster;width:number;height:number;paused?:boolean;clock?:()=>number;thumbnail?:boolean};
export function AnimatedBackdrop({state,width,height,paused=false,clock,thumbnail=false}:Props){
 const host=useRef<HTMLDivElement>(null),pausedRef=useRef(paused),refresh=useRef(()=>{}),elapsed=useRef(0);
 pausedRef.current=paused;
 const {bg,accent,pace,backdropMotion,backdrop}=state;
 useEffect(()=>{
  const container=host.current;if(!container)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let active=true,visible=true,request=0,last=0,renderer:ReturnType<typeof createReactBitsRenderer>|undefined,glow:HTMLDivElement|undefined;
  let pointerInside=false,targetX=0,targetY=0,pointerX=0,pointerY=0,pointerStrength=0;
  const moving=()=>!thumbnail&&backdropMotion&&!pausedRef.current&&!media.matches&&!document.hidden&&visible;
  function draw(){renderer?.draw(media.matches?0:clock?.()??elapsed.current);}
  function movePointer(event:PointerEvent){
   if(event.pointerType==='touch')return;
   const rect=container!.getBoundingClientRect();
   pointerInside=event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
   if(!pointerInside||!rect.width||!rect.height)return;
   targetX=(event.clientX-rect.left)/rect.width*2-1;
   targetY=(event.clientY-rect.top)/rect.height*2-1;
  }
  function resetPointer(){pointerInside=false;}
  function paintPointer(){
   if(!renderer||!glow)return;
   if(!moving()){pointerX=0;pointerY=0;pointerStrength=0;}
   else{
    pointerX+=( (pointerInside?targetX:0)-pointerX)*.18;
    pointerY+=( (pointerInside?targetY:0)-pointerY)*.18;
    pointerStrength+=((pointerInside?1:0)-pointerStrength)*.18;
   }
   renderer.canvas.style.transform=`translate3d(${-pointerX*1.8*pointerStrength}%,${-pointerY*1.8*pointerStrength}%,0) scale(${1+.055*pointerStrength})`;
   glow.style.transform=`translate3d(${pointerX*33}%,${pointerY*33}%,0)`;
   glow.style.opacity=String(pointerStrength);
  }
  function tick(now:number){
   request=0;if(!active||!moving())return;
   const fps=renderer?.canvas.dataset.backend==='software'?15:30;
   if(last&&now-last<1000/fps-1){request=requestAnimationFrame(tick);return;}
   elapsed.current+=last?Math.min(now-last,100):0;last=now;draw();paintPointer();
   request=requestAnimationFrame(tick);
  }
  function update(){
   cancelAnimationFrame(request);request=0;last=0;
   if(!renderer)return;
   draw();paintPointer();if(moving())request=requestAnimationFrame(tick);
  }
  refresh.current=update;
  media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  if(!thumbnail&&backdropMotion){window.addEventListener('pointermove',movePointer,{passive:true});window.addEventListener('blur',resetPointer);}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);update();});observer.observe(container);
  const ratio=thumbnail?1:Math.min(window.devicePixelRatio||1,1.5,1200/Math.max(width,height));
  import('./react-bits-renderer').then(({createReactBitsRenderer})=>{
   if(!active)return;
   renderer=createReactBitsRenderer({bg,accent,pace,backdrop,backdropMotion:!thumbnail&&backdropMotion},width*ratio,height*ratio,thumbnail);
   renderer.canvas.className='backdrop-canvas';renderer.canvas.dataset.backdrop=backdrop;renderer.canvas.style.cssText='display:block;width:100%;height:100%';
   if(!thumbnail&&backdropMotion){
    glow=document.createElement('div');glow.className='backdrop-pointer-glow';
    glow.style.cssText=`position:absolute;inset:-25%;pointer-events:none;opacity:0;background:radial-gradient(circle,rgba(255,255,255,.14) 0%,${accent}22 15%,transparent 42%)`;
    container.replaceChildren(renderer.canvas,glow);
   }else container.replaceChildren(renderer.canvas);
   update();
  }).catch(()=>{/* The base color remains visible if the renderer cannot load. */});
  return()=>{
   active=false;cancelAnimationFrame(request);refresh.current=()=>{};observer.disconnect();
   media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);
   window.removeEventListener('pointermove',movePointer);window.removeEventListener('blur',resetPointer);
   renderer?.dispose();container.replaceChildren();
  };
 },[bg,accent,pace,backdropMotion,backdrop,width,height,clock,thumbnail]);
 useEffect(()=>refresh.current(),[paused]);
 return <foreignObject width={width} height={height} pointerEvents="none"><div ref={host} style={{position:'relative',overflow:'hidden',width:'100%',height:'100%',background:bg}}/></foreignObject>;
}
