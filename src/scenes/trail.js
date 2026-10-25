// Trail: ride Babe through a 3D forest to the sawmill. Steer, jump, drift-boost.
import { THREE, outlined, instanced, skyDome, clouds, lights, Particles3D, Labels, blobShadow, toonMat, vcMat, project } from '../r3d.js';
import { treeGeo, makeBabe, cargoLogs, boulderGeo, pileGeo, pancakeGeo, logGeo, makeMill, chevron, mountainsGeo, TREE } from '../models.js';
import { rr, fillStroke, text, clamp, lerp, rand, randi, pick, INK } from '../gfx.js';
import { S, D, LOG_PRICE, save, addMoney } from '../state.js';
import { sfx, startGallop, setGallop, stopGallop } from '../audio.js';
import { showTrailUI, modal, toast, tip, updateHUD, money } from '../ui.js';

const SEG = 2, HALFW = 3.2;
const CURVE = { easy: 2, med: 4, hard: 6 }, HILL = { low: 20, med: 40, high: 60 };
const TYPES = { boulder: { hw: 0.22 }, log: { hw: 0.46, jumpable: true }, pile: { hw: 0.22, jumpable: true }, pancake: { hw: 0.14 } };
const ease = { in: (a, b, p) => a + (b - a) * p * p, out: (a, b, p) => a + (b - a) * (1 - (1 - p) * (1 - p)), io: (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5) };
const geos = {};
const G = (k, fn) => geos[k] || (geos[k] = fn());

export class TrailScene {
  constructor(game) {
    this.g = game; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(60, 0.5, 0.1, 400);
    this.parts = new Particles3D(300); this.labels = new Labels(); this.world = null;
    this.babe = makeBabe(); this.babe.scale.setScalar(0.85); this.babeShadow = blobShadow(1.3, 0.3);
  }
  enter() {
    this.region = D.region(); this.ridx = ['pine', 'oak', 'redwood', 'sequoia'].indexOf(this.region.id);
    this.buildTrack(); this.buildWorld();
    this.pos = 24; this.playerX = 0; this.speed = 0; this.t = 0; this.time = 0;
    this.maxSpeed = 26 * D.oxTopSpeed();
    this.steer = 0; this.keys = {}; this.jump = -1; this.swingT = 0;
    this.drift = 0; this.drifting = false; this.boost = 0; this.inv = 0; this.shake = 0; this.flash = 0;
    this.lucy = !!S.crew.lucy; this.pancakes = 0; this.bonusLogs = 0; this.crashes = 0;
    this.finished = false; this.finishT = 0; this.started = false; this.countdown = 2.2; this.resultsShown = false;
    this.parts.live.length = 0; this.labels.items.length = 0;
    this.setCargo(); this.camPos = null;
    this.bindUI(); showTrailUI(true); startGallop();
    tip('trail1', 'Left side: drag to steer. Right button: JUMP over logs & swing at log piles!', 5000);
  }
  exit() { this.unbindUI(); showTrailUI(false); stopGallop(); }
  resize() { this.camera.aspect = this.g.aspect; this.camera.updateProjectionMatrix(); }

