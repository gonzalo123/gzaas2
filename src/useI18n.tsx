import {useMemo,useSyncExternalStore} from 'react';
import {getLocale,subscribeLocale,setLocale,translate} from './i18n.mjs';
export function useI18n(){
 const locale=useSyncExternalStore(subscribeLocale,getLocale);
 const t=useMemo(()=>(source:string|undefined,values:Record<string,string|number>={}):string=>translate(source,locale,values),[locale]);
 const number=useMemo(()=>(value:number,digits=0)=>new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value),[locale]);
 return {locale,t,number};
}
export function LanguageSelector({className=''}:{className?:string}){
 const {locale,t}=useI18n();
 return <label className={`language-selector ${className}`}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
  <span className="sr-only">{t('Idioma')}</span>
  <span className="language-current" aria-hidden="true">{locale.toUpperCase()} <span>⌄</span></span>
  <select value={locale} onChange={e=>setLocale(e.target.value)} aria-label={t('Idioma')}><option value="es" lang="es">Español</option><option value="en" lang="en">English</option></select>
 </label>;
}
