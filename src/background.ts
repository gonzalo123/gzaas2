import type {Poster} from './render';

type Stop={at:number;color:string;alpha:number};
type Shape={kind:'rect'|'ellipse'|'path';x?:number;y?:number;w?:number;h?:number;cx?:number;cy?:number;rx?:number;ry?:number;d?:string;fill:string;opacity:number;motion?:string};
type Gradient={id:string;kind:'radial'|'linear';stops:Stop[]};
export function backdropScene(s:Poster,w:number,h:number){
 const unit=Math.min(w,h),gradients:Gradient[]=[],shapes:Shape[]=[];
 const rect=(fill:string,opacity=1,motion?:string,x=0,y=0,width=w,height=h)=>shapes.push({kind:'rect',x,y,w:width,h:height,fill,opacity,motion});
 const ellipse=(cx:number,cy:number,rx:number,ry:number,fill:string,opacity=1,motion?:string)=>shapes.push({kind:'ellipse',cx,cy,rx,ry,fill,opacity,motion});
 const glow=(id:string,color:string)=>{gradients.push({id,kind:'radial',stops:[{at:0,color,alpha:.85},{at:.5,color,alpha:.4},{at:1,color,alpha:0}]});return id;};
 rect(s.bg);
 if(s.backdrop==='aurora'||s.backdrop==='mesh'){
  const a=glow('a',s.accent),b=glow('b',s.backdrop==='aurora'?s.fg:s.accent);
  ellipse(w*.18,h*.22,w*.68,h*.68,a,.85,'drift');
  ellipse(w*.85,h*.8,w*.6,h*.75,b,s.backdrop==='aurora'?.2:.75,'breathe');
  ellipse(w*.75,h*.1,w*.42,h*.48,a,.6,'drift-reverse');
 }
 if(s.backdrop==='sunset'){
  gradients.push({id:'sunset',kind:'linear',stops:[{at:0,color:s.bg,alpha:1},{at:1,color:s.accent,alpha:1}]});rect('sunset');
  ellipse(w*.77,h*.23,unit*.19,unit*.19,'#fff4c5',.45,'breathe');
  for(let i=0;i<3;i++)shapes.push({kind:'path',d:`M0 ${h*(.75+i*.08)} Q${w*.35} ${h*(.45+i*.12)} ${w} ${h*(.8+i*.09)} V${h} H0Z`,fill:s.bg,opacity:.1+i*.04,motion:'wave'});
 }
 if(s.backdrop==='rays'){
  const radius=Math.hypot(w,h)*1.4,cx=w/2,cy=h/2;
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,b=a+Math.PI/12;
   shapes.push({kind:'path',d:`M${cx} ${cy} L${cx+Math.cos(a)*radius} ${cy+Math.sin(a)*radius} L${cx+Math.cos(b)*radius} ${cy+Math.sin(b)*radius}Z`,fill:s.accent,opacity:.32,motion:'spin'});
  }
 }
 if(s.backdrop==='stars'){
  ellipse(w*.75,h*.3,w*.7,h*.8,glow('galaxy',s.accent),.55,'drift');
  for(let i=0;i<48;i++)ellipse(((i*.61803398875)%1)*w,((i*.41421356237+.13)%1)*h,unit*(i%4===0?.003:.0015),unit*(i%4===0?.003:.0015),s.fg,.2+(i%5)*.1,'twinkle');
 }
 if(s.backdrop==='checker'){
  const tile=unit/7;
  for(let x=-tile;x<w+tile;x+=tile)for(let y=-tile;y<h+tile;y+=tile)if((Math.round(x/tile)+Math.round(y/tile))%2===0)rect(s.accent,.24,'checker',x,y,tile,tile);
 }
 if(s.backdrop==='waves'){
  for(let i=0;i<6;i++){
   const y=h*(.24+i*.15);
   shapes.push({kind:'path',d:`M${-w*.1} ${y} Q${w*.25} ${y-h*.27} ${w*.5} ${y} T${w*1.1} ${y} V${h*1.3} H${-w*.1}Z`,fill:i%2?s.bg:s.accent,opacity:i%2?.7:.26,motion:'wave'});
  }
 }
 return {gradients,shapes};
}

export function paintBackdrop(ctx:CanvasRenderingContext2D,s:Poster,w:number,h:number,scene=backdropScene(s,w,h),sample?:(index:number)=>{matrix:DOMMatrixReadOnly;opacity:number}){
 const {gradients,shapes}=scene;
 for(const [index,shape] of shapes.entries()){
  ctx.save();const motion=sample?.(index);ctx.globalAlpha=motion?.opacity??shape.opacity;
  if(motion){const m=motion.matrix;ctx.translate(w/2,h/2);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.translate(-w/2,-h/2);}
  if(shape.kind==='ellipse'){ctx.translate(shape.cx!,shape.cy!);ctx.scale(shape.rx!,shape.ry!);}
  const definition=gradients.find(g=>g.id===shape.fill);
  if(definition){
   const gradient=definition.kind==='radial'?ctx.createRadialGradient(0,0,0,0,0,1):ctx.createLinearGradient(0,0,w,h);
   for(const stop of definition.stops)gradient.addColorStop(stop.at,stop.color+Math.round(stop.alpha*255).toString(16).padStart(2,'0'));
   ctx.fillStyle=gradient;
  }else ctx.fillStyle=shape.fill;
  if(shape.kind==='rect')ctx.fillRect(shape.x!,shape.y!,shape.w!,shape.h!);
  else if(shape.kind==='ellipse'){ctx.beginPath();ctx.arc(0,0,1,0,2*Math.PI);ctx.fill();}
  else ctx.fill(new Path2D(shape.d));
  ctx.restore();
 }
}
