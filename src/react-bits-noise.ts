/* Perlin2D port from React Bits Threads, Copyright (c) 2026 David Haz.
 * MIT + Commons Clause: public/licenses/react-bits.txt. */
export function perlin(x:number,y:number){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const fade=(t:number)=>t*t*t*(t*(t*6-15)+10),bx=fade(fx),by=fade(fy);
 let result=0;
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){
  const px=((ix+i)%71+71)%71+26,py=((iy+j)%71+71)%71+161,hash=px*px*py*py;
  const gx=(hash/951.135664)%1-.49999,gy=(hash/642.949883)%1-.49999;
  result+=(gx*(fx-i)+gy*(fy-j))/Math.hypot(gx,gy)*Math.SQRT2*(i?bx:1-bx)*(j?by:1-by);
 }
 return result;
}
