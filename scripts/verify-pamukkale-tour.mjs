import {Window} from '../.tools/node_modules/happy-dom/lib/index.js';
import {chromium} from '../.tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..',process.env.AXU_SITE_ROOT||'.'),base='';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalogue=JSON.parse(read('catalogue.json')),app=read('app.js'),tour=catalogue.find(t=>t.id==='axu-05');
const route=`/tours/${tour.slug}/`;
assert.equal(catalogue.length,10);
assert.equal(catalogue.filter(t=>t.slug==='pamukkale-tour-from-kusadasi').length,1);
assert.equal(tour.title,'Private Pamukkale & Hierapolis Tour from Kusadasi Port or Hotels');
assert.equal(tour.duration,'Approximately 9–11 hours, including road travel');
assert.equal(tour.price,null);assert.equal(tour.itinerary.length,7);
assert.ok(tour.types.includes('Private tour')&&tour.types.includes('Shore excursion'));
assert.equal(tour.included.length,5);assert.equal(tour.excluded.length,6);
assert.ok(!tour.itinerary.some(s=>/\d+\s*(?:minutes|hours)|guaranteed return/i.test(s.title+' '+s.description)));
assert.match(tour.itinerary[5].description,/Discover local stone craftsmanship and enjoy time to browse and shop\. Purchases are entirely optional\./);
assert.match(tour.itinerary[5].description,/only if the confirmed return plan allows/);
assert.ok(tour.conditions.some(s=>s.includes('approximately three hours each way')));
assert.ok(tour.conditions.some(s=>s.includes('Suitability must be confirmed before booking.')));
assert.ok(tour.conditions.includes('Hierapolis Archaeology Museum: subject to opening, available time and confirmation.'));
assert.ok(tour.conditions.includes('Cleopatra Antique Pool: not part of the standard package. Access, opening status and any swimming arrangements require separate confirmation.'));
assert.equal(tour.gallery.length,5);assert.equal(new Set(tour.gallery.map(p=>p.credit.sourceUrl)).size,5);
assert.equal(tour.images[0].url,tour.gallery[0].url);
for(const other of catalogue.filter(t=>['axu-11','axu-12'].includes(t.id)))assert.notEqual(tour.images[0].url,other.images[0].url);
const hashes=tour.gallery.map(photo=>{
 assert.match(photo.credit.license,/^CC BY/);assert.ok(photo.credit.licenseUrl&&photo.credit.author);
 return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,photo.url.slice(base.length)))).digest('hex');
});assert.equal(new Set(hashes).size,5);
for(const photo of JSON.parse(read('images/tours/pamukkale-hierapolis/sources.json')).photos){
 const data=fs.readFileSync(path.join(root,'images/tours/pamukkale-hierapolis',photo.file));
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),photo.sha256);
 assert.ok(data.length<600000);
}
async function dom(url) {
 const w=new Window({url:`https://example.test${base}${url}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.write(read(url.slice(1)+'index.html'));w.fetch=async url=>({ok:true,json:async()=>url.endsWith('version.json')?{}:catalogue});
 const urls=[];w.location.assign=url=>urls.push(url);w.eval(app);await new Promise(r=>setTimeout(r,20));
 const form=w.document.querySelector('#quote-form');
 const change=(name,value)=>{form.elements[name].value=value;form.elements[name].dispatchEvent(new w.Event('change',{bubbles:true}));};
 const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {w,form,urls,change,submit};
}
for(const url of [route,'/contact/']) {
 const {w,form,urls,change,submit}=await dom(url);
 try {
  if(url==='/contact/')change('tourId',tour.id);
  assert.match(form.querySelector('#quote-date-label').textContent,/^Tour Date/);
  submit();assert.equal(urls.length,0);
  change('fullName','İpek & Çağrı + Travel');change('tourDate','2099-10-20');change('guests','3');change('notes','Türkçe not\nİkinci satır 🌅');
  submit();assert.equal(urls.length,0);change('pickupType','Cruise Port');
  assert.equal(form.querySelector('#cruise-pickup-fields').hidden,false);
  assert.equal(form.querySelector('#hotel-pickup-field').hidden,true);
  for(const name of ['shipName','arrivalTime','allAboardTime'])assert.equal(form.elements[name].required,true);
  for(const [name,value] of [['shipName','MSC Fantasia'],['arrivalTime','08:00'],['allAboardTime','19:30']]){
   submit();assert.equal(urls.length,0);change(name,value);
  }
  change('shipName','   ');submit();assert.equal(urls.length,0);change('shipName','MSC Fantasia');
  for(const name of ['arrivalTime','allAboardTime']){const saved=form.elements[name].value;change(name,'25:90');submit();assert.equal(urls.length,0);change(name,saved);}
  change('enquiryType','Travel Agency');change('agencyName','A&B İzmir');submit();assert.equal(urls.length,1);
  const destination=new URL(urls.at(-1)),message=destination.searchParams.get('text');
  assert.equal(destination.origin+destination.pathname,'https://wa.me/905367040944');
  for(const text of [`Tour: ${tour.title}`,'Tour Type: Private Tour','Enquiry Type: Travel Agency','Agency Name: A&B İzmir','Name: İpek & Çağrı + Travel','Date: 20 October 2099','Guests: 3','Pickup Type: Cruise Port','Ship Name: MSC Fantasia','Arrival Time: 08:00','All-Aboard Time: 19:30','Ship times are local port time on the tour date.','Additional Notes: Türkçe not\nİkinci satır 🌅'])assert.ok(message.includes(text),text);
  assert.equal(form.querySelector('#quote-status').textContent,'');
  const copied=[];Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>copied.push(s)},configurable:true});
  form.querySelector('#copy-quote').click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(copied,[message]);
  change('pickupType','Hotel');assert.equal(form.querySelector('#copy-quote').hidden,true);
  assert.equal(form.querySelector('#cruise-pickup-fields').hidden,true);assert.equal(form.elements.hotelName.disabled,false);
  for(const name of ['shipName','arrivalTime','allAboardTime']){assert.equal(form.elements[name].disabled,true);assert.equal(form.elements[name].required,false);}
  change('hotelName','İzmir & Aegean Hotel');change('enquiryType','Individual Traveller');submit();
  const hotel=new URL(urls.at(-1)).searchParams.get('text');assert.ok(hotel.includes('Pickup Type: Hotel\nHotel Name: İzmir & Aegean Hotel'));
  assert.ok(!/Ship Name:|Arrival Time:|All-Aboard Time:|Agency Name:/.test(hotel));
  change('hotelName','');submit();assert.ok(!new URL(urls.at(-1)).searchParams.get('text').includes('Hotel Name:'));
  if(url==='/contact/'){
   change('tourId','axu-01');assert.equal(form.elements.shipOrHotel.disabled,false);assert.equal(form.querySelector('[name="pickupType"]'),null);
   change('shipOrHotel','Existing ship');submit();assert.ok(new URL(urls.at(-1)).searchParams.get('text').includes('Cruise Ship / Hotel: Existing ship'));
   change('tourId','axu-04');assert.match(form.querySelector('#quote-date-label').textContent,/Preferred Start Date/);
  }
  form.reset();await new Promise(r=>setTimeout(r,5));assert.equal(form.querySelector('#copy-quote').hidden,true);
 } finally {await w.happyDOM.close();}
}
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),fileRoot=path.resolve(root,'.'+pathname.slice(base.length));let file=fileRoot;
 if(!pathname.startsWith(base+'/')||(file!==root&&!file.startsWith(root+path.sep))){res.writeHead(404).end();return;}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const errors=[];
 for(const width of [1440,390,320]) {
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<400,hasTouch:width<400});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/app.js*',r=>r.fulfill({contentType:'text/javascript',body:app.replace('window.location.assign(url)','window.testNavigate(url)')}));
  await page.addInitScript(()=>{window.handoffs=[];window.testNavigate=url=>window.handoffs.push(url);});
  await page.goto(origin+route);await page.locator('#quote-form').waitFor();
  assert.equal(await page.title(),`${tour.title} · AXU TOURS`);assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),tour.summary);
  assert.deepEqual(await page.locator('.td-stop h3').allTextContents(),tour.itinerary.map(s=>s.title));
  await page.locator('.td-gallery').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].length===6&&[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.locator('.td-hero').screenshot({path:path.resolve(import.meta.dirname,`../.tools/qa/pamukkale-hero-${width}.png`)});
  await page.locator('.td-gallery').screenshot({path:path.resolve(import.meta.dirname,`../.tools/qa/pamukkale-gallery-${width}.png`)});
  await page.locator('.td-hero-photo').click();
  for(let index=0;index<5;index++){
   assert.equal(await page.locator('.td-counter').textContent(),`${index+1} / 5`);
   await page.waitForFunction(()=>document.querySelector('.td-modal-photo img')?.naturalWidth>0);
   assert.equal(await page.locator('.td-modal-photo img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
   if(index===1)await page.locator('.td-overlay').screenshot({path:path.resolve(import.meta.dirname,`../.tools/qa/pamukkale-lightbox-${width}.png`)});
   await page.keyboard.press('ArrowRight');
  }await page.keyboard.press('Escape');assert.equal(await page.locator('.td-overlay').isVisible(),false);
  for(const target of [route,'/contact/']) {
   await page.goto(origin+target);await page.locator('#quote-form').waitFor();if(target==='/contact/')await page.locator('[name="tourId"]').selectOption(tour.id);
   const submit=page.getByRole('button',{name:'Continue to WhatsApp'});await submit.click();const before=await page.evaluate(()=>window.handoffs.length);
   await page.locator('[name="fullName"]').fill('İpek & Çağrı');await page.locator('[name="tourDate"]').fill('2099-10-20');await page.locator('[name="guests"]').fill('4');
   await page.locator('[name="pickupType"]').selectOption('Cruise Port');
   for(const [name,value] of [['shipName','MSC Fantasia'],['arrivalTime','08:00'],['allAboardTime','19:30']]){
    await submit.click();assert.equal(await page.evaluate(()=>window.handoffs.length),before);await page.locator(`[name="${name}"]`).fill(value);
   }
   await page.locator('[name="enquiryType"]').selectOption('Travel Agency');await page.locator('[name="agencyName"]').fill('A&B İzmir');await page.locator('[name="notes"]').fill('Türkçe\nSecond line 🌅');
   await submit.click();const message=new URL(await page.evaluate(()=>window.handoffs.at(-1))).searchParams.get('text');
   assert.ok(message.includes('Ship Name: MSC Fantasia\nArrival Time: 08:00\nAll-Aboard Time: 19:30'));assert.ok(message.includes('Agency Name: A&B İzmir'));assert.ok(message.includes('Türkçe\nSecond line 🌅'));
   assert.equal(await page.locator('#quote-status').textContent(),'');
   await page.locator('#quote-form').screenshot({path:path.resolve(import.meta.dirname,`../.tools/qa/pamukkale-cruise-${target==='/contact/'?'contact':'detail'}-${width}.png`)});
   await page.locator('[name="pickupType"]').selectOption('Hotel');assert.equal(await page.locator('[name="shipName"]').isVisible(),false);
   await page.locator('[name="hotelName"]').fill('Kusadasi Hotel');await submit.click();const hotel=new URL(await page.evaluate(()=>window.handoffs.at(-1))).searchParams.get('text');
   assert.ok(hotel.includes('Hotel Name: Kusadasi Hotel'));assert.ok(!hotel.includes('All-Aboard Time:'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
   assert.ok(await page.locator('#quote-form input,#quote-form select,#quote-form textarea').evaluateAll(els=>els.filter(el=>el.getClientRects().length).every(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.x>=0&&b.right<=innerWidth+1&&b.height>=44;})));
  }
  for(const listing of ['/tours/','/shore-excursions/']){
   await page.goto(origin+listing);const card=page.locator(`.tour-card:has(a[href="${base}${route}"])`).first();await card.waitFor();
   for(const type of ['Private tour','Shore excursion']){await page.locator('[name="type"]').selectOption(type);assert.equal(await card.count(),1);}
   assert.match(await card.locator('.card-summary').textContent(),/for cruise guests, the ship schedule/);
   await card.scrollIntoViewIfNeeded();await page.waitForFunction(src=>[...document.querySelectorAll('.cover img')].some(img=>img.getAttribute('src')===src&&img.naturalWidth>0),tour.images[0].url);
   assert.equal(await card.locator('.cover img').getAttribute('src'),tour.images[0].url);assert.equal(await card.locator('.cover img').evaluate(el=>getComputedStyle(el).objectFit),'cover');
  }
  await context.close();
 }
 // Exercise the actual same-tab handoff without contacting or sending a message to WhatsApp.
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<400,hasTouch:width<400});
  await context.route('https://wa.me/**',r=>r.fulfill({contentType:'text/html',body:'No message sent. Destination intercepted.'}));
  const page=await context.newPage();await page.goto(origin+route);await page.locator('#quote-form').waitFor();
  for(const [name,value] of [['fullName','İpek + AXU'],['tourDate','2099-10-20'],['guests','2']])await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="pickupType"]').selectOption('Cruise Port');
  for(const [name,value] of [['shipName','Cruise ship'],['arrivalTime','08:00'],['allAboardTime','20:00']])await page.locator(`[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Continue to WhatsApp'}).click();await page.waitForURL('https://wa.me/**');assert.equal(context.pages().length,1);
  assert.equal(new URL(page.url()).pathname,'/905367040944');assert.ok(new URL(page.url()).searchParams.get('text').includes('All-Aboard Time: 20:00'));await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: existing axu-05 URL; seven-stop private itinerary and cruise restrictions; five distinct licensed local photos and unique cover; all gallery views; desktop/mobile layouts; tour and shore filters; conditional required cruise fields, hotel/agency switching, copy fallback, UTF-8 WhatsApp payload and real same-tab handoff. No message sent.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
