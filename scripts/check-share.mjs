// Real GIF preparation and download; the native share sheet is simulated to avoid sending messages.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DEFAULT,encodeState,decodeState} from '../src/state.mjs';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4180';
const output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-share-check';
const server=process.env.TEST_BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4180','--strictPort'],{stdio:'ignore'});
const state={...DEFAULT,text:'¡MÍRAME! 👋',animation:'rb-type',pace:'fast',repeat:false,backdrop:'solid',backdropMotion:false};
const url=(poster=state)=>base+'/'+encodeState(poster).replace('#','#edit:');
let browser;
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<60;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const errors=[],requests=[];
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1200,height:850},reducedMotion:'reduce'});
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  window.shared=[];window.shareFailure='';window.gifAllowed=true;window.workers={started:0,ended:0};
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.every(f=>f.type==='image/png'||window.gifAllowed&&f.type==='image/gif')});
  Object.defineProperty(navigator,'share',{configurable:true,value:data=>{
   if(window.shareFailure)return Promise.reject(new DOMException('Simulated share failure',window.shareFailure));
   window.shared.push({...data,active:navigator.userActivation.isActive});return Promise.resolve();
  }});
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{
   ended=false;
   constructor(...args){super(...args);window.workers.started++;}
   terminate(){if(!this.ended){window.workers.ended++;this.ended=true;}super.terminate();}
  };
 });
 await page.goto(url());await page.getByRole('button',{name:'Compartir',exact:true}).click();
 await page.locator('.share-preview img').waitFor();
 assert.ok(!(await page.getByRole('button',{name:'Compartir animación',exact:true}).isDisabled()));
 assert.equal(await page.evaluate(()=>window.workers.started),0,'opening Share does not start a GIF export');
 await page.screenshot({path:output+'/share-desktop.png'});
 await page.getByRole('button',{name:'Compartir animación',exact:true}).click();
 await page.getByRole('progressbar',{name:'Progreso de la exportación'}).waitFor();
 await page.getByRole('button',{name:'Compartir GIF + enlace',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.shared.length),0,'preparation never opens the native share sheet without another click');
 assert.match(await page.locator('.share-preview img').getAttribute('src'),/^data:image\/png/,'reduced motion keeps a still thumbnail');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>document.querySelector('.share-preview img').src.startsWith('blob:'));
 await page.getByRole('button',{name:'Compartir GIF + enlace',exact:true}).click();
 const shared=await page.evaluate(async()=>{
  const data=window.shared.at(-1),file=data.files[0],decoder=new ImageDecoder({data:await file.arrayBuffer(),type:file.type});
  await decoder.tracks.ready;const count=decoder.tracks.selectedTrack.frameCount,hashes=[];
  for(const index of [0,Math.floor(count/2),count-1]){
   const {image}=await decoder.decode({frameIndex:index}),canvas=new OffscreenCanvas(image.displayWidth,image.displayHeight),ctx=canvas.getContext('2d');
   ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let hash=0;for(let i=0;i<pixels.length;i+=4)hash=(Math.imul(hash,31)+pixels[i])|0;hashes.push(hash);image.close();
  }
  decoder.close();return {text:data.text,type:file.type,name:file.name,active:data.active,count,hashes};
 });
 assert.equal(shared.type,'image/gif');assert.equal(shared.name,'gzaas.gif');assert.equal(shared.active,true);
 assert.deepEqual(decodeState(new URL(shared.text).hash),state,'the caption contains the exact interactive viewer link');
 assert.ok(!new URL(shared.text).hash.startsWith('#edit:'));assert.ok(shared.count>2);assert.ok(new Set(shared.hashes).size>1,'GIF contains actual motion');
 await page.screenshot({path:output+'/share-gif-ready.png'});
 for(const [width,height] of [[320,640],[667,375]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok(await page.locator('.share-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth),'native sharing controls fit narrow and landscape screens');
  await page.screenshot({path:`${output}/share-native-${width}.png`});
 }
 await page.setViewportSize({width:1200,height:850});
 await page.evaluate(()=>window.shareFailure='AbortError');await page.getByRole('button',{name:'Compartir GIF + enlace',exact:true}).click();
 assert.equal(await page.locator('.share-dialog [role=alert]').count(),0,'dismissing the native sheet is harmless');
 await page.evaluate(()=>window.shareFailure='NotAllowedError');await page.getByRole('button',{name:'Compartir GIF + enlace',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Puedes descargar el GIF y copiar el enlace para compartirlos.'}).waitFor();
 assert.ok(await page.getByRole('link',{name:'Descargar GIF',exact:true}).isVisible(),'share failures retain download fallback');
 await page.getByRole('button',{name:'Cerrar compartir'}).click();
 assert.deepEqual(await page.evaluate(()=>window.workers),{started:1,ended:1},'completed export releases its worker');
 // Cancelling and closing during export both release the worker and allow another attempt.
 for(const close of [false,true]){
  await page.getByRole('button',{name:'Compartir',exact:true}).click();
  const before=await page.evaluate(()=>window.workers.started);
  await page.getByRole('button',{name:'Compartir animación',exact:true}).click();
  await page.waitForFunction(before=>window.workers.started>before,before);
  await page.getByRole('button',{name:close?'Cerrar compartir':'Cancelar',exact:true}).click();
  await page.waitForFunction(()=>window.workers.started===window.workers.ended);
  if(!close){assert.ok(await page.getByRole('button',{name:'Compartir animación',exact:true}).isVisible());await page.getByRole('button',{name:'Cerrar compartir'}).click();}
 }
 // A browser that can share PNG but not GIF must offer a primary GIF download.
 await page.evaluate(()=>{window.gifAllowed=false;window.shareFailure='';});
 await page.setViewportSize({width:320,height:640});await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Compartir',exact:true}).click();
 await page.getByRole('button',{name:'Compartir animación',exact:true}).click();
 const download=page.getByRole('link',{name:'Descargar GIF',exact:true});await download.waitFor();
 assert.ok((await download.getAttribute('class')).includes('primary'));
 assert.equal(await page.getByRole('button',{name:'Compartir GIF + enlace',exact:true}).count(),0);
 assert.ok(await page.getByText('Copia el enlace y adjunta el GIF descargado en tu chat.').isVisible());
 const downloaded=page.waitForEvent('download');await download.click();const file=await downloaded;
 assert.equal(file.suggestedFilename(),'gzaas.gif');await file.saveAs(output+'/message.gif');
 assert.equal((await readFile(output+'/message.gif')).subarray(0,6).toString(),'GIF89a');
 await page.screenshot({path:output+'/share-mobile-fallback.png'});
 const bounds=await page.locator('.share-dialog').evaluate(node=>{
  const box=node.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:node.clientWidth,scrollWidth:node.scrollWidth,height:node.clientHeight,scrollHeight:node.scrollHeight};
 });assert.ok(bounds.left>=0&&bounds.right<=320&&bounds.top>=0&&bounds.bottom<=640&&bounds.scrollWidth<=bounds.width&&bounds.scrollHeight<=bounds.height,'sharing fits the 320px mobile viewport without scrolling: '+JSON.stringify(bounds));
 await page.getByRole('button',{name:'Mostrar código QR'}).click();await page.getByRole('img',{name:'Código QR del enlace a tu mensaje'}).waitFor();
 await page.getByRole('button',{name:'Volver al cartel'}).click();assert.ok(await download.isVisible(),'QR toggle retains the prepared GIF');
 await page.getByRole('button',{name:'Cerrar compartir'}).click();
 const still={...state,animation:'none'};
 await page.goto(url(still));await page.getByRole('button',{name:'Compartir',exact:true}).click();
 await page.getByRole('button',{name:'Compartir imagen + enlace',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Compartir animación',exact:true}).count(),0,'static messages offer PNG directly');
 await page.getByRole('button',{name:'Compartir imagen + enlace',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.shared.at(-1).files[0].type),'image/png');
 await page.getByRole('button',{name:'Cerrar compartir'}).click();
 // Download keeps the same exporter, now loaded only when a GIF is requested.
 await page.goto(url());await page.getByRole('button',{name:'Descargar mensaje',exact:true}).click();
 await page.getByRole('button',{name:'Crear GIF',exact:true}).click();
 await page.getByRole('link',{name:'Descargar GIF',exact:true}).waitFor();
 await page.getByRole('button',{name:'Cerrar descarga'}).click();
 assert.deepEqual(errors,[]);
 assert.ok(requests.every(address=>new URL(address).origin===new URL(base).origin||/^(blob|data):/.test(address)),'GIFs and QR codes need no remote service');
 // Metadata must be present in the raw response, without executing the application.
 const html=await (await fetch(base)).text();
 const preview=html.match(/property="og:image" content="([^"]+)"/)[1];assert.match(preview,/^https:\/\//);
 assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
 const png=Buffer.from(await (await fetch(base+'/social-preview.png')).arrayBuffer());
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 console.log('PASS: real animated GIF, native share activation and viewer caption, download fallback, cancellation, cleanup, reduced motion, PNG, mobile, QR and static social metadata.');
 console.log(`Artifacts: ${output}`);
}finally{await browser?.close();server?.kill();}
