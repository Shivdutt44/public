/**
 * Automated Dynamic Brand Logo & Favicon Extraction
 * 
 * Automatically resolves the authentic original brand logo and live favicon
 * for any Shopify store domain by following redirects and extracting:
 *  1. JSON-LD structured schema official store logo
 *  2. Theme header logo
 *  3. Shopify CDN files (/cdn/shop/files/)
 *  4. Apple touch icon (high-res 180x180 PNG)
 *  5. Custom live favicon
 *  6. Tailored brand monogram avatar for password/inactive stores
 */

const { resolveStoreIdentity } = require('../lib/brand-logo-resolver');

async function testAutomatedLogoExtraction() {
  console.log('🚀 Testing Dynamic & Automated Brand Logo / Favicon Extraction...\n');

  const testStores = [
    { name: "Divya's Naturals", domain: 'divya-naturals.myshopify.com' },
    { name: 'Everyday Hale', domain: 'percybaker.myshopify.com' },
    { name: 'SEA-SHIELD Polishes and Coatings', domain: 'sea-shield.myshopify.com' },
    { name: 'Incense Hub Co', domain: 'incensehub.in' },
    { name: 'Dhoop Chaon & Co', domain: 'dhoopchaon.co.in' },
    { name: 'Floor Land', domain: 'floor-land.myshopify.com' },
    { name: 'Herwaytofreedom', domain: 'v9ky5u-fq.myshopify.com' }
  ];

  for (const store of testStores) {
    const identity = await resolveStoreIdentity(store.domain, store.name);
    console.log(`[Store] ${store.name} (${store.domain})`);
    console.log(`  Source:   ${identity.source}`);
    console.log(`  Logo:     ${identity.logo.substring(0, 95)}...`);
    console.log(`  Favicon:  ${identity.favicon.substring(0, 95)}...`);
    console.log(`  Final URL: ${identity.finalUrl}\n`);
  }

  console.log('✅ Automated logo & favicon resolution completed successfully!');
}

testAutomatedLogoExtraction();
