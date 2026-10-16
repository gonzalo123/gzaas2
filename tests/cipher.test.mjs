import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CIPHER_DELAY,CIPHER_DURATION,cipherFrame} from '../src/cipher.mjs';
const split=text=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),s=>s.segment);

test('cipher reveals a stable prefix, preserves punctuation and settles without looping',()=>{
 const text='¡Sí, tú 👩🏽‍💻! 2026.',letters=split(text);
 let previous=0;
 for(let elapsed=0;elapsed<=CIPHER_DELAY+CIPHER_DURATION+100;elapsed+=40){
  const frame=cipherFrame(letters,elapsed),decoded=letters.flatMap((letter,i)=>/[\p{L}\p{N}]/u.test(letter)?[frame.glyphs[i].decoded]:[]);
  const count=decoded.filter(Boolean).length;assert.ok(count>=previous);previous=count;
  const first=decoded.indexOf(false);if(first>=0)assert.ok(decoded.slice(first).every(value=>!value));
  letters.forEach((letter,i)=>{if(!/[\p{L}\p{N}]/u.test(letter))assert.equal(frame.glyphs[i].text,letter);});
 }
 for(const elapsed of [CIPHER_DELAY+CIPHER_DURATION,10000,90000]){
  const frame=cipherFrame(letters,elapsed);assert.equal(frame.complete,true);
  assert.equal(frame.glyphs.map(g=>g.text).join(''),text);assert.ok(frame.glyphs.every(g=>g.decoded&&g.opacity===1));
 }
});

test('cipher is reproducible, respects case and completes immediately for reduced motion',()=>{
 const letters=split('Tus mensajes');
 assert.ok(cipherFrame(letters,0).glyphs.every(g=>g.opacity===0));
 const time=CIPHER_DELAY+120,frame=cipherFrame(letters,time);
 assert.deepEqual(frame,cipherFrame(letters,time));
 assert.notDeepEqual(frame.glyphs.map(g=>g.text),cipherFrame(letters,time+80).glyphs.map(g=>g.text));
 frame.glyphs.forEach((glyph,i)=>{if(!glyph.decoded&&/[a-z]/.test(letters[i]))assert.ok(!/[A-Z]/.test(glyph.text));});
 const reduced=cipherFrame(letters,0,true);assert.equal(reduced.complete,true);
 assert.equal(reduced.glyphs.map(g=>g.text).join(''),'Tus mensajes');assert.ok(reduced.glyphs.every(g=>g.opacity===1));
 assert.equal(cipherFrame([],0).complete,true);
});
