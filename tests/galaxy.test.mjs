import test from 'node:test';
import assert from 'node:assert/strict';
import LZString from 'lz-string';
import {createGalaxy,sampleGalaxy,galaxyCamera,galaxyTime,galaxyBudget,galaxyBurst,GALAXY_DURATION} from '../src/galaxy.mjs';
import {DEFAULT,validateState,encodeState,decodeState} from '../src/state.mjs';
import {buildTrailer,trailerPosition} from '../src/trailer.mjs';
import {exportPlan} from '../src/export-plan.mjs';

function mask(){
 const width=80,height=60,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=5;y<55;y++)for(let x=8;x<72;x++)if(x<12||x>67||y<9||y>50)rgba[(y*width+x)*4+3]=255;
 // A disconnected one-pixel accent should survive sampling at this budget.
 rgba[(2*width+40)*4+3]=255;
 return {rgba,width,height};
}
function field(seed=42,budget=2000){const {rgba,width,height}=mask();return createGalaxy(rgba,width,height,budget,seed,12);}

test('galaxy samples are reproducible, volumetric and inside opaque contours, never counters',()=>{
 const a=field(),b=field(),{rgba,width,height}=mask();assert.deepEqual(a,b);assert.notDeepEqual(a.cloud,field(43).cloud);
 let accent=false;const depths=new Set();
 for(let i=0;i<a.count;i++){
  const x=Math.floor(a.home[i*3]+width/2),y=Math.floor(height/2-a.home[i*3+1]);
  assert.equal(rgba[(y*width+x)*4+3],255);depths.add(a.home[i*3+2]);
  if(x===40&&y===2)accent=true;
 }
 assert.ok(accent);assert.ok(depths.size>20);assert.ok(depths.has(-6)&&depths.has(6));
 assert.ok(field(42,50).count<=150);
 assert.equal(createGalaxy(new Uint8Array(16),2,2).count,0);
});
test('arbitrary galaxy times seek independently, stay finite, converge and replay exactly',()=>{
 const a=field(),b=field();
 for(const time of [12000,0,3800,9999,2100,6000,4500]){
  assert.deepEqual(sampleGalaxy(a,time),sampleGalaxy(b,time));
  assert.ok(a.positions.every(Number.isFinite));
 }
 assert.deepEqual(sampleGalaxy(a,12000),a.home);assert.deepEqual(sampleGalaxy(a,0),a.cloud);
 assert.notDeepEqual(sampleGalaxy(a,3500),a.home);
 assert.deepEqual(sampleGalaxy(a,0),sampleGalaxy(b,0));
});
test('galaxy loop positions and camera meet at the seam; camera remains legible at reveal',()=>{
 const a=field();const start=new Float32Array(sampleGalaxy(a,0,true));const end=sampleGalaxy(a,12000,true);
 for(let i=0;i<start.length;i++)assert.ok(Math.abs(start[i]-end[i])<.001);
 assert.deepEqual(galaxyCamera(0,true,true),galaxyCamera(12000,true,true));
 for(let t=6000;t<=12000;t+=50){const p=galaxyCamera(t);assert.ok(Math.abs(p.yaw)<.3);assert.ok(p.distance>=1);assert.ok(Object.values(p).every(Number.isFinite));}
 assert.deepEqual(galaxyCamera(12000),galaxyCamera(0,false));
});
test('pace, trailer compression, pause sample, reduced motion and bounded burst',()=>{
 for(const [pace,scale] of [['normal',1],['fast',.7],['slow',1.45]]){
  assert.equal(galaxyTime(12000*scale,pace),12000);
  assert.equal(galaxyTime(12000*scale,pace,undefined,true),0);
  assert.equal(galaxyTime(3250,pace,6500),6000);
 }
 assert.equal(galaxyTime(-50),0);assert.equal(galaxyTime(Infinity),0);
 assert.equal(galaxyTime(0,'normal',undefined,true,true),12000);
 assert.equal(galaxyBurst(-1),0);assert.equal(galaxyBurst(2600),0);assert.ok(galaxyBurst(1300)>.8);
 assert.equal(galaxyTime(3000),galaxyTime(3000));
});
test('quality budgets use capabilities and dimensions and have hard memory bounds',()=>{
 assert.ok(galaxyBudget('auto',390,800,8)<galaxyBudget('auto',1000,800,8));
 assert.ok(galaxyBudget('auto',1000,800,2)<galaxyBudget('auto',1000,800,8));
 assert.equal(galaxyBudget('high'),6000);assert.equal(galaxyBudget('low'),2400);
});
test('3D v1 options roundtrip strictly; actual old payloads gain safe defaults',()=>{
 for(const galaxyQuality of ['auto','low','high'])for(const galaxyCamera of [false,true]){
  const state={...DEFAULT,animation:'particle-galaxy',text:'ÓRBITA\n👩🏽‍🚀',galaxyQuality,galaxyCamera,trailerGalaxy:true};assert.deepEqual(decodeState(encodeState(state)),state);
 }
 const {galaxyQuality,galaxyCamera,trailerGalaxy,...old}=DEFAULT;
 const decoded=decodeState('#v1='+LZString.compressToEncodedURIComponent(JSON.stringify(old)));
 assert.deepEqual(decoded,DEFAULT);assert.equal(decoded.animation,old.animation);
 for(const patch of [{galaxyQuality:'ultra'},{galaxyQuality:null},{galaxyCamera:1},{galaxyCamera:null},{trailerGalaxy:'true'},{trailerGalaxy:null}])assert.throws(()=>validateState({...DEFAULT,...patch}));
});
test('3D and mixed trailers seek/repeat deterministically and GIF uses the identical clock',()=>{
 for(const trailerMix of [false,true])for(const trailerSeed of [0,1])for(const pace of ['fast','normal','slow']){
  const state={...DEFAULT,animation:'trailer',trailerGalaxy:true,trailerMix,trailerSeed,pace,repeat:false,text:'HOLA\nMUNDO'};
  const trailer=buildTrailer(state),gif=exportPlan(state);
  assert.deepEqual(buildTrailer(decodeState(encodeState(state))),trailer);
  assert.ok(trailer.scenes.some(s=>s.state.animation==='particle-galaxy'));
  if(trailerMix)assert.ok(trailer.scenes.some(s=>s.state.animation!=='particle-galaxy'));
  for(const [index,scene] of trailer.scenes.entries()){
   const elapsed=scene.start+scene.duration*.5,position=trailerPosition(trailer,elapsed,false),frame=gif.sceneAt(elapsed);
   assert.equal(position.index,index);assert.equal(frame.time,position.localTime);
   assert.deepEqual(position,trailerPosition(trailer,elapsed,false));
   assert.equal(trailerPosition(trailer,trailer.totalDuration+elapsed,true).index,index);
   if(scene.state.animation==='particle-galaxy')assert.equal(galaxyTime(frame.time,pace,frame.particleDuration),6000);
  }
  assert.equal(gif.sceneAt(gif.frames.at(-1).time).state.text,state.text);
 }
});
test('3D GIF ends on the same formed pose as PNG and contains real motion at every pace',()=>{
 for(const pace of ['fast','normal','slow']){
  const state={...DEFAULT,animation:'particle-galaxy',pace,repeat:false},plan=exportPlan(state),a=field();
  assert.equal(galaxyTime(plan.frames.at(-1).time,pace),GALAXY_DURATION);
  assert.deepEqual(sampleGalaxy(a,galaxyTime(plan.frames.at(-1).time,pace)),a.home);
  const positions=plan.frames.map(f=>sampleGalaxy(a,galaxyTime(f.time,pace))[0]);
  assert.ok(new Set(positions).size>30);
 }
});

