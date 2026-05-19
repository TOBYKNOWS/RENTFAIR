/* ============================================
   RentFair Homes — frontend module
   ============================================ */

// Public site interactions and rendering.

let savedIds = new Set();
let currentPage = 'home';
let currentListingTab = 'rent';
let selectedPostCategory = 'Rent';
let currentUser = null;
const EMPTY_STATE_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&q=80';
const DEFAULT_LISTINGS = [];

RENTALS = [];
HOMES_FOR_SALE = [];
LAND_LISTINGS = [];
ALL_LISTINGS = [];

// ── Routing ────────────────────────────────────────────────────────────────

function routeHash(page, tab) {
  if (page === 'listings') return `#listings/${tab || currentListingTab || 'rent'}`;
  return `#${page || 'home'}`;
}

function showPage(page, tab, options = {}) {
  closeMobileMenu();

  if (page === 'admin' && !canUseAdmin()) {
    showToast('Admin access only.');
    page = currentUser ? 'dashboard' : 'login';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.remove('hidden'); }
  currentPage = page;
  if (!options.skipHash) {
    const nextHash = routeHash(page, tab);
    if (window.location.hash !== nextHash) {
      history.pushState(null, '', nextHash);
    }
  }
  window.scrollTo(0, 0);

  if (page === 'listings') {
    setListingTab(tab || 'rent');
    renderListingsGrid(tab || 'rent');
  }
  if (page === 'home') { renderHome(); }
  if (page === 'favorites') { renderFavorites(); }
  if (page === 'dashboard') { renderDashboard(); }
  if (page === 'sell' || page === 'post') { renderPostForm(page === 'sell' ? 'post-form-container' : 'post-form-container2'); }
  if (page === 'admin' && typeof initAdmin === 'function') { initAdmin(); }
  return false;
}

function canUseAdmin() {
  return Boolean(currentUser?.is_staff);
}

function openAdminPanel() {
  if (!canUseAdmin()) {
    showToast('Admin access only.');
    showPage(currentUser ? 'dashboard' : 'login');
    return false;
  }

  showPage('admin');
  return false;
}

function showPropertyPage(id) {
  const prop = findListingById(id);
  if (!prop) {
    showToast('Property details are not available yet.');
    return false;
  }
  trackPropertyView(prop);
  if (window.location.hash !== `#property/${prop.id}`) {
    history.pushState(null, '', `#property/${prop.id}`);
  }
  if (prop.type === 'land') {
    renderLandDetail(prop);
    showPage('land', null, { skipHash: true });
  } else {
    renderPropertyDetail(prop);
    showPage('property', null, { skipHash: true });
  }
  return false;
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash || hash === 'home') {
    showPage('home', null, { skipHash: true });
    return;
  }

  const [page, value] = hash.split('/');
  if (page === 'listings') {
    showPage('listings', value || 'rent', { skipHash: true });
    return;
  }
  if (page === 'property' && value) {
    showPropertyPage(value);
    return;
  }

  const validPages = new Set(['favorites', 'dashboard', 'sell', 'post', 'about', 'contact', 'login', 'admin']);
  showPage(validPages.has(page) ? page : 'home', null, { skipHash: true });
}

async function trackPropertyView(prop) {
  if (!prop || !prop.isLive) return;

  try {
    const response = await fetch(`/api/properties/${prop.id}/view/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);
    if (!response.ok || result.views === null || result.views === undefined) return;

    prop.views = result.views;
    if (currentPage === 'property') renderPropertyDetail(prop);
    if (currentPage === 'land') renderLandDetail(prop);
  } catch (error) {
    console.warn('Property view could not be tracked.', error);
  }
}

function findListingById(id) {
  const listingId = String(id);
  return (
    ALL_LISTINGS.find(p => String(p.id) === listingId)
    || RENTALS.find(p => String(p.id) === listingId)
    || HOMES_FOR_SALE.find(p => String(p.id) === listingId)
    || LAND_LISTINGS.find(p => String(p.id) === listingId)
    || DEFAULT_LISTINGS.find(p => String(p.id) === listingId)
  );
}

function propertyCardFromEvent(event) {
  const card = event.target.closest?.('[data-property-card]');
  if (!card) return null;

  const interactive = event.target.closest?.('button, a, input, select, textarea');
  if (interactive && interactive !== card) return null;

  return card;
}

function handlePropertyCardClick(event) {
  const card = propertyCardFromEvent(event);
  if (!card) return;

  event.preventDefault();
  event.stopPropagation();
  showPropertyPage(card.dataset.propertyCard);
}

function handlePropertyCardKeyboard(event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const card = propertyCardFromEvent(event);
  if (!card) return;

  event.preventDefault();
  event.stopPropagation();
  showPropertyPage(card.dataset.propertyCard);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1000000) return '₦' + (n/1000000).toFixed(n%1000000===0?0:1) + 'M';
  if (n >= 1000) return '₦' + (n/1000).toFixed(0) + 'k';
  return '₦' + n.toLocaleString();
}

function nearbyIcon(name) {
  const key = String(name || '').toLowerCase();
  const common = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  let path;

  if (key.includes('school') || key.includes('eksu') || key.includes('campus')) {
    path = `<path d="M2 7l10-4 10 4-10 4L2 7z" ${common}/><path d="M6 9.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3V9.5" ${common}/>`;
  } else if (key.includes('hospital') || key.includes('clinic') || key.includes('fmc')) {
    path = `<path d="M4 20V6a2 2 0 012-2h12a2 2 0 012 2v14" ${common}/><path d="M9 12h6M12 9v6M3 20h18" ${common}/>`;
  } else if (key.includes('bank')) {
    path = `<path d="M3 9l9-5 9 5H3zM5 9v9M9 9v9M15 9v9M19 9v9M3 20h18" ${common}/>`;
  } else if (key.includes('market')) {
    path = `<path d="M5 10h14l-1.2 10H6.2L5 10zM8 10a4 4 0 018 0" ${common}/>`;
  } else if (key.includes('station') || key.includes('fuel') || key.includes('nnpc')) {
    path = `<path d="M6 21V5a2 2 0 012-2h6a2 2 0 012 2v16M5 21h12" ${common}/><path d="M9 7h4M16 8h2l2 2v7a2 2 0 01-2 2h-2" ${common}/>`;
  } else if (key.includes('church')) {
    path = `<path d="M12 3v6M9 6h6M5 21V11l7-4 7 4v10M9 21v-5a3 3 0 016 0v5" ${common}/>`;
  } else {
    path = `<path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" ${common}/><circle cx="12" cy="9" r="2.5" ${common}/>`;
  }

  return `<span class="nearby-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none">${path}</svg></span>`;
}

function listingTypeIcon(type) {
  const common = 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    Rent: `<path d="M3 11l9-7 9 7" ${common}/><path d="M5 10v10h14V10" ${common}/><path d="M10 20v-6h4v6" ${common}/>`,
    Buy: `<path d="M4 11l8-7 8 7v9H4v-9z" ${common}/><path d="M9 20v-6h6v6" ${common}/><path d="M7 8V5h3" ${common}/>`,
    Land: `<path d="M4 18c3-4 5-4 8 0s5 4 8 0" ${common}/><path d="M6 14c2-3 4-3 6 0s4 3 6 0" ${common}/><path d="M12 4v8M9 7l3-3 3 3" ${common}/>`
  };
  return `<span class="post-cat-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none">${paths[type] || paths.Rent}</svg></span>`;
}

function heartIcon(id) {
  const isSaved = savedIds.has(String(id));
  return `<button class="icon-btn ${isSaved?'saved':''}" onclick="toggleSave('${id}',event)" title="${isSaved?'Unsave':'Save'}">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 12S1.5 8.5 1.5 4.8A3.3 3.3 0 017 2.7a3.3 3.3 0 015.5 2.1C12.5 8.5 7 12 7 12z"
        fill="${isSaved?'#EF4444':'none'}" stroke="${isSaved?'#EF4444':'#64748B'}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>`;
}

function updateSavedBadges() {
  document.querySelectorAll('[data-saved-count]').forEach(el => {
    el.textContent = String(savedIds.size);
  });
}

function openSavedProperties() {
  if (!currentUser) {
    showToast('Please log in to view saved properties.');
    showPage('login');
    return false;
  }
  showPage('favorites');
  return false;
}

async function loadFavourites() {
  if (!currentUser) {
    savedIds = new Set();
    updateSavedBadges();
    if (currentPage === 'favorites') renderFavorites();
    if (currentPage === 'dashboard') renderDashboardSaved();
    return;
  }

  try {
    const response = await fetch('/api/favourites/', { credentials: 'same-origin' });
    const result = await responseJson(response);
    if (!response.ok) return;

    savedIds = new Set((result.ids || []).map(String));
    updateSavedBadges();
    if (currentPage === 'home') renderHome();
    if (currentPage === 'listings') renderListingsGrid(currentListingTab);
    if (currentPage === 'favorites') renderFavorites();
    if (currentPage === 'dashboard') renderDashboardSaved();
  } catch (error) {
    console.warn('Saved properties could not be loaded.', error);
  }
}

