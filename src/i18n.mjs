import english from './locales/en.mjs';
export const LOCALE_KEY='gzaas.locale';
export const LANGUAGES=['es','en'];
export function detectLocale(saved,languages=[]){
 if(LANGUAGES.includes(saved))return saved;
 for(const language of languages){
  const base=String(language).toLowerCase().split(/[-_]/)[0];
  if(LANGUAGES.includes(base))return base;
 }
 return 'en';
}
export function readLocale(storage,languages){
 let saved;try{saved=storage?.getItem(LOCALE_KEY);}catch{/* Storage may be blocked. */}
 return detectLocale(saved,languages);
}
export function translate(source,locale,values={}){
 if(!source)return '';
 const message=locale==='en'&&Object.hasOwn(english,source)?english[source]:source;
 return message.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
}
function browserLocale(){
 let storage;try{storage=globalThis.localStorage;}catch{/* Private/blocked storage. */}
 return readLocale(storage,globalThis.navigator?.languages??[globalThis.navigator?.language??'en']);
}
let locale=browserLocale();
const listeners=new Set();
export const getLocale=()=>locale;
export function subscribeLocale(listener){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function setLocale(next){
 if(!LANGUAGES.includes(next))return;
 try{globalThis.localStorage?.setItem(LOCALE_KEY,next);}catch{/* The choice still works for this visit. */}
 if(next!==locale){locale=next;for(const listener of listeners)listener();}
}
