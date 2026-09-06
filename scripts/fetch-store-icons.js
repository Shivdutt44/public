/**
 * Resolves the real square site icon (favicon / apple-touch-icon) for every store
 * in stores.json and writes it to the `icon` field.
 *
 * Wide brand wordmarks look bad in the dashboard's square avatar, so this
 * deliberately prefers icon-shaped assets over header logos.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function request(targetUrl, { method = 'GET', maxRedirects = 5, maxBytes = 300000 } = {}) {
  return new Promise(resolve => {
    if (maxRedirects < 0) return resolve(null);
    let parsed;
    try { parsed = new URL(targetUrl); } catch { return resolve(null); }
    const mod = parsed.protocol === 'http:' ? http : https;
    const req = mod.request(targetUrl, {
      method,
      headers: { 'User-Agent': UA, Accept: '*/*' },
      timeout: 8000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let next;
        try { next = new URL(res.headers.location, targetUrl).href; } catch { return resolve(null); }
        return resolve(request(next, { method, maxRedirects: maxRedirects - 1, maxBytes }));
      }
      const chunks = [];
      let size = 0;
      res.on('data', c => {
        size += c.length;
        if (size <= maxBytes) chunks.push(c);
        if (size > maxBytes) res.destroy();
      });
      res.on('close', () => resolve({
        url: targetUrl,
        status: res.statusCode,
        type: res.headers['content-type'] || '',
        size,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function absolutize(raw, base) {
  if (!raw) return null;
  let s = decodeEntities(raw.trim());
  if (!s) return null;
  if (s.startsWith('data:')) return null;
  if (s.startsWith('//')) s = 'https:' + s;
  try { return new URL(s, base).href; } catch { return null; }
}

// Shopify CDN serves whatever width you ask for; small favicons upscale poorly otherwise.
function upscaleShopifyCdn(url) {
  if (!/cdn\.shopify\.com|\/cdn\/shop\//.test(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('height');
    u.searchParams.delete('crop');
    u.searchParams.set('width', '192');
    return u.href;
  } catch { return url; }
}

function isRejectedIcon(url) {
  return /shopifycloud\/(?:shopify\/assets\/)?storefront\/assets\/favicon|shopifycloud.*favicon|0680\/3786\/9722/i.test(url);
}

function parseSizes(attr) {
  if (!attr) return 0;
  const m = attr.match(/(\d+)\s*[xX]\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function extractIconCandidates(html, baseUrl) {
  const out = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = (tag.match(/rel=["']([^"']+)["']/i) || [])[1];
    if (!rel) continue;
    const r = rel.toLowerCase();
    if (!/(^|\s)(apple-touch-icon(-precomposed)?|icon|shortcut icon|fluid-icon|mask-icon)(\s|$)/.test(r)) continue;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    const abs = absolutize(href, baseUrl);
    if (!abs || isRejectedIcon(abs)) continue;
    const size = parseSizes((tag.match(/sizes=["']([^"']+)["']/i) || [])[1]);
    // apple-touch-icon is typically 180x180 and designed to look good standalone
    let score = r.includes('apple-touch-icon') ? 3000 : 1000;
    if (/\.svg(\?|$)/i.test(abs)) score += 500;
    if (/\.ico(\?|$)/i.test(abs)) score -= 800;
    out.push({ url: abs, score: score + size });
  }
  return out.sort((a, b) => b.score - a.score).map(c => c.url);
}

async function validateImage(url) {
  const res = await request(url, { maxBytes: 120000 });
  if (!res || res.status !== 200) return false;
  if (!/^image\//i.test(res.type)) return false;
  if (res.size < 100) return false;
  return true;
}

async function resolveIcon(domain, siteUrl) {
  const base = siteUrl || `https://${domain}`;
  const page = await request(base);
  const candidates = [];

  if (page && page.status === 200 && /html/i.test(page.type)) {
    const html = page.body.toString('utf-8');
    candidates.push(...extractIconCandidates(html, page.url));
  }

  const origin = (() => {
    try { return new URL(page && page.url ? page.url : base).origin; } catch { return base; }
  })();
  candidates.push(`${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`);

  const seen = new Set();
  for (const raw of candidates) {
    const url = upscaleShopifyCdn(raw);
    if (seen.has(url)) continue;
    seen.add(url);
    if (await validateImage(url)) {
      return { icon: url, source: raw.includes('apple-touch-icon') ? 'apple-touch-icon' : 'site-icon' };
    }
  }

  const host = (() => { try { return new URL(origin).hostname; } catch { return domain; } })();
  const google = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  if (await validateImage(google)) return { icon: google, source: 'google-favicon' };

  return { icon: null, source: 'none' };
}

async function run() {
  const storesPath = path.join(__dirname, '..', 'stores.json');
  const stores = JSON.parse(fs.readFileSync(storesPath, 'utf-8'));
  console.log(`Resolving real site icons for ${stores.length} stores...\n`);

  const stats = {};
  const BATCH = 6;
  for (let i = 0; i < stores.length; i += BATCH) {
    const batch = stores.slice(i, i + BATCH);
    await Promise.all(batch.map(async s => {
      // Repair HTML entities left in previously scraped logo URLs.
      if (s.logo && s.logo.includes('&amp;')) s.logo = decodeEntities(s.logo);

      const { icon, source } = await resolveIcon(s.domain, s.url);
      stats[source] = (stats[source] || 0) + 1;
      if (icon) s.icon = icon;
      else delete s.icon;
      console.log(`[${source}] ${s.name} => ${icon || 'monogram fallback'}`);
    }));
    console.log(`-- ${Math.min(i + BATCH, stores.length)}/${stores.length}`);
  }

  fs.writeFileSync(storesPath, JSON.stringify(stores, null, 2), 'utf-8');
  console.log('\nstores.json updated.');

  const devDbPath = path.join(__dirname, '..', 'prisma', 'dev.db.json');
  if (fs.existsSync(devDbPath)) {
    const devDb = JSON.parse(fs.readFileSync(devDbPath, 'utf-8'));
    const byDomain = new Map(stores.map(s => [s.domain, s]));
    for (const row of devDb.stores || []) {
      const src = byDomain.get(row.domain);
      if (!src) continue;
      if (src.icon) row.icon = src.icon; else delete row.icon;
      if (src.logo) row.logo = src.logo;
    }
    fs.writeFileSync(devDbPath, JSON.stringify(devDb, null, 2), 'utf-8');
    console.log('prisma/dev.db.json updated.');
  }

  console.log('\nSources:', stats);
}

run();
