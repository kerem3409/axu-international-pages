import {Window} from '../.tools/node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file,root),'utf8');
const catalogue = JSON.parse(read('catalogue.json'));
const app = read('app.js');
assert.equal(catalogue.length,10);
assert.ok(!catalogue.some(t=>['axu-02','axu-03'].includes(t.id)||['archeological-ephesus-tour-from-kusadasi','biblical-ephesus-tour-from-kusadasi'].includes(t.slug)));
const baseline=JSON.parse(cp.execFileSync('git',['show','HEAD:catalogue.json'],{cwd:root,encoding:'utf8'}));
assert.equal(catalogue.length,baseline.length);
assert.deepEqual(catalogue.map(({id,slug})=>[id,slug]),baseline.map(({id,slug})=>[id,slug]));
for(const tour of catalogue){const {images,gallery,cardSummary,...content}=tour;const {images:oldImages,gallery:oldGallery,cardSummary:oldCardSummary,...oldContent}=baseline.find(item=>item.id===tour.id);assert.deepEqual(content,oldContent);}
assert.ok(!app.includes('/api/quote-requests'));
assert.ok(!app.includes('localStorage') && !app.includes('sessionStorage'));
assert.ok(!app.includes('window.open('));assert.ok(app.includes('window.location.assign(url)'));
const future = new Date();future.setDate(future.getDate()+30);
const date = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
const formattedDate = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(future);
async function page(route, device = 'desktop') {
 const w = new Window({url:`https://axutours.tr/${route}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.write(read(route+'index.html'));
 Object.defineProperty(w.navigator,'userAgent',{value:device==='desktop' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : device==='android' ? 'Mozilla/5.0 (Linux; Android 14) Mobile' : device==='iphone' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)'});
 Object.defineProperty(w.navigator,'platform',{value:device==='ipad' ? 'MacIntel' : 'Win32'});
 Object.defineProperty(w.navigator,'maxTouchPoints',{value:device==='ipad' ? 5 : 0});
 const requests=[];w.fetch=async url=>{if(url==='/version.json')return {ok:true,json:async()=>({version:'1.0.7+abcdef0',updated:'14.10.2026'})};requests.push(url);assert.equal(url,'/catalogue.json');return {ok:true,json:async()=>catalogue};};
 const opened=[];w.location.assign=url=>opened.push([url]);w.open=()=>{throw new Error('Must navigate in the same tab');};
 w.eval(app);await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(w.document.querySelector('footer .release-info')?.textContent,'Version 1.0.7+abcdef0 · Updated 14.10.2026');
 return {w,d:w.document,opened,requests};
}
function fill(form) {
 form.elements.fullName.value='John & Jane + Smith';form.elements.tourDate.value=date;
 form.elements.guests.value='4';form.elements.shipOrHotel.value='MSC Fantasia';
 form.elements.notes.value='Morning departure, please.\nTürkçe: İzmir & Efes 🌅';
}
function fillPickup(w,form,tour) {
 if(!tour.pickupEnquiry&&!tour.cruiseDetailsEnquiry)return;
 form.elements.pickupType.value='Hotel';form.elements.pickupType.dispatchEvent(new w.Event('change',{bubbles:true}));form.elements.hotelName.value='MSC Fantasia';
}
function submit(w,form) { form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})); }
function checkLink(opened,tour,device = 'desktop') {
 const [href]=opened.at(-1);const url=new URL(href);
 assert.equal(url.origin+url.pathname,'https://wa.me/905367040944');
 assert.deepEqual([...url.searchParams.keys()],['text']);
 assert.ok(!href.includes('+'),'Spaces must use percent encoding');
 assert.equal(url.searchParams.get('text'),['Hello AXU TOURS,','','I would like to request a quote.','',`Tour: ${tour.title}`,...(tour.enquiryVariant?[`Tour Type: ${tour.enquiryVariant}`,'Enquiry Type: Individual Traveller']:[]),'Name: John & Jane + Smith',`${tour.enquiryVariant&&!tour.pickupEnquiry?'Preferred Start Date':'Date'}: ${formattedDate}`,'Guests: 4',...(tour.pickupEnquiry||tour.cruiseDetailsEnquiry?['Pickup Type: Hotel','Hotel Name: MSC Fantasia']:['Cruise Ship / Hotel: MSC Fantasia']),'Additional Notes: Morning departure, please.\nTürkçe: İzmir & Efes 🌅','','Please send me availability and pricing information.'].join('\n'));
}
for (const device of ['desktop','android','iphone','ipad']) {
for (const tour of catalogue) {
 const {w,d,opened,requests}=await page(`tours/${tour.slug}/`,device);
 try {
  const form=d.querySelector('#quote-form');assert.ok(form);assert.equal(form.elements.tourName.value,tour.title);assert.equal(form.elements.tourName.readOnly,true);
  assert.equal(d.querySelector('.td-hero a.button').getAttribute('href'),'#request-quote');
  assert.equal(d.querySelectorAll('.td-gallery [data-photo]').length,5);
  assert.equal(d.querySelector('h1').textContent,tour.title);
  submit(w,form);assert.equal(opened.length,0);
  fill(form);fillPickup(w,form,tour);
  for (const [field,value] of [['fullName','   '],['guests','0'],['guests','1.5'],['guests','-2'],['tourDate','2020-01-01'],['tourDate','']]) {
   const previous=form.elements[field].value;form.elements[field].value=value;submit(w,form);assert.equal(opened.length,0,`${tour.id}: invalid ${field}`);form.elements[field].value=previous;
  }
  // Derive the tour title from the catalogue, even if a readonly display is altered.
  form.elements.tourName.value='Different tour';submit(w,form);assert.equal(opened.length,1);checkLink(opened,tour,device);
  assert.equal(form.querySelectorAll('button').length,1);
  assert.equal(form.querySelector('button').textContent,'Continue to WhatsApp');
  assert.equal(form.querySelector('.form-intro p').textContent,'Complete the form, then continue to WhatsApp. Tap Send in the AXU TOURS chat to deliver your request.');
  assert.equal(form.querySelector('#quote-status').textContent,'');
  assert.equal(form.querySelector('#prepared-message,#quote-recovery,#whatsapp-fallback'),null);
  assert.equal(d.querySelector('#copy-quote').hidden,false);
  const message=new URL(opened[0][0]).searchParams.get('text');
  const copied=[];Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)},configurable:true});
  d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(copied,[message]);assert.match(d.querySelector('#quote-status').textContent,/Message copied/);
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}},configurable:true});
  let legacyMessage;d.execCommand=()=>{legacyMessage=d.activeElement.value;return true;};
  d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(legacyMessage,message);
  const prompts=[];w.prompt=(label,value)=>{prompts.push(value);return null;};
  d.execCommand=()=>false;d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(prompts,[message]);assert.equal(d.querySelectorAll('textarea').length,2);
  form.elements.notes.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#copy-quote').hidden,true);
  form.elements.notes.value='';form.elements.shipOrHotel.value='';submit(w,form);
  const optionalMessage=new URL(opened.at(-1)[0]).searchParams.get('text');assert.ok(!optionalMessage.includes('Additional Notes:')&&!optionalMessage.includes('Cruise Ship / Hotel:'));
  assert.equal(requests.length,1);assert.ok(!form.querySelector('[name="email"],[name="phone"]'));
  w.location.assign=()=>{throw new Error('navigation denied');};submit(w,form);
  assert.equal(d.querySelector('#copy-quote').hidden,false);
  d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));assert.ok(prompts.at(-1).includes(`Tour: ${tour.title}`));
  form.reset();assert.equal(d.querySelector('#copy-quote').hidden,true);
 } finally { await w.happyDOM.close(); }
}
const contact=await page('contact/',device);
try {
 const form=contact.d.querySelector('#quote-form');assert.equal(form.elements.tourId.options.length,11);
 fill(form);submit(contact.w,form);assert.equal(contact.opened.length,0);
 for (const tour of catalogue) {form.elements.tourId.value=tour.id;form.elements.tourId.dispatchEvent(new contact.w.Event('change',{bubbles:true}));fillPickup(contact.w,form,tour);submit(contact.w,form);checkLink(contact.opened,tour,device);assert.equal(form.querySelector('#copy-quote').hidden,false);}
} finally {await contact.w.happyDOM.close();}
}
const home=await page('');
try {assert.ok([...home.d.querySelectorAll('a')].some(a=>a.textContent.includes('Plan Your Trip')&&a.href.endsWith('/contact/')));assert.equal(home.d.querySelectorAll('.axh-tour').length,3);assert.equal(home.d.querySelector('#home-title').textContent,'Your gateway to the Aegean.');} finally {await home.w.happyDOM.close();}
const listing=await page('tours/');
try {assert.equal(listing.d.querySelectorAll('.quote-link').length,10);for(const a of listing.d.querySelectorAll('.quote-link'))assert.ok(a.href.endsWith('/#request-quote'));} finally {await listing.w.happyDOM.close();}
console.log('PASS: all ten remaining tour names, required/invalid fields, future date, message encoding, optional fields, manual-send wording, popup fallback, contact tour selection, home/list CTAs and no request storage/submission.');
