// Real production worker/cache, served both at / and at the GitHub Pages subpath.
import {createServer} from 'node:http';
import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {DEFAULT,encodeState} from '../src/state.mjs';

const dist=resolve('dist'),output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-pwa-check';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
let revision=0;
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/gzaas2/'))path=path.slice('/gzaas2'.length);
  const file=resolve(dist,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(dist+sep))throw Error('Invalid path');
  let body=await readFile(file);
  if(path==='/sw.js'&&revision)body=Buffer.from(body.toString().replace(/const CACHE=.*;/,`const CACHE=PREFIX+'test-update-${revision}';`));
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(resolve(dist,'404.html')));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const profiles=[],contexts=[];
try{
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 for(const mount of ['/','/gzaas2/']){
  const profile=await mkdtemp(resolve(tmpdir(),'gzaas-pwa-'));profiles.push(profile);
  const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH||undefined,locale:'es-ES',viewport:{width:390,height:844},reducedMotion:'reduce'});contexts.push(context);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+mount);
  await page.locator('.landing').waitFor();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.ready).scope),origin+mount);
  const client=await context.newCDPSession(page);
  const {errors:manifestErrors,data}=await client.send('Page.getAppManifest');
  assert.deepEqual(manifestErrors,[]);const manifest=JSON.parse(data);
  assert.equal(manifest.display,'standalone');assert.equal(new URL(manifest.start_url,origin+mount+'manifest.webmanifest').href,origin+mount);
  assert.deepEqual((await client.send('Page.getInstallabilityErrors')).installabilityErrors,[]);
  for(const icon of manifest.icons){
   const image=Buffer.from(await (await fetch(new URL(icon.src,origin+mount))).arrayBuffer());
   assert.equal(image.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
  }
  // A fresh page must boot offline, including lazy assets never opened by the user.
  await context.setOffline(true);await page.reload();await page.locator('.landing').waitFor();
  const cached=await page.evaluate(async()=>{
   const keys=await caches.keys(),cache=await caches.open(keys.find(key=>key.startsWith('gzaas:')));
   const requests=await cache.keys();
   return Promise.all(requests.map(async request=>({url:request.url,ok:(await fetch(request.url)).ok})));
  });
  assert.ok(cached.length>10&&cached.every(item=>item.ok));
  assert.ok(cached.some(item=>item.url.includes('export-gif-'))&&cached.some(item=>item.url.includes('galaxy-renderer-')));
  const state={...DEFAULT,text:'INSTALADA Y SIN CONEXIÓN',animation:'none',backdrop:'solid',backdropMotion:false};
  await page.goto(origin+mount+encodeState(state).replace('#','#edit:'));
  await page.locator('.edit-app').waitFor();
  assert.equal(await page.locator('#message').inputValue(),state.text);
  await page.getByRole('button',{name:'Descargar mensaje',exact:true}).click();
  await page.locator('.export-dialog').waitFor();
  await context.setOffline(false);await page.goto(origin+mount);
  await page.getByRole('button',{name:'Instalar app',exact:true}).waitFor();
  // Browser prompts are one-shot; only an explicit click may open one.
  for(const outcome of ['dismissed','accepted']){
   await page.evaluate(async outcome=>{
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.installActive=navigator.userActivation.isActive;};
    event.userChoice=Promise.resolve({outcome});dispatchEvent(event);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   },outcome);
   await page.getByRole('button',{name:'Instalar app',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.installActive),true);
   await page.getByRole('button',{name:'Instalar app',exact:true}).waitFor({state:'hidden'});
  }
  // Updates wait for existing clients, retain the draft, and preserve unrelated caches.
  await page.goto(origin+mount+encodeState(state).replace('#','#edit:'));
  await page.evaluate(()=>caches.open('another-app'));
  revision++;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;await registration.update();});
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.ready).waiting);
  assert.equal(await page.locator('#message').inputValue(),state.text);
  await page.close();
  const next=await context.newPage();await next.goto(origin+mount);
  await next.waitForFunction(async()=>{
   const keys=await caches.keys();return keys.includes('another-app')&&keys.filter(key=>key.startsWith('gzaas:')).length===1&&keys.some(key=>key.includes('test-update-'));
  });
  const response=await next.goto(origin+mount+'missing/page');assert.equal(response.status(),404);
  await next.locator('.not-found').waitFor();
  assert.deepEqual(errors,[]);await context.close();
 }
 // iPhone instructions, keyboard dismissal, language, standalone and narrow-screen layout.
 const ios=await browser.newContext({locale:'es-ES',viewport:{width:320,height:640},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',reducedMotion:'reduce'});
 const page=await ios.newPage();await page.goto(origin+'/gzaas2/');
 await page.getByRole('button',{name:'Instalar app',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 assert.ok(await page.getByText(/Abre esta página en Safari/).isVisible());
 assert.ok(await page.getByRole('dialog').evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
 await page.screenshot({path:output+'/iphone-install.png'});
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByLabel('Idioma',{exact:true}).selectOption('en');
 await page.getByRole('button',{name:'Install app',exact:true}).click();assert.ok(await page.getByText(/Open this page in Safari/).isVisible());
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));
 await page.getByRole('button',{name:'Install app',exact:true}).waitFor({state:'hidden'});
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
 await page.reload();await page.locator('.landing').waitFor();assert.equal(await page.locator('.install-app').count(),0);
 await ios.close();
 console.log('PASS: installability, icons, root/subpath scope, offline boot/editor/lazy assets, prompt lifecycle, safe updates, 404, iPhone instructions, languages and standalone.');
}finally{
 for(const context of contexts)await context.close();
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 for(const profile of profiles)await rm(profile,{recursive:true,force:true});
}
