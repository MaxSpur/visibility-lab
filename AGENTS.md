# Visibility Lab orientation

This directory is its own Git repository. Work, commits and generated intermediates belong here. Do not stage parent-directory seminar assets. The deliverable is `visibility-lab-v4.html`; `index.html` is its static-site entrypoint. No publishing workflow is configured.

## Source map

- `source/geometry.js`: computational core preserved from Astra v3; its SHA is pinned in `tests/geometry-baseline.cjs`. UI work must preserve it.
- `source/point-location.js`: first-success display prefix; the core still collects all incident roots.
- `source/wall-shadow2.js`: independent planar wall subtraction; `source/wall-shadows.js`: its scene; `source/wall-shadow-docs.js`: its method-specific reference.
- `source/shadow-stages.js`: recorded 3D shadow preparation, overlap and partition checkpoints shared by occluder-first and receiver-first traversal.
- `source/urban-shadow-stages.js`: detailed building-occluder scene and synchronized plan view.
- `source/terrain-shadow-stages.js`: four-stage-per-occluder terrain shadows and weighted receiver-by-receiver selected-facet trace.
- `source/projection-views.js`: receiver-first viewport traversal, tested-candidate highlighting and accepted-target accumulation.
- `source/sample-comparison.js`: phase-controlled raycast / independent occupancy raster in 2D; matched angular rays / depth raster plus physical recovery in 3D.
- `source/operation-counts.js`: synchronous typed solver accounting; `source/work-readouts.js`: workload UI, current-plan comparison and benchmark matching.
- `source/shared-scenes.js`: family observer/geometry state, per-plan observer memory and settings persistence.
- `source/receiver-boundaries.js`: display union boundaries on whole coplanar receivers; cancel fragment seams before outlining shadow cuts.
- `source/svg-context.js`, `source/svg-world.js`: native vector primitives and display occlusion.
- `source/terrain-views.js`: terrain/beam/projection figures, stage-directed observer insets, shared plan scene graphs and viewport/label drawing.
- `source/scenes.js`: other demonstrations and benchmarks; `source/reference-notes.js`: explanations and scientific sources.
- `source/panels.js`, `source/controls.js`: explanations and controls. Mode dropdown precedes the title; statistics anchor above the legend.
- `source/exports.js`, `source/runtime.js`: vector/PNG exports, saved settings and interactions.
- `source/template.html`, `source/styles.css`: page structure and responsive styling.

Edit source modules, then `python3 build.py`; commit the rebuilt HTML with source changes. README is user-facing. Keep detailed implementation commentary beside relevant code or tests rather than adding work logs.

## Validation

Run `python3 build.py --check`, `node tests/geometry-baseline.cjs`, `node tests/svg-world.test.cjs`, `node tests/receiver-boundaries.test.cjs`, `node tests/wall-shadow2.test.cjs`, `node tests/operation-counts.test.cjs`, `node tests/operation-progress.test.cjs`, `node tests/shadow-stages.test.cjs`, `node tests/terrain-shadow-stages.test.cjs`, `node tests/projection-workflow.test.cjs`, `node tests/terrain-single-shadow.test.cjs` and `node tests/samples.test.cjs`. Serve this directory with `python3 -m http.server 8764 --bind 127.0.0.1`, then run `node tests/layout.cjs`, `node tests/interface.cjs`, `node tests/shared-ui.cjs`, `node tests/shadows.cjs`, `node tests/expansion.cjs`, `node tests/shared-scenes.cjs`, `node tests/operation-readouts.cjs`, `node tests/terrain-interactions.cjs`, `node tests/terrain-views.cjs`, `node tests/projection.cjs`, `node tests/samples.cjs` and `node tests/construction-progress.cjs`. Browser tests resolve `PLAYWRIGHT_MODULE` or local `playwright`. Inspect both 1080p and 4K layouts plus exported graphics. Build checks do not substitute for visible interaction checks.

Scratch, screenshots and test downloads go in ignored `.codex-scratch.nosync/`; development dependencies go in ignored `node_modules/`. Tests must work from a standalone clone without parent assets or machine-specific module paths.

