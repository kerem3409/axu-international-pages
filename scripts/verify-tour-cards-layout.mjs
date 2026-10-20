import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const base = '/axu-international-pages';
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
assert.equal(catalogue.length, 10);

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const fileRoot = path.resolve(root, `.${pathname.slice(base.length)}`);
  if (!pathname.startsWith(`${base}/`) || (fileRoot !== root && !fileRoot.startsWith(root + path.sep))) {
    response.writeHead(404).end();
    return;
  }
  let file = fileRoot;
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    response.setHeader('Content-Type', ({'.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)] || 'text/html');
    response.end(fs.readFileSync(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}${base}`;
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
try {
  for (const [width, columns] of [[1440,3],[768,2],[390,1]]) {
    const page = await browser.newPage({viewport:{width,height:1100},isMobile:width<400,hasTouch:width<400});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/');
    assert.deepEqual(await page.locator('#home-experiences-title,#home-tours-title,#home-trust-title,.home-cta h2').allTextContents(), [
      'Our Experiences','Explore Our Tours','Why Travel with AXU TOURS?','Let the Aegean Surprise You.'
    ]);
    assert.equal(await page.locator('#home-title').textContent(),'Your Gateway to the Aegean.');
    assert.match(await page.locator('.home-trust').textContent(),/TÜRSAB License No: 14169/);
    assert.ok((await page.locator('.home-cta a').getAttribute('href')).endsWith('/contact/'));
    assert.ok((await page.locator('header .brand img').getAttribute('src')).endsWith('/images/axu-tours-logo.svg'));
    assert.ok((await page.locator('footer .brand img').getAttribute('src')).endsWith('/images/axu-tours-logo.svg'));
    assert.ok((await page.locator('.home-highlights-map').getAttribute('src')).endsWith('/images/home/aegean-highlights.png'));
    assert.ok((await page.locator('.home-discovery img').getAttribute('src')).endsWith('/images/home/aegean-discovery-map.png'));
    for (const selector of ['.home-highlights-map','.home-discovery img']) {
      await page.waitForFunction(sel=>{const img=document.querySelector(sel);return img?.complete&&img.naturalWidth>0;},selector);
    }
    assert.ok((await page.locator('.home-hero-actions a').first().getAttribute('href')).endsWith('/tours/'));
    assert.equal((await page.locator('header nav a').allTextContents()).join('|'),'Home|Experiences|Tours|About AXU|Contact');
    assert.equal(await page.locator('.home-experience-card').count(),4);
    assert.deepEqual(await page.locator('.home-experience-card').evaluateAll(cards=>cards.map(card=>card.getAttribute('href'))),[
      `${base}/shore-excursions/`,`${base}/tours/?type=Private%20tour`,`${base}/tours/?type=Group%20tour`,`${base}/multi-day-tours/`
    ]);
    const homeCards = page.locator('main .tour-card');
    await homeCards.first().waitFor();
    assert.equal(await homeCards.count(), 10, `Homepage count at ${width}px`);
    assert.deepEqual(await homeCards.locator('h3').allTextContents(), catalogue.map(tour => tour.title));
    const grid = page.locator('main .tour-grid').first();
    assert.equal(await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), columns, `Homepage grid columns at ${width}px`);
    for (let i=0; i<catalogue.length; i++) {
      const card = homeCards.nth(i);
      const paragraphs = card.locator('.card-summary p');
      assert.equal(await paragraphs.count(), catalogue[i].cardSummary.length, `${catalogue[i].id}: paragraph count`);
      const text = await paragraphs.allTextContents();
      assert.deepEqual(text, catalogue[i].cardSummary);
      assert.ok(text.every(paragraph => /[.!?]$/u.test(paragraph)), `${catalogue[i].id}: complete sentences`);
      const paragraphLayout = await paragraphs.evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return {fits:element.scrollHeight <= element.clientHeight + 1,lineHeight:style.lineHeight,fontSize:style.fontSize,marginBottom:style.marginBottom};
      }));
      assert.ok(paragraphLayout.every((item,index) => item.fits && Math.abs(parseFloat(item.lineHeight)/parseFloat(item.fontSize)-1.6) < .02 && parseFloat(item.marginBottom) === (index === paragraphLayout.length-1 ? 0 : 14)), `${catalogue[i].id}: readable, unclipped paragraph styling ${JSON.stringify(paragraphLayout)}`);
      assert.ok(await card.locator('.cover img').count(), `${catalogue[i].id}: cover image remains present`);
      assert.equal(await card.locator('.cover img').getAttribute('src'), catalogue[i].images?.find(photo => photo.url)?.url || catalogue[i].gallery?.find(photo => photo.url)?.url);
      assert.equal(await card.locator('.cover img').evaluate(image => getComputedStyle(image).objectFit), 'cover');
      assert.ok(await card.locator('.quote-link').isVisible());
      assert.ok(await card.locator('a[href$="#request-quote"]').count());
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Homepage horizontal overflow at ${width}px`);
    if (width === 1440 || width === 390) await page.screenshot({path:path.resolve(import.meta.dirname,'../../.visual-tools.local',`axu-home-stage4-${width}.png`),fullPage:true});

    const rowButtons = await page.locator('main .tour-card').evaluateAll(cards => cards.map(card => {
      const box = card.querySelector('.card-bottom').getBoundingClientRect();
      return {top:Math.round(box.top),bottom:Math.round(box.bottom)};
    }));
    for (let start=0; start<rowButtons.length; start+=columns) {
      const row = rowButtons.slice(start,start+columns);
      if (row.length>1) assert.ok(Math.max(...row.map(item=>item.top))-Math.min(...row.map(item=>item.top))<=2, `Card links align in row at ${width}px`);
    }
    if (width<400) {
      const menu=page.locator('.menu-toggle');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
      await page.locator('#navigation a[href="#experiences"]').click();
      assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.ok((await page.evaluate(()=>location.hash))==='#experiences');
    }
    await page.goto(origin + '/tours/');
    await page.locator('main .tour-card').first().waitFor();
    assert.equal(await page.locator('main .tour-card').count(), 10, `Tours page count at ${width}px`);
    assert.equal(await page.locator('main .tour-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), columns, `Tours grid columns at ${width}px`);
    assert.equal(await page.locator('#filters select').count(), 4, 'The catalogue keeps its destination, departure, duration and type filters');
    assert.equal(await page.locator('.home-experiences,.home-trust,.home-cta').count(), 0, 'Homepage-only sections stay off the tours catalogue');
    assert.deepEqual(errors, []);
    if (width === 1440) {
      const futurePage = await browser.newPage({viewport:{width,height:1100}});
      const futureTour = {...catalogue[0],id:'axu-99',slug:'future-catalogue-tour',title:'Future Catalogue Tour',cardSummary:['A new catalogue entry appears automatically in the homepage collection.']};
      await futurePage.route('**/catalogue.json', route => route.fulfill({contentType:'application/json',body:JSON.stringify([...catalogue,futureTour])}));
      await futurePage.goto(origin + '/');
      assert.equal(await futurePage.locator('main .tour-card').count(), 11);
      assert.equal(await futurePage.locator('main .tour-card h3').last().textContent(), 'Future Catalogue Tour');
      await futurePage.close();
    }
    await page.close();
    console.log(`PASS: ${width}px homepage and Tours cards, all ten in catalogue order, ${columns} columns, full summaries, aligned links and preserved cover URLs.`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
