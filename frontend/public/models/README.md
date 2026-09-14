# Digital Twin — 3D cadet avatar assets

The Digital Twin loads gender-specific rigged NCC-cadet models from:

```
/models/cadets/male-cadet.glb
/models/cadets/female-cadet.glb
```

**These files are intentionally not committed** — they must be production-quality,
NCC-accurate rigged models. Until each is provided, the Twin renders a gender-aware
procedural fallback (it never substitutes a generic soldier or a 2D image), and all
intelligence data still displays. Drop the correct file in and it loads
automatically — **no code changes** (`scene/CadetAvatar.jsx` resolves gender → URL).

---

## Uniform specification — NCC Army Wing (authoritative)

Source of truth: the official NCC Army-Wing reference sheet. **Do not** add Indian
Army regimental insignia, unearned medals, fictional badges, or weapons. It must
read as an **NCC cadet**, not a soldier. Do not model per-rank insignia geometry
(rank is shown as a UI badge, not on the mesh).

### Male cadet (`male-cadet.glb`)
- Khaki **half-sleeve** shirt, open collar, front placket
- **Two flapped chest pockets**
- Khaki trousers, sharp crease
- **Black leather belt with silver NCC buckle**
- **Dark-green beret**, tilted, with **silver NCC cap badge** and **red plume/hackle**
- **Red "NCC" shoulder flash** on the epaulettes
- **Maroon/blue twisted lanyard** over one shoulder
- **Black name plate on the right chest**
- **Black polished shoes**, black socks
- Grooming: short hair

### Female cadet (`female-cadet.glb`)
- **Same uniform specification** as male (khaki shirt/trousers, dark-green beret +
  red plume + silver badge, black belt + silver NCC buckle, red shoulder flash,
  maroon/blue lanyard, right-chest name plate, black polished shoes, black socks)
- **Hair worn in a bun** (as established by the reference)
- **Female body proportions** (not a scaled-down male)

Colour guide: Khaki · NCC Red · NCC Blue · **Dark Green (beret)** · Black · Silver.

---

## Animation clips (required names)

The animation controller (`scene/CadetAvatar.jsx`) looks for these clip names
(case-insensitive; sensible aliases accepted):

- **`Idle`** — subtle breathing/idle loop (aliases: `Breathing`)
- **`Attention`** — Savdhan / at-attention pose (alias: `Savdhan`)
- **`Salute`** — one controlled, ceremonial NCC salute

**Opening sequence played automatically:** `Attention → Salute (once) → Idle (loop)`.
The salute plays **once** per cadet per session (guarded — never replays on
re-render). If a clip is missing it's skipped gracefully; if there are no clips the
model simply stands in its bind pose. No crash either way.

---

## Coordinate system / export settings

- Format: **`.glb`** (glTF 2.0 binary), single self-contained file, textures embedded
- Up axis: **+Y up**
- Facing: **+Z** (toward the camera)
- Origin: **feet grounded at y = 0**, centred on X/Z (so rotation orbits the body)
- Scale: **~1.7–1.8** world units tall (consistent between male & female)
- Rig: standard humanoid skeleton; bind pose near *Attention*
- **No baked camera, no baked lights** (the scene provides its own)
- Budget: keep < ~100k triangles; textures ≤ 2K; **Draco/meshopt compression** on

## After dropping a file in — quick test
1. Reload `/ano/command/cadet/:regimentalNo` as an ANO.
2. Cadet appears at correct scale, feet on the grid, facing you.
3. It salutes once, then settles into idle.
4. Drag rotates smoothly; "Reset View" recenters.
5. Loads but doesn't salute → the clip isn't named `Salute`.
6. Huge/tiny/sideways/floating → fix scale / +Z facing / feet-at-origin, re-export.

See `docs/DIGITAL_TWIN_AVATAR_GUIDE.md` for the full Mixamo/Blender recipe.
