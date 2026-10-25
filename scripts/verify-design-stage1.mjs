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
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
assert.match(app, /Your gateway<\/span> <span>to the Aegean\./);
assert.doesNotMatch(app, /Private journeys\. Remarkable places\.|TÜRSAB License No/);
assert.equal(catalogue.length, 10, 'The active catalogue should retain ten tours');
for (const tour of catalogue) {
  assert.ok(Array.isArray(tour.cardSummary) && tour.cardSummary.length <= 2 && tour.cardSummary.length > 0, `${tour.id} needs one or two card summary paragraphs`);
  const words = tour.cardSummary.join(' ').trim().split(/\s+/).length;
  assert.ok(words >= 35 && words <= 50, `${tour.id} English card summary has ${words} words`);
  assert.doesNotMatch(tour.cardSummary.join(' '), /[çğıöşüÇĞİÖŞÜ]/u, `${tour.id} card summary should be English`);
  for (const paragraph of tour.cardSummary) assert.match(paragraph, /[.!?]$/u, `${tour.id} paragraph should end with a complete sentence`);
}
assert.match(app, /filtered\.map\(card\)\.join\(''\)/, 'Catalogue should render filtered tours in order');
const homeBlock = app.match(/function home\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(homeBlock, /Selected Journeys/, 'Retain the approved selected journeys section');
assert.match(app, /tour\.cardSummary/);
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.match(css, /\.card-summary\{[^}]*line-height:1\.6/);
assert.match(css, /\.card-summary p\{[^}]*margin:[^}]*14px/);
assert.doesNotMatch(css.match(/\.card-summary\{[^}]*\}/)?.[0] || '', /line-clamp|overflow:hidden|min-height/);
assert.match(css, /\.tour-grid\{[^}]*repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:800px\)[\s\S]*?\.tour-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:520px\)[\s\S]*?\.tour-grid\{grid-template-columns:1fr/);

console.log(`PASS: ${pages.length} HTML pages have no test banner and use the linked SVG brand; all ${catalogue.length} tours have complete 35–50 word English card summaries and responsive, unclipped card text.`);
