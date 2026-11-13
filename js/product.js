
function toggleMenu(force){
  const menu=document.getElementById('site-side-menu');
  const overlay=document.getElementById('site-overlay');
  if(!menu||!overlay)return;
  const shouldOpen=typeof force==='boolean'?force:!menu.classList.contains('active');
  menu.classList.toggle('active',shouldOpen);overlay.classList.toggle('active',shouldOpen);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')toggleMenu(false)});



(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => 'PKR ' + Number(n || 0).toLocaleString('en-PK');
const WA = '923397055500';
const catLabels = { bras:'Bras', panties:'Panties', sets:'Bra & Panty Sets', accessories:'Accessories', 'body-shaper':'Body Shaper' };
const CART_KEY = 'hssp_cart', WISH_KEY = 'hssp_wishlist', RECENT_KEY = 'hssp_recent_ids';
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const sizeRank = s => { const i = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL','4XL'].indexOf(String(s).toUpperCase()); return i < 0 ? 100 : i; };
const sizeSort = (a, b) => (sizeRank(a) - sizeRank(b)) || String(a).localeCompare(String(b), undefined, {numeric:true});
const COLOR_HEX = {black:'#161214',white:'#ffffff',nude:'#e8c7b0',skin:'#e8c7b0',beige:'#d8bfa4',pink:'#e68aa5',red:'#c0272d',maroon:'#7a1c2b',wine:'#72283f',blue:'#2f4f8f',navy:'#1b2a4a',green:'#2e7d4f',yellow:'#f3d03e',purple:'#6a3d9a',grey:'#8a8a8a',gray:'#8a8a8a',brown:'#7a5230',orange:'#e87b2f',cream:'#f3e6cf',ivory:'#f6efe0',lilac:'#c8a2c8',peach:'#f4b9a0',rose:'#d88aa0'};
const colorHex = name => { const n = String(name || '').toLowerCase(); for (const k in COLOR_HEX) if (n.includes(k)) return COLOR_HEX[k]; return ''; };
const pct = p => Number(p.comparePrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.comparePrice)) * 100) : 0;
const stars = avg => `<span class="stars" style="--p:${Math.max(0, Math.min(100, (Number(avg) || 0) / 5 * 100))}%" aria-hidden="true">★★★★★</span>`;

let P = null, ALL = [], media = [];
const S = { size:'', color:'', cupSize:'', qty:1, idx:0 };
const live = () => (P.variants || []).filter(v => v.active !== false && v.active !== 0);
const vFor = (size, color, cupSize) => live().find(v => v.size === size && v.color === color && String(v.cupSize || '').toUpperCase() === String(cupSize || '').toUpperCase()) || null;
const avail = (size, color, cupSize) => live().some(v => v.size === size && v.color === color && (cupSize === undefined || String(v.cupSize || '').toUpperCase() === String(cupSize || '').toUpperCase()) && Number(v.stock) > 0);
const cur = () => vFor(S.size, S.color, S.cupSize);
const sizesOf = () => [...new Set(live().map(v => v.size))].sort(sizeSort);
const colorsOf = () => [...new Set(live().map(v => v.color))];
const cupsOf = () => [...new Set(live().map(v => String(v.cupSize || '').toUpperCase()))].sort((a,b)=> ['A','B','C','D','FF'].indexOf(a)-['A','B','C','D','FF'].indexOf(b));
function syncCup() { if (!live().some(v => v.size === S.size && v.color === S.color && String(v.cupSize || '').toUpperCase() === S.cupSize && Number(v.stock)>0)) { const matched = live().find(v => v.size === S.size && v.color === S.color && Number(v.stock)>0) || live().find(v => v.size === S.size && v.color === S.color); S.cupSize = matched ? String(matched.cupSize || '').toUpperCase() : ''; } }
const swatchImg = (prod, color) => { const im = (prod.images || []).find(i => i && i.url && (i.color || '') === color); return im ? im.url : ''; };
const getWish = () => jget(WISH_KEY, []);
const waLink = text => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

function toast(msg, linkText, href) {
  const t = $('pdp-toast'); t.innerHTML = esc(msg) + (linkText ? `<a href="${esc(href)}">${esc(linkText)}</a>` : '');
  t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 3800);
}
function updateCartBadge() {
  const n = jget(CART_KEY, []).reduce((a, i) => a + (Number(i.qty) || 0), 0);
  document.querySelectorAll('.header-actions a[aria-label="Cart"] .badge').forEach(b => { b.textContent = n; });
  document.querySelectorAll('.header-actions a[aria-label="Cart"]').forEach(a => { a.href = 'index.html?cart=1'; a.title = 'Open cart'; });
}
function fail(msg) { $('pdp-root').innerHTML = `<div class="pdp-fail"><h2>${esc(msg)}</h2><p><a href="index.html#collection">← Back to the shop</a></p></div>`; }

