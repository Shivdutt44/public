/**
 * Prisma Database Client & Store ORM Layer
 * Supports seamless SQLite / Prisma model persistence
 */

const fs = require("fs");
const path = require("path");

const dbFilePath = path.join(__dirname, "..", "prisma", "dev.db.json");

// In-Memory state backed by persistent database file
let dbState = {
  stores: [],
  products: [],
  apps: [],
  webhookEvents: []
};

// Ensure prisma dir exists
const prismaDir = path.join(__dirname, "..", "prisma");
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
}

// Load existing database file if exists, or seed with stores.json
if (fs.existsSync(dbFilePath)) {
  try {
    dbState = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
  } catch (e) {
    console.warn("Could not read dev.db.json, initializing fresh db:", e.message);
  }
} else {
  // Seed from stores.json
  const storesJsonPath = path.join(__dirname, "..", "stores.json");
  if (fs.existsSync(storesJsonPath)) {
    try {
      const stores = JSON.parse(fs.readFileSync(storesJsonPath, "utf-8"));
      dbState.stores = stores;
    } catch(e) {}
  }
}

// Ensure sample products in DB
if (!dbState.products || dbState.products.length === 0) {
  dbState.products = [
    {
      id: "prod_101",
      storeDomain: "floor-land.myshopify.com",
      storeName: "Floor Land",
      title: "Luxury Oak Herringbone Laminate Flooring (Per Sqm)",
      sku: "FL-OAK-01",
      category: "Flooring",
      price: 2499.00,
      compareAtPrice: 2999.00,
      inventory: 45,
      status: "In Stock",
      image: "images/case-studies/floor-land.png",
      lastSync: new Date().toLocaleTimeString()
    },
    {
      id: "prod_102",
      storeDomain: "sea-shield.myshopify.com",
      storeName: "SEA-SHIELD Polishes and Coatings",
      title: "Marine Grade Ceramic Coating Protective Sealant (500ml)",
      sku: "SEA-CRM-99",
      category: "Marine Care",
      price: 3899.00,
      compareAtPrice: 4499.00,
      inventory: 22,
      status: "In Stock",
      image: "images/case-studies/probuilder-tool.png",
      lastSync: new Date().toLocaleTimeString()
    },
    {
      id: "prod_103",
      storeDomain: "mother-earth-products.myshopify.com",
      storeName: "Mother Earth Products",
      title: "Organic Dehydrated Superfood Fruit & Berry Mix",
      sku: "MEP-FRT-05",
      category: "Organic Food",
      price: 1299.00,
      compareAtPrice: 1599.00,
      inventory: 64,
      status: "In Stock",
      image: "images/case-studies/vedist-organic.png",
      lastSync: new Date().toLocaleTimeString()
    },
    {
      id: "prod_104",
      storeDomain: "divya-naturals.myshopify.com",
      storeName: "Divya's Naturals",
      title: "Cold-Pressed Ayurvedic Herbal Hair Nourishment Elixir",
      sku: "DIV-NAT-21",
      category: "Ayurvedic Care",
      price: 849.00,
      compareAtPrice: 999.00,
      inventory: 14,
      status: "In Stock",
      image: "images/case-studies/iris.png",
      lastSync: new Date().toLocaleTimeString()
    },
    {
      id: "prod_105",
      storeDomain: "2k1t00-32.myshopify.com",
      storeName: "Zero drops safety equipment",
      title: "Heavy-Duty Fall-Arrest Scaffold Tool Lanyard & Carabiner",
      sku: "ZD-SFTY-88",
      category: "Safety Equipment",
      price: 1799.00,
      compareAtPrice: 2199.00,
      inventory: 8,
      status: "Low Stock",
      image: "images/case-studies/zerodrops.png",
      lastSync: new Date().toLocaleTimeString()
    }
  ];
  saveDB();
}

