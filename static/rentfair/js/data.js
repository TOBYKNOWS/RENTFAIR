/* ============================================
   RentFair Homes — frontend module
   ============================================ */

// Mock listing and admin data. Replace this with API-provided data when Django is ready.

let RENTALS = [
  {
    id: 'r1', type: 'rent', category: 'Self-Contain',
    title: 'Cosy Self-Contain in Basiri', location: 'Basiri, Ado-Ekiti',
    price: 180000, unit: '/yr', beds: 1, baths: 1, sqm: 28,
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '8% below area avg',
    new: true, views: 214, saved: 32, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    ],
    desc: 'Clean self-contained apartment in a quiet compound in Basiri. Tiled floors, fitted kitchen corner, private bathroom. Reliable water supply and 24/7 prepaid electricity. Suitable for a working professional or student.',
    amenities: ['Prepaid Meter','Water Supply','Tiled Floors','Security Gate','Parking Space'],
    agent: { name: 'Tunde Oladele', role: 'Property Owner', phone: '+234 805 000 0001', verified: true, listings: 4 },
    costs: { yearly: 180000, caution: 90000, agreement: 30000, agency: 27000, service: 0 },
    nearby: [{ icon: 'school', name: 'EKSU', dist: '1.2 km' }, { icon: 'hospital', name: 'FMC Ado-Ekiti', dist: '3.4 km' }, { icon: 'market', name: 'Market', dist: '0.5 km' }],
    area: 'Basiri'
  },
  {
    id: 'r2', type: 'rent', category: '2-Bedroom Flat',
    title: 'Spacious 2-Bed Flat in Ajilosun', location: 'Ajilosun, Ado-Ekiti',
    price: 380000, unit: '/yr', beds: 2, baths: 2, sqm: 75,
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '5% below area avg',
    new: false, views: 401, saved: 67, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
      'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
    desc: 'A well-maintained 2-bedroom flat in the popular Ajilosun area. Large living room, two spacious bedrooms with wardrobes, modern kitchen with storage, and two bathrooms. Close to banks, shops, and major roads.',
    amenities: ['Prepaid Meter','Borehole','Wardrobe','Security','Parking','POP Ceiling'],
    agent: { name: 'Biodun Fashola', role: 'Licensed Agent', phone: '+234 802 000 0002', verified: true, listings: 12 },
    costs: { yearly: 380000, caution: 190000, agreement: 57000, agency: 57000, service: 0 },
    nearby: [{ icon: 'bank', name: 'Zenith Bank', dist: '0.3 km' }, { icon: 'fuel', name: 'NNPC Station', dist: '0.6 km' }, { icon: 'hospital', name: 'Clinic', dist: '1.1 km' }],
    area: 'Ajilosun'
  },
  {
    id: 'r3', type: 'rent', category: 'Student Room',
    title: 'Student-Friendly Room in Iworoko', location: 'Iworoko Road, Ado-Ekiti',
    price: 90000, unit: '/yr', beds: 1, baths: 1, sqm: 18,
    verified: true, fairPrice: false, fairLabel: '12% below avg', fairPct: 'Great value',
    new: true, views: 189, saved: 44, furnished: 'Partially Furnished',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    ],
    desc: 'Affordable room suitable for students at EKSU or nearby polytechnics. Shared facilities, secured compound, easy access to campus by keke.',
    amenities: ['Prepaid Meter','Shared Kitchen','Shared Bathroom','Security Gate'],
    agent: { name: 'Mrs. Adeyemi', role: 'Property Owner', phone: '+234 808 000 0003', verified: false, listings: 2 },
    costs: { yearly: 90000, caution: 45000, agreement: 15000, agency: 0, service: 0 },
    nearby: [{ icon: 'school', name: 'EKSU Campus', dist: '0.8 km' }, { icon: 'market', name: 'Mini Market', dist: '0.2 km' }],
    area: 'Iworoko'
  },
  {
    id: 'r4', type: 'rent', category: 'Mini Flat',
    title: 'Modern Mini Flat in Odo-Ado', location: 'Odo-Ado, Ado-Ekiti',
    price: 240000, unit: '/yr', beds: 1, baths: 1, sqm: 40,
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '3% above area avg',
    new: false, views: 320, saved: 51, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    ],
    desc: 'Neat and spacious mini flat with a separate sitting room and bedroom. Located in a peaceful estate in Odo-Ado with easy access to the town centre.',
    amenities: ['Prepaid Meter','Water Supply','Tiled Floors','Parking','Estate Security'],
    agent: { name: 'Kayode Ojo', role: 'Property Owner', phone: '+234 811 000 0004', verified: true, listings: 3 },
    costs: { yearly: 240000, caution: 120000, agreement: 36000, agency: 36000, service: 12000 },
    nearby: [{ icon: 'hospital', name: 'General Hospital', dist: '2.0 km' }, { icon: 'church', name: 'Church', dist: '0.4 km' }],
    area: 'Odo-Ado'
  },
  {
    id: 'r5', type: 'rent', category: '3-Bedroom Bungalow',
    title: '3-Bed Bungalow in Ikere', location: 'Ikere-Ekiti',
    price: 600000, unit: '/yr', beds: 3, baths: 2, sqm: 130,
    verified: true, fairPrice: true, fairLabel: 'Below average', fairPct: '18% below area avg',
    new: false, views: 540, saved: 88, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80',
    ],
    desc: 'Spacious 3-bedroom bungalow in a good location in Ikere-Ekiti. All rooms are en-suite. Large compound with garden. Suitable for a family.',
    amenities: ['Prepaid Meter','Borehole','Generator Connection','Parking','Compound Garden','Security'],
    agent: { name: 'Adewale Ige', role: 'Licensed Agent', phone: '+234 803 000 0005', verified: true, listings: 8 },
    costs: { yearly: 600000, caution: 300000, agreement: 90000, agency: 90000, service: 30000 },
    nearby: [{ icon: 'hospital', name: 'Ikere General Hospital', dist: '1.5 km' }, { icon: 'school', name: 'Secondary School', dist: '0.9 km' }],
    area: 'Ikere'
  },
];

