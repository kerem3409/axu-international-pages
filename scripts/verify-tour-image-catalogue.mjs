import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalogue = JSON.parse(read('catalogue.json'));
const before = JSON.parse(execFileSync('git', ['show', '089c5b8:catalogue.json'], {cwd:root, encoding:'utf8'}));
const expectedIds = ['axu-01','axu-04','axu-05','axu-06','axu-07','axu-08','axu-09','axu-11','axu-12','axu-13'];
assert.equal(catalogue.length, 10, 'Keep exactly ten active tours');
assert.deepEqual(catalogue.map(tour => tour.id), expectedIds);
assert.deepEqual(before.map(tour => tour.id), expectedIds);

const allCovers = [];
for (const tour of catalogue) {
  const previous = before.find(item => item.id === tour.id);
  const {images:oldImages, gallery:oldGallery, ...oldNonVisual} = previous;
  const {images, gallery, ...nonVisual} = tour;
  assert.deepEqual(nonVisual, oldNonVisual, `${tour.id}: non-image tour data must remain unchanged`);
  assert.ok(Array.isArray(images) && images.length > 0, `${tour.id}: missing cover image record`);
  assert.ok(Array.isArray(gallery) && gallery.length >= 5, `${tour.id}: expected five gallery photos`);
  assert.equal(new Set(gallery.map(photo => photo.url)).size, gallery.length, `${tour.id}: repeated gallery photo`);
  assert.equal(images[0].url, gallery[0].url, `${tour.id}: cover and hero photo should agree`);
  allCovers.push(images[0].url);

  for (const photo of [...images, ...gallery]) {
    assert.ok(photo.url && photo.alt && photo.caption, `${tour.id}: incomplete image URL/ALT/caption`);
    const credit = photo.credit;
    assert.ok(credit?.title && credit.author && credit.sourceUrl && credit.license && credit.licenseUrl && credit.changes, `${tour.id}: incomplete photo credit`);
    assert.match(credit.sourceUrl, /^https:\/\//);
    assert.match(credit.licenseUrl, /^https:\/\//);
    if (photo.url.startsWith('/')) {
      const local = path.join(root, photo.url.replace(/^\/axu-international-pages\//, '').replaceAll('/', path.sep));
      assert.ok(fs.existsSync(local), `${tour.id}: missing local image ${photo.url}`);
      const data = fs.readFileSync(local);
      assert.equal(data.readUInt16BE(0), 0xffd8, `${photo.url}: expected JPEG`);
      assert.ok(data.length > 10000 && data.length < 1_500_000, `${photo.url}: unexpected image size`);
    } else assert.match(photo.url, /^https:\/\//, `${tour.id}: non-HTTPS image`);
  }
}
assert.equal(new Set(allCovers).size, 10, 'All active tours should have distinct covers');
console.log(`PASS: ten tour IDs unchanged; non-image content unchanged; ten distinct covers; five unique credited gallery photographs per tour; all local image files exist and are optimized JPEGs. ${catalogue.reduce((sum,tour)=>sum+[...tour.images,...tour.gallery].filter(photo=>photo.url.startsWith('https://')).length,0)} image references are hosted externally.`);
