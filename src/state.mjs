import LZString from 'lz-string';
export const MAX_TEXT = 280;
export const MAX_HASH = 4096;
export const FONTS = [
 {id:'bebas',name:'Bebas Neue',family:'Bebas Neue',mood:'Contundente',weight:400},
 {id:'serif',name:'DM Serif',family:'DM Serif Display',mood:'Editorial',weight:400},
 {id:'sans',name:'DM Sans',family:'DM Sans',mood:'Directa',weight:800},
 {id:'anton',name:'Anton',family:'Anton',mood:'Gigante',weight:400},
 {id:'bungee',name:'Bungee',family:'Bungee',mood:'Pop',weight:400},
 {id:'shade',name:'Bungee Shade',family:'Bungee Shade',mood:'Retro 3D',weight:400},
 {id:'monoton',name:'Monoton',family:'Monoton',mood:'Disco',weight:400},
 {id:'marker',name:'Permanent Marker',family:'Permanent Marker',mood:'Rebelde',weight:400},
 {id:'pacifico',name:'Pacifico',family:'Pacifico',mood:'Con flow',weight:400},
 {id:'righteous',name:'Righteous',family:'Righteous',mood:'Futurista',weight:400},
 {id:'space',name:'Space Grotesk',family:'Space Grotesk',mood:'Geométrica',weight:700},
 {id:'abril',name:'Abril Fatface',family:'Abril Fatface',mood:'Dramática',weight:400},
];
export const BACKDROPS = [
 {id:'solid',name:'Liso'}, {id:'silk',name:'Seda (Silk)'}, {id:'aurora',name:'Aurora'}, {id:'mesh',name:'Nubes'}, {id:'sunset',name:'Atardecer'},
 {id:'rays',name:'Rayos'}, {id:'stars',name:'Constelación'}, {id:'checker',name:'Ajedrez'}, {id:'waves',name:'Ondas'},
 {id:'iridescence',name:'Iridescencia'}, {id:'threads',name:'Hilos'}, {id:'color-bends',name:'Color Bends'},
 {id:'plasma',name:'Plasma'}, {id:'gradient-blinds',name:'Persianas'}, {id:'light-rays',name:'Rayos de luz'}, {id:'balatro',name:'Balatro'},
 {id:'orb',name:'Orbe'}, {id:'lightning',name:'Relámpagos'}, {id:'dither',name:'Trama retro'}, {id:'dot-grid',name:'Puntos vivos'},
 {id:'ripple-grid',name:'Cuadrícula líquida'}, {id:'waves-lines',name:'Ondas de líneas'}, {id:'pixel-snow',name:'Nieve pixelada'}, {id:'floating-lines',name:'Líneas flotantes'},
 {"id": "dark-veil", "name": "Velo oscuro"},
 {"id": "grainient", "name": "Grano fluido"},
 {"id": "liquid-chrome", "name": "Cromo líquido"},
 {"id": "prism", "name": "Prisma"},
 {"id": "light-pillar", "name": "Pilar de luz"},
 {"id": "grid-scan", "name": "Escáner 3D"},
 {"id": "pixel-blast", "name": "Explosión píxel"},
 {"id": "galaxy", "name": "Galaxia"},
];
export const REACT_BITS_LATEST_BACKDROPS = ["dark-veil", "grainient", "liquid-chrome", "prism", "light-pillar", "grid-scan", "pixel-blast", "galaxy"];
export const REACT_BITS_MORE_BACKDROPS = ['orb','lightning','dither','dot-grid','ripple-grid','waves-lines','pixel-snow','floating-lines'];
export const REACT_BITS_BACKDROPS = ['silk','iridescence','threads','color-bends','plasma','gradient-blinds','light-rays','balatro',...REACT_BITS_MORE_BACKDROPS,...REACT_BITS_LATEST_BACKDROPS];
export const BACKDROP_COLLECTIONS = [
 {name:'Ambientes y gráficos',ids:['solid','aurora','mesh','sunset','rays','stars','checker','waves']},
 {name:'React Bits',ids:REACT_BITS_BACKDROPS.slice(0,8)},
 {name:'React Bits II',ids:REACT_BITS_MORE_BACKDROPS},
 {name:'React Bits III',ids:REACT_BITS_LATEST_BACKDROPS},
];
export const isReactBitsBackdrop = id => REACT_BITS_BACKDROPS.includes(id);
export const backdropCollection = id => Math.max(0,BACKDROP_COLLECTIONS.findIndex(collection=>collection.ids.includes(id)));
export const COLLECTIONS = ['Esenciales','Noche y neón','Pop y retro','Con carácter'];
export const ANIMATIONS = [
 {"id": "rb-shiny", "name": "Destello", "description": "Shiny Text · Un reflejo de luz recorre las letras.", "mark": "✧", "group": "react-bits-ii"},
 {"id": "rb-gradient", "name": "Degradado vivo", "description": "Gradient Text · Los colores fluyen dentro del mensaje.", "mark": "◒", "group": "react-bits-ii"},
 {"id": "rb-flap", "name": "Panel mecánico", "description": "Split Flap Text · Las letras giran como un panel de estación.", "mark": "▤", "group": "react-bits-ii"},
 {"id": "rb-depth", "name": "Profundidad", "description": "Depth Text · Capas de volumen dan relieve al texto.", "mark": "▱", "group": "react-bits-ii"},
 {"id": "rb-tech", "name": "Trazo técnico", "description": "Tech Text · Trazos discontinuos y guías construyen el mensaje.", "mark": "⌁", "group": "react-bits-ii"},
 {"id": "rb-fuzzy", "name": "Texto difuso", "description": "Fuzzy Text · Una vibración de líneas se resuelve en letras nítidas.", "mark": "≋", "group": "react-bits-ii"},
 {"id": "rb-falling", "name": "Caída libre", "description": "Falling Text · Las palabras caen y regresan a su sitio.", "mark": "↡", "group": "react-bits-ii"},
 {"id": "rb-rotate", "name": "Giro de palabras", "description": "Rotating Text · Las palabras giran y revelan el mensaje completo.", "mark": "↶", "group": "react-bits-ii"},

 {"id": "rb-type", "name": "Escritura", "description": "Text Type · El mensaje se escribe con un cursor, sin mover las líneas.", "mark": "A|", "group": "react-bits"},
 {"id": "rb-decrypt", "name": "Descifrar", "description": "Decrypted Text · Los símbolos revelan tu mensaje, letra a letra.", "mark": "#", "group": "react-bits"},
 {"id": "rb-shuffle", "name": "Barajar", "description": "Shuffle · Las letras se reordenan hasta encontrar su sitio.", "mark": "⤨", "group": "react-bits"},
 {"id": "rb-glitch", "name": "Glitch", "description": "Glitch Text · Interferencias breves que terminan en un mensaje nítido.", "mark": "ϟ", "group": "react-bits"},
 {"id": "rb-focus", "name": "Foco por palabras", "description": "True Focus · Un marco sigue cada palabra antes de enfocar todo el mensaje.", "mark": "⌗", "group": "react-bits"},
 {"id": "rb-fold", "name": "Plegado", "description": "Fold Text · Las líneas se despliegan como papel.", "mark": "⋈", "group": "react-bits"},
 {"id": "rb-echo", "name": "Estelas", "description": "Echo Text · Varias siluetas siguen al texto y se funden en una.", "mark": "≋", "group": "react-bits"},
 {"id": "rb-stroke", "name": "Trazado", "description": "Stroke Text · Primero el contorno, después el color.", "mark": "✎", "group": "react-bits"},
 {id:'particle-galaxy',name:'Particle Galaxy 3D',description:'Una galaxia se convierte en letras con volumen. Arrastra para explorar; toca para dispersar.',mark:'✺',group:'particles'},
 {id:'particle-assemble',name:'Ensamblar',description:'Particle Assemble · Una nube de luz encuentra las letras. Repite para volver a verla.',mark:'✦',group:'particles'},
 {id:'particle-explode',name:'Explosión',description:'Explode & Reform · El mensaje estalla y vuelve a formarse.',mark:'✷',group:'particles'},
 {id:'particle-vortex',name:'Vórtice',description:'Particle Vortex · Una espiral de partículas se convierte en tu mensaje.',mark:'◎',group:'particles'},
 {id:'trailer',name:'Modo Tráiler',description:'Tu mensaje, convertido en una secuencia de escenas.',mark:'▶'},
 {id:'letters',name:'Letra a letra',description:'Un mensaje que se construye letra a letra.',mark:'Ab',group:'letters'},
 {id:'wave',name:'Ola',description:'Una ola recorre cada letra.',mark:'∿',group:'letters'},
 {id:'bounce',name:'Rebote',description:'Las letras aterrizan con energía.',mark:'↟',group:'letters'},
 {id:'orbit',name:'Remolino',description:'Cada letra encuentra su sitio.',mark:'↻',group:'letters'},
 {id:'cascade',name:'Palabra a palabra',description:'Cada palabra tiene su momento.',mark:'Aa'},
 {id:'impact',name:'Impacto',description:'Una entrada que se hace sentir.',mark:'!'},
 {id:'blur',name:'En foco',description:'Del desenfoque a la claridad.',mark:'◎'},
 {id:'fade',name:'Fade in / out',description:'Aparece, respira y se desvanece.',mark:'◐'},
 {id:'reveal',name:'Deslizar',description:'Las líneas entran suavemente.',mark:'↗'},
 {id:'float',name:'Flotar',description:'Un movimiento lento y ligero.',mark:'≈'},
 {id:'none',name:'Sin movimiento',description:'Todo el peso, en las palabras.',mark:'—'},
];
export const DEFAULT = {galaxyQuality:'auto',galaxyCamera:true,trailerGalaxy:false,trailerMix:false,trailerSeed:0,trailerParticles:false,particleDensity:2,particleInteraction:true,v:1,text:'HOY VA A\nSER UN\nGRAN DÍA.',font:'bebas',fg:'#25382c',bg:'#d9f66f',pattern:'none',effect:'none',align:'center',size:90,animation:'letters',pace:'normal',repeat:true,backdrop:'mesh',accent:'#b7ec46',backdropMotion:true};
export const PRESETS = [
 {name:'A todo volumen',sample:'QUE SE\nOIGA.',font:'bebas',fg:'#25382c',bg:'#d9f66f',pattern:'none',effect:'none',animation:'letters',backdrop:'mesh',accent:'#b7ec46',backdropMotion:true},
 {name:'Con cariño',sample:'Tú,\nsiempre.',font:'serif',fg:'#812447',bg:'#ffd0e1',pattern:'none',effect:'none',animation:'fade'},
 {name:'Noche eléctrica',sample:'BRILLA\nMÁS.',font:'bebas',fg:'#d9f66f',bg:'#3429d6',pattern:'grid',effect:'shadow',animation:'blur'},
 {name:'Buen rollo',sample:'TODO\nFLUYE.',font:'sans',fg:'#5b2138',bg:'#ff9c71',pattern:'dots',effect:'none',animation:'float'},
 {name:'Sin rodeos',sample:'MENOS,\nPERO MEJOR.',font:'sans',fg:'#f8f8f2',bg:'#242424',pattern:'none',effect:'none',animation:'impact'},
 {name:'Entre líneas',sample:'Quédate\nun rato.',font:'serif',fg:'#272727',bg:'#f3f1eb',pattern:'lines',effect:'none',animation:'reveal'},
 {name:'Neón rosa',sample:'STAY\nWILD',font:'monoton',fg:'#ff9dea',bg:'#110620',accent:'#9b28ee',backdrop:'aurora',effect:'neon',animation:'wave'},
 {name:'Club nocturno',sample:'AFTER\nHOURS',font:'bungee',fg:'#fff68f',bg:'#16092b',accent:'#e72586',backdrop:'rays',animation:'impact'},
 {name:'Otra galaxia',sample:'SIN\nLÍMITES',font:'anton',fg:'#68dcff',bg:'#030817',accent:'#eb62dc',backdrop:'solid',animation:'particle-galaxy'},
 {name:'Aurora boreal',sample:'KEEP\nDREAMING',font:'righteous',fg:'#dcffe7',bg:'#092a2d',accent:'#29c5a4',backdrop:'aurora',animation:'blur'},
 {name:'Disco fever',sample:'DANCE\nWITH ME',font:'monoton',fg:'#ffea79',bg:'#33104c',accent:'#c53387',backdrop:'mesh',effect:'neon',animation:'orbit'},
 {name:'Cian eléctrico',sample:'MAKE\nSOME NOISE',font:'anton',fg:'#9bfaff',bg:'#09171d',accent:'#08728e',backdrop:'waves',effect:'neon',animation:'bounce'},
 {name:'Pop total',sample:'OH\nYEAH!',font:'bungee',fg:'#4a174c',bg:'#ffe44e',accent:'#ffacbd',backdrop:'rays',effect:'echo',animation:'bounce'},
 {name:'Retro arcade',sample:'LEVEL\nUP!',font:'shade',fg:'#fffab3',bg:'#6232c6',accent:'#ff68b6',backdrop:'checker',animation:'letters'},
 {name:'Verano infinito',sample:'GOOD\nVIBES',font:'righteous',fg:'#4a224c',bg:'#ff7089',accent:'#ffd477',backdrop:'sunset',animation:'wave'},
 {name:'Chicle',sample:'SO\nSWEET',font:'abril',fg:'#733264',bg:'#ffd4eb',accent:'#efa0c8',backdrop:'mesh',animation:'orbit'},
 {name:'Surf club',sample:'Take it\neasy.',font:'pacifico',fg:'#fff6d8',bg:'#136b91',accent:'#24bda9',backdrop:'waves',animation:'float'},
 {name:'Muy de los 70',sample:'GROOVY\nBABY',font:'shade',fg:'#5b241e',bg:'#edbe67',accent:'#da6e37',backdrop:'rays',animation:'impact'},
 {name:'Sin permiso',sample:'ROMPE\nLAS REGLAS',font:'marker',fg:'#f6ff63',bg:'#202320',accent:'#52613a',backdrop:'checker',animation:'bounce'},
 {name:'Una declaración',sample:'Amor\na lo grande.',font:'abril',fg:'#fff0d9',bg:'#992e48',accent:'#ef7382',backdrop:'mesh',animation:'fade'},
 {name:'Firma personal',sample:'Sé tú.\nSiempre.',font:'marker',fg:'#293734',bg:'#f2efdf',accent:'#a9c1a9',backdrop:'solid',animation:'letters'},
 {name:'Un poco de magia',sample:'Believe\nin magic.',font:'pacifico',fg:'#f5edff',bg:'#241146',accent:'#754aa6',backdrop:'stars',animation:'float'},
 {name:'Luz de mañana',sample:'TODO\nEMPIEZA.',font:'anton',fg:'#523933',bg:'#f7b392',accent:'#ffe6af',backdrop:'sunset',animation:'reveal'},
 {name:'Manifiesto',sample:'HAZLO\nTUYO.',font:'space',fg:'#fff7ed',bg:'#c94520',accent:'#f7aa47',backdrop:'waves',effect:'echo',animation:'cascade'},
].map(p=>({pattern:'none',effect:'none',backdrop:'solid',accent:'#8b5cf6',backdropMotion:true,...p}));
const oneOf = (value, values) => values.includes(value);
export function validateState(s) {
 if (!s || typeof s !== 'object' || s.v !== 1) throw new Error('Este enlace usa un formato que todavía no podemos abrir.');
 if (typeof s.text !== 'string' || [...s.text].length > MAX_TEXT || !s.text.trim() || s.text.split('\n').length > 12) throw new Error('El mensaje no es válido: máximo 280 caracteres y 12 líneas.');
 if (!oneOf(s.font,FONTS.map(f=>f.id)) || !oneOf(s.pattern,['none','dots','grid','lines']) || !oneOf(s.effect,['none','shadow','outline','neon','echo']) || !oneOf(s.align,['left','center','right']) || !oneOf(s.animation,ANIMATIONS.map(a=>a.id)) || (s.pace!==undefined&&!oneOf(s.pace,['slow','normal','fast'])) || (s.repeat!==undefined&&typeof s.repeat!=='boolean') || (s.backdrop!==undefined&&!oneOf(s.backdrop,BACKDROPS.map(b=>b.id))) || (s.backdropMotion!==undefined&&typeof s.backdropMotion!=='boolean')) throw new Error('El diseño del enlace no es válido.');
 if((s.trailerMix!==undefined&&typeof s.trailerMix!=='boolean')||(s.trailerSeed!==undefined&&(!Number.isInteger(s.trailerSeed)||s.trailerSeed<0||s.trailerSeed>4294967295))) throw new Error('La mezcla del tráiler no es válida.');
 if((s.galaxyQuality!==undefined&&!['auto','low','high'].includes(s.galaxyQuality))||(s.galaxyCamera!==undefined&&typeof s.galaxyCamera!=='boolean')||(s.trailerGalaxy!==undefined&&typeof s.trailerGalaxy!=='boolean')) throw new Error('La configuración 3D no es válida.');
 if(s.trailerParticles!==undefined&&typeof s.trailerParticles!=='boolean') throw new Error('El estilo del tráiler no es válido.');
 if ((s.particleDensity!==undefined&&![1,2,3].includes(s.particleDensity))||(s.particleInteraction!==undefined&&typeof s.particleInteraction!=='boolean')) throw new Error('La configuración de partículas no es válida.');
 if (![s.fg,s.bg,s.accent===undefined?'#8b5cf6':s.accent].every(c=>typeof c==='string' && /^#[0-9a-fA-F]{6}$/.test(c)) || !Number.isInteger(s.size) || s.size<40 || s.size>100) throw new Error('El diseño del enlace no es válido.');
 return {galaxyQuality:s.galaxyQuality??'auto',galaxyCamera:s.galaxyCamera??true,trailerGalaxy:s.trailerGalaxy??false,trailerMix:s.trailerMix??false,trailerSeed:s.trailerSeed??0,trailerParticles:s.trailerParticles??false,particleDensity:s.particleDensity??2,particleInteraction:s.particleInteraction??true,v:1,text:s.text,font:s.font,fg:s.fg,bg:s.bg,pattern:s.pattern,effect:s.effect,align:s.align,size:s.size,animation:s.animation,pace:s.pace??'normal',repeat:s.repeat??false,backdrop:s.backdrop??'solid',accent:s.accent??'#8b5cf6',backdropMotion:s.backdropMotion??false};
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
