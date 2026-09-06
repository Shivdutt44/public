/**
 * Downloads the real Shopify App Store listing screenshots for every app in the
 * database and records them on the app record.
 *
 * Listing media lives under an id that matches the app's apiKey, which is how
 * screenshots belonging to *this* app are told apart from the "related apps"
 * thumbnails on the same page.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const MEDIA_ROOT = path.join(__dirname, '..', 'public', 'images', 'apps');
const DB_PATH = path.join(__dirname, '..', 'prisma', 'dev.db.json');

const decode = s => s.replace(/&amp;/g, '&').replace(/&#38;/g, '&');

function get(url, maxRedirects = 5) {
  return new Promise(resolve => {
    if (maxRedirects < 0) return resolve(null);
    const req = https.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).href, maxRedirects - 1));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        type: res.headers['content-type'] || '',
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function extractScreenshots(html, listingId) {
  const all = html.match(/https:\/\/cdn\.shopify\.com\/app-store\/listing_images\/[^"'\\ )]+/g) || [];
  const mine = all.map(decode).filter(u => u.includes(`/listing_images/${listingId}/`) && u.includes('/desktop_screenshot/'));

  // The same screenshot is offered at several widths; keep one entry per image
  // and request a crisp-but-reasonable 1600px render.
  const byImage = new Map();
  for (const url of mine) {
    const key = url.split('?')[0];
    if (!byImage.has(key)) byImage.set(key, `${key}?height=900&width=1600`);
  }
  return [...byImage.values()];
}

async function run() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const apps = db.apps || [];
  console.log(`Fetching real listing media for ${apps.length} apps...\n`);

  for (const app of apps) {
    if (!app.appStoreUrl || !app.apiKey) {
      console.log(`[skip] ${app.name} — no listing URL or listing id`);
      continue;
    }

    const page = await get(app.appStoreUrl);
    if (!page || page.status !== 200) {
      console.log(`[fail] ${app.name} — listing returned ${page ? page.status : 'no response'}`);
      continue;
    }

    const shots = extractScreenshots(page.body.toString('utf-8'), app.apiKey);
    if (!shots.length) {
      console.log(`[none] ${app.name} — no desktop screenshots on listing`);
      continue;
    }

    const dir = path.join(MEDIA_ROOT, app.handle);
    fs.mkdirSync(dir, { recursive: true });

    const saved = [];
    for (let i = 0; i < shots.length; i++) {
      const img = await get(shots[i]);
      if (!img || img.status !== 200 || !/^image\//.test(img.type)) {
        console.log(`   ! screenshot ${i + 1} failed`);
        continue;
      }
      const ext = img.type.includes('jpeg') ? 'jpg' : 'png';
      const file = `screenshot${saved.length + 1}.${ext}`;
      fs.writeFileSync(path.join(dir, file), img.body);
      saved.push(`images/apps/${app.handle}/${file}`);
    }

    if (saved.length) {
      app.screenshots = saved;
      app.heroImage = saved[0];
      console.log(`[ok]   ${app.name} — ${saved.length} real screenshots`);
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log('\nprisma/dev.db.json updated with real listing media.');
}

run();
