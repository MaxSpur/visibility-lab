# Visibility Lab orientation

This directory is its own Git repository. Work, commits and generated intermediates belong here. Do not stage parent-directory seminar assets. The deliverable is `visibility-lab-v4.html`; `index.html` is its static-site entrypoint. No publishing workflow is configured.

## Source map

- `source/geometry.js`: computational core preserved from Astra v3; its SHA is pinned in `tests/geometry-baseline.cjs`. UI work must preserve it.
- `source/svg-context.js`, `source/svg-world.js`: native vector primitives and display occlusion.
- `source/scenes.js`: demonstrations and benchmarks; `source/reference-notes.js`: explanations and scientific sources.
- `source/panels.js`, `source/controls.js`: explanations and controls. Mode dropdown precedes the title; statistics anchor above the legend.
- `source/exports.js`, `source/runtime.js`: vector/PNG exports, saved settings and interactions.
- `source/template.html`, `source/styles.css`: page structure and responsive styling.

Edit source modules, then `python3 build.py`; commit the rebuilt HTML with source changes. README is user-facing. Keep detailed implementation commentary beside relevant code or tests rather than adding work logs.

## Validation

Run `python3 build.py --check`, `node tests/geometry-baseline.cjs` and `node tests/svg-world.test.cjs`. Serve this directory with `python3 -m http.server 8764 --bind 127.0.0.1`, then run `node tests/layout.cjs`, `node tests/interface.cjs` and `node tests/shared-ui.cjs`. Browser tests resolve `PLAYWRIGHT_MODULE` or local `playwright`. Inspect both 1080p and 4K layouts plus exported graphics. Build checks do not substitute for visible interaction checks.

Scratch, screenshots and test downloads go in ignored `.codex-scratch.nosync/`; development dependencies go in ignored `node_modules/`. Tests must work from a standalone clone without parent assets or machine-specific module paths.

## Recurring gotchas

Camera sliders show degrees with one decimal, while saved yaw/pitch remain radians for Astra compatibility. Separate illustration-camera movement from observer movement. Match ray/raster results against the same scene and sample domain; keep physical terrain area separate from projected pixels and bounded air volume. Reuse small scenes for regression checks. Preserve selectable HTML explanations and graphics-only SVG exports; avoid bitmap or canvas replacements for live diagrams.
