// 3D core: Three.js setup, toon materials, outline hulls, merged low-poly geometry, particles, 2D overlay.
import * as THREE from '../lib/three.module.js';
export { THREE };
export const INK = 0x2b1d14;

let gradient = null;
export function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 170, 235, 255]), 4, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  }
  return gradient;
}
const mats = new Map();
export function toonMat(color, o = {}) {
  const key = 'toon' + color + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...o }));
  return mats.get(key);
}
export function vcMat(o = {}) {
  const key = 'vc' + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), ...o }));
  return mats.get(key);
}
export function hullMat(th = 0.05, color = INK) {
  const key = 'hull' + th + color;
  if (!mats.has(key)) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uOut = { value: th };
      sh.vertexShader = 'uniform float uOut;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + normalize(normal) * uOut;');
    };
    m.customProgramCacheKey = () => key;
    mats.set(key, m);
  }
  return mats.get(key);
}

// ---------- Geometry building ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
export class Builder {
  constructor() { this.parts = []; }
  // add(geometry, color, position[3], rotation[3] (radians), scale[3]|number)
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (typeof scale === 'number') scale = [scale, scale, scale];
    _e.set(rot[0], rot[1], rot[2]); _q.setFromEuler(_e); _p.set(pos[0], pos[1], pos[2]); _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g); return this;
  }
  build() {
    let total = 0; for (const g of this.parts) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let o = 0;
    for (const g of this.parts) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); col.set(g.attributes.color.array, o); o += g.attributes.position.count * 3; g.dispose(); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    this.parts = []; return out;
  }
}
// Average normals of coincident vertices (for smooth outline hulls on flat-shaded geometry)
export function smoothed(geo) {
  const g = geo.clone(); const p = g.attributes.position.array, n = g.attributes.normal.array, acc = new Map();
  const key = (i) => `${Math.round(p[i * 3] * 500)},${Math.round(p[i * 3 + 1] * 500)},${Math.round(p[i * 3 + 2] * 500)}`;
  const cnt = p.length / 3;
  for (let i = 0; i < cnt; i++) { const k = key(i); let a = acc.get(k); if (!a) { a = [0, 0, 0]; acc.set(k, a); } a[0] += n[i * 3]; a[1] += n[i * 3 + 1]; a[2] += n[i * 3 + 2]; }
  const out = new Float32Array(p.length);
  for (let i = 0; i < cnt; i++) { const a = acc.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
}
// A toon mesh + ink outline hull as a Group. userData.main = the toon mesh.
export function outlined(geo, th = 0.05, opts = {}) {
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(geo, opts.material || vcMat());
  grp.add(mesh);
  if (th > 0) { const hull = new THREE.Mesh(smoothed(geo), hullMat(th)); hull.userData.hull = true; grp.add(hull); grp.userData.hull = hull; }
  grp.userData.main = mesh; return grp;
}
export function instanced(geo, count, th = 0.05) {
  const grp = new THREE.Group();
  const im = new THREE.InstancedMesh(geo, vcMat(), count); im.frustumCulled = false; grp.add(im);
  let hull = null;
  if (th > 0) { hull = new THREE.InstancedMesh(smoothed(geo), hullMat(th), count); hull.frustumCulled = false; grp.add(hull); }
  grp.userData = { im, hull, n: 0 };
  grp.userData.set = (i, m) => { im.setMatrixAt(i, m); if (hull) hull.setMatrixAt(i, m); };
  grp.userData.commit = (n) => { im.count = n; im.instanceMatrix.needsUpdate = true; if (hull) { hull.count = n; hull.instanceMatrix.needsUpdate = true; } };
  return grp;
}
export function blobShadow(r = 1, a = 0.25) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: a, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1; return m;
}
// Sky dome with vertex gradient + sun disc
export function skyDome(top, bottom, r = 400) {
  const g = new THREE.SphereGeometry(r, 16, 10), p = g.attributes.position, col = new Float32Array(p.count * 3);
  const ct = new THREE.Color(top), cb = new THREE.Color(bottom), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const t = THREE.MathUtils.clamp(p.getY(i) / r, 0, 1); c.copy(cb).lerp(ct, Math.pow(t, 0.6)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; return m;
}
export function clouds(n = 8, spread = 150, h = 40) {
  const b = new Builder();
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * spread * 2, z = (Math.random() - 0.5) * spread * 2, y = h + Math.random() * 15, s = 3 + Math.random() * 5;
    for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(s * (0.6 + Math.random() * 0.6), 7, 5), '#ffffff', [x + (k - 1.5) * s * 0.9, y + (k % 2) * s * 0.3, z], [0, 0, 0], [1, 0.6, 1]);
  }
  const m = new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); return m;
}
export function lights(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky || 0xbfe3ff, o.ground || 0x6b8f4a, o.hemi ?? 1.1);
  const sun = new THREE.DirectionalLight(0xfff2d6, o.sun ?? 2.2); sun.position.set(o.dir?.[0] ?? 5, o.dir?.[1] ?? 10, o.dir?.[2] ?? 6);
  scene.add(hemi, sun); return { hemi, sun };
}

