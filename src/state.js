// Game state, economy, upgrade & crew definitions, save/load.
const SAVE_KEY = 'bigtimber.save.v1';

export const AXES = [
  { name: 'Stone Hatchet', dmg: 1, cost: 0, em: '🪨', desc: 'A rock on a stick. It works. Barely.' },
  { name: 'Iron Hatchet', dmg: 2, cost: 40, em: '🪓', desc: 'Real iron. Twice the bite.' },
  { name: 'Steel Axe', dmg: 4, cost: 160, em: '🪓', desc: 'Holds an edge all day.' },
  { name: 'Double-Bit Axe', dmg: 7, cost: 500, em: '⚒️', desc: 'Two edges, half the sharpening.' },
  { name: 'Felling Axe', dmg: 12, cost: 1400, em: '🪓', desc: 'Long handle, long swing, big chips.' },
  { name: 'Broadaxe', dmg: 20, cost: 3600, em: '⚔️', desc: 'A blade as wide as a barn door.' },
  { name: "Babe's Blue Axe", dmg: 34, cost: 9000, em: '💙', desc: 'Forged from blue snow. Hums when swung.' },
  { name: 'Thunder Axe', dmg: 55, cost: 22000, em: '⚡', desc: 'Every swing is a thunderclap.' },
  { name: 'Mountain Splitter', dmg: 90, cost: 60000, em: '🏔️', desc: 'Paul once made the Grand Canyon with this.' },
];

// Multi-level perks. cost(level) in dollars, effect per level.
export const PERKS = {
  strength: { name: 'Flapjack Strength', em: '🥞', desc: '+25% chop damage per level', max: 10, cost: (l) => Math.round(60 * Math.pow(2.1, l)), building: 'cookhouse' },
  keeneye:  { name: 'Keen Eye', em: '👁️', desc: 'Knot hits deal +50% more per level', max: 6, cost: (l) => Math.round(120 * Math.pow(2.2, l)), building: 'cookhouse' },
  rhythm:   { name: 'Swing Rhythm', em: '🥁', desc: 'Combo bonus +10% per hit, per level', max: 6, cost: (l) => Math.round(100 * Math.pow(2.2, l)), building: 'cookhouse' },
  wagon:    { name: 'Bigger Wagon', em: '🛒', desc: 'Carry more logs per trip', max: 8, cost: (l) => Math.round(50 * Math.pow(2.3, l)), building: 'barn' },
  hooves:   { name: 'Iron Hooves', em: '🐾', desc: 'Babe runs faster', max: 6, cost: (l) => Math.round(80 * Math.pow(2.2, l)), building: 'barn' },
  harness:  { name: 'Soft Harness', em: '🎀', desc: 'Sharper steering & stronger drifts', max: 5, cost: (l) => Math.round(90 * Math.pow(2.2, l)), building: 'barn' },
  straps:   { name: 'Cargo Straps', em: '🪢', desc: 'Lose fewer logs when you crash', max: 5, cost: (l) => Math.round(70 * Math.pow(2.2, l)), building: 'barn' },
  boost:    { name: 'Oat Boost', em: '🌾', desc: 'Longer, stronger drift boosts', max: 5, cost: (l) => Math.round(110 * Math.pow(2.2, l)), building: 'barn' },
};
export const WAGON_CAPS = [10, 16, 24, 36, 50, 70, 100, 140, 200];

export const CREW = [
  { id: 'babe', name: 'Babe the Blue Ox', em: '🐂', cost: 0, desc: 'Your best friend. Seven axe-handles wide between the eyes. Hauls the logs.', bonus: 'Rides to the mill' },
  { id: 'inkslinger', name: 'Johnny Inkslinger', em: '🖋️', cost: 350, desc: 'The bookkeeper. Saves ink by skipping the dots on his i’s.', bonus: '+25% log sale price' },
  { id: 'sam', name: 'Sourdough Sam', em: '🥞', cost: 600, desc: 'Cook. Flips flapjacks on a griddle greased by men on bacon skates.', bonus: 'Combo lasts twice as long' },
  { id: 'ole', name: 'Ole the Big Swede', em: '🔨', cost: 900, desc: 'The blacksmith. Once shod Babe with iron so heavy it sank the forge.', bonus: 'Axes 25% cheaper' },
  { id: 'slim', name: 'Hot Biscuit Slim', em: '🍪', cost: 1500, desc: 'Second cook. His biscuits give you a lucky swing.', bonus: '15% chance of a 3x CRACK! hit' },
  { id: 'sport', name: 'Sport the Reversible Dog', em: '🐕', cost: 2400, desc: 'Sewn back together wrong. Runs on two legs, then flips to the other two.', bonus: 'More bonus logs on the trail' },
  { id: 'lucy', name: 'Lucy the Purple Cow', em: '🐄', cost: 4000, desc: 'Eats evergreens. Gives milk that tastes like pine.', bonus: 'First crash each ride loses nothing' },
  { id: 'shot', name: 'Shot Gunderson', em: '📣', cost: 7000, desc: 'Foreman. Shouts so loud the trees fall before the saw.', bonus: '+50% logs per felled tree' },
  { id: 'elmer', name: 'Elmer the Moose Hound', em: '🫎', cost: 12000, desc: 'Sniffs out the knots in any trunk.', bonus: 'Knots show up twice as often' },
];