function buildMedia() {
  const imgs = (P.images || []).filter(i => i && i.url).map(i => ({type:'img', url:i.url, color:i.color || ''}));
  if (!imgs.length && P.image_url) imgs.push({type:'img', url:P.image_url, color:''});
  const vids = (P.videos || []).filter(v => v && v.url).map(v => ({type:'video', url:v.url, color:''}));
  media = imgs.concat(vids);
}

function renderGallery() {
  const m = media[S.idx] || media[0];
  $('pdp-main').innerHTML = !m ? '<div class="pdp-noimg">Photo coming soon</div>' : m.type === 'video'
    ? `<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
    : `<img src="${esc(m.url)}" alt="${esc(P.name)}" onerror="this.style.opacity='.25'">`;
  $('pdp-thumbs').innerHTML = media.length > 1 ? media.map((x, i) => x.type === 'video'
    ? `<button type="button" class="pdp-thumb vid${i === S.idx ? ' on' : ''}" data-i="${i}" aria-label="Play video"><video src="${esc(x.url)}#t=0.1" muted preload="metadata"></video><span>▶</span></button>`
    : `<button type="button" class="pdp-thumb${i === S.idx ? ' on' : ''}" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${esc(x.url)}" alt="" loading="lazy"></button>`).join('') : '';
  document.querySelectorAll('.pdp-arrow').forEach(a => a.classList.toggle('on', media.length > 1));
  const on = $('pdp-thumbs').querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({block:'nearest', inline:'center'});
}
function goMedia(i, fromColor) {
  if (!media.length) return;
  S.idx = (i + media.length) % media.length; renderGallery();
  const m = media[S.idx];
  if (!fromColor && m.type === 'img' && m.color && m.color !== S.color && colorsOf().includes(m.color)) { setColor(m.color, true); }
}

