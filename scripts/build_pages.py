"""Build a static GitHub Pages preview without changing the server storefront."""
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
target = Path(sys.argv[1]) if len(sys.argv)>1 else root/'artifacts/pages'
target.mkdir(parents=True,exist_ok=True)
for path in (root/'public').iterdir():
    if path.is_file():
        shutil.copy2(path,target/path.name)
p=target/'index.html'
s=p.read_text().replace('href="/mark.svg"','href="./mark.svg"').replace('href="/style.css"','href="./style.css"').replace('href="/vibrant.css"','href="./vibrant.css"')
s=s.replace('<script src="/app.js" defer></script>','<script src="./static-preview.js" defer></script><script src="./app.js" defer></script>')
s=s.replace('<title>Aurora —','<title>Aurora —')
p.write_text(s)
(target/'static-preview.js').write_text('window.AURORA_STATIC_PREVIEW = true;\n')
(target/'.nojekyll').touch()
print(target)