  bindUI() {
    const sz = document.getElementById('steer-zone'), jz = document.getElementById('jump-zone');
    this.h = {
      sd: (e) => { sz.setPointerCapture?.(e.pointerId); this.sx0 = e.clientX; this.sid = e.pointerId; this.steerTouch = 0; },
      sm: (e) => { if (e.pointerId !== this.sid || this.sx0 == null) return; this.steerTouch = clamp((e.clientX - this.sx0) / (55 * this.g.scale), -1, 1); },
      su: (e) => { if (e.pointerId !== this.sid) return; this.sx0 = null; this.steerTouch = 0; },
      jd: (e) => { e.preventDefault(); jz.classList.add('down'); this.doJump(); },
      ju: () => jz.classList.remove('down'),
    };
    sz.addEventListener('pointerdown', this.h.sd); sz.addEventListener('pointermove', this.h.sm); sz.addEventListener('pointerup', this.h.su); sz.addEventListener('pointercancel', this.h.su);
    jz.addEventListener('pointerdown', this.h.jd); jz.addEventListener('pointerup', this.h.ju); jz.addEventListener('pointercancel', this.h.ju);
  }
  unbindUI() {
    if (!this.h) return;
    const sz = document.getElementById('steer-zone'), jz = document.getElementById('jump-zone');
    sz.removeEventListener('pointerdown', this.h.sd); sz.removeEventListener('pointermove', this.h.sm); sz.removeEventListener('pointerup', this.h.su); sz.removeEventListener('pointercancel', this.h.su);
    jz.removeEventListener('pointerdown', this.h.jd); jz.removeEventListener('pointerup', this.h.ju); jz.removeEventListener('pointercancel', this.h.ju);
    this.h = null;
  }
  keyDown(k) { this.keys[k] = true; if (k === ' ' || k === 'ArrowUp' || k === 'w') this.doJump(); }
  keyUp(k) { this.keys[k] = false; }

