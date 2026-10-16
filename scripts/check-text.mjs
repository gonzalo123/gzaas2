import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DEFAULT,ANIMATIONS,encodeState,decodeState} from '../src/state.mjs';
import {REACT_BITS_TEXT} from '../src/text-motion.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4181',output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-text-check';
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'ignore'});
const state={...DEFAULT,text:'CADA\nPALABRA\nCUENTA.',font:'anton',fg:'#fff5ed',bg:'#171020',accent:'#ba91e8',backdrop:'solid',backdropMotion:false,repeat:false};
const url=(animation,edit=true)=>base+'/'+encodeState({...state,animation}).replace('#',edit?'#edit:':'#');
let browser;
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1280,height:900}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.setDefaultTimeout(15000);
 await page.goto(url('letters'));await page.getByRole('tab',{name:'Movimiento',exact:true}).click();
 assert.ok(!requests.some(r=>r.includes('react-bits-text-renderer')),'classic motion keeps the renderer lazy');
 await page.getByRole('button',{name:'React Bits',exact:true}).click();
 const canvas=page.locator('.react-bits-text-canvas'),cards=page.locator('.motion-react-bits .motion-card');
 assert.equal(await cards.count(),8);
 for(const animation of REACT_BITS_TEXT){
  await page.getByRole('button',{name:ANIMATIONS.find(a=>a.id===animation).name,exact:true}).click();
  await canvas.waitFor();await page.waitForTimeout(160);
  await page.waitForURL(u=>decodeState(u.hash.replace('#edit:','#')).animation===animation);
  const first=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(animation==='rb-focus'?1400:200);
  assert.ok(await canvas.evaluate(c=>c.toDataURL())!==first,animation+' animates');
  await page.getByRole('button',{name:'Pausar animación',exact:true}).click();await page.waitForTimeout(50);
  const paused=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(140);
  assert.ok(await canvas.evaluate(c=>c.toDataURL())===paused,animation+' pause freezes pixels');
  await page.screenshot({path:output+'/'+animation+'-desktop.png'});
  await page.getByRole('button',{name:'Reanudar animación',exact:true}).click();
 }
 console.log('PASS: eight selectable effects, shared URLs, real motion and pause');
 const samples=await page.evaluate(async({state,ids})=>{
  const {createTextRenderer}=await import('/src/react-bits-text-renderer.ts');
  const {paint,waitFonts}=await import('/src/render.ts'),{gifFrameRenderer}=await import('/src/gif-frame.ts');
  const results=[];
  for(const animation of ids){
   const s={...state,animation};await waitFonts(s);
   const r=createTextRenderer(s,320,240);r.draw(700);const early=r.canvas.toDataURL();r.draw(1600);const middle=r.canvas.toDataURL();r.draw(700);const again=r.canvas.toDataURL();
   r.draw(6000);const final=r.canvas.toDataURL();r.draw(0,true);const reduced=r.canvas.toDataURL();
   const expected=document.createElement('canvas');expected.width=320;expected.height=240;
   const {layoutText,paintTextUnit}=await import('/src/render.ts'),ctx=expected.getContext('2d'),geometry=layoutText(ctx,s,320,240);
   for(const l of geometry.lines)paintTextUnit(ctx,s,geometry.fontSize,l.text,l.x,l.y,s.align);
   const finalText=expected.toDataURL();r.dispose();
   const c=document.createElement('canvas');await paint(c,s,320,240);const png=c.toDataURL();const gif=await gifFrameRenderer(c,s,320,240);gif.draw(6000);const last=c.toDataURL();gif.dispose();
   let styles=true;
   for(const font of ['sans','pacifico','monoton'])for(const effect of ['none','outline','shadow','neon','echo']){
    const variant={...s,font,effect,text:'Sí 👩🏽‍💻\n你好 مرحبا',align:'right',pace:'fast'};await waitFonts(variant);await paint(c,variant,320,240);const png=c.toDataURL();const g=await gifFrameRenderer(c,variant,320,240);g.draw(4200);styles&&=png===c.toDataURL();g.dispose();
   }
   results.push({animation,seek:early===again,moving:early!==middle,final:final===finalText,reduced:reduced===finalText,png:png===last,styles});
  }
  return results;
 },{state,ids:REACT_BITS_TEXT});
 for(const result of samples)for(const [key,value] of Object.entries(result))if(key!=='animation')assert.ok(value,result.animation+': '+key);
 console.log('PASS: deterministic seeking; final/reduced text matches PNG; multilingual text, fonts and effects');
 for(const animation of ['rb-type','rb-stroke']){
  const result=await page.evaluate(async state=>{
   const {exportGif}=await import('/src/export-gif.ts');
   const result=await exportGif(state,'landscape',new AbortController().signal,()=>{});
   const decoder=new ImageDecoder({data:await result.blob.arrayBuffer(),type:'image/gif'});await decoder.tracks.ready;
   const hashes=[];for(const i of [2,18,71]){const {image}=await decoder.decode({frameIndex:i});const c=document.createElement('canvas');c.width=image.displayWidth;c.height=image.displayHeight;c.getContext('2d').drawImage(image,0,0);hashes.push(c.toDataURL());image.close();}
   const frames=decoder.tracks.selectedTrack.frameCount;decoder.close();
   const abort=new AbortController();let cancelled=false;try{await exportGif(state,'square',abort.signal,p=>{if(p>2)abort.abort();});}catch(e){cancelled=e.name==='AbortError';}
   return {frames,moving:new Set(hashes).size===3,cancelled,duration:result.duration};
  },{...state,animation});
  assert.equal(result.frames,72);assert.equal(result.duration,6000);assert.ok(result.moving);assert.ok(result.cancelled);
 }
 console.log('PASS: real GIF files decode with 72 frames and motion; cancellation cleans up');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url('rb-focus',false));await canvas.waitFor();await page.waitForTimeout(150);
 assert.equal(await page.locator('.viewer').count(),1);
 const reduced=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(150);assert.equal(await canvas.evaluate(c=>c.toDataURL()),reduced);
 await page.setViewportSize({width:390,height:844});await page.goto(url('rb-fold'));if(!await cards.first().isVisible())await page.getByRole('tab',{name:'Movimiento',exact:true}).click();
 assert.equal(await cards.count(),8);
 for(const card of await cards.all()){const b=await card.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390,'cards fit mobile width');}
 const settings=await page.locator('.motion-settings').boundingBox(),panel=await page.locator('#editor-panel').boundingBox();
 assert.ok(settings.y+settings.height<=panel.y+panel.height+1,'pace and loop fit mobile panel');
 await page.screenshot({path:output+'/mobile.png'});
 await page.getByRole('button',{name:'Letras',exact:true}).click();assert.equal(await canvas.count(),0);assert.equal(await page.locator('.motion-card[aria-pressed="true"]').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: viewer, reduced motion, mobile controls and return to classic motion');
 if(process.env.TEST_PREVIEW_FILE){
  await page.route(/^https?:/,route=>route.abort());
  for(const animation of REACT_BITS_TEXT){await page.goto('file://'+process.env.TEST_PREVIEW_FILE+encodeState({...state,animation}));await canvas.waitFor();}
  console.log('PASS: all eight text effects work in standalone HTML offline');
 }
}finally{await browser?.close();server?.kill();}
