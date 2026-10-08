# Geometric Visibility Lab

An interactive teaching tool for visibility, shadows and sampling in 2D and 3D. Explore synthetic scenes, move the observer, and step through geometric constructions with native SVG illustrations and selectable explanations.

**[Open the lab](https://maximspur.com/visibility-lab.html)** · **[LASTIG mirror](https://www.umr-lastig.fr/maxim-spur/visibility-lab.html)** · **[User guide](docs/USER_GUIDE.md)**

## Run offline

Clone [MaxSpur/visibility-lab](https://github.com/MaxSpur/visibility-lab), or download its ZIP, and open `visibility-lab-v4.html` in a browser. The built HTML contains the application, affiliation artwork and saved benchmark data. No installation or network access is needed.

For a local preview:

```sh
python3 -m http.server 8764 --bind 127.0.0.1
```

Open [localhost:8764](http://127.0.0.1:8764/). The local launcher preserves query parameters and demonstration bookmarks. This repository contains the standalone V4 application; earlier seminar versions are not required.

## Explore

| Demonstration | What it shows |
| --- | --- |
| Shadow construction | Silhouette extrusion and facet-by-facet shadow subtraction |
| Subtract wall shadows | Continuous planar visibility from polygon boundaries |
| Expanding triangles | Point location and visibility through shared mesh openings |
| Terrain: beams | Straight beams through an air-cell decomposition |
| Terrain: shadow cuts | Occluder-first clipping of terrain receivers |
| Terrain in the view | Viewport clipping and receiver-first visibility |
| Geometry vs Raster | Continuous geometry compared with Raycast and Raster |
| Benchmarks | Saved measurements and configurable browser runs |

Drag the purple source or observer. Drag a 3D background to orbit the illustration camera, and scroll to zoom. Play or step through construction stages. Keys **1–8** switch tabs, **Space** plays or pauses, and **← / →** step through a construction. Full screen includes the controls; **Esc** exits.

Export graphics as SVG or PNG, with or without the explanation panel. Save and load scene settings, and export benchmark results as JSON. See the [user guide](docs/USER_GUIDE.md) for demonstration controls, benchmark interpretation and export details. Method explanations and scientific references are also built into the application.

## Accuracy and limits

This is a teaching implementation using floating-point geometry, synthetic scenes and CPU sampling. It is not certified exact arithmetic, a production GIS viewshed tool, or a measurement of GPU rasterization. Finite ray and raster sampling can miss narrow features; continuous clipping also has numerical tolerances. Dense SVG scenes and large benchmark runs can be expensive.

Benchmark curves describe the recorded inputs and runtime. Preparation, query, recovery, drawing and workload counters have different scopes. Saved and live measurements retain their own provenance; a partial run does not represent a completed balanced suite. Read the [benchmark protocol](docs/USER_GUIDE.md#compare-benchmark-distributions) before interpreting comparisons.

## Develop and contribute

Build with `python3 build.py` and check consistency with `python3 build.py --check`. See [CONTRIBUTING.md](CONTRIBUTING.md) for numerical and browser checks, benchmark tooling, and contribution guidance. [DEPLOYMENT.md](DEPLOYMENT.md) describes the separate public-site copies and redirects.

## Share the source

Circular QR codes for [the public GitHub repository](https://github.com/MaxSpur/visibility-lab): [black SVG](assets/share/github-qr-black.svg) · [white SVG](assets/share/github-qr-white.svg). Both have transparent backgrounds; use black on a light surface and white on a dark surface.

## License

Original code, documentation, synthetic data and QR artwork are available under the [MIT license](LICENSE). Institutional affiliation logos, including their embedded copies, are excluded; see [NOTICE](NOTICE) and [artwork attribution](assets/brand/README.md).
