// Playwright smoke test: boots the game, plays the chop loop, rides the trail, buys an upgrade.
// Usage: node serve.js 8080 &  then  node test/smoke.js
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8080/';
const shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('  ok -', m); };

(async () => {
  const browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForSelector('#btn-start');
  await page.screenshot({ path: path.join(shots, '01-title.png') });
  await page.click('#btn-start');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(shots, '02-camp.png') });
  console.log('  camp draw calls/tris:', await page.evaluate(() => { const i = window.__game.renderer.info.render; return `${i.calls} / ${i.triangles}`; }));
  assert(await page.evaluate(() => window.__game.scene === window.__game.scenes.camp), 'camp scene active');

  // Open each shop
  const spots = await page.evaluate(() => window.__game.scenes.camp.spotScreen());
  const sc = await page.evaluate(() => window.__game.scale);
  for (const s of spots) {
    await page.mouse.click(s.x * sc, s.y * sc);
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => !document.getElementById('modal').classList.contains('hidden')), `shop opens: ${s.id}`);
    await page.screenshot({ path: path.join(shots, `03-shop-${s.id}.png`) });
    await page.click('#modal [data-close]');
  }

  // Go logging
  await page.click('#bottom button:nth-child(1)');
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.__game.scene === window.__game.scenes.forest), 'forest scene active');
  await page.screenshot({ path: path.join(shots, '04-forest.png') });
  const info = async (n) => console.log(`  ${n} draw calls/tris:`, await page.evaluate(() => { const i = window.__game.renderer.info.render; return `${i.calls} / ${i.triangles}`; }));
  await info('forest');
  // chop the middle tree repeatedly
  for (let i = 0; i < 45; i++) {
    const tr = await page.evaluate(() => window.__game.scenes.forest.treeScreen());
    await page.mouse.click(tr.x * sc, tr.y * sc);
    if (i === 4) await page.screenshot({ path: path.join(shots, '05-forest-chop.png') });
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(1500);
  const logs = await page.evaluate(() => window.__S.logs);
  assert(logs > 0, `felled trees and collected logs (${logs})`);
  const felled = await page.evaluate(() => window.__S.stats.felled);
  assert(felled > 0, `felled stat = ${felled}`);
  await page.screenshot({ path: path.join(shots, '06-forest-after.png') });

  // Deliver
  await page.click('#btn-deliver', { force: true });
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.__game.scene === window.__game.scenes.trail), 'trail scene active');
  await page.screenshot({ path: path.join(shots, '07-trail-start.png') });
  await info('trail');
  // drive: simple AI reads the track ahead — dodge boulders, jump logs/piles, stay centred
  const t0 = Date.now(); let shot = false, jumpShot = false, held = null;
  while (Date.now() - t0 < 150000) {
    const st = await page.evaluate(() => {
      const t = window.__game.scenes.trail; const i = Math.floor(t.pos / 2); let ahead = null;
      for (let k = 1; k < 9 && i + k < t.segs.length; k++) for (const o of t.segs[i + k].sprites) if (!o.done && Math.abs(o.off - t.playerX) < 0.75) { ahead = { type: o.type, off: o.off, dist: k }; k = 99; break; }
      return { fin: t.finished, pos: t.pos, len: t.trackLen, px: t.playerX, started: t.started, ahead, jumping: t.jump >= 0 };
    });
    if (st.fin) break;
    let want = st.px > 0.25 ? 'ArrowLeft' : st.px < -0.25 ? 'ArrowRight' : null;
    if (st.ahead && st.ahead.type === 'boulder' && st.ahead.dist < 7) want = st.ahead.off >= st.px ? 'ArrowLeft' : 'ArrowRight';
    if (want !== held) { if (held) await page.keyboard.up(held); if (want) await page.keyboard.down(want); held = want; }
    if (st.ahead && (st.ahead.type === 'log' || st.ahead.type === 'pile') && st.ahead.dist <= 3 && !st.jumping) { await page.keyboard.press(' '); if (!jumpShot) { jumpShot = true; await page.waitForTimeout(250); await page.screenshot({ path: path.join(shots, '08-trail-jump.png') }); } }
    if (!shot && st.pos > st.len * 0.4) { shot = true; await page.screenshot({ path: path.join(shots, '09-trail-mid.png') }); }
    await page.waitForTimeout(60);
  }
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight');
  assert(await page.evaluate(() => window.__game.scenes.trail.finished), 'reached the sawmill');
  await page.waitForSelector('#modal:not(.hidden)', { timeout: 8000 });
  assert(true, 'results modal shown');
  await page.screenshot({ path: path.join(shots, '10-results.png') });
  const money = await page.evaluate(() => window.__S.money);
  const crashes = await page.evaluate(() => window.__game.scenes.trail.crashes);
  console.log(`  ride: $${money}, crashes ${crashes}`);
  assert(money > 0, `earned money ($${money})`);
  assert(await page.evaluate(() => window.__S.logs === 0), 'logs sold');
  await page.click('#modal [data-camp]');
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => window.__game.scene === window.__game.scenes.camp), 'back at camp');

  // Buy iron hatchet if affordable
  await page.evaluate(() => { window.__S.money += 100; });
  const forge = spots.find((s) => s.id === 'forge');
  await page.mouse.click(forge.x * sc, forge.y * sc);
  await page.waitForTimeout(200);
  await page.click('#modal [data-buy="1"]');
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.__S.axe === 1), 'bought Iron Hatchet');
  await page.screenshot({ path: path.join(shots, '11-shop-bought.png') });
  await page.click('#modal [data-close]');

  // Save/reload persistence
  await page.reload(); await page.waitForSelector('#btn-start');
  assert((await page.textContent('#btn-start')).includes('Continue'), 'save persisted (Continue shown)');
  assert(await page.evaluate(() => window.__S.axe === 1), 'axe level persisted');

  // Performance sample: frame time in forest
  await page.click('#btn-start'); await page.waitForTimeout(300);
  await page.click('#bottom button:nth-child(1)'); await page.waitForTimeout(300);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  console.log(`  forest fps ≈ ${fps.toFixed(0)}`);
  await page.screenshot({ path: path.join(shots, '12-forest-iron.png') });

  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log('   ', e)); }
  assert(errors.length === 0, 'no page errors');
  await browser.close();
  console.log('ALL PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
