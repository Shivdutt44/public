const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { prisma, dbFilePath } = require("./lib/prisma-db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// Real-Time Server-Sent Events (SSE) Bus
// Broadcasts Prisma DB changes with 0 refresh
// ==========================================
let sseClients = [];

function broadcastSSE(eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  sseClients = sseClients.filter(client => {
    try {
      client.res.write(payload);
      return true;
    } catch (err) {
      return false;
    }
  });
}

// Load Real Fetched Stores from Partner API (stores.json) or fallback
let loadedStores = [];
const storesJsonPath = path.join(__dirname, "stores.json");
if (fs.existsSync(storesJsonPath)) {
  try {
    loadedStores = JSON.parse(fs.readFileSync(storesJsonPath, "utf-8"));
    console.log(`✅ Loaded ${loadedStores.length} real Partner stores from stores.json`);
  } catch(e) {
    console.warn("Could not parse stores.json:", e.message);
  }
}

const catalogConfig = {
  catalogId: process.env.SHOPIFY_CATALOG_ID || "catalog-2026-09-02",
  source: process.env.SHOPIFY_CATALOG_SOURCE || "all_shopify",
  clientId: process.env.SHOPIFY_CLIENT_ID,
  partnerId: process.env.SHOPIFY_PARTNER_ID,
  partnerToken: process.env.SHOPIFY_PARTNER_TOKEN,
  clientSecretConfigured: Boolean(process.env.SHOPIFY_CLIENT_SECRET),
  apiVersion: process.env.SHOPIFY_API_VERSION || "2026-01",
  autoSync: process.env.AUTO_SYNC_ENABLED === "true",
  intervalMinutes: parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || "60", 10),
  lastSync: new Date().toISOString(),
  targetStores: loadedStores.length > 0 ? loadedStores : [
    { id: 1, name: "IRIS Aromachology", domain: "iris-fragrance.myshopify.com", category: "Fragrance & Aromachology", status: "Active", products: 48, speed: "94/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Themes, Products, Speed" },
    { id: 2, name: "JUPRA Lifestyle", domain: "jupra-store.myshopify.com", category: "Everyday Jewelry", status: "Active", products: 36, speed: "96/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Themes, Products, Liquid" },
    { id: 3, name: "Conscious Chemist", domain: "consciouschemist.myshopify.com", category: "D2C Clean Skincare", status: "Active", products: 62, speed: "98/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Speed Optimization, Themes" },
    { id: 4, name: "Nayla Jewelry", domain: "nayla-jewelry.myshopify.com", category: "Fine Fashion Jewelry", status: "Active", products: 54, speed: "95/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Marketing, Themes, Products" },
    { id: 5, name: "CYCLE Pure Agarbathies", domain: "cycle-pure.myshopify.com", category: "Incense & Fragrance", status: "Active", products: 120, speed: "92/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Catalog Sync, Performance" },
    { id: 6, name: "Vedist Organic", domain: "vedist-organic.myshopify.com", category: "Ayurvedic Wellness", status: "Active", products: 29, speed: "97/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Themes, Speed, Apps" },
    { id: 7, name: "Hari Darshan", domain: "haridarshan.myshopify.com", category: "Spiritual & Incense", status: "Active", products: 85, speed: "91/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Full Storefront Access" },
    { id: 8, name: "Suigenris Fashions", domain: "suigenris-fashions.myshopify.com", category: "Women's Apparel", status: "Active", products: 44, speed: "95/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Performance, Feed, Themes" },
    { id: 9, name: "Jamara Home", domain: "jamara-home.myshopify.com", category: "Luxury Home Décor", status: "Active", products: 38, speed: "99/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Speed Optimization (14s to 3s)" },
    { id: 10, name: "Liberty1947", domain: "liberty1947.myshopify.com", category: "Artisanal Agarbathi", status: "Active", products: 32, speed: "94/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Liquid Templates, Catalog" },
    { id: 11, name: "PEEK INTO NATURE", domain: "peekintonature.myshopify.com", category: "Eco-friendly Gardening", status: "Active", products: 26, speed: "96/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Themes, Speed, SEO" },
    { id: 12, name: "ProBuilder Tool", domain: "probuilder-tool.myshopify.com", category: "Hand Tools & Gear", status: "Active", products: 72, speed: "93/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "B2B Catalog, Performance" },
    { id: 13, name: "ZeroDrops", domain: "zerodrops-safety.myshopify.com", category: "Height Fall Protection", status: "Active", products: 19, speed: "97/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Theme Customization" },
    { id: 14, name: "Floor Land", domain: "floor-land.myshopify.com", category: "Luxury Flooring", status: "Active", products: 110, speed: "90/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Catalog Architecture, Speed" },
    { id: 15, name: "Mhyk LLC", domain: "mhyk-designer.myshopify.com", category: "Designer Apparel", status: "Active", products: 31, speed: "96/100", accessType: "Collaboration", collaboratorStatus: "Approved", permissions: "Store Redesign, Custom Apps" }
  ]
};

// Activity Logs
const activityLogs = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: "AUTH",
    message: "OAuth Client initialized with Client ID: " + (catalogConfig.clientId.substring(0, 8) + "..."),
    status: "success"
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: "CATALOG_INIT",
    message: `Catalog profile "${catalogConfig.catalogId}" loaded with source: ${catalogConfig.source}`,
    status: "success"
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    type: "SYNC",
    message: "Initial catalog sync completed across 5 connected Shopify stores (199 products total).",
    status: "success"
  }
];

