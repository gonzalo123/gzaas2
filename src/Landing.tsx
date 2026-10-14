import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {Backdrop} from './Backdrop';
import {DEFAULT,MAX_TEXT} from './state.mjs';

// Curated pairs keep the first impression coherent; never shuffle while typing.
const entrances=[
 {id:'sunrise',animation:'letters',backdrop:'mesh',bg:'#fffbf5',fg:'#e85d0a',accent:'#ffd0a0',button:'#b94208',font:'"DM Sans", sans-serif',weight:800,italic:'italic'},
 {id:'lilac',animation:'bounce',backdrop:'aurora',bg:'#fcfaff',fg:'#5943b8',accent:'#dacefa',button:'#5943b8',font:'"DM Serif Display", serif',weight:400,italic:'normal'},
 {id:'tide',animation:'orbit',backdrop:'waves',bg:'#f7fbf8',fg:'#12665d',accent:'#b8e4d2',button:'#12665d',font:'"Space Grotesk", sans-serif',weight:700,italic:'normal'},
];
const tagline='Tus mensajes, a toda pantalla.';
const taglineWords=Array.from(tagline.matchAll(/\S+/g),match=>({text:match[0],offset:match.index}));

function TypewriterTagline(){
 const [frame,setFrame]=useState(()=>({count:matchMedia('(prefers-reduced-motion: reduce)').matches?tagline.length:0,cursor:false}));
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  const finish=()=>{stopped=true;clearTimeout(timer);setFrame({count:tagline.length,cursor:false});};
  const preference=()=>{if(reduced.matches)finish();};
  reduced.addEventListener('change',preference);
  if(reduced.matches)finish();
  else void document.fonts.load('400 30px "DM Serif Display"').then(()=>{
   if(stopped)return;
   const start=performance.now(),formedAt=350+(tagline.length-1)*60;
   // One elapsed-time clock owns every letter and the only caret. A delayed
   // callback catches up atomically, including after a suspended browser tab.
   const tick=()=>{
    if(stopped)return;
    const elapsed=performance.now()-start;
    const count=Math.max(0,Math.min(tagline.length,1+Math.floor((elapsed-350)/60)));
    const cursor=elapsed<formedAt||elapsed<formedAt+1300&&Math.floor((elapsed-formedAt)/325)%2===0;
    setFrame(previous=>previous.count===count&&previous.cursor===cursor?previous:{count,cursor});
    if(elapsed<formedAt+1300)timer=setTimeout(tick,30);
   };
   tick();
  },()=>{if(!stopped)finish();});
  return()=>{stopped=true;clearTimeout(timer);reduced.removeEventListener('change',preference);};
 },[]);
 const cursorIndex=Math.max(0,tagline.slice(0,frame.count).trimEnd().length-1);
 return <p className="landing-tagline">
  <span className="sr-only">{tagline}</span>
  <span aria-hidden="true">{taglineWords.map((word,w)=><span key={w}>
   <span className="landing-type-word">{Array.from(word.text).map((letter,i)=>{
    const index=word.offset+i;
    return <span key={i} className="landing-type-char" data-visible={index<frame.count}>{letter}{index===cursorIndex&&<span className="landing-type-caret" data-visible={frame.cursor}/>}</span>;
   })}</span>{w<taglineWords.length-1?' ':null}
  </span>)}</span>
 </p>;
}

export function Landing({draft,error,onDraft,onCreate}:{draft:string;error:string;onDraft:(text:string)=>void;onCreate:()=>void}){
 const [entrance]=useState(()=>entrances[Math.floor(Math.random()*entrances.length)]);
 const [settled,setSettled]=useState(false),[focused,setFocused]=useState(false);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const timer=setTimeout(()=>setSettled(true),4500);return()=>clearTimeout(timer);},[]);
 useLayoutEffect(()=>{
  const input=inputRef.current;if(!input)return;
  let active=true,width=input.clientWidth;
  const resize=()=>{input.style.height='auto';input.style.height=`${input.scrollHeight+input.offsetHeight-input.clientHeight}px`;};
  resize();
  const observer=new ResizeObserver(()=>{if(input.clientWidth!==width){width=input.clientWidth;resize();}});observer.observe(input);
  document.fonts.ready.then(()=>{if(active)resize();});
  return()=>{active=false;observer.disconnect();};
 },[draft]);
 const quiet=settled||focused||!!draft;
 const theme={'--landing-ink':entrance.fg,'--landing-accent':entrance.accent,'--landing-button':entrance.button,'--landing-paper':entrance.bg,'--landing-font':entrance.font,'--landing-weight':entrance.weight,'--landing-italic':entrance.italic,'--bg-duration':'16s','--play-state':quiet?'paused':'running'} as CSSProperties;
 return <>
  <div className="landing-scene" style={theme} aria-hidden="true" data-entrance={entrance.id}>
   <svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" focusable="false"><Backdrop state={{...DEFAULT,...entrance,backdropMotion:true}} width={1440} height={1000}/></svg>
  </div>
  <main className="landing-content" style={theme}>
   <h1 className={`landing-logo motion-${entrance.animation}`} aria-label="gzaas!">
    <span className="landing-word" aria-hidden="true">{Array.from('gzaas!').map((letter,i)=><span key={i} className="motion-unit" style={{animationDelay:`${i*.075}s`}}>{letter}</span>)}</span>
   </h1>
   <TypewriterTagline/>
   <form className="landing-form" onSubmit={e=>{e.preventDefault();onCreate();}}>
    <label className="sr-only" htmlFor="landing-message">Tu mensaje</label>
    <div className="landing-composer">
     <textarea id="landing-message" ref={inputRef} rows={2} value={draft} placeholder="Algo que merezca verse en grande…" aria-invalid={!!error} aria-describedby={error?'landing-error':undefined} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>onDraft([...e.target.value].slice(0,MAX_TEXT).join(''))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(draft.trim())onCreate();}}} spellCheck={false}/>
     <div className="landing-actions">
      <button className="landing-submit" type="submit" disabled={!draft.trim()}>gzaas it! <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>
     </div>
    </div>
    {error&&<p id="landing-error" className="field-error" role="alert">{error}</p>}
   </form>
  </main>
 </>;
}
