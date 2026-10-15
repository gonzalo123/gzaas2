import {useI18n} from './useI18n';
import {isGalaxy} from './galaxy.mjs';
import {isParticle} from './particles.mjs';
import React,{useEffect,useState,type KeyboardEvent} from 'react';
import {ANIMATIONS,BACKDROPS,BACKDROP_COLLECTIONS,backdropCollection,COLLECTIONS,MAX_TEXT,PRESETS} from './state.mjs';
import {families,fontWeight,type Poster} from './render';
import {FontPicker} from './FontPicker';
import {Backdrop} from './Backdrop';
import {buildTrailer} from './trailer.mjs';

const motionType=(animation:string)=>isParticle(animation)?'particles':animation==='trailer'?'trailer':['letters','wave','bounce','orbit'].includes(animation)?'letters':'scene';

export const EDITOR_TABS = [{id:'message',label:'Texto'},{id:'styles',label:'Estilos'},{id:'design',label:'Diseño'},{id:'background',label:'Fondos'},{id:'motion',label:'Movimiento'}] as const;
export type EditorTab = typeof EDITOR_TABS[number]['id'];
const TAB_ICONS:Record<EditorTab,React.ReactNode>={
 message:<path d="M5 6V5h14v1M12 5v14M9 19h6"/>,
 styles:<path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2Z"/>,
 design:<><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></>,
 background:<path d="m3 8 9-5 9 5-9 5-9-5ZM3 13l9 5 9-5"/>,
 motion:<path d="m8 5 11 7-11 7Z"/>,
};

