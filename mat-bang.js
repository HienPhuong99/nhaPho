/* Dữ liệu và hàm vẽ mặt bằng, mặt cắt nhà phố 4,2 × 18 m (KT-03) */
const T = 0.1, h = T / 2;
const k = v => +(v * 100).toFixed(1);                 // mét -> đơn vị SVG (cm)
const f1 = n => n.toFixed(1).replace('.', ',');
const f2 = n => n.toFixed(2).replace('.', ',');
let out, id;
const add = s => out.push(s);

// Toạ độ bản vẽ: X dọc nhà (0 = mặt tiền), Y bề ngang tính từ tường hông bên phải (đứng ở cửa nhìn vào).
// SVG mặt bằng: x = 4,2 − Y, y = X (mặt tiền ở trên, đi vào thì hành lang bên trái, thang bên phải).
let mir = false;
const my = y => mir ? 4.2 - y : y;
const rect = (x1, y1, x2, y2, cls, extra = '') => { const a = my(y1), b = my(y2);
  add(`<rect x="${k(Math.min(a, b))}" y="${k(x1)}" width="${k(Math.abs(b - a))}" height="${k(x2 - x1)}" class="${cls}" ${extra}/>`); };
const line = (x1, y1, x2, y2, cls) =>
  add(`<line x1="${k(my(y1))}" y1="${k(x1)}" x2="${k(my(y2))}" y2="${k(x2)}" class="${cls}"/>`);

function text(x, y, lines, { rot = 0, cls = '' } = {}) {
  const cx = k(my(y)), cy = k(x), lh = 25;
  const t = lines.map((s, i) =>
    `<tspan x="${cx}" y="${(cy + (i - (lines.length - 1) / 2) * lh).toFixed(1)}" class="${i ? 'rs' : 'rn'}">${s}</tspan>`).join('');
  add(`<text class="lbl ${cls}" ${rot ? `transform="rotate(-90 ${cx} ${cy})"` : ''}>${t}</text>`);
}

// Tường thẳng theo trục, gaps = các khoảng trống [từ, đến] (đã sắp xếp)
function wall(x1, y1, x2, y2, gaps = []) {
  const alongY = x1 === x2;
  let s = (alongY ? y1 : x1) - h;
  const e = (alongY ? y2 : x2) + h;
  for (const [a, b] of [...gaps, [e, e]]) {
    if (a > s) alongY ? rect(x1 - h, s, x1 + h, a, 'wall') : rect(s, y1 - h, a, y1 + h, 'wall');
    s = b;
  }
}

function win(x1, y1, x2, y2) {
  if (x1 === x2) {
    for (const d of [-h, 0, h]) line(x1 + d, y1, x1 + d, y2, 'win');
    line(x1 - h, y1, x1 + h, y1, 'win'); line(x1 - h, y2, x1 + h, y2, 'win');
  } else {
    for (const d of [-h, 0, h]) line(x1, y1 + d, x2, y1 + d, 'win');
    line(x1, y1 - h, x1, y1 + h, 'win'); line(x2, y1 - h, x2, y1 + h, 'win');
  }
}

// Cửa đi: bản lề H, mép đóng E, (ox, oy) = hướng mở
function door(hx, hy, ex, ey, ox, oy) {
  const w = Math.hypot(ex - hx, ey - hy), lx = hx + ox * w, ly = hy + oy * w;
  const H = [k(my(hy)), k(hx)], L = [k(my(ly)), k(lx)], E = [k(my(ey)), k(ex)];
  const cr = (L[0] - H[0]) * (E[1] - H[1]) - (L[1] - H[1]) * (E[0] - H[0]);
  add(`<path class="arc" d="M${L} A${k(w)} ${k(w)} 0 0 ${cr > 0 ? 1 : 0} ${E}"/>` +
      `<line class="leaf" x1="${H[0]}" y1="${H[1]}" x2="${L[0]}" y2="${L[1]}"/>`);
}

function bed(x1, y1, x2, y2) {             // đầu giường ở phía y2
  const m = (x1 + x2) / 2;
  rect(x1, y1, x2, y2, 'furn');
  rect(x1 + .08, y2 - .4, m - .04, y2 - .1, 'furn');
  rect(m + .04, y2 - .4, x2 - .08, y2 - .1, 'furn');
  line(x1, y2 - .55, x2, y2 - .55, 'thin');
}

