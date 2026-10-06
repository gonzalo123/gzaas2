import test from 'node:test';
import assert from 'node:assert/strict';
import {canShareFile,fileShareData,publicShareUrl} from '../src/share-file.mjs';

test('file sharing includes the exact viewer link as caption and preserves the attachment',()=>{
 for(const type of ['image/png','image/gif']){
  const file=new File(['message'],'gzaas.'+type.split('/')[1],{type});
  const url='https://example.com/gzaas2/#v1=message';
  const payload=fileShareData(file,url);
  assert.equal(payload.files[0],file);assert.equal(payload.text,url);
  assert.equal(payload.files[0].type,type);
 }
});
test('local demos share the file without an unusable local link',()=>{
 const file=new File(['png'],'gzaas.png',{type:'image/png'});
 for(const url of ['file:///private/tmp/gzaas.html#v1=x','javascript:alert(1)','invalid']){
  assert.equal(publicShareUrl(url),'');assert.equal(fileShareData(file,url).text,undefined);
 }
 assert.equal(publicShareUrl('http://localhost:4173/#v1=x'),'http://localhost:4173/#v1=x');
});
test('unsupported file sharing and permission errors select the download fallback',()=>{
 const file=new File(['png'],'gzaas.png',{type:'image/png'});
 assert.equal(canShareFile(file,{}),false);
 assert.equal(canShareFile(file,{share(){},canShare:()=>false}),false);
 assert.equal(canShareFile(file,{share(){},canShare(){throw new Error('blocked')}}),false);
 assert.equal(canShareFile(file,{share(){},canShare(data){assert.deepEqual(data,{files:[file]});return true;}}),true);
});
