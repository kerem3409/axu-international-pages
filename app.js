const BASE="/axu-international-pages";
const main = document.querySelector('#main');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let tours = [], preview = true; const hostedTest = true;
const link = tour => `${BASE}/tours/${encodeURIComponent(tour.slug)}/`;
const visitorWording = item => ({
 'Terrace Houses are listed in the source itinerary.': 'Terrace Houses visit, subject to confirmation.',
 'Source also describes a local hand-weaving visit.': 'Local hand-weaving visit, subject to confirmation.',
 'Pickup in Izmir and travel to Sirince; source estimates about one hour.': 'Pickup in Izmir and travel to Sirince; approximately one hour, subject to confirmation.',
 'Visit one of the described craft venues: pottery, rug weaving or leather goods/model presentation.': 'Visit one craft venue: pottery, rug weaving or leather goods/model presentation.',
 'Pickup/transfer from central Izmir hotels or airport; source also offers Dikili Port and Kusadasi.': 'Pickup/transfer from central Izmir hotels or airport. Dikili Port and Kusadasi departures are subject to confirmation.',
 'The source discusses Thales, Anaximander, Anaximenes, urban planning and the region’s intellectual heritage.': 'Explore the theme of Thales, Anaximander, Anaximenes, urban planning and the region’s intellectual heritage.'
}[item] || item);