const tick = (sx, sy) => add(`<line class="dim" x1="${sx - 6}" y1="${sy + 6}" x2="${sx + 6}" y2="${sy - 6}" style="stroke-width:2"/>`);

// Chuỗi kích thước theo X, đường kích thước ở Y = pos, đường dóng bắt đầu từ Y = from
function chainX(pts, pos, from, lab = []) {
  const P = k(my(pos)), dir = Math.sign(my(pos) - my(from));
  add(`<line class="dim" x1="${P}" y1="${k(pts[0])}" x2="${P}" y2="${k(pts.at(-1))}"/>`);
  for (const p of pts) { add(`<line class="ext" x1="${k(my(from))}" y1="${k(p)}" x2="${P + dir * 10}" y2="${k(p)}"/>`); tick(P, k(p)); }
  for (let i = 1; i < pts.length; i++) {
    const m = k((pts[i - 1] + pts[i]) / 2), tx = P - 8;
    add(`<text class="dt" x="${tx}" y="${m}" transform="rotate(-90 ${tx} ${m})">${lab[i - 1] ?? f1(pts[i] - pts[i - 1])}</text>`);
  }
}
// Chuỗi kích thước theo Y, đường kích thước ở X = pos
function chainY(pts, pos, from, lab = []) {
  const P = k(pos), dir = Math.sign(pos - from);
  add(`<line class="dim" x1="${k(my(pts[0]))}" y1="${P}" x2="${k(my(pts.at(-1)))}" y2="${P}"/>`);
  for (const p of pts) { add(`<line class="ext" x1="${k(my(p))}" y1="${k(from)}" x2="${k(my(p))}" y2="${P + dir * 10}"/>`); tick(k(my(p)), P); }
  for (let i = 1; i < pts.length; i++)
    add(`<text class="dt" x="${k(my((pts[i - 1] + pts[i]) / 2))}" y="${P - 8}">${lab[i - 1] ?? f1(pts[i] - pts[i - 1])}</text>`);
}

// Thang chữ U trong lõi x=6,0–8,8 / y=1,0–4,2: vế chạy theo bề ngang, chiếu nghỉ phía y=4,2
const H_TRET = 3.78, N1 = 11, N2 = 11, RISE = H_TRET / (N1 + N2), TREAD = 0.21, LANDING = 0.9;
function stair(upper) {
  const yL = 4.15 - LANDING;
  for (const [a, b, n] of [[6.05, 7.35, N1], [7.45, 8.75, N2]]) {
    const y0 = yL - (n - 1) * TREAD;
    rect(a, y0, b, yL, 'flight');
    for (let i = 0; i < n; i++) line(a, y0 + i * TREAD, b, y0 + i * TREAD, 'riser');
  }
  rect(7.35, yL - (N1 - 1) * TREAD, 7.45, yL, 'well');
  add(`<circle class="dot" cx="${k(my(1.3))}" cy="${k(6.7)}" r="5"/>`);
  add(`<path class="up" marker-end="url(#ar-${id})" d="M${k(my(1.3))},${k(6.7)} L${k(my(3.5))},${k(6.7)} L${k(my(3.5))},${k(8.1)} L${k(my(1.5))},${k(8.1)}"/>`);
  text(6.42, 1.62, ['LÊN'], { cls: 'up-t' });
  text(7.4, 3.88, ['CHIẾU NGHỈ 0,9 m'], { rot: 1, cls: 'sm' });
  if (upper) { line(6.05, 1.08, 7.45, 1.08, 'rail'); line(6.05, 1.12, 7.45, 1.12, 'rail'); } // lan can ô thang
}

