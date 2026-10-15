# 浮世電走 (Ukiyo Densō) — design

## Pitch

A traveller in a wide straw hat (三度笠) and a travelling cape (道中合羽) rides a powered board across a vast Tokyo. The city is drawn as a woodblock print. The drones are the other world of noh and of Yanagita Kunio's Tōno: floating noh masks, paper cranes, fox-fire processions, and masked figures with naginata standing in the road.

The game is meant to become an open-world RPG. This first prototype settles **the map and the movement**:
- the map, a stylised Tokyo;
- the ride, which is the Wind Lover movement core;
- the look, a woodblock print;
- the one combat verb, the iai cut.

There are no turrets. You survive by going fast and slipping through, and you answer the masked figures with a single cut.

## The look: Wind Lover, made Japanese and more wistful

The first cut was a hard woodblock print. The owner preferred the Wind Lover picture, so the look is now built on it: hemisphere light with a soft sun, no outlines, and film grain. The theme stays Japan, and the mood is pushed toward the pale, the sad and the nostalgic, like an empty Tokyo on faded film.

- **Light.** Wind Lover light: a hemisphere from the sky colour to a shade colour (74%), plus a soft sun (36%). Surfaces get a light pale wash (12%), and darks never reach black.
- **Grade.** In the post pass, colour is pulled 20% toward grey, then 40% toward sepia. Blacks are lifted and whites softened (×0.86, plus a small offset). Moving film grain sits on top, with a soft vignette always on.
- **Lines.** There are none in play. Depth silhouettes are drawn only in the kabuki strike frame.
- **Hour.** Faded moods: 夕 (amber, where it starts), 宵 (lilac blue hour, lights on), 暁 (rose), 霞 (teal mist) and 昼 (pale gold). They drift over 15 minutes, and the menu can fix one.
- **Empty city.**
  - Maple leaves (at dusk) or cherry petals drift through the air and rush past at speed.
  - A temple bell sounds far off every 20–50 s; at dusk and dawn, higurashi call instead.
- **Sky and water.** The Wind Lover sky with soft drifting clouds, pale aqua water with faint seigaiha, and far mountains as pale silhouettes.
- **Speed.** All three effects build from 120 km/h to 340 km/h, and the stance damps them:
  - White lane lines run on every arterial and deck.
  - A radial blur drags the edges of the frame toward the vanishing point.
  - White speed streaks rush outward.

  On top of that, the field of view opens by up to 23°, and the camera shudders more at speed.

## The map: Tokyo and the land around it

Units are metres. +x is east, +z is south, and the origin is the palace. The world is 72 × 62 km (x −36 to 36 km, z −30 to 32 km).

The city in the middle is the stylised 23 wards. Around it the land opens out into empty, wistful country: paddies, cedar hills, a sea road and the shore.

| Layer | What it is |
|---|---|
| Terrain | The Yamanote plateau in the west of the city and the flat Shitamachi lowland in the east. Further west, rolling hills (from about 14 km out) rise into the Okutama mountains (300–600 m from about 22 km out). The Tama and Miura hills run south-west. River valleys cut slopes into the high ground. |
| Water | Tokyo Bay is closed by two shores: Kawasaki, Yokohama and the Miura hills to the west, and Chiba and Kisarazu to the east. It holds the reclaimed islands and Umihotaru in the middle. Rivers: 隅田川, 荒川, 江戸川, 多摩川, 鶴見川, 神田川, 日本橋川, 目黒川, and the palace moat. Banks are gentle, so you can ride in, skip across at speed and ride out. |
| Rings | 内堀通り, 外堀通り (under the 都心環状線), 明治通り, 山手通り, 環七, 環八, and 国道十六号, a 27 km loop through the country. |
| Radials | Twelve old roads run out to the edge of the world (甲州街道, 青梅街道, 中山道, 川越街道, 日光街道, 水戸街道, 京葉道路, 第一京浜, …), plus 中央通り. |
| Country roads | 野の道 across the northern paddies, 川沿いの道 down the Tama, 岬の道 to the cape, 潮の道 down the Chiba shore, and 峠の道 over the Okutama pass. |
| Expressways | Decks 26 m wide, 15 m over the land, and never sunk into a hill. 都心環状線, 新宿線→中央道 (over the mountains), 渋谷線→東名, 池袋線→関越道, 東北道, 東関東道, 向島線, 湾岸線, and 海の道 across the bay by way of Umihotaru. Ramp pairs every 900 m on land. |
| Railways | The loop line, and lines west, down the coast, north and east. The tracks are rideable. Over water they become steel truss bridges. Where a road crosses, there is a level crossing with striped barriers, crossed signs and red lamps, and its bell rings as you come near. |
| Power lines | Steel pylons every 300 m stride across the country with six sagging conductors. Every fifth pylon is banded in red. |
| Local streets | An 80 m grid in the city, with 160 m blocks among towers and in the suburbs. Narrow alleys (路地) run in the old town. There are no streets in parks, on water or out in the country. |
| Districts | 39 named districts. Outside them, the land picks its own kind: town near the centre, then suburbs, paddies to the north and east, wooded hills and cedar mountains to the west, and shore by the bay. A title cartouche (名所東京百景) appears when a district takes over. |
| Country kinds | `suburb`: low houses with gable roofs, empty lots with vegetable patches and lone vending machines, and Showa-era housing blocks (団地). `rural`: paddies painted in the ground, with levees, ripening gold or green, a few still holding water and mirroring the sky. Also thatched farmhouses with white storehouses, a lit window and persimmon trees, small shrines in cedar groves, susuki grass, and jizō with red bibs. `satoyama`: woods among the paddies. `mount`: cedar forest. `coast`: tetrapods along the water and little boats at sea. |
| Landmarks | In the city: 天守, 電波塔, 天の塔, 雷門 and 仲見世, 浅草寺, 大鳥居 and the thousand torii, the Ueno pagoda, the 渋谷 screens, 日本橋, the bay wheel, the city hall. Out in the country: the lighthouse on the Miura cape, whose beam turns at dusk. |

