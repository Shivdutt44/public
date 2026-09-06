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
    name: "Ecom: AI Product Review Expert",
    handle: "ecom-review-expert",
    apiKey: "010ae539eb40adfc2759b567bec8df10",
    category: "Social Proof & Photo Reviews",
    logo: "images/apps/review-expert.png",
    appStoreUrl: "https://apps.shopify.com/ecom-review-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/256186155009",
    pricing: "Free plan available / From $19.99/mo",
    status: "Active",
    installs: 0,
    rating: "5.0 ★ (2 reviews)",
    description: "Turn customer feedback into AI-powered social proof with automated reviews, star ratings, review widgets, UGC galleries, and post-purchase review flows.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_187732361217",
    appId: "gid://partners/App/187732361217",
    name: "Ecom Wishlist Expert",
    handle: "wishlist-expert",
    apiKey: "f7cd2b71964479f769af5f5d76f5fea0",
    category: "Conversion & Retention",
    logo: "images/apps/wishlist-expert.png",
    appStoreUrl: "https://apps.shopify.com/wishlist-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/187732361217",
    pricing: "Free plan available / From $9.99/mo",
    status: "Active",
    installs: 0,
    rating: "5.0 ★ (14 reviews)",
    description: "Let customers bookmark favorite products for later, with wishlists on home, product, and collection pages plus real-time sales and most-liked notifications.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_283705737217",
    appId: "gid://partners/App/283705737217",
    name: "Ecom : Verified Seller Badges",
    handle: "ecom-verified-seller",
    apiKey: "526bfb12ea117c549bc36ee504aa220c",
    category: "Trust & Security Badges",
    logo: "images/apps/verified-seller.png",
    appStoreUrl: "https://apps.shopify.com/ecom-verified-seller",
    partnerUrl: "https://partners.shopify.com/2457662/apps/283705737217",
    pricing: "Free plan available / From $9.99/mo",
    status: "Active",
    installs: 0,
    rating: "5.0 ★ (13 reviews)",
    description: "Establish trust by showing verified seller badges on home, product, and blog pages. Customize badge colors, text, and styles to match your brand.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_300283133953",
    appId: "gid://partners/App/300283133953",
    name: "Ecom : Page Speed Expert",
    handle: "ecom-page-speed-expert",
    apiKey: "8bb8057d3f622076733699c745f2ff14",
    category: "Performance & SEO Speed",
    logo: "images/apps/page-speed-expert.png",
    appStoreUrl: "https://apps.shopify.com/ecom-page-speed-expert",
    partnerUrl: "https://partners.shopify.com/2457662/apps/300283133953",
    pricing: "Free plan available / From $9/mo",
    status: "Active",
    installs: 0,
    rating: "5.0 ★ (2 reviews)",
    description: "Smart link preloading kicks in the moment a visitor hovers for 65ms, loading the next page in the background to cut perceived load times.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_ai_instafeed",
    name: "Ecom : AI Instafeed Expert",
    handle: "ai-instafeed",
    apiKey: "27bee79bfa6071d88605e515871d4a7d",
    category: "Social Media & Instagram Feed",
    logo: "images/apps/ai-instafeed-expert.png",
    appStoreUrl: "https://apps.shopify.com/ai-instafeed",
    partnerUrl: "https://partners.shopify.com/2457662/apps",
    pricing: "Free Plan Available",
    status: "Active",
    installs: 0,
    rating: "5.0 ★ (5 reviews)",
    description: "Connect an Instagram account and display posts on the storefront. Auto-syncs content and caches posts locally, with full control over layout, columns, and spacing.",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "app_staragent_chatbot",
    name: "StarAgent : AI Sales & Chatbot",
    handle: "staragent-ai-chatbot-sales",
    apiKey: "29b4096f2c2b141e6ba6a6d6ec6f40ea",
    category: "AI Sales & Customer Support",
    logo: "images/apps/staragent-ai-chatbot.png",
    appStoreUrl: "https://apps.shopify.com/staragent-ai-chatbot-sales",
    partnerUrl: "https://partners.shopify.com/2457662/apps",
    pricing: "Free plan available / From $9.99/mo",
    status: "Active",
    installs: 0,
    rating: "New ★",
    description: "Automate support and sales conversations with AI. Recommends products, answers policy, shipping, return, and order questions, and captures leads.",
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
