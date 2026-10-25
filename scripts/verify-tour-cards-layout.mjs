import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '../.tools/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const base = '';
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
    await page.locator('.axh-tour').first().waitFor();
    assert.equal(await page.locator('#home-title').textContent(),'Your gateway to the Aegean.');
    assert.equal(await page.locator('.axh-category').count(),4);
    assert.equal(await page.locator('.axh-tour').count(),3);
    assert.deepEqual(await page.locator('.axh-category').evaluateAll(cards=>cards.map(c=>c.getAttribute('href'))),['/shore-excursions/','/tours/?type=Private%20tour','/tours/?type=Group%20tour','/multi-day-tours/']);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(origin + '/tours/');
    await page.locator('main .tour-card').first().waitFor();
    assert.equal(await page.locator('main .tour-card').count(), 10, `Tours page count at ${width}px`);
    const cards=page.locator('main .tour-card');
    assert.deepEqual(await cards.locator('h3').allTextContents(),catalogue.map(t=>t.title));
    for(let i=0;i<catalogue.length;i++){
      const card=cards.nth(i),paragraphs=card.locator('.card-summary p');
      assert.deepEqual(await paragraphs.allTextContents(),catalogue[i].cardSummary);
      assert.ok(await paragraphs.evaluateAll(elements=>elements.every(el=>el.scrollHeight<=el.clientHeight+1)),'Summary text must not be clipped');
      assert.equal(await card.locator('.cover img').getAttribute('src'),catalogue[i].images[0].url);
      assert.equal(await card.locator('.cover img').evaluate(el=>getComputedStyle(el).objectFit),'cover');
      assert.ok(await card.locator('.quote-link').isVisible());
    }
    const bottoms=await cards.evaluateAll(elements=>elements.map(el=>Math.round(el.querySelector('.card-bottom').getBoundingClientRect().top)));
    for(let i=0;i<bottoms.length;i+=columns){const row=bottoms.slice(i,i+columns);assert.ok(Math.max(...row)-Math.min(...row)<=2,'Card actions must align in each row');}
    assert.equal(await page.locator('main .tour-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), columns, `Tours grid columns at ${width}px`);
    assert.equal(await page.locator('#filters select').count(), 4, 'The catalogue keeps its destination, departure, duration and type filters');
    assert.equal(await page.locator('.home-experiences,.home-trust,.home-cta').count(), 0, 'Homepage-only sections stay off the tours catalogue');
    assert.deepEqual(errors, []);
    if (width === 1440) {
      const futurePage = await browser.newPage({viewport:{width,height:1100}});
      const futureTour = {...catalogue[0],id:'axu-99',slug:'future-catalogue-tour',title:'Future Catalogue Tour',cardSummary:['A new catalogue entry appears automatically in the homepage collection.']};
      await futurePage.route('**/catalogue.json', route => route.fulfill({contentType:'application/json',body:JSON.stringify([...catalogue,futureTour])}));
      await futurePage.goto(origin + '/tours/');
      assert.equal(await futurePage.locator('main .tour-card').count(), 11);
      assert.equal(await futurePage.locator('main .tour-card h3').last().textContent(), 'Future Catalogue Tour');
      await futurePage.close();
    }
    await page.close();
    console.log(`PASS: ${width}px approved homepage and Tours cards, all ten catalogue entries, ${columns} columns, full summaries, aligned links and preserved cover URLs.`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
