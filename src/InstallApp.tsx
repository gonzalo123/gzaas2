import {useEffect,useRef,useState} from 'react';
import {useI18n} from './useI18n';
import './install.css';

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export function InstallApp({visible}:{visible:boolean}){
 const {t}=useI18n();
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false),[busy,setBusy]=useState(false),[help,setHelp]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 useEffect(()=>{
  const display=matchMedia('(display-mode: standalone)');
  const sync=()=>setInstalled(display.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
  const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
  const done=()=>{setInstalled(true);setPrompt(null);};
  sync();display.addEventListener('change',sync);
  addEventListener('beforeinstallprompt',offer);addEventListener('appinstalled',done);
  return()=>{display.removeEventListener('change',sync);removeEventListener('beforeinstallprompt',offer);removeEventListener('appinstalled',done);};
 },[]);
 async function install(){
  if(!prompt){dialog.current?.showModal();return;}
  setBusy(true);
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')setInstalled(true);}
  catch{setHelp(true);dialog.current?.showModal();}
  finally{setPrompt(null);setBusy(false);}
 }
 if(!visible||installed||(!prompt&&!ios&&!help)||location.protocol==='file:'||!window.isSecureContext)return null;
 return <>
  <button className="install-app" onClick={install} disabled={busy}>{t('Instalar app')}</button>
  <dialog className="install-dialog" ref={dialog} aria-labelledby="install-title" onClose={()=>setHelp(false)} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
   <h2 id="install-title">{t('gzaas! en tu móvil')}</h2>
   <p>{ios?t('Abre esta página en Safari, pulsa Compartir y elige «Añadir a pantalla de inicio». Si aparece «Abrir como app web», actívalo y pulsa Añadir.'):t('Abre el menú del navegador y elige «Instalar app» o «Añadir a pantalla de inicio», si está disponible.')}</p>
   <form method="dialog"><button className="button primary">{t('Entendido')}</button></form>
  </dialog>
 </>;
}
