export function publicShareUrl(url) {
 try {const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)?parsed.href:'';} catch {return '';}
}

export function fileShareData(file,url) {
 const data={files:[file],title:'Un mensaje para ti — gzaas!'};
 const link=publicShareUrl(url);
 if(link)data.text=link;
 return data;
}

export function canShareFile(file,platform=navigator) {
 try {return typeof platform.share==='function'&&typeof platform.canShare==='function'&&platform.canShare({files:[file]});} catch {return false;}
}
