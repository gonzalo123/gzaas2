import {useI18n} from './useI18n';
import {useEffect,useRef,useState} from 'react';
import {paint,waitFonts,type Poster} from './render';
import {canShareFile,fileShareData,publicShareUrl} from './share-file.mjs';

export function ShareDialog({state,ratio,url,onClose}:{state:Poster;ratio:string;url:string;onClose:()=>void}){
 const {t,number}=useI18n();
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const job=useRef<AbortController|null>(null),gifUrl=useRef('');
 const [snapshot]=useState(()=>({state,ratio,url}));
 const [image,setImage]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[sharing,setSharing]=useState(false);
 const [gif,setGif]=useState<{file:File;url:string;thumbnail:string}|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [showQr,setShowQr]=useState(false),[qr,setQr]=useState(''),[qrError,setQrError]=useState('');
 const link=publicShareUrl(snapshot.url),imageSupported=!!image&&canShareFile(image.file),gifSupported=!!gif&&canShareFile(gif.file);
 const hasMotion=snapshot.state.animation!=='none'||snapshot.state.backdropMotion&&snapshot.state.backdrop!=='solid';
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,media=matchMedia('(prefers-reduced-motion: reduce)');let active=true,objectUrl='';
  const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);
  dialog.current?.showModal();
  async function prepare(){
   try{
    await waitFonts(snapshot.state);if(!active)return;
    const canvas=document.createElement('canvas');const [w,h]=snapshot.ratio==='square'?[1200,1200]:snapshot.ratio==='portrait'?[900,1200]:[1200,900];
    await paint(canvas,snapshot.state,w,h);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo preparar la imagen.')),'image/png'));
    if(!active)return;
    objectUrl=URL.createObjectURL(blob);setImage({file:new File([blob],'gzaas.png',{type:'image/png'}),url:objectUrl});
   }catch(e){if(active)setError((e as Error).message);}
  }
  void prepare();
  return()=>{active=false;job.current?.abort();media.removeEventListener('change',changed);if(objectUrl)URL.revokeObjectURL(objectUrl);if(gifUrl.current)URL.revokeObjectURL(gifUrl.current);if(previous?.isConnected)previous.focus();};
 },[snapshot]);
 useEffect(()=>{
  if(!showQr||!link||qr||qrError)return;
  let active=true;
  void import('qrcode').then(({default:QRCode})=>QRCode.toDataURL(link,{errorCorrectionLevel:'M',margin:2,width:256})).then(data=>{if(active)setQr(data);}).catch(()=>{if(active)setQrError('No se pudo preparar el código QR.');});
  return()=>{active=false;};
 },[showQr,link,qr,qrError]);
 async function copy(){setFeedback('');try{await navigator.clipboard.writeText(snapshot.url);setFeedback('Enlace copiado.');}catch{input.current?.focus();input.current?.select();setFeedback('Selecciona y copia el enlace.');}}
 async function prepareGif(){
  if(job.current)return;
  const controller=new AbortController();job.current=controller;setBusy(true);setProgress(0);setError('');setFeedback('');
  try{
   const {exportGif}=await import('./export-gif');controller.signal.throwIfAborted();
   const result=await exportGif(snapshot.state,snapshot.ratio,controller.signal,value=>{if(!controller.signal.aborted)setProgress(value);});
   controller.signal.throwIfAborted();
   gifUrl.current=URL.createObjectURL(result.blob);
   setGif({file:new File([result.blob],'gzaas.gif',{type:'image/gif'}),url:gifUrl.current,thumbnail:result.thumbnail});
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
  finally{if(job.current===controller){job.current=null;if(!controller.signal.aborted)setBusy(false);}}
 }
 function cancelGif(){job.current?.abort();job.current=null;setBusy(false);setProgress(0);}
 async function shareFile(file:File){
  setError('');setFeedback('');setSharing(true);
  // This call must run directly from a click: exporting first loses user activation.
  try{await navigator.share(fileShareData(file,snapshot.url,t('Un mensaje para ti — gzaas!')));}
  catch(e){if((e as Error).name!=='AbortError')setError(file.type==='image/gif'?'Puedes descargar el GIF y copiar el enlace para compartirlos.':'Puedes descargar la imagen y copiar el enlace para compartirlos.');}
  finally{setSharing(false);}
 }
 async function shareLink(){setError('');setSharing(true);try{await navigator.share({title:t("Un mensaje para ti — gzaas!"),url:link});}catch(e){if((e as Error).name!=='AbortError')setError('Puedes copiar el enlace para compartirlo.');}finally{setSharing(false);}}
 return <dialog ref={dialog} className="share-dialog" aria-labelledby="share-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <div className="dialog-header"><span className="eyebrow">{t("QUE SE VEA. QUE SE SIENTA.")}</span><button className="icon-button" aria-label={t("Cerrar compartir")} onClick={onClose}>×</button></div>
  <h2 id="share-title">{t("Tu mensaje, fuera de aquí")}<span>.</span></h2>
  <div className={`share-preview${showQr?' share-preview-qr':''}`}>{showQr?(qr?<img src={qr} alt={t('Código QR del enlace a tu mensaje')}/>:<p role="status">{t(qrError||'Preparando código QR…')}</p>):gif?<img src={reduced?gif.thumbnail:gif.url} alt={snapshot.state.text}/>:image?<img src={image.url} alt={snapshot.state.text}/>:<p role="status">{error?t("Imagen no disponible."):t("Preparando imagen…")}</p>}</div>
  <p className="share-description">{showQr?t('Escanea para abrir este mensaje en otro dispositivo.'):hasMotion?t('Comparte el GIF para que tu mensaje se vea antes de abrir el enlace.'):t("La imagen lleva tu diseño. El enlace abre tu mensaje a toda pantalla, con sus animaciones.")}</p>
  {!showQr&&<div className="share-media">
   {hasMotion&&(busy?<div className="export-progress" aria-busy="true">
    <div role="status"><span>{t('Creando tu GIF…')}</span><strong>{progress}%</strong></div>
    <progress value={progress} max={100} aria-label={t('Progreso de la exportación')}/>
    <button className="text-button" onClick={cancelGif}>{t('Cancelar')}</button>
   </div>:gif?<>
    <p className="share-gif-details" role="status">{t('Tu GIF está listo ·')} {number(gif.file.size/1024/1024,1)} MB</p>
    <div className="share-actions">
     {gifSupported&&<button className="button primary" disabled={sharing} onClick={()=>void shareFile(gif.file)}>{t(link?'Compartir GIF + enlace':'Compartir GIF')}</button>}
     <a className={`button ${gifSupported?'secondary':'primary'}`} href={gif.url} download="gzaas.gif">{t('Descargar GIF')}</a>
    </div>
   </>:<button className="button primary share-animation" disabled={sharing} onClick={()=>void prepareGif()}>{t('Compartir animación')}</button>)}
   {image&&<div className={hasMotion?'share-image-tools':'share-actions'}>
    {imageSupported&&<button className={hasMotion?'text-button':'button primary'} disabled={sharing||busy} onClick={()=>void shareFile(image.file)}>{t(link&&!hasMotion?'Compartir imagen + enlace':'Compartir imagen')}</button>}
    <a className={hasMotion?'text-button':`button ${imageSupported?'secondary':'primary'}`} href={image.url} download="gzaas.png">{t('Descargar imagen')}</a>
   </div>}
   {gif&&<p className="share-gif-hint">{t(gifSupported?'Cada app decide cómo muestra el GIF y el enlace.':'Copia el enlace y adjunta el GIF descargado en tu chat.')}</p>}
  </div>}
  {link&&<><label htmlFor="share-link">{t("Enlace a tu mensaje")}</label><div className="share-link-row"><input id="share-link" ref={input} readOnly value={snapshot.url} onFocus={e=>e.target.select()}/><button className="button secondary" onClick={()=>void copy()}>{t("Copiar")}</button></div><div className="share-link-tools"><button className="text-button share-link-only" disabled={busy||sharing} onClick={()=>{setQrError('');setShowQr(open=>!open);}} aria-pressed={showQr}>{t(showQr?'Volver al cartel':'Mostrar código QR')}</button>{typeof navigator.share==='function'&&<button className="text-button share-link-only" disabled={sharing} onClick={()=>void shareLink()}>{t("Compartir solo el enlace…")}</button>}</div></>}
  {(!gif||showQr||!link)&&<p className="share-note">{!link?t("Esta copia es local. Publica la web para compartir enlaces."):t('El enlace por sí solo muestra la tarjeta de Gzaas!')}</p>}
  {error&&<p className="field-error" role="alert">{t(error)}</p>}
  <p className="share-feedback" role="status">{t(feedback)}</p>
 </dialog>;
}
