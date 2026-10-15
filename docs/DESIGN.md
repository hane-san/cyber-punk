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

## The map: a stylised Tokyo

Units are metres. +x is east, +z is south, and the origin is the palace. The world is 23 × 18 km (x −11 to 12 km, z −9 to 9 km).

| Layer | What it is |
|---|---|
| Terrain | The Yamanote plateau (about 22 m) in the west and the flat Shitamachi lowland (about 3 m) in the east. River valleys cut slopes (坂) into the plateau, and the reclaimed land by the bay is flat. |
| Water | The bay below a coastline, with reclaimed islands (台場, 有明, 豊洲, 晴海, 品川埠頭, 新木場). Rivers: 隅田川, 荒川, 神田川, 日本橋川, 目黒川, and the palace moat. Banks are gentle, so you can ride in, skip across at speed and ride out. |
| Rings | 内堀通り, 外堀通り (with the 都心環状線 expressway over it), 明治通り, 山手通り and 環七. |
| Radials | 新宿通り, 青梅街道, 玉川通り, 中山道, 日光街道, 京葉道路, 晴海通り, 第一京浜, 本郷通り and 六本木通り, plus 中央通り from 新橋 to 上野. |
| Expressways | Decks 26 m wide, 15 m over the land: 都心環状線, 新宿線, 渋谷線, 池袋線, 向島線 (along the Sumida) and 湾岸線 (across the bay to 台場). Ramp pairs every 900 m, with up-ramps on the left. Vermilion parapets with giboshi posts are soft walls. Pillars stand in the median. |
| Local streets | An 80 m grid, jittered, with 160 m blocks among towers. Narrow alleys (路地) run in the old town, lines end at random (T-junctions), and there are no streets in parks or on water. |
| Districts | 24 named districts. Each kind builds differently: `tower`, `neon`, `shita` (wooden town houses), `temple`, `resi`, `port`, `park` and `palace`. A title cartouche (名所東京百景) appears when one takes over. |
| Landmarks | 天守 on the palace with its moat walls, the red 電波塔, the 634 m 天の塔, 雷門 with its lantern and the 仲見世, 浅草寺 and its pagoda, the 大鳥居 and a tunnel of a thousand torii down the shrine approach, the Ueno pagoda among cherry trees, four kabuki screens over the 渋谷 crossing, the 日本橋 lamps, the bay wheel, and the twin-towered city hall in 新宿. |

The start is 日本橋, the zero milestone, facing south down the Ginza street.

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
| Approach | The board slows toward `KAMAE_V` (34 m/s) and lines up to pass close beside the chosen figure (`PASS_OFF` 2.8 m, on the side you are already on). It steers harder as the distance closes: rate 1.4 → 7 from 150 m to 16 m. The finger nudges at 45%. |
| The held breath | From 70 m in to 22 m, time slows from 0.9 to 0.5 and the frame sinks: desaturated and darkened by up to about 60% at the edges. Speed effects fade out. |
| Wind-up | The figure reads your approach. When you will reach it within one wind-up (`WINDUP` 0.95 s), it calls ヨォー, swings its mane (毛振り), and raises the naginata. A vermilion brush ring closes on it. |
| The window | In the last `WINDOW` (0.26 s of game time, about 0.5 s real at half speed), the ring turns gold and the tsuzumi sounds ポン. Release within `REACH` (22 m) to cut. Inside the last `PERFECT` (0.11 s), the cut is 一閃. |
| The cut | A hit-stop of 0.30 s (0.42 for 一閃), as a kabuki mie (見得), with tsuke clappers striking battabatta… battari. The picture turns to a black ground with the figures in white and vermilion kept. The 定式幕 (black, persimmon, green) closes in from top and bottom, and 斬 or 一閃 is stamped with a seal. A white stroke edged in vermilion crosses the frame, and halfway through the hold the picture is cut in two along it and slides apart, then knits back. A white crescent sword stroke sweeps round the rider. The camera is a low side view framed on both of you. Then the board flies past beside the figure under a short slow-motion, at +24 m/s (+34 for 一閃). The mask splits and falls, and the figure goes over backwards in a kabuki fall before vanishing in sumi and leaves. You get flow, one life back, and souls (魂). |
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

## Known limitations

- Chunk building takes 10–40 ms per 320 m chunk on a desktop CPU (the old town and the port are the heaviest), so a phone may hitch as chunks stream in at speed.
- The local grid ignores arterial angles, so blocks next to radials are cut raggedly.
- Ramps come off the arterials under the expressway. Where an expressway has no road beneath (parts of 湾岸線), its ramps are skipped over water.
- Buildings are axis-aligned boxes.
- Brush fonts (Yuji Syuku) load from Google Fonts. Until they arrive, signs use a fallback face and are redrawn once the font loads.
