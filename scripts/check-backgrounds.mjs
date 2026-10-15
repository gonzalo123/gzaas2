import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DEFAULT,BACKDROPS,BACKDROP_COLLECTIONS,REACT_BITS_BACKDROPS,REACT_BITS_MORE_BACKDROPS,encodeState,decodeState} from '../src/state.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4179',output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-backgrounds-check';
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4179','--strictPort'],{stdio:'ignore'});
const state={...DEFAULT,text:'OTRO\nAMBIENTE.',font:'anton',fg:'#fff5ed',bg:'#171020',accent:'#9b7ed9',animation:'none',backdropMotion:true,pace:'normal'};
const url=(backdrop,edit=true)=>base+'/'+encodeState({...state,backdrop}).replace('#',edit?'#edit:':'#');
let browser;
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1280,height:900}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.setDefaultTimeout(15000);
 const group=page.locator('.background-collections'),cards=page.locator('.backdrop-choice'),canvas=page.locator('.poster-art .backdrop-canvas');
 const openBackgrounds=async()=>{if(!await group.isVisible())await page.getByRole('tab',{name:'Fondos',exact:true}).click();};
 const next=()=>page.getByRole('button',{name:'Colección de fondos siguiente',exact:true}).click();
 await page.goto(url('waves'));await openBackgrounds();await page.waitForTimeout(250);
 assert.match(await group.innerText(),/Ambientes y gráficos/);assert.equal(await cards.count(),8);
 assert.equal(await page.getByRole('button',{name:'Ondas',exact:true}).getAttribute('aria-pressed'),'true');
 assert.ok(!requests.some(r=>r.includes('react-bits-renderer')||r.includes('silk-renderer')),'classic collections load no shaders');
 const original=page.url();await next();assert.match(await group.innerText(),/React Bits/);assert.equal(page.url(),original,'browsing collections does not edit state');
 await next();assert.match(await group.innerText(),/React Bits II/);
 await next();assert.match(await group.innerText(),/Ambientes y gráficos/);
 await page.getByRole('tab',{name:'Estilos',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Colección siguiente',exact:true}).isVisible());
 await openBackgrounds();assert.match(await group.innerText(),/Ambientes y gráficos/);await next();
 const selected=process.env.TEST_BACKDROP_IDS?.split(',');
 for(const {id,name} of BACKDROPS.filter(b=>REACT_BITS_BACKDROPS.includes(b.id)&&b.id!=='silk'&&(!selected||selected.includes(b.id)))){
  for(let attempt=0;attempt<BACKDROP_COLLECTIONS.length&&!await page.getByRole('button',{name,exact:true}).count();attempt++)await next();
  await page.getByRole('button',{name,exact:true}).click();
  await page.waitForSelector(`.poster-art .backdrop-canvas[data-backdrop="${id}"][data-backend]`);
  assert.equal(await canvas.getAttribute('data-backend'),id==='threads'||REACT_BITS_MORE_BACKDROPS.includes(id)?'canvas':'webgl','uses the intended renderer');
  await page.waitForURL(u=>decodeState(u.hash.replace('#edit:','#')).backdrop===id);
  assert.equal(await cards.count(),8);assert.match(await group.innerText(),/React Bits/);
  const snapshot=()=>canvas.evaluate(c=>c.toDataURL());
  const first=await snapshot();await page.waitForTimeout(250);assert.notEqual(await snapshot(),first,`${id} moves`);
  await page.getByRole('button',{name:'Pausar animación',exact:true}).click();await page.waitForTimeout(50);const paused=await snapshot();await page.waitForTimeout(200);assert.ok(await snapshot()===paused,`${id}: paused pixels stay frozen`);
  await page.screenshot({path:`${output}/${id}-desktop.png`});
  await page.getByLabel('Animar el fondo',{exact:true}).uncheck();await page.waitForTimeout(100);const still=await snapshot();
  await page.getByLabel('Animar el fondo',{exact:true}).check();await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(expected=>document.querySelector('.poster-art .backdrop-canvas')?.toDataURL()===expected,still);
  await page.waitForTimeout(150);assert.ok(await snapshot()===still,`${id}: reduced motion matches the static frame`);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const result=await page.evaluate(async state=>{
   const {createReactBitsRenderer}=await import('/src/react-bits-renderer.ts');
   const {paint,waitFonts}=await import('/src/render.ts'),{gifFrameRenderer}=await import('/src/gif-frame.ts'),{exportGif}=await import('/src/export-gif.ts');
   await waitFonts(state);
   const r=createReactBitsRenderer(state,240,180),cpu=createReactBitsRenderer(state,240,180,true);
   r.draw(0);const zero=r.canvas.toDataURL();r.draw(1500);const quarter=r.canvas.toDataURL();r.draw(6000);const loop=r.canvas.toDataURL();r.draw(1500);const seek=r.canvas.toDataURL();cpu.draw(1500);
   const a=r.canvas.getContext('2d').getImageData(0,0,240,180).data,b=cpu.canvas.getContext('2d').getImageData(0,0,240,180).data;
   const diff=a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;r.dispose();cpu.dispose();
   const paced=createReactBitsRenderer({...state,pace:'slow'},240,180);paced.draw(2175);const paceMatches=paced.canvas.toDataURL()===quarter;paced.dispose();
   const png=document.createElement('canvas'),frame=document.createElement('canvas');await paint(png,state,640,480);
   const renderer=await gifFrameRenderer(frame,state,640,480);renderer.draw(0);const pngMatches=png.toDataURL()===frame.toDataURL();renderer.dispose();
   const gif=await exportGif(state,'landscape',new AbortController().signal,()=>{});
   const decoder=new ImageDecoder({data:await gif.blob.arrayBuffer(),type:'image/gif'});await decoder.tracks.ready;
   const count=decoder.tracks.selectedTrack.frameCount,hashes=[];
   for(const frameIndex of [0,18,36]){const {image}=await decoder.decode({frameIndex}),c=new OffscreenCanvas(640,480),ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,640,480).data;let hash=0;for(let i=0;i<data.length;i+=4)hash=(Math.imul(hash,31)+data[i])|0;hashes.push(hash);image.close();}decoder.close();
   return {zero,quarter,loop,seek,diff,paceMatches,pngMatches,count,hashes,png:png.toDataURL(),gif:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(gif.blob);})};
  },{...state,backdrop:id});
  assert.notEqual(result.zero,result.quarter);assert.ok(result.zero===result.loop,`${id}: exact loop`);assert.ok(result.quarter===result.seek,`${id}: deterministic seeking`);
  assert.ok(result.diff<2,`${id}: CPU/GPU mean error ${result.diff}`);assert.ok(result.paceMatches);assert.ok(result.pngMatches);assert.equal(result.count,72);assert.equal(new Set(result.hashes).size,3);
  await writeFile(`${output}/${id}.png`,Buffer.from(result.png.split(',')[1],'base64'));await writeFile(`${output}/${id}.gif`,Buffer.from(result.gif.split(',')[1],'base64'));
  console.log(`PASS: ${id} selection, pause, reduced motion, deterministic loop, PNG, real GIF, CPU/GPU agreement (${result.diff.toFixed(3)})`);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(url('orb'));await openBackgrounds();await canvas.waitFor();
 for(let i=0;i<BACKDROP_COLLECTIONS.length;i++){
  assert.equal(await cards.count(),8);
  for(const card of await cards.all()){const box=await card.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,'all eight cards fit mobile width');}
  await next();
 }
 await page.screenshot({path:output+'/collections-mobile.png'});
 const toggle=await page.getByLabel('Animar el fondo',{exact:true}).locator('..').boundingBox(),panel=await page.locator('#editor-panel').boundingBox();
 assert.ok(toggle.y+toggle.height<=panel.y+panel.height,'mobile animation control fits without scrolling');
 await page.goto(url('threads',false));await canvas.waitFor();assert.equal(await page.locator('.viewer').count(),1);
 const fallback=await browser.newPage({locale:'es-ES'});fallback.on('pageerror',e=>errors.push(e.message));
 await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'||kind==='webgl2'?null:get.call(this,kind,...args);};});
 for(const backdrop of REACT_BITS_BACKDROPS.filter(id=>id!=='silk')){
  await fallback.goto(url(backdrop,false));await fallback.waitForSelector('.backdrop-canvas[data-backend]');
  const result=await fallback.evaluate(async state=>{
   const {paint,waitFonts}=await import('/src/render.ts'),{gifFrameRenderer}=await import('/src/gif-frame.ts');await waitFonts(state);
   const c=document.createElement('canvas');await paint(c,state,240,180);const png=c.toDataURL();
   const r=await gifFrameRenderer(c,state,240,180);r.draw(0);const first=c.toDataURL();r.draw(1500);const second=c.toDataURL();r.dispose();return {png,first,second};
  },{...state,backdrop});
  assert.ok(result.png===result.first,`${backdrop}: fallback PNG equals static frame`);assert.notEqual(result.first,result.second);
 }
 await fallback.close();assert.deepEqual(errors,[]);
 console.log('PASS: collections wrap, browsing preserves design, styles remain independent, mobile grid, shared viewer, all renderers without WebGL');
 if(process.env.TEST_PREVIEW_FILE){
  await page.route(/^https?:/,route=>route.abort());
  for(const backdrop of REACT_BITS_BACKDROPS){
   await page.goto('file://'+process.env.TEST_PREVIEW_FILE+encodeState({...state,backdrop}));
   await page.waitForSelector(`.backdrop-canvas[data-backdrop="${backdrop}"][data-backend]`);
  }
  console.log('PASS: all sixteen React Bits backgrounds work in standalone HTML offline');
 }
}finally{await browser?.close();server?.kill();}
