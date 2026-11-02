// Xuất trang PDF ra PNG: node tools/render.mjs <file.pdf> [trang: 5 | 13-15 | all] [tỉ lệ, mặc định 1.5] [thư mục, mặc định out/png]
// Tỉ lệ 1 = 72 dpi (A4 khoảng 600 × 840 px). Xem chỗ đã sửa thì dùng diff-pdf.mjs, ảnh nhỏ hơn nhiều.
import path from 'node:path';
import { REPO, rel, launch, openPdfs, savePng } from './lib.mjs';

const [file, range = 'all', scale = '1.5', dir = path.join(REPO, 'out/png')] = process.argv.slice(2);
if (!file) { console.error('Cần đường dẫn file PDF'); process.exit(1); }

const browser = await launch();
const { page, counts: [n], close } = await openPdfs(browser, [path.resolve(file)]);
try {
  let [a, b] = range === 'all' ? [1, n] : range.split('-').map(Number);
  b = Math.min(b || a, n);
  for (let i = a; i <= b; i++) {
    const url = await page.evaluate(async ([i, s]) => (await draw(0, i, s)).toDataURL('image/png'), [i, Number(scale)]);
    const f = path.join(path.resolve(dir), `p${String(i).padStart(2, '0')}.png`);
    savePng(f, url);
    console.log(rel(f));
  }
} finally {
  await browser.close();
  close();
}