async function toggleSave(id, e) {
  if (e) e.stopPropagation();

  if (!currentUser) {
    showToast('Please log in to save properties.');
    showPage('login');
    return;
  }

  const wasSaved = savedIds.has(String(id));
  if (wasSaved) savedIds.delete(String(id));
  else savedIds.add(String(id));
  updateSavedBadges();

  // Re-render current view
  if (currentPage === 'home') renderHome();
  if (currentPage === 'listings') renderListingsGrid(currentListingTab);
  if (currentPage === 'favorites') renderFavorites();
  if (currentPage === 'dashboard') renderDashboardSaved();
  if (currentPage === 'property' || currentPage === 'land') {
    const prop = ALL_LISTINGS.find(p => String(p.id) === String(id));
    if (prop) prop.type === 'land' ? renderLandDetail(prop) : renderPropertyDetail(prop);
  }

  try {
    const response = await fetch(`/api/favourites/${id}/toggle/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);

    if (!response.ok) {
      if (wasSaved) savedIds.add(String(id));
      else savedIds.delete(String(id));
      updateSavedBadges();
      showToast(result.error || 'Could not update saved property.');
      loadFavourites();
      return;
    }

    if (result.saved) savedIds.add(String(id));
    else savedIds.delete(String(id));
    updateSavedBadges();
    if (currentPage === 'dashboard') renderDashboardSaved();
    showToast(result.message || (result.saved ? 'Property saved.' : 'Removed from saved.'));
  } catch (error) {
    console.warn('Save toggle failed.', error);
    if (wasSaved) savedIds.add(String(id));
    else savedIds.delete(String(id));
    updateSavedBadges();
    if (currentPage === 'dashboard') renderDashboardSaved();
    showToast('Could not update saved property. Please try again.');
  }
}

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function phoneDigits(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '234' + digits.slice(1);
  if (digits && !digits.startsWith('234') && digits.length === 10) digits = '234' + digits;
  return digits;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function galleryImages(p) {
  const images = p?.imgs?.length ? p.imgs : [p?.img].filter(Boolean);
  return images.length ? images : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'];
}

function galleryCaption(p, index) {
  const captions = Array.isArray(p?.imgCaptions) ? p.imgCaptions : [];
  return captions[index] || '';
}

function photoBadge(p) {
  const count = galleryImages(p).length;
  return count > 1 ? `
    <span class="photo-count-badge">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 3l.8-1h3.4l.8 1M4 9l2.1-2 1.5 1.3L9 7l1 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${count}
    </span>` : '';
}

function renderGallerySlider(p) {
  const images = galleryImages(p);
  const safeTitle = escapeHtml(p.title);
  const firstCaption = galleryCaption(p, 0);
  return `
    <div class="property-gallery" data-gallery-id="${p.id}">
      <div class="property-gallery-stage">
        <img src="${images[0]}" alt="${safeTitle}" data-gallery-main="${p.id}">
        <p class="property-gallery-caption ${firstCaption ? '' : 'hidden'}" data-gallery-caption="${p.id}">${escapeHtml(firstCaption)}</p>
        <div class="property-gallery-topline">
          ${photoBadge(p)}
          <span class="property-gallery-counter" data-gallery-counter="${p.id}">1 / ${images.length}</span>
        </div>
        ${images.length > 1 ? `
        <button class="gallery-nav gallery-nav-prev" type="button" onclick="moveGallery('${p.id}', -1, event)" aria-label="Previous photo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="gallery-nav gallery-nav-next" type="button" onclick="moveGallery('${p.id}', 1, event)" aria-label="Next photo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>` : ''}
      </div>
      ${images.length > 1 ? `
      <div class="property-gallery-thumbs">
        ${images.map((image, index) => `
        <button type="button" class="${index === 0 ? 'active' : ''}" data-gallery-thumb="${p.id}" onclick="setGalleryImage('${p.id}', ${index}, event)" aria-label="View photo ${index + 1}">
          <img src="${image}" alt="${safeTitle} photo ${index + 1}">
        </button>`).join('')}
      </div>` : ''}
    </div>`;
}

function setGalleryImage(id, index, event) {
  if (event) event.stopPropagation();
  const prop = findListingById(id);
  const images = galleryImages(prop);
  if (!images.length) return;

  const safeIndex = (index + images.length) % images.length;
  const main = document.querySelector(`[data-gallery-main="${id}"]`);
  const counter = document.querySelector(`[data-gallery-counter="${id}"]`);
  const caption = document.querySelector(`[data-gallery-caption="${id}"]`);
  if (main) main.src = images[safeIndex];
  if (counter) counter.textContent = `${safeIndex + 1} / ${images.length}`;
  if (caption) {
    const captionText = galleryCaption(prop, safeIndex);
    caption.textContent = captionText;
    caption.classList.toggle('hidden', !captionText);
  }
  document.querySelectorAll(`[data-gallery-thumb="${id}"]`).forEach((thumb, thumbIndex) => {
    thumb.classList.toggle('active', thumbIndex === safeIndex);
  });
}

function moveGallery(id, step, event) {
  if (event) event.stopPropagation();
  const thumbs = [...document.querySelectorAll(`[data-gallery-thumb="${id}"]`)];
  const current = Math.max(0, thumbs.findIndex(thumb => thumb.classList.contains('active')));
  setGalleryImage(id, current + step, event);
}

function listingViewsText(p) {
  return Number.isFinite(Number(p.views)) ? `${Number(p.views).toLocaleString()} views` : '';
}

function listingSavedText(p) {
  return Number.isFinite(Number(p.saved)) ? `Saved by ${Number(p.saved).toLocaleString()}` : '';
}

function listingEngagementText(p) {
  return [listingViewsText(p), listingSavedText(p)].filter(Boolean).join(' · ');
}

function trackWhatsAppLead(id) {
  fetch(`/api/properties/${id}/whatsapp-click/`, {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    }
  }).catch(error => {
    console.warn('WhatsApp lead tracking failed.', error);
  });
}

function checkIconSvg(size = 8) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function listingTrustBadges(p) {
  if (Array.isArray(p?.trustBadges) && p.trustBadges.length) {
    return p.trustBadges.filter(Boolean);
  }
  return p?.verified ? ['Verified'] : [];
}

function renderTrustBadges(p, extraClass = '') {
  return listingTrustBadges(p).map(label => {
    const className = label === 'Document checked' ? 'badge-doc' : 'badge-verified';
    return `<span class="${className} ${extraClass}">${checkIconSvg()}${escapeHtml(label)}</span>`;
  }).join('');
}

function renderTrustSummary(p) {
  const items = [
    p?.trust?.ownerVerified ? {
      label: p.trust.ownerBadge || 'Verified owner',
      text: `${p.trust.ownerRoleLabel || 'Owner'} profile approved by RentFair.`
    } : null,
    p?.trust?.listingReviewed ? {
      label: 'Listing reviewed',
      text: 'RentFair checked this listing before publishing.'
    } : null,
    p?.trust?.documentChecked ? {
      label: 'Document checked',
      text: 'A private verification document was reviewed by admin.'
    } : null
  ].filter(Boolean);

  if (!items.length) return '';

  return `
    <div class="trust-summary">
      <p class="trust-summary-title">RentFair trust checks</p>
      <div class="space-y-2">
        ${items.map(item => `
        <div class="trust-summary-item">
          <span>${checkIconSvg(10)}</span>
          <div>
            <p>${escapeHtml(item.label)}</p>
            <small>${escapeHtml(item.text)}</small>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function contactSafetyNotice() {
  return `
    <div class="contact-safety-note">
      <p>Stay safe</p>
      <span>Never pay before inspection. Verify documents and meet in a safe place.</span>
    </div>`;
}

function callListingContact(id, event) {
  if (event) event.stopPropagation();
  const listing = findListingById(id);
  const phone = phoneDigits(listing?.agent?.phone);
  if (!phone) {
    showToast('No phone number is available for this listing.');
    return;
  }
  showToast(`Calling ${listing.agent.name}: +${phone}`);
  if (navigator.clipboard) navigator.clipboard.writeText(`+${phone}`).catch(() => {});
  window.location.href = `tel:+${phone}`;
}

function openListingWhatsApp(id, event) {
  if (event) event.stopPropagation();
  const listing = findListingById(id);
  const phone = phoneDigits(listing?.agent?.whatsapp || listing?.agent?.phone);
  if (!phone) {
    showToast('No WhatsApp number is available for this listing.');
    return;
  }
  const message = encodeURIComponent(`Hello, I am interested in "${listing.title}" on RentFair Homes.`);
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener');
  trackWhatsAppLead(id);
}

function ownerEnquiryWhatsAppLink(enquiry) {
  const phone = phoneDigits(enquiry.phone);
  if (!phone) return '';
  const propertyTitle = enquiry.propertyTitle || 'your enquiry';
  const message = encodeURIComponent(`Hello ${enquiry.name}, thanks for your enquiry about "${propertyTitle}" on RentFair Homes. Is the property still of interest?`);
  return `https://wa.me/${phone}?text=${message}`;
}

function normaliseApiListing(p) {
  const isLand = p.type === 'land';
  const apiImageItems = Array.isArray(p.imageItems) ? p.imageItems.filter(item => item?.url) : [];
  const galleryUrls = apiImageItems.length ? apiImageItems.map(item => item.url) : (p.images || []);
  const galleryCaptions = apiImageItems.length ? apiImageItems.map(item => item.caption || '') : galleryUrls.map(() => '');
  const images = [p.img, ...galleryUrls].filter(Boolean);
  const imageCaptions = [p.img ? '' : null, ...galleryCaptions].filter(caption => caption !== null);
  const locationParts = [p.address, p.location].filter(Boolean);
  return {
    id: String(p.id),
    slug: p.slug,
    type: p.type,
    category: p.category || (isLand ? 'Land' : 'Property'),
    title: p.title,
    address: p.address || '',
    location: locationParts.join(', ') || p.location || '',
    price: p.price || 0,
    unit: p.unit || '',
    beds: p.beds || 0,
    baths: p.baths || 0,
    sqm: parseInt(p.size, 10) || 0,
    plotSize: p.size || '',
    verified: Boolean(p.verified),
    trust: p.trust || {},
    trustBadges: p.trust?.badges || (p.verified ? ['Listing reviewed'] : []),
    fairPrice: Boolean(p.fairLabel),
    fairLabel: p.fairLabel || (p.verified ? 'Verified' : 'Listed'),
    fairPct: p.fairInsight || p.fairLabel || '',
    new: Boolean(p.featured),
    views: Number.isFinite(Number(p.views)) ? Number(p.views) : null,
    saved: 0,
    isLive: true,
    furnished: 'Unspecified',
    img: images[0] || EMPTY_STATE_IMAGE,
    imgs: images.length ? images : [EMPTY_STATE_IMAGE],
    imgCaptions: imageCaptions,
    desc: p.description || '',
    amenities: p.features || [],
    agent: {
      name: p.owner?.name || 'RentFair Homes',
      role: p.owner?.role || p.trust?.ownerRoleLabel || 'Property Contact',
      phone: p.owner?.phone || '',
      whatsapp: p.owner?.whatsapp || '',
      email: p.owner?.email || '',
      verified: Boolean(p.owner?.verified || p.trust?.ownerVerified),
      badge: p.owner?.badge || p.trust?.ownerBadge || '',
      listings: 1
    },
    costs: {
      yearly: p.type === 'rent' ? p.price || 0 : 0,
      caution: 0,
      agreement: 0,
      agency: 0,
      service: 0
    },
    nearby: [],
    area: p.areaName || p.location || '',
    landType: isLand ? p.category : '',
    docs: p.docs || [],
    estate: false,
    dry: false,
    state: p.state || p.location || ''
  };
}

async function loadLiveListings() {
  try {
    const response = await fetch('/api/properties/');
    if (!response.ok) return;
    const payload = await response.json();
    const liveListings = (payload.properties || []).map(normaliseApiListing);

    RENTALS = liveListings.filter(p => p.type === 'rent');
    HOMES_FOR_SALE = liveListings.filter(p => p.type === 'buy');
    LAND_LISTINGS = liveListings.filter(p => p.type === 'land');
    ALL_LISTINGS = [...RENTALS, ...HOMES_FOR_SALE, ...LAND_LISTINGS];

    if (currentPage === 'home') renderHome();
    if (currentPage === 'listings') renderListingsGrid(currentListingTab);
    if (currentPage === 'favorites') renderFavorites();
    if (currentPage === 'dashboard') renderDashboardSaved();
  } catch (error) {
    console.warn('RentFair live listings could not be loaded.', error);
  }
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

function authHeader() {
  return {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  };
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function updateAuthLinks() {
  document.querySelectorAll('[data-admin-link]').forEach(link => {
    link.classList.toggle('hidden', !canUseAdmin());
  });

  document.querySelectorAll('[data-auth-link]').forEach(link => {
    if (currentUser) {
      const displayName = currentUser.first_name || currentUser.username || 'Account';
      const initial = displayName[0]?.toUpperCase() || 'U';
      link.title = displayName;
      if (link.hasAttribute('data-auth-mobile')) {
        link.innerHTML = `
          <span class="flex items-center justify-between gap-3">
            <span class="inline-flex items-center gap-3">
              <span class="inline-grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-xs font-800 text-white">${initial}</span>
              <span>
                <span class="block text-sm font-semibold text-slate-800">Dashboard</span>
                <span class="block text-xs text-slate-400">${displayName}</span>
              </span>
            </span>
            <span class="text-xs text-emerald-600 font-semibold">Open</span>
          </span>`;
      } else {
        link.innerHTML = `
          <span class="inline-grid h-10 w-10 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-800 text-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.16)] ring-4 ring-white transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800">
            ${initial}
          </span>`;
      }
      link.onclick = event => {
        event.preventDefault();
        closeMobileMenu();
        showPage('dashboard');
      };
    } else {
      link.textContent = 'Log in';
      link.removeAttribute('title');
      link.onclick = event => {
        event.preventDefault();
        showPage('login');
      };
    }
  });

  document.querySelectorAll('[data-mobile-account-link]').forEach(link => {
    if (currentUser) {
      const displayName = currentUser.first_name || currentUser.username || 'Account';
      const initial = displayName[0]?.toUpperCase() || 'U';
      link.textContent = initial;
      link.title = displayName;
      link.className = 'inline-grid h-10 w-10 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-800 text-emerald-700 shadow-sm';
      link.onclick = event => {
        event.preventDefault();
        closeMobileMenu();
        showPage('dashboard');
      };
    } else {
      link.textContent = '';
      link.title = 'Log in';
      link.className = 'hidden h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-sm font-800 text-slate-700 shadow-sm';
      link.onclick = event => {
        event.preventDefault();
        closeMobileMenu();
        showPage('login');
      };
    }
  });
}

async function loadAuthStatus() {
  try {
    const response = await fetch('/api/auth/status/', { credentials: 'same-origin' });
    if (!response.ok) return;
    const payload = await response.json();
    currentUser = payload.user;
    updateAuthLinks();
    await loadFavourites();
    if (currentPage === 'dashboard') renderDashboard();
  } catch (error) {
    console.warn('Auth status could not be loaded.', error);
  }
}

async function submitLogin() {
  if (currentUser) {
    showPage('dashboard');
    return;
  }

  const field = name => document.querySelector(`[data-login-field="${name}"]`)?.value?.trim() || '';
  const button = document.querySelector('[data-login-submit]');
  const payload = {
    email: field('email'),
    password: field('password')
  };

  if (button) {
    button.disabled = true;
    button.textContent = 'Signing in...';
  }

  try {
    const response = await fetch('/api/auth/login/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Login failed.');
      return;
    }

    currentUser = result.user;
    updateAuthLinks();
    await loadFavourites();
    showToast('Welcome back.');
    showPage('dashboard');
  } catch (error) {
    console.warn('Login failed.', error);
    await loadAuthStatus();
    if (currentUser) {
      showPage('dashboard');
      return;
    }
    showToast('Login could not complete. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Sign In';
    }
  }
}

async function submitRegister() {
  const field = name => document.querySelector(`[data-register-field="${name}"]`)?.value?.trim() || '';
  const button = document.querySelector('[data-register-submit]');
  const payload = {
    first_name: field('first_name'),
    last_name: field('last_name'),
    email: field('email'),
    phone: field('phone'),
    role: field('role'),
    password: field('password')
  };

  if (button) {
    button.disabled = true;
    button.textContent = 'Creating account...';
  }

  try {
    const response = await fetch('/api/auth/register/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Could not create account.');
      return;
    }

    currentUser = result.user;
    updateAuthLinks();
    await loadFavourites();
    showToast('Account created.');
    showPage('dashboard');
  } catch (error) {
    console.warn('Registration failed.', error);
    showToast('Could not create account. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Create Account';
    }
  }
}

async function submitLogout() {
  try {
    await fetch('/api/auth/logout/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeader()
    });
    currentUser = null;
    savedIds = new Set();
    updateSavedBadges();
    updateAuthLinks();
    showToast('Logged out.');
    showPage('home');
  } catch (error) {
    console.warn('Logout failed.', error);
  }
}

function selectedAmenities(container) {
  return [...container.querySelectorAll('.amenity-check.checked')].map(btn => btn.textContent.trim());
}

function selectedPropertyImages(container) {
  const input = container.querySelector('[data-field="images"]');
  return [...(input?.files || [])].slice(0, 10);
}

function selectedVerificationDocument(container) {
  const input = container.querySelector('[data-field="verification_document"]');
  return input?.files?.[0] || null;
}

function galleryImageUrls(container) {
  const value = container.querySelector('[data-field="gallery_image_urls"]')?.value || '';
  return value
    .split(/[\n,]+/)
    .map(url => url.trim())
    .filter(Boolean)
    .slice(0, 9);
}

function previewPropertyImages(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  const files = [...(input.files || [])].slice(0, 10);
  if (!files.length) {
    preview.innerHTML = '';
    return;
  }

  preview.innerHTML = `
    <div class="property-upload-preview">
      ${files.map((file, index) => `
      <div class="property-upload-thumb">
        <img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)}">
        <span>${index === 0 ? 'Cover' : index + 1}</span>
      </div>`).join('')}
    </div>
    <p class="mt-3 text-center text-xs font-semibold text-emerald-700">
      ${files.length} photo${files.length === 1 ? '' : 's'} selected. The first photo becomes the cover.
    </p>`;
}

function previewDocumentName(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  const file = input.files?.[0];
  preview.innerHTML = file ? `
    <span class="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
      ${file.name}
    </span>
  ` : '';
}

async function submitPropertyListing(containerId) {
  if (!currentUser) {
    showToast('Please log in before posting a property.');
    showPage('login');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  const field = name => container.querySelector(`[data-field="${name}"]`)?.value?.trim() || '';
  const submitButton = container.querySelector('[data-submit-property]');
  const imageFiles = selectedPropertyImages(container);
  const galleryUrls = galleryImageUrls(container);
  const verificationDocument = selectedVerificationDocument(container);
  const payload = {
    title: field('title'),
    listing_type: selectedPostCategory.toLowerCase(),
    state: field('state'),
    area: field('area'),
    address: field('address'),
    price: field('price'),
    property_type: field('property_type'),
    bedrooms: field('bedrooms'),
    bathrooms: field('bathrooms'),
    size: field('size'),
    main_image_url: field('main_image_url'),
    gallery_image_urls: galleryUrls,
    description: field('description'),
    features: selectedAmenities(container),
    owner_name: field('owner_name'),
    owner_phone: field('owner_phone'),
    owner_whatsapp: field('owner_whatsapp'),
    owner_email: field('owner_email')
  };

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
  }

  try {
    let body = JSON.stringify(payload);
    let headers = authHeader();

    if (imageFiles.length || verificationDocument) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'features') return;
        if (key === 'gallery_image_urls') return;
        formData.append(key, value);
      });
      payload.features.forEach(feature => formData.append('features', feature));
      payload.gallery_image_urls.forEach(url => formData.append('gallery_image_urls', url));
      if (imageFiles[0]) formData.append('main_image', imageFiles[0]);
      imageFiles.slice(1).forEach(file => formData.append('images', file));
      if (verificationDocument) formData.append('verification_document', verificationDocument);
      body = formData;
      headers = { 'X-CSRFToken': getCookie('csrftoken') };
    }

    const response = await fetch('/api/properties/submit/', {
      method: 'POST',
      headers,
      body,
      credentials: 'same-origin'
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Please check the form and try again.');
      return;
    }

    showToast('Property submitted for verification!');
    renderPostForm(containerId);
    showPage('dashboard');
  } catch (error) {
    console.warn('Property submission failed.', error);
    showToast('Could not submit property. Please try again.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Property Listing';
    }
  }
}

