/**
 * Text Type, Decrypted Text, Shuffle, Glitch Text, True Focus, Fold Text,
 * Echo Text, Stroke Text, Shiny Text, Gradient Text, Split Flap Text, Depth Text,
 * Tech Text, Fuzzy Text, Falling Text and Rotating Text adapted from React Bits by David Haz.
 * MIT + Commons Clause: /licenses/react-bits.txt
 * Canvas choreography replaces DOM interaction with deterministic playback.
 */
import {families,layoutText,paintTextUnit,type Poster} from './render';
import {textPlayback,textNoise} from './text-motion.mjs';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
const finishes:Record<string,number>={'rb-type':3400,'rb-decrypt':2900,'rb-shuffle':2600,'rb-glitch':2400,'rb-focus':4600,'rb-fold':2900,'rb-echo':2600,'rb-stroke':3600,'rb-shiny':3300,'rb-gradient':3800,'rb-flap':3300,'rb-depth':3600,'rb-tech':3500,'rb-fuzzy':2800,'rb-falling':3600,'rb-rotate':3100};

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
 const raster=['rb-glitch','rb-shiny','rb-gradient','rb-fuzzy'].includes(state.animation);
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
   if(state.animation==='rb-shiny'||state.animation==='rb-gradient'){
    const progress=clamp(time/3300),release=clamp((time-2800)/900);
    plain();tintCtx.clearRect(0,0,width,height);tintCtx.globalCompositeOperation='source-over';tintCtx.drawImage(cached,0,0);tintCtx.globalCompositeOperation='source-in';
    if(state.animation==='rb-shiny'){
     const x=width*(-.45+progress*1.9),g=tintCtx.createLinearGradient(x-height*.2,0,x+width*.4,height);
     g.addColorStop(0,'#ffffff00');g.addColorStop(.37,'#ffffff00');g.addColorStop(.5,'#ffffff');g.addColorStop(.6,state.accent);g.addColorStop(.78,'#ffffff00');g.addColorStop(1,'#ffffff00');tintCtx.fillStyle=g;
    }else{
     const shift=Math.sin(time/800)*width*.45,g=tintCtx.createLinearGradient(-width*.5+shift,0,width*1.5+shift,height);
     g.addColorStop(0,state.fg);g.addColorStop(.25,state.accent);g.addColorStop(.5,state.fg);g.addColorStop(.75,state.accent);g.addColorStop(1,state.fg);tintCtx.fillStyle=g;
    }
    tintCtx.fillRect(0,0,width,height);ctx.save();ctx.globalAlpha*=1-release;ctx.drawImage(tint,0,0);ctx.restore();
   }else if(state.animation==='rb-flap'){
    letters.forEach((letter,i)=>{
     const local=Math.max(0,time-i/Math.max(1,letters.length)*550),active=local<1900,cycle=Math.floor(local/145),fraction=(local%145)/145;
     const pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',glyph=active?pool[Math.floor(textNoise(i,cycle)*pool.length)]:letter.text;
     const hinge=letter.y-size*.36,fit=Math.min(1,letter.width/Math.max(1,ctx.measureText(glyph).width));
     ctx.save();ctx.globalAlpha*=1-clamp((time-2400)/800);ctx.fillStyle=state.fg;ctx.globalAlpha*=.07;ctx.fillRect(letter.x-size*.015,letter.y-size*.85,letter.width+size*.03,size*1.04);ctx.restore();
     for(const half of [-1,1]){
      ctx.save();ctx.beginPath();ctx.rect(letter.x-size*.05,half<0?hinge-size:hinge,letter.width+size*.1,size);ctx.clip();
      ctx.translate(letter.x,hinge);ctx.scale(fit,active&&half<0?Math.max(.035,Math.abs(Math.cos(fraction*Math.PI))):1);unit(glyph,0,letter.y-hinge);ctx.restore();
     }
     ctx.save();ctx.globalAlpha*=.24*(1-clamp((time-2300)/900));ctx.strokeStyle=state.accent;ctx.lineWidth=Math.max(1,size*.01);ctx.beginPath();ctx.moveTo(letter.x,hinge);ctx.lineTo(letter.x+letter.width,hinge);ctx.stroke();ctx.restore();
    });
   }else if(state.animation==='rb-depth'){
    const release=1-ease((time-2700)/850),amount=(.55+.45*Math.sin(time/650))*release;
    for(let layer=9;layer>=1;layer--){ctx.save();ctx.globalAlpha*=.14+.05*(9-layer);ctx.translate(layer*size*.014*amount,layer*size*.019*amount);for(const line of lines)paintTextUnit(ctx,{...state,fg:state.accent,effect:'none'},size,line.text,line.x,line.y,state.align as CanvasTextAlign);ctx.restore();}
    ctx.save();ctx.translate(width/2,height/2);ctx.transform(1,Math.sin(time/700)*.012*release,Math.cos(time/800)*.025*release,1,0,0);ctx.translate(-width/2,-height/2);plain();ctx.restore();
   }else if(state.animation==='rb-tech'){
    const p=ease((time-150)/2300),guides=1-ease((time-2600)/800);
    ctx.save();ctx.setLineDash([size*.045,size*.025]);ctx.lineDashOffset=-time*.025;ctx.globalAlpha*=.55*guides;for(const line of lines)unit(line.text,line.left,line.y,{...state,effect:'outline'});ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(0,0,width*p,height);ctx.clip();plain();ctx.restore();
    ctx.save();ctx.globalAlpha*=.65*guides;ctx.strokeStyle=state.accent;ctx.fillStyle=state.accent;ctx.lineWidth=Math.max(1,size*.009);ctx.setLineDash([3,5]);
    for(const line of lines){const top=line.y-size*.85;ctx.strokeRect(line.left-size*.045,top,line.width+size*.09,size*1.05);for(const x of [line.left,line.left+line.width]){ctx.beginPath();ctx.arc(x,top,size*.018,0,Math.PI*2);ctx.fill();}}
    ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(width*p,height*.08);ctx.lineTo(width*p,height*.92);ctx.stroke();ctx.restore();
   }else if(state.animation==='rb-fuzzy'){
    const strength=(1-clamp(time/2700))**2,step=Math.max(1,Math.round(size*.012));
    for(let y=0,i=0;y<height;y+=step,i++){const h=Math.min(step,height-y),dx=(textNoise(i,Math.floor(time/65))-.5)*size*.28*strength;ctx.drawImage(cached,0,y,width,h,dx,y,width,h);}
   }else if(state.animation==='rb-falling'){
    const restore=ease((time-1500)/1800);
    words.forEach((word,i)=>{
     const local=Math.max(0,time-i/Math.max(1,words.length)*350),floor=Math.max(0,height*.89-word.y),drop=Math.min(1,(local/1000)**2);
     const bounce=local>1000?Math.abs(Math.sin((local-1000)/180))*size*.09*Math.exp(-(local-1000)/500):0;
     const x=(textNoise(i,11)-.5)*size*.55*(1-restore),y=(floor*drop-bounce)*(1-restore),angle=(textNoise(i,12)-.5)*.65*drop*(1-restore);
     ctx.save();ctx.translate(word.x+word.width/2+x,word.y-size*.35+y);ctx.rotate(angle);unit(word.text,-word.width/2,size*.35);ctx.restore();
    });
   }else if(state.animation==='rb-rotate'){
    words.forEach((word,i)=>{
     const p=ease((time-i/Math.max(1,words.length)*1300)/1300),angle=(1-p)*Math.PI/2;
     ctx.save();ctx.globalAlpha*=clamp(p*3);ctx.translate(word.x,word.y-size*.4);ctx.transform(1,0,Math.sin(angle)*.12,Math.max(.02,Math.cos(angle)),0,(1-p)*size*.22);unit(word.text,0,size*.4);ctx.restore();
    });
   }else if(state.animation==='rb-type'){
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
