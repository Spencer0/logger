// Procedural low-poly cartoon models. All built from primitives with vertex colors.
import { THREE, Builder, outlined, vcMat, toonMat } from './r3d.js';
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s);
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const P = { wood: '#8a5a2b', wood2: '#b8783a', bark: '#7a4a24', cream: '#f1e3c4', ink: '#2b1d14', steel: '#cfd6dc', skin: '#f4c9a1', red: '#c8402f', blue: '#3b5aa6', babe: '#4f8fe0', babe2: '#2f66b8', gold: '#f2b134' };

// ---------- Trees ----------
export const TREE = {
  pine: { h: 6.6, trunkH: 1.6, r: 0.26, canopyR: 1.7 },
  birch: { h: 5.4, trunkH: 3.4, r: 0.2, canopyR: 1.5 },
  oak: { h: 6.2, trunkH: 2.6, r: 0.45, canopyR: 2.6 },
  maple: { h: 6, trunkH: 2.5, r: 0.38, canopyR: 2.4 },
  redwood: { h: 11.5, trunkH: 7.5, r: 0.55, canopyR: 1.6 },
  sequoia: { h: 15, trunkH: 9.5, r: 0.95, canopyR: 2.2 },
};
export function treeGeo(kind, v = 0) {
  const b = new Builder(), g = ['#2e7d3a', '#36883f', '#2a7336'][v % 3];
  switch (kind) {
    case 'pine':
      b.add(cyl(0.2, 0.3, 1.8, 7), P.bark, [0, 0.9, 0]);
      b.add(cone(1.7, 2.4, 7), g, [0, 2.3, 0]); b.add(cone(1.3, 2.2, 7), '#36903f', [0, 3.7, 0]); b.add(cone(0.9, 2, 7), '#3f9c47', [0, 5, 0]);
      break;
    case 'birch':
      b.add(cyl(0.16, 0.24, 3.6, 7), '#f1ebdc', [0, 1.8, 0]);
      for (let i = 0; i < 4; i++) b.add(box(0.2, 0.1, 0.12), P.ink, [0.12 * (i % 2 ? 1 : -1), 0.7 + i * 0.7, 0.18], [0, i * 0.8, 0]);
      b.add(ico(1.5, 1), '#9ccc3d', [0, 4.3, 0], [0, v, 0], [1, 0.9, 1]); b.add(ico(0.9, 1), '#b5e04a', [0.6, 5.2, 0.3]);
      break;
    case 'oak':
      b.add(cyl(0.32, 0.5, 2.8, 7), '#6f4320', [0, 1.4, 0]);
      b.add(cyl(0.12, 0.18, 1.4, 5), '#6f4320', [-0.7, 3, 0], [0, 0, 0.7]); b.add(cyl(0.12, 0.18, 1.4, 5), '#6f4320', [0.7, 3.1, 0.2], [0, 0, -0.7]);
      b.add(ico(1.6, 1), '#2f8f3f', [-1.1, 4, 0], [0, v, 0]); b.add(ico(1.6, 1), '#34984a', [1.1, 4.1, 0.2], [0, v + 1, 0]); b.add(ico(1.7, 1), '#3aa04a', [0, 5, -0.2], [0, v + 2, 0]); b.add(ico(1.2, 1), '#45ad55', [0.2, 4.2, 1.2]);
      break;
    case 'maple':
      b.add(cyl(0.28, 0.42, 2.7, 7), '#5e3b1e', [0, 1.35, 0]);
      b.add(ico(1.5, 1), '#e0632a', [-1, 3.9, 0], [0, v, 0]); b.add(ico(1.5, 1), '#f28b2a', [1, 4, 0.2], [0, v + 1, 0]); b.add(ico(1.6, 1), '#d94a24', [0, 4.9, -0.2], [0, v + 2, 0]); b.add(ico(1.1, 1), '#f4a23a', [0.1, 4.1, 1.1]);
      break;
    case 'redwood':
      b.add(cyl(0.35, 0.65, 8, 8), '#9a4a2e', [0, 4, 0]);
      for (let i = 0; i < 5; i++) b.add(cone(1.7 - i * 0.25, 2.2, 7), ['#2a6b35', '#2f7339', '#357b3d', '#3a823f', '#3f8a44'][i], [0, 5.2 + i * 1.5, 0]);
      break;
    case 'sequoia':
      b.add(cyl(0.55, 1.1, 10, 8), '#a9513a', [0, 5, 0]);
      for (let i = 0; i < 6; i++) b.add(cone(2.3 - i * 0.3, 2.6, 7), ['#245c30', '#286334', '#2d6b38', '#32723c', '#377a41', '#3c8246'][i], [0, 6 + i * 1.7, 0]);
      b.add(cone(0.8, 0.6, 7), '#ffffff', [0, 15.3, 0]); b.add(cone(1.5, 0.5, 7), '#ffffff', [0, 12.4, 0]);
      break;
  }
  return b.build();
}
export function stumpGeo(kind) {
  const t = TREE[kind], b = new Builder();
  b.add(cyl(t.r * 1.05, t.r * 1.25, 0.5, 8), kind === 'birch' ? '#f1ebdc' : kind === 'redwood' || kind === 'sequoia' ? '#9a4a2e' : P.bark, [0, 0.25, 0]);
  b.add(cyl(t.r * 1.0, t.r * 1.0, 0.06, 8), '#e8c993', [0, 0.52, 0]);
  return b.build();
}
export function logGeo(len = 1.6, r = 0.3, color = '#a56a35') {
  const b = new Builder();
  b.add(cyl(r, r, len, 8), color, [0, 0, 0], [0, 0, Math.PI / 2]);
  b.add(cyl(r * 0.9, r * 0.9, 0.05, 8), '#e8c993', [len / 2, 0, 0], [0, 0, Math.PI / 2]); b.add(cyl(r * 0.9, r * 0.9, 0.05, 8), '#e8c993', [-len / 2, 0, 0], [0, 0, Math.PI / 2]);
  return b.build();
}
export function knotMesh() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 8, 14), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  const core = new THREE.Mesh(sph(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#3b2212' }));
  const glow = new THREE.Mesh(sph(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.35, depthWrite: false }));
  g.add(glow, ring, core); g.userData.knot = true; return g;
}

