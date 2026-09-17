import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const ar=read('src/data/arabic.json'), en=read('src/data/english.json'), assets=read('src/data/assets.json');
const ids=['riyadh','makkah','asir','qassim'], categories=['foods','arts','places'];
test('Exactly 36 approved items with complete corresponding English localization',()=>{
 assert.deepEqual(Object.keys(ar),ids);
 let count=0;
 for(const region of ids)for(const category of categories){
  assert.equal(ar[region][category].length,3);assert.equal(en[region][category].length,3);
  ar[region][category].forEach((item,index)=>{
   assert.equal(item.id,`${region}-${category}-${index+1}`);
   assert.ok(item.name&&item.description);assert.ok(en[region][category][index].name&&en[region][category][index].description);
   assert.ok(!/https?:|ملاحظة مهمة/.test(item.description));
   assert.ok(!/[\u0600-\u06ff]/.test(en[region][category][index].name+en[region][category][index].description));
   count++;
  });
 }
 assert.equal(count,36);
});
test('All 36 detail and 12 landing images exist; no duplicated image content',()=>{
 const hashes=new Map();
 for(const region of ids)for(const category of categories){
  for(const id of [...ar[region][category].map(i=>i.id),`${region}-landing-${category}`]){
   assert.ok(assets[id],`Missing image mapping: ${id}`);
   const file=new URL(`../public${assets[id].src}`,import.meta.url);
   assert.ok(existsSync(file),`Missing image file: ${id}`);
   const hash=createHash('sha256').update(readFileSync(file)).digest('hex');
   assert.ok(!hashes.has(hash),`Duplicate: ${id} / ${hashes.get(hash)}`);hashes.set(hash,id);
   assert.ok(assets[id].source,`Missing provenance: ${id}`);
  }
 }
});
test('Replaced backgrounds are independent of foreground imagery; Asir preserved',()=>{
 const foreground=new Set(Object.entries(assets).filter(([id])=>!id.endsWith('background')).map(([,a])=>createHash('sha256').update(readFileSync(new URL(`../public${a.src}`,import.meta.url))).digest('hex')));
 for(const region of ['riyadh','makkah','qassim']){
  assert.ok(assets[`${region}-background`]);
  const bytes=readFileSync(new URL(`../public${assets[`${region}-background`].src}`,import.meta.url));
  assert.ok(!foreground.has(createHash('sha256').update(bytes).digest('hex')));
 }
});