const GROUND = {
  id: 'g', name: 'Tầng trệt', front: 0, band: [0, 0.6, 6, 8.8, 12.5, 16.5, 18],
  rooms: [
    { n: 'Tam cấp', x: [0, 0.6], y: [0, 4.2], c: 'balc', l: [0.3, 3.75], one: 1, lab: 'TAM CẤP' },
    { n: 'Phòng khách', x: [0.6, 6], y: [0, 4.2], l: [3.3, 2.1] },
    { n: 'Lối đi', x: [6, 8.8], y: [0, 1], c: 'corr', rot: 1 },
    { n: 'Cầu thang U', x: [6, 8.8], y: [1, 4.2], l: [7.4, 2.3], stair: 1 },
    { n: 'Bếp', x: [8.8, 12.5], y: [0, 4.2], l: [10.3, 1.9] },
    { n: 'Phòng ngủ 1', x: [12.5, 16.5], y: [1, 4.2], l: [13.45, 2.9] },
    { n: 'NVS', x: [16.5, 18], y: [1, 4.2], c: 'wet', l: [17.25, 3.0] },
    { n: 'Hành lang', x: [12.5, 18], y: [0, 1], c: 'corr', rot: 1 },
  ],
  draw() {
    wall(0, 0, 18, 0); wall(0, 4.2, 18, 4.2);
    wall(0.6, 0, 0.6, 4.2, [[0.9, 3.3]]); wall(18, 0, 18, 4.2, [[2.2, 3.2]]);
    // tam cấp: mặt đường −0,32 → bậc +0,16 → nền ±0,00
    line(0, 0.05, 0, 4.15, 'riser'); line(0.3, 0.05, 0.3, 4.15, 'riser');
    text(0.3, 0.45, ['2 bậc × 16'], { cls: 'h-balc sm' });
    wall(6, 1, 6, 4.2); wall(8.8, 1, 8.8, 4.2); wall(12.5, 1, 12.5, 4.2); wall(16.5, 1, 16.5, 4.2);
    wall(12.5, 1, 18, 1, [[12.65, 13.55], [16.65, 17.35]]);
    win(18, 2.2, 18, 3.2);
    // cửa chính nhôm kính 4 cánh × 0,6 m mở ra ngoài (khảo sát lần 2): cánh quét hết 0,6 m tam cấp, không lấn ra vỉa hè;
    // hai cánh giữa bản lề vào cánh bên, mở thường ngày; khung sắt bảo vệ đặt phía trong
    door(0.6, 0.9, 0.6, 1.5, -1, 0); door(0.6, 1.5, 0.6, 2.1, -1, 0); door(0.6, 2.7, 0.6, 2.1, -1, 0); door(0.6, 3.3, 0.6, 2.7, -1, 0);
    line(0.72, 0.9, 0.72, 3.3, 'grille');
    door(12.65, 1, 13.55, 1, 0, 1); door(16.65, 1, 17.35, 1, 0, 1);
    // bệ bếp chữ L + bếp nấu + chậu rửa
    rect(9.0, 3.55, 12.45, 4.15, 'counter'); rect(11.85, 2.0, 12.45, 3.55, 'counter');
    for (const x of [9.45, 9.9]) add(`<circle class="furn" cx="${k(my(3.85))}" cy="${k(x)}" r="13"/>`);
    rect(10.6, 3.65, 11.2, 4.05, 'furn');
    bed(14.5, 1.95, 16.3, 4.15);   // giường cũ 1,8 × 2,2 m (khảo sát lần 2)
    line(12.65, 1.13, 16.45, 1.13, 'hiwin');   // ô kính mờ cao ≥ 1,8 m: vách hành lang và trên cửa PN1
    text(14.3, 1.36, ['ô kính mờ cao ≥ 1,8 m'], { cls: 'sm' });
  },
};

