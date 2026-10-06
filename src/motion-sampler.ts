// Sample the app's actual CSS keyframes with the browser's interpolation engine.
// Neutral elements let an explicitly requested GIF animate even with reduced motion.
type Sample={matrix:DOMMatrixReadOnly;opacity:number;filter:string};
export function motionSampler() {
 const root=document.createElement('div');root.setAttribute('aria-hidden','true');root.dataset.gifSampler='';
 root.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;contain:strict;width:1px;height:1px';
 document.body.append(root);
 const definitions=new Map<string,Keyframe[]>(),animations:Animation[]=[];
 const read=(rules:CSSRuleList)=>{for(const rule of Array.from(rules)){
  if(rule instanceof CSSKeyframesRule){
   const frames:Keyframe[]=[];
   for(const frame of Array.from(rule.cssRules) as CSSKeyframeRule[])for(const key of frame.keyText.split(',')){
    const values:Keyframe={offset:key.trim()==='from'?0:key.trim()==='to'?1:parseFloat(key)/100};
    for(const property of ['transform','opacity','filter'])if(frame.style.getPropertyValue(property))values[property]=frame.style.getPropertyValue(property);
    frames.push(values);
   }
   definitions.set(rule.name,frames.sort((a,b)=>a.offset!-b.offset!));
  }else if('cssRules' in rule)read((rule as CSSGroupingRule).cssRules);
 }};
 for(const sheet of Array.from(document.styleSheets)){try{read(sheet.cssRules);}catch{/* Unrelated cross-origin CSS does not contain our keyframes. */}}
 return {
  create(name:string|undefined,options:KeyframeAnimationOptions,variables:Record<string,string>,opacity=1){
   const element=document.createElement('div');element.style.opacity=String(opacity);
   for(const [key,value] of Object.entries(variables))element.style.setProperty(key,value);
   root.append(element);
   let animation:Animation|undefined;
   if(name){const frames=definitions.get(name);if(!frames)throw Error('No se encontró la animación. Recarga la página y vuelve a intentarlo.');animation=element.animate(frames,{fill:'both',...options});animation.pause();animations.push(animation);}
   return (time:number):Sample=>{
    if(animation)animation.currentTime=time;
    const style=getComputedStyle(element);
    return {matrix:new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform),opacity:Number(style.opacity),filter:style.filter};
   };
  },
  dispose(){for(const animation of animations)animation.cancel();root.remove();}
 };
}

export function textTiming(animation:string,repeat:boolean,tempo:number){
 const names:Record<string,[string,string]>={letters:['letters-enter','letters-cycle'],wave:['letter-wave','letter-wave'],bounce:['bounce-enter','bounce-cycle'],orbit:['orbit-enter','orbit-cycle'],cascade:['words-enter','words-cycle'],reveal:['words-enter','words-cycle'],impact:['impact-enter','impact-cycle'],blur:['focus-enter','focus-cycle'],fade:['fade-once','fade-cycle'],float:['float-text','float-text']};
 const long=repeat||['wave','fade','float'].includes(animation);
 return {name:names[animation]?.[repeat?1:0],duration:(long?6000:950)*tempo,easing:['wave','fade','float'].includes(animation)?'ease-in-out':repeat?'linear':'cubic-bezier(.16,1,.3,1)'};
}
