# Big Timber — a Paul Bunyan logging game

A mobile-first browser game in stylized low-poly 3D. Chop trees as Paul Bunyan, ride Babe the Blue Ox
through the forest to deliver your logs to the sawmill, and spend the money building up the logging camp.

## Run it

```bash
npm start          # serves on http://localhost:8080
```

Any static file server works (`python3 -m http.server 8080` too). It must be served over http(s): the game
uses ES modules. Open it on a phone on the same network, or use the browser's mobile device mode.

## Test it

```bash
npm start &        # in one terminal
npm test           # Playwright smoke test: plays both loops end to end and saves screenshots to test/shots/
```

The test boots the game, opens every shop, chops trees until the wagon fills, drives the trail with a small
"AI" (dodges boulders, jumps logs), sells at the mill, buys an axe, reloads to check the save, and reports
draw calls per scene.

## How it plays

**Chopping (Pine Grove → Oak Hollow → Redwood Ridge → Sequoia Summit)**
- Tap a tree to swing. Trees start at many taps; as axes and strength grow you one-tap pines and move on to
  giants that take hundreds of damage.
- Rhythm combo: taps within the combo window stack a damage multiplier (up to 10 hits).
- Knots: a glowing weak spot appears on the trunk; hitting it deals 3x (more with Keen Eye).
- Felled trees drop logs into the wagon. A full wagon means it's time to deliver.

**Ox trail (Babe)**
- Left half of the screen: drag to steer. Right button: jump (and swing the axe in Babe's mouth).
- Boulders must be dodged, fallen logs must be jumped, log piles give bonus logs if you jump-and-swing
  through them, pancakes are cash.
- Drift: hold a hard steer through a curve to charge a drift, release for a boost. Boost pads on the road too.
- Crashes spill logs. Reach the mill fast for a freshness bonus (1–3 stars).

**Camp**
- Blacksmith: 9 axes. Cookhouse: strength, keen eye, rhythm. Barn: wagon size, speed, handling, straps, boost.
- Crew: Babe, Johnny Inkslinger, Sourdough Sam, Ole the Big Swede, Hot Biscuit Slim, Sport the Reversible
  Dog, Lucy the Purple Cow, Shot Gunderson, Elmer the Moose Hound — each gives a passive bonus.
- Timber Rights: buy new regions with bigger trees and longer trails.

## Tech

- Three.js (vendored in `lib/`), no build step. Everything is procedural low-poly geometry with toon
  shading and inverted-hull ink outlines (`src/r3d.js`, `src/models.js`), so it is crisp at any DPR and
  needs no asset downloads.
- HUD, shops and floating text are a 2D overlay canvas + DOM, which keeps text sharp on phones.
- Sound is synthesized with WebAudio (`src/audio.js`). Save game lives in localStorage.
- Layout: `src/scenes/{camp,forest,trail}.js`, state and economy in `src/state.js`.
