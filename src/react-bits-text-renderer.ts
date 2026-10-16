/**
 * Text Type, Decrypted Text, Shuffle, Glitch Text, True Focus, Fold Text,
 * Echo Text and Stroke Text adapted from React Bits by David Haz.
 * MIT + Commons Clause: /licenses/react-bits.txt
 * Canvas choreography replaces DOM interaction with deterministic playback.
 */
import {families,layoutText,paintTextUnit,type Poster} from './render';
import {textPlayback,textNoise} from './text-motion.mjs';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
const finishes:Record<string,number>={'rb-type':3400,'rb-decrypt':2900,'rb-shuffle':2600,'rb-glitch':2400,'rb-focus':4600,'rb-fold':2900,'rb-echo':2600,'rb-stroke':3600};

export function createTextRenderer(state:Poster,width:number,height:number,duration?:number){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Text canvas unavailable');
 const geometry=layoutText(ctx,state,width,height),size=geometry.fontSize;
 const lines=geometry.lines.map(line=>{
  const w=ctx.measureText(line.text).width;
  return {...line,width:w,left:state.align==='left'?line.x:state.align==='right'?line.x-w:line.x-w/2};
 });
 const letters=lines.flatMap((line,row)=>line.letters.map(letter=>({...letter,y:line.y,row,width:ctx.measureText(letter.text).width})));
 const words=lines.flatMap(line=>line.words.map(word=>({...word,y:line.y,width:ctx.measureText(word.text).width})));
 const segments=lines.map(line=>Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(line.text),m=>m.segment));
 const count=segments.reduce((n,l)=>n+l.length,0);
 const plain=(target:CanvasRenderingContext2D=ctx)=>{for(const line of lines)paintTextUnit(target,state,size,line.text,line.x,line.y,state.align as CanvasTextAlign);};
 const unit=(text:string,x:number,y:number,s:Poster=state)=>paintTextUnit(ctx,s,size,text,x,y,'left');
 const raster=state.animation==='rb-glitch';
 const cached=document.createElement('canvas');cached.width=raster?width:1;cached.height=raster?height:1;
 const cachedCtx=cached.getContext('2d')!;if(raster)plain(cachedCtx);
 const tint=document.createElement('canvas');tint.width=cached.width;tint.height=cached.height;
 const tintCtx=tint.getContext('2d')!;tintCtx.drawImage(cached,0,0);tintCtx.globalCompositeOperation='source-in';tintCtx.fillStyle=state.accent;tintCtx.fillRect(0,0,width,height);
 return {
  canvas,
  paintTo(target:CanvasRenderingContext2D,elapsed:number,reduced=false){
   const pose=textPlayback(elapsed,state.pace,state.repeat,duration,reduced);
   // Draw the reading hold directly: compositing a transparent raster can
   // round antialiased edge pixels differently from the native PNG drawing.
   if(pose.time>=finishes[state.animation]||reduced){target.save();target.globalAlpha*=pose.opacity;plain(target);target.restore();}
   else{this.draw(elapsed,reduced);target.drawImage(canvas,0,0);}
  },
  draw(elapsed:number,reduced=false){
   ctx.clearRect(0,0,width,height);
   const {time,opacity}=textPlayback(elapsed,state.pace,state.repeat,duration,reduced);
   ctx.save();ctx.globalAlpha=opacity;
   if(time>=finishes[state.animation]||reduced){plain();ctx.restore();return;}
   if(state.animation==='rb-type'){
    let remaining=Math.floor(clamp(time/2900)*count),cursor:{x:number;y:number}|undefined;
    lines.forEach((line,i)=>{
     const visible=Math.min(remaining,segments[i].length),text=segments[i].slice(0,visible).join('');
     if(text)unit(text,line.left,line.y);
     if(remaining>=0&&remaining<=segments[i].length)cursor={x:line.left+ctx.measureText(text).width,y:line.y};
     remaining-=segments[i].length;
    });
    if(cursor&&Math.floor(time/340)%2===0){ctx.fillStyle=state.fg;ctx.fillRect(cursor.x+size*.04,cursor.y-size*.78,Math.max(2,size*.025),size*.88);}
   }else if(state.animation==='rb-decrypt'){
    const progress=clamp((time-120)/2300),pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';
    letters.forEach((letter,i)=>{
     const revealed=progress>=(i+1)/Math.max(1,letters.length);
     const text=revealed?letter.text:pool[Math.floor(textNoise(i,Math.floor(time/65))*pool.length)];
     ctx.save();ctx.globalAlpha*=revealed?1:.5;
     const fit=Math.min(1,letter.width/Math.max(1,ctx.measureText(text).width));
     ctx.translate(letter.x,letter.y);ctx.scale(fit,1);unit(text,0,0);ctx.restore();
    });
   }else if(state.animation==='rb-shuffle'){
    letters.forEach((letter,i)=>{
     const p=ease((time-i/Math.max(1,letters.length)*550)/1700);
     const row=lines[letter.row],origin=row.left+textNoise(i)*Math.max(0,row.width-letter.width);
     ctx.save();ctx.globalAlpha*=clamp(p*3);ctx.translate(origin+(letter.x-origin)*p,letter.y+(1-p)*(textNoise(i,8)-.5)*size*1.4);
     ctx.rotate((1-p)*(textNoise(i,3)-.5)*.6);unit(letter.text,0,0);ctx.restore();
    });
   }else if(state.animation==='rb-glitch'){
    const strength=(1-clamp(time/2200))**2,step=Math.floor(time/85);
    ctx.drawImage(cached,0,0);
    for(let i=0;i<12;i++){
     const y=textNoise(i,step)*height,h=height*(.012+textNoise(i,step+1)*.08),dx=(textNoise(i,step+2)-.5)*size*.6*strength;
     ctx.save();ctx.beginPath();ctx.rect(0,y,width,h);ctx.clip();ctx.clearRect(0,y,width,h);
     ctx.globalAlpha*=.7;ctx.drawImage(tint,dx-size*.045*strength,0);ctx.globalAlpha=opacity;ctx.drawImage(cached,dx+size*.035*strength,0);ctx.restore();
    }
   }else if(state.animation==='rb-focus'){
    const progress=clamp(time/3700)*Math.max(1,words.length),active=Math.min(words.length-1,Math.floor(progress));
    const release=ease((time-3700)/800);
    words.forEach((word,i)=>{
     ctx.save();if(i!==active){ctx.globalAlpha*=.28+.72*release;ctx.filter=`blur(${size*.045*(1-release)}px)`;}unit(word.text,word.x,word.y);ctx.restore();
    });
    if(words.length){
     const word=words[active],previous=words[Math.max(0,active-1)],p=ease((progress%1)*4);
     const x=previous.x+(word.x-previous.x)*p-size*.07,y=previous.y+(word.y-previous.y)*p-size*.85,w=previous.width+(word.width-previous.width)*p+size*.14,h=size;
     ctx.save();ctx.globalAlpha*=1-release;ctx.strokeStyle=state.fg;ctx.lineWidth=Math.max(1.5,size*.018);
     const corner=size*.12;ctx.beginPath();for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){ctx.moveTo(cx,cy+sy*corner);ctx.lineTo(cx,cy);ctx.lineTo(cx+sx*corner,cy);}ctx.stroke();ctx.restore();
    }
   }else if(state.animation==='rb-fold'){
    lines.forEach((line,i)=>{
     const p=ease((time-i/Math.max(1,lines.length)*650)/1900),hinge=line.y-size*.38;
     for(const half of [-1,1]){
      ctx.save();ctx.translate(line.x,hinge);ctx.transform(1,0,half*(1-p)*.14,Math.max(.02,Math.sin(p*Math.PI/2)),0,0);ctx.translate(-line.x,-hinge);
      ctx.beginPath();ctx.rect(0,half<0?hinge-size:hinge,width,size);ctx.clip();ctx.globalAlpha*=(.2+.8*p)*(half<0?1:.75+.25*p);plainLine(line);ctx.restore();
     }
    });
   }else if(state.animation==='rb-echo'){
    for(let layer=5;layer>=0;layer--){
     const p=ease((time-layer*95)/1700),distance=(1-p)*size;
     ctx.save();ctx.globalAlpha*=layer===0?clamp(time/450):.12*(1-clamp((time-1300)/1100));
     ctx.translate(distance*(layer*.17+.3),-distance*(layer*.12+.2));
     for(const line of lines)paintTextUnit(ctx,layer?{...state,fg:state.accent,effect:'none'}:state,size,line.text,line.x,line.y,state.align as CanvasTextAlign);
     ctx.restore();
    }
   }else if(state.animation==='rb-stroke'){
    const p=clamp(time/2450),fill=ease((time-2300)/1050);
    ctx.save();ctx.font=`${geometry.weight} ${size}px ${families[state.font]}`;ctx.textAlign=state.align as CanvasTextAlign;ctx.strokeStyle=state.fg;ctx.lineWidth=Math.max(1,size*.012);ctx.lineJoin='round';
    // Canvas and upstream SVG text both dash each glyph outline before filling.
    const length=size*5;ctx.setLineDash([length*p,length*(1-p)+.001]);ctx.lineDashOffset=length*(1-p);
    ctx.globalAlpha*=1-fill;for(const line of lines)ctx.strokeText(line.text,line.x,line.y);ctx.restore();
    ctx.save();ctx.globalAlpha*=fill;plain();ctx.restore();
   }
   ctx.restore();
  },
  dispose(){canvas.width=canvas.height=cached.width=cached.height=tint.width=tint.height=0;}
 };
 function plainLine(line:typeof lines[number]){paintTextUnit(ctx!,state,size,line.text,line.x,line.y,state.align as CanvasTextAlign);}
}
