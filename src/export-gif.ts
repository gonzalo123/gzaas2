import GifWorker from './gif.worker?worker&inline';
import {exportDimensions,exportPlan} from './export-plan.mjs';
import {gifFrameRenderer} from './gif-frame';
import {paint,waitFonts,type Poster} from './render';

export async function exportGif(state:Poster,ratio:string,signal:AbortSignal,onProgress:(value:number)=>void){
 signal.throwIfAborted();await waitFonts(state);signal.throwIfAborted();
 const [width,height]=exportDimensions(ratio),plan=exportPlan(state);
 const canvas=document.createElement('canvas'),sceneCanvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('El navegador no puede crear el GIF.');
 const worker=new GifWorker();
 let pending:{resolve:(data:{bytes?:ArrayBuffer})=>void;reject:(error:Error)=>void}|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined,renderer:ReturnType<typeof gifFrameRenderer>|undefined;
 const clear=()=>{clearTimeout(timer);timer=undefined;};
 const fail=(error:Error)=>{clear();pending?.reject(error);pending=undefined;};
 worker.onmessage=({data})=>{clear();if(data.type==='error')fail(Error(data.message));else{pending?.resolve(data);pending=undefined;}};
 worker.onerror=()=>fail(Error('No se pudo iniciar la exportación. Recarga la página y vuelve a intentarlo.'));
 const abort=()=>{worker.terminate();fail(new DOMException('Exportación cancelada.','AbortError'));};
 signal.addEventListener('abort',abort,{once:true});
 const send=(message:unknown,transfer:Transferable[]=[])=>new Promise<{bytes?:ArrayBuffer}>((resolve,reject)=>{
  signal.throwIfAborted();pending={resolve,reject};timer=setTimeout(()=>{worker.terminate();fail(Error('La exportación tardó demasiado. Vuelve a intentarlo.'));},30000);worker.postMessage(message,transfer);
 });
 let sceneIndex=-1;
 try{
  await send({type:'init',width,height,repeat:state.repeat});
  for(const [i,frame] of plan.frames.entries()){
   signal.throwIfAborted();const scene=plan.sceneAt(frame.time);
   if(scene.index!==sceneIndex){renderer?.dispose();renderer=gifFrameRenderer(sceneCanvas,scene.state,width,height);sceneIndex=scene.index;}
   renderer!.draw(scene.time);
   ctx.fillStyle=state.bg;ctx.fillRect(0,0,width,height);ctx.save();ctx.globalAlpha=scene.opacity;
   ctx.translate(width/2,height/2);ctx.scale(scene.scale,scene.scale);ctx.drawImage(sceneCanvas,-width/2,-height/2);ctx.restore();
   const rgba=ctx.getImageData(0,0,width,height).data.buffer;
   await send({type:'frame',rgba,delay:frame.delay},[rgba]);
   onProgress(Math.round((i+1)/plan.frames.length*100));
  }
  const {bytes}=await send({type:'finish'});if(!bytes)throw Error('No se pudo finalizar el GIF.');
  paint(canvas,state,width,height);
  return {blob:new Blob([bytes],{type:'image/gif'}),thumbnail:canvas.toDataURL('image/png'),width,height,duration:plan.totalDuration};
 }finally{clear();renderer?.dispose();worker.terminate();signal.removeEventListener('abort',abort);}
}
