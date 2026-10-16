# 浮世電走 (Ukiyo Densō) — design

## Pitch

A traveller in a wide straw hat (三度笠) and a travelling cape (道中合羽) rides a powered board across a vast Tokyo. The city is drawn as a woodblock print. The drones are the other world of noh and of Yanagita Kunio's Tōno: floating noh masks, paper cranes, fox-fire processions, and masked figures with naginata standing in the road.

The game is meant to become an open-world RPG. This first prototype settles **the map and the movement**:
- the map, a stylised Tokyo;
- the ride, which is the Wind Lover movement core;
- the look, a woodblock print;
- the one combat verb, the iai cut.

There are no turrets and, for now, no barrage from the sky. The threat is the masked figures in the road and the barrages they throw. Hold to brake: the slower you go, the more freely the board slides sideways, so you choose where to brake and thread a figure and where to run flat out. Close in, the rider takes the iai stance and brakes hard. Let go right in front of the figure and the cut is automatic. Then the board bursts back to speed for the next one.

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

## Hold, brake, cut (制動・構え・一閃)

The combat loop is now about speed rather than timing: hold to brake, thread the barrage, get right in front of a figure, and let go.

| Step | What happens |
|---|---|
| Hold (制動) | Hold the finger still for 0.32 s (an ensō closes round it), or hold Space. Once it is held the finger can move again and steers. The board skids: it is kicked about 50° sideways, the rider leans back onto his heels with his arms out, the board's glow turns vermilion, sparks stream off the tail and a brake hiss rises with the bite. With no lock, speed falls at 7 m/s² (eased in over 0.45 s) down to `BRAKE_FLOOR` (20 m/s). The frame only dims a little. |
| Crab-walk (蟹歩き) | While holding, the board mostly keeps its heading (turn rate ×0.2 at 9 m/s, ×0.55 at 55 m/s) and the finger slides it sideways instead. The slide is quickest when slowest: `STRAFE_SLOW` 16 m/s of sideways speed at 9 m/s, `STRAFE_FAST` 6 m/s at 60 m/s, eased in at 5.5/s. So braking is how you thread a dense figure, and riding flat out is how you get through quickly but stiffly. |
| Lock | Within `LOCK_R` (95 m) of a figure ahead (within about 55° of the heading), the lock comes on with a bell and drum, a white glint at the hilt and a lock mark that pops in and settles. The rider changes body: the board straightens, he drops low and turns his chest to the figure, the left hand grips the scabbard and the right goes to the hilt, the sword comes up, the glow goes white and a sumi ensō turns on the ground under the board. The sound muffles, the frame darkens from the edges as the figure nears, and time slows a little (to 0.78 at the closest). |
| Hard brake | Locked, the speed is drawn down toward a pace set by the distance: 32 m/s at 95 m down to 12 m/s at about 15 m, at 2.4/s. The board is drawn in with weight toward a line 2.2 m beside the figure. Steering for yourself takes the pull away. |
| Release | Let go within `REACH` (22 m) and the cut is automatic; the lock mark turns gold and spins faster once you are in reach. Within `PERFECT_R` (10 m) it is 一閃. Let go further out and the blade goes back into the scabbard, and the board simply speeds up again. |
| Too close | Within `ATK_TRIG` (14 m) the figure winds up its naginata (0.7 s, the vermilion ring closes). If you are still holding inside `ATK_HIT` (7 m) when it lands, you are hit and the stance breaks. Riding past close without cutting gets the same. |
| The cut | A 0.1 s step-in to the figure's side, the board keeping its heading. Then the hit-stop (0.2 s, 0.26 for 一閃) in the kabuki frame, with 斬 or 一閃. Then a blast 0.1 s later, and a burst back up to the speed you started braking at (×1.06, or ×1.15 for 一閃). |
| Sound of the cut | The zubaba, plus a new body blow (`sfx.impact`): a 160 Hz thump into the drive, a crack, a square-wave punch and a second, deeper bang with a 38 Hz tail. Then the tsuke clappers and the explosion. |

The camera never cuts away. Through the step-in and the hit-stop it holds its heading and eases after the rider (follow rate 7/s instead of 80/s), then carries on with the ride. Particles fade as they near the lens, or when they would fill the frame, so the camera can fly through the blast and still see the road.

Measured in the harness (Ginza, starting at 60 m/s, holding from 140 m):

| Release at | Result |
|---|---|
| 12 m | 斬 |
| 8 m | 一閃 |
| 4 m | The naginata lands first: a hit, no cut |

In every case the lock came at 87–94 m and speed fell from about 80 to 12 m/s. After a cut the board was back to about 100 m/s.

## The barrage (地上の異人)

The sky barrage is paused (`SKY_THREAT = false`). Cranes and fox fires still pass overhead as scenery. The threat is the masked figures in the road. Only the nearest two figures ahead throw, from 430 m in to 28 m. Each figure has a way of throwing, shown by its robe:

