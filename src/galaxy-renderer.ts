import {BufferAttribute,BufferGeometry,Color,DynamicDrawUsage,PerspectiveCamera,Points,Scene,ShaderMaterial,WebGLRenderer} from 'three';
import {createPosterMask,type Poster} from './render';
import {createGalaxy,galaxyBudget,galaxyCamera,sampleGalaxy} from './galaxy.mjs';
import {particleSeed,seededRandom} from './particles.mjs';

const vertexShader=`
 attribute float radius;
 attribute float tint;
 uniform float pixelScale;
 varying float vTint;
 varying float vDepth;
 void main(){
  vec4 view=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp(radius*pixelScale/max(10.0,-view.z),1.0,54.0);
  vTint=tint;vDepth=clamp(1000.0/max(10.0,-view.z),.3,1.0);
 }`;
const fragmentShader=`
 uniform vec3 foreground;
 uniform vec3 accent;
 uniform float opacity;
 varying float vTint;
 varying float vDepth;
 void main(){
  float d=length(gl_PointCoord-.5)*2.0;
  if(d>1.0)discard;
  float core=1.0-smoothstep(.12,.46,d);
  float halo=exp(-d*d*5.0)*.24;
  gl_FragColor=vec4(mix(foreground,accent,vTint),(core+halo)*opacity*vDepth);
  #include <colorspace_fragment>
 }`;
export const WEBGL_EXPORT_ERROR='No se puede exportar Galaxy 3D: WebGL no está disponible o se ha perdido. Prueba a recargar o elige explícitamente Ensamblar 2D.';

/** One owned WebGL context per mounted scene/export scene, never per frame.
 * The transparent canvas is composited over the existing SVG/Canvas backgrounds.
 */
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
 const field=createGalaxy(mask.rgba,mask.width,mask.height,budget,seed,Math.max(5,Math.min(42,mask.fontSize*.14)));
 const scene=new Scene(),camera=new PerspectiveCamera(35,width/height,1,8000);
 const distance=mask.height/(2*Math.tan(35*Math.PI/360));
 function points(positions:Float32Array,sizes:Float32Array,tints:Float32Array,opacity:number){
  const geometry=new BufferGeometry();geometries.push(geometry);
  geometry.setAttribute('position',new BufferAttribute(positions,3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('radius',new BufferAttribute(sizes,1));geometry.setAttribute('tint',new BufferAttribute(tints,1));
  const material=new ShaderMaterial({vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,uniforms:{foreground:{value:new Color(state.fg)},accent:{value:new Color(state.accent)},opacity:{value:opacity},pixelScale:{value:height*dpr/ mask.height*distance*5.2}}});
  materials.push(material);const object=new Points(geometry,material);object.frustumCulled=false;scene.add(object);
  return object;
 }
 const random=seededRandom(seed^0xabcdef),starCount=Math.round(budget/14),stars=new Float32Array(starCount*3),starSizes=new Float32Array(starCount),starTint=new Float32Array(starCount);
 for(let i=0;i<starCount;i++){stars[i*3]=(random()-.5)*mask.width*3;stars[i*3+1]=(random()-.5)*mask.height*3;stars[i*3+2]=(random()-.8)*distance*2;starSizes[i]=.25+random()*.5;starTint[i]=random();}
 const atmosphere=points(stars,starSizes,starTint,.45);
 const tints=new Float32Array(field.count);
 for(let i=0;i<field.count;i++)tints[i]=i%3===0?field.phase[i]*.08:.35+field.phase[i]*.5;
 const trailPositions=new Float32Array(field.positions),trails=points(trailPositions,field.sizes,tints,0);
 const text=points(field.positions,field.sizes,tints,.94);
 let disposed=false;
 return {canvas:renderer.domElement,count:field.count,
  draw(time:number,settled=false,interaction={yaw:0,pitch:0,zoom:1,burst:0}){
   if(disposed||renderer.getContext().isContextLost())throw Error(WEBGL_EXPORT_ERROR);
   const t=settled?12000:time,repeat=!settled&&state.repeat;
   // A second low-opacity sample makes short, deterministic light trails.
   sampleGalaxy(field,Math.max(0,t-65),repeat,interaction.burst);trailPositions.set(field.positions);
   trails.geometry.attributes.position.needsUpdate=true;
   trails.material.uniforms.opacity.value=!settled&&t>1800&&t<5800?.12:0;
   sampleGalaxy(field,t,repeat,interaction.burst);text.geometry.attributes.position.needsUpdate=true;
   const pose=galaxyCamera(t,!settled&&state.galaxyCamera,repeat);
   // The final still has the same camera as the timeline's final frame.
   const yaw=pose.yaw+interaction.yaw,pitch=pose.pitch+interaction.pitch,d=distance*pose.distance*interaction.zoom;
   camera.position.set(Math.sin(yaw)*d,Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(0,0,0);
   atmosphere.rotation.z=settled?0:Math.sin(t/5000)*.012*Math.max(0,1-t/12000);
   renderer.render(scene,camera);
  },
  dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
 }catch(error){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();throw error;}
}