// ---------- Paul Bunyan (faces +Z, origin at feet) ----------
export function makePaul() {
  const root = new THREE.Group();
  const b = new Builder();
  // legs & boots
  for (const x of [-0.32, 0.32]) { b.add(box(0.5, 1.15, 0.5), P.blue, [x, 0.65, 0]); b.add(box(0.56, 0.3, 0.7), '#4a2e17', [x, 0.15, 0.08]); }
  // torso (plaid: red with dark stripes)
  b.add(box(1.5, 1.4, 0.95), P.red, [0, 1.9, 0]);
  for (const x of [-0.45, 0, 0.45]) b.add(box(0.1, 1.4, 0.97), '#8f2a1d', [x, 1.9, 0]);
  for (const y of [1.45, 1.9, 2.35]) b.add(box(1.52, 0.1, 0.97), '#8f2a1d', [0, y, 0]);
  for (const x of [-0.35, 0.35]) b.add(box(0.14, 1.4, 1.0), '#2b2b2b', [x, 1.9, 0]); // suspenders
  b.add(box(1.54, 0.22, 1.0), '#4a2e17', [0, 1.2, 0]); b.add(box(0.3, 0.3, 0.12), P.gold, [0, 1.2, 0.5]);
  // head
  b.add(sph(0.6, 10, 8), P.skin, [0, 3.05, 0]);
  b.add(sph(0.56, 10, 8), '#6b3f1d', [0, 2.75, 0.18], [0, 0, 0], [1.05, 0.9, 0.85]); // beard
  b.add(sph(0.14, 7, 6), '#e9a985', [0, 3.0, 0.58]); // nose
  for (const x of [-0.22, 0.22]) { b.add(sph(0.08, 6, 5), P.ink, [x, 3.17, 0.52]); b.add(box(0.26, 0.07, 0.08), '#6b3f1d', [x, 3.32, 0.52], [0, 0, x > 0 ? -0.2 : 0.2]); }
  b.add(box(0.5, 0.1, 0.3), '#6b3f1d', [0, 2.88, 0.5]); // mustache
  // toque
  b.add(cone(0.64, 0.9, 10), P.red, [0, 3.85, 0]); b.add(cyl(0.66, 0.66, 0.22, 10), P.cream, [0, 3.45, 0]); b.add(sph(0.16, 7, 6), P.cream, [0, 4.32, 0]);
  const body = outlined(b.build(), 0.05); root.add(body);
  // arms + axe: pivot at shoulders
  const arms = new THREE.Group(); arms.position.set(0, 2.45, 0);
  const a = new Builder();
  for (const x of [-0.78, 0.78]) { a.add(cyl(0.19, 0.19, 1.1, 7), P.red, [x * 0.85, -0.5, 0.25], [0.5, 0, x > 0 ? -0.25 : 0.25]); a.add(sph(0.22, 7, 6), P.skin, [x * 0.5, -0.95, 0.55]); }
  // axe handle from hands forward/up
  a.add(cyl(0.07, 0.07, 2.4, 7), P.wood2, [0, -0.3, 0.75], [-1.1, 0, 0]);
  a.add(box(0.14, 0.9, 0.5), P.steel, [0, 0.55, 1.4], [0.45, 0, 0]); a.add(box(0.16, 0.5, 0.2), '#7a8288', [0, 0.45, 1.2], [0.45, 0, 0]);
  const armMesh = outlined(a.build(), 0.045); arms.add(armMesh); root.add(arms);
  root.userData.arms = arms;
  return root;
}