test('side walls span the extrusion without crossing the inner or outer glyph contour',()=>{
 const a=field(),{rgba,width,height}=mask();let wallCount=0;
 for(let i=1;i<a.count;i+=3){if(!a.rim[i])continue;wallCount++;
  const x=Math.floor(a.home[i*3]+width/2),y=Math.floor(height/2-a.home[i*3+1]);
  assert.equal(rgba[(y*width+x)*4+3],255);assert.ok(Math.abs(a.home[i*3+2])<=6);
 }
 assert.ok(wallCount>a.count/6);
});
test('orbital ribbons are deterministic, volumetric and continuous at the loop seam',async()=>{
 const {createGalaxyOrbits,sampleGalaxyOrbits,galaxyAtmosphere}=await import('../src/galaxy-atmosphere.mjs');
 const a=createGalaxyOrbits(800,600,100,4),b=createGalaxyOrbits(800,600,100,4);
 assert.deepEqual(a,b);
 for(const t of [12000,3500,0,6000]){assert.deepEqual(sampleGalaxyOrbits(a,t),sampleGalaxyOrbits(b,t));assert.ok(a.positions.every(Number.isFinite));}
 const start=new Float32Array(sampleGalaxyOrbits(a,0));assert.deepEqual(sampleGalaxyOrbits(a,12000),start);
 assert.ok(a.positions.some((p,i)=>i%3===2&&Math.abs(p)>100));
 assert.equal(galaxyAtmosphere(0,true).orbits,galaxyAtmosphere(12000,true).orbits);
 assert.equal(galaxyAtmosphere(12000).structure,1);
});
test('crystal connections stay inside the opaque mask, including between samples',async()=>{
 const {galaxyConnections}=await import('../src/galaxy-atmosphere.mjs');const a=field(),{rgba,width,height}=mask();
 const links=galaxyConnections(a,rgba,width,height);assert.ok(links.length>0);assert.ok(links.length<=a.count*2);
 assert.deepEqual(links,galaxyConnections(a,rgba,width,height));
 for(let i=0;i<links.length;i+=2){const first=links[i]*3,second=links[i+1]*3;
  for(let n=1;n<=8;n++){const t=n/9,x=Math.floor(a.home[first]*(1-t)+a.home[second]*t+width/2),y=Math.floor(height/2-a.home[first+1]*(1-t)-a.home[second+1]*t);assert.equal(rgba[(y*width+x)*4+3],255);}
 }
});
