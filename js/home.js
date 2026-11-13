
  (async()=>{try{const response=await fetch('/api/category-images',{cache:'no-store'});if(!response.ok)return;const data=await response.json();for(const img of document.querySelectorAll('[data-category-photo]')){const photo=data.images?.[img.dataset.categoryPhoto];if(typeof photo==='string'&&/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(photo))img.src=photo;}}catch(e){console.warn('Category photos unavailable',e)}})();
  


    const ADMIN_WHATSAPP_NUMBER = "923397055500";

    let cart = [];
    let wishlist = [];
    let currentCategory = 'all';
    let activePromo = null;
    const DELIVERY_FEE = 350;
    const FREE_DELIVERY_THRESHOLD = 10000;
    let recentlyViewed = JSON.parse(localStorage.getItem('hssp_recent') || '[]');

    function handleDrawerSearch(event) {
      event.preventDefault();
      const query = document.getElementById('drawer-search-input').value.trim();
      document.getElementById('search-input').value = query;
      if (typeof filterProducts === 'function') filterProducts();
      toggleMenu();
      document.getElementById('collection').scrollIntoView({behavior:'smooth',block:'start'});
    }
    function toggleMenu() {
      document.getElementById('side-menu').classList.toggle('active');
      updateOverlay();
    }

    function toggleCart() {
      document.getElementById('cart-drawer').classList.toggle('active');
      updateOverlay();
    }
    function openCartDrawer() {
      document.getElementById('cart-drawer').classList.add('active');
      updateOverlay();
    }

    function toggleWishlist() {
      document.getElementById('wishlist-drawer').classList.toggle('active');
      updateOverlay();
    }

    function closeAllDrawers() {
      document.getElementById('side-menu').classList.remove('active');
      document.getElementById('cart-drawer').classList.remove('active');
      document.getElementById('wishlist-drawer').classList.remove('active');
      updateOverlay();
    }

    function updateOverlay() {
      const m = document.getElementById('side-menu').classList.contains('active');
      const c = document.getElementById('cart-drawer').classList.contains('active');
      const w = document.getElementById('wishlist-drawer').classList.contains('active');
      document.getElementById('overlay').classList.toggle('active', m || c || w);
    }

    // Category Filter Function
    function filterCategory(category, btn) {
      currentCategory = category;
      const buttons = document.querySelectorAll('.header-cat-nav button');
      if(btn) {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      filterProducts();
    }

    // Combined Search and Category Filter
    function filterProducts() {
      const query = document.getElementById('search-input').value.toLowerCase();
      const cards = document.querySelectorAll('#product-grid .card');

      cards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const cat = card.getAttribute('data-category');
        const matchesCategory = (currentCategory === 'all' || cat === currentCategory);
        const searchable = [name, cat, card.textContent || ''].join(' ').toLowerCase();
        const matchesSearch = searchable.includes(query);

        if (matchesCategory && matchesSearch) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    // Keep the original product order so Featured First can reliably restore it.
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
      Array.from(productGrid.querySelectorAll('.card')).forEach((card, index) => {
        card.dataset.featuredOrder = String(index);
      });
    }

    // Sorting: Best Selling uses data-sold when real sales counts are added.
    // Until sales data exists, it safely keeps Featured order rather than inventing rankings.
    function sortProducts() {
      const sortBy = document.getElementById('sort-select').value;
      const grid = document.getElementById('product-grid');
      const cardsArray = Array.from(grid.querySelectorAll('.card'));

      cardsArray.sort((a, b) => {
        const priceA = Number(a.dataset.price) || 0;
        const priceB = Number(b.dataset.price) || 0;
        const nameA = a.dataset.name || '';
        const nameB = b.dataset.name || '';
        const featuredA = Number(a.dataset.featuredOrder) || 0;
        const featuredB = Number(b.dataset.featuredOrder) || 0;
        const soldA = Number(a.dataset.sold) || 0;
        const soldB = Number(b.dataset.sold) || 0;

        if (sortBy === 'price-low') return priceA - priceB || featuredA - featuredB;
        if (sortBy === 'price-high') return priceB - priceA || featuredA - featuredB;
        if (sortBy === 'az') return nameA.localeCompare(nameB) || featuredA - featuredB;
        if (sortBy === 'best-selling') return soldB - soldA || featuredA - featuredB;
        return featuredA - featuredB; // Featured First
      });

      cardsArray.forEach(card => grid.appendChild(card));
      filterProducts(); // Keep the current search/category filters applied after sorting.
    }

    // Product Modal & Lightbox Functions
    function hssShowPhoto(src) {
      const v = document.getElementById('modal-main-video'), im = document.getElementById('modal-main-img');
      if (v) { v.pause(); v.style.display = 'none'; }
      if (im) { im.style.display = ''; if (src) im.src = src; }
    }
    function hssShowVideo(src) {
      const v = document.getElementById('modal-main-video'), im = document.getElementById('modal-main-img');
      if (!v) return;
      if (im) im.style.display = 'none';
      v.src = src; v.style.display = 'block'; v.play().catch(() => {});
    }
    function openProductModal(name, price, mainImg, images, desc, videos) {
      rememberRecentlyViewed(name, price, mainImg);
      document.getElementById('modal-prod-name').textContent = name;
      document.getElementById('modal-prod-price').textContent = 'PKR ' + price.toLocaleString();
      document.getElementById('modal-prod-desc').textContent = desc;
      document.getElementById('modal-main-img').src = mainImg;
      
      const thumbsContainer = document.getElementById('modal-thumbs');
      const vids = Array.isArray(videos) ? videos.filter(Boolean) : [];
      hssShowPhoto(mainImg);
      thumbsContainer.innerHTML = images.map(img => `<img src="${img}" onclick="hssShowPhoto('${img}')">`).join('') + vids.map(v => `<div class="vthumb" onclick="hssShowVideo('${v}')" title="Video dekhein"><video src="${v}#t=0.5" preload="metadata" muted playsinline></video></div>`).join('');
      
      document.getElementById('modal-add-cart').onclick = function() {
        addToCartCustom(name, price);
        closeProductModal();
      };
      document.getElementById('modal-add-wish').onclick = function() {
        addToWishlistCustom(name, price);
        closeProductModal();
      };

      document.getElementById('product-modal').classList.add('active');
    }

    function closeProductModal() {
      document.getElementById('product-modal').classList.remove('active');
      const mv = document.getElementById('modal-main-video'); if (mv) { mv.pause(); }
    }

    function openLightbox(imgSrc) {
      document.getElementById('lightbox-img').src = imgSrc;
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }

    function addToCart(name, price) {
      const existing = cart.find(item => item.name === name);
      if (existing) { existing.qty += 1; } else { cart.push({ name, price, size: '34B', color: 'Skin/Nude', qty: 1, selected: false }); }
      renderCart();
      openCartDrawer();
    }

    function addToCartCustom(name, price) {
      const size = document.getElementById('modal-size').value;
      const color = document.getElementById('modal-color').value;
      const existing = cart.find(item => item.name === name && item.size === size && item.color === color);
      if (existing) { existing.qty += 1; } else { cart.push({ name, price, size, color, qty: 1, selected: false }); }
      renderCart();
      openCartDrawer();
    }

    function addToWishlistCustom(name, price) {
      const size = document.getElementById('modal-size').value;
      const color = document.getElementById('modal-color').value;
      if (!wishlist.some(item => item.name === name && item.size === size && item.color === color)) {
        wishlist.push({ name, price, size, color });
        renderWishlist();
        toggleWishlist();
      } else {
        alert("This item is already in your wishlist!");
      }
    }

    function removeFromCart(index) { cart.splice(index, 1); renderCart(); }
    function removeFromWishlist(index) { wishlist.splice(index, 1); renderWishlist(); }

    function setCartItemSelected(index, checked) {
      if (!cart[index]) return;
      cart[index].selected = Boolean(checked);
      renderCart();
    }

    function selectAllCartItems(checked) {
      cart.forEach(item => item.selected = Boolean(checked));
      renderCart();
    }

    function getSelectedCartItems() { return cart.filter(item => item.selected); }

    function changeCartQty(index, delta) {
      if (!cart[index]) return;
      cart[index].qty = Math.max(1, cart[index].qty + delta);
      renderCart();
    }
    function applyPromoCode() {
      const code = (document.getElementById('promo-code').value || '').trim().toUpperCase();
      const status = document.getElementById('promo-status');
      const codes = { HSS10: 0.10, HSS20: 0.20 };
      if (!codes[code]) { activePromo = null; status.textContent = 'Invalid demo code. Try HSS10 or HSS20.'; status.style.color = '#b42318'; }
      else { activePromo = {code, rate: codes[code]}; status.textContent = `${code} applied to selected products (${Math.round(codes[code]*100)}% demo discount).`; status.style.color = '#26734d'; }
      renderCart();
    }
    function addBundleDeal(name, price, description) {
      const existing = cart.find(item => item.name === name && item.size === 'Combo' && item.color === 'Bundle');
      if (existing) existing.qty += 1;
      else cart.push({name, price, size:'Combo', color:'Bundle', qty:1, selected:true, description});
      renderCart(); openCartDrawer();
    }
    function openSizeAssistant() {
      const modal = document.getElementById('size-assistant-backdrop');
      if (!modal) return;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeSizeAssistant(event) {
      if (event && event.target && event.target.id !== 'size-assistant-backdrop') return;
      const modal = document.getElementById('size-assistant-backdrop');
      if (!modal) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    function showSizeTab(tab, button) {
      document.querySelectorAll('.size-tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.size-tab-panel').forEach(el => el.classList.remove('active'));
      if (button) button.classList.add('active');
      const panel = document.getElementById('size-tab-' + tab);
      if (panel) panel.classList.add('active');
    }
    function calculateAssistantBraSize() {
      const under = parseFloat(document.getElementById('assistant-underbust').value);
      const bust = parseFloat(document.getElementById('assistant-bust').value);
      const result = document.getElementById('assistant-bra-result');
      if (!under || !bust || under < 20 || bust < 20 || bust < under) {
        result.textContent = 'Please enter valid underbust and bust measurements in inches.';
        return;
      }
      const band = Math.ceil((under + 1) / 2) * 2;
      const diff = Math.max(0, Math.round(bust - band));
      const cups = ['AA','A','B','C','D','DD/E','DDD/F','G','H'];
      const cup = cups[Math.min(diff, cups.length - 1)];
      result.textContent = 'Approximate starting size: ' + band + cup + '. Please confirm against the specific product chart.';
    }

    function rememberRecentlyViewed(name, price, image) {
      recentlyViewed = [{name, price, image}, ...recentlyViewed.filter(p=>p.name!==name)].slice(0,4);
      localStorage.setItem('hssp_recent', JSON.stringify(recentlyViewed)); renderRecentlyViewed();
    }
    function renderRecentlyViewed() {
      const section=document.getElementById('recently-viewed-section'), target=document.getElementById('recently-viewed');
      if(!section || !target) return;
      if(!recentlyViewed.length){section.style.display='none';return;}
      section.style.display='block';
      target.innerHTML=recentlyViewed.map(p=>`<article class="recent-card"><img src="${p.image}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:8px"><strong style="display:block;margin-top:7px">${p.name}</strong><p style="font-size:12px;margin-top:4px">PKR ${Number(p.price).toLocaleString()}</p></article>`).join('');
    }
    function submitReview(event) {
      event.preventDefault();
      const review={name:document.getElementById('review-name').value.trim(),rating:Number(document.getElementById('review-rating').value),text:document.getElementById('review-text').value.trim(),date:new Date().toLocaleDateString()};
      const reviews=JSON.parse(localStorage.getItem('hssp_reviews')||'[]'); reviews.unshift(review); localStorage.setItem('hssp_reviews',JSON.stringify(reviews.slice(0,20))); renderReviews(); event.target.reset();
      alert('Review saved on this device only. It is not published to other visitors.');
    }
    function renderReviews() {
      const target=document.getElementById('review-list'); if(!target)return;
      const reviews=JSON.parse(localStorage.getItem('hssp_reviews')||'[]');
      target.innerHTML=reviews.length?reviews.map(r=>`<article class="review-card"><strong>${escapeHtml(r.name)}</strong><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${escapeHtml(r.text)}</p><small>${escapeHtml(r.date)}</small></article>`).join(''):'<p style="font-size:12px;color:#76535f">No reviews saved on this device yet.</p>';
    }
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

    function renderCart() {
      const container = document.getElementById('cart-items');
      document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.qty, 0);
      const cartHeadCount = document.getElementById('cart-head-count');
      if (cartHeadCount) cartHeadCount.textContent = `(${cart.length})`;
      const selectedItems = getSelectedCartItems();
      const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      const discount = activePromo ? Math.round(selectedTotal * activePromo.rate) : 0;
      const delivery = selectedItems.length === 0 || selectedTotal - discount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
      document.getElementById('cart-total').textContent = 'PKR ' + selectedTotal.toLocaleString();
      document.getElementById('cart-discount').textContent = 'PKR ' + discount.toLocaleString();
      document.getElementById('cart-delivery').textContent = 'PKR ' + delivery.toLocaleString();
      document.getElementById('cart-final-total').textContent = 'PKR ' + (selectedTotal - discount + delivery).toLocaleString();
      document.getElementById('selected-summary').textContent = `${selectedItems.length} product${selectedItems.length === 1 ? '' : 's'} selected · ${selectedItems.reduce((sum, item) => sum + item.qty, 0)} item(s)`;
      document.getElementById('cart-summary-top').textContent = selectedItems.length ? `${selectedItems.length} product${selectedItems.length === 1 ? '' : 's'} selected · ${selectedItems.reduce((sum, item) => sum + item.qty, 0)} item(s) in your cart` : 'Select the products you want to order.';
      document.getElementById('buy-selected-btn').disabled = selectedItems.length === 0;
      if (cart.length === 0) {
        container.innerHTML = '<p style="color:#777; text-align:center; margin-top:30px;">Your cart is empty.</p>';
        return;
      }
      container.innerHTML = cart.map((item, idx) => `
        <div class="item-row">
          <label class="cart-select-line"><input class="item-select" type="checkbox" ${item.selected ? 'checked' : ''} onchange="setCartItemSelected(${idx}, this.checked)"> Select for checkout</label>
          <div class="item-row-header">
            <h4>${item.name}</h4>
            <span>PKR ${(item.price * item.qty).toLocaleString()}</span>
          </div>
          <p style="font-size:11px; color:#555;">Size: ${item.size}${item.cupSize ? " | Cup: " + item.cupSize : ""} | Color: ${item.color}</p>
          <div class="qty-controls"><button onclick="changeCartQty(${idx}, -1)" aria-label="Decrease quantity">−</button><span>Qty: ${item.qty}</span><button onclick="changeCartQty(${idx}, 1)" aria-label="Increase quantity">+</button></div>
          <div class="item-actions"><button class="btn-text danger" onclick="removeFromCart(${idx})">Remove</button></div>
        </div>
      `).join('');
    }

    function toggleFaq(button) {
      const item = button.closest('.faq-item');
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
      const symbol = button.querySelector('span');
      if (symbol) symbol.textContent = open ? '−' : '＋';
    }

    function renderWishlist() {
      const container = document.getElementById('wishlist-items');
      document.getElementById('wishlist-count').textContent = wishlist.length;
      if (wishlist.length === 0) { container.innerHTML = '<div class="wishlist-empty"><span class="heart-icon" aria-hidden="true">♡</span><strong>Your wishlist is waiting</strong><p>Save your favourite looks here and come back to them any time.</p><a class="wishlist-shop" href="#collection" onclick="closeAllDrawers()">Explore Collection</a></div>'; return; }
      container.innerHTML = wishlist.map((item, idx) => `
        <div class="item-row">
          <div class="item-row-header">
            <h4>${item.name}</h4>
            <span>PKR ${item.price.toLocaleString()}</span>
          </div>
          <p style="font-size:11px; color:#555;">Size: ${item.size}${item.cupSize ? " | Cup: " + item.cupSize : ""} | Color: ${item.color}</p>
          <div class="item-actions">
            <button class="btn-text" onclick="cart.push({...wishlist[${idx}], qty:1, selected:false}); wishlist.splice(${idx},1); renderWishlist(); renderCart(); toggleCart();">Move to Cart 🛒</button>
            <button class="btn-text danger" onclick="removeFromWishlist(${idx})">Remove</button>
          </div>
        </div>
      `).join('');
    }

    // The inventory-backed checkout implementation loads from inventory-store.js.
    // No WhatsApp redirect is permitted as a fallback for customers.
    async function checkoutCart() {
      alert('Secure checkout is currently loading. Please refresh and try again.');
    }
    renderCart();
    renderRecentlyViewed();
    renderReviews();
  


let hssReelReturnFocus=null;
function openBoutiqueReel(reel){
  if(!reel || !/^\/uploads\/[a-f0-9-]+\.(mp4|webm)$/i.test(reel.url))return;
  const viewer=document.getElementById('boutique-reel-viewer');
  const player=document.getElementById('boutique-reel-player');
  hssReelReturnFocus=document.activeElement;
  document.querySelectorAll('.reel-card video').forEach(v=>v.pause());
  document.getElementById('boutique-reel-title').textContent=reel.caption||'Watch Reel';
  document.getElementById('boutique-reel-deal').textContent=reel.deal||'';
  player.pause();player.src=reel.url;player.controls=true;player.muted=false;player.loop=false;
  viewer.classList.add('is-open');viewer.setAttribute('aria-hidden','false');
  player.play().catch(()=>{ /* Browser may require another user tap for sound; visible controls remain. */ });
  player.focus();
}
function closeBoutiqueReel(){
  const viewer=document.getElementById('boutique-reel-viewer');
  const player=document.getElementById('boutique-reel-player');
  if(!viewer.classList.contains('is-open'))return;
  player.pause();player.removeAttribute('src');player.load();
  viewer.classList.remove('is-open');viewer.setAttribute('aria-hidden','true');
  document.querySelectorAll('.reel-card video').forEach(v=>{v.muted=true;v.play().catch(()=>{});});
  if(hssReelReturnFocus?.focus)hssReelReturnFocus.focus();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBoutiqueReel();});



(async function(){try{const response=await fetch('/api/homepage');if(!response.ok)return;const {homepage:h}=await response.json();
 document.querySelectorAll('.brand-tagline,.hero-note').forEach(e=>e.textContent=h.tagline);
 const hero=document.querySelector('section.hero');
 if(hero&&h.bannerUrl&&/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(h.bannerUrl)){
   hero.classList.add('custom-banner');
   hero.style.backgroundImage='url("'+h.bannerUrl+'")';
   hero.style.backgroundRepeat='no-repeat';
   hero.style.backgroundSize='cover';
   hero.style.backgroundPosition='center center';
   hero.style.backgroundColor='#fff';
   // Uploaded promotional graphics already carry typography; do not overlay hero copy.
   const bannerLink=document.createElement('a');
   bannerLink.href='#collection';bannerLink.className='custom-banner-link';
   bannerLink.setAttribute('aria-label','Shop the collection');
   hero.appendChild(bannerLink);
 }
 if(hero&&h.bannerHeading){const heading=hero.querySelector('h1');if(heading)heading.textContent=h.bannerHeading;}
 const area=document.getElementById('video-reels'),grid=document.getElementById('managed-reels');
 if(grid){
   (Array.isArray(h.reels)?h.reels:[]).forEach((r,i)=>{
     if(!/^\/uploads\/[a-f0-9-]+\.(mp4|webm)$/i.test(r.url))return;
     const card=document.createElement('button');card.type='button';card.className='reel-card';card.setAttribute('aria-label','Watch reel with sound: '+(r.caption||'Video'));card.addEventListener('click',()=>openBoutiqueReel(r));
     const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.autoplay=true;v.loop=true;v.defaultMuted=true;v.setAttribute('muted','');v.setAttribute('autoplay','');v.setAttribute('loop','');v.controls=false;v.src=r.url;v.setAttribute('aria-hidden','true');v.tabIndex=-1;card.appendChild(v);
     
     const caption=document.createElement('div');caption.className='reel-caption';caption.textContent=[r.caption,r.deal].filter(Boolean).join(' — ')||'Watch Reel';card.appendChild(caption);grid.appendChild(card);v.play().catch(()=>{});
   });
   area.hidden=!grid.children.length;
   const prev=document.getElementById('reels-prev'),next=document.getElementById('reels-next');
   function updateArrows(){const hasOverflow=grid.scrollWidth>grid.clientWidth+2;prev.hidden=next.hidden=!hasOverflow;prev.disabled=grid.scrollLeft<=2;next.disabled=grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-2;}
   function slide(direction){const item=grid.querySelector('.reel-card');if(!item)return;const gap=parseFloat(getComputedStyle(grid).gap)||16;grid.scrollBy({left:direction*(item.getBoundingClientRect().width+gap),behavior:'smooth'});}
   prev.addEventListener('click',()=>slide(-1));next.addEventListener('click',()=>slide(1));grid.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);requestAnimationFrame(updateArrows);
 }

 }catch(e){console.warn('Homepage content unavailable',e)}})();


/* Exchange center link is always visible even before JavaScript inventory loads. */