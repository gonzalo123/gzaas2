import {useI18n,LanguageSelector} from './useI18n';
import './pwa';
import {InstallApp} from './InstallApp';
import {isGalaxy} from './galaxy.mjs';
import {isParticle} from './particles.mjs';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
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
import {Landing} from './Landing';
import {NotFound} from './NotFound';
import {useRoulette} from './useRoulette';
import {randomStyle} from './roulette.mjs';
import{EditorPanel,type EditorTab}from'./EditorPanel';
import{ExportDialog}from'./ExportDialog';
import{ShareDialog}from'./ShareDialog';
import './style.css';
import './editor.css';
import './wow.css';
import './trailer.css';
import './export.css';
import './share.css';
import './landing.css';
import './language.css';
import './not-found.css';
import './stage.css';
function OriginalCredit(){
 const {t}=useI18n();return <div className="origin-credit">{t("Inspirado en")} <a href="https://github.com/ojoven/gzaas" target="_blank" rel="noreferrer">Gzaas!</a>{t(", de")} <a href="https://github.com/ojoven" target="_blank" rel="noreferrer">ojoven</a>.</div>}
function Icon({name,...rest}:{name:string;[k:string]:unknown}){const p:Record<string,React.ReactNode>={replay:<><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,play:<path d="m8 5 11 7-11 7Z"/>,pause:<><path d="M9 5v14M15 5v14"/></>,shuffle:<><path d="m4 5 4 0 8 14h4M17 16l3 3-3 3M4 19h4l3-5M14 9l2-4h4M17 2l3 3-3 3"/></>,share:<><path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/></>,download:<><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></>,expand:<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></>,check:<path d="m5 12 4 4L19 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,left:<><path d="M4 5h16M4 10h10M4 15h16M4 20h10"/></>,center:<><path d="M4 5h16M7 10h10M4 15h16M7 20h10"/></>,right:<><path d="M4 5h16M10 10h10M4 15h16M10 20h10"/></>,edit:<><path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/></>};return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{p[name]||p.check}</svg>}
function upgradeLegacyHash(hash:string,state:Poster){
 if(!hash.startsWith('#v1=')&&!hash.startsWith('#edit:v1='))return;
 try{history.replaceState(history.state,'',location.pathname+location.search+encodeState(state).replace('#',hash.startsWith('#edit:')?'#edit:':'#'));}catch{}
}
// Source lives in src/ during development and assets/ after build; both have the site root as parent.
const homePath=location.protocol==='file:'?location.pathname:new URL(/* @vite-ignore */ '../',import.meta.url).pathname;
function missingPage(){return document.documentElement.hasAttribute('data-gzaas-not-found')||![homePath,homePath+'index.html'].includes(location.pathname);}
function initial(){try{if(missingPage())return{state:DEFAULT,view:false,notFound:true,error:'Esta página no existe. Puede que el enlace esté incompleto.'};if(!location.hash)return{state:DEFAULT,view:false,notFound:false,error:''};const hash=location.hash,state=decodeState(hash.replace('#edit:','#'));upgradeLegacyHash(hash,state);return{state,view:!hash.startsWith('#edit:'),notFound:false,error:''};}catch(e){return {state:DEFAULT,view:false,notFound:true,error:(e as Error).message};}}
const boot=initial();
function App(){
 const {t,locale}=useI18n();
 const[notFound,setNotFound]=useState(boot.notFound);
 useLayoutEffect(()=>{
  document.documentElement.lang=locale;
  document.title=notFound?t('404 · Mensaje no encontrado — gzaas!'):t('gzaas! — Dilo a lo grande.');
  document.querySelector('meta[name="description"]')?.setAttribute('content',t('Escribe algo. Dale personalidad. Compártelo a lo grande. Mensajes que viven en su enlace.'));
 },[locale,t,notFound]);
 const[state,setState]=useState<Poster>(boot.state),[view,setView]=useState(boot.view),[error,setError]=useState(boot.error),[toast,setToast]=useState(''),[shareOpen,setShareOpen]=useState(false),[shareUrl,setShareUrl]=useState(''),[busy,setBusy]=useState(false),[ratio,setRatio]=useState('landscape');
 const[paused,setPaused]=useState(false),[replay,setReplay]=useState(0),[controlsVisible,setControlsVisible]=useState(false),[closing,setClosing]=useState(false);
 const[landing,setLanding]=useState(!location.hash||!!boot.error),[draft,setDraft]=useState('');
 const[editorTab,setEditorTab]=useState<EditorTab>('message'),[trayOpen,setTrayOpen]=useState(true);
 const[exportOpen,setExportOpen]=useState(false),[flash,setFlash]=useState<Partial<Poster>|null>(null);
 const roulette=useRoulette();
 const stateRef=useRef(state);stateRef.current=state;
 const toastTimer=useRef<ReturnType<typeof setTimeout>>(undefined),exitTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
 function notify(s:string){setToast(s);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3000);}
 function patch(p:Partial<Poster>){setState(prev=>({...prev,...p}));setPaused(false);}
 function restart(){setReplay(n=>n+1);setPaused(false);}
 function getUrl(){return location.href.split('#')[0]+encodeState(state);}
 useEffect(()=>{const onHash=()=>{clearTimeout(exitTimer.current);roulette.cancel();setFlash(null);setClosing(false);setShareOpen(false);setExportOpen(false);setPaused(false);try{if(missingPage())throw Error('Esta página no existe. Puede que el enlace esté incompleto.');if(location.hash){const hash=location.hash,next=decodeState(hash.replace('#edit:','#'));setState(next);setView(!hash.startsWith('#edit:'));setLanding(false);upgradeLegacyHash(hash,next);}else{setView(false);setLanding(true);setDraft('');}setNotFound(false);setError('');}catch(e){setError((e as Error).message);setView(false);setLanding(true);setNotFound(true);}};addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash);},[]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!shareOpen&&!exportOpen)edit();};addEventListener('keydown',esc);return()=>removeEventListener('keydown',esc);},[view,shareOpen,exportOpen]);
 useLayoutEffect(()=>{
  if(!view)return;
  let timer:ReturnType<typeof setTimeout>;
  const reveal=()=>{setControlsVisible(true);clearTimeout(timer);timer=setTimeout(()=>setControlsVisible(false),2800);};
  const move=(e:PointerEvent)=>{if(e.pointerType!=='touch')reveal();};
  const touch=(e:PointerEvent)=>{if(e.pointerType!=='mouse')reveal();};
  const hide=()=>{clearTimeout(timer);setControlsVisible(false);};
  reveal();addEventListener('pointermove',move);addEventListener('pointerdown',touch);addEventListener('keydown',reveal);document.addEventListener('fullscreenchange',hide);
  return()=>{clearTimeout(timer);removeEventListener('pointermove',move);removeEventListener('pointerdown',touch);removeEventListener('keydown',reveal);document.removeEventListener('fullscreenchange',hide);};
 },[view]);
 useEffect(()=>()=>{clearTimeout(toastTimer.current);clearTimeout(exitTimer.current);},[]);
 useEffect(()=>{
  const ctx=(document as Document&{modelContext?:{registerTool:(t:unknown,o:unknown)=>Promise<void>|void}}).modelContext;if(!ctx)return;
  const life=new AbortController();try{Promise.resolve(ctx.registerTool({name:'configure_gzaas_message',description:'Set the message text in the visible Gzaas editor. Does not publish or share.',inputSchema:{type:'object',properties:{text:{type:'string',minLength:1,maxLength:280}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input:unknown)=>{const text=(input as {text?:unknown})?.text;if(typeof text!=='string')throw Error('text must be a string');const next=validateState({...stateRef.current,text});flushSync(()=>{setState(next);setView(false);setLanding(false);});return{configured:true,text:next.text};}},{signal:life.signal})).catch(()=>{});}catch{}return()=>life.abort();
 },[]);
 useEffect(()=>{if(notFound||landing||view||error)return;const timer=setTimeout(()=>{try{history.replaceState(null,'',location.pathname+location.search+encodeState(state).replace('#','#edit:'));}catch{}},200);return()=>clearTimeout(timer);},[state,landing,view,error,notFound]);
 const invalid=!state.text.trim()||[...state.text].length>MAX_TEXT||state.text.split('\n').length>12;
 const hasMotion=state.animation!=='none'||state.backdropMotion&&state.backdrop!=='solid';
 async function share(){try{const url=getUrl();setShareUrl(url);setShareOpen(true);}catch(e){setError((e as Error).message);}}
 async function download(){setBusy(true);try{await waitFonts(state);const canvas=document.createElement('canvas');const [w,h]=ratio==='square'?[1600,1600]:ratio==='portrait'?[1200,1600]:[1920,1440];await paint(canvas,state,w,h);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo crear la imagen.')),'image/png'));const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gzaas.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Tu imagen está lista.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function surprise(){
  if(roulette.spinning)return;
  const {index:idx,style:chosen}=randomStyle(state);
  // Classic stills keep the flashes light; the final frame uses the chosen design.
  roulette.spin(idx,(i,final)=>{const{name,sample,...style}=PRESETS[i];patch(final?chosen:{...style,animation:'none',backdropMotion:false});},()=>notify(PRESETS[idx].name));
 }
 function fullScreen(){clearTimeout(exitTimer.current);setClosing(false);setPaused(false);setControlsVisible(false);setView(true);}
 function edit(){if(!view||closing)return;setClosing(true);exitTimer.current=setTimeout(()=>{setView(false);setClosing(false);if(document.fullscreenElement)void document.exitFullscreen();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:320);}
 function createMessage(){
  if(roulette.spinning)return;
  try{
   const {index:idx,style}=randomStyle(undefined),styleOf=(i:number)=>{const{name,sample,...preset}=PRESETS[i];return preset;};
   const next=validateState({...DEFAULT,...style,text:draft});
   const enter=()=>{
    const commit=()=>{flushSync(()=>{setState(next);setError('');setPaused(false);setView(true);setLanding(false);setFlash(null);});history.replaceState(null,'',location.pathname+location.search+encodeState(next));window.scrollTo(0,0);};
    const transition=(document as Document&{startViewTransition?:(cb:()=>void)=>unknown}).startViewTransition;
    if(transition&&!matchMedia('(prefers-reduced-motion: reduce)').matches)transition.call(document,commit);else commit();
   };
   roulette.spin(idx,(i,final)=>setFlash(final?next:{...DEFAULT,...styleOf(i),animation:'none',backdropMotion:false}),enter);
  }catch(e){setError((e as Error).message);}
 }
 function recover(poster?:Poster){
  document.documentElement.removeAttribute('data-gzaas-not-found');
  history.replaceState(null,'',homePath+(poster?encodeState(poster).replace('#','#edit:'):''));
  setNotFound(false);setError('');setView(false);setLanding(!poster);setDraft('');setEditorTab('message');setTrayOpen(true);
  if(poster)setState(poster);
  requestAnimationFrame(()=>document.getElementById(poster?'message':'landing-message')?.focus());
 }
 if(notFound)return <><NotFound reason={error} home={homePath} onHome={()=>recover()} onRemix={recover}/><OriginalCredit/></>;
 const stage=!landing&&!view?{'--poster-bg':state.bg,'--poster-fg':state.fg,'--poster-accent':state.accent} as React.CSSProperties:undefined;
 return <div style={stage} className={landing?'app landing':view?`app viewer${controlsVisible?' controls-visible':''}${closing?' viewer-closing':''}`:'app edit-app'}>
 <InstallApp visible={landing&&!draft}/>
 {(landing||view)&&<LanguageSelector className={landing?'landing-language':'viewer-language'}/>}
 {landing&&<Landing draft={draft} error={error} flash={flash} onDraft={text=>{setDraft(text);setError('');}} onCreate={createMessage}/>}
 {!landing&&!view&&<><header className="topbar"><a className="logo" href={location.pathname} aria-label={t("Gzaas, inicio")}>gzaas<span>!</span></a><span className="editor-context">{t("Dale tu toque.")}</span><div className="editor-actions"><LanguageSelector/><button className="button secondary surprise-button" aria-label={t("Sorpréndeme")} title={t("Sorpréndeme")} disabled={roulette.spinning} onClick={surprise}><Icon name="shuffle"/><span>{t("Sorpréndeme")}</span></button><button className="button secondary download-button" aria-label={busy?t("Preparando imagen"):t("Descargar mensaje")} title={t("Descargar PNG o GIF")} disabled={invalid||busy} onClick={()=>setExportOpen(true)}><Icon name="download"/><span>{busy?t("Preparando…"):t("Descargar")}</span></button><button className="button primary share-button" aria-label={t("Compartir")} onClick={share} disabled={invalid}><Icon name="share"/><span>{t("Compartir")}</span></button></div></header>
 <main className="edit-main">
 {error&&<div role="alert" className="error"><span>{t(error)}</span><button onClick={()=>{setError('');history.replaceState(null,'',location.pathname+location.search);}} aria-label={t("Cerrar aviso")}><Icon name="close"/></button></div>}
 <div className="workspace"><section className="preview-column" aria-label={t("Vista previa del mensaje")}><div className="preview-heading"><button className={`trailer-shortcut${state.animation==='trailer'?' selected':''}`} aria-pressed={state.animation==='trailer'} onClick={()=>{patch({animation:state.animation==='trailer'?(state.trailerGalaxy?'particle-galaxy':state.trailerParticles?'particle-assemble':'letters'):'trailer',trailerGalaxy:isParticle(state.animation)?isGalaxy(state.animation):state.trailerGalaxy,trailerParticles:isParticle(state.animation)||state.trailerParticles,trailerMix:isParticle(state.animation)?false:state.trailerMix});setEditorTab('motion');setTrayOpen(true);}}>{t("▶ Tráiler")}</button><div className="ratio-controls" aria-label={t("Proporción del cartel")}>{[['landscape','4:3'],['square','1:1'],['portrait','3:4']].map(([key,label])=><button key={key} className={ratio===key?'selected':''} onClick={()=>setRatio(key)} aria-pressed={ratio===key}>{label}</button>)}</div></div><div className={'preview-bed '+ratio}><div className={'poster-frame '+ratio}><PosterStage state={state} paused={paused} replay={replay} onError={setError} onPlay={()=>setPaused(false)}/></div></div><div className="preview-bottom"><span className="live-indicator"><i className={paused||!hasMotion?'still':''}/>{paused?t("En pausa"):!hasMotion?t("Sin movimiento"):t("Vista previa en vivo")}</span><div className="preview-actions"><button className="text-button" aria-label={paused?t("Reanudar animación"):t("Pausar animación")} disabled={!hasMotion} onClick={()=>setPaused(p=>!p)}><Icon name={paused?'play':'pause'}/></button><button className="text-button" aria-label={t("Repetir animación")} disabled={!hasMotion} onClick={restart}><Icon name="replay"/></button><button className="text-button" disabled={invalid} onClick={fullScreen}><Icon name="expand"/>{t("Ver en grande")}</button></div></div></section><EditorPanel state={state} patch={patch} tab={editorTab} open={trayOpen} onTab={id=>{if(id===editorTab&&trayOpen)setTrayOpen(false);else{setEditorTab(id);setTrayOpen(true);}}}/></div></main></>}
 {view&&<><div className="viewer-poster"><PosterStage state={state} paused={paused} replay={replay} onError={setError} onPlay={()=>setPaused(false)}/></div><div className="viewer-bar"><span className="viewer-logo">gzaas!</span><button className="icon-button" aria-label={paused?t("Reanudar animación"):t("Pausar animación")} disabled={!hasMotion} onClick={()=>setPaused(p=>!p)}><Icon name={paused?'play':'pause'}/></button><button className="icon-button" aria-label={t("Repetir animación")} disabled={!hasMotion} onClick={restart}><Icon name="replay"/></button><button className="button" onClick={edit}><Icon name="edit"/>{t("Crear mi versión")}</button><button className="button" onClick={share}><Icon name="share"/>{t("Compartir")}</button><button className="icon-button" aria-label={t("Activar pantalla completa")} onClick={()=>{if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>notify('Usa el modo pantalla completa de tu navegador.'));else notify('Usa el modo pantalla completa de tu navegador.');}}><Icon name="expand"/></button></div></>}
 {shareOpen&&<ShareDialog state={state} ratio={ratio} url={shareUrl} onClose={()=>setShareOpen(false)}/>}
 {exportOpen&&<ExportDialog state={state} ratio={ratio} shareUrl={getUrl()} onPNG={download} onClose={()=>setExportOpen(false)}/>}
 <OriginalCredit/>
 <div className={'toast '+(toast?'visible':'')} role="status" aria-live="polite"><Icon name="check"/>{t(toast)}</div>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>);
