// Style roulette: fast flashes that decelerate and land on a chosen preset.
import {ANIMATIONS,BACKDROPS,PRESETS} from './state.mjs';
export const ROULETTE_STEPS = 7;
// The welcome logo uses brief entrances; created posters use the full catalog.
export const LANDING_ANIMATIONS = ['letters','bounce','orbit','rb-fold','rb-echo'];

/** Pick palette, background and motion independently across the full catalogs.
 * @param {{bg?:string,backdrop?:string,animation?:string}|undefined} current
 * @param {()=>number} random
 */
export function randomStyle(current,random=Math.random){
  const presets=PRESETS.map((preset,index)=>({preset,index})).filter(({preset})=>preset.bg!==current?.bg);
  const backgrounds=BACKDROPS.filter(background=>background.id!==current?.backdrop);
  const animations=ANIMATIONS.filter(animation=>animation.id!==current?.animation);
  const {preset,index}=presets[Math.floor(random()*presets.length)];
  const {name,sample,...style}=preset;
  return {index,style:{...style,backdrop:backgrounds[Math.floor(random()*backgrounds.length)].id,animation:animations[Math.floor(random()*animations.length)].id,backdropMotion:true}};
}

// Delays ease out from ~70 ms to ~380 ms (≈1.4 s in total).
export function rouletteSchedule(steps = ROULETTE_STEPS) {
  const first = 70, last = 380;
  return Array.from({length: steps}, (_, i) => {
    const t = steps === 1 ? 1 : i / (steps - 1);
    return Math.round(first + (last - first) * t * t);
  });
}

// Indices of the presets flashed before landing on `finalIndex`.
// No index repeats consecutively and none equals the final one.
export function rouletteSequence(count, finalIndex, steps = ROULETTE_STEPS, random = Math.random) {
  if (count < 3) return [];
  const sequence = [];
  let previous = -1;
  for (let i = 0; i < steps - 1; i++) {
    const pool = [];
    for (let c = 0; c < count; c++) if (c !== previous && c !== finalIndex) pool.push(c);
    previous = pool[Math.floor(random() * pool.length)];
    sequence.push(previous);
  }
  return sequence;
}
