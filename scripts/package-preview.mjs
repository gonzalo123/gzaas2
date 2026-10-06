import fs from 'node:fs';
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>'<script type="module">'+fs.readFileSync('dist/'+src.replace(/^\.\//,''),'utf8').replaceAll('</script','<\\/script')+'</script>');
html=html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,src)=>'<style>'+fs.readFileSync('dist/'+src.replace(/^\.\//,''),'utf8')+'</style>');
html=html.replace('./favicon.svg','data:image/svg+xml,'+encodeURIComponent(fs.readFileSync('public/favicon.svg','utf8')));
const licenses=fs.readdirSync('public/licenses').map(name=>`\n${name}\n${fs.readFileSync('public/licenses/'+name,'utf8')}`).join('\n');
html+='\n<!-- Third-party licenses\n'+licenses.replaceAll('--','—')+'\n-->';
fs.writeFileSync(process.argv[2]||'gzaas-preview.html',html);