// ---------- Babe the Blue Ox (faces +Z, origin at hooves) ----------
export function makeBabe() {
  const root = new THREE.Group();
  const b = new Builder();
  b.add(sph(1, 12, 10), P.babe, [0, 1.55, 0], [0, 0, 0], [1.15, 0.95, 1.55]);
  b.add(sph(0.75, 10, 8), '#a9c8f0', [0, 1.1, 0.3], [0, 0, 0], [0.9, 0.6, 1.3]); // belly
  b.add(cyl(0.07, 0.05, 1.0, 6), P.babe2, [0, 1.45, -1.55], [0.12, 0, 0]); b.add(sph(0.15, 7, 6), P.ink, [0, 0.95, -1.62]); // tail
  const body = outlined(b.build(), 0.06); root.add(body);
  // head
  const head = new THREE.Group(); head.position.set(0, 2.1, 1.35);
  const h = new Builder();
  h.add(sph(0.62, 12, 10), P.babe, [0, 0, 0], [0, 0, 0], [1, 0.95, 1.1]);
  h.add(sph(0.42, 10, 8), '#a9c8f0', [0, -0.18, 0.5], [0, 0, 0], [1.05, 0.8, 1]);
  for (const x of [-0.14, 0.14]) h.add(sph(0.06, 6, 5), P.ink, [x, -0.15, 0.9]);
  for (const x of [-0.3, 0.3]) { h.add(sph(0.15, 8, 6), '#ffffff', [x, 0.2, 0.5]); h.add(sph(0.08, 6, 5), P.ink, [x, 0.2, 0.62]); }
  for (const x of [-0.6, 0.6]) h.add(sph(0.2, 7, 6), P.babe, [x, 0.1, -0.1], [0, 0, x > 0 ? -0.6 : 0.6], [1, 0.5, 0.7]); // ears
  for (const x of [-1, 1]) h.add(new THREE.TorusGeometry(0.42, 0.09, 7, 10, 2.2), P.cream, [x * 0.45, 0.45, -0.1], [0, x > 0 ? -0.3 : Math.PI + 0.3, x > 0 ? 0.3 : -0.3]); // horns
  // axe in mouth (sticks out to the right)
  h.add(cyl(0.06, 0.06, 2.2, 6), P.wood2, [0.5, -0.25, 0.75], [0, 0, Math.PI / 2]);
  h.add(box(0.5, 0.75, 0.12), P.steel, [1.45, -0.25, 0.75]); h.add(box(0.22, 0.4, 0.14), '#7a8288', [1.2, -0.25, 0.75]);
  head.add(outlined(h.build(), 0.05)); root.add(head); root.userData.head = head;
  // legs
  const legs = [];
  for (const [x, z] of [[-0.55, 0.7], [0.55, 0.7], [-0.55, -0.7], [0.55, -0.7]]) {
    const lg = new THREE.Group(); lg.position.set(x, 1.0, z);
    const l = new Builder(); l.add(cyl(0.2, 0.22, 1.0, 7), P.babe2, [0, -0.5, 0]); l.add(cyl(0.24, 0.24, 0.22, 7), P.ink, [0, -0.95, 0]);
    lg.add(outlined(l.build(), 0.04)); root.add(lg); legs.push(lg);
  }
  root.userData.legs = legs;
  // cargo rack (logs) – toggled by scene
  const cargo = new THREE.Group(); cargo.position.set(0, 2.15, -0.55); root.add(cargo); root.userData.cargo = cargo;
  return root;
}
export function cargoLogs(n) {
  const g = new Builder(); const c = Math.min(6, Math.ceil(n / 4));
  for (let i = 0; i < c; i++) g.add(logGeo(1.5, 0.22), i % 2 ? '#a56a35' : '#946034', [((i % 3) - 1) * 0.5, Math.floor(i / 3) * 0.42, 0], [0, Math.PI / 2, 0]);
  g.add(box(0.1, 0.08, 1.7), '#4a2e17', [-0.8, 0.1, 0]); g.add(box(0.1, 0.08, 1.7), '#4a2e17', [0.8, 0.1, 0]);
  return outlined(g.build(), 0.035);
}

