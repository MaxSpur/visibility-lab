# Deploy V4

V4 is a standalone static site. Its public payload is `index.html`,
`visibility-lab-v4.html`, and an empty `.nojekyll`. The launcher preserves query
parameters and fragments. Source modules, tests, raw benchmark captures, and
earlier versions are excluded from the published artifact.

## GitHub Pages

Use the public repository `MaxSpur/visibility-lab`. Leave its custom-domain
field empty: the account site `MaxSpur/maxspur.github.io` already uses
`www.maximspur.com`, which project sites inherit. The canonical lab URL will be
<https://www.maximspur.com/visibility-lab/>.

The address <https://maximspur.com/visibility-lab> additionally depends on the
existing apex-domain routing. If it does not forward correctly, add a scoped
Cloudflare redirect for `/visibility-lab` and `/visibility-lab/*` to the same
path on `https://www.maximspur.com`, retaining query parameters. DNS records
cannot route individual paths. Do not change the account site's domain or the
existing routing for other projects.

Finish concurrent content/benchmark work before rebuilding or making a release.
Run from this directory:

```sh
python3 build.py
python3 scripts/prepare-pages.py
node tests/geometry-baseline.cjs
node tests/svg-world.test.cjs
```

The preparation script validates the saved HTML against its sources and stages
only the public files in ignored `.codex-scratch.nosync/pages/site/`. It does not
rebuild or modify the authoring files. A stale artifact or a changed input
aborts packaging. Run the existing browser layout/interface gates described in
[README](README.md#develop-and-check) on the final release too; the workflow's
numerical checks do not establish visible UI correctness.

For first-time remote setup, if the repository and remote do not yet exist:

```sh
gh repo create MaxSpur/visibility-lab --public --description "Interactive geometric visibility laboratory"
git remote add origin git@github.com:MaxSpur/visibility-lab.git
```

Review and commit the intended release files explicitly, including any newly
added source/benchmark assets and the rebuilt HTML. Avoid staging unrelated work
with a blanket command while content changes are in progress. Then:

```sh
git push -u origin main
```

In GitHub's repository **Settings → Pages**, select **GitHub Actions** as the
source. The equivalent first-time API command is:

```sh
gh api --method POST repos/MaxSpur/visibility-lab/pages -f build_type=workflow
```

If Pages already exists with another build type, update it with `--method PUT`
instead. Repository administrator access is required for these settings.

Pushes and pull requests run validation only. Publication is deliberately manual
so ongoing content work does not automatically go live. After validation passes,
choose **Actions → Validate and publish V4 → Run workflow → main**, or:

```sh
gh workflow run pages.yml --repo MaxSpur/visibility-lab --ref main
gh run list --repo MaxSpur/visibility-lab --workflow pages.yml --limit 3
```

Inspect the deployment result and verify the live entry URL, a bookmarked
demonstration, embedded logos, SVG display, and the benchmark worker before
calling the release deployed. To roll back, revert the relevant release commit,
push it, and manually rerun the workflow.

## LASTIG hosting: investigated, not changed

The separate checkout `maxim-spur-lastig` belongs to
[`umrlastig/maxim-spur`](https://github.com/umrlastig/maxim-spur/tree/gh-pages).
Its existing Pages site publishes the root of `gh-pages` and inherits
`www.umr-lastig.fr` from the organization. The GitHub-hosted address already
redirects to <https://www.umr-lastig.fr/maxim-spur/>. No new server or DNS setup
should be needed for a static child directory.

When separately authorized, copy the validated public payload into
`visibility-lab/` in that repository. Keep its existing homepage and Pages
settings. The expected entry URL is
<https://www.umr-lastig.fr/maxim-spur/visibility-lab/>. Add a bilingual
**Intervisibility laboratory / Laboratoire d’intervisibilité** link with
`href="visibility-lab/"` in the active Teaching section of the root `index.html`.
The Projects and Software development sections are currently commented out;
adding a link inside those comments would not make it visible. No personal
`CNAME` should be added. Push to `gh-pages` would publish through its existing
branch-based Pages build.

This investigation made no changes to the LASTIG checkout or remote repository.
Check its current branch and homepage structure again before any later update.

GitHub references: [custom-domain inheritance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages),
[Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Pages API](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site).
