// So 2 bản PDF từng trang: dòng chữ bớt (−) và thêm (+), vùng hình đổi; ảnh cắt các vùng đổi, trái bản cũ | phải bản mới
// node tools/diff-pdf.mjs <cũ.pdf> <mới.pdf> [thư mục ảnh, mặc định out/diff] [--scale=1.5]
import fs from 'node:fs';
import path from 'node:path';
import { REPO, rel, launch, openPdfs, savePng } from './lib.mjs';

const args = process.argv.slice(2);
const [A, B, dir = path.join(REPO, 'out/diff')] = args.filter(a => !a.startsWith('--'));
const scale = Number((args.find(a => a.startsWith('--scale=')) || '--scale=1.5').slice(8));
if (!A || !B) { console.error('Cần 2 file PDF: cũ và mới'); process.exit(1); }
const outDir = path.resolve(dir);
if (fs.existsSync(outDir)) for (const f of fs.readdirSync(outDir)) if (/^p\d+\.png$/.test(f)) fs.rmSync(path.join(outDir, f));   // bỏ ảnh của lần so trước

const minus = (a, b) => { const m = new Map(); for (const x of b) m.set(x, (m.get(x) || 0) + 1); return a.filter(x => m.get(x) ? (m.set(x, m.get(x) - 1), false) : true); };
const cut = s => s.length > 110 ? s.slice(0, 107) + '…' : s;
const show = (sign, ls) => { for (const l of ls.slice(0, 8)) console.log(`   ${sign} ${cut(l)}`); if (ls.length > 8) console.log(`   ${sign} … thêm ${ls.length - 8} dòng`); };

const browser = await launch();
const { page, counts: [na, nb], close } = await openPdfs(browser, [path.resolve(A), path.resolve(B)]);
try {
  await page.evaluate(() => {
    // các dòng chữ của trang (pdf.js đánh dấu hết dòng bằng hasEOL)
    window.lines = async (d, i) => {
      const out = []; let s = '';
      for (const t of (await (await docs[d].getPage(i)).getTextContent()).items) { s += t.str; if (t.hasEOL) { out.push(s.trim()); s = ''; } }
      out.push(s.trim());
      return out.filter(Boolean);
    };
    // so điểm ảnh, gom ô lưới có đổi thành vùng, ghép ảnh cắt từng vùng thành một hàng: cũ | mới
    window.cmp = async (i, scale) => {
      const [a, b] = await Promise.all([draw(0, i, scale), draw(1, i, scale)]);
      if (a.width !== b.width || a.height !== b.height) return { size: `${a.width}×${a.height} → ${b.width}×${b.height} px` };
      const W = a.width, H = a.height, C = 12, R = 3;   // C: cạnh ô lưới (px), R: ô đổi cách nhau ≤ R ô thì chung vùng
      const pa = a.getContext('2d').getImageData(0, 0, W, H).data, pb = b.getContext('2d').getImageData(0, 0, W, H).data;
      const gw = Math.ceil(W / C), gh = Math.ceil(H / C), grid = new Uint8Array(gw * gh);
      let px = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        if (Math.abs(pa[o] - pb[o]) + Math.abs(pa[o + 1] - pb[o + 1]) + Math.abs(pa[o + 2] - pb[o + 2]) > 48) { px++; grid[(y / C | 0) * gw + (x / C | 0)] = 1; }
      }
      if (!px) return { px };
      const seen = new Uint8Array(gw * gh);
      let boxes = [];
      for (let s = 0; s < grid.length; s++) {
        if (!grid[s] || seen[s]) continue;
        const bx = [gw, gh, 0, 0], st = [s];
        seen[s] = 1;
        while (st.length) {
          const c = st.pop(), cx = c % gw, cy = (c - cx) / gw;
          bx[0] = Math.min(bx[0], cx); bx[1] = Math.min(bx[1], cy); bx[2] = Math.max(bx[2], cx); bx[3] = Math.max(bx[3], cy);
          for (let y = Math.max(0, cy - R); y <= Math.min(gh - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(gw - 1, cx + R); x++) {
            const t = y * gw + x;
            if (grid[t] && !seen[t]) { seen[t] = 1; st.push(t); }
          }
        }
        boxes.push(bx);
      }
      if (boxes.length > 6) boxes = [boxes.reduce((u, v) => [Math.min(u[0], v[0]), Math.min(u[1], v[1]), Math.max(u[2], v[2]), Math.max(u[3], v[3])])];
      const M = 2 * C, G = 6;   // lề quanh vùng, khe giữa các ảnh
      const rects = boxes.map(([x0, y0, x1, y1]) => {
        const x = Math.max(0, x0 * C - M), y = Math.max(0, y0 * C - M);
        return [x, y, Math.min(W, (x1 + 1) * C + M) - x, Math.min(H, (y1 + 1) * C + M) - y];
      });
      const wMax = Math.max(...rects.map(r => r[2])), hSum = rects.reduce((s, r) => s + r[3] + G, -G);
      const k = Math.min(1, 1600 / (2 * wMax + G), 1600 / hSum);   // ảnh ghép không quá 1600 px mỗi chiều
      const out = document.createElement('canvas');
      out.width = Math.ceil((2 * wMax + G) * k); out.height = Math.ceil(hSum * k);
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#888'; ctx.fillRect(0, 0, out.width, out.height);
      let y = 0;
      for (const [sx, sy, w, h] of rects) {
        ctx.drawImage(a, sx, sy, w, h, 0, y * k, w * k, h * k);
        ctx.drawImage(b, sx, sy, w, h, (wMax + G) * k, y * k, w * k, h * k);
        y += h + G;
      }
      return { px, boxes: boxes.length, pct: (100 * px / (W * H)).toFixed(2), png: out.toDataURL('image/png') };
    };
  });

  const n = Math.max(na, nb), changed = [];
  if (na !== nb) console.log(`Số trang: cũ ${na}, mới ${nb}. Thêm hay bớt trang thì các trang sau đó lệch nhau, so theo nội dung chữ.`);
  for (let i = 1; i <= n; i++) {
    if (i > na || i > nb) { changed.push(i); console.log(`p${i}: chỉ có ở bản ${i > na ? 'mới' : 'cũ'}`); continue; }
    const [la, lb] = await page.evaluate(i => Promise.all([lines(0, i), lines(1, i)]), i);
    const r = await page.evaluate(([i, s]) => cmp(i, s), [i, scale]);
    const del = minus(la, lb), add = minus(lb, la);
    if (!r.size && !r.px && !del.length && !add.length) continue;
    changed.push(i);
    let msg = `p${i}:`;
    if (r.size) msg += ` khổ giấy khác (${r.size})`;
    if (r.px) {
      const f = path.join(outDir, `p${String(i).padStart(2, '0')}.png`);
      savePng(f, r.png);
      msg += ` hình đổi ${r.boxes} vùng, ${r.pct}% trang → ${rel(f)}`;
    }
    if (!del.length && !add.length) msg += ' (chữ giữ nguyên)';
    console.log(msg);
    show('−', del);
    show('+', add);
  }
  console.log(changed.length ? `Khác ${changed.length}/${n} trang: ${changed.join(', ')}` : `Giống nhau cả ${n} trang`);
} finally {
  await browser.close();
  close();
}
