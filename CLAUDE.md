# 浮世電走 — working notes for Claude

A portrait-first mobile action prototype: a traveller in a straw hat and cape rides a powered board through a vast Tokyo drawn as a woodblock print. Noh masks, paper cranes and masked figures from the other world fill the sky and the roads. Design intent, rules and numbers live in `docs/DESIGN.md`. Read it before you change gameplay.

## Collaborating with the owner (はねさん)

- Reply in Japanese, in a gentle, slightly playful お嬢様 voice (一人称「わたくし」; call the user はねさん or はね氏). Keep the reasoning rigorous and the prose easy to read. If you don't know something, say so.
- Text in English (code comments, docs, commits) uses British spelling.
- Feedback is often by feel. Turn it into parameters, measure the result in the headless harness, and report the numbers.
- The theme is Japan throughout. Keep it to print-like colour (traditional pigment names in `COL`), sumi lines and stage motifs (noh, kabuki, Yanagita's other world). Keep the UI minimal.
- The movement core comes from `hane-san/wind-lover` (branch `claude/hoverboard-prototype`, `prototype/index.html`). Keep the two in step when the feel changes there.
- Do not open PRs unless asked.

## The code

`game/index.html` is the page: styles, DOM and script tags. It has no doctype, because the artifact host adds the skeleton. Three.js r128 loads from cdnjs. The game is split into classic scripts in `game/js/`. They share the global scope and load in this order:

| File | What lives there |
|---|---|
| `base.js` | maths, hash/noise, `COL` palette, `store`, `BOARD` and settings `S` |
| `map.js` | Tokyo: `DISTRICTS`/`KINDS`, the district field (`distAt`), water (`site`, `terrainH`, `coastZ`, `ISLANDS`), `Path` + `nearestPath` (rivers, arterials, expressways with `deck`/`ramps`), the local grid (`lineX`, `vPresent`, `localNear`), `ground(x,z,y)`, `roadNear`, `LANDMARKS` |
| `look.js` | renderer, `U` shared uniforms, `ukiyoMat`/`glowMat`/`texMat`, canvas textures (signs, masks, FX), `Builder` (flat-shaded geometry), water, sky, far mountains, `MOODS`/`updateMood`, the ink post pass (`post`, `renderFrame`) |
| `city.js` | colliders (`addCol`, `colNear`), global towers and landmarks, streamed chunks (`updateChunks`, `buildChunk`, `buildExpSeg`, `buildBlock`) |
| `rider.js` | board and rider model (`RIG`), cape cloth |
| `ride.js` | `P` state, `stepPhysics` (Wind Lover core), `roadAffinity`, `autoHop`, `collide`, `wallImpact`, `deckWalls`, `resolveGround` |
| `yokai.js` | particle systems (`fxAdd`), formations (`spawnFormation`, patterns, `bullets`), masked figures (`ijins`, `placeIjin`, wind-up and attack, `killIjin`) |
| `iai.js` | the stance and the cut (`IAI`), `kamaeSteer`, hit-stop, mie camera, `hurt`/`die` |
| `sound.js` | `sfx`, procedural WebAudio |
| `ui.js` | input (stick + hold for the stance), HUD, cartouche, stamp, map (東京絵図), sheets |
| `main.js` | camera, rider pose, the loop, and the debug hook `window.__uk` |

Conventions:
- Units are metres, seconds and m/s. +x is east and +z is south. Yaw 0 faces +z, and `fwd = (sin yaw, cos yaw)`.
- World generation must be deterministic from position: use `hash3`, `vnoise` or `mulberry` seeded by cell.
- Colliders are oriented boxes. Local x maps to world `(c, −s)`. Static ones are added with `addCol(null, …)`; chunk ones go to the chunk's list.
- The `Builder` turns faces outward from a `hint` point. Pass one for solids.

## Testing (headless)

1. Build a test page: put a doctype, charset and viewport in front of `game/index.html`, point the three.js script at a local r128 `three.min.js` (`npm pack three@0.128.0`), and drop the Google Fonts links.
2. Copy `game/js` beside it.
3. Launch `chromium` from `/opt/node22/lib/node_modules/playwright` with `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'` and `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`, at 390×844 with touch.
4. Set `localStorage['ukiyo.threat']='false'` for calm runs. Click `#btnGo`, then drive through `window.__uk`:
   - `placeAt(x, z, yaw, v)` to teleport;
   - `setMood(k)` to fix the hour;
   - `placeIjin`, `spawnFormation`, `inp`, and Space key events for the stance.
5. Check `pageerror`, then take screenshots and Read them. SwiftShader runs slower than real time, so measure sim time (`__uk.simT`).
