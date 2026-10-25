import { S, load, save, reset } from './state.js';
import { unlockAudio, sfx, setMuted } from './audio.js';
import { updateHUD, showHUD, setBottom, closeModal, isModalOpen, showTrailUI } from './ui.js';
import { initRenderer, resizeRenderer, R } from './r3d.js';
import { CampScene } from './scenes/camp.js';
import { ForestScene } from './scenes/forest.js';
import { TrailScene } from './scenes/trail.js';

const canvas = document.getElementById('c'), overlay = document.getElementById('o');
const gameEl = document.getElementById('game');
const renderer = initRenderer(canvas, overlay);

export const game = {
  W: 400, H: 700, scale: 1, aspect: 0.5, scene: null, scenes: {}, t: 0, renderer,
  go(name, arg) {
    if (this.scene && this.scene.exit) this.scene.exit();
    closeModal(); setBottom(null); showTrailUI(false);
    this.scene = this.scenes[name];
    this.scene.enter(arg);
    if (this.scene.resize) this.scene.resize();
    save();
  },
};
game.scenes = { camp: new CampScene(game), forest: new ForestScene(game), trail: new TrailScene(game) };

function resize() {
  const r = gameEl.getBoundingClientRect();
  game.scale = r.width / 400;
  game.W = 400; game.H = Math.max(560, r.height / game.scale); game.aspect = r.width / r.height;
  resizeRenderer(r.width, r.height, game.W, game.H, game.scale);
  if (game.scene && game.scene.resize) game.scene.resize();
}
window.addEventListener('resize', resize);
resize();

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / game.scale, y: (e.clientY - r.top) / game.scale, id: e.pointerId };
}
canvas.addEventListener('pointerdown', (e) => { unlockAudio(); if (isModalOpen()) return; canvas.setPointerCapture?.(e.pointerId); const p = toLogical(e); game.scene?.pointerDown?.(p.x, p.y, p.id); });
canvas.addEventListener('pointermove', (e) => { const p = toLogical(e); game.scene?.pointerMove?.(p.x, p.y, p.id); });
canvas.addEventListener('pointerup', (e) => { const p = toLogical(e); game.scene?.pointerUp?.(p.x, p.y, p.id); });
canvas.addEventListener('pointercancel', (e) => { const p = toLogical(e); game.scene?.pointerUp?.(p.x, p.y, p.id); });
window.addEventListener('keydown', (e) => { unlockAudio(); game.scene?.keyDown?.(e.key, e); });
window.addEventListener('keyup', (e) => { game.scene?.keyUp?.(e.key, e); });
document.addEventListener('contextmenu', (e) => e.preventDefault());

let last = performance.now(), acc = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  game.t += dt;
  if (game.scene) {
    game.scene.update(dt);
    R.octx.clearRect(0, 0, game.W, game.H);
    game.scene.render(renderer, R.octx, game.W, game.H);
  }
  acc += dt; if (acc > 0.25) { acc = 0; updateHUD(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

const title = document.getElementById('title');
const had = load();
setMuted(!!S.muted);
if (had) { document.getElementById('btn-reset').classList.remove('hidden'); document.getElementById('btn-start').textContent = '▶ Continue'; }
document.getElementById('btn-start').addEventListener('click', () => {
  unlockAudio(); sfx.click();
  title.classList.add('hidden'); showHUD(true); updateHUD();
  game.go('camp');
});
document.getElementById('btn-reset').addEventListener('click', () => { if (confirm('Erase your camp and start over?')) reset(); });
// Show the camp behind the title screen
game.go('camp');
window.__game = game; window.__S = S;
