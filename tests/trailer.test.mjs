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
