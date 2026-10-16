export const REACT_BITS_MORE_TEXT = ["rb-shiny", "rb-gradient", "rb-flap", "rb-depth", "rb-tech", "rb-fuzzy", "rb-falling", "rb-rotate"];
export const REACT_BITS_TEXT = ['rb-type','rb-decrypt','rb-shuffle','rb-glitch','rb-focus','rb-fold','rb-echo','rb-stroke',...REACT_BITS_MORE_TEXT];
export const TEXT_DURATION = 6000;
export const isMoreReactBitsText = animation => REACT_BITS_MORE_TEXT.includes(animation);
export const isReactBitsText = animation => REACT_BITS_TEXT.includes(animation);
export const textTempo = pace => pace==='slow'?1.45:pace==='fast'?.7:1;

// One clock for preview, replay and exported frames. The loop closes while hidden.
export function textPlayback(elapsed,pace,repeat,duration=TEXT_DURATION*textTempo(pace),reduced=false){
 if(reduced)return {time:TEXT_DURATION,opacity:1,settled:true};
 const normalized=Math.max(0,elapsed)*TEXT_DURATION/duration;
 const time=repeat?normalized%TEXT_DURATION:Math.min(TEXT_DURATION,normalized);
 const opacity=repeat?Math.min(1,time/150,(TEXT_DURATION-time)/350):1;
 return {time,opacity,settled:!repeat&&normalized>=TEXT_DURATION};
}

// Stable noise: seeking, exporting and replaying produce the same glyphs.
export function textNoise(index,step=0){
 let n=Math.imul(index+1,374761393)^Math.imul(step+1,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967296;
}