function enquiryForm(propertyId) {
  return `
  <div class="mt-4 pt-4 border-t border-gray-100" data-enquiry-form="${propertyId}">
    <p class="font-semibold text-sm text-slate-900 mb-3">Send enquiry</p>
    <div class="space-y-2">
      <input class="form-input py-2.5 text-sm" data-enquiry-field="name" placeholder="Your name">
      <input class="form-input py-2.5 text-sm" data-enquiry-field="phone" placeholder="Phone number">
      <input class="form-input py-2.5 text-sm" data-enquiry-field="email" placeholder="Email optional">
      <textarea class="form-input resize-none text-sm" data-enquiry-field="message" rows="3" placeholder="I am interested in this property."></textarea>
      <button class="w-full btn-primary py-2.5 text-sm" data-submit-enquiry onclick="submitEnquiry('${propertyId}')">Send enquiry</button>
    </div>
  </div>`;
}

async function submitEnquiry(propertyId) {
  const form = document.querySelector(`[data-enquiry-form="${propertyId}"]`);
  if (!form) return;

  const field = name => form.querySelector(`[data-enquiry-field="${name}"]`)?.value?.trim() || '';
  const submitButton = form.querySelector('[data-submit-enquiry]');
  const payload = {
    property_id: propertyId,
    name: field('name'),
    phone: field('phone'),
    email: field('email'),
    message: field('message')
  };

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
  }

  try {
    const response = await fetch('/api/enquiries/submit/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Please check your details and try again.');
      return;
    }

    form.querySelectorAll('input, textarea').forEach(input => input.value = '');
    showToast('Enquiry sent. We will follow up soon.');
  } catch (error) {
    console.warn('Enquiry submission failed.', error);
    showToast('Could not send enquiry. Please try again.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send enquiry';
    }
  }
}

// ── Property Card HTML ─────────────────────────────────────────────────────

async function submitContactMessage(trigger) {
  const form = trigger?.closest('[data-contact-form]') || document.querySelector('#page-contact [data-contact-form]');
  if (!form) return;

  const field = name => form.querySelector(`[data-contact-field="${name}"]`)?.value?.trim() || '';
  const button = form.querySelector('[data-contact-submit]');
  const payload = {
    name: field('name'),
    email: field('email'),
    subject: field('subject'),
    message: field('message')
  };

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  try {
    const response = await fetch('/api/contact/submit/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Please check the contact form.');
      return;
    }

    form.querySelectorAll('input, textarea').forEach(input => input.value = '');
    showToast('Message sent. We will get back to you soon.');
  } catch (error) {
    console.warn('Contact message failed.', error);
    showToast('Could not send message. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send Message';
    }
  }
}