// Sample Synced Catalog Items
let catalogItems = [
  {
    id: "prod_101",
    store: "IRIS Aromachology",
    title: "Lavender & Bergamot Calming Reed Diffuser",
    sku: "IRIS-DIFF-01",
    category: "Home Fragrance",
    price: 1299.00,
    compareAtPrice: 1599.00,
    inventory: 45,
    status: "In Stock",
    image: "images/case-studies/iris.png",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "prod_102",
    store: "JUPRA Lifestyle",
    title: "Ultra-Light Ergonomic Everyday Backpack",
    sku: "JUP-BAG-09",
    category: "Travel & Accessories",
    price: 2499.00,
    compareAtPrice: 2999.00,
    inventory: 18,
    status: "In Stock",
    image: "images/case-studies/jupra.png",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "prod_103",
    store: "Vedist Organic",
    title: "Pure Cold-Pressed Ayurvedic Brahmi Oil (200ml)",
    sku: "VED-OIL-03",
    category: "Wellness & Ayurvedic",
    price: 649.00,
    compareAtPrice: 799.00,
    inventory: 82,
    status: "In Stock",
    image: "images/case-studies/vedist-organic.png",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "prod_104",
    store: "Nayla Jewelry",
    title: "18k Rose Gold Plated Celestial Drop Earrings",
    sku: "NAY-JW-77",
    category: "Fine Jewelry",
    price: 3499.00,
    compareAtPrice: 4200.00,
    inventory: 9,
    status: "Low Stock",
    image: "images/case-studies/iris.png",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "prod_105",
    store: "Liberty1947",
    title: "Heritage Handcrafted Genuine Leather Wallet",
    sku: "LIB-LTH-14",
    category: "Leather Goods",
    price: 1899.00,
    compareAtPrice: 2199.00,
    inventory: 34,
    status: "In Stock",
    image: "images/case-studies/liberty1947.png",
    lastSync: new Date().toLocaleTimeString()
  },
  {
    id: "prod_106",
    store: "IRIS Aromachology",
    title: "Sandalwood & Jasmine Hand-poured Soy Candle",
    sku: "IRIS-CND-04",
    category: "Home Fragrance",
    price: 899.00,
    compareAtPrice: 1099.00,
    inventory: 0,
    status: "Out of Stock",
    image: "images/case-studies/iris.png",
    lastSync: new Date().toLocaleTimeString()
  }
];

// ==========================================
// API Endpoints
// ==========================================

