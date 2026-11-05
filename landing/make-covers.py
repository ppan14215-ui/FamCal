"""Eigene Filmcover für die Landing-Screens (keine Studio-Poster, Rechte). Ausgabe landing/covers/<name>.png"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 320, 464
OUT = os.path.join(os.path.dirname(__file__), 'covers'); os.makedirs(OUT, exist_ok=True)
F = lambda s, b=True: ImageFont.truetype('/usr/share/fonts/opentype/inter/InterDisplay-%s.otf' % ('Bold' if b else 'Medium'), s)
def grad(top, bot):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return im
def title(im, text, col, y=None, size=46, track=6):
    d = ImageDraw.Draw(im); f = F(size); text = text.upper()
    widths = [d.textlength(c, font=f) for c in text]; tw = sum(widths) + track * (len(text) - 1)
    x = (W - tw) / 2; y = y if y is not None else H - 92
    for c, w in zip(text, widths): d.text((x, y), c, font=f, fill=col); x += w + track
# Dune: Wüste im Abendlicht
im = grad((246, 196, 140), (196, 104, 52)); d = ImageDraw.Draw(im)
d.ellipse([190, 70, 270, 150], fill=(255, 236, 200))
for k, (col, y0, a) in enumerate([((214, 140, 80), 250, 40), ((176, 92, 44), 300, 60), ((128, 60, 30), 350, 50)]):
    pts = [(x, y0 + a * math.sin(x / W * math.pi * 1.4 + k)) for x in range(0, W + 1, 4)] + [(W, H), (0, H)]
    d.polygon(pts, fill=col)
d.line([(70, 330), (70, 318)], fill=(40, 22, 12), width=3); d.ellipse([66, 310, 74, 318], fill=(40, 22, 12))
title(im, 'Dune', (255, 240, 220), size=50, track=14); im.save(os.path.join(OUT, 'dune.png'))
# Oppenheimer: Feuerring auf Schwarz
im = grad((24, 22, 26), (8, 8, 10)); glow = Image.new('RGB', (W, H), 0); g = ImageDraw.Draw(glow)
g.ellipse([60, 90, 260, 290], fill=(255, 120, 30)); glow = glow.filter(ImageFilter.GaussianBlur(38)); im = Image.blend(im, Image.eval(glow, lambda v: v), 0.0)
im = Image.composite(glow, im, glow.convert('L').point(lambda v: min(255, v * 2)))
d = ImageDraw.Draw(im); d.ellipse([110, 140, 210, 240], fill=(255, 214, 140))
d.line([(160, 300), (160, 360)], fill=(60, 56, 60), width=2)
title(im, 'Oppenheimer', (240, 232, 220), size=31, track=4); im.save(os.path.join(OUT, 'oppenheimer.png'))
# Barbie: Pink, Sonne, Palmenlinie
im = grad((255, 150, 200), (232, 74, 150)); d = ImageDraw.Draw(im)
d.ellipse([90, 80, 230, 220], fill=(255, 226, 120))
d.rectangle([0, 300, W, H], fill=(120, 210, 230)); d.rectangle([0, 300, W, 312], fill=(255, 255, 255))
for x in (52, 268):
    d.line([(x, 300), (x + 8, 200)], fill=(70, 40, 60), width=6)
    for a in range(-70, 251, 64):
        r = math.radians(a); d.line([(x + 8, 200), (x + 8 + 36 * math.cos(r), 200 - 18 * math.sin(r) + 10)], fill=(40, 120, 80), width=8)
title(im, 'Barbie', (255, 255, 255), y=H - 140, size=54, track=4); im.save(os.path.join(OUT, 'barbie.png'))
