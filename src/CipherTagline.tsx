import {useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {CIPHER_ALPHABET,CIPHER_DELAY,CIPHER_DURATION,cipherFrame} from './cipher.mjs';

type Slot={left:number;width:number};
export function CipherTagline({tagline}:{tagline:string}){
 const ref=useRef<HTMLParagraphElement>(null);
 const words=useMemo(()=>{
  let index=0;
  return Array.from(tagline.matchAll(/\S+/gu),m=>({text:m[0],letters:Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(m[0]),s=>({text:s.segment,start:s.index,index:index++}))}));
 },[tagline]);
 const letters=useMemo(()=>words.flatMap(word=>word.letters.map(letter=>letter.text)),[words]);
 const [elapsed,setElapsed]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches?CIPHER_DELAY+CIPHER_DURATION:0);
 const [geometry,setGeometry]=useState<{slots:Slot[];widths:Record<string,number>}>();
 const frame=cipherFrame(letters,elapsed);
 useLayoutEffect(()=>{
  const root=ref.current;if(!root)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let alive=true,complete=false,timer:ReturnType<typeof setTimeout>|undefined;
  const finish=()=>{if(!alive)return;complete=true;clearTimeout(timer);setElapsed(CIPHER_DELAY+CIPHER_DURATION);};
  const preference=()=>{if(media.matches)finish();};
  const measure=()=>{
   if(!alive||complete)return;
   const sources=root.querySelectorAll<HTMLElement>('.landing-cipher-source'),slots:Slot[]=[];
   const ctx=document.createElement('canvas').getContext('2d');if(!ctx){finish();return;}
   ctx.font=getComputedStyle(root).font;
   const widths=Object.fromEntries(Array.from(new Set([...letters,...CIPHER_ALPHABET,...CIPHER_ALPHABET.toUpperCase()]),char=>[char,ctx.measureText(char).width]));
   sources.forEach((source,i)=>{
    const node=source.firstChild;if(!node)return;
    const left=source.getBoundingClientRect().left,range=document.createRange();
    for(const letter of words[i].letters){
     range.setStart(node,letter.start);range.setEnd(node,letter.start+letter.text.length);
     const bounds=range.getBoundingClientRect();slots.push({left:bounds.left-left,width:bounds.width});
    }
   });
   setGeometry({slots,widths});
  };
  const observer=new ResizeObserver(measure);observer.observe(root);
  media.addEventListener('change',preference);
  if(media.matches)finish();
  else void document.fonts.load('400 30px "DM Serif Display"').then(()=>{
   if(!alive||complete)return;measure();
   const start=performance.now();
   const tick=()=>{
    if(!alive||complete)return;
    const time=performance.now()-start;
    if(time>=CIPHER_DELAY+CIPHER_DURATION){finish();return;}
    setElapsed(time);timer=setTimeout(tick,40);
   };
   tick();
  },finish);
  return()=>{alive=false;clearTimeout(timer);observer.disconnect();media.removeEventListener('change',preference);};
 },[words,letters]);
 return <p ref={ref} className="landing-tagline" data-complete={frame.complete}>
  <span className="sr-only">{tagline}</span>
  <span aria-hidden="true">{words.map((word,w)=><span key={w}>
   <span className="landing-cipher-word">
    <span className="landing-cipher-source">{word.text}</span>
    {!frame.complete&&geometry&&word.letters.map(letter=>{
     const slot=geometry.slots[letter.index],pose=frame.glyphs[letter.index];if(!slot)return null;
     const width=geometry.widths[pose.text]||slot.width,fit=pose.decoded?1:Math.min(1,slot.width/Math.max(1,width));
     const style={left:slot.left,width:slot.width,'--cipher-opacity':pose.opacity} as CSSProperties;
     return <span key={letter.index} className="landing-cipher-glyph" data-decoded={pose.decoded} style={style}><span style={{left:pose.decoded?0:Math.max(0,(slot.width-width*fit)/2),transform:`scaleX(${fit})`}}>{pose.text}</span></span>;
    })}
   </span>{w<words.length-1?' ':null}
  </span>)}</span>
 </p>;
}
