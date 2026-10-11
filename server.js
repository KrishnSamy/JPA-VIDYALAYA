'use strict';
/**
 * JPA Vidyalaya Matric School — website + admin panel
 * Zero-dependency Node.js server (Node >= 22.13): http + node:sqlite + crypto.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const site = require('./views/site');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SECURE_COOKIE = process.env.SECURE_COOKIE === '1'; // set to 1 when served over HTTPS
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

/* ───────────────────────── Database ───────────────────────── */
const db = new DatabaseSync(path.join(DATA_DIR, 'school.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS slides (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')), important INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')), location TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'General',
  image TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '', grp TEXT NOT NULL DEFAULT 'Management', sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '⭐', sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Parent',
  message TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL DEFAULT 'contact', name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', class_applying TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_inq_status ON inquiries(status, created_at);
`);

/** Editable resources: public site content managed through the admin panel. */
const RES = {
  slides:       { cols: ['title', 'subtitle', 'image', 'link', 'sort', 'active'], ints: ['sort', 'active'], req: ['image'], order: 'sort, id' },
  notices:      { cols: ['title', 'body', 'date', 'important', 'active'], ints: ['important', 'active'], req: ['title'], order: 'important DESC, date DESC, id DESC' },
  events:       { cols: ['title', 'description', 'date', 'location', 'image', 'active'], ints: ['active'], req: ['title', 'date'], order: 'date DESC, id DESC' },
  gallery:      { cols: ['title', 'category', 'image', 'sort', 'active'], ints: ['sort', 'active'], req: ['image'], order: 'sort, id DESC' },
  staff:        { cols: ['name', 'role', 'bio', 'photo', 'grp', 'sort', 'active'], ints: ['sort', 'active'], req: ['name'], order: 'grp, sort, id' },
  activities:   { cols: ['title', 'description', 'image', 'sort', 'active'], ints: ['sort', 'active'], req: ['title'], order: 'sort, id' },
  features:     { cols: ['title', 'description', 'icon', 'sort', 'active'], ints: ['sort', 'active'], req: ['title'], order: 'sort, id' },
  testimonials: { cols: ['name', 'role', 'message', 'active'], ints: ['active'], req: ['name', 'message'], order: 'id DESC' },
};

const SETTING_DEFAULTS = {
  school_name: 'JPA VIDYALAYA MATRIC SCHOOL',
  tagline: 'Foundation For Future',
  address: '37, AKS Nagar, Gangaigondan, Neyveli, Tamil Nadu, India',
  phone: '83006 20179',
  email: 'jpavidyalaya@gmail.com',
  working_hours: 'Mon – Fri: 8:30 AM – 4:30 PM · Sat: 8:30 AM – 1:00 PM',
  logo: '/uploads/logo.jpg',
  admission_open: '1',
  admission_text: 'Admissions are open for the upcoming academic year. Visit the school office or send us an enquiry online.',
  welcome_title: 'A Warm Welcome from the Management',
  welcome_message:
    'At JPA Vidyalaya Matric School we believe every child is unique and capable of great things. Our caring teachers, colourful classrooms and activity-based learning help children grow in knowledge, character and confidence — building a strong foundation for the future.\n\nWe warmly invite parents to visit our campus, meet our team and see how we nurture young minds.',
  welcome_by: 'Management, JPA Vidyalaya',
  about_text:
    'JPA Vidyalaya Matric School is located in Gangaigondan, Neyveli, Tamil Nadu. Our motto, “Foundation For Future”, reflects our commitment to giving children a strong start — from the first day in LKG to the senior classes.\n\nWe combine academics with science exhibitions, cultural programmes, celebrations and community events so that learning stays joyful and meaningful.',
  vision: 'To nurture confident, curious and compassionate learners who are ready to build a better future for themselves and their community.',
  mission: 'To provide quality, activity-based education in a safe and caring environment, working hand in hand with parents to develop knowledge, values and life skills in every child.',
  management_photo: '/uploads/photo-04.jpg',
  management_text: 'Our management guides the school with care, discipline and a clear focus on the growth of every child.',
  stat1_value: '', stat1_label: '', stat2_value: '', stat2_label: '', stat3_value: '', stat3_label: '', stat4_value: '', stat4_label: '',
  facebook: '', instagram: '', youtube: '', whatsapp: '8300620179',
  map_url: '',
  footer_note: '',
};

function getSettings() {
  const out = { ...SETTING_DEFAULTS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}
function setSettings(obj) {
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(obj)) if (k in SETTING_DEFAULTS) up.run(k, String(v ?? '').slice(0, 5000));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/* ───────────────────────── Passwords & sessions ───────────────────────── */
const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
const verifyPassword = (pw, stored) => {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const a = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const b = Buffer.from(hashHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const SESSION_MS = 1000 * 60 * 60 * 8;

function seedAdmin() {
  if (db.prepare('SELECT COUNT(*) c FROM admins').get().c) return;
  const envPw = process.env.ADMIN_PASSWORD;
  const pw = envPw || 'Admin@123';
  db.prepare('INSERT INTO admins(username, pass_hash, must_change) VALUES(?,?,?)')
    .run(process.env.ADMIN_USER || 'admin', hashPassword(pw), envPw ? 0 : 1);
  console.log(`\n  First run: admin account created → username "${process.env.ADMIN_USER || 'admin'}"${envPw ? '' : ', password "Admin@123" (you will be asked to change it)'}\n`);
}
seedAdmin();

function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash, admin_id, expires_at) VALUES(?,?,?)').run(sha(token), adminId, Date.now() + SESSION_MS);
  return token;
}
function parseCookies(req) {
  const o = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return o;
}
function currentAdmin(req) {
  const t = parseCookies(req).jpa_sid;
  if (!t) return null;
  const row = db.prepare(`SELECT a.id, a.username, a.must_change, s.expires_at FROM sessions s
    JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?`).get(sha(t));
  if (!row) return null;
  if (row.expires_at < Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t)); return null; }
  return row;
}
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 3600_000).unref();

/* ───────────────────────── Rate limiting ───────────────────────── */
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n++;
  return b.n > max;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of buckets) if (v.reset < n) buckets.delete(k); }, 600_000).unref();
const clientIp = (req) => (TRUST_PROXY && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';

/* ───────────────────────── HTTP helpers ───────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-src https://www.google.com https://www.youtube.com; " +
    "connect-src 'self'; form-action 'self'; base-uri 'self'",
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SEC_HEADERS, ...headers });
  res.end(body);
}
const json = (res, status, obj, headers = {}) =>
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Payload too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req, limit = 100_000) {
  const raw = await readBody(req, limit);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext];
    if (!type) return send(res, 404, 'Not found');
    const cache = rel.startsWith('/uploads/') ? 'public, max-age=604800' : rel.startsWith('/admin') ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

/* ───────────────────────── Validation / sanitising ───────────────────────── */
const str = (v, max = 2000) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
function cleanRow(cfg, body) {
  const row = {};
  for (const c of cfg.cols) {
    if (!(c in body)) continue;
    if (cfg.ints.includes(c)) row[c] = Number.isFinite(Number(body[c])) ? Math.trunc(Number(body[c])) : 0;
    else row[c] = str(body[c], c === 'description' || c === 'body' || c === 'bio' || c === 'message' ? 5000 : 500);
  }
  if (row.image && !/^(\/uploads\/[\w.\-]+|https:\/\/[^\s]+)$/.test(row.image)) row.image = '';
  if (row.photo && !/^(\/uploads\/[\w.\-]+|https:\/\/[^\s]+)$/.test(row.photo)) row.photo = '';
  if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) row.date = '';
  if (row.link && !/^(\/[\w\-/#?=&.]*|https?:\/\/[^\s]+)$/.test(row.link)) row.link = '';
  return row;
}
function detectImage(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/* ───────────────────────── API ───────────────────────── */
async function api(req, res, url) {
  const p = url.pathname;
  const method = req.method;
  const ip = clientIp(req);

  // CSRF defence: state-changing calls must carry a header that cross-site forms cannot set.
  if (method !== 'GET' && method !== 'HEAD' && req.headers['x-requested-with'] !== 'fetch')
    return json(res, 403, { error: 'Bad request origin' });

  /* ---- public ---- */
  if (p === '/api/inquiry' && method === 'POST') {
    if (limited('inq:' + ip, 6, 3600_000)) return json(res, 429, { error: 'Too many submissions. Please try again later or call the school office.' });
    const b = await readJson(req, 20_000);
    if (b.website) return json(res, 200, { ok: true }); // honeypot
    const type = b.type === 'admission' ? 'admission' : 'contact';
    const name = str(b.name, 100), phone = str(b.phone, 20), email = str(b.email, 120);
    const message = str(b.message, 2000), cls = str(b.class_applying, 40);
    if (name.length < 2) return json(res, 400, { error: 'Please enter your name.' });
    if (!/^[\d+\-\s()]{7,20}$/.test(phone)) return json(res, 400, { error: 'Please enter a valid phone number.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'Please enter a valid email address.' });
    if (type === 'contact' && message.length < 3) return json(res, 400, { error: 'Please write a short message.' });
    db.prepare('INSERT INTO inquiries(type,name,phone,email,class_applying,message) VALUES(?,?,?,?,?,?)').run(type, name, phone, email, cls, message);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/login' && method === 'POST') {
    if (limited('login:' + ip, 8, 15 * 60_000)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const b = await readJson(req, 5_000);
    const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(str(b.username, 60));
    // constant-ish work even when user is unknown
    const ok = row ? verifyPassword(String(b.password ?? ''), row.pass_hash) : (verifyPassword('x', hashPassword('y')), false);
    if (!ok) return json(res, 401, { error: 'Invalid username or password.' });
    const token = createSession(row.id);
    return json(res, 200, { ok: true, must_change: !!row.must_change }, {
      'Set-Cookie': `jpa_sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${SECURE_COOKIE ? '; Secure' : ''}`,
    });
  }
  if (p === '/api/logout' && method === 'POST') {
    const t = parseCookies(req).jpa_sid;
    if (t) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t));
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'jpa_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  /* ---- admin (auth required) ---- */
  if (!p.startsWith('/api/admin/')) return json(res, 404, { error: 'Not found' });
  const admin = currentAdmin(req);
  if (!admin) return json(res, 401, { error: 'Please sign in.' });
  const sub = p.slice('/api/admin/'.length).split('/');

  if (sub[0] === 'me') return json(res, 200, { username: admin.username, must_change: !!admin.must_change });

  if (sub[0] === 'password' && method === 'POST') {
    const b = await readJson(req, 5_000);
    const row = db.prepare('SELECT * FROM admins WHERE id=?').get(admin.id);
    if (!verifyPassword(String(b.current ?? ''), row.pass_hash)) return json(res, 400, { error: 'Current password is incorrect.' });
    const np = String(b.next ?? '');
    if (np.length < 8) return json(res, 400, { error: 'New password must be at least 8 characters.' });
    if (np === 'Admin@123') return json(res, 400, { error: 'Please choose a different password.' });
    db.prepare('UPDATE admins SET pass_hash=?, must_change=0 WHERE id=?').run(hashPassword(np), admin.id);
    const keep = sha(parseCookies(req).jpa_sid);
    db.prepare('DELETE FROM sessions WHERE admin_id=? AND token_hash<>?').run(admin.id, keep);
    return json(res, 200, { ok: true });
  }

  if (sub[0] === 'stats') {
    const c = (t, w = '') => db.prepare(`SELECT COUNT(*) c FROM ${t} ${w}`).get().c;
    return json(res, 200, {
      slides: c('slides'), notices: c('notices'), events: c('events'), gallery: c('gallery'), staff: c('staff'),
      activities: c('activities'), features: c('features'), testimonials: c('testimonials'),
      new_admissions: c('inquiries', "WHERE type='admission' AND status='new'"),
      new_messages: c('inquiries', "WHERE type='contact' AND status='new'"),
      total_inquiries: c('inquiries'),
      recent: db.prepare('SELECT id,type,name,phone,created_at,status FROM inquiries ORDER BY id DESC LIMIT 6').all(),
    });
  }

  if (sub[0] === 'settings') {
    if (method === 'GET') return json(res, 200, getSettings());
    if (method === 'PUT') {
      const b = await readJson(req, 60_000);
      for (const k of ['logo', 'management_photo']) if (k in b && b[k] && !/^(\/uploads\/[\w.\-]+|https:\/\/\S+)$/.test(b[k])) b[k] = '';
      if (b.map_url && !/^https:\/\/www\.google\.com\/maps\S*$/.test(b.map_url)) return json(res, 400, { error: 'Map URL must be a Google Maps embed link (https://www.google.com/maps/...).' });
      for (const k of ['facebook', 'instagram', 'youtube']) if (b[k] && !/^https:\/\/\S+$/.test(b[k])) return json(res, 400, { error: `${k} link must start with https://` });
      setSettings(b);
      return json(res, 200, { ok: true });
    }
  }

  if (sub[0] === 'inquiries') {
    if (sub[1] === 'export.csv' && method === 'GET') {
      const rows = db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();
      const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
      const head = ['id', 'type', 'name', 'phone', 'email', 'class_applying', 'message', 'status', 'created_at'];
      const csv = [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h])).join(','))].join('\r\n');
      return send(res, 200, '﻿' + csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inquiries.csv"' });
    }
    if (method === 'GET' && !sub[1]) {
      const type = url.searchParams.get('type');
      const rows = type === 'admission' || type === 'contact'
        ? db.prepare('SELECT * FROM inquiries WHERE type=? ORDER BY id DESC LIMIT 500').all(type)
        : db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 500').all();
      return json(res, 200, rows);
    }
    const id = Number(sub[1]);
    if (!Number.isInteger(id)) return json(res, 400, { error: 'Bad id' });
    if (method === 'PUT') {
      const b = await readJson(req, 2_000);
      const status = ['new', 'read', 'done'].includes(b.status) ? b.status : 'read';
      db.prepare('UPDATE inquiries SET status=? WHERE id=?').run(status, id);
      return json(res, 200, { ok: true });
    }
    if (method === 'DELETE') { db.prepare('DELETE FROM inquiries WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  if (sub[0] === 'upload' && method === 'POST') {
    if (limited('up:' + admin.id, 60, 3600_000)) return json(res, 429, { error: 'Upload limit reached for this hour.' });
    const b = await readJson(req, 14_000_000);
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
    if (!m) return json(res, 400, { error: 'Please upload a JPG, PNG or WebP image.' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 10 * 1024 * 1024) return json(res, 413, { error: 'Image is larger than 10 MB.' });
    const ext = detectImage(buf);
    if (!ext) return json(res, 400, { error: 'File is not a valid image.' });
    const base = str(b.name, 60).replace(/\.[^.]*$/, '').replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'image';
    const name = `${base}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return json(res, 200, { url: '/uploads/' + name });
  }

  if (sub[0] === 'uploads') {
    if (method === 'GET') {
      const used = usedImages();
      const files = fs.readdirSync(UPLOADS).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => {
        const st = fs.statSync(path.join(UPLOADS, f));
        return { name: f, url: '/uploads/' + f, size: st.size, mtime: st.mtimeMs, used: used.has('/uploads/' + f) };
      }).sort((a, b) => b.mtime - a.mtime);
      return json(res, 200, files);
    }
    if (method === 'DELETE' && sub[1]) {
      const name = path.basename(decodeURIComponent(sub[1]));
      if (!/^[\w.\-]+$/.test(name)) return json(res, 400, { error: 'Bad name' });
      if (usedImages().has('/uploads/' + name)) return json(res, 409, { error: 'This image is still used on the site. Remove it from its item first.' });
      try { fs.unlinkSync(path.join(UPLOADS, name)); } catch { /* already gone */ }
      return json(res, 200, { ok: true });
    }
  }

  if (RES[sub[0]]) {
    const cfg = RES[sub[0]]; const table = sub[0];
    if (method === 'GET' && !sub[1]) return json(res, 200, db.prepare(`SELECT * FROM ${table} ORDER BY ${cfg.order}`).all());
    if (method === 'POST' && !sub[1]) {
      const row = cleanRow(cfg, await readJson(req));
      for (const r of cfg.req) if (!row[r]) return json(res, 400, { error: `“${r}” is required.` });
      const cols = Object.keys(row);
      const info = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c]));
      return json(res, 200, { ok: true, id: Number(info.lastInsertRowid) });
    }
    const id = Number(sub[1]);
    if (!Number.isInteger(id)) return json(res, 400, { error: 'Bad id' });
    if (method === 'PUT') {
      const row = cleanRow(cfg, await readJson(req));
      for (const r of cfg.req) if (r in row && !row[r]) return json(res, 400, { error: `“${r}” is required.` });
      const cols = Object.keys(row);
      if (!cols.length) return json(res, 400, { error: 'Nothing to update.' });
      db.prepare(`UPDATE ${table} SET ${cols.map((c) => c + '=?').join(',')} WHERE id=?`).run(...cols.map((c) => row[c]), id);
      return json(res, 200, { ok: true });
    }
    if (method === 'DELETE') { db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id); return json(res, 200, { ok: true }); }
  }
  return json(res, 404, { error: 'Not found' });
}

function usedImages() {
  const used = new Set();
  const add = (v) => { if (v) used.add(v); };
  for (const [t, c] of [['slides', 'image'], ['events', 'image'], ['gallery', 'image'], ['staff', 'photo'], ['activities', 'image']])
    for (const r of db.prepare(`SELECT ${c} v FROM ${t}`).all()) add(r.v);
  const s = getSettings(); add(s.logo); add(s.management_photo);
  return used;
}

/* ───────────────────────── Public pages ───────────────────────── */
function pageData() {
  const act = 'WHERE active=1';
  return {
    s: getSettings(),
    slides: db.prepare(`SELECT * FROM slides ${act} ORDER BY sort,id`).all(),
    notices: db.prepare(`SELECT * FROM notices ${act} ORDER BY important DESC, date DESC, id DESC LIMIT 20`).all(),
    events: db.prepare(`SELECT * FROM events ${act} ORDER BY date DESC, id DESC`).all(),
    gallery: db.prepare(`SELECT * FROM gallery ${act} ORDER BY sort, id DESC`).all(),
    staff: db.prepare(`SELECT * FROM staff ${act} ORDER BY grp, sort, id`).all(),
    activities: db.prepare(`SELECT * FROM activities ${act} ORDER BY sort,id`).all(),
    features: db.prepare(`SELECT * FROM features ${act} ORDER BY sort,id`).all(),
    testimonials: db.prepare(`SELECT * FROM testimonials ${act} ORDER BY id DESC LIMIT 6`).all(),
    today: new Date().toISOString().slice(0, 10),
  };
}
const PAGES = { '/': 'home', '/about': 'about', '/management': 'management', '/activities': 'activities', '/events': 'events', '/features': 'features', '/gallery': 'gallery', '/contact': 'contact' };

/* ───────────────────────── Server ───────────────────────── */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (p === '/admin') return serveStatic(req, res, '/admin/index.html');
    if (PAGES[p]) {
      const html = site.render(PAGES[p], pageData());
      return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    }
    if (p === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /admin\nDisallow: /api/\n', { 'Content-Type': 'text/plain' });
    if (p === '/favicon.ico') return serveStatic(req, res, '/uploads/favicon.png');
    return serveStatic(req, res, p);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) {
      if (req.url.startsWith('/api/')) json(res, status, { error: status === 500 ? 'Server error' : e.message });
      else send(res, status, status === 500 ? 'Server error' : e.message, { 'Content-Type': 'text/plain' });
    }
  }
});

if (require.main === module) {
  require('./seed').run(db, RES);
  server.listen(PORT, () => console.log(`JPA Vidyalaya site running → http://localhost:${PORT}   admin → http://localhost:${PORT}/admin`));
}
module.exports = { server, db };
