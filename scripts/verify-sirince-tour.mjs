import { Window } from '../../node_modules/happy-dom/lib/index.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalogue = JSON.parse(read('catalogue.json'));
const before = JSON.parse(cp.execFileSync('git', ['show', 'HEAD:catalogue.json'], { cwd: root, encoding: 'utf8' }));
const tour = catalogue.find(item => item.id === 'axu-08');
const old = before.find(item => item.id === 'axu-08');

assert.ok(tour);
assert.equal(tour.slug, 'sirince-wine-tasting-relaxing-and-shopping-tour-c');
assert.equal(tour.title, 'Private Sirince Village & Local Traditions Tour from Izmir');
assert.equal(tour.departure, 'Izmir');
assert.equal(tour.duration, 'To be confirmed with your quote');
assert.equal(tour.durationGroup, null);
assert.deepEqual(tour.types, ['Day tour', 'Cultural & village life']);
assert.equal(tour.itinerary.length, 6);
assert.deepEqual(tour.itinerary.map(stop => stop.title), [
  'Departure from Izmir', 'Arrival in Sirince Village', 'Historical Village Walk',
  'Local Products and Village Shops', 'Free Time and Relaxation', 'Return to Izmir'
]);
assert.ok(tour.itinerary[0].description.includes('must be confirmed before booking'));
assert.ok(tour.itinerary[2].description.includes('if guide service is confirmed'));
assert.match(tour.itinerary[3].description, /Shopping is entirely optional\. No compulsory commercial stops\./);
assert.match(tour.itinerary[4].description, /optional wine-tasting experience.*not guaranteed or included/i);
assert.ok(!JSON.stringify(tour.itinerary).match(/pottery, rug weaving|leather goods\/model presentation|Visit one of the described craft venues/i));
assert.deepEqual(tour.included, []);
assert.ok(tour.excluded.some(text => /Personal shopping expenses/.test(text)));
assert.ok(tour.excluded.some(text => /Food and beverages.*unless expressly listed/.test(text)));
assert.ok(tour.conditions.some(text => /availability of a vehicle and guide.*must be confirmed/.test(text)));
assert.ok(tour.conditions.some(text => /Airport, cruise-port, Kusadasi.*not part of the standard package/.test(text)));
assert.ok(tour.conditions.some(text => /previous five-hour estimate is not guaranteed/.test(text)));
assert.ok(tour.conditions.some(text => /Food and beverage inclusion, optional tasting availability/.test(text)));
assert.equal(tour.conditionsConfirmed, false);
assert.equal(tour.price, null);
assert.equal(tour.images.length, 1);
assert.equal(tour.gallery.length, 5);
assert.equal(new Set(tour.gallery.map(photo => photo.url)).size, 5);
assert.equal(tour.images[0].url, tour.gallery[0].url);
for (const photo of tour.gallery) {
  assert.ok(photo.url.startsWith('https://'));
  assert.ok(photo.caption && photo.alt && photo.credit?.sourceUrl && photo.credit?.author && photo.credit?.license && photo.credit?.licenseUrl);
}
assert.equal(tour.gallery[0].credit.author, 'Justinianus');
assert.equal(tour.gallery[1].credit.author, 'Jocelyn Erskine-Kellie');
assert.equal(tour.gallery[2].credit.author, 'Jocelyn Erskine-Kellie');
assert.equal(tour.gallery[3].credit.author, 'Cengiz Z');
assert.equal(tour.gallery[4].credit.author, 'Nadiye Odabaşı');
assert.ok(tour.highlights.length >= 5);
for (const other of catalogue.filter(item => item.id !== 'axu-08')) assert.deepEqual(other, before.find(item => item.id === other.id));
assert.ok(before.some(item => item.id === 'axu-10'));
assert.ok(!catalogue.some(item => item.id === 'axu-10'));
assert.equal(catalogue.length, before.length - 1);

const win = new Window({ url: `https://kerem3409.github.io/axu-international-pages/tours/${tour.slug}/`, settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
try {
  win.document.write(read(`tours/${tour.slug}/index.html`));
  win.fetch = async url => ({ ok: true, json: async () => url.endsWith('/version.json') ? { version: 'test', updated: '19.10.2026' } : catalogue });
  win.eval(read('app.js'));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(win.document.querySelector('h1')?.textContent, tour.title);
  assert.equal(win.document.querySelector('#quote-form')?.getAttribute('data-tour-id'), tour.id);
  assert.equal(win.document.querySelectorAll('.td-stop').length, 6);
  assert.equal(win.document.querySelectorAll('.td-gallery img').length, 5);
  assert.equal(win.document.querySelectorAll('.td-photo-credits li').length, 5);
  assert.equal(win.document.querySelectorAll('.td-photo-credits a[href="https://www.pexels.com/license/"]').length, 2);
  assert.equal(win.document.querySelectorAll('.td-photo-credits a[href="https://creativecommons.org/licenses/by-sa/4.0/"]').length, 2);
} finally {
  await win.happyDOM.close();
}

console.log('PASS: axu-08 identity and URL retained; six-step itinerary, cautious services/transfers and duration, optional shopping/tasting, five attributed local photos, quote form and detail-gallery rendering; other tour records unchanged.');