// Khảo sát lần 2 (01/11/2026, 19h38): ranh đất trùng mép tường mặt tiền, xin phép ban công 1,2 m và xây đúng giấy phép,
// nên tường mặt tiền lầu ở x = 0 (phòng thờ 2,0 × 4,2 m), ban công 1,2 m để hở. Mặt tiền lầu: cửa đi 1 cánh 0,8 m mở vào
// (phía hành lang) và cửa sổ 2 cánh mở hất ra ngoài. Phía sau chia dọc: khu phơi y = 0–2,1 lợp tấm lấy sáng, nhà tắm y = 2,1–4,2.
const XF = 0;
const UPPER = {
  id: 'u', name: 'Tầng lầu', front: -1.2, band: [-1.2, XF, 2, 6, 8.8, 14.8, 18], back: [0, 2.1, 4.2],
  rooms: [
    { n: 'Ban công', x: [-1.2, XF], y: [0, 4.2], c: 'balc', l: [-0.6, 2.1], one: 1 },
    { n: 'Phòng thờ', x: [XF, 2], y: [0, 4.2], l: [0.75, 2.2] },
    { n: 'Phòng ngủ 2', x: [2, 6], y: [1, 4.2], l: [3.3, 2.9] },
    { n: 'Cầu thang U', x: [6, 8.8], y: [1, 4.2], l: [7.4, 2.3], stair: 1 },
    { n: 'Phòng ngủ 3', x: [8.8, 14.8], y: [1, 4.2], l: [10.9, 2.7] },
    { n: 'Hành lang', x: [2, 14.8], y: [0, 1], c: 'corr', rot: 1 },
    { n: 'Khu phơi', x: [14.8, 18], y: [0, 2.1], c: 'dry', l: [16.75, 1.05] },
    { n: 'Nhà tắm', x: [14.8, 18], y: [2.1, 4.2], c: 'wet', l: [16.15, 3.0] },
  ],
  draw() {
    wall(XF, 0, 18, 0); wall(XF, 4.2, 18, 4.2);
    wall(XF, 0, XF, 4.2, [[0.15, 0.95], [2.3, 3.7]]); wall(18, 0, 18, 4.2, [[2.8, 3.7]]);
    wall(2, 0, 2, 4.2, [[0.1, 0.9]]);
    wall(6, 1, 6, 4.2, [[2.0, 3.2]]); wall(8.8, 1, 8.8, 4.2, [[2.0, 3.2]]);
    wall(14.8, 0, 14.8, 4.2, [[0.1, 0.9], [1.1, 1.95]]); wall(14.8, 2.1, 18, 2.1, [[15.0, 15.75]]);
    wall(2, 1, 6, 1, [[2.15, 3.05]]); wall(8.8, 1, 14.8, 1, [[8.95, 9.85]]);
    win(XF, 2.3, XF, 3.7); line(XF - h, 3.0, XF + h, 3.0, 'win');                  // cửa sổ 2 cánh mặt tiền, mở hất ra ngoài
    win(6, 2.0, 6, 3.2); win(8.8, 2.0, 8.8, 3.2); win(14.8, 1.1, 14.8, 1.95); win(18, 2.8, 18, 3.7);
    door(XF, 0.15, XF, 0.95, 1, 0);                                                // cửa 1 cánh ra ban công, mở vào
    door(2, 0.1, 2, 0.9, -1, 0);                                                   // phòng thờ - hành lang
    door(2.15, 1, 3.05, 1, 0, 1); door(8.95, 1, 9.85, 1, 0, 1);
    door(14.8, 0.1, 14.8, 0.9, 1, 0); door(15.0, 2.1, 15.75, 2.1, 0, 1);
    for (const y of [-1.2, -1.14]) line(y, 0, y, 4.2, 'rail');    // lan can ban công
    line(-1.2, 0, XF, 0, 'rail'); line(-1.2, 4.2, XF, 4.2, 'rail');
    rect(1.55, 1.5, 1.95, 3.2, 'altar');
    rect(14.85, 0.05, 17.95, 2.05, 'roofc'); text(15.75, 1.55, ['mái tấm lấy sáng'], { cls: 'sm' });   // che hết khu phơi (khảo sát lần 2)
    rect(17.0, 2.15, 17.95, 4.15, 'arc');                         // chỗ tắm đứng
    rect(16.25, 3.6, 16.75, 4.15, 'furn'); rect(15.85, 3.65, 16.15, 4.15, 'counter');   // bồn cầu, lavabo
    rect(17.25, 0.05, 17.9, 0.7, 'furn'); text(17.57, 0.38, ['máy giặt'], { cls: 'sm' });
    bed(4.3, 2.15, 5.7, 4.15); bed(12.8, 1.95, 14.4, 4.15);   // giường cũ: PN2 1,4 × 2,0; PN3 1,6 × 2,2 (lùi 10 cm tránh cột)
  },
};

// Mặt cắt A–A: cắt dọc nhà ở y = 0,5 (hành lang), nhìn về phía y = 4,2 (phía thang), nên mặt tiền nằm bên phải.
// Toạ độ (X, Z = cao độ); SVG: x = 18 − X, y = −Z
const H_LAU = 3.6, SLAB = 0.12, ROAD = -0.32, CEIL = 3.3, ZR = H_TRET + H_LAU, DOOR = 2.2;
// mái tôn dốc từ mặt tiền ra sau (giống mô hình 3D): cao ZR + 0,8 ở x = 0, ZR + 0,25 ở x = 14,8
const RF_HI = ZR + 0.8, RF_LO = ZR + 0.25, RF_END = 14.8, roofZ = x => RF_HI + (RF_LO - RF_HI) * x / RF_END;
const Q = x => 18 - x;
const sr = (x1, z1, x2, z2, cls, extra) => rect(-z2, Q(x2), -z1, Q(x1), cls, extra);
const sl = (x1, z1, x2, z2, cls) => line(-z1, Q(x1), -z2, Q(x2), cls);
const st = (x, z, lines, o) => text(-z, Q(x), lines, o);
const lvl = z => (z > 0 ? '+' : z < 0 ? '−' : '±') + f2(Math.abs(z));

