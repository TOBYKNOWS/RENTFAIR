/* ============================================
   RentFair Homes — frontend module
   ============================================ */

// Admin dashboard interactions and rendering.

let ADMIN_USERS = [
  { id:'u1', name:'Tunde Oladele',    email:'tunde@gmail.com',      role:'Landlord',  status:'active',  joined:'12 Jan 2025', listings:4,  reports:0 },
  { id:'u2', name:'Biodun Fashola',   email:'biodun@agent.ng',      role:'Agent',     status:'active',  joined:'3 Feb 2025',  listings:12, reports:0 },
  { id:'u3', name:'Mrs. Adeyemi',     email:'adeyemi@gmail.com',    role:'Landlord',  status:'pending', joined:'20 Apr 2025', listings:2,  reports:1 },
  { id:'u4', name:'Kayode Ojo',       email:'kayode@mail.com',      role:'Landlord',  status:'active',  joined:'8 Mar 2025',  listings:3,  reports:0 },
  { id:'u5', name:'Chukwuemeka Obi',  email:'emeka@premiumng.com',  role:'Agent',     status:'active',  joined:'1 Dec 2024',  listings:26, reports:0 },
  { id:'u6', name:'Suleiman Bello',   email:'suleiman@abuja.ng',    role:'Agent',     status:'active',  joined:'15 Nov 2024', listings:15, reports:0 },
  { id:'u7', name:'Fake Agent',       email:'scam123@tempmail.com', role:'Agent',     status:'banned',  joined:'2 May 2025',  listings:0,  reports:3 },
  { id:'u8', name:'Ngozi Okoye',      email:'ngozi@phestate.ng',    role:'Agent',     status:'active',  joined:'19 Jan 2025', listings:19, reports:0 },
];

