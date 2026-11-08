// Ghép các cảnh của phim-render.mjs thành một phim bằng FilmCraft (github.com/storytold/filmcraft, CLI chạy không giao diện):
// chuỗi 1920×1080 30 fps, cảnh nối nhau mờ chồng 0,6 s, mở và kết bằng tối dần, xuất H.264.
//   FILMCRAFT=đường/dẫn/filmcraft-cli.exe node phim-dung.mjs out/phim
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'out/phim');
const FC = process.env.FILMCRAFT || 'filmcraft-cli';
const clips = fs.readdirSync(dir).filter(f => /^canh-\d+\.mp4$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
if (!clips.length) throw new Error(`Không có canh-*.mp4 trong ${dir}`);
const n = clips.length, out = path.join(dir, 'Phim_nhaPho.mp4');
// dự án mới: chuỗi = 4, các mục nhập = 5… (FilmCraft đánh số tuần tự)
// đoạn: 5+n, rồi mỗi chuyển cảnh chen một số (vd 5 cảnh: 10, 11, 13, 15, 17)
const items = clips.map((_, i) => 5 + i), first = 5 + n, last = n === 1 ? first : first + 1 + 2 * (n - 2);
const steps = [
  ['file.newSequence', { name: 'Phim nhaPho', width: 1920, height: 1080, fps: 30, audio: 0 }],
  ['file.import', { paths: clips.map(f => path.join(dir, f)) }],
  ['clip.automateToSequence', { items, ordering: 'selection', placement: 'sequentially', method: 'overwrite', overlapFrames: 18, videoTransition: true, audioTransition: false }],
  ['sequence.applyVideoTransition', { clip: first, effect: 'dip_to_black', frames: 20, edge: 'in', align: 'start' }],
  ['sequence.applyVideoTransition', { clip: last, effect: 'dip_to_black', frames: 30, edge: 'out', align: 'end' }],
  ['file.exportMedia', { path: out, format: 'h264', audio: false, bitrateMode: 'crf', crf: 17, h264Profile: 'high', wait: true }],
];
const script = path.join(dir, 'phim-dung.jsonl');
fs.writeFileSync(script, steps.map(([id, params]) => JSON.stringify({ id, params })).join('\n') + '\n');
const r = spawnSync(FC, ['run', script], { encoding: 'utf8' });
for (const line of (r.stdout || '').trim().split('\n')) {
  try { const j = JSON.parse(line); console.log(j.ok ? 'ok ' : 'LỖI', j.id, j.ok ? '' : JSON.stringify(j.error ?? j)); } catch { console.log(line); }
}
if (r.stderr) console.error(r.stderr.trim());
if (fs.existsSync(out)) console.log(out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
process.exit(r.status ?? 1);