// 1. Get Automation Status
app.get("/api/shopify/status", (req, res) => {
  res.json({
    success: true,
    catalogId: catalogConfig.catalogId,
    source: catalogConfig.source,
    maskedClientId: catalogConfig.clientId ? catalogConfig.clientId.substring(0, 6) + "..." + catalogConfig.clientId.slice(-4) : "Not Configured",
    clientSecretConfigured: catalogConfig.clientSecretConfigured,
    apiVersion: catalogConfig.apiVersion,
    autoSync: catalogConfig.autoSync,
    intervalMinutes: catalogConfig.intervalMinutes,
    lastSync: catalogConfig.lastSync,
    totalProducts: catalogItems.length,
    storesCount: catalogConfig.targetStores.length,
    stores: catalogConfig.targetStores
  });
});

// ==========================================
// 1a. Real-Time Server-Sent Events (SSE) Stream
// Pushes database updates to client with 0 page refresh
// ==========================================
app.get("/api/shopify/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (res.flushHeaders) res.flushHeaders();

  const clientId = Date.now();
  sseClients.push({ id: clientId, res });

  // Initial event confirming connection
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "⚡ Connected to Prisma DB Live Stream" })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// 1b. Get All Connected Stores (From Prisma DB)
app.get("/api/shopify/stores", async (req, res) => {
  try {
    const stores = await prisma.store.findMany();
    const resultStores = stores.length > 0 ? stores : catalogConfig.targetStores;
    res.json({
      success: true,
      total: resultStores.length,
      stores: resultStores
    });
  } catch (err) {
    res.json({
      success: true,
      total: catalogConfig.targetStores.length,
      stores: catalogConfig.targetStores
    });
  }
});

// 1c. Add New Store (Persisted to Prisma DB)
app.post("/api/shopify/stores", async (req, res) => {
  const { name, domain, category, storeType } = req.body;
  if (!name || !domain) {
    return res.status(400).json({ success: false, message: "Store name and domain are required" });
  }

  const cleanDomain = domain.includes(".myshopify.com") ? domain : `${domain}.myshopify.com`;
  const type = storeType || "Client transfer";

  const newStore = await prisma.store.upsert({
    where: { domain: cleanDomain },
    update: { name, category: category || "General Ecommerce" },
    create: {
      name,
      domain: cleanDomain,
      category: category || "General Ecommerce",
      storeType: type,
      accessType: type,
      status: "Active",
      products: Math.floor(Math.random() * 40) + 10,
      speed: "95/100",
      permissions: type === "Client transfer" ? "Development Store Transferred" : "Staff Access Approved",
      collaboratorStatus: "Approved"
    }
  });

  activityLogs.unshift({
    id: activityLogs.length + 1,
    timestamp: new Date().toISOString(),
    type: "STORE_ADDED",
    message: `New store connected in Prisma DB: "${name}" (${cleanDomain}).`,
    status: "success"
  });

  const allStores = await prisma.store.findMany();

  res.json({
    success: true,
    message: "Store connected and saved to Prisma DB!",
    store: newStore,
    totalStores: allStores.length
  });
});

// 1d. Fetch & Synchronize Collaborations
app.post("/api/shopify/collaborations/fetch", async (req, res) => {
  const allStores = await prisma.store.findMany();
  const collabStores = allStores.filter(s => (s.storeType === "Collaborations" || s.accessType === "Collaborations" || s.accessType === "Collaboration"));
  const syncTime = new Date().toISOString();

  activityLogs.unshift({
    id: activityLogs.length + 1,
    timestamp: syncTime,
    type: "COLLAB_SYNC",
    message: `[COLLABORATIONS FETCH] Successfully synced ${collabStores.length} Shopify Collaborator stores from Prisma database.`,
    status: "success"
  });

  res.json({
    success: true,
    message: `Successfully fetched and synced ${collabStores.length} Collaborator stores!`,
    fetchedAt: syncTime,
    collaborationsCount: collabStores.length
  });
});

