import {BufferAttribute,BufferGeometry,Color,DynamicDrawUsage,LineSegments,PerspectiveCamera,Points,Scene,ShaderMaterial,WebGLRenderer} from 'three';
import {createPosterMask,type Poster} from './render';
import {createGalaxy,galaxyBudget,galaxyCamera,sampleGalaxy} from './galaxy.mjs';
import {createGalaxyOrbits,galaxyAtmosphere,galaxyConnections,sampleGalaxyOrbits} from './galaxy-atmosphere.mjs';
import {particleSeed,seededRandom} from './particles.mjs';

const vertexShader=`
 attribute float radius;
 attribute float tint;
 uniform float pixelScale;
 uniform float pointLimit;
 uniform float focus;
 uniform float kind;
 varying float vTint;
 varying float vDepth;
 varying float vBlur;
 varying float vZ;
 void main(){
  vec4 view=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*view;
  vBlur=kind==1.0?clamp(abs(-view.z-focus)/focus,0.0,1.5):0.0;
  gl_PointSize=clamp(radius*pixelScale/max(10.0,-view.z)*(1.0+vBlur*3.0),1.0,pointLimit);
  vTint=tint;vDepth=clamp(focus/max(10.0,-view.z),.35,1.0);vZ=position.z;
 }`;
const fragmentShader=`
 uniform vec3 foreground;
 uniform vec3 accent;
 uniform float opacity;
 uniform float kind;
 uniform float hot;
 uniform float hemisphere;
 varying float vTint;
 varying float vDepth;
 varying float vBlur;
 varying float vZ;
 void main(){
  if(hemisphere*vZ<0.0)discard;
  vec2 p=(gl_PointCoord-.5)*2.0;
  float d=length(p);
  if(d>1.0)discard;
  vec3 color=mix(foreground,accent,vTint);
  float core=1.0-smoothstep(.04,.34,d);
  float halo=exp(-d*d*5.5)*.28;
  float alpha=(core+halo)*vDepth;
  if(kind==1.0){alpha=mix(alpha,exp(-d*d*3.5)*.35,min(1.0,vBlur));}
  if(kind==2.0){
   float cloud=.6+.25*sin(p.x*8.0+sin(p.y*5.0)+vTint*12.0)+.15*sin(p.y*12.0+p.x*3.0);
   alpha=pow(1.0-d,2.5)*cloud;
  }
  if(kind==3.0){
   float rays=exp(-abs(p.x)*65.0)*exp(-abs(p.y)*4.0)+exp(-abs(p.y)*65.0)*exp(-abs(p.x)*4.0);
   alpha=exp(-d*22.0)+rays*.6+exp(-d*d*8.0)*.16;
   color=mix(color,vec3(1.0),exp(-d*24.0)*hot);
  }
  gl_FragColor=vec4(color,clamp(alpha*opacity,0.0,1.0));
  #include <colorspace_fragment>
 }`;
const lineFragment=`
 uniform vec3 foreground;uniform vec3 accent;uniform float opacity;
 varying float vTint;
 void main(){gl_FragColor=vec4(mix(foreground,accent,vTint),opacity);
 #include <colorspace_fragment>
 }`;
export const WEBGL_EXPORT_ERROR='No se puede exportar Galaxy 3D: WebGL no está disponible o se ha perdido. Prueba a recargar o elige explícitamente Ensamblar 2D.';

/** Bounded batches and procedural sprites: no textures, postprocessing or CDN.
 * Transparent output uses the existing background compositor for preview/exports. */
