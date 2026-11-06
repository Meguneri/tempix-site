#!/usr/bin/env python3
"""Build the standalone HTML and private-coop ZIP using only stdlib."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import hashlib, json, re, subprocess

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)
parts = ['core.js','world.js','combat.js','render.js','ui.js','net.js','main.js']
html = (ROOT / 'index.html').read_text(encoding='utf-8')
for name in parts:
    subprocess.run(['node','--check',str(ROOT/name)], check=True)
    tag = '<script src="'+name+'"></script>'
    if tag not in html:
        raise RuntimeError('Missing module tag: '+name)
    html = html.replace(tag, '<script>\n'+(ROOT/name).read_text(encoding='utf-8')+'\n</script>')
if re.search(r'<script[^>]+src=', html):
    raise RuntimeError('Unexpected external dependency')
standalone = html.encode('utf-8')
(DIST/'HELIOS_ENTROPY_OFFLINE.html').write_bytes(standalone)
files = {'index.html':standalone}
for name in ['server.py','legacy_server.py','START_WINDOWS.bat','START_MAC_LINUX.command','README.md','QA_RESULTS.json']:
    p=ROOT/name
    if p.is_file():
        files[name]=p.read_bytes()
zipfile=DIST/'HELIOS_ENTROPY_v3.zip'
with ZipFile(zipfile,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    for name,data in files.items():
        info=ZipInfo('HELIOS_ENTROPY/'+name, (2026,11,6,0,0,0))
        info.compress_type=ZIP_DEFLATED
        info.external_attr=(0o755 if name.endswith('.command') else 0o644)<<16
        z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(zipfile) as z:
    assert z.testzip() is None
report={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [DIST/'HELIOS_ENTROPY_OFFLINE.html',zipfile]}
(DIST/'BUILD.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
