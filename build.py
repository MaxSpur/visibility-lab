#!/usr/bin/env python3
"""Build the portable lab from dependency-free authoring modules."""
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parent
MODULES = (
    'geometry', 'receiver-boundaries', 'point-location', 'wall-shadow2', 'svg-context', 'svg-world', 'reference-notes', 'wall-shadow-docs',
    'scenes', 'wall-shadows', 'panels', 'controls', 'exports', 'runtime',
)

def build():
    template = (ROOT / 'source/template.html').read_text()
    scripts = '\n\n'.join(
        f'/* Module: {name} */\n' + (ROOT / f'source/{name}.js').read_text()
        for name in MODULES
    ).replace('</script', '<\\/script')
    return template.replace('/*STYLES*/', (ROOT / 'source/styles.css').read_text()).replace('/*SCRIPTS*/', scripts)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if the saved HTML differs from its sources.')
    args = parser.parse_args()
    output = ROOT / 'visibility-lab-v4.html'
    html = build()
    if args.check:
        if not output.exists() or output.read_text() != html:
            parser.exit(1, 'visibility-lab-v4.html needs rebuilding.\n')
        print('Portable HTML matches its authoring sources.')
    else:
        output.write_text(html)
        print(f'Built {output.name} ({len(html.encode()):,} bytes).')
