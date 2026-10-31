"""Cuts a separate piece (ball, puck) out of a clay icon so it can move on its own.
Writes icon-<name>__base.webp and icon-<name>__<part>.webp on the full canvas.
Run: python3 scripts/split-part.py padel ball   (needs pillow, numpy, scipy)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

name, part = sys.argv[1], sys.argv[2]
src = f'assets/icons/icon-{name}.webp'
im = np.array(Image.open(src).convert('RGBA'))
solid = im[:, :, 3] > 40
lab, k = ndimage.label(solid)
sizes = ndimage.sum(solid, lab, range(1, k + 1))
order = np.argsort(sizes)[::-1]
main = order[0] + 1
# Everything that is not the main body is the piece (one ball, or all the rays of a sun).
pieces = [i + 1 for i in order[1:] if sizes[i] > 30]
# Soft edges belong to the nearest solid region.
_, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
near = lab[iy, ix]
for labels, suffix in (([main], 'base'), (pieces, part)):
    out = im.copy()
    out[~np.isin(near, labels), 3] = 0
    Image.fromarray(out).save(f'assets/icons/icon-{name}__{suffix}.webp', lossless=True)
y, x = np.where(np.isin(lab, pieces))
s = 1024 / im.shape[0]
print(name, part, 'box', [int(x.min() * s), int(y.min() * s), int(x.max() * s), int(y.max() * s)])
