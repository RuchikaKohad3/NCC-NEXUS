# Digital Twin — how to add the real rigged NCC cadet avatar

The Digital Twin code is complete and **gender-aware**. It renders a procedural
fallback cadet until **production `.glb` assets** are provided. Drop the files here
and they load automatically — no code changes:

```
frontend/public/models/cadets/male-cadet.glb
frontend/public/models/cadets/female-cadet.glb
```

The loader (`scene/CadetAvatar.jsx`) resolves the model by `gender`, probes for the
file, and if present:
- plays **Attention → Salute (once) → Idle (loop)** on open,
- lets the officer rotate/zoom/reset the model,
- keeps every callout, readiness ring and the light theme exactly as-is.

Gender is an explicit prop (`<CadetAvatar gender="male|female" />`, default `male`);
it is **not** inferred from the database or the cadet's name.

---

## Hard requirements (the loader depends on these)

| Item | Requirement |
|---|---|
| Format | `.glb` (glTF 2.0 binary), single self-contained file |
| Up axis | **+Y up** |
| Facing | **+Z** (toward the camera) |
| Origin | **feet at y = 0**, centered on X/Z (not hips) |
| Height | ~**1.7–1.8** world units |
| Rig | standard humanoid skeleton; bind pose near *Savdhan* (attention) |
| Animations | clips named (case-insensitive) **`Idle`**, **`Attention`** (alias `Savdhan`) and **`Salute`** |
| Size | keep < ~100k triangles; textures ≤ 2K; Draco/meshopt compression on |

**Uniform (Army wing default):** khaki NCC uniform — tailored shirt with flapped
chest pockets, shoulder epaulettes, web belt, dark beret with NCC cap badge, red
hackle if applicable, black DMS parade boots. **Do NOT** add Indian Army
regimental insignia, unearned medals, fictional badges, or weapons. It must read
as an **NCC cadet**, not a soldier.

> If the GLB ships **no** animation clips, the cadet will stand correctly but
> won't salute — so include at least a `Salute` and `Idle` clip.

---

## Path A — Mixamo + Blender (fastest, free)

Mixamo gives you a **rigged** character and ready **animation clips** for free;
Blender is used to combine them, re-texture to khaki, and export the `.glb`.

1. **Base character** — go to <https://www.mixamo.com> (free Adobe account).
   Pick a male character in a neutral outfit (you'll re-texture it), or upload a
   custom model to auto-rig.
2. **Animations** — search **"Salute"** → Download; search **"Idle"** or
   **"Breathing Idle"** → Download. Export each as **FBX Binary**, *With Skin*
   for the first, *Without Skin* for the extra animations, 30 fps.
   - Note: Mixamo's salute is a Western-style salute. For an Indian/NCC open-palm
     salute (right hand), pick the closest clip or hand-adjust in Blender.
3. **Assemble in Blender** (free, <https://blender.org>):
   - Import the character FBX, then import the animation FBXs.
   - In the **Nonlinear Animation** editor, keep two actions and **rename** them
     exactly `Idle` and `Salute`.
   - **Re-texture the uniform:** assign a khaki material to shirt + trousers,
     dark to the beret, black to belt/boots; add a small brass cap-badge. Keep it
     matte (fabric), no glossy plastic.
   - **Transform:** rotate so the cadet faces **+Z**, move so **feet sit at
     y = 0**, scale to ~1.75 units, then `Object → Apply → All Transforms`.
4. **Export** → `File → Export → glTF 2.0 (.glb)`:
   - Format **glTF Binary (.glb)**
   - Include → **Selected Objects** (or Scene), **Animations** ✔, **Skinning** ✔
   - Transform → **+Y Up** ✔
   - Compression → **Draco** ✔ (optional but recommended)
5. Save as `frontend/public/models/cadets/male-cadet.glb` (repeat with a female
   character + hair bun for `female-cadet.glb`), reload the app.

> **Two assets:** produce **male-cadet.glb** and **female-cadet.glb** with the same
> uniform spec — female with a hair bun and female proportions (not a scaled male).
> Name the clips `Idle`, `Attention`, `Salute` in both.

## Path B — Ready Player Me + Mixamo

Ready Player Me (<https://readyplayer.me>) generates a rigged half/full-body GLB
in minutes, but in modern casual clothing. Use it for the rig, then in Blender
re-texture to the khaki NCC uniform and attach Mixamo `Salute`/`Idle` clips as in
Path A. Export the same way.

## Path C — Commission a 3D artist

For a truly accurate, evaluation-grade NCC uniform, brief a 3D artist with the
"Hard requirements" table + the uniform notes above (Fiverr/Upwork/college design
dept.). Ask specifically for the two named clips and the +Z / feet-at-origin setup.

---

## Wing variants (later)

The loader is modular. Additional wings can be dropped in and wired by wing when
a `wing` field exists on the cadet profile:

```
/models/ncc-naval-cadet.glb   (white naval NCC uniform)
/models/ncc-air-cadet.glb     (air-wing blue/grey NCC uniform)
```

Today `cadet_profiles` has no `wing` column, so the Army khaki model is the
default and no wing label is shown (never fabricated).

---

## Quick test checklist after dropping the file in

1. Reload `/ano/command/cadet/:regimentalNo` as an ANO.
2. The cadet should appear at correct scale, feet on the grid, facing you.
3. It salutes once, then settles into idle breathing.
4. Drag rotates it smoothly; "Reset View" recenters.
5. If it loads but doesn't salute → the clip isn't named `Salute`.
6. If it's huge/tiny/sideways/floating → fix scale / +Z facing / feet-at-origin
   and re-export.