function renderVariantUI() {
  syncCup();
  const sizes = sizesOf(), colors = colorsOf(), cups = cupsOf();
  $('pdp-size-wrap').style.display = (sizes.length === 1 && !sizes[0]) ? 'none' : '';
  $('pdp-color-wrap').style.display = (colors.length === 1 && !colors[0]) ? 'none' : '';
  $('pdp-size-label').textContent = S.size;
  $('pdp-sizes').innerHTML = sizes.map(sz => `<button type="button" class="pdp-pill${sz === S.size ? ' on' : ''}${colors.some(c => avail(sz, c)) ? '' : ' na'}" data-size="${esc(sz)}">${esc(sz)}</button>`).join('');
  $('pdp-color-label').textContent = S.color;
  $('pdp-colors').innerHTML = colors.map(c => {
    const img = swatchImg(P, c), hex = colorHex(c), ok = sizes.some(sz => avail(sz, c));
    return `<button type="button" class="pdp-sw${c === S.color ? ' on' : ''}${ok ? '' : ' na'}" data-color="${esc(c)}" title="${esc(c)}" aria-label="${esc(c)}">${img ? `<img src="${esc(img)}" alt="">` : `<i style="background:${hex || '#ead7dd'}">${hex ? '' : esc((c || '?')[0].toUpperCase())}</i>`}</button>`;
  }).join('');
  $('pdp-cup-wrap').style.display = cups.length === 1 && !cups[0] ? 'none' : '';
  $('pdp-cup-label').textContent = S.cupSize || 'Not applicable';
  $('pdp-cups').innerHTML = cups.filter(Boolean).map(c => `<button type="button" class="pdp-pill${c === S.cupSize ? ' on' : ''}${avail(S.size, S.color, c) ? '' : ' na'}" data-cup="${esc(c)}" aria-pressed="${c===S.cupSize}">${esc(c)}</button>`).join('');
  const v = cur(), stock = v ? Number(v.stock) : 0;
  const st = $('pdp-stock');
  st.className = 'pdp-stock' + (v && stock > 0 ? (stock <= 5 ? ' low' : ' ok') : ' low');
  st.textContent = !v ? 'This size, cup and colour combination is not available.' : stock < 1 ? 'Sold out in this size, cup and colour.' : stock <= 5 ? `Only ${stock} left in stock` : 'In stock';
  const ok = !!v && stock > 0;
  [$('pdp-add'), $('pdp-buy'), $('pdp-add2')].forEach(b => { if (b) { b.disabled = !ok; } });
  $('pdp-add').textContent = ok ? 'ADD TO CART' : 'SOLD OUT'; $('pdp-add2').textContent = ok ? 'ADD TO CART' : 'SOLD OUT';
  const label = v ? `${P.name} (${v.color}${v.color && v.size ? ', ' : ''}${v.size}${v.cupSize ? ', Cup '+v.cupSize : ''})` : P.name;
  $('pdp-wa').href = waLink(`Hi Her Second Skin PK, I would like to order: ${label} x ${S.qty}. ${location.href}`);
  setQty(S.qty);
}
function setSize(sz) {
  S.size = sz;
  if (!avail(S.size, S.color)) { const c = colorsOf().find(x => avail(S.size, x)); if (c !== undefined) S.color = c; }
  syncCup(); renderVariantUI();
}
function setCup(c) { S.cupSize = c; renderVariantUI(); }
function setColor(c, fromGallery) {
  S.color = c;
  if (!avail(S.size, S.color)) { const sz = sizesOf().find(x => avail(x, S.color)); if (sz !== undefined) S.size = sz; }
  syncCup(); renderVariantUI();
  if (!fromGallery) { const i = media.findIndex(m => m.type === 'img' && m.color === c); if (i >= 0) goMedia(i, true); }
}
function setQty(n) {
  const v = cur(), max = v ? Math.max(1, Math.min(Number(v.stock) || 1, 20)) : 1;
  S.qty = Math.max(1, Math.min(max, Math.round(Number(n) || 1)));
  document.querySelectorAll('.qty-val').forEach(e => { e.textContent = S.qty; });
}

function addToCart(buyNow) {
  const v = cur(); if (!v || Number(v.stock) < 1) { toast('This option is sold out'); return; }
  const cart = jget(CART_KEY, []);
  const found = cart.find(x => x.variantId === v.id);
  const total = (found ? Number(found.qty) : 0) + S.qty;
  if (total > Number(v.stock)) { toast(`Only ${v.stock} in stock for ${v.color} / ${v.size} / ${v.cupSize || 'N/A'}`); return; }
  if (buyNow) cart.forEach(x => { x.selected = false; });
  if (found) { found.qty = total; found.price = Number(P.price); found.cupSize = v.cupSize || '';  if (buyNow) found.selected = true; }
  else cart.push({name:P.name, price:Number(P.price), size:v.size, color:v.color, cupSize:v.cupSize || '', qty:S.qty, selected:!!buyNow, productId:P.id, variantId:v.id, sku:v.sku, inventoryManaged:true});
  jset(CART_KEY, cart); updateCartBadge();
  if (buyNow) location.href = 'index.html?cart=1'; else toast('Added to your cart', 'View cart', 'index.html?cart=1');
}

function descHtml(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '<p>Comfort made for everyday wear.</p>';
  let out = '', list = [];
  const flush = () => { if (list.length) { out += '<ul>' + list.map(i => `<li>${esc(i)}</li>`).join('') + '</ul>'; list = []; } };
  lines.forEach(l => { const m = l.match(/^[-•*]\s*(.+)$/); if (m) list.push(m[1]); else { flush(); out += `<p>${esc(l)}</p>`; } });
  flush(); return out;
}