function section() {
  out = []; id = 's';
  const H1 = H_TRET, HG = H1 - SLAB, HU = ZR - SLAB, hx = 'fill="url(#hx-s)"';
  add(`<defs>
    <marker id="am-s" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" orient="auto"><path class="ink-head" d="M0,0 L10,5 L0,10 z"/></marker>
    <pattern id="hx-s" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="14"/></pattern>
  </defs>`);
  // đất, mặt đường, khối nền tôn cao 0,32 m, tam cấp
  sr(-2.6, ROAD - 0.28, 19.2, ROAD, '', hx);
  sl(-2.6, ROAD, 0, ROAD, 'rail'); sl(18.05, ROAD, 19.2, ROAD, 'rail');
  for (const [a, b, z] of [[0, 0.3, ROAD + 0.16], [0.3, 18.05, 0]]) { sr(a, ROAD, b, z, 'flight'); sr(a, ROAD, b, z, '', hx); }
  st(-1.3, 0.25, ['← 2 bậc × 16 cm'], { cls: 'sm' });
  // thấy phía sau mặt cắt (nét mảnh)
  for (const x of [6, 8.8, 12.5, 16.5]) sr(x - h, 0, x + h, HG, 'bey');            // đầu tường tại y = 1
  for (const x of [6, 8.8]) sr(x - h, H1, x + h, HU, 'bey');
  for (const [a, b, z] of [[12.65, 13.55, 0], [16.65, 17.35, 0], [2.15, 3.05, H1], [8.95, 9.85, H1], [15.0, 15.75, H1]]) sr(a, z, b, z + DOOR, 'bey');
  sr(14.8, H1, 18, ZR, 'bey');                                                      // vách nhà tắm lầu (y = 2,1) phía sau
  // tường hồi phía trên đỉnh tường hông (thấy phía sau), ô sàn và bồn nước trên nhà tắm
  add(`<polyline class="bey" points="${[[XF, ZR], [XF, roofZ(XF)], [RF_END, RF_LO], [RF_END, ZR]].map(([x, z]) => `${k(Q(x))},${k(-z)}`).join(' ')}"/>`);
  sr(14.8, ZR - SLAB, 18, ZR, 'bey'); sr(16.8, ZR, 17.9, ZR + 1.15, 'bey');
  sr(9.0, 0, 12.45, 0.85, 'counter'); sr(1.55, H1, 1.95, H1 + 0.9, 'altar');
  // thang: vế 1 từ nền lên chiếu nghỉ, vế 2 từ chiếu nghỉ lên sàn lầu, dưới vế 2 là gầm thang
  sr(7.45, 0, 8.75, N1 * RISE, 'bey'); sr(7.35, 0, 7.45, N1 * RISE + 1, 'bey');
  sr(6.05, 0, 7.35, N1 * RISE, 'flight'); sr(7.45, N1 * RISE, 8.75, H1, 'flight');
  for (let i = 1; i < N1; i++) sl(6.05, i * RISE, 7.35, i * RISE, 'riser');
  for (let i = 1; i < N2; i++) sl(7.45, (N1 + i) * RISE, 8.75, (N1 + i) * RISE, 'riser');
  sl(6.05, H1 + 0.9, 7.45, H1 + 0.9, 'rail');                                     // lan can ô thang
  for (let i = 0; i <= 4; i++) sl(6.05 + i * 0.35, H1, 6.05 + i * 0.35, H1 + 0.9, 'thin');
  sl(0.65, CEIL, 17.95, CEIL, 'arc');                                              // trần thạch cao trệt
  sl(XF + h, H1 + 3.2, 14.75, H1 + 3.2, 'arc');                                     // trần thạch cao lầu
  // phần bị cắt (tô đặc): tường, sàn, mái
  sr(0.55, -0.1, 18.05, 0, 'wall');
  sr(0.55, 0, 0.65, HG, 'wall'); sr(17.95, 0, 18.05, HG, 'wall');
  sr(-1.2, HG, 18.05, H1, 'wall');
  sr(17.95, H1, 18.05, ZR, 'wall');                                                  // tường sau khu phơi
  for (const x of [2, 14.8]) sr(x - h, H1 + DOOR, x + h, ZR, 'wall');               // cắt qua cửa đi: còn lanh tô
  sr(XF - h, H1 + DOOR, XF + h, roofZ(XF) + 0.15, 'wall');                           // mặt tiền lầu (cắt qua cửa ra ban công) + tường chắn mái
  // mái tôn (nét đậm mỏng), mái nâng trên giếng trời thang, mái che lối đi khu phơi
  const tole = (x1, x2, up = 0) => add(`<polygon class="roof" points="${[[x1, roofZ(x1) + up], [x2, roofZ(x2) + up], [x2, roofZ(x2) + up - 0.05], [x1, roofZ(x1) + up - 0.05]].map(([x, z]) => `${k(Q(x))},${k(-z)}`).join(' ')}"/>`);
  tole(XF, 6); tole(8.8, RF_END);
  add(`<polygon class="glass" points="${[[6, roofZ(6) + .03], [8.8, roofZ(8.8) + .03], [8.8, roofZ(8.8) - .03], [6, roofZ(6) - .03]].map(([x, z]) => `${k(Q(x))},${k(-z)}`).join(' ')}"/>`);   // giếng trời: tấm lấy sáng kín
  sr(14.8, ZR + 0.3, 18.05, ZR + 0.34, 'glass');                                  // mái tấm lấy sáng khu phơi, hở 0,3 m trên đỉnh tường
  sr(-1.2, H1, -1.16, H1 + 1.1, 'glass');                                            // lan can kính ban công
  // tên không gian
  st(3.3, 1.8, ['PHÒNG KHÁCH']); st(6.7, 2.75, ['CẦU THANG', '22 × 17,2 cm'], { cls: 'sm' });
  st(8.1, 0.9, ['GẦM THANG'], { cls: 'sm' }); st(10.65, 1.9, ['BẾP']); st(15, 1.7, ['HÀNH LANG']);
  st(13.1, 1.1, ['PN1'], { cls: 'sm' }); st(17, 1.1, ['NVS'], { cls: 'sm' });
  st(3.3, 3.48, ['trần thạch cao ≈ +3,30'], { cls: 'sm' });
  st(-0.6, 5.3, ['BAN CÔNG'], { rot: 1, cls: 'sm' }); st(1.0, 5.9, ['PHÒNG THỜ']);
  st(5.5, 7.95, ['MÁI TÔN'], { cls: 'sm' }); st(15.6, ZR + 0.62, ['tấm lấy sáng'], { cls: 'sm' });
  st(17.35, ZR + 0.6, ['bồn', '1.000 L'], { cls: 'sm' });
  st(2.6, 4.9, ['PN2'], { cls: 'sm' }); st(9.4, 4.9, ['PN3'], { cls: 'sm' });
  st(7.4, 5.6, ['Ô THANG', 'giếng trời, tấm lấy sáng'], { cls: 'sm' }); st(11.9, 5.6, ['HÀNH LANG LẦU']);
  st(16.6, 5.3, ['KHU PHƠI', 'có mái lấy sáng']); st(16.6, 6.75, ['vách nhà tắm phía sau'], { cls: 'sm' });
  // cao độ
  for (const [z, s] of [[ZR, 'ĐỈNH TƯỜNG'], [H1, 'SÀN LẦU'], [0, 'NỀN TRỆT'], [ROAD, 'MẶT ĐƯỜNG']]) {
    add(`<path class="ink-head" d="M${k(Q(18.5))},${k(-z)} l-9,-15 h18 z"/>`);
    sl(18.5, z, 19.9, z, 'thin');
    add(`<text class="lv" text-anchor="end" x="${k(Q(18.68))}" y="${k(-z) - 5}">${lvl(z)} ${s}</text>`);
  }
  // kích thước (chainX/chainY nhận toạ độ SVG nên đổi qua Q)
  const qs = a => a.map(Q).reverse();
  chainX([-ZR, -H1, 0, -ROAD], Q(20.45), Q(19.95), [f2(H_LAU), f2(H1), f2(-ROAD)]);
  chainX([-CEIL, 0], Q(-2.3), Q(-1.3), ['≈ 3,30 tới trần']);
  chainX([-(H1 + 3.2), -H1], Q(-2.3), Q(-1.3), ['≈ 3,20 tới trần']);
  chainY(qs([-1.2, 0, 2, 6, 8.8, 14.8, 18]), -8.75, -8.4);
  chainY(qs([0, 0.6, 6, 8.8, 12.5, 16.5, 18]), 1.05, 0.62);
  // mặt tiền, thước tỷ lệ
  add(`<line class="arrow" x1="${k(Q(-0.35))}" y1="${k(-1.7)}" x2="${k(Q(-1.45))}" y2="${k(-1.7)}" marker-end="url(#am-s)"/>`);
  add(`<text class="mt" text-anchor="middle" x="${k(Q(-0.9))}" y="${k(-2.05)}">MẶT TIỀN</text>`);
  for (let i = 0; i < 4; i++) rect(1.45, i, 1.53, i + 1, i % 2 ? 'sb1' : 'sb0');
  for (let i = 0; i <= 4; i++) add(`<text class="dt" x="${k(i)}" y="${k(1.85)}">${i}${i === 4 ? ' m' : ''}</text>`);
  return `<svg viewBox="-285 -935 2360 1135" role="img" aria-label="Mặt cắt dọc A–A, mặt tiền bên phải">${out.join('')}</svg>`;
}

