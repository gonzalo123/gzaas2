import { defineConfig } from 'vite';
import {pwaPlugin} from './scripts/pwa-plugin.mjs';
export default defineConfig({
 base:'./',build:{assetsInlineLimit:100000},
 plugins:[{
  name:'gzaas-not-found',enforce:'post',
  generateBundle(_,bundle){
   const index=bundle['index.html'];if(!index||index.type!=='asset')return;
   const html=String(index.source),site=html.match(/property="og:url" content="([^"]+)"/)?.[1];
   if(!site)throw Error('The social URL is required to resolve assets on nested 404 paths.');
   const root=new URL(site).pathname.replace(/\/?$/,'/');
   const page=html.replace('<html lang="es">','<html lang="es" data-gzaas-not-found>').replace('<head>',`<head><base href="${root}"><meta name="robots" content="noindex">`);
   this.emitFile({type:'asset',fileName:'404.html',source:page});
  },
 },pwaPlugin()],
});