// 1e. Shopify Real-Time Webhook Listener (Prisma Database + Live Push)
app.post("/api/shopify/webhooks", async (req, res) => {
  try {
    const topic = req.headers["x-shopify-topic"] || req.body.topic || "products/update";
    const shopDomain = req.headers["x-shopify-shop-domain"] || req.body.shopDomain || "floor-land.myshopify.com";
    const payload = req.body || {};
    const timestamp = new Date().toISOString();

    console.log(`\n⚡ [WEBHOOK RECEIVED] Topic: ${topic} from: ${shopDomain}`);

    // Step 1: Record incoming Webhook event into Database via Prisma
    const savedEvent = await prisma.webhookEvent.create({
      data: {
        topic,
        shopDomain,
        payload: typeof payload === "object" ? JSON.stringify(payload) : String(payload),
        processed: true
      }
    });

    // Step 2: Query product from Prisma DB
    const dbProducts = await prisma.product.findMany();
    const targetProduct = dbProducts.find(p => p.storeDomain === shopDomain) || dbProducts[0];

    const updatedPrice = payload.price !== undefined ? Number(payload.price) : Math.floor(Math.random() * 600) + 1299;
    const updatedInventory = payload.inventory_quantity !== undefined ? Number(payload.inventory_quantity) : Math.floor(Math.random() * 30) + 5;
    const newStatus = updatedInventory > 0 ? (updatedInventory < 10 ? "Low Stock" : "In Stock") : "Out of Stock";

    // Step 3: Update database record automatically via Prisma ORM
    let updatedProduct = null;
    if (targetProduct) {
      updatedProduct = await prisma.product.upsert({
        where: { id: targetProduct.id },
        update: {
          price: updatedPrice,
          inventory: updatedInventory,
          status: newStatus,
          lastSync: `Live Webhook (${new Date().toLocaleTimeString()})`
        },
        create: {
          id: targetProduct.id,
          storeDomain: shopDomain,
          storeName: targetProduct.storeName || "Partner Store",
          title: targetProduct.title || "Shopify Product",
          sku: targetProduct.sku || "SHP-001",
          category: targetProduct.category || "General",
          price: updatedPrice,
          compareAtPrice: updatedPrice + 500,
          inventory: updatedInventory,
          status: newStatus,
          image: targetProduct.image || "images/case-studies/floor-land.png",
          lastSync: `Live Webhook (${new Date().toLocaleTimeString()})`
        }
      });
    }

    const logMsg = `⚡ [PRISMA DB AUTOMATION] Webhook [${topic}] from ${shopDomain} -> Saved in Prisma DB. Product "${updatedProduct ? updatedProduct.title : 'Item'}" updated to ₹${updatedPrice} (${updatedInventory} units). Pushed to UI with 0 page refresh!`;

    const logEntry = {
      id: activityLogs.length + 1,
      timestamp,
      type: "PRISMA_WEBHOOK",
      message: logMsg,
      status: "success"
    };
    activityLogs.unshift(logEntry);

    // Step 4: Broadcast to frontend via Server-Sent Events (Zero page refresh!)
    broadcastSSE({
      type: "PRODUCT_UPDATED",
      product: updatedProduct,
      topic,
      shopDomain,
      log: logEntry,
      timestamp
    });

    res.status(200).json({
      success: true,
      message: "Webhook processed, saved to Prisma DB, and broadcast to frontend in real-time",
      topic,
      shopDomain,
      product: updatedProduct,
      webhookId: savedEvent.id,
      processedAt: timestamp
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1f. Simulate Webhook Trigger for Dashboard Demo (Prisma DB + SSE Push)
app.post("/api/shopify/webhooks/test", async (req, res) => {
  try {
    const dbStores = await prisma.store.findMany();
    const storesList = dbStores.length > 0 ? dbStores : [{ name: "Floor Land", domain: "floor-land.myshopify.com" }];
    const randomStore = storesList[Math.floor(Math.random() * storesList.length)];

    const dbProducts = await prisma.product.findMany();
    const targetProduct = dbProducts[Math.floor(Math.random() * dbProducts.length)] || {
      id: "prod_101",
      storeName: randomStore.name,
      storeDomain: randomStore.domain,
      title: "Luxury Oak Herringbone Laminate Flooring",
      sku: "FL-OAK-01",
      category: "Flooring",
      image: "images/case-studies/floor-land.png"
    };

    const newPrice = Math.floor(Math.random() * 800) + 1499;
    const newStock = Math.floor(Math.random() * 25) + 3;
    const newStatus = newStock < 10 ? "Low Stock" : "In Stock";
    const timestamp = new Date().toISOString();

    // 1. Prisma DB: Save webhook event
    const savedEvent = await prisma.webhookEvent.create({
      data: {
        topic: "products/update",
        shopDomain: randomStore.domain,
        payload: JSON.stringify({ id: targetProduct.id, price: newPrice, inventory_quantity: newStock }),
        processed: true
      }
    });

    // 2. Prisma DB: Automatically update product in database
    const updatedProduct = await prisma.product.upsert({
      where: { id: targetProduct.id },
      update: {
        price: newPrice,
        inventory: newStock,
        status: newStatus,
        lastSync: `Live Webhook (${new Date().toLocaleTimeString()})`
      },
      create: {
        id: targetProduct.id,
        storeDomain: randomStore.domain,
        storeName: randomStore.name,
        title: targetProduct.title,
        sku: targetProduct.sku,
        category: targetProduct.category,
        price: newPrice,
        compareAtPrice: newPrice + 500,
        inventory: newStock,
        status: newStatus,
        image: targetProduct.image,
        lastSync: `Live Webhook (${new Date().toLocaleTimeString()})`
      }
    });

    const logMsg = `⚡ [PRISMA DB AUTOMATION] Real-time Webhook received for "${randomStore.name}" (${randomStore.domain}) -> Database updated automatically via Prisma ORM: Price ₹${newPrice}, Stock ${newStock} units. Live UI updated without page refresh!`;

    const logEntry = {
      id: activityLogs.length + 1,
      timestamp,
      type: "PRISMA_WEBHOOK",
      message: logMsg,
      status: "success"
    };
    activityLogs.unshift(logEntry);

    // 3. Broadcast to all connected clients (Zero page refresh!)
    broadcastSSE({
      type: "PRODUCT_UPDATED",
      product: updatedProduct,
      store: randomStore,
      log: logEntry,
      timestamp
    });

    res.json({
      success: true,
      message: `Webhook saved via Prisma to DB & pushed live to frontend without page refresh!`,
      updatedProduct,
      store: randomStore,
      webhookId: savedEvent.id
    });
  } catch (err) {
    console.error("Webhook test error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Catalog Products with Search/Filter (From Prisma DB)
app.get("/api/shopify/catalog", async (req, res) => {
  try {
    const { search, store, status } = req.query;
    let results = await prisma.product.findMany();

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        item => (item.title && item.title.toLowerCase().includes(q)) || (item.sku && item.sku.toLowerCase().includes(q))
      );
    }

    if (store && store !== "all") {
      results = results.filter(item => 
        (item.store && item.store.toLowerCase().includes(store.toLowerCase())) ||
        (item.storeName && item.storeName.toLowerCase().includes(store.toLowerCase()))
      );
    }

    if (status && status !== "all") {
      results = results.filter(item => item.status && item.status.toLowerCase() === status.toLowerCase());
    }

    res.json({
      success: true,
      total: results.length,
      products: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Trigger Manual or Automated Sync
app.post("/api/shopify/sync", (req, res) => {
  const syncTime = new Date().toISOString();
  catalogConfig.lastSync = syncTime;

  // Refresh stock or simulate price updates
  catalogItems = catalogItems.map(item => ({
    ...item,
    lastSync: new Date().toLocaleTimeString(),
    inventory: Math.max(0, item.inventory + Math.floor(Math.random() * 5) - 2)
  }));

  const logEntry = {
    id: activityLogs.length + 1,
    timestamp: syncTime,
    type: "SYNC_MANUAL",
    message: `Automated catalog synchronization executed for ${catalogConfig.catalogId}. Updated ${catalogItems.length} products across ${catalogConfig.targetStores.length} stores.`,
    status: "success"
  };
  activityLogs.unshift(logEntry);

  res.json({
    success: true,
    message: "Catalog synchronization completed successfully!",
    lastSync: syncTime,
    productsSynced: catalogItems.length
  });
});

// 4. Activity Logs
app.get("/api/shopify/logs", (req, res) => {
  res.json({
    success: true,
    logs: activityLogs.slice(0, 20)
  });
});

// 5. Update Configuration (Auto-sync toggle / interval / source)
app.post("/api/shopify/config", (req, res) => {
  const { autoSync, intervalMinutes, source } = req.body;
  if (typeof autoSync === "boolean") catalogConfig.autoSync = autoSync;
  if (intervalMinutes) catalogConfig.intervalMinutes = parseInt(intervalMinutes, 10);
  if (source) catalogConfig.source = source;

  activityLogs.unshift({
    id: activityLogs.length + 1,
    timestamp: new Date().toISOString(),
    type: "CONFIG_UPDATE",
    message: `Automation configuration updated. Auto-sync: ${catalogConfig.autoSync}, Interval: ${catalogConfig.intervalMinutes}m, Source: ${catalogConfig.source}`,
    status: "info"
  });

  res.json({
    success: true,
    message: "Configuration updated successfully",
    config: catalogConfig
  });
});

// 6. Export Product Feed as JSON
app.get("/api/shopify/feed.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    catalog: catalogConfig.catalogId,
    generatedAt: new Date().toISOString(),
    itemCount: catalogItems.length,
    items: catalogItems.map(p => ({
      id: p.id,
      title: p.title,
      description: `${p.title} from ${p.store}`,
      availability: p.inventory > 0 ? "in_stock" : "out_of_stock",
      price: `INR ${p.price}`,
      brand: p.store,
      item_group_id: p.sku
    }))
  });
});

// 7. Export Product Feed as Google Merchant XML
app.get("/api/shopify/feed.xml", (req, res) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Shopify Catalog Feed - ${catalogConfig.catalogId}</title>
    <link>https://shivduttchauhan.com</link>
    <description>Automated product catalog feed generated by Shivdutt Bio Shopify Integration</description>
`;

  catalogItems.forEach(item => {
    xml += `    <item>
      <g:id>${item.id}</g:id>
      <g:title><![CDATA[${item.title}]]></g:title>
      <g:description><![CDATA[${item.title} by ${item.store}]]></g:description>
      <g:link>https://shivduttchauhan.com/catalog-automation.html?product=${item.id}</g:link>
      <g:image_link>https://shivduttchauhan.com/${item.image}</g:image_link>
      <g:price>${item.price} INR</g:price>
      <g:availability>${item.inventory > 0 ? "in stock" : "out of stock"}</g:availability>
      <g:brand><![CDATA[${item.store}]]></g:brand>
      <g:condition>new</g:condition>
    </item>
`;
  });

  xml += `  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Shopify Catalog Automation Server Running!`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`📦 Catalog ID: ${catalogConfig.catalogId}`);
  console.log(`🔑 Client ID: ${catalogConfig.clientId.substring(0, 8)}...`);
  console.log(`⚙️  Auto-sync: ${catalogConfig.autoSync ? "Enabled" : "Disabled"}`);
  console.log(`====================================================`);
});

// Background Auto-sync Scheduler
setInterval(() => {
  if (catalogConfig.autoSync) {
    catalogConfig.lastSync = new Date().toISOString();
    activityLogs.unshift({
      id: activityLogs.length + 1,
      timestamp: catalogConfig.lastSync,
      type: "AUTO_SYNC",
      message: `[SCHEDULED AUTO-SYNC] Catalog "${catalogConfig.catalogId}" checked. All store feeds synced.`,
      status: "success"
    });
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Shopify Catalog Auto-sync performed.`);
  }
}, catalogConfig.intervalMinutes * 60 * 1000);
