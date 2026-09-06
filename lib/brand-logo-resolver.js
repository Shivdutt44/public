/**
 * Brand media resolver.
 *
 * Resolves, for any Shopify store domain, the real media published by that
 * store: a square site icon, a wide brand logo, and a social preview image.
 * Every candidate is downloaded and checked before being returned, so a URL
 * that 404s (or serves Google's default globe) never reaches the database.
 *
 * Used both by the backfill script and by the "add store" API route, so a newly
 * connected store gets its real media without a manual step.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const localBrandLogos = {
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

const cache = new Map();

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function request(targetUrl, { maxRedirects = 5, maxBytes = 300000 } = {}) {
  return new Promise(resolve => {
    if (maxRedirects < 0) return resolve(null);
    let parsed;
    try { parsed = new URL(targetUrl); } catch { return resolve(null); }
    const mod = parsed.protocol === 'http:' ? http : https;
    const req = mod.get(targetUrl, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      timeout: 8000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let next;
        try { next = new URL(res.headers.location, targetUrl).href; } catch { return resolve(null); }
        return resolve(request(next, { maxRedirects: maxRedirects - 1, maxBytes }));
      }
      const chunks = [];
      let size = 0;
      res.on('data', c => {
        size += c.length;
        if (size <= maxBytes) chunks.push(c);
        else res.destroy();
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
  });
}

function absolutize(raw, base) {
  if (!raw) return null;
  const s = decodeEntities(String(raw).trim());
  if (!s || s.startsWith('data:')) return null;
  let href;
  try { href = new URL(s.startsWith('//') ? 'https:' + s : s, base).href; } catch { return null; }
  // The portfolio is served over https; an http asset would be blocked as
  // mixed content. Candidates are validated after this, so an https URL that
  // does not actually exist is simply discarded.
  return href.startsWith('http://') ? 'https://' + href.slice(7) : href;
}

// Shopify's CDN renders whatever size is asked for; stored favicons are often
// 32px, which looks blurry in the dashboard avatar.
function upscaleShopifyCdn(url, width) {
  if (!/cdn\.shopify\.com|\/cdn\/shop\//.test(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('height');
    u.searchParams.delete('crop');
    u.searchParams.set('width', String(width));
    return u.href;
  } catch { return url; }
}

function isRejectedAsset(url) {
  return /shopifycloud[^"']*favicon|0680\/3786\/9722/i.test(url);
}

async function isRealImage(url) {
  const res = await request(url, { maxBytes: 120000 });
  return !!(res && res.status === 200 && /^image\//i.test(res.type) && res.size >= 100);
}

function iconCandidates(html, baseUrl) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/rel=["']([^"']+)["']/i) || [])[1];
    if (!rel) continue;
    const r = rel.toLowerCase();
    if (!/(^|\s)(apple-touch-icon(-precomposed)?|icon|shortcut icon|fluid-icon|mask-icon)(\s|$)/.test(r)) continue;
    const abs = absolutize((tag.match(/href=["']([^"']+)["']/i) || [])[1], baseUrl);
    if (!abs || isRejectedAsset(abs)) continue;
    const sizeMatch = (tag.match(/sizes=["']([^"']+)["']/i) || [])[1];
    const size = sizeMatch ? parseInt((sizeMatch.match(/(\d+)/) || [])[1] || '0', 10) : 0;
    let score = r.includes('apple-touch-icon') ? 3000 : 1000;
    if (/\.svg(\?|$)/i.test(abs)) score += 500;
    if (/\.ico(\?|$)/i.test(abs)) score -= 800;
    out.push({ url: abs, score: score + size });
  }
  return out.sort((a, b) => b.score - a.score).map(c => c.url);
}

function metaContent(html, property) {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
  return m ? m[1] : null;
}

function logoCandidates(html, baseUrl) {
  const out = [];

  for (const tag of html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []) {
    try {
      const json = JSON.parse(tag.replace(/<script[^>]*>|<\/script>/gi, '').trim());
      for (const item of Array.isArray(json) ? json : [json]) {
        const l = item && item.logo && (typeof item.logo === 'string' ? item.logo : item.logo.url);
        const abs = absolutize(l, baseUrl);
        if (abs && !isRejectedAsset(abs)) out.push(abs);
      }
    } catch { /* listing markup is frequently malformed; skip it */ }
  }

  const header = html.match(/<img[^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo|main-logo)[^"']*["'][^>]+src=["']([^"']+)["']/i)
    || html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo|main-logo)[^"']*["']/i);
  const headerAbs = absolutize(header && header[1], baseUrl);
  if (headerAbs && !isRejectedAsset(headerAbs)) out.push(headerAbs);

  return out;
}

function generateBrandMonogram(name) {
  const cleaned = (name || 'Store').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  let initials = 'SB';
  if (parts.length === 1) {
    const uppers = parts[0].replace(/[^A-Z]/g, '');
    initials = uppers.length >= 2 ? uppers.slice(0, 2) : parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const palettes = [
    ['#4f46e5', '#7c3aed'], ['#2563eb', '#06b6d4'], ['#059669', '#10b981'],
    ['#d97706', '#f59e0b'], ['#e11d48', '#f43f5e'], ['#7c3aed', '#ec4899'],
    ['#ea580c', '#f97316'], ['#0284c7', '#38bdf8'], ['#4338ca', '#6366f1'],
    ['#0f766e', '#14b8a6']
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const [c1, c2] = palettes[Math.abs(hash) % palettes.length];
  const gradId = `bg_${Math.abs(hash)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#${gradId})"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1.5">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

async function firstRealImage(candidates, width) {
  const seen = new Set();
  for (const raw of candidates) {
    if (!raw) continue;
    const url = upscaleShopifyCdn(raw, width);
    if (seen.has(url)) continue;
    seen.add(url);
    if (await isRealImage(url)) return url;
  }
  return null;
}

/**
 * @returns {{domain, name, logo, icon, preview, favicon, finalUrl, source}}
 *          `icon` is null when the store publishes no usable icon, which lets
 *          callers fall back to a generated monogram rather than a broken image.
 */
async function resolveStoreIdentity(domain, name = '', siteUrl = null) {
  const cleanDomain = String(domain).toLowerCase().trim();
  const cacheKey = `${cleanDomain}|${siteUrl || ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const base = siteUrl || `https://${cleanDomain}`;
  const page = await request(base);
  const finalUrl = page && page.url ? page.url : base;
  const origin = (() => { try { return new URL(finalUrl).origin; } catch { return base; } })();
  const html = page && page.status === 200 && /html/i.test(page.type) ? page.body.toString('utf-8') : '';

  const icon = await firstRealImage(
    [...iconCandidates(html, finalUrl), `${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`],
    192
  );

  const preview = await firstRealImage(
    [metaContent(html, 'og:image'), metaContent(html, 'twitter:image')].map(v => absolutize(v, finalUrl)),
    1200
  );

  const mappedLocal = localBrandLogos[cleanDomain] || null;
  const liveLogo = mappedLocal ? null : await firstRealImage(logoCandidates(html, finalUrl), 600);

  const logo = mappedLocal || liveLogo || icon || preview || generateBrandMonogram(name || cleanDomain);

  const result = {
    domain: cleanDomain,
    name,
    logo,
    icon,
    preview,
    favicon: icon,
    finalUrl,
    source: mappedLocal ? 'local-asset' : (liveLogo ? 'live-logo' : (icon ? 'live-icon' : (preview ? 'og-image' : 'monogram')))
  };

  cache.set(cacheKey, result);
  return result;
}

module.exports = {
  resolveStoreIdentity,
  generateBrandMonogram
};