const dims = r => [r.x[1] - r.x[0], r.y[1] - r.y[0]];

// overlay(f): vẽ thêm lớp riêng của từng trang (cột, ổ điện…) theo cùng hệ toạ độ mặt bằng
function draw(f, overlay) {
  out = []; id = f.id; mir = true;
  const Xf = f.front, top = Xf - 2.05, bottom = 19.55;
  add(`<defs>
    <marker id="ar-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto"><path class="up-head" d="M0,0 L10,5 L0,10 z"/></marker>
    <marker id="am-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" orient="auto"><path class="ink-head" d="M0,0 L10,5 L0,10 z"/></marker>
    <pattern id="hx-${id}" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="14"/></pattern>
  </defs>`);
  for (const r of f.rooms) {
    if (r.c === 'dry') { rect(r.x[0], r.y[0], r.x[1], r.y[1], 'dry-bg'); rect(r.x[0], r.y[0], r.x[1], r.y[1], '', `fill="url(#hx-${id})"`); }
    else if (r.c) rect(r.x[0], r.y[0], r.x[1], r.y[1], r.c);
  }
  stair(Xf < 0);
  f.draw();
  for (const r of f.rooms) {
    const [L, W] = dims(r), N = r.n.toUpperCase(), cls = r.c && r.c !== 'dry' ? 'h-' + r.c : '';
    if (r.rot) text((r.x[0] + r.x[1]) / 2, 0.5, [`${N} · ${f2(L * W)} m²`, `${f1(L)} × ${f1(W)} m`], { rot: 1, cls });
    else if (r.one) text(r.l[0], r.l[1], [r.lab ?? `${N} · ${f1(L)} × ${f1(W)} m · ${f2(L * W)} m²`], { cls: cls + ' sm' });
    else text(r.l[0], r.l[1], [N, `${f1(L)} × ${f1(W)} m`, `${f2(L * W)} m²`], { cls });
  }
  // kích thước
  chainX(f.band, 4.75, 4.3);
  chainX(Xf < 0 ? [Xf, 0, 18] : [0, 18], -0.55, -0.1, Xf < 0 ? ['1,2', 'THÂN NHÀ 18,0'] : ['TỔNG 18,0']);
  chainY([0, 1, 4.2], Xf - 0.4, Xf - 0.05);
  chainY([0, 4.2], Xf - 0.85, Xf - 0.05);
  if (f.back) chainY(f.back, 18.45, 18.05);
  // ký hiệu mặt cắt A–A ở y = 0,5, mũi tên chỉ hướng nhìn (về phía y = 4,2)
  for (const [a, b, e] of [[Xf - 1.85, Xf - 1.25, Xf - 1.85], [18.15, 18.75, 18.75]]) {
    add(`<line class="cut" x1="${k(my(.5))}" y1="${k(a)}" x2="${k(my(.5))}" y2="${k(b)}"/>`);
    add(`<line class="arrow" x1="${k(my(.5))}" y1="${k(e)}" x2="${k(my(1.05))}" y2="${k(e)}" marker-end="url(#am-${id})"/>`);
    add(`<text class="mt" x="${k(my(.38))}" y="${k(a + b - e)}">A</text>`);
  }
  if (overlay) overlay(f);
  mir = false;   // phần dưới vẽ theo toạ độ SVG trực tiếp
  // mũi tên mặt tiền
  add(`<line class="arrow" x1="${k(.6)}" y1="${k(Xf - 1.15)}" x2="${k(.6)}" y2="${k(Xf - 1.85)}" marker-end="url(#am-${id})"/>`);
  add(`<text class="mt" x="${k(.85)}" y="${k(Xf - 1.5)}">MẶT TIỀN</text>`);
  // thước tỷ lệ 0–4 m
  for (let i = 0; i < 4; i++) rect(19.0, i, 19.1, i + 1, i % 2 ? 'sb1' : 'sb0');
  for (let i = 0; i <= 4; i++) add(`<text class="dt" x="${k(i)}" y="${k(19.4)}">${i}${i === 4 ? ' m' : ''}</text>`);
  return `<svg viewBox="-100 ${k(top)} 600 ${k(bottom - top)}" role="img" aria-label="Mặt bằng ${f.name}, mặt tiền ở phía trên">${out.join('')}</svg>`;
}

