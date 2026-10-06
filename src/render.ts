export type Poster = {v:number;text:string;font:string;fg:string;bg:string;pattern:string;effect:string;align:string;size:number;animation:string};
export const families:Record<string,string> = {bebas:'"Bebas Neue", sans-serif',serif:'"DM Serif Display", serif',sans:'"DM Sans", sans-serif'};
const weight = (s:Poster) => s.font==='sans' ? 800 : 400;
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
export function paint(canvas:HTMLCanvasElement,s:Poster,width:number,height:number){
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle=s.bg;ctx.fillRect(0,0,width,height);
 const unit=Math.min(width,height);
 ctx.save();ctx.globalAlpha=.13;ctx.fillStyle=s.fg;ctx.strokeStyle=s.fg;ctx.lineWidth=Math.max(1,unit/900);
 const step=unit/18;
 if(s.pattern==='dots')for(let x=step/2;x<width;x+=step)for(let y=step/2;y<height;y+=step){ctx.beginPath();ctx.arc(x,y,Math.max(1,unit/600),0,Math.PI*2);ctx.fill();}
 if(s.pattern==='grid'||s.pattern==='lines'){ctx.beginPath();for(let y=0;y<height;y+=step*1.5){ctx.moveTo(0,y);ctx.lineTo(width,y);}if(s.pattern==='grid')for(let x=0;x<width;x+=step*1.5){ctx.moveTo(x,0);ctx.lineTo(x,height);}ctx.stroke();}
 ctx.restore();
 const pad=unit*.085,maxWidth=width-2*pad,maxHeight=height-2*pad;
 let lo=1,hi=height,lines:string[]=[];
 const lineFactor=s.font==='bebas' ? .96 : 1.12;
 for(let i=0;i<16;i++){
  const n=(lo+hi)/2;ctx.font=`${weight(s)} ${n}px ${families[s.font]}`;
  const ls=wrap(ctx,s.text,maxWidth);
  if(ls.length*n*lineFactor<=maxHeight && ls.every(l=>ctx.measureText(l).width<=maxWidth)){lo=n;}else hi=n;
 }
 const fontSize=lo*s.size/100;
 ctx.font=`${weight(s)} ${fontSize}px ${families[s.font]}`;
 lines=wrap(ctx,s.text,maxWidth);
 ctx.textAlign=s.align as CanvasTextAlign;ctx.textBaseline='alphabetic';ctx.fillStyle=s.fg;ctx.strokeStyle=s.fg;
 const metrics=ctx.measureText('ÁHg');
 const ascent=metrics.actualBoundingBoxAscent||fontSize*.8,descent=metrics.actualBoundingBoxDescent||fontSize*.2;
 const lineHeight=fontSize*lineFactor;
 let y=(height-((lines.length-1)*lineHeight+ascent+descent))/2+ascent;
 const x=s.align==='left'?pad:s.align==='right'?width-pad:width/2;
 if(s.effect==='shadow'){ctx.shadowColor=s.fg+'55';ctx.shadowOffsetX=fontSize*.035;ctx.shadowOffsetY=fontSize*.045;}
 ctx.lineWidth=Math.max(1,fontSize*.014);
 for(const line of lines){if(s.effect==='outline')ctx.strokeText(line,x,y);else ctx.fillText(line,x,y);y+=lineHeight;}
}
export async function waitFonts(s:Poster){await document.fonts.load(`${weight(s)} 24px ${families[s.font]}`);await document.fonts.ready;}
