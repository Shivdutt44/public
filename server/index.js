import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { tidbPool, mysqlPool, ensureSchema, readWithFallback, dualWrite } from './db.js';
import {
  ensureAdminUser,
  verifyLogin,
  issueToken,
  setAuthCookie,
  clearAuthCookie,
  getAuthedUsername,
  requireAdmin,
} from './auth.js';

const app = express();
app.use(cors({ origin: process.env.SITE_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ---------- Contact form ----------

const INSERT_CONTACT_SQL =
  'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)';

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email and message are required' });
  }
  const { primaryOk, secondaryOk } = await dualWrite(INSERT_CONTACT_SQL, [
    name,
    email,
    subject || null,
    message,
  ]);
  if (!primaryOk && !secondaryOk) {
    return res.status(500).json({ error: 'Failed to save message to either database' });
  }
  res.status(201).json({ ok: true, primaryOk, secondaryOk });
});

// ---------- Admin auth ----------

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const ok = await verifyLogin(username, password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = issueToken(username);
  setAuthCookie(res, token);
  res.json({ ok: true, username });
});

app.post('/api/admin/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const username = getAuthedUsername(req);
  res.json({ loggedIn: Boolean(username), username: username || null });
});

// ---------- Page content (click-to-edit) ----------

app.get('/api/content/:page', async (req, res) => {
  const rows = await readWithFallback(
    'SELECT element_key, content_type, content_value FROM site_content WHERE page = ?',
    [req.params.page]
  );
  const content = {};
  for (const row of rows) {
    content[row.element_key] = { type: row.content_type, value: row.content_value };
  }
  res.json(content);
});

app.put('/api/content/:page', requireAdmin, async (req, res) => {
  const { updates } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates array is required' });
  }
  const results = [];
  for (const update of updates) {
    const { elementKey, type, value } = update || {};
    if (!elementKey || !type) continue;
    const result = await dualWrite(
      `INSERT INTO site_content (page, element_key, content_type, content_value)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content_type = VALUES(content_type), content_value = VALUES(content_value)`,
      [req.params.page, elementKey, type, value ?? null]
    );
    results.push({ elementKey, ...result });
  }
  res.json({ ok: true, results });
});

// ---------- Global theme ----------

app.get('/api/theme', async (_req, res) => {
  const rows = await readWithFallback('SELECT setting_key, setting_value FROM site_theme');
  const theme = {};
  for (const row of rows) theme[row.setting_key] = row.setting_value;
  res.json(theme);
});

app.put('/api/theme', requireAdmin, async (req, res) => {
  const { updates } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates array is required' });
  }
  const results = [];
  for (const update of updates) {
    const { settingKey, value } = update || {};
    if (!settingKey) continue;
    const result = await dualWrite(
      `INSERT INTO site_theme (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [settingKey, value ?? null]
    );
    results.push({ settingKey, ...result });
  }
  res.json({ ok: true, results });
});

// ---------- Health ----------

app.get('/api/health', async (_req, res) => {
  const status = { tidb: false, mysql: false };
  try { await tidbPool.query('SELECT 1'); status.tidb = true; } catch {}
  try { await mysqlPool.query('SELECT 1'); status.mysql = true; } catch {}
  res.json(status);
});

const port = process.env.PORT || 5000;

ensureSchema()
  .then(() => ensureAdminUser())
  .catch((err) => console.error('Startup warning:', err.message))
  .finally(() => {
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  });
