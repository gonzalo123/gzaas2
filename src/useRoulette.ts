import {useCallback,useEffect,useRef,useState} from 'react';
import {rouletteSchedule,rouletteSequence} from './roulette.mjs';
import {PRESETS} from './state.mjs';

// Flashes a few presets, slowing down; the caller applies the final random design.
// `step` is called for every flash (final=true on the last one), `done` right after it.
export function useRoulette(){
 const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const [spinning,setSpinning]=useState(false);
 const cancel=useCallback(()=>{clearTimeout(timer.current);setSpinning(false);},[]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const spin=useCallback((finalIndex:number,step:(index:number,final:boolean)=>void,done:()=>void)=>{
  clearTimeout(timer.current);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){step(finalIndex,true);done();return;}
  const order=[...rouletteSequence(PRESETS.length,finalIndex),finalIndex],delays=rouletteSchedule(order.length);
  let n=0;
  setSpinning(true);
  const next=()=>{
   const final=n===order.length-1;
   step(order[n],final);
   if(final){setSpinning(false);done();return;}
   timer.current=setTimeout(next,delays[n++]);
  };
  next();
 },[]);
 return {spin,cancel,spinning};
}
