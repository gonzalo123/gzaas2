import test from 'node:test';
import assert from 'node:assert/strict';
import {rouletteSchedule, rouletteSequence,randomStyle} from '../src/roulette.mjs';
import {BACKDROPS,BACKDROP_COLLECTIONS,DEFAULT,PRESETS,validateState} from '../src/state.mjs';

test('random styles reach every background in every collection, independently of the palette',()=>{
  for(const presetDraw of [0,.5,.999999]){
    const seen=new Set();
    for(let i=0;i<BACKDROPS.length;i++){
      const draws=[presetDraw,(i+.5)/BACKDROPS.length];
      const selected=randomStyle(undefined,()=>draws.shift());
      seen.add(selected.style.backdrop);
      assert.equal(selected.index,Math.floor(presetDraw*PRESETS.length));
      assert.equal(selected.style.bg,PRESETS[selected.index].bg);
      assert.equal(selected.style.backdropMotion,true);
      assert.doesNotThrow(()=>validateState({...DEFAULT,...selected.style}));
    }
    for(const collection of BACKDROP_COLLECTIONS)for(const id of collection.ids)assert.ok(seen.has(id),id);
  }
});

test('surprise excludes the current palette and background without random retry loops',()=>{
  for(const backdrop of BACKDROPS){
    const current={...DEFAULT,backdrop:backdrop.id},pool=BACKDROPS.filter(b=>b.id!==current.backdrop),seen=new Set();
    for(let i=0;i<pool.length;i++){
      const draws=[.5,(i+.5)/pool.length],selected=randomStyle(current,()=>draws.shift());
      assert.notEqual(selected.style.bg,current.bg);assert.notEqual(selected.style.backdrop,current.backdrop);
      seen.add(selected.style.backdrop);
    }
    assert.deepEqual([...seen].sort(),pool.map(b=>b.id).sort());
    assert.doesNotThrow(()=>randomStyle(current,()=>0));
  }
});

test('roulette delays decelerate within a bounded total', () => {
  const delays = rouletteSchedule(7);
  assert.equal(delays.length, 7);
  assert.equal(delays[0], 70);
  assert.equal(delays.at(-1), 380);
  for (let i = 1; i < delays.length; i++) assert.ok(delays[i] > delays[i - 1]);
  const total = delays.reduce((a, b) => a + b, 0);
  assert.ok(total > 1000 && total < 1800, `total ${total}`);
});

test('roulette sequence never repeats consecutively nor hits the final preset', () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const final of [0, 5, 23]) {
    const sequence = rouletteSequence(24, final, 7, random);
    assert.equal(sequence.length, 6);
    sequence.forEach((index, i) => {
      assert.notEqual(index, final);
      assert.ok(index >= 0 && index < 24);
      if (i) assert.notEqual(index, sequence[i - 1]);
    });
  }
});

test('roulette sequence is deterministic for an injected random', () => {
  const make = () => { let n = 0; return () => ((n++ * 0.37) % 1); };
  assert.deepEqual(rouletteSequence(24, 3, 7, make()), rouletteSequence(24, 3, 7, make()));
});

test('roulette sequence degrades safely with too few presets', () => {
  assert.deepEqual(rouletteSequence(2, 0), []);
});

test('roulette sequence terminates even with a constant random source', () => {
  const sequence = rouletteSequence(24, 3, 7, () => 0.5);
  assert.equal(sequence.length, 6);
  sequence.forEach((index, i) => { if (i) assert.notEqual(index, sequence[i - 1]); });
});