  // ---------- Track ----------
  buildTrack() {
    const R = this.region, segs = this.segs = [];
    const addSeg = (curve, y) => segs.push({ i: segs.length, curve, y, sprites: [] });
    const lastY = () => (segs.length ? segs[segs.length - 1].y : 0);
    const addRoad = (enter, hold, leave, curve, y) => {
      const sy = lastY(), ey = sy + y * 0.15, total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(ease.in(0, curve, n / enter), ease.io(sy, ey, n / total));
      for (let n = 0; n < hold; n++) addSeg(curve, ease.io(sy, ey, (enter + n) / total));
      for (let n = 0; n < leave; n++) addSeg(ease.out(curve, 0, n / leave), ease.io(sy, ey, (enter + hold + n) / total));
    };
    addRoad(10, 30, 10, 0, 0);
    const target = R.trailLen * 5; let hillBudget = 0;
    while (segs.length < target) {
      const r = Math.random(), len = randi(10, 26);
      if (r < 0.3) addRoad(len, len, len, 0, 0);
      else if (r < 0.7) { const c = pick([CURVE.easy, CURVE.med, CURVE.med, CURVE.hard]) * (Math.random() < 0.5 ? -1 : 1); addRoad(len, len, len, c, 0); }
      else { let h = pick([HILL.low, HILL.med, HILL.high]) * (Math.random() < 0.5 ? -1 : 1); if (hillBudget + h > 80 || hillBudget + h < -80) h = -h; hillBudget += h; addRoad(len, len, len, Math.random() < 0.4 ? pick([CURVE.easy, -CURVE.easy]) : 0, h); }
    }
    this.trackLen = segs.length * SEG; this.finishSeg = segs.length;
    addRoad(20, 40, 20, 0, -hillBudget); addRoad(20, 50, 20, 0, 0);
    // centerline
    let th = 0, x = 0, z = 0;
    for (const s of segs) { s.x = x; s.z = z; s.th = th; s.dx = Math.sin(th); s.dz = Math.cos(th); s.nx = Math.cos(th); s.nz = -Math.sin(th); th += s.curve * 0.0075; x += Math.sin(th) * SEG; z += Math.cos(th) * SEG; }
    const last = segs[segs.length - 1]; this.endPt = { x: last.x, z: last.z, y: last.y, th: last.th };
    // obstacles
    const dens = R.obst * Math.min(1.7, 1 + S.stats.deliveries * 0.04), pileW = S.crew.sport ? 0.45 : 0.2;
    let next = 45;
    while (next < this.finishSeg - 30) {
      const seg = segs[next], r = Math.random() * (0.65 + pileW + 0.3);
      if (r < 0.35) seg.sprites.push({ type: 'boulder', off: pick([-0.6, -0.3, 0, 0.3, 0.6]) + rand(-0.1, 0.1) });
      else if (r < 0.65) seg.sprites.push({ type: 'log', off: Math.random() < 0.5 ? -0.5 : 0.5 });
      else if (r < 0.65 + pileW) seg.sprites.push({ type: 'pile', off: pick([-0.5, 0, 0.5]) });
      else if (r < 0.65 + pileW + 0.2) { const off = Math.abs(seg.curve) > 3 ? -Math.sign(seg.curve) * 0.5 : pick([-0.5, 0, 0.5]); for (let k = 0; k < 4; k++) if (next + k * 2 < this.finishSeg) segs[next + k * 2].sprites.push({ type: 'pancake', off }); }
      else seg.boost = true;
      next += Math.round(randi(7, 16) / dens);
    }
  }
  segAt(pos) { return this.segs[clamp(Math.floor(pos / SEG), 0, this.segs.length - 1)]; }
  // world point at track position & lateral offset (road units)
  pt(pos, lat = 0, out = new THREE.Vector3()) {
    const i = clamp(Math.floor(pos / SEG), 0, this.segs.length - 2), f = clamp(pos / SEG - i, 0, 1), a = this.segs[i], b = this.segs[i + 1];
    const x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f), y = lerp(a.y, b.y, f), nx = lerp(a.nx, b.nx, f), nz = lerp(a.nz, b.nz, f);
    return out.set(x + nx * lat * HALFW, y, z + nz * lat * HALFW);
  }
  headingAt(pos) { const i = clamp(Math.floor(pos / SEG), 0, this.segs.length - 2), f = pos / SEG - i; return lerp(this.segs[i].th, this.segs[i + 1].th, f); }

  buildWorld() {
    const R = this.region, sc = this.scene;
    sc.clear(); sc.add(this.parts.mesh, this.babe, this.babeShadow);
    sc.background = new THREE.Color(R.fog); sc.fog = new THREE.Fog(R.fog, 35, 130);
    this.sky = skyDome(R.sky[0], R.sky[1], 250); sc.add(this.sky); this.clouds = clouds(12, 200, 40); sc.add(this.clouds);
    lights(sc, { ground: R.ground });
    this.mountains = new THREE.Mesh(mountainsGeo(14, 210), toonMat('#fff', { vertexColors: true })); sc.add(this.mountains);
    // road + shoulders + ground ribbon as one vertex-colored mesh
    const segs = this.segs, n = segs.length;
    const lanes = [-70, -22, -HALFW - 0.7, -HALFW, HALFW, HALFW + 0.7, 22, 70];
    const pos = [], col = [], idx = [], c = new THREE.Color();
    const gc = [new THREE.Color(R.ground), new THREE.Color(R.ground2)], rc = [new THREE.Color(R.road), new THREE.Color(R.road).multiplyScalar(0.92)], sh = new THREE.Color('#d9c6a0');
    for (let i = 0; i < n; i++) {
      const s = segs[i], light = (i >> 2) & 1, fin = (i === this.finishSeg || i === this.finishSeg - 1);
      for (let l = 0; l < lanes.length; l++) {
        const lat = lanes[l], far = Math.abs(lat) > 10 ? (Math.abs(lat) - 10) / 60 : 0;
        const bump = far * (Math.sin(i * 0.17 + lat * 0.05) * 3 + Math.sin(i * 0.05) * 4) + (Math.abs(lat) > 30 ? far * 6 : 0);
        pos.push(s.x + s.nx * lat, s.y - 0.02 + bump, s.z + s.nz * lat);
        if (Math.abs(lat) <= HALFW) c.copy(fin ? (light ? new THREE.Color('#ffffff') : new THREE.Color('#222222')) : rc[light]);
        else if (Math.abs(lat) <= HALFW + 0.7) c.copy(sh); else c.copy(gc[light]).offsetHSL(0, 0, far * 0.04);
        col.push(c.r, c.g, c.b);
      }
      if (i < n - 1) for (let l = 0; l < lanes.length - 1; l++) { const a = i * lanes.length + l, b = a + lanes.length; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    this.road = new THREE.Mesh(geo, vcMat()); sc.add(this.road);
    const minY = Math.min(...segs.map((s) => s.y));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(600, 24), toonMat(R.ground2)); disc.rotation.x = -Math.PI / 2; disc.position.y = minY - 2.5; sc.add(disc); this.disc = disc;
    // finish checker & mill
    const mill = makeMill(); const e = this.segs[Math.min(this.finishSeg + 10, n - 1)]; mill.position.set(e.x + e.nx * 0, e.y, e.z); mill.rotation.y = e.th + Math.PI; mill.scale.setScalar(1.3); sc.add(mill); this.mill = mill;
    const bannerSeg = this.segs[this.finishSeg]; const banner = new THREE.Group();
    for (const side of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), toonMat('#7a4a24')); p.position.set(side * (HALFW + 0.5), 2.5, 0); banner.add(p); }
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(HALFW * 2 + 1.2, 0.9, 0.1), toonMat('#c8402f')); cloth.position.y = 4.6; banner.add(cloth);
    banner.position.set(bannerSeg.x, bannerSeg.y, bannerSeg.z); banner.rotation.y = bannerSeg.th; sc.add(banner); this.banner = banner;
    // trees (instanced)
    const kinds = { pine: ['pine', 'birch'], oak: ['oak', 'maple'], redwood: ['redwood', 'pine'], sequoia: ['sequoia', 'redwood'] }[R.id];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), p = new THREE.Vector3(), sv = new THREE.Vector3();
    this.treeGroups = kinds.map((k) => ({ grp: instanced(G('t' + k, () => treeGeo(k, 0)), 700, 0.05), n: 0, k }));
    for (let i = 3; i < n; i += 2) {
      const s = segs[i];
      for (const side of [-1, 1]) {
        if (Math.random() < 0.5) continue;
        const lat = side * rand(HALFW + 1.8, HALFW + 9), g = this.treeGroups[(i + (side > 0 ? 1 : 0)) % kinds.length];
        if (g.n >= 700) continue;
        const scl = rand(0.75, 1.25) * (TREE[g.k].h > 10 ? 0.8 : 1);
        p.set(s.x + s.nx * lat, s.y - 0.1, s.z + s.nz * lat); eu.set(0, rand(6), 0); q.setFromEuler(eu); sv.set(scl, scl, scl); m.compose(p, q, sv); g.grp.userData.set(g.n++, m);
        if (Math.random() < 0.35 && g.n < 700) { const lat2 = side * rand(HALFW + 10, HALFW + 22); p.set(s.x + s.nx * lat2, s.y + 0.5, s.z + s.nz * lat2); m.compose(p, q, sv.multiplyScalar(1.3)); g.grp.userData.set(g.n++, m); }
      }
      s.trees = true;
    }
    for (const g of this.treeGroups) { g.grp.userData.commit(g.n); sc.add(g.grp); }
    // obstacles
    const mk = { boulder: () => outlined(G('boulder' + randi(0, 2), () => boulderGeo(rand(3))), 0.05), log: () => outlined(G('log', () => logGeo(HALFW * 1.1, 0.38, '#8a5a2b')), 0.045), pile: () => outlined(G('pile', pileGeo), 0.04), pancake: () => outlined(G('pancake', pancakeGeo), 0.035) };
    for (const s of segs) {
      if (s.boost) { const ch = chevron(); ch.position.set(s.x, s.y + 0.03, s.z); ch.rotation.z = s.th; ch.scale.set(1.5, 1.5, 1); sc.add(ch); s.boostMesh = ch; }
      for (const o of s.sprites) {
        const node = mk[o.type](); node.position.set(s.x + s.nx * o.off * HALFW, s.y, s.z + s.nz * o.off * HALFW); node.rotation.y = s.th + (o.type === 'log' ? 0 : rand(6)); sc.add(node); o.node = node;
        if (o.type === 'pancake') node.userData.spin = true;
      }
    }
    this.spinners = []; this.scene.traverse((o) => { if (o.userData.spin) this.spinners.push(o); });
  }
  setCargo() {
    const c = this.babe.userData.cargo; while (c.children.length) c.remove(c.children[0]);
    if (S.logs > 0) c.add(cargoLogs(S.logs));
  }

  // ---------- Gameplay ----------
  doJump() { if (this.jump >= 0 || this.finished || !this.started) return; this.jump = 0; sfx.jump(); }
  crash(kind) {
    if (this.inv > 0) return;
    this.crashes++; this.inv = 1.6; this.shake = 1; this.flash = 1; this.jump = -1;
    this.speed *= kind === 'pile' ? 0.45 : 0.25; this.drift = 0; this.drifting = false; this.boost = 0;
    sfx.crash(); sfx.moo();
    if (this.lucy) { this.lucy = false; toast("🥛 Lucy's milk! No logs lost."); return; }
    let lost = Math.ceil(S.logs * D.crashLoss() * (kind === 'pile' ? 0.4 : 1));
    lost = Math.min(S.logs, Math.max(S.logs > 0 ? 1 : 0, lost));
    S.logs -= lost; updateHUD(); this.setCargo();
    const b = this.babe.position;
    for (let i = 0; i < Math.min(lost, 6); i++) this.parts.emit({ x: b.x, y: b.y + 2.5, z: b.z, vx: rand(-5, 5), vy: rand(4, 8), vz: rand(-5, 5), life: 1.2, color: '#a56a35', size: [0.9, 0.35, 0.35], g: -16, floor: b.y + 0.2 });
    if (lost > 0) this.labels.add(b.x, b.y + 3.5, b.z, `-${lost} logs!`, { size: 26, color: '#ff6a4a', life: 1.4 });
    if (this.crashes === 1) tip('crash', 'Ouch! Crashes spill logs. Dodge boulders, JUMP over fallen logs.');
  }

  update(dt) {
    this.t += dt;
    if (this.countdown > 0) { this.countdown -= dt; if (this.countdown <= 0) { this.started = true; sfx.boost(); } }
    let st = this.steerTouch || 0;
    if (this.keys.ArrowLeft || this.keys.a) st = -1; if (this.keys.ArrowRight || this.keys.d) st = 1;
    this.steer = lerp(this.steer, st, 1 - Math.pow(0.0001, dt));
    const seg = this.segAt(this.pos), sp = this.speed / this.maxSpeed;
    if (this.finished) {
      this.finishT += dt; this.speed = Math.max(0, this.speed - this.maxSpeed * dt * 0.6); this.playerX = lerp(this.playerX, 0, dt * 2);
      if (this.finishT > 1.4 && !this.resultsShown) { this.resultsShown = true; this.showResults(); }
    } else if (this.started) {
      this.time += dt;
      const offroad = Math.abs(this.playerX) > 1.05;
      let target = this.maxSpeed * (this.boost > 0 ? 1.45 : 1);
      if (offroad) target = this.maxSpeed * 0.45;
      if (this.drifting) target *= 0.92;
      const acc = this.boost > 0 ? this.maxSpeed * 2 : this.maxSpeed / 2.2;
      if (this.speed < target) this.speed = Math.min(target, this.speed + acc * dt); else this.speed = Math.max(target, this.speed - this.maxSpeed * 1.5 * dt);
      const bp = this.babe.position;
      if (offroad && this.speed > this.maxSpeed * 0.3 && Math.random() < dt * 25) this.parts.emit({ x: bp.x + rand(-1, 1), y: bp.y + 0.2, z: bp.z, vx: rand(-2, 2), vy: rand(2, 5), vz: rand(-2, 2), life: 0.5, color: this.region.ground2, size: [0.2, 0.2, 0.2] });
      const dx = dt * 2 * sp;
      this.playerX += dx * this.steer * D.oxHandling() * 1.1;
      this.playerX -= dx * sp * seg.curve * 0.13;
      this.playerX = clamp(this.playerX, -2.4, 2.4);
      const canDrift = Math.abs(this.steer) > 0.6 && Math.abs(seg.curve) > 1.5 && sp > 0.55 && this.jump < 0;
      if (canDrift) {
        if (!this.drifting) { this.drifting = true; this.driftDir = Math.sign(this.steer); tip('drift', 'DRIFT! Hold the turn, then release for a BOOST.'); }
        this.drift = Math.min(2.2, this.drift + dt);
        if (Math.random() < dt * 40) { const col = this.drift > 1.4 ? '#ff5a2a' : this.drift > 0.7 ? '#ffd23f' : '#ffffff'; this.parts.emit({ x: bp.x + rand(-0.8, 0.8), y: bp.y + 0.2, z: bp.z + rand(-0.8, 0.8), vx: rand(-3, 3), vy: rand(1, 4), vz: rand(-6, -2), life: rand(0.2, 0.4), color: col, size: [0.12, 0.12, 0.12], g: -5 }); }
        if (Math.random() < dt * 6) sfx.drift();
      } else if (this.drifting) {
        this.drifting = false;
        if (this.drift > 0.6) { this.boost = (0.5 + this.drift * 0.45) * D.boostPower(); sfx.boost(); this.labels.add(bp.x, bp.y + 4, bp.z, this.drift > 1.4 ? 'SUPER BOOST!' : 'BOOST!', { size: this.drift > 1.4 ? 34 : 26, color: '#ffd23f', life: 0.9 }); }
        this.drift = 0;
      }
      if (this.boost > 0) this.boost -= dt;
      if (this.jump >= 0) { this.jump += dt / 0.62; if (this.jump >= 1) { this.jump = -1; sfx.land(); } }
      this.swingT = Math.max(0, this.swingT - dt * 3);
      this.pos += this.speed * dt;
      if (this.pos >= this.trackLen) { this.finished = true; sfx.fanfare(); }
      const pseg = this.segAt(this.pos);
      if (pseg.boost && !pseg.used && Math.abs(this.playerX) < 1) { pseg.used = true; this.boost = Math.max(this.boost, 0.9); sfx.boost(); if (pseg.boostMesh) pseg.boostMesh.visible = false; }
      // off-road tree collision (cheap: trees exist on most segments, so hitting the tree line is a crash)
      if (Math.abs(this.playerX) > 1.75 && pseg.trees && this.inv <= 0 && this.speed > this.maxSpeed * 0.3) this.crash('tree');
      for (const o of pseg.sprites) {
        if (o.done) continue;
        const T = TYPES[o.type];
        if (Math.abs(this.playerX - o.off) > T.hw + 0.28) continue;
        const airborne = this.jump > 0.2 && this.jump < 0.85;
        if (o.type === 'pancake') { o.done = true; o.node.visible = false; const v = 5 * (this.ridx + 1); this.pancakes += v; sfx.pancake(); this.labels.add(bp.x, bp.y + 3.2, bp.z, `+$${v}`, { size: 22, color: '#ffe08a', life: 0.8 }); }
        else if (o.type === 'pile') {
          o.done = true;
          if (airborne) { const n = randi(2, 4) * (S.crew.sport ? 2 : 1), got = Math.min(n, D.logCap() - S.logs); S.logs += got; this.bonusLogs += got; this.swingT = 1; sfx.swing(); sfx.log(); updateHUD(); this.setCargo(); o.node.visible = false;
            this.labels.add(bp.x, bp.y + 4, bp.z, got > 0 ? `CHOP! +${got} logs` : 'CHOP! (wagon full)', { size: 24, color: '#9cff8a', life: 1 });
            this.parts.burst(8, () => ({ x: o.node.position.x, y: o.node.position.y + 0.6, z: o.node.position.z, vx: rand(-4, 4), vy: rand(3, 7), vz: rand(-4, 4), life: 0.7, color: '#d9a066', size: [0.3, 0.15, 0.08], floor: o.node.position.y + 0.05 })); }
          else this.crash('pile');
        }
        else if (o.type === 'log') { if (!airborne) { o.done = true; this.crash('log'); } }
        else if (o.type === 'boulder') { if (!airborne || this.jump < 0.4) { o.done = true; this.crash('boulder'); } }
      }
    }
    this.inv = Math.max(0, this.inv - dt); this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, this.flash - dt * 5);
    // place Babe
    const bp = this.pt(this.pos, this.playerX), jh = this.jump >= 0 ? Math.sin(this.jump * Math.PI) * 2.2 : 0, th = this.headingAt(this.pos);
    this.babe.position.set(bp.x, bp.y + jh, bp.z);
    this.babe.rotation.y = th + this.steer * 0.3 + (this.drifting ? this.driftDir * 0.45 : 0);
    this.babe.rotation.z = -this.steer * 0.12; this.babe.rotation.x = this.jump >= 0 ? -Math.sin(this.jump * Math.PI) * 0.3 : 0;
    this.babe.visible = !(this.inv > 0 && Math.floor(this.t * 14) % 2 === 0) || this.finished;
    const run = this.finished ? 0.2 : Math.max(0.3, sp);
    this.babe.userData.legs.forEach((lg, i) => { lg.rotation.x = Math.sin(this.t * 16 * run + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.7 * run; });
    this.babe.userData.head.rotation.z = -this.swingT * 1.4; this.babe.userData.head.rotation.y = this.steer * 0.3;
    this.babe.position.y += Math.abs(Math.sin(this.t * 16 * run)) * 0.08 * run;
    this.babeShadow.position.set(bp.x, bp.y + 0.03, bp.z); this.babeShadow.scale.setScalar(1 - jh * 0.15);
    // camera: behind & above, follows the road
    const back = this.pt(this.pos - 10.5, this.playerX * 0.8), ahead = this.pt(this.pos + 12, this.playerX * 0.6);
    const want = new THREE.Vector3(back.x, Math.max(back.y, bp.y) + 5.2, back.z);
    if (!this.camPos) this.camPos = want.clone();
    this.camPos.lerp(want, 1 - Math.pow(0.0005, dt));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) this.camera.position.x += rand(-0.3, 0.3) * this.shake, this.camera.position.y += rand(-0.2, 0.2) * this.shake;
    this.camera.lookAt(ahead.x, bp.y + 0.8, ahead.z);
    this.camera.fov = lerp(this.camera.fov, this.boost > 0 ? 72 : 60, dt * 5); this.camera.updateProjectionMatrix();
    this.sky.position.copy(this.camera.position); this.clouds.position.set(this.camera.position.x, 0, this.camera.position.z); this.mountains.position.set(this.camera.position.x, 0, this.camera.position.z); this.disc.position.x = this.camera.position.x; this.disc.position.z = this.camera.position.z;
    for (const s of this.spinners) s.rotation.y += dt * 2;
    if (this.mill) this.mill.userData.wheel.rotation.z -= dt * 1.2;
    this.parts.update(dt); this.labels.update(dt);
    setGallop(clamp(this.speed / this.maxSpeed, 0, 1.2) * (this.finished ? 0 : 1));
  }

  showResults() {
    const R = this.region, logs = S.logs;
    const par = this.trackLen / (this.maxSpeed * 0.85) + 3, ratio = this.time / par;
    const bonusPct = clamp(Math.round((1.45 - ratio) * 50), 0, 50);
    const base = logs * LOG_PRICE * D.priceMult(), fresh = Math.round(base * bonusPct / 100), total = Math.round(base + fresh + this.pancakes);
    const stars = bonusPct >= 35 ? 3 : bonusPct >= 15 ? 2 : 1;
    addMoney(total); S.logs = 0; S.stats.deliveries++;
    const bt = S.stats.bestTime[R.id]; if (!bt || this.time < bt) S.stats.bestTime[R.id] = this.time;
    save(); updateHUD(); sfx.coin();
    const tipLine = stars === 3 ? 'Perfect delivery! The mill pays top dollar for fresh logs.' : stars === 2 ? 'Good run. Drift through curves and release for boosts to go faster.' : 'Slow delivery. Avoid crashes and try drifting on curves for a boost.';
    modal(`<div class="result"><h2 style="justify-content:center">🏭 Sawmill</h2><div class="stars">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></div>
      <table><tr><td>Logs delivered</td><td>${logs}</td></tr>${this.bonusLogs ? `<tr><td>…chopped on the trail</td><td>+${this.bonusLogs}</td></tr>` : ''}<tr><td>Price (${money(LOG_PRICE * D.priceMult())}/log${S.crew.inkslinger ? ', Inkslinger +25%' : ''})</td><td>${money(base)}</td></tr><tr><td>Freshness bonus (${this.time.toFixed(1)}s)</td><td>+${bonusPct}% · ${money(fresh)}</td></tr>${this.pancakes ? `<tr><td>Pancakes found</td><td>${money(this.pancakes)}</td></tr>` : ''}<tr><td>Crashes</td><td>${this.crashes}</td></tr></table>
      <div class="big-num">+${money(total)}</div><p class="sub">${tipLine}</p>
      <div class="row" style="justify-content:center"><button class="green" data-camp>🏕️ Back to Camp</button><button data-forest>🪓 Keep Logging</button></div></div>`, (b) => {
      b.querySelector('[data-camp]').onclick = () => { sfx.click(); this.g.go('camp'); };
      b.querySelector('[data-forest]').onclick = () => { sfx.click(); this.g.go('forest'); };
    });
  }

  render(renderer, ctx, W, H) {
    renderer.render(this.scene, this.camera);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,80,40,${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    this.labels.draw(ctx, this.camera, text);
    const sp = this.speed / this.maxSpeed, prog = clamp(this.pos / this.trackLen, 0, 1);
    rr(ctx, 60, 44, W - 120, 14, 7); fillStroke(ctx, '#2b1d14', INK, 2.5);
    rr(ctx, 62, 46, (W - 124) * prog, 10, 5); ctx.fillStyle = '#6ad36a'; ctx.fill();
    text(ctx, '🏕️', 42, 51, { size: 18, stroke: false }); text(ctx, '🏭', W - 42, 51, { size: 18, stroke: false });
    text(ctx, `${this.time.toFixed(1)}s`, W / 2, 76, { size: 20, color: '#fff' });
    text(ctx, `${Math.round(sp * 60)} mph`, W / 2, 98, { size: 14, color: '#ffe8c0' });
    if (this.lucy) text(ctx, '🥛', W - 30, 80, { size: 20, stroke: false });
    if (this.boost > 0) text(ctx, 'BOOST', W / 2, 124, { size: 26, color: '#ffd23f' });
    if (this.drifting || this.drift > 0) {
      const f = clamp(this.drift / 2.2, 0, 1);
      rr(ctx, W / 2 - 60, H - 150, 120, 12, 6); fillStroke(ctx, '#2b1d14', INK, 2.5);
      rr(ctx, W / 2 - 58, H - 148, 116 * f, 8, 4); ctx.fillStyle = f > 0.65 ? '#ff5a2a' : f > 0.3 ? '#ffd23f' : '#fff'; ctx.fill();
      text(ctx, 'DRIFT', W / 2, H - 164, { size: 14, color: '#fff' });
    }
    if (this.countdown > 0) {
      const n = Math.ceil(this.countdown); text(ctx, n > 2 ? 'Ready…' : n === 2 ? 'Set…' : 'GO!', W / 2, H * 0.3, { size: 48, color: '#ffd23f' });
      text(ctx, `Deliver ${S.logs} logs to the mill!`, W / 2, H * 0.3 + 44, { size: 18, color: '#fff' });
    }
    if (this.finished && !this.resultsShown) text(ctx, 'DELIVERED!', W / 2, H * 0.3, { size: 46, color: '#9cff8a' });
  }
}
