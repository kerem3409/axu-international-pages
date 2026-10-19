import {Window} from '../../node_modules/happy-dom/lib/index.js';
import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='/axu-international-pages';
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),catalogue=JSON.parse(read('catalogue.json')),app=read('app.js');
const packages=catalogue.filter(t=>t.enquiryVariant);assert.equal(packages.length,2);assert.equal(catalogue.length,11);
assert.equal(new Set(catalogue.map(t=>t.id)).size,11);assert.equal(new Set(catalogue.map(t=>t.slug)).size,11);
assert.equal(catalogue.find(t=>t.id==='axu-04').title,'Ephesus Day Tour from Istanbul');
assert.notEqual(packages[0].images[0].url,packages[1].images[0].url);
for(const tour of packages) {
 assert.equal(tour.duration,'2 days / 1 night');assert.equal(tour.price,null);assert.equal(tour.itinerary.length,2);
 assert.deepEqual(tour.excluded,['Personal expenses','Optional activities and services not included in the confirmed quotation']);
 assert.ok(!tour.included.some(item=>/meals|entrance|baggage|breakfast|star|cleopatra/i.test(item)));
 assert.ok(tour.conditions.some(item=>item.includes('Your quotation will specify flight times and airports, baggage allowance')));
 assert.ok(tour.types.includes('Multi-day tour'));assert.ok(tour.types.includes(tour.enquiryVariant.replace('Tour','tour')));
 assert.ok(!tour.types.includes(tour.enquiryVariant==='Group Tour'?'Private tour':'Group tour'));
 assert.ok(read(`tours/${tour.slug}/index.html`).includes(tour.title.replaceAll('&','&amp;')));
 for(const photo of tour.gallery){assert.ok(photo.credit?.licenseUrl);assert.ok(fs.existsSync(path.join(root,photo.url.slice(base.length))));}
}
async function dom(route) {
 const w=new Window({url:`https://example.test${base}${route}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.write(read(route.slice(1)+'index.html'));w.fetch=async url=>({ok:true,json:async()=>url.endsWith('version.json')?{}:catalogue});
 const urls=[];w.location.assign=url=>urls.push(url);w.eval(app);await new Promise(r=>setTimeout(r,20));return {w,urls,form:w.document.querySelector('#quote-form')};
}
for(const tour of packages) for(const route of [`/tours/${tour.slug}/`,'/contact/']) {
 const {w,urls,form}=await dom(route);
 try {
  if(route==='/contact/'){form.elements.tourId.value=tour.id;form.elements.tourId.dispatchEvent(new w.Event('input',{bubbles:true}));}
  assert.match(form.querySelector('#quote-date-label').textContent,/Preferred Start Date/);
  assert.equal(form.querySelector('#agency-name-field').hidden,true);
  form.elements.fullName.value='İpek & Çağrı + Travel';form.elements.tourDate.value='2099-10-20';form.elements.guests.value='3';form.elements.notes.value='İlk satır\nİkinci satır 🌅';
  const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  form.elements.enquiryType.value='Travel Agency';form.elements.enquiryType.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(form.querySelector('#agency-name-field').hidden,false);form.elements.agencyName.value='  A&B + İzmir Agency  ';
  submit();const url=new URL(urls.at(-1));assert.equal(url.origin+url.pathname,'https://wa.me/905367040944');
  const message=url.searchParams.get('text');assert.ok(message.includes(`Tour: ${tour.title}\nTour Type: ${tour.enquiryVariant}\nEnquiry Type: Travel Agency\nAgency Name: A&B + İzmir Agency\nName: İpek & Çağrı + Travel`));
  assert.ok(message.includes('Preferred Start Date: 20 October 2099\nGuests: 3'));assert.ok(message.includes('İlk satır\nİkinci satır 🌅'));
  assert.equal(form.querySelector('#quote-status').textContent,'');
  form.elements.agencyName.value='';submit();assert.ok(!new URL(urls.at(-1)).searchParams.get('text').includes('Agency Name:'));
  form.elements.agencyName.value='Should not leak';form.elements.enquiryType.value='Individual Traveller';form.elements.enquiryType.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(form.querySelector('#agency-name-field').hidden,true);submit();const individual=new URL(urls.at(-1)).searchParams.get('text');assert.ok(individual.includes('Enquiry Type: Individual Traveller'));assert.ok(!individual.includes('Should not leak'));
  const count=urls.length;form.elements.enquiryType.value='';submit();assert.equal(urls.length,count);
  form.elements.enquiryType.value='Individual Traveller';form.elements.tourDate.value='2020-01-01';submit();assert.equal(urls.length,count);
 } finally {await w.happyDOM.close();}
}
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname.slice(base.length)));
 if(!pathname.startsWith(base+'/')||(file!==root&&!file.startsWith(root+path.sep))){res.writeHead(404).end();return;}
 try {if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:app.replace('window.location.assign(url)','window.testNavigate(url)')}));
 await page.addInitScript(()=>{window.handoffs=[];window.testNavigate=url=>window.handoffs.push(url);});
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  for(const tour of packages) {
   await page.goto(`${origin}/tours/${tour.slug}/`);await page.locator('#quote-form').waitFor();
   assert.equal(await page.title(),`${tour.title} · AXU TOURS`);
   assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),tour.summary);
   assert.deepEqual(await page.locator('.td-stop h3').allTextContents(),tour.itinerary.map(item=>item.title));
   const other=catalogue.find(item=>item.id===tour.pairedTourId);
   const links=page.locator('.paired-tour a');assert.equal(await links.count(),2);
   for(const link of await links.all()){assert.equal(await link.getAttribute('href'),`${base}/tours/${other.slug}/`);assert.equal(await link.textContent(),tour.pairedTourText);}
   await links.first().click();await page.locator(`.tour-detail[data-tour-id="${other.id}"]`).waitFor();
   await page.goto(`${origin}/tours/${tour.slug}/`);await page.locator('#quote-form').waitFor();
   await page.locator('.td-gallery').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].length===6&&[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].every(img=>img.complete&&img.naturalWidth>0));
   await page.locator('.td-hero-photo').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.td-counter').textContent(),'2 / 5');
   await page.waitForFunction(()=>document.querySelector('.td-modal-photo img')?.naturalWidth>0);await page.keyboard.press('Escape');
   const submit=page.getByRole('button',{name:'Continue to WhatsApp'});await submit.click();assert.equal(await page.evaluate(()=>window.handoffs.length),0);
   await page.locator('[name="fullName"]').fill('İpek Travel');await page.locator('[name="tourDate"]').fill('2099-10-20');await page.locator('[name="guests"]').fill('4');
   await page.locator('[name="enquiryType"]').selectOption('Travel Agency');assert.equal(await page.locator('[name="agencyName"]').isVisible(),true);await page.locator('[name="agencyName"]').fill('A&B + İzmir');
   await page.locator('[name="notes"]').fill('Türkçe\nSecond line 🌅');await submit.click();
   const message=new URL(await page.evaluate(()=>window.handoffs.at(-1))).searchParams.get('text');assert.ok(message.includes(`Tour Type: ${tour.enquiryVariant}\nEnquiry Type: Travel Agency\nAgency Name: A&B + İzmir`));assert.ok(message.includes('Türkçe\nSecond line 🌅'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tour.id} overflow at ${width}`);
   await page.locator('.td-hero').screenshot({path:path.resolve(root,`../.visual-tools.local/${tour.id}-hero-${width}.png`)});
   await page.locator('#quote-form').screenshot({path:path.resolve(root,`../.visual-tools.local/${tour.id}-form-${width}.png`)});
  }
  for(const route of ['/tours/','/multi-day-tours/']) {
   await page.goto(origin+route);await page.locator('.tour-card').first().waitFor();
   assert.equal(await page.locator('.tour-card').count(),route==='/tours/'?11:3);
   for(const tour of packages){const card=page.locator(`.tour-card:has(a[href="${base}/tours/${tour.slug}/"])`).first();await card.scrollIntoViewIfNeeded();assert.equal(await card.locator('.cover img').getAttribute('src'),tour.images[0].url);await page.waitForFunction(src=>[...document.querySelectorAll('.cover img')].some(img=>img.getAttribute('src')===src&&img.naturalWidth>0),tour.images[0].url);assert.equal(await card.locator('.cover img').evaluate(img=>getComputedStyle(img).objectFit),'cover');}
   if(route==='/tours/')for(const type of ['Group tour','Private tour']){await page.locator('[name="type"]').selectOption(type);assert.ok((await page.locator('.tour-card h3').allTextContents()).includes(packages.find(t=>t.enquiryVariant.replace('Tour','tour')===type).title));}
  }
  await page.goto(origin+'/contact/');await page.locator('[name="tourId"]').waitFor();assert.equal(await page.locator('[name="tourId"] option').count(),12);
  for(const tour of packages){await page.locator('[name="tourId"]').selectOption(tour.id);assert.match(await page.locator('#quote-date-label').textContent(),/Preferred Start Date/);await page.locator('[name="enquiryType"]').selectOption('Travel Agency');assert.equal(await page.locator('[name="agencyName"]').isVisible(),true);}
  await page.locator('[name="tourId"]').selectOption('axu-04');assert.match(await page.locator('#quote-date-label').textContent(),/^Tour Date/);assert.equal(await page.locator('[name="enquiryType"]').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS: two unique packages; reciprocal links; two-day programme; safe inclusions/exclusions; all photos; desktop/mobile cards, galleries and forms; individual/agency WhatsApp fields; contact switching; old day tour preserved. No message sent.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
