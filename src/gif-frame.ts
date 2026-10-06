import {layoutText,paintTexture,paintTextUnit,type Poster} from './render';
import {backdropScene,paintBackdrop} from './background';
import {motionSampler,textTiming} from './motion-sampler';

export function gifFrameRenderer(canvas:HTMLCanvasElement,state:Poster,width:number,height:number){
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const geometry=layoutText(ctx,state,width,height),unit=Math.min(width,height),sampler=motionSampler();
 try{
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 const byLetter=['letters','wave','bounce','orbit'].includes(state.animation),byPart=byLetter||state.animation==='cascade';
 const count=geometry.lines.reduce((n,l)=>n+l.letters.length,0),timing=textTiming(state.animation,state.repeat,tempo);
 let index=0;
 const parts=geometry.lines.flatMap((line,lineIndex)=>(byLetter?line.letters:state.animation==='cascade'?line.words:[{text:line.text,x:line.x}]).map(word=>{
  const delay=(byLetter?index++/Math.max(1,count-1)*1.15:Math.min(index++*.105,.85))*tempo*1000;
  const sample=sampler.create(timing.name,{duration:timing.duration,delay,easing:timing.easing}, {'--lift':`${geometry.fontSize*.25}px`,'--tilt':`${lineIndex%2?-3:3}deg`,'--float':`${Math.min(10,unit*.012)}px`});
  return {...word,y:line.y,pivot:line.y-geometry.fontSize*.35,sample};
 }));
 const background=backdropScene(state,width,height);
 const shapes=background.shapes.map((shape,i)=>sampler.create(state.backdropMotion&&shape.motion?`bg-${shape.motion==='drift-reverse'?'drift':shape.motion}`:undefined,{duration:18000*tempo*(shape.motion==='spin'?3:shape.motion==='twinkle'?.3:1),delay:shape.motion==='twinkle'?(i%7)*-800:0,easing:shape.motion==='spin'?'linear':'ease-in-out',iterations:Infinity,direction:shape.motion==='drift-reverse'?'reverse':'normal'}, {'--bg-distance':`${unit*.035}px`},shape.opacity));
 return {
  draw(time:number){
   ctx.clearRect(0,0,width,height);
   paintBackdrop(ctx,state,width,height,background,i=>shapes[i](time));paintTexture(ctx,state,width,height);
   for(const part of parts){
    const sample=part.sample(time),m=sample.matrix;
    if(sample.opacity<=0)continue;
    ctx.save();ctx.globalAlpha=sample.opacity;ctx.filter=sample.filter;
    ctx.translate(part.x,part.pivot);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.translate(-part.x,-part.pivot);
    paintTextUnit(ctx,state,geometry.fontSize,part.text,part.x,part.y,byPart?'left':state.align as CanvasTextAlign);ctx.restore();
   }
  },
  dispose(){sampler.dispose();}
 };
 }catch(error){sampler.dispose();throw error;}
}