## Recurring gotchas

Shadow construction modes are construct / subtract and use one scene graph for its 3D and plan views. `construction:false` always shows final shading and disables animation; it must omit silhouette, extrusion and receiver-cut lines. The plan uses orthographic top-view occlusion, so vertical faces project to edges.

Point-location animation stops at the first successful triangle. Preserve all incident roots for expansion on shared edges; displayed search counts are the first-success prefix, not a new early-exit solver. Wall subtraction is the separate `subtraction` scene; loading legacy expansion/subtract settings maps there. Tabs and keyboard shortcuts now cover 1–9. Use scene names rather than hardcoded tab numbers in reference text. Keep `Terms and acronyms` definitions reachable without overwriting the selected tab hash.

Tabs 2/3 are subtraction/expansion. Terrain selected-face state is shared; single-click selection must remain distinct from observer dragging and orbit. Main 3D wheel zoom is illustration-only and does not alter observer visibility. Air-cell wireframe opacity is independent of its visibility toggle. Family state overrides stale saved-tab geometry and observers; keep modes, phases, display and cameras local. Sampling resolution does not move the shared observer. Save files include all families, while `renderAt` intentionally remains a deterministic fixture API.

Operation accounting wraps synchronous functions and always restores bindings; never nest it or use instrumented timings. Count the named query/output, excluding drawing and error checks. Animated readouts select recorded solver-work prefixes for the currently displayed step, not complete totals or counts of render frames. Branch paths count their own processed entries; accumulated modes reach the full solve. Wall totals include separately counted repeated footprint preparation. Use query + recovery counts for angular samples. Benchmark calls are timed uninstrumented, with counts gathered separately; hide results when `benchmarkKey` differs from the current input.

Air modes are branch / expand / project; terrain-shadow modes are one / all; observer-view modes are project / accumulate. Detailed shadow traces expose actual overlap and partition checkpoints. Receiver-first viewport traversal clips all physical candidate triangles before testing every terrain occluder; never prefilter candidates by the completed visibility solution. Occluder-first and receiver-first modes share the depth-aware shadow kernel, with different counter/output scopes. Viewport candidates use near-depth 0.01 and four angular side planes; accumulated receivers run centroid-near→far in fixed +X, with independently selectable blocker order. Single-target focus can change its viewport domain. No-op blocker display batches retain actual cumulative work and highlight every tested candidate. The selected-facet trace uses event phase stops: 5% choose, 5% prepare, 25% continuous extension, 50% actual receiver checkpoints and 15% final hold. Next/previous step follows those stops rather than assuming uniform events. Neutral gray context must not expose a precomputed visibility solution. Urban counters retain the original artificial boundary receivers while physical area excludes them. Complete accumulated states replace the redundant result modes. Preserve selected-face handling and viewport framing in projection explanations. Beam detail framing must include the entire input face at every stage; keep its outline and matching vertex labels above context. Project current green faces and edges from the main scene, not the completed solve or gray replacements. Camera sliders show degrees with one decimal, while saved yaw/pitch remain radians for Astra compatibility. Separate illustration-camera movement from observer movement. Match ray/raster results against the same scene and sample domain; keep physical terrain area separate from projected pixels and bounded air volume. Reuse small scenes for regression checks. Preserve selectable HTML explanations and graphics-only SVG exports; avoid bitmap or canvas replacements for live diagrams.

Geometry and Samples has only Raycast / Raster methods. Its transport alone sets 2D rays 8–1024 or occupancy columns 8–128; matched six-face 3D grids use N=2–32 (24–6144 samples). Draw every sample without a cap; ray misses end at the display-domain boundary, and raster displays every pixel in its grid inset. Grid preparation predicates and discrete cell visits are separate from vector geometric tests; count only actual queries and physical recovery. Cost retains its separate arbitrary benchmark budgets. Source-to-facet teaching rays use `occlude:false` display guides; ordinary mesh/physical lines keep analytical display occlusion.
