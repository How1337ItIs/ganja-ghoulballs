#!/usr/bin/env python3
"""Produce a deterministic, credential-free source archive; never publish it.

The optional source commit is a caller-supplied reference, not a claim that the
working tree is identical to that commit. The archive SHA-256 and per-file hashes
are the authoritative identity of the packaged local snapshot.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DIRECTORIES = ('contracts', 'deploy-ui', 'deployments', 'docs', 'reports', 'scripts', 'site', 'test')
TOP_LEVEL = ('.gitignore', 'LICENSE', 'README.md', 'RELEASE_STATUS.md', 'RELEASE_SHA256.json', 'package.json', 'package-lock.json', 'solc-settings.json', 'vercel.json')
EVIDENCE_FILES = (
    'artifacts/covered-dca9/build-manifest.json',
    'artifacts/covered-dca9/GanjaGhoulballs.json',
    'artifacts/covered-dca9/GooGraveyard.json',
    'artifacts/covered-dca9/GooBackdrop.json',
    'artifacts/covered-dca9/contract-tests.json',
    'artifacts/core-runtime-equivalence.json',
    'artifacts/contract-boundary-tests.json',
)
EXCLUDED_PARTS = {'node_modules', '.git', '__pycache__', 'dist', 'archive-inputs', '.cache'}


def release_files(root):
    paths = [root / name for name in TOP_LEVEL if (root / name).is_file()]
    # Preserve only explicitly named historical test evidence; never sweep the
    # generated artifacts directory into a source release.
    evidence = [root / name for name in EVIDENCE_FILES if (root / name).is_file()]
    if evidence and len(evidence) != len(EVIDENCE_FILES):
        raise ValueError('Historical coverage evidence is incomplete; finish the review snapshot before packaging')
    paths.extend(evidence)
    for directory in DIRECTORIES:
        base = root / directory
        if base.exists():
            paths.extend(p for p in base.rglob('*') if p.is_file())
    result = []
    for file in sorted(set(paths)):
        relative = file.relative_to(root)
        if any(part in EXCLUDED_PARTS for part in relative.parts):
            continue
        if file.is_symlink():
            raise ValueError(f'Release source cannot contain symbolic links: {relative}')
        if file.name == '.env' or file.name.startswith('.env.') or file.suffix.lower() in {'.pem', '.key', '.p12', '.pfx', '.pyc'}:
            raise ValueError(f'Potential credential or generated cache must not be packaged: {relative}')
        result.append((relative.as_posix(), file.read_bytes()))
    return result


def package(destination, source_commit=None):
    if source_commit is not None and not re.fullmatch(r'[0-9a-fA-F]{40}', source_commit):
        raise ValueError('source-commit must be an exact 40-character Git commit')
    destination = destination.resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError('Write release packages outside the source tree')
    destination.mkdir(parents=True, exist_ok=True)
    files = release_files(ROOT)
    manifest = {
        'schemaVersion': 1,
        'sourceCommitReference': source_commit,
        'sourceCommitMatch': 'Not checked by this packager; verify against the repository before publication.',
        'files': {name: hashlib.sha256(data).hexdigest() for name, data in files},
    }
    manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
    archive = destination / 'Ganja_Ghoulballs_Release_Source.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name, data in files + [('RELEASE-SNAPSHOT.json', manifest_bytes)]:
            info = zipfile.ZipInfo(f'ganja-ghoulballs/{name}', date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            output.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (destination / 'release-snapshot.json').write_bytes(manifest_bytes)
    (destination / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
    return {'archive': str(archive), 'sha256': digest, 'fileCount': len(files), 'bytes': archive.stat().st_size}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--source-commit')
    args = parser.parse_args()
    print(json.dumps(package(args.destination, args.source_commit), indent=2))
