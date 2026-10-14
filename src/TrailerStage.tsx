import {useI18n} from './useI18n';
import {isParticle} from './particles.mjs';
import {useEffect,useMemo,useRef,useState,type ComponentType,type CSSProperties} from 'react';
import {buildTrailer,trailerPosition} from './trailer.mjs';
import {waitFonts} from './render';
import type {StageProps} from './PosterStage';

export function TrailerStage({state,paused=false,onError,onPlay,SceneRenderer}:{state:StageProps['state'];paused?:boolean;onError?:StageProps['onError'];onPlay?:()=>void;SceneRenderer:ComponentType<StageProps>}) {
 const {t}=useI18n();
 const plan=useMemo(()=>buildTrailer(state),[state]);
 const [frame,setFrame]=useState({index:0,cycle:0,seek:0}),[ready,setReady]=useState(false);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [hidden,setHidden]=useState(document.hidden);
 const elapsed=useRef(0),current=useRef(frame),shell=useRef<HTMLDivElement>(null),progress=useRef<HTMLDivElement>(null);
 const particleClock=useMemo(()=>()=>trailerPosition(plan,elapsed.current,state.repeat).localTime,[plan,state.repeat]);
 const original=useMemo(()=>{const final=plan.scenes.at(-1)!.state;return {...final,animation:isParticle(final.animation)?final.animation:'none',repeat:false,backdropMotion:false};},[plan]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{elapsed.current=0;current.current={index:0,cycle:0,seek:current.current.seek+1};setFrame(current.current);setReduced(media.matches);};
  const visibility=()=>setHidden(document.hidden);
  media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
  let active=true;
  waitFonts(state).then(()=>{if(active)setReady(true);}).catch(()=>{if(active)onError?.('No se pudo cargar la tipografía. Prueba a recargar.');});
  return()=>{active=false;media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};
 },[state,onError]);
 useEffect(()=>{
  if(paused||hidden||reduced||!ready)return;
  let request=0,last:number|undefined;
  const tick=(now:number)=>{
   // Tab suspension never skips a scene, even if visibility events arrive late.
   if(last!==undefined)elapsed.current+=Math.min(now-last,100);
   last=now;
   const position=trailerPosition(plan,elapsed.current,state.repeat);
   if(position.index!==current.current.index||position.cycle!==current.current.cycle){current.current={...current.current,index:position.index,cycle:position.cycle};setFrame(current.current);}
   const scene=plan.scenes[position.index];
   if(progress.current)progress.current.style.transform=`scaleX(${position.progress})`;
   if(shell.current)shell.current.style.opacity=String(scene.final&&!state.repeat?1:Math.min(1,(scene.duration-position.localTime)/220));
   if(!position.finished)request=requestAnimationFrame(tick);
  };
  request=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(request);
 },[paused,hidden,reduced,ready,plan,state.repeat,frame.seek]);
 function seek(index:number) {
  elapsed.current=plan.scenes[index].start;
  current.current={index,cycle:0,seek:current.current.seek+1};setFrame(current.current);
  if(shell.current)shell.current.style.opacity='1';
  if(progress.current)progress.current.style.transform=`scaleX(${elapsed.current/plan.totalDuration})`;
  onPlay?.();
 }
 if(reduced)return <SceneRenderer state={original} onError={onError}/>;
 const scene=plan.scenes[frame.index];
 return <div className="trailer-stage" style={{background:state.bg,'--play-state':paused||hidden||!ready?'paused':'running'} as CSSProperties} data-scene={frame.index} data-cycle={frame.cycle}>
  <div role="img" aria-label={state.text} className="sr-only"/>
  <div className="trailer-scene" ref={shell} aria-hidden="true" key={`${frame.index}:${frame.cycle}:${frame.seek}`}>
   <SceneRenderer state={scene.state} particleDuration={scene.duration} particleClock={particleClock} paused={paused||hidden||!ready} onError={onError}/>
  </div>
  <div className="trailer-navigation" role="group" aria-label={t("Escenas del tráiler")}>{plan.scenes.map((s,i)=><button key={i} className={frame.index===i?'active':''} aria-pressed={frame.index===i} aria-label={s.final?t("Ver mensaje completo"):t('Ver escena {number}: {text}',{number:i+1,text:s.state.text})} title={s.final?t("Mensaje completo"):s.state.text} onClick={()=>seek(i)}>{s.final?'✦':i+1}</button>)}</div>
  <div className="trailer-progress" aria-hidden="true"><div ref={progress}/></div>
 </div>;
}
