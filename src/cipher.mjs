import {textNoise} from './text-motion.mjs';

// Original DOM choreography; no React Bits Pro code is used.
export const CIPHER_DELAY=500;
export const CIPHER_DURATION=1200;
export const CIPHER_ALPHABET='abcdefghjkmnoprstuvxyz0123456789';
const isLetter=char=>/[\p{L}\p{N}]/u.test(char);

export function cipherFrame(graphemes,elapsed,reduced=false){
 const complete=reduced||elapsed>=CIPHER_DELAY+CIPHER_DURATION||!graphemes.length;
 const progress=Math.max(0,Math.min(1,(elapsed-CIPHER_DELAY)/CIPHER_DURATION));
 const count=graphemes.filter(isLetter).length,revealed=Math.floor(progress*count);
 const fade=complete?1:Math.max(0,Math.min(1,(elapsed-CIPHER_DELAY)/100));
 let index=0;
 return {complete,glyphs:graphemes.map((char,i)=>{
  const decoded=complete||!isLetter(char)||index++<revealed;
  const pool=char===char.toLocaleUpperCase()?CIPHER_ALPHABET.toUpperCase():CIPHER_ALPHABET;
  return {text:decoded?char:pool[Math.floor(textNoise(i,Math.floor(elapsed/80))*pool.length)],decoded,opacity:fade*(decoded?1:.36)};
 })};
}
