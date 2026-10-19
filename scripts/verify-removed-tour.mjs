import {Window} from '../../node_modules/happy-dom/lib/index.js';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='/axu-international-pages',removed='biblical-ephesus-tour-from-kusadasi',target='/tours/ephesus-shore-excursion/';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalogue=JSON.parse(read('catalogue.json'));
assert.equal(catalogue.length,11);
assert.ok(catalogue.some(t=>t.id==='axu-01'&&t.slug==='ephesus-shore-excursion'));
assert.ok(!catalogue.some(t=>t.id==='axu-02'||t.id==='axu-03'||t.slug===removed||t.slug==='archeological-ephesus-tour-from-kusadasi'));
const redirect=read(`tours/${removed}/index.html`);
assert.match(redirect,/<meta http-equiv="refresh" content="0; url=\/axu-international-pages\/tours\/ephesus-shore-excursion\/">/);
assert.match(redirect,/location\.replace\('\/axu-international-pages\/tours\/ephesus-shore-excursion\/'\+location\.search\+location\.hash\)/);
assert.match(redirect,/rel="canonical" href="https:\/\/kerem3409\.github\.io\/axu-international-pages\/tours\/ephesus-shore-excursion\//);
assert.match(read('app.js'),/biblical-ephesus-tour-from-kusadasi/);
async function page(route) {
 const file=route==='/'?'index.html':`${route.slice(1)}index.html`;
 const w=new Window({url:`https://kerem3409.github.io${base}${route}`,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 w.document.write(read(file));
 w.fetch=async url=>({ok:true,json:async()=>url.endsWith('/version.json')?{version:'1.0.1+abcdef0',updated:'19.10.2026'}:catalogue});
 w.eval(read('app.js'));await new Promise(resolve=>setTimeout(resolve,30));return w;
}
for(const route of ['/','/tours/','/shore-excursions/','/contact/',...catalogue.map(t=>`/tours/${t.slug}/`)]) {
 const w=await page(route);
 try {
  assert.ok(![...w.document.querySelectorAll('a')].some(a=>a.href.includes(removed)),route);
  assert.ok(!w.document.body.textContent.includes('Private Biblical Ephesus Tour from Kusadasi Port with Lunch'),route);
  if(route==='/tours/'||route==='/shore-excursions/')assert.ok([...w.document.querySelectorAll('.tour-card')].every(card=>!card.textContent.includes('Private Biblical Ephesus')));
  if(route==='/tours/')assert.equal(w.document.querySelectorAll('.tour-card').length,11);
  if(route==='/shore-excursions/')assert.ok(![...w.document.querySelectorAll('.tour-card')].some(card=>card.textContent.includes('Biblical Ephesus Tour')));
  if(route==='/contact/') {const select=w.document.querySelector('[name="tourId"]');assert.equal(select.options.length,12);assert.ok(![...select.options].some(option=>['axu-02','axu-03'].includes(option.value)));}
 } finally {await w.happyDOM.close();}
}
const redirectTarget=await page(target);
try {assert.equal(redirectTarget.document.querySelector('#quote-form')?.getAttribute('data-tour-id'),'axu-01');} finally {await redirectTarget.happyDOM.close();}
console.log('PASS: axu-03 removed from catalogue, home, tours, shore excursions, related links and quote choices; previous URL has meta/JS redirect with query/hash preservation; Ephesus Shore Excursion form remains.');
