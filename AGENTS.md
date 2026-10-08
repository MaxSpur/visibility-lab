# Visibility Lab orientation

This directory is its own Git repository. Stage only its files; parent seminar assets belong to other versions. The portable deliverable is `visibility-lab-v4.html`, built from `source/`; `index.html` preserves bookmarks for static-site hosting. Publishing remains a separate action.

Read [README](README.md) for usage, benchmark statistics and run/check commands. Current method equations, numerical limits and sources live in [reference notes](source/reference-notes.js) and [wall-shadow reference](source/wall-shadow-docs.js), rather than a parallel work log.

## Source boundaries

- [geometry.js](source/geometry.js) is the preserved Astra computational core, SHA-pinned by `tests/geometry-baseline.cjs`. Do not rewrite it for UI work.
- `point-location.js`, `wall-shadow2.js`, `shadow-stages.js` and the urban/terrain shadow stage modules implement recorded query prefixes. `projection-views.js` provides receiver-first viewport traversal; `terrain-views.js` owns terrain/beam figures and observer insets.
- `sample-comparison.js` owns independent occupancy/depth raster and raycast comparisons. `operation-counts.js` and `work-readouts.js` provide typed synchronous solver accounting.
- `benchmark-suite.js` owns seeded paired workloads, batch timing and statistical aggregation. `benchmark-controller.js` and `benchmark-worker.js` stream live work; `benchmark-data.js` embeds the compact saved suite via `build.py`; benchmark view modules own graphs. `scripts/generate-benchmarks.cjs` regenerates actual 50-position offline measurements. `benchmark-detail-suite.js` and `scripts/generate-terrain-benchmarks.cjs` provide the separate terrain-detail workload/compact asset. Build enforces base and detail-helper fingerprints. Keep saved/live and main/detail provenance separate.
- `shared-scenes.js` owns family observer/geometry state. `receiver-boundaries.js` cancels coplanar display seams. `svg-context.js` and `svg-world.js` handle native vectors and display occlusion separately from visibility.
- `controls.js`, `panels.js`, `runtime.js`, `exports.js`, `template.html` and `styles.css` own controls, routes, transport, export and layout.

Edit source, run `python3 build.py`, then commit the rebuilt HTML with its source. Do not replace live SVG with canvas or bitmap display. Fullscreen targets the document. Fit the demonstration at both 1920 × 1080 and 3840 × 2160; selectable explanations, two-line title space and graphics-only SVG export remain requirements.

## Checks and scratch

Use the numerical and browser commands in [README](README.md#develop-and-check); build consistency is `python3 build.py --check`. Geometry/SVG checks do not establish visible UI correctness. Browser tests resolve `PLAYWRIGHT_MODULE` or local Playwright; a standalone clone must not depend on parent assets or machine-specific paths. Serve this directory on `127.0.0.1:8764` for browser checks.

Scratch and screenshots go in ignored `.codex-scratch.nosync/`, dependencies in ignored `node_modules/`. Run real benchmark measurements alone after CPU-heavy checks finish. Hold unrelated numerical/native rendering while the saved suite is measured; retain raw source/runtime/date metadata and never substitute fixture timings for measured proof.

## Recurring invariants

Family state overrides stale tab geometry/observers. Modes, phases, display and illustration cameras stay local; orbit/zoom and sampling resolution never move the observer. Terrain face selection is shared and distinct from dragging. Save/load includes families; `renderAt` remains a deterministic fixture API. Tabs/shortcuts cover 1–8; Corner events stays an independent reference solver with no tab. Mode/dimension/search links and manual dropdowns must synchronize bookmark state.

Point-location playback ends at its first successful triangle, while the core still seeds every incident root on shared edges. Beams keep their apex at q; their detail inset fits the whole input face and overlays matching current-stage green fragments/vertex labels. Use neutral gray unsolved context. Construction-off building views contain only final shading. Single-face shadow traces use weighted real event stops; next/previous follows those stops, not uniform invented frames. Preserve the shared main/plan construction scene graph and result cut edges.

Occluder-first whole-terrain cuts and receiver-first viewport cuts share a depth-aware kernel but different output domains. Never prefilter viewport candidates by the finished viewshed. Physical area excludes sky/ceiling/domain caps; urban counters retain artificial boundary-receiver work. Source rays with `occlude:false` are inspection guides; ordinary physical lines retain display depth occlusion. The analysis ceiling encloses terrain and observer and is not a sky model.

Operation accounting wraps synchronous functions, restores bindings and must not nest or contaminate timed runs. Animated counters select recorded solver prefixes; drawing and mismatch checks are excluded. Ray/depth queries include physical footprint recovery where required; occupancy visits remain distinct from geometric predicates. Draw every sample, suppress the ordinary map grid for Raster, and include ray-search choice in caches/routes.

Benchmarks has no simulation mode or playback. Terrain detail uses paired XY positions across 48/192/432/768-triangle meshes, 25 saved observers per level and angular N=8/16/32; Plot selects the suite for Run. Its curves retain per-group intervals, not fitted complexity laws. Preserve the beam 80,000-entry guard and explicit failures; successful-only medians are conditional. Denser 1,200/2,048 pilots stay scratch diagnostics.

Seed controls reproducible observer proposals; legends hide/show methods and selected points expose exact details/demo links. The main saved suite uses 50 positions per geometry; live runs support 1–1,000, default 25, with seeded balanced paired positions and fixed geometry strata. Streams contain completed tests only; Stop preserves explicit partial coverage. Do not pool saved/live runtimes.

Query+recovery axes exclude setup: scene BVH is reusable; air-cell mesh/adjacency is measured separately per observer; shadow3 observer-distance occluder ordering is outside its query timer. Do not label all setup reusable or these curves first-query wall time. Raster timings are CPU teaching code, not GPU results. Calibrate fresh-solve batches to roughly 5 ms, normalize per solve and preserve raw metadata; never replace zero times with invented epsilon. Spatial IQR and stratified-bootstrap median CI (1,000 resamples) are different statistics. Completed/cancelled rows need at least two successful cases for CI; partial intervals reflect only available strata/case counts and must retain partial/failure coverage labels. The interval is conditional on this fixed geometry set and runtime, not a universal ranking or geometry-population guarantee. Log mismatch uses an explicit ≤10⁻⁸% numerical band without changing values. Undefined relative mismatch for zero-area viewport references is excluded from error statistics with counts; valid timings remain. See [README benchmark protocol](README.md#compare-benchmark-distributions) for interpretation.