// diện tích phần phòng nằm trong ranh đất (x ≥ 0) và phần nhô ra ngoài (x < 0)
const inLot = r => Math.max(0, r.x[1] - Math.max(r.x[0], 0)) * (r.y[1] - r.y[0]);
const outLot = r => dims(r)[0] * dims(r)[1] - inLot(r);
function table(f) {
  const body = f.rooms.reduce((s, r) => s + inLot(r), 0);
  const extra = f.rooms.reduce((s, r) => s + outLot(r), 0);
  const rows = f.rooms.map(r => { const [L, W] = dims(r);
    return `<tr class="${r.c || ''}"><td>${r.n}</td><td>${f1(L)}</td><td>${f1(W)}</td><td>${f2(L * W)}</td></tr>`; }).join('');
  return `<thead><tr><th>Phòng</th><th>Dài (m)</th><th>Rộng (m)</th><th>Diện tích (m²)</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td>Thân nhà</td><td>18,0</td><td>4,2</td><td>${f2(body)}</td></tr>
    ${extra ? `<tr><td>Nhô ra ngoài ranh đất</td><td></td><td></td><td>${f2(extra)}</td></tr><tr><td>Tổng sàn kể cả phần nhô ra</td><td></td><td></td><td>${f2(body + extra)}</td></tr>` : ''}</tfoot>`;
}

