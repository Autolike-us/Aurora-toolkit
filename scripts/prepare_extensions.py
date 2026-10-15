"""Generate local endpoint config and installable packages, without embedding secrets."""
import json
import os
from pathlib import Path
import shutil
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
url = os.environ.get('PUBLIC_URL','http://127.0.0.1:8000').rstrip('/')
parsed = urllib.parse.urlsplit(url)
if parsed.scheme != 'https' and not (parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1')):
    raise SystemExit('PUBLIC_URL must use HTTPS, except for local development.')
if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
    raise SystemExit('PUBLIC_URL must be an origin, without a path or credentials.')
(ROOT/'artifacts').mkdir(exist_ok=True)
for product in ('facebook','instagram','tiktok'):
    folder = ROOT/'artifacts'/'build'/product
    shutil.copytree(ROOT/'extensions'/product,folder,dirs_exist_ok=True,
        ignore=shutil.ignore_patterns('dist','node_modules','__pycache__','.git'))
    (folder/'licensing-config.js').write_text('globalThis.AuroraLicenseConfig = '+json.dumps({'origin':url,'product':product})+';\n')
    manifest = json.loads((folder/'manifest.json').read_text())
    hosts = [h for h in manifest['host_permissions'] if 'facebook.com' in h or 'instagram.com' in h or 'tiktok.com' in h]
    manifest['host_permissions'] = hosts+[url+'/*']
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(ROOT/'artifacts'/f'aurora-{product}.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in sorted(folder.rglob('*')):
            if path.is_file() and (len(path.relative_to(folder).parts)==1 or path.parent.name=='icons') and path.name not in ('package.json','README.md','CHANGELOG.md','WORKFLOW_REVIEW.md'):
                z.write(path,path.relative_to(folder))
    print('Built',product,'for',url)
