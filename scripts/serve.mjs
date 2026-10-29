// Local preview server: serves /dist and runs the API functions with a file-based store.
// Usage: npm run dev   →   http://localhost:8888
// (On Netlify the same functions run with Netlify Blobs storage.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle as enquiry } from '../netlify/functions/enquiry.mjs';
import { handle as leads } from '../netlify/functions/leads.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, '.data/enquiries');
const PORT = Number(process.env.PORT) || 8888;
const env = { ...process.env, ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'local-admin-key' };

// Minimal stand-in for the Netlify Blobs API used by the functions.
export const fileStore = (dir) => ({
  async setJSON(key, value) {
    const f = path.join(dir, key.replace(/[:]/g, '_') + '.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(value, null, 2));
  },
  async get(key) {
    const f = path.join(dir, key);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  },
  async list({ prefix = '' } = {}) {
    if (!fs.existsSync(dir)) return { blobs: [] };
    const out = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(path.relative(dir, p));
    });
    walk(dir);
    return { blobs: out.filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
  },
});
const store = fileStore(DATA);

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/enquiry' || url.pathname === '/api/leads') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const fn = url.pathname === '/api/enquiry' ? enquiry : leads;
    const response = await fn(request, { store, env, ip: req.socket.remoteAddress });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  let status = 200;
  if (!fs.existsSync(file)) { file = path.join(DIST, '404.html'); status = 404; }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Pablo Homes preview → http://localhost:${PORT}`);
  console.log(`Admin page → http://localhost:${PORT}/admin/  (key: ${env.ADMIN_TOKEN})`);
});
