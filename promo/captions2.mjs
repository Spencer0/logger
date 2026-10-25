import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
const caps = {
  s1: ['I went to the', 'Trees of Mystery 🌲'],
  s2: ['and fell in love with', 'the Paul Bunyan lore 🪓'],
  s3: ['so I spent weeks', 'painstakingly making', 'a game about it'],
  s4: ['you chop trees as Paul 🪓'],
  s5: ['glowing knots = crits', 'rhythm = combos'],
  s6: ['ride Babe the Blue Ox', 'to the sawmill 🐂💨'],
  s7: ['drift. jump.', "don’t spill the logs"],
  s8: ['sell lumber. build the camp.', 'hire the whole crew 🔥'],
  s9: ['yes, including', 'Sport the Reversible Dog 🐕'],
  s10: ['FREE in your browser', 'link in comments 👇'],
  s11: ['go fell some trees 🌲🪓'],
};
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1080, height: 600 }, deviceScaleFactor: 1 });
for (const [k, lines] of Object.entries(caps)) {
  await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap" rel="stylesheet"><style>
    body{margin:0;background:transparent;display:flex;align-items:center;justify-content:center;height:600px;font-family:'Fredoka','Noto Color Emoji',sans-serif;}
    .box{text-align:center;padding:10px 30px;}
    .l{display:inline-block;margin:7px 0;padding:10px 28px;border-radius:22px;background:#fff;color:#1a120c;font-weight:700;font-size:${lines.join('').length > 40 ? 54 : 62}px;line-height:1.05;box-shadow:0 8px 0 rgba(0,0,0,.4);}
    .l.hi{background:#f2b134;}
  </style></head><body><div class="box">${lines.map((t, i) => `<div><span class="l ${i === lines.length - 1 && lines.length > 1 ? 'hi' : ''}">${t}</span></div>`).join('')}</div></body></html>`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `cap_${k}.png`, omitBackground: true });
}
await b.close(); console.log('captions ok');
