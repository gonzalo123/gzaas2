import React,{useEffect,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{flushSync}from'react-dom';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-sans/latin-800.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/bungee-shade/latin-400.css';
import '@fontsource/monoton/latin-400.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/pacifico/latin-400.css';
import '@fontsource/righteous/latin-400.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/abril-fatface/latin-400.css';
import{DEFAULT,PRESETS,MAX_TEXT,encodeState,decodeState,validateState}from'./state.mjs';
import{paint,waitFonts,type Poster}from'./render';
import{PosterStage}from'./PosterStage';
import{EditorPanel,type EditorTab}from'./EditorPanel';
import './style.css';
import './editor.css';
import './wow.css';
function OriginalCredit(){return <div className="origin-credit">Inspirado en <a href="https://github.com/ojoven/gzaas" target="_blank" rel="noreferrer">Gzaas!</a>, de <a href="https://github.com/ojoven" target="_blank" rel="noreferrer">ojoven</a>.</div>}
function Icon({name,...rest}:{name:string;[k:string]:unknown}){const p:Record<string,React.ReactNode>={replay:<><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,play:<path d="m8 5 11 7-11 7Z"/>,pause:<><path d="M9 5v14M15 5v14"/></>,shuffle:<><path d="m4 5 4 0 8 14h4M17 16l3 3-3 3M4 19h4l3-5M14 9l2-4h4M17 2l3 3-3 3"/></>,share:<><path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/></>,download:<><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></>,expand:<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></>,check:<path d="m5 12 4 4L19 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,left:<><path d="M4 5h16M4 10h10M4 15h16M4 20h10"/></>,center:<><path d="M4 5h16M7 10h10M4 15h16M7 20h10"/></>,right:<><path d="M4 5h16M10 10h10M4 15h16M10 20h10"/></>,edit:<><path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/></>};return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{p[name]||p.check}</svg>}
function initial(){try{return location.hash ? {state:decodeState(location.hash.replace('#edit:','#')),view:!location.hash.startsWith('#edit:'),error:''}:{state:DEFAULT,view:false,error:''};}catch(e){return {state:DEFAULT,view:false,error:(e as Error).message};}}
const boot=initial();
function App(){
 const[state,setState]=useState<Poster>(boot.state),[view,setView]=useState(boot.view),[error,setError]=useState(boot.error),[toast,setToast]=useState(''),[shareOpen,setShareOpen]=useState(false),[shareUrl,setShareUrl]=useState(''),[busy,setBusy]=useState(false),[ratio,setRatio]=useState('landscape');
 const[paused,setPaused]=useState(false),[replay,setReplay]=useState(0),[controlsVisible,setControlsVisible]=useState(true),[closing,setClosing]=useState(false);
 const[landing,setLanding]=useState(!location.hash||!!boot.error),[draft,setDraft]=useState('');
 const[editorTab,setEditorTab]=useState<EditorTab>('message');
 const stateRef=useRef(state);stateRef.current=state;
 const dialog=useRef<HTMLDialogElement>(null),shareInput=useRef<HTMLInputElement>(null),toastTimer=useRef<ReturnType<typeof setTimeout>>(undefined),exitTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
 function notify(s:string){setToast(s);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3000);}
 function patch(p:Partial<Poster>){setState(prev=>({...prev,...p}));setPaused(false);}
 function restart(){setReplay(n=>n+1);setPaused(false);}
 function getUrl(){return location.href.split('#')[0]+encodeState(state);}
 useEffect(()=>{const onHash=()=>{clearTimeout(exitTimer.current);setClosing(false);setShareOpen(false);setPaused(false);try{if(location.hash){setState(decodeState(location.hash.replace('#edit:','#')));setView(!location.hash.startsWith('#edit:'));setLanding(false);}else{setView(false);setLanding(true);setDraft('');}setError('');}catch(e){setError((e as Error).message);setView(false);setLanding(true);}};addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash);},[]);
 useEffect(()=>{if(shareOpen)dialog.current?.showModal();else dialog.current?.close();},[shareOpen]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!dialog.current?.open)edit();};addEventListener('keydown',esc);return()=>removeEventListener('keydown',esc);},[view]);
 useEffect(()=>{
  if(!view)return;
  let timer:ReturnType<typeof setTimeout>;
  const reveal=()=>{setControlsVisible(true);clearTimeout(timer);timer=setTimeout(()=>setControlsVisible(false),2800);};
  reveal();addEventListener('pointermove',reveal);addEventListener('pointerdown',reveal);addEventListener('keydown',reveal);
  return()=>{clearTimeout(timer);removeEventListener('pointermove',reveal);removeEventListener('pointerdown',reveal);removeEventListener('keydown',reveal);};
 },[view]);
 useEffect(()=>()=>{clearTimeout(toastTimer.current);clearTimeout(exitTimer.current);},[]);
 useEffect(()=>{
  const ctx=(document as Document&{modelContext?:{registerTool:(t:unknown,o:unknown)=>Promise<void>|void}}).modelContext;if(!ctx)return;
  const life=new AbortController();try{Promise.resolve(ctx.registerTool({name:'configure_gzaas_message',description:'Set the message text in the visible Gzaas editor. Does not publish or share.',inputSchema:{type:'object',properties:{text:{type:'string',minLength:1,maxLength:280}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input:unknown)=>{const text=(input as {text?:unknown})?.text;if(typeof text!=='string')throw Error('text must be a string');const next=validateState({...stateRef.current,text});flushSync(()=>{setState(next);setView(false);setLanding(false);});return{configured:true,text:next.text};}},{signal:life.signal})).catch(()=>{});}catch{}return()=>life.abort();
 },[]);
 useEffect(()=>{if(landing||view||error)return;const timer=setTimeout(()=>{try{history.replaceState(null,'',location.pathname+location.search+encodeState(state).replace('#','#edit:'));}catch{}},200);return()=>clearTimeout(timer);},[state,landing,view,error]);
 const invalid=!state.text.trim()||[...state.text].length>MAX_TEXT||state.text.split('\n').length>12;
 const hasMotion=state.animation!=='none'||state.backdropMotion&&state.backdrop!=='solid';
 async function share(){try{const url=getUrl();setShareUrl(url);setShareOpen(true);}catch(e){setError((e as Error).message);}}
 async function copy(){try{await navigator.clipboard.writeText(shareUrl);notify('Enlace copiado. ¡A compartir!');}catch{shareInput.current?.focus();shareInput.current?.select();notify('Selecciona y copia el enlace.');}}
 async function nativeShare(){try{await navigator.share({title:'Un mensaje para ti — gzaas!',url:shareUrl});}catch(e){if((e as Error).name!=='AbortError')notify('No se pudo abrir el menú. Puedes copiar el enlace.');}}
 async function download(){setBusy(true);try{await waitFonts(state);const canvas=document.createElement('canvas');const [w,h]=ratio==='square'?[1600,1600]:ratio==='portrait'?[1200,1600]:[1920,1440];paint(canvas,state,w,h);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo crear la imagen.')),'image/png'));const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gzaas.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Tu imagen está lista.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function surprise(){const current=PRESETS.findIndex(p=>p.bg===state.bg);let idx;do{idx=Math.floor(Math.random()*PRESETS.length);}while(idx===current);const{name,sample,...style}=PRESETS[idx];patch(style);notify(name);}
 function fullScreen(){clearTimeout(exitTimer.current);setClosing(false);setPaused(false);setView(true);}
 function edit(){if(!view||closing)return;setClosing(true);exitTimer.current=setTimeout(()=>{setView(false);setClosing(false);if(document.fullscreenElement)void document.exitFullscreen();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:320);}
 function createMessage(){try{setState(validateState({...state,text:draft}));setError('');setPaused(false);setView(false);setLanding(false);window.scrollTo(0,0);}catch(e){setError((e as Error).message);}}
 return <div className={landing?'app landing':view?`app viewer${controlsVisible?' controls-visible':''}${closing?' viewer-closing':''}`:'app edit-app'}>
 {landing&&<main className="landing-content"><h1 className="landing-logo" aria-label="gzaas!">gzaas<span>!</span></h1><p className="landing-tagline">Tus mensajes, a toda pantalla.</p><form className="landing-form" onSubmit={e=>{e.preventDefault();createMessage();}}><label className="sr-only" htmlFor="landing-message">Tu mensaje</label><textarea id="landing-message" rows={2} value={draft} placeholder="Escribe tu mensaje…" aria-invalid={!!error} aria-describedby={error?'landing-error':undefined} onChange={e=>{setDraft([...e.target.value].slice(0,MAX_TEXT).join(''));setError('');}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(draft.trim())createMessage();}}} spellCheck={false}/>{error&&<p id="landing-error" className="field-error" role="alert">{error}</p>}<div className="landing-actions"><button className="landing-submit" type="submit" disabled={!draft.trim()}>gzaas it!</button></div></form></main>}
 {!landing&&!view&&<><header className="topbar"><a className="logo" href={location.pathname} aria-label="Gzaas, inicio">gzaas<span>!</span></a><span className="editor-context">Dale tu toque.</span><div className="editor-actions"><button className="icon-button" aria-label="Sorpréndeme" title="Sorpréndeme" onClick={surprise}><Icon name="shuffle"/></button><button className="button secondary download-button" aria-label={busy?'Preparando imagen':'Descargar imagen PNG'} title="Descargar imagen PNG" disabled={invalid||busy} onClick={download}><Icon name="download"/><span>{busy?'Preparando…':'Descargar'}</span></button><button className="button primary" onClick={share} disabled={invalid}><Icon name="share"/>Compartir</button></div></header>
 <main className="edit-main">
 {error&&<div role="alert" className="error"><span>{error}</span><button onClick={()=>{setError('');history.replaceState(null,'',location.pathname+location.search);}} aria-label="Cerrar aviso"><Icon name="close"/></button></div>}
 <div className="workspace"><section className="preview-column" aria-label="Vista previa del mensaje"><div className="preview-heading"><span>EL MENSAJE</span><div className="ratio-controls" aria-label="Proporción del cartel">{[['landscape','4:3'],['square','1:1'],['portrait','3:4']].map(([key,label])=><button key={key} className={ratio===key?'selected':''} onClick={()=>setRatio(key)} aria-pressed={ratio===key}>{label}</button>)}</div></div><div className={'preview-bed '+ratio}><div className={'poster-frame '+ratio}><PosterStage state={state} paused={paused} replay={replay} onError={setError}/></div></div><div className="preview-bottom"><span className="live-indicator"><i className={paused||!hasMotion?'still':''}/>{paused?'En pausa':!hasMotion?'Sin movimiento':'Vista previa en vivo'}</span><div className="preview-actions"><button className="text-button" aria-label={paused?'Reanudar animación':'Pausar animación'} disabled={!hasMotion} onClick={()=>setPaused(p=>!p)}><Icon name={paused?'play':'pause'}/></button><button className="text-button" aria-label="Repetir animación" disabled={!hasMotion} onClick={restart}><Icon name="replay"/></button><button className="text-button" disabled={invalid} onClick={fullScreen}><Icon name="expand"/>Ver en grande</button></div></div></section><EditorPanel state={state} patch={patch} tab={editorTab} onTab={setEditorTab}/></div></main></>}
 {view&&<><div className="viewer-poster"><PosterStage state={state} paused={paused} replay={replay} onError={setError}/></div><div className="viewer-bar"><span className="viewer-logo">gzaas!</span><button className="icon-button" aria-label={paused?'Reanudar animación':'Pausar animación'} disabled={!hasMotion} onClick={()=>setPaused(p=>!p)}><Icon name={paused?'play':'pause'}/></button><button className="icon-button" aria-label="Repetir animación" disabled={!hasMotion} onClick={restart}><Icon name="replay"/></button><button className="button" onClick={edit}><Icon name="edit"/>Crear mi versión</button><button className="button" onClick={share}><Icon name="share"/>Compartir</button><button className="icon-button" aria-label="Activar pantalla completa" onClick={()=>{if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>notify('Usa el modo pantalla completa de tu navegador.'));else notify('Usa el modo pantalla completa de tu navegador.');}}><Icon name="expand"/></button></div></>}
 <dialog aria-labelledby="share-title" ref={dialog} onCancel={()=>setShareOpen(false)} onClose={()=>setShareOpen(false)} onClick={e=>{if(e.target===dialog.current)setShareOpen(false);}}><div className="dialog-header"><span className="eyebrow">LISTO PARA SALIR AL MUNDO</span><button className="icon-button" aria-label="Cerrar" onClick={()=>setShareOpen(false)}><Icon name="close"/></button></div><h2 id="share-title">Que llegue a quien tú quieras<span>.</span></h2><p>Este enlace lleva tu mensaje y su diseño. Quien lo abra lo verá a toda pantalla.</p><label htmlFor="share-link">Enlace a tu mensaje</label><input id="share-link" ref={shareInput} readOnly value={shareUrl} onFocus={e=>e.target.select()}/><button className="button primary" onClick={copy}><Icon name="share"/>Copiar enlace</button>{typeof navigator.share==='function'&&<button className="button secondary" onClick={nativeShare}>Compartir con…</button>}<p className="share-note">Quien tenga el enlace puede verlo y crear su versión. Si editas el mensaje, comparte un enlace nuevo.</p>{location.protocol==='file:'&&<p className="field-error">Esta copia es local. Publica la web para compartir enlaces con otras personas.</p>}</dialog>
 <OriginalCredit/>
 <div className={'toast '+(toast?'visible':'')} role="status" aria-live="polite"><Icon name="check"/>{toast}</div>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>);