let ADMIN_LISTINGS_QUEUE = [
  { id:'q1', title:'Self-Contain in Fajuyi', owner:'Taiwo Adeyemi',    type:'Rent', price:'₦160,000/yr',  submitted:'Today, 9:14am',   img:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=80&q=60', status:'pending' },
  { id:'q2', title:'Plot in Ikere Estate',   owner:'Remi Adeyinka',     type:'Land', price:'₦4,200,000',   submitted:'Today, 8:02am',   img:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=80&q=60', status:'pending' },
  { id:'q3', title:'3-Bed House in Ibadan',  owner:'Toyin Adesanya',    type:'Buy',  price:'₦30,000,000',  submitted:'Yesterday',       img:'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=80&q=60', status:'pending' },
  { id:'q4', title:'Mini Flat in Ado-Ekiti', owner:'Unknown Account',   type:'Rent', price:'₦220,000/yr',  submitted:'Yesterday',       img:'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=80&q=60', status:'flagged' },
];

let ADMIN_ALL_LISTINGS = [
  ...ALL_LISTINGS.map(l => ({ ...l, status: l.verified ? 'active' : 'pending', owner: l.agent?.name || '-', submittedDate: 'Jan-May 2025' }))
];

let ADMIN_REPORTS = [
  { id:'rep1', listing:'Mini Flat in Odo-Ado',       reporter:'Funmi Ade',      reason:'Images do not match the actual property',    date:'Today, 11:30am', severity:'medium' },
  { id:'rep2', listing:'Self-Contain in Fajuyi',     reporter:'Bello Usman',    reason:'Owner is asking for payment before viewing',  date:'Yesterday',      severity:'high' },
  { id:'rep3', listing:'Fake Agent Account (u7)',    reporter:'Ngozi Okoye',    reason:'Duplicate agent profile and suspicious price', date:'2 days ago',     severity:'high' },
];

let ADMIN_CONTACT_MESSAGES = [];

let ADMIN_SETTINGS = {
  allowNewUserRegistrations: true,
  enableListingSubmissions: true,
  requireEmailVerification: false,
  maintenanceMode: false,
  autoApproveVerifiedOwners: false,
  requireDocumentUpload: true,
  enableFairPriceIndicator: true,
  showViewCountsPublicly: true,
  rentalCoverage: 'ekiti',
  buyLandCoverage: 'nationwide',
  adminName: 'Super Admin',
  adminEmail: 'admin@rentfairhomes.ng'
};

let ADMIN_VERIFY_QUEUE = [
  { id:'v1', type:'listing', name:'Self-Contain in Fajuyi',    owner:'Taiwo Adeyemi',   doc:'Survey Plan uploaded',       img:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=80&q=60' },
  { id:'v2', type:'listing', name:'Plot in Ikere Estate',      owner:'Remi Adeyinka',   doc:'C of O uploaded',            img:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=80&q=60' },
  { id:'v3', type:'user',    name:'Mrs. Adeyemi',              owner:'Landlord',        doc:'NIN & utility bill uploaded', img:null },
  { id:'v4', type:'user',    name:'New Agent: Dele Fashola',   owner:'Agent',           doc:'REAN certificate uploaded',   img:null },
  { id:'v5', type:'listing', name:'3-Bed House in Ibadan',     owner:'Toyin Adesanya',  doc:'Deed of Assignment uploaded', img:'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=80&q=60' },
  { id:'v6', type:'listing', name:'Mini Flat in Ado-Ekiti',    owner:'Unknown Account', doc:'No documents - needs review', img:'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=80&q=60' },
];

let adminTab = 'overview';
let adminListingFilter = 'all';
let adminListingSearch = '';
let adminUserFilter = 'all';
let adminStats = {
  totalListings: ADMIN_ALL_LISTINGS.length,
  activeListings: ADMIN_ALL_LISTINGS.filter(l => l.status === 'active').length,
  pendingListings: ADMIN_LISTINGS_QUEUE.filter(l => l.status === 'pending').length,
  registeredUsers: ADMIN_USERS.length,
  openEnquiries: ADMIN_REPORTS.length,
  verifiedListings: ADMIN_ALL_LISTINGS.filter(l => l.verified).length,
  listingBreakdown: {
    rent: typeof RENTALS !== 'undefined' ? RENTALS.length : 0,
    buy: typeof HOMES_FOR_SALE !== 'undefined' ? HOMES_FOR_SALE.length : 0,
    land: typeof LAND_LISTINGS !== 'undefined' ? LAND_LISTINGS.length : 0
  }
};

async function loadAdminDashboardData() {
  const response = await fetch('/api/admin/dashboard/', { credentials: 'same-origin' });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Please log in to Django admin first.');
    }
    throw new Error('Could not load admin dashboard.');
  }

  const data = await response.json();
  adminStats = data.stats || adminStats;
  ADMIN_USERS = data.users || [];
  ADMIN_LISTINGS_QUEUE = data.listingQueue || [];
  ADMIN_ALL_LISTINGS = data.listings || [];
  ADMIN_REPORTS = data.reports || [];
  ADMIN_CONTACT_MESSAGES = data.contactMessages || [];
  ADMIN_SETTINGS = data.settings || ADMIN_SETTINGS;
  ADMIN_VERIFY_QUEUE = (data.verificationQueue || []).map(item => ({
    id: item.id,
    type: 'listing',
    name: item.title,
    owner: item.owner,
    doc: item.documentName || (item.verificationStatus === 'pending' ? 'Pending review' : 'Awaiting verification'),
    documentUrl: item.documentUrl || '',
    img: item.img
  }));
  updateAdminSidebarBadges();
}

function setAdminBadge(name, value) {
  document.querySelectorAll(`[data-admin-badge="${name}"]`).forEach(badge => {
    const count = Number(value) || 0;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  });
}

function updateAdminSidebarBadges() {
  const pendingListings = ADMIN_LISTINGS_QUEUE.length || adminStats.pendingListings || 0;
  const openMessages = ADMIN_CONTACT_MESSAGES.filter(message => message.status === 'new').length;
  const openReports = ADMIN_REPORTS.filter(report => report.status === 'open').length;
  setAdminBadge('listings', pendingListings);
  setAdminBadge('messages', openMessages + openReports);
  setAdminBadge('verification', ADMIN_VERIFY_QUEUE.length);
}

// ── Admin routing ──────────────────────────────────────────────────────────

function setAdminTab(tab) {
  adminTab = tab;

  // Update sidebar
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[onclick="setAdminTab('${tab}')"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update mobile nav
  document.querySelectorAll('.admin-mobile-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  // Render tab
  const main = document.getElementById('admin-main');
  if (!main) return;

  if (tab === 'overview')      renderAdminOverview(main);
  else if (tab === 'listings') renderAdminListings(main);
  else if (tab === 'users')    renderAdminUsers(main);
  else if (tab === 'reports')  renderAdminReports(main);
  else if (tab === 'verification') renderAdminVerification(main);
  else if (tab === 'analytics')    renderAdminAnalytics(main);
  else if (tab === 'settings')     renderAdminSettings(main);
}

// ── Admin page init ────────────────────────────────────────────────────────

async function initAdmin() {
  const main = document.getElementById('admin-main');
  if (main) {
    main.innerHTML = `
    <div class="admin-card p-6">
      <p class="font-semibold text-slate-900">Loading admin dashboard...</p>
      <p class="text-sm text-slate-500 mt-1">Fetching live data from Django.</p>
    </div>`;
  }

  try {
    await loadAdminDashboardData();
    setAdminTab('overview');
  } catch (error) {
    if (main) {
      main.innerHTML = `
      <div class="admin-card p-6">
        <p class="font-semibold text-red-600">Admin dashboard could not load.</p>
        <p class="text-sm text-slate-500 mt-1">${error.message}</p>
        <a href="/admin/" class="inline-flex mt-4 btn-primary py-2.5 px-4 text-sm">Open Django admin login</a>
      </div>`;
    }
  }
}

// ── Overview tab ───────────────────────────────────────────────────────────

function renderAdminOverview(main) {
  const totalListings = adminStats.totalListings || 0;
  const totalUsers = adminStats.registeredUsers || 0;
  const pendingQueue = adminStats.pendingListings || 0;
  const rentCount = adminStats.listingBreakdown?.rent || 0;
  const buyCount = adminStats.listingBreakdown?.buy || 0;
  const landCount = adminStats.listingBreakdown?.land || 0;
  const pct = count => totalListings ? Math.max(6, Math.round((count / totalListings) * 100)) : 0;

  const barHeights = [55,40,65,50,75,60,90,70,85,95,80,100];

  main.innerHTML = `
  <!-- Mobile nav -->
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="mb-6">
    <h1 class="font-display font-700 text-xl text-slate-900">Platform Overview</h1>
    <p class="text-slate-500 text-sm mt-0.5">Welcome back, Super Admin. Here's what's happening today.</p>
  </div>

  <!-- KPI stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="admin-stat">
      <div class="flex items-start justify-between mb-3">
        <div class="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4.5V9c0 3.5 2.5 5.5 6 6.5 3.5-1 6-3 6-6.5V4.5L8 1z" stroke="#10B981" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </div>
        <span class="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">↑ 12%</span>
      </div>
      <p class="font-display font-700 text-2xl text-slate-900">${totalListings}</p>
      <p class="text-xs text-slate-500 mt-0.5">Total listings</p>
    </div>
    <div class="admin-stat">
      <div class="flex items-start justify-between mb-3">
        <div class="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="#2563EB" stroke-width="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#2563EB" stroke-width="1.3" stroke-linecap="round"/></svg>
        </div>
        <span class="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">↑ 8%</span>
      </div>
      <p class="font-display font-700 text-2xl text-slate-900">${totalUsers}</p>
      <p class="text-xs text-slate-500 mt-0.5">Registered users</p>
    </div>
    <div class="admin-stat">
      <div class="flex items-start justify-between mb-3">
        <div class="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v4M8 9v.5" stroke="#D97706" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="6" stroke="#D97706" stroke-width="1.3"/></svg>
        </div>
        <span class="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">${pendingQueue} pending</span>
      </div>
      <p class="font-display font-700 text-2xl text-slate-900">${pendingQueue}</p>
      <p class="text-xs text-slate-500 mt-0.5">In review queue</p>
    </div>
    <div class="admin-stat">
      <div class="flex items-start justify-between mb-3">
        <div class="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l5.5 10H2.5L8 3z" stroke="#DC2626" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="#DC2626" stroke-width="1.3" stroke-linecap="round"/></svg>
        </div>
        <span class="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">${adminStats.openEnquiries || 0} new</span>
      </div>
      <p class="font-display font-700 text-2xl text-slate-900">${adminStats.openEnquiries || 0}</p>
      <p class="text-xs text-slate-500 mt-0.5">New enquiries</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
    <!-- Listings chart -->
    <div class="admin-card lg:col-span-2">
      <div class="admin-card-header">
        <h3>New listings (last 12 months)</h3>
        <span class="text-xs text-slate-400">2,400+ total</span>
      </div>
      <div class="p-5">
        <div class="mini-bar-wrap h-24">
          ${barHeights.map((h,i)=>`<div class="mini-bar ${i===11?'accent':''}" style="height:${h}%" title="Month ${i+1}"></div>`).join('')}
        </div>
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>Jun 24</span><span>Sep 24</span><span>Dec 24</span><span>Mar 25</span><span>May 25</span>
        </div>
      </div>
    </div>

    <!-- Category breakdown -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Listing breakdown</h3></div>
      <div class="p-5 space-y-4">
        ${[
          { label:'Rentals (Ekiti)', count: rentCount, pct:pct(rentCount), color:'bg-emerald-500' },
          { label:'Homes for Sale',  count: buyCount, pct:pct(buyCount), color:'bg-blue-500' },
          { label:'Land',            count: landCount, pct:pct(landCount), color:'bg-amber-400' },
        ].map(c=>`
        <div>
          <div class="flex justify-between text-sm mb-1.5">
            <span class="text-slate-600 font-medium">${c.label}</span>
            <span class="text-slate-900 font-semibold">${c.count}</span>
          </div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="${c.color} h-full rounded-full" style="width:${c.pct}%"></div>
          </div>
        </div>`).join('')}
        <div class="pt-2 border-t border-gray-50 text-xs text-slate-400">Verified: <strong class="text-emerald-600">${adminStats.verifiedListings || 0}/${totalListings}</strong></div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <!-- Pending queue -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Listings awaiting review</h3>
        <button onclick="setAdminTab('listings')" class="text-xs text-emerald-600 hover:text-emerald-700 font-medium">View all →</button>
      </div>
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead><tr><th>Property</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${ADMIN_LISTINGS_QUEUE.map(l=>`
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <img src="${l.img}" alt="">
                  <div>
                    <p class="font-medium text-slate-800 text-xs leading-tight">${l.title}</p>
                    <p class="text-slate-400 text-xs">${l.owner}</p>
                  </div>
                </div>
              </td>
              <td><span class="text-xs px-2 py-0.5 bg-slate-100 rounded-full font-medium">${l.type}</span></td>
              <td><span class="status-badge ${l.status==='flagged'?'status-flagged':'status-pending'}">${l.status==='flagged'?'Flagged':'Pending'}</span></td>
              <td>
                <div class="flex gap-1.5">
                  <button class="tbl-btn tbl-btn-approve" onclick="adminApprove('${l.id}')">Approve</button>
                  <button class="tbl-btn tbl-btn-reject"  onclick="adminReject('${l.id}')">Reject</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Recent activity</h3></div>
      <div class="p-4">
        ${[
          { dot:'bg-emerald-500', text:'Listing <strong>2-Bed Flat in Ajilosun</strong> verified and published', time:'2 min ago' },
          { dot:'bg-blue-500',    text:'New user <strong>Ngozi Okoye</strong> registered as Agent', time:'14 min ago' },
          { dot:'bg-amber-400',   text:'Report filed against <strong>Mini Flat in Odo-Ado</strong>', time:'38 min ago' },
          { dot:'bg-red-500',     text:'Account <strong>scam123@tempmail.com</strong> suspended', time:'1 hr ago' },
          { dot:'bg-emerald-500', text:'Land listing <strong>Estate Plot in Lagos</strong> verified', time:'2 hr ago' },
          { dot:'bg-blue-500',    text:'<strong>Tunde Oladele</strong> updated contact info', time:'3 hr ago' },
          { dot:'bg-amber-400',   text:'New listing submitted: <strong>Plot in Ikere Estate</strong>', time:'4 hr ago' },
          { dot:'bg-slate-400',   text:'System: Scheduled verification sweep complete', time:'5 hr ago' },
        ].map(a=>`
        <div class="activity-item">
          <div class="activity-dot ${a.dot}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-slate-700 leading-snug">${a.text}</p>
            <p class="text-slate-400 text-xs mt-0.5">${a.time}</p>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── Listings tab ───────────────────────────────────────────────────────────

function adminListingStatusLabel(status) {
  const labels = {
    active: 'Active',
    pending: 'Pending',
    flagged: 'Flagged',
    sold: 'Sold',
    rented: 'Rented',
    rejected: 'Rejected'
  };
  return labels[status] || 'Rejected';
}

function adminListingStatusClass(status) {
  if (status === 'active') return 'status-active';
  if (status === 'pending') return 'status-pending';
  if (status === 'flagged') return 'status-flagged';
  if (status === 'sold' || status === 'rented') return 'status-banned';
  return 'status-rejected';
}

function renderAdminListings(main) {
  const allQ = ADMIN_ALL_LISTINGS;

  const searchTerm = adminListingSearch.trim().toLowerCase();
  const statusFiltered = adminListingFilter === 'all' ? allQ : allQ.filter(l => l.status === adminListingFilter);
  const filtered = searchTerm
    ? statusFiltered.filter(l => [
        l.title,
        l.owner,
        l.type,
        l.rawType,
        l.price,
        l.area,
        l.status,
        l.submitted
      ].some(value => String(value || '').toLowerCase().includes(searchTerm)))
    : statusFiltered;

  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="font-display font-700 text-xl text-slate-900">Listings Management</h1>
      <p class="text-slate-500 text-sm mt-0.5">Review, approve, reject, and manage all property listings.</p>
    </div>
    <input type="search" value="${adminListingSearch}" placeholder="Search listings..." class="form-input w-56 py-2 text-sm" oninput="adminSearchListings(this.value)">
  </div>

  <!-- Filter tabs -->
  <div class="flex gap-2 mb-5 flex-wrap">
    ${['all','pending','active','flagged','sold','rented','rejected'].map(f=>`
    <button onclick="adminListingFilter='${f}';renderAdminListings(document.getElementById('admin-main'))"
      class="filter-chip ${adminListingFilter===f?'active':''}">${f.charAt(0).toUpperCase()+f.slice(1)}
      ${f==='pending'?`<span class="ml-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full inline-flex items-center justify-center">${ADMIN_ALL_LISTINGS.filter(l=>l.status==='pending').length}</span>`:''}
      ${f==='flagged'?`<span class="ml-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full inline-flex items-center justify-center">${ADMIN_ALL_LISTINGS.filter(l=>l.status==='flagged').length}</span>`:''}
      ${f==='sold'?`<span class="ml-1 w-4 h-4 bg-slate-500 text-white text-xs rounded-full inline-flex items-center justify-center">${ADMIN_ALL_LISTINGS.filter(l=>l.status==='sold').length}</span>`:''}
      ${f==='rented'?`<span class="ml-1 w-4 h-4 bg-slate-500 text-white text-xs rounded-full inline-flex items-center justify-center">${ADMIN_ALL_LISTINGS.filter(l=>l.status==='rented').length}</span>`:''}
    </button>`).join('')}
  </div>

  <div class="admin-card">
    <div class="overflow-x-auto">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Price</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(l=>`
          <tr>
            <td>
              <div class="flex items-center gap-2.5">
                <img src="${l.img}" alt="" style="width:48px;height:38px;object-fit:cover;border-radius:7px">
                <p class="font-medium text-slate-800 max-w-xs truncate">${l.title}</p>
              </div>
            </td>
            <td><span class="text-xs px-2 py-0.5 bg-slate-100 rounded-full font-medium">${l.type}</span></td>
            <td class="font-semibold text-emerald-600">${l.price}</td>
            <td class="text-slate-500">${l.owner}</td>
            <td>
              <span class="status-badge ${adminListingStatusClass(l.status)}">
                ${adminListingStatusLabel(l.status)}
              </span>
            </td>
            <td>
              <div class="flex gap-1.5 flex-wrap">
                <button class="tbl-btn tbl-btn-view" onclick="adminViewListing('${l.id}')">View</button>
                ${l.status==='flagged'  ? `<button class="tbl-btn tbl-btn-approve" onclick="adminClearFlag('${l.id}')">Clear flag</button>`:''}
                ${l.status==='pending' || l.status==='rejected' ? `<button class="tbl-btn tbl-btn-approve" onclick="adminApprove('${l.id}')">Approve</button>`:''}
                ${l.status==='sold' || l.status==='rented' ? `<button class="tbl-btn tbl-btn-approve" onclick="adminRestoreActive('${l.id}', '${l.status}')">Restore active</button>`:''}
                ${l.status==='active' && l.rawType==='rent' ? `<button class="tbl-btn tbl-btn-ban" onclick="adminMarkUnavailable('${l.id}', '${l.rawType}')">Mark rented</button>`:''}
                ${l.status==='active' && l.rawType!=='rent' ? `<button class="tbl-btn tbl-btn-ban" onclick="adminMarkUnavailable('${l.id}', '${l.rawType}')">Mark sold</button>`:''}
                ${l.status!=='rejected' ? `<button class="tbl-btn tbl-btn-reject"  onclick="adminReject('${l.id}')">Reject</button>`:''}
                <button class="tbl-btn tbl-btn-delete" onclick="adminDelete('${l.id}','listing')">Delete</button>
              </div>
            </td>
          </tr>`).join('') : `
          <tr>
            <td colspan="6">
              <div class="text-center py-10">
                <p class="font-semibold text-slate-700">No listings found</p>
                <p class="text-sm text-slate-400 mt-1">Try another search term or status filter.</p>
              </div>
            </td>
          </tr>`}
        </tbody>
      </table>
    </div>
    <div class="px-5 py-3 border-t border-gray-50 text-xs text-slate-400 flex justify-between items-center">
      <span>Showing ${filtered.length} of ${statusFiltered.length} listings</span>
      <button class="text-slate-500 hover:text-emerald-600 font-semibold" onclick="adminClearListingSearch()">Clear search</button>
    </div>
  </div>`;
}

// ── Users tab ──────────────────────────────────────────────────────────────

function renderAdminUsers(main) {
  const filtered = adminUserFilter === 'all' ? ADMIN_USERS : ADMIN_USERS.filter(u => u.status === adminUserFilter);

  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="font-display font-700 text-xl text-slate-900">User Management</h1>
      <p class="text-slate-500 text-sm mt-0.5">Manage landlords, agents, and buyers on the platform.</p>
    </div>
    <input type="text" placeholder="Search users..." class="form-input w-48 py-2 text-sm" oninput="adminSearchUsers(this.value)">
  </div>

  <!-- Filter tabs -->
  <div class="flex gap-2 mb-5 flex-wrap">
    ${['all','active','pending','banned'].map(f=>`
    <button onclick="adminUserFilter='${f}';renderAdminUsers(document.getElementById('admin-main'))"
      class="filter-chip ${adminUserFilter===f?'active':''}">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`).join('')}
  </div>

  <div class="admin-card">
    <div class="overflow-x-auto">
      <table class="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Listings</th>
            <th>Reports</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Verification</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(u=>`
          <tr>
            <td>
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">${u.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                <div>
                  <p class="font-medium text-slate-800 text-sm">${u.name}</p>
                  <p class="text-slate-400 text-xs">${u.email}</p>
                </div>
              </div>
            </td>
            <td><span class="text-xs px-2 py-0.5 rounded-full font-medium ${u.role==='Agent'?'bg-blue-50 text-blue-600':'bg-slate-100 text-slate-600'}">${u.role}</span></td>
            <td class="font-semibold text-slate-800">${u.listings}</td>
            <td class="${u.reports>0?'text-red-500 font-semibold':'text-slate-400'}">${u.reports}</td>
            <td class="text-slate-500">${u.joined}</td>
            <td>
              <span class="status-badge ${
                u.status==='active'  ? 'status-active'  :
                u.status==='pending' ? 'status-pending' : 'status-banned'
              }">
                ${u.status==='active'?'Active':u.status==='pending'?'Pending':'Banned'}
              </span>
            </td>
            <td>
              <span class="status-badge ${
                u.verificationStatus === 'verified' ? 'status-active' :
                u.verificationStatus === 'pending' ? 'status-pending' : 'status-banned'
              }">
                ${u.verificationLabel || u.verificationStatus || 'Unverified'}
              </span>
            </td>
            <td>
              <div class="flex gap-1.5 flex-wrap">
                <button class="tbl-btn tbl-btn-view" onclick="adminViewUser('${u.id}')">View</button>
                ${u.verificationStatus !== 'verified'
                  ? `<button class="tbl-btn tbl-btn-approve" onclick="adminProfileAction('${u.id}', 'verify_profile')">Verify</button>`
                  : `<button class="tbl-btn tbl-btn-ban" onclick="adminProfileAction('${u.id}', 'unverify_profile')">Unverify</button>`}
                ${u.verificationStatus !== 'pending'
                  ? `<button class="tbl-btn tbl-btn-view" onclick="adminProfileAction('${u.id}', 'mark_profile_pending')">Review</button>`
                  : ''}
                ${u.status!=='banned'
                  ? `<button class="tbl-btn tbl-btn-ban" onclick="adminBanUser('${u.id}')">Suspend</button>`
                  : `<button class="tbl-btn tbl-btn-approve" onclick="adminReinstateUser('${u.id}')">Reinstate</button>`}
                <button class="tbl-btn tbl-btn-delete" onclick="adminDelete('${u.id}','user')">Remove</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="px-5 py-3 border-t border-gray-50 text-xs text-slate-400 flex justify-between">
      <span>Showing ${filtered.length} users</span>
      <span>Total: ${ADMIN_USERS.length}</span>
    </div>
  </div>`;
}

// ── Reports tab ────────────────────────────────────────────────────────────

function renderAdminReports(main) {
  const openMessages = ADMIN_CONTACT_MESSAGES.filter(message => message.status === 'new');
  const closedMessages = ADMIN_CONTACT_MESSAGES.filter(message => message.status === 'closed');
  const reportFieldId = (report, field) => `admin-report-${report.id}-${field}`;

  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="mb-6">
    <h1 class="font-display font-700 text-xl text-slate-900">Messages & Reports</h1>
    <p class="text-slate-500 text-sm mt-0.5">Read contact messages and review reports filed by platform users.</p>
  </div>

  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="admin-stat text-center">
      <p class="font-display font-700 text-2xl text-emerald-600">${openMessages.length}</p>
      <p class="text-xs text-slate-500 mt-0.5">New messages</p>
    </div>
    <div class="admin-stat text-center">
      <p class="font-display font-700 text-2xl text-red-500">${ADMIN_REPORTS.filter(r=>r.severity==='high').length}</p>
      <p class="text-xs text-slate-500 mt-0.5">High reports</p>
    </div>
    <div class="admin-stat text-center">
      <p class="font-display font-700 text-2xl text-slate-700">${ADMIN_CONTACT_MESSAGES.length + ADMIN_REPORTS.length}</p>
      <p class="text-xs text-slate-500 mt-0.5">Total items</p>
    </div>
  </div>

  <div class="admin-card mb-6">
    <div class="admin-card-header">
      <h3>Contact messages</h3>
      <span class="text-xs text-slate-400">${ADMIN_CONTACT_MESSAGES.length} total</span>
    </div>
    <div class="divide-y divide-slate-100">
      ${ADMIN_CONTACT_MESSAGES.length ? ADMIN_CONTACT_MESSAGES.map(message => `
      <div class="p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="status-badge ${
                message.status === 'new' ? 'status-pending' :
                message.status === 'closed' ? 'status-banned' : 'status-active'
              } text-xs">${message.status === 'new' ? 'New' : message.status === 'closed' ? 'Closed' : 'Read'}</span>
              <span class="text-xs text-slate-400">${message.created}</span>
            </div>
            <p class="font-semibold text-slate-900 text-sm">${message.subject}</p>
            <p class="text-slate-500 text-sm mt-1">${message.message}</p>
            <p class="text-slate-400 text-xs mt-2">${message.name} · ${message.email}</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${message.status === 'new' ? `<button class="tbl-btn tbl-btn-approve" onclick="adminContactMessageAction('${message.id}', 'read')">Mark read</button>` : ''}
            ${message.status !== 'closed' ? `<button class="tbl-btn tbl-btn-reject" onclick="adminContactMessageAction('${message.id}', 'close')">Close</button>` : ''}
            <button class="tbl-btn tbl-btn-delete" onclick="adminContactMessageAction('${message.id}', 'delete')">Delete</button>
          </div>
        </div>
      </div>`).join('') : `
      <div class="p-8 text-center">
        <p class="font-semibold text-slate-700">No contact messages yet</p>
        <p class="text-sm text-slate-400 mt-1">Messages submitted from the Contact page will appear here.</p>
      </div>`}
    </div>
  </div>

  <div class="space-y-4">
    <h2 class="font-display font-700 text-lg text-slate-900">Listing reports</h2>
    ${ADMIN_REPORTS.length ? ADMIN_REPORTS.map(r=>`
    <div class="report-card" style="border-left-color:${r.severity==='high'?'#EF4444':'#F97316'}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="status-badge ${r.severity==='high'?'status-rejected':'status-flagged'} text-xs">
              ${r.severity==='high'?'High':'Medium'}
            </span>
            <span class="text-xs text-slate-400">${r.date}</span>
            <span class="status-badge ${r.status === 'open' ? 'status-pending' : r.status === 'actioned' ? 'status-rejected' : 'status-active'} text-xs">
              ${r.status === 'open' ? 'Open' : r.status === 'actioned' ? 'Actioned' : 'Dismissed'}
            </span>
          </div>
          <p class="font-semibold text-slate-900 text-sm">${r.listing}</p>
          <p class="text-slate-500 text-sm mt-1"><span class="font-medium text-slate-700">Reason:</span> ${r.reason}</p>
          <p class="text-slate-400 text-xs mt-1">Reported by: ${r.reporter}</p>
          <div class="report-owner-risk ${Number(r.ownerOpenReportTotal || 0) > 1 ? 'high' : ''}">
            <span>Owner report history</span>
            <strong>${Number(r.ownerOpenReportTotal || 0)} open · ${Number(r.ownerReportTotal || 0)} total</strong>
            <small>${r.owner || 'Unknown owner'}</small>
          </div>
          ${r.status === 'open' ? `
          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs font-semibold text-slate-700 mb-2">Investigation checklist</p>
            <div class="grid sm:grid-cols-2 gap-2 mb-3">
              <label class="flex items-center gap-2 text-xs text-slate-600">
                <input id="${reportFieldId(r, 'evidence')}" type="checkbox" class="accent-emerald-600" ${r.evidenceChecked ? 'checked' : ''}>
                Evidence checked
              </label>
              <label class="flex items-center gap-2 text-xs text-slate-600">
                <input id="${reportFieldId(r, 'owner')}" type="checkbox" class="accent-emerald-600" ${r.ownerContacted ? 'checked' : ''}>
                Owner contacted
              </label>
            </div>
            <textarea id="${reportFieldId(r, 'notes')}" class="form-input text-sm min-h-[76px]" placeholder="Write what you checked before dismissing or taking down this listing...">${r.investigationNotes || ''}</textarea>
          </div>` : `
          <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs font-semibold text-slate-700">Investigation note</p>
            <p class="text-sm text-slate-500 mt-1">${r.investigationNotes || 'No note saved.'}</p>
            <p class="text-xs text-slate-400 mt-2">
              ${r.evidenceChecked ? 'Evidence checked' : 'Evidence not marked checked'} ·
              ${r.ownerContacted ? 'Owner contacted' : 'Owner not marked contacted'}
              ${r.resolvedBy ? ` · Resolved by ${r.resolvedBy}` : ''}
              ${r.resolvedAt ? ` · ${r.resolvedAt}` : ''}
            </p>
          </div>`}
        </div>
        <div class="flex gap-2 flex-wrap">
          <button class="tbl-btn tbl-btn-view" onclick="adminViewListing('${r.propertyId}')">View listing</button>
          ${r.documentUrl ? `<button class="tbl-btn tbl-btn-view" onclick="adminOpenReportDocument('${r.id}')">Open document</button>` : ''}
          ${r.status === 'open' ? `<button class="tbl-btn tbl-btn-reject" onclick="adminReportAction('${r.id}', 'take_down')">Take down</button>` : ''}
          ${r.status === 'open' ? `<button class="tbl-btn tbl-btn-approve" onclick="adminReportAction('${r.id}', 'dismiss')">Dismiss</button>` : ''}
          <button class="tbl-btn tbl-btn-delete" onclick="adminReportAction('${r.id}', 'delete')">Delete</button>
        </div>
      </div>
    </div>`).join('') : `
    <div class="admin-card p-8 text-center">
      <p class="font-semibold text-slate-700">No listing reports yet</p>
      <p class="text-sm text-slate-400 mt-1">Reports submitted from listing pages will appear here.</p>
    </div>`}
  </div>

  <div class="admin-card mt-6">
    <div class="admin-card-header"><h3>Resolved reports (last 30 days)</h3></div>
    <div class="p-5">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div><p class="font-display font-700 text-xl text-emerald-600">${closedMessages.length}</p><p class="text-xs text-slate-500">Messages closed</p></div>
        <div><p class="font-display font-700 text-xl text-red-500">${ADMIN_REPORTS.filter(r=>r.status === 'actioned').length}</p><p class="text-xs text-slate-500">Listings removed</p></div>
        <div><p class="font-display font-700 text-xl text-slate-700">${ADMIN_REPORTS.filter(r=>r.status === 'dismissed').length}</p><p class="text-xs text-slate-500">Reports dismissed</p></div>
      </div>
    </div>
  </div>`;
}

// ── Verification tab ───────────────────────────────────────────────────────

function renderAdminVerification(main) {
  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="font-display font-700 text-xl text-slate-900">Verification Queue</h1>
      <p class="text-slate-500 text-sm mt-0.5">Verify listings and user identities before they go live.</p>
    </div>
    <span class="status-badge status-pending">${ADMIN_VERIFY_QUEUE.length} awaiting review</span>
  </div>

  ${ADMIN_VERIFY_QUEUE.length ? `
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    ${ADMIN_VERIFY_QUEUE.map(v=>`
    <div class="verify-card">
      <div class="flex items-start gap-3 mb-3">
        ${v.img
          ? `<img src="${v.img}" alt="" style="width:48px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0">`
          : `<div class="w-12 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="#94A3B8" stroke-width="1.3"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#94A3B8" stroke-width="1.3" stroke-linecap="round"/></svg>
             </div>`}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium ${v.type==='user'?'bg-blue-50 text-blue-600':'bg-emerald-50 text-emerald-600'}">${v.type==='user'?'User':'Listing'}</span>
          </div>
          <p class="font-semibold text-slate-900 text-sm truncate">${v.name}</p>
          <p class="text-slate-500 text-xs">${v.owner}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 mb-3 bg-slate-50 rounded-lg px-3 py-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1h6l2 2v8H1V3l2-2z" stroke="#64748B" stroke-width="1"/><path d="M4 5h4M4 7h4M4 9h2" stroke="#64748B" stroke-width="1" stroke-linecap="round"/></svg>
        <p class="text-xs text-slate-500 flex-1">${v.doc}</p>
      </div>
      <div class="flex gap-2">
        <button class="tbl-btn tbl-btn-approve flex-1 justify-center" onclick="adminVerify('${v.id}')">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Verify
        </button>
        <button class="tbl-btn tbl-btn-view" onclick="adminOpenDocument('${v.id}')">Docs</button>
        <button class="tbl-btn tbl-btn-reject" onclick="adminReject('${v.id}')">Reject</button>
      </div>
    </div>`).join('')}
  </div>` : `
  <div class="admin-card p-8 text-center">
    <p class="font-semibold text-slate-700">No listings awaiting verification</p>
    <p class="text-sm text-slate-400 mt-1">New property submissions will appear here before they go live.</p>
  </div>`}`;
}

// ── Analytics tab ──────────────────────────────────────────────────────────

function renderAdminAnalytics(main) {
  const months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
  const views  = [1200,1450,1800,2100,1950,2400,2900,3100,3400,3200,3900,4200];
  const maxV   = Math.max(...views);

  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="mb-6">
    <h1 class="font-display font-700 text-xl text-slate-900">Platform Analytics</h1>
    <p class="text-slate-500 text-sm mt-0.5">Listings, traffic, and engagement insights.</p>
  </div>

  <!-- Top metrics -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${[
      { label:'Total page views',    value:'124,800', change:'↑ 18%', color:'text-emerald-600', bg:'bg-emerald-50' },
      { label:'Unique visitors',     value:'38,400',  change:'↑ 22%', color:'text-blue-600',    bg:'bg-blue-50' },
      { label:'Avg. session (min)',  value:'4:32',    change:'↑ 6%',  color:'text-amber-600',   bg:'bg-amber-50' },
      { label:'WhatsApp contacts',   value:'8,912',   change:'↑ 31%', color:'text-emerald-600', bg:'bg-emerald-50' },
    ].map(m=>`
    <div class="admin-stat">
      <p class="text-xs text-slate-400 font-medium mb-1">${m.label}</p>
      <p class="font-display font-700 text-2xl text-slate-900">${m.value}</p>
      <p class="text-xs ${m.color} font-semibold mt-1">${m.change} vs last month</p>
    </div>`).join('')}
  </div>

  <!-- Traffic chart -->
  <div class="admin-card mb-5">
    <div class="admin-card-header">
      <h3>Platform views - last 12 months</h3>
      <span class="text-xs text-emerald-600 font-semibold">+18% overall</span>
    </div>
    <div class="p-5">
      <div class="flex items-end gap-2 h-36">
        ${views.map((v,i)=>`
        <div class="flex flex-col items-center gap-1 flex-1">
          <div class="w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
               style="height:${Math.round((v/maxV)*120)}px;background:${i===11?'#10B981':'#D1FAE5'}"
               title="${months[i]}: ${v.toLocaleString()} views"></div>
          <span class="text-xs text-slate-400 hidden sm:block">${months[i]}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <!-- Top listings by views -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Top listings by views</h3></div>
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead><tr><th>Listing</th><th>Views</th><th>Saves</th><th>Contacts</th></tr></thead>
          <tbody>
            ${ALL_LISTINGS.sort((a,b)=>b.views-a.views).slice(0,6).map(l=>`
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <img src="${l.img}" alt="" style="width:36px;height:28px;object-fit:cover;border-radius:5px">
                  <p class="text-xs font-medium text-slate-800 max-w-xs truncate">${l.title}</p>
                </div>
              </td>
              <td class="font-semibold text-slate-800">${l.views.toLocaleString()}</td>
              <td class="text-slate-500">${l.saved}</td>
              <td class="text-emerald-600 font-semibold">${Math.round(l.views*0.12)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Geographic breakdown -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Traffic by location</h3></div>
      <div class="p-5 space-y-3">
        ${[
          { loc:'Ado-Ekiti, Ekiti',   pct:34, views:42350 },
          { loc:'Lagos State',         pct:28, views:34800 },
          { loc:'Abuja (FCT)',         pct:18, views:22400 },
          { loc:'Ibadan, Oyo',         pct:10, views:12450 },
          { loc:'Port Harcourt',       pct:6,  views:7480  },
          { loc:'Other',               pct:4,  views:4972  },
        ].map(l=>`
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-slate-600">${l.loc}</span>
            <span class="font-semibold text-slate-900">${l.views.toLocaleString()}</span>
          </div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-400 rounded-full" style="width:${l.pct}%"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── Settings tab ───────────────────────────────────────────────────────────

function renderAdminSettings(main) {
  const generalSettings = [
    {
      key: 'allowNewUserRegistrations',
      label: 'Allow new user registrations',
      desc: 'Disable to freeze all new sign-ups'
    },
    {
      key: 'enableListingSubmissions',
      label: 'Enable listing submissions',
      desc: 'Allow landlords and agents to post'
    },
    {
      key: 'requireEmailVerification',
      label: 'Require email verification',
      desc: 'Stored now; email verification workflow can use it later'
    },
    {
      key: 'maintenanceMode',
      label: 'Maintenance mode',
      desc: 'Blocks registrations and listing submissions'
    }
  ];
  const listingSettings = [
    {
      key: 'autoApproveVerifiedOwners',
      label: 'Auto-approve verified owners',
      desc: 'Stored now; owner verification workflow can use it later'
    },
    {
      key: 'requireDocumentUpload',
      label: 'Require document upload',
      desc: 'Sellers must upload title or verification documents'
    },
    {
      key: 'enableFairPriceIndicator',
      label: 'Enable fair price indicator',
      desc: 'Stored for pricing labels and future price rules'
    },
    {
      key: 'showViewCountsPublicly',
      label: 'Show view counts publicly',
      desc: 'Stored for future public listing view counters'
    }
  ];

  const toggleRow = setting => `
    <div class="flex items-center justify-between">
      <div>
        <p class="font-medium text-slate-800 text-sm">${setting.label}</p>
        <p class="text-xs text-slate-400">${setting.desc}</p>
      </div>
      <label class="toggle-switch ml-4 shrink-0">
        <input type="checkbox" data-setting="${setting.key}" ${ADMIN_SETTINGS[setting.key] ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
    </div>`;

  main.innerHTML = `
  <div class="lg:hidden admin-mobile-nav mb-6">
    ${['overview','listings','users','reports','verification','analytics','settings'].map(t=>`
    <button data-tab="${t}" onclick="setAdminTab('${t}')" class="${t===adminTab?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
  </div>

  <div class="mb-6">
    <h1 class="font-display font-700 text-xl text-slate-900">Platform Settings</h1>
    <p class="text-slate-500 text-sm mt-0.5">Configure how the platform operates.</p>
  </div>

  <div class="max-w-2xl space-y-4">

    <!-- General -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>General settings</h3></div>
      <div class="p-5 space-y-4">
        ${generalSettings.map(toggleRow).join('')}
      </div>
    </div>

    <!-- Listing rules -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Listing rules</h3></div>
      <div class="p-5 space-y-4">
        ${listingSettings.map(toggleRow).join('')}
      </div>
    </div>

    <!-- Geo restrictions -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Geographic restrictions</h3></div>
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Rental coverage</label>
          <select class="form-input text-sm" data-setting="rentalCoverage">
            <option value="ekiti" ${ADMIN_SETTINGS.rentalCoverage === 'ekiti' ? 'selected' : ''}>Ekiti State only</option>
            <option value="ekiti_ondo" ${ADMIN_SETTINGS.rentalCoverage === 'ekiti_ondo' ? 'selected' : ''}>Ekiti + Ondo</option>
            <option value="south_west" ${ADMIN_SETTINGS.rentalCoverage === 'south_west' ? 'selected' : ''}>All South-West states</option>
            <option value="nationwide" ${ADMIN_SETTINGS.rentalCoverage === 'nationwide' ? 'selected' : ''}>Nationwide</option>
          </select>
          <p class="text-xs text-slate-400 mt-1">Controls where rental listings can be posted</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Buy/Land coverage</label>
          <select class="form-input text-sm" data-setting="buyLandCoverage">
            <option value="nationwide" ${ADMIN_SETTINGS.buyLandCoverage === 'nationwide' ? 'selected' : ''}>Nationwide (all 36 states + FCT)</option>
            <option value="selected" ${ADMIN_SETTINGS.buyLandCoverage === 'selected' ? 'selected' : ''}>Selected states only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Admin account -->
    <div class="admin-card">
      <div class="admin-card-header"><h3>Admin account</h3></div>
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Admin name</label>
            <input type="text" value="${ADMIN_SETTINGS.adminName || ''}" class="form-input text-sm" data-setting="adminName">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value="${ADMIN_SETTINGS.adminEmail || ''}" class="form-input text-sm" data-setting="adminEmail">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
          <input type="password" placeholder="Leave blank to keep current" class="form-input text-sm" data-setting="newPassword">
        </div>
        <button class="btn-primary py-2.5 px-6 text-sm" onclick="adminSaveSettings(this)">Save changes</button>
      </div>
    </div>
  </div>`;
}

// ── Admin action handlers ──────────────────────────────────────────────────

async function adminSaveSettings(button) {
  const main = document.getElementById('admin-main');
  const field = key => main?.querySelector(`[data-setting="${key}"]`);
  const payload = {
    allowNewUserRegistrations: field('allowNewUserRegistrations')?.checked || false,
    enableListingSubmissions: field('enableListingSubmissions')?.checked || false,
    requireEmailVerification: field('requireEmailVerification')?.checked || false,
    maintenanceMode: field('maintenanceMode')?.checked || false,
    autoApproveVerifiedOwners: field('autoApproveVerifiedOwners')?.checked || false,
    requireDocumentUpload: field('requireDocumentUpload')?.checked || false,
    enableFairPriceIndicator: field('enableFairPriceIndicator')?.checked || false,
    showViewCountsPublicly: field('showViewCountsPublicly')?.checked || false,
    rentalCoverage: field('rentalCoverage')?.value || 'ekiti',
    buyLandCoverage: field('buyLandCoverage')?.value || 'nationwide',
    adminName: field('adminName')?.value?.trim() || '',
    adminEmail: field('adminEmail')?.value?.trim() || '',
    newPassword: field('newPassword')?.value || ''
  };

  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }

  try {
    const response = await fetch('/api/admin/settings/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(payload)
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Settings could not be saved.');
      return;
    }

    ADMIN_SETTINGS = result.settings || ADMIN_SETTINGS;
    if (result.user && typeof currentUser !== 'undefined') {
      currentUser = result.user;
      updateAuthLinks();
    }
    showToast(result.message || 'Settings saved.');
    renderAdminSettings(main);
  } catch (error) {
    console.warn('Settings save failed.', error);
    showToast('Settings could not be saved. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Save changes';
    }
  }
}

async function adminViewListing(id) {
  if (typeof loadLiveListings === 'function') {
    await loadLiveListings();
  }

  const listing = typeof ALL_LISTINGS !== 'undefined'
    ? ALL_LISTINGS.find(item => String(item.id) === String(id))
    : null;

  if (!listing) {
    showToast('This listing is not public yet. Publish it before viewing.');
    return;
  }

  showPropertyPage(String(id));
}

async function adminPropertyAction(id, action, successMessage, payload = null) {
  const headers = {
    'X-CSRFToken': getCookie('csrftoken')
  };
  const requestOptions = {
    method: 'POST',
    credentials: 'same-origin',
    headers
  };

  if (payload) {
    headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(`/api/admin/properties/${id}/${action}/`, {
      ...requestOptions
    });
    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Admin action failed.');
      return;
    }

    showToast(result.message || successMessage);
    await loadAdminDashboardData();
    setAdminTab(adminTab);
  } catch (error) {
    console.warn('Admin action failed.', error);
    showToast('Admin action failed. Please try again.');
  }
}

function adminApprove(id) {
  adminPropertyAction(id, 'publish', 'Listing approved and published.');
}

function adminRestoreActive(id, currentStatus) {
  if (!confirm(`Restore this ${currentStatus} listing as active? It will appear in public listings again.`)) {
    return;
  }
  adminPropertyAction(id, 'publish', 'Listing restored as active.');
}

function adminClearFlag(id) {
  adminPropertyAction(id, 'clear_flag', 'Flag cleared and listing restored.');
}

function adminMarkUnavailable(id, rawType) {
  const isRent = rawType === 'rent';
  const label = isRent ? 'rented' : 'sold';
  if (!confirm(`Mark this listing as ${label}? It will be removed from public search.`)) {
    return;
  }
  adminPropertyAction(
    id,
    isRent ? 'mark_rented' : 'mark_sold',
    `Listing marked as ${label}.`
  );
}

function adminReject(id) {
  const note = window.prompt(
    'Why are you rejecting this listing? This note will be shown to the owner.',
    'Upload clearer exterior photos and complete the verification details.'
  );
  if (!note || !note.trim()) {
    showToast('Rejection cancelled. Add a note so the owner knows what to fix.');
    return;
  }
  adminPropertyAction(id, 'reject', 'Listing moved back to draft.', { reviewNote: note.trim() });
}

function adminDelete(id, type) {
  if (type === 'listing') {
    adminPropertyAction(id, 'delete', 'Listing deleted.');
    return;
  }
  adminUserAction(id, 'remove', 'User removed.');
}

function adminBanUser(id) {
  adminUserAction(id, 'suspend', 'User suspended.');
}

function adminReinstateUser(id) {
  adminUserAction(id, 'reinstate', 'User reinstated.');
}

function adminSearchListings(query) {
  adminListingSearch = String(query || '');
  renderAdminListings(document.getElementById('admin-main'));
}

function adminClearListingSearch() {
  adminListingSearch = '';
  renderAdminListings(document.getElementById('admin-main'));
}

async function adminReportAction(id, action) {
  const payload = {};

  if (action === 'dismiss' || action === 'take_down') {
    const notes = document.getElementById(`admin-report-${id}-notes`)?.value?.trim() || '';
    if (!notes) {
      showToast('Add an investigation note before resolving this report.');
      return;
    }

    if (action === 'take_down' && !confirm('Take this listing down after your investigation?')) {
      return;
    }

    payload.investigationNotes = notes;
    payload.evidenceChecked = document.getElementById(`admin-report-${id}-evidence`)?.checked || false;
    payload.ownerContacted = document.getElementById(`admin-report-${id}-owner`)?.checked || false;
  }

  try {
    const response = await fetch(`/api/admin/reports/${id}/${action}/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(payload)
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Report action failed.');
      return;
    }

    showToast(result.message || 'Report updated.');
    await loadAdminDashboardData();
    setAdminTab('reports');
  } catch (error) {
    console.warn('Report action failed.', error);
    showToast('Report action failed. Please try again.');
  }
}

function adminOpenReportDocument(id) {
  const report = ADMIN_REPORTS.find(item => String(item.id) === String(id));
  if (!report?.documentUrl) {
    showToast('No verification document was uploaded for this listing.');
    return;
  }
  window.open(report.documentUrl, '_blank', 'noopener');
}

function adminOpenDocument(id) {
  const item = ADMIN_VERIFY_QUEUE.find(entry => String(entry.id) === String(id));
  if (!item?.documentUrl) {
    showToast('No verification document was uploaded for this listing.');
    return;
  }
  window.open(item.documentUrl, '_blank', 'noopener');
}

async function adminContactMessageAction(id, action) {
  try {
    const response = await fetch(`/api/admin/contact-messages/${id}/${action}/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'Message action failed.');
      return;
    }

    showToast(result.message || 'Message updated.');
    await loadAdminDashboardData();
    setAdminTab('reports');
  } catch (error) {
    console.warn('Message action failed.', error);
    showToast('Message action failed. Please try again.');
  }
}

async function adminUserAction(id, action, successMessage) {
  try {
    const response = await fetch(`/api/admin/users/${id}/${action}/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    const result = await responseJson(response);

    if (!response.ok) {
      showToast(result.error || 'User action failed.');
      return;
    }

    showToast(result.message || successMessage);
    await loadAdminDashboardData();
    setAdminTab('users');
  } catch (error) {
    console.warn('User action failed.', error);
    showToast('User action failed. Please try again.');
  }
}

function adminViewUser(id) {
  const user = ADMIN_USERS.find(item => String(item.id) === String(id));
  if (!user) {
    showToast('User not found.');
    return;
  }

  showToast(`
    <strong>${user.name}</strong><br>
    ${user.email}<br>
    ${user.role} · ${user.status} · ${user.listings} listings
    <br>Verification: ${user.verificationLabel || user.verificationStatus || 'Unverified'}
  `);
}

function adminProfileAction(id, action) {
  const messages = {
    verify_profile: 'Profile verified.',
    mark_profile_pending: 'Profile marked for review.',
    unverify_profile: 'Profile marked unverified.'
  };
  adminUserAction(id, action, messages[action] || 'Profile updated.');
}

function adminSearchUsers(query) {
  const term = String(query || '').trim().toLowerCase();
  document.querySelectorAll('.admin-table tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function adminVerify(id) {
  adminPropertyAction(id, 'publish', 'Verification approved. Listing is now live.');
}

// Fallback for cases where the admin page is revealed outside showPage().
window.addEventListener('DOMContentLoaded', () => {
  const adminPage = document.getElementById('page-admin');
  if (adminPage) {
    const observer = new MutationObserver(() => {
      if (!adminPage.classList.contains('hidden')) {
        if (!document.getElementById('admin-main').innerHTML.trim()) {
          initAdmin();
        }
      }
    });
    observer.observe(adminPage, { attributes: true, attributeFilter: ['class'] });
  }
});