// ---------- Crew ----------
export function makeCrew(id) {
  const b = new Builder();
  const col = { inkslinger: '#3a3a5a', sam: '#e8e2d0', ole: '#555555', slim: '#8a5a2b', shot: '#c8402f' }[id];
  if (id === 'sport' || id === 'lucy' || id === 'elmer') {
    const c = { sport: '#b07a3a', lucy: '#8e4fb8', elmer: '#6b4a2e' }[id], s = id === 'sport' ? 0.5 : 0.8;
    b.add(sph(1, 10, 8), c, [0, 0.9 * s + 0.35, 0], [0, 0, 0], [0.5 * s, 0.45 * s, 0.9 * s]);
    b.add(sph(0.32 * s + 0.08, 8, 6), c, [0, 1.2 * s + 0.4, 0.8 * s]);
    for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) b.add(cyl(0.08, 0.08, 0.5 * s + 0.3, 5), c, [x * s, 0.25 * s + 0.15, z * s]);
    if (id === 'lucy') { b.add(sph(0.2, 6, 5), '#d8b0ee', [0.3, 1, 0.1]); b.add(sph(0.15, 6, 5), '#d8b0ee', [-0.25, 0.9, -0.3]); }
    if (id === 'elmer') for (const x of [-0.3, 0.3]) b.add(box(0.5, 0.08, 0.3), '#c9a26b', [x, 1.75, 0.6], [0, 0, x > 0 ? 0.4 : -0.4]);
    if (id === 'sport') for (const x of [-0.14, 0.14]) b.add(sph(0.08, 6, 5), c, [x, 0.95, 0.72], [0, 0, 0], [1, 2, 0.5]);
  } else {
    for (const x of [-0.18, 0.18]) b.add(box(0.28, 0.7, 0.3), P.blue, [x, 0.35, 0]);
    b.add(box(0.85, 0.85, 0.55), col, [0, 1.12, 0]);
    for (const x of [-0.5, 0.5]) b.add(cyl(0.11, 0.11, 0.7, 6), col, [x, 1.1, 0]);
    b.add(sph(0.36, 9, 7), P.skin, [0, 1.9, 0]);
    for (const x of [-0.12, 0.12]) b.add(sph(0.05, 5, 4), P.ink, [x, 1.95, 0.33]);
    if (id === 'ole') b.add(sph(0.3, 8, 6), '#e8d6a8', [0, 1.72, 0.15], [0, 0, 0], [1, 0.7, 0.8]);
    if (id === 'sam' || id === 'slim') b.add(cyl(0.3, 0.34, 0.45, 8), '#ffffff', [0, 2.35, 0]); else if (id === 'inkslinger') { b.add(cyl(0.42, 0.42, 0.06, 10), P.ink, [0, 2.2, 0]); b.add(cyl(0.26, 0.28, 0.4, 8), P.ink, [0, 2.4, 0]); } else b.add(cyl(0.38, 0.38, 0.2, 8), '#5a3419', [0, 2.3, 0]);
  }
  return outlined(b.build(), 0.04);
}

