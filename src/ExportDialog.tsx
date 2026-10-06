import {useEffect,useRef,useState} from 'react';
import {exportGif} from './export-gif';
import type {Poster} from './render';
import {exportDimensions,exportPlan} from './export-plan.mjs';
import {canShareFile,fileShareData,publicShareUrl} from './share-file.mjs';

export function ExportDialog({state,ratio,shareUrl,onPNG,onClose}:{state:Poster;ratio:string;shareUrl:string;onPNG:()=>Promise<void>;onClose:()=>void}){
 const [url]=useState(shareUrl),[feedback,setFeedback]=useState(''),[sharing,setSharing]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),job=useRef<AbortController|null>(null),objectUrl=useRef('');
 const [format,setFormat]=useState(state.animation==='none'&&(!state.backdropMotion||state.backdrop==='solid')?'png':'gif'),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('');
 const [result,setResult]=useState<{url:string;thumbnail:string;bytes:number;file:File}|null>(null);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [width,height]=exportDimensions(ratio),duration=exportPlan(state).totalDuration;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,media=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);dialog.current?.showModal();
  return()=>{job.current?.abort();media.removeEventListener('change',changed);if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);if(previous?.isConnected)previous.focus();};
 },[]);
 async function generate(){
  if(format==='png'){setBusy(true);await onPNG();onClose();return;}
  const controller=new AbortController();job.current=controller;setBusy(true);setProgress(0);setError('');
  try{
   const gif=await exportGif(state,ratio,controller.signal,setProgress);
   if(controller.signal.aborted)return;
   const url=URL.createObjectURL(gif.blob);objectUrl.current=url;
   setResult({url,thumbnail:gif.thumbnail,bytes:gif.blob.size,file:new File([gif.blob],'gzaas.gif',{type:'image/gif'})});
  }catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message);}
  finally{if(!controller.signal.aborted){setBusy(false);job.current=null;}}
 }
 function cancel(){job.current?.abort();job.current=null;setBusy(false);setProgress(0);}
 async function shareGif(){
  if(!result)return;setError('');setSharing(true);
  try{await navigator.share(fileShareData(result.file,url));}
  catch(e){if((e as Error).name!=='AbortError')setError('Puedes descargar el GIF y copiar el enlace para compartirlos.');}
  finally{setSharing(false);}
 }
 async function copyLink(){try{await navigator.clipboard.writeText(url);setFeedback('Enlace copiado.');}catch{setError('Abre «Compartir» para seleccionar y copiar el enlace.');}}
 return <dialog ref={dialog} className="export-dialog" aria-labelledby="export-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <div className="dialog-header"><span className="eyebrow">LLÉVATE TU MENSAJE</span><button className="icon-button" aria-label="Cerrar descarga" onClick={onClose}>×</button></div>
  <h2 id="export-title">Que siga moviéndose<span>.</span></h2>
  {result?<>
   <div className="export-result"><img src={reduced?result.thumbnail:result.url} alt={state.text}/></div>
   <p className="export-details" role="status">Tu GIF está listo · {(result.bytes/1024/1024).toFixed(1)} MB</p>
   <div className="export-share-actions">
    <a className={`button ${canShareFile(result.file)?'secondary':'primary'}`} href={result.url} download="gzaas.gif">Descargar GIF</a>
    {canShareFile(result.file)&&<button className="button primary" disabled={sharing} onClick={()=>void shareGif()}>{publicShareUrl(url)?'Compartir GIF + enlace':'Compartir GIF'}</button>}
   </div>
   {publicShareUrl(url)&&<button className="text-button export-copy" onClick={()=>void copyLink()}>Copiar enlace</button>}
   {feedback&&<p className="export-details" role="status">{feedback}</p>}
  </>:<>
   <div className="export-formats" role="group" aria-label="Formato de descarga">{[['png','PNG','Una imagen para guardar.'],['gif','GIF','Toda la actitud, en movimiento.']].map(([id,name,description])=><button key={id} disabled={busy} aria-pressed={format===id} className={format===id?'selected':''} onClick={()=>{setFormat(id);setError('');}}><strong>{name}</strong><span>{description}</span></button>)}</div>
   <p className="export-details">{format==='gif'?`${width} × ${height} · ${(duration/1000).toFixed(1)} s · ${state.repeat?'En bucle':'Una vez'}`:'El mensaje completo, en alta resolución.'}</p>
   {busy?format==='gif'?<div className="export-progress"><div><span>Creando tu GIF…</span><strong>{progress}%</strong></div><progress value={progress} max={100} aria-label="Progreso de la exportación"/><button className="button secondary" onClick={cancel}>Cancelar</button></div>:<p role="status">Preparando imagen…</p>:<button className="button primary" onClick={()=>void generate()}>{format==='gif'?'Crear GIF':'Descargar PNG'}</button>}
   <p className="export-local">Tu mensaje se convierte aquí, en tu navegador.</p>
  </>}
  {error&&<p className="field-error" role="alert">{error}</p>}
 </dialog>;
}
