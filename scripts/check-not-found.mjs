// Serve the production build like GitHub Pages: nested missing paths receive 404.html with HTTP 404.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {DEFAULT,encodeState,decodeState} from '../src/state.mjs';

const dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const page404=await readFile(resolve(dist,'404.html'),'utf8');
const mount=page404.match(/<base href="([^"]+)"/)[1];
const output=process.env.TEST_ARTIFACTS||'/tmp/gzaas-not-found-check';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(mount))throw Error('not found');
  const file=resolve(dist,path.slice(mount.length)||'index.html');
  if(!file.startsWith(dist+sep))throw Error('not found');
  const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(content);
 }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(page404);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+mount;
let browser;
try{
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
 const errors=[],failedAssets=[];
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1280,height:850},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&/\.(js|css|svg|png)(\?|$)/.test(r.url()))failedAssets.push(r.url());});
 await page.goto(base);await page.locator('.landing').waitFor();
 const valid=encodeState({...DEFAULT,text:'ESTE SÍ EXISTE',animation:'none',backdrop:'solid',backdropMotion:false});
 await page.goto(base+valid);await page.locator('.viewer').waitFor();
 // Bad hashes are application errors on a valid document; the broken address stays intact.
 for(const hash of ['#broken','#v1=truncated','#v2=broken','#edit:v2=broken','#%3Cimg%20src=x%20onerror=alert(1)%3E']){
  await page.goto(base+hash);await page.locator('.not-found').waitFor();
  assert.ok((await page.title()).startsWith('404'));
  assert.equal(new URL(page.url()).hash,hash);
  assert.equal(await page.locator('.landing,.edit-app,.viewer').count(),0);
  assert.ok(await page.getByRole('button',{name:'Crear un mensaje',exact:true}).isVisible());
  await page.waitForFunction(()=>document.querySelector('h1')===document.activeElement);
 }
 assert.ok(await page.locator('.not-found-art .motion-unit').evaluateAll(nodes=>nodes.length>0&&nodes.every(node=>getComputedStyle(node).animationName==='none')),'reduced motion shows the formed poster');
 await page.screenshot({path:output+'/broken-link-desktop.png'});
 await page.getByRole('button',{name:'Crear un mensaje',exact:true}).click();await page.locator('.landing').waitFor();
 assert.equal(page.url(),base);assert.ok(!(await page.title()).startsWith('404'));
 await page.waitForFunction(()=>document.querySelector('#landing-message')===document.activeElement);
 // Hash changes within the same loaded app recover correctly in both directions.
 await page.evaluate(hash=>{location.hash=hash;},'#broken');await page.locator('.not-found').waitFor();
 await page.evaluate(hash=>{location.hash=hash;},valid);await page.locator('.viewer').waitFor();
 await page.evaluate(hash=>{location.hash=hash;},'#v2=bad');await page.locator('.not-found').waitFor();
 await page.getByRole('button',{name:'Tunear este 404',exact:true}).click();await page.locator('.edit-app').waitFor();
 assert.equal(await page.locator('#message').inputValue(),'ESTE MENSAJE\nSE HA IDO\nDE FIESTA.');
 assert.equal(decodeState(new URL(page.url()).hash.replace('#edit:','#')).text,'ESTE MENSAJE\nSE HA IDO\nDE FIESTA.');
 await page.getByRole('button',{name:'Compartir',exact:true}).click();
 const shareUrl=await page.locator('#share-link').inputValue();assert.ok(shareUrl.startsWith(base+'#v2='));
 await page.getByRole('button',{name:'Cerrar compartir'}).click();
 await page.reload();await page.locator('.edit-app').waitFor();
 // A genuine missing path must resolve all assets from the site root, at any nesting depth.
 const missing=base+'este/enlace/no/existe'+valid;
 const response=await page.goto(missing);assert.equal(response.status(),404);
 await page.locator('.not-found-art .poster-art text').first().waitFor();
 assert.equal(page.url(),missing,'no automatic redirect hides a broken URL');
 assert.equal(await page.getByRole('alert').textContent(),'Esta página no existe. Puede que el enlace esté incompleto.');
 assert.equal(await page.locator('.not-found-logo').getAttribute('href'),mount);
 for(const [width,height] of [[390,844],[320,640],[667,375]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.ok(await page.locator('.not-found-actions button').evaluateAll(nodes=>nodes.every(node=>{const b=node.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.width>=44&&b.height>=44;})),'recovery buttons fit and stay touch friendly');
  await page.screenshot({path:`${output}/missing-path-${width}.png`});
 }
 await page.getByRole('button',{name:'Crear un mensaje',exact:true}).click();await page.locator('.landing').waitFor();
 assert.equal(page.url(),base);await page.reload();await page.locator('.landing').waitFor();
 await page.goto(base+'404.html');await page.locator('.not-found').waitFor();
 await page.getByRole('combobox',{name:'Idioma',exact:true}).selectOption('en');
 await page.getByRole('heading',{name:'404 · This message went out to party.',exact:true}).waitFor();
 assert.equal(await page.getByRole('alert').textContent(),'This page does not exist. The link may be incomplete.');
 await page.getByRole('button',{name:'Remix this 404',exact:true}).click();await page.locator('.edit-app').waitFor();
 assert.equal(await page.locator('#message').inputValue(),'THIS MESSAGE\nWENT OUT\nTO PARTY.');
 assert.equal(new URL(page.url()).pathname,mount);
 await page.reload();await page.locator('.edit-app').waitFor();
 // The normal entrance plays once, using existing lightweight poster effects.
 await page.setViewportSize({width:1280,height:850});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(base+'#broken');await page.locator('.not-found-art .motion-unit').first().waitFor();
 assert.ok(await page.locator('.not-found-art .motion-unit').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).animationIterationCount==='1')));
 await page.screenshot({path:output+'/not-found-en.png',animations:'disabled'});
 assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
 console.log('PASS: malformed links, genuine nested HTTP 404, production assets, preserved URLs, hash recovery, home focus, editable/shareable 404, languages, mobile and reduced motion.');
 console.log(`Artifacts: ${output}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
