import {seededRandom} from './particles.mjs';
import {smooth} from './galaxy.mjs';

/** Sparse front-face connections. All intermediate samples must stay inside ink,
 * so a network edge can never bridge a counter or an inter-letter space. */
export function galaxyConnections(field,rgba,width,height){
 const cells=new Map(),links=[],step=Math.max(5,Math.min(width,height)/42);
 for(let i=0;i<field.count;i+=3){
  const x=field.home[i*3]+width/2,y=height/2-field.home[i*3+1],cx=Math.floor(x/step),cy=Math.floor(y/step);
  let found=0;
  for(let dy=-1;dy<=1&&found<2;dy++)for(let dx=-1;dx<=1&&found<2;dx++){
   for(const other of cells.get(`${cx+dx},${cy+dy}`)??[]){
    const ox=field.home[other*3]+width/2,oy=height/2-field.home[other*3+1],distance=Math.hypot(ox-x,oy-y);
    if(distance<step*.45||distance>step*1.4)continue;
    let inside=true;
    for(let n=1;n<=8;n++){const u=n/9,px=Math.floor(x+(ox-x)*u),py=Math.floor(y+(oy-y)*u);if(rgba[(py*width+px)*4+3]<=120){inside=false;break;}}
    if(inside){links.push(i,other);found++;break;}
   }
  }
  const key=`${cx},${cy}`,bucket=cells.get(key)??[];bucket.push(i);cells.set(key,bucket);
 }
 return new Uint32Array(links);
}

/** Three inclined, irregular ribbons of orbital dust. Every sample has true Z. */
export function createGalaxyOrbits(width,height,count=2600,seed=1){
 const random=seededRandom(seed),phase=new Float32Array(count),radius=new Float32Array(count),spread=new Float32Array(count),sizes=new Float32Array(count),tints=new Float32Array(count);
 for(let i=0;i<count;i++){phase[i]=random()*Math.PI*2;radius[i]=.96+random()*.035;spread[i]=(random()-.5)*.012;sizes[i]=.65+random()**3*1.1;tints[i]=i%3===1?.85+random()*.15:random()*.25;}
 return {width,height,count,phase,radius,spread,sizes,tints,positions:new Float32Array(count*3)};
}
export function sampleGalaxyOrbits(field,time){
 // Whole turns across the cycle ensure an exact loop seam and seekable exports.
 const turn=Math.max(0,time)%12000/12000*Math.PI*2;
 for(let i=0;i<field.count;i++){
  const lane=i%3,a=field.phase[i]+turn*(lane===1?-1:1),r=field.radius[i],wave=Math.sin(a*3+lane)*field.height*.025;
  const x=Math.cos(a)*field.width*.45*r,z=Math.sin(a)*field.height*.46*r;
  field.positions[i*3]=x;
  field.positions[i*3+1]=Math.sin(a)*field.height*(lane===1?.4:.29)+x*(lane===2?-.16:.07)+field.spread[i]*field.height+wave;
  field.positions[i*3+2]=z;
 }
 return field.positions;
}
export function galaxyAtmosphere(time,repeat=false){
 const t=Math.max(0,time)/1000,formed=smooth((t-3)/3),release=repeat?smooth((t-10.6)/1.4):0;
 return {orbits:(.18+.82*formed)*(1-release)+.18*release,structure:formed*(1-release),flash:Math.exp(-(((t-5.8)/.6)**2))};
}