| Robe | Style | Figures |
|---|---|---|
| Crimson | 撒: straight lines | 扇: two waves of an eleven-way fan, the second set into the gaps. 乱: eighteen lines thrown every which way at 28–44 m/s. 並: four lanes of six with one lane left open. Every 1.15 s. |
| Indigo | 弧: curves | 鎌: sickles from both sides swinging in across your line. 蛇: a serpent wall, the launch sweeping back and forth as the rounds bend. 波: four swaying streams. Every 1.45 s. |
| Gold | 描: figures drawn in the sky | 輪 (a ring of 18), 星 (a pentagram of 25) or 花 (a rose of 30). The rounds rise 17 m into a figure 12 m across, hold it for 1.35 s (a nohkan sounds), then the whole figure dives at you at 42 m/s, aimed a little to one side so its rim crosses you. Every 2.3 s. |
| Violet | 紋: crests on the ground | 環: two rings opening as they come. 華: a flower of 3–5 petals. 巴: three turning arms. 格: a lattice of four rows with two gaps each. Every 1.8 s. |

Rules for the rounds:
- Rounds are beads (3 m) with an additive halo in the style's colour. They aim at where you will be, with a 95% lead.
- The rider's hit is a thin upright core: 0.75 m across, from 0.9 m below the board to 1.9 m above it. That is much narrower than he looks.
- The hit check is swept over the frame, so a 130 m/s closing cannot tunnel through.
- A graze is within 3.4 m. It chimes and adds flow.
- Low rounds break on walls, and rounds 70 m behind you are dropped.
- A hit costs one hull but does not break the hold.

Figures are spawned 380–480 m ahead, every 150–270 m of travel, up to six at a time.

Measured, from 420 m at 60 m/s:

| Rider | Hits | Time in the zone |
|---|---|---|
| Holding, not steering | about 4 | 16 s |
| Holding, steered by a look-ahead bot | 1–2 | 16 s |
| Flat out, not steering | 0–1 | 7 s |

Running flat out is safer for a short stretch, but it cannot cut. Braking is how you thread a figure and make the kill.

## The other world in the sky (paused)

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

## The tempo of a cut (superseded)

The earlier lock-surge-glide model (lock at 380 m, surge, glide at 85–92% of entry speed) is replaced by hold, brake, cut, above.

## Skies by place

The hour sets the base mood. The land you ride through tints it, eased in over a few seconds (rate 0.25/s, sampled every 0.5 s at the rider):

| Area | Sky | Clouds |
|---|---|---|
| Coast, port | 潮: sea-green haze | low, with horizon streaks |
| Mountains, satoyama | 靄: mist | low, heavy, long streaks |
| Paddies, suburbs | 琥珀: amber | mackerel sky |
| Neon quarters, towers | 藤: lilac | moderate |
| Old town, temples | 茜: crimson | tall banks, mackerel sky |
| Parks | 雨後: grey-green after rain | heavy banks |
| The palace | 薄墨: thin-ink overcast | heavy |

Inside an area a 5.2 km noise swaps in one of the rarer skies (茜, 雨後, 月夜 a blue moonlit night, 薄墨) at up to 75%, chosen by a 9 km noise; the plain residential belt borrows them at up to 35%. The sky shader takes four place-driven uniforms: cloud amount (`uCloud`), bank height (`uCloudH`), mackerel scales (`uScale`) and horizon streaks of mist (`uStreak`, すやり霞).

## Old Japan in neon

The buildings mix traditional forms with neon tubes (`neonMat`: not washed, brighter at the blue hour, each run humming on its own phase). Tubes go into a per-chunk builder, `GB.neon`. The palette is asagi `0x5fe0f0`, sakura `0xff9ec8`, violet `0xa98bff`, gold `0xffd27a` and vermilion `0xff6a4a`.

- **Mid-rises as 楼閣.** In the neon quarters 50% of mid-rises over 9 m (old town and temples 45%, towers 35%, elsewhere 15%) get a tiled eave skirt every 8–13 m, a hipped crown with a gold finial, a tube along every eave lip, and sometimes lit corner pilasters.
- **Glass pagodas.** 70% of towers in the neon quarters (40% elsewhere) get an eave skirt every ~30 m and at each setback, and a hipped crown with a lit lip and a light mast. Their tubes are thicker (0.4–0.5 m) so they read from far.
- **Old houses.** In the lit districts 40% of wooden houses (10% elsewhere) have a tube along both eaves and the ridge. Their roofs now cover the right footprint.
- **Torii of light.** In the neon quarters, the old town, temples and towers, a neon torii sometimes stands over a street (22% of blocks in the neon quarters, 12% elsewhere), with posts as colliders.

## Known limitations

- Start-up builds the district field and the global towers for the whole 72 × 62 km world: about 3 s in headless Chromium on a desktop CPU.
- Chunk building takes 10–50 ms per 320 m chunk on a desktop CPU (the old town and the port are the heaviest), so a phone may hitch as chunks stream in at speed.
- The local grid ignores arterial angles, so blocks next to radials are cut raggedly.
- Ramps come off the arterials under the expressway. Where an expressway has no road beneath (parts of 湾岸線), its ramps are skipped over water.
- Buildings are axis-aligned boxes.
- Ground rounds fly at a fixed height, so on a slope they can pass over or into the road.
- Brush fonts (Yuji Syuku) load from Google Fonts. Until they arrive, signs use a fallback face and are redrawn once the font loads.
