/// <reference lib="webworker" />
import {GIFEncoder,quantize,applyPalette} from 'gifenc';

const scope=self as unknown as DedicatedWorkerGlobalScope;
let gif=GIFEncoder(),width=0,height=0,repeat=0;
scope.onmessage=({data})=>{
 try{
  if(data.type==='init'){width=data.width;height=data.height;repeat=data.repeat?0:-1;gif=GIFEncoder();scope.postMessage({type:'ready'});}
  else if(data.type==='frame'){
   const rgba=new Uint8Array(data.rgba),palette=quantize(rgba,256);
   gif.writeFrame(applyPalette(rgba,palette),width,height,{palette,delay:data.delay,repeat,dispose:1});
   scope.postMessage({type:'ready'});
  }else if(data.type==='finish'){gif.finish();const bytes=gif.bytes();scope.postMessage({type:'done',bytes:bytes.buffer},[bytes.buffer]);}
 }catch(error){scope.postMessage({type:'error',message:error instanceof Error?error.message:'No se pudo crear el GIF.'});}
};
