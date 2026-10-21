import {Window} from '../../node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='',removed='biblical-ephesus-tour-from-kusadasi',target='/tours/ephesus-shore-excursion/';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalogue=JSON.parse(read('catalogue.json'));
assert.equal(catalogue.length,10);
assert.ok(catalogue.some(t=>t.id==='axu-01'&&t.slug==='ephesus-shore-excursion'));
assert.ok(!catalogue.some(t=>t.id==='axu-02'||t.id==='axu-03'||t.slug===removed||t.slug==='archeological-ephesus-tour-from-kusadasi'));
const priene=catalogue.find(t=>t.id==='axu-07');
assert.ok(priene);assert.equal(priene.slug,'didyma-priene-miletos-tour-from-kusadasi');
assert.ok(!catalogue.some(t=>t.id==='axu-10'||t.slug==='philosophers-stone-tour-from-izmir'));
const redirect=read(`tours/${removed}/index.html`);
assert.match(redirect,/<meta http-equiv="refresh" content="0; url=\/tours\/ephesus-shore-excursion\/">/);
assert.match(redirect,/location\.replace\('\/tours\/ephesus-shore-excursion\/'\+location\.search\+location\.hash\)/);
assert.match(redirect,/rel="canonical" href="https:\/\/axutours\.tr\/tours\/ephesus-shore-excursion\//);
assert.match(read('app.js'),/biblical-ephesus-tour-from-kusadasi/);
assert.match(read('app.js'),/philosophers-stone-tour-from-izmir/);
assert.match(read('app.js'),/didyma-priene-miletos-tour-from-kusadasi\/\$\{location\.search\}\$\{location\.hash\}/);
const removedPrieneRedirect=read('tours/philosophers-stone-tour-from-izmir/index.html');
assert.match(removedPrieneRedirect,/<meta http-equiv="refresh" content="0; url=\/tours\/didyma-priene-miletos-tour-from-kusadasi\/">/);
assert.match(removedPrieneRedirect,/location\.replace\('\/tours\/didyma-priene-miletos-tour-from-kusadasi\/'\+location\.search\+location\.hash\)/);
assert.match(removedPrieneRedirect,/rel="canonical" href="https:\/\/axutours\.tr\/tours\/didyma-priene-miletos-tour-from-kusadasi\//);
async function page(route) {
 const file=route==='/'?'index.html':`${route.slice(1)}index.html`;
 const w=new Window({url:`https://axutours.tr${base}${route}`,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 w.document.write(read(file));
 w.fetch=async url=>({ok:true,json:async()=>url.endsWith('/version.json')?{version:'1.0.1+abcdef0',updated:'19.10.2026'}:catalogue});
 w.eval(read('app.js'));await new Promise(resolve=>setTimeout(resolve,30));return w;
}
for(const route of ['/','/tours/','/shore-excursions/','/contact/',...catalogue.map(t=>`/tours/${t.slug}/`)]) {
 const w=await page(route);
 try {
  assert.ok(![...w.document.querySelectorAll('a')].some(a=>a.href.includes(removed)),route);
  assert.ok(![...w.document.querySelectorAll('a')].some(a=>a.href.includes('philosophers-stone-tour-from-izmir')),route);
  assert.ok(!w.document.body.textContent.includes('Private Biblical Ephesus Tour from Kusadasi Port with Lunch'),route);
  assert.ok(!w.document.body.textContent.includes("Philosopher's Stone: Didyma, Miletus and Priene from Izmir"),route);
  if(route==='/tours/'||route==='/shore-excursions/')assert.ok([...w.document.querySelectorAll('.tour-card')].every(card=>!card.textContent.includes('Private Biblical Ephesus')));
  if(route==='/tours/')assert.equal(w.document.querySelectorAll('.tour-card').length,10);
  if(route==='/shore-excursions/')assert.ok(![...w.document.querySelectorAll('.tour-card')].some(card=>card.textContent.includes('Biblical Ephesus Tour')));
  if(route==='/contact/') {const select=w.document.querySelector('[name="tourId"]');assert.equal(select.options.length,11);assert.ok(![...select.options].some(option=>['axu-02','axu-03','axu-10'].includes(option.value)));}
 } finally {await w.happyDOM.close();}
}
const redirectTarget=await page(target);
try {assert.equal(redirectTarget.document.querySelector('#quote-form')?.getAttribute('data-tour-id'),'axu-01');} finally {await redirectTarget.happyDOM.close();}
const prienePage=await page('/tours/didyma-priene-miletos-tour-from-kusadasi/');
try {assert.equal(prienePage.document.querySelector('#quote-form')?.getAttribute('data-tour-id'),'axu-07');assert.equal(prienePage.document.querySelector('h1')?.textContent,priene.title);} finally {await prienePage.happyDOM.close();}
console.log('PASS: axu-02/03/10 removed; Ephesus and Priene routes stay intact; both previous Ephesus URLs and the Philosopher’s Stone URL redirect correctly; catalogue/list/form contain ten remaining tours.');