function miniCard(x) {
  const d = pct(x), cols = [...new Set((x.variants || []).filter(v => v.active !== false).map(v => v.color))].slice(0, 5);
  const wished = getWish().includes(x.id);
  const img = x.image_url || ((x.images || [])[0] || {}).url || '';
  return `<article class="rel-card"><a class="rel-img" href="product.html?id=${encodeURIComponent(x.id)}" aria-label="${esc(x.name)}"><img loading="lazy" src="${esc(img)}" alt="${esc(x.name)}" onerror="this.style.opacity='.25'"></a>${d ? `<span class="b">-${d}%</span>` : ''}<button type="button" class="h${wished ? ' on' : ''}" data-id="${esc(x.id)}" aria-label="Save to wishlist">${wished ? '♥' : '♡'}</button><h3><a href="product.html?id=${encodeURIComponent(x.id)}">${esc(x.name)}</a></h3><div class="rel-price">${d ? `<del>${money(x.comparePrice)}</del><b>${money(x.price)}</b>` : `<b class="plain">${money(x.price)}</b>`}</div>${cols.length > 1 || (cols[0]) ? `<div class="rel-sw">${cols.map(c => { const si = swatchImg(x, c), hx = colorHex(c); return `<span title="${esc(c)}">${si ? `<img src="${esc(si)}" alt="">` : `<i style="background:${hx || '#ead7dd'}"></i>`}</span>`; }).join('')}</div>` : ''}</article>`;
}

function renderRoot() {
  const d = pct(P), cat = P.category, v0 = cur();
  $('pdp-root').innerHTML = `
<nav class="pdp-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> › <a href="${esc(cat)}.html">${esc(catLabels[cat] || cat)}</a> › <span>${esc(P.name)}</span></nav>
<div class="pdp-wrap">
  <div class="pdp-gal">
    <div class="pdp-stage" id="pdp-stage"><div id="pdp-main"></div><span class="pdp-badge">${d ? '-' + d + '%' : ''}</span><button type="button" class="pdp-arrow prev" data-nav="-1" aria-label="Previous">‹</button><button type="button" class="pdp-arrow next" data-nav="1" aria-label="Next">›</button><button type="button" class="pdp-zoom" id="pdp-zoom" aria-label="View full screen">⤢</button></div>
    <div class="pdp-thumbs" id="pdp-thumbs"></div>
  </div>
  <div class="pdp-info">
    <h1>${esc(P.name)}</h1>
    <div class="pdp-price">${d ? `<del>${money(P.comparePrice)}</del><span class="now">${money(P.price)}</span><span class="save">Save ${money(Number(P.comparePrice) - Number(P.price))}</span>` : `<span class="now plain">${money(P.price)}</span>`}</div>
    <div class="pdp-rating" id="pdp-rating"></div>
    <div class="pdp-sold" id="pdp-sold"></div>
    <div class="pdp-group" id="pdp-size-wrap"><div class="pdp-lab">Size: <b id="pdp-size-label"></b><button type="button" class="pdp-link" id="pdp-sizeguide">Size Guide</button></div><div class="pdp-pills" id="pdp-sizes"></div></div>
    <div class="pdp-group" id="pdp-cup-wrap"><div class="pdp-lab">Cup Size: <b id="pdp-cup-label"></b></div><div class="pdp-pills" id="pdp-cups"></div></div>
    <div class="pdp-group" id="pdp-color-wrap"><div class="pdp-lab">Colour: <b id="pdp-color-label"></b></div><div class="pdp-sws" id="pdp-colors"></div></div>
    <div class="pdp-stock" id="pdp-stock"></div>
    <div class="pdp-buyrow"><div class="qty"><button type="button" class="qty-minus" aria-label="Decrease">−</button><span class="qty-val">1</span><button type="button" class="qty-plus" aria-label="Increase">+</button></div><button type="button" class="pdp-heart${getWish().includes(P.id) ? ' on' : ''}" id="pdp-heart" aria-label="Save to wishlist">${getWish().includes(P.id) ? '♥' : '♡'}</button></div>
    <div id="pdp-cta"><button type="button" class="pdp-add" id="pdp-add">ADD TO CART</button><button type="button" class="pdp-now" id="pdp-buy">BUY IT NOW</button><a class="pdp-wa" id="pdp-wa" target="_blank" rel="noopener">💬 Order on WhatsApp</a></div>
    <div class="pdp-pay" aria-label="Payment methods">
      <span class="pm cod" title="Cash on Delivery"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/></svg>COD</span>
      <span class="pm raast" title="Raast"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>Raast</span>
      <span class="pm ep" title="Easypaisa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>easypaisa</span>
      <span class="pm jc" title="JazzCash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M3.5 7.5l12-4v4M16.5 13.5h4"/></svg>JazzCash</span>
    </div>
    <p class="pdp-eta" id="pdp-eta"></p>
    <ul class="pdp-trust"><li>📦 100% discreet zipper-bag packaging</li><li>🚚 Delivery across Pakistan in 3–5 days · free delivery above PKR 10,000</li><li>🔄 Easy exchange (item-to-item)</li></ul>
    <details class="pdp-acc" open><summary><span>Description</span></summary><div class="acc-body">${descHtml(P.description)}</div></details>
    <details class="pdp-acc"><summary><span>Delivery &amp; Return</span></summary><div class="acc-body"><ul><li>Packed in a 100% discreet zipper bag.</li><li>Delivery across Pakistan in 3–5 days.</li><li>Delivery charges are PKR 350; orders of PKR 10,000 and above ship free.</li><li>Exchange only (item-to-item). Please message us on WhatsApp before sending anything back so we can confirm eligibility.</li></ul></div></details>
    <details class="pdp-acc"><summary><span>Ask a Question</span></summary><div class="acc-body"><p>Not sure about size, colour or fabric? We reply on WhatsApp.</p><a class="pdp-wa" style="margin:0" target="_blank" rel="noopener" href="${esc(waLink('Hi Her Second Skin PK, I have a question about ' + P.name + ': ' + location.href))}">💬 Message us</a></div></details>
    <div class="pdp-share"><a href="https://instagram.com/hersecondskinpk" target="_blank" rel="noopener">Instagram @hersecondskinpk</a><a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp</a></div>
  </div>
</div>
<section class="pdp-sec" id="pdp-related"></section>
<section class="pdp-sec" id="pdp-recent"></section>
<section class="pdp-sec" id="reviews"></section>`;
  renderGallery(); renderVariantUI();
  (function () { // estimated delivery window: 3 to 5 days from today
    const fmt = d => d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
    const a = new Date(), b = new Date(); a.setDate(a.getDate() + 3); b.setDate(b.getDate() + 5);
    $('pdp-eta').innerHTML = `🗓️ <span>Order today and get it between <b>${fmt(a)}</b> and <b>${fmt(b)}</b> <small style="color:#76535f">(approx. 3–5 days)</small></span>`;
  })();
  const rel = ALL.filter(x => x.id !== P.id && x.category === P.category).concat(ALL.filter(x => x.id !== P.id && x.category !== P.category)).slice(0, 10);
  $('pdp-related').innerHTML = rel.length ? `<h2>You may also like</h2><div class="rel-row">${rel.map(miniCard).join('')}</div>` : '';
  const ids = jget(RECENT_KEY, []).filter(id => id !== P.id), rec = ids.map(id => ALL.find(x => x.id === id)).filter(Boolean).slice(0, 8);
  $('pdp-recent').innerHTML = rec.length ? `<h2>Recently viewed products</h2><div class="rel-row">${rec.map(miniCard).join('')}</div>` : '';
  jset(RECENT_KEY, [P.id].concat(ids).slice(0, 12));
}