Start points: 日本橋, 豊洲, お台場, 品川, 渋谷, the Tama riverbank, the Okutama pass, the Minuma paddies, and the sea road.

The map in the menu (東京絵図) is painted from the world itself: water, paddies, hills and mountains. On top it draws roads, railways (black and white), power lines and the vermilion expressways.

## Movement (carried over from Wind Lover)

The board keeps the Wind Lover handling. These are the numbers to protect:
- **Lean.** Lean rides a damped spring (natural frequency 1.55 × roll, damping 0.62). Yaw comes from lean as K·tan(lean)/v^0.88.
- **Sidestep or arc.** A short input is mostly a sidestep (the float, up to 8.5 m/s). A held input comes round into an arc.
  - Town tuning: yaw from lean starts at 36% (Wind Lover: 30%) and is full after about 1.9 s of holding (Wind Lover: 2.4 s).
- **Grip** turns slide back into speed. Off the road, grip is 72%.
- **Speed.**
  - Cruise is 40 m/s (144 km/h) and the top is 100 m/s.
  - Flow raises both while you keep going.
  - Tuck (stick up) pulls toward 1.35 × cruise, with the long pull on straights.
  - Measured: tucking straight down 中央通り for 18 s covered 1.27 km, peaking at 341 km/h with flow.
- **Room to ride.** Arterials are 38 m wide (48 m under an expressway), decks 26 m and local streets 15 m (20 m among towers). Buildings stand 6 m back from the arterials and 3 m from the streets.
- **Road affinity** is generalised from the Wind Lover highway to every road: expressway decks, arterials and the local grid. It prefers the road that runs your way. It settles you onto the line, finishes a turn onto a road without overshooting, and nudges you back from an edge. Strong steering always wins.
- **Walls.**
  - More than `WALL_CRASH` (24 m/s) into a wall is a crash: a stagger of 0.7 s.
  - Above 36 m/s a crash also costs a life.
  - Anything shallower is a scrape.
- **The ground.** The auto-hop clears low obstacles. You hug the ground, and you skip over water above 30 m/s.

## The cut (居合)

