// Graphics helpers: cartoon outlines, text, sprite caching, math.
export const INK = '#2b1d14';
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeIn = (t) => t * t;
export const TAU = Math.PI * 2;

// Deterministic pseudo-random for stable scenery
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillStroke(ctx, fill, stroke = INK, lw = 3) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function circle(ctx, x, y, r, fill, stroke = INK, lw = 3) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke(ctx, fill, stroke, lw);
}

export function ellipse(ctx, x, y, rx, ry, fill, stroke = INK, lw = 3, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); fillStroke(ctx, fill, stroke, lw);
}

export function poly(ctx, pts, fill, stroke = INK, lw = 3) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); fillStroke(ctx, fill, stroke, lw);
}

export const FONT = "'Fredoka', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";
export function text(ctx, str, x, y, o = {}) {
  const size = o.size || 16, weight = o.weight || 700;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  if (o.stroke !== false) {
    ctx.lineWidth = o.lw || Math.max(2, size / 6); ctx.strokeStyle = o.stroke || INK; ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(str, x, y);
}

// Cache a drawing into an offscreen canvas at device resolution.
const cache = new Map();
export let DPR = Math.min(window.devicePixelRatio || 1, 2.5);
export function setDPR(d) { DPR = d; cache.clear(); }
export function sprite(key, w, h, draw) {
  let s = cache.get(key);
  if (s) return s;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, w, h);
  s = { c, w, h };
  cache.set(key, s);
  return s;
}
export function drawSprite(ctx, s, x, y, w = s.w, h = s.h) {
  ctx.drawImage(s.c, x, y, w, h);
}

export function shade(hex, amt) {
  // lighten (amt>0) or darken (amt<0) a hex color
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => clamp(Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Simple particle system
export class Particles {
  constructor() { this.p = []; }
  emit(n, fn) { for (let i = 0; i < n; i++) this.p.push(fn(i)); }
  update(dt) {
    const p = this.p;
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      q.life -= dt; if (q.life <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; }
      q.vy += (q.g ?? 900) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot = (q.rot || 0) + (q.vr || 0) * dt;
    }
  }
  draw(ctx) {
    for (const q of this.p) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot || 0);
      const a = Math.min(1, q.life / 0.3); ctx.globalAlpha = a;
      if (q.text) { text(ctx, q.text, 0, 0, { size: q.size || 18, color: q.color || '#fff' }); }
      else { ctx.fillStyle = q.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        rr(ctx, -q.w / 2, -q.h / 2, q.w, q.h, 2); ctx.fill(); if (q.outline) ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