// Kiểm tra: dải phòng (y = 2,5) liền mạch 0 → 18; tổng diện tích thân nhà = 18 × 4,2
function checks(f, other) {
  const eq = (a, b) => Math.abs(a - b) < 1e-6;
  const band = f.rooms.filter(r => r.x[1] > 0 && r.y[0] <= 2.5 && r.y[1] >= 2.5).sort((a, b) => a.x[0] - b.x[0]);
  let at = Math.min(0, band[0].x[0]), cont = true;
  for (const r of band) { if (!eq(r.x[0], at)) cont = false; at = r.x[1]; }
  const area = f.rooms.reduce((s, r) => s + inLot(r), 0);
  const s1 = f.rooms.find(r => r.stair), s2 = other.rooms.find(r => r.stair);
  const items = [
    [cont && eq(at, 18), `Tổng chiều dài: ${band.map(r => f1(r.x[1] - r.x[0])).join(' + ')} = ${f1(at - Math.min(0, band[0].x[0]))} m${band[0].x[0] < 0 ? ` (gồm ${f1(-band[0].x[0])} m nhô ra ngoài ranh)` : ''}`],
    [eq(area, 18 * 4.2), `Diện tích trong ranh đất ${f2(area)} m² = 18,0 × 4,2 (không chồng, không hở)`],
    [s1.x + '' === s2.x + '' && s1.y + '' === s2.y + '', `Lõi thang x = ${f1(s1.x[0])}–${f1(s1.x[1])}, y = ${f1(s1.y[0])}–${f1(s1.y[1])} trùng với ${other.name.toLowerCase()}`],
    [RISE <= 0.175 && (N1 - 1) * TREAD + LANDING <= 3.2 - T + 1e-9,
      `Thang ${N1 + N2} bậc × ${f1(RISE * 100)} cm (≤ 17,5) = ${String(H_TRET).replace('.', ',')} m = cao tầng trệt; vế ${N1} bậc dài ${f2((N1 - 1) * TREAD)} + chiếu nghỉ ${f2(LANDING)} = ${f2((N1 - 1) * TREAD + LANDING)} m ≤ lòng 3,10 m`],
  ];
  return items.map(([ok, s]) => `<li class="${ok ? 'ok' : 'bad'}"><b>${ok ? 'ĐẠT' : 'LỖI'}</b><span>${s}</span></li>`).join('');
}
