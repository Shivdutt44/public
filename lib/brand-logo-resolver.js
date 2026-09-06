/**
 * Brand Logo & Favicon Dynamic Resolver
 * Automatically resolves authentic Shopify store logos and favicons
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

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

function fetchHtml(targetUrl, maxRedirects = 5) {
  return new Promise(resolve => {
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
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redir = new URL(res.headers.location, targetUrl).href;
          return resolve(fetchHtml(redir, maxRedirects - 1));
        }
        let data = '';
        res.on('data', c => {
          data += c;
          if (data.length > 250000) res.destroy();
        });
        res.on('close', () => resolve({ finalUrl: targetUrl, html: data }));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch(e) { resolve(null); }
  });
}

function cleanUrl(raw, base) {
  if (!raw) return null;
  let s = raw.trim();
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('http://')) return 'https://' + s.slice(7);
  if (s.startsWith('/')) return new URL(s, base).href;
  return s;
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
    ['#4f46e5', '#7c3aed'],
    ['#2563eb', '#06b6d4'],
    ['#059669', '#10b981'],
    ['#d97706', '#f59e0b'],
    ['#e11d48', '#f43f5e'],
    ['#7c3aed', '#ec4899'],
    ['#ea580c', '#f97316'],
    ['#0284c7', '#38bdf8'],
    ['#4338ca', '#6366f1'],
    ['#0f766e', '#14b8a6']
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const [c1, c2] = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="bg_${encodeURIComponent(initials)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#bg_${encodeURIComponent(initials)})"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1.5">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

async function resolveStoreIdentity(domain, name = '') {
  const cleanDomain = domain.toLowerCase().trim();
  if (cache.has(cleanDomain)) {
    return cache.get(cleanDomain);
  }

  // 1. Check local mapped brand assets
  if (localBrandLogos[cleanDomain]) {
    const result = {
      domain: cleanDomain,
      name,
      logo: localBrandLogos[cleanDomain],
      favicon: localBrandLogos[cleanDomain],
      finalUrl: `https://${cleanDomain}`,
      source: 'local-asset'
    };
    cache.set(cleanDomain, result);
    return result;
  }

  // 2. Fetch live store with redirect follow
  const page = await fetchHtml(`https://${cleanDomain}`);
  if (!page || !page.html) {
    const fallbackLogo = generateBrandMonogram(name || cleanDomain);
    const result = {
      domain: cleanDomain,
      name,
      logo: fallbackLogo,
      favicon: fallbackLogo,
      finalUrl: `https://${cleanDomain}`,
      source: 'generated-monogram'
    };
    cache.set(cleanDomain, result);
    return result;
  }

  const { finalUrl, html } = page;
  let logo = null;
  let favicon = null;

  // JSON-LD official store logo
  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      try {
        const text = tag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : [data];
        for (const item of list) {
          if (item.logo) {
            const l = typeof item.logo === 'string' ? item.logo : item.logo.url;
            if (l && !l.includes('0680/3786/9722') && !l.includes('shopifycloud')) {
              logo = cleanUrl(l, finalUrl);
              break;
            }
          }
        }
      } catch(e) {}
      if (logo) break;
    }
  }

  // Header logo
  if (!logo) {
    const headerMatch = html.match(/<img[^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo)[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
                        html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:header__heading-logo|site-header__logo|header-logo)[^"']*["']/i);
    if (headerMatch && !headerMatch[1].includes('0680/3786/9722') && !headerMatch[1].includes('shopifycloud')) {
      logo = cleanUrl(headerMatch[1], finalUrl);
    }
  }

  // Apple Touch Icon (high-res 180x180 PNG)
  const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i) ||
                     html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["']/i);
  if (appleMatch && !appleMatch[1].includes('shopifycloud')) {
    favicon = cleanUrl(appleMatch[1], finalUrl);
  }

  // Standard Favicon
  if (!favicon) {
    const favMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                     html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (favMatch && !favMatch[1].includes('shopifycloud')) {
      favicon = cleanUrl(favMatch[1], finalUrl);
    }
  }

  // OpenGraph Image
  if (!logo) {
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && !ogMatch[1].includes('shopifycloud')) {
      logo = cleanUrl(ogMatch[1], finalUrl);
    }
  }

  const finalLogo = logo || favicon || generateBrandMonogram(name || cleanDomain);
  const finalFavicon = favicon || finalLogo;

  const result = {
    domain: cleanDomain,
    name,
    logo: finalLogo,
    favicon: finalFavicon,
    finalUrl,
    source: logo ? 'live-logo' : (favicon ? 'live-favicon' : 'monogram')
  };

  cache.set(cleanDomain, result);
  return result;
}

module.exports = {
  resolveStoreIdentity,
  generateBrandMonogram
};
