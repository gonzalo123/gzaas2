import test from 'node:test';
import assert from 'node:assert/strict';
import {trailerBeats,buildTrailer,trailerPosition} from '../src/trailer.mjs';
import {DEFAULT,encodeState,decodeState} from '../src/state.mjs';

test('a short phrase builds suspense before showing the complete message',()=>{
 assert.deepEqual(trailerBeats('Hoy empieza algo grande'),['Hoy','empieza','algo grande']);
 const plan=buildTrailer({...DEFAULT,text:'Hoy empieza algo grande',animation:'trailer'});
 assert.equal(plan.scenes.at(-1).state.text,'Hoy empieza algo grande');
 assert.equal(plan.scenes.at(-1).final,true);
 assert.ok(plan.scenes.every(s=>s.state.animation!=='trailer'&&!s.state.repeat));
});

test('explicit lines take precedence and long messages keep every word within six beats',()=>{
 assert.deepEqual(trailerBeats('Uno dos\nTres cuatro\nCinco'),['Uno dos','Tres cuatro','Cinco']);
 for(const text of ['a b c d e f g h i j k l m n o p q r s t','a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl']){
  const beats=trailerBeats(text);assert.ok(beats.length<=6);
  assert.equal(beats.join(' ').replace(/\s+/g,' '),text.replace(/\s+/g,' '));
 }
 assert.deepEqual(trailerBeats('Ya. Vamos! ¿Listos?'),['Ya.','Vamos!','¿Listos?']);
});

test('empty drafts and multilingual text preserve whole graphemes',()=>{
 assert.deepEqual(trailerBeats(' \n '),[]);
 for(const text of ['👨‍👩‍👧‍👦','你好世界','e\u0301 🧑🏽‍🚀 🇪🇸','قُل شيئًا جميلًا']){
  assert.equal(trailerBeats(text).join(' '),text);
  assert.equal(buildTrailer({...DEFAULT,text}).scenes.at(-1).state.text,text);
 }
});

test('the clock chooses exact boundaries, holds the final frame and repeats deterministically',()=>{
 const plan=buildTrailer(DEFAULT),end=plan.totalDuration;
 assert.equal(trailerPosition(plan,0,false).index,0);
 assert.equal(trailerPosition(plan,plan.scenes[1].start,false).index,1);
 assert.equal(trailerPosition(plan,end-1,false).finished,false);
 assert.deepEqual(trailerPosition(plan,end+10000,false),{index:plan.scenes.length-1,cycle:0,finished:true,localTime:plan.scenes.at(-1).duration,progress:1});
 assert.equal(trailerPosition(plan,end,true).index,0);
 assert.equal(trailerPosition(plan,end*2+plan.scenes[1].start,true).index,1);
 assert.equal(trailerPosition(plan,end*2,true).cycle,2);
 assert.equal(trailerPosition(plan,-500,false).localTime,0);
});

test('pace scales every scene; final composition and shared links preserve the original design',()=>{
 const state={...DEFAULT,animation:'trailer',text:'HOY\nEMPIEZA\nALGO GRANDE'};
 const plan=buildTrailer(state);
 assert.deepEqual(plan,buildTrailer(state));
 for(const [pace,multiplier] of [['slow',1.45],['fast',.7]])assert.ok(Math.abs(buildTrailer({...state,pace}).totalDuration-plan.totalDuration*multiplier)<.001);
 assert.deepEqual(plan.scenes.at(-1).state,{...state,animation:'reveal',repeat:false});
 assert.deepEqual(decodeState(encodeState(state)),state);
 assert.ok(plan.scenes.every(s=>s.duration>=1750));
});

test('particle trailers alternate distinct modes and finish in the original composition',()=>{
 const state={...DEFAULT,animation:'trailer',trailerParticles:true,text:'NUBE\nESPIRAL\nEXPLOSIÓN'};
 const plan=buildTrailer(state);
 assert.deepEqual(plan.scenes.map(s=>s.state.animation),['particle-assemble','particle-vortex','particle-explode','particle-assemble']);
 assert.deepEqual(plan.scenes.at(-1).state,{...state,animation:'particle-assemble',repeat:false});
 assert.ok(plan.scenes.every(s=>!s.state.repeat&&s.duration>=3600));
 assert.equal(plan.scenes.at(-1).duration,5000);
 assert.deepEqual(buildTrailer(state),plan);
 for(const [pace,scale] of [['slow',1.45],['fast',.7]])assert.ok(Math.abs(buildTrailer({...state,pace}).totalDuration-plan.totalDuration*scale)<.001);
});

