// Dựng bộ bản vẽ PDF từ các trang HTML: node tools/build-pdf.mjs [ra.pdf, mặc định out/Ban_Ve.pdf] [--title="..."]
// Mỗi trang in bằng Chromium theo @page và @media print của chính nó, rồi gộp theo thứ tự PAGES.
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { REPO, rel, serve, launch } from './lib.mjs';

const PAGES = ['bia.html', 'index.html', 'mat-dung.html', 'cot-dien.html', 'cong-truoc.html'];
const FROZEN = ['vechoichoi/Ban_Ve_Final_1.pdf', 'vechoichoi/Ban_Ve_Dien_Final_1.pdf'];   // đã gửi chủ đầu tư, không ghi đè

const args = process.argv.slice(2);
const title = (args.find(a => a.startsWith('--title=')) || '--title=Bản vẽ nhà phố 4,2 × 18 m').slice(8);
const out = path.resolve(args.find(a => !a.startsWith('--')) || path.join(REPO, 'out/Ban_Ve.pdf'));
if (FROZEN.includes(rel(out))) { console.error(`${rel(out)} đã chốt, không ghi đè. Đặt tên file khác.`); process.exit(1); }

const t0 = Date.now();
const srv = await serve(), browser = await launch();
const doc = await PDFDocument.create();
doc.setTitle(title);
try {
  for (const name of PAGES) {
    const page = await browser.newPage();
    await page.goto(`${srv.url}/${name}`, { waitUntil: 'networkidle' });
    const font = await page.evaluate(() => document.fonts.ready.then(set => [...set].some(f => f.family.includes('Barlow') && f.status === 'loaded')));
    if (!font) console.warn(`  ${name}: chưa tải được font Barlow (mất mạng?), chữ sẽ khác bản in trước`);
    const src = await PDFDocument.load(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    await page.close();
    const from = doc.getPageCount() + 1;
    for (const p of await doc.copyPages(src, src.getPageIndices())) doc.addPage(p);
    const to = doc.getPageCount();
    console.log(`${name.padEnd(14)} trang ${from}${to > from ? '–' + to : ''}`);
  }
} finally {
  await browser.close();
  srv.close();
}
const bytes = await doc.save();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, bytes);
console.log(`${rel(out)}: ${doc.getPageCount()} trang, ${(bytes.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
