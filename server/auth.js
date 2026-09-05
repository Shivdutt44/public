import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { readWithFallback, dualWrite } from './db.js';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const COOKIE_NAME = 'admin_token';

export async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const rows = await readWithFallback(
    'SELECT id FROM admin_users WHERE username = ?',
    [username]
  );
  if (rows.length > 0) return;

  const hash = await bcrypt.hash(password, 10);
  await dualWrite(
    'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
    [username, hash]
  );
  console.log(`Admin user "${username}" created.`);
}

export async function verifyLogin(username, password) {
  const rows = await readWithFallback(
    'SELECT username, password_hash FROM admin_users WHERE username = ?',
    [username]
  );
  if (rows.length === 0) return false;
  return bcrypt.compare(password, rows[0].password_hash);
}

export function issueToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function getAuthedUsername(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.username;
  } catch {
    return null;
  }
}

export function requireAdmin(req, res, next) {
  const username = getAuthedUsername(req);
  if (!username) return res.status(401).json({ error: 'Not authenticated' });
  req.adminUsername = username;
  next();
}
