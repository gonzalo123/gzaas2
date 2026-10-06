import {useEffect,useState,type KeyboardEvent} from 'react';
import {ANIMATIONS,BACKDROPS,COLLECTIONS,MAX_TEXT,PRESETS} from './state.mjs';
import {families,fontWeight,type Poster} from './render';
import {FontPicker} from './FontPicker';
import {Backdrop} from './Backdrop';
import {trailerBeats} from './trailer.mjs';

const motionType=(animation:string)=>animation==='trailer'?'trailer':['letters','wave','bounce','orbit'].includes(animation)?'letters':'scene';

export const EDITOR_TABS = [{id:'message',label:'Texto'},{id:'styles',label:'Estilos'},{id:'design',label:'Diseño'},{id:'background',label:'Fondos'},{id:'motion',label:'Movimiento'}] as const;
export type EditorTab = typeof EDITOR_TABS[number]['id'];

export function EditorPanel({state,patch,tab,onTab}:{state:Poster;patch:(p:Partial<Poster>)=>void;tab:EditorTab;onTab:(tab:EditorTab)=>void}){
 const [collection,setCollection]=useState(0),[motionGroup,setMotionGroup]=useState(motionType(state.animation));
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
 return <aside className="editor" aria-label="Editar mensaje">
  <div className="editor-tabs" role="tablist" aria-label="Opciones del mensaje">{EDITOR_TABS.map((t,i)=><button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={tab===t.id} aria-controls="editor-panel" tabIndex={tab===t.id?0:-1} onClick={()=>onTab(t.id)} onKeyDown={e=>navigate(e,i)}>{t.label}</button>)}</div>
  <div key={tab} className={`editor-panel panel-${tab}`} id="editor-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
   {tab==='message'&&<>
    <div className="field-label"><label htmlFor="message">Tu mensaje</label><span>{[...state.text].length}/{MAX_TEXT}</span></div>
    <textarea id="message" value={state.text} placeholder="Eso que quieres decir…" onChange={e=>patch({text:[...e.target.value].slice(0,MAX_TEXT).join('')})} spellCheck={false}/>
    {state.text.split('\n').length>12&&<p className="field-error" role="alert">Usa como máximo 12 líneas.</p>}
    <div className="field-label"><label htmlFor="size">Intensidad</label><span>{state.size}%</span></div><input id="size" type="range" min="40" max="100" value={state.size} onChange={e=>patch({size:+e.target.value})}/>
    <div className="field-label"><span>Alineación</span></div><div className="text-alignment" role="group" aria-label="Alineación">{[['left','Izquierda'],['center','Centro'],['right','Derecha']].map(([id,label])=><button key={id} aria-pressed={state.align===id} className={state.align===id?'selected':''} onClick={()=>patch({align:id})}>{label}</button>)}</div>
    <p className="panel-hint">Pocas palabras. Mucha actitud.</p>
   </>}
   {tab==='styles'&&<>
    <div className="collection-controls"><button aria-label="Colección anterior" onClick={()=>setCollection(c=>(c+3)%4)}>‹</button><div><strong>{COLLECTIONS[collection]}</strong><span>{collection+1} / {COLLECTIONS.length}</span></div><button aria-label="Colección siguiente" onClick={()=>setCollection(c=>(c+1)%4)}>›</button></div><div className="styles">{PRESETS.slice(collection*6,collection*6+6).map(p=>{
     const active=['font','fg','bg','pattern','effect','animation','backdrop','accent'].every(k=>state[k as keyof Poster]===p[k as keyof typeof p]);
     return <button key={p.name} className={`style-card${active?' active':''}`} aria-pressed={active} onClick={()=>{const{name,sample,...style}=p;patch(style);}}><div className={`swatch effect-${p.effect}`} style={{background:p.bg,color:p.fg,fontFamily:families[p.font],fontWeight:fontWeight(p.font)}}><svg className="style-backdrop" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><Backdrop state={{...state,...p,backdropMotion:false}} width={300} height={160}/></svg>{p.sample.split('\n').map((line,i)=><span className="style-sample" key={i}>{line}</span>)}{active&&<span className="active-mark" aria-hidden="true">✓</span>}</div><span className="style-name">{p.name}</span></button>;
    })}</div>
   </>}
   {tab==='design'&&<>
    <div className="field-label"><label htmlFor="font">Tipografía</label></div><FontPicker font={state.font} onChange={font=>patch({font})}/>
    <div className="design-detail-row"><div><div className="field-label"><label htmlFor="foreground">Color del texto</label></div><div className="color-input"><input id="foreground" type="color" value={state.fg} onChange={e=>patch({fg:e.target.value})}/><span>{state.fg.toUpperCase()}</span></div></div><div><div className="field-label"><label htmlFor="text-effect">Efecto</label></div><select id="text-effect" value={state.effect} onChange={e=>patch({effect:e.target.value})}><option value="none">Sin efecto</option><option value="shadow">Sombra</option><option value="outline">Contorno</option><option value="neon">Neón</option><option value="echo">Eco 3D</option></select></div></div>
    <div className="field-label"><span>Textura del fondo</span></div><div className="segmented" role="group" aria-label="Textura del fondo">{[['none','Lisa'],['dots','Puntos'],['grid','Cuadrícula'],['lines','Líneas']].map(([id,label])=><button key={id} aria-pressed={state.pattern===id} className={state.pattern===id?'selected':''} onClick={()=>patch({pattern:id})}>{label}</button>)}</div>
   </>}
   {tab==='background'&&<>
    <div className="backdrop-options" role="group" aria-label="Fondo del mensaje">{BACKDROPS.map(b=><button key={b.id} className={`backdrop-choice${state.backdrop===b.id?' selected':''}`} aria-pressed={state.backdrop===b.id} onClick={()=>patch({backdrop:b.id})}><svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><Backdrop state={{...state,backdrop:b.id,backdropMotion:false}} width={120} height={60}/></svg><span>{b.name}</span></button>)}</div>
    <div className="colors">{[['bg','Base'],['accent','Acento']].map(([id,label])=><label key={id}><span>{label}</span><div className="color-input"><input type="color" aria-label={`Color ${label.toLowerCase()} del fondo`} value={state[id as 'bg'|'accent']} onChange={e=>patch({[id]:e.target.value})}/><span>{state[id as 'bg'|'accent'].toUpperCase()}</span></div></label>)}</div>
    <label className="loop-control backdrop-toggle"><input type="checkbox" checked={state.backdropMotion} disabled={state.backdrop==='solid'} onChange={e=>patch({backdropMotion:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>Animar el fondo</span></label>
   </>}
   {tab==='motion'&&<>
    <div className="motion-group segmented" role="group" aria-label="Tipo de animación">{[['letters','Letras'],['scene','Palabras'],['trailer','Tráiler ✦']].map(([id,label])=><button key={id} aria-pressed={motionGroup===id} className={motionGroup===id?'selected':''} onClick={()=>{setMotionGroup(id);if(id==='trailer')patch({animation:'trailer'});else if(state.animation==='trailer')patch({animation:id==='letters'?'letters':'cascade'});}}>{label}</button>)}</div>
    {motionGroup==='trailer'?<div className="trailer-storyboard"><div className="trailer-storyboard-heading"><strong>Tu mini estreno.</strong><span>{trailerBeats(state.text).length+1} escenas</span></div><div className="trailer-beats">{trailerBeats(state.text).map((text,i)=><div key={i} title={text}><span>{String(i+1).padStart(2,'0')}</span><strong>{text}</strong></div>)}<div className="trailer-final"><span>✦</span><strong>Mensaje completo</strong></div></div><p>Los saltos de línea marcan cada escena.</p></div>:<div className="motion-options" role="group" aria-label="Animación del mensaje">{ANIMATIONS.filter(a=>motionType(a.id)===motionGroup).map(a=><button key={a.id} className={`motion-card demo-${a.id}${state.animation===a.id?' selected':''}`} aria-pressed={state.animation===a.id} title={a.description} onClick={()=>patch({animation:a.id})}><span className="motion-demo" aria-hidden="true"><span>{a.mark}</span></span><span className="motion-name">{a.name}</span>{state.animation===a.id&&<span className="motion-check" aria-hidden="true">✓</span>}</button>)}</div>}
    {motionGroup!=='trailer'&&<p className="motion-description">{ANIMATIONS.find(a=>a.id===state.animation)?.description}</p>}<div className="motion-settings"><div className="pace-control"><span id="pace-label">Ritmo</span><div className="segmented" role="group" aria-labelledby="pace-label">{[['slow','Pausado'],['normal','Normal'],['fast','Rápido']].map(([id,label])=><button key={id} disabled={state.animation==='none'} aria-pressed={state.pace===id} className={state.pace===id?'selected':''} onClick={()=>patch({pace:id})}>{label}</button>)}</div></div><label className="loop-control"><input type="checkbox" checked={state.repeat} disabled={state.animation==='none'} onChange={e=>patch({repeat:e.target.checked})}/><span className="toggle" aria-hidden="true"/><span>En bucle</span></label></div>
   </>}
  </div>
  <div className="editor-summary"><span style={{background:state.bg,color:state.fg}} aria-hidden="true">Aa</span><p>{PRESETS.find(p=>['font','fg','bg','pattern','effect'].every(k=>state[k as keyof Poster]===p[k as keyof typeof p]))?.name??'Tu propio estilo'}<small>{ANIMATIONS.find(a=>a.id===state.animation)?.name} · {state.repeat?'En bucle':'Una vez'}</small></p></div>
 </aside>;
}
