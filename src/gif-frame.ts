import {isGalaxy,galaxyTime} from './galaxy.mjs';
import {isParticle,particlePlaybackTime} from './particles.mjs';
import {drawParticles} from './particle-canvas';
import {createPosterParticles,layoutText,paintTexture,paintTextUnit,type Poster} from './render';
import {backdropScene,paintBackdrop} from './background';
import {motionSampler,textTiming} from './motion-sampler';

export async function gifFrameRenderer(canvas:HTMLCanvasElement,state:Poster,width:number,height:number,particleDuration?:number){
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('El navegador no puede crear la imagen.');
 const galaxy=isGalaxy(state.animation)?(await import('./galaxy-renderer')).createGalaxyRenderer(state,width,height,{exporting:true}):null;
 const geometry=layoutText(ctx,state,width,height),unit=Math.min(width,height),sampler=motionSampler();
 let silk:ReturnType<typeof import('./silk-renderer')['createSilkRenderer']>|undefined;
 try{
 if(state.backdrop==='silk')silk=(await import('./silk-renderer')).createSilkRenderer(state,width,height);
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 const byLetter=['letters','wave','bounce','orbit'].includes(state.animation),byPart=byLetter||state.animation==='cascade';
 const count=geometry.lines.reduce((n,l)=>n+l.letters.length,0),timing=textTiming(state.animation,state.repeat,tempo);
 let index=0;
 const field=!galaxy&&isParticle(state.animation)?createPosterParticles(state,width,height):null;
 const parts=field||galaxy?[]:geometry.lines.flatMap((line,lineIndex)=>(byLetter?line.letters:state.animation==='cascade'?line.words:[{text:line.text,x:line.x}]).map(word=>{
  const delay=(byLetter?index++/Math.max(1,count-1)*1.15:Math.min(index++*.105,.85))*tempo*1000;
  const sample=sampler.create(timing.name,{duration:timing.duration,delay,easing:timing.easing}, {'--lift':`${geometry.fontSize*.25}px`,'--tilt':`${lineIndex%2?-3:3}deg`,'--float':`${Math.min(10,unit*.012)}px`});
  return {...word,y:line.y,pivot:line.y-geometry.fontSize*.35,sample};
 }));
 const background=backdropScene(state,width,height);
 const shapes=background.shapes.map((shape,i)=>sampler.create(state.backdropMotion&&shape.motion?`bg-${shape.motion==='drift-reverse'?'drift':shape.motion}`:undefined,{duration:18000*tempo*(shape.motion==='spin'?3:shape.motion==='twinkle'?.3:1),delay:shape.motion==='twinkle'?(i%7)*-800:0,easing:shape.motion==='spin'?'linear':'ease-in-out',iterations:Infinity,direction:shape.motion==='drift-reverse'?'reverse':'normal'}, {'--bg-distance':`${unit*.035}px`},shape.opacity));
 return {
  draw(time:number){
   ctx.clearRect(0,0,width,height);
   paintBackdrop(ctx,state,width,height,background,i=>shapes[i](time));
   if(silk){silk.draw(time);ctx.drawImage(silk.canvas,0,0);}
   paintTexture(ctx,state,width,height);
   if(galaxy){galaxy.draw(galaxyTime(time,state.pace,particleDuration,state.repeat));ctx.drawImage(galaxy.canvas,0,0,width,height);}
   if(field)drawParticles(ctx,field,state,width,height,particlePlaybackTime(time,state.pace,particleDuration));
   for(const part of parts){
    const sample=part.sample(time),m=sample.matrix;
    if(sample.opacity<=0)continue;
    ctx.save();ctx.globalAlpha=sample.opacity;ctx.filter=sample.filter;
    ctx.translate(part.x,part.pivot);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.translate(-part.x,-part.pivot);
    paintTextUnit(ctx,state,geometry.fontSize,part.text,part.x,part.y,byPart?'left':state.align as CanvasTextAlign);ctx.restore();
   }
  },
  dispose(){sampler.dispose();galaxy?.dispose();silk?.dispose();}
 };
 }catch(error){sampler.dispose();galaxy?.dispose();silk?.dispose();throw error;}
}
