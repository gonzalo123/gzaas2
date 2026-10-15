// CHROME_PATH can select a locally installed Chrome. No external service is used.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DEFAULT,encodeState,decodeState} from '../src/state.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4178';
const output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-silk-check';
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:'ignore'});
const state={...DEFAULT,text:'DILO\nCON SEDA.',font:'anton',fg:'#fff5ed',bg:'#171020',accent:'#9b7ed9',backdrop:'silk',backdropMotion:true,animation:'none',pace:'normal'};
const url=(s=state,edit=false)=>base+'/'+encodeState(s).replace('#',edit?'#edit:':'#');
let browser;
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1280,height:900}}),errors=[],requests=[];
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext;window.silkContexts=[];
  HTMLCanvasElement.prototype.getContext=function(kind,...args){const ctx=get.call(this,kind,...args);if(kind==='webgl'&&ctx)window.silkContexts.push(ctx);return ctx;};
 });
 await page.goto(url({...state,backdrop:'solid'},true));await page.waitForTimeout(300);
 assert.ok(!requests.some(r=>r.includes('silk-renderer')),'other backgrounds do not load Silk');
 await page.getByRole('tab',{name:'Fondos',exact:true}).click();
 await page.getByRole('button',{name:'Colección de fondos siguiente',exact:true}).click();
 const choice=page.getByRole('button',{name:'Seda (Silk)',exact:true});
 await choice.click();
 const canvas=page.locator('.poster-art .backdrop-canvas');
 await canvas.waitFor();await page.waitForTimeout(400);
 assert.equal(await choice.getAttribute('aria-pressed'),'true');
 assert.equal(decodeState(new URL(page.url()).hash.replace('#edit:','#')).backdrop,'silk');
 assert.equal(await canvas.getAttribute('data-backend'),'webgl');
 assert.equal(await choice.locator('canvas').getAttribute('data-backend'),'software','thumbnail allocates no WebGL context');
 const pixels=()=>canvas.evaluate(c=>c.toDataURL());
 const moving=await pixels();await page.waitForTimeout(250);assert.notEqual(await pixels(),moving,'real playback moves');
 await page.getByRole('button',{name:'Pausar animación',exact:true}).click();
 const paused=await pixels();await page.waitForTimeout(250);assert.equal(await pixels(),paused,'pause holds exact pixels');
 await page.getByRole('button',{name:'Reanudar animación',exact:true}).click();await page.waitForTimeout(250);assert.notEqual(await pixels(),paused);
 await page.getByRole('button',{name:'Repetir animación',exact:true}).click();await page.waitForTimeout(150);
 await page.getByLabel('Animar el fondo',{exact:true}).uncheck();await page.waitForTimeout(150);
 const still=await pixels();await page.waitForTimeout(250);assert.equal(await pixels(),still,'static toggle stops animation');
 await page.screenshot({path:output+'/editor-desktop.png'});
 await page.getByLabel('Animar el fondo',{exact:true}).check();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
 assert.equal(await pixels(),still,'reduced motion uses canonical static frame');
 await page.waitForTimeout(250);assert.equal(await pixels(),still);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(250);assert.notEqual(await pixels(),still);
 // Simulate a driver/context loss: the same visible canvas continues in software.
 await page.evaluate(()=>window.silkContexts.at(-1).getExtension('WEBGL_lose_context').loseContext());
 await page.waitForFunction(()=>document.querySelector('.poster-art .backdrop-canvas')?.dataset.backend==='software');
 console.log('PASS: lazy load, selector, link, thumbnail, play/pause/replay, static/reduced motion, context loss');

 await page.goto(url());await canvas.waitFor();await page.waitForTimeout(150);
 assert.equal(await page.locator('.viewer').count(),1,'shared link opens viewer');
 const exported=await page.evaluate(async state=>{
  const {createSilkRenderer}=await import('/src/silk-renderer.ts');
  const {paint,waitFonts}=await import('/src/render.ts');
  const {gifFrameRenderer}=await import('/src/gif-frame.ts');
  const {exportGif}=await import('/src/export-gif.ts');
  const {exportPlan}=await import('/src/export-plan.mjs');
  const {buildTrailer}=await import('/src/trailer.mjs');
  await waitFonts(state);
  const gpu=createSilkRenderer(state,320,240),cpu=createSilkRenderer(state,320,240,true);
  gpu.draw(0);const start=gpu.canvas.toDataURL();gpu.draw(1500);const middle=gpu.canvas.toDataURL();gpu.draw(6000);const loop=gpu.canvas.toDataURL();
  gpu.draw(1500);const seek=gpu.canvas.toDataURL();cpu.draw(1500);
  const a=gpu.canvas.getContext('2d').getImageData(0,0,320,240).data,b=cpu.canvas.getContext('2d').getImageData(0,0,320,240).data;
  const cpuDiff=a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
  gpu.dispose();cpu.dispose();
  const png=document.createElement('canvas'),frame=document.createElement('canvas');await paint(png,state,640,480);
  const renderer=await gifFrameRenderer(frame,state,640,480);renderer.draw(0);const pngMatches=png.toDataURL()===frame.toDataURL();renderer.dispose();
  const result=await exportGif(state,'landscape',new AbortController().signal,()=>{});
  const decoder=new ImageDecoder({data:await result.blob.arrayBuffer(),type:'image/gif'});await decoder.tracks.ready;
  const count=decoder.tracks.selectedTrack.frameCount,hashes=[];
  for(const frameIndex of [0,Math.floor(count/4),Math.floor(count/2)]){
   const {image}=await decoder.decode({frameIndex}),c=new OffscreenCanvas(640,480),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
   const bytes=ctx.getImageData(0,0,640,480).data;let hash=0;for(let i=0;i<bytes.length;i+=4)hash=(Math.imul(hash,31)+bytes[i])|0;hashes.push(hash);image.close();
  }decoder.close();
  let cancelled=false;const controller=new AbortController();
  try{await exportGif(state,'portrait',controller.signal,p=>{if(p>2)controller.abort();});}catch(e){cancelled=e.name==='AbortError';}
  const staticState={...state,backdropMotion:false},staticRenderer=await gifFrameRenderer(frame,staticState,320,240);
  staticRenderer.draw(0);const staticStart=frame.toDataURL();staticRenderer.draw(1500);const staticEnd=frame.toDataURL();staticRenderer.dispose();
  const modes=[];
  for(const animation of ['letters','particle-assemble','particle-galaxy']){
   const r=await gifFrameRenderer(frame,{...state,animation},320,240);r.draw(0);const first=frame.toDataURL();r.draw(1500);modes.push(first!==frame.toDataURL());r.dispose();
  }
  const trailerState={...state,animation:'trailer'},trailer=buildTrailer(trailerState),plan=exportPlan(trailerState);
  for(const scene of trailer.scenes){const r=await gifFrameRenderer(frame,scene.state,320,240,scene.duration);r.draw(scene.duration/2);r.dispose();}
  return {start,middle,loop,seek,cpuDiff,pngMatches,count,hashes,cancelled,staticMatches:staticStart===staticEnd,modes,
   trailerBackground:plan.sceneAt(plan.totalDuration).state.backdrop,
   png:png.toDataURL(),gif:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(result.blob);})};
 },state);
 assert.notEqual(exported.start,exported.middle);assert.equal(exported.start,exported.loop,'loop seam is exact');assert.equal(exported.seek,exported.middle,'seek is independent of previous frames');
 assert.ok(exported.cpuDiff<.15,`CPU/GPU mean pixel difference ${exported.cpuDiff}`);
 assert.ok(exported.pngMatches,'PNG matches static preview/render frame');assert.equal(exported.count,72);assert.equal(new Set(exported.hashes).size,3);
 assert.ok(exported.cancelled);assert.ok(exported.staticMatches);assert.ok(exported.modes.every(Boolean));assert.equal(exported.trailerBackground,'silk');
 await writeFile(output+'/silk.png',Buffer.from(exported.png.split(',')[1],'base64'));await writeFile(output+'/silk.gif',Buffer.from(exported.gif.split(',')[1],'base64'));
 console.log('PASS: deterministic frames, loop seam, CPU/GPU agreement, PNG, decoded GIF, cancellation, text/particles/Galaxy/trailer');

 await page.setViewportSize({width:390,height:844});await page.goto(url(state,true));await canvas.waitFor();
 if(!await page.getByLabel('Color base del fondo',{exact:true}).isVisible())await page.getByRole('tab',{name:'Fondos',exact:true}).click();
 assert.ok(await page.getByLabel('Color base del fondo',{exact:true}).isVisible(),'background controls visible on mobile');
 await page.getByRole('button',{name:'Pausar animación',exact:true}).click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
 const bounds=await canvas.boundingBox();assert.ok(bounds.width>100&&bounds.height>100);
 await page.screenshot({path:output+'/editor-mobile.png'});
 const beforeColor=await pixels();
 await page.getByLabel('Color acento del fondo',{exact:true}).fill('#d58b77');await page.waitForTimeout(150);
 assert.notEqual(await pixels(),beforeColor,'accent control redraws Silk');
 await page.waitForURL(u=>decodeState(u.hash.replace('#edit:','#')).accent==='#d58b77');
 assert.equal(decodeState(new URL(page.url()).hash.replace('#edit:','#')).accent,'#d58b77');
 // Fresh browser without WebGL verifies both the displayed and exported fallback.
 const fallback=await browser.newPage({locale:'es-ES'});fallback.on('pageerror',e=>errors.push(e.message));
 await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'||kind==='webgl2'?null:get.call(this,kind,...args);};});
 await fallback.goto(url({...state,backdropMotion:false}));await fallback.waitForSelector('.backdrop-canvas[data-backend="software"]');
 const softwareExport=await fallback.evaluate(async state=>{
  const {paint,waitFonts}=await import('/src/render.ts'),{exportGif}=await import('/src/export-gif.ts');await waitFonts(state);
  const canvas=document.createElement('canvas');await paint(canvas,state,320,240);
  const gif=await exportGif(state,'portrait',new AbortController().signal,()=>{});
  return {png:canvas.toDataURL().length,gif:gif.blob.size};
 },{...state,backdropMotion:false});
 assert.ok(softwareExport.png>2000&&softwareExport.gif>1000);await fallback.close();
 assert.deepEqual(errors,[]);console.log('PASS: mobile, color controls, shared viewer and PNG/GIF without WebGL');
 if(process.env.TEST_PREVIEW_FILE){
  const offline=await browser.newPage({locale:'es-ES'});await offline.route(/^https?:/,route=>route.abort());
  await offline.goto('file://'+process.env.TEST_PREVIEW_FILE+encodeState({...state,backdropMotion:false}));
  await offline.waitForSelector('.backdrop-canvas[data-backend]');
  const data=await offline.locator('.backdrop-canvas').evaluate(c=>c.toDataURL());assert.ok(data.length>2000);
  await offline.close();console.log('PASS: standalone HTML works offline');
 }
}finally{await browser?.close();server?.kill();}