// ---------- Particles (instanced cubes) ----------
export class Particles3D {
  constructor(n = 220) {
    this.n = n; this.live = [];
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ gradientMap: toonGradient() }), n);
    this.mesh.frustumCulled = false; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.mesh.count = 0; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.sv = new THREE.Vector3();
  }
  emit(p) { if (this.live.length >= this.n) this.live.shift(); p.rot = p.rot || [Math.random() * 6, Math.random() * 6, 0]; p.spin = p.spin ?? 6; p.g = p.g ?? -14; p.size = p.size ?? [0.2, 0.2, 0.06]; this.live.push(p); }
  burst(n, fn) { for (let i = 0; i < n; i++) this.emit(fn(i)); }
  update(dt) {
    const L = this.live;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt; if (p.life <= 0) { L.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot[0] += p.spin * dt; p.rot[1] += p.spin * 0.7 * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
    }
    const c = new THREE.Color();
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; const s = p.life < 0.25 ? p.life / 0.25 : 1;
      this.e.set(p.rot[0], p.rot[1], 0); this.q.setFromEuler(this.e); this.v.set(p.x, p.y, p.z); this.sv.set(p.size[0] * s, p.size[1] * s, p.size[2] * s);
      this.m.compose(this.v, this.q, this.sv); this.mesh.setMatrixAt(i, this.m); c.set(p.color); this.mesh.setColorAt(i, c);
    }
    this.mesh.count = L.length; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------- Renderer & overlay ----------
export const R = { renderer: null, overlay: null, octx: null, W: 400, H: 700, scale: 1 };
export function initRenderer(canvas, overlay) {
  R.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.renderer.outputColorSpace = THREE.SRGBColorSpace;
  R.overlay = overlay; R.octx = overlay.getContext('2d');
  return R.renderer;
}
export function resizeRenderer(cssW, cssH, W, H, scale) {
  R.W = W; R.H = H; R.scale = scale;
  R.renderer.setSize(cssW, cssH, false);
  const d = Math.min(window.devicePixelRatio || 1, 2);
  R.overlay.width = Math.round(cssW * d); R.overlay.height = Math.round(cssH * d);
  R.octx.setTransform(d * scale, 0, 0, d * scale, 0, 0);
}
const _v = new THREE.Vector3();
// world -> overlay logical coords
export function project(camera, x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x + 1) / 2 * R.W, y: (1 - _v.y) / 2 * R.H, behind: _v.z > 1 };
}
// Floating labels drawn on the overlay
export class Labels {
  constructor() { this.items = []; }
  add(x, y, z, text, o = {}) { this.items.push({ x, y, z, text, size: o.size || 20, color: o.color || '#fff', life: o.life || 1, t: 0, vy: o.vy ?? 1.6 }); }
  update(dt) { for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; it.t += dt; it.y += it.vy * dt; if (it.t > it.life) this.items.splice(i, 1); } }
  draw(ctx, camera, textFn) { for (const it of this.items) { const p = project(camera, it.x, it.y, it.z); if (p.behind) continue; ctx.globalAlpha = it.t > it.life - 0.3 ? (it.life - it.t) / 0.3 : 1; textFn(ctx, it.text, p.x, p.y, { size: it.size, color: it.color }); } ctx.globalAlpha = 1; }
}
