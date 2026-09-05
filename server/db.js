import mysql from 'mysql2/promise';
import 'dotenv/config';

// TiDB Cloud Serverless — primary store. Requires TLS.
export const tidbPool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: Number(process.env.TIDB_PORT) || 4000,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE || 'Shivdutt_Biography',
  ssl: { minVersion: 'TLSv1.2' },
  waitForConnections: true,
  connectionLimit: 5,
});

// Local MySQL — secondary/backup store.
export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'Shivdutt_Biography',
  waitForConnections: true,
  connectionLimit: 5,
});

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS site_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page VARCHAR(100) NOT NULL,
    element_key VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content_value MEDIUMTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY page_element (page, element_key)
  )`,
  `CREATE TABLE IF NOT EXISTS site_theme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
];

export async function ensureSchema() {
  for (const sql of CREATE_TABLES_SQL) {
    await tidbPool.query(sql);
    await mysqlPool.query(sql);
  }
}

// Reads go to TiDB (primary) first; fall back to MySQL if TiDB is unreachable
// so the public site never breaks on a primary outage.
export async function readWithFallback(sql, params = []) {
  try {
    const [rows] = await tidbPool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('[TiDB primary] read failed, falling back to MySQL:', err.message);
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  }
}

// Writes go to both stores; TiDB is primary, MySQL is best-effort backup.
export async function dualWrite(sql, params = []) {
  let primaryOk = false;
  let secondaryOk = false;
  try {
    await tidbPool.execute(sql, params);
    primaryOk = true;
  } catch (err) {
    console.error('[TiDB primary] write failed:', err.message);
  }
  try {
    await mysqlPool.execute(sql, params);
    secondaryOk = true;
  } catch (err) {
    console.error('[MySQL secondary] write failed:', err.message);
  }
  return { primaryOk, secondaryOk };
}
