import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Keep every lazy chunk (including the GIF worker) available on the first offline visit.
export function pwaPlugin(){
 return {
  name:'gzaas-pwa',apply:'build',enforce:'post',
  generateBundle(_,bundle){
   const publicFiles=['manifest.webmanifest','favicon.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
   const files=[...Object.keys(bundle).filter(name=>!name.endsWith('.map')),...publicFiles].sort();
   const template=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
   const hash=createHash('sha256').update(template);
   for(const name of files){
    const item=bundle[name];
    hash.update(name).update(item?(item.type==='chunk'?item.code:item.source):readFileSync(new URL('../public/'+name,import.meta.url)));
   }
   const source=template.replace('__VERSION__',hash.digest('hex').slice(0,16)).replace('__PRECACHE__',JSON.stringify(files));
   this.emitFile({type:'asset',fileName:'sw.js',source});
  },
 };
}
