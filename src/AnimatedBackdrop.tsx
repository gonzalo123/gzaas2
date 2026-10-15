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
  let active=true,visible=true,request=0,last=0,renderer:ReturnType<typeof createReactBitsRenderer>|undefined;
  const moving=()=>!thumbnail&&backdropMotion&&!pausedRef.current&&!media.matches&&!document.hidden&&visible;
  function draw(){renderer?.draw(media.matches?0:clock?.()??elapsed.current);}
  function tick(now:number){
   request=0;if(!active||!moving())return;
   const fps=renderer?.canvas.dataset.backend==='software'?15:30;
   if(last&&now-last<1000/fps-1){request=requestAnimationFrame(tick);return;}
   elapsed.current+=last?Math.min(now-last,100):0;last=now;draw();
   request=requestAnimationFrame(tick);
  }
  function update(){
   cancelAnimationFrame(request);request=0;last=0;
   if(!renderer)return;
   draw();if(moving())request=requestAnimationFrame(tick);
  }
  refresh.current=update;
  media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);update();});observer.observe(container);
  const ratio=thumbnail?1:Math.min(window.devicePixelRatio||1,1.5,1200/Math.max(width,height));
  import('./react-bits-renderer').then(({createReactBitsRenderer})=>{
   if(!active)return;
   renderer=createReactBitsRenderer({bg,accent,pace,backdrop,backdropMotion:!thumbnail&&backdropMotion},width*ratio,height*ratio,thumbnail);
   renderer.canvas.className='backdrop-canvas';renderer.canvas.dataset.backdrop=backdrop;renderer.canvas.style.cssText='display:block;width:100%;height:100%';
   container.replaceChildren(renderer.canvas);update();
  }).catch(()=>{/* The base color remains visible if the renderer cannot load. */});
  return()=>{
   active=false;cancelAnimationFrame(request);refresh.current=()=>{};observer.disconnect();
   media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);
   renderer?.dispose();container.replaceChildren();
  };
 },[bg,accent,pace,backdropMotion,backdrop,width,height,clock,thumbnail]);
 useEffect(()=>refresh.current(),[paused]);
 return <foreignObject width={width} height={height} pointerEvents="none"><div ref={host} style={{width:'100%',height:'100%',background:bg}}/></foreignObject>;
}