export function EditorPanel({state,patch,tab,open,onTab}:{state:Poster;patch:(p:Partial<Poster>)=>void;tab:EditorTab;open:boolean;onTab:(tab:EditorTab)=>void}){
 const {t}=useI18n();
 const usesGalaxy=isGalaxy(state.animation)||(state.animation==='trailer'&&state.trailerGalaxy);
 const usesParticles=isParticle(state.animation)||(state.animation==='trailer'&&(state.trailerParticles||state.trailerGalaxy)&&!state.trailerMix);
 const trailerStyle=state.trailerMix?'mix':state.trailerGalaxy?'galaxy':state.trailerParticles?'particles':'classic';
 const trailer=state.animation==='trailer'?buildTrailer(state):null;
 const [collection,setCollection]=useState(0),[motionGroup,setMotionGroup]=useState(motionType(state.animation));
 const [backgroundCollection,setBackgroundCollection]=useState(()=>backdropCollection(state.backdrop));
 useEffect(()=>{setBackgroundCollection(backdropCollection(state.backdrop));},[state.backdrop]);
 useEffect(()=>{setMotionGroup(motionType(state.animation));},[state.animation]);
 useEffect(()=>{const index=PRESETS.findIndex(p=>['font','fg','bg','backdrop','effect','animation'].every(k=>state[k as keyof Poster]===p[k as keyof typeof p]));if(index>=0)setCollection(Math.floor(index/6));},[state.font,state.fg,state.bg,state.backdrop,state.effect,state.animation]);
 function navigate(e:KeyboardEvent<HTMLButtonElement>,index:number){
  let next=index;
  if(e.key==='ArrowRight')next=(index+1)%EDITOR_TABS.length;
  else if(e.key==='ArrowLeft')next=(index+EDITOR_TABS.length-1)%EDITOR_TABS.length;
  else if(e.key==='Home')next=0;
  else if(e.key==='End')next=EDITOR_TABS.length-1;
  else return;
  e.preventDefault();onTab(EDITOR_TABS[next].id);document.getElementById(`tab-${EDITOR_TABS[next].id}`)?.focus();
 }
 return <aside className="editor" aria-label={t("Editar mensaje")}>
  <div className="editor-tabs" role="tablist" aria-label={t("Opciones del mensaje")}>{EDITOR_TABS.map((item,i)=><button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab===item.id} aria-controls="editor-panel" tabIndex={tab===item.id?0:-1} onClick={()=>onTab(item.id)} onKeyDown={e=>navigate(e,i)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TAB_ICONS[item.id]}</svg><span>{t(item.label)}</span></button>)}</div>
  <div key={tab} className={`editor-panel panel-${tab}`} id="editor-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} hidden={!open}>
   {tab==='message'&&<>
    <div className="tray-col tray-wide">
     <div className="field-label"><label htmlFor="message">{t("Tu mensaje")}</label><span>{[...state.text].length}/{MAX_TEXT}</span></div>
     <textarea id="message" value={state.text} placeholder={t("Eso que quieres decir…")} onChange={e=>patch({text:[...e.target.value].slice(0,MAX_TEXT).join('')})} spellCheck={false}/>
     {state.text.split('\n').length>12&&<p className="field-error" role="alert">{t("Usa como máximo 12 líneas.")}</p>}
    </div>
    <div className="tray-col">
     <div className="field-label"><label htmlFor="size">{t("Intensidad")}</label><span>{state.size}%</span></div><input id="size" type="range" min="40" max="100" value={state.size} onChange={e=>patch({size:+e.target.value})}/>
     <div className="field-label"><span>{t("Alineación")}</span></div><div className="text-alignment" role="group" aria-label={t("Alineación")}>{[['left',t("Izquierda")],['center',t("Centro")],['right',t("Derecha")]].map(([id,label])=><button key={id} aria-pressed={state.align===id} className={state.align===id?'selected':''} onClick={()=>patch({align:id})}>{label}</button>)}</div>
    </div>
   </>}
   {tab==='styles'&&<>
    <div className="collection-controls"><button aria-label={t("Colección anterior")} onClick={()=>setCollection(c=>(c+3)%4)}>‹</button><div><strong>{t(COLLECTIONS[collection])}</strong><span>{collection+1} / {COLLECTIONS.length}</span></div><button aria-label={t("Colección siguiente")} onClick={()=>setCollection(c=>(c+1)%4)}>›</button></div><div className="styles">{PRESETS.slice(collection*6,collection*6+6).map(p=>{
     const active=['font','fg','bg','pattern','effect','animation','backdrop','accent'].every(k=>state[k as keyof Poster]===p[k as keyof typeof p]);
     return <button key={p.name} className={`style-card${active?' active':''}`} aria-pressed={active} onClick={()=>{const{name,sample,...style}=p;patch(style);}}><div className={`swatch effect-${p.effect}`} style={{background:p.bg,color:p.fg,fontFamily:families[p.font],fontWeight:fontWeight(p.font)}}><svg className="style-backdrop" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><Backdrop state={{...state,...p,backdropMotion:false}} thumbnail width={300} height={160}/></svg>{t(p.sample).split('\n').map((line,i)=><span className="style-sample" key={i}>{line}</span>)}{active&&<span className="active-mark" aria-hidden="true">✓</span>}</div><span className="style-name">{t(p.name)}</span></button>;
    })}</div>
   </>}
   {tab==='design'&&<>
    <div className="tray-col"><div className="field-label"><label htmlFor="font">{t("Tipografía")}</label></div><FontPicker font={state.font} onChange={font=>patch({font})}/></div>
    <div className="tray-col"><div className="design-detail-row"><div><div className="field-label"><label htmlFor="foreground">{t("Color del texto")}</label></div><div className="color-input"><input id="foreground" type="color" value={state.fg} onChange={e=>patch({fg:e.target.value})}/><span>{state.fg.toUpperCase()}</span></div></div><div><div className="field-label"><label htmlFor="text-effect">{t("Efecto")}</label></div><select id="text-effect" disabled={usesParticles} value={state.effect} onChange={e=>patch({effect:e.target.value})}><option value="none">{t("Sin efecto")}</option><option value="shadow">{t("Sombra")}</option><option value="outline">{t("Contorno")}</option><option value="neon">{t("Neón")}</option><option value="echo">{t("Eco 3D")}</option></select></div></div>
    {usesParticles&&<p className="particle-hint">{t("Las partículas usan la silueta de la fuente y su propio halo de luz.")}</p>}</div>
    <div className="tray-col"><div className="field-label"><span>{t("Textura del fondo")}</span></div><div className="segmented" role="group" aria-label={t("Textura del fondo")}>{[['none',t("Lisa")],['dots',t("Puntos")],['grid',t("Cuadrícula")],['lines',t("Líneas")]].map(([id,label])=><button key={id} aria-pressed={state.pattern===id} className={state.pattern===id?'selected':''} onClick={()=>patch({pattern:id})}>{label}</button>)}</div></div>
   </>}
   {tab==='background'&&<>
    <div className="collection-controls background-collections"><button aria-label={t("Colección de fondos anterior")} onClick={()=>setBackgroundCollection(c=>(c+BACKDROP_COLLECTIONS.length-1)%BACKDROP_COLLECTIONS.length)}>‹</button><div aria-live="polite" aria-atomic="true"><strong>{t(BACKDROP_COLLECTIONS[backgroundCollection].name)}</strong><span>{backgroundCollection+1} / {BACKDROP_COLLECTIONS.length}</span></div><button aria-label={t("Colección de fondos siguiente")} onClick={()=>setBackgroundCollection(c=>(c+1)%BACKDROP_COLLECTIONS.length)}>›</button></div>
    <div className="backdrop-options" role="group" aria-label={t("Fondo del mensaje")}>{BACKDROP_COLLECTIONS[backgroundCollection].ids.map(id=>BACKDROPS.find(b=>b.id===id)!).map(b=><button key={b.id} className={`backdrop-choice${state.backdrop===b.id?' selected':''}`} aria-pressed={state.backdrop===b.id} onClick={()=>patch({backdrop:b.id})}><svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><Backdrop state={{...state,backdrop:b.id,backdropMotion:false}} thumbnail width={120} height={60}/></svg><span>{t(b.name)}</span></button>)}</div>
    <div className="tray-row"><div className="colors">{[['bg',t("Base")],['accent',t("Acento")]].map(([id,label])=><label key={id}><span>{label}</span><div className="color-input"><input type="color" aria-label={t(id==='bg'?'Color base del fondo':'Color acento del fondo')} value={state[id as 'bg'|'accent']} onChange={e=>patch({[id]:e.target.value})}/><span>{state[id as 'bg'|'accent'].toUpperCase()}</span></div></label>)}</div>
    <label className="loop-control backdrop-toggle"><input type="checkbox" checked={state.backdropMotion} disabled={state.backdrop==='solid'} onChange={e=>patch({backdropMotion:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>{t("Animar el fondo")}</span></label></div>
   </>}
   {tab==='motion'&&<>
    <div className="motion-group segmented" role="group" aria-label={t("Tipo de animación")}>{[['letters',t("Letras")],['scene',t("Palabras")],['particles',t("Partículas")],['trailer',t("Tráiler ✦")]].map(([id,label])=><button key={id} aria-pressed={motionGroup===id} className={motionGroup===id?'selected':''} onClick={()=>{setMotionGroup(id);if(id==='trailer')patch({animation:'trailer',trailerGalaxy:isParticle(state.animation)?isGalaxy(state.animation):state.trailerGalaxy,trailerParticles:isParticle(state.animation)||state.trailerParticles,trailerMix:isParticle(state.animation)?false:state.trailerMix});else if(id==='particles')patch({animation:isParticle(state.animation)?state.animation:'particle-assemble'});else if(state.animation==='trailer'||isParticle(state.animation))patch({animation:id==='letters'?'letters':'cascade'});}}>{label}</button>)}</div>
    {motionGroup==='trailer'?<>
     <div className="trailer-style segmented" role="group" aria-label={t("Estilo del tráiler")}>{[['classic',t("Clásico")],['particles',t("Partículas ✦")],['galaxy','Galaxy 3D'],['mix',t("Mezcla ⤨")]].map(([id,label])=><button key={id} className={trailerStyle===id?'selected':''} aria-pressed={trailerStyle===id} onClick={()=>patch({trailerParticles:id==='particles',trailerGalaxy:id==='galaxy'||id==='mix'&&state.trailerGalaxy,trailerMix:id==='mix'})}>{label}</button>)}</div>
     {state.trailerMix&&<label className="loop-control"><input type="checkbox" checked={state.trailerGalaxy} onChange={e=>patch({trailerGalaxy:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>{t("Incluir Galaxy 3D")}</span></label>}
     {state.trailerMix&&<button className="trailer-shuffle" onClick={()=>patch({trailerSeed:(state.trailerSeed+1)>>>0})}>{t("⤨ Otra mezcla")}</button>}
     <div className="trailer-storyboard"><div className="trailer-storyboard-heading"><strong>{state.trailerMix?t("Un estreno imprevisible."):state.trailerGalaxy?t("Tu estreno en 3D."):state.trailerParticles?t("Un estreno de partículas."):t("Tu mini estreno.")}</strong><span>{t('{count} escenas',{count:trailer?.scenes.length??0})}</span></div>
      <div className="trailer-beats">{trailer?.scenes.map((scene,i)=><div key={i} className={scene.final?'trailer-final':''} title={scene.state.text}><span>{scene.final?'✦':String(i+1).padStart(2,'0')}{state.trailerParticles||state.trailerGalaxy||state.trailerMix?` · ${t(ANIMATIONS.find(a=>a.id===scene.state.animation)?.name)}`:''}</span><strong>{scene.final?t("Mensaje completo"):scene.state.text}</strong></div>)}</div>
      <p>{state.trailerMix?t("Letras y partículas al azar. El enlace conserva esta mezcla."):state.trailerGalaxy?t("De la galaxia a tu mensaje, escena a escena."):state.trailerParticles?t("Nube, espiral y explosión. Un cierre con todo tu mensaje."):t("Los saltos de línea marcan cada escena.")}</p>
     </div>
    </>:<div className="motion-options" role="group" aria-label={t("Animación del mensaje")}>{ANIMATIONS.filter(a=>motionType(a.id)===motionGroup).map(a=><button key={a.id} className={`motion-card demo-${a.id}${state.animation===a.id?' selected':''}`} aria-pressed={state.animation===a.id} title={t(a.description)} onClick={()=>patch({animation:a.id})}><span className="motion-demo" aria-hidden="true"><span>{a.mark}</span></span><span className="motion-name">{t(a.name)}</span>{state.animation===a.id&&<span className="motion-check" aria-hidden="true">✓</span>}</button>)}</div>}
    {(motionGroup==='particles'||motionGroup==='trailer'&&(state.trailerParticles||state.trailerGalaxy||state.trailerMix))&&<div className="particle-settings">
     {!usesGalaxy&&<><div className="field-label"><label htmlFor="particle-density">{t("Densidad")}</label><span>{[t("Ligera"),t("Equilibrada"),t("Intensa")][state.particleDensity-1]}</span></div>
     <input id="particle-density" type="range" min="1" max="3" step="1" value={state.particleDensity} onChange={e=>patch({particleDensity:+e.target.value})}/></>}
     <label className="loop-control"><input type="checkbox" checked={state.particleInteraction} onChange={e=>patch({particleInteraction:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>{usesGalaxy?t("Explorar con gestos"):t("Repulsión magnética")}</span></label>
     <p className="particle-hint">{usesGalaxy?t("Tras la revelación: arrastra para orbitar y toca para dispersar. Rueda o pellizco en «Ver en grande»."):t("Acerca el cursor. En móvil, toca el mensaje en «Ver en grande».")}</p>
    </div>}
    {usesGalaxy&&<div className="galaxy-settings"><label htmlFor="galaxy-quality">{t("Calidad 3D")}</label><select id="galaxy-quality" value={state.galaxyQuality} onChange={e=>patch({galaxyQuality:e.target.value})}><option value="auto">{t("Automática")}</option><option value="low">{t("Ligera")}</option><option value="high">{t("Alta")}</option></select><label className="loop-control"><input type="checkbox" checked={state.galaxyCamera} onChange={e=>patch({galaxyCamera:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>{t("Cámara cinematográfica")}</span></label></div>}
    {motionGroup!=='trailer'&&<p className="motion-description">{t(ANIMATIONS.find(a=>a.id===state.animation)?.description)}</p>}<div className="motion-settings"><div className="pace-control"><span id="pace-label">{t("Ritmo")}</span><div className="segmented" role="group" aria-labelledby="pace-label">{[['slow',t("Pausado")],['normal',t("Normal")],['fast',t("Rápido")]].map(([id,label])=><button key={id} disabled={state.animation==='none'} aria-pressed={state.pace===id} className={state.pace===id?'selected':''} onClick={()=>patch({pace:id})}>{label}</button>)}</div></div><label className="loop-control"><input type="checkbox" checked={state.repeat} disabled={state.animation==='none'} onChange={e=>patch({repeat:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>{t("En bucle")}</span></label></div>
   </>}
  </div>
 </aside>;
}
