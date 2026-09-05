/**
 * Script to import all stores from a Shopify Partner Export CSV or Partner API
 * Usage:
 *   1. Drop your Shopify Partner stores export CSV into the project as `stores.csv`
 *   2. Run: node scripts/import-stores.js
 */

const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "stores.csv");
const serverJsPath = path.join(__dirname, "..", "server.js");

if (!fs.existsSync(csvPath)) {
  console.log("====================================================");
  console.log("ℹ️  HOW TO GET ALL YOUR COLLABORATOR STORES:");
  console.log("1. Go to https://partners.shopify.com");
  console.log("2. Click 'Stores' in the left sidebar");
  console.log("3. Click 'Managed' (Collaborations) tab");
  console.log("4. Click 'Export' at the top right to download CSV");
  console.log("5. Save that file here as: stores.csv");
  console.log("6. Run this script again: node scripts/import-stores.js");
  console.log("====================================================");
  process.exit(0);
}

try {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  console.log(`Found ${lines.length - 1} stores in stores.csv. Importing...`);
  // Parse and display
} catch (e) {
  console.error("Error reading stores.csv:", e.message);
}
