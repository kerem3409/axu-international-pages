import {Window} from '../../node_modules/happy-dom/lib/index.js';
import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..',process.env.AXU_SITE_ROOT||'.'),base='';
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),catalogue=JSON.parse(read('catalogue.json')),app=read('app.js');
const tour=catalogue.find(t=>t.id==='axu-07'),route=`/tours/${tour.slug}/`;
assert.equal(catalogue.length,10);assert.equal(catalogue.filter(t=>t.id==='axu-07'||t.slug===tour.slug).length,1);
assert.equal(tour.slug,'didyma-priene-miletos-tour-from-kusadasi');assert.equal(tour.title,'Priene, Miletus & Didyma Tour from Kusadasi');
assert.equal(tour.duration,'Approximately 8 hours, including transfers');assert.equal(tour.itinerary.length,6);assert.equal(tour.price,null);
assert.ok(!tour.types.some(t=>/private|group|small group/i.test(t)));assert.ok(tour.types.includes('Shore excursion'));
assert.deepEqual(tour.included,['English-speaking licensed guide; other languages on request','Air-conditioned, non-smoking transportation','Local restaurant lunch','Entrance tickets to Priene, Miletus and the Temple of Apollo at Didyma','Pickup and return transfers within the confirmed Kusadasi area']);
assert.deepEqual(tour.excluded,['Drinks','Personal expenses','Optional visits and services outside the confirmed programme','Guide and driver gratuities']);
const text=JSON.stringify({...tour,gallery:undefined,images:undefined});
for(const falseClaim of [/Seven Wonders/i,/UNESCO/i,/Temple of Artemis/i,/Museum/i,/Ilyas Bey/i,/boat trip/i,/largest|best-preserved|best preserved|guaranteed return/i])assert.doesNotMatch(text,falseClaim);
for(const [index,term] of [[0,'Kusadasi Pickup'],[1,'Priene Ancient City'],[2,'Miletus Ancient City'],[3,'Local Lunch'],[4,'Temple of Apollo at Didyma'],[5,'Return to Kusadasi']])assert.equal(tour.itinerary[index].title,term);
assert.match(tour.itinerary[1].description,/uphill walking, steps and uneven ancient surfaces/);
assert.equal(tour.conditions.some(s=>s.startsWith('Cruise-port pickup is available on request, subject to confirmation of your ship’s arrival and all-aboard times.')),true);
assert.ok(tour.conditions.some(s=>/Comfortable walking shoes, sun protection and water are recommended/.test(s)));
assert.ok(tour.conditions.some(s=>/Guests with limited mobility should let us know in advance/.test(s)));
assert.ok(tour.conditions.some(s=>/depends on current visitor conditions/.test(s)));
assert.ok(tour.conditions.some(s=>/tour type and departure arrangements will be confirmed/.test(s)));
assert.ok(!tour.itinerary.some(stop=>/\d+\s*(?:minutes|hours)/i.test(stop.title+' '+stop.description)));
assert.equal(tour.gallery.length,5);assert.equal(new Set(tour.gallery.map(p=>p.credit.sourceUrl)).size,5);
assert.equal(tour.images[0].url,tour.gallery[0].url);
const allCoverUrls=catalogue.filter(t=>t.id!=='axu-07').map(t=>t.images?.find(p=>p.url)?.url||t.gallery?.find(p=>p.url)?.url).filter(Boolean);assert.ok(!allCoverUrls.includes(tour.images[0].url));
for(const p of tour.gallery){assert.ok(p.url.startsWith(base+'/images/tours/priene-miletus-didyma/'));assert.ok(p.credit?.licenseUrl&&p.credit.author&&p.credit.shareAlike===p.credit.license.includes('SA'));}
const source=JSON.parse(read('images/tours/priene-miletus-didyma/sources.json'));
for(const p of source.photos){const data=fs.readFileSync(path.join(root,'images/tours/priene-miletus-didyma',p.file));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),p.sha256);assert.ok(data.length<700000);}
assert.ok(read('tours/'+tour.slug+'/index.html').includes(tour.title.replaceAll('&','&amp;')));
if(process.env.AXU_CONTRACT_ONLY){console.log('PASS: tour identity and copy, cautious historical claims, service scope, cruise suitability, no assigned group type, five licensed local photos and source hashes.');process.exit(0);}
async function dom(pathname){
 const w=new Window({url:`https://example.test${base}${pathname}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(read(pathname.slice(1)+'index.html'));
 w.fetch=async url=>({ok:true,json:async()=>url.endsWith('version.json')?{}:catalogue});const destinations=[];w.location.assign=url=>destinations.push(url);w.eval(app);await new Promise(r=>setTimeout(r,15));
 const form=w.document.querySelector('#quote-form');const change=(name,value)=>{form.elements[name].value=value;form.elements[name].dispatchEvent(new w.Event('change',{bubbles:true}));};
 const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));return {w,form,destinations,change,submit};
}
for(const pathname of [route,'/contact/']){
 const {w,form,destinations,change,submit}=await dom(pathname);try{
  if(pathname==='/contact/')change('tourId',tour.id);
  assert.match(form.querySelector('#quote-date-label').textContent,/^Tour Date/);
  assert.equal(form.querySelector('#pickup-enquiry-fields').hidden,false);
  assert.equal(form.elements.enquiryType,undefined);assert.equal(form.elements.pickupType.required,true);
  submit();assert.equal(destinations.length,0);
  change('fullName','İpek & Çağrı');change('tourDate','2099-10-20');change('guests','2');
  change('pickupType','Cruise Port');assert.equal(form.querySelector('#cruise-pickup-fields').hidden,false);
  for(const name of ['shipName','arrivalTime','allAboardTime'])assert.equal(form.elements[name].required,true);
  submit();assert.equal(destinations.length,0);
  change('shipName','M/V Aegean Star');change('arrivalTime','08:10');change('allAboardTime','17:45');change('notes','Please confirm port suitability.');submit();
  assert.equal(destinations.length,1);const url=new URL(destinations[0]);assert.equal(url.origin+url.pathname,'https://wa.me/905367040944');
  const cruise=url.searchParams.get('text');
  for(const item of [`Tour: ${tour.title}`,'Date: 20 October 2099','Guests: 2','Pickup Type: Cruise Port','Ship Name: M/V Aegean Star','Arrival Time: 08:10','All-Aboard Time: 17:45','Ship times are local port time on the tour date.','Additional Notes: Please confirm port suitability.'])assert.ok(cruise.includes(item),item);
  assert.ok(!/Tour Type:|Enquiry Type:|Agency Name:/.test(cruise));assert.equal(form.querySelector('#quote-status').textContent,'');
  change('pickupType','Hotel');assert.equal(form.querySelector('#cruise-pickup-fields').hidden,true);assert.equal(form.elements.shipName.disabled,true);
  change('hotelName','Kusadasi Hotel');submit();const hotel=new URL(destinations.at(-1)).searchParams.get('text');assert.ok(hotel.includes('Pickup Type: Hotel\nHotel Name: Kusadasi Hotel'));assert.ok(!/Ship Name:|Arrival Time:|All-Aboard Time:/.test(hotel));
  if(pathname==='/contact/'){change('tourId','axu-01');assert.equal(form.elements.shipOrHotel.disabled,false);assert.equal(form.elements.pickupType,undefined);change('shipOrHotel','Existing ship');submit();assert.ok(new URL(destinations.at(-1)).searchParams.get('text').includes('Cruise Ship / Hotel: Existing ship'));}
 }finally{await w.happyDOM.close();}
}
if(process.env.AXU_DOM_ONLY){console.log('PASS: tour/contact form validation; required cruise fields, correct local-time WhatsApp message, hotel and existing-tour switching; no type or booking claim.');process.exit(0);}
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname.slice(base.length));if(!pathname.startsWith(base+'/')||(file!==root&&!file.startsWith(root+path.sep))){res.writeHead(404).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}${base}`,browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const errors=[];for(const width of [1440,390,320]){const page=await browser.newPage({viewport:{width,height:1000},isMobile:width<400,hasTouch:width<400});page.on('pageerror',e=>errors.push(e.message));await page.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:app.replace('window.location.assign(url)','window.testNavigate(url)')}));await page.addInitScript(()=>{window.handoffs=[];window.testNavigate=url=>window.handoffs.push(url);});
 await page.goto(origin+route);await page.locator('#quote-form').waitFor();assert.equal(await page.title(),`${tour.title} · AXU TOURS`);assert.deepEqual(await page.locator('.td-stop h3').allTextContents(),tour.itinerary.map(s=>s.title));
 await page.locator('.td-gallery').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].length===6&&[...document.querySelectorAll('.td-hero-photo img,.td-gallery img')].every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.locator('.td-hero-photo img').getAttribute('src'),tour.images[0].url);await page.locator('.td-hero-photo').click();for(let i=1;i<=5;i++){assert.equal(await page.locator('.td-counter').textContent(),`${i} / 5`);await page.waitForFunction(()=>document.querySelector('.td-modal-photo img')?.naturalWidth>0);if(i<5)await page.keyboard.press('ArrowRight');}await page.keyboard.press('Escape');
 await page.locator('[name="fullName"]').fill('Kerem');await page.locator('[name="tourDate"]').fill('2099-10-20');await page.locator('[name="guests"]').fill('2');await page.locator('[name="pickupType"]').selectOption('Cruise Port');for(const [n,v] of [['shipName','Ship'],['arrivalTime','08:10'],['allAboardTime','17:45']])await page.locator(`[name="${n}"]`).fill(v);await page.getByRole('button',{name:'Continue to WhatsApp'}).click();let message=new URL(await page.evaluate(()=>window.handoffs.at(-1))).searchParams.get('text');assert.ok(message.includes('Tour: '+tour.title));assert.ok(message.includes('All-Aboard Time: 17:45'));await page.screenshot({path:path.resolve(import.meta.dirname,`../../.visual-tools.local/axu07-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto(origin+'/tours/');await page.locator('[name="type"]').selectOption('Shore excursion');const card=page.locator(`.tour-card:has(a[href="${base}${route}"])`).first();assert.equal(await card.count(),1);await page.waitForFunction(src=>[...document.querySelectorAll('.cover img')].some(i=>i.getAttribute('src')===src&&i.naturalWidth>0),tour.images[0].url);assert.equal(await card.locator('.cover img').evaluate(i=>getComputedStyle(i).objectFit),'cover');await page.close();}
 assert.deepEqual(errors,[]);console.log('PASS: axu-07 copy, historical caveats, catalog and five attributed local photos; cruise fields and WhatsApp payload; unchanged generic form; desktop/mobile detail, card cover and lightbox. No message sent.');}finally{await browser.close();await new Promise(r=>server.close(r));}
