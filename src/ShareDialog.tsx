import {useI18n} from './useI18n';
import {useEffect,useRef,useState} from 'react';
import {paint,waitFonts,type Poster} from './render';
import {canShareFile,fileShareData,publicShareUrl} from './share-file.mjs';

export function ShareDialog({state,ratio,url,onClose}:{state:Poster;ratio:string;url:string;onClose:()=>void}){
 const {t}=useI18n();
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [snapshot]=useState(()=>({state,ratio,url}));
 const [image,setImage]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[sharing,setSharing]=useState(false);
 const [showQr,setShowQr]=useState(false),[qr,setQr]=useState(''),[qrError,setQrError]=useState('');
 const link=publicShareUrl(snapshot.url),supported=!!image&&canShareFile(image.file);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;let active=true,objectUrl='';
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
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);if(previous?.isConnected)previous.focus();};
 },[snapshot]);
 useEffect(()=>{
  if(!showQr||!link||qr||qrError)return;
  let active=true;
  void import('qrcode').then(({default:QRCode})=>QRCode.toDataURL(link,{errorCorrectionLevel:'M',margin:2,width:256})).then(data=>{if(active)setQr(data);}).catch(()=>{if(active)setQrError('No se pudo preparar el código QR.');});
  return()=>{active=false;};
 },[showQr,link,qr,qrError]);
 async function copy(){setFeedback('');try{await navigator.clipboard.writeText(snapshot.url);setFeedback('Enlace copiado.');}catch{input.current?.focus();input.current?.select();setFeedback('Selecciona y copia el enlace.');}}
 async function shareImage(){
  if(!image)return;setError('');setSharing(true);
  try{await navigator.share(fileShareData(image.file,snapshot.url,t('Un mensaje para ti — gzaas!')));}
  catch(e){if((e as Error).name!=='AbortError')setError('Puedes descargar la imagen y copiar el enlace para compartirlos.');}
  finally{setSharing(false);}
 }
 async function shareLink(){setError('');try{await navigator.share({title:t("Un mensaje para ti — gzaas!"),url:link});}catch(e){if((e as Error).name!=='AbortError')setError('Puedes copiar el enlace para compartirlo.');}}
 return <dialog ref={dialog} className="share-dialog" aria-labelledby="share-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <div className="dialog-header"><span className="eyebrow">{t("QUE SE VEA. QUE SE SIENTA.")}</span><button className="icon-button" aria-label={t("Cerrar compartir")} onClick={onClose}>×</button></div>
  <h2 id="share-title">{t("Tu mensaje, fuera de aquí")}<span>.</span></h2>
  <div className={`share-preview${showQr?' share-preview-qr':''}`}>{showQr?(qr?<img src={qr} alt={t('Código QR del enlace a tu mensaje')}/>:<p role="status">{t(qrError||'Preparando código QR…')}</p>):image?<img src={image.url} alt={snapshot.state.text}/>:<p role="status">{error?t("Imagen no disponible."):t("Preparando imagen…")}</p>}</div>
  <p className="share-description">{showQr?t('Escanea para abrir este mensaje en otro dispositivo.'):t("La imagen lleva tu diseño. El enlace abre tu mensaje a toda pantalla, con sus animaciones.")}</p>
  <div className="share-actions">{supported&&<button className="button primary" disabled={sharing} onClick={()=>void shareImage()}>{link?t("Compartir imagen + enlace"):t("Compartir imagen")}</button>}
  {image&&<a className={`button ${supported?'secondary':'primary'}`} href={image.url} download="gzaas.png">{t("Descargar imagen")}</a>}</div>
  {link&&<><label htmlFor="share-link">{t("Enlace a tu mensaje")}</label><div className="share-link-row"><input id="share-link" ref={input} readOnly value={snapshot.url} onFocus={e=>e.target.select()}/><button className="button secondary" onClick={()=>void copy()}>{t("Copiar")}</button></div><div className="share-link-tools"><button className="text-button share-link-only" onClick={()=>{setQrError('');setShowQr(open=>!open);}} aria-pressed={showQr}>{t(showQr?'Volver al cartel':'Mostrar código QR')}</button>{typeof navigator.share==='function'&&<button className="text-button share-link-only" onClick={()=>void shareLink()}>{t("Compartir solo el enlace…")}</button>}</div></>}
  <p className="share-note">{!link?t("Esta copia es local. Publica la web para compartir enlaces."):supported?t("Elige WhatsApp u otra app en el menú de tu dispositivo."):t("Descarga la imagen y adjúntala en tu chat junto al enlace.")}</p>
  {error&&<p className="field-error" role="alert">{t(error)}</p>}
  <p className="share-feedback" role="status">{t(feedback)}</p>
 </dialog>;
}
