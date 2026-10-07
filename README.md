# Geometric Visibility Lab v4

Open `visibility-lab-v4.html` in a browser. It is a portable, offline file with no installation or network dependencies. This version is based on the root-level `visibility-lab-v3-astra.html`.

The demonstration occupies one screen at 3840 × 2160 and 1920 × 1080. **Full screen** expands the whole page, including tabs and controls. Detailed method notes remain below the demonstration during normal browsing. Escape exits fullscreen.

Drag the purple observer to move it, or drag a 3D background to orbit the illustration camera. Use the progress slider or Previous / Next step to inspect a construction. Keys 1–8 select a tab, Space plays or pauses, and the arrow keys step through the construction.

The live diagrams are native SVG and the adjacent explanations are selectable HTML. Titles reserve two lines so explanation text stays in place. Use the bottom **Explanation panel** checkbox to give the diagram more room.

**Save SVG** exports editable vector graphics. The export selector chooses graphics alone or graphics with the current explanation. **Save PNG** rasterizes that same export at 3840 pixels wide. Recording controls have been removed. Save / Load settings preserves the demonstration configuration; existing Astra v3 settings are accepted.

The visibility calculations and scientific examples are preserved from Astra v3. SVG display clipping handles opaque occlusion separately from the visibility calculations. Transparent construction faces use the same depth ordering as the baseline. Very dense sample displays can take longer to draw; calculated sample counts remain separate from the number of rays drawn.

## Editing and validation

Edit the files in `source/`, then run `python3 visibility-lab-v4/build.py` from the project root. The builder embeds the styles and scripts into the portable HTML. `--check` verifies that the deliverable matches its sources.

`geometry.js` contains the preserved computational core; `svg-context.js` and `svg-world.js` draw vector graphics; `scenes.js` defines demonstrations and benchmarks; `panels.js`, `controls.js`, `exports.js`, and `runtime.js` handle the interface. `reference-notes.js` contains method explanations and source links.

Run `node visibility-lab-v4/tests/geometry-baseline.cjs` and `node visibility-lab-v4/tests/svg-world.test.cjs` to check computational equivalence and vector occlusion. Browser layout and interaction checks are in `tests/layout.cjs` and `tests/interface.cjs`; they use the bundled Playwright runtime. Start their development preview with `python3 -m http.server 8764 --bind 127.0.0.1 --directory visibility-lab-v4` from the project root. Generated screenshots, downloads and reports go in `.codex-scratch.nosync/v4/`.