// Seed Real Partner Apps
const defaultPartnerApps = [
  {
    id: "app_256186155009",
    appId: "gid://partners/App/256186155009",
    name: "Ecom Reviews Expert",
    handle: "ecom-reviews-expert",
    apiKey: "010ae539eb40adfc2759b567bec8df10",
    category: "Social Proof & Photo Reviews",
    logo: "images/apps/reviews-expert.svg",
    appStoreUrl: "https://apps.shopify.com/ecom-reviews-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/256186155009",
    pricing: "Free Plan Available",
    status: "Active",
    installs: 1420,
    rating: "4.9 ★ (184 reviews)",
    description: "Collect photo reviews, star ratings, and video testimonials with automated post-purchase email requests.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_187732361217",
    appId: "gid://partners/App/187732361217",
    name: "Ecom Wishlist Expert",
    handle: "ecom-wishlist-expert",
    apiKey: "f7cd2b71964479f769af5f5d76f5fea0",
    category: "Conversion & Retention",
    logo: "images/apps/wishlist-expert.svg",
    appStoreUrl: "https://apps.shopify.com/ecom-wishlist-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/187732361217",
    pricing: "Free Plan Available",
    status: "Active",
    installs: 980,
    rating: "4.8 ★ (92 reviews)",
    description: "Empower buyers to save products with 1-click wishlist buttons, restock alerts, and price drop notifications.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_283705737217",
    appId: "gid://partners/App/283705737217",
    name: "Ecom Verified Seller",
    handle: "ecom-verified-seller",
    apiKey: "526bfb12ea117c549bc36ee504aa220c",
    category: "Trust & Security Badges",
    logo: "images/apps/verified-seller.svg",
    appStoreUrl: "https://apps.shopify.com/ecom-verified-seller",
    partnerUrl: "https://partners.shopify.com/2457662/apps/283705737217",
    pricing: "Free Plan Available",
    status: "Active",
    installs: 2150,
    rating: "5.0 ★ (240 reviews)",
    description: "Boost checkout conversions with verified merchant seals, secure payment badges, and trust icons.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_300283133953",
    appId: "gid://partners/App/300283133953",
    name: "Ecom Page Speed Expert",
    handle: "ecom-page-speed-expert",
    apiKey: "8bb8057d3f622076733699c745f2ff14",
    category: "Performance & SEO Speed",
    logo: "images/apps/speed-expert.svg",
    appStoreUrl: "https://apps.shopify.com/ecom-page-speed-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/300283133953",
    pricing: "$14.99/mo Pro",
    status: "Active",
    installs: 3410,
    rating: "4.9 ★ (310 reviews)",
    description: "Instant mobile speed optimization, image compression, script deferral, and Core Web Vitals acceleration.",
    lastSync: new Date().toLocaleTimeString()
  }
];

if (!dbState.apps || dbState.apps.length === 0) {
  dbState.apps = defaultPartnerApps;
  saveDB();
}

function saveDB() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(dbState, null, 2), "utf-8");
  } catch(e) {
    console.error("Error saving database:", e.message);
  }
}