// ---------- Buildings & props ----------
// Triangular prism along X with base on y=0: length, half-depth (z), height
export function prismGeo(len, halfD, h) {
  const g = new THREE.CylinderGeometry(1, 1, len, 3); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(0, 0.5, 0);
  g.scale(1, h / 1.5, halfD / 0.866); return g;
}
function gableRoof(b, w, d, h, color, y) { b.add(prismGeo(w + 0.8, d / 2 + 0.4, h), color, [0, y, 0]); }
export function makeCabin(o = {}) {
  const w = o.w || 4.2, d = o.d || 3.4, h = o.h || 2.4, b = new Builder();
  const wall = o.wall || '#a56a35';
  for (let y = 0.25; y < h; y += 0.5) {
    b.add(cyl(0.26, 0.26, w + 0.4, 7), y % 1 ? wall : '#b07a45', [0, y, d / 2], [0, 0, Math.PI / 2]); b.add(cyl(0.26, 0.26, w + 0.4, 7), y % 1 ? wall : '#b07a45', [0, y, -d / 2], [0, 0, Math.PI / 2]);
    b.add(cyl(0.26, 0.26, d + 0.4, 7), y % 1 ? '#b07a45' : wall, [w / 2, y + 0.25, 0], [Math.PI / 2, 0, 0]); b.add(cyl(0.26, 0.26, d + 0.4, 7), y % 1 ? '#b07a45' : wall, [-w / 2, y + 0.25, 0], [Math.PI / 2, 0, 0]);
  }
  b.add(box(w, h, d), wall, [0, h / 2, 0]);
  gableRoof(b, w, d, 1.6, o.roof || '#6b3d1f', h);
  b.add(box(1, 1.6, 0.2), '#5a3419', [0, 0.8, d / 2 + 0.2]); b.add(sph(0.08, 5, 4), P.gold, [0.3, 0.85, d / 2 + 0.32]);
  if (o.window !== false) { b.add(box(0.9, 0.8, 0.2), o.lit ? '#ffe08a' : '#8fd3ff', [w * 0.3, 1.5, d / 2 + 0.2]); b.add(box(0.1, 0.9, 0.22), P.ink, [w * 0.3, 1.5, d / 2 + 0.22]); b.add(box(1, 0.1, 0.22), P.ink, [w * 0.3, 1.5, d / 2 + 0.22]); }
  if (o.chimney) b.add(box(0.6, 1.6, 0.6), '#777777', [w * 0.3, h + 1, -d * 0.2]);
  return outlined(b.build(), 0.05);
}
export function makeBarn() {
  const w = 4.6, d = 4, h = 2.8, b = new Builder();
  b.add(box(w, h, d), '#b33a2a', [0, h / 2, 0]);
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.5) b.add(box(0.06, h, d + 0.04), '#8a2a1d', [x, h / 2, 0]);
  { const g = new THREE.CylinderGeometry(1, 1, w + 0.6, 8, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 1.6, (d + 0.6) / 2); b.add(g, '#6b3d1f', [0, h, 0]); }
  b.add(box(2, 2.1, 0.2), '#5a3419', [0, 1.05, d / 2 + 0.1]);
  b.add(box(0.12, 2.6, 0.1), '#e8c993', [0, 1.05, d / 2 + 0.25], [0, 0, 0.75]); b.add(box(0.12, 2.6, 0.1), '#e8c993', [0, 1.05, d / 2 + 0.25], [0, 0, -0.75]);
  b.add(cyl(0.4, 0.4, 0.2, 10), P.gold, [0, h + 1.1, d / 2 + 0.1], [Math.PI / 2, 0, 0]);
  return outlined(b.build(), 0.05);
}
export function makeForge() {
  const b = new Builder();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) b.add(cyl(0.12, 0.14, 2.6, 6), '#7a4a24', [x, 1.3, z]);
  gableRoof(b, 3.6, 2.8, 1.2, '#6b3d1f', 2.5);
  b.add(box(1.2, 1.9, 1), '#666666', [-0.9, 0.95, -0.4]); b.add(box(0.7, 0.6, 0.1), '#ff7a1a', [-0.9, 0.8, 0.12]);
  b.add(box(1, 0.3, 0.5), '#444444', [0.8, 0.95, 0.2]); b.add(box(0.5, 0.5, 0.4), '#444444', [0.8, 0.55, 0.2]); b.add(box(1.1, 0.35, 0.45), '#3a3a3a', [0.9, 0.3, 0.2]);
  b.add(cyl(0.3, 0.35, 0.6, 8), '#7a4a24', [1.6, 0.3, 1]); // stump
  return outlined(b.build(), 0.05);
}
export function makeCampfire() {
  const g = new THREE.Group(), b = new Builder();
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.add(ico(0.22, 0), '#8a8a8a', [Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9], [i, i, 0]); }
  b.add(cyl(0.12, 0.12, 1.3, 6), P.bark, [0, 0.12, 0], [0, 0, Math.PI / 2]); b.add(cyl(0.12, 0.12, 1.3, 6), P.bark, [0, 0.2, 0], [Math.PI / 2, 0, 1]);
  g.add(outlined(b.build(), 0.035));
  const flames = new THREE.Group();
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(cone(0.45 - i * 0.12, 1.2 - i * 0.3, 6), new THREE.MeshBasicMaterial({ color: ['#ff6a2a', '#ffb02a', '#fff07a'][i] })); f.position.y = 0.5 + (1.2 - i * 0.3) / 2 - 0.3; f.userData.i = i; flames.add(f); }
  g.add(flames); g.userData.flames = flames;
  const light = new THREE.PointLight(0xff9a3a, 20, 12, 2); light.position.y = 1.2; g.add(light); g.userData.light = light;
  return g;
}
export function makeSign(lines) {
  const b = new Builder();
  b.add(cyl(0.08, 0.1, 2.2, 6), '#7a4a24', [0, 1.1, 0]);
  b.add(box(2.2, 0.55, 0.12), '#e8c993', [0, 1.9, 0.05]); b.add(box(1.8, 0.45, 0.12), '#e8c993', [0, 1.3, 0.05]);
  return outlined(b.build(), 0.035);
}
export function makeFence(n = 5) {
  const b = new Builder();
  for (let i = 0; i < n; i++) b.add(box(0.14, 1.1, 0.14), '#c9a26b', [i * 0.9, 0.55, 0]);
  b.add(box(n * 0.9, 0.1, 0.08), '#c9a26b', [(n - 1) * 0.45, 0.85, 0]); b.add(box(n * 0.9, 0.1, 0.08), '#c9a26b', [(n - 1) * 0.45, 0.45, 0]);
  return outlined(b.build(), 0.03);
}
export function makeWoodpile() {
  const b = new Builder();
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) b.add(logGeo(1.4, 0.2), '#a56a35', [0, 0.2 + r * 0.36, (i - 1.5 + r * 0.5) * 0.42]);
  return outlined(b.build(), 0.03);
}
export function makeBush(s = 1) {
  const b = new Builder();
  b.add(ico(0.6 * s, 1), '#3f8f3f', [-0.4 * s, 0.4 * s, 0]); b.add(ico(0.7 * s, 1), '#4a9c48', [0.3 * s, 0.5 * s, 0.1 * s]); b.add(ico(0.5 * s, 1), '#6ab04c', [0, 0.8 * s, -0.3 * s]);
  return outlined(b.build(), 0.035);
}
export function mountainsGeo(n = 9, dist = 120) {
  const b = new Builder();
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = dist + Math.random() * 40, h = 25 + Math.random() * 30; b.add(cone(h * 0.9, h, 6), '#8aa6c2', [Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r]); b.add(cone(h * 0.28, h * 0.32, 6), '#ffffff', [Math.cos(a) * r, h - h * 0.16, Math.sin(a) * r]); }
  return b.build();
}
export function boulderGeo(v = 0) { const b = new Builder(); b.add(new THREE.DodecahedronGeometry(0.75, 0), '#8d8f93', [0, 0.5, 0], [v, v * 2, 0], [1.2, 0.8, 1]); b.add(ico(0.35, 0), '#a4a7ab', [0.5, 0.3, 0.3]); return b.build(); }
export function pileGeo() { const b = new Builder(); b.add(logGeo(1.3, 0.25), '#a56a35', [0, 0.25, -0.3]); b.add(logGeo(1.3, 0.25), '#946034', [0, 0.25, 0.3]); b.add(logGeo(1.3, 0.25), '#a56a35', [0, 0.68, 0]); return b.build(); }
export function pancakeGeo() { const b = new Builder(); for (let i = 0; i < 3; i++) b.add(cyl(0.5, 0.5, 0.14, 10), i % 2 ? '#f0b25a' : '#e9a24a', [0, 0.1 + i * 0.16, 0]); b.add(box(0.26, 0.14, 0.26), '#ffd23f', [0, 0.62, 0]); return b.build(); }
export function makeMill() {
  const g = new THREE.Group();
  g.add(makeCabin({ w: 6, d: 4.5, h: 3, wall: '#9a7a55', roof: '#555555', window: false }));
  const wb = new Builder(); wb.add(new THREE.TorusGeometry(1.6, 0.18, 6, 12), '#c9a26b'); for (let i = 0; i < 6; i++) wb.add(box(0.12, 3.1, 0.12), '#c9a26b', [0, 0, 0], [0, 0, i * Math.PI / 6]);
  const wheel = outlined(wb.build(), 0.035); wheel.position.set(-3.6, 1.7, 0); g.add(wheel); g.userData.wheel = wheel;
  return g;
}
export function chevron() {
  const s = new THREE.Shape(); s.moveTo(-1, -0.6); s.lineTo(0, 0.2); s.lineTo(1, -0.6); s.lineTo(1, 0); s.lineTo(0, 0.8); s.lineTo(-1, 0); s.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m;
}