| Step | What happens |
|---|---|
| Stance (構え) | Hold the finger still (within 16 px) for 0.32 s; on a keyboard, hold Space. An ensō is drawn round the finger as you hold, and the stance begins when it closes. A finger that has been steering must come back to centre first. |
| Approach | The board slows toward `KAMAE_V` (34 m/s) and is drawn, with inertia, toward a line that passes close beside the chosen figure (`PASS_OFF` 2.8 m, on the side you are already on). The pull eases in over about 0.55 s after the lock. The heading turns at a capped rate (0.55 → 2.2 from 120 m to 18 m), shown as lean. The lateral error pulls the velocity sideways through a smoothed spring rather than snapping the line. Steering for yourself takes the pull away (up to 85%), and the finger nudges at 45%. |
| The held breath | From 70 m in to 22 m, time slows from 0.9 to 0.5 and the frame sinks: desaturated and darkened by up to about 60% at the edges. Speed effects fade out. |
| Wind-up | The figure reads your approach. When you will reach it within one wind-up (`WINDUP` 0.95 s), it calls ヨォー, swings its mane (毛振り), and raises the naginata. A vermilion brush ring closes on it. |
| The window | In the last `WINDOW` (0.26 s of game time, about 0.5 s real at half speed), the ring turns gold and the tsuzumi sounds ポン. Release within `REACH` (22 m) to cut. Inside the last `PERFECT` (0.11 s), the cut is 一閃. |
| The cut | The cut comes in five beats.<br>1. **Close in** (0.075 s, world held): the rider covers the last metres to `CLOSE_OFF` (2.1 m) beside the figure. The blade comes out of a pivot at the chest and sweeps from behind toward the figure, leaving a white trail edged in vermilion. A sharp steel draw sounds.<br>2. **Hit-stop** (0.30 s, 0.42 for 一閃): the blade is through the body. Kabuki mie with tsuke clappers, a black ground with white figures, the 定式幕 closing in, the frame cut in two along a slash, and the 斬 or 一閃 stamp. A low side camera is framed on both.<br>3. **Pass**: the board flies on along the road (not into the buildings) at +24 m/s (+34 for 一閃), under a short slow-motion.<br>4. **Blast**: `BOOM_DELAY` (0.12 s) later the figure blows apart behind you. A flash, a fireball of orange and vermilion, a ground shockwave and a standing ring, firework sparks, debris, lingering smoke, the mask split in two, and petals or leaves. The side camera holds through it.<br>5. **Sound**: a crack, a sub-bass drop, a darkening roar, crackling debris and a long rumble. Everything goes through a compressor so it hits hard without clipping.<br>You get flow, one life back, and souls (魂). |
| Too early | 弾かれ. The blade is turned aside: a clang, and you are thrown off the line with a stagger of 0.6 s. |
| Too late | The naginata comes down (radius 10.5 m) and you lose a life. |

Measured in the harness, from 170 m at 50 m/s:
- The stance settled at 26 m/s.
- The wind-up began at 25 m.
- Release at 0.18 s left, 4.8 m out, gave 斬.
- Release at 0.69 s gave 弾かれ.
- Holding on was a hit.

Passing at 52 m/s, 14 m to the side, was safe.

## The other world in the sky

| What | Behaviour |
|---|---|
| Peaceful passes | Paper cranes (折り鶴) with flapping wings, and fox-fire processions (狐火) trailing orange hitodama. They cross high, every 4–9 s. |
| Assaults | Noh masks (小面, 般若, 翁, 癋見, 天狗) with vermilion halos, every 9–23 s. They come up the road, hold about 175 m ahead and fire a geometric figure every 1.15 s. The figures are laid flat over the road and open as they come: 花 (a rose of 3–6 petals), 五芒 (a pentagram), 渦 (five spiral arms), 格子 (rows with two gaps), 輪 (three rings), 蓮 (two hexagrams), 簾 (a double curtain) and 曼荼羅 (a ring with a turning flower). That is 40–100 rounds each. Rounds keep your pace and close at 60 m/s, so each figure takes about three seconds to arrive. They are vermilion or indigo beads with a white heart and a dark rim, so they read against a pale sky. |
| Chasers | Hunt from behind and fire rings of 18 rounds aimed at you at 56 m/s. You outrun them at speed. They come sooner when you are slow. |
| Formations | Named after the old battle arrays (八陣): 鶴翼, 魚鱗, 雁行, 長蛇, 円月 and 偃月. |

Hitodama do nothing under an expressway deck (roofs shelter). Grazing one, within 4.8 m, chimes on the miyako-bushi scale and adds flow.

## Sound

Everything is procedural WebAudio:
- the board's hum and the wind;
- the nohkan flute, rising into its shrill hishigi, when an assault arrives;
- the kakegoe call ヨォー at a wind-up;
- the tsuzumi ポン at the window;
- the strike's ringing steel over a taiko;
- hyoshigi clappers at the start and on 一閃;
- a low breathy drone in the stance.

## HUD and menu

The HUD has three things:
- speed in an old numeral face;
- three vermilion seals for life;
- souls counted in kanji.

District cartouches come down at the top right. The menu (the fan button) shows the 東京絵図: an old printed map with the bay in seigaiha, rivers, roads, the vermilion expressways, district names in vertical script and the rider's mark. It also holds the time of day, sound, yokai on or off, and returns to 日本橋 or to a random road.

## Roadmap