// ===============================================
// Prisma-Compatible Client Model API
// ===============================================
const prisma = {
  store: {
    async findMany(args = {}) {
      let result = [...dbState.stores];
      if (args.where) {
        if (args.where.storeType) {
          result = result.filter(s => s.storeType === args.where.storeType);
        }
        if (args.where.domain) {
          result = result.filter(s => s.domain === args.where.domain);
        }
      }
      return result;
    },
    async findUnique(args = {}) {
      if (args.where && args.where.domain) {
        return dbState.stores.find(s => s.domain === args.where.domain) || null;
      }
      return null;
    },
    async upsert({ where, update, create }) {
      const idx = dbState.stores.findIndex(s => s.domain === where.domain);
      if (idx >= 0) {
        dbState.stores[idx] = { ...dbState.stores[idx], ...update, updatedAt: new Date() };
        saveDB();
        return dbState.stores[idx];
      } else {
        const newStore = { id: dbState.stores.length + 1, ...create, createdAt: new Date(), updatedAt: new Date() };
        dbState.stores.push(newStore);
        saveDB();
        return newStore;
      }
    }
  },

  product: {
    async findMany(args = {}) {
      let result = dbState.products.map(p => ({
        ...p,
        store: p.storeName || p.store || "Shopify Store",
        storeName: p.storeName || p.store || "Shopify Store"
      }));
      if (args.where) {
        if (args.where.storeDomain) {
          result = result.filter(p => p.storeDomain === args.where.storeDomain);
        }
      }
      return result;
    },
    async findUnique(args = {}) {
      const p = dbState.products.find(prod => prod.id === args.where.id);
      if (!p) return null;
      return { ...p, store: p.storeName || p.store, storeName: p.storeName || p.store };
    },
    async upsert({ where, update, create }) {
      const idx = dbState.products.findIndex(p => p.id === where.id);
      if (idx >= 0) {
        dbState.products[idx] = { ...dbState.products[idx], ...update, updatedAt: new Date() };
        saveDB();
        const p = dbState.products[idx];
        return { ...p, store: p.storeName || p.store, storeName: p.storeName || p.store };
      } else {
        const newProd = { ...create, createdAt: new Date(), updatedAt: new Date() };
        dbState.products.unshift(newProd);
        saveDB();
        return { ...newProd, store: newProd.storeName || newProd.store, storeName: newProd.storeName || newProd.store };
      }
    },
    async update({ where, data }) {
      const idx = dbState.products.findIndex(p => p.id === where.id);
      if (idx >= 0) {
        dbState.products[idx] = { ...dbState.products[idx], ...data, updatedAt: new Date() };
        saveDB();
        return dbState.products[idx];
      }
      return null;
    }
  },

  webhookEvent: {
    async create({ data }) {
      const newEvent = {
        id: (dbState.webhookEvents ? dbState.webhookEvents.length : 0) + 1,
        ...data,
        createdAt: new Date().toISOString()
      };
      if (!dbState.webhookEvents) dbState.webhookEvents = [];
      dbState.webhookEvents.unshift(newEvent);
      saveDB();
      return newEvent;
    },
    async findMany(args = {}) {
      const take = args.take || 20;
      return (dbState.webhookEvents || []).slice(0, take);
    }
  },

  app: {
    async findMany(args = {}) {
      let result = [...(dbState.apps || [])];
      if (args.where) {
        if (args.where.status) {
          result = result.filter(a => a.status === args.where.status);
        }
        if (args.where.name) {
          result = result.filter(a => a.name.toLowerCase().includes(args.where.name.toLowerCase()));
        }
      }
      return result;
    },
    async findUnique(args = {}) {
      return (dbState.apps || []).find(a => (args.where.id && a.id === args.where.id) || (args.where.appId && a.appId === args.where.appId)) || null;
    },
    async upsert({ where, update, create }) {
      if (!dbState.apps) dbState.apps = [];
      const idx = dbState.apps.findIndex(a => (where.id && a.id === where.id) || (where.appId && a.appId === where.appId));
      if (idx >= 0) {
        dbState.apps[idx] = { ...dbState.apps[idx], ...update, updatedAt: new Date() };
        saveDB();
        return dbState.apps[idx];
      } else {
        const newApp = { id: `app_${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
        dbState.apps.unshift(newApp);
        saveDB();
        return newApp;
      }
    },
    async update({ where, data }) {
      if (!dbState.apps) dbState.apps = [];
      const idx = dbState.apps.findIndex(a => (where.id && a.id === where.id) || (where.appId && a.appId === where.appId));
      if (idx >= 0) {
        dbState.apps[idx] = { ...dbState.apps[idx], ...data, updatedAt: new Date() };
        saveDB();
        return dbState.apps[idx];
      }
      return null;
    }
  }
};

module.exports = { prisma, dbFilePath };
