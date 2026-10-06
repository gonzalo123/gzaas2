import {useId,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {families,layoutText,waitFonts,type Poster} from './render';
import {Backdrop} from './Backdrop';

type Geometry = ReturnType<typeof layoutText> & {width:number;height:number};

export function PosterStage({state,paused=false,replay=0,onError}:{state:Poster;paused?:boolean;replay?:number;onError?:(message:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),patternId=useId();
 const [geometry,setGeometry]=useState<Geometry>();
 useLayoutEffect(()=>{
  let active=true;
  const ctx=document.createElement('canvas').getContext('2d');
  const measure=()=>{
   if(!active||!ctx||!ref.current)return;
   const {width,height}=ref.current.getBoundingClientRect();
   if(width&&height)setGeometry({...layoutText(ctx,state,width,height),width,height});
  };
  measure();
  waitFonts(state).then(measure).catch(()=>{if(active)onError?.('No se pudo cargar la tipografía. Prueba a recargar.');});
  const observer=new ResizeObserver(measure);observer.observe(ref.current!);
  return()=>{active=false;observer.disconnect();};
 },[state,onError]);
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 const style={backgroundColor:state.bg,color:state.fg,'--duration':`${6*tempo}s`,'--entrance-duration':`${.95*tempo}s`,'--bg-duration':`${18*tempo}s`,'--play-state':paused?'paused':'running'} as CSSProperties;
 const unit=geometry?Math.min(geometry.width,geometry.height):0,step=unit/18;
 let index=0;
 const byLetter=['letters','wave','bounce','orbit'].includes(state.animation),byPart=byLetter||state.animation==='cascade';
 const letterCount=geometry?.lines.reduce((n,l)=>n+l.letters.length,0)??1;
 const textStyle:CSSProperties={fill:state.effect==='outline'?'none':state.fg,stroke:state.effect==='outline'?state.fg:'none',strokeWidth:geometry?Math.max(1,geometry.fontSize*.014):1,...(state.effect==='shadow'&&geometry?{filter:`drop-shadow(${geometry.fontSize*.035}px ${geometry.fontSize*.045}px 0 ${state.fg}55)`}:{})};
 if(state.effect==='neon'&&geometry)textStyle.filter=`drop-shadow(0 0 2px ${state.fg}) drop-shadow(0 0 ${geometry.fontSize*.055}px ${state.fg}99)`;
 return <div ref={ref} className={`kinetic-poster motion-${state.animation}${state.repeat?' is-looping':''}`} style={style} role="img" aria-label={state.text}>
  {geometry&&<svg className="poster-art" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
   <Backdrop key={`${state.backdrop}:${state.bg}:${state.accent}:${replay}`} state={state} width={geometry.width} height={geometry.height}/>
   <defs><pattern id={patternId} width={state.pattern==='dots'?step:step*1.5} height={state.pattern==='dots'?step:step*1.5} patternUnits="userSpaceOnUse">
    {state.pattern==='dots'?<circle cx={step/2} cy={step/2} r={Math.max(1,unit/600)} fill={state.fg}/>:<path d={`M0 0 H${step*1.5}${state.pattern==='grid'?` M0 0 V${step*1.5}`:''}`} fill="none" stroke={state.fg} strokeWidth={Math.max(1,unit/900)}/>}
   </pattern></defs>
   {state.pattern!=='none'&&<rect width="100%" height="100%" fill={`url(#${patternId})`} opacity=".13"/>}
   <g key={`${JSON.stringify(state)}:${replay}`} fontFamily={families[state.font]} fontSize={geometry.fontSize} fontWeight={geometry.weight} style={textStyle}>
    {geometry.lines.map((line,lineIndex)=><g key={lineIndex}>
     {(byLetter?line.letters:state.animation==='cascade'?line.words:[{text:line.text,x:line.x}]).map((word,wordIndex)=>{
      const delay=(byLetter?index++/Math.max(1,letterCount-1)*1.15:Math.min(index++*.105,.85))*tempo;
      return <g key={wordIndex} className="motion-unit" style={{'--lift':`${geometry.fontSize*.25}px`,'--tilt':`${lineIndex%2?-3:3}deg`,'--float':`${Math.min(10,unit*.012)}px`,transformOrigin:`${word.x}px ${line.y-geometry.fontSize*.35}px`,animationDelay:state.animation==='none'?'0s':`${delay}s`} as CSSProperties}>
       {state.effect==='echo'&&[3,2,1].map(i=><text key={i} x={word.x+i*geometry.fontSize*.022} y={line.y+i*geometry.fontSize*.022} fill={state.accent} textAnchor={byPart?'start':state.align==='left'?'start':state.align==='right'?'end':'middle'}>{word.text}</text>)}
       <text x={word.x} y={line.y} textAnchor={byPart?'start':state.align==='left'?'start':state.align==='right'?'end':'middle'}>{word.text}</text>
      </g>;
     })}
    </g>)}
   </g>
  </svg>}
 </div>;
}
