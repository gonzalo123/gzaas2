import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
const svg=await readFile(new URL('../public/icons/source.svg',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 await mkdir(new URL('../public/icons/',import.meta.url),{recursive:true});
 for(const [file,size] of [['icon-192',192],['icon-512',512],['maskable-512',512],['apple-touch-icon',180]]){
  await page.setViewportSize({width:size,height:size});
  await page.setContent(`<style>body{margin:0}img{display:block;width:100vw;height:100vh}</style><img src="data:image/svg+xml,${encodeURIComponent(svg)}">`);
  await page.locator('img').evaluate(img=>img.decode());
  await page.screenshot({path:new URL(`../public/icons/${file}.png`,import.meta.url).pathname});
 }
}finally{await browser.close();}