export function createGalaxyRenderer(state:Poster,width:number,height:number,options:{canvas?:HTMLCanvasElement;exporting?:boolean}={}){
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas:options.canvas,alpha:true,antialias:false,preserveDrawingBuffer:!!options.exporting,powerPreference:'low-power'});}
 catch{throw Error(WEBGL_EXPORT_ERROR);}
 const geometries:BufferGeometry[]=[],materials:ShaderMaterial[]=[];
 try{
 const dpr=options.exporting?1:Math.min(devicePixelRatio||1,1.75,2048/Math.max(width,height));
 renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);renderer.setClearColor(0,0);
 const mask=createPosterMask(state,width,height),seed=particleSeed(JSON.stringify([state.text,state.font,state.align,state.size,'galaxy']));
 const budget=galaxyBudget(state.galaxyQuality,width,height,options.exporting?8:navigator.hardwareConcurrency||4);
 const thickness=Math.max(5,Math.min(78,mask.fontSize*.32));
 const field=createGalaxy(mask.rgba,mask.width,mask.height,budget,seed,thickness);
 const scene=new Scene(),camera=new PerspectiveCamera(35,width/height,1,8000);
 const distance=mask.height/(2*Math.tan(35*Math.PI/360));
 const gl=renderer.getContext(),pointLimit=Math.min(384,gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);
 const bg=new Color(state.bg),dark=bg.r*.2126+bg.g*.7152+bg.b*.0722<.2;
 function points(positions:Float32Array,sizes:Float32Array,tints:Float32Array,opacity:number,kind=0,hemisphere=0){
  const geometry=new BufferGeometry();geometries.push(geometry);
  geometry.setAttribute('position',new BufferAttribute(positions,3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('radius',new BufferAttribute(sizes,1));geometry.setAttribute('tint',new BufferAttribute(tints,1));
  const material=new ShaderMaterial({vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,uniforms:{foreground:{value:new Color(state.fg)},accent:{value:new Color(state.accent)},opacity:{value:opacity},pixelScale:{value:height*dpr/mask.height*distance*5.2},pointLimit:{value:pointLimit},focus:{value:distance},kind:{value:kind},hemisphere:{value:hemisphere},hot:{value:dark?1:0}}});
  materials.push(material);const object=new Points(geometry,material);object.frustumCulled=false;object.renderOrder=scene.children.length;scene.add(object);
  return object;
 }
 function lines(positions:Float32Array,tints:Float32Array,reference:ShaderMaterial){
  const geometry=new BufferGeometry();geometries.push(geometry);
  geometry.setAttribute('position',new BufferAttribute(positions,3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('tint',new BufferAttribute(tints,1));geometry.setAttribute('radius',new BufferAttribute(new Float32Array(tints.length),1));
  const material=new ShaderMaterial({vertexShader,fragmentShader:lineFragment,transparent:true,depthWrite:false,depthTest:false,uniforms:{...reference.uniforms,opacity:{value:0}}});materials.push(material);
  const object=new LineSegments(geometry,material);object.frustumCulled=false;object.renderOrder=scene.children.length;scene.add(object);return object;
 }
 const random=seededRandom(seed^0xabcdef);
 const fogCount=budget<=3000?24:44,fogPos=new Float32Array(fogCount*3),fogSize=new Float32Array(fogCount),fogTint=new Float32Array(fogCount);
 for(let i=0;i<fogCount;i++){const a=i/fogCount*Math.PI*2;fogPos[i*3]=Math.cos(a)*mask.width*.58;fogPos[i*3+1]=Math.sin(a*2)*mask.height*.45;fogPos[i*3+2]=-200-random()*300;fogSize[i]=45+random()*65;fogTint[i]=random();}
 const fog=points(fogPos,fogSize,fogTint,dark?.085:.025,2);
 const starCount=Math.round(budget/7),stars=new Float32Array(starCount*3),starSizes=new Float32Array(starCount),starTint=new Float32Array(starCount);
 for(let i=0;i<starCount;i++){stars[i*3]=(random()-.5)*mask.width*2.4;stars[i*3+1]=(random()-.5)*mask.height*2.4;stars[i*3+2]=(random()-.65)*distance*1.5;starSizes[i]=random()<.06?2+random()*2:.2+random()*.65;starTint[i]=random();}
 const atmosphere=points(stars,starSizes,starTint,.62,1);
 const orbits=createGalaxyOrbits(mask.width,mask.height,Math.round(budget*.6),seed^0x123);
 const orbitBack=points(orbits.positions,orbits.sizes,orbits.tints,.6,0,-1);
 const ribbonField=createGalaxyOrbits(mask.width,mask.height,480,seed^0x456);
 for(let i=0;i<ribbonField.count;i++){ribbonField.phase[i]=Math.floor(i/3)/160*Math.PI*2;ribbonField.radius[i]=.9775;ribbonField.spread[i]=0;}
 const ribbonIndices:number[]=[];
 for(let lane=0;lane<3;lane++){
  const order=Array.from({length:ribbonField.count},(_,i)=>i).filter(i=>i%3===lane);
  for(let i=0;i<order.length;i++)ribbonIndices.push(order[i],order[(i+1)%order.length]);
 }
 const ribbonPos=new Float32Array(ribbonIndices.length*3),ribbonTint=Float32Array.from(ribbonIndices,i=>ribbonField.tints[i]);
 const ribbons=lines(ribbonPos,ribbonTint,orbitBack.material);
 const tints=new Float32Array(field.count);
 for(let i=0;i<field.count;i++){
  const gradient=field.home[i*3]/mask.width+.5;
  tints[i]=i%3===0?Math.max(0,Math.min(.7,gradient*.7+field.phase[i]*.1)):i%3===1?.72+field.phase[i]*.28:.3+gradient*.6;
 }
 const trailPositions=new Float32Array(field.positions),trails=points(trailPositions,field.sizes,tints,0);
 const streakCount=Math.ceil(field.count/9),streakPos=new Float32Array(streakCount*6),streakTint=new Float32Array(streakCount*2);
 for(let i=0;i<streakCount;i++)streakTint[i*2]=streakTint[i*2+1]=tints[i*9];
 const streaks=lines(streakPos,streakTint,trails.material);
 const text=points(field.positions,field.sizes,tints,.95);
 // Draw the rear face first, then walls, then the bright front surface.
 const faceOrder=new Uint16Array(field.count);let faceIndex=0;
 for(const layer of [2,1,0])for(let i=layer;i<field.count;i+=3)faceOrder[faceIndex++]=i;
 text.geometry.setIndex(new BufferAttribute(faceOrder,1));
 // Fine front-face connections suggest the crystalline facets in the reference.
 const links=galaxyConnections(field,mask.rgba,mask.width,mask.height),wirePos=new Float32Array(links.length*3),wireTint=new Float32Array(links.length);
 for(let i=0;i<links.length;i++)wireTint[i]=tints[links[i]];
 const wire=lines(wirePos,wireTint,text.material);
 const orbitFront=points(orbits.positions,orbits.sizes,orbits.tints,.6,0,1);
 const flareCount=Math.min(8,Math.floor(field.count/140)),flarePos=new Float32Array(flareCount*3),flareSizes=new Float32Array(flareCount),flareTint=new Float32Array(flareCount),flareIndices=new Uint32Array(flareCount);
 for(let i=0;i<flareCount;i++){
  const x=((i+.5)/flareCount-.5)*mask.width*.8;let closest=Infinity,index=0;
  for(let j=0;j<field.count;j+=3){if(!field.rim[j])continue;const score=Math.abs(field.home[j*3]-x)*2+Math.abs(field.home[j*3+1]-mask.height*.18);if(score<closest){closest=score;index=j;}}
  flareIndices[i]=index;flareSizes[i]=9+random()*6;flareTint[i]=i%2;
 }
 const flares=points(flarePos,flareSizes,flareTint,.8,3);
 let disposed=false;
 return {canvas:renderer.domElement,count:field.count,
  draw(time:number,settled=false,interaction={yaw:0,pitch:0,zoom:1,burst:0}){
   if(disposed||renderer.getContext().isContextLost())throw Error(WEBGL_EXPORT_ERROR);
   const t=settled?12000:time,repeat=!settled&&state.repeat,lighting=galaxyAtmosphere(t,repeat);
   sampleGalaxy(field,Math.max(0,t-65),repeat,interaction.burst);trailPositions.set(field.positions);
   trails.geometry.attributes.position.needsUpdate=true;
   trails.material.uniforms.opacity.value=!settled&&t>1800&&t<5800?.12:0;
   sampleGalaxy(field,t,repeat,interaction.burst);text.geometry.attributes.position.needsUpdate=true;
   const attracting=!settled&&t>1800&&t<5800;
   streaks.material.uniforms.opacity.value=interaction.burst*.65+(attracting?.22:0);
   for(let i=0;i<streakCount;i++)for(let axis=0;axis<3;axis++){
    const source=i*27+axis,current=field.positions[source];
    const tail=interaction.burst>0?(field.cloud[source]-field.home[source])*interaction.burst*.16:(current-trailPositions[source])*2.4;
    streakPos[i*6+axis]=current;streakPos[i*6+3+axis]=current-tail;
   }
   streaks.geometry.attributes.position.needsUpdate=true;
   sampleGalaxyOrbits(orbits,t);
   for(const orbit of [orbitBack,orbitFront]){orbit.geometry.attributes.position.needsUpdate=true;orbit.material.uniforms.opacity.value=lighting.orbits*(orbit===orbitBack?.85:.7);}
   sampleGalaxyOrbits(ribbonField,t);
   for(let i=0;i<ribbonIndices.length;i++){const source=ribbonIndices[i]*3;ribbonPos[i*3]=ribbonField.positions[source];ribbonPos[i*3+1]=ribbonField.positions[source+1];ribbonPos[i*3+2]=ribbonField.positions[source+2];}
   ribbons.geometry.attributes.position.needsUpdate=true;ribbons.material.uniforms.opacity.value=lighting.orbits*.2;
   for(let i=0;i<links.length;i++){const source=links[i]*3;wirePos[i*3]=field.positions[source];wirePos[i*3+1]=field.positions[source+1];wirePos[i*3+2]=field.positions[source+2];}
   wire.geometry.attributes.position.needsUpdate=true;wire.material.uniforms.opacity.value=lighting.structure*.16*(1-interaction.burst);
   for(let i=0;i<flareCount;i++){const source=flareIndices[i]*3;flarePos[i*3]=field.positions[source];flarePos[i*3+1]=field.positions[source+1];flarePos[i*3+2]=field.positions[source+2]+1;}
   flares.geometry.attributes.position.needsUpdate=true;flares.material.uniforms.opacity.value=(1.05+lighting.flash*.65)*lighting.structure;
   fog.material.uniforms.opacity.value=(dark?.085:.025)*(1+lighting.flash*.7);
   const pose=galaxyCamera(t,!settled&&state.galaxyCamera,repeat);
   const yaw=pose.yaw+interaction.yaw,pitch=pose.pitch+interaction.pitch,d=distance*pose.distance*interaction.zoom;
   camera.position.set(Math.sin(yaw)*d,Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(0,0,0);
   atmosphere.rotation.z=settled?0:Math.sin(t/5000)*.012*Math.max(0,1-t/12000);
   renderer.render(scene,camera);
  },
  dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
 }catch(error){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();throw error;}
}
