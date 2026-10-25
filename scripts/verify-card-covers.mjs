import {Window} from '../.tools/node_modules/happy-dom/lib/index.js';
import {chromium} from '../.tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='';
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'catalogue.json'),'utf8'));
const w=new Window();
try {
 w.eval(app.slice(app.indexOf('const esc ='),app.indexOf('const heading ='))+';window.testCover=cover;');
 const photo=url=>({url}),fixture={id:'axu-01',title:'Test tour',destinations:['Ephesus']};
 for(const [images,gallery,expected] of [
  [[photo('/first.jpg'),photo('/second.jpg')],[photo('/gallery.jpg')],'/first.jpg'],
  [[null,{},photo('  '),photo('/second.jpg')],[photo('/gallery.jpg')],'/second.jpg'],
  [[],[{},photo(''),photo('/gallery.jpg')],'/gallery.jpg'],
  [undefined,[photo('/gallery.jpg')],'/gallery.jpg'],
  [[photo(null)],[null,photo(' ')],null]
 ]) {
  w.document.body.innerHTML=w.testCover({...fixture,images,gallery});
  assert.equal(w.document.querySelector('img')?.getAttribute('src')??null,expected);
  assert.ok(w.document.querySelector('.cover-placeholder'));
 }
} finally {await w.happyDOM.close();}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname.slice(base.length)));
 if(!url.pathname.startsWith(base+'/')||(file!==root&&!file.startsWith(root+path.sep))){res.writeHead(404).end();return;}
 try {if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  for(const route of ['/tours/']) {
   await page.goto(origin+route);await page.locator('.tour-card').first().waitFor();
   const covers=page.locator('.cover');
   for(let i=0;i<await covers.count();i++) {
    const cover=covers.nth(i),href=await cover.locator('..').getAttribute('href');
    const tour=catalogue.find(t=>href===`${base}/tours/${t.slug}/`);assert.ok(tour);
    const hasPhoto=p=>typeof p?.url==='string'&&p.url.trim().length>0;
    const expected=tour.images?.find(hasPhoto)||tour.gallery?.find(hasPhoto);
    if(!expected||expected.url.startsWith('/'))assert.equal(await cover.locator('img').count(),expected?1:0);
    if(expected) {
     const img=cover.locator('img');
     if(expected.url.startsWith('/')){await img.scrollIntoViewIfNeeded();await page.waitForFunction(src=>[...document.querySelectorAll('.cover img')].some(img=>img.getAttribute('src')===src&&img.complete&&img.naturalWidth>0),expected.url);}
     else {assert.match(expected.url,/^https:\/\//,`${tour.id}: external cover must use HTTPS`);if(await img.count()===0)assert.ok(await cover.locator('.cover-placeholder').isVisible());continue;}
     assert.equal(await img.getAttribute('src'),expected.url);
     assert.equal(await img.evaluate(el=>getComputedStyle(el).objectFit),'cover');
     assert.ok(await img.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1;}));
    }
   }
   const cover=page.locator('.cover').first(),first=cover.locator('img');
   const size=await cover.boundingBox();await first.evaluate(img=>img.src='/missing-cover-test.jpg');
   await page.waitForFunction(()=>!document.querySelector('.cover img[src="/missing-cover-test.jpg"]'));
   assert.ok(await cover.locator('.cover-placeholder').isVisible());
   const after=await cover.boundingBox();assert.equal(after.width,size.width);assert.equal(after.height,size.height);
   // Reload for a screenshot of the working Efes cover rather than the failure fixture.
   await page.goto(origin+route);await page.locator('.tour-card').first().waitFor();
   const ephesus=page.locator(`.tour-card:has(a[href="${base}/tours/${catalogue[0].slug}/"])`).first();
   await ephesus.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.tour-card .cover img')?.naturalWidth>0);
   await ephesus.screenshot({path:path.resolve(root,`.tools/qa/card-cover-${route==='/'?'home':'tours'}-${width}.png`)});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: image priority, gallery fallback, blank/missing URLs, local photo loading, object-fit cover, placeholder size retention, tour list at 1440/390/320px. External photos are checked for HTTPS; remote loading depends on network availability.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
