import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
function htmlFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    if (entry.name === '.git' || entry.name === '_site' || entry.name === 'node_modules') return [];
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.name.endsWith('.html') ? [file] : [];
  });
}

const pages = htmlFiles(root);
assert.ok(pages.length > 0);
for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(html, /preview-bar|TEST VERSION|LOCAL DESIGN PREVIEW|Draft itineraries|Taslak seyahat programları|WhatsApp üzerinden fiyat teklifleri/i, path.relative(root, file));
  assert.doesNotMatch(html, /class="brand"[^>]*>AXU<span>TOURS<\/span>/, path.relative(root, file));
  for (const match of html.matchAll(/<a class="brand"[^>]*>([\s\S]*?)<\/a>/g)) {
    assert.match(match[1], /images\/axu-tours-logo\.svg/, path.relative(root, file));
  }
}

const logo = fs.readFileSync(path.join(root, 'images/axu-tours-logo.svg'), 'utf8');
assert.match(logo, /<svg[^>]+viewBox="0 0 300 150"/);
assert.match(logo, /<title[^>]*>AXU TOURS<\/title>/);
assert.match(logo, /<text[^>]*>AXU<\/text>/);
assert.match(logo, /<text[^>]*>TOURS<\/text>/);
assert.doesNotMatch(logo, /<rect[^>]+fill=/i, 'Logo background must remain transparent');

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const summaryBlock = app.match(/const cardSummaries = \{([\s\S]*?)\n\};/);
assert.ok(summaryBlock, 'Card-specific summaries should exist');
const summaryEntries = [...summaryBlock[1].matchAll(/^\s*'([^']+)': '([^']*)',?$/gm)];
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
assert.equal(summaryEntries.length, catalogue.length);
assert.deepEqual(new Set(summaryEntries.map(([, id]) => id)), new Set(catalogue.map(tour => tour.id)));
for (const [, id, summary] of summaryEntries) {
  const words = summary.trim().split(/\s+/).length;
  assert.ok(words >= 40 && words <= 60, `${id} card summary has ${words} words`);
}
assert.match(app, /cardSummaries\[tour\.id\] \|\| tour\.summary/);
assert.match(fs.readFileSync(path.join(root, 'styles.css'), 'utf8'), /\.card-summary\{[^}]*line-height:1\.65[^}]*-webkit-line-clamp:6/);

console.log(`PASS: ${pages.length} HTML pages have no test banner and use the linked SVG brand; all ${catalogue.length} catalogue tours have 40–60 word card-only summaries; card text styling is bounded and readable.`);
