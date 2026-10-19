import {Window} from '../../node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalogue=JSON.parse(read('catalogue.json')),before=JSON.parse(cp.execFileSync('git',['show','HEAD:catalogue.json'],{cwd:root,encoding:'utf8'}));
const tour=catalogue.find(t=>t.slug==='pergamon-tour-c'),old=before.find(t=>t.slug==='pergamon-tour-c');
assert.equal(tour.id,'axu-06');assert.equal(tour.title,'Private Pergamon & Asklepion Tour from Izmir');
assert.equal(tour.departure,'Izmir');assert.equal(tour.slug,old.slug);assert.equal(tour.id,old.id);
assert.equal(tour.summary,"Discover the remarkable ancient city of Pergamon and its renowned healing sanctuary, the Asklepion, on a private day tour from Izmir.\n\nExplore the impressive Acropolis, admire the dramatic setting of the ancient theatre, and discover the remains of temples and monumental buildings that reflect Pergamon's importance in the ancient world.\n\nContinue to the Asklepion, one of the most celebrated healing centres of antiquity, and learn about ancient medical traditions and the legacy of Galen.\n\nEnjoy a journey through the archaeological and cultural heritage of western Türkiye with a professional guide");
assert.deepEqual(tour.itinerary.map(stop=>stop.title),['Departure from Izmir','Pergamon Acropolis','Great Altar Foundations','Asklepion','Lunch Stop','Return to Izmir']);
assert.match(tour.itinerary[1].description,/steep hillside theatre.*sanctuary of Athena.*Trajaneum/);
assert.match(tour.itinerary[2].description,/foundations.*Great Altar itself is not at the ancient site.*Berlin/);
assert.match(tour.itinerary[3].description,/healing sanctuary.*Galen/);
assert.deepEqual(tour.included,['English-speaking guide; other guiding languages on request.']);
assert.ok(tour.excluded.some(x=>/Admission fees.*unless expressly listed/.test(x)));
assert.ok(tour.excluded.some(x=>/^Lunch unless expressly included/.test(x)));
assert.ok(tour.excluded.some(x=>/Airport or port transfers unless/.test(x)));
assert.ok(tour.conditions.some(x=>/Izmir Airport transfers are not part of the standard package/.test(x)&&/Kusadasi and Dikili/.test(x)));
assert.ok(tour.conditions.some(x=>/Lunch inclusion.*unconfirmed/.test(x)));
assert.equal(tour.gallery.length,5);assert.equal(new Set(tour.gallery.map(x=>x.url)).size,5);
assert.equal(tour.images[0].url,tour.gallery[0].url);
for(const photo of tour.gallery){assert.ok(photo.url.startsWith('https://thumb.wikimedia.org/wikipedia/commons/thumb/'));assert.ok(photo.credit?.author&&photo.credit?.licenseUrl&&photo.credit?.sourceUrl);assert.equal(photo.credit.shareAlike,photo.credit.license.includes('SA'));}
for(const t of catalogue.filter(t=>t.id!=='axu-06'))assert.deepEqual(t,before.find(oldTour=>oldTour.id===t.id));
const w=new Window({url:`https://kerem3409.github.io/axu-international-pages/tours/${tour.slug}/`,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
try {
 w.document.write(read(`tours/${tour.slug}/index.html`));
 w.fetch=async url=>({ok:true,json:async()=>url.endsWith('/version.json')?{version:'1.0.20+b82b76e',updated:'19.10.2026'}:catalogue});
 w.eval(read('app.js'));await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(w.document.querySelector('h1')?.textContent,tour.title);
 assert.deepEqual([...w.document.querySelectorAll('.td-intro')].map(p=>p.textContent),tour.summary.split('\n\n'));
 assert.equal(w.document.querySelector('#quote-form')?.getAttribute('data-tour-id'),'axu-06');
 assert.equal(w.document.querySelector('meta[name="description"]').content,tour.summary);
 assert.deepEqual([...w.document.querySelectorAll('.td-stop h3')].map(x=>x.textContent),tour.itinerary.map(x=>x.title));
 assert.equal(w.document.querySelectorAll('.td-gallery img').length,5);
 assert.equal(w.document.querySelectorAll('.td-photo-credits li').length,5);
} finally {await w.happyDOM.close();}
console.log('PASS: Pergamon itinerary, cautious services/transfers and Great Altar wording, five credited Commons photographs, detail gallery, existing URL and quote form; other tour entries unchanged.');
