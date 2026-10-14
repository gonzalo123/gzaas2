import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import english from '../src/locales/en.mjs';
import {detectLocale,readLocale,translate,LOCALE_KEY,setLocale,getLocale,subscribeLocale} from '../src/i18n.mjs';
import {ANIMATIONS,BACKDROPS,COLLECTIONS,FONTS,PRESETS} from '../src/state.mjs';

test('language negotiation uses saved choice, then ordered browser languages, then English',()=>{
 assert.equal(detectLocale('es',['en-US']),'es');
 assert.equal(detectLocale('en',['es-ES']),'en');
 for(const regional of ['es-ES','es-MX','ES_ar'])assert.equal(detectLocale(null,[regional]),'es');
 assert.equal(detectLocale(null,['fr-FR','es-ES','en']),'es');
 assert.equal(detectLocale('invalid',['en-GB','es']),'en');
 assert.equal(detectLocale(null,['de-DE']),'en');assert.equal(detectLocale(null,[]),'en');
});
test('blocked storage and invalid preferences fall back without crashing',()=>{
 assert.equal(readLocale({getItem(){throw Error('SecurityError');}},['es-MX']),'es');
 assert.equal(readLocale({getItem:key=>key===LOCALE_KEY?'en':null},['es']),'en');
 assert.equal(readLocale({getItem:()=>'{"locale":"es"}'},['en']),'en');
});
test('locale store notifies once per real change, persists explicit choices and tolerates denied writes',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const writes=[];Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(...args)=>writes.push(args)}});
 let updates=0;const unsubscribe=subscribeLocale(()=>updates++);
 try{
  const next=getLocale()==='en'?'es':'en';setLocale(next);setLocale(next);setLocale('xx');
  assert.equal(updates,1);assert.equal(getLocale(),next);assert.deepEqual(writes,[[LOCALE_KEY,next],[LOCALE_KEY,next]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('SecurityError');}});
  const other=next==='en'?'es':'en';setLocale(other);assert.equal(getLocale(),other);assert.equal(updates,2);
  unsubscribe();setLocale(next);assert.equal(updates,2);
 }finally{unsubscribe();if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
test('translation interpolates data once and keeps placeholder sets in sync',()=>{
 assert.equal(translate('Tu mensaje','es'),'Tu mensaje');assert.equal(translate('Tu mensaje','en'),'Your message');
 assert.equal(translate('constructor','en'),'constructor');
 assert.equal(translate('Ver escena {number}: {text}','en',{number:2,text:'<img> {number}'}),'View scene 2: <img> {number}');
 for(const [source,target] of Object.entries(english)){
  assert.ok(target.trim());
  const parameters=value=>[...value.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
  assert.deepEqual(parameters(source),parameters(target),source);
 }
});
test('every UI translation key and localized style description has an English entry',()=>{
 const unchanged=new Set(['Particle Galaxy 3D','Fade in / out','STAY\nWILD','AFTER\nHOURS','KEEP\nDREAMING','DANCE\nWITH ME','MAKE\nSOME NOISE','OH\nYEAH!','LEVEL\nUP!','GOOD\nVIBES','SO\nSWEET','Take it\neasy.','GROOVY\nBABY','Believe\nin magic.']);
 const keys=[...ANIMATIONS.flatMap(a=>[a.name,a.description]),...BACKDROPS.map(b=>b.name),...COLLECTIONS,...FONTS.map(f=>f.mood),...PRESETS.flatMap(p=>[p.name,p.sample])];
 for(const file of readdirSync('src').filter(f=>f.endsWith('.tsx'))){
  const ast=ts.createSourceFile(file,readFileSync('src/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='t'&&ts.isStringLiteral(node.arguments[0]))keys.push(node.arguments[0].text);ts.forEachChild(node,visit);}visit(ast);
 }
 for(const key of keys)assert.ok(Object.hasOwn(english,key)||unchanged.has(key),`Missing translation: ${key}`);
});
