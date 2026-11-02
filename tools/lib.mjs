// Dùng chung cho tools/: máy chủ tĩnh cục bộ cho repo, mở Chromium, nạp PDF bằng pdf.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const TOOLS = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.dirname(TOOLS);
export const rel = f => path.relative(REPO, f).replaceAll('\\', '/');
const PDFJS = path.join(TOOLS, 'node_modules/pdfjs-dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

// Phục vụ repo ở http://127.0.0.1:<cổng>; files = { '/~0.pdf': 'đường dẫn' } thêm file ngoài repo
export async function serve(files = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/~blank') { res.writeHead(200, { 'content-type': TYPES['.html'] }); return res.end('<!doctype html><meta charset="utf-8">'); }
    const f = files[u] || (u.startsWith('/pdfjs/') ? path.join(PDFJS, u.slice(7)) : path.join(REPO, u));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

export const launch = () => chromium.launch();

// Mở các file PDF trong một trang Chromium. Trong trang: docs[d] và draw(d, số trang, tỉ lệ) -> canvas nền trắng
export async function openPdfs(browser, files) {
  const srv = await serve(Object.fromEntries(files.map((f, i) => [`/~${i}.pdf`, f])));
  const page = await browser.newPage();
  await page.goto(srv.url + '/~blank');
  const counts = await page.evaluate(async n => {
    const pdfjs = await import('/pdfjs/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.mjs';
    const opt = { cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdfjs/standard_fonts/' };
    window.docs = await Promise.all([...Array(n).keys()].map(i => pdfjs.getDocument({ url: `/~${i}.pdf`, ...opt }).promise));
    window.draw = async (d, i, scale) => {
      const p = await docs[d].getPage(i), vp = p.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
      return c;
    };
    return docs.map(d => d.numPages);
  }, files.length);
  return { page, counts, close: () => srv.close() };
}

export function savePng(file, dataUrl) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
}
