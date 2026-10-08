#!/usr/bin/env python3
"""Validate the portable lab and stage redirects for its retired project URLs."""
import argparse
import hashlib
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = ('index.html', 'visibility-lab-v4.html', '.nojekyll')
REDIRECT_HTML = b'''<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Geometric Visibility Lab</title>
<link rel="canonical" href="https://www.maximspur.com/visibility-lab.html">
<script>location.replace('https://www.maximspur.com/visibility-lab.html'+location.search+location.hash);</script>
<p><a href="https://www.maximspur.com/visibility-lab.html">Open Geometric Visibility Lab</a></p>
</html>
'''


def prepare(destination):
    destination = destination.resolve()
    scratch = ROOT / '.codex-scratch.nosync'
    if ROOT.is_relative_to(destination) or (
        destination.is_relative_to(ROOT) and not destination.is_relative_to(scratch)
    ):
        raise ValueError('Stage inside .codex-scratch.nosync/ or outside the repository.')
    if destination.exists() and (
        not destination.is_dir()
        or any(p.name not in PUBLIC_FILES or not p.is_file() or p.is_symlink()
               for p in destination.iterdir())
    ):
        raise ValueError('Destination must be empty or contain only previously staged public files.')

    payload = {name: (ROOT / name).read_bytes() for name in PUBLIC_FILES if name != '.nojekyll'}
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('lab_build', ROOT / 'build.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    if payload['visibility-lab-v4.html'] != builder.build().encode('utf-8'):
        raise ValueError('Portable HTML needs rebuilding. Finish content work, then run python3 build.py.')
    if any((ROOT / name).read_bytes() != data for name, data in payload.items()):
        raise ValueError('Public files changed during validation; retry after content work finishes.')

    # Keep the authoring HTML and localhost launcher intact. Project Pages now
    # forwards both old entry points to the account site's single current copy.
    payload = {name: REDIRECT_HTML for name in PUBLIC_FILES if name != '.nojekyll'}
    payload['.nojekyll'] = b''
    destination.mkdir(parents=True, exist_ok=True)
    for name, data in payload.items():
        (destination / name).write_bytes(data)
        print(f'{name}: {len(data):,} bytes; sha256={hashlib.sha256(data).hexdigest()}')
    print(f'Public site staged at {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.codex-scratch.nosync/pages/site')
    args = parser.parse_args()
    try:
        prepare(args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, f'{error}\n')
