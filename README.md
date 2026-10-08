# Geometric Visibility Lab

An interactive laboratory for explaining continuous visibility, shadows, triangle expansion and sampling in 2D and 3D. The synthetic examples are intended for seminar demonstrations and slide illustrations.

## Open the lab

Open `visibility-lab-v4.html` directly in a browser. The single HTML file works offline without installation or network access. Alternatively, serve this directory:

```sh
python3 -m http.server 8764 --bind 127.0.0.1
```

Then open [the lab](http://127.0.0.1:8764/). `index.html` forwards to the lab while preserving query parameters and the URL fragment. The repository can serve as a static GitHub Pages site; publishing and repository settings are separate steps.

## Use the demonstrations

Choose a tab. Shadow construction has one sequence: its plan inset follows the same stage and projects the highlighted faces, silhouettes, and extrusions from above. Turn off **Show construction** for the final shaded ground, roofs, and walls, without construction geometry or cut outlines. Other tabs offer a mode dropdown above the explanation title. Play, scrub the progress slider, or use Previous / Next step to examine the sequence. Larger titles and step explanations accompany the diagram; statistics sit immediately above its legend. Hide the explanation panel to enlarge the graphic. **Full screen** expands the whole page, including controls; Esc exits.

Drag the purple observer to move it. Drag a 3D background to rotate the illustration naturally with horizontal pointer movement. Camera angle controls display degrees to one decimal place, with a full azimuth circle and elevations from 1° to 89°; settings files continue to store radians for compatibility with Astra v3. Keys 1–9 select tabs, Space plays or pauses, and arrow keys step through a construction.

Plan tabs share the selected geometry and observer; each plan remembers its last observer position. Terrain tabs share terrain detail, observer position, eye height and ceiling. The building source is independent and shared by its 3D view and plan inset. Switching tabs preserves their demonstration modes and illustration cameras. Moving or resetting the observer and changing geometry updates the other views in that scene family.

The lab covers building shadows, continuous wall-shadow subtraction, 2D triangle expansion and point location, terrain beams through air cells, terrain-face shadow cuts, projected terrain fragments, geometry versus sampled surfaces, computational effort, and angular events. Wall subtraction precedes triangle expansion and requires only polygon boundaries. Point-location playback ends at the first containing triangle. Detailed explanations, implementation equations, precision limits, computational effort and sources are below each demonstration. A shared Terms and acronyms section defines abbreviations.

Every tab reports geometric tests and polygon/segment clipping passes for its named calculation. Hover over test totals for the breakdown. These are workload counts with different costs, rather than processor instructions. Search-only and one-face modes state their narrower scope; full constructions retain complete-solve counts during animation. Geometry/sample readouts include sample reconstruction. The 2D measured comparison includes wall subtraction and triangle expansion on matching input; each method's reference section also compares their current counts. Benchmark results are shown only while observer, geometry and sample settings match the measured run.

## Export illustrations

**Save SVG** exports editable vectors. Choose graphics alone or graphics with the current explanation panel. **Save PNG** rasterizes the same export at 3840 pixels wide. Save / Load settings preserves the current configuration and observers across scene families, and accepts existing Astra v3 settings. Video recording is not included.

## Accuracy and limits

Continuous polygons use floating-point arithmetic and omit tangential zero-area features; they are not certified exact arithmetic. Terrain is synthetic and has no overhangs, vegetation, Earth curvature or refraction. Geometry, directional sampling, surface sampling and rasterization produce different approximations; the benchmark reports local CPU JavaScript work, not a universal performance ranking.

SVG occlusion handles opaque display surfaces separately from the visibility calculation. Transparent construction faces use depth ordering. Dense sample displays can draw more slowly; calculated sample counts are distinct from the rays actually drawn. Screen layout is checked at 1920 × 1080 and 3840 × 2160.

## Develop and check

Run commands from this repository directory. Python 3 builds the self-contained deliverable; Node runs geometry and SVG checks:

```sh
python3 build.py
python3 build.py --check
node tests/geometry-baseline.cjs
node tests/svg-world.test.cjs
node tests/receiver-boundaries.test.cjs
node tests/wall-shadow2.test.cjs
node tests/operation-counts.test.cjs
```

Browser tests require Playwright and Chromium. Use an existing installation by setting `PLAYWRIGHT_MODULE` to its module path, or install development tools locally:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

With the preview server running on port 8764:

```sh
node tests/layout.cjs
node tests/interface.cjs
node tests/shared-ui.cjs
node tests/shadows.cjs
node tests/expansion.cjs
node tests/shared-scenes.cjs
node tests/operation-readouts.cjs
```

Tests write screenshots and downloads to the ignored `.codex-scratch.nosync/` directory. Geometry checks pin the original computational core and exercise independent invariants; when the original Astra HTML is present in the parent directory, they additionally compare its outputs. See [AGENTS.md](AGENTS.md) for source orientation and editing conventions.
