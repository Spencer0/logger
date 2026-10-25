// Forest: tap trees to chop. 3D scene with toon-shaded low-poly trees.
import { THREE, outlined, instanced, skyDome, clouds, lights, Particles3D, Labels, project, blobShadow, toonMat } from '../r3d.js';
import { treeGeo, stumpGeo, knotMesh, makePaul, TREE, mountainsGeo, makeBush } from '../models.js';
import { rr, fillStroke, text, clamp, lerp, rand, randi, easeIn, easeOut, INK } from '../gfx.js';
import { S, D, save } from '../state.js';
import { sfx } from '../audio.js';
import { setBottom, toast, tip, updateHUD } from '../ui.js';

const geoCache = new Map();
const tg = (kind, v = 0) => { const k = kind + v; if (!geoCache.has(k)) geoCache.set(k, treeGeo(kind, v)); return geoCache.get(k); };
const sg = (kind) => { const k = 'stump' + kind; if (!geoCache.has(k)) geoCache.set(k, stumpGeo(kind)); return geoCache.get(k); };

export class ForestScene {
  constructor(game) {
    this.g = game; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50, 0.5, 0.1, 500);
    this.parts = new Particles3D(260); this.scene.add(this.parts.mesh); this.labels = new Labels();
    this.ray = new THREE.Raycaster(); this.trees = []; this.built = null; this.slots = [{ x: -2.7, z: -6 }, { x: 0, z: 1 }, { x: 2.7, z: -6 }];
  }
  enter() {
    this.region = D.region();
    if (this.built !== this.region.id) this.buildWorld();
    this.t = 0; this.combo = 0; this.comboTimer = 0; this.lastHit = -10; this.shake = 0;
    for (const tr of this.trees) this.scene.remove(tr.node, tr.stump);
    this.trees = [];
    for (let i = 0; i < 3; i++) this.trees.push(this.makeTree(i, true));
    this.paul.position.set(-1.6, 0, 2.7); this.paulTx = -1.6; this.paulTz = 2.7; this.paulRot = 0.6; this.swingT = 1;
    this.refreshButtons();
    tip('forest1', 'Tap a tree to swing your axe! Keep tapping to build a COMBO.');
  }
  exit() { save(); }
  resize() { this.camera.aspect = this.g.aspect; this.camera.updateProjectionMatrix(); this.placeCamera(); }
  placeCamera() {
    const maxH = Math.max(...this.region.trees.map((t) => TREE[t.kind].h));
    const fov = 55, t = Math.tan(fov / 2 * Math.PI / 180), a = Math.max(0.4, this.g.aspect);
    this.camera.fov = fov; this.camera.updateProjectionMatrix();
    const widthZ = this.slots[0].z + (Math.abs(this.slots[0].x) + 1.9) / (t * a);
    const heightZ = this.slots[1].z + (maxH * 1.25) / (2 * t);
    const z = Math.max(widthZ, heightZ);
    this.camBase = new THREE.Vector3(0, maxH * 0.38, z);
    this.camLook = new THREE.Vector3(0, maxH * 0.44, -1);
    this.camera.position.copy(this.camBase); this.camera.lookAt(this.camLook);
  }
  buildWorld() {
    const R = this.region, sc = this.scene;
    sc.clear(); sc.add(this.parts.mesh);
    sc.background = new THREE.Color(R.sky[1]); sc.fog = new THREE.Fog(R.fog, 45, 140);
    sc.add(skyDome(R.sky[0], R.sky[1], 300)); sc.add(clouds(10, 140, 35));
    lights(sc, { ground: R.ground });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(200, 24), toonMat(R.ground)); ground.rotation.x = -Math.PI / 2; sc.add(ground);
    // darker back meadow
    const back = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), toonMat(R.ground2)); back.rotation.x = -Math.PI / 2; back.position.set(0, 0.01, -36); sc.add(back);
    sc.add(new THREE.Mesh(mountainsGeo(10, 150), toonMat('#ffffff', { vertexColors: true })));
    // background tree rows (instanced)
    const kinds = R.trees.map((t) => t.kind);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    kinds.forEach((kind, ki) => {
      const grp = instanced(tg(kind, 1), 80, 0.05); let n = 0;
      for (let row = 0; row < 3; row++) for (let x = -60; x <= 60; x += 5 + row * 2) {
        if ((Math.floor(x / 5) + row + ki) % kinds.length !== 0) continue;
        const z = -14 - row * 9 + rand(-2, 2), scl = (0.8 + row * 0.25) * rand(0.85, 1.15) * Math.min(1.2, 8 / TREE[kind].h + 0.4);
        if (Math.abs(x) < 9 && row === 0) continue;
        p.set(x + rand(-1.5, 1.5), -0.1, z); e.set(0, rand(6), 0); q.setFromEuler(e); s.set(scl, scl, scl); m.compose(p, q, s); grp.userData.set(n++, m);
      }
      grp.userData.commit(n); sc.add(grp);
    });
    for (const [bx, bz, bs] of [[-7, -2, 1], [7.5, -1, 0.9], [-9, -9, 1.2], [9, -8, 1.1], [-1.5, -11, 1], [3, -12, 0.8], [-12, 2, 1], [12, 3, 0.9]]) { const b = makeBush(bs); b.position.set(bx, 0, bz); sc.add(b); }
    this.paul = makePaul(); this.paul.scale.setScalar(0.62); sc.add(this.paul);
    this.paulShadow = blobShadow(1.1, 0.25); sc.add(this.paulShadow);
    this.built = R.id; this.placeCamera();
  }
  makeTree(slot, instant = false) {
    const defs = this.region.trees, total = defs.reduce((a, d) => a + d.w, 0); let r = Math.random() * total, def = defs[0];
    for (const d of defs) { r -= d.w; if (r <= 0) { def = d; break; } }
    const node = outlined(tg(def.kind, randi(0, 2)), 0.05);
    const scale = rand(0.9, 1.08) * (slot === 1 ? 1 : 0.92);
    node.scale.setScalar(instant ? scale : 0.05); node.position.set(this.slots[slot].x, 0, this.slots[slot].z); node.rotation.y = rand(6);
    this.scene.add(node);
    const stump = outlined(sg(def.kind), 0.04); stump.position.copy(node.position); stump.scale.setScalar(scale); stump.visible = false; this.scene.add(stump);
    const tr = { slot, kind: def.kind, node, stump, scale, hp: def.hp, maxHp: def.hp, logs: def.logs, state: instant ? 'alive' : 'grow', growT: instant ? 1 : 0, shake: 0, fallT: 0, fallDir: 1, knot: null, knotT: 0, stumpT: 0, x: node.position.x, z: node.position.z };
    node.userData.tree = tr; return tr;
  }
  refreshButtons() {
    const full = S.logs >= D.logCap();
    setBottom([
      { label: '🏕️ Camp', onClick: () => this.g.go('camp') },
      { label: `🐂 Deliver <span class="dim">(${S.logs})</span>`, cls: 'gold' + (full ? ' pulse' : ''), id: 'btn-deliver', disabled: S.logs <= 0, onClick: () => this.g.go('trail') },
    ]);
  }
  treeScreen() { const t = this.trees.find((t) => t.state === 'alive') || this.trees[1]; const p = project(this.camera, t.x, this.treeTopY(t) * 0.45, t.z); return { x: p.x, y: p.y }; }
  treeTopY(tr) { return TREE[tr.kind].h * tr.scale; }
  knotWorld(tr) { const T = TREE[tr.kind]; return new THREE.Vector3(tr.x, T.trunkH * tr.scale * tr.knot.ry, tr.z + T.r * tr.scale * 0.9 + 0.15); }

  pointerDown(x, y) {
    if (y > this.g.H - 70) return;
    const nd = new THREE.Vector2((x / this.g.W) * 2 - 1, -(y / this.g.H) * 2 + 1);
    this.ray.setFromCamera(nd, this.camera);
    const alive = this.trees.filter((t) => t.state === 'alive');
    // knots first
    for (const tr of alive) if (tr.knot && tr.knotNode) { const hit = this.ray.intersectObject(tr.knotNode, true); if (hit.length) return this.chop(tr, true); }
    const objs = alive.map((t) => t.node.userData.main);
    const hits = this.ray.intersectObjects(objs, false);
    if (hits.length) { let o = hits[0].object; while (o && !o.userData.tree) o = o.parent; if (o) return this.chop(o.userData.tree, false); }
    // near miss: closest tree in screen space
    let best = null, bd = 1e9;
    for (const tr of alive) { const p = project(this.camera, tr.x, this.treeTopY(tr) * 0.5, tr.z); const d = Math.hypot(p.x - x, (p.y - y) * 0.5); if (d < bd) { bd = d; best = tr; } }
    if (best && bd < 90) this.chop(best, false);
  }

  chop(tr, knotHit) {
    if (S.logs >= D.logCap()) {
      if (!this.fullWarned || this.t - this.fullWarned > 2.5) { this.fullWarned = this.t; toast('Wagon is full! 🐂 Deliver to the mill.'); sfx.nope(); }
      return;
    }
    const now = this.t;
    if (now - this.lastHit < D.comboWindow()) this.combo++; else this.combo = 1;
    this.lastHit = now; this.comboTimer = D.comboWindow();
    if (this.combo > S.stats.bestCombo) S.stats.bestCombo = this.combo;
    const comboHits = Math.min(this.combo - 1, D.comboMaxHits()), comboMult = 1 + comboHits * D.comboStep();
    let dmg = D.chopDamage() * comboMult, kind = 'hit';
    if (knotHit && tr.knot) { dmg *= D.knotMult(); kind = 'knot'; this.removeKnot(tr); }
    else if (Math.random() < D.critChance()) { dmg *= 3; kind = 'crit'; }
    dmg = Math.round(dmg * 10) / 10;
    if (dmg > S.stats.maxDmg) S.stats.maxDmg = dmg;
    tr.hp -= dmg; tr.shake = 1;
    // Paul walks to the tree and swings
    // Paul stands in front of the trunk, on the outer side for the side trees, facing the tree
    const side = tr.slot === 1 ? -1 : (tr.x > 0 ? 1 : -1);
    const px = tr.x + side * (TREE[tr.kind].r * tr.scale + 0.7), pz = tr.z + 1.7;
    this.paulTx = px; this.paulTz = pz; this.paulRot = Math.atan2(tr.x - px, tr.z - pz); this.swingT = 0;
    const hx = tr.x + side * TREE[tr.kind].r * tr.scale, hy = 1.2 + rand(0, 0.6), hz = tr.z + 0.5;
    const chipCol = tr.kind === 'birch' ? '#f1ebdc' : '#d9a066';
    this.parts.burst(kind === 'hit' ? 7 : 16, () => ({ x: hx, y: hy, z: hz, vx: side * rand(1, 6) * -1 + rand(-3, 3), vy: rand(2, 7), vz: rand(-2, 5), life: rand(0.5, 0.9), color: chipCol, size: [0.22, 0.12, 0.05], floor: 0.03 }));
    const label = kind === 'knot' ? `KNOT! ${fmt(dmg)}` : kind === 'crit' ? `CRACK! ${fmt(dmg)}` : fmt(dmg);
    this.labels.add(hx, hy + 1, hz + 0.5, label, { size: kind === 'hit' ? 20 : 26, color: kind === 'knot' ? '#ffd23f' : kind === 'crit' ? '#ff7a3a' : '#fff', life: 0.9, vy: 2.5 });
    if (kind === 'knot') sfx.knot(); else if (kind === 'crit') sfx.crit(); else sfx.chop(1 + Math.min(comboHits, 10) * 0.05);
    if (this.combo === 5) tip('combo', 'Nice rhythm! Each quick tap adds to your combo multiplier.');
    if (tr.hp <= 0) this.fell(tr);
    else if (!tr.knot && Math.random() < 0.3 * D.knotRate()) { tr.knot = { ry: rand(0.3, 0.9) }; tr.knotT = 3; tr.knotNode = knotMesh(); tr.knotNode.position.copy(this.knotWorld(tr)); this.scene.add(tr.knotNode); tip('knot', 'A KNOT is glowing! Tap it for a 3x hit.'); }
  }
  removeKnot(tr) { if (tr.knotNode) this.scene.remove(tr.knotNode); tr.knot = null; tr.knotNode = null; }
  fell(tr) { tr.state = 'falling'; tr.fallT = 0; this.removeKnot(tr); tr.fallDir = tr.x >= 0 ? 1 : -1; tr.stump.visible = true; sfx.creak(); }
  landed(tr) {
    const n = Math.max(1, Math.round(tr.logs * D.logYieldMult() * rand(0.9, 1.15)));
    const cap = D.logCap(), room = cap - S.logs, got = Math.min(n, room);
    S.logs += got; S.stats.felled++;
    sfx.fall(); this.shake = Math.min(1, 0.3 + tr.scale * 0.5);
    const lx = tr.x + tr.fallDir * this.treeTopY(tr) * 0.5, h = this.treeTopY(tr);
    this.parts.burst(14, () => ({ x: lx + rand(-h / 2, h / 2), y: 0.2, z: tr.z + rand(-1, 1), vx: rand(-3, 3), vy: rand(2, 6), vz: rand(-1, 3), life: rand(0.5, 0.9), color: '#8fbf5a', size: [0.25, 0.25, 0.05], floor: 0.03 }));
    for (let i = 0; i < Math.min(got, 8); i++) this.parts.emit({ x: lx + rand(-h / 2, h / 2), y: 0.5, z: tr.z, vx: rand(-2, 2), vy: rand(7, 10), vz: rand(2, 5), life: rand(0.8, 1), color: '#a56a35', size: [0.7, 0.28, 0.28], g: -16, spin: 5 });
    this.labels.add(tr.x, h * 0.6, tr.z + 1, `+${got} logs`, { size: 28, color: '#ffe08a', life: 1.4, vy: 1.5 });
    if (got < n) toast(`Wagon full — ${n - got} logs left behind!`);
    updateHUD(); this.refreshButtons();
    if (S.logs >= cap) tip('full', 'Wagon is full! Tap DELIVER to ride Babe to the sawmill.');
    if (S.stats.felled === 1) tip('felled1', 'Timber! Logs go in the wagon. Fill it up, then deliver for cash.');
    save();
  }

  update(dt) {
    this.t += dt;
    // Paul
    const p = this.paul; const k = 1 - Math.pow(0.002, dt);
    p.position.x = lerp(p.position.x, this.paulTx, k); p.position.z = lerp(p.position.z, this.paulTz ?? p.position.z, k);
    let dr = this.paulRot - p.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); p.rotation.y += dr * k;
    this.swingT = Math.min(1, this.swingT + dt * 4.5);
    const sw = this.swingT < 0.35 ? easeIn(this.swingT / 0.35) : 1 - easeOut((this.swingT - 0.35) / 0.65);
    p.userData.arms.rotation.x = lerp(-2.4, 0.5, sw);
    p.position.y = Math.abs(p.position.x - this.paulTx) > 0.2 ? Math.abs(Math.sin(this.t * 14)) * 0.15 : 0;
    this.paulShadow.position.set(p.position.x, 0.02, p.position.z);
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    for (let i = 0; i < this.trees.length; i++) {
      const tr = this.trees[i]; const n = tr.node;
      tr.shake = Math.max(0, tr.shake - dt * 3);
      if (tr.knot) { tr.knotT -= dt; const s = 1 + 0.12 * Math.sin(this.t * 8); tr.knotNode.scale.setScalar(s); if (tr.knotT <= 0) this.removeKnot(tr); }
      if (tr.state === 'grow') { tr.growT += dt * 0.9; if (tr.growT >= 1) { tr.growT = 1; tr.state = 'alive'; } n.scale.setScalar(tr.scale * (0.05 + 0.95 * easeOut(tr.growT))); }
      else if (tr.state === 'falling') { tr.fallT += dt / 1.0; if (tr.fallT >= 1) { tr.fallT = 1; tr.state = 'fallen'; tr.stumpT = 0; n.visible = false; this.landed(tr); } n.rotation.z = -tr.fallDir * easeIn(tr.fallT) * (Math.PI / 2 - 0.06); }
      else if (tr.state === 'fallen') { tr.stumpT += dt; if (tr.stumpT > 1.0) { this.scene.remove(n, tr.stump); this.trees[i] = this.makeTree(tr.slot); } }
      if (tr.state === 'alive' || tr.state === 'grow') { n.rotation.z = Math.sin(this.t * 45) * 0.04 * tr.shake; n.rotation.x = Math.cos(this.t * 38) * 0.02 * tr.shake; }
    }
    this.parts.update(dt); this.labels.update(dt);
    // camera shake
    this.camera.position.copy(this.camBase); if (this.shake > 0) this.camera.position.x += rand(-0.3, 0.3) * this.shake, this.camera.position.y += rand(-0.2, 0.2) * this.shake;
    this.camera.lookAt(this.camLook);
  }

  render(renderer, ctx, W, H) {
    renderer.render(this.scene, this.camera);
    const R = this.region;
    // hp bars
    for (const tr of this.trees) {
      if (tr.state !== 'alive' || tr.hp >= tr.maxHp) continue;
      const p = project(this.camera, tr.x, this.treeTopY(tr) + 0.8, tr.z); const bw = 70, bx = p.x - bw / 2, by = p.y;
      rr(ctx, bx, by, bw, 12, 6); fillStroke(ctx, '#2b1d14', INK, 2.5);
      const f = clamp(tr.hp / tr.maxHp, 0, 1);
      if (f > 0) { rr(ctx, bx + 2, by + 2, (bw - 4) * f, 8, 4); ctx.fillStyle = f > 0.5 ? '#6ad36a' : f > 0.25 ? '#f2b134' : '#e0532f'; ctx.fill(); }
    }
    this.labels.draw(ctx, this.camera, text);
    if (this.combo > 1) {
      const mult = 1 + Math.min(this.combo - 1, D.comboMaxHits()) * D.comboStep();
      const cx = W / 2, cy = Math.max(120, H * 0.17);
      text(ctx, `${this.combo} HIT COMBO`, cx, cy, { size: 22, color: '#ffd23f' });
      text(ctx, `x${mult.toFixed(1)} damage`, cx, cy + 22, { size: 15, color: '#fff' });
      const f = clamp(this.comboTimer / D.comboWindow(), 0, 1);
      rr(ctx, cx - 50, cy + 36, 100, 8, 4); fillStroke(ctx, '#2b1d14', INK, 2);
      rr(ctx, cx - 48, cy + 38, 96 * f, 4, 2); ctx.fillStyle = '#ffd23f'; ctx.fill();
    }
    text(ctx, `${R.em} ${R.name}`, W / 2, 46, { size: 15, color: '#fff' });
    text(ctx, `${D.axe().name} · ${fmt(D.chopDamage())} dmg`, 12, H - 86, { size: 13, color: '#ffe8c0', align: 'left' });
  }
}
function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
