import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDimensions,exportPlan,GIF_FPS} from '../src/export-plan.mjs';
import {DEFAULT,ANIMATIONS,REACT_BITS_BACKDROPS} from '../src/state.mjs';
import {buildTrailer} from '../src/trailer.mjs';

test('GIF dimensions preserve each poster ratio and bound the longest side',()=>{
 assert.deepEqual(exportDimensions('landscape'),[640,480]);
 assert.deepEqual(exportDimensions('square'),[640,640]);
 assert.deepEqual(exportDimensions('portrait'),[480,640]);
});
test('all animations and paces have bounded frames with valid GIF centisecond delays',()=>{
 for(const {id:animation} of ANIMATIONS)for(const pace of ['slow','normal','fast'])for(const repeat of [false,true]){
  const plan=exportPlan({...DEFAULT,animation,pace,repeat});
  assert.equal(plan.frames.reduce((sum,f)=>sum+f.delay,0),plan.totalDuration);
  assert.ok(plan.frames.every(f=>f.delay>=10&&f.delay%10===0&&f.time%10===0));
  assert.ok(plan.frames.length<=Math.ceil(plan.totalDuration*GIF_FPS/1000));
  assert.ok(plan.frames.every((f,i)=>!i||f.time>plan.frames[i-1].time));
 }
});
test('the trailer export includes every scene and ends on the complete original message',()=>{
 const state={...DEFAULT,animation:'trailer',repeat:false,text:'HOY\nEMPIEZA\nALGO GRANDE'};
 const plan=exportPlan(state),trailer=buildTrailer(state);
 assert.equal(plan.totalDuration,Math.round(trailer.totalDuration/10)*10);
 assert.deepEqual([...new Set(plan.frames.map(f=>plan.sceneAt(f.time).index))],[0,1,2,3]);
 const final=plan.sceneAt(plan.frames.at(-1).time);
 assert.equal(final.state.text,state.text);assert.equal(final.opacity,1);
 assert.equal(final.state.fg,state.fg);assert.equal(final.state.bg,state.bg);
});
test('static posters use one frame; moving backgrounds remain animated',()=>{
 for(const backdrop of ['solid','waves',...REACT_BITS_BACKDROPS])assert.equal(exportPlan({...DEFAULT,animation:'none',backdrop,backdropMotion:false}).frames.length,1);
 assert.equal(exportPlan({...DEFAULT,animation:'none',backdrop:'solid',backdropMotion:true}).frames.length,1);
 assert.ok(exportPlan({...DEFAULT,animation:'none',backdrop:'waves',backdropMotion:true}).frames.length>1);
 for(const backdrop of REACT_BITS_BACKDROPS)assert.ok(exportPlan({...DEFAULT,animation:'none',backdrop,backdropMotion:true}).frames.length>1);
});
test('single playback waits for all staggered letters before holding the final frame',()=>{
 for(const pace of ['slow','normal','fast']){
  const state={...DEFAULT,animation:'letters',repeat:false,pace};
  const tempo=pace==='slow'?1.45:pace==='fast'?.7:1,plan=exportPlan(state);
  assert.ok(plan.frames.at(-1).time>=(.95+1.15)*1000*tempo);
  assert.equal(plan.sceneAt(plan.frames.at(-1).time).state.repeat,false);
 }
});

test('particle trailer GIFs use the scene duration and preserve the complete formed ending',()=>{
 for(const pace of ['normal','slow','fast'])for(const repeat of [true,false]){
  const state={...DEFAULT,animation:'trailer',trailerParticles:true,text:'UNO\nDOS\nTRES',pace,repeat};
  const trailer=buildTrailer(state),plan=exportPlan(state);
  assert.deepEqual([...new Set(plan.frames.map(f=>plan.sceneAt(f.time).index))],[0,1,2,3]);
  for(const scene of trailer.scenes){
   const sampled=plan.sceneAt(scene.start+scene.duration*.5);
   assert.equal(sampled.particleDuration,scene.duration);
   assert.ok(Math.abs(sampled.time-scene.duration*.5)<.001);
  }
  if(!repeat){const final=plan.sceneAt(plan.frames.at(-1).time);assert.equal(final.state.text,state.text);assert.equal(final.state.animation,'particle-assemble');assert.equal(final.opacity,1);}
 }
});

test('mixed GIF scenes keep renderer timing and the selected final style at every pace',async()=>{
 const {isParticle}=await import('../src/particles.mjs');
 for(const trailerSeed of [0,1,9])for(const pace of ['slow','normal','fast']){
  const state={...DEFAULT,animation:'trailer',trailerMix:true,trailerSeed,text:'UNO\nDOS\nTRES',pace,repeat:false};
  const trailer=buildTrailer(state),plan=exportPlan(state);
  for(const scene of trailer.scenes){
   const sampled=plan.sceneAt(scene.start+scene.duration*.5);
   assert.equal(sampled.state.animation,scene.state.animation);
   assert.equal(sampled.particleDuration,isParticle(scene.state.animation)?scene.duration:undefined);
  }
  const end=plan.sceneAt(plan.frames.at(-1).time);
  assert.equal(end.state.animation,trailer.scenes.at(-1).state.animation);assert.equal(end.opacity,1);
 }
});
