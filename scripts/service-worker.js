/* Version and asset list are injected by the production build. */
const PREFIX='gzaas:'+self.registration.scope+':';
const CACHE=PREFIX+'__VERSION__';
const ROOT=new URL('./',self.location.href);
const ASSETS=__PRECACHE__.map(path=>new URL(path,ROOT).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))));
 // Updates wait until existing windows close, so an edited message is never interrupted.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 const home=url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+'index.html';
 // Unknown URLs must keep their real 404 response; never replace them with the home page.
 if(request.mode==='navigate'&&!home)return;
 const key=home?new URL('index.html',ROOT).href:url.href;
 if(!ASSETS.includes(key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(key)||fetch(request);
 })());
});
