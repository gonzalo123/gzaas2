// A file:// demo and the Vite dev server must never register a production worker.
if(import.meta.env.PROD&&location.protocol!=='file:'&&window.isSecureContext&&'serviceWorker' in navigator){
 const register=()=>{
  const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if(!manifest)return;
  const root=new URL('./',manifest.href);
  navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'})
   .catch(error=>console.warn('Offline setup unavailable:',error));
 };
 if(document.readyState==='complete')register();else addEventListener('load',register,{once:true});
}
