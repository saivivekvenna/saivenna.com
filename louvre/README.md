# The Louvre — Denon After Hours

A walkable Three.js reconstruction of four connected first-floor Louvre rooms: Salle Mollien (700), Salon Denon (701), Salle Daru (702), and Salle des États (711).

## Live

https://saivenna.com/louvre/

The standalone gallery and its vendored dependencies are served from this folder. Serve the repository root for local testing at `/louvre/`; the explicit base URL also supports the extensionless `/louvre` route. The walkthrough video and preview are in `../project-assets/louvre/` and embedded on the Projects page.

## Run

`python3 -m http.server 4174 --bind 127.0.0.1` from the repository root serves http://127.0.0.1:4174/louvre/. `node --check louvre/main.js`, `node --check louvre/museum.js`, and `node --check louvre/demo.js` validate the scene and demo modules. All runtime code, paintings, and material textures are self-hosted; Google Fonts are optional.

## Walkthrough video

Open `/louvre/?demo=1` and click **Record walkthrough** after the paintings load. Demo mode records a 45-second, 1600 × 900 walkthrough of the red galleries, the Coronation, Mona Lisa, The Wedding at Cana, and Liberty Leading the People. It captures the rendered scene without UI overlays and downloads a silent WebM at 30 fps. Reload to return to normal controls. The exported MP4 is `../project-assets/louvre/demo.mp4`.

## Sources and accuracy

Room footprints and the 700–701–702 chain with the 701–711 branch follow the Louvre's official first-floor vector plan:
https://collections.louvre.fr/assets/svg/niveau1.svg

Metric scale is estimated at 0.67 metres per SVG unit, anchored to the museum's published 698 m² area for room 711. Wall heights, ornaments, lighting and several hanging positions are interpretations, not surveyed measurements. The Salon Denon's ceiling is a restrained architectural approximation.

All 24 paintings installed in the rooms use verified original dimensions and current room assignments. Mona Lisa is on a separate display partition facing The Wedding at Cana; Cana's end wall has the two flanking openings documented in room photographs. Three paintings whose records specify the 711 vestibule are placed behind the Mona Lisa partition. A dated 2016 Daru photograph establishes Coronation and Sabines on the same long wall, with Oath of the Horatii opposite. Other wall coordinates are approximate and described as such in each painting's details. This is a selection, not today's complete museum hanging.

The collection guide includes 32 artworks. Eight works outside these rooms open as records, rather than being falsely hung in this wing. Museum record links, dimensions and public-domain image credits accompany every work.

Research and evidence:
- `research/louvre-real-rooms.json`: floor plan, photos, room evidence and uncertainties.
- `research/louvre-art-assets.json`: source records and original reproductions.
- `dist/assets/art/catalog.json`: runtime catalogue, dimensions, rights, room records.
- `dist/museum.js`: physical scene, room footprints and explicit placement evidence.

## Rendering

The red galleries have skylights, patterned coved ceilings, gilded cornices and dentils, dark skirting, full-size paintings, deep beaded frames and central navy benches. Salle des États has a plain white roof basin, midnight-blue walls, a tall framed display partition, protective glazing and curved oak rail. Photographed CC0 parquet has normal and roughness maps. Area lighting, cached directional shadows, screen-space ambient occlusion, tone mapping and antialiasing give the space depth. Static geometry is batched; frame beadwork is instanced. Texture loading retries transient failures and reports final errors.

Material textures: Poly Haven, CC0 (Jenelle van Heerden, Sergej Majboroda, Rob Tuytel). Three.js 0.186.1 is MIT licensed. No generated paintings. An independent project, unaffiliated with the Musée du Louvre.

## Controls and verification

The opening page shares saivenna.com’s warm paper background, Fira Code typography, left-hand navigation, and thin divider. The menu, collection, and painting details use the same colors and type; walking keeps the compact Menu control. Home, Projects, and Writing links return to the portfolio.

WASD walk; Shift moves faster; mouse look, or drag / arrow keys when mouse capture is unavailable. E or click inspects. M opens the room map; G opens the collection. Escape pauses; Entrance resets. Touch controls and optional locally generated ambience are included. During walking, desktop UI is limited to a small Menu button and a tiny aim dot only while mouse capture is active. Hovering or aiming at paintings shows no title block or other information. Click a painting or its clearer, larger wall label to open details. Room location, navigation, sound and help are inside the menu; closing details resumes the walk.

Browser verification covers real walking through all three room junctions, the room jump guide, Mona Lisa inspection and room metadata, original dimensions, all 24 installed texture loads, collection records outside the wing, collision boundaries, pause/resume and reset. UI checks also cover absence of hover information, painting clicks, label clicks, compact menu navigation, and resuming after closing details. Exact real-world wall positions remain subject to the evidence limits above.
