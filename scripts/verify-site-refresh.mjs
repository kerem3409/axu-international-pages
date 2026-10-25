// Install validation dependencies locally: npm install --prefix .tools --no-save playwright
import {chromium} from '../.tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'catalogue.json'),'utf8'));
const baseline=JSON.parse(execFileSync('git',['show','c31c2be:catalogue.json'],{cwd:root,encoding:'utf8'}));
assert.deepEqual(catalogue.map(({images,gallery,...tour})=>tour),baseline.map(({images,gallery,...tour})=>tour),'All non-image tour data is preserved');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=path.join(root,'.tools/qa');fs.mkdirSync(output,{recursive:true});
const errors=[];
try{
 for(const width of [1440,1024,820,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  // External navigation is blocked: this check never sends enquiries or opens live chats.
  await page.route('https://**/*',r=>r.abort());
  let navigation;
  for(const route of ['/','/tours/','/tours/pamukkale-tour-from-kusadasi/','/about/','/contact/','/shore-excursions/','/multi-day-tours/']){
   await page.goto(origin+route);await page.locator('main h1').waitFor();
   await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
   const nav=(await page.locator('#navigation').innerHTML()).replaceAll(' aria-current="page"','');navigation??=nav;assert.equal(nav,navigation);
   assert.equal(await page.locator('#navigation [aria-current="page"]').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${route}: horizontal overflow`);
   assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)),[],`${width} ${route}: image loading`);
   for(const scope of route==='/contact/'?['footer','.contact-page']:['footer']){
    const loc=page.locator(scope);
    for(const href of ['tel:+905367040944','mailto:info@axutours.com','https://wa.me/905367040944','https://www.instagram.com/axutours/'])assert.equal(await loc.locator(`a[href="${href}"]`).count(),1);
    const maps=await loc.locator('a[href^="https://www.google.com/maps/search/"]').getAttribute('href');
    assert.equal(new URL(maps).searchParams.get('query'),'Ortaklar Mahallesi, 1424. Sokak No: 38 D, 09330 Germencik / Aydın');
   }
   if(width<=1024){await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');await page.locator('.menu-toggle').click();await page.locator('#navigation a[aria-current]').click();await page.waitForLoadState();await page.locator('main h1').waitFor();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');await page.goto(origin+route);await page.locator('main h1').waitFor();}
   await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
   if(route==='/'){assert.equal(await page.locator('h1').innerText(),'Your gateway\nto the Aegean.');assert.equal(await page.getByText('Private journeys. Remarkable places.').count(),0);if([1440,390,320].includes(width)){await page.screenshot({path:path.join(output,`home-${width}.png`),fullPage:true});await page.locator('.axh-map').screenshot({path:path.join(output,`map-${width}.png`)});}}
   if([1440,390].includes(width)&&['/contact/','/tours/','/tours/pamukkale-tour-from-kusadasi/'].includes(route))await page.screenshot({path:path.join(output,`${route.split('/')[1]}-${route.split('/')[2]||'index'}-${width}.png`),fullPage:true});
   if(route==='/tours/'){await page.locator('[name="type"]').selectOption('Private tour');assert.equal(await page.locator('.tour-card').count(),catalogue.filter(t=>t.types.includes('Private tour')).length);await page.getByRole('button',{name:'Clear filters'}).click();await page.waitForTimeout(50);assert.equal(await page.locator('.tour-card').count(),catalogue.length);}
   if(route.includes('/pamukkale-tour')){if(width<=1024){await page.goto(origin+route);await page.locator('.td-hero-photo').waitFor();}await page.locator('.td-hero-photo').click();await page.locator('.td-overlay').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.td-overlay').isVisible(),false);}
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: 35 desktop/mobile page checks (1440/1024/820/390/320px), all photos, shared navigation, active states, mobile menu/Escape, contact links, filters, gallery, no overflow, no JS errors; non-image catalogue data unchanged. No requests sent.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