let HOMES_FOR_SALE = [
  {
    id: 'h1', type: 'buy', category: 'Duplex',
    title: 'Luxury Duplex in Lekki', location: 'Lekki Phase 1, Lagos',
    price: 85000000, unit: '', beds: 4, baths: 4, sqm: 280,
    verified: true, fairPrice: false, fairLabel: 'Market price', fairPct: 'In line with area avg',
    new: false, views: 1204, saved: 215, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
    ],
    desc: 'Exquisite 4-bedroom luxury duplex in the prestigious Lekki Phase 1. Features open-plan living, rooftop terrace, fitted kitchen, and 2-car garage. Modern finishes throughout.',
    amenities: ['Swimming Pool','Generator','Rooftop Terrace','Smart Home','CCTV','2-Car Garage','Gym','BQ'],
    agent: { name: 'Chukwuemeka Obi', role: 'Premium Agent', phone: '+234 809 000 0006', verified: true, listings: 26 },
    docType: 'C of O', state: 'Lagos', area: 'Lekki'
  },
  {
    id: 'h2', type: 'buy', category: '4-Bedroom House',
    title: '4-Bed House in Abuja', location: 'Gwarinpa Estate, Abuja',
    price: 120000000, unit: '', beds: 4, baths: 5, sqm: 320,
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '6% below Gwarinpa avg',
    new: true, views: 876, saved: 142, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    ],
    desc: 'Tastefully finished 4-bedroom fully detached house in Gwarinpa Estate. Large compound, BQ, and excellent finishing. Perfect for families or corporate tenants.',
    amenities: ['Generator','BQ','CCTV','Parking x3','Security Post','Fitted Kitchen'],
    agent: { name: 'Suleiman Bello', role: 'Licensed Agent', phone: '+234 807 000 0007', verified: true, listings: 15 },
    docType: 'C of O', state: 'Abuja (FCT)', area: 'Gwarinpa'
  },
  {
    id: 'h3', type: 'buy', category: 'Bungalow',
    title: '3-Bed Bungalow in Ibadan', location: 'Bodija, Ibadan, Oyo State',
    price: 28000000, unit: '', beds: 3, baths: 3, sqm: 160,
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: 'On par with area avg',
    new: false, views: 432, saved: 78, furnished: 'Unfurnished',
    img: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    ],
    desc: 'Clean and well-maintained 3-bedroom bungalow in Bodija, one of Ibadan\'s most sought-after residential areas. Tiled throughout, good road network, and a large compound.',
    amenities: ['Borehole','Parking','Security Gate','Tiled Compound'],
    agent: { name: 'Toyin Adesanya', role: 'Property Owner', phone: '+234 812 000 0008', verified: true, listings: 2 },
    docType: 'Survey Plan + Deed', state: 'Oyo', area: 'Bodija'
  },
  {
    id: 'h4', type: 'buy', category: 'Apartment',
    title: 'Executive Flat in Port Harcourt', location: 'GRA Phase 2, Port Harcourt',
    price: 45000000, unit: '', beds: 3, baths: 3, sqm: 190,
    verified: true, fairPrice: false, fairLabel: 'Above average', fairPct: '14% above GRA avg',
    new: true, views: 651, saved: 103, furnished: 'Partly Furnished',
    img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=500&q=80',
    imgs: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    desc: 'Luxuriously finished 3-bedroom apartment in the prestigious GRA Phase 2, Port Harcourt. 24/7 light, generator backup, and fully secured estate.',
    amenities: ['24hr Electricity','Generator','Fitted Kitchen','CCTV','Swimming Pool','Gym'],
    agent: { name: 'Ngozi Okoye', role: 'Premium Agent', phone: '+234 806 000 0009', verified: true, listings: 19 },
    docType: 'C of O', state: 'Rivers', area: 'GRA Phase 2'
  },
];