test('particle trailer settings survive links; omitted settings preserve classic choreography',async()=>{
 const {validateState}=await import('../src/state.mjs');
 const {default:LZString}=await import('lz-string');
 const state={...DEFAULT,animation:'trailer',trailerParticles:true};
 assert.deepEqual(decodeState(encodeState(state)),state);
 const {trailerParticles,...old}=state;
 const decoded=decodeState('#v1='+LZString.compressToEncodedURIComponent(JSON.stringify(old)));
 assert.equal(decoded.trailerParticles,false);
 assert.deepEqual(buildTrailer(decoded),buildTrailer({...old,trailerParticles:false}));
 for(const value of [null,1,'true',{},[]])assert.throws(()=>validateState({...state,trailerParticles:value}));
});

test('particle scene clocks allow a formed reading hold before every trailer cut',async()=>{
 const {particlePlaybackTime,createParticles,sampleParticles}=await import('../src/particles.mjs');
 for(const pace of ['normal','slow','fast']){
  const plan=buildTrailer({...DEFAULT,trailerParticles:true,text:'NUBE\nESPIRAL\nEXPLOSIÓN',pace});
  for(const scene of plan.scenes){
   const p=createParticles([{x:10,y:10,radius:1}],100,60,42);
   const time=particlePlaybackTime(scene.duration*.8,pace,scene.duration);
   assert.equal(time,5600);
   sampleParticles(p,scene.state.animation,time,100,60);
   assert.ok(Math.hypot(p[0].x-10,p[0].y-10)<.4,'message is readable before fading');
   sampleParticles(p,scene.state.animation,particlePlaybackTime(scene.duration,pace,scene.duration),100,60);
   assert.equal(p[0].x,10);assert.equal(p[0].y,10);
  }
 }
});

test('mixed trailers include both families, vary by seed and preserve the shared choreography',async()=>{
 const {isParticle}=await import('../src/particles.mjs');
 for(const text of ['HOLA','HOLA MUNDO','UNO\nDOS\nTRES','👩🏽‍💻'])for(const font of ['anton','pacifico']){
  let previous;
  for(let trailerSeed=0;trailerSeed<12;trailerSeed++){
   const state={...DEFAULT,text,font,animation:'trailer',trailerMix:true,trailerSeed};
   const plan=buildTrailer(state),modes=plan.scenes.map(s=>s.state.animation);
   assert.ok(modes.some(isParticle)&&modes.some(m=>!isParticle(m)));
   assert.deepEqual(buildTrailer(decodeState(encodeState(state))),plan);
   assert.deepEqual(buildTrailer(state),plan);
   if(previous)assert.notDeepEqual(modes,previous);
   previous=modes;
   const final=plan.scenes.at(-1).state;
   assert.equal(final.text,text);assert.equal(final.fg,state.fg);assert.equal(final.bg,state.bg);
   assert.ok(plan.scenes.every(s=>!s.state.repeat));
   assert.ok(plan.scenes.filter(s=>isParticle(s.state.animation)).every(s=>s.duration>=(s.final?5000:3600)));
  }
 }
});

test('mix fields validate strictly and missing fields preserve both existing trailer styles',async()=>{
 const {validateState}=await import('../src/state.mjs');
 const {default:LZString}=await import('lz-string');
 for(const trailerParticles of [false,true]){
  const {trailerMix,trailerSeed,...old}={...DEFAULT,animation:'trailer',trailerParticles};
  const decoded=decodeState('#v1='+LZString.compressToEncodedURIComponent(JSON.stringify(old)));
  assert.equal(decoded.trailerMix,false);assert.equal(decoded.trailerSeed,0);
  assert.deepEqual(buildTrailer(decoded).scenes.map(s=>s.state.animation),buildTrailer(old).scenes.map(s=>s.state.animation));
 }
 for(const patch of [{trailerMix:null},{trailerMix:1},{trailerMix:'true'},{trailerSeed:-1},{trailerSeed:4294967296},{trailerSeed:1.5},{trailerSeed:'0'},{trailerSeed:NaN},{trailerSeed:null}])assert.throws(()=>validateState({...DEFAULT,...patch}));
 for(const trailerSeed of [0,4294967295])assert.equal(decodeState(encodeState({...DEFAULT,trailerMix:true,trailerSeed})).trailerSeed,trailerSeed);
});
