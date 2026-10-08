#!/usr/bin/env python3
"""Build the portable lab from dependency-free authoring modules."""
from pathlib import Path
import argparse
import base64
import hashlib
import json

ROOT = Path(__file__).resolve().parent
MODULES = (
    'geometry', 'receiver-boundaries', 'point-location', 'wall-shadow2', 'operation-counts', 'shadow-stages', 'svg-context', 'svg-world', 'reference-notes', 'wall-shadow-docs',
    'scenes', 'urban-shadow-stages', 'terrain-views', 'terrain-shadow-stages', 'projection-views', 'terrain-raster', 'sample-comparison', 'benchmark-suite', 'benchmark-detail-suite', 'ray-query', 'ray-reconstruction', 'benchmark-extension-suite', 'benchmark-data', 'benchmark-run-settings', 'benchmark-controller', 'benchmark-views', 'benchmark-detail-views', 'benchmark-inspection', 'wall-shadows', 'shared-scenes', 'work-readouts', 'panels', 'controls', 'exports', 'runtime',
)

BENCHMARK_MODULES = ('geometry', 'operation-counts', 'wall-shadow2', 'sample-comparison', 'benchmark-suite')

def build():
    template = (ROOT / 'source/template.html').read_text()
    notice = (ROOT / 'LICENSE').read_text().strip() + '\n\n' + (ROOT / 'NOTICE').read_text().strip()
    template = template.replace('/*LICENSE_NOTICE*/', notice)
    for key, filename, mime in (
        ('GEOVIS', 'geovis.png', 'image/png'),
        ('LASTIG', 'lastig.svg', 'image/svg+xml'),
        ('IGN', 'ign.svg', 'image/svg+xml'),
        ('GEODATA', 'geodata.svg', 'image/svg+xml'),
        ('EIFFEL', 'eiffel.svg', 'image/svg+xml'),
    ):
        data = base64.b64encode((ROOT / 'assets/brand' / filename).read_bytes()).decode('ascii')
        template = template.replace(f'/*BRAND_{key}*/', f'data:{mime};base64,{data}')
    worker_sources = [(name, (ROOT / f"source/{'benchmark-sample-baseline' if name == 'sample-comparison' else name}.js").read_text()) for name in BENCHMARK_MODULES]
    fingerprint = hashlib.sha256('\0'.join(name + '\0' + source for name, source in worker_sources).encode()).hexdigest()
    detail_source = (ROOT / 'source/benchmark-detail-suite.js').read_text()
    detail_fingerprint = hashlib.sha256(('benchmark-detail-suite\0' + detail_source).encode()).hexdigest()
    extension_sources = [(name, (ROOT / f'source/{name}.js').read_text()) for name in ('benchmark-detail-suite', 'terrain-raster', 'ray-query', 'ray-reconstruction', 'benchmark-extension-suite')]
    extension_fingerprint = hashlib.sha256('\0'.join(name + '\0' + source for name, source in extension_sources).encode()).hexdigest()
    worker = '\n\n'.join(source for _, source in worker_sources) + '\n' + '\n'.join(source for _, source in extension_sources) + '\n' + (ROOT / 'source/benchmark-run-settings.js').read_text() + '\n' + (ROOT / 'source/benchmark-worker.js').read_text()
    data_path = ROOT / 'assets/benchmarks/statistics.json'
    data = json.loads(data_path.read_text()) if data_path.exists() else None
    if data and data.get('metadata', {}).get('sourceFingerprint') != fingerprint:
        raise ValueError('Saved benchmark statistics do not match the computational sources. Regenerate them with scripts/generate-benchmarks.cjs.')
    detail_path = ROOT / 'assets/benchmarks/terrain-detail-statistics.json'
    detail_data = json.loads(detail_path.read_text()) if detail_path.exists() else None
    if detail_data and (detail_data.get('metadata', {}).get('sourceFingerprint') != fingerprint or detail_data.get('metadata', {}).get('helperFingerprint') != detail_fingerprint):
        raise ValueError('Saved terrain-detail statistics need regenerating with scripts/generate-terrain-benchmarks.cjs.')
    scripts = '\n\n'.join(
        f'/* Module: {name} */\n' + (ROOT / f'source/{name}.js').read_text()
        for name in MODULES
    )
    cloud_path = ROOT / 'assets/benchmarks/measurement-clouds.json'
    cloud_data = json.loads(cloud_path.read_text()) if cloud_path.exists() else None
    for cloud in (cloud_data or {}).get('datasets', {}).values():
        asset = ROOT / 'assets/benchmarks' / cloud['metadata']['statisticsAsset']
        if hashlib.sha256(asset.read_bytes()).hexdigest() != cloud['metadata']['statisticsSHA256']:
            raise ValueError('Individual measurement cloud does not match its preserved statistics asset.')
    extension_data = [json.loads(p.read_text()) for p in sorted((ROOT / 'assets/benchmarks').glob('replacement-*.json'))]
    archive_data = [json.loads(p.read_text()) for p in sorted((ROOT / 'assets/benchmarks/archive').glob('*.json'))]
    for addition in extension_data:
        if addition['metadata']['sourceFingerprint'] != fingerprint or addition['metadata']['extensionFingerprint'] != extension_fingerprint:
            raise ValueError('Selective extension statistics do not match their preserved sources.')
    scripts = scripts.replace('/*BENCHMARK_CLOUD_DATA*/null', json.dumps(cloud_data, separators=(',', ':')))
    scripts = scripts.replace('/*BENCHMARK_ARCHIVE_DATA*/[]', json.dumps(archive_data, separators=(',', ':')))
    scripts = scripts.replace('/*BENCHMARK_EXTENSION_DATA*/[]', json.dumps(extension_data, separators=(',', ':')))
    scripts = scripts.replace('/*BENCHMARK_EXTENSION_FINGERPRINT*/\"\"', json.dumps(extension_fingerprint))
    scripts = scripts.replace('/*BENCHMARK_DATA*/null', json.dumps(data, separators=(',', ':')))
    scripts = scripts.replace('/*TERRAIN_BENCHMARK_DATA*/null', json.dumps(detail_data, separators=(',', ':')))
    scripts = scripts.replace('/*BENCHMARK_WORKER*/""', json.dumps(worker))
    scripts = scripts.replace('/*BENCHMARK_FINGERPRINT*/""', json.dumps(fingerprint)).replace('</script', '<\\/script')
    scripts = scripts.replace('/*TERRAIN_BENCHMARK_FINGERPRINT*/""', json.dumps(detail_fingerprint))
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
