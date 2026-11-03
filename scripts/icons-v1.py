"""Brings Icons v1 from the vault (design/icons-v1, 192 px webp made on Julian's Mac,
manifest icons-v1-manifest.json) into the app (Julian 03.11.2026).

Per icon the newest export wins: the last versionedRenders entry if there is one
(e.g. icon-bento_v02), else the plain files. Its layers are copied under stable
names without the version suffix: icon-<name>.webp (whole), icon-<name>__<layer>.webp.
All layers share the 1024 canvas at (0, 0) and are scaled together, never centred
one by one. A version without a whole picture gets one composited from its layers,
so the still icon and the first animation frame are the same picture.

Writes design/icons-v1/selected.json (name -> animation note, layer draw order,
layer boxes on the 1024 canvas) for scripts/gen-motion.js.
Run: python3 scripts/icons-v1.py && node scripts/gen-icons.js && node scripts/gen-motion.js
"""
import json, os, re, glob
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'design/icons-v1/webp')
DST = os.path.join(ROOT, 'assets/icons')
man = json.load(open(os.path.join(ROOT, 'design/icons-v1/icons-v1-manifest.json')))['icons']

# Exports whose newest version is worse than the one before (checked by eye 03.11.):
# filled in after the contact sheet, name -> reason.
KEEP_V01 = json.load(open(os.path.join(ROOT, 'design/icons-v1/keep-v01.json'))) if os.path.exists(os.path.join(ROOT, 'design/icons-v1/keep-v01.json')) else {}

def layer_key(f):
    if f['kind'] == 'whole':
        return 'whole'
    if f['kind'] == 'base':
        return 'base'
    m = re.match(r'icon-.+?__(.+?)(_v\d+)?\.png$', f['file'])
    return f.get('part') or m.group(1)

def clean(im):
    """Some exports carry a pale haze over the whole canvas (alpha 10 to 60, near white), three
    (basteln, bier, bogenschiessen v02) a baked-in checkerboard and no alpha at all. Both would show as a
    light square on a tinted tile or in dark mode. Only pale pixels connected to the canvas edge go, so
    steam, foam and highlights inside the object stay."""
    import numpy as np
    from scipy import ndimage
    a = np.array(im.convert('RGBA')).astype(np.int16)
    rgb, al = a[..., :3], a[..., 3]
    lum, sat = rgb.mean(-1), rgb.max(-1) - rgb.min(-1)
    if al.min() == 255:  # no alpha (checkerboard baked in): the caller builds the picture from its layers
        return None
    def edge_parts(mask):
        lab, n = ndimage.label(mask)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        return lab, n, np.isin(lab, list(edge))
    # Fake transparency: neutral light pixels that are not fully opaque (a haze, or a checkerboard
    # baked into colour and alpha). Everything of it connected to the edge through empty canvas goes,
    # and enclosed patches too when their alpha jumps like a checkerboard (between spokes, in a handle).
    # Objects are opaque, so a white page or plate stays.
    fake = (lum > 175) & (sat < 30) & (al < 250)
    border = np.concatenate([al[0], al[-1], al[:, 0], al[:, -1]])
    if (border > 200).mean() > 0.5:  # an opaque light background (some v02 layers): neutral only
        fake |= (lum > 200) & (sat < 10)
    lab, n, gone = edge_parts((al < 8) | fake)
    lab2, n2 = ndimage.label(fake & ~gone)
    for i in range(1, n2 + 1):
        m = lab2 == i
        if m.sum() < 30:
            continue
        mh = m[:, 1:] & m[:, :-1]
        if mh.any() and (np.abs(np.diff(al, axis=1))[mh] > 40).mean() > 0.08:
            gone |= m
    al = np.where(gone, 0, al)
    # Dust: tiny islands left between the checker squares.
    lab3, n3 = ndimage.label(al > 16)
    if n3:
        size = ndimage.sum(np.ones_like(al), lab3, range(1, n3 + 1))
        small = np.isin(lab3, [i + 1 for i, z in enumerate(size) if z < 24])
        al = np.where(small | ((al <= 16) & ~ndimage.binary_dilation(al > 16, iterations=2)), 0, al)
    a[..., 3] = al
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def load(f):
    p = os.path.join(SRC, f[:-4] + '.webp')
    return clean(Image.open(p))

def bbox(im):
    b = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    k = 1024 / im.width
    return [round(v * k) for v in b] if b else [0, 0, 1024, 1024]

selected, missing = {}, []
for name, v in sorted(man.items()):
    vr = v.get('versionedRenders')
    if vr and name not in KEEP_V01:
        files, order = vr[-1]['files'], vr[-1].get('layerOrder')
    else:
        files, order = v['files'], v.get('layerOrder')
    have = [f for f in files if os.path.exists(os.path.join(SRC, f['file'][:-4] + '.webp'))]
    if len(have) < len(files):
        missing += [f['file'] for f in files if f not in have]
    layers = {layer_key(f): f['file'] for f in have}
    whole = layers.pop('whole', None)
    # Draw order bottom to top. A list names it; 'parts-first' puts parts under the base.
    parts = [k for k in layers if k != 'base' and not k.startswith('state')]
    states = [k for k in layers if k.startswith('state')]
    if isinstance(order, list):
        draw = [k for k in order if k in layers] + [k for k in parts if k not in order]
        if 'base' in layers and 'base' not in draw:
            draw = ['base'] + draw
    elif order == 'parts-first':
        draw = parts + (['base'] if 'base' in layers else [])
    else:
        draw = (['base'] if 'base' in layers else []) + parts
    imgs = {}
    for k, f in layers.items():
        imgs[k] = load(f)
        if imgs[k] is None:
            raise SystemExit(f'{f}: layer without alpha')
        imgs[k].save(os.path.join(DST, f'icon-{name}__{k}.webp'), 'WEBP', quality=88, method=4)
    w = load(whole) if whole else None
    if w is not None:
        pass
    elif draw:
        w = Image.new('RGBA', imgs[draw[0]].size, (0, 0, 0, 0))
        for k in draw:
            w = Image.alpha_composite(w, imgs[k])
    else:
        missing.append(f'{name}: no picture')
        continue
    w.save(os.path.join(DST, f'icon-{name}.webp'), 'WEBP', quality=88, method=4)
    # Old layer files of this icon that the chosen version no longer has.
    # (Icons without layers here keep pieces cut by scripts/split-part.py: padel, tennis, squash, eishockey.)
    keep = {f'icon-{name}__{k}.webp' for k in layers}
    for old in glob.glob(os.path.join(DST, f'icon-{name}__*.webp')) if layers else []:
        if os.path.basename(old) not in keep:
            os.remove(old)
    entry = {'a': v.get('animation', ''), 'L': {'whole': bbox(w)}}
    if len(draw) > 1 or (draw and draw != ['base']):
        entry['layers'] = draw
    for k in layers:
        entry['L'][k] = bbox(imgs[k])
    if states:
        entry['states'] = states
    if v.get('category'):
        entry['cat'] = v['category']
    selected[name] = entry

json.dump(selected, open(os.path.join(ROOT, 'design/icons-v1/selected.json'), 'w'), ensure_ascii=False, indent=0, sort_keys=True)
print(len(selected), 'icons,', sum(1 for e in selected.values() if 'layers' in e), 'layered')
if missing:
    print('MISSING', len(missing), missing[:20])
