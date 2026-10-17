import {useEffect,useMemo,useRef} from 'react';
import {LanguageSelector,useI18n} from './useI18n';
import {PosterStage} from './PosterStage';
import {DEFAULT} from './state.mjs';
import type {Poster} from './render';

export function notFoundPoster(text:string):Poster{
 return {...DEFAULT,text,font:'bungee',bg:'#ffe44e',fg:'#4a174c',accent:'#ffacbd',backdrop:'rays',backdropMotion:false,effect:'echo',animation:'bounce',repeat:false,size:85};
}

export function NotFound({reason,home,onHome,onRemix}:{reason:string;home:string;onHome:()=>void;onRemix:(poster:Poster)=>void}){
 const {t}=useI18n(),heading=useRef<HTMLHeadingElement>(null);
 const poster=useMemo(()=>notFoundPoster(t('ESTE MENSAJE\nSE HA IDO\nDE FIESTA.')),[t]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
 return <div className="not-found">
  <header className="not-found-header"><a className="not-found-logo" href={home} aria-label={t('Gzaas, inicio')}>gzaas!</a><LanguageSelector/></header>
  <main className="not-found-content">
   <p className="not-found-code">{t('404 · Mensaje no encontrado')}</p>
   <h1 className="sr-only" ref={heading} tabIndex={-1}>{t('404 · Este mensaje se ha ido de fiesta.')}</h1>
   <div className="not-found-art" aria-hidden="true"><PosterStage state={poster}/></div>
   <div className="not-found-recovery">
    <p className="not-found-reason" role="alert">{t(reason)}</p>
    <p className="not-found-copy">{t('Pide que te reenvíen el enlace. O empieza una fiesta nueva.')}</p>
    <div className="not-found-actions"><button className="button primary" onClick={onHome}>{t('Crear un mensaje')}</button><button className="text-button" onClick={()=>onRemix(poster)}>{t('Tunear este 404')} <span aria-hidden="true">↗</span></button></div>
   </div>
  </main>
 </div>;
}
