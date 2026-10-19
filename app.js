const BASE="/axu-international-pages";
const main = document.querySelector('#main');
async function showRelease() {
 try {
  const response = await fetch(`${BASE}/version.json`, {cache:'no-store'});
  if (!response.ok) return;
  const release = await response.json();
  if (!/^1\.0\.\d+\+[a-f0-9]{7}$/.test(release.version) || !/^\d{2}\.\d{2}\.\d{4}$/.test(release.updated)) return;
  const footer = document.querySelector('footer');
  if (!footer) return;
  const info = document.createElement('small');
  info.className = 'release-info';
  info.textContent = `Version ${release.version} · Updated ${release.updated}`;
  footer.append(info);
 } catch { /* Release metadata must not interrupt the tour interface. */ }
}
showRelease();
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
 const hasPhoto = photo => typeof photo?.url === 'string' && photo.url.trim().length > 0;
 const image = tour.images?.find(hasPhoto) || tour.gallery?.find(hasPhoto);
 return `<div class="cover ${large ? 'cover-large' : ''} tone-${Number(tour.id.slice(-2)) % 4}">
  <div class="cover-placeholder"><span class="cover-brand">AXU TOURS</span><span class="cover-title">${esc(tour.title)}</span><span class="cover-caption">${esc(tour.destinations.join(' · '))}</span></div>
  ${image ? `<img src="${esc(image.url)}" alt="${esc(image.alt || tour.title)}" loading="${large ? 'eager' : 'lazy'}">` : ''}
 </div>`;
}
function card(tour) {
 return `<article class="tour-card"><a class="cover-link" href="${link(tour)}" aria-label="Explore ${esc(tour.title)}">${cover(tour)}</a>
 <div class="card-body"><p class="eyebrow">${esc(tour.destinations.join(' / '))}</p><h3><a href="${link(tour)}">${esc(tour.title)}</a></h3>
 <p class="card-summary">${esc(tour.summary)}</p><div class="card-meta"><span>From ${esc(tour.departure)}</span>${tour.duration ? `<span>${esc(tour.duration)}</span>` : ''}</div>
 <div class="card-bottom"><a class="quote-link" href="${link(tour)}#request-quote">Request a Quote</a><a href="${link(tour)}">View tour</a></div></div></article>`;
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
function whatsappUrl(message) {
 return `https://wa.me/905367040944?text=${encodeURIComponent(message)}`;
}
const todayDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; };
function packageEnquiryFields(tour) {
 if (!tour?.enquiryVariant) return '';
 return `<p class="quote-privacy">Tour Type: <strong>${esc(tour.enquiryVariant)}</strong> · Price: On request</p>
 <label>Enquiry type<select name="enquiryType" required><option value="Individual Traveller">Individual Traveller</option><option value="Travel Agency">Travel Agency</option></select></label>
 <label id="agency-name-field" hidden>Agency Name (optional)<input name="agencyName" maxlength="200" autocomplete="organization"></label>
 <p class="quote-privacy">${esc(tour.agencyWelcome)} A quotation request is not a confirmed booking.</p>`;
}
function requestForm(tour) {
 return `<form id="quote-form" class="quote-form" ${tour ? `data-tour-id="${esc(tour.id)}"` : ''}>
 <div class="form-intro"><h2>Request a Quote</h2><p>Complete the form, then continue to WhatsApp. Tap Send in the AXU TOURS chat to deliver your request.</p></div>
 ${tour ? `<label class="full">Tour Name<textarea name="tourName" rows="3" readonly>${esc(tour.title)}</textarea></label>` : `<label class="full">Tour Name (required)<select name="tourId" required><option value="">Select a tour</option>${tours.map(item=>`<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('')}</select></label>`}
 <div id="package-enquiry-fields" class="full package-enquiry" ${tour?.enquiryVariant ? '' : 'hidden'}>${packageEnquiryFields(tour)}</div>
 <label class="full">Full Name (required)<input name="fullName" autocomplete="name" required maxlength="120"></label>
 <label><span id="quote-date-label">${tour?.enquiryVariant ? 'Preferred Start Date' : 'Tour Date'} (required)</span><input name="tourDate" type="date" min="${todayDate()}" required></label>
 <label>Number of Guests (required)<input name="guests" type="number" min="1" step="1" inputmode="numeric" required></label>
 <label class="full">Cruise Ship / Hotel Name (optional)<input name="shipOrHotel" maxlength="200"></label>
 <label class="full">Additional Notes (optional)<textarea name="notes" rows="3" maxlength="1500"></textarea></label>
 <button class="button full whatsapp-button" type="submit"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-13.3 7.9L3 21l1.6-4.7A9 9 0 1 1 21 11.5Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 4l1-1 3 2c-1 2-3 2-5 1-3-1-6-4-6-7 0-1 1-2 2-3Z"/></svg>Continue to WhatsApp</button>
 <p id="quote-status" class="form-status full" role="status" aria-live="polite"></p>
 <a id="copy-quote" class="text-link full" href="#" hidden>WhatsApp didn’t open? Copy message</a>
 </form>`;
}
function whatsappMessage(tour, values) {
 const [year, month, day] = values.tourDate.split('-').map(Number);
 const date = new Date(year, month-1, day, 12);
 const formattedDate = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(date);
 return ['Hello AXU TOURS,', '', 'I would like to request a quote.', '', `Tour: ${tour.title}`, ...(tour.enquiryVariant ? [`Tour Type: ${tour.enquiryVariant}`,`Enquiry Type: ${values.enquiryType}`, ...(values.enquiryType==='Travel Agency' && values.agencyName?.trim() ? [`Agency Name: ${values.agencyName.trim()}`] : [])] : []), `Name: ${values.fullName.trim()}`, `${tour.enquiryVariant ? 'Preferred Start Date' : 'Date'}: ${formattedDate}`, `Guests: ${values.guests}`, ...(values.shipOrHotel.trim() ? [`Cruise Ship / Hotel: ${values.shipOrHotel.trim()}`] : []), ...(values.notes.trim() ? [`Additional Notes: ${values.notes.trim()}`] : []), '', 'Please send me availability and pricing information.'].join('\n');
}
function bindQuoteForm() {
 const form = document.querySelector('#quote-form');
 if (!form) return;
 const status = form.querySelector('#quote-status'), copy = form.querySelector('#copy-quote');
 let preparedMessage='';
 const selectedTour=()=>tours.find(item=>item.id===(form.dataset.tourId || form.elements.tourId?.value));
 const syncPackageFields=()=>{
  const tour=selectedTour(),fields=form.querySelector('#package-enquiry-fields');
  fields.hidden=!tour?.enquiryVariant;fields.innerHTML=packageEnquiryFields(tour);
  form.querySelector('#quote-date-label').textContent=`${tour?.enquiryVariant ? 'Preferred Start Date' : 'Tour Date'} (required)`;
 };
 form.addEventListener('change',event=>{
  if(event.target.name==='enquiryType')form.querySelector('#agency-name-field').hidden=event.target.value!=='Travel Agency';
 });
 const clearPreparedMessage = () => { status.textContent='';copy.hidden=true;preparedMessage=''; };
 const validate = () => {
  form.elements.fullName.setCustomValidity(form.elements.fullName.value.trim() ? '' : 'Please enter your full name.');
  const guests = Number(form.elements.guests.value);
  form.elements.guests.setCustomValidity(Number.isSafeInteger(guests) && guests>0 ? '' : 'Please enter a whole number of guests greater than zero.');
  form.elements.tourDate.min = todayDate();
  const dateValue=form.elements.tourDate.value, date=new Date(`${dateValue}T12:00:00`);
  const [year,month,day]=dateValue.split('-').map(Number);
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(dateValue) && date.getFullYear()===year && date.getMonth()+1===month && date.getDate()===day && dateValue>=form.elements.tourDate.min;
  form.elements.tourDate.setCustomValidity(validDate ? '' : 'Please choose today or a future tour date.');
  if(selectedTour()?.enquiryVariant)form.elements.enquiryType.setCustomValidity(['Individual Traveller','Travel Agency'].includes(form.elements.enquiryType.value) ? '' : 'Please choose an enquiry type.');
 };
 const edit = event => {
  if(event.target.name==='tourId')syncPackageFields();
  clearPreparedMessage();validate();
 };
 form.addEventListener('input',edit);
 form.addEventListener('change',edit);
 copy.addEventListener('click',async event=>{
  event.preventDefault();
  const message = preparedMessage;
  if (!message) return;
  try {
   await navigator.clipboard.writeText(message);
   status.textContent='Message copied. Paste into the chat with +90 536 704 09 44.';
  } catch {
   const previousFocus=document.activeElement, temporary=document.createElement('textarea');
   temporary.value=message;temporary.style.cssText='position:fixed;left:-9999px;top:0';
   temporary.setAttribute('aria-hidden','true');document.body.append(temporary);
   temporary.focus();temporary.select();temporary.setSelectionRange(0,temporary.value.length);
   let copied=false;
   try { copied=document.execCommand('copy'); } catch { /* Use the browser copy dialog below. */ }
   finally { temporary.remove();previousFocus?.focus(); }
   if (!copied) window.prompt('Copy this message for +90 536 704 09 44:',message);
   status.textContent=copied ? 'Message copied. Paste into WhatsApp.' : 'Copy the message from the dialog and paste into WhatsApp.';
  }
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();clearPreparedMessage();validate();
  const tour = tours.find(item=>item.id===(form.dataset.tourId || form.elements.tourId?.value));
  if (!form.reportValidity()) return;
  if (!tour) { status.textContent='Please select an available tour.';return; }
  const values = Object.fromEntries(new FormData(form));
  preparedMessage=whatsappMessage(tour,values);copy.hidden=false;
  const url = whatsappUrl(preparedMessage);
  try { window.location.assign(url); }
  catch { /* The small copy link remains available when navigation is blocked. */ }
 });
 form.addEventListener('reset',()=>{clearPreparedMessage();for(const field of [form.elements.fullName,form.elements.guests,form.elements.tourDate,form.elements.enquiryType].filter(Boolean))field.setCustomValidity('');setTimeout(syncPackageFields,0);});
}
function pairedTourLink(tour) {
 const other=tours.find(item=>item.id===tour.pairedTourId);
 const extended=tours.find(item=>item.id===tour.extendedTourId);
 return (other ? `<p class="paired-tour"><a class="text-link" href="${link(other)}">${esc(tour.pairedTourText)}</a></p>` : '') + (extended ? `<p class="paired-tour"><a class="text-link" href="${link(extended)}">${esc(tour.extendedTourText)}</a></p>` : '');
}
function tourPhotos(tour) {
 const photos = (tour.gallery?.length ? tour.gallery : tour.images || []).map((photo, i) => ({...tour.images?.[i], ...photo, url: photo.url || tour.images?.[i]?.url, alt: photo.alt || tour.images?.[i]?.alt, caption: photo.caption || photo.alt || `${tour.destinations.join(' / ')} ${i+1}`}));
 if(tour.images?.length > photos.length) photos.push(...tour.images.slice(photos.length).map(photo=>({...photo,caption:photo.alt || tour.title})));
 while (photos.length < 5) photos.push({caption: `${tour.destinations.join(' / ')} / Tour view ${photos.length+1}`});
 return photos;
}
function tourPhoto(photo, index, hero = false, interactive = true) {
 const label = `PHOTO ${String(index+1).padStart(2,'0')}`;
 const inside = `<span class="td-photo-label"><strong>${label}</strong><small>${esc(photo.caption)}</small></span>`;
 const image = photo.url ? `<img src="${esc(photo.url)}" alt="${esc(photo.alt || photo.caption)}" loading="${hero ? 'eager' : 'lazy'}" decoding="async" ${hero ? 'fetchpriority="high"' : ''}>` : '';
 return `<${interactive ? 'button' : 'div'} class="td-photo${hero ? ' td-hero-photo' : ''}" ${interactive ? `type="button" data-photo="${index}" aria-label="Open ${esc(photo.caption)} in photo gallery"` : ''}>${inside}${image}</${interactive ? 'button' : 'div'}>`;
}
function itineraryStop(item, index) {
 const text = typeof item === 'string' ? visitorWording(item) : item.description || '';
 const separator = text.indexOf(' — ');
 const day = text.match(/^(Day \d+):\s*/);
 const title = typeof item === 'object' && item.title ? item.title : separator >= 0 ? text.slice(0, separator) : day ? day[1] : `Stop ${index+1}`;
 let description = separator >= 0 ? text.slice(separator+3) : day ? text.slice(day[0].length) : text;
 const duration = typeof item === 'object' && item.duration ? item.duration : description.match(/Suggested visit:\s*(.+)$/)?.[1];
 if(duration && typeof item === 'string') description = description.replace(/\s*Suggested visit:\s*.+$/, '');
 return `<li class="td-stop"><span>${String(index+1).padStart(2,'0')}</span><div><h3>${esc(title)}</h3><p>${esc(description)}</p>${duration ? `<p class="td-visit">Suggested visit: ${esc(duration)}</p>` : ''}${typeof item === 'object' && item.image ? tourPhoto(item.image,index,false,false) : ''}</div></li>`;
}
function photoCredits(photos) {
 const credited = photos.filter(photo => photo.url && photo.credit);
 if (!credited.length) return '';
 return `<details class="td-photo-credits"><summary>Photo Credits</summary><ul>${credited.map(photo => {
  const credit = photo.credit;
  return `<li><strong>${esc(credit.title)}</strong> — ${esc(credit.author)} · <a href="${esc(credit.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href="${esc(credit.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(credit.license)}</a><p>${esc(credit.changes)}${credit.shareAlike ? ` Adapted photograph distributed under ${esc(credit.license)}.` : ''}</p></li>`;
 }).join('')}</ul></details>`;
}
function details(tour) {
 if (!tour) return `${heading('AXU TOURS','Tour not found.','This tour is not available.')}<div class="section"><a class="button" href="/tours">Browse tours</a></div>`;
 const photos = tourPhotos(tour);
 const important = [...tour.conditions];
 important.push(`Departure: ${tour.departure}. Your exact meeting point and pickup time will be confirmed with your quote.`);
 if (!tour.conditionsConfirmed) important.push('Please request confirmation of cancellation terms, admission arrangements and any accessibility requirements before booking.');
 return `<article class="tour-detail" data-tour-id="${esc(tour.id)}">
 <div class="td-crumb"><a href="/tours">All Tours</a> / ${esc(tour.destinations.join(' / '))}</div>
 <section class="td-hero"><div><p class="eyebrow">${esc(tour.types.join(' · '))} · ${esc(tour.departure)}</p><h1>${esc(tour.title)}</h1>${tour.summary.split('\n\n').map(p=>`<p class="td-intro">${esc(p)}</p>`).join('')}${pairedTourLink(tour)}<a class="button" href="#request-quote">Request a Quote</a></div>${tourPhoto(photos[0],0,true)}</section>
 <section class="td-stats" aria-label="Tour information">${[['Departure',tour.departure],['Duration',tour.duration || 'Confirm with your quote'],['Tour Type',tour.types.join(' / ')],['Language',tour.language || 'English; other languages on request']].map(([label,value])=>`<div><small>${label}</small><b>${esc(value)}</b></div>`).join('')}</section>
 <section id="tour-gallery"><div class="td-section-heading"><div><p class="eyebrow">THE EXPERIENCE IN PICTURES</p><h2>Explore the journey</h2></div><span>Click any photo to view gallery</span></div><div class="td-gallery">${tourPhoto(photos[0],0)}<div class="td-gallery-grid">${photos.slice(1,5).map((p,i)=>tourPhoto(p,i+1)).join('')}</div></div>${photos.some(p=>!p.url) ? '<p class="td-note">Labeled placeholders mark photographs to be added. They are not destination photographs.</p>' : ''}</section>
 <section class="td-highlights"><div class="td-section-heading"><h2>Tour Highlights</h2></div><div class="td-features">${(tour.highlights || [...tour.types,...tour.destinations]).map(h=>`<div><b>${esc(h)}</b></div>`).join('')}</div></section>
 <div class="td-columns"><div class="td-content"><section id="tour-itinerary"><p class="eyebrow">THE JOURNEY</p><h2>Detailed Itinerary</h2><p class="td-note">The final programme, inclusions and travel arrangements will be confirmed with your quote.</p>${tour.itinerary.length ? `<ol class="td-itinerary">${tour.itinerary.map(itineraryStop).join('')}</ol>` : '<p>The detailed itinerary will be confirmed with your quote.</p>'}</section>
 <section><h2>Included / Excluded Services</h2><div class="td-inclusions"><div><h3>Included Services</h3>${listContent(tour.included,'Inclusions will be confirmed with your quote.')}</div><div><h3>Excluded Services</h3>${listContent(tour.excluded,'Exclusions will be confirmed with your quote.')}</div></div></section>
 <section><h2>Important Information</h2>${listContent(important,'')}</section></div>
 <aside id="request-quote" class="td-quote"><p class="eyebrow">MAKE IT YOUR JOURNEY</p>${pairedTourLink(tour)}${requestForm(tour)}</aside></div>
 <section class="td-related"><div class="td-section-heading"><div><p class="eyebrow">KEEP EXPLORING</p><h2>Related Tours</h2></div></div><div class="tour-grid">${tours.filter(t=>t.id!==tour.id).sort((a,b)=>Number(b.destinations.some(d=>tour.destinations.includes(d)))-Number(a.destinations.some(d=>tour.destinations.includes(d)))).slice(0,3).map(card).join('')}</div></section>
 ${photoCredits(photos)}
 <div class="td-overlay" hidden><section class="td-modal" role="dialog" aria-modal="true" aria-label="Tour photo gallery" tabindex="-1"><div class="td-modal-photo"></div><p class="td-modal-caption" aria-live="polite"></p><div class="td-modal-bar"><button type="button" data-gallery-action="prev" aria-label="Previous photo">← Previous</button><span class="td-counter"></span><button type="button" data-gallery-action="next" aria-label="Next photo">Next →</button><button type="button" data-gallery-action="close">Close</button></div></section></div></article>`;
}
function bindTourGallery() {
 const page = main.querySelector('.tour-detail');
 if (!page) return;
 const tour = tours.find(t=>t.id===page.dataset.tourId), photos = tourPhotos(tour);
 const overlay = page.querySelector('.td-overlay'), modal = overlay.querySelector('.td-modal');
 let active = 0, opener, touchStart, previousOverflow;
 const fallback = container => container.querySelectorAll('.td-photo img').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
 const show = index => {
  active = (index+photos.length)%photos.length;
  overlay.querySelector('.td-modal-photo').innerHTML = tourPhoto(photos[active],active,true,false);
  overlay.querySelector('.td-modal-caption').textContent = photos[active].caption;
  overlay.querySelector('.td-counter').textContent = `${active+1} / ${photos.length}`;
  fallback(overlay);
 };
 const close = () => {overlay.hidden=true;document.body.style.overflow=previousOverflow;opener?.focus();};
 page.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{
  opener=button;previousOverflow=document.body.style.overflow;show(Number(button.dataset.photo));overlay.hidden=false;document.body.style.overflow='hidden';modal.querySelector('[data-gallery-action="close"]').focus();
 }));
 overlay.addEventListener('click',event=>{const action=event.target.closest('[data-gallery-action]')?.dataset.galleryAction;if(action==='close'||event.target===overlay)close();else if(action==='prev')show(active-1);else if(action==='next')show(active+1);});
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}
  if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}
  if(event.key==='Tab'){const buttons=[...modal.querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 });
 overlay.addEventListener('touchstart',event=>{touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
 overlay.addEventListener('touchend',event=>{if(!touchStart)return;const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))show(active+(dx<0?1:-1));touchStart=null;},{passive:true});
 fallback(page);
}

function listContent(items,fallback) { return items.length ? `<ul>${items.map(i=>`<li>${esc(visitorWording(i))}</li>`).join('')}</ul>` : `<p>${fallback}</p>`; }
function about() {
 return `${heading('ABOUT AXU TOURS','The Aegean, at your own pace.','A collection of journeys through Türkiye’s ancient places and living culture.')}
 <section class="about-page section"><div class="about-statement"><span>AXU</span><p>Places to discover.<br>Journeys to make your own.</p></div><div><h2>Start with what interests you.</h2><p>Our collection brings together Ephesus, Pergamon, Pamukkale, Sirince and the ancient sites of Ionia. Explore shore excursions, archaeological itineraries and a multi-day Seven Churches route.</p><p>Choose an itinerary and share your dates, departure point and travel plans in a quote request.</p><a class="button" href="/tours">Explore tours</a></div></section>`;
}
function contact() {
 return `${heading('LET’S PLAN YOUR VISIT','Your journey starts here.','Tell us which tour interests you and when you would like to travel.')}
 <section class="contact-page section"><div><p class="eyebrow">REQUEST A QUOTE</p><h2>A few details.<br>A journey to look forward to.</h2><p>Choose your tour and share your preferred date and party size. Add your hotel or ship details if you have them.</p><p>The itinerary and price will need to be confirmed before a booking can be made.</p><p>Continue on WhatsApp to review and send your request to AXU TOURS.</p></div><div>${tours.length ? requestForm() : '<p>Quote requests will open when tours are available.</p>'}</div></section>`;
}
function bindImages() {
 document.querySelectorAll('.cover img').forEach(img=>{img.addEventListener('error',()=>img.remove(),{once:true});});
}
function render() {
 const path=location.pathname.slice(BASE.length).replace(/\/$/,'')||'/';
 if(path==='/tours/archeological-ephesus-tour-from-kusadasi') {
  location.replace(`${BASE}/tours/ephesus-shore-excursion/${location.search}${location.hash}`);
  return;
 }
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
 bindTourGallery();
 bindQuoteForm();
 if(location.hash==='#request-quote') requestAnimationFrame(()=>document.querySelector('#request-quote')?.scrollIntoView());
}
document.querySelector('.menu-toggle').addEventListener('click',event=>{const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',open);document.querySelector('#navigation').classList.toggle('open',open);});
async function start() {
 try {
  const response=await fetch(`${BASE}/catalogue.json`);if(!response.ok)throw new Error('Tours could not be loaded.');
  const data=await response.json();tours=data;
  const bar=document.querySelector('#preview-bar');bar.hidden=!preview;
  if(hostedTest)bar.innerHTML='TEST VERSION <span>Draft itineraries · Quotes via WhatsApp</span>';
  render();
 } catch(error) {main.innerHTML=`<section class="section empty"><h1>We couldn’t load the tours.</h1><p>Please try again in a moment.</p><button class="button" id="retry">Try again</button></section>`;document.querySelector('#retry').addEventListener('click',start);}
}
start();
