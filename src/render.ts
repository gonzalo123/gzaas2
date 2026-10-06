import {FONTS} from './state.mjs';
import {paintBackdrop} from './background';
export type Poster = {v:number;text:string;font:string;fg:string;bg:string;pattern:string;effect:string;align:string;size:number;animation:string;pace:string;repeat:boolean;backdrop:string;accent:string;backdropMotion:boolean};
export const families:Record<string,string> = Object.fromEntries(FONTS.map(f=>[f.id,`"${f.family}", ${f.id==='serif'||f.id==='abril'?'serif':'sans-serif'}`]));
export const fontWeight = (font:string) => FONTS.find(f=>f.id===font)?.weight??400;
const weight = (s:Poster) => fontWeight(s.font);
const graphemes = (t:string):string[] => Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(t),s=>s.segment);
function wrap(ctx:CanvasRenderingContext2D, text:string, width:number) {
 const result:string[]=[];
 for(const paragraph of text.split('\n')){
  if(!paragraph){result.push('');continue;}
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const candidate=line ? line+' '+word : word;
   if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
   if(line){result.push(line);line='';}
   if(ctx.measureText(word).width<=width){line=word;continue;}
   for(const char of graphemes(word)){
    if(line && ctx.measureText(line+char).width>width){result.push(line);line='';}
    line+=char;
   }
  }
  result.push(line);
 }
 return result;
}
export function layoutText(ctx:CanvasRenderingContext2D,s:Poster,width:number,height:number){
 const unit=Math.min(width,height);
 const pad=unit*.085,maxWidth=width-2*pad,maxHeight=height-2*pad;
 let lo=1,hi=height,lines:string[]=[];
 const lineFactor=s.font==='bebas' ? .96 : s.font==='pacifico'?1.3:1.12;
 for(let i=0;i<16;i++){
  const n=(lo+hi)/2;ctx.font=`${weight(s)} ${n}px ${families[s.font]}`;
  const ls=wrap(ctx,s.text,maxWidth);
  const metrics=ctx.measureText('ÁHg');
  const ascent=metrics.fontBoundingBoxAscent||metrics.actualBoundingBoxAscent||n*.8,descent=metrics.fontBoundingBoxDescent||metrics.actualBoundingBoxDescent||n*.2;
  if((ls.length-1)*n*lineFactor+ascent+descent<=maxHeight && ls.every(l=>{const m=ctx.measureText(l);return Math.max(m.width,m.actualBoundingBoxLeft+m.actualBoundingBoxRight)<=maxWidth;})){lo=n;}else hi=n;
 }
 const fontSize=lo*s.size/100;
 ctx.font=`${weight(s)} ${fontSize}px ${families[s.font]}`;
 lines=wrap(ctx,s.text,maxWidth);
 const metrics=ctx.measureText('ÁHg');
 const ascent=metrics.fontBoundingBoxAscent||metrics.actualBoundingBoxAscent||fontSize*.8,descent=metrics.fontBoundingBoxDescent||metrics.actualBoundingBoxDescent||fontSize*.2;
 const lineHeight=fontSize*lineFactor;
 const y=(height-((lines.length-1)*lineHeight+ascent+descent))/2+ascent;
 const x=s.align==='left'?pad:s.align==='right'?width-pad:width/2;
 return {fontSize,lineHeight,weight:weight(s),lines:lines.map((text,i)=>{
  const lineWidth=ctx.measureText(text).width;
  const left=s.align==='left'?x:s.align==='right'?x-lineWidth:x-lineWidth/2;
  return {text,x,y:y+i*lineHeight,words:Array.from(text.matchAll(/\S+/gu),m=>({text:m[0],x:left+ctx.measureText(text.slice(0,m.index)).width})),letters:Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text),m=>({text:m.segment,x:left+ctx.measureText(text.slice(0,m.index)).width})).filter(c=>c.text.trim())};
 })};
}
export function paint(canvas:HTMLCanvasElement,s:Poster,width:number,height:number){
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 paintBackdrop(ctx,s,width,height);
 const unit=Math.min(width,height);
 ctx.save();ctx.globalAlpha=.13;ctx.fillStyle=s.fg;ctx.strokeStyle=s.fg;ctx.lineWidth=Math.max(1,unit/900);
 const step=unit/18;
 if(s.pattern==='dots')for(let x=step/2;x<width;x+=step)for(let y=step/2;y<height;y+=step){ctx.beginPath();ctx.arc(x,y,Math.max(1,unit/600),0,Math.PI*2);ctx.fill();}
 if(s.pattern==='grid'||s.pattern==='lines'){ctx.beginPath();for(let y=0;y<height;y+=step*1.5){ctx.moveTo(0,y);ctx.lineTo(width,y);}if(s.pattern==='grid')for(let x=0;x<width;x+=step*1.5){ctx.moveTo(x,0);ctx.lineTo(x,height);}ctx.stroke();}
 ctx.restore();
 const {fontSize,lines}=layoutText(ctx,s,width,height);
 ctx.textAlign=s.align as CanvasTextAlign;ctx.textBaseline='alphabetic';ctx.fillStyle=s.fg;ctx.strokeStyle=s.fg;
 if(s.effect==='shadow'){ctx.shadowColor=s.fg+'55';ctx.shadowOffsetX=fontSize*.035;ctx.shadowOffsetY=fontSize*.045;}
 if(s.effect==='neon'){ctx.shadowColor=s.fg;ctx.shadowBlur=fontSize*.08;}
 ctx.lineWidth=Math.max(1,fontSize*.014);
 for(const line of lines){if(s.effect==='outline')ctx.strokeText(line.text,line.x,line.y);else{if(s.effect==='echo'){ctx.fillStyle=s.accent;for(let i=3;i>0;i--)ctx.fillText(line.text,line.x+i*fontSize*.022,line.y+i*fontSize*.022);ctx.fillStyle=s.fg;}ctx.fillText(line.text,line.x,line.y);}}
}
export async function waitFonts(s:Poster){await document.fonts.load(`${weight(s)} 24px ${families[s.font]}`);await document.fonts.ready;}
