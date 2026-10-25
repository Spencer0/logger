// DOM overlay helpers: HUD, toasts, modals, bottom buttons.
import { S, D, save } from './state.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
let lastMoney = null, lastLogs = null;

export function updateHUD() {
  const m = $('money'), l = $('logs'), c = $('logcap');
  if (m.textContent !== String(Math.floor(S.money))) { m.textContent = Math.floor(S.money).toLocaleString(); if (lastMoney !== null) bump($('hud-money')); }
  if (l.textContent !== String(S.logs)) { l.textContent = S.logs; if (lastLogs !== null) bump($('hud-logs')); }
  c.textContent = D.logCap();
  lastMoney = S.money; lastLogs = S.logs;
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
export function showHUD(v) { $('hud').classList.toggle('hidden', !v); }

export function toast(msg, o = {}) {
  const box = $('toast');
  const el = document.createElement('div'); el.className = 'toast' + (o.tip ? ' tip' : ''); el.innerHTML = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, o.ms || 2600);
}
// One-time tutorial tip
export function tip(key, msg, ms = 4200) {
  if (S.tut[key]) return false;
  S.tut[key] = true; save();
  toast('💡 ' + msg, { tip: true, ms });
  return true;
}

export function modal(html, onMount) {
  const m = $('modal'), b = $('modal-box');
  b.innerHTML = html; m.classList.remove('hidden');
  b.scrollTop = 0;
  if (onMount) onMount(b);
  return b;
}
export function closeModal() { $('modal').classList.add('hidden'); $('modal-box').innerHTML = ''; }
export function isModalOpen() { return !$('modal').classList.contains('hidden'); }

export function setBottom(buttons) {
  const b = $('bottom'); b.innerHTML = '';
  if (!buttons || !buttons.length) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  for (const def of buttons) {
    const btn = document.createElement('button');
    btn.innerHTML = def.label; btn.className = def.cls || ''; if (def.id) btn.id = def.id;
    if (def.disabled) btn.disabled = true;
    btn.addEventListener('click', (e) => { e.stopPropagation(); sfx.click(); def.onClick(btn); });
    b.appendChild(btn);
  }
}
export function showTrailUI(v) { $('trail-ui').classList.toggle('hidden', !v); }
export const money = (n) => '$' + Math.round(n).toLocaleString();
