import LZString from 'lz-string';
export const MAX_TEXT = 280;
export const MAX_HASH = 4096;
export const DEFAULT = {v:1,text:'HOY VA A\nSER UN\nGRAN DÍA.',font:'bebas',fg:'#25382c',bg:'#d9f66f',pattern:'none',effect:'none',align:'center',size:90,animation:'none'};
export const PRESETS = [
 {name:'A todo volumen',sample:'QUE SE\nOIGA.',font:'bebas',fg:'#25382c',bg:'#d9f66f',pattern:'none',effect:'none'},
 {name:'Con cariño',sample:'Tú,\nsiempre.',font:'serif',fg:'#812447',bg:'#ffd0e1',pattern:'none',effect:'none'},
 {name:'Noche eléctrica',sample:'BRILLA\nMÁS.',font:'bebas',fg:'#d9f66f',bg:'#3429d6',pattern:'grid',effect:'shadow'},
 {name:'Buen rollo',sample:'TODO\nFLUYE.',font:'sans',fg:'#5b2138',bg:'#ff9c71',pattern:'dots',effect:'none'},
 {name:'Sin rodeos',sample:'MENOS,\nPERO MEJOR.',font:'sans',fg:'#f8f8f2',bg:'#242424',pattern:'none',effect:'none'},
 {name:'Entre líneas',sample:'Quédate\nun rato.',font:'serif',fg:'#272727',bg:'#f3f1eb',pattern:'lines',effect:'none'},
];
const oneOf = (value, values) => values.includes(value);
export function validateState(s) {
 if (!s || typeof s !== 'object' || s.v !== 1) throw new Error('Este enlace usa un formato que todavía no podemos abrir.');
 if (typeof s.text !== 'string' || [...s.text].length > MAX_TEXT || !s.text.trim() || s.text.split('\n').length > 12) throw new Error('El mensaje no es válido: máximo 280 caracteres y 12 líneas.');
 if (!oneOf(s.font,['bebas','serif','sans']) || !oneOf(s.pattern,['none','dots','grid','lines']) || !oneOf(s.effect,['none','shadow','outline']) || !oneOf(s.align,['left','center','right']) || !oneOf(s.animation,['none','reveal','float'])) throw new Error('El diseño del enlace no es válido.');
 if (![s.fg,s.bg].every(c=>typeof c==='string' && /^#[0-9a-fA-F]{6}$/.test(c)) || !Number.isInteger(s.size) || s.size<40 || s.size>100) throw new Error('El diseño del enlace no es válido.');
 return {v:1,text:s.text,font:s.font,fg:s.fg,bg:s.bg,pattern:s.pattern,effect:s.effect,align:s.align,size:s.size,animation:s.animation};
}
export function encodeState(s) {
 const hash = '#v1='+LZString.compressToEncodedURIComponent(JSON.stringify(validateState(s)));
 if(hash.length>MAX_HASH) throw new Error('El enlace es demasiado largo. Acorta un poco el mensaje.');
 return hash;
}
export function decodeState(hash) {
 if(typeof hash!=='string' || hash.length>MAX_HASH || !/^#v1=[A-Za-z0-9+\-$]+$/.test(hash)) throw new Error('Este enlace está incompleto o no es compatible.');
 const json=LZString.decompressFromEncodedURIComponent(hash.slice(4));
 if(!json || json.length>8000) throw new Error('No se puede leer este enlace.');
 try{return validateState(JSON.parse(json));} catch(e) {throw new Error(e instanceof SyntaxError ? 'El enlace no contiene un mensaje válido.' : e.message);}
}
