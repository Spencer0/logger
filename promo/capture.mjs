import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
import fs from 'fs';
const URL = 'http://localhost:8080/';
const b = await chromium.launch();
const TUT = { forest1: 1, combo: 1, knot: 1, full: 1, felled1: 1, trail1: 1, drift: 1, crash: 1, camp1: 1 };
const ONLY = process.argv.slice(2);
async function clip(name, fn, size = [450, 800], seed = true) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: 'raw', size: { width: size[0], height: size[1] } } });
  if (seed) await ctx.addInitScript((t) => { try { localStorage.setItem('bigtimber.save.v1', JSON.stringify({ tut: t, muted: true })); } catch (e) {} }, TUT);
  await ctx.addInitScript(() => { let vt = 0; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf(() => { vt += 1000 / 30; cb(vt); }); performance.now = () => vt; });
  const page = await ctx.newPage(); const tPage = Date.now(); page.sc = size[0] / 400;
  await page.goto(URL, { waitUntil: 'networkidle' });
  page.mark = async (label) => { const gt = await page.evaluate(() => window.__game.t); (META[name] = META[name] || {})[label] = { real: (Date.now() - tPage) / 1000, game: gt }; };
  await page.evaluate((t) => { Object.assign(window.__S.tut, t); window.__S.muted = true; }, TUT);
  const t0 = Date.now();
  try { await fn(page); } catch (e) { console.log(name, 'error', e.message); }
  await page.mark('end'); const v = page.video(); await ctx.close(); const p = await v.path(); fs.renameSync(p, `raw/${name}.webm`);
  console.log(name, 'done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
const start = async (page) => { await page.click('#btn-start'); await page.waitForTimeout(300); };
const META = {};
if (!ONLY.length) { const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, isMobile: true }); const page = await ctx.newPage(); await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500); fs.mkdirSync('raw', { recursive: true }); await page.screenshot({ path: 'raw/title.png' }); await ctx.close(); console.log('title still'); }
// Camp: buy Babe's Blue Axe at the forge
await clip('camp', async (page) => {
  await page.evaluate(() => { const S = window.__S; for (const id of ['inkslinger', 'sam', 'ole', 'slim', 'sport']) S.crew[id] = true; S.money = 9400; S.axe = 5; });
  await start(page); await page.evaluate(() => window.__game.scenes.camp.syncCrew()); await page.waitForTimeout(400); await page.mark('start'); await page.waitForTimeout(2000);
  const f = await page.evaluate(() => window.__game.scenes.camp.spotScreen().find((s) => s.id === 'forge'));
  await page.mouse.click(f.x * page.sc, f.y * page.sc); await page.waitForTimeout(1600);
  await page.evaluate(() => { const b = document.querySelector('#modal [data-buy="6"]'); b.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(900);
  await page.click('#modal [data-buy="6"]'); await page.waitForTimeout(1800);
  await page.click('#modal [data-close]'); await page.waitForTimeout(16000);
});
// Forest: Thunder Axe in Redwood Ridge, spam all three trees, hit knots
await clip('forest', async (page) => {
  await page.evaluate(() => { const S = window.__S; S.axe = 7; S.perks.strength = 3; S.perks.rhythm = 3; S.perks.wagon = 8; S.regions.redwood = true; S.region = 'redwood'; S.money = 48210; S.crew.slim = true; S.crew.elmer = true; });
  await start(page); await page.evaluate(() => window.__game.go('forest')); await page.waitForTimeout(600); await page.mark('start');
  let n = 0; const t0 = Date.now();
  while (Date.now() - t0 < 16000) {
    const ts = await page.evaluate(() => window.__game.scenes.forest.tapTargets());
    if (ts.length) { const k = ts.find((t) => t.knot); const t = k || ts[n++ % ts.length]; const p = k ? k.knot : t; await page.mouse.click(p.x * page.sc, p.y * page.sc); }
    await page.waitForTimeout(130);
  }
  await page.waitForTimeout(1200);
});
// Trail: Oak Hollow, fast ox, drift every curve
await clip('trail', async (page) => {
  await page.evaluate(() => { const S = window.__S; S.perks.wagon = 4; S.perks.hooves = 4; S.perks.harness = 3; S.perks.boost = 3; S.logs = 50; S.money = 2200; S.regions.oak = true; S.region = 'oak'; S.crew.lucy = true; S.crew.sport = true; });
  await start(page); await page.evaluate(() => window.__game.go('trail')); await page.waitForTimeout(300); await page.mark('start');
  let held = null; const t0 = Date.now();
  while (Date.now() - t0 < 105000) {
    const st = await page.evaluate(() => { const t = window.__game.scenes.trail; const i = Math.floor(t.pos / 2); let ahead = null; for (let k = 1; k < 9 && i + k < t.segs.length; k++) for (const o of t.segs[i + k].sprites) if (!o.done && Math.abs(o.off - t.playerX) < 0.75) { ahead = { type: o.type, off: o.off, dist: k }; k = 99; break; } return { fin: t.finished, px: t.playerX, ahead, jumping: t.jump >= 0, curve: t.segAt(t.pos).curve, next: t.segs[Math.min(i + 6, t.segs.length - 1)].curve }; });
    if (st.fin) break;
    let want = st.px > 0.3 ? 'ArrowLeft' : st.px < -0.3 ? 'ArrowRight' : null;
    // drift: steer hard through curves (toward the inside), release when the curve ends
    if (Math.abs(st.curve) > 1.6 && Math.abs(st.px) < 0.9) want = st.curve > 0 ? 'ArrowRight' : 'ArrowLeft';
    if (Math.abs(st.px) > 1.0) want = st.px > 0 ? 'ArrowLeft' : 'ArrowRight';
    if (st.ahead && st.ahead.type === 'boulder' && st.ahead.dist < 7) want = st.ahead.off >= st.px ? 'ArrowLeft' : 'ArrowRight';
    if (want !== held) { if (held) await page.keyboard.up(held); if (want) await page.keyboard.down(want); held = want; }
    if (st.ahead && (st.ahead.type === 'log' || st.ahead.type === 'pile') && st.ahead.dist <= 3 && !st.jumping) await page.keyboard.press(' ');
    await page.waitForTimeout(50);
  }
  if (held) await page.keyboard.up(held);
  await page.waitForTimeout(2500);
});
const prev = fs.existsSync('raw/meta.json') ? JSON.parse(fs.readFileSync('raw/meta.json')) : {}; fs.writeFileSync('raw/meta.json', JSON.stringify(Object.assign(prev, META), null, 1)); await b.close(); console.log('capture done', JSON.stringify(META));
