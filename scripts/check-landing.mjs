// CHROME_PATH=/path/to/Chrome npm run test:landing
// Observe real playback: seeking CSS animations hid a previous intermittent bug.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4176';
const output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-landing-check';
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'ignore'});
let browser;
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<60;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
 const errors=[];
 for(const [index,random] of [0,.4,.8].entries()){
  const page=await browser.newPage({locale:'es-ES',viewport:{width:976,height:571}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(value=>Math.random=()=>value,random);
  // A cold font request must not disturb letter order or restart the cursor.
  await page.route('**/*.woff2*',async route=>{await new Promise(r=>setTimeout(r,180));await route.continue();});
  await page.goto(base);
  const trace=page.evaluate(()=>new Promise(resolve=>{
   const samples=[],start=performance.now();
   const sample=()=>{
    const chars=[...document.querySelectorAll('.landing-type-char')],carets=[...document.querySelectorAll('.landing-type-caret')];
    samples.push({letters:chars.map(c=>getComputedStyle(c).visibility==='visible'),caretCount:carets.length,cursor:carets.some(c=>getComputedStyle(c).visibility==='visible')});
    if(performance.now()-start<4300)requestAnimationFrame(sample);else resolve(samples);
   };sample();
  }));
  await page.waitForTimeout(500);
  await page.getByRole('textbox',{name:'Tu mensaje',exact:true}).fill('Escribiendo durante la entrada');
  await page.setViewportSize({width:320,height:640});
  await page.waitForTimeout(250);
  await page.getByRole('textbox',{name:'Tu mensaje',exact:true}).fill('Otra frase');
  // Simulate a busy main thread: the clock must catch up without leaving holes.
  await page.evaluate(()=>{const end=performance.now()+160;while(performance.now()<end){/* intentional test stall */}});
  const samples=await trace,counts=samples.map(s=>s.letters.filter(Boolean).length);
  assert.ok(new Set(counts).size>4,'observed natural progressive typing');
  let previous=0;
  for(const sample of samples){
   assert.equal(sample.caretCount,1,'exactly one caret in every frame');
   const firstHidden=sample.letters.indexOf(false);
   if(firstHidden!==-1)assert.ok(sample.letters.slice(firstHidden).every(v=>!v),'visible characters must be a contiguous prefix');
   const count=sample.letters.filter(Boolean).length;assert.ok(count>=previous,'typing never goes backwards');previous=count;
  }
  assert.ok(samples.at(-1).letters.every(Boolean));assert.equal(samples.at(-1).cursor,false);
  const blinking=samples.filter(s=>s.letters.every(Boolean)).map(s=>s.cursor).filter((value,i,all)=>i===0||value!==all[i-1]);
  assert.deepEqual(blinking,[true,false,true,false],'exactly two final blinks, then off');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/fixed-mobile-${index}.png`});
  await page.setViewportSize({width:976,height:571});await page.screenshot({path:`${output}/fixed-desktop-${index}.png`});
  await page.getByRole('textbox',{name:'Tu mensaje',exact:true}).press('Enter');await page.locator('.edit-app').waitFor();
  await page.close();
 }
 const reduced=await browser.newPage({locale:'es-ES',reducedMotion:'reduce'});
 await reduced.goto(base);
 assert.ok(await reduced.locator('.landing-type-char').evaluateAll(chars=>chars.length>0&&chars.every(c=>getComputedStyle(c).visibility==='visible')));
 assert.equal(await reduced.locator('.landing-type-caret').evaluate(c=>getComputedStyle(c).display),'none');
 await reduced.emulateMedia({reducedMotion:'no-preference'});await reduced.waitForTimeout(150);
 assert.equal(await reduced.locator('.landing-type-caret').getAttribute('data-visible'),'false','motion preference changes do not restart typing');
 // Changing the preference during playback also completes the text immediately.
 await reduced.reload();await reduced.waitForTimeout(500);await reduced.emulateMedia({reducedMotion:'reduce'});
 assert.ok(await reduced.locator('.landing-type-char').evaluateAll(chars=>chars.every(c=>getComputedStyle(c).visibility==='visible')));
 await reduced.close();assert.deepEqual(errors,[]);
 console.log('PASS: three themes, real playback without holes or duplicate cursors, two final blinks, delayed fonts, typing, resize, stalled frames, reduced motion, editor navigation.');
 console.log(`Artifacts: ${output}`);
}finally{await browser?.close();server?.kill();}
