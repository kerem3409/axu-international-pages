import {Window} from '../../node_modules/happy-dom/lib/index.js';
import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='/axu-international-pages',removed='archeological-ephesus-tour-from-kusadasi',target='/tours/ephesus-shore-excursion/';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalogue=JSON.parse(read('catalogue.json'));assert.equal(catalogue.length,11);
assert.ok(catalogue.some(t=>t.id==='axu-01'&&t.slug==='ephesus-shore-excursion'));
assert.ok(!catalogue.some(t=>t.id==='axu-02'||t.slug===removed));
for(const route of ['/','/tours/','/contact/',...catalogue.map(t=>`/tours/${t.slug}/`)]) {
 const w=new Window({url:`https://example.test${base}${route}`,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 try {
  w.document.write(read(route==='/'?'index.html':route.slice(1)+'index.html'));
  w.fetch=async url=>({ok:true,json:async()=>url.endsWith('/version.json')?{version:'1.0.1+abcdef0',updated:'19.10.2026'}:catalogue});
  w.eval(read('app.js'));await new Promise(resolve=>setTimeout(resolve,30));
  assert.ok(![...w.document.querySelectorAll('a')].some(a=>a.href.includes(removed)),route);
  assert.ok(!w.document.body.textContent.includes('Private Archaeological Ephesus Tour from Kusadasi Port'),route);
  if(route==='/tours/')assert.equal(w.document.querySelectorAll('.tour-card').length,11);
  if(route==='/contact/') {
   const select=w.document.querySelector('[name="tourId"]');assert.equal(select.options.length,12);
   assert.ok(![...select.options].some(option=>option.value==='axu-02'));
  }
 } finally {await w.happyDOM.close();}
}
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname.slice(base.length)));
 if(!pathname.startsWith(base+'/')||(file!==root&&!file.startsWith(root+path.sep))){res.writeHead(404).end();return;}
 try {if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  for(const suffix of ['', '/', '/?from=old#request-quote']) {
   await page.goto(`${origin}/tours/${removed}${suffix}`);
   await page.waitForURL(url=>url.pathname===base+target);await page.locator('#quote-form').waitFor();
   assert.equal(await page.locator('h1').textContent(),catalogue.find(t=>t.id==='axu-01').title);
   assert.equal(await page.locator('#quote-form').getAttribute('data-tour-id'),'axu-01');
   if(suffix.includes('?')){assert.equal(new URL(page.url()).search,'?from=old');assert.equal(new URL(page.url()).hash,'#request-quote');}
  }
  // Check the app fallback when a host serves its shared HTML instead of the redirect file.
  await page.route(`**/tours/${removed}/`,r=>r.fulfill({contentType:'text/html',body:read('index.html')}));
  await page.goto(`${origin}/tours/${removed}/`);await page.waitForURL(url=>url.pathname===base+target);await page.locator('#quote-form').waitFor();
  await context.close();
 }
 const noJs=await browser.newContext({javaScriptEnabled:false}),page=await noJs.newPage();
 await page.goto(`${origin}/tours/${removed}/`);await page.waitForURL(url=>url.pathname===base+target);await noJs.close();
 console.log('PASS: eleven tours; removed tour absent from lists/related links/contact choices; desktop/mobile redirect with slash, without slash, query/hash, app fallback and no JavaScript; axu-01 quote form retained.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