let LAND_LISTINGS = [
  {
    id: 'l1', type: 'land', category: 'Residential Plot',
    title: 'Residential Plot in Ado-Ekiti', location: 'Ado-Ekiti, Ekiti State',
    price: 3500000, unit: '', sqm: 648, plotSize: '648 sqm (2 plots)',
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: 'In line with area avg',
    new: true, views: 214, saved: 38,
    img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500&q=80',
    imgs: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
    desc: 'Dry, flat residential land in a rapidly developing area of Ado-Ekiti. Good access road, electricity running, suitable for residential building.',
    landType: 'Residential', docs: ['Survey Plan', 'Deed of Assignment'], estate: false, dry: true,
    agent: { name: 'Remi Adeyinka', role: 'Property Owner', phone: '+234 801 000 0010', verified: true, listings: 5 },
    state: 'Ekiti'
  },
  {
    id: 'l2', type: 'land', category: 'Estate Plot',
    title: 'Gated Estate Land in Lagos', location: 'Ibeju-Lekki, Lagos',
    price: 15000000, unit: '', sqm: 450, plotSize: '450 sqm',
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '4% below Lekki avg',
    new: false, views: 892, saved: 167,
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80',
    imgs: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    desc: 'Premium estate plot in a gated and fully serviced estate in Ibeju-Lekki. Close to the Dangote Refinery axis and Lekki Free Zone.',
    landType: 'Estate Plot', docs: ['C of O', 'Survey Plan', 'Governor\'s Consent'], estate: true, dry: true,
    agent: { name: 'Chioma Eze', role: 'Estate Developer', phone: '+234 815 000 0011', verified: true, listings: 34 },
    state: 'Lagos'
  },
  {
    id: 'l3', type: 'land', category: 'Commercial Plot',
    title: 'Commercial Plot in Abuja', location: 'Lugbe, Abuja FCT',
    price: 22000000, unit: '', sqm: 1200, plotSize: '1200 sqm (Corner piece)',
    verified: true, fairPrice: false, fairLabel: 'Below average', fairPct: '20% below area avg',
    new: false, views: 434, saved: 72,
    img: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=500&q=80',
    imgs: ['https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=800&q=80'],
    desc: 'Strategic corner-piece commercial land in Lugbe, Abuja. Excellent road frontage, dry land, suitable for commercial plaza, filling station, or logistics hub.',
    landType: 'Commercial', docs: ['C of O', 'Survey Plan'], estate: false, dry: true,
    agent: { name: 'Ibrahim Musa', role: 'Licensed Agent', phone: '+234 817 000 0012', verified: true, listings: 11 },
    state: 'Abuja (FCT)'
  },
  {
    id: 'l4', type: 'land', category: 'Farmland',
    title: 'Large Farmland in Ekiti', location: 'Ido-Osi, Ekiti State',
    price: 8000000, unit: '', sqm: 40000, plotSize: '4 Hectares',
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: 'In line with area avg',
    new: false, views: 290, saved: 41,
    img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80',
    imgs: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80'],
    desc: '4-hectare farmland suitable for cocoa, cassava, or poultry farming. Good soil, water source nearby, direct road access.',
    landType: 'Farmland', docs: ['Survey Plan', 'Deed of Assignment'], estate: false, dry: true,
    agent: { name: 'Femi Olawale', role: 'Property Owner', phone: '+234 818 000 0013', verified: true, listings: 3 },
    state: 'Ekiti'
  },
  {
    id: 'l5', type: 'land', category: 'Residential Land',
    title: 'Residential Land in Ibadan', location: 'Oluyole Estate, Ibadan',
    price: 12000000, unit: '', sqm: 600, plotSize: '600 sqm',
    verified: true, fairPrice: true, fairLabel: 'Fair price', fairPct: '2% above area avg',
    new: true, views: 380, saved: 64,
    img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500&q=80',
    imgs: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
    desc: 'Clean 600sqm residential land in the serene Oluyole Estate, Ibadan. Good roads, existing infrastructure, and peaceful neighbourhood.',
    landType: 'Residential', docs: ['C of O', 'Survey Plan'], estate: true, dry: true,
    agent: { name: 'Yinka Adedayo', role: 'Licensed Agent', phone: '+234 820 000 0014', verified: true, listings: 9 },
    state: 'Oyo'
  },
];

let ALL_LISTINGS = [...RENTALS, ...HOMES_FOR_SALE, ...LAND_LISTINGS];

const EKITI_AREAS = [
  { name: 'Ado-Ekiti', count: '142 rentals', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=300&q=80' },
  { name: 'Basiri', count: '38 rentals', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=300&q=80' },
  { name: 'Ajilosun', count: '56 rentals', img: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=300&q=80' },
  { name: 'Odo-Ado', count: '29 rentals', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80' },
  { name: 'Iworoko', count: '24 rentals', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=300&q=80' },
  { name: 'Ikere', count: '31 rentals', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&q=80' },
];

