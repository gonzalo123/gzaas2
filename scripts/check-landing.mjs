// CHROME_PATH=/path/to/Chrome npm run test:landing
// Observe real playback: seeking CSS animations hid a previous intermittent bug.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ANIMATIONS,BACKDROPS,BACKDROP_COLLECTIONS,DEFAULT,encodeState,decodeState,isReactBitsBackdrop} from '../src/state.mjs';
import {REACT_BITS_TEXT} from '../src/text-motion.mjs';
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
  console.log(`Checking landing theme ${index+1}/3…`);
  const page=await browser.newPage({locale:'es-ES',viewport:{width:976,height:571}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(value=>Math.random=()=>value,random);
  // A cold font request must not shift word slots or restart the decode.
  await page.route('**/*.woff2*',async route=>{await new Promise(r=>setTimeout(r,180));await route.continue();});
  await page.goto(base);
  const trace=page.evaluate(()=>new Promise(resolve=>{
   const samples=[],start=performance.now();
   const sample=()=>{
    const root=document.querySelector('.landing-tagline'),sources=[...root.querySelectorAll('.landing-cipher-source')],glyphs=[...root.querySelectorAll('.landing-cipher-glyph')];
    const originals=sources.flatMap(source=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(source.textContent),g=>g.segment));
    const complete=root.dataset.complete==='true';
    samples.push({complete,letters:originals.flatMap((char,i)=>/[\p{L}\p{N}]/u.test(char)?[complete||glyphs[i]?.dataset.decoded==='true']:[]),
     scrambled:glyphs.some(g=>g.dataset.decoded==='false'&&+getComputedStyle(g).opacity>0),text:glyphs.map(g=>g.textContent).join(''),
     cursorCount:root.querySelectorAll('.landing-type-caret').length,
     layout:document.fonts.check('400 30px "DM Serif Display"')?{width:innerWidth,font:getComputedStyle(root).fontSize,words:sources.map(source=>({left:source.getBoundingClientRect().left,width:source.getBoundingClientRect().width}))}:null});
    if(performance.now()-start<2600)requestAnimationFrame(sample);else resolve(samples);
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
  assert.ok(new Set(counts).size>4,'observed natural progressive decoding');
  assert.ok(samples.some(s=>s.scrambled),'real scrambled glyphs appear');
  assert.ok(new Set(samples.filter(s=>s.scrambled).map(s=>s.text)).size>3,'cipher glyphs change before settling');
  const layouts=new Map();
  for(const {layout} of samples){if(!layout)continue;const key=layout.width+':'+layout.font,previous=layouts.get(key);
   if(previous)layout.words.forEach((word,i)=>{assert.ok(Math.abs(word.left-previous[i].left)<.1,'words stay in place');assert.ok(Math.abs(word.width-previous[i].width)<.1,'native word widths stay fixed');});
   else layouts.set(key,layout.words);
  }
  let previous=0;
  for(const sample of samples){
   assert.equal(sample.cursorCount,0,'cipher has no typewriter cursor');
   const firstHidden=sample.letters.indexOf(false);
   if(firstHidden!==-1)assert.ok(sample.letters.slice(firstHidden).every(v=>!v),'decoded letters must be a contiguous prefix');
   const count=sample.letters.filter(Boolean).length;assert.ok(count>=previous,'decoding never goes backwards');previous=count;
  }
  assert.ok(samples.at(-1).complete);assert.ok(samples.at(-1).letters.every(Boolean));
  assert.equal(await page.locator('.landing-cipher-glyph').count(),0,'only native text remains after decoding');
  assert.ok(await page.locator('.landing-cipher-source').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).visibility==='visible')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/fixed-mobile-${index}.png`});
  await page.setViewportSize({width:976,height:571});await page.screenshot({path:`${output}/fixed-desktop-${index}.png`});
  await page.getByRole('textbox',{name:'Tu mensaje',exact:true}).press('Enter');
  try{await page.locator('.viewer').waitFor();}catch(error){
   await page.screenshot({path:`${output}/failed-submit-${index}.png`});
   console.log({index,errors,landingError:await page.locator('#landing-error').allTextContents()});throw error;
  }
  assert.ok(new URL(page.url()).hash.startsWith('#v1='),'the generated poster has a viewer link');
  if(index===0){
   assert.equal(await page.locator('.viewer').evaluate(node=>node.classList.contains('controls-visible')),true,'actions are introduced on arrival');
   await page.waitForTimeout(3200);
   assert.equal(await page.locator('.edit-app').count(),0,'the poster stays open until the user chooses to edit');
   assert.equal(await page.locator('.viewer').evaluate(node=>node.classList.contains('controls-visible')),false,'desktop actions fade away');
   await page.mouse.move(100,100);
   assert.equal(await page.locator('.viewer').evaluate(node=>node.classList.contains('controls-visible')),true,'moving the pointer restores actions');
   await page.reload();await page.locator('.viewer').waitFor();
  }
  await page.getByRole('button',{name:'Crear mi versión',exact:true}).click();await page.locator('.edit-app').waitFor();
  assert.equal(await page.locator('#message').inputValue(),'Otra frase','editing keeps the generated text');
  await page.close();
 }
 const reduced=await browser.newPage({locale:'es-ES',reducedMotion:'reduce'});
 reduced.on('pageerror',e=>errors.push(e.message));
 await reduced.goto(base);
 assert.equal(await reduced.locator('.landing-tagline').getAttribute('data-complete'),'true');
 assert.ok(await reduced.locator('.landing-cipher-source').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>getComputedStyle(n).visibility==='visible')));
 assert.equal(await reduced.locator('.landing-cipher-glyph').count(),0);
 await reduced.emulateMedia({reducedMotion:'no-preference'});await reduced.waitForTimeout(150);
 assert.equal(await reduced.locator('.landing-tagline').getAttribute('data-complete'),'true','motion preference changes do not restart decoding');
 // Changing the preference during playback also completes the text immediately.
 await reduced.reload();await reduced.waitForTimeout(500);await reduced.emulateMedia({reducedMotion:'reduce'});
 await reduced.locator('.landing-tagline[data-complete="true"]').waitFor();
 assert.equal(await reduced.locator('.landing-tagline').getAttribute('data-complete'),'true');
 for(const locale of ['es-ES','en-US']){
  const page=await browser.newPage({locale,viewport:{width:390,height:844}});
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.evaluate(()=>document.fonts.load('400 30px "DM Serif Display"'));
  await page.waitForTimeout(850);await page.screenshot({path:output+'/cipher-'+locale+'.png'});
  const slots=await page.locator('.landing-cipher-glyph').evaluateAll(nodes=>nodes.filter(n=>n.dataset.decoded==='false').map(n=>({slot:n.getBoundingClientRect().toJSON(),glyph:n.firstChild.getBoundingClientRect().toJSON()})));
  assert.ok(slots.length>0,'captured real decoding');
  assert.ok(slots.every(({slot,glyph})=>glyph.left>=slot.left-.1&&glyph.right<=slot.right+.1),'scrambled glyphs fit their original letter slots');
  await page.locator('.landing-tagline[data-complete="true"]').waitFor();
  const final=await page.locator('.landing-tagline').innerHTML();await page.waitForTimeout(200);
  assert.equal(await page.locator('.landing-tagline').innerHTML(),final,'completed caption remains still');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }
 const fallback=await browser.newPage({locale:'es-ES'});fallback.on('pageerror',e=>errors.push(e.message));
 await fallback.addInitScript(()=>{document.fonts.load=()=>Promise.reject(Error('Unavailable font'));});
 await fallback.goto(base);await fallback.locator('.landing-tagline[data-complete="true"]').waitFor();
 assert.ok(await fallback.locator('.landing-cipher-source').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).visibility==='visible')));
 await fallback.close();
 // Drive the real random actions with known draws: every background must be
 // reachable from Surprise, and each collection from the landing submission.
 const installRandom=page=>page.evaluate(()=>{
  const native=Math.random;window.randomDraws=[];
  Math.random=()=>window.randomDraws.length?window.randomDraws.shift():native();
 });
 const draws=(page,values)=>page.evaluate(values=>window.randomDraws=values,values);
 const current=page=>decodeState(new URL(page.url()).hash.replace('#edit:','#'));
 await reduced.goto(base+'/'+encodeState({...DEFAULT,text:'AZAR EN TODAS LAS COLECCIONES'}).replace('#','#edit:'));
 await installRandom(reduced);await reduced.getByRole('tab',{name:'Fondos',exact:true}).click();
 for(const target of BACKDROPS){
  const before=current(reduced),pool=BACKDROPS.filter(b=>b.id!==before.backdrop),index=pool.findIndex(b=>b.id===target.id);
  await draws(reduced,[.4,(index+.5)/pool.length,.7]);
  await reduced.getByRole('button',{name:'Sorpréndeme',exact:true}).click();
  await reduced.waitForURL(u=>decodeState(u.hash.replace('#edit:','#')).backdrop===target.id);
  assert.equal(current(reduced).text,before.text);assert.notEqual(current(reduced).bg,before.bg);
  assert.equal(await reduced.getByRole('button',{name:target.name,exact:true}).getAttribute('aria-pressed'),'true');
  if(isReactBitsBackdrop(target.id))await reduced.waitForSelector(`.backdrop-canvas[data-backdrop="${target.id}"][data-backend]`);
 }
 await reduced.screenshot({path:output+'/random-all-backgrounds.png'});
 // Normal roulette must retain the chosen background when the flashes finish.
 await reduced.emulateMedia({reducedMotion:'no-preference'});
 const pool=BACKDROPS.filter(b=>b.id!==current(reduced).backdrop),target=pool.findIndex(b=>b.id==='orb');
 const normalAnimations=ANIMATIONS.filter(a=>a.id!==current(reduced).animation);
 await draws(reduced,[.4,(target+.5)/pool.length,(normalAnimations.findIndex(a=>a.id==='rb-echo')+.5)/normalAnimations.length]);await reduced.getByRole('button',{name:'Sorpréndeme',exact:true}).click();
 await reduced.waitForURL(u=>{const s=decodeState(u.hash.replace('#edit:','#'));return s.backdrop==='orb'&&s.animation==='rb-echo';});
 assert.equal(await reduced.getByRole('button',{name:'Sorpréndeme',exact:true}).isEnabled(),true);
 await reduced.emulateMedia({reducedMotion:'reduce'});
 for(const collection of BACKDROP_COLLECTIONS){
  const id=collection.ids.at(-1);
  await reduced.goto(base);await installRandom(reduced);
  await reduced.getByRole('textbox',{name:'Tu mensaje',exact:true}).fill('Un fondo de '+collection.name);
  await draws(reduced,[.3,(BACKDROPS.findIndex(b=>b.id===id)+.5)/BACKDROPS.length,.7]);
  await reduced.getByRole('textbox',{name:'Tu mensaje',exact:true}).press('Enter');await reduced.locator('.viewer').waitFor();
  await reduced.waitForURL(u=>u.hash.startsWith('#v1=')&&decodeState(u.hash).backdrop===id);
  assert.equal(current(reduced).text,'Un fondo de '+collection.name);
 }
 // Exercise every catalog entry through the real buttons, including particles,
 // the trailer, static text and all eight React Bits effects.
 await reduced.goto(base+'/'+encodeState({...DEFAULT,text:'TODO ENTRA 👩🏽‍💻',animation:'none',backdrop:'solid'}).replace('#','#edit:'));
 await installRandom(reduced);await reduced.getByRole('tab',{name:'Movimiento',exact:true}).click();
 for(const animation of ANIMATIONS){
  const before=current(reduced),pool=ANIMATIONS.filter(a=>a.id!==before.animation);
  const index=pool.findIndex(a=>a.id===animation.id);assert.ok(index>=0);
  await draws(reduced,[.3,.5,(index+.5)/pool.length]);await reduced.getByRole('button',{name:'Sorpréndeme',exact:true}).click();
  await reduced.waitForURL(u=>decodeState(u.hash.replace('#edit:','#')).animation===animation.id);
  assert.equal(current(reduced).text,before.text);assert.notEqual(current(reduced).animation,before.animation);
  if(animation.id!=='trailer')assert.equal(await reduced.locator('.motion-card[aria-pressed="true"] .motion-name').innerText(),animation.name);
  if(REACT_BITS_TEXT.includes(animation.id))await reduced.locator('.react-bits-text-canvas').waitFor();
 }
 await reduced.screenshot({path:output+'/random-all-motion-editor.png'});
 for(const [i,animation] of ANIMATIONS.entries()){
  await reduced.goto(base);await reduced.getByRole('textbox',{name:'Tu mensaje',exact:true}).waitFor();await installRandom(reduced);
  const message='Desde el inicio: '+animation.name;
  await reduced.getByRole('textbox',{name:'Tu mensaje',exact:true}).fill(message);
  await draws(reduced,[.3,.5/BACKDROPS.length,(i+.5)/ANIMATIONS.length]);
  await reduced.getByRole('textbox',{name:'Tu mensaje',exact:true}).press('Enter');await reduced.locator('.viewer').waitFor();
  await reduced.waitForURL(u=>u.hash.startsWith('#v1=')&&decodeState(u.hash).animation===animation.id);
  await reduced.getByRole('button',{name:'Crear mi versión',exact:true}).click();await reduced.locator('.edit-app').waitFor();
  assert.equal(current(reduced).text,message);assert.equal(current(reduced).backdrop,'solid');
 }
 // The welcome logo randomly chooses one quiet entrance, then stays still.
 for(const [animation,random] of [['letters',.05],['bounce',.25],['orbit',.45],['rb-fold',.65],['rb-echo',.85]]){
  const page=await browser.newPage({locale:'es-ES',viewport:{width:390,height:844}}),requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(value=>Math.random=()=>value,random);await page.goto(base);
  await page.locator('.landing-logo.motion-'+animation).waitFor();await page.waitForTimeout(1600);
  const poses=await page.locator('.landing-word .motion-unit').evaluateAll(nodes=>nodes.map(n=>({opacity:getComputedStyle(n).opacity,iterations:getComputedStyle(n).animationIterationCount,transform:getComputedStyle(n).transform})));
  assert.ok(poses.every(p=>p.opacity==='1'&&p.iterations==='1'&&(p.transform==='none'||p.transform==='matrix(1, 0, 0, 1, 0, 0)')),'logo settles after one gentle entrance');
  assert.ok(!requests.some(r=>/react-bits-text-renderer|galaxy-renderer|[Ss]hatter/.test(r)),'welcome stays lightweight');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/welcome-'+animation+'.png'});
  await page.getByRole('textbox',{name:'Tu mensaje',exact:true}).fill('Mi mensaje');
  assert.ok((await page.locator('.landing-logo').getAttribute('class')).includes('motion-'+animation),'typing preserves the chosen entrance');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
  assert.ok(await page.locator('.landing-word .motion-unit').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).animationName==='none'&&getComputedStyle(n).opacity==='1')));
  await page.close();
 }
 await reduced.close();assert.deepEqual(errors,[]);
 console.log('PASS: Surprise and landing creation reach all 32 animations, including every React Bits effect; background selection remains independent and roulette preserves both.');
 console.log('PASS: all five subtle random logo entrances play once, stay stable while typing, respect reduced motion and keep heavy renderers lazy.');
 console.log('PASS: three themes, real cipher playback, stable word positions, delayed fonts, typing, resize, stalled frames, reduced motion, editor navigation.');
 console.log(`Artifacts: ${output}`);
}finally{await browser?.close();server?.kill();}
