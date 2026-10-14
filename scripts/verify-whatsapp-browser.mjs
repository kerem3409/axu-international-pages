import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..',process.env.AXU_SITE_ROOT || '.'),base='/axu-international-pages';
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'catalogue.json'),'utf8'));
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(!pathname.startsWith(base+'/')){res.writeHead(404).end();return;}
 let file=path.resolve(root,'.'+pathname.slice(base.length));
 if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try {if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const errors=[];
 async function createPage(width=1440) {
  const mobile=width<=390;
  const page=await browser.newPage({viewport:{width,height:1000},isMobile:mobile,hasTouch:mobile,userAgent:mobile ? (width===390 ? 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1') : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.openedWhatsApp=[];window.open=(...args)=>{window.openedWhatsApp.push(args);return null;};});
  return page;
 }
 let page=await createPage();
 function checkDestination(url,mobile) {
  assert.equal(url.origin+url.pathname,mobile ? 'https://wa.me/905367040944' : 'https://web.whatsapp.com/send');
  assert.equal(url.searchParams.get('phone'),mobile ? null : '905367040944');
  assert.equal(url.searchParams.get('type'),mobile ? null : 'phone_number');
  assert.equal(url.searchParams.get('app_absent'),mobile ? null : '1');
  assert.ok(!url.href.includes('+'));
 }
 for (const width of (process.env.AXU_FOOTER_ONLY ? [] : [1440,820,390,320])) {
  await page.close();page=await createPage(width);
  for (const tour of catalogue) {
   await page.goto(`${origin}/tours/${tour.slug}/`);await page.locator('#quote-form').waitFor();
   if(process.env.AXU_SITE_ROOT) {
    await page.locator('footer .release-info').waitFor();
    assert.match(await page.locator('footer .release-info').textContent(),/^Version 1\.0\.\d+\+[a-f0-9]{7} · Updated \d{2}\.\d{2}\.\d{4}$/);
    assert.equal(await page.locator('footer .release-info').evaluate(el=>getComputedStyle(el).fontSize),'11px');
   }
   assert.equal(await page.locator('[name="tourName"]').inputValue(),tour.title);
   assert.equal(await page.locator('#copy-quote').isVisible(),false);
   await page.locator('.td-hero a.button').click();await page.locator('#quote-form').scrollIntoViewIfNeeded();
   assert.equal(new URL(page.url()).hash,'#request-quote');
   const submit=page.getByRole('button',{name:'Send via WhatsApp'});
   await submit.click();assert.equal(await page.evaluate(()=>window.openedWhatsApp.length),0);
   await page.locator('[name="fullName"]').fill('John & Jane Smith');
   await page.locator('[name="tourDate"]').fill('2099-10-20');
   await page.locator('[name="guests"]').fill('1.5');await submit.click();
   assert.equal(await page.evaluate(()=>window.openedWhatsApp.length),0);
   await page.locator('[name="guests"]').fill('4');
   await page.locator('[name="shipOrHotel"]').fill('MSC Fantasia');
   await page.locator('[name="notes"]').fill('Morning departure.\nİzmir & Efes 🌅');
   await submit.click();
   const opened=await page.evaluate(()=>window.openedWhatsApp);assert.equal(opened.length,1);
   const url=new URL(opened[0][0]);checkDestination(url,width<=390);
   assert.ok(url.searchParams.get('text').includes(`Tour: ${tour.title}\nName: John & Jane Smith\nDate: 20 October 2099\nGuests: 4`));
   assert.ok(url.searchParams.get('text').includes('Cruise Ship / Hotel: MSC Fantasia\nAdditional Notes: Morning departure.'));
   assert.ok(url.searchParams.get('text').includes('İzmir & Efes 🌅'));
   assert.equal(await page.locator('#quote-form button').count(),1);
   assert.equal(await page.locator('#prepared-message,#quote-recovery,#whatsapp-fallback').count(),0);
   assert.equal(await page.locator('#copy-quote').isVisible(),true);
   assert.equal(await page.locator('#copy-quote').evaluate(el=>getComputedStyle(el).fontSize),'11px');
   if(tour.id==='axu-01') {
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);
    await page.locator('#copy-quote').click();
    assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),url.searchParams.get('text'));
    await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('denied');};});
    await page.locator('#copy-quote').click();
    await page.waitForFunction(()=>document.querySelector('#quote-status').textContent.includes('Message copied'));
    assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),url.searchParams.get('text'));
    await page.evaluate(()=>{document.execCommand=()=>false;});
    const dialogPromise=page.waitForEvent('dialog');
    const clickPromise=page.locator('#copy-quote').click();const dialog=await dialogPromise;
    assert.equal(dialog.type(),'prompt');assert.equal(dialog.defaultValue(),url.searchParams.get('text'));
    await dialog.dismiss();await clickPromise;
    assert.equal(await page.locator('#quote-form textarea').count(),2);
    await submit.click();
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tour.id}: overflow at ${width}`);
   assert.ok(await page.locator('#quote-form input, #quote-form select, #quote-form textarea, #quote-form button').evaluateAll(elements=>elements.every(el=>{const box=el.getBoundingClientRect();return box.width>0&&box.x>=0&&box.right<=innerWidth+1&&box.height>=44;})),`${tour.id}: field layout at ${width}`);
   if(tour.id==='axu-01')await page.locator('#quote-form').screenshot({path:path.resolve(import.meta.dirname,`../../.visual-tools.local/whatsapp-form-${width}.png`)});
   await page.locator('[name="notes"]').fill('Edited notes');assert.equal(await page.locator('#copy-quote').isVisible(),false);
   await page.locator('.td-hero-photo').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.td-counter').textContent(),'2 / 5');await page.keyboard.press('Escape');
  }
  await page.goto(origin+'/contact/');await page.locator('#quote-form').waitFor();
  assert.equal(await page.locator('[name="tourId"] option').count(),11);
  await page.locator('[name="fullName"]').fill('John & Jane Smith');await page.locator('[name="tourDate"]').fill('2099-10-20');await page.locator('[name="guests"]').fill('4');
  for(const tour of catalogue){await page.locator('[name="tourId"]').selectOption(tour.id);await page.getByRole('button',{name:'Send via WhatsApp'}).click();const href=await page.evaluate(()=>window.openedWhatsApp.at(-1)[0]);checkDestination(new URL(href),width<=390);assert.ok(new URL(href).searchParams.get('text').includes(`Tour: ${tour.title}\n`));}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto(origin+'/tours/');await page.locator('.quote-link').first().click();await page.locator('#quote-form').waitFor();assert.equal(new URL(page.url()).hash,'#request-quote');
 if(process.env.AXU_SITE_ROOT) {
  for(const width of [1440,320]) {
   await page.setViewportSize({width,height:1000});
   for(const route of ['/', '/tours/', '/about/', '/contact/', '/shore-excursions/', '/multi-day-tours/', '/404.html']) {
    await page.goto(origin+route);await page.locator('footer .release-info').waitFor();
    assert.equal(await page.locator('footer .release-info').count(),1);
    assert.ok(await page.locator('footer .release-info').evaluate(el=>{const box=el.getBoundingClientRect();return box.x>=0&&box.right<=innerWidth+1&&el.scrollWidth<=box.width+1;}),`Footer overflow: ${route} at ${width}`);
   }
   await page.locator('footer').screenshot({path:path.resolve(import.meta.dirname,`../../.visual-tools.local/release-footer-${width}.png`)});
  }
 }
 assert.deepEqual(errors,[]);
 console.log(process.env.AXU_FOOTER_ONLY ? 'PASS: release footer on home, listing, about, contact, categories and 404 at desktop/mobile widths; no footer overflow or JavaScript errors.' : 'PASS: real Chrome validation, WhatsApp URL/encoding/manual-send fallback, all ten detail/contact tour names at 1440/820/390/320px, accessible field sizes, no overflow or JavaScript errors, quote CTA anchors and lightbox retained. No WhatsApp messages sent.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
