import test from 'node:test';
import assert from 'node:assert/strict';
import LZString from 'lz-string';
import {sampleTargets,createParticles,particleSeed,sampleParticles,stepMagnet,PARTICLE_LIMIT,PARTICLE_DURATION,particleTempo} from '../src/particles.mjs';
import {DEFAULT,validateState,encodeState,decodeState} from '../src/state.mjs';
import {exportPlan} from '../src/export-plan.mjs';
const modes=['particle-assemble','particle-explode','particle-vortex'];
function mask(w,h,predicate){const a=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)a[(y*w+x)*4+3]=predicate(x,y)?255:0;return a;}
const make=()=>createParticles([{x:15,y:12,radius:1},{x:70,y:35,radius:2},{x:40,y:45,radius:1}],100,60,123);
const positions=ps=>ps.map(p=>[p.x,p.y]);

test('mask sampling preserves thin strokes, transparent holes and bounded opaque coordinates',()=>{
 const w=100,h=80,data=mask(w,h,(x,y)=>x===9||y===33||(x>60&&y>50));
 const targets=sampleTargets(data,w,h,400,19);
 assert.ok(targets.some(t=>t.x<10));assert.ok(targets.some(t=>t.y===33.5));
 assert.ok(targets.length<=400&&targets.length>200);
 for(const t of targets)assert.equal(data[(Math.floor(t.y)*w+Math.floor(t.x))*4+3],255);
 assert.deepEqual(sampleTargets(new Uint8Array(w*h*4),w,h),[]);
 assert.deepEqual(sampleTargets([],0,0),[]);
});
test('sampling is capped and spans all quadrants without a truncation bias',()=>{
 const data=mask(200,200,()=>true),targets=sampleTargets(data,200,200,1e9,42);
 assert.ok(targets.length<=PARTICLE_LIMIT);
 for(const [x,y] of [[20,20],[180,20],[20,180],[180,180]])assert.ok(targets.some(t=>Math.hypot(t.x-x,t.y-y)<15));
});
test('seed, targets, clouds and visual parameters are reproducible',()=>{
 const data=mask(80,60,(x,y)=>x>10&&x<65&&y>5),seed=particleSeed('¡Hola! 👩🏽‍💻');
 assert.equal(seed,particleSeed('¡Hola! 👩🏽‍💻'));assert.notEqual(seed,particleSeed('Otro'));
 const a=sampleTargets(data,80,60,100,seed),b=sampleTargets(data,80,60,100,seed);
 assert.deepEqual(a,b);assert.deepEqual(createParticles(a,80,60,seed),createParticles(b,80,60,seed));
 assert.notDeepEqual(createParticles(a,80,60,seed),createParticles(a,80,60,seed+1));
});
test('all modes seek independently of frame order, converge and replay exactly',()=>{
 for(const mode of modes){
  const a=make(),b=make();sampleParticles(a,mode,1700,100,60);const expected=positions(a);
  for(const t of [7000,3000,0,500,1700])sampleParticles(b,mode,t,100,60);
  assert.deepEqual(positions(b),expected);
  sampleParticles(b,mode,PARTICLE_DURATION,100,60);assert.deepEqual(positions(b),b.map(p=>[p.targetX,p.targetY]));
  sampleParticles(b,mode,999,100,60,false,true);assert.deepEqual(positions(b),b.map(p=>[p.targetX,p.targetY]));
  sampleParticles(a,mode,1300,100,60,true);sampleParticles(b,mode,PARTICLE_DURATION+1300,100,60,true);
  assert.deepEqual(positions(a),positions(b));
 }
});
test('assemble, explosion and vortex have distinct animated trajectories',()=>{
 const snapshots=modes.map(mode=>{const p=make();sampleParticles(p,mode,1300,100,60);return positions(p);});
 assert.notDeepEqual(snapshots[0],snapshots[1]);assert.notDeepEqual(snapshots[1],snapshots[2]);assert.notDeepEqual(snapshots[0],snapshots[2]);
 for(const mode of modes){const a=make();sampleParticles(a,mode,100,100,60);const initial=positions(a);sampleParticles(a,mode,2000,100,60);assert.notDeepEqual(positions(a),initial);}
});
test('loop seams are continuous and finite',()=>{
 for(const mode of modes){const a=make(),b=make();sampleParticles(a,mode,PARTICLE_DURATION-.01,100,60,true);sampleParticles(b,mode,0,100,60,true);
  for(let i=0;i<a.length;i++)assert.ok(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y)<.01);
 }
});
test('magnet repels, handles exact hits and stalled frames, and settles back',()=>{
 const a=make(),original=positions(a);
 assert.equal(stepMagnet(a,{x:-1000,y:-1000},1/30,20),false);
 for(let i=0;i<30;i++)stepMagnet(a,{x:15,y:12},1/30,20);
 assert.ok(Math.hypot(a[0].offsetX,a[0].offsetY)>1);
 assert.deepEqual(positions(a),original);
 const b=make(),c=make();stepMagnet(b,{x:15,y:12},100,20);stepMagnet(c,{x:15,y:12},.05,20);assert.deepEqual(b,c);
 let active=true;for(let i=0;i<300;i++)active=stepMagnet(a,null,1/30,20);
 assert.equal(active,false);for(const p of a)assert.equal(p.offsetX+p.offsetY,0);
});
test('particle options roundtrip and reject malformed values; old payloads gain safe defaults',()=>{
 for(const animation of modes)for(const particleDensity of [1,2,3])for(const particleInteraction of [true,false]){
  const s={...DEFAULT,animation,particleDensity,particleInteraction};assert.deepEqual(decodeState(encodeState(s)),s);
 }
 for(const p of [{particleDensity:0},{particleDensity:4},{particleDensity:1.5},{particleDensity:'2'},{particleDensity:null},{particleInteraction:1},{particleInteraction:'false'},{particleInteraction:null}])assert.throws(()=>validateState({...DEFAULT,...p}));
 const {particleDensity,particleInteraction,...old}=DEFAULT;
 const decoded=decodeState('#v1='+LZString.compressToEncodedURIComponent(JSON.stringify(old)));
 assert.deepEqual(decoded,DEFAULT);assert.equal(decoded.animation,old.animation);
});
test('GIF plans sample real motion at every pace and end fully formed for single playback',()=>{
 for(const animation of modes)for(const pace of ['slow','normal','fast']){
  const s={...DEFAULT,animation,pace,repeat:false},plan=exportPlan(s),p=make();
  assert.equal(plan.totalDuration,PARTICLE_DURATION*particleTempo(pace));
  const snapshots=plan.frames.map(f=>{sampleParticles(p,animation,f.time/particleTempo(pace),100,60);return JSON.stringify(positions(p));});
  assert.ok(new Set(snapshots).size>20);
  assert.deepEqual(positions(p),p.map(v=>[v.targetX,v.targetY]));
 }
});
