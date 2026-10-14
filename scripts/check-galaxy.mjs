// npm run test:browser (install Chromium with npx playwright install chromium).
// CHROME_PATH can select an existing Chrome; no external service is used.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DEFAULT,PRESETS,encodeState} from '../src/state.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4174';
const output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-galaxy-check';
await mkdir(output,{recursive:true});
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'ignore'});
let browser;
const state={...DEFAULT,...PRESETS[8],text:'HOLA\nMUNDO',font:'anton',repeat:false,backdrop:'solid',backdropMotion:false,galaxyQuality:'high',pace:'fast'};
const url=(s=state,edit=false)=>base+'/'+encodeState(s).replace('#',edit?'#edit:':'#');
const errors=[];
try{
 for(let i=0;i<100;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1200,height:850}});
 page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(url({...DEFAULT,animation:'letters'},true));await page.waitForTimeout(500);
 assert.ok(!requests.some(r=>r.includes('galaxy-renderer')),'classic must not load WebGL bundle');
 await page.goto(url(state,true));
 await page.waitForFunction(()=>document.querySelectorAll('.particle-canvas').length===1&&!!document.querySelector('.galaxy-canvas')&&!document.querySelector('.galaxy-fallback'));
 await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'Pausar animación',exact:true}).click();
 const paused=await page.locator('.galaxy-canvas').screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await page.waitForTimeout(300);
 assert.ok((await page.locator('.galaxy-canvas').screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(paused),'pause freezes pixels');
 await page.getByRole('button',{name:'Reanudar animación',exact:true}).click();await page.waitForTimeout(300);
 assert.ok(!(await page.locator('.galaxy-canvas').screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(paused),'resume moves');
 await page.getByRole('button',{name:'Repetir animación',exact:true}).click();
 await page.waitForTimeout(300);assert.equal(await page.locator('.galaxy-fallback').count(),0,'replay keeps WebGL alive');
 await page.getByRole('tab',{name:'Movimiento',exact:true}).click();
 assert.equal(await page.getByLabel('Calidad 3D').inputValue(),'high');
 await page.screenshot({path:output+'/editor-desktop.png'});
 const exported=await page.evaluate(async state=>{
  const {paint,waitFonts}=await import('/src/render.ts');const {gifFrameRenderer}=await import('/src/gif-frame.ts');const {exportGif}=await import('/src/export-gif.ts');
  await waitFonts(state);
  const png=document.createElement('canvas'),frame=document.createElement('canvas');await paint(png,state,640,480);
  const renderer=await gifFrameRenderer(frame,state,640,480);renderer.draw(8400);
  const p=png.getContext('2d').getImageData(0,0,640,480).data,f=frame.getContext('2d').getImageData(0,0,640,480).data;
  let diff=0;for(let i=0;i<p.length;i++)diff+=Math.abs(p[i]-f[i]);
  const frames=[];for(const t of [0,1400,2800,4200,5600,8400]){renderer.draw(t);frames.push({time:t,png:frame.toDataURL()});}renderer.dispose();
  let cancelled=false;const controller=new AbortController();try{await exportGif(state,'portrait',controller.signal,p=>{if(p>=2)controller.abort();});}catch(e){cancelled=e.name==='AbortError';}
  const result=await exportGif(state,'landscape',new AbortController().signal,()=>{});
  const decoder=new ImageDecoder({data:await result.blob.arrayBuffer(),type:'image/gif'});await decoder.tracks.ready;
  const count=decoder.tracks.selectedTrack.frameCount,hashes=[];
  for(const index of [0,Math.floor(count/3),Math.floor(count*2/3),count-1]){
   const {image}=await decoder.decode({frameIndex:index});const c=new OffscreenCanvas(640,480),ctx=c.getContext('2d');ctx.drawImage(image,0,0);const bytes=ctx.getImageData(0,0,640,480).data;
   let hash=0;for(let i=0;i<bytes.length;i+=4)hash=(Math.imul(hash,31)+bytes[i])|0;hashes.push(hash);image.close();
  }decoder.close();
  return {diff,cancelled,count,hashes,frames,png:png.toDataURL(),gif:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(result.blob);})};
 },state);
 assert.equal(exported.diff,0,'PNG matches the actual last 3D frame');assert.ok(exported.cancelled);assert.equal(exported.count,101);assert.ok(new Set(exported.hashes).size>=3);
 await writeFile(output+'/galaxy.gif',Buffer.from(exported.gif.split(',')[1],'base64'));await writeFile(output+'/galaxy.png',Buffer.from(exported.png.split(',')[1],'base64'));
 for(const f of exported.frames)await writeFile(`${output}/frame-${f.time}.png`,Buffer.from(f.png.split(',')[1],'base64'));
 console.log('PASS: lazy load, pause/resume/replay, PNG fidelity, real GIF decode, cancellation');
 // Real viewer interaction: drag must not trigger a burst; click must reconstruct.
 console.log('Checking viewer gestures…');await page.goto(url());await page.waitForTimeout(11000);
 const canvas=page.locator('.galaxy-canvas'),box=await canvas.boundingBox(),cx=box.x+box.width*.5,cy=box.y+box.height*.5;
 const hold=await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+50,cy+20,{steps:10});await page.mouse.up();await page.waitForTimeout(400);
 assert.ok(!(await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(hold),'drag changes camera');
 const drag=await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await page.mouse.wheel(0,150);await page.waitForTimeout(1200);assert.ok(!(await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(drag),'wheel zoom');
 const zoom=await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await page.mouse.click(cx,cy);await page.waitForTimeout(900);assert.ok(!(await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(zoom),'tap disperses');await page.waitForTimeout(3500);
 const reformed=await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await writeFile(output+'/before-tap.png',zoom);await writeFile(output+'/after-tap.png',reformed);assert.ok(reformed.equals(zoom),'tap reforms the same pose');
 // Context loss restores the original mounted renderer and shows 2D meanwhile.
 await page.evaluate(()=>{const gl=document.querySelector('.galaxy-canvas').getContext('webgl2');window.loss=gl.getExtension('WEBGL_lose_context');window.loss.loseContext();});
 await page.getByText('Vista 2D · WebGL no disponible').waitFor();
 await page.evaluate(()=>window.loss.restoreContext());await page.waitForFunction(()=>!document.querySelector('.galaxy-fallback'));await page.waitForTimeout(300);
 await page.mouse.move(20,20);await page.getByRole('button',{name:'Pausar animación',exact:true}).click();
 const pausedBeforeLoss=await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});
 await page.evaluate(()=>window.loss.loseContext());await page.getByText('Vista 2D · WebGL no disponible').waitFor();
 await page.evaluate(()=>window.loss.restoreContext());await page.waitForFunction(()=>!document.querySelector('.galaxy-fallback'));
 assert.ok((await canvas.screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(pausedBeforeLoss),'paused context restores without needing another RAF');
 console.log('PASS: drag, zoom, deliberate tap/reform, context loss/restoration including pause');
 const trailer={...state,text:'UNO\nDOS',animation:'trailer',trailerGalaxy:true,trailerMix:true};
 await page.goto(url(trailer,true));await page.waitForTimeout(400);
 await page.getByRole('button',{name:'Ver mensaje completo',exact:true}).click();
 const lastIndex=await page.locator('.trailer-stage').getAttribute('data-scene');assert.equal(lastIndex,'2');
 await page.getByRole('button',{name:'Pausar animación',exact:true}).click();await page.waitForTimeout(300);assert.equal(await page.locator('.trailer-stage').getAttribute('data-scene'),lastIndex);
 await page.getByRole('button',{name:'Ver escena 1: UNO',exact:true}).click();assert.equal(await page.locator('.trailer-stage').getAttribute('data-scene'),'0');
 await page.evaluate(async state=>{const {exportGif}=await import('/src/export-gif.ts');const result=await exportGif(state,'portrait',new AbortController().signal,()=>{});if(!result.blob.size)throw Error('empty mixed GIF');},trailer);
 console.log('PASS: mixed trailer seeking, pause, export');
 const reduced=await browser.newPage({locale:'es-ES',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await reduced.goto(url());await reduced.waitForFunction(()=>document.querySelectorAll('.particle-canvas').length===1);await reduced.waitForTimeout(250);
 const still=await reduced.locator('.galaxy-canvas').screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'});await reduced.touchscreen.tap(190,300);await reduced.waitForTimeout(200);assert.ok((await reduced.locator('.galaxy-canvas').screenshot({style:'.viewer-bar,.viewer-language,.origin-credit {visibility:hidden!important}'})).equals(still),'reduced motion ignores taps');
 await reduced.screenshot({path:output+'/reduced-mobile.png'});
 await reduced.goto(url({...state,text:'¡ÓRBITA!\n👩🏽‍🚀\nEl futuro empieza aquí.'},true));await reduced.getByRole('tab',{name:'Movimiento',exact:true}).click();await reduced.waitForTimeout(300);
 assert.ok(await reduced.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await reduced.screenshot({path:output+'/editor-mobile.png'});
 await reduced.setViewportSize({width:320,height:640});await reduced.waitForTimeout(300);assert.equal(await reduced.locator('.galaxy-fallback').count(),0,'resize keeps WebGL alive');await reduced.screenshot({path:output+'/editor-small.png'});await reduced.close();
 const fallback=await browser.newPage({locale:'es-ES'});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
 await fallback.goto(url());await fallback.getByText('Vista 2D · WebGL no disponible').waitFor();
 const failures=await fallback.evaluate(async state=>{const {paint}=await import('/src/render.ts');const {exportGif}=await import('/src/export-gif.ts');const failures=[];for(const run of [()=>paint(document.createElement('canvas'),state,640,480),()=>exportGif(state,'square',new AbortController().signal,()=>{})])try{await run();}catch(e){failures.push(e.message);}return failures;},state);
 assert.equal(failures.length,2);assert.ok(failures.every(f=>f.includes('WebGL')));await fallback.close();
 assert.deepEqual(errors,[]);console.log('PASS: reduced motion, mobile layout, WebGL fallback and honest PNG/GIF failures');
 console.log(`Artifacts: ${output}`);
}finally{await browser?.close();server?.kill();}
