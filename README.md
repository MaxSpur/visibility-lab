# Geometric Visibility Lab

An interactive laboratory for explaining continuous visibility, shadows, triangle expansion and sampling in 2D and 3D. The synthetic examples are intended for seminar demonstrations and slide illustrations.

## Open the lab

Open `visibility-lab-v4.html` directly in a browser. The single HTML file works offline without installation or network access. Alternatively, serve this directory:

```sh
python3 -m http.server 8764 --bind 127.0.0.1
```

Then open [the lab](http://127.0.0.1:8764/). `index.html` forwards to the lab while preserving query parameters and the URL fragment. The repository can serve as a static GitHub Pages site; publishing and repository settings are separate steps.

## Use the demonstrations

Choose a tab and its demonstration mode above the explanation title; Geometry and samples instead selects Raycast or Raster there. Shadow construction offers silhouette construction and detailed facet-by-facet shadow subtraction. Its plan inset follows the same stage and projects the highlighted faces, overlaps, and extrusions from above. Turn off **Show construction** for the final shaded ground, roofs, and walls, without construction geometry or cut outlines. Play, scrub the progress slider, or use Previous / Next step to examine the sequence. Larger titles and step explanations accompany the diagram; statistics sit immediately above its legend. Hide the explanation panel to enlarge the graphic. **Full screen** expands the whole page, including controls; Esc exits.

Drag the purple observer to move it. Drag a 3D background to rotate the illustration naturally with horizontal pointer movement. Scroll over the main 3D view to zoom without moving the observer. Camera angle controls display degrees to one decimal place, with a full azimuth circle and elevations from 1° to 89°; settings files continue to store radians for compatibility with Astra v3. Keys 1–9 select tabs, Space plays or pauses, and arrow keys step through a construction.

Plan tabs share the selected geometry and observer; each plan remembers its last observer position. Terrain tabs share terrain detail, observer position, eye height, ceiling and selected terrain triangle. Single-click a triangle in a selected-target beam or observer-view explanation, or the single-face shadow mode, to choose it; clicking does not move the observer. The building source is independent and shared by its 3D view and plan inset. Switching tabs preserves their demonstration modes and illustration cameras. Moving or resetting the observer and changing geometry updates the other views in that scene family.

The lab covers building shadow construction and subtraction, continuous wall-shadow subtraction, 2D triangle expansion and point location, terrain beams through air cells, terrain-face shadow cuts, projected terrain fragments, geometry versus sampled surfaces, computational effort, and angular events. Wall subtraction precedes triangle expansion and requires only polygon boundaries. Point-location playback ends at the first containing triangle. Detailed explanations, implementation equations, precision limits, computational effort and sources are below each demonstration. A shared Terms and acronyms section defines abbreviations.

Every tab reports geometric tests and polygon/segment clipping passes for its named calculation. Detailed building and terrain shadow modes expose preparation, actual overlap, and retained-fragment checkpoints for each occluder; misses perform rejection work without creating a cut. Hover over test totals for the breakdown. These are workload counts with different costs, rather than processor instructions. Search-only and one-face modes state their narrower scope; construction readouts advance through the recorded operations at the current slider stage. At completion they include the work needed for the displayed result; rewinding restores the earlier count. Geometry/sample readouts include sample reconstruction. The 2D measured comparison includes wall subtraction and triangle expansion on matching input; each method's reference section also compares their current counts. Benchmark results are shown only while observer, geometry and sample settings match the measured run.

The Terrain: beams tab offers a single beam path, accumulation of all beams, and a projected-cut explanation using the same main view and insets. Its observer detail centers on the current shared face, surviving opening or clipped cell while keeping the whole input face visible. Green filled geometry and cut edges match the main view; matching vertex letters identify the original face and its new cut vertices. The input face is drawn above the terrain for inspection. The plan projects the same construction geometry from above. The complete air-cell wireframe has a separate opacity control. Accumulating all beams and subtracting all terrain shadows finish at their complete viewsheds, so separate finished-state modes are unnecessary.

Terrain: shadow cuts offers a selected occluder with a continuous extrusion followed by real receiver-by-receiver tests. Previous / Next step follows exact stage checkpoints. It also offers full face-by-face subtraction with four illustrative stages per occluder. Terrain in the view instead follows one receiver through viewport clipping, then blocker preparation, actual shadow overlaps and fragment partitioning, before final acceptance. Candidate blockers are highlighted while tested, including grouped blockers making no cut; their recorded rejection work remains in the readout. Construction rays continue back to the observer. Its accumulated mode processes every receiver intersecting a fixed +X viewport, including candidates later found fully hidden. Receivers run near to far; blocker order is selectable. Target detail optionally aims the single-target mode toward its chosen face, but accumulation always keeps the fixed forward viewport. Gray terrain provides context; green marks retained or accepted pieces. Completed targets contribute only their green visible pieces. Both tabs use depth-aware geometric shadow subtraction; their traversal and output domains differ. The viewport mode reports physical visible terrain area within its viewport, while the full shadow modes cover the whole terrain scene. Their counters use the same operation types with clearly named scopes. Viewport work includes geometric candidate clipping and excludes screen drawing. Building-shadow counters also include the artificial bounding surfaces of that scene; their physical area readout excludes those boundaries.

Geometry and samples selects **Raycast** or **Raster**. Its progress slider is the sole resolution control: 8–1,024 rays or 8–128 raster columns in 2D, and matched six-face angular grids from N=2 to N=32 in 3D (24–6,144 samples). Raycast draws all directions, including sky misses ending at the scene display box. Raster shows every query cell in its grid and does not simulate pixel queries with drawn rays. The 2D raster classifies building occupancy at cell centers and traverses that grid; its obstacle quantization can lose thin walls or change narrow gaps. Raycast also retains the 2D wall-length/open-direction measurement; Raster uses area. The 3D depth raster independently projects terrain into the same cells used by angular rays. Overlay or side-by-side, hidden-surface comparison, sampled-cell edges and illustrative shadow envelopes remain available for 3D. Both reconstruct physical terrain footprints for area comparison, with query work and reconstruction work reported separately. Occupancy-grid visits are their own workload, not geometric tests. **Effort and raster** retains its independent benchmark budgets and wider count controls.

## Export illustrations

**Save SVG** exports editable vectors. Choose graphics alone or graphics with the current explanation panel. **Save PNG** rasterizes the same export at 3840 pixels wide. Save / Load settings preserves the current configuration and observers across scene families, and accepts existing Astra v3 settings. Video recording is not included.

## Accuracy and limits

Continuous polygons use floating-point arithmetic and omit tangential zero-area features; they are not certified exact arithmetic. Terrain is synthetic and has no overhangs, vegetation, Earth curvature or refraction. Geometry, directional sampling, surface sampling and rasterization produce different approximations; the benchmark reports local CPU JavaScript work, not a universal performance ranking.

SVG occlusion handles opaque display surfaces separately from the visibility calculation. Transparent construction faces use depth ordering. Dense sample displays can draw more slowly. Geometry and samples draws every raycast direction or raster cell, according to the chosen method; benchmark query counts and displayed explanatory geometry can have different scopes. Screen layout is checked at 1920 × 1080 and 3840 × 2160.

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
node tests/operation-progress.test.cjs
node tests/shadow-stages.test.cjs
node tests/terrain-shadow-stages.test.cjs
node tests/projection-workflow.test.cjs
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
node tests/terrain-interactions.cjs
node tests/terrain-views.cjs
node tests/projection.cjs
```

Tests write screenshots and downloads to the ignored `.codex-scratch.nosync/` directory. Geometry checks pin the original computational core and exercise independent invariants; when the original Astra HTML is present in the parent directory, they additionally compare its outputs. See [AGENTS.md](AGENTS.md) for source orientation and editing conventions.