1. Open-world RPG loop: places to stop, people, quests, and what souls buy.
2. More figures and stronger ones: tengu that leap, oshirasama, kappa at the rivers, bosses at landmarks, and chained cuts.
3. Side entries: masks that dive under the expressways.
4. Train lines (the Yamanote loop) as rideable elevated tracks.
5. Performance on real phones: spread chunk building across frames, and add instancing for lanterns and signs.

## Mistral's tuning (merged)

The owner had Mistral (Vibe) tune the combat on `vibe/combat-enhancement-f57a0d`, and that branch is merged:
- a wider window (0.34 s, with 0.16 s for 一閃) and a reach of 28 m;
- a shorter hit-stop (0.22/0.28 s) and softer camera, shake and flash;
- more figures (up to 8) and more frequent formations;
- start points to choose from.

The start point coordinates and labels were corrected after the merge.

## Grok's tuning (merged), and the step-in made real again

The owner had Grok tune the cut directly on `main`, and those changes are kept:
- The pass is continuous, with no position warp: a moderate pass speed, then 0.45 s of re-acceleration (+28 m/s, or +38 for 一閃) after the hit-stop.
- The stance is slower and goes deeper into slow time (`KAMAE_V` 28, time 0.85 → 0.4).
- The strike and the blast are heavier, with more sub-bass and a longer body.

One side effect was fixed. Grok's step-in ran at 0.15× time, so the rider moved only about 0.5 m and the cut landed 7.4 m from the figure. The step-in is now a real lunge in real time: velocity is aimed at the figure's side every frame for `CLOSE_T` (0.12 s), with no warp, so the blade lands 2.9 m from the figure's centre. Then the board turns back onto the pass line.

The mie camera frames fully while the frame is held, and pulls back at Mistral's gentler 60% on the way out.

More for the feel:
- **Light trail:** an asagi ribbon streams from the board, brighter with speed and on every punch.
- **Near misses:** skimming within 2.6 m of a pillar or a wall at over 130 km/h gives a whoosh, a little flow and a punch, once per obstacle every 2.5 s.
- **Re-acceleration:** a rush of wind when the board flies on after the cut.

## Level camera, zubaba, and an asagi lock-on

- **Camera roll** in turns is about half what it was (0.022 × yaw rate × speed, capped at 0.045 rad). It is zero in the stance and in the mie, so the auto-steer no longer tips the horizon.
- **The mie** is taken level, from chest height.
- **The cut sound** is a heavy "zubaba".
  - Zu: a falling tear of air.
  - Ba, ba: two hits (three for 一閃), each a low-passed body, a thump falling from 150 Hz and an edge.
  - All of it goes through a soft-clip drive stage (tanh), with a sub-bass tail and a faint ring of steel.
  - The tsuke clappers follow.
- **The lock-on mark** is asagi: a brush-drawn double ring with four ticks, like a sight. The wind-up ring is asagi too, and turns gold only inside the window. The ground figures' markings never share a colour with the vermilion and indigo rounds.

## The tempo of a cut

The cut is meant to flow in one breath:
1. **Lock on from far:** up to 380 m ahead, within about 55° of your line.
2. **Surge:** on the lock, a temple bell's rin and a small drum's ka sound, and the board surges forward for 0.25 s (about +11 m/s).
3. **Glide:** the board eases toward 85% of the speed you came in with (at least 35 m/s), at a gentle 0.7/s, never braking hard. Time slows only from 0.95 to 0.6 as you close. The frame drains of colour and darkens from the edges inward, while the centre stays clear.
4. **Cut**, as before.
5. **Back to speed:** over 0.7 s the board returns to the speed you came in with (×1.04, or ×1.12 for 一閃), smoothly.

Measured from 330 m at 55 m/s:
- the lock came at 328 m;
- the glide settled near 48 m/s;
- the cut landed at 2.4 m;
- the board was back above 60 m/s within about a second.

## Known limitations

- Start-up builds the district field and the global towers for the whole 72 × 62 km world: about 3 s in headless Chromium on a desktop CPU.
- Chunk building takes 10–50 ms per 320 m chunk on a desktop CPU (the old town and the port are the heaviest), so a phone may hitch as chunks stream in at speed.
- The local grid ignores arterial angles, so blocks next to radials are cut raggedly.
- Ramps come off the arterials under the expressway. Where an expressway has no road beneath (parts of 湾岸線), its ramps are skipped over water.
- Buildings are axis-aligned boxes.
- Brush fonts (Yuji Syuku) load from Google Fonts. Until they arrive, signs use a fallback face and are redrawn once the font loads.