async function submitListingReport(id, event) {
  if (event) event.stopPropagation();
  const listing = findListingById(id);
  if (!listing) {
    showToast('Listing not found.');
    return;
  }

  const reason = window.prompt('Why are you reporting this listing?', 'Suspicious or inaccurate listing');
  if (!reason || !reason.trim()) return;

  try {
    const response = await fetch('/api/reports/submit/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeader(),
      body: JSON.stringify({
        property_id: id,
        reason: reason.trim(),
        name: currentUser?.name || '',
        email: currentUser?.email || ''
      })
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Could not submit report.');
      return;
    }

    showToast('Report submitted. Thank you.');
  } catch (error) {
    console.warn('Report submission failed.', error);
    showToast('Could not submit report. Please try again.');
  }
}

function propCard(p, compact=false) {
  const priceStr = p.unit ? fmt(p.price) + p.unit : fmt(p.price);
  const isLand = p.type === 'land';
  return `
  <div class="prop-card" data-property-card="${p.id}" role="button" tabindex="0">
    <div class="prop-card-img">
      <img src="${p.img}" alt="${p.title}" loading="lazy">
      ${photoBadge(p)}
      <div class="overlay-actions">
        ${heartIcon(p.id)}
        <button class="icon-btn" onclick="openListingWhatsApp('${p.id}', event)" title="WhatsApp">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.1.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.1.2-.3.2-.5 0-.1-.1-.4-.2-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4C7.6 7 7 7.7 7 9.2c0 1.4 1 2.8 1.2 3 .1.1 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.4 5.3L2 22l4.9-1.3C8.3 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.4-.5-4.8-1.3l-.4-.2-3 .8.8-2.9-.2-.4C3.5 15.2 3 13.6 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/></svg>
        </button>
      </div>
      ${p.new ? `<div class="absolute top-3 left-3"><span class="badge-new">New</span></div>` : ''}
    </div>
    <div class="p-4">
      <div class="flex items-start justify-between mb-1.5">
        <p class="font-display font-700 text-base text-slate-900">${priceStr}</p>
        <div class="flex gap-1.5 flex-wrap justify-end">
          ${renderTrustBadges(p)}
        </div>
      </div>
      <p class="font-semibold text-sm text-slate-800 mb-0.5 truncate">${p.title}</p>
      <p class="text-xs text-slate-500 flex items-center gap-1 mb-3">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1a3 3 0 100 6A3 3 0 005 1zM5 7s-3.5-1.5-3.5-4a3.5 3.5 0 017 0C8.5 5.5 5 7 5 7z" stroke="#94A3B8" stroke-width=".8"/><circle cx="5" cy="3.5" r="1" fill="#94A3B8"/></svg>
        ${p.location}
      </p>
      ${!isLand ? `
      <div class="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span class="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="10" height="7" rx="1" stroke="#94A3B8" stroke-width="1"/><path d="M1 7h10M4 4V3a2 2 0 014 0v1" stroke="#94A3B8" stroke-width="1"/></svg>${p.beds} bed${p.beds>1?'s':''}</span>
        <span class="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M2 6V3.5a1.5 1.5 0 013 0V6M10 6v2a2 2 0 01-4 0V6" stroke="#94A3B8" stroke-width="1" stroke-linecap="round"/></svg>${p.baths} bath${p.baths>1?'s':''}</span>
        <span>${p.sqm}m²</span>
      </div>` : `
      <div class="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span>${p.plotSize}</span>
        <span class="px-2 py-0.5 bg-slate-100 rounded-full">${p.landType}</span>
      </div>`}
      ${p.fairLabel ? `<span class="badge-fair text-xs">${p.fairLabel}</span>` : ''}
    </div>
  </div>`;
}

// ── Home page rendering ────────────────────────────────────────────────────

function emptyListingsMessage(title, text, columns = 'sm:col-span-2 lg:col-span-3 xl:col-span-4') {
  return `
    <div class="${columns} rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p class="font-semibold text-slate-700">${title}</p>
      <p class="mt-1 text-sm text-slate-400">${text}</p>
    </div>`;
}

