"""Converts the Codex clay icons (design/icons-codex/icon-<name>.png, 1024 px)
into app icons like the existing ones: 192 px webp, quality 88.
Run: python3 scripts/codex-icons.py && node scripts/gen-icons.js"""
import glob, os
from PIL import Image

for f in sorted(glob.glob('design/icons-codex/icon-*.png')):
    name = os.path.basename(f)[:-4]
    im = Image.open(f).convert('RGBA').resize((192, 192), Image.LANCZOS)
    im.save(f'assets/icons/{name}.webp', 'WEBP', quality=88, method=6)
print('ok')
