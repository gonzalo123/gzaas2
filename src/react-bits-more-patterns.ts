/* Dark Veil, Grainient and Liquid Chrome adapted from React Bits by David Haz.
 * MIT + Commons Clause: public/licenses/react-bits.txt.
 * Two colors, periodic phase and matching bounded CPU/GPU equations. */
import type {ShaderPattern} from './silk-renderer';
import {veilGLSL,veilField} from './react-bits-veil';
const header=`precision highp float;uniform vec2 resolution;uniform vec3 baseColor;uniform vec3 accentColor;uniform float phase;`;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(base:number[],accent:number[],n:number,shine=0)=>base.map((v,i)=>clamp(v*(1-n)+accent[i]*n+shine));
const fract=(n:number)=>n-Math.floor(n);
function hash(x:number,y:number){let a=fract(x*.1031),b=fract(y*.103),c=fract(x*.0973);const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=d;b+=d;c+=d;return fract((a+b)*c);}
function noise(x:number,y:number){const ix=Math.floor(x),iy=Math.floor(y);let fx=fract(x),fy=fract(y);fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;}
const noiseGLSL=`float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.103,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;

const darkVeil:ShaderPattern={softwareSize:240,fragment:header+veilGLSL+`
void main(){vec2 p=(gl_FragCoord.xy/resolution*2.-1.)*vec2(resolution.x/resolution.y,1.);
float a=.06*sin(phase);p=mat2(cos(a),sin(a),-sin(a),cos(a))*p;p+=.08*vec2(cos(phase),sin(phase));
vec3 latent=vec3(.5)+.12*vec3(cos(phase),sin(phase),sin(2.*phase));vec3 v=cppn(p*1.4,latent).rgb;
float n=clamp(dot(v,vec3(.25,.35,.4))*1.8,0.,1.);gl_FragColor=vec4(mix(baseColor*.65,accentColor,n*.8),1.);}`,sample(u,v,p,aspect,base,accent){
 const x=(u*2-1)*aspect,y=v*2-1,a=.06*Math.sin(p),c=Math.cos(a),s=Math.sin(a);
 const n=clamp(veilField((c*x-s*y+.08*Math.cos(p))*1.4,(s*x+c*y+.08*Math.sin(p))*1.4,.5+.12*Math.cos(p),.5+.12*Math.sin(p),.5+.12*Math.sin(2*p))*1.8);
 return mix(base.map(c=>c*.65),accent,n*.8);
}};

// Grainient's nested drifting coordinate field, with canonical film grain.
const grainient:ShaderPattern={softwareSize:320,fragment:header+noiseGLSL+`
void main(){vec2 p=(gl_FragCoord.xy/resolution-.5)*vec2(resolution.x/resolution.y,1.);vec2 t=.45*vec2(cos(phase),sin(phase));
vec2 w=vec2(noise(p*.85+t),noise(p*.85+vec2(4.1,1.7)-t));
vec2 z=vec2(noise(p*1.55+w*1.8+vec2(1.3,7.1)+t),noise(p*1.55+w*1.8+vec2(6.4,2.2)-t));
p+=(w-.5)*1.1+(z-.5)*.55;float n=.5+.5*sin((p.x*.7+p.y*.8)*6.283);
n=n*n*(3.-2.*n);float grain=(hash(floor(gl_FragCoord.xy/resolution*320.))-.5)*.055;
gl_FragColor=vec4(clamp(mix(baseColor,accentColor,n*.85)+grain,0.,1.),1.);}`,sample(u,v,p,aspect,base,accent){
 let x=(u-.5)*aspect,y=v-.5;const tx=.45*Math.cos(p),ty=.45*Math.sin(p),wx=noise(x*.85+tx,y*.85+ty),wy=noise(x*.85+4.1-tx,y*.85+1.7-ty);
 const zx=noise(x*1.55+wx*1.8+1.3+tx,y*1.55+wy*1.8+7.1+ty),zy=noise(x*1.55+wx*1.8+6.4-tx,y*1.55+wy*1.8+2.2-ty);
 x+=(wx-.5)*1.1+(zx-.5)*.55;y+=(wy-.5)*1.1+(zy-.5)*.55;
 let n=.5+.5*Math.sin((x*.7+y*.8)*6.283);n=n*n*(3-2*n);
 return mix(base,accent,n*.85,(hash(Math.floor(u*320),Math.floor(v*320))-.5)*.055);
}};

// Liquid Chrome's iterative cosine domain warp and analytic slope lighting.
const chrome:ShaderPattern={softwareSize:320,fragment:header+`
void main(){vec2 p=(gl_FragCoord.xy/resolution*2.-1.)*resolution/min(resolution.x,resolution.y);vec2 rx=vec2(1,0),ry=vec2(0,1);float time=1.2*sin(phase)+.3*cos(phase);
for(int j=1;j<=6;j++){float i=float(j),a=.65/i,soften=exp(.3-.3*i),ax=i*2.2*p.y+time;p.x+=a*cos(ax);rx-=a*sin(ax)*i*2.2*soften*ry;float ay=i*2.2*p.x+time;p.y+=a*cos(ay);ry-=a*sin(ay)*i*2.2*soften*rx;}
float wave=time-p.x-p.y,sn=sin(wave),th=(exp(2.*sn)-1.)/(exp(2.*sn)+1.);vec2 f=-(rx+ry);vec2 slope=cos(wave)*(1.-th*th)*2.6*f/max(length(f),.001);
vec3 n=normalize(vec3(-slope,1.));float key=pow(max(0.,dot(n,normalize(vec3(-.5,.65,1.)))),8.);float edge=pow(1.-abs(n.z),2.);
float light=clamp(.08+.78*key+.55*edge,0.,1.);gl_FragColor=vec4(clamp(mix(baseColor*.45,accentColor,light)+key*.22,0.,1.),1.);}`,sample(u,v,p,aspect,base,accent){
 let x=(u*2-1)*Math.max(1,aspect),y=(v*2-1)*Math.max(1,1/aspect),rx0=1,rx1=0,ry0=0,ry1=1;const time=1.2*Math.sin(p)+.3*Math.cos(p);
 for(let i=1;i<=6;i++){const a=.65/i,soften=Math.exp(.3-.3*i),ax=i*2.2*y+time;x+=a*Math.cos(ax);const sx=a*Math.sin(ax)*i*2.2*soften;rx0-=sx*ry0;rx1-=sx*ry1;const ay=i*2.2*x+time;y+=a*Math.cos(ay);const sy=a*Math.sin(ay)*i*2.2*soften;ry0-=sy*rx0;ry1-=sy*rx1;}
 const wave=time-x-y,sn=Math.sin(wave),th=Math.tanh(sn),fx=-(rx0+ry0),fy=-(rx1+ry1),d=Math.max(Math.hypot(fx,fy),.001),k=Math.cos(wave)*(1-th*th)*2.6,nx=-k*fx/d,ny=-k*fy/d,norm=Math.hypot(nx,ny,1),ld=Math.hypot(-.5,.65,1);
 const key=Math.max(0,(nx*-.5+ny*.65+1)/norm/ld)**8,edge=(1-1/norm)**2,light=clamp(.08+.78*key+.55*edge);
 return mix(base.map(c=>c*.45),accent,light,key*.22);
}};
export const morePatterns:Record<string,ShaderPattern>={'dark-veil':darkVeil,grainient,'liquid-chrome':chrome};