const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
function renderReviews(data) {
  const n = Number(data.count) || 0, avg = Number(data.average) || 0;
  $('pdp-rating').innerHTML = n ? `${stars(avg)} <a href="#reviews">${n} review${n === 1 ? '' : 's'}</a>` : `<a href="#reviews">No reviews yet · be the first</a>`;
  const sold = Number(data.soldRecent) || 0;
  $('pdp-sold').textContent = sold >= 3 ? `🔥 ${sold} sold in the last 14 days` : '';
  $('reviews').innerHTML = `<h2>Let customers speak for us</h2>
  <div class="rv-sum">${n ? `${stars(avg)}<p><b>${avg.toFixed(1)}</b> from ${n} review${n === 1 ? '' : 's'}</p>` : '<p class="rv-empty">No reviews yet. Be the first to share your experience.</p>'}</div>
  <div class="rv-actions"><button type="button" class="rv-btn" id="rv-open">Write a review</button></div>
  <form class="rv-form" id="rv-form" novalidate>
    <label for="rv-name">Your name</label><input type="text" id="rv-name" maxlength="60" autocomplete="name">
    <label>Rating</label><div class="rv-starin" id="rv-stars">${[1,2,3,4,5].map(i => `<button type="button" data-r="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`).join('')}</div>
    <label for="rv-title">Review title (optional)</label><input type="text" id="rv-title" maxlength="100">
    <label for="rv-text">Your review</label><textarea id="rv-text" rows="4" maxlength="1000"></textarea>
    <label for="rv-phone">Mobile number used for your order (optional)</label><input type="tel" id="rv-phone" inputmode="tel" placeholder="03XXXXXXXXX"><small>Only used to show the “Verified” badge if you bought this item. It is never shown publicly.</small>
    <div class="rv-hp" aria-hidden="true"><input type="text" id="rv-website" tabindex="-1" autocomplete="off"></div>
    <button type="submit" class="pdp-add" style="margin-top:16px" id="rv-send">SUBMIT REVIEW</button><div class="rv-msg" id="rv-msg" role="status"></div>
  </form>
  <div id="rv-list">${(data.reviews || []).map(r => `<div class="rv-item"><div class="rv-top">${stars(r.rating)}<span class="rv-date">${fmtDate(r.date)}</span></div><div class="rv-who"><b>${esc(r.name)}</b>${r.verified ? '<span class="rv-ver">Verified</span>' : ''}</div>${r.title ? `<h4>${esc(r.title)}</h4>` : ''}<p>${esc(r.text)}</p></div>`).join('')}</div>`;
}
let rvRating = 0;
async function loadReviews() {
  let data = {reviews:[], count:0, average:0, soldRecent:0};
  try { const r = await fetch(`/api/products/${encodeURIComponent(P.id)}/reviews`, {cache:'no-store'}); if (r.ok) data = await r.json(); } catch (e) {}
  renderReviews(data);
}
async function submitReview(e) {
  e.preventDefault(); const msg = $('rv-msg'); msg.className = 'rv-msg'; msg.textContent = '';
  const body = {name:$('rv-name').value.trim(), rating:rvRating, title:$('rv-title').value.trim(), text:$('rv-text').value.trim(), phone:$('rv-phone').value.trim(), website:$('rv-website').value};
  if (body.name.length < 2) { msg.className = 'rv-msg err'; msg.textContent = 'Please enter your name.'; return; }
  if (!rvRating) { msg.className = 'rv-msg err'; msg.textContent = 'Please choose a star rating.'; return; }
  if (body.text.length < 3) { msg.className = 'rv-msg err'; msg.textContent = 'Please write a few words about the product.'; return; }
  const btn = $('rv-send'); btn.disabled = true;
  try {
    const r = await fetch(`/api/products/${encodeURIComponent(P.id)}/reviews`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not send your review.');
    $('rv-form').innerHTML = `<p class="rv-msg ok" style="font-size:16px;margin:0">${esc(d.message || 'Thank you! Your review will appear after approval.')}</p>`;
  } catch (err) { msg.className = 'rv-msg err'; msg.textContent = err.message; btn.disabled = false; }
}

function openLightbox() {
  const m = media[S.idx]; if (!m) return; const lb = $('pdp-lb');
  $('pdp-lb-body').innerHTML = m.type === 'video' ? `<video src="${esc(m.url)}" controls autoplay playsinline></video>` : `<img src="${esc(m.url)}" alt="${esc(P.name)}">`;
  lb.classList.add('on');
}
function closeLightbox() { const lb = $('pdp-lb'); lb.classList.remove('on'); $('pdp-lb-body').innerHTML = ''; }
function stepLightbox(d) { goMedia(S.idx + d); if ($('pdp-lb').classList.contains('on')) openLightbox(); }

function bindEvents() {
  const root = $('pdp-root');
  root.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-size]'))) return setSize(el.dataset.size);
    if ((el = t.closest('[data-color]'))) return setColor(el.dataset.color);
    if ((el = t.closest('[data-cup]'))) return setCup(el.dataset.cup);
    if ((el = t.closest('.pdp-thumb'))) return goMedia(Number(el.dataset.i));
    if ((el = t.closest('[data-nav]'))) return goMedia(S.idx + Number(el.dataset.nav));
    if (t.closest('#pdp-zoom')) return openLightbox();
    if (t.closest('.qty-minus')) return setQty(S.qty - 1);
    if (t.closest('.qty-plus')) return setQty(S.qty + 1);
    if (t.closest('#pdp-add')) return addToCart(false);
    if (t.closest('#pdp-buy')) return addToCart(true);
    if (t.closest('#pdp-sizeguide')) return $('pdp-sg').classList.add('on');
    if (t.closest('#pdp-heart')) { let w = getWish(); const h = $('pdp-heart'); if (w.includes(P.id)) { w = w.filter(x => x !== P.id); h.classList.remove('on'); h.textContent = '♡'; } else { w.push(P.id); h.classList.add('on'); h.textContent = '♥'; } jset(WISH_KEY, w); if (window.hssUpdateWishBadges) window.hssUpdateWishBadges(); return; }
    if ((el = t.closest('.rel-card .h'))) { e.preventDefault(); let w = getWish(); const id = el.dataset.id; if (w.includes(id)) { w = w.filter(x => x !== id); el.classList.remove('on'); el.textContent = '♡'; } else { w.push(id); el.classList.add('on'); el.textContent = '♥'; } jset(WISH_KEY, w); if (window.hssUpdateWishBadges) window.hssUpdateWishBadges(); return; }
    if (t.closest('#rv-open')) { $('rv-form').classList.toggle('on'); return; }
    if ((el = t.closest('#rv-stars button'))) { rvRating = Number(el.dataset.r); root.querySelectorAll('#rv-stars button').forEach(b => b.classList.toggle('on', Number(b.dataset.r) <= rvRating)); return; }
  });
  root.addEventListener('submit', e => { if (e.target.id === 'rv-form') submitReview(e); });
  $('pdp-sticky').addEventListener('click', e => { if (e.target.closest('.qty-minus')) setQty(S.qty - 1); else if (e.target.closest('.qty-plus')) setQty(S.qty + 1); else if (e.target.closest('#pdp-add2')) addToCart(false); });
  $('pdp-lb').addEventListener('click', e => { if (e.target.closest('.lb-x') || e.target.id === 'pdp-lb') closeLightbox(); else if (e.target.closest('.lb-p')) stepLightbox(-1); else if (e.target.closest('.lb-n')) stepLightbox(1); });
  $('pdp-sg').addEventListener('click', e => { if (e.target.closest('.x') || e.target.id === 'pdp-sg') $('pdp-sg').classList.remove('on'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); $('pdp-sg').classList.remove('on'); } if ($('pdp-lb').classList.contains('on')) { if (e.key === 'ArrowLeft') stepLightbox(-1); if (e.key === 'ArrowRight') stepLightbox(1); } });
  const stage = $('pdp-stage'); let sx = 0, sy = 0;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
  stage.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) goMedia(S.idx + (dx < 0 ? 1 : -1)); }, {passive:true});
  // Show the sticky Add-to-cart bar once the main buttons have scrolled out of view (scroll-based, so jumping straight down the page works too).
  const ctaEl = $('pdp-cta'), stickyEl = $('pdp-sticky'); let tick = false;
  const updSticky = () => { tick = false; stickyEl.classList.toggle('on', ctaEl.getBoundingClientRect().bottom < 0); };
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(updSticky); } }, {passive:true});
  window.addEventListener('resize', updSticky); updSticky();
}

async function init() {
  updateCartBadge();
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return fail('No product was selected.');
  try {
    const r = await fetch('/api/products', {cache:'no-store'}); if (!r.ok) throw new Error('bad');
    ALL = ((await r.json()).products || []).filter(p => p.active);
  } catch (e) { return fail('We could not load this product right now. Please check your connection and try again.'); }
  P = ALL.find(x => x.id === id);
  if (!P) return fail('This product is no longer available.');
  buildMedia();
  // Open on the colour of the featured (first) photo when it is in stock, so the page starts on the photo the shop owner chose.
  const lead = media[0] && media[0].type === 'img' ? media[0].color : '';
  const first = (lead && live().find(v => v.color === lead && Number(v.stock) > 0)) || live().find(v => Number(v.stock) > 0) || live()[0];
  if (first) { S.size = first.size; S.color = first.color; S.cupSize = String(first.cupSize || '').toUpperCase(); }
  const ci = media.findIndex(m => m.type === 'img' && m.color === S.color && S.color); S.idx = 0;
  document.title = `${P.name} | Her Second Skin PK`;
  const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', (P.description || `${P.name} at Her Second Skin PK`).slice(0, 155));
  renderRoot(); bindEvents(); loadReviews();
  if (S.color) { const i = media.findIndex(m => m.type === 'img' && m.color === S.color); if (i > 0) goMedia(i, true); }
}
init();
})();

