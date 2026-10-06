import {useEffect,useRef,useState} from 'react';
import {paint,waitFonts,type Poster} from './render';
import {canShareFile,fileShareData,publicShareUrl} from './share-file.mjs';

export function ShareDialog({state,ratio,url,onClose}:{state:Poster;ratio:string;url:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [snapshot]=useState(()=>({state,ratio,url}));
 const [image,setImage]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[sharing,setSharing]=useState(false);
 const link=publicShareUrl(snapshot.url),supported=!!image&&canShareFile(image.file);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;let active=true,objectUrl='';
  dialog.current?.showModal();
  async function prepare(){
   try{
    await waitFonts(snapshot.state);if(!active)return;
    const canvas=document.createElement('canvas');const [w,h]=snapshot.ratio==='square'?[1200,1200]:snapshot.ratio==='portrait'?[900,1200]:[1200,900];
    paint(canvas,snapshot.state,w,h);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo preparar la imagen.')),'image/png'));
    if(!active)return;
    objectUrl=URL.createObjectURL(blob);setImage({file:new File([blob],'gzaas.png',{type:'image/png'}),url:objectUrl});
   }catch(e){if(active)setError((e as Error).message);}
  }
  void prepare();
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);if(previous?.isConnected)previous.focus();};
 },[snapshot]);
 async function copy(){setFeedback('');try{await navigator.clipboard.writeText(snapshot.url);setFeedback('Enlace copiado.');}catch{input.current?.focus();input.current?.select();setFeedback('Selecciona y copia el enlace.');}}
 async function shareImage(){
  if(!image)return;setError('');setSharing(true);
  try{await navigator.share(fileShareData(image.file,snapshot.url));}
  catch(e){if((e as Error).name!=='AbortError')setError('Puedes descargar la imagen y copiar el enlace para compartirlos.');}
  finally{setSharing(false);}
 }
 async function shareLink(){setError('');try{await navigator.share({title:'Un mensaje para ti — gzaas!',url:link});}catch(e){if((e as Error).name!=='AbortError')setError('Puedes copiar el enlace para compartirlo.');}}
 return <dialog ref={dialog} className="share-dialog" aria-labelledby="share-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <div className="dialog-header"><span className="eyebrow">QUE SE VEA. QUE SE SIENTA.</span><button className="icon-button" aria-label="Cerrar compartir" onClick={onClose}>×</button></div>
  <h2 id="share-title">Tu mensaje, fuera de aquí<span>.</span></h2>
  <div className="share-preview">{image?<img src={image.url} alt={snapshot.state.text}/>:<p role="status">{error?'Imagen no disponible.':'Preparando imagen…'}</p>}</div>
  <p className="share-description">La imagen lleva tu diseño. El enlace abre tu mensaje a toda pantalla, con sus animaciones.</p>
  <div className="share-actions">{supported&&<button className="button primary" disabled={sharing} onClick={()=>void shareImage()}>{link?'Compartir imagen + enlace':'Compartir imagen'}</button>}
  {image&&<a className={`button ${supported?'secondary':'primary'}`} href={image.url} download="gzaas.png">Descargar imagen</a>}</div>
  {link&&<><label htmlFor="share-link">Enlace a tu mensaje</label><div className="share-link-row"><input id="share-link" ref={input} readOnly value={snapshot.url} onFocus={e=>e.target.select()}/><button className="button secondary" onClick={()=>void copy()}>Copiar</button></div>{typeof navigator.share==='function'&&<button className="text-button share-link-only" onClick={()=>void shareLink()}>Compartir solo el enlace…</button>}</>}
  <p className="share-note">{!link?'Esta copia es local. Publica la web para compartir enlaces.':supported?'Elige WhatsApp u otra app en el menú de tu dispositivo.':'Descarga la imagen y adjúntala en tu chat junto al enlace.'}</p>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <p className="share-feedback" role="status">{feedback}</p>
 </dialog>;
}
