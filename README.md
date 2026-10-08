# Geometric Visibility Lab

An interactive laboratory for explaining continuous visibility, shadows, triangle expansion and sampling in 2D and 3D. The synthetic examples are intended for seminar demonstrations and slide illustrations.

## Open the lab

Open `visibility-lab-v4.html` directly in a browser. The single HTML file works offline without installation or network access. Alternatively, serve this directory:

```sh
python3 -m http.server 8764 --bind 127.0.0.1
```

Then open [the lab](http://127.0.0.1:8764/). `index.html` forwards to the lab while preserving query parameters and the URL fragment. The repository can serve as a static GitHub Pages site; see [deployment instructions](DEPLOYMENT.md) for publishing and repository settings.

## Use the demonstrations

Choose a tab and its demonstration mode above the explanation title; Geometry vs Raster instead selects Raycast or Raster there. Benchmarks presents graphs without demonstration modes or playback. Shadow construction offers silhouette construction and detailed facet-by-facet shadow subtraction. Its plan inset follows the same stage and projects the highlighted faces, overlaps, and extrusions from above. Turn off **Show construction** for the final shaded ground, roofs, and walls, without construction geometry or cut outlines. Play, scrub the progress slider, or use Previous / Next step to examine the sequence. Larger titles and step explanations accompany the diagram; statistics sit immediately above its legend. Hide the explanation panel to enlarge the graphic. **Full screen** expands the whole page, including controls; Esc exits.

Drag the purple observer to move it. Drag a 3D background to rotate the illustration naturally with horizontal pointer movement. Scroll over the main 3D view to zoom without moving the observer. Camera angle controls display degrees to one decimal place, with a full azimuth circle and elevations from 1° to 89°; settings files continue to store radians for compatibility with Astra v3. Keys 1–8 select tabs, Space plays or pauses, and arrow keys step through a construction.

Plan tabs share the selected geometry and observer; each plan remembers its last observer position. Terrain tabs share terrain detail, observer position, eye height, ceiling and selected terrain triangle. Single-click a triangle in a selected-target beam or observer-view explanation, or the single-face shadow mode, to choose it; clicking does not move the observer. The building source is independent and shared by its 3D view and plan inset. Switching tabs preserves their demonstration modes and illustration cameras. Moving or resetting the observer and changing geometry updates the other views in that scene family.

The lab covers building shadow construction and subtraction, continuous wall-shadow subtraction, 2D triangle expansion and point location, terrain beams through air cells, terrain-face shadow cuts, projected terrain fragments, geometry versus raycast/raster surfaces, and statistical benchmarks. Wall subtraction precedes triangle expansion and requires only polygon boundaries. Point-location playback ends at the first containing triangle. Detailed explanations, implementation equations, precision limits, computational effort and sources are below each demonstration. A shared Terms and acronyms section defines abbreviations.

Every tab reports geometric tests and polygon/segment clipping passes for its named calculation. Detailed building and terrain shadow modes expose preparation, actual overlap, and retained-fragment checkpoints for each occluder; misses perform rejection work without creating a cut. Hover over test totals for the breakdown. These are workload counts with different costs, rather than processor instructions. Search-only and one-face modes state their narrower scope; construction readouts advance through the recorded operations at the current slider stage. At completion they include the work needed for the displayed result; rewinding restores the earlier count. Geometry/sample readouts include sample reconstruction. The 2D measured comparison includes wall subtraction and triangle expansion on matching input; each method's reference section also compares their current counts. Benchmarks uses its own saved or live sampled suite, independent of the current demonstration observer or selected geometry.

The Terrain: beams tab offers a single beam path, accumulation of all beams, and a projected-cut explanation using the same main view and insets. Its observer detail centers on the current shared face, surviving opening or clipped cell while keeping the whole input face visible. Green filled geometry and cut edges match the main view; matching vertex letters identify the original face and its new cut vertices. The input face is drawn above the terrain for inspection. The plan projects the same construction geometry from above. The complete air-cell wireframe has a separate opacity control. Accumulating all beams and subtracting all terrain shadows finish at their complete viewsheds, so separate finished-state modes are unnecessary.

Terrain: shadow cuts offers a selected occluder with a continuous extrusion followed by real receiver-by-receiver tests. Previous / Next step follows exact stage checkpoints. It also offers full face-by-face subtraction with four illustrative stages per occluder. Terrain in the view instead follows one receiver through viewport clipping, then blocker preparation, actual shadow overlaps and fragment partitioning, before final acceptance. Candidate blockers are highlighted while tested, including grouped blockers making no cut; their recorded rejection work remains in the readout. Construction rays continue back to the observer. Its accumulated mode processes every receiver intersecting a fixed +X viewport, including candidates later found fully hidden. Receivers run near to far; blocker order is selectable. Target detail optionally aims the single-target mode toward its chosen face, but accumulation always keeps the fixed forward viewport. Gray terrain provides context; green marks retained or accepted pieces. Completed targets contribute only their green visible pieces. Both tabs use depth-aware geometric shadow subtraction; their traversal and output domains differ. The viewport mode reports physical visible terrain area within its viewport, while the full shadow modes cover the whole terrain scene. Their counters use the same operation types with clearly named scopes. Viewport work includes geometric candidate clipping and excludes screen drawing. Building-shadow counters also include the artificial bounding surfaces of that scene; their physical area readout excludes those boundaries.

Geometry vs Raster selects **Raycast** or **Raster**. Its progress slider is the sole resolution control. In 2D, Raycast uses 8–1,024 directions and Raster uses 8–128 occupancy columns. Occupancy traversal can lose thin walls or change narrow gaps; the ordinary map grid is hidden to keep its texels clear. Raycast retains the wall-length/open-direction measurement.

In 3D, **Raster** is a visibility texture on the terrain: 8–256 columns across 100 m and round(0.7N) rows across 70 m. Grid nodes sample the original terrain elevation. A bilinear height grid supplies each texel-center target. Every crossed cell is tested along its line of sight, including an analytical maximum of the quadratic height difference within that cell. This avoids jumping over a ridge between occasional samples. The target's result colors every texel piece draped over the original terrain triangles, producing visible/hidden coverage without angular reconstruction holes. Physical area measures those sloping pieces, rather than pixel counts; within-texel boundaries and grid-relief interpolation remain approximations.

**Raycast** uses six camera faces with N=2–256 centers per side. The actual count is **R=6N²**, up to **393,216 rays**. Each first terrain hit seeds a connected terrain sheet inside its angular cell. Recovery crosses genuine shared triangle edges and stops at back-facing silhouettes, sky cells and disconnected layers. This removes gaps caused solely by assigning a cell to one source triangle; finite angular sampling can still miss or extend occlusion boundaries. Raycast intersects the exact original terrain, whereas Raster queries the interpolated height grid.

**Draw rays** selects all calculated directions, terrain hits only, or none. It changes illustration work, never the calculation. The six-face inset always shows every hit/sky center and states both N and the full R count. Exact SVG row runs represent dense hit masks without a separate element per cell. Depth raster's historical results remain archived; it is no longer a demonstration or current comparison curve.

The raster traversal caches each bilinear cell’s coefficients and target elevation; physical recovery reuses cached texel areas. In an isolated Node.js check on the same 192-triangle mesh and five observers, N=128 query medians fell from 33.0 to 6.95 ms and recovery from 1.87 to 0.164 ms, with identical texel classifications. Preparation was essentially unchanged. These matched optimization checks are separate from the stored observer-distribution benchmarks. Dense displays also reuse compound SVG paths and exact texture row runs.

Continuous references are teal. Samplers use distinct warm colors: gold for linear Raycast, orange for indexed Raycast and raspberry for Raster. Overlay, side-by-side and hidden-surface views share the same physical input and observer. Height-grid/texel-map preparation and ray adjacency/indexing are reusable for a fixed geometry. Occupancy visits, terrain-height evaluations and ray intersections are distinct operations, not interchangeable instructions. These central-processor implementations do not measure graphics hardware.

Ray queries reuse a flattened hierarchy, scalar intersections and a traversal stack, preserving sampled hits and traversal counts. Ray display textures cancel internal edges into area-checked compound SVG paths, retaining holes and depth occlusion; numerical fragments and mismatch remain unchanged. Raster outlines follow changes in the texture mask, removing internal source-face seams.

## Compare benchmark distributions

**Benchmarks** opens with **Saved statistics**, a saved offline measurement suite, so its graphs are available immediately without rerunning every query. The saved suite uses 50 valid observers per geometry across all three plans and three terrain meshes. Its source fingerprint, runtime and measurement date identify where the numbers came from. The original statistics assets are preserved. Their computational fingerprint is checked against the preserved sources, including the frozen sampler used for those measurements; appended measurements carry separate source fingerprints. Saved measurements describe that runtime; they are not timings of the browser currently displaying them.

Revised 3D sampler statistics use 25 paired observers per geometry, reusing the original observer prefixes. Both Raycast searches are saved at angular N=4, 8, 16, 32, 64 and 128; surface Raster is saved at N=8, 16, 32, 64, 128 and 256. Interactive Raycast also offers N=256, which exceeded the stored-run time budget in the high-resolution pilot. Selective replacement assets time the updated Raycast query/reconstruction and terrain Raster, without retiming unchanged geometry or 2D methods. Current plots use these revised rows in place of historical methods of the same name. Original measurements and the completed legacy append remain stored separately; **Archive** retains their historical source/runtime metadata. They are not pooled with the revised distributions. Real individual points come from retained raw captures or the new measurements, without synthetic scatter.

Use the lower **New browser run** panel to create **Live results**. **Quick** selects three positions on one plan and one coarse terrain, 36 tests, one timed batch, a 20-second cooperative budget and at most 100 completed tests. **Standard** starts with 25 positions per selected geometry; **Custom** supports 1–1,000 positions. Expand **Methods, geometries and limits** to choose methods, geometry groups or paired terrain levels, minimum/maximum resolutions, timed batches, calibration duration/call cap, bootstrap resamples, and time/test budgets. Zero removes a budget or disables bootstrap resampling. Resolution ranges include powers of two between their limits, and the panel shows the exact selected test count before execution. The seed control makes observer proposals reproducible. Seeded uniform proposals sample valid free-space observer positions in each plan and positions above each terrain surface. Each method uses the same observer cases within its analytical domain. All selected geometries receive the same requested number of observers, keeping their contribution balanced. More positions cover more spatial variation, but cannot establish performance on different geometries, hardware or production implementations.

Live work runs in a background worker and streams each completed test into the charts. **Stop** keeps completed measurements as a labeled partial result; it does not fabricate the missing cases or finish their queries. Completed/expected counts describe coverage. Partial medians can move as harder cases arrive. Live and saved suites retain separate provenance; the lab does not pool measurements from different runtimes into one distribution. **Export results** saves the selected dataset as JSON. Live exports include raw case timings and batch counts; saved exports contain compact statistics, actual individual cloud points, workload configuration and source information, rather than the complete raw timing batches.

In the saved standard protocol, each case has one warmup and discarded calibration followed by three timed batches of fresh solves. Browser runs retain their chosen batch and calibration settings; a time budget is checked between tests, so a single test and final statistics can extend it. Fast calls are batched to exceed the browser clock's resolution; each batch duration is divided by its solve count. Slower methods can use a single solve per batch. Setup/preparation and physical-output reconstruction are identified separately; drawing and mismatch evaluation are excluded. Query + recovery axes exclude first-query setup costs. Bounding volume hierarchy setup is reusable on a fixed scene; air cells and adjacency are prepared separately for each observer because the ceiling can depend on that observer. The terrain shadow-cut benchmark computes its observer-distance occluder ordering before its timed query; that ordering cost is excluded. Wrapper-based operation counts are collected separately; samplers retain their intrinsic query and traversal counters inside the measured implementation. Methods include wall-shadow subtraction, triangle expansion, terrain beams, terrain shadow cuts, receiver-first viewport cuts, building receiver subtraction, Raycast with a bounding volume hierarchy or linear scan, and independent occupancy Raster and terrain-surface Raster. Three-dimensional Raycast uses angular centers and connected physical terrain sheets; terrain-surface Raster uses world-grid texel centers and a distinct footprint. Raster is this lab’s central-processor teaching implementation, not a graphics-processor measurement. Links in the selected-point details, Overview and tables open the corresponding demonstrations.

**Time vs mismatch** is the default plot and shows the tradeoff directly; **Overview** separates methods and resolutions for readable labels. Timing and mismatch axes each offer **Logarithmic** or **Linear** scales. A logarithmic axis cannot represent zero: zero occupies a separate boundary band. In logarithmic mismatch plots, values at or below 10⁻⁸% occupy an explicit numerical-tolerance/zero band; their measured values remain unchanged. Click a legend item to hide or show its method, use **Show all methods** to restore the full comparison, and select a point for its exact statistics and matching demonstration link. Hover over a summary point or line for immediate inline labels. Click it to highlight just that curve, show all its resolution labels, and emphasize its name in the legend. Click empty plot space or press Esc to clear the selection. Chart types, axes, interval choices and cloud/ribbon toggles sit above the plots, separately from new-run settings. Squares denote Raster, diamonds Raycast, circles shadow subtraction and triangles beam/triangle expansion. Minor lines divide logarithmic decades. Filled intervals can be toggled independently of whiskers; Individual measurements adds visible small real case points, including each completed live test. Read the marker details and intervals along with the scale.

Medians summarize per-position measurements. **Observer spread (quartiles)** shows spatial variation between the 25th and 75th percentiles. **Median uncertainty (95%)** shows a percentile bootstrap interval from 1,000 resamples of observers within each fixed geometry. This estimates uncertainty under that particular observer-sampling design, conditional on the three supplied plans or three supplied terrain meshes and the measured runtime. It does not estimate uncertainty over all possible environments or promise a universal ranking. Few observers give weak coverage and unreliable or degenerate intervals. Completed or cancelled rows can show an interval once at least two successful cases are available. A stopped run can have unbalanced or missing geometry coverage; its interval concerns only that limited completed subset and remains labeled partial. Each row shows its successful case and failure counts.

Whole-plan, whole-terrain, building and viewport outputs remain separate scopes. A restricted viewport is not a full viewshed. Mismatch compares physical symmetric-difference area against the matching continuous reference; agreement in total area alone does not prove identical boundaries. When the viewport has no visible reference area, relative mismatch is undefined and excluded from error summaries with its count shown; its timing remains valid. Current-tab explanations are separate from general method guidance, glossary and scientific sources below the figure.

### Terrain detail

**Terrain detail** uses a separate saved compact suite with 25 paired physical XY observer positions at each of 48, 192, 432 and 768 terrain triangles. All meshes sample the same synthetic relief; each observer stands 8 m above that mesh's interpolated surface at the same XY position. This separates changes in discretization from changes in where the observer stands.

The time–mismatch curves show all measured methods, with warm sampler colors, cool geometry colors and line patterns for mesh levels. Its vertical legend toggles each method. The growth graph compares query plus physical recovery time against triangle count at a selected grid side N, including higher levels where measured. Raycast uses R=6N² directions; surface Raster uses N × round(0.7N) terrain texels. A method without a measurement at the selected level is omitted; N=32 is the common default. The captions and selected-point details report actual sample counts, not equal computational budgets. Each mesh/method/resolution group retains its own observer quartiles and 95% bootstrap median interval. These curves exclude separately identified scene/observer setup, including indexing, air-cell construction and shadow occluder ordering; they are not total first-query wall-clock times. No curve is a fitted or published computational-complexity law: mesh changes can alter visibility, fragments and traversal difficulty as well as the input count.

**Run in this browser** measures the suite selected by Plot. Main-suite and Terrain-detail saved/live results remain separate, with their own source/runtime metadata. The detail asset has both the base computational fingerprint and its helper fingerprint. The original asset remains preserved; revised methods are measured in separate replacement assets with their own fingerprints and provenance.

The beam implementation stops a query above 80,000 traversal entries. This is a teaching-implementation limit, not a physical visibility rule or a bound for published beam algorithms. Failed tests retain their diagnostics and counts and contribute no invented zero times. Successful-case medians and intervals are conditional on the surviving cases; a rising failure rate can make those medians look deceptively favorable. The 1,200- and 2,048-triangle pilot runs are scratch diagnostics rather than displayed benchmark evidence.

## Export illustrations

**Save SVG** exports editable vectors. Choose graphics alone or graphics with the current explanation panel. **Save PNG** rasterizes the same export at 3840 pixels wide. Save / Load settings preserves the current configuration and observers across scene families, and accepts existing Astra v3 settings. Video recording is not included.

## Accuracy and limits

Continuous polygons use floating-point arithmetic and omit tangential zero-area features; they are not certified exact arithmetic. Terrain is synthetic and has no overhangs, vegetation, Earth curvature or refraction. Connected angular reconstruction remains approximate at skylines and occlusion boundaries; angular error need not decrease at every resolution. Simply triangulating sampled hit points can bridge depth jumps or interpolate off the original surface, so the physical-area comparison retains connected original terrain pieces. Geometry, directional sampling, surface sampling and rasterization produce different approximations; the benchmark reports local central-processor JavaScript work across a stated deterministic suite, not a universal performance ranking.

SVG occlusion handles opaque display surfaces separately from the visibility calculation. Transparent construction faces use depth ordering. Dense sample displays can draw more slowly. Geometry vs Raster calculates every chosen sample and displays every raster cell or hit-mask center; ray-line drawing is optional; benchmark query counts and displayed explanatory geometry can have different scopes. Screen layout is checked at 1920 × 1080 and 3840 × 2160.

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
node tests/terrain-single-shadow.test.cjs
node tests/samples.test.cjs
node tests/sampling-audit.test.cjs
node tests/terrain-raster.test.cjs
node tests/ray-reconstruction.test.cjs
node tests/ray-query.test.cjs
node tests/benchmark-run-settings.test.cjs
node tests/benchmark-suite.test.cjs
node tests/benchmark-detail-suite.test.cjs
node tests/benchmark-extension-suite.test.cjs
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
node tests/samples.cjs
node tests/construction-progress.cjs
node tests/branding.cjs
node tests/benchmarks.cjs
node tests/benchmark-inspection.cjs
```

Preserve the original saved statistics and their frozen computational source mapping. `scripts/extract-benchmark-clouds.cjs` recovers real individual points without rerunning solvers. Selective measurement uses `scripts/generate-benchmark-extension.cjs`; choose `--suite core` or `--suite detail`, `--positions 25`, the desired `--methods`, angular `--resolutions`, `--linear-resolutions` and `--surface-resolutions`. Only those cases enter the separate replacement asset. Matching checkpoints skip completed cases; a changed computational fingerprint requires a fresh capture. Original assets and archives remain separate. Full-suite generators remain available only for an explicitly chosen new baseline. Offline timings should run without competing CPU-heavy tasks.

Tests write screenshots and downloads to the ignored `.codex-scratch.nosync/` directory. Geometry checks pin the original computational core and exercise independent invariants; when the original Astra HTML is present in the parent directory, they additionally compare its outputs. See [AGENTS.md](AGENTS.md) for source orientation and editing conventions.
