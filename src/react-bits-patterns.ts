/* Plasma, Gradient Blinds, Light Rays and Balatro adapted from React Bits.
 * Copyright (c) 2026 David Haz — MIT + Commons Clause.
 * https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Backgrounds
 * License: public/licenses/react-bits.txt.
 * Gzaas: periodic time, two colors, explicit frames, no interactive history.
 */
import type {ShaderPattern} from './silk-renderer';

const header=`precision highp float;
uniform vec2 resolution;
uniform vec3 baseColor;
uniform vec3 accentColor;
uniform float phase;
`;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};

// Plasma's twisted volume, sampled with 32 bounded ray-marching steps.
const plasma:ShaderPattern={softwareSize:192,fragment:header+`
void main(){
 vec2 uv=(gl_FragCoord.xy/resolution-0.5)*vec2(resolution.x/resolution.y,1.0);
 vec3 rd=normalize(vec3(uv,1.0));
 float time=1.5*sin(phase)+0.3*(cos(phase)-1.0),z=0.0,density=0.0,band=0.0;
 for(int i=0;i<32;i++){
  vec3 s=vec3(rd.xy*z,-4.0+rd.z*z),p=s;
  float d=p.y-time;
  p.x+=(1.0+p.y)*sin(d+p.x*0.1)*cos(0.34*d+p.x*0.05);
  float turn=p.y-time;
  vec2 q=vec2(p.x*cos(turn)+p.z*cos(turn+33.0),p.x*cos(turn+11.0)+p.z*cos(turn));
  p.xz=q;
  float shell=abs(sqrt(length(q*q))-0.25*(5.0+s.y))/3.0;
  float stepLength=shell+0.0008;z+=stepLength;
  float wave=s.y+p.z*0.5+s.z-length(s-p);
  float weight=(1.0+sin(wave+8.0))*exp(-shell*9.0)*stepLength;
  density+=weight;band+=weight*(0.5+0.5*sin(wave*0.5+1.0));
 }
 float level=1.0-exp(-density*1.8);
 float hue=band/max(density,0.00001);
 vec3 tint=mix(accentColor,vec3(1.0),hue*0.25);
 gl_FragColor=vec4(clamp(baseColor*(1.0-level)+tint*level,0.0,1.0),1.0);
}`,sample(u,v,phase,aspect,base,accent){
 const ux=(u-.5)*aspect,uy=v-.5,norm=Math.hypot(ux,uy,1),rx=ux/norm,ry=uy/norm,rz=1/norm,time=1.5*Math.sin(phase)+.3*(Math.cos(phase)-1);
 let z=0,density=0,band=0;
 for(let i=0;i<32;i++){
  const sx=rx*z,sy=ry*z,sz=-4+rz*z,d=sy-time;
  const px=sx+(1+sy)*Math.sin(d+sx*.1)*Math.cos(.34*d+sx*.05),turn=sy-time;
  const qx=px*Math.cos(turn)+sz*Math.cos(turn+33),qz=px*Math.cos(turn+11)+sz*Math.cos(turn);
  const shell=Math.abs(Math.sqrt(Math.hypot(qx*qx,qz*qz))-.25*(5+sy))/3,step=shell+.0008;
  z+=step;
  const wave=sy+qz*.5+sz-Math.hypot(sx-qx,sz-qz),weight=(1+Math.sin(wave+8))*Math.exp(-shell*9)*step;
  density+=weight;band+=weight*(.5+.5*Math.sin(wave*.5+1));
 }
 const level=1-Math.exp(-density*1.8),hue=band/Math.max(density,.00001);
 return base.map((c,i)=>clamp(c*(1-level)+(accent[i]*(1-hue*.25)+hue*.25)*level));
}};

const blinds:ShaderPattern={softwareSize:320,fragment:header+`
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 float stripe=(uv.x+0.02*sin(uv.y*6.0))*12.0;
 float slat=floor(stripe),edge=fract(stripe);
 float tilt=0.5*sin(phase+slat*0.55)*(0.6+0.4*sin(phase+slat*0.21));
 float ramp=pow(edge,exp(tilt*0.9));
 float crease=0.38*smoothstep(0.62,1.0,ramp);
 vec2 light=vec2(0.5+0.2*sin(phase),0.6+0.15*cos(phase));
 float nearLight=exp(-dot(uv-light,uv-light)/0.35);
 float sheen=exp(-pow((edge-0.035)/0.07,2.0))*(0.3+0.7*nearLight);
 float gradient=0.5+0.5*sin(uv.x*3.0+0.6*sin(phase));
 vec3 tone=mix(baseColor,accentColor,gradient);
 vec3 col=tone*(0.3+0.7*(1.0-ramp)-0.2*crease)+accentColor*(0.25*nearLight+0.4*sheen);
 gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`,sample(u,v,phase,_aspect,base,accent){
 const stripe=(u+.02*Math.sin(v*6))*12,slat=Math.floor(stripe),edge=stripe-slat;
 const tilt=.5*Math.sin(phase+slat*.55)*(.6+.4*Math.sin(phase+slat*.21)),ramp=edge**Math.exp(tilt*.9),crease=.38*smooth(.62,1,ramp);
 const x=.5+.2*Math.sin(phase),y=.6+.15*Math.cos(phase),near=Math.exp(-((u-x)**2+(v-y)**2)/.35);
 const sheen=Math.exp(-(((edge-.035)/.07)**2))*(.3+.7*near),gradient=.5+.5*Math.sin(u*3+.6*Math.sin(phase));
 return base.map((c,i)=>clamp((c*(1-gradient)+accent[i]*gradient)*(.3+.7*(1-ramp)-.2*crease)+accent[i]*(.25*near+.4*sheen)));
}};

