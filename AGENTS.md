# Visibility Lab orientation

This directory is its own Git repository. Work, commits and generated intermediates belong here. Do not stage parent-directory seminar assets. The deliverable is `visibility-lab-v4.html`; `index.html` is its static-site entrypoint. No publishing workflow is configured.

## Source map

- `source/geometry.js`: computational core preserved from Astra v3; its SHA is pinned in `tests/geometry-baseline.cjs`. UI work must preserve it.
- `source/point-location.js`: first-success display prefix; the core still collects all incident roots.
- `source/wall-shadow2.js`: independent planar wall subtraction; `source/wall-shadows.js`: its scene; `source/wall-shadow-docs.js`: its method-specific reference.
- `source/operation-counts.js`: synchronous typed solver accounting; `source/work-readouts.js`: workload UI, current-plan comparison and benchmark matching.
- `source/shared-scenes.js`: family observer/geometry state, per-plan observer memory, moving-demo anchors and settings persistence.
- `source/receiver-boundaries.js`: display union boundaries on whole coplanar receivers; cancel fragment seams before outlining shadow cuts.
- `source/svg-context.js`, `source/svg-world.js`: native vector primitives and display occlusion.
- `source/scenes.js`: demonstrations and benchmarks; `source/reference-notes.js`: explanations and scientific sources.
- `source/panels.js`, `source/controls.js`: explanations and controls. Mode dropdown precedes the title except on the single-sequence Shadow construction tab; statistics anchor above the legend.
- `source/exports.js`, `source/runtime.js`: vector/PNG exports, saved settings and interactions.
- `source/template.html`, `source/styles.css`: page structure and responsive styling.

Edit source modules, then `python3 build.py`; commit the rebuilt HTML with source changes. README is user-facing. Keep detailed implementation commentary beside relevant code or tests rather than adding work logs.

## Validation

Run `python3 build.py --check`, `node tests/geometry-baseline.cjs`, `node tests/svg-world.test.cjs`, `node tests/receiver-boundaries.test.cjs`, `node tests/wall-shadow2.test.cjs` and `node tests/operation-counts.test.cjs`. Serve this directory with `python3 -m http.server 8764 --bind 127.0.0.1`, then run `node tests/layout.cjs`, `node tests/interface.cjs`, `node tests/shared-ui.cjs`, `node tests/shadows.cjs`, `node tests/expansion.cjs`, `node tests/shared-scenes.cjs` and `node tests/operation-readouts.cjs`. Browser tests resolve `PLAYWRIGHT_MODULE` or local `playwright`. Inspect both 1080p and 4K layouts plus exported graphics. Build checks do not substitute for visible interaction checks.

Scratch, screenshots and test downloads go in ignored `.codex-scratch.nosync/`; development dependencies go in ignored `node_modules/`. Tests must work from a standalone clone without parent assets or machine-specific module paths.

## Recurring gotchas

Shadow construction uses one scene graph for its 3D and plan views. `construction:false` always shows final shading and disables animation; it must omit silhouette, extrusion and receiver-cut lines. The plan uses orthographic top-view occlusion, so vertical faces project to edges.

Point-location animation stops at the first successful triangle. Preserve all incident roots for expansion on shared edges; displayed search counts are the first-success prefix, not a new early-exit solver. Wall subtraction is the separate `subtraction` scene; loading legacy expansion/subtract settings maps there. Tabs and keyboard shortcuts now cover 1–9. Use scene names rather than hardcoded tab numbers in reference text. Keep `Terms and acronyms` definitions reachable without overwriting the selected tab hash.

Tabs 2/3 are subtraction/expansion. Family state overrides stale saved-tab geometry and observers; keep modes, phases, display and cameras local. Use `effectiveObserverState` for moving demonstrations; departure and saved settings preserve the displayed position. Save files include all families, while `renderAt` intentionally remains a deterministic fixture API.

Operation accounting wraps synchronous functions and always restores bindings; never nest it or use instrumented timings. Count the named query/output, excluding drawing and error checks. Wall full-solve totals include separately counted repeated footprint preparation. Use query + recovery counts for angular samples. Benchmark calls are timed uninstrumented, with counts gathered separately; hide results when `benchmarkKey` differs from the current input.

Camera sliders show degrees with one decimal, while saved yaw/pitch remain radians for Astra compatibility. Separate illustration-camera movement from observer movement. Match ray/raster results against the same scene and sample domain; keep physical terrain area separate from projected pixels and bounded air volume. Reuse small scenes for regression checks. Preserve selectable HTML explanations and graphics-only SVG exports; avoid bitmap or canvas replacements for live diagrams.
