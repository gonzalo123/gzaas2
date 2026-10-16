import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REACT_BITS_TEXT,TEXT_DURATION,textTempo,textPlayback,textNoise} from '../src/text-motion.mjs';
import {DEFAULT,ANIMATIONS,encodeState,decodeState} from '../src/state.mjs';
import {exportPlan} from '../src/export-plan.mjs';

test('all eight text animations share their identity and timing through links and GIF plans',()=>{
 assert.equal(REACT_BITS_TEXT.length,8);
 assert.equal(new Set(REACT_BITS_TEXT).size,8);
 for(const animation of REACT_BITS_TEXT){
  assert.ok(ANIMATIONS.some(a=>a.id===animation&&a.group==='react-bits'));
  for(const pace of ['slow','normal','fast'])for(const repeat of [false,true]){
   const state={...DEFAULT,text:'Sí 👩🏽‍💻\n你好',animation,pace,repeat};
   assert.deepEqual(decodeState(encodeState(state)),state);
   const plan=exportPlan(state),duration=TEXT_DURATION*textTempo(pace);
   assert.equal(plan.totalDuration,duration);
   assert.equal(plan.frames.reduce((n,f)=>n+f.delay,0),duration);
   assert.equal(textPlayback(duration,pace,false).settled,true);
   assert.equal(textPlayback(duration,pace,false).time,TEXT_DURATION);
  }
 }
});

test('text playback has a hidden loop seam and a fully readable reduced-motion pose',()=>{
 for(const pace of ['slow','normal','fast']){
  const duration=TEXT_DURATION*textTempo(pace);
  assert.deepEqual(textPlayback(0,pace,true),textPlayback(duration,pace,true));
  assert.equal(textPlayback(duration-.01,pace,true).opacity<.001,true);
  assert.deepEqual(textPlayback(120,pace,true,undefined,true),{time:TEXT_DURATION,opacity:1,settled:true});
  assert.equal(textPlayback(duration/2,pace,false).time,3000);
  assert.equal(textPlayback(1000,pace,false,2000).time,3000);
 }
});

test('scrambled glyph noise is reproducible and changes across letters and frames',()=>{
 const samples=Array.from({length:100},(_,i)=>textNoise(i,8));
 assert.deepEqual(samples,Array.from({length:100},(_,i)=>textNoise(i,8)));
 assert.equal(new Set(samples).size,100);
 assert.ok(samples.every(n=>Number.isFinite(n)&&n>=0&&n<1));
 assert.notDeepEqual(samples,Array.from({length:100},(_,i)=>textNoise(i,9)));
});
