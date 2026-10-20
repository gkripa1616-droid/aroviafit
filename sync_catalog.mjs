import fs from 'fs';
import path from 'path';

const downloadsPath = 'C:/Users/Asus/Downloads/live_catalog (1).json';
let raw;

if (fs.existsSync(downloadsPath)) {
  raw = JSON.parse(fs.readFileSync(downloadsPath, 'utf8'));
} else {
  raw = JSON.parse(fs.readFileSync('./live_catalog.json', 'utf8'));
}

// 8 Master Categories as seen on localhost:8443
const masterCategories = [
  {
    name: 'GYM TSHIRTS WITH SHORTS',
    subCategories: ['GYM TSHIRTS', 'GYM SHORTS']
  },
  {
    name: 'JACKETS',
    subCategories: []
  },
  {
    name: 'AroviaFit Rib Prime Collection',
    subCategories: ['Crop-top with flair pants']
  },
  {
    name: 'SPORTS BRA WITH GYM SHORTS',
    subCategories: ['Criss cross bra with gym shorts']
  },
  {
    name: 'CROP TOP ZIPPER BRA WITH YOGA PANTS',
    subCategories: ['crop tops']
  },
  {
    name: 'GREEN FOREST COLLECTION',
    subCategories: ['GYM TIGHTS WITH SPORTS BRA']
  },
  {
    name: 'SNOWWHITE COLLECTION',
    subCategories: ['SNOWWHITE JUMP SUIT']
  },
  {
    name: 'JUMP SUITS',
    subCategories: ['GREEN FOREST']
  }
];

// Clean products and ensure valid images
const cleanedProducts = raw.products.map(p => {
  // Normalize category name if SNOWHITE -> SNOWWHITE
  let category = p.category;
  if (category === 'SNOWHITE COLLECTION') {
    category = 'SNOWWHITE COLLECTION';
  }
  let subCategory = p.subCategory || p.sub_category || '';
  if (subCategory === 'SNOWHITE JUMP SUIT') {
    subCategory = 'SNOWWHITE JUMP SUIT';
  }

  const allImgs = [p.imgId, ...(p.images || [])].filter(
    u => u && typeof u === 'string' && (!u.startsWith('data:') || u.length >= 200)
  );

  let primaryImg = allImgs[0] || (p.imgId && p.imgId.length >= 200 ? p.imgId : '');
  let cleanImages = allImgs.length > 0 ? allImgs : (primaryImg ? [primaryImg] : []);

  if (!primaryImg) {
    if (p.name === 'twilight') {
      primaryImg = '/products/twilight.jpg';
      cleanImages = ['/products/twilight.jpg'];
    } else if (p.name === 'twilight blue') {
      primaryImg = '/products/twilight_blue.jpg';
      cleanImages = ['/products/twilight_blue.jpg'];
    } else if (p.name === 'little rose') {
      primaryImg = '/products/little_rose.jpg';
      cleanImages = ['/products/little_rose.jpg'];
    }
  }

  return {
    id: Number(p.id),
    name: p.name,
    price: Number(p.price) || 1299,
    mrp: Number(p.mrp) || 1999,
    rating: Number(p.rating) || 5,
    reviews: Number(p.reviews) || 1,
    badge: p.badge || 'NEW',
    imgId: primaryImg,
    images: cleanImages,
    colors: Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : ['#111111', '#6b7280'],
    category: category,
    subCategory: subCategory,
    sub_category: subCategory,
    description: p.description || 'Engineered with ultra-premium 4-way Italian stretch fabric for zero-distraction movement.',
    stock: p.stock ?? 100
  };
});

// Desired display order to match localhost screenshot exactly:
// royal blue, baby pink, black, wine, grey, green forest, snowhite, sage green, Butter yellow, brick, Airforce Blue, twilight, skin baige, twilight blue, dawn black, lavander, little rose
const orderPreference = [
  'royal blue',
  'baby pink',
  'black',
  'wine',
  'grey',
  'green forest',
  'snowhite',
  'sage green',
  'Butter yellow',
  'brick',
  'Airforce Blue',
  'twilight',
  'skin baige',
  'twilight blue',
  'dawn black',
  'lavander',
  'little rose'
];

cleanedProducts.sort((a, b) => {
  const idxA = orderPreference.indexOf(a.name);
  const idxB = orderPreference.indexOf(b.name);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.id - b.id;
});

// Write live_catalog.json
const catalogJson = {
  products: cleanedProducts,
  categories: masterCategories
};
fs.writeFileSync('./live_catalog.json', JSON.stringify(catalogJson, null, 2), 'utf8');
console.log('✅ Updated live_catalog.json with', cleanedProducts.length, 'products and', masterCategories.length, 'categories');

// Write src/services/catalogData.ts
const catalogDataContent = `import { DBProduct, DBCategory } from './supabaseBackend'

export const LIVE_CATEGORIES: DBCategory[] = ${JSON.stringify(masterCategories, null, 2)}

export const LIVE_PRODUCTS: any[] = ${JSON.stringify(cleanedProducts, null, 2)}
`;
fs.writeFileSync('./src/services/catalogData.ts', catalogDataContent, 'utf8');
console.log('✅ Updated src/services/catalogData.ts');
