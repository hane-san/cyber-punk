# 浮世電走 (Ukiyo Densō) — design

## Pitch

A traveller in a wide straw hat (三度笠) and a travelling cape (道中合羽) rides a powered board across a vast Tokyo. The city is drawn as a woodblock print. The drones are the other world of noh and of Yanagita Kunio's Tōno: floating noh masks, paper cranes, fox-fire processions, and masked figures with naginata standing in the road.

The game is meant to become an open-world RPG. This first prototype settles **the map and the movement**:
- the map, a stylised Tokyo;
- the ride, which is the Wind Lover movement core;
- the look, a woodblock print;
- the one combat verb, the iai cut.

There are no turrets. You survive by going fast and slipping through, and you answer the masked figures with a single cut.

## The look: a pale print after Wind Lover

The first cut was a hard woodblock print: heavy sumi lines and deep colours. The owner preferred the pale Wind Lover look, so the picture now follows it. It is closer to a shin-hanga print (Kawase Hasui) than to an Edo broadsheet: the colour is laid down thin, the air is full of light, and the lines are a faint key block.

- **Tones.** Soft Lambert-like shading runs between a shade colour and a light colour. Every surface goes through `wash()`: a mix of 20% toward the hour's pale wash colour, with darks floored at 22% of it, so nothing reaches black. The building palettes are pastel: pale grey glass, light earth and pale stone, faded vermilion and soft slate roofs.
- **Lines.** The post pass keeps only silhouettes and soft creases, 1–1.6 px wide at 32% strength, in a blue-grey taken from the sky, and fades them out by about 1.4 km. Colour-edge lines are gone. In the strike frame the lines come back to full sumi.
- **Sky.** This is the Wind Lover sky: a gradient from the horizon to the zenith, a warm glow round the sun, and a soft band where the sky meets the land. On top of it: drifting soft clouds near the horizon, and a faint bokashi at the very top.
- **Hour.** The moods are pale, after Wind Lover: 暁 (rose dawn), 昼 (pale gold), 夕 (amber), 宵 (lilac blue hour) and 霞 (teal mist). They drift over 12 minutes, and the menu can fix one. It never goes fully dark. At 宵 the windows, signs and lanterns come on softly.
- **Mist** is long and pale (420–2300 m), with a lighter ground mist.
- **Water** is pale aqua, with faint seigaiha (青海波) scallops.
- **Speed.** White lane lines run on every arterial and deck: continuous edges, dashed lanes and a yellow centre line on arterials. Speed streaks rush out of the vanishing point above about 150 km/h.
- **Far mountains** (Fuji, Tanzawa and Okutama, Tsukuba) are pale silhouettes that ride with the camera.

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
  - Cruise is 36 m/s (130 km/h) and the top is 88 m/s.
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
| Approach | The board slows toward `KAMAE_V` (26 m/s). It turns in onto the chosen figure, harder as the distance closes: rate 1.4 → 7 from 150 m to 16 m. It closes the lateral gap with the float and calms the lean. The finger nudges at 45%. Time runs at 0.86 and the frame takes a sumi wash. |
| Wind-up | The figure reads your approach. When you will reach it within one wind-up (`WINDUP` 0.95 s), it calls ヨォー, swings its mane (毛振り), and raises the naginata. A vermilion brush ring closes on it. |
| The window | In the last `WINDOW` (0.30 s), the ring turns gold and the tsuzumi sounds ポン. Release within `REACH` (26 m) to cut. Inside the last `PERFECT` (0.12 s), the cut is 一閃. |
| The cut | A hit-stop of 0.17 s (0.24 for 一閃). The frame turns to sumi and paper with the vermilion kept, focus lines (集中線) close on the figure, and the brush character 斬 or 一閃 is stamped with a seal. The camera cuts to a low side view (the mie), framed on the point between the rider and the figure and placed where there is open air. Then the board dashes through, under a short slow-motion. The mask splits and falls; the body goes up in ink, Hokusai wave crests, and cherry petals or maple leaves. You get +15 m/s (+22 for 一閃), flow, one life back, and souls (魂). |
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
| Assaults | Noh masks (小面, 般若, 翁, 癋見, 天狗) with vermilion halos. They come up the road, hold about 175 m ahead and fire a pattern every 1.8 s: a curtain with a gap, a fan, a widening ring, three aimed streams, a spiral, or a double curtain. Rounds keep your pace and close at 60 m/s, so each takes about three seconds to arrive. |
| Chasers | Hunt from behind and fire aimed volleys at 56 m/s. You outrun them at speed. They come sooner when you are slow. |
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
