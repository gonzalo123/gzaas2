import fs from 'node:fs';
import {build} from 'vite';
// The hosted app keeps Galaxy lazy. A file:// demo instead needs a single module:
// relative dynamic chunks cannot be fetched reliably from an opaque file origin.
const result=await build({logLevel:'warn',build:{write:false,rolldownOptions:{output:{codeSplitting:false}}}});
const files=new Map(result.output.map(asset=>[asset.fileName,asset.type==='chunk'?asset.code:asset.source]));
let html=String(files.get('index.html'));
html=html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>'<script type="module">'+String(files.get(src.replace(/^\.\//,''))).replaceAll('</script','<\\/script')+'</script>');
html=html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,src)=>'<style>'+files.get(src.replace(/^\.\//,''))+'</style>');
html=html.replace('./favicon.svg','data:image/svg+xml,'+encodeURIComponent(fs.readFileSync('public/favicon.svg','utf8')));
const licenses=fs.readdirSync('public/licenses').map(name=>`\n${name}\n${fs.readFileSync('public/licenses/'+name,'utf8')}`).join('\n');
html+='\n<!-- Third-party licenses\n'+licenses.replaceAll('--','—')+'\n-->';
fs.writeFileSync(process.argv[2]||'gzaas-preview.html',html);