function cover(tour, large = false) {
 const image = tour.images?.[0];
 return `<div class="cover ${large ? 'cover-large' : ''} tone-${Number(tour.id.slice(-2)) % 4}">
  <div class="cover-placeholder"><span class="cover-brand">AXU TOURS</span><span class="cover-title">${esc(tour.title)}</span><span class="cover-caption">${esc(tour.destinations.join(' · '))}</span></div>
  ${image ? `<img src="${esc(image.url)}" alt="${esc(image.alt || tour.title)}" loading="${large ? 'eager' : 'lazy'}">` : ''}
 </div>`;
}
function card(tour) {
 return `<article class="tour-card"><a class="cover-link" href="${link(tour)}" aria-label="Explore ${esc(tour.title)}">${cover(tour)}</a>
 <div class="card-body"><p class="eyebrow">${esc(tour.destinations.join(' / '))}</p><h3><a href="${link(tour)}">${esc(tour.title)}</a></h3>
 <p class="card-summary">${esc(tour.summary)}</p><div class="card-meta"><span>From ${esc(tour.departure)}</span>${tour.duration ? `<span>${esc(tour.duration)}</span>` : ''}</div>
 <div class="card-bottom"><span>Request a Quote</span><a href="${link(tour)}">View tour</a></div></div></article>`;
}
const heading = (kicker, title, copy) => `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${copy}</p></div>`;
function home() {
 const featured = ['axu-01','axu-08','axu-09'].map(id => tours.find(t=>t.id===id)).filter(Boolean);
 return `<section class="hero"><div class="hero-copy"><p class="eyebrow">TÜRKIYE · THE AEGEAN COLLECTION</p><h1>Ancient places.<br>New perspectives.</h1><p>From the streets of Ephesus to the villages of the Aegean, find a journey that speaks to you.</p><div class="hero-actions"><a class="button" href="/tours">Explore our tours</a><a class="text-link" href="/shore-excursions">Visiting by cruise?</a></div><div class="hero-footnote"><span>01 /</span> A place to begin your next journey</div></div>
 <div class="hero-art">${tours[0] ? `<a href="${link(tours[0])}">${cover(tours[0],true)}</a>` : '<div class="empty">Tour collection coming soon.</div>'}<div class="hero-art-label"><span>THE AEGEAN, AT YOUR OWN PACE</span><span>AXU / 01</span></div></div></section>
 <section class="section"><div class="section-heading"><div><p class="eyebrow">FIND YOUR INSPIRATION</p><h2>A few journeys to begin with</h2></div><a class="text-link" href="/tours">View all tours</a></div><div class="tour-grid">${featured.map(card).join('')}</div></section>
 <section class="destinations section"><div class="section-heading"><div><p class="eyebrow">PLACES WITH A STORY</p><h2>Explore the Aegean</h2></div></div><div class="destination-grid">${['Ephesus','Pamukkale','Pergamon','Sirince'].map((d,i)=>`<a href="/tours?destination=${encodeURIComponent(d)}"><span class="destination-index">0${i+1}</span><h3>${d}</h3><span>Explore tours</span></a>`).join('')}</div></section>
 <section class="about-strip section"><div><p class="eyebrow">ABOUT AXU TOURS</p><h2>Your journey starts<br>with a conversation.</h2></div><div><p>Explore our collection of archaeological visits, shore excursions and multi-day itineraries. Tell us where you would like to go, and request a quote for your plans.</p><a class="text-link" href="/about">Meet AXU TOURS</a></div></section>
 <section class="contact-strip"><div><p class="eyebrow">MAKE IT YOUR JOURNEY</p><h2>What would you like to discover?</h2><p>Choose a tour and tell us about your visit.</p></div><a class="button light" href="/contact">Request a Quote</a></section>`;
}
function listing(path) {
 const shore = path === '/shore-excursions', multi = path === '/multi-day-tours';
 return `${heading('THE AXU TOURS COLLECTION',shore ? 'From ship to discovery.' : multi ? 'A journey beyond one day.' : 'Find your next journey.',shore ? 'Explore excursions departing from Kusadasi port.' : multi ? 'Follow the Seven Churches route through the Aegean region.' : 'Explore ancient sites, village streets and biblical heritage. Choose the places and pace that suit your visit.')}
 <section class="section catalog"><form id="filters" class="filters" aria-label="Filter tours">${filter('destination','Destination', [...new Set(tours.flatMap(t=>t.destinations))].sort())}${filter('departure','Departure',[...new Set(tours.map(t=>t.departure))].sort())}${filter('duration','Duration',[...new Set(tours.map(t=>t.durationGroup).filter(Boolean))])}${filter('type','Tour type',[...new Set(tours.flatMap(t=>t.types))].sort())}<button class="reset" type="reset">Clear filters</button></form><div class="results-heading"><p id="result-count" role="status" aria-live="polite"></p><span>Prices on request</span></div><div id="tour-results" class="tour-grid"></div></section>`;
}
function filter(name,label,options) {
 return `<label>${label}<select name="${name}"><option value="">All ${label.toLowerCase()}${label==='Duration' ? 's' : label==='Tour type' ? 's' : 's'}</option>${options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>`;
}
function setupFilters(path) {
 const form = document.querySelector('#filters');
 if (!form) return;
 const params = new URLSearchParams(location.search);
 for (const name of ['destination','departure','duration','type']) if ([...form.elements[name].options].some(o=>o.value===params.get(name))) form.elements[name].value=params.get(name);
 function update() {
  const data = Object.fromEntries(new FormData(form));
  const filtered = tours.filter(t=> (path!=='/shore-excursions'||t.types.includes('Shore excursion')) && (path!=='/multi-day-tours'||t.types.includes('Multi-day tour')) && (!data.destination||t.destinations.includes(data.destination)) && (!data.departure||t.departure===data.departure) && (!data.duration||t.durationGroup===data.duration) && (!data.type||t.types.includes(data.type)));
  document.querySelector('#tour-results').innerHTML = filtered.length ? filtered.map(card).join('') : '<div class="empty"><h2>No tours match these filters.</h2><p>Try a different combination or clear the filters.</p><button class="button" id="empty-reset">Clear filters</button></div>';
  document.querySelector('#result-count').textContent=`${filtered.length} ${filtered.length===1?'tour':'tours'} to explore`;
  const query = new URLSearchParams(Object.entries(data).filter(([,v])=>v));
  history.replaceState({},'',`${BASE}${path}/${query.size ? '?'+query : ''}`);
  document.querySelector('#empty-reset')?.addEventListener('click',()=>{form.reset();});
  bindImages();
 }
 form.addEventListener('change',update);
 form.addEventListener('reset',()=>{setTimeout(update,0);});
 update();
}
function requestForm() { return '<section class="quote-form"><div class="form-intro"><p class="eyebrow">TEST VERSION</p><h2>Request a Quote</h2><p>Quote requests are unavailable in this test version. No booking requests or contact details are collected.</p></div><button class="button full" type="button" disabled>Quote requests unavailable</button></section>'; }
function ephesusHighlights() {
 return listContent(['Private Ephesus Experience', 'Licensed Local Tour Guide', 'Comfortable Private Transportation', 'Flexible Cruise-Friendly Itinerary', 'No Mandatory Shopping Stops', "Return Planned Around Your Ship's Schedule"], '');
}
function ephesusStop(item) {
 const [title, ...description] = item.split(' \u2014 ');
 return '<div><h3>'+esc(title)+'</h3><p>'+esc(description.join(' \u2014 '))+'</p></div>';
}
function details(tour) {
 if (!tour) return `${heading('AXU TOURS','Tour not found.','This tour is not available.')}<div class="section"><a class="button" href="/tours">Browse tours</a></div>`;
 const ephesus = tour.id === 'axu-01';
 return `<section class="detail-heading"><a class="text-link" href="/tours">All tours</a><p class="eyebrow">${esc(ephesus ? 'Ephesus, T\u00fcrkiye' : tour.destinations.join(' / '))}</p><h1>${esc(tour.title)}</h1><p>${ephesus ? tour.summary.split("\n\n").map(esc).join("</p><p>") : esc(tour.summary)}</p>${ephesus ? '<a class="button" href="#request-quote">Request a Quote</a>' : ''}<div class="detail-meta"><span><small>DEPARTURE</small>${esc(tour.departure)}</span>${tour.duration ? `<span><small>DURATION</small>${esc(tour.duration)}</span>`:''}<span><small>PRICE</small>Request a Quote</span>${ephesus ? '<span><small>TOUR TYPE</small>Private Shore Excursion</span><span><small>LANGUAGE</small>English; other languages on request</span>' : ''}</div></section>
 <section class="detail-cover section" aria-label="Tour gallery">${cover(tour,true)}${tour.images.length>1 ? `<div class="gallery">${tour.images.slice(1).map(i=>`<img src="${esc(i.url)}" alt="${esc(i.alt)}" loading="lazy">`).join('')}</div>` : ''}</section>
 <section class="detail-layout section"><div class="detail-content"><p class="detail-notice">${ephesus ? 'Your private itinerary and return time are planned around your cruise schedule. Final arrangements will be confirmed with your quote.' : 'This itinerary is being prepared. The final programme, inclusions and travel arrangements will be confirmed with your quote.'}</p>
 ${ephesus ? `<section><h2>Tour Highlights</h2>${ephesusHighlights()}</section>` : ''}
 <section><p class="eyebrow">THE JOURNEY</p><h2>${tour.id==='axu-09' ? 'Your day-by-day itinerary' : ephesus ? 'Detailed Itinerary' : 'Itinerary'}</h2>${tour.itinerary.length ? `<ol class="itinerary">${tour.itinerary.map((item,i)=>`<li><span class="step-number">${String(i+1).padStart(2,'0')}</span>${ephesus ? ephesusStop(item) : `<p>${esc(visitorWording(item))}</p>`}</li>`).join('')}</ol>` : '<p>The detailed itinerary will be confirmed with your quote.</p>'}</section>
 <section><h2>What to expect</h2><div class="inclusions"><div><h3>${ephesus ? 'Included Services' : 'Included in the draft itinerary'}</h3>${listContent(tour.included,'Inclusions will be confirmed with your quote.')}</div><div><h3>${ephesus ? 'Excluded Services' : 'Not included in the draft itinerary'}</h3>${listContent(tour.excluded,'Exclusions will be confirmed with your quote.')}</div></div></section>
 <section><h2>Meeting & departure</h2><p>Departure: ${esc(tour.departure)}.</p><p>Your exact meeting point and pickup time will be confirmed with your quote.</p></section>
 <section><h2>${ephesus ? 'Important Information' : 'Before you travel'}</h2>${(ephesus || tour.conditionsConfirmed) && tour.conditions.length ? listContent(tour.conditions,'') : '<p>Please request confirmation of cancellation terms, admission arrangements and any accessibility requirements before booking.</p>'}</section></div><aside id="request-quote">${requestForm(tour)}</aside></section>
 <section class="section"><div class="section-heading"><div><p class="eyebrow">KEEP EXPLORING</p><h2>More journeys to consider</h2></div></div><div class="tour-grid">${tours.filter(t=>t.id!==tour.id).slice(0,3).map(card).join('')}</div></section>`;
}
function listContent(items,fallback) { return items.length ? `<ul>${items.map(i=>`<li>${esc(visitorWording(i))}</li>`).join('')}</ul>` : `<p>${fallback}</p>`; }
function about() {
 return `${heading('ABOUT AXU TOURS','The Aegean, at your own pace.','A collection of journeys through Türkiye’s ancient places and living culture.')}
 <section class="about-page section"><div class="about-statement"><span>AXU</span><p>Places to discover.<br>Journeys to make your own.</p></div><div><h2>Start with what interests you.</h2><p>Our collection brings together Ephesus, Pergamon, Pamukkale, Sirince and the ancient sites of Ionia. Explore shore excursions, archaeological itineraries and a multi-day Seven Churches route.</p><p>Choose an itinerary and share your dates, departure point and travel plans in a quote request.</p><a class="button" href="/tours">Explore tours</a></div></section>`;
}
function contact() {
 return `${heading('LET’S PLAN YOUR VISIT','Your journey starts here.','Tell us which tour interests you and when you would like to travel.')}
 <section class="contact-page section"><div><p class="eyebrow">REQUEST A QUOTE</p><h2>A few details.<br>A journey to look forward to.</h2><p>Choose your tour and share your preferred date and party size. Add your hotel or ship details if you have them.</p><p>The itinerary and price will need to be confirmed before a booking can be made.</p>${hostedTest ? '<p class="detail-notice">Test version: quote requests are currently unavailable.</p>' : preview ? '<p class="detail-notice">This local preview stores requests on this computer. Requests are not sent to AXU.</p>' : ''}</div><div>${tours.length ? requestForm() : '<p>Quote requests will open when tours are available.</p>'}</div></section>`;
}
function bindImages() {
 document.querySelectorAll('.cover img').forEach(img=>{img.addEventListener('error',()=>img.remove(),{once:true});});
}
function render() {
 const path=location.pathname.slice(BASE.length).replace(/\/$/,'')||'/';
 let title='AXU TOURS · Discover the Aegean';
 if(path==='/') main.innerHTML=home();
 else if(['/tours','/shore-excursions','/multi-day-tours'].includes(path)) {main.innerHTML=listing(path);setupFilters(path);title=`${path==='/tours'?'Tours':path==='/shore-excursions'?'Shore Excursions':'Multi-Day Tours'} · AXU TOURS`;}
 else if(path.startsWith('/tours/')) {const tour=tours.find(t=>t.slug===decodeURIComponent(path.slice(7)));main.innerHTML=details(tour);title=`${tour?.title||'Tour not found'} · AXU TOURS`;if(tour)document.querySelector('meta[name="description"]').content=tour.summary;}
 else if(path==='/about') {main.innerHTML=about();title='About AXU · AXU TOURS';}
 else if(path==='/contact') {main.innerHTML=contact();title='Request a Quote · AXU TOURS';}
 else main.innerHTML=heading('AXU TOURS','Page not found.','Explore our collection using the menu.');
 document.title=title;
 document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href').replace(BASE,'').replace(/\/$/,'')===(path==='/'?'':path))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 main.querySelectorAll('a[href^="/"]').forEach(a=>{const href=a.getAttribute('href');if(!href.startsWith(BASE+'/')){const [path,query]=href.split('?');a.setAttribute('href',BASE+path+(path.endsWith('/')?'':'/')+(query?'?'+query:''));}});
 bindImages();
}
document.querySelector('.menu-toggle').addEventListener('click',event=>{const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',open);document.querySelector('#navigation').classList.toggle('open',open);});
async function start() {
 try {
  const response=await fetch(`${BASE}/catalogue.json`);if(!response.ok)throw new Error('Tours could not be loaded.');
  const data=await response.json();tours=data;
  const bar=document.querySelector('#preview-bar');bar.hidden=!preview;
  if(hostedTest)bar.innerHTML='TEST VERSION <span>Draft itineraries · Quote requests unavailable</span>';
  render();
 } catch(error) {main.innerHTML=`<section class="section empty"><h1>We couldn’t load the tours.</h1><p>Please try again in a moment.</p><button class="button" id="retry">Try again</button></section>`;document.querySelector('#retry').addEventListener('click',start);}
}
start();