const lightRays:ShaderPattern={softwareSize:320,fragment:header+`
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 delta=vec2((uv.x-0.5)*resolution.x/resolution.y,1.2-uv.y);
 float distance=length(delta),angle=delta.y/max(distance,0.0001);
 float time=sin(phase)+0.3*(cos(phase)-1.0),sway=0.04*sin(phase+distance*2.0);
 angle+=sway;
 float spread=pow(max(angle,0.0),3.0);
 float envelope=spread*clamp(1.0-distance/2.4,0.0,1.0)*clamp(1.0-distance/2.0,0.5,1.0);
 float a=clamp(0.75+0.15*sin(angle*86.93136+time*1.5)+0.2*cos(-angle*50.672376+time*1.5),0.0,1.0);
 float b=clamp(0.75+0.15*sin(angle*53.75784+time*1.1)+0.2*cos(-angle*43.25616+time*1.1),0.0,1.0);
 float source=0.9*exp(-distance*distance*9.0)+0.25*exp(-distance*3.2);
 float energy=envelope*(0.5*smoothstep(0.45,0.8,a)+0.4*smoothstep(0.45,0.8,b))*1.8+source;
 float level=1.0-exp(-energy*1.5);
 gl_FragColor=vec4(clamp(baseColor*(1.0-level*0.4)+accentColor*level,0.0,1.0),1.0);
}`,sample(u,v,phase,aspect,base,accent){
 const x=(u-.5)*aspect,y=1.2-v,distance=Math.hypot(x,y),time=Math.sin(phase)+.3*(Math.cos(phase)-1),angle=y/Math.max(distance,.0001)+.04*Math.sin(phase+distance*2);
 const spread=Math.max(angle,0)**3,envelope=spread*clamp(1-distance/2.4)*Math.max(.5,clamp(1-distance/2));
 const a=clamp(.75+.15*Math.sin(angle*86.93136+time*1.5)+.2*Math.cos(-angle*50.672376+time*1.5));
 const b=clamp(.75+.15*Math.sin(angle*53.75784+time*1.1)+.2*Math.cos(-angle*43.25616+time*1.1));
 const source=.9*Math.exp(-distance*distance*9)+.25*Math.exp(-distance*3.2),energy=envelope*(.5*smooth(.45,.8,a)+.4*smooth(.45,.8,b))*1.8+source;
 const level=1-Math.exp(-energy*1.5);
 return base.map((c,i)=>clamp(c*(1-level*.4)+accent[i]*level));
}};

const balatro:ShaderPattern={softwareSize:256,fragment:header+`
void main(){
 // A fixed logical pixel grid gives the paint its original pixelated finish.
 vec2 cell=(floor(gl_FragCoord.xy/resolution*240.0)+0.5)/240.0;
 vec2 uv=(cell-0.5)*vec2(resolution.x/resolution.y,1.0)/length(vec2(resolution.x/resolution.y,1.0));
 float radius=length(uv),spin=0.3*sin(phase)+0.08*(cos(phase)-1.0);
 float angle=atan(uv.y,uv.x)+302.2+spin-20.0*(0.25*radius+0.75);
 uv=radius*vec2(cos(angle),sin(angle))*30.0;
 float speed=4.0*sin(phase)+cos(phase)-1.0;
 vec2 uv2=vec2(uv.x+uv.y);
 for(int i=0;i<5;i++){
  uv2+=sin(max(uv.x,uv.y))+uv;
  uv+=0.5*vec2(cos(5.1123314+0.353*uv2.y+speed*0.131121),sin(uv2.x-0.113*speed));
  uv-=cos(uv.x+uv.y)-sin(uv.x*0.711-uv.y);
 }
 float contrast=1.95,amount=clamp(length(uv)*0.035*contrast,0.0,2.0);
 float c1=max(0.0,1.0-contrast*abs(1.0-amount)),c2=max(0.0,1.0-contrast*abs(amount));
 float c3=1.0-min(1.0,c1+c2);
 vec3 gap=mix(baseColor,accentColor,0.3);
 vec3 col=0.12*accentColor+0.88*(accentColor*c1+baseColor*c2+gap*c3);
 gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`,sample(u,v,phase,aspect,base,accent){
 const cu=(Math.floor(u*240)+.5)/240,cv=(Math.floor(v*240)+.5)/240,norm=Math.hypot(aspect,1),ux=(cu-.5)*aspect/norm,uy=(cv-.5)/norm;
 const radius=Math.hypot(ux,uy),angle=Math.atan2(uy,ux)+302.2+.3*Math.sin(phase)+.08*(Math.cos(phase)-1)-20*(.25*radius+.75),speed=4*Math.sin(phase)+Math.cos(phase)-1;
 let x=radius*Math.cos(angle)*30,y=radius*Math.sin(angle)*30,a=x+y,b=x+y;
 for(let i=0;i<5;i++){
  const wave=Math.sin(Math.max(x,y));a+=wave+x;b+=wave+y;
  x+=.5*Math.cos(5.1123314+.353*b+speed*.131121);y+=.5*Math.sin(a-.113*speed);
  const shift=Math.cos(x+y)-Math.sin(x*.711-y);x-=shift;y-=shift;
 }
 const contrast=1.95,amount=Math.min(2,Math.max(0,Math.hypot(x,y)*.035*contrast));
 const c1=Math.max(0,1-contrast*Math.abs(1-amount)),c2=Math.max(0,1-contrast*Math.abs(amount)),c3=1-Math.min(1,c1+c2);
 return base.map((c,i)=>clamp(.12*accent[i]+.88*(accent[i]*c1+c*c2+(c*.7+accent[i]*.3)*c3)));
}};

export const extraPatterns:Record<string,ShaderPattern>={plasma,'gradient-blinds':blinds,'light-rays':lightRays,balatro};
