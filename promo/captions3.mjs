import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
import fs from 'fs';
const chunks = JSON.parse(fs.readFileSync('vo/chunks.json'));
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1080, height: 400 }, deviceScaleFactor: 1 });
for (const c of chunks) {
  const t = c.text.replace(/</g, '&lt;');
  await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap" rel="stylesheet"><style>
    body{margin:0;background:transparent;display:flex;align-items:center;justify-content:center;height:400px;font-family:'Fredoka','Noto Color Emoji',sans-serif;}
    .l{display:inline-block;max-width:900px;text-align:center;padding:14px 34px;border-radius:26px;background:#fff;color:#1a120c;font-weight:700;font-size:64px;line-height:1.08;box-shadow:0 9px 0 rgba(0,0,0,.4);}
  </style></head><body><span class="l">${t}</span></body></html>`);
  await page.waitForTimeout(c.id === 'w00' ? 900 : 60);
  await page.screenshot({ path: `capw_${c.id}.png`, omitBackground: true });
}
await b.close(); console.log('word captions ok', chunks.length);
