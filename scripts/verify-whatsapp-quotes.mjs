import {Window} from '../../node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file,root),'utf8');
const catalogue = JSON.parse(read('catalogue.json'));
const app = read('app.js');
assert.equal(catalogue.length,10);
assert.equal(read('catalogue.json'),cp.execFileSync('git',['show','HEAD:catalogue.json'],{cwd:root,encoding:'utf8'}));
assert.ok(!app.includes('/api/quote-requests'));
assert.ok(!app.includes('localStorage') && !app.includes('sessionStorage'));
const future = new Date();future.setDate(future.getDate()+30);
const date = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
const formattedDate = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(future);
async function page(route, device = 'desktop') {
 const w = new Window({url:`https://kerem3409.github.io/axu-international-pages/${route}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.write(read(route+'index.html'));
 Object.defineProperty(w.navigator,'userAgent',{value:device==='desktop' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : device==='android' ? 'Mozilla/5.0 (Linux; Android 14) Mobile' : device==='iphone' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)'});
 Object.defineProperty(w.navigator,'platform',{value:device==='ipad' ? 'MacIntel' : 'Win32'});
 Object.defineProperty(w.navigator,'maxTouchPoints',{value:device==='ipad' ? 5 : 0});
 const requests=[];w.fetch=async url=>{if(url==='/axu-international-pages/version.json')return {ok:true,json:async()=>({version:'1.0.7+abcdef0',updated:'14.10.2026'})};requests.push(url);assert.equal(url,'/axu-international-pages/catalogue.json');return {ok:true,json:async()=>catalogue};};
 const opened=[];w.open=(...args)=>{opened.push(args);return null;};
 w.eval(app);await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(w.document.querySelector('footer .release-info')?.textContent,'Version 1.0.7+abcdef0 · Updated 14.10.2026');
 return {w,d:w.document,opened,requests};
}
function fill(form) {
 form.elements.fullName.value='John & Jane + Smith';form.elements.tourDate.value=date;
 form.elements.guests.value='4';form.elements.shipOrHotel.value='MSC Fantasia';
 form.elements.notes.value='Morning departure, please.\nTürkçe: İzmir & Efes 🌅';
}
function submit(w,form) { form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})); }
function checkLink(opened,tour,device = 'desktop') {
 const [href,target,features]=opened.at(-1);const url=new URL(href);
 assert.equal(url.origin+url.pathname,device==='desktop' ? 'https://web.whatsapp.com/send' : 'https://wa.me/905367040944');
 assert.equal(url.searchParams.get('phone'),device==='desktop' ? '905367040944' : null);
 assert.equal(url.searchParams.get('type'),device==='desktop' ? 'phone_number' : null);
 assert.equal(url.searchParams.get('app_absent'),device==='desktop' ? '1' : null);
 assert.ok(!href.includes('+'),'Spaces must use percent encoding');
 assert.equal(target,'_blank');assert.equal(features,'noopener,noreferrer');
 assert.equal(url.searchParams.get('text'),['Hello AXU TOURS,','','I would like to request a quote.','',`Tour: ${tour.title}`,'Name: John & Jane + Smith',`Date: ${formattedDate}`,'Guests: 4','Cruise Ship / Hotel: MSC Fantasia','Additional Notes: Morning departure, please.\nTürkçe: İzmir & Efes 🌅','','Please send me availability and pricing information.'].join('\n'));
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
  fill(form);
  for (const [field,value] of [['fullName','   '],['guests','0'],['guests','1.5'],['guests','-2'],['tourDate','2020-01-01'],['tourDate','']]) {
   const previous=form.elements[field].value;form.elements[field].value=value;submit(w,form);assert.equal(opened.length,0,`${tour.id}: invalid ${field}`);form.elements[field].value=previous;
  }
  // Derive the tour title from the catalogue, even if a readonly display is altered.
  form.elements.tourName.value='Different tour';submit(w,form);assert.equal(opened.length,1);checkLink(opened,tour,device);
  assert.ok(d.querySelector('#quote-status').textContent.includes('Complete sending in WhatsApp'));
  assert.equal(d.querySelector('#whatsapp-fallback').hidden,false);
  assert.equal(d.querySelector('#whatsapp-fallback').href,opened[0][0]);
  const draft=d.querySelector('#prepared-message');
  assert.equal(d.querySelector('#quote-recovery').hidden,false);
  assert.equal(draft.value,new URL(opened[0][0]).searchParams.get('text'));
  const copied=[];Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)},configurable:true});
  d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(copied,[draft.value]);assert.match(d.querySelector('#copy-status').textContent,/Message copied/);
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}},configurable:true});
  d.execCommand=()=>false;d.querySelector('#copy-quote').click();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(draft.selectionStart,0);assert.equal(draft.selectionEnd,draft.value.length);
  assert.match(d.querySelector('#copy-status').textContent,/selected/);
  form.elements.notes.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#whatsapp-fallback').hidden,true);assert.equal(d.querySelector('#whatsapp-fallback').hasAttribute('href'),false);
  form.elements.notes.value='';form.elements.shipOrHotel.value='';submit(w,form);
  const optionalMessage=new URL(opened.at(-1)[0]).searchParams.get('text');assert.ok(!optionalMessage.includes('Additional Notes:')&&!optionalMessage.includes('Cruise Ship / Hotel:'));
  assert.equal(requests.length,1);assert.ok(!form.querySelector('[name="email"],[name="phone"]'));
  w.open=()=>{throw new Error('popup denied');};submit(w,form);
  assert.match(d.querySelector('#quote-status').textContent,/could not open/);
  assert.ok(draft.value.includes(`Tour: ${tour.title}`));assert.equal(d.querySelector('#whatsapp-fallback').hidden,false);
  form.reset();assert.equal(d.querySelector('#quote-recovery').hidden,true);assert.equal(draft.value,'');
 } finally { await w.happyDOM.close(); }
}
const contact=await page('contact/',device);
try {
 const form=contact.d.querySelector('#quote-form');assert.equal(form.elements.tourId.options.length,11);
 fill(form);submit(contact.w,form);assert.equal(contact.opened.length,0);
 for (const tour of catalogue) {form.elements.tourId.value=tour.id;submit(contact.w,form);checkLink(contact.opened,tour,device);assert.equal(form.querySelector('#whatsapp-fallback').href,contact.opened.at(-1)[0]);}
} finally {await contact.w.happyDOM.close();}
}
const home=await page('');
try {assert.ok([...home.d.querySelectorAll('a')].some(a=>a.textContent==='Request a Quote'&&a.href.endsWith('/contact/')));} finally {await home.w.happyDOM.close();}
const listing=await page('tours/');
try {assert.equal(listing.d.querySelectorAll('.quote-link').length,10);for(const a of listing.d.querySelectorAll('.quote-link'))assert.ok(a.href.endsWith('/#request-quote'));} finally {await listing.w.happyDOM.close();}
console.log('PASS: all ten tour names, required/invalid fields, future date, message encoding, optional fields, manual-send wording, popup fallback, contact tour selection, home/list CTAs and no request storage/submission. Catalogue unchanged.');
