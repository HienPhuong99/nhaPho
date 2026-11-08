// Dựng video từ phim.html: mỗi cảnh ra một MP4 1920×1080 30 fps (ffmpeg), rồi ghép bằng FilmCraft (phim-dung.jsonl).
//   node phim-render.mjs out/phim                 → out/phim/canh-1.mp4 … canh-5.mp4
//   node phim-render.mjs out/phim --stills 0:2 1:5 → ảnh thử từng khung (cảnh:giây)
// Cần: Playwright (lấy từ plugin banve), ffmpeg trong PATH hoặc biến FFMPEG.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const plug = path.join(os.homedir(), '.claude/plugins/cache/banve-kit/banve');
const ver = fs.readdirSync(plug).sort().pop();
const require = createRequire(path.join(plug, ver, 'skills/pdf/scripts/package.json'));
const { chromium } = require('playwright');

const [out = 'out/phim', ...rest] = process.argv.slice(2);
const FPS = 30, FF = process.env.FFMPEG || 'ffmpeg';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('page:', e.message));
await page.goto(pathToFileURL(path.resolve('phim.html')).href + '?render');
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
const shots = await page.evaluate(() => window.SHOTS);
const grab = () => page.screenshot({ type: 'jpeg', quality: 95 });

if (rest[0] === '--stills') {
  for (const a of rest.slice(1)) {
    const [i, t] = a.split(':').map(Number);
    await page.evaluate(([i, t]) => seek(i, t), [i, t]);
    fs.writeFileSync(path.join(out, `still-${i}-${t}.jpg`), await grab());
  }
} else {
  const only = rest.length ? rest.map(Number) : shots.map((_, i) => i);
  for (const i of only) {
    const n = Math.round(shots[i].dur * FPS), file = path.join(out, `canh-${i + 1}.mp4`);
    const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      await page.evaluate(([i, t]) => seek(i, t), [i, f / FPS]);
      if (!ff.stdin.write(await grab())) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(`${file}  ${n} khung  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
await browser.close();