export const REGIONS = [
  { id: 'pine', name: 'Pine Grove', cost: 0, em: '🌲', sky: ['#7fc8ff', '#d8f0ff'], ground: '#4f9a3c', ground2: '#3f7f30', road: '#8d6a44', fog: '#bfe3c8',
    trees: [ { kind: 'pine', hp: 10, logs: 2, w: 1 }, { kind: 'birch', hp: 16, logs: 3, w: 0.5 } ], trailLen: 110, obst: 0.55, desc: 'Soft pines. A good place to learn the swing.' },
  { id: 'oak', name: 'Oak Hollow', cost: 1200, em: '🍂', sky: ['#ffb36b', '#ffe0b0'], ground: '#b7852f', ground2: '#9a6c23', road: '#7a5633', fog: '#f5d6a0',
    trees: [ { kind: 'oak', hp: 45, logs: 6, w: 1 }, { kind: 'birch', hp: 20, logs: 3, w: 0.4 }, { kind: 'maple', hp: 60, logs: 8, w: 0.5 } ], trailLen: 150, obst: 0.8, desc: 'Hardwood. Slow to fell, worth the sweat.' },
  { id: 'redwood', name: 'Redwood Ridge', cost: 9000, em: '🌁', sky: ['#9fb4c8', '#e2ecf3'], ground: '#5b7a3f', ground2: '#48612f', road: '#6b4a3a', fog: '#d7e3ea',
    trees: [ { kind: 'redwood', hp: 180, logs: 22, w: 1 }, { kind: 'pine', hp: 40, logs: 6, w: 0.5 } ], trailLen: 200, obst: 1.05, desc: 'Giants in the fog. Bring a big axe.' },
  { id: 'sequoia', name: 'Sequoia Summit', cost: 45000, em: '🏔️', sky: ['#5b6fb0', '#cfd8ff'], ground: '#e8eef5', ground2: '#c7d2de', road: '#8a7a6b', fog: '#f0f4ff',
    trees: [ { kind: 'sequoia', hp: 700, logs: 80, w: 1 }, { kind: 'redwood', hp: 220, logs: 25, w: 0.5 } ], trailLen: 260, obst: 1.3, desc: 'Snow, wind, and trees older than the mountains.' },
];

export const LOG_PRICE = 5;

export const S = {
  money: 0, logs: 0, axe: 0, perks: {}, crew: { babe: true }, regions: { pine: true }, region: 'pine',
  stats: { felled: 0, deliveries: 0, bestTime: {}, earned: 0, bestCombo: 0, maxDmg: 0 },
  tut: {}, muted: false,
};
for (const k in PERKS) S.perks[k] = 0;

export function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    Object.assign(S, o);
    S.perks = Object.assign({}, Object.fromEntries(Object.keys(PERKS).map((k) => [k, 0])), o.perks || {});
    S.stats = Object.assign({ felled: 0, deliveries: 0, bestTime: {}, earned: 0, bestCombo: 0, maxDmg: 0 }, o.stats || {});
    S.crew = Object.assign({ babe: true }, o.crew || {});
    S.regions = Object.assign({ pine: true }, o.regions || {});
    S.tut = o.tut || {};
    return true;
  } catch (e) { return false; }
}
export function reset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  location.reload();
}
export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

// Derived values
export const D = {
  logCap: () => WAGON_CAPS[S.perks.wagon] || WAGON_CAPS[WAGON_CAPS.length - 1],
  axe: () => AXES[S.axe],
  chopDamage: () => AXES[S.axe].dmg * (1 + 0.25 * S.perks.strength),
  knotMult: () => 3 + 1.5 * S.perks.keeneye,
  comboStep: () => 0.1 + 0.1 * S.perks.rhythm, // extra mult per combo hit
  comboMaxHits: () => 10,
  comboWindow: () => (S.crew.sam ? 1.6 : 0.8),
  critChance: () => (S.crew.slim ? 0.15 : 0),
  logYieldMult: () => (S.crew.shot ? 1.5 : 1),
  knotRate: () => (S.crew.elmer ? 2 : 1),
  priceMult: () => (S.crew.inkslinger ? 1.25 : 1),
  axeCostMult: () => (S.crew.ole ? 0.75 : 1),
  oxTopSpeed: () => 1 + 0.12 * S.perks.hooves,
  oxHandling: () => 1 + 0.18 * S.perks.harness,
  crashLoss: () => 0.2 * Math.pow(0.75, S.perks.straps),
  boostPower: () => 1 + 0.25 * S.perks.boost,
  region: () => REGIONS.find((r) => r.id === S.region) || REGIONS[0],
  nextAxeCost: () => (S.axe + 1 < AXES.length ? Math.round(AXES[S.axe + 1].cost * D.axeCostMult()) : null),
};

export function addMoney(n) { S.money += n; if (n > 0) S.stats.earned += n; }
export function spend(n) { if (S.money < n) return false; S.money -= n; save(); return true; }
