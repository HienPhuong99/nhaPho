/* Mô hình 3D nhà phố 4,2 × 18 m (KT-03) dùng chung cho 3d.html (xem từ ngoài) và di-bo.html (đi bộ trong nhà).
   nha3D() dựng toàn bộ cảnh và trả về các nhóm cùng danh sách khối hộp (boxes) theo toạ độ bản vẽ. */
function nha3D() {
  // Số liệu lấy từ bản vẽ KT-03 (mat-bang.html). Toạ độ bản vẽ: X dọc nhà (0 = mặt tiền), Y bề ngang.
  // Thế giới 3D: x = 4,2 − Y (đứng ở cửa nhìn vào: hành lang bên trái, thang bên phải), y = cao độ (nền trệt = 0), z = X.
  const WX = Y => 4.2 - Y;
  const T = 0.1, h = T / 2, SLAB = 0.12, H1 = 3.78, H2 = 3.6, ROAD = -0.32;
  const N1 = 11, N2 = 11, R = H1 / (N1 + N2), TR = 0.21, LAND = 0.9;
  const TOP = { d: 2.2, D: 2.6, w: 2.3 }, SILL = 0.9;   // giả định: cửa đi 2,2 m, cửa chính 2,6 m, cửa sổ 0,9–2,3 m

  const scene = new THREE.Scene();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o });
  const mat = {
    wall: M(0xf2efe9), slab: M(0xc4c1ba), plinth: M(0xa8a49c), tile: M(0xe6dccb), room: M(0xd9bd94),
    corr: M(0xbfe3c3), wet: M(0xcadcec), balc: M(0xd5dade), dry: M(0xd3cfc1), stair: M(0xc29a6c),
    wood: M(0x8d6240), bed: M(0xfbfbfb), pillow: M(0xd7e1ea), counter: M(0xaebfcd), altar: M(0xd6ae4f),
    road: M(0x55595e), walk: M(0xb9b6b0), ground: M(0x9db097), rail: M(0x34404a),
    glass: M(0x9fd3ff, { transparent: true, opacity: .35, depthWrite: false, roughness: .1 }), ceil: M(0xfafafa),
  };
  const base = new THREE.Group(), G = new THREE.Group(), U = new THREE.Group(), RF = new THREE.Group(), CEIL = new THREE.Group();
  scene.add(base, G, U, RF, CEIL);
  const boxes = [];

  function box(X1, X2, Y1, Y2, z1, z2, m, g) {
    const a = Math.min(X1, X2), b = Math.max(X1, X2), c = Math.min(Y1, Y2), d = Math.max(Y1, Y2);
    if (b - a < 1e-4 || d - c < 1e-4 || z2 - z1 < 1e-4) return null;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(d - c, z2 - z1, b - a), m);
    mesh.position.set(WX((c + d) / 2), (z1 + z2) / 2, (a + b) / 2);
    mesh.castShadow = mesh.receiveShadow = m !== mat.glass;
    g.add(mesh);
    boxes.push({ X1: a, X2: b, Y1: c, Y2: d, z1, z2, g });
    return mesh;
  }

  // Tường thẳng theo trục; gaps = [từ, đến, loại] với loại d/D = cửa đi, w = cửa sổ
  function wall(g, z0, H, x1, y1, x2, y2, gaps = [], side = false) {
    const alongY = x1 === x2, made = [];
    const seg = (a, b, z1, z2, m = mat.wall) => made.push(alongY
      ? box(x1 - h, x1 + h, a, b, z0 + z1, z0 + z2, m, g)
      : box(a, b, y1 - h, y1 + h, z0 + z1, z0 + z2, m, g));
    let s = (alongY ? y1 : x1) - h;
    const e = (alongY ? y2 : x2) + h;
    for (const [a, b, t] of [...gaps, [e, e, null]]) {
      if (a > s) seg(s, a, 0, H);
      if (t) {
        seg(a, b, TOP[t], H);
        if (t === 'w') { seg(a, b, 0, SILL); seg(a, b, SILL, TOP.w, mat.glass); }
      }
      s = b;
    }
    if (side) made.forEach(m => m && (m.userData.side = true));
  }

  // Cánh cửa mở 90°: bản lề H, mép đóng E, hướng mở (ox, oy)
  function leaf(g, z0, hx, hy, ex, ey, ox, oy, t = 'd') {
    const w = Math.hypot(ex - hx, ey - hy);
    if (ox) box(hx, hx + ox * w, hy - .02, hy + .02, z0, z0 + TOP[t], mat.wood, g);
    else box(hx - .02, hx + .02, hy, hy + oy * w, z0, z0 + TOP[t], mat.wood, g);
  }

  function rail(g, X1, X2, Y1, Y2, z0, hgt = 1.0) {
    box(X1, X2, Y1, Y2, z0, z0 + hgt, mat.glass, g);
    const thin = Math.abs(X2 - X1) < Math.abs(Y2 - Y1);
    thin ? box(X1 - .02, X2 + .02, Y1, Y2, z0 + hgt, z0 + hgt + .05, mat.rail, g)
         : box(X1, X2, Y1 - .02, Y2 + .02, z0 + hgt, z0 + hgt + .05, mat.rail, g);
  }

  function bed(g, z0, X1, X2, Y1, Y2) {        // đầu giường ở phía Y2
    box(X1, X2, Y1, Y2, z0, z0 + .45, mat.bed, g);
    box(X1, X2, Y2 - .06, Y2, z0, z0 + .95, mat.wood, g);
    const m = (X1 + X2) / 2;
    box(X1 + .1, m - .05, Y2 - .45, Y2 - .1, z0 + .45, z0 + .55, mat.pillow, g);
    box(m + .05, X2 - .1, Y2 - .45, Y2 - .1, z0 + .45, z0 + .55, mat.pillow, g);
  }

  // Nhãn phòng luôn nổi trên cùng (không bị tường che); chỉ hiện nhãn của tầng đang mở
  const LG = new THREE.Group(), LU = new THREE.Group();
  scene.add(LG, LU);
  function label(g, X, Y, z, name, sub) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 168;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.9)';
    x.beginPath(); x.roundRect ? x.roundRect(8, 8, 496, 152, 18) : x.rect(8, 8, 496, 152); x.fill();
    x.textAlign = 'center'; x.fillStyle = '#17212b'; x.font = '700 58px system-ui, sans-serif'; x.fillText(name, 256, 78);
    x.fillStyle = '#4b5862'; x.font = '500 42px system-ui, sans-serif'; x.fillText(sub, 256, 134);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    s.scale.set(2.2, .72, 1); s.position.set(WX(Y), z, X); s.renderOrder = 10;
    g.add(s);
  }

  // Sàn gạch từng phòng (màu theo công năng), đặt trên mặt sàn z0
  function floors(g, z0, list) {
    for (const [X1, X2, Y1, Y2, m] of list) box(X1 + h, X2 - h, Y1 + h, Y2 - h, z0, z0 + .012, m, g);
  }

  // ---------- nền, đường, tam cấp ----------
  box(-10, 30, -12, 16, ROAD - .1, ROAD, mat.ground, base);
  box(-9, -2, -12, 16, ROAD, ROAD + .01, mat.road, base);
  box(-2, 0, -12, 16, ROAD, ROAD + .02, mat.walk, base);
  box(0.3, 18, 0, 4.2, ROAD, 0, mat.plinth, base);                 // khối nền cao 0,32 m
  box(0, 0.3, 0, 4.2, ROAD, ROAD + 0.16, mat.plinth, base);        // bậc tam cấp 1 (bậc 2 là mặt nền)

  // ---------- tầng trệt ----------
  const HG = H1 - SLAB;
  floors(G, 0, [
    [0.3, 0.6, 0, 4.2, mat.tile], [0.6, 6, 0, 4.2, mat.tile], [6, 8.8, 0, 1, mat.corr], [6, 8.8, 1, 4.2, mat.tile],
    [8.8, 12.5, 0, 4.2, mat.tile], [12.5, 16.5, 1, 4.2, mat.room], [16.5, 18, 1, 4.2, mat.wet], [12.5, 18, 0, 1, mat.corr],
  ]);
  wall(G, 0, HG, 0, 0, 18, 0, [], true); wall(G, 0, HG, 0, 4.2, 18, 4.2, [], true);
  wall(G, 0, HG, 0.6, 0, 0.6, 4.2, [[1.3, 2.9, 'D']]); wall(G, 0, HG, 18, 0, 18, 4.2, [[2.2, 3.2, 'w']]);
  wall(G, 0, HG, 6, 1, 6, 4.2); wall(G, 0, HG, 8.8, 1, 8.8, 4.2); wall(G, 0, HG, 12.5, 1, 12.5, 4.2); wall(G, 0, HG, 16.5, 1, 16.5, 4.2);
  wall(G, 0, HG, 12.5, 1, 18, 1, [[12.65, 13.55, 'd'], [16.65, 17.35, 'd']]);
  leaf(G, 0, 0.6, 1.3, 0.6, 2.1, 1, 0, 'D'); leaf(G, 0, 0.6, 2.9, 0.6, 2.1, 1, 0, 'D');
  leaf(G, 0, 12.65, 1, 13.55, 1, 0, 1); leaf(G, 0, 16.65, 1, 17.35, 1, 0, 1);
  box(9.0, 12.45, 3.55, 4.15, 0, .85, mat.counter, G); box(11.85, 12.45, 2.0, 3.55, 0, .85, mat.counter, G);   // bệ bếp chữ L
  bed(G, 0, 14.5, 16.3, 2.15, 4.15);   // giường 1,8 m (khảo sát)

  // Cầu thang U: vế 1 (x 6,05–7,35) đi lên theo +Y, chiếu nghỉ phía y = 4,2, vế 2 (x 7,45–8,75) quay về
  const yL = 4.15 - LAND, y1 = yL - (N1 - 1) * TR;
  for (let i = 0; i < N1 - 1; i++) box(6.05, 7.35, y1 + i * TR, y1 + (i + 1) * TR, 0, (i + 1) * R, mat.stair, G);
  box(6.05, 8.75, yL, 4.15, 0, N1 * R, mat.stair, G);
  for (let i = 0; i < N2 - 1; i++) box(7.45, 8.75, yL - (i + 1) * TR, yL - i * TR, 0, (N1 + i + 1) * R, mat.stair, G);
  box(7.35, 7.45, y1, yL, 0, N1 * R + 1.0, mat.wall, G);           // tường giữa 2 vế

  label(LG, 3.3, 2.1, 1.6, 'PHÒNG KHÁCH', '5,4 × 4,2 · 22,68 m²');
  label(LG, 10.3, 1.9, 1.6, 'BẾP', '3,7 × 4,2 · 15,54 m²');
  label(LG, 13.4, 2.4, 1.6, 'PHÒNG NGỦ 1', '4,0 × 3,2 · 12,80 m²');
  label(LG, 17.25, 2.6, 1.6, 'NVS', '1,5 × 3,2 · 4,80 m²');
  label(LG, 7.4, 0.5, 2.4, 'CẦU THANG', '22 bậc × 17,2 cm');

  // ---------- tầng lầu ----------
  const HU = H2 - SLAB;
  box(-1.2, 6.05, 0, 4.2, H1 - SLAB, H1, mat.slab, U);             // sàn lầu (chừa ô thang)
  box(8.75, 18, 0, 4.2, H1 - SLAB, H1, mat.slab, U);
  box(6.05, 8.75, 0, y1, H1 - SLAB, H1, mat.slab, U);
  floors(U, H1, [
    [-1.2, 0, 0, 4.2, mat.balc], [0, 2, 0, 4.2, mat.tile], [2, 6, 1, 4.2, mat.room], [8.8, 14.8, 1, 4.2, mat.room],
    [2, 14.8, 0, 1, mat.corr], [14.8, 16.4, 0, 4.2, mat.dry], [16.4, 18, 0, 4.2, mat.wet],
  ]);
  wall(U, H1, HU, 0, 0, 18, 0, [], true); wall(U, H1, HU, 0, 4.2, 18, 4.2, [], true);
  wall(U, H1, HU, 0, 0, 0, 4.2, [[1.3, 2.9, 'D']]); wall(U, H1, HU, 18, 0, 18, 4.2);
  wall(U, H1, HU, 2, 0, 2, 4.2, [[0.1, 0.9, 'd']]);
  wall(U, H1, HU, 6, 1, 6, 4.2, [[2.0, 3.2, 'w']]); wall(U, H1, HU, 8.8, 1, 8.8, 4.2, [[2.0, 3.2, 'w']]);
  wall(U, H1, HU, 14.8, 0, 14.8, 4.2, [[0.1, 0.9, 'd'], [1.15, 1.85, 'w'], [2.5, 3.7, 'w']]);
  wall(U, H1, HU, 16.4, 0, 16.4, 4.2, [[0.1, 0.85, 'd']]);
  wall(U, H1, HU, 2, 1, 6, 1, [[2.15, 3.05, 'd']]); wall(U, H1, HU, 8.8, 1, 14.8, 1, [[8.95, 9.85, 'd']]);
  leaf(U, H1, 0, 1.3, 0, 2.1, -1, 0, 'D'); leaf(U, H1, 0, 2.9, 0, 2.1, -1, 0, 'D');
  leaf(U, H1, 2, 0.1, 2, 0.9, -1, 0); leaf(U, H1, 2.15, 1, 3.05, 1, 0, 1); leaf(U, H1, 8.95, 1, 9.85, 1, 0, 1);
  leaf(U, H1, 14.8, 0.1, 14.8, 0.9, 1, 0); leaf(U, H1, 16.4, 0.1, 16.4, 0.85, 1, 0);
  rail(U, -1.2, -1.16, 0, 4.2, H1); rail(U, -1.2, 0, 0, .04, H1); rail(U, -1.2, 0, 4.16, 4.2, H1);   // lan can ban công
  rail(U, 6.05, 7.45, y1 - .04, y1, H1, .9);                        // lan can ô thang
  box(1.55, 1.95, 1.5, 3.2, H1, H1 + .9, mat.altar, U);
  bed(U, H1, 4.0, 5.8, 2.15, 4.15); bed(U, H1, 12.6, 14.4, 2.15, 4.15);

  label(LU, -0.6, 2.1, H1 + 1.4, 'BAN CÔNG', '1,2 × 4,2 · 5,04 m²');
  label(LU, 0.9, 2.4, H1 + 1.6, 'PHÒNG THỜ', '2,0 × 4,2 · 8,40 m²');
  label(LU, 3.3, 2.6, H1 + 1.6, 'PHÒNG NGỦ 2', '4,0 × 3,2 · 12,80 m²');
  label(LU, 10.9, 2.6, H1 + 1.6, 'PHÒNG NGỦ 3', '6,0 × 3,2 · 19,20 m²');
  label(LU, 15.6, 2.1, H1 + 1.6, 'KHU PHƠI', '1,6 × 4,2 · lộ thiên');
  label(LU, 17.2, 2.1, H1 + 2.2, 'NHÀ TẮM', '1,6 × 4,2 · 6,72 m²');

  // ---------- mái tôn (khảo sát): dốc từ mặt tiền ra sau, giếng trời trên thang có mái che nâng cao,
  // khu phơi lộ thiên, ô sàn bê tông trên nhà tắm đặt bồn nước và máy nước nóng năng lượng mặt trời ----------
  const ZR = H1 + H2, RF_HI = ZR + 0.8, RF_LO = ZR + 0.25, RF_END = 14.8;
  const roofZ = X => RF_HI + (RF_LO - RF_HI) * X / RF_END;
  // tấm tôn nghiêng: hộp mỏng xoay quanh trục ngang; không đưa vào danh sách vật cản
  function sheet(X1, X2, lift, m) {
    const z = (roofZ(X1) + roofZ(X2)) / 2 + lift, ang = Math.atan2(RF_HI - RF_LO, RF_END);
    const mesh = box(X1, X2, -0.15, 4.35, z - .015, z + .015, m, RF); boxes.pop();
    mesh.rotation.x = ang; mesh.scale.z = 1 / Math.cos(ang);
  }
  // mảng tường hồi phía trên đỉnh tường hông, theo độ dốc mái
  function gable(Y) {
    const x = WX(Y), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, ZR, 0, x, ZR, RF_END, x, RF_LO, RF_END, x, ZR, 0, x, RF_LO, RF_END, x, RF_HI, 0], 3));
    g.computeVertexNormals();
    RF.add(new THREE.Mesh(g, mat.wallDS));
  }
  mat.roof = M(0x7f8f9a, { roughness: .6, metalness: .2 }); mat.wallDS = M(0xf2efe9, { side: THREE.DoubleSide });
  mat.tank = M(0xd9dde0, { metalness: .3, roughness: .5 }); mat.solar = M(0x1f3550, { roughness: .3 });
  sheet(0, 6, 0, mat.roof); sheet(8.8, RF_END, 0, mat.roof); sheet(6, 8.8, 0.55, mat.roof);
  gable(0); gable(4.2);
  box(-0.05, 0.05, 0, 4.2, ZR - SLAB, RF_HI + 0.15, mat.wall, RF);                 // tường chắn mái mặt tiền
  box(16.4, 18, 0, 4.2, ZR - SLAB, ZR, mat.slab, RF);                               // ô sàn đặt bồn
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.25, 24), mat.tank);
  tank.position.set(WX(3.2), ZR + .65, 17.2); RF.add(tank);
  box(16.6, 17.8, 0.4, 1.9, ZR + .5, ZR + .56, mat.solar, RF).rotation.x = -.35; boxes.pop();

  // trần thạch cao (chỉ hiện khi đi bộ trong nhà): trệt cao 3,3 m, lầu cao 3,2 m; chừa ô thang làm giếng trời
  for (const [X1, X2, Y1, Y2] of [[0.6, 6, 0, 4.2], [6, 8.8, 0, 1], [8.8, 18, 0, 4.2]]) box(X1, X2, Y1, Y2, 3.3, 3.32, mat.ceil, CEIL);
  for (const [X1, X2, Y1, Y2] of [[0, 6, 0, 4.2], [6, 8.8, 0, 1], [8.8, 14.8, 0, 4.2], [16.4, 18, 0, 4.2]]) box(X1, X2, Y1, Y2, H1 + 3.2, H1 + 3.22, mat.ceil, CEIL);

  // ---------- ánh sáng ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f86, .75));
  const sun = new THREE.DirectionalLight(0xffffff, .75);
  sun.position.set(13.2, 22, -4); sun.target.position.set(2.1, 0, 9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  scene.add(sun, sun.target);

  return { scene, base, G, U, RF, CEIL, LG, LU, sun, boxes, WX, H1, ROAD };
}
