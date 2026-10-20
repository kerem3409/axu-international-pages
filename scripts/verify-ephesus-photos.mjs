import {Window} from '../../node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const catalogue = JSON.parse(read('catalogue.json'));
const baseline = JSON.parse(cp.execFileSync('git', ['show','HEAD:catalogue.json'], {cwd:root, encoding:'utf8'}));
const sources = JSON.parse(read('images/tours/ephesus/sources.json'));
assert.equal(sources.photos.length, 5);
for (const tour of catalogue) {
 const previous = baseline.find(item => item.id === tour.id);
 const {gallery, images, ...content} = tour; const {gallery:oldGallery, images:oldImages, ...oldContent} = previous;
 assert.deepEqual(content, oldContent);
 if (tour.id === 'axu-01') { assert.equal(gallery.length,5); assert.equal(images.length,1); }
}
const ephesus = catalogue.find(tour => tour.id === 'axu-01');
const installed = ephesus.gallery.every(photo => photo.url);
if (installed) {
 for (const [i, photo] of ephesus.gallery.entries()) {
  assert.equal(photo.url, `/axu-international-pages/images/tours/ephesus/${sources.photos[i].file}`);
  assert.equal(photo.credit.author,sources.photos[i].author);
  const bytes=fs.readFileSync(new URL('images/tours/ephesus/'+sources.photos[i].file,root));
  assert.equal(bytes.readUInt16BE(0),0xffd8);
  assert.ok(bytes.length>10000 && bytes.length<1500000);
 }
}
async function verify(data, hasPhotos) {
 const w = new Window({url:'https://kerem3409.github.io/axu-international-pages/tours/ephesus-shore-excursion/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 try {
  w.document.write(read('tours/ephesus-shore-excursion/index.html'));
  w.fetch = async () => ({ok:true,json:async()=>data});
  w.eval(read('app.js')); await new Promise(resolve=>setTimeout(resolve,30));
  const d=w.document;
  assert.equal(d.querySelectorAll('.td-gallery [data-photo]').length,5);
  assert.equal(d.querySelectorAll('.td-gallery img').length,hasPhotos?5:0);
  assert.equal(d.querySelectorAll('.td-photo-credits li').length,hasPhotos?5:0);
  if (hasPhotos) {
   assert.equal(d.querySelector('.td-hero-photo img').src,d.querySelector('.td-gallery img').src);
   assert.equal(d.querySelectorAll('.td-photo-credits a').length,10);
   const credits=d.querySelector('.td-photo-credits'); assert.equal(credits.open,false);
   credits.open=true; assert.equal(credits.open,true);
   const photo=d.querySelector('.td-gallery .td-photo');
   photo.querySelector('img').dispatchEvent(new w.Event('error'));
   assert.equal(photo.querySelector('img'),null);assert.ok(photo.querySelector('.td-photo-label'));
  }
  const opener=d.querySelector('.td-hero-photo');opener.click();
  const overlay=d.querySelector('.td-overlay'); assert.equal(overlay.hidden,false);
  d.querySelector('[data-gallery-action="next"]').click();assert.equal(d.querySelector('.td-counter').textContent,'2 / 5');
  overlay.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(d.querySelector('.td-counter').textContent,'1 / 5');
  d.querySelector('[data-gallery-action="prev"]').click();assert.equal(d.querySelector('.td-counter').textContent,'5 / 5');
  if(hasPhotos){const img=d.querySelector('.td-modal-photo img');img.dispatchEvent(new w.Event('error'));assert.equal(d.querySelector('.td-modal-photo img'),null);}
  for(const [type,x] of [['touchstart',200],['touchend',100]]){const event=new w.Event(type);Object.defineProperty(event,type==='touchstart'?'touches':'changedTouches',{value:[{clientX:x,clientY:100}]});overlay.dispatchEvent(event);}
  assert.equal(d.querySelector('.td-counter').textContent,'1 / 5');
  overlay.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(overlay.hidden,true);assert.equal(d.activeElement,opener);
 } finally {await w.happyDOM.close();}
}
await verify(catalogue, installed);
const fixture=structuredClone(catalogue);
fixture.find(t=>t.id==='axu-01').gallery=ephesus.gallery.map((photo,i)=>({...photo,url:'/fixture.jpg',credit:{...sources.photos[i],changes:sources.plannedChanges}}));
await verify(fixture,true);
console.log('PASS: JSON, unchanged tour content, nine other tours preserved, gallery, credits, arrows, wrapping, swipe, Escape/focus and image-error fallback.');
console.log(installed?'PASS: five local JPEG paths and file sizes.':'BLOCKED: no downloaded photographs; image paths/optimization/live image loading cannot pass. Placeholders preserved.');
if(process.argv.includes('--require-images')&&!installed)process.exitCode=1;
