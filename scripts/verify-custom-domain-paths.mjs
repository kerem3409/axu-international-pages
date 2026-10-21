import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tracked = execFileSync('git', ['ls-files'], {cwd:root, encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const htmlFiles = tracked.filter(file => file.endsWith('.html') && !file.startsWith('preview/'));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
const oldPrefix = '/axu-international-pages/';

assert.equal(catalogue.length, 10, 'The ten active tours remain in the catalogue');
assert.equal(fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^const BASE="";/m)?.[0], 'const BASE="";', 'Application paths resolve from the custom-domain root');

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(!html.includes(oldPrefix), `${file}: remove project-subdirectory URLs`);
  for (const [, asset] of html.matchAll(/(?:href|src)="(\/(?:styles\.css|app\.js|favicon\.svg|images\/axu-tours-logo\.svg))"/g)) {
    assert.ok(fs.existsSync(path.join(root, asset.slice(1))), `${file}: missing ${asset}`);
  }
}

for (const asset of ['styles.css', 'app.js', 'favicon.svg', 'images/axu-tours-logo.svg', 'images/home/aegean-highlights.png', 'images/home/aegean-discovery-map.png']) {
  assert.ok(fs.existsSync(path.join(root, asset)), `Missing deployed root asset: ${asset}`);
}

for (const tour of catalogue) {
  const routeFile = `tours/${tour.slug}/index.html`;
  assert.ok(fs.existsSync(path.join(root, routeFile)), `${tour.id}: direct detail route exists`);
  for (const photo of [...(tour.images || []), ...(tour.gallery || [])]) {
    if (photo.url?.startsWith('/')) {
      assert.ok(!photo.url.startsWith(oldPrefix), `${tour.id}: outdated photo path ${photo.url}`);
      assert.ok(fs.existsSync(path.join(root, photo.url.slice(1))), `${tour.id}: missing ${photo.url}`);
    }
  }
}

console.log(`PASS: ${htmlFiles.length} HTML shells, all ten direct tour routes, custom-domain assets and local tour photos use root paths.`);
