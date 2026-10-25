// Camp: the home base in 3D. Tap buildings to open shops.
import { THREE, outlined, instanced, skyDome, clouds, lights, blobShadow, toonMat, project } from '../r3d.js';
import { treeGeo, stumpGeo, makePaul, makeBabe, makeCrew, makeCabin, makeBarn, makeForge, makeCampfire, makeSign, makeFence, makeWoodpile, makeBush, mountainsGeo, TREE } from '../models.js';
import { text, circle, rand, INK } from '../gfx.js';
import { S, D, AXES, PERKS, CREW, REGIONS, WAGON_CAPS, save, spend } from '../state.js';
import { sfx, setMuted, isMuted } from '../audio.js';
import { setBottom, modal, closeModal, toast, tip, updateHUD, money } from '../ui.js';

export class CampScene {
  constructor(game) {
    this.g = game; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50, 0.5, 0.1, 600); this.ray = new THREE.Raycaster();
    this.t = 0; this.crewNodes = {}; this.built = false;
  }
  enter() {
    if (!this.built) this.build();
    this.t = 0; this.refreshButtons(); this.syncCrew();
    this.signText = D.region();
    if (!S.tut.camp1) tip('camp1', 'Welcome to camp! Tap the FORGE to buy a better axe, or GO LOGGING to earn cash.', 5000);
  }
  resize() {
    this.camera.aspect = this.g.aspect; this.camera.updateProjectionMatrix();
    const a = Math.max(0.4, Math.min(1.2, this.g.aspect)), t = Math.tan(25 * Math.PI / 180);
    const dist = Math.max(22, 7.2 / (t * a)); // keep x in [-7.2, 7.2] visible at the look point
    this.camera.position.set(0, dist * 0.68, dist * 0.78); this.camera.lookAt(0, 0, -2.2);
  }
  build() {
    const sc = this.scene;
    sc.background = new THREE.Color('#d9f1ff'); sc.fog = new THREE.Fog('#d9f1ff', 60, 200);
    sc.add(skyDome('#6fb8ff', '#d9f1ff', 400)); sc.add(clouds(10, 160, 45));
    lights(sc, { ground: 0x5aa34a });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 32), toonMat('#5aa34a')); ground.rotation.x = -Math.PI / 2; sc.add(ground);
    const path = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), toonMat('#b08a55')); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.015, 3); path.scale.set(1.6, 1, 1); sc.add(path);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(40, 24), toonMat('#5aa7e6')); lake.rotation.x = -Math.PI / 2; lake.position.set(10, 0.02, -45); lake.scale.set(1.8, 1, 0.6); sc.add(lake);
    sc.add(new THREE.Mesh(mountainsGeo(12, 170), toonMat('#ffffff', { vertexColors: true })));
    // tree ring
    const grp = instanced(treeGeo('pine', 0), 140, 0.05); let n = 0;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 140; i++) {
      const a = rand(Math.PI * 0.05, Math.PI * 0.95) + (Math.random() < 0.5 ? Math.PI : 0), r = rand(17, 34);
      let x = Math.cos(a) * r, z = -Math.sin(a) * r * 0.75 - 4; if (z > 9 && Math.abs(x) < 12) continue; if (z > -14 && Math.abs(x) < 9) continue;
      const scl = rand(0.8, 1.3); p.set(x, 0, z); e.set(0, rand(6), 0); q.setFromEuler(e); s.set(scl, scl, scl); m.compose(p, q, s); grp.userData.set(n++, m);
    }
    grp.userData.commit(n); sc.add(grp);
    // buildings
    const add = (node, x, z, ry = 0, id = null, r = 3) => { node.position.set(x, 0, z); node.rotation.y = ry; sc.add(node); if (id) { node.traverse((o) => { o.userData.spot = id; }); this.spots.push({ id, node, x, z, r }); } return node; };
    this.spots = [];
    add(makeCabin({ chimney: true, lit: true }), -3.4, -8.5, 0.3, 'cookhouse', 3.2);
    add(makeForge(), 4.4, -10.5, -0.25, 'forge', 2.8);
    add(makeSign(), -3.8, -2.4, 0.3, 'sign', 2);
    { const bn = makeBarn(); bn.scale.setScalar(0.85); add(bn, 3.6, -2.2, -0.55, 'barn', 3.2); }
    this.fire = add(makeCampfire(), 0, 3, 0, 'fire', 2.6);
    for (const a of [0, 1]) { const g = outlined(stumpGeo('oak'), 0.03); g.position.set(a ? 2.2 : -2.2, 0, 3.6); g.scale.setScalar(1.2); sc.add(g); }
    add(makeFence(4), 5.2, 1.2, 0.9); add(makeFence(5), -7.2, -6, -1.2);
    add(makeWoodpile(), -6.4, 0.5, 0.3); add(makeWoodpile(), 6.8, 2.2, 1.2);
    for (const [x, z, s2] of [[-6.5, 4.5, 1], [7, 6, 0.9], [-7.5, -11, 1.2], [8, -12, 1.1], [0, -13, 0.9], [6.5, 7.5, 0.7]]) add(makeBush(s2), x, z);
    const st = outlined(stumpGeo('pine'), 0.03); st.position.set(6.5, 0, 4.5); sc.add(st);
    // Paul & Babe
    this.paul = add(makePaul(), -2.4, 5.4, 0.9); this.paul.scale.setScalar(0.6); this.paul.userData.arms.rotation.x = -2.1;
    sc.add(blobShadow(1, 0.22)).position.set(-2.4, 0.02, 5.4);
    this.babe = add(makeBabe(), 2.4, 1.6, -2.5); this.babe.scale.setScalar(0.7);
    sc.add(blobShadow(1.5, 0.22)).position.set(2.4, 0.02, 1.6);
    this.built = true; this.resize();
  }
  syncCrew() {
    let i = 0;
    for (const c of CREW) {
      if (c.id === 'babe') continue;
      const want = !!S.crew[c.id];
      if (want && !this.crewNodes[c.id]) {
        // fixed spots around the fire that stay clear of Paul (-2.4, 5.4) and Babe (2.4, 1.6)
        const spots = [[-3.4, 2.4], [-1.2, 0.6], [1.0, 0.2], [3.4, 4.8], [0.6, 6.4], [2.6, 6.8], [-1.0, 7.6], [-4.4, 4.4]];
        const [sx, sz] = spots[i % spots.length];
        const node = makeCrew(c.id); node.position.set(sx, 0, sz); node.lookAt(0, 0, 3); node.scale.setScalar(0.85); node.userData.crewId = c.id;
        this.scene.add(node); this.crewNodes[c.id] = node;
      }
      if (want) i++;
    }
  }
  spotScreen() { return this.spots.map((s) => { const p = project(this.camera, s.x, 1.5, s.z); return { id: s.id, x: p.x, y: p.y }; }); }
  refreshButtons() {
    setBottom([
      { label: '🪓 Go Logging', cls: 'green', onClick: () => this.g.go('forest') },
      { label: `🐂 Deliver <span class="dim">(${S.logs})</span>`, cls: 'gold' + (S.logs >= D.logCap() ? ' pulse' : ''), disabled: S.logs <= 0, onClick: () => this.g.go('trail') },
      { label: '⚙️', onClick: () => this.settings() },
    ]);
  }
  affordable(id) {
    if (id === 'forge') { const c = D.nextAxeCost(); return c !== null && S.money >= c; }
    if (id === 'cookhouse' || id === 'barn') return Object.entries(PERKS).some(([k, p]) => p.building === id && S.perks[k] < p.max && S.money >= p.cost(S.perks[k]));
    if (id === 'fire') return CREW.some((c) => !S.crew[c.id] && S.money >= c.cost);
    if (id === 'sign') return REGIONS.some((r) => !S.regions[r.id] && S.money >= r.cost);
    return false;
  }
  pointerDown(x, y) {
    if (y > this.g.H - 70) return;
    const nd = new THREE.Vector2((x / this.g.W) * 2 - 1, -(y / this.g.H) * 2 + 1);
    this.ray.setFromCamera(nd, this.camera);
    const hits = this.ray.intersectObjects(this.spots.map((s) => s.node), true);
    let id = hits.length ? hits[0].object.userData.spot : null;
    if (!id) { // fall back to closest label in screen space
      let bd = 1e9; for (const s of this.spots) { const p = project(this.camera, s.x, 1.5, s.z); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; id = s.id; } } if (bd > 70) return;
    }
    sfx.click();
    ({ forge: () => this.shopAxes(), cookhouse: () => this.shopPerks('cookhouse', '🥞 Cookhouse', 'Sourdough flapjacks make a stronger lumberjack.'), barn: () => this.shopPerks('barn', "🐂 Babe's Barn", 'Gear for the ox and the wagon.'), fire: () => this.shopCrew(), sign: () => this.shopRegions() })[id]();
  }

  // ---------- Shops ----------
  shopAxes() {
    const render = () => {
      let html = `<h2>🪓 Blacksmith</h2><p class="sub">${S.crew.ole ? 'Ole the Big Swede is at the forge: 25% off!' : 'Bigger axes, bigger chips. Buy them in order.'}</p>`;
      AXES.forEach((a, i) => {
        const owned = i <= S.axe, next = i === S.axe + 1, cost = Math.round(a.cost * D.axeCostMult());
        html += `<div class="card ${owned ? 'owned' : next ? '' : 'locked'}"><div class="em">${a.em}</div><div class="body"><div class="name">${a.name} <span class="lvl">${a.dmg} dmg</span></div><div class="desc">${a.desc}</div></div>` +
          (owned ? `<div class="lvl">${i === S.axe ? 'EQUIPPED' : 'owned'}</div>` : next ? `<button class="gold" data-buy="${i}" ${S.money < cost ? 'disabled' : ''}>${money(cost)}</button>` : `<div class="lvl">🔒</div>`) + `</div>`;
      });
      html += `<div class="row"><button class="small" data-close>Close</button></div>`;
      modal(html, (b) => {
        b.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        b.querySelectorAll('[data-buy]').forEach((btn) => btn.onclick = () => {
          const i = +btn.dataset.buy, cost = Math.round(AXES[i].cost * D.axeCostMult());
          if (!spend(cost)) { sfx.nope(); return; }
          S.axe = i; sfx.buy(); updateHUD(); toast(`${AXES[i].em} ${AXES[i].name} equipped!`); save(); render();
        });
      });
    };
    render();
  }
  shopPerks(building, title, sub) {
    const render = () => {
      let html = `<h2>${title}</h2><p class="sub">${sub}</p>`;
      for (const [k, p] of Object.entries(PERKS)) {
        if (p.building !== building) continue;
        const l = S.perks[k], maxed = l >= p.max, cost = maxed ? 0 : p.cost(l);
        let extra = '';
        if (k === 'wagon') extra = ` <span class="lvl">${WAGON_CAPS[l]} → ${WAGON_CAPS[Math.min(l + 1, WAGON_CAPS.length - 1)]} logs</span>`;
        html += `<div class="card ${maxed ? 'owned' : ''}"><div class="em">${p.em}</div><div class="body"><div class="name">${p.name} <span class="lvl">Lv ${l}/${p.max}</span></div><div class="desc">${p.desc}${extra}</div></div>` +
          (maxed ? `<div class="lvl">MAX</div>` : `<button class="gold" data-buy="${k}" ${S.money < cost ? 'disabled' : ''}>${money(cost)}</button>`) + `</div>`;
      }
      html += `<div class="row"><button class="small" data-close>Close</button></div>`;
      modal(html, (b) => {
        b.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        b.querySelectorAll('[data-buy]').forEach((btn) => btn.onclick = () => {
          const k = btn.dataset.buy, p = PERKS[k], cost = p.cost(S.perks[k]);
          if (!spend(cost)) { sfx.nope(); return; }
          S.perks[k]++; sfx.buy(); updateHUD(); toast(`${p.em} ${p.name} Lv ${S.perks[k]}!`); save(); render(); this.refreshButtons();
        });
      });
    };
    render();
  }
  shopCrew() {
    const render = () => {
      let html = `<h2>🔥 The Crew</h2><p class="sub">Legends of the north woods. Hire them and they'll pull their weight.</p>`;
      for (const c of CREW) {
        const owned = !!S.crew[c.id];
        html += `<div class="card ${owned ? 'owned' : ''}"><div class="em">${c.em}</div><div class="body"><div class="name">${c.name}</div><div class="desc">${c.desc}</div><div class="lvl">★ ${c.bonus}</div></div>` +
          (owned ? `<div class="lvl">IN CAMP</div>` : `<button class="gold" data-buy="${c.id}" ${S.money < c.cost ? 'disabled' : ''}>${money(c.cost)}</button>`) + `</div>`;
      }
      html += `<div class="row"><button class="small" data-close>Close</button></div>`;
      modal(html, (b) => {
        b.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        b.querySelectorAll('[data-buy]').forEach((btn) => btn.onclick = () => {
          const c = CREW.find((x) => x.id === btn.dataset.buy);
          if (!spend(c.cost)) { sfx.nope(); return; }
          S.crew[c.id] = true; sfx.fanfare(); updateHUD(); toast(`${c.em} ${c.name} joined the camp!`); save(); render(); this.syncCrew();
        });
      });
    };
    render();
  }
  shopRegions() {
    const render = () => {
      let html = `<h2>🪧 Timber Rights</h2><p class="sub">Buy rights to new forests. Bigger trees, more logs, longer trails.</p>`;
      for (const r of REGIONS) {
        const owned = !!S.regions[r.id], cur = S.region === r.id, t = r.trees[0];
        html += `<div class="card ${owned ? 'owned' : ''}"><div class="em">${r.em}</div><div class="body"><div class="name">${r.name}${cur ? ' <span class="lvl">· HERE</span>' : ''}</div><div class="desc">${r.desc}</div><div class="lvl">${t.kind} trees: ${t.hp} hp, ~${t.logs} logs · trail ${r.trailLen * 12}m</div></div>` +
          (owned ? (cur ? '' : `<button class="green" data-go="${r.id}">Go</button>`) : `<button class="gold" data-buy="${r.id}" ${S.money < r.cost ? 'disabled' : ''}>${money(r.cost)}</button>`) + `</div>`;
      }
      html += `<div class="row"><button class="small" data-close>Close</button></div>`;
      modal(html, (b) => {
        b.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        b.querySelectorAll('[data-go]').forEach((btn) => btn.onclick = () => { S.region = btn.dataset.go; sfx.click(); save(); render(); });
        b.querySelectorAll('[data-buy]').forEach((btn) => btn.onclick = () => {
          const r = REGIONS.find((x) => x.id === btn.dataset.buy);
          if (!spend(r.cost)) { sfx.nope(); return; }
          S.regions[r.id] = true; S.region = r.id; sfx.fanfare(); updateHUD(); toast(`${r.em} ${r.name} is open for logging!`); save(); render();
        });
      });
    };
    render();
  }
  settings() {
    const st = S.stats;
    const best = Object.entries(st.bestTime).map(([k, v]) => `${k}: ${v.toFixed(1)}s`).join(', ') || '—';
    modal(`<h2>⚙️ Camp Ledger</h2>
      <table style="width:100%;font-size:15px"><tr><td>Trees felled</td><td><b>${st.felled}</b></td></tr><tr><td>Deliveries</td><td><b>${st.deliveries}</b></td></tr><tr><td>Total earned</td><td><b>${money(st.earned)}</b></td></tr><tr><td>Best combo</td><td><b>${st.bestCombo}</b></td></tr><tr><td>Biggest hit</td><td><b>${st.maxDmg}</b></td></tr><tr><td>Best trail times</td><td><b>${best}</b></td></tr></table>
      <div class="row"><button class="small" data-mute>${isMuted() ? '🔇 Unmute' : '🔊 Mute'}</button><button class="small ghost" data-reset>Reset save</button><button class="small" data-close>Close</button></div>
      <p class="kbd">Keyboard: arrows/A-D steer, Space jump.</p>`, (b) => {
      b.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      b.querySelector('[data-mute]').onclick = () => { S.muted = !isMuted(); setMuted(S.muted); save(); closeModal(); this.settings(); };
      b.querySelector('[data-reset]').onclick = () => { if (confirm('Erase your camp and start over?')) { localStorage.removeItem('bigtimber.save.v1'); location.reload(); } };
    });
  }

  update(dt) {
    this.t += dt;
    const f = this.fire.userData;
    f.flames.children.forEach((fl, i) => { fl.scale.set(1 + Math.sin(this.t * 9 + i * 2) * 0.15, 1 + Math.sin(this.t * 7 + i) * 0.25, 1 + Math.cos(this.t * 8 + i) * 0.15); fl.rotation.y = this.t * (1 + i); });
    f.light.intensity = 18 + Math.sin(this.t * 11) * 4 + Math.sin(this.t * 23) * 2;
    this.babe.userData.head.rotation.y = Math.sin(this.t * 0.7) * 0.4; this.babe.userData.head.rotation.x = Math.sin(this.t * 1.3) * 0.1;
    this.paul.position.y = Math.sin(this.t * 2) * 0.03;
    let i = 0; for (const id in this.crewNodes) { this.crewNodes[id].position.y = Math.abs(Math.sin(this.t * 3 + i)) * 0.08; i++; }
  }
  render(renderer, ctx, W, H) {
    renderer.render(this.scene, this.camera);
    const names = { cookhouse: 'Cookhouse', forge: 'Blacksmith', barn: "Babe's Barn", sign: 'Timber Rights', fire: 'Crew' };
    for (const s of this.spots) {
      const p = project(this.camera, s.x, s.id === 'fire' ? 0 : s.id === 'sign' ? 2.6 : 3.6, s.z);
      text(ctx, names[s.id], p.x, p.y - 14, { size: 14, color: '#fff' });
      if (s.id === 'sign') text(ctx, `${this.signText.em} ${this.signText.name}`, p.x, p.y + 6, { size: 12, color: '#ffe8c0' });
      if (this.affordable(s.id)) { const by = p.y - 40 + Math.sin(this.t * 4) * 3; circle(ctx, p.x + 40, by, 11, '#ffd23f', INK, 2.5); text(ctx, '!', p.x + 40, by + 1, { size: 16, color: INK, stroke: false }); }
    }
    text(ctx, 'Tap a building to upgrade', W / 2, 46, { size: 14, color: '#fff' });
  }
}
