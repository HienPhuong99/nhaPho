// Dựng video tham quan 3D tương tác từ phim-tham-quan.html (MP4 H.264 + nhạc nền guitar mộc & âm click tương tác).
//   node phim-tham-quan-render.mjs video/Phim_Tham_Quan_3D.mp4
//   node phim-tham-quan-render.mjs out/stills --stills 0.5 5.0 6.5 9.0 13.5 15.0 19.0 23.3 24.8 27.2 29.2 32.5
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

function loadPlaywright() {
  const candidates = [];
  const plug = path.join(os.homedir(), '.claude/plugins/cache/banve-kit/banve');
  if (fs.existsSync(plug)) {
    const ver = fs.readdirSync(plug).sort().pop();
    if (ver) candidates.push(path.join(plug, ver, 'skills/pdf/scripts/package.json'));
  }
  candidates.push(
    path.resolve('package.json'),
    path.resolve('../PCCC24/package.json'),
    path.resolve('../Pccc24-WP/package.json'),
    path.resolve('../phone-shop/package.json')
  );
  for (const pkg of candidates) {
    if (!fs.existsSync(pkg)) continue;
    try { return createRequire(pkg)('playwright'); } catch {}
  }
  throw new Error('Không tìm thấy thư viện playwright.');
}

function findFFmpeg() {
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const check = cmd => spawnSync(cmd, ['-version'], { stdio: 'ignore' }).status === 0;
  if (check('ffmpeg')) return 'ffmpeg';
  const local = path.join(os.homedir(), 'AppData/Local/CapCut/Apps');
  if (fs.existsSync(local)) {
    for (const d of fs.readdirSync(local).sort().reverse()) {
      const exe = path.join(local, d, 'ffmpeg.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error('Không tìm thấy ffmpeg. Hãy đặt biến môi trường FFMPEG.');
}

function pickVideoEncoder(ff) {
  const out = spawnSync(ff, ['-encoders'], { encoding: 'utf8' }).stdout || '';
  if (out.includes('libx264')) return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high'];
  if (out.includes('h264_nvenc')) return ['-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '20', '-b:v', '5M'];
  if (out.includes('h264_amf')) return ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cqp', '-qp_i', '20', '-qp_p', '21', '-qp_b', '22'];
  if (out.includes('h264_qsv')) return ['-c:v', 'h264_qsv', '-global_quality', '20'];
  return ['-c:v', 'h264_mf', '-b:v', '6M'];
}

// Tạo nhạc nền guitar acoustic ấm nhẹ + âm click/chime khớp thời điểm bấm chọn vật liệu
function buildSoundtrackWav(wavPath, durSec, clickTimes = []) {
  const SR = 44100, N = Math.ceil(durSec * SR);
  const L = new Float32Array(N), R = new Float32Array(N);

  // Vòng hợp âm: Cmaj9 -> G6 -> Am9 -> Fmaj7 (mỗi ô nhịp 2,133 s ~ 112.5 BPM)
  const chords = [
    [130.81, 196.00, 246.94, 293.66, 329.63, 392.00], // C2 G3 B3 D4 E4 G4
    [98.00,  196.00, 246.94, 293.66, 329.63, 392.00], // G2 G3 B3 D4 E4 G4
    [110.00, 164.81, 220.00, 261.63, 329.63, 392.00], // A2 E3 A3 C4 E4 G4
    [87.31,  174.61, 220.00, 261.63, 329.63, 440.00], // F2 F3 A3 C4 E4 A4
  ];
  const pattern = [0, 2, 3, 4, 5, 3, 4, 2]; // rải 8 nốt mỗi ô nhịp
  const stepSec = 0.265;

  function addPluck(tStart, freq, amp, pan = 0, ring = 1.6) {
    const i0 = Math.floor(tStart * SR);
    const len = Math.min(N - i0, Math.floor(ring * SR));
    if (len <= 0 || i0 < 0) return;
    const gL = amp * Math.cos((pan + 1) * Math.PI * 0.25);
    const gR = amp * Math.sin((pan + 1) * Math.PI * 0.25);
    for (let k = 0; k < len; k++) {
      const dt = k / SR;
      const att = Math.min(1, dt / 0.004);
      const s = att * (
        Math.sin(2 * Math.PI * freq * dt) * Math.exp(-dt * 2.4) * 0.68 +
        Math.sin(4 * Math.PI * freq * dt + 0.3) * Math.exp(-dt * 4.8) * 0.22 +
        Math.sin(6 * Math.PI * freq * dt + 0.7) * Math.exp(-dt * 8.2) * 0.08 +
        Math.sin(8 * Math.PI * freq * dt) * Math.exp(-dt * 13.0) * 0.03
      );
      L[i0 + k] += s * gL;
      R[i0 + k] += s * gR;
    }
  }

  const totalSteps = Math.floor(durSec / stepSec);
  for (let s = 0; s < totalSteps; s++) {
    const t = s * stepSec;
    const bar = Math.floor(s / 8) % chords.length;
    const stepInBar = s % 8;
    const ch = chords[bar];
    if (stepInBar === 0) addPluck(t, ch[0], 0.14, 0.0, 2.2); // nốt trầm đầu ô nhịp
    const noteIdx = pattern[stepInBar];
    const pan = ((stepInBar % 4) - 1.5) * 0.32;
    const vel = stepInBar % 2 === 0 ? 0.105 : 0.078;
    addPluck(t + (stepInBar % 2) * 0.008, ch[noteIdx], vel, pan, 1.55);
  }

  // Âm click + chuông nhẹ khi bấm đổi vật liệu trên giao diện 3D
  for (const ct of clickTimes) {
    const i0 = Math.floor(ct * SR);
    const len = Math.min(N - i0, Math.floor(0.38 * SR));
    for (let k = 0; k < len; k++) {
      if (i0 + k < 0) continue;
      const dt = k / SR;
      const click = Math.sin(2 * Math.PI * 1450 * dt) * Math.exp(-dt * 95) * 0.18;
      const chime = (
        Math.sin(2 * Math.PI * 1046.5 * dt) * Math.exp(-dt * 11) * 0.10 +
        Math.sin(2 * Math.PI * 1567.98 * dt) * Math.exp(-dt * 15) * 0.07
      );
      L[i0 + k] += click + chime;
      R[i0 + k] += click + chime;
    }
  }

  // Fade-in 0.8s & Fade-out 1.5s, xuất WAV 16-bit stereo
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.85) * Math.min(1, (durSec - t) / 1.5);
    const cl = Math.max(-0.96, Math.min(0.96, L[i] * env));
    const cr = Math.max(-0.96, Math.min(0.96, R[i] * env));
    buf.writeInt16LE(Math.round(cl * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(cr * 32767), 44 + i * 4 + 2);
  }
  fs.writeFileSync(wavPath, buf);
}

const [target = 'video/Phim_Tham_Quan_3D.mp4', ...rest] = process.argv.slice(2);
const FPS = 30;
const { chromium } = loadPlaywright();

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.resolve('phim-tham-quan.html')).href + '?render');
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });

