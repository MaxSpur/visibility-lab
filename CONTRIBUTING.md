# Contributing

Edit the authoring modules in `source/`, then rebuild `visibility-lab-v4.html`. Keep the portable HTML committed with its source. The application has no runtime dependencies; the build uses Python 3 standard-library modules. Use a current Node.js LTS release for checks (CI uses Node.js 24).

Please report reproducible problems or propose changes through GitHub issues and pull requests. For a geometry problem, include the demonstration, observer position, scene settings and expected result. Changes must preserve the numerical fixtures, native SVG rendering and saved benchmark provenance. Project source orientation and detailed invariants are in [AGENTS.md](AGENTS.md). Contributions to original project content use the [MIT license](LICENSE); the logo exclusions in [NOTICE](NOTICE) also apply.

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

Preserve the original saved statistics and their frozen computational source mapping. `scripts/extract-benchmark-clouds.cjs` recovers real individual points without rerunning solvers, but requires the original ignored development captures `benchmark-raw-50.json` and `terrain-detail-raw-25.json`. Those raw files are not distributed; fresh clones use the already checked-in `assets/benchmarks/measurement-clouds.json` and do not need extraction. Selective measurement uses `scripts/generate-benchmark-extension.cjs`; choose `--suite core` or `--suite detail`, `--positions 25`, the desired `--methods`, angular `--resolutions`, `--linear-resolutions` and `--surface-resolutions`. Only those cases enter the separate replacement asset. Matching checkpoints skip completed cases; a changed computational fingerprint requires a fresh capture. Original assets and archives remain separate. Full-suite generators remain available only for an explicitly chosen new baseline. Offline timings should run without competing CPU-heavy tasks.

Tests write screenshots and downloads to the ignored `.codex-scratch.nosync/` directory. Geometry checks pin the original computational core and exercise independent invariants; when the original Astra HTML is present in the parent directory, they additionally compare its outputs. See [AGENTS.md](AGENTS.md) for source orientation and editing conventions.
