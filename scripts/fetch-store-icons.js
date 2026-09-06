/**
 * Backfills real media (square site icon + social preview) for every store in
 * stores.json using the same resolver the "add store" API route runs, so
 * existing stores end up with exactly what a newly connected store would get.
 */

const fs = require('fs');
const path = require('path');
const { resolveStoreIdentity } = require('../lib/brand-logo-resolver');

const decodeEntities = s => String(s).replace(/&amp;/g, '&').replace(/&#38;/g, '&');

async function run() {
  const storesPath = path.join(__dirname, '..', 'stores.json');
  const stores = JSON.parse(fs.readFileSync(storesPath, 'utf-8'));
  console.log(`Resolving real media for ${stores.length} stores...\n`);

  const stats = {};
  const BATCH = 6;
  for (let i = 0; i < stores.length; i += BATCH) {
    await Promise.all(stores.slice(i, i + BATCH).map(async s => {
      if (s.logo && s.logo.includes('&amp;')) s.logo = decodeEntities(s.logo);

      const identity = await resolveStoreIdentity(s.domain, s.name, s.url);
      stats[identity.source] = (stats[identity.source] || 0) + 1;

      if (identity.icon) s.icon = identity.icon; else delete s.icon;
      if (identity.preview) s.preview = identity.preview; else delete s.preview;
      if (identity.logo) s.logo = identity.logo;
      if (identity.finalUrl) s.url = identity.finalUrl;

      console.log(`[${identity.source}] ${s.name} => icon:${identity.icon ? 'yes' : 'no'} preview:${identity.preview ? 'yes' : 'no'}`);
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
      if (src.preview) row.preview = src.preview; else delete row.preview;
      if (src.logo) row.logo = src.logo;
      if (src.url) row.url = src.url;
    }
    fs.writeFileSync(devDbPath, JSON.stringify(devDb, null, 2), 'utf-8');
    console.log('prisma/dev.db.json updated.');
  }

  console.log('\nSources:', stats);
}

run();
