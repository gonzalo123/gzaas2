import {isReactBitsText,TEXT_DURATION} from './text-motion.mjs';
import {isGalaxy,GALAXY_DURATION} from './galaxy.mjs';
import {buildTrailer,trailerPosition} from './trailer.mjs';

import {isParticle,PARTICLE_DURATION} from './particles.mjs';

export const GIF_FPS=12;
export function exportDimensions(ratio) {
 return ratio==='portrait'?[480,640]:ratio==='square'?[640,640]:[640,480];
}
export function exportPlan(state) {
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 const trailer=state.animation==='trailer'?buildTrailer(state):null;
 const still=state.animation==='none'&&(!state.backdropMotion||state.backdrop==='solid');
 const duration=trailer?.totalDuration??(still?1000:isReactBitsText(state.animation)?TEXT_DURATION*tempo:isGalaxy(state.animation)?GALAXY_DURATION*tempo:isParticle(state.animation)?PARTICLE_DURATION*tempo:(6+(['letters','wave','bounce','orbit'].includes(state.animation)?1.15:state.animation==='none'?0:.85))*1000*tempo);
 const total=Math.round(duration/10)*10,count=still?1:Math.ceil(total*GIF_FPS/1000);
 const frames=Array.from({length:count},(_,i)=>{
  const time=Math.round(i*total/count/10)*10;
  const next=Math.round((i+1)*total/count/10)*10;
  return {time:i===count-1&&!state.repeat?total:time,delay:next-time};
 });
 return {frames,totalDuration:total,sceneAt(time){
  if(!trailer)return {state,time,index:0,opacity:1,scale:1,particleDuration:undefined};
  const position=trailerPosition(trailer,Math.min(time,trailer.totalDuration),false),scene=trailer.scenes[position.index];
  return {particleDuration:(isParticle(scene.state.animation)||isReactBitsText(scene.state.animation))?scene.duration:undefined,state:scene.state,time:position.localTime,index:position.index,opacity:scene.final&&!state.repeat?1:Math.min(1,(scene.duration-position.localTime)/220),scale:1+.035*Math.max(0,1-position.localTime/180)};
 }};
}