function renderHome() {
  const featured = ALL_LISTINGS.slice(0, 8);
  const fGrid = document.querySelector('#page-home .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
  if (fGrid) {
    fGrid.innerHTML = featured.length
      ? featured.map(p => propCard(p)).join('')
      : emptyListingsMessage('No live listings yet', 'Approved properties will appear here as soon as they are published.');
  }

  // Ekiti area cards
  const aGrid = document.querySelector('#page-home .grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-6');
  if (aGrid) aGrid.innerHTML = EKITI_AREAS.map(a => `
    <div class="area-card" onclick="showPage('listings','rent')">
      <img src="${a.img}" alt="${a.name}" loading="lazy">
      <div class="area-overlay">
        <p class="text-white font-semibold text-sm leading-tight">${a.name}</p>
        <p class="text-white/70 text-xs">${a.count}</p>
      </div>
    </div>`).join('');

  // Homes for sale
  const hGrid = document.getElementById('homes-for-sale');
  if (hGrid) {
    hGrid.innerHTML = HOMES_FOR_SALE.length
      ? HOMES_FOR_SALE.map(p => propCard(p)).join('')
      : emptyListingsMessage('No homes for sale yet', 'Published sale listings will show here.', 'sm:col-span-2 lg:col-span-4');
  }

  // Land listings
  const lGrid = document.getElementById('land-listings');
  if (lGrid) {
    lGrid.innerHTML = LAND_LISTINGS.length
      ? LAND_LISTINGS.slice(0,3).map(p => propCard(p)).join('')
      : emptyListingsMessage('No land listings yet', 'Published land listings will show here.', 'sm:col-span-2 lg:col-span-3');
  }
}

// ── Listing tabs ───────────────────────────────────────────────────────────

function setHeroTab(tab) {
  document.querySelectorAll('.hero-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('hero-tab-' + tab).classList.add('active');
  document.querySelectorAll('.hero-search').forEach(s => s.classList.add('hidden'));
  document.getElementById('hero-search-' + tab).classList.remove('hidden');
}

function setListingTab(tab) {
  currentListingTab = tab;
  document.querySelectorAll('.listing-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('ltab-' + tab).classList.add('active');
  const notice = document.getElementById('ekiti-notice');
  if (notice) notice.style.display = tab === 'rent' ? 'block' : 'none';
  renderFiltersRow(tab);
  renderListingsGrid(tab);
}

function renderFiltersRow(tab) {
  const row = document.getElementById('filters-row');
  if (!row) return;
  let chips = '';
  if (tab === 'rent') {
    chips = `
      <select class="filter-chip" data-filter="area" onchange="renderListingsGrid('${tab}')"><option value="">Ekiti area</option><option>Ado-Ekiti</option><option>Basiri</option><option>Ajilosun</option><option>Odo-Ado</option><option>Iworoko</option><option>Ikere</option></select>
      <select class="filter-chip" data-filter="price" onchange="renderListingsGrid('${tab}')"><option value="">Price range</option><option value="0-199999">Under ₦200k/yr</option><option value="200000-400000">₦200k-₦400k/yr</option><option value="400000-800000">₦400k-₦800k/yr</option><option value="800001-">Above ₦800k/yr</option></select>
      <select class="filter-chip" data-filter="propertyType" onchange="renderListingsGrid('${tab}')"><option value="">Property type</option><option>Self-Contain</option><option>Mini Flat</option><option>2 Bedroom</option><option>3 Bedroom</option><option>Bungalow</option></select>
      <select class="filter-chip" data-filter="bedrooms" onchange="renderListingsGrid('${tab}')"><option value="">Bedrooms</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select>
      <button type="button" class="filter-chip" data-filter-toggle="verified" onclick="toggleListingFilter(this, '${tab}')">Verified only</button>
      <button type="button" class="filter-chip" data-filter-toggle="furnished" onclick="toggleListingFilter(this, '${tab}')">Furnished</button>`;
  } else if (tab === 'buy') {
    chips = `
      <select class="filter-chip" data-filter="state" onchange="renderListingsGrid('${tab}')"><option value="">Select state</option><option>Lagos</option><option>Abuja</option><option>Rivers</option><option>Oyo</option><option>Ekiti</option></select>
      <select class="filter-chip" data-filter="propertyType" onchange="renderListingsGrid('${tab}')"><option value="">Property type</option><option>Apartment</option><option>Duplex</option><option>Bungalow</option><option>Terrace</option><option>Self-Contain</option></select>
      <select class="filter-chip" data-filter="price" onchange="renderListingsGrid('${tab}')"><option value="">Price range</option><option value="0-19999999">Under ₦20M</option><option value="20000000-50000000">₦20M-₦50M</option><option value="50000000-100000000">₦50M-₦100M</option><option value="100000001-">₦100M+</option></select>
      <select class="filter-chip" data-filter="bedrooms" onchange="renderListingsGrid('${tab}')"><option value="">Bedrooms</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select>
      <button type="button" class="filter-chip" data-filter-toggle="cofo" onclick="toggleListingFilter(this, '${tab}')">C of O</button>
      <button type="button" class="filter-chip" data-filter-toggle="verified" onclick="toggleListingFilter(this, '${tab}')">Verified</button>`;
  } else {
    chips = `
      <select class="filter-chip" data-filter="state" onchange="renderListingsGrid('${tab}')"><option value="">Select state</option><option>Lagos</option><option>Abuja</option><option>Oyo</option><option>Ekiti</option></select>
      <select class="filter-chip" data-filter="landType" onchange="renderListingsGrid('${tab}')"><option value="">Land type</option><option>Residential</option><option>Commercial</option><option>Estate Plot</option><option>Farmland</option></select>
      <select class="filter-chip" data-filter="plotSize" onchange="renderListingsGrid('${tab}')"><option value="">Plot size</option><option value="0-299">Under 300sqm</option><option value="300-600">300-600sqm</option><option value="601-9999">600sqm+</option><option value="10000-">1 Hectare+</option></select>
      <select class="filter-chip" data-filter="documentType" onchange="renderListingsGrid('${tab}')"><option value="">Document type</option><option>C of O</option><option>Survey Plan</option><option>Governor's Consent</option></select>
      <button type="button" class="filter-chip" data-filter-toggle="estate" onclick="toggleListingFilter(this, '${tab}')">Gated estate</button>
      <button type="button" class="filter-chip" data-filter-toggle="dry" onclick="toggleListingFilter(this, '${tab}')">Dry land</button>`;
  }
  row.innerHTML = chips;
}

function toggleListingFilter(button, tab) {
  button.classList.toggle('active');
  renderListingsGrid(tab);
}

function filterText(value) {
  return String(value || '').toLowerCase();
}

function matchesTextFilter(listing, filterValue, fields) {
  if (!filterValue) return true;
  const needle = filterText(filterValue).replace(/-/g, ' ');
  return fields.some(field => filterText(field).replace(/-/g, ' ').includes(needle));
}

function matchesRange(value, range) {
  if (!range) return true;
  const [minValue, maxValue] = range.split('-');
  const min = minValue ? Number(minValue) : 0;
  const max = maxValue ? Number(maxValue) : Infinity;
  const numericValue = Number(value) || 0;
  return numericValue >= min && numericValue <= max;
}

function listingHasText(listing, value) {
  const fields = [
    listing.title,
    listing.category,
    listing.location,
    listing.area,
    listing.state,
    listing.landType,
    listing.docType,
    listing.furnished,
    ...(listing.amenities || []),
    ...(listing.docs || [])
  ];
  return matchesTextFilter(listing, value, fields);
}

function applyListingFilters(list, tab) {
  const row = document.getElementById('filters-row');
  if (!row) return list;

  const getFilter = name => row.querySelector(`[data-filter="${name}"]`)?.value || '';
  const isActive = name => row.querySelector(`[data-filter-toggle="${name}"]`)?.classList.contains('active');

  return list.filter(listing => {
    if (!matchesTextFilter(listing, getFilter('area'), [listing.area, listing.location])) return false;
    if (!matchesTextFilter(listing, getFilter('state'), [listing.state, listing.location])) return false;
    if (!matchesTextFilter(listing, getFilter('propertyType'), [listing.category, listing.title])) return false;
    if (!matchesTextFilter(listing, getFilter('landType'), [listing.landType, listing.category, listing.title])) return false;
    if (!matchesRange(listing.price, getFilter('price'))) return false;
    if (!matchesRange(listing.sqm, getFilter('plotSize'))) return false;

    const bedrooms = Number(getFilter('bedrooms'));
    if (bedrooms && (Number(listing.beds) || 0) < bedrooms) return false;

    if (getFilter('documentType') && !listingHasText(listing, getFilter('documentType'))) return false;
    if (isActive('verified') && !listing.verified) return false;
    if (isActive('furnished') && !listingHasText(listing, 'furnished')) return false;
    if (isActive('cofo') && !listingHasText(listing, 'C of O')) return false;
    if (isActive('estate') && !listing.estate && !listingHasText(listing, 'estate')) return false;
    if (isActive('dry') && !listing.dry && !listingHasText(listing, 'dry')) return false;

    return true;
  });
}

function mapSearchQuery(listing) {
  const parts = [
    listing?.address,
    listing?.location,
    listing?.area,
    listing?.state,
    'Nigeria'
  ].filter(Boolean);
  return parts.join(', ');
}

function googleMapEmbedUrl(query) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function googleMapOpenUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function renderMapEmbed(query, title = 'Property location', heightClass = 'h-48') {
  return `
    <div class="${heightClass} map-embed-card">
      <iframe
        title="${title}"
        src="${googleMapEmbedUrl(query)}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen></iframe>
    </div>
    <div class="mt-2 flex items-center justify-between gap-3 text-xs">
      <span class="truncate text-slate-500">${query}</span>
      <a href="${googleMapOpenUrl(query)}" target="_blank" rel="noopener" class="font-semibold text-emerald-600 hover:text-emerald-700 shrink-0">Open larger map</a>
    </div>`;
}

function renderListingsMap(list) {
  const panel = document.getElementById('map-panel');
  if (!panel) return;

  if (!list.length) {
    panel.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center flex-col gap-3 bg-slate-100">
        <div class="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3C9 3 5 7 5 12c0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9z" stroke="#64748B" stroke-width="1.5"/><circle cx="14" cy="12" r="3" stroke="#64748B" stroke-width="1.5"/></svg>
        </div>
        <p class="text-slate-500 text-sm font-medium">No listings on map</p>
        <p class="text-slate-400 text-xs">Adjust the filters to see mapped listings.</p>
      </div>`;
    return;
  }

  const primary = list[0];
  const query = mapSearchQuery(primary);
  panel.innerHTML = `
    <div class="absolute inset-0">
      <iframe
        title="Listings map"
        src="${googleMapEmbedUrl(query)}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen></iframe>
    </div>
    <div class="absolute left-4 right-4 bottom-4 max-h-56 overflow-y-auto space-y-2">
      ${list.slice(0, 6).map(item => `
      <button class="map-listing-chip" onclick="showPropertyPage('${item.id}')">
        <span class="min-w-0">
          <span class="block truncate font-semibold text-slate-900">${item.title}</span>
          <span class="block truncate text-xs text-slate-500">${item.location}</span>
        </span>
        <span class="font-bold text-emerald-600">${fmt(item.price)}${item.unit || ''}</span>
      </button>`).join('')}
    </div>`;
}

function renderListingsGrid(tab) {
  const grid = document.getElementById('listings-grid');
  const countEl = document.getElementById('listing-count');
  if (!grid) return;
  let list;
  if (tab === 'rent') list = RENTALS;
  else if (tab === 'buy') list = HOMES_FOR_SALE;
  else list = LAND_LISTINGS;
  const hasAnyListingsInTab = list.length > 0;
  list = applyListingFilters(list, tab);
  if (countEl) countEl.textContent = `Showing ${list.length} results`;
  renderListingsMap(list);
  grid.innerHTML = list.length ? list.map(p => propCard(p)).join('') : `
    <div class="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <p class="font-semibold text-slate-700">${hasAnyListingsInTab ? 'No listings match these filters' : 'No live listings yet'}</p>
      <p class="mt-1 text-sm text-slate-400">${hasAnyListingsInTab ? 'Try changing one or two filters.' : 'Approved properties will appear here after admin review.'}</p>
    </div>`;
}

// ── Property Detail ────────────────────────────────────────────────────────

function renderPropertyDetail(p) {
  const page = document.getElementById('page-property');
  const isRent = p.type === 'rent';
  const total = isRent ? Object.values(p.costs).reduce((a,b)=>a+b,0) : 0;

  page.innerHTML = `
  <div class="detail-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Breadcrumb -->
    <div class="breadcrumb detail-breadcrumb mb-4">
      <a href="#" onclick="showPage('home')">Home</a><span>/</span>
      <a href="#" onclick="showPage('listings','${p.type}')">${p.type==='rent'?'Rent':'Buy'}</a><span>/</span>
      <span class="text-slate-500 truncate">${p.title}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left -->
      <div class="lg:col-span-2">
        <!-- Gallery -->
        ${renderGallerySlider(p)}

        <!-- Title row -->
        <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div class="flex flex-wrap gap-2 mb-2">
              ${renderTrustBadges(p)}
              ${p.new?`<span class="badge-new">New</span>`:''}
              ${p.fairLabel?`<span class="badge-fair">${p.fairLabel}</span>`:''}
            </div>
            <h1 class="font-display font-700 text-2xl sm:text-3xl text-slate-900">${p.title}</h1>
            <p class="text-slate-500 flex items-center gap-1.5 mt-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5A4.5 4.5 0 002.5 6c0 4 4.5 7.5 4.5 7.5S11.5 10 11.5 6A4.5 4.5 0 007 1.5z" stroke="#64748B" stroke-width="1.2"/><circle cx="7" cy="6" r="1.5" stroke="#64748B" stroke-width="1.2"/></svg>
              ${p.location}
            </p>
          </div>
          <div class="text-right">
            <p class="font-display font-700 text-2xl text-emerald-600">${fmt(p.price)}${p.unit||''}</p>
            ${listingEngagementText(p) ? `<p class="text-xs text-slate-400 mt-0.5">${listingEngagementText(p)}</p>` : ''}
          </div>
        </div>

        <!-- Key details -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="text-xl font-bold text-slate-900">${p.beds}</p>
            <p class="text-xs text-slate-500 mt-0.5">Bedroom${p.beds>1?'s':''}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="text-xl font-bold text-slate-900">${p.baths}</p>
            <p class="text-xs text-slate-500 mt-0.5">Bathroom${p.baths>1?'s':''}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="text-xl font-bold text-slate-900">${p.sqm}m²</p>
            <p class="text-xs text-slate-500 mt-0.5">Floor area</p>
          </div>
        </div>

        <!-- Description -->
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Description</h2>
          <p class="text-slate-600 leading-relaxed">${p.desc}</p>
        </div>

        <!-- Amenities -->
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Amenities</h2>
          <div class="flex flex-wrap gap-2">
            ${p.amenities.map(a=>`
            <span class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${a}
            </span>`).join('')}
          </div>
        </div>

        <!-- Fair price indicator -->
        ${p.fairPct ? `
        <div class="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="font-semibold text-blue-800 text-sm">Fair Price Insight</p>
            <span class="badge-fair">${p.fairLabel}</span>
          </div>
          <p class="text-blue-700 text-sm">${p.fairPct} in ${p.area || p.location.split(',')[0]}</p>
          <div class="fair-price-bar mt-3">
            <div class="fill" style="width:${p.fairPct.includes('below')?'38%':p.fairPct.includes('above')?'72%':'55%'}"></div>
          </div>
          <div class="flex justify-between text-xs text-blue-400 mt-1"><span>Below avg</span><span>Area avg</span><span>Above avg</span></div>
        </div>` : ''}

        <!-- Pricing breakdown (rent only) -->
        ${isRent ? `
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Full move-in cost</h2>
          <div class="border border-gray-100 rounded-xl overflow-hidden">
            <div class="p-4">
              <div class="price-row"><span class="label">Yearly rent</span><span class="value">${fmt(p.costs.yearly)}</span></div>
              <div class="price-row"><span class="label">Caution fee (refundable)</span><span class="value">${fmt(p.costs.caution)}</span></div>
              <div class="price-row"><span class="label">Agreement fee</span><span class="value">${fmt(p.costs.agreement)}</span></div>
              <div class="price-row"><span class="label">Agency/Commission</span><span class="value">${p.costs.agency?fmt(p.costs.agency):'-'}</span></div>
              <div class="price-row"><span class="label">Service charge</span><span class="value">${p.costs.service?fmt(p.costs.service):'-'}</span></div>
              <div class="price-row total"><span class="label">Total estimated move-in cost</span><span class="value">${fmt(total)}</span></div>
            </div>
          </div>
          <div class="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#94A3B8" stroke-width="1.2"/><path d="M7 5v4M7 10v.5" stroke="#94A3B8" stroke-width="1.2" stroke-linecap="round"/></svg>
            <span>No hidden fees. Confirm all charges with the landlord/agent before making any payment.</span>
          </div>
        </div>` : ''}

        <!-- Map -->
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Location</h2>
          ${renderMapEmbed(mapSearchQuery(p), `${p.title} location`)}
        </div>

        <!-- Nearby places -->
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Nearby places</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            ${(p.nearby||[]).map(n=>`
            <div class="nearby-card">
              ${nearbyIcon(n.name)}
              <div>
                <p class="font-medium text-slate-800 text-sm">${n.name}</p>
                <p class="text-slate-400 text-xs">${n.dist}</p>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Similar listings -->
        <div>
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Similar listings</h2>
          <div class="space-y-3">
            ${ALL_LISTINGS.filter(x=>x.type===p.type&&x.id!==p.id).slice(0,3).map(x=>`
            <div class="similar-card" onclick="showPropertyPage('${x.id}')">
              <img src="${x.img}" alt="${x.title}">
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm text-slate-900 truncate">${x.title}</p>
                <p class="text-xs text-slate-500 truncate">${x.location}</p>
                <p class="text-emerald-600 font-bold text-sm mt-0.5">${fmt(x.price)}${x.unit||''}</p>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Right: Agent card -->
      <div>
        <div class="agent-card">
          <div class="text-center mb-5 pb-5 border-b border-gray-100">
            <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span class="font-display font-700 text-emerald-600 text-xl">${p.agent.name.split(' ').map(w=>w[0]).join('')}</span>
            </div>
            <p class="font-semibold text-slate-900">${p.agent.name}</p>
            <p class="text-xs text-slate-500">${p.agent.role}</p>
            ${p.agent.verified?`<span class="inline-flex items-center gap-1 mt-1 badge-verified text-xs">${checkIconSvg()}${escapeHtml(p.agent.badge || 'Verified owner')}</span>`:''}
            <p class="text-xs text-slate-400 mt-1">${p.agent.listings} active listings</p>
          </div>
          ${renderTrustSummary(p)}
          ${contactSafetyNotice()}
          <div class="space-y-2">
            <button class="w-full btn-primary py-3" onclick="callListingContact('${p.id}', event)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5c.3-.3 2.5-1 3 .5l.7 2c.2.5 0 1-.4 1.3l-.5.5c.4.8 1.1 1.5 1.9 1.9l.5-.5c.3-.4.8-.6 1.3-.4l2 .7c1.5.5.8 2.7.5 3C10.5 12.5 3 11 2.5 2.5z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Call now
            </button>
            <button class="w-full btn-whatsapp py-3" onclick="openListingWhatsApp('${p.id}', event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.1.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.1.2-.3.2-.5 0-.1-.1-.4-.2-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4C7.6 7 7 7.7 7 9.2c0 1.4 1 2.8 1.2 3 .1.1 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.4 5.3L2 22l4.9-1.3C8.3 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.4-.5-4.8-1.3l-.4-.2-3 .8.8-2.9-.2-.4C3.5 15.2 3 13.6 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/></svg>
              WhatsApp
            </button>
            <button class="w-full btn-secondary py-2.5 text-sm" onclick="toggleSave('${p.id}',event)">
              ${savedIds.has(String(p.id))?'Saved':'Save property'}
            </button>
          </div>
          ${enquiryForm(p.id)}
          <div class="mt-4 pt-4 border-t border-gray-100">
            <button class="text-xs text-red-400 hover:text-red-500 w-full text-center flex items-center justify-center gap-1" onclick="submitListingReport('${p.id}', event)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v4M6 8.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/></svg>
              Report this listing
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Land Detail ────────────────────────────────────────────────────────────

function renderLandDetail(p) {
  const page = document.getElementById('page-land');
  page.innerHTML = `
  <div class="detail-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="breadcrumb detail-breadcrumb mb-4">
      <a href="#" onclick="showPage('home')">Home</a><span>/</span>
      <a href="#" onclick="showPage('listings','land')">Land</a><span>/</span>
      <span class="text-slate-500 truncate">${p.title}</span>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">
        ${renderGallerySlider(p)}

        <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div class="mb-2 flex flex-wrap gap-2">${renderTrustBadges(p)}</div>
            <h1 class="font-display font-700 text-2xl sm:text-3xl text-slate-900 mt-1">${p.title}</h1>
            <p class="text-slate-500 mt-1 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5A4.5 4.5 0 002.5 6c0 4 4.5 7.5 4.5 7.5S11.5 10 11.5 6A4.5 4.5 0 007 1.5z" stroke="#64748B" stroke-width="1.2"/><circle cx="7" cy="6" r="1.5" stroke="#64748B" stroke-width="1.2"/></svg>
              ${p.location}
            </p>
          </div>
          <div class="text-right">
            <p class="font-display font-700 text-2xl text-emerald-600">${fmt(p.price)}</p>
            ${listingEngagementText(p) ? `<p class="text-xs text-slate-400">${listingEngagementText(p)}</p>` : ''}
          </div>
        </div>

        <!-- Land specs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="font-bold text-slate-900">${p.plotSize}</p>
            <p class="text-xs text-slate-500 mt-0.5">Plot size</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="font-bold text-slate-900">${p.landType}</p>
            <p class="text-xs text-slate-500 mt-0.5">Land type</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="font-bold text-slate-900">${p.dry?'Dry':'Wet'}</p>
            <p class="text-xs text-slate-500 mt-0.5">Land status</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center">
            <p class="font-bold text-slate-900">${p.estate?'Yes':'No'}</p>
            <p class="text-xs text-slate-500 mt-0.5">Gated estate</p>
          </div>
        </div>

        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Description</h2>
          <p class="text-slate-600 leading-relaxed">${p.desc}</p>
        </div>

        <!-- Document badges -->
        <div class="mb-6">
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Title documents</h2>
          <div class="flex flex-wrap gap-2">
            ${['Survey Plan','C of O','Deed of Assignment','Governor\'s Consent'].map(doc=>{
              const has = p.docs.includes(doc);
              return `<span class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border ${has?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-slate-50 border-gray-200 text-slate-400'}">
                ${has?`<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`:'<span class="w-3 h-3 rounded-full border border-slate-300 inline-block"></span>'}
                ${doc}
              </span>`;
            }).join('')}
          </div>
        </div>

        <!-- Map -->
        <div>
          <h2 class="font-display font-600 text-lg text-slate-900 mb-3">Location</h2>
          ${renderMapEmbed(mapSearchQuery(p), `${p.title} location`)}
        </div>
      </div>

      <!-- Agent card -->
      <div>
        <div class="agent-card">
          <div class="text-center mb-5 pb-5 border-b border-gray-100">
            <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span class="font-display font-700 text-emerald-600 text-xl">${p.agent.name.split(' ').map(w=>w[0]).join('')}</span>
            </div>
            <p class="font-semibold text-slate-900">${p.agent.name}</p>
            <p class="text-xs text-slate-500">${p.agent.role}</p>
            ${p.agent.verified?`<span class="inline-flex items-center gap-1 mt-1 badge-verified text-xs">${checkIconSvg()}${escapeHtml(p.agent.badge || 'Verified seller')}</span>`:''}
          </div>
          ${renderTrustSummary(p)}
          ${contactSafetyNotice()}
          <div class="space-y-2">
            <button class="w-full btn-primary py-3" onclick="callListingContact('${p.id}', event)">Call seller</button>
            <button class="w-full btn-whatsapp py-3" onclick="openListingWhatsApp('${p.id}', event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.1.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.1.2-.3.2-.5 0-.1-.1-.4-.2-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4C7.6 7 7 7.7 7 9.2c0 1.4 1 2.8 1.2 3 .1.1 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.4 5.3L2 22l4.9-1.3C8.3 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.4-.5-4.8-1.3l-.4-.2-3 .8.8-2.9-.2-.4C3.5 15.2 3 13.6 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/></svg>
              WhatsApp
            </button>
            <button class="w-full btn-secondary py-2.5 text-sm" onclick="toggleSave('${p.id}',event)">${savedIds.has(String(p.id))?'Saved':'Save property'}</button>
          </div>
          ${enquiryForm(p.id)}
          <div class="mt-4 pt-4 border-t border-gray-100">
            <button class="text-xs text-red-400 hover:text-red-500 w-full text-center flex items-center justify-center gap-1" onclick="submitListingReport('${p.id}', event)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v4M6 8.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/></svg>
              Report this listing
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Favorites ──────────────────────────────────────────────────────────────

function renderFavorites() {
  const grid = document.getElementById('favorites-grid');
  if (!grid) return;

  if (!currentUser) {
    grid.innerHTML = `<div class="col-span-full text-center py-20">
      <div class="mx-auto mb-4 nearby-icon w-14 h-14 text-emerald-600">${listingTypeIcon('Rent')}</div>
      <p class="font-semibold text-slate-700 mb-1">Log in to see saved properties</p>
      <p class="text-slate-400 text-sm mb-6">Your saved list is stored in your account.</p>
      <button onclick="showPage('login')" class="btn-primary">Log in</button>
    </div>`;
    return;
  }

  const favs = ALL_LISTINGS.filter(p => savedIds.has(String(p.id)));
  if (favs.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20">
      <div class="mx-auto mb-4 nearby-icon w-14 h-14 text-emerald-600">${listingTypeIcon('Rent')}</div>
      <p class="font-semibold text-slate-700 mb-1">No saved properties yet</p>
      <p class="text-slate-400 text-sm mb-6">Click the heart icon on any listing to save it here.</p>
      <button onclick="showPage('listings','rent')" class="btn-primary">Browse listings</button>
    </div>`;
    return;
  }
  grid.innerHTML = favs.map(p => propCard(p)).join('');
}

function renderDashboardSaved() {
  const savedGrid = document.getElementById('dashboard-saved');
  if (!savedGrid) return;

  const favs = ALL_LISTINGS.filter(p => savedIds.has(String(p.id))).slice(0, 3);
  if (!currentUser) {
    savedGrid.innerHTML = `<p class="text-sm text-slate-500">Log in to keep saved properties in your account.</p>`;
    return;
  }

  if (!favs.length) {
    savedGrid.innerHTML = `
      <div class="text-sm text-slate-500">
        <p>No saved properties yet.</p>
        <button onclick="showPage('listings','rent')" class="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700">Browse listings</button>
      </div>`;
    return;
  }

  savedGrid.innerHTML = favs.map(p => `
    <button class="w-full flex items-center gap-3 rounded-xl border border-gray-100 p-2 text-left hover:border-emerald-100 hover:bg-emerald-50/40 transition-all" onclick="showPropertyPage('${p.id}')">
      <img src="${p.img}" alt="${p.title}" class="h-12 w-14 rounded-lg object-cover">
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-slate-900">${p.title}</span>
        <span class="block truncate text-xs text-slate-500">${p.location}</span>
      </span>
      <span class="shrink-0 text-xs font-bold text-emerald-600">${fmt(p.price)}</span>
    </button>
  `).join('');
}

function renderOwnerEnquiryCard(enquiry) {
  const phone = phoneDigits(enquiry.phone);
  const whatsappLink = ownerEnquiryWhatsAppLink(enquiry);
  const email = String(enquiry.email || '').trim();
  const initial = escapeHtml((enquiry.name || 'E')[0].toUpperCase());
  const propertyTitle = escapeHtml(enquiry.propertyTitle || 'Property enquiry');
  const message = escapeHtml(enquiry.message || 'Interested in this property.');
  const name = escapeHtml(enquiry.name || 'Prospective tenant');
  const phoneLabel = escapeHtml(enquiry.phone || 'No phone provided');
  const time = escapeHtml(enquiry.time || '');
  const status = String(enquiry.status || 'new');
  const statusLabel = status === 'contacted' ? 'Contacted' : 'New';

  return `
  <div class="owner-enquiry-card ${status === 'contacted' ? 'owner-enquiry-contacted' : ''}">
    <div class="owner-enquiry-top">
      <div class="owner-enquiry-avatar">${initial}</div>
      <div class="min-w-0">
        <div class="owner-enquiry-meta">
          <p class="owner-enquiry-name">${name}</p>
          <span>${time}</span>
        </div>
        <p class="owner-enquiry-property"><span>Asked about</span>${propertyTitle}</p>
        <span class="owner-enquiry-status ${status === 'contacted' ? 'contacted' : 'new'}">${statusLabel}</span>
      </div>
    </div>
    <p class="owner-enquiry-message">${message}</p>
    <div class="owner-enquiry-contact">
      <span>${phoneLabel}</span>
      <div class="owner-enquiry-actions">
        ${phone ? `<a href="tel:+${phone}" class="owner-enquiry-action">Call</a>` : ''}
        ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="owner-enquiry-action whatsapp">WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${escapeHtml(email)}?subject=${encodeURIComponent(`RentFair enquiry: ${enquiry.propertyTitle || 'Property'}`)}" class="owner-enquiry-action">Email</a>` : ''}
      </div>
    </div>
    <div class="owner-enquiry-manage">
      ${status !== 'contacted' ? `
      <button type="button" class="owner-enquiry-manage-btn" onclick="ownerUpdateEnquiry('${enquiry.id}', 'mark_contacted', this)">
        Mark contacted
      </button>` : ''}
      <button type="button" class="owner-enquiry-manage-btn close" onclick="ownerUpdateEnquiry('${enquiry.id}', 'close', this)">
        Close
      </button>
    </div>
  </div>`;
}

async function ownerUpdateEnquiry(id, action, button) {
  const label = action === 'close' ? 'close this enquiry' : 'mark this enquiry as contacted';
  if (action === 'close' && !confirm(`Are you sure you want to ${label}? It will leave your dashboard list.`)) {
    return;
  }

  const oldText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Updating...';
  }

  try {
    const response = await fetch(`/api/enquiries/${id}/${action}/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Enquiry could not be updated.');
      return;
    }

    showToast(result.message || 'Enquiry updated.');
    await loadUserDashboard();
  } catch (error) {
    console.warn('Owner enquiry update failed.', error);
    showToast('Enquiry could not be updated. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function renderDashboard() {
  const dlGrid = document.getElementById('dashboard-listings');
  const dmGrid = document.getElementById('dashboard-messages');
  const savedGrid = document.getElementById('dashboard-saved');
  if (!dlGrid) return;

  const displayName = currentUser?.name || currentUser?.username || 'your account';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'RF';
  const initialsEl = document.querySelector('[data-dashboard-initials]');
  const nameEl = document.querySelector('[data-dashboard-name]');
  const roleEl = document.querySelector('[data-dashboard-role]');
  const totalEl = document.querySelector('[data-dashboard-total-listings]');
  const activeEl = document.querySelector('[data-dashboard-active-listings]');
  const enquiriesEl = document.querySelector('[data-dashboard-enquiries]');
  const viewsEl = document.querySelector('[data-dashboard-views]');
  const whatsappLeadsEl = document.querySelector('[data-dashboard-whatsapp-leads]');

  if (initialsEl) initialsEl.textContent = initials;
  if (nameEl) nameEl.textContent = `Welcome, ${displayName}`;
  if (roleEl) {
    const roleText = currentUser?.is_staff ? 'Administrator account' : (currentUser?.role_label || 'Tenant / Buyer');
    const verificationText = currentUser?.verification_label || 'Unverified';
    roleEl.textContent = `${roleText} · ${verificationText}`;
  }
  if (totalEl) totalEl.textContent = '...';
  if (activeEl) activeEl.textContent = '...';
  if (enquiriesEl) enquiriesEl.textContent = '...';
  if (viewsEl) viewsEl.textContent = '0';
  if (whatsappLeadsEl) whatsappLeadsEl.textContent = '0';

  dlGrid.innerHTML = `<p class="text-sm text-slate-500">Loading your listings...</p>`;
  if (dmGrid) dmGrid.innerHTML = `<p class="text-sm text-slate-500">Loading enquiries...</p>`;
  if (savedGrid) renderDashboardSaved();
  loadUserDashboard();
}

async function loadUserDashboard() {
  try {
    const response = await fetch('/api/dashboard/', { credentials: 'same-origin' });
    if (!response.ok) return;
    const data = await response.json();

    const totalEl = document.querySelector('[data-dashboard-total-listings]');
    const activeEl = document.querySelector('[data-dashboard-active-listings]');
    const enquiriesEl = document.querySelector('[data-dashboard-enquiries]');
    const viewsEl = document.querySelector('[data-dashboard-views]');
    const whatsappLeadsEl = document.querySelector('[data-dashboard-whatsapp-leads]');
    const dlGrid = document.getElementById('dashboard-listings');
    const dmGrid = document.getElementById('dashboard-messages');

    if (totalEl) totalEl.textContent = data.stats.totalListings;
    if (activeEl) activeEl.textContent = data.stats.activeListings;
    if (enquiriesEl) enquiriesEl.textContent = data.stats.enquiries;
    if (viewsEl) viewsEl.textContent = data.stats.views;
    if (whatsappLeadsEl) whatsappLeadsEl.textContent = data.stats.whatsappLeads || 0;

    if (dlGrid) {
      dlGrid.innerHTML = data.listings.length ? data.listings.map(p => `
      <div class="dash-listing-row">
        <img src="${p.img}" alt="${p.title}">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-slate-900 truncate">${p.title}</p>
          <p class="text-xs text-slate-500">${p.location}</p>
          <p class="mt-1 text-xs font-semibold text-slate-400">
            ${Number(p.views || 0).toLocaleString()} view${Number(p.views || 0) === 1 ? '' : 's'} ·
            ${Number(p.whatsappLeads || 0).toLocaleString()} WhatsApp lead${Number(p.whatsappLeads || 0) === 1 ? '' : 's'}
          </p>
          ${p.reviewNote ? `
          <div class="owner-review-note">
            <strong>Admin note</strong>
            <span>${escapeHtml(p.reviewNote)}</span>
          </div>` : ''}
        </div>
        <div class="text-right shrink-0">
          <p class="font-bold text-sm text-emerald-600">${p.price}</p>
          <span class="owner-status-pill ${dashboardStatusClass(p.status)}">${p.status}</span>
          ${p.canMarkUnavailable ? `
          <button class="owner-action-btn ${p.rawType === 'rent' ? 'owner-action-rented' : 'owner-action-sold'}" onclick="ownerMarkUnavailable('${p.id}', '${p.rawType}', event)">
            ${p.rawType === 'rent' ? 'Mark as rented' : 'Mark as sold'}
          </button>` : ''}
        </div>
      </div>`).join('') : `
      <div class="text-center py-10">
        <p class="font-semibold text-slate-700">No properties yet</p>
        <p class="text-sm text-slate-400 mt-1 mb-4">Post a property and it will appear here after submission.</p>
        <button onclick="showPage('post')" class="btn-primary py-2.5 px-4 text-sm">Post Property</button>
      </div>`;
    }

    if (dmGrid) {
      dmGrid.innerHTML = data.enquiries.length ? data.enquiries.map(renderOwnerEnquiryCard).join('') : `<p class="text-sm text-slate-500">No enquiries yet.</p>`;
    }
  } catch (error) {
    console.warn('Dashboard could not be loaded.', error);
  }
}

function dashboardStatusClass(status) {
  if (status === 'Active') return 'owner-status-active';
  if (status === 'Sold' || status === 'Rented') return 'owner-status-closed';
  if (status === 'Flagged') return 'owner-status-flagged';
  return 'owner-status-pending';
}

async function ownerMarkUnavailable(id, rawType, event) {
  if (event) event.stopPropagation();
  const isRent = rawType === 'rent';
  const label = isRent ? 'rented' : 'sold';
  if (!confirm(`Mark this listing as ${label}? It will be removed from public listings and admin will see the update.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/properties/${id}/${isRent ? 'mark_rented' : 'mark_sold'}/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Listing could not be updated.');
      return;
    }

    showToast(result.message || `Listing marked as ${label}.`);
    await loadLiveListings();
    await loadFavourites();
    await loadUserDashboard();
  } catch (error) {
    console.warn('Owner listing update failed.', error);
    showToast('Listing could not be updated. Please try again.');
  }
}

// ── Post form ──────────────────────────────────────────────────────────────

function renderPostForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  selectedPostCategory = 'Rent';
  container.innerHTML = `
  <div class="form-section">
    <h3>What are you listing?</h3>
    <div class="grid grid-cols-3 gap-3">
      ${['Rent','Buy','Land'].map((cat,i)=>`
      <button class="post-cat-btn py-4 border-2 rounded-xl font-semibold text-sm transition-all ${i===0?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-200 text-slate-600 hover:border-emerald-300'}"
        onclick="selectPostCat('${cat}',this)">
        <span class="flex items-center justify-center gap-2">${listingTypeIcon(cat)} ${cat}</span>
      </button>`).join('')}
    </div>
    <div id="rent-notice" class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 4.5v3.5M7 9.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      Rental listings are currently limited to Ekiti State only.
    </div>
  </div>

  <div class="form-section">
    <h3>Property details</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Property title</label>
        <input type="text" class="form-input" data-field="title" placeholder="e.g. Spacious 2-bedroom flat in Ajilosun">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">State</label>
        <select class="form-input" data-field="state"><option>Ekiti</option><option>Lagos</option><option>Abuja</option><option>Oyo</option><option>Rivers</option></select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">City / Area</label>
        <input type="text" class="form-input" data-field="area" placeholder="e.g. Ado-Ekiti">
      </div>
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Full property address</label>
        <input type="text" class="form-input" data-field="address" placeholder="e.g. No. 12 Oke-Ila Street, Basiri, Ado-Ekiti">
        <p class="mt-1.5 text-xs text-slate-400">Used for verification and serious enquiries. Avoid posting sensitive access details.</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Price (₦)</label>
        <input type="number" class="form-input" data-field="price" placeholder="0">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Property type</label>
        <select class="form-input" data-field="property_type"><option>Self-Contain</option><option>Mini Flat</option><option>1 Bedroom</option><option>2 Bedroom</option><option>3 Bedroom</option><option>Bungalow</option><option>Duplex</option><option>Residential Land</option><option>Commercial Land</option></select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Bedrooms</label>
        <select class="form-input" data-field="bedrooms"><option>Studio</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option></select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Bathrooms</label>
        <select class="form-input" data-field="bathrooms"><option>1</option><option>2</option><option>3</option><option>4+</option></select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Size / plot size</label>
        <input type="text" class="form-input" data-field="size" placeholder="e.g. 600 sqm">
      </div>
    </div>
  </div>

  <div class="form-section">
    <h3>Photos</h3>
    <div class="upload-zone">
      <svg class="mx-auto mb-3" width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3v14M7 10l7-7 7 7" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 22h20" stroke="#10B981" stroke-width="1.5" stroke-linecap="round"/></svg>
      <p class="text-slate-700 font-medium text-sm">Upload property photo gallery</p>
      <p class="text-slate-400 text-xs mt-1">Choose up to 10 JPG, PNG, or WEBP photos. Add exterior, rooms, kitchen, bathroom, compound, and access road.</p>
      <input id="${containerId}-images" type="file" class="hidden" data-field="images" accept="image/jpeg,image/png,image/webp" multiple onchange="previewPropertyImages(this, '${containerId}-image-preview')">
      <button type="button" class="mt-3 btn-secondary text-xs py-2 px-4" onclick="document.getElementById('${containerId}-images').click()">Choose photos</button>
      <div id="${containerId}-image-preview" class="mt-4 flex flex-wrap justify-center gap-2"></div>
    </div>
    <div class="mt-4">
      <label class="block text-sm font-medium text-slate-700 mb-1.5">Main image URL</label>
      <input type="url" class="form-input" data-field="main_image_url" placeholder="https://example.com/property.jpg">
    </div>
    <div class="mt-4">
      <label class="block text-sm font-medium text-slate-700 mb-1.5">Gallery image URLs</label>
      <textarea rows="3" class="form-input resize-none" data-field="gallery_image_urls" placeholder="Paste extra photo links, one per line"></textarea>
      <p class="mt-1.5 text-xs text-slate-400">Use this when your photos are already hosted online. Uploaded photos and URL photos can be used together.</p>
    </div>
  </div>

  <div class="form-section">
    <h3>Description & Amenities</h3>
    <div class="mb-4">
      <label class="block text-sm font-medium text-slate-700 mb-1.5">Property description</label>
      <textarea rows="4" class="form-input resize-none" data-field="description" placeholder="Describe the property, condition, neighbourhood, and any special features..."></textarea>
    </div>
    <label class="block text-sm font-medium text-slate-700 mb-2.5">Amenities (select all that apply)</label>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      ${['Prepaid Meter','Generator','Borehole','Parking','Security Gate','Swimming Pool','CCTV','Furnished','Air Conditioner','Internet','BQ','Gym'].map(a=>`
      <button type="button" class="amenity-check" onclick="this.classList.toggle('checked')">${a}</button>`).join('')}
    </div>
  </div>

  <div class="form-section">
    <h3>Contact & Verification</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Your name</label>
        <input type="text" class="form-input" data-field="owner_name" placeholder="Full name">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Call phone number</label>
        <input type="tel" class="form-input" data-field="owner_phone" placeholder="+234 800 000 0000">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp number (optional)</label>
        <input type="tel" class="form-input" data-field="owner_whatsapp" placeholder="+234 800 000 0000">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
        <input type="email" class="form-input" data-field="owner_email" placeholder="you@example.com">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Your role</label>
        <select class="form-input"><option>Property Owner</option><option>Agent</option><option>Developer</option></select>
      </div>
    </div>
    <div class="upload-zone">
      <p class="text-slate-700 font-medium text-sm">Verification documents (optional)</p>
      <p class="text-slate-400 text-xs mt-1">Title deed, survey plan, agent ID - speeds up verification</p>
      <input id="${containerId}-document" type="file" class="hidden" data-field="verification_document" accept="application/pdf,image/jpeg,image/png,image/webp" onchange="previewDocumentName(this, '${containerId}-document-preview')">
      <button type="button" class="mt-3 btn-secondary text-xs py-2 px-4" onclick="document.getElementById('${containerId}-document').click()">Upload document</button>
      <div id="${containerId}-document-preview" class="mt-4 flex justify-center"></div>
    </div>
  </div>

  <button class="w-full btn-primary py-4 text-base" data-submit-property onclick="submitPropertyListing('${containerId}')">
    Submit Property Listing
  </button>
  <p class="text-center text-xs text-slate-400 mt-3">Your listing will be reviewed within 24 hours before going live.</p>
  `;
  updatePostFields(container, 'Rent');
}

function selectPostCat(cat, btn) {
  selectedPostCategory = cat;
  document.querySelectorAll('.post-cat-btn').forEach(b => {
    b.className = b.className.replace('border-emerald-500 bg-emerald-50 text-emerald-700', 'border-gray-200 text-slate-600');
  });
  btn.className = btn.className.replace('border-gray-200 text-slate-600', 'border-emerald-500 bg-emerald-50 text-emerald-700');
  const notice = document.getElementById('rent-notice');
  if (notice) notice.style.display = cat === 'Rent' ? 'flex' : 'none';
  updatePostFields(btn.closest('[id^="post-form-container"]'), cat);
}

function setSelectOptions(select, options) {
  if (!select) return;
  select.innerHTML = options.map(option => `<option>${option}</option>`).join('');
}

function setFieldLabel(field, text) {
  const wrapper = field?.closest('div');
  const label = wrapper?.querySelector('label');
  if (label) label.textContent = text;
}

function updatePostFields(container, category) {
  if (!container) return;

  const title = container.querySelector('[data-field="title"]');
  const state = container.querySelector('[data-field="state"]');
  const area = container.querySelector('[data-field="area"]');
  const price = container.querySelector('[data-field="price"]');
  const propertyType = container.querySelector('[data-field="property_type"]');
  const bedrooms = container.querySelector('[data-field="bedrooms"]');
  const bathrooms = container.querySelector('[data-field="bathrooms"]');
  const size = container.querySelector('[data-field="size"]');
  const description = container.querySelector('[data-field="description"]');
  const bedroomWrap = bedrooms?.closest('div');
  const bathroomWrap = bathrooms?.closest('div');

  if (category === 'Rent') {
    title.placeholder = 'e.g. Spacious 2-bedroom flat in Ajilosun';
    area.placeholder = 'e.g. Ado-Ekiti';
    price.placeholder = 'Yearly rent';
    size.placeholder = 'e.g. 75 sqm';
    description.placeholder = 'Describe the apartment, compound, utilities, neighbourhood, and rent conditions...';
    setFieldLabel(price, 'Yearly rent (₦)');
    setFieldLabel(area, 'City / Area');
    setFieldLabel(size, 'Apartment size');
    setFieldLabel(propertyType, 'Property type');
    setSelectOptions(state, ['Ekiti']);
    setSelectOptions(propertyType, ['Self-Contain', 'Mini Flat', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Bungalow', 'Duplex']);
    setSelectOptions(bedrooms, ['Studio', '1', '2', '3', '4', '5+']);
    setSelectOptions(bathrooms, ['1', '2', '3', '4+']);
    if (bedroomWrap) bedroomWrap.style.display = '';
    if (bathroomWrap) bathroomWrap.style.display = '';
  } else if (category === 'Buy') {
    title.placeholder = 'e.g. 4-bedroom duplex in Lekki';
    area.placeholder = 'e.g. Lekki Phase 1';
    price.placeholder = 'Sale price';
    size.placeholder = 'e.g. 280 sqm';
    description.placeholder = 'Describe the house, finishing, title documents, estate, access roads, and ownership status...';
    setFieldLabel(price, 'Sale price (₦)');
    setFieldLabel(area, 'City / Area');
    setFieldLabel(size, 'Building size');
    setFieldLabel(propertyType, 'House type');
    setSelectOptions(state, ['Lagos', 'Abuja', 'Oyo', 'Rivers', 'Ekiti']);
    setSelectOptions(propertyType, ['Apartment', 'Bungalow', 'Duplex', 'Terrace', 'Detached House', 'Semi-detached House', 'Commercial Building']);
    setSelectOptions(bedrooms, ['1', '2', '3', '4', '5+']);
    setSelectOptions(bathrooms, ['1', '2', '3', '4', '5+']);
    if (bedroomWrap) bedroomWrap.style.display = '';
    if (bathroomWrap) bathroomWrap.style.display = '';
  } else {
    title.placeholder = 'e.g. Residential plot in Ado-Ekiti';
    area.placeholder = 'e.g. Ibeju-Lekki';
    price.placeholder = 'Land price';
    size.placeholder = 'e.g. 600 sqm, 1 plot, 2 hectares';
    description.placeholder = 'Describe the land size, documents, road access, topography, estate status, and nearby landmarks...';
    setFieldLabel(price, 'Land price (₦)');
    setFieldLabel(area, 'Location / Community');
    setFieldLabel(size, 'Plot size');
    setFieldLabel(propertyType, 'Land type');
    setSelectOptions(state, ['Ekiti', 'Lagos', 'Abuja', 'Oyo', 'Rivers', 'Ogun']);
    setSelectOptions(propertyType, ['Residential Land', 'Commercial Land', 'Estate Plot', 'Farmland', 'Industrial Land', 'Mixed-use Land']);
    if (bedroomWrap) bedroomWrap.style.display = 'none';
    if (bathroomWrap) bathroomWrap.style.display = 'none';
    if (bedrooms) bedrooms.value = '';
    if (bathrooms) bathrooms.value = '';
  }
}

// ── Auth tabs ──────────────────────────────────────────────────────────────

function setAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('auth-tab-' + tab).classList.add('active');
  document.getElementById('auth-form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('auth-form-register').classList.toggle('hidden', tab !== 'register');
}

// ── Mobile menu ────────────────────────────────────────────────────────────

function toggleMenu() {
  const m = document.getElementById('mobile-menu');
  if (!m) return;
  setMobileMenuOpen(m.classList.contains('hidden'));
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function setMobileMenuOpen(isOpen) {
  const menu = document.getElementById('mobile-menu');
  const button = document.getElementById('menu-toggle');
  const openIcon = document.querySelector('[data-menu-open-icon]');
  const closeIcon = document.querySelector('[data-menu-close-icon]');
  if (!menu) return;

  menu.classList.toggle('hidden', !isOpen);
  document.body.classList.toggle('mobile-menu-open', isOpen);
  if (button) button.setAttribute('aria-expanded', String(isOpen));
  if (openIcon) openIcon.classList.toggle('hidden', isOpen);
  if (closeIcon) closeIcon.classList.toggle('hidden', !isOpen);
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href="#"][onclick]');
    if (anchor) event.preventDefault();
  }, true);
  document.addEventListener('click', handlePropertyCardClick);
  document.addEventListener('keydown', handlePropertyCardKeyboard);
  updateSavedBadges();
  loadLiveListings().finally(routeFromHash);
  loadAuthStatus();
  window.addEventListener('hashchange', routeFromHash);

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('shadow-sm');
    } else {
      navbar.classList.remove('shadow-sm');
    }
  });
});


/* ============================================================
   ADMIN PANEL
   ============================================================ */

// ── Admin mock data ────────────────────────────────────────────────────────