const dur = await page.evaluate(() => window.DUR);
const clickTimes = await page.evaluate(() => window.CLICK_TIMES || []);
const grab = () => page.screenshot({ type: 'jpeg', quality: 94 });

if (rest[0] === '--stills') {
  fs.mkdirSync(target, { recursive: true });
  for (const a of rest.slice(1)) {
    const t = Number(a);
    await page.evaluate(t => window.seek(t), t);
    const file = path.join(target, `still-${String(t).replace('.', '_')}.jpg`);
    fs.writeFileSync(file, await grab());
    console.log('Đã xuất ảnh kiểm tra:', file);
  }
} else {
  const ff = findFFmpeg();
  const encArgs = pickVideoEncoder(ff);
  const outFile = path.resolve(target);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const tmpDir = path.resolve('out/tham-quan');
  fs.mkdirSync(tmpDir, { recursive: true });
  const wavFile = path.join(tmpDir, 'music.wav');
  buildSoundtrackWav(wavFile, dur, clickTimes);

  const totalFrames = Math.round(dur * FPS);
  // Xuất chuẩn 1280×720 30fps sắc nét (đồng bộ với video/Phim_nhaPho.mp4, nhẹ để phát nhanh trên web)
  const ffArgs = [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', wavFile,
    '-vf', 'scale=1280:720:flags=lanczos,fade=t=in:st=0:d=0.45,fade=t=out:st=' + (dur - 0.65).toFixed(2) + ':d=0.65',
    ...encArgs,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart',
    outFile,
  ];
  console.log(`Đang dựng ${totalFrames} khung (${dur}s @ ${FPS}fps) bằng ${encArgs[1]}...`);
  const proc = spawn(ff, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < totalFrames; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    const jpg = await grab();
    if (!proc.stdin.write(jpg)) await new Promise(r => proc.stdin.once('drain', r));
    if ((f + 1) % 150 === 0 || f === totalFrames - 1) {
      console.log(`  tiến độ: ${f + 1}/${totalFrames} khung (${(((f + 1) / totalFrames) * 100).toFixed(0)}%)`);
    }
  }
  proc.stdin.end();
  await new Promise((res, rej) => proc.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg mã lỗi ${c}`))));
  const mb = (fs.statSync(outFile).size / 1e6).toFixed(2);
  console.log(`Hoàn tất: ${outFile} (${mb} MB) trong ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

await browser.close();
