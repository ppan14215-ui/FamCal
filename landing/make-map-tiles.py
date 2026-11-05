"""Baut 3x3 Kartenkacheln im OpenStreetMap-Stil fuer die Screenshots (OSM ist in der Cloud gesperrt).
Ausgabe: landing/maptiles/<dx>_<dy>.png (512 px, 2x). Mitte = Kachel mit dem Pin (München, Zoom 16)."""
import math, random, os
from PIL import Image, ImageDraw, ImageFont
S = 2; W = 768
random.seed(7)
LAND, RES, BLD, BLDL = '#f2efe9', '#e0dfdf', '#d9d0c9', '#c4b6ab'
PARK, PARKL, WATER = '#c8facc', '#aed1a0', '#aad3df'
PRI, PRIL, SEC, SECL, RD, RDL = '#fcd6a4', '#c48c4e', '#f7fabf', '#a8ab6a', '#ffffff', '#bdb6ad'
im = Image.new('RGB', (W * S, W * S), LAND); d = ImageDraw.Draw(im)
P = lambda pts: [(x * S, y * S) for x, y in pts]
F = lambda sz, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), sz * S)
# lokales Straßenraster, leicht gedreht
A = math.radians(-8); ca, sa = math.cos(A), math.sin(A)
def rot(u, v):  # Rasterkoordinate -> Bild
    return (330 + u * ca - v * sa, 470 + u * sa + v * ca)
d.polygon(P([rot(-600, -600), rot(600, -600), rot(600, 600), rot(-600, 600)]), fill=RES)
cols = [-560, -430, -300, -175, -60, 70, 190, 320, 450, 580]
rows = [-560, -420, -290, -160, 0, 150, 280, 410, 560]
# Park oben rechts, Fluss unten links
park = [rot(190, -420), rot(450, -420), rot(450, -160), rot(190, -160)]
# Blöcke mit Blockrandbebauung
for i in range(len(cols) - 1):
    for j in range(len(rows) - 1):
        u0, u1, v0, v1 = cols[i] + 9, cols[i + 1] - 9, rows[j] + 9, rows[j + 1] - 9
        if u1 - u0 < 30 or v1 - v0 < 30: continue
        if i in (6, 7) and j in (1, 2): continue
        depth = random.choice([16, 18, 20, 22])
        # Gebäude rund um den Block, in Segmente geteilt
        segs = []
        u = u0
        while u < u1 - 10:
            w = random.randint(22, 46); segs.append((u, v0, min(u + w, u1), v0 + depth)); segs.append((u, v1 - depth, min(u + w, u1), v1)); u += w
        v = v0 + depth
        while v < v1 - depth - 6:
            h = random.randint(20, 40); segs.append((u0, v, u0 + depth, min(v + h, v1 - depth))); segs.append((u1 - depth, v, u1, min(v + h, v1 - depth))); v += h
        for (a, b, c, e) in segs:
            d.polygon(P([rot(a, b), rot(c, b), rot(c, e), rot(a, e)]), fill=BLD, outline=BLDL, width=S)
        if random.random() < .35 and (u1 - u0) > 80 and (v1 - v0) > 80:  # Hinterhofbau
            a, b = u0 + depth + 14, v0 + depth + 14
            d.polygon(P([rot(a, b), rot(a + 30, b), rot(a + 30, b + 24), rot(a, b + 24)]), fill=BLD, outline=BLDL, width=S)
d.polygon(P(park), fill=PARK, outline=PARKL, width=S)
for k in range(14):  # Bäume
    cx, cy = rot(random.uniform(205, 435), random.uniform(-405, -175)); r = random.uniform(5, 9)
    d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill='#b5e3b5')
# Fluss
river = [(-20, 700), (60, 640), (120, 610), (150, 560), (140, 500), (100, 440), (40, 400), (-20, 380)]
d.line(P(river), fill=WATER, width=46 * S, joint='curve')
def road(pts, w, fill, line):
    d.line(P(pts), fill=line, width=(w + 3) * S, joint='curve')
    for p in pts: r = (w + 3) / 2 * S; d.ellipse([p[0] * S - r, p[1] * S - r, p[0] * S + r, p[1] * S + r], fill=line)
    return pts
def fillroad(pts, w, fill):
    d.line(P(pts), fill=fill, width=w * S, joint='curve')
    for p in pts: r = w / 2 * S; d.ellipse([p[0] * S - r, p[1] * S - r, p[0] * S + r, p[1] * S + r], fill=fill)
small = [[rot(u, -700), rot(u, 700)] for u in cols] + [[rot(-700, v), rot(700, v)] for v in rows if v != 0]
main = [rot(-700, 0), rot(700, 0)]               # Hauptstraße (sekundär), Pin knapp darüber
diag = [rot(-700, 520), rot(-100, 250), rot(250, 120), rot(700, -60)]  # Hauptverkehrsstraße
for s in small: road(s, 9, RD, RDL)
road(main, 15, SEC, SECL); road(diag, 18, PRI, PRIL)
for s in small: fillroad(s, 9, RD)
fillroad(main, 15, SEC); fillroad(diag, 18, PRI)
# Bahnlinie
d.line(P([(560, 768), (620, 560), (700, 380), (768, 300)]), fill='#999999', width=4 * S)
def label(text, at, ang, sz=10, col='#333333', bold=False, halo=LAND):
    f = F(sz, bold); bb = f.getbbox(text); tw, th = bb[2] + 8 * S, bb[3] + 8 * S
    t = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); td = ImageDraw.Draw(t)
    td.text((4 * S, 4 * S), text, font=f, fill=col, stroke_width=2 * S, stroke_fill=halo)
    t = t.rotate(ang, expand=True, resample=Image.BICUBIC)
    im.paste(t, (int(at[0] * S - t.width / 2), int(at[1] * S - t.height / 2)), t)
deg = -math.degrees(A)
label('Hauptstraße', rot(-105, 0), deg, 10, '#333333', halo=SEC)
label('Hauptstraße', rot(420, 0), deg, 10, '#333333', halo=SEC)
label('Ludwigstraße', rot(-120, 255), 26, 10, halo=PRI)
for u, n in [(-175, 'Lindenstraße'), (190, 'Gartenstraße'), (-430, 'Schulstraße')]:
    label(n, rot(u, 250), deg - 90, 9, '#555555', halo=RD)
for v, n in [(150, 'Bergstraße'), (-160, 'Kirchweg'), (-290, 'Rosenstraße')]:
    label(n, rot(-360, v), deg, 9, '#555555', halo=RD)
label('Stadtpark', rot(320, -300), 0, 11, '#2b7a2b', halo=PARK)
label('Isar', (70, 560), -60, 10, '#3c6f8a', halo=WATER)
# Hausnummern um den Pin
for (u, v, n) in [(-40, 34, "12"), (-95, 34, "10"), (25, 34, "14"), (-40, -20, "15")]:
    label(n, rot(u, v), 0, 7, '#7a6a5e', halo=BLD)
out = os.path.join(os.path.dirname(__file__), 'maptiles'); os.makedirs(out, exist_ok=True)
for dx in (-1, 0, 1):
    for dy in (-1, 0, 1):
        x0, y0 = (dx + 1) * 256 * S, (dy + 1) * 256 * S
        im.crop((x0, y0, x0 + 256 * S, y0 + 256 * S)).save(os.path.join(out, '%d_%d.png' % (dx, dy)), optimize=True)
im.crop((165 * S, 410 * S, 495 * S, 530 * S)).save(os.path.join(out, '_preview.png'))
