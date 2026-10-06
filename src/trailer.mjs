const graphemes = text => [...new Intl.Segmenter('es', {granularity:'grapheme'}).segment(text)].map(s=>s.segment);

function groups(parts, count, separator) {
 return Array.from({length:count},(_,i)=>parts.slice(Math.floor(i*parts.length/count),Math.floor((i+1)*parts.length/count)).join(separator));
}

/** Explicit lines are beats; a single sentence builds from words to phrases.
 * @param {string} text
 * @returns {string[]}
 */
export function trailerBeats(text) {
 const lines=text.trim().split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length)return [];
 if(lines.length>1)return lines.length<=6?lines:groups(lines,6,'\n');
 const clauses=lines[0].match(/[^.!?;。！？；]+[.!?;。！？；]*|[.!?;。！？；]+/gu)?.map(s=>s.trim()).filter(Boolean)??lines;
 if(clauses.length>1)return clauses.length<=6?clauses:groups(clauses,6,' ');
 const words=lines[0].split(/\s+/u);
 if(words.length>=3&&words.length<=6)return [words[0],words[1],words.slice(2).join(' ')];
 if(words.length>6)return groups(words,Math.min(6,Math.ceil(words.length/3)),' ');
 // Avoid splitting a word or an emoji sequence for the sake of another scene.
 return words;
}

function luminance(hex) {
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function ink(bg, preferred) {
 const l=luminance(bg),p=luminance(preferred);
 if((Math.max(l,p)+.05)/(Math.min(l,p)+.05)>=4.5)return preferred;
 return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff';
}

/** Deterministic, self-contained choreography: nothing is saved except the poster. */
export function buildTrailer(state) {
 const tempo=state.pace==='slow'?1.45:state.pace==='fast'?.7:1;
 const soft=['serif','pacifico','abril'].includes(state.font);
 const motions=soft?['reveal','letters','blur']:['impact','bounce','orbit'];
 let start=0;
 const beats=trailerBeats(state.text);
 const scenes=[...beats,state.text].map((text,index)=>{
  const final=index===beats.length;
  const palette=index%3===1?{bg:state.fg,fg:ink(state.fg,state.bg),accent:state.accent,backdrop:'solid'}:index%3===2?{bg:state.accent,fg:ink(state.accent,state.fg),accent:state.bg,backdrop:'solid'}:{};
  const duration=(final?Math.min(6500,3500+graphemes(text).length*22):Math.min(3800,2500+graphemes(text).length*18))*tempo;
  const scene={state:{...state,...(!final?palette:{}),text,animation:final?'reveal':motions[index%motions.length],repeat:false},start,duration,final};
  start+=duration;
  return scene;
 });
 return {scenes,totalDuration:start};
}

export function trailerPosition(plan, elapsed, repeat) {
 const time=Math.max(0,elapsed),finished=!repeat&&time>=plan.totalDuration;
 const cycle=repeat?Math.floor(time/plan.totalDuration):0;
 const position=repeat?time%plan.totalDuration:Math.min(time,plan.totalDuration);
 const index=finished?plan.scenes.length-1:Math.max(0,plan.scenes.findIndex(s=>position<s.start+s.duration));
 const scene=plan.scenes[index];
 return {index,cycle,finished,localTime:Math.min(scene.duration,position-scene.start),progress:finished?1:position/plan.totalDuration};
}
