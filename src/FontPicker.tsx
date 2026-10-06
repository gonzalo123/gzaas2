import {useEffect,useRef,useState} from 'react';
import {FONTS} from './state.mjs';
import {families,fontWeight} from './render';

export function FontPicker({font,onChange}:{font:string;onChange:(font:string)=>void}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
 const selected=FONTS.find(f=>f.id===font)!;
 useEffect(()=>{if(open){dialog.current?.showModal();dialog.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();}else dialog.current?.close();},[open]);
 return <>
  <button id="font" className="font-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span style={{fontFamily:families[font],fontWeight:fontWeight(font)}}>{selected.name}</span><small>{selected.mood}</small><span aria-hidden="true">⌄</span></button>
  <dialog ref={dialog} className="font-dialog" aria-labelledby="font-dialog-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current)setOpen(false);}}><div className="font-dialog-heading"><div><h2 id="font-dialog-title">Elige la voz de tu mensaje.</h2><p>Doce fuentes. Mucho carácter.</p></div><button className="icon-button" aria-label="Cerrar tipografías" onClick={()=>setOpen(false)}>✕</button></div><div className="font-options" role="group" aria-label="Tipografías">{FONTS.map(f=><button key={f.id} className="font-option" aria-pressed={font===f.id} onClick={()=>{onChange(f.id);setOpen(false);}}><span className="font-sample" style={{fontFamily:families[f.id],fontWeight:f.weight}}>Gzaas!</span><span className="font-option-label">{f.name}<small>{f.mood}</small></span></button>)}</div></dialog>
 </>;
}
