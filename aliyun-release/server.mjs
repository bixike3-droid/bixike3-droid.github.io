import http from 'node:http';
import { DatabaseSync, backup } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const derive = promisify(scrypt);
const statuses = ['pending', 'approved', 'hidden', 'deleted'];
const emoji = new RegExp('\\p{Extended_Pictographic}', 'u');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon' };
const sha = value => createHash('sha256').update(value).digest('hex');
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const secret = () => randomBytes(32).toString('hex');
class Failure extends Error { constructor(status, message) { super(message); this.status = status; } }
function exact(body, keys) { if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !keys.includes(k))) throw new Failure(400, '请求内容无效。'); }
function safeEqual(a, b) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
async function passwordHash(password, salt) { return Buffer.from(await derive(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex'); }

export function createGardenServer({ origin, dataDir = path.join(root, 'data'), staticDir = path.join(root, 'dist') }) {
 const canonical = new URL(origin); const secure = canonical.protocol === 'https:';
 if (!['http:', 'https:'].includes(canonical.protocol) || canonical.pathname !== '/' || canonical.search || canonical.hash) throw new Error('SAKURA_ORIGIN must be an HTTP(S) origin');
 mkdirSync(dataDir, { recursive: true, mode: 0o700 });
 const db = new DatabaseSync(path.join(dataDir, 'garden.sqlite'), { timeout: 5000 });
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS guest_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, visitor_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden','deleted')));
 CREATE INDEX IF NOT EXISTS messages_order ON guest_messages(created_at DESC,id DESC);
 CREATE INDEX IF NOT EXISTS messages_visitor ON guest_messages(visitor_key,created_at);
 CREATE TABLE IF NOT EXISTS guestbook_settings (id TEXT PRIMARY KEY, require_approval INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 0);
 INSERT OR IGNORE INTO guestbook_settings VALUES('home',1,0);
 CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
 `);
 const codeFile = path.join(dataDir, 'setup-code');
 const pepperFile = path.join(dataDir, 'rate-secret');
 if (!db.prepare('SELECT id FROM admins WHERE id=1').get() && !existsSync(codeFile)) writeFileSync(codeFile, secret(), { mode: 0o600, flag: 'wx' });
 if (!existsSync(pepperFile)) writeFileSync(pepperFile, secret(), { mode: 0o600, flag: 'wx' });
 const pepper = readFileSync(pepperFile, 'utf8');
 const cookieName = secure ? '__Host-sakura-session' : 'sakura-session';
 const attempts = new Map(); let authJobs = 0;
 const selectMessage = 'id,name,message,created_at AS createdAt,status';
 const settings = () => { const row = db.prepare("SELECT require_approval,revision FROM guestbook_settings WHERE id='home'").get(); return { requireApproval: Boolean(row.require_approval), revision: row.revision }; };
 const configured = () => Boolean(db.prepare('SELECT id FROM admins WHERE id=1').get());
 function token(req) { const value = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1); return value && /^[a-f0-9]{64}$/.test(value) ? value : null; }
 function authenticated(req) { const value = token(req); return Boolean(value && db.prepare('SELECT hash FROM sessions WHERE hash=? AND expires>?').get(sha(value), Date.now())); }
 function sessionCookie(value, maxAge = 43200) { return `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`; }
 function startSession(res) { const value = secret(); db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now()); db.prepare('INSERT INTO sessions VALUES(?,?)').run(sha(value), Date.now() + 43200000); res.setHeader('Set-Cookie', sessionCookie(value)); }
 function rate(req, bucket, limit, duration) {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  const key = bucket + ':' + createHmac('sha256', pepper).update(String(ip)).digest('hex'); const now = Date.now();
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  let item = attempts.get(key);
  if (!item) { if (attempts.size >= 10000) throw new Failure(429, '当前请求较多，请稍后再试。'); item = { count: 0, until: now + duration }; attempts.set(key, item); }
  if (++item.count > limit) throw new Failure(429, bucket === 'message' ? '信已寄出，等半分钟再写下一封吧。' : '尝试次数较多，请稍后再试。');
  return key;
 }
 function requireOrigin(req) { if (req.headers.origin !== canonical.origin) throw new Failure(403, '请求来源无效。'); }
 function requireOwner(req) { if (!authenticated(req)) throw new Failure(401, '请先登录主人工作台。'); }
 async function json(req, limit = 6000) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Failure(415, '请提交 JSON 格式的内容。');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Failure(413, '请求内容过长。'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Failure(400, '请求格式不正确。'); }
 }
 function send(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
 function redirect(res, target) { res.writeHead(303, { Location: target, 'Cache-Control': 'no-store' }); res.end(); }
 function validateCredentials(body, setup) {
  exact(body, setup ? ['username', 'password', 'code'] : ['username', 'password']);
  if (typeof body.username !== 'string' || !/^[a-zA-Z0-9._-]{3,24}$/.test(body.username) || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw new Failure(400, '用户名使用 3–24 位字母、数字或 ._-；密码使用 12–128 个字符。');
 }
 const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  try {
   if (req.headers.host !== canonical.host) throw new Failure(400, '访问地址无效。');
   const url = new URL(req.url, canonical); const route = url.pathname; const method = req.method;
   if (route === '/api/health' && method === 'GET') return send(res, 200, { ok: true });
   if (route === '/api/auth/state' && method === 'GET') return send(res, 200, { configured: configured(), authenticated: authenticated(req) });
   if (['/api/auth/setup', '/api/auth/login'].includes(route) && method === 'POST') {
    requireOrigin(req); rate(req, 'login', 5, 600000); const setup = route.endsWith('/setup'); const body = await json(req); validateCredentials(body, setup);
    if (authJobs >= 4) throw new Failure(503, '工作台暂时繁忙，请稍后再试。');
    authJobs++;
    try {
     if (setup) {
      if (configured()) throw new Failure(409, '工作台已经设置，请直接登录。');
      if (typeof body.code !== 'string' || !existsSync(codeFile) || !safeEqual(body.code.trim(), readFileSync(codeFile, 'utf8').trim())) throw new Failure(403, '初始化码不正确。');
      const salt = secret(); const hash = await passwordHash(body.password, salt);
      if (configured()) throw new Failure(409, '工作台已经设置，请直接登录。');
      db.prepare('INSERT INTO admins VALUES(1,?,?,?)').run(body.username, salt, hash); unlinkSync(codeFile);
     } else {
      const admin = db.prepare('SELECT username,salt,password_hash FROM admins WHERE id=1').get();
      const hash = await passwordHash(body.password, admin?.salt || pepper);
      if (!admin || body.username !== admin.username || !safeEqual(hash, admin.password_hash)) throw new Failure(401, '用户名或密码不正确。');
     }
     startSession(res); return send(res, 200, { ok: true });
    } finally { authJobs--; }
   }
   if (route === '/api/auth/logout' && method === 'POST') { requireOrigin(req); const value = token(req); if (value) db.prepare('DELETE FROM sessions WHERE hash=?').run(sha(value)); res.setHeader('Set-Cookie', sessionCookie('', 0)); return send(res, 200, { ok: true }); }
   if (route === '/api/guestbook' && method === 'GET') {
    const messages = db.prepare("SELECT id,name,message,created_at AS createdAt FROM guest_messages WHERE status='approved' ORDER BY created_at DESC,id DESC LIMIT 50").all();
    return send(res, 200, { messages, requireApproval: settings().requireApproval, canManage: authenticated(req) });
   }
   if (route === '/api/guestbook' && method === 'POST') {
    requireOrigin(req); const body = await json(req); exact(body, ['name', 'message', 'website']);
    if (typeof body.name !== 'string' || typeof body.message !== 'string') throw new Failure(400, '请填写昵称和留言。');
    const name = body.name.trim(); const message = body.message.trim();
    if (!name || name.length > 24 || !message || message.length > 400 || (body.website !== undefined && body.website !== '')) throw new Failure(400, '请填写 24 字以内的昵称、400 字以内的留言。');
    if (emoji.test(name + message)) throw new Failure(400, '请使用文字留言，暂不支持表情符号。');
    const visitor = rate(req, 'message', 1, 30000); const pending = settings().requireApproval;
    const entry = { id: randomUUID(), name, message, createdAt: new Date().toISOString() };
    db.prepare('INSERT INTO guest_messages VALUES(?,?,?,?,?,?)').run(entry.id, name, message, entry.createdAt, visitor, pending ? 'pending' : 'approved');
    return send(res, 201, { message: entry, pending });
   }
   if (route === '/api/guestbook/manage') {
    requireOwner(req);
    if (method === 'GET') {
     const filter = url.searchParams.get('status') || 'pending'; if (!['all', ...statuses].includes(filter)) throw new Failure(400, '留言分类无效。');
     const clauses = []; const args = []; if (filter !== 'all') { clauses.push('status=?'); args.push(filter); }
     if (url.searchParams.has('cursor')) { let cursor; try { cursor = JSON.parse(url.searchParams.get('cursor')); } catch { throw new Failure(400, '分页位置无效。'); }
      if (!uuid(cursor?.id) || typeof cursor.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(cursor.createdAt) || !Number.isFinite(Date.parse(cursor.createdAt))) throw new Failure(400, '分页位置无效。');
      clauses.push('(created_at<? OR (created_at=? AND id<?))'); args.push(cursor.createdAt, cursor.createdAt, cursor.id);
     }
     const rows = db.prepare(`SELECT ${selectMessage} FROM guest_messages ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY created_at DESC,id DESC LIMIT 31`).all(...args);
     const messages = rows.slice(0, 30); const last = messages.at(-1); const groups = db.prepare('SELECT status,COUNT(*) AS total FROM guest_messages GROUP BY status').all();
     return send(res, 200, { messages, settings: settings(), counts: Object.fromEntries(statuses.map(s => [s, groups.find(g => g.status === s)?.total || 0])), nextCursor: rows.length > 30 && last ? JSON.stringify({ createdAt: last.createdAt, id: last.id }) : null });
    }
    if (method === 'PATCH') {
     requireOrigin(req); const body = await json(req, 2000); exact(body, ['action', 'id', 'status', 'expectedStatus', 'requireApproval', 'revision']);
     if (body.action === 'message') {
      exact(body, ['action', 'id', 'status', 'expectedStatus']); if (!uuid(body.id) || !statuses.includes(body.status) || !statuses.includes(body.expectedStatus)) throw new Failure(400, '更新内容无效。');
      if (!db.prepare('SELECT id FROM guest_messages WHERE id=?').get(body.id)) throw new Failure(404, '这封留言不存在。');
      const result = db.prepare('UPDATE guest_messages SET status=? WHERE id=? AND status=?').run(body.status, body.id, body.expectedStatus);
      if (!result.changes) throw new Failure(409, '这封留言已在另一处更新，列表已刷新，请重新操作。');
      return send(res, 200, { message: db.prepare(`SELECT ${selectMessage} FROM guest_messages WHERE id=?`).get(body.id) });
     }
     exact(body, ['action', 'requireApproval', 'revision']); if (body.action !== 'settings' || typeof body.requireApproval !== 'boolean' || !Number.isInteger(body.revision) || body.revision < 0) throw new Failure(400, '更新内容无效。');
     const result = db.prepare("UPDATE guestbook_settings SET require_approval=?,revision=revision+1 WHERE id='home' AND revision=?").run(Number(body.requireApproval), body.revision);
     if (!result.changes) throw new Failure(409, '展示方式已在另一处更新，列表已刷新，请重新操作。');
     return send(res, 200, { settings: settings() });
    }
    throw new Failure(405, '不支持此请求方式。');
   }
   if (route.startsWith('/api/')) throw new Failure(404, '接口不存在。');
   if (!['GET', 'HEAD'].includes(method)) throw new Failure(405, '不支持此请求方式。');
   if (route === '/admin/guestbook' && !authenticated(req)) return redirect(res, configured() ? '/login' : '/setup');
   if (route === '/setup' && configured()) return redirect(res, '/login');
   const page = ['/', '/login', '/setup', '/admin/guestbook'].includes(route);
   const decoded = decodeURIComponent(route); const file = page ? path.join(staticDir, 'index.html') : path.resolve(staticDir, '.' + decoded);
   if (!file.startsWith(path.resolve(staticDir) + path.sep) || !existsSync(file) || !statSync(file).isFile() || !mime[path.extname(file)]) throw new Failure(404, '页面不存在。');
   res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Cache-Control': page ? 'no-store' : route.startsWith('/assets/index-') ? 'public,max-age=31536000,immutable' : 'public,max-age=3600' });
   res.end(method === 'HEAD' ? undefined : await readFile(file));
  } catch (error) { if (!res.headersSent) send(res, error instanceof Failure ? error.status : 500, { error: error instanceof Failure ? error.message : '服务暂时繁忙，请稍后重试。' }); else res.destroy(); }
 });
 server.requestTimeout = 15000; server.headersTimeout = 10000;
 server.on('close', () => db.close());
 return { server, db, codeFile };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const dataDir = process.env.SAKURA_DATA_DIR || path.join(root, 'data');
 if (process.argv[2] === 'backup') {
  const target = process.env.SAKURA_BACKUP_DIR || path.join(dataDir, 'backups'); mkdirSync(target, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, 'garden.sqlite')); await backup(db, path.join(target, new Date().toISOString().replaceAll(':', '-') + '.sqlite')); db.close(); console.log('Database backup complete.');
 } else {
  const app = createGardenServer({ origin: process.env.SAKURA_ORIGIN || 'https://sakura.baodaoxiaoyuan.cn', dataDir });
  app.server.listen(Number(process.env.PORT || 3210), process.env.HOST || '127.0.0.1', () => console.log('Night garden service is ready.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close());
 }
}
