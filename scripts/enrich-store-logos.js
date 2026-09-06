const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const knownBrandLogos = {
  "floor-land.myshopify.com": "images/case-studies/floor-land.png",
  "cycle-pure.myshopify.com": "images/case-studies/cycle.png",
  "haridarshan.myshopify.com": "images/case-studies/hari-darshan.png",
  "iris-fragrance.myshopify.com": "images/case-studies/iris.png",
  "jupra-store.myshopify.com": "images/case-studies/jupra.png",
  "liberty1947.myshopify.com": "images/case-studies/liberty1947.png",
  "peekintonature.myshopify.com": "images/case-studies/peek-into-nature.png",
  "probuilder-tool.myshopify.com": "images/case-studies/probuilder-tool.png",
  "vedist-organic.myshopify.com": "images/case-studies/vedist-organic.png",
  "zerodrops-safety.myshopify.com": "images/case-studies/zerodrops.png",
  "2k1t00-32.myshopify.com": "images/case-studies/zerodrops.png",
  "consciouschemist.myshopify.com": "images/clients-real/conscious-chemist.png",
  "jamara-home.myshopify.com": "images/clients-real/jamara-home.png",
  "mhyk-designer.myshopify.com": "images/clients-real/mhyk.png",
  "nayla-jewelry.myshopify.com": "images/clients-real/nayla-jewelry.png",
  "suigenris-fashions.myshopify.com": "images/clients-real/suigenris.png"
};

function fetchWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) return resolve(null);
    try {
      const parsed = new URL(targetUrl);
      const mod = parsed.protocol === 'http:' ? http : https;
      const req = mod.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 5000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).href;
          return resolve(fetchWithRedirects(redirectUrl, maxRedirects - 1));
        }
        let body = '';
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 250000) res.destroy();
        });
        res.on('close', () => resolve({ url: targetUrl, body, statusCode: res.statusCode }));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}

function cleanLogoUrl(rawUrl, baseUrl) {
  if (!rawUrl) return null;
  let clean = rawUrl.trim();
  if (clean.startsWith('//')) clean = 'https:' + clean;
  else if (clean.startsWith('http://')) clean = 'https://' + clean.slice(7);
  else if (clean.startsWith('/')) clean = new URL(clean, baseUrl).href;
  return clean;
}

function isBadLogo(url) {
  if (!url) return true;
  if (url.includes('0680/3786/9722')) return true; // generic app/agency badge
  if (url.includes('shopifycloud/storefront/assets/favicon')) return true; // default shopify placeholder favicon
  if (url.includes('shopifycloud')) return true;
  return false;
}

async function fetchBrandLogo(domain) {
  const targetUrl = `https://${domain}`;
  const page = await fetchWithRedirects(targetUrl);
  if (!page || !page.body) {
    return {
      url: targetUrl,
      logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      type: 'google-favicon'
    };
  }

  const finalUrl = page.url;
  const parsedFinal = new URL(finalUrl);
  const hostname = parsedFinal.hostname;
  const body = page.body;

  // Ordered patterns for finding the REAL brand logo
  const logoPatterns = [
    // Header heading logo specifically
    /<img[^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo|main-logo)[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo|main-logo)[^"']*["']/i,
    // Store image matching logo or brand in files
    /<img[^>]+src=["']([^"']*(?:cdn\/shop\/files\/[^"']*(?:logo|brand|transparent)[^"']*))["']/i,
    /<img[^>]+src=["']([^"']*(?:cdn\.shopify\.com\/s\/files\/[^"']*(?:logo|brand|transparent)[^"']*))["']/i,
    // og:image (rich open graph social share preview)
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    // Apple touch icon (high resolution 180x180 png)
    /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i,
    // Store favicon
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
  ];

  for (const pattern of logoPatterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const cleaned = cleanLogoUrl(match[1], finalUrl);
      if (!isBadLogo(cleaned)) {
        return { url: finalUrl, logo: cleaned, type: 'matched' };
      }
    }
  }

  const effectiveHost = hostname === 'myshopify.com' || hostname.endsWith('.myshopify.com') ? domain : hostname;
  return {
    url: finalUrl,
    logo: `https://www.google.com/s2/favicons?domain=${effectiveHost}&sz=128`,
    type: 'google-favicon'
  };
}

async function run() {
  const storesPath = path.join(__dirname, '..', 'stores.json');
  const stores = JSON.parse(fs.readFileSync(storesPath, 'utf-8'));
  console.log(`Starting original brand logo fetch for all ${stores.length} stores...\n`);

  const BATCH_SIZE = 6;
  for (let i = 0; i < stores.length; i += BATCH_SIZE) {
    const batch = stores.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (s) => {
      if (knownBrandLogos[s.domain]) {
        s.logo = knownBrandLogos[s.domain];
        s.url = s.url || `https://${s.domain}`;
        console.log(`[Known Brand] ${s.name} => ${s.logo}`);
      } else {
        try {
          const res = await fetchBrandLogo(s.domain);
          s.logo = res.logo;
          s.url = res.url || `https://${s.domain}`;
          console.log(`[${res.type}] ${s.name} => ${s.logo}`);
        } catch (err) {
          s.logo = `https://www.google.com/s2/favicons?domain=${s.domain}&sz=128`;
          s.url = `https://${s.domain}`;
          console.log(`[Fallback] ${s.name} => ${s.logo}`);
        }
      }
    }));
    process.stdout.write(`Progress: ${Math.min(i + BATCH_SIZE, stores.length)}/${stores.length}\n`);
  }

  console.log(`\nSuccessfully fetched all brand logos!`);
  console.log(`Writing to stores.json...`);
  fs.writeFileSync(storesPath, JSON.stringify(stores, null, 2), 'utf-8');

  // Also update prisma/dev.db.json
  const devDbPath = path.join(__dirname, '..', 'prisma', 'dev.db.json');
  if (fs.existsSync(devDbPath)) {
    try {
      const devDb = JSON.parse(fs.readFileSync(devDbPath, 'utf-8'));
      devDb.stores = stores;
      fs.writeFileSync(devDbPath, JSON.stringify(devDb, null, 2), 'utf-8');
      console.log(`✅ prisma/dev.db.json updated with real brand logos!`);
    } catch(e) {
      console.error(`Error updating dev.db.json:`, e.message);
    }
  }
}

run();
