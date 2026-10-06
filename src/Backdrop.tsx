import {useId,type CSSProperties} from 'react';
import {backdropScene} from './background';
import type {Poster} from './render';

export function Backdrop({state,width,height}:{state:Poster;width:number;height:number}){
 const prefix=useId(),scene=backdropScene(state,width,height);
 return <g className={`backdrop-art${state.backdropMotion?' backdrop-animated':''}`}>
  <defs>{scene.gradients.map(g=>g.kind==='radial'?<radialGradient key={g.id} id={prefix+g.id}>{g.stops.map((s,i)=><stop key={i} offset={s.at} stopColor={s.color} stopOpacity={s.alpha}/>)}</radialGradient>:<linearGradient key={g.id} id={prefix+g.id} x2="100%" y2="100%">{g.stops.map((s,i)=><stop key={i} offset={s.at} stopColor={s.color} stopOpacity={s.alpha}/>)}</linearGradient>)}</defs>
  {scene.shapes.map((s,i)=>{
   const props={fill:scene.gradients.some(g=>g.id===s.fill)?`url(#${prefix+s.fill})`:s.fill,opacity:s.opacity,className:s.motion?`backdrop-shape bg-${s.motion}`:undefined,style:{transformOrigin:`${width/2}px ${height/2}px`,'--bg-delay':s.motion==='twinkle'?`${(i%7)*-.8}s`:'0s','--bg-distance':`${Math.min(width,height)*.035}px`} as CSSProperties};
   return s.kind==='rect'?<rect key={i} {...props} x={s.x} y={s.y} width={s.w} height={s.h}/>:s.kind==='ellipse'?<ellipse key={i} {...props} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}/>:<path key={i} {...props} d={s.d}/>;
  })}
 </g>;
}
