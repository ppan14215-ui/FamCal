# Familienassistent v1 Flow (Julian 2026-10-25 22:44): Zusammenführung aus dem Canvas-Review.
# Basis Clay-Ruhe-System, Ruhig-Navigation, Clay-Icons in Tabs und Karten auf getönten Flächen,
# Tagesansicht aus Clay3-Kalender, gestreifte Arbeitsblöcke, Karten-Modul, Foto-Flow, Entwürfe.
import os, json, shutil, datetime
ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "project")
os.makedirs(os.path.join(P, "assets"), exist_ok=True)
ICONS = os.path.join(ROOT, "..", "assets", "icons")  # 192 px webp, same names as the canvas assets

# ---------- Tokens (Clay-Ruhe-System) ----------
BG = "#F5F5F4"; ROW = "#FFFFFF"; INK = "#16232A"; SUB = "#5B666B"; MUTE = "#8A9397"; HAIR = "#E7E7E4"
DONE = "#075056"; FRIST = "#C2410C"
JUL = "#F6DDE2"; JUL_INK = "#9D2B48"; TOM = "#DCE7F4"; TOM_INK = "#1F4E89"
TINT = {"stethoskop": "#E6EEF4", "kochtopf": "#F2EEE7", "umschlag-euro": "#F7EDE1", "reisepass": "#E2EEEC",
        "yogamatte": "#E7EDE4", "geschenk": "#F8E8E5", "papier-stift": "#EEF0F2", "kalender": "#E2EEEC",
        "glocke": "#F2EEE7", "kindergeld": "#F6F0DD", "impfung": "#F8E8E5", "erledigt": "#E2EEEC",
        "vertrag": "#EEF0F2", "kamera-scan": "#EEF0F2", "brief-gelesen": "#F7EDE1", "chat": "#E7EDE4",
        "eingang": "#F2EEE7", "telefon": "#E6EEF4", "windeln": "#E6EEF4", "thermometer": "#F8E8E5",
        "krankenkasse": "#E2EEEC", "zuhause": "#F2EEE7", "sync": "#E2EEEC", "rechnung": "#EEF0F2",
        "fussabdruck": "#F8E8E5", "reise": "#E6EEF4", "geburtstag": "#F8E8E5", "u-heft": "#F6F0DD",
        "hand-nimmt": "#F2EEE7", "spaeter": "#E2EEEC", "karten": "#F2EEE7", "einkauf": "#E7EDE4"}
USED = set()

def icon(n, s=40):
    USED.add(n)
    return f'<img src="assets/icon-{n}.webp" alt="" style="width: {s}px; height: {s}px; object-fit: contain; flex-shrink: 0">'
def tile(n, s=56, r=18):
    return f'<span style="width: {s}px; height: {s}px; border-radius: {r}px; background: {TINT.get(n, "#EEF0F2")}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{icon(n, int(s*.78))}</span>'

# Linien-Icons (nur Navigation und Bedienelemente)
LI = {
 "home": '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
 "cal": '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
 "list": '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
 "inbox": '<path d="M4 13l3-8h10l3 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
 "sync": '<path d="M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2"/><path d="M19 4v5h-5M5 20v-5h5"/>',
 "camera": '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 "back": '<path d="M15 5l-7 7 7 7"/>',
 "chev": '<path d="M9 5l7 7-7 7"/>',
 "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 "x": '<path d="M6 6l12 12M18 6L6 18"/>',
 "lock": '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 "clock": '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
 "drive": '<path d="M8 4h8l5 9-4 7H7l-4-7z"/><path d="M8 4l9 16M16 4L7 20M3 13h18"/>',
 "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 "send": '<path d="M4 12l16-8-6 16-3-7z"/>',
 "flash": '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
 "pin": '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
 "sparkle": '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
 "settings": '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',
 "papier": '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 "users": '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1 6 4"/>',
}
def li(n, s=22, c=INK, sw=1.8):
    return f'<svg viewBox="0 0 24 24" width="{s}" height="{s}" fill="none" stroke="{c}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0">{LI[n]}</svg>'

def av(p, s=28):
    bg, fg = (JUL, JUL_INK) if p == "J" else (TOM, TOM_INK)
    return f'<span style="width: {s}px; height: {s}px; border-radius: 999px; background: {bg}; color: {fg}; font-size: {int(s*.42)}px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{p}</span>'
def pair(s=28):
    return f'<span style="display: flex">{av("J", s)}<span style="margin-left: -6px; display: flex; border-radius: 999px; box-shadow: 0 0 0 2px {BG}">{av("T", s)}</span></span>'
def circle(done=False):
    if done: return f'<span style="width: 26px; height: 26px; border-radius: 999px; background: {DONE}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{li("check", 16, "#FFFFFF", 2.4)}</span>'
    return f'<span style="width: 26px; height: 26px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px #C9CDCF; flex-shrink: 0"></span>'

def status():
    return f'<div style="height: 54px; padding: 18px 28px 0; box-sizing: border-box; display: flex; justify-content: space-between; align-items: flex-start; font-size: 15px; font-weight: 600; color: {INK}; flex-shrink: 0"><span>9:41</span><span style="width: 24px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 1.5px {INK}; margin-top: 3px"></span></div>'
def h1(t, sub=None, right=""):
    s = f'<span style="font-size: 15px; color: {SUB}">{sub}</span>' if sub else ""
    return f'<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px"><div style="display: flex; flex-direction: column; gap: 2px">{s}<h1 style="margin: 0; font-size: 34px; line-height: 40px; font-weight: 700; letter-spacing: -1px">{t}<span style="color: {DONE}">.</span></h1></div>{right}</div>'
def h2(t, right=""):
    r = f'<span style="font-size: 14px; color: {SUB}">{right}</span>' if right else ""
    return f'<div style="display: flex; justify-content: space-between; align-items: baseline"><h2 style="margin: 0; font-size: 19px; line-height: 26px; font-weight: 650; letter-spacing: -.3px">{t}</h2>{r}</div>'
def meta(t, c=SUB): return f'<span style="font-size: 13.5px; line-height: 19px; color: {c}">{t}</span>'

def row(n, title, sub, right="", time=None, sub_c=SUB, strike=False, tinted=False, href=None):
    t = f'<span style="width: 46px; font-size: 13.5px; font-weight: 600; color: {INK}; flex-shrink: 0">{time}</span>' if time else ""
    deco = f"text-decoration: line-through; color: {MUTE};" if strike else ""
    bg = TINT.get(n, ROW) if tinted else ROW
    tag = "a" if href else "div"
    hr = f' href="{href}"' if href else ""
    return f'<{tag}{hr} style="display: flex; align-items: center; gap: 12px; padding: 10px 14px 10px 10px; border-radius: 22px; background: {bg}; text-decoration: none; color: {INK}">{t}{tile(n, 52, 16)}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 16px; line-height: 22px; font-weight: 600; {deco}">{title}</span>{meta(sub, sub_c)}</span>{right}</{tag}>'

NAV = [("Heute", "home", "V1-Heute.dc.html"), ("Kalender", "cal", "V1-Kal-Tag.dc.html"), ("Listen", "list", "V1-Aufgaben.dc.html"), ("Eingang", "inbox", "V1-Eingang.dc.html")]
def nav(active):
    it = ""
    for t, ic, href in NAV:
        on = t == active
        it += f'<a href="{href}" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 7px 0; border-radius: 999px; background: {"#EFEFEC" if on else "transparent"}; text-decoration: none; color: {INK if on else MUTE}">{li(ic, 22, INK if on else MUTE)}<span style="font-size: 10.5px; font-weight: 600">{t}</span></a>'
    return (f'<div style="position: absolute; left: 14px; right: 14px; bottom: 22px; display: flex; align-items: center; gap: 10px">'
            f'<nav aria-label="Hauptnavigation" style="flex: 1; display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: rgba(255,255,255,.94); box-shadow: 0 0 0 1px {HAIR}, 0 8px 24px rgba(22,35,42,.08)">{it}</nav>'
            f'<a href="V1-Neu.dc.html" aria-label="Neu" style="width: 58px; height: 58px; border-radius: 999px; background: {INK}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(22,35,42,.22)">{li("plus", 26, "#FFFFFF", 2.2)}</a></div>')

TABS = [("Termine", "kalender"), ("Aufgaben", "erledigt"), ("Einkaufen", "einkauf"), ("Fristen", "glocke"), ("Dokumente", "vertrag")]
def ctabs(active):
    it = ""
    for t, n in TABS:
        on = t == active
        it += f'<button style="flex: 1; border: 0; background: transparent; padding: 0 0 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-bottom: 2px solid {INK if on else "transparent"}; color: {INK if on else SUB}; font-size: 12.5px; font-weight: {600 if on else 500}">{icon(n, 46)}<span>{t}</span></button>'
    return f'<div role="tablist" style="display: flex; gap: 4px; border-bottom: 1px solid {HAIR}; margin: 0 -18px; padding: 0 10px">{it}</div>'

def btn(t, primary=True, href=None, icon_n=None):
    tag = "a" if href else "button"
    hr = f' href="{href}"' if href else ""
    st = f"background: {INK}; color: #FFFFFF;" if primary else f"background: {ROW}; color: {INK}; box-shadow: inset 0 0 0 1px {HAIR};"
    ic = li(icon_n, 20, "#FFFFFF" if primary else INK) if icon_n else ""
    return f'<{tag}{hr} style="height: 54px; flex-shrink: 0; border: 0; border-radius: 999px; {st} font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; font-family: inherit">{ic}{t}</{tag}>'
def back(href=None, center=""):
    b = f'<a href="{href}" aria-label="Zurück" style="width: 40px; height: 40px; border-radius: 999px; background: {ROW}; display: flex; align-items: center; justify-content: center">{li("back", 20)}</a>' if href else '<span style="width: 40px"></span>'
    return f'<div style="display: flex; align-items: center; justify-content: space-between">{b}{center}<span style="width: 40px"></span></div>'
def dots(i, n=7):
    return '<span style="display: flex; gap: 5px">' + "".join(f'<span style="width: {18 if j == i else 6}px; height: 6px; border-radius: 999px; background: {INK if j <= i else "#D5D8D9"}"></span>' for j in range(n)) + '</span>'
def card(body, pad=16, bg=ROW, r=22, gap=12):
    return f'<div style="padding: {pad}px; border-radius: {r}px; background: {bg}; display: flex; flex-direction: column; gap: {gap}px">{body}</div>'
def toggle(on):
    return f'<span role="switch" aria-checked="{"true" if on else "false"}" style="width: 48px; height: 28px; border-radius: 999px; background: {DONE if on else "#D5D8D9"}; position: relative; flex-shrink: 0"><span style="position: absolute; top: 3px; left: {23 if on else 3}px; width: 22px; height: 22px; border-radius: 999px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.2)"></span></span>'
def chip(t, bg="#EFEFEC", c=INK):
    return f'<span style="height: 30px; padding: 0 12px; border-radius: 999px; background: {bg}; color: {c}; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px">{t}</span>'
def stripes(base, line):
    return f"background: repeating-linear-gradient(135deg, {base} 0 7px, {line} 7px 9px)"

def item(t, who=None, done=False, note=None, href=None):
    deco = f"text-decoration: line-through; color: {MUTE};" if done else ""
    n = meta(note) if note else ""
    tag = "a" if href else "span"; hr = f' href="{href}"' if href else ""
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: {ROW}">{circle(done)}<{tag}{hr} style="flex: 1; display: flex; flex-direction: column; text-decoration: none; color: {INK}"><span style="font-size: 16px; font-weight: 500; {deco}">{t}</span>{n}</{tag}>{av(who, 22) if who else ""}</div>'
def group(items):
    return f'<div style="display: flex; flex-direction: column; gap: 1px; border-radius: 20px; overflow: hidden; background: {HAIR}; flex-shrink: 0">{items}</div>'
def lrow(n, title, sub, href=None, right=None):
    tag = "a" if href else "div"; hr = f' href="{href}"' if href else ""
    return f'<{tag}{hr} style="display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 12px; background: {ROW}; text-decoration: none; color: {INK}">{tile(n, 48, 14)}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 16px; line-height: 21px; font-weight: 600">{title}</span>{meta(sub)}</span>{right if right is not None else li("chev", 18, MUTE)}</{tag}>'

def whob(inner, t, on=False, tint=TOM, ink=TOM_INK):
    st = f"background: {tint}; color: {ink};" if on else f"color: {SUB};"
    if on: inner = inner.replace("flex-shrink: 0", "flex-shrink: 0; box-shadow: 0 0 0 2px #FFFFFF")
    return f'<span style="flex: 1; height: 40px; border-radius: 999px; {st} display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 14.5px; font-weight: 600">{inner}{t}</span>'
LTABS = [("Aufgaben", "erledigt", "V1-Aufgaben.dc.html"), ("Einkauf", "einkauf", "V1-Einkauf.dc.html"), ("Kliniktasche", "hebamme", "V1-Liste-Klinik.dc.html"), ("Geschenke", "geschenk", None)]
def ltabs(active):
    it = ""
    for t, n, h in LTABS:
        on = t == active
        tag = "a" if h else "span"; hr = f' href="{h}"' if h else ""
        it += f'<{tag}{hr} style="flex: 1; padding: 0 0 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-bottom: 2px solid {INK if on else "transparent"}; color: {INK if on else SUB}; font-size: 12.5px; font-weight: {600 if on else 500}; text-decoration: none"><span style="display: flex; {"" if on else "opacity: .75;"}">{icon(n, 46)}</span><span>{t}</span></{tag}>'
    it += f'<a href="V1-Liste-Neu.dc.html" aria-label="Neue Liste" style="flex: 0 0 52px; padding: 0 0 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-bottom: 2px solid transparent; color: {SUB}; font-size: 12.5px; text-decoration: none"><span style="width: 46px; height: 46px; display: flex; align-items: center; justify-content: center">{li("plus", 24, SUB)}</span><span>Neu</span></a>'
    return f'<div role="tablist" style="display: flex; gap: 2px; border-bottom: 1px solid {HAIR}; margin: 0 -18px; padding: 0 8px">{it}</div>'
BOARDS = {}
FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&amp;display=swap" rel="stylesheet">'
CSS = "html,body{margin:0;overflow:hidden;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none}x-dc{display:block}a{color:%s}button{font-family:inherit;cursor:pointer}@keyframes hop{0%%,100%%{transform:translateY(0)}40%%{transform:translateY(-6px) scale(.98,1.03)}70%%{transform:translateY(0) scale(1.04,.96)}}img[src*='assets/']:hover{animation:hop .7s cubic-bezier(.23,1,.32,1)}@media (prefers-reduced-motion: reduce){img{animation:none !important}}" % INK

def screen(name, title, body, active=None, bg=BG, pad="0 18px 110px", gap=18, w=390, h=844, raw=False, x=0, y=0, inter=True):
    inner = body if raw else f'{status()}<div style="flex: 1; min-height: 0; padding: {pad}; display: flex; flex-direction: column; gap: {gap}px; overflow: hidden">{body}</div>{nav(active) if active else ""}'
    html = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
{CSS}
</style>
</helmet>
<div style="position: relative; width: {w}px; height: {h}px; box-sizing: border-box; background: {bg}; color: {INK}; font-family: Geist, system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">
{inner}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
    open(os.path.join(P, name), "w").write(html)
    e = {"x": x, "y": y, "w": w, "h": h, "title": title}
    if inter: e["is_interactive"] = True
    BOARDS[name] = e

COL = lambda i: i * 470
ROWY = [0, 1400, 2800, 4200, 5600, 7000]

# ================= Zeile 0: Onboarding =================
Y = ROWY[0]
screen("Main.dc.html", "1 · Willkommen", f'''
<div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 28px; padding-top: 30px">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
{"".join(f'<span style="height: 132px; border-radius: 28px; background: {TINT[n]}; display: flex; align-items: center; justify-content: center">{icon(n, 96)}</span>' for n in ["kalender", "stethoskop", "umschlag-euro", "kochtopf"])}
</div>
<div style="display: flex; flex-direction: column; gap: 10px">
<h1 style="margin: 0; font-size: 38px; line-height: 44px; font-weight: 700; letter-spacing: -1.2px">Euer Familienkalender, der mitdenkt<span style="color: {DONE}">.</span></h1>
<p style="margin: 0; font-size: 17px; line-height: 25px; color: {SUB}">Termine, Fristen und Post an einem ruhigen Ort. Für euch beide.</p>
</div></div>
<div style="display: flex; flex-direction: column; gap: 10px">{btn("Los geht’s", href="V1-Onb-Eltern.dc.html")}<span style="text-align: center; font-size: 14px; color: {SUB}">Ich wurde eingeladen</span></div>''', pad="0 22px 34px", x=COL(0), y=Y)

def field(label, val, right=""):
    return f'<label style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 18px; background: {ROW}"><span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 13px; color: {SUB}">{label}</span><input value="{val}" style="border: 0; padding: 0; font: 600 18px Geist, system-ui; color: {INK}; background: transparent; outline: none"></span>{right}</label>'
def choice(t, sub, href, on=False):
    st = f"background: {INK}; color: #FFFFFF;" if on else f"background: {ROW}; color: {INK};"
    return f'<a href="{href}" style="flex: 1; padding: 14px 16px; border-radius: 20px; {st} text-decoration: none; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 17px; font-weight: 600">{t}</span><span style="font-size: 13px; opacity: .7">{sub}</span></a>'
screen("V1-Onb-Eltern.dc.html", "2 · Über euch", f'''
{back("Main.dc.html", dots(1))}
{h1("Über euch")}
<p style="margin: -8px 0 0; font-size: 16px; line-height: 24px; color: {SUB}">Alles geht von euch beiden aus. Jeder bekommt eine Farbe, daran erkennt ihr später, wer was übernimmt.</p>
<div style="display: flex; flex-direction: column; gap: 8px">
{field("Dein Name", "Julia", av("J", 30))}
{field("Name deines Partners", "Tom", av("T", 30))}
</div>
<span style="font-size: 13.5px; color: {SUB}; margin-top: -8px">Tom lädst du gleich ein. Den Namen kann er selbst ändern.</span>
<span style="flex: 1"></span>
<span style="font-size: 20px; line-height: 26px; font-weight: 700; letter-spacing: -.4px; text-align: center">Habt ihr Kinder, oder ist eins unterwegs<span style="color: {DONE}">?</span></span>
<div style="display: flex; flex-direction: column; gap: 8px">{btn("Ja", href="V1-Onb-Baby.dc.html")}{btn("Noch nicht", False, href="V1-Onb-Kalender.dc.html")}</div>''', pad="0 18px 34px", x=COL(1), y=Y)

screen("V1-Onb-Baby.dc.html", "3 · Eure Kinder", f'''
{back("V1-Onb-Eltern.dc.html", dots(2))}
{h1("Eure Kinder")}
<div style="display: flex; padding: 4px; border-radius: 999px; background: #EAEAE7"><span style="flex: 1; height: 38px; border-radius: 999px; background: {ROW}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06)">Schon da</span><span style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 15px; color: {SUB}">Noch unterwegs</span></div>
<label style="display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; border-radius: 18px; background: {ROW}"><span style="font-size: 13px; color: {SUB}">Name</span><input value="Ben" style="border: 0; padding: 0; font: 600 18px Geist, system-ui; color: {INK}; background: transparent; outline: none"></label>
<div style="display: flex; align-items: center; padding: 12px 16px; border-radius: 18px; background: {ROW}"><span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 13px; color: {SUB}">Geboren am</span><span style="font-size: 18px; font-weight: 600">14. September 2026</span></span>{meta("6 Wochen")}</div>
<div style="display: flex; align-items: center; padding: 12px 16px; border-radius: 18px; background: {ROW}"><span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 13px; color: {SUB}">Bundesland</span><span style="font-size: 18px; font-weight: 600">Bayern</span></span>{li("chev", 18, MUTE)}</div>
<button style="height: 52px; border: 0; border-radius: 18px; background: transparent; box-shadow: inset 0 0 0 1.5px #D5D8D9; color: {INK}; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">{li("plus", 18)}Weiteres Kind hinzufügen</button>
<span style="flex: 1"></span>{btn("Weiter", href="V1-Onb-Kalender.dc.html")}''', pad="0 18px 34px", x=COL(2), y=Y)

screen("V1-Onb-Kalender.dc.html", "4 · Eure Kalender", f'''
{back("V1-Onb-Baby.dc.html", dots(3))}
{h1("Eure Kalender")}
<p style="margin: -8px 0 0; font-size: 16px; line-height: 24px; color: {SUB}">Damit nichts doppelt ist. Ihr seht eure Termine hier, der Rest bleibt privat.</p>
<div style="display: flex; flex-direction: column; gap: 8px">
{row("kalender", "iCloud-Kalender", "Julia · Familie, Arbeit", toggle(True))}
{row("sync", "Google Kalender", "Tom · tom.huber@gmail.com", toggle(True))}
{row("telefon", "Outlook", "nicht verbunden", toggle(False))}
</div>
<div style="display: flex; gap: 8px; align-items: center; font-size: 14px; color: {SUB}">{li("lock", 16, SUB)}Arbeitstermine erscheinen nur als gestreifter Block „Arbeit“.</div>
<span style="flex: 1"></span>{btn("Weiter", href="V1-Onb-Partner.dc.html")}<span style="text-align: center; font-size: 14px; color: {SUB}; margin-top: -8px">Später</span>''', pad="0 18px 34px", x=COL(3), y=Y)

PCOL = [("Rosa", JUL, JUL_INK), ("Blau", TOM, TOM_INK), ("Mint", "#E2EEEC", "#075056"), ("Sand", "#F7EDE1", "#9A5B13"), ("Salbei", "#E7EDE4", "#3F6B36"), ("Flieder", "#ECE6F4", "#5B3F8C")]
def color_pick(p, name, sel):
    sw = ""
    for i, (t, bg, fg) in enumerate(PCOL):
        ring = f"box-shadow: 0 0 0 2px {ROW}, 0 0 0 4px {fg};" if i == sel else ""
        sw += f'<span aria-label="{t}" style="width: 30px; height: 30px; border-radius: 999px; background: {bg}; {ring} flex-shrink: 0"></span>'
    sw = f'<span aria-label="Profilbild" style="width: 30px; height: 30px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px #C9CDCF; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{li("camera", 16, SUB)}</span>' + sw
    return f'<div style="display: flex; flex-direction: column; gap: 10px"><div style="display: flex; align-items: center; gap: 10px">{av(p, 28)}<span style="flex: 1; font-size: 15px; font-weight: 600">{name}</span>{meta(PCOL[sel][0])}</div><div style="display: flex; gap: 10px; padding-left: 2px">{sw}</div></div>'
screen("V1-Onb-Partner.dc.html", "5 · Partner einladen", f'''
{back("V1-Onb-Kalender.dc.html", dots(4))}
{h1("Zu zweit")}
<p style="margin: -8px 0 0; font-size: 16px; line-height: 24px; color: {SUB}">Tom bekommt einen Link. Er braucht kein iPhone, die App läuft auch auf Android.</p>
{card(f'<div style="display: flex; align-items: center; gap: 14px">{pair(44)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 17px; font-weight: 600">Julia und Tom</span>{meta("Ein Haushalt, eine Familie")}</span></div><div style="height: 1px; background: {HAIR}"></div><div style="display: flex; align-items: center; gap: 10px"><span style="flex: 1; font-size: 15px; color: {SUB}">familie.app/j/huber-7Q2</span>{chip(li("copy", 16) + "Kopieren")}</div>')}
{card(f'<span style="font-size: 13px; font-weight: 600; color: {SUB}">Profilbild oder Farbe</span>' + color_pick("J", "Julia", 0) + f'<div style="height: 1px; background: {HAIR}"></div>' + color_pick("T", "Tom", 1) + meta("Profilbild oder eine Farbe aus der Palette. Jeder wählt selbst, Tom kann seins später ändern."), 14, gap=12)}
<span style="flex: 1"></span>{btn("Einladung senden", href="V1-Onb-Jahr.dc.html", icon_n="send")}''', pad="0 18px 34px", x=COL(4), y=Y)

TL = [("u-heft", "U3", "4.–5. Woche", "erledigt", True), ("impfung", "Erste Impfungen", "ab 8. Woche · Fr 7. Nov", "", False),
      ("umschlag-euro", "Elterngeld", "Frist 12. Dez · noch 7 Wochen", "frist", False), ("reisepass", "Kinderreisepass", "vor dem Urlaub im März", "", False),
      ("stethoskop", "U4", "3.–4. Monat · Dez", "", False)]
def tl_rows(items):
    out = ""
    for i, (n, t, s, kind, done) in enumerate(items):
        line = f'<span style="position: absolute; left: 25px; top: 52px; bottom: -14px; width: 2px; background: {HAIR}"></span>' if i < len(items) - 1 else ""
        c = FRIST if kind == "frist" else SUB
        out += f'<div style="position: relative; display: flex; align-items: center; gap: 12px">{line}{tile(n, 52, 16)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 600; {"text-decoration: line-through; color: " + MUTE if done else ""}">{t}</span>{meta(s, c)}</span>{circle(done)}</div>'
    return out
screen("V1-Onb-Jahr.dc.html", "6 · Euer erstes Jahr", f'''
{back("V1-Onb-Partner.dc.html", dots(5))}
{h1("Bens erstes Jahr")}
<p style="margin: -8px 0 0; font-size: 16px; line-height: 24px; color: {SUB}">Ihr müsst nichts eintragen. Aus Geburtsdatum und Bundesland haben wir <b style="color: {INK}">23 Termine und Fristen</b> schon in euren Kalender gelegt.</p>
<div style="display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; border-radius: 24px; background: {ROW}"><div style="display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: {DONE}">{li("sparkle", 14, DONE)}Automatisch eingetragen</div>{tl_rows(TL[:4])}<a href="V1-Jahr.dc.html" style="display: flex; align-items: center; justify-content: center; gap: 4px; border-top: 1px solid {HAIR}; padding: 12px 0 2px; font-size: 15px; font-weight: 600; color: {INK}; text-decoration: none">Alle 23 anzeigen{li("chev", 16, MUTE)}</a></div>
<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 22px; background: {ROW}">{icon("glocke", 52)}<span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; font-weight: 600">Wir erinnern euch rechtzeitig</span>{meta("Push an euch beide, bei Fristen 2 Wochen vorher")}</span>{toggle(True)}</div>
<span style="flex: 1"></span>{btn("Aufgaben verteilen", href="V1-Onb-Karten.dc.html")}''', pad="0 18px 34px", x=COL(5), y=Y)

def swipe_card(n, frist, title, text, rot=0, ty=0, op=1, shadow=True, to=None, tx=0):
    bg = {"T": TOM, "J": JUL}.get(to, TINT[n])
    tag = f'<span style="position: absolute; top: 14px; {"left" if to == "T" else "right"}: 14px; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background: rgba(255,255,255,.75)">{av(to, 22)}<span style="font-size: 13.5px; font-weight: 600; color: {TOM_INK if to == "T" else JUL_INK}">{"Tom" if to == "T" else "Julia"}</span></span>' if to else ""
    sh = "box-shadow: 0 18px 40px rgba(22,35,42,.12);" if shadow else ""
    return (f'<div style="position: absolute; inset: 0; transform: translate({tx}px, {ty}px) rotate({rot}deg); opacity: {op}; border-radius: 30px; background: {ROW}; {sh} overflow: hidden; display: flex; flex-direction: column">'
            f'<div style="position: relative; height: 210px; background: {bg}; transition: background .2s ease; display: flex; align-items: center; justify-content: center">{tag}{icon(n, 150)}</div>'
            f'<div style="padding: 18px 20px; display: flex; flex-direction: column; gap: 8px">{meta(frist, FRIST)}<span style="font-size: 24px; line-height: 30px; font-weight: 700; letter-spacing: -.5px">{title}</span><span style="font-size: 15px; line-height: 22px; color: {SUB}">{text}</span></div></div>')
def swipe_deck(cards):
    return f'<div style="position: relative; height: 430px; margin: 0 6px">{cards}</div>'
def swipe_btns():
    def rb(inner, label, bg=ROW):
        return f'<span style="display: flex; flex-direction: column; align-items: center; gap: 6px"><button aria-label="{label}" style="width: 64px; height: 64px; border-radius: 999px; border: 0; background: {bg}; box-shadow: 0 0 0 1px {HAIR}; display: flex; align-items: center; justify-content: center">{inner}</button><span style="font-size: 13px; color: {SUB}">{label}</span></span>'
    return f'<div style="display: flex; justify-content: center; gap: 30px">{rb(av("J", 34), "Julia")}{rb(li("clock", 24), "Später")}{rb(av("T", 34), "Tom")}</div>'
screen("V1-Onb-Karten.dc.html", "7 · Wer kümmert sich?", f'''
{back("V1-Onb-Jahr.dc.html", dots(6))}
<div style="display: flex; justify-content: space-between; align-items: baseline"><span style="font-size: 22px; font-weight: 700; letter-spacing: -.5px">Wer kümmert sich<span style="color: {DONE}">?</span></span>{meta("2 von 6")}</div>
{swipe_deck(swipe_card("reisepass", "", "", "", 4, 14, .6, False) + swipe_card("impfung", "", "", "", -3, 7, .85, False) + swipe_card("umschlag-euro", "Frist 12. Dez · noch 7 Wochen", "Elterngeld beantragen", "Braucht eine Bescheinigung von Toms Arbeitgeber. Rückwirkend gibt es nur drei Monate.", 6, 4, to="T", tx=34))}
{swipe_btns()}
<span style="text-align: center; font-size: 13.5px; color: {SUB}">Links zu Julia, rechts zu Tom. Ihr entscheidet, die App schlägt niemanden vor.</span>
<a href="V1-Heute.dc.html" style="text-align: center; font-size: 15px; font-weight: 600; color: {INK}; text-decoration: none">Fertig, zu Heute</a>''', pad="0 18px 28px", gap=16, x=COL(6), y=Y)

screen("V1-Onb-Karten-Links.dc.html", "7b · Wischen nach links", f'''
{back("V1-Onb-Jahr.dc.html", dots(6))}
<div style="display: flex; justify-content: space-between; align-items: baseline"><span style="font-size: 22px; font-weight: 700; letter-spacing: -.5px">Wer kümmert sich<span style="color: {DONE}">?</span></span>{meta("3 von 6")}</div>
{swipe_deck(swipe_card("kochtopf", "", "", "", 4, 14, .6, False) + swipe_card("reisepass", "", "", "", -3, 7, .85, False) + swipe_card("impfung", "Fr 7. Nov · in 12 Tagen", "Erste Impfungen", "Beim Kinderarzt, zusammen mit der U4. Impfpass mitnehmen.", -6, 4, to="J", tx=-34))}
{swipe_btns()}
<span style="text-align: center; font-size: 13.5px; color: {SUB}">Beim Wischen färbt sich die Karte in der Farbe der Person. Loslassen weist zu.</span>
<a href="V1-Heute.dc.html" style="text-align: center; font-size: 15px; font-weight: 600; color: {INK}; text-decoration: none">Fertig, zu Heute</a>''', pad="0 18px 28px", gap=16, x=COL(7), y=Y)

# ================= Zeile 1: Heute, Kalender, Termin, Jahr =================
Y = ROWY[1]
def seg(items, active):
    return '<div style="display: flex; padding: 4px; border-radius: 999px; background: #EAEAE7">' + "".join(f'<a href="{h}" style="flex: 1; height: 34px; border-radius: 999px; {"background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.06); color: " + INK + "; font-weight: 600;" if t == active else "color: " + SUB + ";"} display: flex; align-items: center; justify-content: center; font-size: 14.5px; text-decoration: none">{t}</a>' for t, h in items) + '</div>'
def wrow(n, title, sub, right="", time=None, sub_c=SUB, href=None, strike=False):
    t = f'<span style="width: 44px; font-size: 13.5px; font-weight: 600; flex-shrink: 0">{time}</span>' if time is not None else ""
    tag = "a" if href else "div"; hr = f' href="{href}"' if href else ""
    deco = f"text-decoration: line-through; color: {MUTE};" if strike else ""
    return f'<{tag}{hr} style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: {ROW}; text-decoration: none; color: {INK}">{t}{icon(n, 34)}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 16px; line-height: 21px; font-weight: 600; {deco}">{title}</span>{meta(sub, sub_c)}</span>{right}</{tag}>'
screen("V1-Heute.dc.html", "Heute", f'''
{h1("Heute", "Donnerstag, 30. Oktober", '<a href="V1-Einstellungen.dc.html" aria-label="Familie und Einstellungen" style="display: flex; text-decoration: none">' + pair() + '</a>')}
<span style="font-size: 20px; line-height: 27px; font-weight: 600; letter-spacing: -.3px; margin-top: -4px">Drei Termine, eine Aufgabe und eine Frist, die näher rückt.</span>
<a href="V1-Termin.dc.html" style="display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 24px; background: {ROW}; text-decoration: none; color: {INK}">{tile("stethoskop", 64, 18)}<span style="flex: 1; display: flex; flex-direction: column; gap: 2px">{meta("In 40 Min · 9:30", DONE)}<span style="font-size: 19px; font-weight: 700; letter-spacing: -.3px">U6 bei Dr. Weber</span><span style="display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: {SUB}">{av("T", 18)}Tom bringt Ben</span></span>{li("chev", 18, MUTE)}</a>
{group(wrow("yogamatte", "Rückbildung", "Hebammenpraxis", av("J", 24), "14:00") + wrow("reisepass", "Bürgeramt: Pass", "Ben muss mit", av("T", 24), "16:00") + wrow("erledigt", "Passfotos machen", "Aufgabe · heute fällig", av("J", 24) , "") )}
{h2("Bald fällig")}
{group(wrow("umschlag-euro", "Elterngeld: Bescheinigung", "Frist 12. Dez · noch 6 Wochen", av("T", 24), href="V1-Foto-Zettel.dc.html", sub_c=FRIST))}''', active="Heute", gap=14, x=COL(0), y=Y)

def week_strip(sel=3):
    days = [("Mo", 27), ("Di", 28), ("Mi", 29), ("Do", 30), ("Fr", 31), ("Sa", 1), ("So", 2)]
    out = ""
    for i, (d, n) in enumerate(days):
        on = i == sel
        dot = f'<span style="width: 5px; height: 5px; border-radius: 999px; background: {DONE}"></span>' if i in (0, 2, 3, 4, 6) else '<span style="height: 5px"></span>'
        out += f'<span style="flex: 1; height: 66px; border-radius: 18px; background: {ROW}; {"box-shadow: inset 0 0 0 1.5px " + INK + ";" if on else ""} color: {INK}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px"><span style="font-size: 12px; opacity: .75">{d}</span><span style="font-size: 19px; font-weight: 650">{n}</span>{dot}</span>'
    return f'<div style="display: flex; gap: 5px">{out}</div>'
def seg3(active):
    return '<div style="display: flex; padding: 4px; border-radius: 999px; background: #EAEAE7">' + "".join(f'<a href="{h}" style="flex: 1; height: 34px; border-radius: 999px; {"background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.06); color: " + INK + "; font-weight: 600;" if t == active else "color: " + SUB + ";"} display: flex; align-items: center; justify-content: center; font-size: 14.5px; text-decoration: none">{t}</a>' for t, h in [("Tag", "V1-Kal-Tag.dc.html"), ("Woche", "V1-Kal-Woche.dc.html"), ("Monat", "V1-Kal-Monat.dc.html"), ("Jahr", "V1-Jahr.dc.html")]) + '</div>'
def tl_item(time, n, title, sub, right, last=False, work=None):
    if work:
        p, txt = work
        base, line, ink = (JUL, "#EFC6CF", JUL_INK) if p == "J" else (TOM, "#C3D5EC", TOM_INK)
        return f'<div style="display: flex; gap: 12px; align-items: stretch"><span style="width: 52px; font-size: 13px; color: {SUB}; padding-top: 6px">{time}</span><div style="flex: 1; height: 44px; border-radius: 14px; {stripes(base, line)}; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 13.5px; font-weight: 600; color: {ink}">{av(p, 20)}{txt}</div></div>'
    line = '' if last else f'<span style="position: absolute; left: 25px; top: 54px; bottom: -12px; width: 2px; background: {HAIR}"></span>'
    return f'<div style="display: flex; gap: 12px; align-items: flex-start"><span style="width: 52px; font-size: 13px; font-weight: 600; padding-top: 6px">{time}</span><div style="position: relative; flex: 1; display: flex; align-items: center; gap: 12px">{line}{tile(n, 52, 16)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 600">{title}</span>{meta(sub)}</span>{right}</div></div>'
screen("V1-Kal-Tag.dc.html", "Kalender · Tag", f'''
{h1("Oktober", None, pair())}
{seg3("Tag")}
{week_strip()}
{h2("Donnerstag, 30.", "4 Termine")}
<div style="display: flex; flex-direction: column; gap: 12px">
{tl_item("8:30", "", "", "", "", work=("T", "Arbeit · bis 16:00"))}
{tl_item("9:30", "stethoskop", "U6 bei Dr. Weber", "Tom bringt Ben", av("T", 24))}
{tl_item("14:00", "yogamatte", "Rückbildung", "Hebammenpraxis", av("J", 24))}
{tl_item("16:00", "reisepass", "Bürgeramt: Pass", "Ben muss mit", av("T", 24))}
{tl_item("18:30", "kochtopf", "Oma Renate kommt", "Abendessen", circle(), last=True)}
</div>''', active="Kalender", gap=14, x=COL(1), y=Y)

def week_grid():
    hours = list(range(8, 19))
    HP = 40
    top = 8
    cols = ""
    ev = {0: [(9, 1, "Hebi", "stethoskop", "#F8E8E5")], 1: [(10.5, 1, "U3", "u-heft", "#F6F0DD")],
          3: [(9.5, 1, "U6", "stethoskop", "#E6EEF4"), (14, 1, "Kurs", "yogamatte", "#E7EDE4"), (16, 1, "Pass", "reisepass", "#E2EEEC"), (18.3, .7, "Oma", "kochtopf", "#F2EEE7")],
          4: [(11, 1.5, "Markt", "kochtopf", "#F2EEE7")], 6: [(15, 2, "Zoo", "reise", "#E6EEF4")]}
    work = {0: ("T", 9, 16), 1: ("T", 9, 16), 2: ("J", 9, 13), 3: ("T", 8.5, 16), 4: ("T", 9, 14)}
    for d in range(7):
        inner = ""
        if d in work:
            p, a, b = work[d]
            base, line = (JUL, "#EFC6CF") if p == "J" else (TOM, "#C3D5EC")
            inner += f'<span style="position: absolute; left: 1px; right: 1px; top: {(a-top)*HP}px; height: {(b-a)*HP}px; border-radius: 8px; {stripes(base, line)}; opacity: .9"></span>'
        for (a, l, t, n, c) in ev.get(d, []):
            inner += f'<span style="position: absolute; left: 3px; right: 3px; top: {(a-top)*HP+2}px; height: {l*HP-4}px; border-radius: 8px; background: {c}; box-shadow: 0 0 0 1.5px #FFFFFF; padding: 3px 4px; box-sizing: border-box; font-size: 10.5px; font-weight: 700; display: flex; flex-direction: column; gap: 1px; overflow: hidden">{t}</span>'
        cols += f'<div style="position: relative; flex: 1; height: {len(hours)*HP}px">{inner}</div>'
    lines = "".join(f'<div style="position: absolute; left: 22px; right: 0; top: {i*HP}px; height: 1px; background: {HAIR}"></div><span style="position: absolute; left: 0; top: {i*HP-7}px; font-size: 10.5px; color: {MUTE}">{h}</span>' for i, h in enumerate(hours))
    head = "".join(f'<span style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px"><span style="font-size: 11.5px; color: {SUB}">{d}</span><span style="width: 28px; height: 28px; border-radius: 999px; {"background: " + INK + "; color: #FFFFFF;" if n == 30 else ""} display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600">{n}</span></span>' for d, n in [("Mo", 27), ("Di", 28), ("Mi", 29), ("Do", 30), ("Fr", 31), ("Sa", 1), ("So", 2)])
    return f'<div style="padding: 12px 10px 10px; border-radius: 24px; background: {ROW}; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; padding-left: 22px">{head}</div><div style="position: relative; padding-left: 22px">{lines}<div style="position: relative; display: flex; gap: 3px">{cols}</div></div></div>'
screen("V1-Kal-Woche.dc.html", "Kalender · Woche", f'''
{h1("Oktober", None, pair())}
{seg3("Woche")}
{week_grid()}
<div style="display: flex; gap: 14px; font-size: 13px; color: {SUB}"><span style="display: flex; align-items: center; gap: 6px"><span style="width: 18px; height: 12px; border-radius: 4px; {stripes(TOM, "#C3D5EC")}"></span>Tom arbeitet</span><span style="display: flex; align-items: center; gap: 6px"><span style="width: 18px; height: 12px; border-radius: 4px; {stripes(JUL, "#EFC6CF")}"></span>Julia arbeitet</span></div>''', active="Kalender", gap=14, x=COL(2), y=Y)

EV = {1: ["yogamatte"], 2: ["u-heft"], 8: ["yogamatte"], 12: ["telefon"], 15: ["yogamatte"], 17: ["geburtstag"], 22: ["yogamatte", "kochtopf"], 24: ["windeln"], 27: ["vertrag"], 29: ["stethoskop", "yogamatte", "kochtopf"], 31: ["reisepass"]}
def month_grid():
    days = [(d, False) for d in (28, 29, 30)] + [(d, True) for d in range(1, 32)] + [(1, False)]
    head = "".join(f'<span style="text-align: center; font-size: 12px; font-weight: 600; color: {SUB}">{d}</span>' for d in ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"])
    cells = ""
    for d, inm in days:
        today = inm and d == 29
        num = f'<span style="width: 26px; height: 26px; border-radius: 999px; {"background: " + INK + "; color: #FFFFFF;" if today else ""} display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: {700 if today else 500}; color: {"#FFFFFF" if today else (INK if inm else "#C4C9CB")}">{d}</span>'
        evs = EV.get(d, []) if inm else []
        ic = icon(evs[0], 24) if evs else ""
        more = f'<span style="font-size: 10.5px; font-weight: 700; color: {SUB}">+{len(evs) - 1}</span>' if len(evs) > 1 else ""
        bg = TINT.get(evs[0], ROW) if evs and not today else (ROW if inm else "transparent")
        ring = f"box-shadow: inset 0 0 0 1.5px {INK};" if today else ""
        cells += f'<span style="height: 52px; border-radius: 14px; background: {bg}; {ring} display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 4px; box-sizing: border-box">{num}<span style="display: flex; align-items: center; gap: 0">{ic}{more}</span></span>'
    return f'<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px">{head}{cells}</div>'
screen("V1-Kal-Monat.dc.html", "Kalender · Monat", f'''
{h1("Oktober", "2026", pair())}
{seg3("Monat")}
{month_grid()}
{h2("Do 29. Oktober", "3 Termine")}
{group(wrow("stethoskop", "U6 bei Dr. Weber", "Kinderarztpraxis Weber", av("T", 24), "9:30", href="V1-Termin.dc.html") + wrow("yogamatte", "Rückbildung", "Hebammenpraxis", av("J", 24), "14:00") + wrow("kochtopf", "Essen bei Lena", "Nachtisch mitbringen", pair(22), "18:30"))}''', active="Kalender", gap=12, x=COL(3), y=Y)

screen("V1-Termin.dc.html", "Termin", f'''
{back("V1-Heute.dc.html")}
<div style="height: 200px; margin: 0 -18px; background: {TINT["stethoskop"]}; display: flex; align-items: center; justify-content: center">{icon("stethoskop", 160)}</div>
<div style="display: flex; flex-direction: column; gap: 4px">{meta("Do 30. Oktober · 9:30–10:15")}<h1 style="margin: 0; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -.8px">U6 bei Dr. Weber<span style="color: {DONE}">.</span></h1>{meta("Kinderarztpraxis Weber · Hauptstr. 12")}</div>
{card(f'<div style="display: flex; align-items: center; gap: 12px">{av("T", 32)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 15px; font-weight: 600">Tom bringt Ben</span>{meta("hat er selbst übernommen")}</span>{chip("Ändern")}</div>', 14)}
{card(f'<span style="font-size: 13px; font-weight: 600; color: {SUB}">Mitnehmen</span><div style="display: flex; align-items: center; gap: 10px">{circle(True)}<span style="font-size: 15px">U-Heft</span></div><div style="display: flex; align-items: center; gap: 10px">{circle()}<span style="font-size: 15px">Impfpass</span></div><div style="display: flex; align-items: center; gap: 10px">{circle()}<span style="font-size: 15px">Versichertenkarte</span></div><div style="display: flex; align-items: center; gap: 10px; color: {MUTE}">{li("plus", 22, MUTE)}<span style="font-size: 15px">Hinzufügen</span></div>', 14, gap=10)}
<div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: {SUB}">{li("sparkle", 16, SUB)}Aus der Bestätigung von Doctolib, 12. Oktober</div>''', gap=14, pad="0 18px 34px", x=COL(4), y=Y)

def ring(size=250):
    import math
    c = size / 2; r = size / 2 - 22
    pts = ""
    marks = [(0.06, DONE, True), (0.12, DONE, True), (0.18, FRIST, False), (0.26, MUTE, False), (0.33, MUTE, False), (0.42, MUTE, False), (0.5, MUTE, False), (0.62, MUTE, False), (0.75, MUTE, False), (0.92, MUTE, False)]
    for f, col, fill in marks:
        a = -math.pi / 2 + 2 * math.pi * f
        x, y = c + r * math.cos(a), c + r * math.sin(a)
        pts += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{col if fill else "#FFFFFF"}" stroke="{col}" stroke-width="2.5"/>'
    a = -math.pi / 2 + 2 * math.pi * .15
    arc_end = (c + r * math.cos(a), c + r * math.sin(a))
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" role="img" aria-label="Jahresring mit Terminen" style="flex-shrink: 0">'
            f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="{HAIR}" stroke-width="10"/>'
            f'<path d="M {c} {c-r} A {r} {r} 0 0 1 {arc_end[0]:.1f} {arc_end[1]:.1f}" fill="none" stroke="{DONE}" stroke-width="10" stroke-linecap="round"/>{pts}</svg>')
screen("V1-Jahr.dc.html", "Jahr", f'''
{h1("Bens Jahr", None, pair())}
{seg3("Jahr")}
<div style="position: relative; align-self: center; width: 250px; height: 250px">{ring()}<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center"><span style="font-size: 40px; font-weight: 700; letter-spacing: -1.5px">7</span>{meta("Wochen alt")}</div></div>
{h2("Als Nächstes", "23 im Jahr")}
<div style="display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 24px; background: {ROW}">{tl_rows(TL[1:4])}</div>''', active="Kalender", gap=14, x=COL(5), y=Y)

# ================= Zeile 2: Neu + Foto zu Infozettel =================
Y = ROWY[2]
def sheet_opt(n, t, s, href=None):
    tag = "a" if href else "div"; hr = f' href="{href}"' if href else ""
    return f'<{tag}{hr} style="display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 22px; background: {ROW}; text-decoration: none; color: {INK}">{icon(n, 58)}<span style="font-size: 16px; font-weight: 600">{t}</span>{meta(s)}</{tag}>'
screen("V1-Neu.dc.html", "Neu", f'''
<div style="position: absolute; inset: 0; background: rgba(22,35,42,.28)"></div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 18px 30px; border-radius: 32px 32px 0 0; background: {BG}; display: flex; flex-direction: column; gap: 16px">
<span style="align-self: center; width: 40px; height: 5px; border-radius: 999px; background: #D5D8D9"></span>
<span style="font-size: 24px; font-weight: 700; letter-spacing: -.5px">Was kommt dazu<span style="color: {DONE}">?</span></span>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
{sheet_opt("kamera-scan", "Foto", "Brief, Zettel, Bescheid", "V1-Foto-Kamera.dc.html")}
{sheet_opt("kalender", "Termin", "für euch oder Ben", "V1-Termin-Neu.dc.html")}
{sheet_opt("erledigt", "Aufgabe", "mit oder ohne Datum")}
{sheet_opt("papier-stift", "Entwurf", "Antwort schreiben lassen", "V1-Entwurf.dc.html")}
</div>
<a href="V1-Chat.dc.html" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px 10px 10px; border-radius: 20px; background: {ROW}; text-decoration: none; color: {INK}">{icon("chat", 40)}<span style="flex: 1; font-size: 15.5px; font-weight: 600">Frag den Assistenten</span>{li("mic", 20, SUB)}</a>
<div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 18px; background: {ROW}">{li("inbox", 20, SUB)}<span style="flex: 1; font-size: 14px; color: {SUB}">Oder weiterleiten an <b style="color: {INK}">huber-7q2@familie.app</b></span>{li("copy", 18, SUB)}</div>
</div>''', raw=True, x=COL(0), y=Y)

def frow(label, val, right="", ic=None):
    l = li(ic, 20, SUB) if ic else ""
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: {ROW}">{l}<span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 12.5px; color: {SUB}">{label}</span><span style="font-size: 16px; font-weight: 600">{val}</span></span>{right}</div>'
def kat(n, t, on=False):
    st = f"background: {TINT[n]}; box-shadow: inset 0 0 0 1.5px {INK};" if on else f"background: {TINT[n]};"
    return f'<span style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; border-radius: 18px; {st} flex: 1">{icon(n, 40)}<span style="font-size: 12px; font-weight: {600 if on else 500}">{t}</span></span>'
def who(inner, t, on=False):
    st = f"background: {INK}; color: #FFFFFF;" if on else f"background: {ROW}; color: {INK};"
    return f'<span style="flex: 1; height: 44px; border-radius: 999px; {st} display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14.5px; font-weight: 600">{inner}{t}</span>'
screen("V1-Foto-Kamera.dc.html", "Foto · Aufnehmen", f'''
<div style="position: absolute; inset: 0; background: #1E2427"></div>
<div style="position: absolute; left: 34px; right: 34px; top: 150px; height: 470px; border-radius: 8px; background: #F4F1EA; transform: rotate(-2deg); padding: 30px 26px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 20px 50px rgba(0,0,0,.4)">
<span style="font-size: 11px; color: #6B6B6B">Elterngeldstelle Bayern · ZBFS</span><span style="font-size: 15px; font-weight: 700; color: #222">Ihr Antrag auf Elterngeld</span>
{"".join(f'<span style="height: 7px; border-radius: 3px; background: #D8D4CB; width: {w}%"></span>' for w in [92, 88, 95, 60, 90, 85, 70, 93, 40])}
<span style="font-size: 12px; color: #333; font-weight: 600">Bitte reichen Sie bis 12.12.2026 nach: Arbeitgeberbescheinigung</span>
{"".join(f'<span style="height: 7px; border-radius: 3px; background: #D8D4CB; width: {w}%"></span>' for w in [90, 75, 88])}
</div>
<div style="position: absolute; left: 24px; right: 24px; top: 130px; height: 510px; border-radius: 22px; box-shadow: inset 0 0 0 3px rgba(255,255,255,.9)"></div>
<div style="position: absolute; top: 64px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 22px"><a href="V1-Neu.dc.html" aria-label="Schließen" style="width: 42px; height: 42px; border-radius: 999px; background: rgba(255,255,255,.14); display: flex; align-items: center; justify-content: center">{li("x", 20, "#FFFFFF")}</a><span style="height: 42px; padding: 0 16px; border-radius: 999px; background: rgba(255,255,255,.14); color: #FFFFFF; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px">{li("flash", 16, "#FFFFFF")}Seite erkannt</span></div>
<div style="position: absolute; bottom: 44px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 14px"><span style="color: rgba(255,255,255,.8); font-size: 14px">Alles im Rahmen, gleich geht’s weiter</span><a href="V1-Foto-Warten.dc.html" aria-label="Aufnehmen" style="width: 76px; height: 76px; border-radius: 999px; box-shadow: inset 0 0 0 4px #FFFFFF; display: flex; align-items: center; justify-content: center"><span style="width: 60px; height: 60px; border-radius: 999px; background: #FFFFFF"></span></a></div>''', raw=True, bg="#1E2427", x=COL(1), y=Y)

def fact(k, v, ok=True):
    return f'<div style="display: flex; gap: 12px; align-items: flex-start">{li("check", 18, DONE, 2.2) if ok else li("clock", 18, FRIST)}<span style="width: 58px; font-size: 14px; color: {SUB}; padding-top: 1px">{k}</span><span style="flex: 1; font-size: 16px; line-height: 22px; font-weight: 600">{v}</span></div>'
def wo_row():
    mapthumb = f'<span aria-hidden="true" style="width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0; position: relative; background: #E9EEE6; overflow: hidden"><span style="position: absolute; left: -6px; right: -6px; top: 22px; height: 7px; background: #FFFFFF; transform: rotate(-18deg)"></span><span style="position: absolute; top: -6px; bottom: -6px; left: 30px; width: 6px; background: #FFFFFF"></span><span style="position: absolute; left: 18px; top: 12px">{li("pin", 18, FRIST, 2.2)}</span></span>'
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 16px; background: {ROW}">{li("pin", 20, SUB)}<span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 12.5px; color: {SUB}">Wo · Suche über Google Maps</span><span style="font-size: 16px; font-weight: 600">Kinderarztpraxis Weber</span><span style="font-size: 12.5px; color: {MUTE}">Hauptstr. 12, Nürnberg</span></span>{mapthumb}</div>'
def mitnehmen():
    items = [("U-Heft", True), ("Impfpass", True), ("Versichertenkarte", True), ("Windeln & Body", True)]
    ch = "".join(chip((li("check", 13, DONE, 2.4) if on else li("plus", 13, SUB)) + t, "#E2EEEC" if on else "#EFEFEC", DONE if on else SUB) for t, on in items)
    return card(f'<div style="display: flex; align-items: center; gap: 10px">{li("check", 20, SUB)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 15px; font-weight: 600">Mitnehmen</span>{meta("Vorschlag für die U5, anpassbar")}</span>{li("plus", 20, SUB)}</div><div style="display: flex; flex-wrap: wrap; gap: 6px">{ch}</div>', 14, gap=10)
# ================= Zeile 3: Eingang, Aufgaben, Karten, Entwürfe =================
Y = ROWY[3]
def inbox_item(n, src, title, made, state):
    st = chip(li("check", 14, DONE, 2.4) + "Eingetragen", "#E2EEEC", DONE) if state == "ok" else f'<span style="display: flex; gap: 6px">{chip("Nein")}{chip("Ja", "#E2EEEC", DONE)}</span>'
    return card(f'<div style="display: flex; align-items: center; gap: 12px">{tile(n, 48, 14)}<span style="flex: 1; display: flex; flex-direction: column">{meta(src)}<span style="font-size: 16px; font-weight: 600">{title}</span></span></div><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">{meta(made)}{st}</div>', 14, gap=10)
screen("V1-Eingang.dc.html", "Eingang", f'''
{h1("Eingang", None, pair())}
{seg([("Neu · 2", "V1-Eingang.dc.html"), ("Dokumente", "V1-Dokumente.dc.html")], "Neu · 2")}
<p style="margin: -2px 0 0; font-size: 15px; line-height: 22px; color: {SUB}">Was der Assistent gelesen hat. Ihr bestätigt, er trägt ein.</p>
{h2("Zu bestätigen", "2")}
{inbox_item("brief-gelesen", "Mail von Doctolib · vor 10 Min", "Impftermin Fr 7. Nov, 10:20", "wird Termin für Ben", "ask")}
{inbox_item("geburtstag", "Foto von Julia · gestern", "Einladung: Mias 3. Geburtstag", "So 9. Nov · Geschenk als Aufgabe", "ask")}
{h2("Eingetragen", "diese Woche")}
{inbox_item("umschlag-euro", "Foto von Tom · Do", "Elterngeld: Bescheinigung fehlt", "Frist 12. Dez · Aufgabe Tom", "ok")}''', active="Eingang", gap=12, x=COL(0), y=Y)



screen("V1-Aufgaben.dc.html", "Listen · Aufgaben", f'''
{h1("Listen", "6 offen, 1 erledigt", pair())}
{ltabs("Aufgaben")}
<a href="V1-Karten.dc.html" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 24px; background: {ROW}; text-decoration: none; color: {INK}">{icon("hand-nimmt", 56)}<span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 17px; font-weight: 650">4 ohne Zuständigen</span>{meta("Gemeinsam aufteilen")}</span>{li("chev", 18, MUTE)}</a>
{group(wrow("umschlag-euro", "Bescheinigung anfragen", "bis 28. Nov", av("T", 24), sub_c=FRIST) + wrow("reisepass", "Passfotos machen", "vor Fr 31.", av("J", 24)) + wrow("geschenk", "Geschenk für Oma Inge", "bis So", av("T", 24)) + wrow("u-heft", "Geburtsurkunde abholen", "erledigt von Julia", circle(True), strike=True))}
<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; background: {ROW}">{li("plus", 20, SUB)}<span style="flex: 1; font-size: 16px; color: {MUTE}">Aufgabe hinzufügen …</span></div>''', active="Listen", gap=14, pad="0 18px 110px", x=COL(6), y=ROWY[1])

screen("V1-Einkauf.dc.html", "Listen · Einkauf", f'''
{h1("Listen", "Einkauf · 5 Dinge", pair())}
{ltabs("Einkauf")}
<a href="V1-Einkauf-Neu.dc.html" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; background: {ROW}; text-decoration: none">{li("plus", 20, SUB)}<span style="flex: 1; font-size: 16px; color: {MUTE}">Hinzufügen …</span>{li("mic", 20, SUB)}</a>
{h2("Drogerie", "2")}
{group(item("Windeln Gr. 2", "J", note="ab Dezember Größe 3", href="V1-Einkauf-Hinweis.dc.html") + item("Wundcreme", "T", href="V1-Einkauf-Bearbeiten.dc.html"))}
{h2("Supermarkt", "3")}
{group(item("Hafermilch", "T", note="2 · ungesüßt", href="V1-Einkauf-Bearbeiten.dc.html") + item("Brot", "J", href="V1-Einkauf-Bearbeiten.dc.html") + item("Kaffee", "J", href="V1-Einkauf-Bearbeiten.dc.html") + item("Bananen", "T", True))}''', active="Listen", gap=12, x=COL(8), y=ROWY[1])

def sugg(t, sub="", added=False):
    r = li("check", 18, DONE, 2.4) if added else li("plus", 18, SUB)
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 13px 16px; background: {ROW}"><span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: {600 if added else 500}; color: {DONE if added else INK}">{t}</span>{meta(sub) if sub else ""}</span>{r}</div>'
def qchip(t, on=False):
    st = f"background: #E2EEEC; color: {DONE};" if on else f"background: {ROW}; color: {INK}; box-shadow: inset 0 0 0 1px {HAIR};"
    return f'<span style="height: 36px; padding: 0 14px; border-radius: 999px; {st} font-size: 14.5px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px">{li("check", 14, DONE, 2.4) if on else ""}{t}</span>'
screen("V1-Einkauf-Neu.dc.html", "Einkauf · Hinzufügen", f'''
<div style="display: flex; align-items: center; gap: 10px"><div style="flex: 1; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 14px; border-radius: 16px; background: {ROW}; box-shadow: inset 0 0 0 1.5px {INK}">{li("plus", 20, SUB)}<span style="font-size: 17px; font-weight: 500">Ha<span style="display: inline-block; width: 2px; height: 20px; background: {INK}; vertical-align: -4px; margin-left: 1px"></span></span></div><a href="V1-Einkauf.dc.html" style="font-size: 15px; font-weight: 600; color: {INK}; text-decoration: none">Fertig</a></div>
{group(sugg("Hafermilch", "Supermarkt · zuletzt vor 5 Tagen", True) + sugg("Haferflocken", "Supermarkt") + sugg("Handcreme", "Drogerie") + sugg("„Ha“ als neues Ding", ""))}
{h2("Oft bei euch")}
<div style="display: flex; flex-wrap: wrap; gap: 8px">{qchip("Windeln Gr. 2")}{qchip("Feuchttücher")}{qchip("Brot", True)}{qchip("Bananen")}{qchip("Kaffee")}{qchip("Milch")}{qchip("Eier")}{qchip("Wundcreme")}</div>
<span style="font-size: 13.5px; line-height: 19px; color: {SUB}">Tippen fügt hinzu, nochmal tippen nimmt es wieder raus. Wir sortieren es selbst in Drogerie oder Supermarkt.</span>''', pad="0 18px 34px", gap=14, x=COL(11), y=ROWY[1])

def sw_row(t, who, mode):
    if mode == "left":
        act = f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 96px; background: #C7372F; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 13px; font-weight: 600">{li("x", 18, "#FFFFFF", 2.2)}Löschen</span>'; shift = -96
    else:
        act = f'<a href="V1-Einkauf-Bearbeiten.dc.html" style="position: absolute; left: 0; top: 0; bottom: 0; width: 96px; background: #5B666B; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 13px; font-weight: 600; text-decoration: none">{li("papier", 18, "#FFFFFF", 2)}Bearbeiten</a>'; shift = 96
    return f'<div style="position: relative; overflow: hidden; background: {ROW}">{act}<div style="position: relative; transform: translateX({shift}px); display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: {ROW}; box-shadow: 0 0 0 1px {HAIR}">{circle()}<span style="flex: 1; font-size: 16px; font-weight: 500">{t}</span>{av(who, 22)}</div></div>'
screen("V1-Einkauf-Wischen.dc.html", "Einkauf · Wischen", f'''
{h1("Listen", "Einkauf · 5 Dinge", pair())}
{ltabs("Einkauf")}
{h2("Drogerie", "2")}
{group(item("Windeln Gr. 2", "J", note="ab Dezember Größe 3") + item("Wundcreme", "T"))}
{h2("Supermarkt", "3")}
{group(item("Hafermilch", "T", note="2 · ungesüßt") + sw_row("Brot vom Bäcker, Vollkorn", "J", "left") + item("Kaffee", "J"))}
<div style="display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; line-height: 19px; color: {SUB}"><span>Haken antippen: erledigt. Text antippen: bearbeiten.</span><span>Nach links wischen: löschen.</span></div>
<div style="position: absolute; left: 18px; right: 18px; bottom: 98px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; background: {INK}; color: #FFFFFF; font-size: 15px">{li("x", 18, "#FFFFFF")}<span style="flex: 1">Brot vom Bäcker gelöscht</span><span style="font-weight: 600">Rückgängig</span></div>''', active="Listen", gap=12, x=COL(12), y=ROWY[1])

def ef(label, val, right=""):
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: {ROW}"><span style="width: 76px; font-size: 14px; color: {SUB}">{label}</span><span style="flex: 1; font-size: 16px; font-weight: 600">{val}</span>{right}</div>'
def caret(): return f'<span style="display: inline-block; width: 2px; height: 21px; background: {INK}; vertical-align: -4px; margin-left: 1px"></span>'
def inline_edit():
    return (f'<div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: {ROW}">'
            f'<div style="display: flex; align-items: center; gap: 12px">{circle()}<span style="flex: 1; min-width: 0; font-size: 17px; font-weight: 500">2 Hafermilch, ungesüßt{caret()}</span>{av("T", 26)}</div>'
            f'<span style="padding-left: 38px; font-size: 13px; color: {MUTE}">Menge und Notiz einfach mitschreiben</span></div>')
def kb():
    def keys(row, pad=0):
        return f'<div style="display: flex; gap: 6px; padding: 0 {pad}px">' + "".join(f'<span style="flex: 1; height: 42px; border-radius: 6px; background: #FFFFFF; box-shadow: 0 1px 0 #8E9094; display: flex; align-items: center; justify-content: center; font-size: 21px; color: #000">{k}</span>' for k in row) + '</div>'
    return (f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 282px; background: #D3D5DB; padding: 8px 4px 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 11px">'
            f'{keys("qwertzuiopü")}{keys("asdfghjklöä")}{keys("yxcvbnm", 28)}'
            f'<div style="display: flex; gap: 6px"><span style="width: 88px; height: 42px; border-radius: 6px; background: #ABAFBA; display: flex; align-items: center; justify-content: center; font-size: 16px">123</span><span style="flex: 1; height: 42px; border-radius: 6px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #000">Leerzeichen</span><span style="width: 88px; height: 42px; border-radius: 6px; background: {INK}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600">Fertig</span></div></div>')
screen("V1-Einkauf-Bearbeiten.dc.html", "Einkauf · Bearbeiten (wie Wabi)", f'''
{h1("Listen", "Einkauf · 5 Dinge", pair())}
{ltabs("Einkauf")}
{h2("Supermarkt", "3")}
{group(inline_edit() + '<div style="opacity: .4">' + item("Brot", "J") + item("Kaffee", "J") + '</div>')}
<span style="font-size: 13.5px; line-height: 19px; color: {SUB}">Text antippen: Die Zeile wird zum Textfeld, sonst nichts. Menge und Notiz liest die App aus dem Text, den Bereich sortiert sie selbst. Person antippen wechselt Tom, Julia, niemand.</span>
{kb()}''', pad="0 18px 34px", gap=12, x=COL(13), y=ROWY[1])

screen("V1-Einkauf-Hinweis.dc.html", "Einkauf · Assistent erkennt Muster", f'''
{h1("Listen", "Einkauf · 5 Dinge", pair())}
{ltabs("Einkauf")}
<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 22px; background: {ROW}">
<div style="display: flex; gap: 12px; align-items: flex-start">{icon("windeln", 44)}<span style="flex: 1; display: flex; flex-direction: column; gap: 4px"><span style="display: flex; align-items: center; gap: 5px; font-size: 13px; color: {SUB}">{li("sparkle", 13, SUB)}Aufgefallen</span><span style="font-size: 16.5px; line-height: 22px; font-weight: 600">Windeln und Feuchttücher kauft ihr etwa alle 12 Tage.</span><span style="font-size: 14px; line-height: 20px; color: {SUB}">Soll ich ein Abo für euch aufsetzen? Dann kommen sie von selbst, meist etwas günstiger. Ihr bestätigt vorher.</span></span></div>
<div style="display: flex; gap: 8px; padding-left: 56px"><a href="V1-Einkauf-Abo.dc.html" style="flex: 1; height: 40px; border-radius: 999px; background: {INK}; color: #FFFFFF; font-size: 14.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Ja, aufsetzen</a><span style="flex: 1; height: 40px; border-radius: 999px; box-shadow: inset 0 0 0 1px {HAIR}; font-size: 14.5px; font-weight: 600; color: {INK}; display: flex; align-items: center; justify-content: center">Nein, danke</span></div>
</div>
{h2("Drogerie", "2")}
{group(item("Windeln Gr. 2", "J", note="ab Dezember Größe 3") + item("Feuchttücher", "T"))}
{h2("Supermarkt", "3")}
{group(item("Hafermilch", "T", note="2 · ungesüßt") + item("Brot", "J") + item("Kaffee", "J"))}''', active="Listen", gap=12, x=COL(14), y=ROWY[1])

def opt(t, sub, price, on=False):
    st = f"box-shadow: inset 0 0 0 1.5px {INK};" if on else ""
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 18px; background: {ROW}; {st}"><span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 600">{t}</span>{meta(sub)}</span><span style="font-size: 15px; font-weight: 600">{price}</span></div>'
screen("V1-Einkauf-Abo.dc.html", "Einkauf · Abo-Optionen", f'''
{back("V1-Einkauf-Hinweis.dc.html")}
<div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: 13.5px; color: {SUB}">Windeln Gr. 2 · etwa 3 Packungen im Monat</span><span style="font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -.8px">So könnte es von selbst kommen.</span></div>
<div style="display: flex; flex-direction: column; gap: 8px">
{opt("Drogerie-Abo", "Lieferung alle 2 Wochen · jederzeit pausieren", "ca. –10 %", True)}
{opt("Versandhändler Spar-Abo", "Rabatt steigt mit mehr Abo-Artikeln", "bis –15 %")}
{opt("Weiter selbst kaufen", "Bleibt auf eurer Liste wie bisher", "")}
</div>
{card(f'<div style="display: flex; gap: 10px">{li("sync", 18, SUB)}<span style="flex: 1; font-size: 14px; line-height: 20px; color: {SUB}">Wir denken mit: Ab Dezember braucht Ben Größe 3. Wir erinnern euch, das Abo umzustellen.</span></div>', 14)}
<span style="flex: 1"></span>
<span style="font-size: 12.5px; line-height: 17px; color: {MUTE}; text-align: center">Ihr schließt das Abo selbst beim Händler ab. Wir verdienen daran nichts.</span>
{btn("Zum Drogerie-Abo")}''', pad="0 18px 34px", gap=14, x=COL(15), y=ROWY[1])

def tpl(n, t, s, on=False):
    st = f"box-shadow: inset 0 0 0 1.5px {INK};" if on else ""
    lead = tile(n, 44, 13) if n else f'<span style="width: 44px; height: 44px; border-radius: 13px; background: #EFEFEC; display: flex; align-items: center; justify-content: center">{li("plus", 20, SUB)}</span>'
    return f'<span style="display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 12px; border-radius: 18px; background: {ROW}; {st}">{lead}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 15.5px; font-weight: 600">{t}</span>{meta(s)}</span>{li("check", 18, INK, 2.2) if on else ""}</span>'
screen("V1-Liste-Neu.dc.html", "Listen · Neue Liste", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><a href="V1-Aufgaben.dc.html" style="font-size: 15px; color: {SUB}; text-decoration: none">Abbrechen</a><span style="width: 70px"></span></div>
<label style="display: flex; flex-direction: column; gap: 4px; padding: 6px 2px 0"><input value="Kliniktasche" style="border: 0; padding: 0; font: 700 30px Geist, system-ui; letter-spacing: -.9px; color: {INK}; background: transparent; outline: none"><span style="font-size: 14px; color: {SUB}">Für euch beide sichtbar</span></label>
<span style="font-size: 15px; font-weight: 600; margin-top: 4px">Womit anfangen?</span>
<div style="display: flex; flex-direction: column; gap: 8px">
{tpl(None, "Leer", "Ihr tragt selbst ein")}
{tpl("hebamme", "Kliniktasche", "18 Dinge für Geburt und Wochenbett", True)}
{tpl("reise", "Urlaub mit Baby", "Packliste, 24 Dinge")}
{tpl("einkauf", "Erstausstattung", "Was ihr vor der Geburt braucht")}
</div>
<span style="flex: 1"></span>{btn("Liste anlegen", href="V1-Liste-Klinik.dc.html")}''', pad="0 18px 34px", gap=12, x=COL(9), y=ROWY[1])

screen("V1-Liste-Klinik.dc.html", "Listen · Kliniktasche", f'''
{h1("Listen", "Kliniktasche · 12 von 18 gepackt", pair())}
{ltabs("Kliniktasche")}
<div style="height: 6px; border-radius: 999px; background: {HAIR}; overflow: hidden"><span style="display: block; width: 66%; height: 100%; background: {DONE}"></span></div>
{h2("Für Julia", "5 von 8")}
{group(item("Mutterpass", done=True) + item("Bequeme Kleidung", done=True) + item("Stilleinlagen", "J") + item("Ladekabel, lang", "T"))}
{h2("Für Ben", "4 von 6")}
{group(item("Erstes Outfit, Größe 50", done=True) + item("Babyschale fürs Auto", "T", note="vor der Entlassung einbauen"))}
<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; background: {ROW}">{li("plus", 20, SUB)}<span style="flex: 1; font-size: 16px; color: {MUTE}">Hinzufügen …</span></div>''', active="Listen", gap=12, x=COL(10), y=ROWY[1])

screen("V1-Karten.dc.html", "Aufgaben aufteilen", f'''
{back("V1-Aufgaben.dc.html", meta("1 von 4"))}
<span style="font-size: 24px; font-weight: 700; letter-spacing: -.5px">Wer kümmert sich<span style="color: {DONE}">?</span></span>
{swipe_deck(swipe_card("kochtopf", "", "", "", 4, 14, .6, False) + swipe_card("windeln", "", "", "", -3, 7, .85, False) + swipe_card("geschenk", "bis So 2. Nov", "Geschenk für Oma Inge", "70. Geburtstag. Julia hat eine Idee notiert: Fotobuch vom ersten Monat."))}
{swipe_btns()}
<span style="text-align: center; font-size: 13.5px; color: {SUB}">Wischen oder tippen. Was ihr später entscheidet, bleibt im Stapel.</span>''', pad="0 18px 34px", gap=16, x=COL(1), y=Y)

screen("V1-Entwurf.dc.html", "Entwurf · Anlass", f'''
{back("V1-Neu.dc.html", meta("Neuer Entwurf"))}
{h1("Worum geht’s")}
<div style="display: flex; flex-direction: column; gap: 8px">
<a href="V1-Entwurf-Text.dc.html" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 10px; border-radius: 22px; background: {ROW}; box-shadow: inset 0 0 0 2px {INK}; text-decoration: none; color: {INK}">{tile("brief-gelesen", 52, 16)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 600">Antwort auf einen Brief</span>{meta("Vermieter: Nebenkosten 2025")}</span>{li("check", 20, INK, 2.2)}</a>
{row("telefon", "Absage oder Verschiebung", "Termin, Kurs, Besuch")}
{row("vertrag", "Antrag oder Kündigung", "Versicherung, Abo, Vertrag")}
</div>
<label style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 20px; background: {ROW}"><span style="font-size: 13px; color: {SUB}">Was soll drinstehen?</span><textarea rows="3" style="border: 0; padding: 0; resize: none; font: 16px/23px Geist, system-ui; color: {INK}; background: transparent; outline: none">Bitte um Belege für die Hausmeisterkosten, die sind doppelt so hoch wie letztes Jahr.</textarea></label>
<span style="flex: 1"></span>{btn("Entwurf schreiben", href="V1-Entwurf-Text.dc.html", icon_n="sparkle")}''', pad="0 18px 34px", gap=14, x=COL(2), y=Y)

screen("V1-Entwurf-Text.dc.html", "Entwurf · Text", f'''
{back("V1-Entwurf.dc.html", meta("Entwurf"))}
<div style="display: flex; align-items: center; gap: 12px">{tile("papier-stift", 52, 16)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 17px; font-weight: 650">An Hausverwaltung Berger</span>{meta("Re: Nebenkostenabrechnung 2025")}</span></div>
<div style="flex: 1; min-height: 0; padding: 18px; border-radius: 24px; background: {ROW}; font-size: 15.5px; line-height: 24px; display: flex; flex-direction: column; gap: 12px; overflow: hidden">
<p style="margin: 0">Sehr geehrte Frau Berger,</p>
<p style="margin: 0">vielen Dank für die Nebenkostenabrechnung 2025. Die Position Hausmeister ist mit 612 € etwa doppelt so hoch wie im Vorjahr.</p>
<p style="margin: 0">Bitte senden Sie uns die Belege dazu, damit wir die Abrechnung prüfen können. Bis dahin behalten wir uns die Zahlung des Nachbetrags vor.</p>
<p style="margin: 0">Mit freundlichen Grüßen<br>Julia und Tom Huber</p></div>
<div style="display: flex; gap: 6px; flex-wrap: wrap">{chip("Kürzer")}{chip("Freundlicher")}{chip("Bestimmter")}</div>
<div style="display: flex; flex-direction: column; gap: 8px">{btn("Senden über …", icon_n="send")}{btn("Text kopieren", False, icon_n="copy")}</div>
<span style="text-align: center; font-size: 13px; color: {SUB}; margin-top: -4px">WhatsApp, Mail oder SMS: Ihr wählt Empfänger und schickt selbst ab.</span>''', pad="0 18px 26px", gap=12, x=COL(3), y=Y)

# ================= Zeile 4: System + Widgets =================
# ================= Zeile 4: Assistent, Hinweise, Dokumente, Einstellungen, Plus (Spec-Abgleich 25.10.) =================
Y = ROWY[4]
def notif(title, body, when, actions=None):
    acts = ""
    if actions:
        acts = '<div style="display: flex; gap: 1px; margin: 10px -14px -12px; border-top: 1px solid rgba(255,255,255,.25)">' + "".join(f'<span style="flex: 1; padding: 11px 0; text-align: center; font-size: 14px; font-weight: 600; color: #FFFFFF">{a}</span>' for a in actions) + '</div>'
    return (f'<div style="padding: 12px 14px; border-radius: 22px; background: rgba(245,245,244,.22); backdrop-filter: blur(20px); color: #FFFFFF; display: flex; flex-direction: column; gap: 4px; overflow: hidden">'
            f'<div style="display: flex; align-items: center; gap: 8px"><span style="width: 22px; height: 22px; border-radius: 6px; background: #F5F5F4; display: flex; align-items: center; justify-content: center">{icon("kalender", 18)}</span><span style="flex: 1; font-size: 13px; font-weight: 600; opacity: .85">FAMILIENASSISTENT</span><span style="font-size: 13px; opacity: .7">{when}</span></div>'
            f'<span style="font-size: 15.5px; font-weight: 650">{title}</span><span style="font-size: 15px; line-height: 21px; opacity: .92">{body}</span>{acts}</div>')
screen("V1-Push.dc.html", "Hinweise · Sperrbildschirm", f'''
<div style="position: absolute; inset: 0; background: linear-gradient(170deg, #5E7B86 0%, #2E4650 55%, #1E2E35 100%)"></div>
<div style="position: relative; padding: 70px 14px 0; display: flex; flex-direction: column; gap: 10px; color: #FFFFFF">
<div style="text-align: center; display: flex; flex-direction: column; gap: 0; margin-bottom: 26px"><span style="font-size: 17px; font-weight: 600; opacity: .9">Mittwoch, 28. Oktober</span><span style="font-size: 84px; line-height: 92px; font-weight: 600; letter-spacing: -3px">19:00</span></div>
{notif("Morgen 9:30 U6 mit Ben", "Du bringst ihn. U-Heft und Impfpass liegen im Flur.", "jetzt", ["Erledigt", "Ich mach’s", "Später"])}
{notif("Eure Woche", "4 Termine, 2 Dinge ohne Zuständigen. Elterngeld-Frist in 7 Wochen.", "So 18:00")}
<span style="text-align: center; font-size: 13px; opacity: .75; margin-top: 8px">Nur Wichtiges: höchstens 1 Hinweis am Tag plus Sonntags-Vorschau.</span>
</div>''', raw=True, bg="#1E2E35", x=COL(0), y=Y)

def share_app(inner, label, hl=False):
    ring = f"box-shadow: 0 0 0 3px {DONE};" if hl else ""
    return f'<span style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 70px"><span style="width: 60px; height: 60px; border-radius: 16px; background: {ROW}; {ring} display: flex; align-items: center; justify-content: center">{inner}</span><span style="font-size: 12px; color: {INK}; text-align: center">{label}</span></span>'
screen("V1-Teilen.dc.html", "Eingang · Teilen aus Chat", f'''
<div style="position: absolute; inset: 0; background: #E9E4DC"></div>
<div style="position: relative; padding: 64px 16px 0; display: flex; flex-direction: column; gap: 10px">
<span style="align-self: center; font-size: 13px; color: {SUB}">Chat „Krabbelgruppe Südstadt“</span>
<div style="align-self: flex-start; max-width: 270px; padding: 10px 12px; border-radius: 16px 16px 16px 4px; background: #FFFFFF; font-size: 15px; line-height: 21px; box-shadow: 0 0 0 3px {DONE}">Liebe Eltern, am Sa 15. Nov ist Laternenbasteln, 10–12 Uhr im Gemeindehaus. Bitte ein Glas mitbringen.</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 16px 34px; border-radius: 28px 28px 0 0; background: {BG}; display: flex; flex-direction: column; gap: 16px">
<span style="align-self: center; width: 40px; height: 5px; border-radius: 999px; background: #D5D8D9"></span>
<span style="font-size: 15px; font-weight: 600">Teilen mit</span>
<div style="display: flex; gap: 8px">{share_app(icon("kalender", 46), "Familien-<br>assistent", True)}{share_app(li("send", 26), "Nachricht")}{share_app(li("copy", 26), "Kopieren")}{share_app(li("inbox", 26), "Mail")}</div>
{card(f'<div style="display: flex; align-items: center; gap: 12px">{tile("geburtstag", 44, 14)}<span style="flex: 1; display: flex; flex-direction: column">{meta("Erkannt, noch nicht eingetragen")}<span style="font-size: 16px; font-weight: 600">Laternenbasteln · Sa 15. Nov, 10–12</span>{meta("Mitbringen: ein Glas")}</span></div><div style="display: flex; gap: 8px; align-self: stretch"><div style="flex: 1; display: flex; flex-direction: column">{btn("Ändern", False)}</div><div style="flex: 2; display: flex; flex-direction: column">{btn("Eintragen", href="V1-Kal-Monat.dc.html")}</div></div>', 14)}
</div>''', raw=True, x=COL(1), y=Y)

def bubble(t, me=False):
    st = f"align-self: flex-end; background: #E9ECEB; color: {INK}; border-radius: 20px 20px 6px 20px;" if me else f"align-self: flex-start; background: {ROW}; border-radius: 20px 20px 20px 6px;"
    return f'<div style="{st} max-width: 300px; padding: 11px 14px; font-size: 15.5px; line-height: 22px">{t}</div>'
screen("V1-Chat.dc.html", "Assistent · Chat", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><a href="V1-Heute.dc.html" aria-label="Zurück" style="width: 40px; height: 40px; border-radius: 999px; background: {ROW}; display: flex; align-items: center; justify-content: center">{li("back", 20)}</a><span style="display: flex; flex-direction: column; align-items: center"><span style="font-size: 16px; font-weight: 650">Assistent</span><span style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: {SUB}">{li("sparkle", 12, SUB)}KI, liest nur, was ihr teilt</span></span><span style="width: 40px"></span></div>
<div style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; justify-content: flex-end">
{bubble("Wann ist die U5?", True)}
<div style="align-self: flex-start; max-width: 320px; padding: 12px; border-radius: 20px 20px 20px 6px; background: {ROW}; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; align-items: center; gap: 10px">{tile("u-heft", 44, 14)}<span style="display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 650">U5 · 6. bis 7. Monat</span>{meta("14. März bis 14. April 2027")}</span></div><span style="font-size: 15.5px; line-height: 22px">Ich trage das Zeitfenster ein und erinnere euch zum Start. Wer ruft bei Dr. Weber an?</span><div style="display: flex; gap: 6px">{chip(av("J", 18) + "Julia")}{chip(av("T", 18) + "Tom")}{chip("Später")}</div></div>
{bubble("Was weißt du über uns?", True)}
<a href="V1-Wissen.dc.html" style="align-self: flex-start; max-width: 320px; padding: 12px 14px; border-radius: 20px 20px 20px 6px; background: {ROW}; text-decoration: none; color: {INK}; display: flex; align-items: center; gap: 10px"><span style="flex: 1; font-size: 15.5px; line-height: 22px">Alles, was ich weiß, steht hier. Ihr könnt jeden Punkt ändern oder löschen.</span>{li("chev", 18, MUTE)}</a>
</div>
<div style="display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 16px; border-radius: 999px; background: {ROW}; box-shadow: 0 0 0 1px {HAIR}"><span style="flex: 1; font-size: 15.5px; color: {MUTE}">Frag oder sag, was ansteht …</span><span style="width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center">{li("camera", 20, SUB)}</span><span style="width: 40px; height: 40px; border-radius: 999px; background: {INK}; display: flex; align-items: center; justify-content: center">{li("mic", 20, "#FFFFFF")}</span></div>''', pad="0 18px 34px", gap=14, x=COL(2), y=Y)

def krow(left, t, sub, right=None):
    r = right if right is not None else li("chev", 18, MUTE)
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: {ROW}">{left}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 15.5px; font-weight: 600">{t}</span>{meta(sub)}</span>{r}</div>'
screen("V1-Wissen.dc.html", "Assistent · Was ich weiß", f'''
{back("V1-Chat.dc.html")}
{h1("Was ich weiß")}
<p style="margin: -8px 0 0; font-size: 15px; line-height: 22px; color: {SUB}">Alles hier ist sichtbar, änderbar und löschbar. Nichts davon wird zum Training genutzt.</p>
{h2("Familie")}
{group(krow(av("J", 30), "Julia", "Mama · Farbe Rosa") + krow(av("T", 30), "Tom", "Papa · Farbe Blau") + krow(tile("schnuller", 30, 10), "Ben", "6 Wochen · geboren 14. Sep 2026"))}
{h2("Menschen und Orte")}
{group(krow(tile("stethoskop", 30, 10), "Dr. Weber", "Kinderarzt · Hauptstr. 12") + krow(tile("hebamme", 30, 10), "Sarah Lind", "Hebamme") + krow(tile("geburtstag", 30, 10), "Oma Inge", "Geburtstag 2. Nov · letztes Geschenk: Kalender"))}
<div style="display: flex; gap: 8px; align-items: flex-start; font-size: 13.5px; line-height: 19px; color: {SUB}">{li("lock", 16, SUB)}<span>U- und Impfstatus bleiben nur auf diesem Gerät.</span></div>''', pad="0 18px 34px", gap=12, x=COL(3), y=Y)

screen("V1-Dokumente.dc.html", "Eingang · Dokumente", f'''
{h1("Eingang", None, pair())}
{seg([("Neu · 2", "V1-Eingang.dc.html"), ("Dokumente", "V1-Dokumente.dc.html")], "Dokumente")}
{h2("Fristen", "nächste 3 Monate")}
{group(wrow("umschlag-euro", "Elterngeld: Bescheinigung", "12. Dez · noch 6 Wochen", li("chev", 18, MUTE), sub_c=FRIST, href="V1-Foto-Zettel.dc.html") + wrow("vertrag", "Handyvertrag Tom kündbar", "bis 31. Jan", li("chev", 18, MUTE)))}
{h2("Ben")}
{group(wrow("urkunde", "Geburtsurkunde", "liegt vor · 3 Kopien", li("chev", 18, MUTE)) + wrow("krankenkasse", "Versichertenkarte", "angefragt 20. Okt", li("chev", 18, MUTE)) + wrow("reisepass", "Kinderreisepass", "fehlt · Urlaub im März", chip("Wer?")))}''', active="Eingang", gap=12, x=COL(4), y=ROWY[3])

def srow(left, t, sub, right=None):
    return krow(left, t, sub, right)
dot = lambda c: f'<span style="width: 8px; height: 8px; border-radius: 999px; background: {c}; flex-shrink: 0"></span>'
screen("V1-Einstellungen.dc.html", "Einstellungen", f'''
{back("V1-Heute.dc.html")}
{h1("Familie Huber")}
{group(srow(tile("eingang", 30, 10), "huber-7q2@familie.app", "Familienadresse · weiterleiten oder hinterlegen", li("copy", 18, SUB)) + srow(tile("sync", 30, 10), "Google Kalender", "synchron · vor 2 Min", dot("#2F9E6E")) + srow(tile("kalender", 30, 10), "iCloud", "Abo · Erinnerungen kommen per Push", dot("#2F9E6E")))}
{group(srow(tile("glocke", 30, 10), "Hinweise", "Nur Wichtiges · Ruhe 21–7 Uhr") + srow(tile("chat", 30, 10), "Sprache", "Julia Deutsch · Tom English") + srow(tile("paket", 30, 10), "Export", "Kalender (ICS) und alle Daten (JSON)"))}
<a href="V1-Plus.dc.html" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; background: {ROW}; text-decoration: none; color: {INK}">{icon("hand-nimmt", 44)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 15.5px; font-weight: 650">Plus testen</span>{meta("7 von 10 Erfassungen diesen Monat genutzt")}</span>{li("chev", 18, MUTE)}</a>''', pad="0 18px 34px", gap=12, x=COL(5), y=Y)

def plan(t, price, sub, on=False):
    st = f"box-shadow: inset 0 0 0 2px {INK};" if on else ""
    badge = f'<span style="position: absolute; top: -10px; left: 14px; height: 22px; padding: 0 10px; border-radius: 999px; background: {DONE}; color: #FFFFFF; font-size: 11.5px; font-weight: 700; display: flex; align-items: center">NUR ERSTE 200 FAMILIEN</span>' if on else ""
    return f'<div style="position: relative; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 20px; background: {ROW}; {st}">{badge}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 650">{t}</span>{meta(sub)}</span><span style="font-size: 18px; font-weight: 700">{price}</span></div>'
screen("V1-Plus.dc.html", "Plus", f'''
{back("V1-Einstellungen.dc.html")}
{h1("Plus")}
<p style="margin: -8px 0 0; font-size: 16px; line-height: 24px; color: {SUB}">Organisieren bleibt gratis, für immer. Plus nimmt euch Arbeit ab.</p>
<div style="display: flex; flex-direction: column; gap: 8px">
{"".join(f'<div style="display: flex; align-items: center; gap: 10px; font-size: 15px">{li("check", 18, DONE, 2.2)}{t}</div>' for t in ["Unbegrenzt erfassen: Mails, Fotos, Geteiltes", "Dokumente und Fristen mit Vorausschau", "Entwürfe für Absagen, Anträge, Antworten"])}
</div>
<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px">
{plan("Gründerjahr", "29 €", "danach 39,99 € im Jahr", True)}
{plan("Jährlich", "39,99 €", "pro Haushalt, für euch beide")}
{plan("Monatlich", "4,99 €", "jederzeit kündbar")}
</div>
<span style="flex: 1"></span>
{btn("14 Tage gratis testen")}
<span style="text-align: center; font-size: 13px; color: {SUB}; margin-top: -6px">Kündigen mit einem Tipp. Was gratis ist, bleibt gratis.</span>''', pad="0 18px 34px", gap=14, x=COL(6), y=Y)

Y = ROWY[5]
sw = lambda c, n, h: f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="height: 64px; border-radius: 18px; background: {c}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06)"></span><span style="font-size: 13px; font-weight: 600">{n}</span><span style="font-size: 12px; color: {SUB}">{h}</span></div>'
screen("V1-System.dc.html", "Designsystem v2 · Einfachheit", f'''
<div style="padding: 40px 44px; display: flex; flex-direction: column; gap: 26px">
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600; color: {SUB}">Designsystem v2 · Einfachheit, 26. Oktober</span><span style="font-size: 52px; line-height: 56px; font-weight: 700; letter-spacing: -2px">So einfach wie möglich<span style="color: {DONE}">.</span></span><span style="font-size: 17px; line-height: 25px; color: {SUB}; max-width: 820px">Basis bleibt Ruhig mit Clay. Dazu die Reduktion von Wabi und die Interaktionsdetails von Devouring Details. Jede Regel unten gilt für jeden Screen.</span></div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">
{"".join(f'<div style="padding: 16px; border-radius: 20px; background: {BG}; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 12.5px; font-weight: 600; color: {SUB}">{q}</span><span style="font-size: 16px; line-height: 21px; font-weight: 650">{t}</span><span style="font-size: 13.5px; line-height: 19px; color: {SUB}">{d}</span></div>' for q, t, d in [
 ("Wabi", "Farbe nur im Objekt", "Flächen sind weiß oder grau. Farbe tragen Clay-Icons, Personen und Fristen, sonst nichts."),
 ("Wabi", "Ein dunkles Element", "Pro Screen nur die Hauptaktion dunkel, dazu das Plus in der Leiste. Auswahl zeigt Ring oder Personenfarbe."),
 ("Wabi", "Schrittweise aufklappen", "Sichtbar ist nur, was fast jeder braucht. Der Rest steht als eine Zeile mit Wert und Pfeil."),
 ("Wabi", "Weniger Beschriftung", "Kein Feldname, wenn der Wert sich selbst erklärt. Keine Versal-Labels. Ergebnis als ein Satz."),
 ("Devouring Details", "Objekt bleibt Objekt", "Was ihr fotografiert, bleibt sichtbar als Anker: Kamera, Lesen, Ergebnis, Infozettel zeigen dasselbe Blatt."),
 ("Devouring Details", "Warten am Ort", "Kein Spinner. Schritte erscheinen dort, wo das Ergebnis entsteht, und haken sich ab."),
 ("Devouring Details", "Bewegung nach Häufigkeit", "Täglich: keine. Wöchentlich: kurz, unter 200 ms. Selten (Foto, erledigt, Einladung): Clay-Icon darf sich bewegen."),
 ("Devouring Details", "Gesten mit Widerstand", "Haken antippen: erledigt. Text antippen klappt die Zeile zum Bearbeiten auf. Nach links wischen: löschen, mit Rückgängig.")])}
</div>
<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px">
{sw(BG, "Grund", BG)}{sw(ROW, "Zeile", ROW)}{sw(INK, "Text, Plus", INK)}{sw(DONE, "Erledigt, Punkt", DONE)}{sw(FRIST, "Frist", FRIST)}{sw(JUL, "Julia", "Arbeit gestreift")}{sw(TOM, "Tom", "Arbeit gestreift")}</div>
<div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px">
{"".join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><span style="width: 100%; aspect-ratio: 1; border-radius: 22px; background: {TINT[n]}; display: flex; align-items: center; justify-content: center">{icon(n, 76)}</span><span style="font-size: 12px; color: {SUB}">{t}</span></div>' for n, t in [("stethoskop", "Arzt"), ("kochtopf", "Essen"), ("umschlag-euro", "Geld"), ("reisepass", "Ausweise"), ("yogamatte", "Kurse"), ("geschenk", "Feiern"), ("impfung", "Impfung"), ("vertrag", "Dokumente")])}</div>
<div style="display: flex; gap: 26px; align-items: flex-start">
<div style="flex: 1; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 14px; font-weight: 600; color: {SUB}">Listen-Zeile (statt Inhalts-Tabs)</span>{group(lrow("hebamme", "Kliniktasche", "12 von 18 gepackt"))}</div></div>
<div style="flex: 1; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 13px; font-weight: 600; color: {SUB}">Zeile</span>{row("stethoskop", "U6 bei Dr. Weber", "Tom bringt Ben", av("T", 26), "9:30")}</div></div>
<div style="display: flex; gap: 26px; align-items: center">
<div style="flex: 1; position: relative; height: 90px">{nav("Heute").replace("position: absolute; left: 14px; right: 14px; bottom: 22px;", "position: absolute; left: 0; right: 0; top: 10px;")}</div>
<div style="flex: 1; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 13px; font-weight: 600; color: {SUB}">Schrift</span><span style="font-size: 15px; line-height: 22px">Geist für alles. Vergleich mit Nunito folgt im nächsten Schritt, wie in deiner Notiz zu Headspace.</span></div></div>
</div>''', raw=True, w=1100, h=1420, bg=ROW, x=COL(0), y=Y, inter=False)

screen("V1-Widgets.dc.html", "Widgets", f'''
<div style="padding: 40px 44px; display: flex; flex-direction: column; gap: 22px; background: #DDE3E6; height: 100%; box-sizing: border-box">
<span style="font-size: 28px; font-weight: 700; letter-spacing: -.8px">Widgets<span style="color: {DONE}">.</span></span>
<div style="display: flex; gap: 22px; align-items: flex-start">
<div style="width: 170px; height: 170px; border-radius: 26px; background: {TINT["stethoskop"]}; padding: 14px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between">{icon("stethoskop", 58)}<span style="display: flex; flex-direction: column"><span style="font-size: 11px; font-weight: 700; color: {DONE}">In 40 Min</span><span style="font-size: 16px; font-weight: 700; line-height: 20px">U6 bei Dr. Weber</span><span style="font-size: 12px; color: {SUB}">Tom bringt Ben</span></span></div>
<div style="width: 364px; height: 170px; border-radius: 26px; background: {ROW}; padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px"><span style="font-size: 13px; font-weight: 700">Heute<span style="color: {DONE}">.</span> <span style="font-weight: 500; color: {SUB}">Do 30.</span></span>{"".join(f'<div style="display: flex; align-items: center; gap: 10px">{tile(n, 34, 10)}<span style="flex: 1; font-size: 14px; font-weight: 600">{t}</span><span style="font-size: 12.5px; color: {SUB}">{z}</span></div>' for n, t, z in [("stethoskop", "U6 bei Dr. Weber", "9:30"), ("yogamatte", "Rückbildung", "14:00"), ("kochtopf", "Oma Renate", "18:30")])}</div>
<div style="width: 170px; height: 170px; border-radius: 26px; background: {TINT["umschlag-euro"]}; padding: 14px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between">{icon("umschlag-euro", 58)}<span style="display: flex; flex-direction: column"><span style="font-size: 11px; font-weight: 700; color: {FRIST}">Frist · 7 Wochen</span><span style="font-size: 16px; font-weight: 700; line-height: 20px">Elterngeld</span><span style="font-size: 12px; color: {SUB}">Bescheinigung fehlt</span></span></div>
</div></div>''', raw=True, w=1000, h=340, x=COL(0) + 1180, y=Y, inter=False)


# ================= Reihe 3, Teil 2: Wabi x Devouring Details (Julian 2026-10-26: B wird Standard) =================
# Regeln: Farbe nur im Objekt, ein dunkles Element pro Screen, schrittweise aufklappen, weniger Labels.
YB = 8700
def clone(src, dst, x, y, title):
    shutil.copy(os.path.join(P, src), os.path.join(P, dst))
    BOARDS[dst] = {"x": x, "y": y, "w": 390, "h": 844, "title": title, "is_interactive": True}
def paper(w=64, h=82, rot=-4):
    ln = "".join(f'<span style="height: 3px; border-radius: 2px; background: #D8D4CB; width: {p}%"></span>' for p in [70, 92, 86, 60, 90, 80])
    return f'<span aria-hidden="true" style="width: {w}px; height: {h}px; flex-shrink: 0; border-radius: 5px; background: #F4F1EA; transform: rotate({rot}deg); padding: {int(h*.14)}px {int(w*.14)}px; box-sizing: border-box; display: flex; flex-direction: column; gap: {max(3, int(h*.06))}px; box-shadow: 0 6px 16px rgba(22,35,42,.12), 0 0 0 1px rgba(22,35,42,.04)">{ln}</span>'
def line(ic, val, right="", c=INK, w=600):
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: {ROW}">{ic}<span style="flex: 1; min-width: 0; font-size: 16px; font-weight: {w}; color: {c}">{val}</span>{right}</div>'
def group(rows):
    return f'<div style="display: flex; flex-direction: column; gap: 1px; border-radius: 20px; overflow: hidden; background: {HAIR}; flex-shrink: 0">{rows}</div>'
def katb(n, t, on=False):
    st = f"background: {TINT[n]}; box-shadow: inset 0 0 0 1.5px {INK};" if on else f"background: {ROW};"
    f = "" if on else "filter: grayscale(1); opacity: .55;"
    return f'<span style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 6px; border-radius: 16px; {st}"><span style="display: flex; {f}">{icon(n, 34)}</span><span style="font-size: 11.5px; font-weight: {600 if on else 500}; color: {INK if on else SUB}">{t}</span></span>'
CH = li("chev", 18, MUTE)

screen("V1-Termin-Neu.dc.html", "Neuer Termin", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><a href="V1-Neu.dc.html" style="font-size: 15px; color: {SUB}; text-decoration: none">Abbrechen</a><span style="width: 70px"></span></div>
<label style="display: flex; flex-direction: column; gap: 4px; padding: 6px 2px 0"><input value="U5 bei Dr. Weber" style="border: 0; padding: 0; font: 700 30px Geist, system-ui; letter-spacing: -.9px; color: {INK}; background: transparent; outline: none"><span style="font-size: 14px; color: {SUB}">Für Ben</span></label>
<div style="display: flex; gap: 6px">{katb("stethoskop", "Arzt", True)}{katb("vertrag", "Amt")}{katb("geburtstag", "Familie")}{katb("yogamatte", "Kurs")}<a href="V1-Termin-Icon.dc.html" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 6px; border-radius: 16px; background: {ROW}; text-decoration: none"><span style="width: 34px; height: 34px; display: flex; align-items: center; justify-content: center">{li("plus", 22, SUB)}</span><span style="font-size: 11.5px; font-weight: 500; color: {SUB}">Alle</span></a></div>
{group(line(li("clock", 20, SUB), "Do 12. Nov · 9:30–10:15") + line(li("pin", 20, SUB), "Kinderarztpraxis Weber", CH))}
<div style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {ROW}">{whob(av("J", 22), "Julia")}{whob(av("T", 22), "Tom", True)}{whob(pair(20), "Beide")}</div>
{group(line(li("check", 20, SUB), "Mitnehmen", meta("4 Dinge") + CH, w=500) + line(li("clock", 20, SUB), "Erinnerung", meta("1 Tag vorher") + CH, w=500))}
<span style="align-self: center; font-size: 14px; font-weight: 600; color: {SUB}; padding: 4px 0">Mehr: Wiederholen, Notiz, Anhang</span>
<span style="flex: 1"></span>{btn("Termin speichern", href="V1-Kal-Tag.dc.html")}''', pad="0 18px 34px", gap=14, x=COL(5), y=ROWY[2])

def step(t, state):
    if state == "ok": m = li("check", 18, DONE, 2.4); c = INK
    elif state == "run": m = f'<span style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center"><span style="width: 7px; height: 7px; border-radius: 999px; background: {SUB}; animation: pulse 1.4s ease-in-out infinite"></span></span>'; c = SUB
    else: m = '<span style="width: 18px"></span>'; c = "#B8BEC0"
    return f'<div style="display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500; color: {c}">{m}{t}</div>'
screen("V1-Foto-Warten.dc.html", "Foto · Wird gelesen", f'''
<style>@keyframes pulse{{0%,100%{{opacity:.35}}50%{{opacity:1}}}}@media (prefers-reduced-motion: reduce){{span{{animation:none !important}}}}</style>
<div style="display: flex; justify-content: flex-end"><a href="V1-Neu.dc.html" style="font-size: 15px; color: {SUB}; text-decoration: none">Abbrechen</a></div>
<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px">
<a href="V1-Foto-Analyse.dc.html" aria-label="Weiter" style="width: 220px; height: 220px; border-radius: 56px; background: {TINT.get("umschlag-euro")}; display: flex; align-items: center; justify-content: center">{icon("brief-gelesen", 170)}</a>
<div style="display: flex; flex-direction: column; gap: 14px; width: 260px">
{step("Brief der Elterngeldstelle", "ok")}
{step("Frist gefunden: 12. Dezember", "ok")}
{step("Was zu tun ist", "run")}
{step("Wo es hingehört", "wait")}
</div>
</div>
<span style="align-self: center; font-size: 13.5px; color: {MUTE}">Das Foto bleibt nur bei euch.</span>''', bg="#F7F5F0", pad="0 18px 40px", gap=14, x=COL(2), y=ROWY[2])

screen("V1-Foto-Analyse.dc.html", "Foto · Verstanden", f'''
{back("V1-Foto-Kamera.dc.html")}
<div style="display: flex; align-items: center; gap: 14px; padding: 4px 2px 0">{tile("brief-gelesen", 56, 18)}<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15px; font-weight: 600">Elterngeldstelle Bayern</span>{meta("Brief vom 24. Oktober · Toms Elterngeld")}</span></div>
<h1 style="margin: 6px 0 0; font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -.8px">Bis 12. Dezember fehlt noch die Arbeitgeber&shy;bescheinigung.</h1>
{meta("Aktenzeichen EG-2026-118734", MUTE)}
<span style="height: 6px"></span>
{group(line(icon("glocke", 28), "Frist im Kalender", meta("12. Dez") + circle(True), w=500) + line(icon("erledigt", 28), "Aufgabe: Bescheinigung anfragen", circle(True), w=500) + line(icon("vertrag", 28), "Infozettel in Dokumente", circle(True), w=500))}
<span style="flex: 1"></span>
<span style="align-self: center; font-size: 15px; font-weight: 600; color: {SUB}; padding: 4px 0">Nichts davon</span>
{btn("Übernehmen", href="V1-Foto-Zettel.dc.html")}''', pad="0 18px 34px", gap=12, x=COL(3), y=ROWY[2])

screen("V1-Foto-Zettel.dc.html", "Dokumente · Infozettel", f'''
{back("V1-Foto-Analyse.dc.html", meta("Dokumente"))}
<div style="display: flex; align-items: flex-end; gap: 14px; padding: 8px 2px 0">{icon("umschlag-euro", 56)}<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 13.5px; color: {SUB}">Infozettel</span><span style="font-size: 28px; line-height: 32px; font-weight: 700; letter-spacing: -.8px">Elterngeld Tom</span></span></div>
{group("".join(line(f'<span style="width: 104px; font-size: 14px; color: {SUB}">{k}</span>', v, w=600, c=c) for k, v, c in [("Offen", "Arbeitgeberbescheinigung", INK), ("Frist", "12. Dezember 2026", FRIST), ("Stelle", "ZBFS Bayern", INK), ("Aktenzeichen", "EG-2026-118734", INK)]))}
<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 12px; border-radius: 20px; background: {ROW}">{paper(40, 52, -4)}<span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15px; font-weight: 600">Original</span>{meta("Google Drive · Familie / Elterngeld")}</span>{toggle(True)}</div>
<div style="display: flex; gap: 8px; align-items: flex-start; padding: 0 4px; font-size: 13.5px; line-height: 19px; color: {SUB}">{li("lock", 16, SUB)}<span>Steuer-ID, Kontonummer und Ausweisnummer bleiben verschlüsselt auf dem Gerät, nie in Drive.</span></div>
<span style="flex: 1"></span>{btn("Fertig", href="V1-Heute.dc.html")}''', pad="0 18px 34px", gap=14, x=COL(4), y=ROWY[2])


ICON_GROUPS = [
 ("Sport", ["fussball", "schwimmen", "turnen", "tanzen", "laufen", "radfahren", "tennis", "reiten", "yogamatte", "pilates", "klettern", "fitness"]),
 ("Gesundheit", ["stethoskop", "zahnarzt", "impfung", "hebamme", "apotheke", "ultraschall", "u-heft", "tierarzt"]),
 ("Familie und Zuhause", ["geburtstag", "geschenk", "kochtopf", "kita", "schule", "haustier", "putzen", "handwerker"]),
 ("Amt und Geld", ["amt", "vertrag", "umschlag-euro", "versicherung", "steuer", "reisepass"]),
 ("Unterwegs", ["auto", "flugzeug", "reise", "kinderwagen", "rucksack", "wandern"]),
]
def pick(n, on=False):
    st = f"background: {TINT.get(n, '#F1F1EF')}; box-shadow: inset 0 0 0 2px {INK};" if on else "background: transparent;"
    return f'<a href="V1-Termin-Fussball.dc.html" aria-label="{n}" style="aspect-ratio: 1; border-radius: 16px; {st} display: flex; align-items: center; justify-content: center">{icon(n, 44)}</a>'
grid = lambda ns, sel=None: '<div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px">' + "".join(pick(n, n == sel) for n in ns) + '</div>'
screen("V1-Termin-Icon.dc.html", "Neuer Termin · Symbol wählen", f'''
<div style="position: absolute; inset: 0; background: rgba(22,35,42,.28)"></div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; top: 70px; padding: 12px 18px 0; border-radius: 32px 32px 0 0; background: {ROW}; display: flex; flex-direction: column; gap: 12px; overflow: hidden">
<span style="align-self: center; width: 40px; height: 5px; border-radius: 999px; background: #D5D8D9"></span>
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 20px; font-weight: 700; letter-spacing: -.4px">Symbol</span><a href="V1-Termin-Fussball.dc.html" style="font-size: 15px; font-weight: 600; color: {INK}; text-decoration: none">Fertig</a></div>
<div style="display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 14px; border-radius: 14px; background: #F1F1EF">{li("sparkle", 16, SUB)}<span style="font-size: 16px; color: {MUTE}">Suchen, z. B. Fußball</span></div>
<div style="flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 12px; -webkit-mask-image: linear-gradient(#000 calc(100% - 40px), transparent); mask-image: linear-gradient(#000 calc(100% - 40px), transparent)">
{"".join(f'<div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: 13.5px; font-weight: 600; color: {SUB}">{g}</span>{grid(ns, "fussball")}</div>' for g, ns in ICON_GROUPS)}
</div></div>''', raw=True, x=COL(6), y=ROWY[2])

screen("V1-Termin-Fussball.dc.html", "Neuer Termin · Fußball, wiederkehrend", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><a href="V1-Neu.dc.html" style="font-size: 15px; color: {SUB}; text-decoration: none">Abbrechen</a><span style="width: 70px"></span></div>
<div style="display: flex; align-items: center; gap: 14px; padding-top: 6px"><a href="V1-Termin-Icon.dc.html" aria-label="Symbol ändern" style="position: relative; width: 64px; height: 64px; border-radius: 20px; background: {TINT.get("fussball", "#E7EDE4")}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{icon("fussball", 50)}<span style="position: absolute; right: -4px; bottom: -4px; width: 22px; height: 22px; border-radius: 999px; background: {ROW}; box-shadow: 0 0 0 1px {HAIR}; display: flex; align-items: center; justify-content: center">{li("papier", 12, SUB)}</span></a><label style="flex: 1; display: flex; flex-direction: column; gap: 2px"><input value="Fußball" style="border: 0; padding: 0; font: 700 30px Geist, system-ui; letter-spacing: -.9px; color: {INK}; background: transparent; outline: none; width: 100%"><span style="font-size: 14px; color: {SUB}">Für Tom</span></label></div>
{group(line(li("clock", 20, SUB), "Di 3. Nov · 19:00–20:30") + line(li("sync", 20, SUB), "Jeden Dienstag", meta("bis Ende März") + CH) + line(li("pin", 20, SUB), "Sportplatz Süd", CH))}
<div style="display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: {ROW}">{whob(av("J", 22), "Julia")}{whob(av("T", 22), "Tom", True)}{whob(pair(20), "Beide")}</div>
{group(line(li("clock", 20, SUB), "Erinnerung", meta("1 Stunde vorher") + CH, w=500))}
<span style="font-size: 13.5px; line-height: 19px; color: {SUB}">Das Symbol merken wir uns. Nächstes Mal steht Fußball gleich oben bei den Kategorien.</span>
<span style="flex: 1"></span>{btn("Termin speichern", href="V1-Kal-Tag.dc.html")}''', pad="0 18px 34px", gap=14, x=COL(7), y=ROWY[2])

def ring2(size=250, knob=None, thick=10, preview=None, tip=None):
    import math
    c = size / 2; r = size / 2 - 22
    def pt(f): a = -math.pi / 2 + 2 * math.pi * f; return c + r * math.cos(a), c + r * math.sin(a)
    marks = [(0.06, DONE, True), (0.12, DONE, True), (0.18, FRIST, False), (0.26, MUTE, False), (0.33, MUTE, False), (0.42, MUTE, False), (0.5, MUTE, False), (0.62, MUTE, False), (0.75, MUTE, False), (0.92, MUTE, False)]
    pts = ""
    for f, col, fill in marks:
        if tip is not None and abs(f - tip) < .001: continue
        x, y = pt(f); rr = 7 if knob is None or f > knob else 7
        pts += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr}" fill="{col if fill else "#FFFFFF"}" stroke="{col}" stroke-width="2.5"/>'
    e = pt(.15)
    svg = (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true" style="flex-shrink: 0; overflow: visible">'
           f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="{HAIR}" stroke-width="{thick}"/>'
           f'<path d="M {c} {c-r} A {r} {r} 0 0 1 {e[0]:.1f} {e[1]:.1f}" fill="none" stroke="{DONE}" stroke-width="{thick}" stroke-linecap="round"/>')
    if preview:
        p = pt(preview)
        svg += f'<path d="M {e[0]:.1f} {e[1]:.1f} A {r} {r} 0 0 1 {p[0]:.1f} {p[1]:.1f}" fill="none" stroke="{DONE}" stroke-opacity=".35" stroke-width="{thick}" stroke-linecap="round"/>'
    svg += pts
    if knob is not None:
        k = pt(knob)
        svg += f'<circle cx="{k[0]:.1f}" cy="{k[1]:.1f}" r="15" fill="#FFFFFF" stroke="{INK}" stroke-width="3"/><circle cx="{k[0]:.1f}" cy="{k[1]:.1f}" r="30" fill="{INK}" fill-opacity=".06"/>'
    svg += '</svg>'
    return svg, (pt(knob) if knob is not None else None)
def jframe(center, sub, knob=None, thick=10, preview=None, tip=None, tipl=""):
    svg, k = ring2(knob=knob, thick=thick, preview=preview, tip=tip)
    t = ""
    if tip is not None and k:
        t = f'<span style="position: absolute; left: {k[0]-30:.0f}px; top: {k[1]-104:.0f}px; display: flex; flex-direction: column; align-items: center; gap: 4px">{tile("umschlag-euro", 60, 18)}<span style="white-space: nowrap; padding: 3px 9px; border-radius: 999px; background: {INK}; color: #FFFFFF; font-size: 12.5px; font-weight: 600">{tipl}</span></span>'
    mt = "margin-top: 64px;" if tip is not None else ""
    return f'<div style="position: relative; align-self: center; width: 250px; height: 250px; {mt}">{svg}<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center"><span style="font-size: 40px; font-weight: 700; letter-spacing: -1.5px; font-variant-numeric: tabular-nums">{center}</span>{meta(sub)}</div>{t}</div>'
def note(t): return f'<div style="display: flex; gap: 10px; padding: 12px 14px; border-radius: 16px; background: #ECEBE7; font-size: 13.5px; line-height: 19px; color: {SUB}">{li("sparkle", 16, SUB)}<span style="flex: 1">{t}</span></div>'
screen("V1-Jahr-Halten.dc.html", "Jahr · 1 Halten", f'''
{h1("Bens Jahr", None, pair())}
{seg3("Jahr")}
{jframe("7", "Wochen alt", knob=.15, thick=14)}
{note("Daumen auf den Ring halten. Der Ring wird dicker (10 auf 14 px, 160 ms), am heutigen Punkt erscheint ein Griff, kurzer Haptik-Tick. Kein neuer Screen.")}
<div style="opacity: .5; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 24px; background: {ROW}">{tl_rows(TL[1:3])}</div>''', active="Kalender", gap=14, x=COL(5), y=ROWY[5])
screen("V1-Jahr-Ziehen.dc.html", "Jahr · 2 Ziehen", f'''
{h1("Bens Jahr", None, pair())}
{seg3("Jahr")}
{jframe("12", "Woche · Mitte Dezember", knob=.18, thick=14, preview=.18, tip=.18, tipl="Elterngeld · 12. Dez")}
{note("Ziehen: Die Zahl rollt Woche für Woche mit, an jedem Punkt ein Tick. Der Punkt unter dem Daumen wird zu seinem Clay-Objekt und hebt sich über den Finger. Die Liste scrollt mit.")}
<div style="display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 24px; background: {ROW}; box-shadow: inset 0 0 0 1.5px {INK}">{tl_rows(TL[2:3])}</div>''', active="Kalender", gap=14, x=COL(6), y=ROWY[5])
screen("V1-Jahr-Loslassen.dc.html", "Jahr · 3 Loslassen", f'''
{h1("Bens Jahr", None, pair())}
{seg3("Jahr")}
<div style="opacity: .35">{jframe("12", "Woche · Mitte Dezember")}</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 18px 34px; border-radius: 30px 30px 0 0; background: {ROW}; box-shadow: 0 -12px 40px rgba(22,35,42,.12); display: flex; flex-direction: column; gap: 14px">
<span style="align-self: center; width: 36px; height: 5px; border-radius: 999px; background: {HAIR}"></span>
<div style="display: flex; align-items: center; gap: 14px">{tile("umschlag-euro", 64, 20)}<span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 20px; font-weight: 700; letter-spacing: -.4px">Elterngeld beantragen</span>{meta("Frist 12. Dez · noch 7 Wochen", FRIST)}</span>{av("T", 30)}</div>
<span style="font-size: 15px; line-height: 22px; color: {SUB}">Braucht eine Bescheinigung von Toms Arbeitgeber.</span>
<div style="display: flex; gap: 8px"><div style="flex: 1; display: flex; flex-direction: column">{btn("Öffnen", href="V1-Foto-Zettel.dc.html")}</div><a href="V1-Jahr.dc.html" style="height: 54px; padding: 0 20px; border-radius: 999px; box-shadow: inset 0 0 0 1px {HAIR}; display: flex; align-items: center; font-size: 16px; font-weight: 600; color: {INK}; text-decoration: none; white-space: nowrap">Zu heute</a></div>
{note("Loslassen: Das Objekt über dem Daumen wächst zur Karte (Objekt bleibt). Kein Loslassen auf einem Punkt: Der Griff federt zurück zu heute.")}
</div>''', gap=14, x=COL(7), y=ROWY[5])

screen("V1-Liste-Vorschlag.dc.html", "Listen · Assistent schlägt Vorlage vor", f'''
{h1("Listen", "6 offen, 1 erledigt", pair())}
{ltabs("Aufgaben")}
<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 22px; background: {ROW}">
<div style="display: flex; gap: 12px; align-items: flex-start">{tile("reise", 44, 13)}<span style="flex: 1; display: flex; flex-direction: column; gap: 4px"><span style="display: flex; align-items: center; gap: 5px; font-size: 13px; color: {SUB}">{li("sparkle", 13, SUB)}Neu im Kalender: Ostsee, 21.–28. März</span><span style="font-size: 16.5px; line-height: 22px; font-weight: 600">Packliste für Urlaub mit Baby anlegen?</span><span style="font-size: 14px; line-height: 20px; color: {SUB}">24 Dinge als Vorlage, ihr streicht, was ihr nicht braucht.</span></span></div>
<div style="display: flex; gap: 8px; padding-left: 56px"><a href="V1-Liste-Neu-Urlaub.dc.html" style="flex: 1; height: 40px; border-radius: 999px; background: {INK}; color: #FFFFFF; font-size: 14.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Ansehen</a><span style="flex: 1; height: 40px; border-radius: 999px; box-shadow: inset 0 0 0 1px {HAIR}; font-size: 14.5px; font-weight: 600; color: {INK}; display: flex; align-items: center; justify-content: center">Später</span></div>
</div>
{group(wrow("umschlag-euro", "Bescheinigung anfragen", "bis 28. Nov", av("T", 24), sub_c=FRIST) + wrow("reisepass", "Passfotos machen", "vor Fr 31.", av("J", 24)) + wrow("geschenk", "Geschenk für Oma Inge", "bis So", av("T", 24)))}
<span style="font-size: 13.5px; line-height: 19px; color: {SUB}">Taucht nur auf, wenn ein Anlass im Kalender steht: Urlaub, Geburt (Kliniktasche ab SSW 34), Kita-Start. Einmal pro Anlass, „Später“ fragt eine Woche danach noch einmal.</span>''', active="Listen", gap=14, x=COL(16), y=ROWY[1])

screen("V1-Liste-Neu-Urlaub.dc.html", "Listen · Neue Liste aus Vorschlag", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><a href="V1-Liste-Vorschlag.dc.html" style="font-size: 15px; color: {SUB}; text-decoration: none">Abbrechen</a><span style="width: 70px"></span></div>
<label style="display: flex; flex-direction: column; gap: 4px; padding: 6px 2px 0"><input value="Ostsee mit Ben" style="border: 0; padding: 0; font: 700 30px Geist, system-ui; letter-spacing: -.9px; color: {INK}; background: transparent; outline: none"><span style="font-size: 14px; color: {SUB}">Fällig vor Abreise am Sa 21. März</span></label>
<span style="font-size: 15px; font-weight: 600; margin-top: 4px">Womit anfangen?</span>
<div style="display: flex; flex-direction: column; gap: 8px">
{tpl("reise", "Urlaub mit Baby", "Packliste, 24 Dinge · passt zu eurem Urlaub", True)}
{tpl(None, "Leer", "Ihr tragt selbst ein")}
{tpl("hebamme", "Kliniktasche", "18 Dinge für Geburt und Wochenbett")}
{tpl("einkauf", "Erstausstattung", "Was ihr vor der Geburt braucht")}
</div>
<span style="font-size: 13.5px; line-height: 19px; color: {SUB}">Gleicher Screen wie über „+ Neu“, nur ist Name, Datum und Vorlage schon aus dem Anlass gefüllt.</span>
<span style="flex: 1"></span>{btn("Liste anlegen", href="V1-Liste-Klinik.dc.html")}''', pad="0 18px 34px", gap=12, x=COL(17), y=ROWY[1])


# ================= Zeile 7: Datum und Uhrzeit wählen (Konzept "Schreibzeile", zur Freigabe 26.10.) =================
YW = 8800
MONO = "font-family: 'Geist Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums"
def mono(t): return f'<span style="{MONO}">{t}</span>'
def chipr(t, on=False):
    ring = f"background: {ROW}; box-shadow: inset 0 0 0 1.5px {INK};" if on else "background: #EFEFEC;"
    return f'<span style="height: 32px; padding: 0 12px; border-radius: 999px; {ring} color: {INK}; font-size: 13.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap">{t}</span>'
def chips(items): return '<div style="display: flex; flex-wrap: wrap; gap: 6px">' + "".join(items) + '</div>'
KAL = chipr(li("cal", 14) + "Kalender"); TAST = chipr(li("papier", 14) + "Tastatur")
def wann(field, sentence, chip_row, extra="", ic="clock", pad_left=48):
    return (f'<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 12px; background: {ROW}">'
            f'<div style="display: flex; align-items: center; gap: 12px">{li(ic, 20, SUB)}<span style="flex: 1; min-width: 0; font-size: 16px; font-weight: 600">{field}</span></div>'
            f'<div style="padding-left: {pad_left - 16}px; display: flex; flex-direction: column; gap: 10px">{meta(sentence)}{chip_row}</div>{extra}</div>')
def grid(title, cells, band=None):
    # cells: 42 tuples (num, muted, dots, ring, today)
    head = (f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px">'
            f'<span style="font-size: 15px; font-weight: 600">{title}</span><span style="display: flex; gap: 6px">'
            + "".join(f'<span role="button" aria-label="{a}" style="width: 32px; height: 32px; border-radius: 999px; background: {BG}; display: flex; align-items: center; justify-content: center">{li(n, 16, SUB)}</span>' for n, a in [("back", "Monat zurück"), ("chev", "Monat vor")]) + '</span></div>')
    wd = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; font-weight: 600; color: ' + SUB + '">' + "".join(f'<span>{d}</span>' for d in ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]) + '</div>'
    cs = ""
    for i, (n, muted, dts, ring, today) in enumerate(cells):
        c = MUTE if muted else INK
        bnd = ""
        if band and band[0] <= i <= band[1]:
            l = "50%" if i == band[0] else "0"; r = "50%" if i == band[1] else "0"
            if i % 7 == 0 and i != band[0]: l = "0"
            bnd = f'<span style="position: absolute; top: 2px; bottom: 2px; left: {l}; right: {r}; background: #EFEFEC"></span>'
        rs = f"box-shadow: inset 0 0 0 1.5px {INK}; background: {ROW};" if ring else ""
        dot = "".join(f'<span style="width: 4px; height: 4px; border-radius: 999px; background: {d}"></span>' for d in ([INK] if today else dts))
        cs += (f'<span style="position: relative; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center">{bnd}'
               f'<span style="position: relative; width: 36px; height: 36px; border-radius: 999px; {rs} display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px">'
               f'<span style="font-size: 15px; line-height: 17px; font-weight: {700 if today else 500}; color: {c}">{n}</span><span style="display: flex; gap: 2px; height: 4px">{dot}</span></span></span>')
    return f'<div style="display: flex; flex-direction: column; gap: 6px; padding: 4px 0 0">{head}{wd}<div style="display: grid; grid-template-columns: repeat(7, 1fr)">{cs}</div></div>'
def month(first_wd, days, prev_days, sel=(), dots=None, today=None, muted_from=None):
    dots = dots or {}
    cells = [(prev_days - first_wd + 1 + i, True, [], False, False) for i in range(first_wd)]
    for d in range(1, days + 1):
        cells.append((d, bool(muted_from and d >= muted_from), dots.get(d, []), d in sel, d == today))
    n = 1
    while len(cells) < 42: cells.append((n, True, [], False, False)); n += 1
    return cells
TERMIN_KOPF = f'''<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 15px; color: {SUB}">Abbrechen</span><span style="width: 70px"></span></div>
<div style="display: flex; flex-direction: column; gap: 4px; padding: 6px 2px 0"><span style="font: 700 30px Geist, system-ui; letter-spacing: -.9px">U5 bei Dr. Weber</span><span style="font-size: 14px; color: {SUB}">Für Ben</span></div>
<div style="display: flex; gap: 6px">{katb("stethoskop", "Arzt", True)}{katb("vertrag", "Amt")}{katb("geburtstag", "Familie")}{katb("yogamatte", "Kurs")}<span style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 6px; border-radius: 16px; background: {ROW}"><span style="width: 34px; height: 34px; display: flex; align-items: center; justify-content: center">{li("plus", 22, SUB)}</span><span style="font-size: 11.5px; font-weight: 500; color: {SUB}">Alle</span></span></div>'''
ORT = f'<div style="opacity: .4">{line(li("pin", 20, SUB), "Kinderarztpraxis Weber", CH)}</div>'
def wnote(t, bottom=296):
    return f'<div style="position: absolute; left: 18px; right: 18px; bottom: {bottom}px">{note(t)}</div>'

screen("V2-Wann-1-Antippen.dc.html", "Wann · 1 Zeile antippen", f'''
{TERMIN_KOPF}
{group(wann(f'{caret()}<span style="color: {MUTE}; font-weight: 500">Wann? Zum Beispiel morgen 15 Uhr</span>', "Tag und Uhrzeit, gern auch jeden Dienstag.", chips([KAL, chipr("Heute · Do"), chipr("Morgen · Fr"), chipr("Sa 31."), chipr("So 1."), chipr("Mo 2."), chipr("Di 3."), chipr("Mi 4.")])) + ORT)}
{wnote("Text antippen macht die Zeile zum Textfeld, wie beim Einkauf. Kein Sheet. Darunter steht nur, was als Nächstes fehlt.")}
{kb()}''', pad="0 18px 34px", gap=14, x=COL(0), y=YW)

screen("V2-Wann-2-Schreiben.dc.html", "Wann · 2 Schreiben", f'''
{TERMIN_KOPF}
{group(wann(f'12.11. 930-1015{caret()}', f'Donnerstag, 12. November, {mono("9:30")} bis {mono("10:15")}. 45 Minuten.', chips([KAL, chipr("+1 Tag"), chipr("+1 Std"), chipr("Jede Woche"), chipr("Ganztägig")])) + ORT)}
{wnote("Fertig oder Termin speichern übernimmt. Die Zeile zeigt danach wieder Do 12. Nov · 9:30–10:15. Auch „Do 9:30“, „morgen 15 Uhr“ und „jeden Di 19-2030“ gehen.")}
{kb()}''', pad="0 18px 34px", gap=14, x=COL(1), y=YW)

NOV = month(6, 30, 31, sel={12}, today=None, dots={1: [JUL_INK, TOM_INK], 2: [JUL_INK, TOM_INK], 3: [TOM_INK], 10: [TOM_INK], 17: [TOM_INK], 24: [TOM_INK], 5: [JUL_INK], 12: [JUL_INK], 19: [JUL_INK], 26: [JUL_INK], 9: [SUB]})
NOV[3] = (29, True, [], False, True)  # heute, Do 29. Okt
screen("V2-Wann-3-Kalender.dc.html", "Wann · 3 Kalender statt Tastatur", f'''
{TERMIN_KOPF}
{group(wann(f'Do 12. Nov {mono("9:30")}', f'Donnerstag, 12. November, {mono("9:30")}. Wie lange?', chips([TAST, chipr("30 Min"), chipr("45 Min"), chipr("1 Std"), chipr("1,5 Std"), chipr("2 Std")]), grid("November 2026", NOV)))}
<span style="flex: 1"></span>
{note("Auswahl ist ein Ring, nie dunkel. Punkte zeigen echte Termine in Personenfarbe, Arbeitsblöcke bekommen keinen. Blättern mit den Pfeilen oder Monats-Chips.")}
{btn("Termin speichern")}''', pad="0 18px 34px", gap=12, x=COL(2), y=YW)

MAR = month(0, 31, 28, sel={20, 27}, dots={2: [TOM_INK], 9: [TOM_INK], 16: [TOM_INK], 23: [TOM_INK], 30: [TOM_INK], 4: [JUL_INK], 11: [JUL_INK], 18: [JUL_INK], 25: [JUL_INK]})
screen("V2-Wann-4-Ostsee.dc.html", "Wann · 4 Mehrere Tage", f'''
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 15px; color: {SUB}">Abbrechen</span><span style="width: 70px"></span></div>
<div style="display: flex; align-items: center; gap: 14px; padding-top: 6px">{tile("reise", 64, 20)}<span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font: 700 30px Geist, system-ui; letter-spacing: -.9px">Ostsee</span><span style="font-size: 14px; color: {SUB}">Für euch drei</span></span></div>
{group(wann("Sa 20. bis Sa 27. März 2027", "Samstag, 20. März bis Samstag, 27. März 2027. Ganztägig, 8 Tage. In der Zeit stehen Fußball am Di 23. und Rückbildung am Do 25.", chips([TAST, chipr("Jan"), chipr("Feb"), chipr("März", True), chipr("Apr"), chipr("Mai")]), grid("März 2027", MAR, band=(19, 26))))}
<span style="flex: 1"></span>
{note("Zwei Tipps ergeben einen Zeitraum, ein Datum ohne Uhrzeit ist ganztägig. Geschrieben: 20.-27.3. Das Jahr steht im Satz, weil es nicht 2026 ist.")}
{btn("Termin speichern")}''', pad="0 18px 34px", gap=12, x=COL(3), y=YW)

def task_edit():
    return (f'<div style="display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: {ROW}">'
            f'<div style="display: flex; align-items: center; gap: 12px">{circle()}<span style="flex: 1; min-width: 0; font-size: 17px; font-weight: 500">Passfotos machen bis Fr{caret()}</span>{av("J", 26)}</div>'
            f'<div style="padding-left: 38px; display: flex; flex-direction: column; gap: 10px">{meta("Fällig bis Freitag, 30. Oktober.")}'
            + chips([KAL, chipr("Heute · Do"), chipr("Morgen · Fr", True), chipr("Wochenende · So 1."), chipr("Nächste Woche · Fr 6."), chipr("Kein Datum")]) + '</div></div>')
screen("V2-Wann-5-Aufgabe.dc.html", "Aufgabe · bis Freitag", f'''
{h1("Listen", "2 offen, 1 erledigt", pair())}
{ltabs("Aufgaben")}
{group(task_edit() + '<div style="opacity: .4">' + wrow("umschlag-euro", "Bescheinigung anfragen", "bis 28. Nov", av("T", 24), sub_c=FRIST) + '</div>')}
{wnote("Die Frist steht im Text, wie Menge und Notiz beim Einkauf. Ohne „bis“ gibt es kein Datum. Nach Fertig: Passfotos machen, darunter „bis Fr 30. Okt“.")}
{kb()}''', pad="0 18px 34px", gap=12, x=COL(4), y=YW)

SEP = month(1, 30, 31, sel={14}, muted_from=None)
screen("V2-Wann-6-Geburt.dc.html", "Onboarding · Geburtsdatum", f'''
{back("V1-Onb-Eltern.dc.html", dots(2))}
{h1("Eure Kinder")}
<div style="display: flex; padding: 4px; border-radius: 999px; background: #EAEAE7"><span style="flex: 1; height: 38px; border-radius: 999px; background: {ROW}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06)">Schon da</span><span style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 15px; color: {SUB}">Noch unterwegs</span></div>
<div style="display: flex; flex-direction: column; gap: 10px; padding: 12px 16px; border-radius: 18px; background: {ROW}">
<div style="display: flex; align-items: center"><span style="flex: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 13px; color: {SUB}">Geboren am</span><span style="font-size: 18px; font-weight: 600">14. September 2026</span></span>{meta("6 Wochen")}</div>
{meta("Montag, 14. September 2026. Ben ist 6 Wochen alt.")}
{chips([TAST, chipr("Okt"), chipr("Sep", True), chipr("Aug"), chipr("Jul")])}
{grid("September 2026", SEP)}
</div>
<span style="flex: 1"></span>
{note("Ein Tipp auf den Tag übernimmt und klappt zu. Tage nach heute sind grau. Bei „Noch unterwegs“: 12.3. ergibt Freitag, 12. März 2027, SSW 21.")}
{btn("Weiter")}''', pad="0 18px 34px", gap=12, x=COL(5), y=YW)

screen("V2-Wann-7-Verschieben.dc.html", "Termin · Verschieben", f'''
<div style="margin: 0 -18px; height: 200px; background: {TINT["stethoskop"]}; position: relative; display: flex; align-items: center; justify-content: center">{icon("stethoskop", 150)}<span style="position: absolute; left: 18px; top: 8px; width: 40px; height: 40px; border-radius: 999px; background: {ROW}; display: flex; align-items: center; justify-content: center">{li("back", 20)}</span></div>
{group(wann(f'Do 29. Okt {mono("14:00–14:45")}{caret()}', f'Von {mono("9:30")} auf {mono("14:00")}, gleiche Dauer. Gleichzeitig: Rückbildung, <b style="color: {JUL_INK}; font-weight: 600">Julia</b>, {mono("14:00")} bis {mono("15:00")}.', chips([KAL, chipr("+1 Std"), chipr("+1 Tag"), chipr("+1 Woche"), chipr("Wie vorher")])))}
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -.9px">U6 bei Dr. Weber<span style="color: {DONE}">.</span></span>{meta("Kinderarztpraxis Weber · Hauptstr. 12")}</div>
<div style="position: absolute; left: 18px; right: 18px; bottom: 296px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; background: {INK}; color: #FFFFFF; font-size: 15px">{li("check", 18, "#FFFFFF")}<span style="flex: 1">Verschoben auf Do 14:00</span><span style="font-weight: 600">Rückgängig</span></div>
{kb()}''', pad="0 18px 34px", gap=14, x=COL(6), y=YW)

# ---------- Index ----------
notes = {
 "t0": {"x": 0, "y": ROWY[0] - 260, "text": "1 · Onboarding: Eltern, Kinder (falls ja), Kalender, Partner, erstes Jahr, Karten", "kind": "title1", "maxW": 3680},
 "t1": {"x": 0, "y": ROWY[1] - 260, "text": "2 · Heute (ohne Tabs), Kalender (Tag, Woche, Monat, Termin, Jahr), Listen mit Clay-Tabs (Aufgaben, Einkauf, neue Liste, Kliniktasche, Einkauf hinzufügen, wischen, bearbeiten, Assistent erkennt Abo-Muster, schlägt Listen-Vorlage vor)", "kind": "title1", "maxW": 8440},
 "t2": {"x": 0, "y": ROWY[2] - 260, "text": "3 · Neu: Foto wird gelesen, verstanden, Infozettel; neuer Termin, Symbol aus allen Clay-Icons, wiederkehrender Termin", "kind": "title1", "maxW": 3680},
 "t3": {"x": 0, "y": ROWY[3] - 260, "text": "4 · Eingang (Neu und Dokumente mit Fristen), Aufgaben aufteilen, Entwürfe", "kind": "title1", "maxW": 2270},
 "t4": {"x": 0, "y": ROWY[4] - 260, "text": "5 · Hinweise, Teilen, Assistent, Einstellungen, Plus", "kind": "title1", "maxW": 3210},
 "t7": {"x": 0, "y": YW - 260, "text": "7 · Datum und Uhrzeit: Schreibzeile (zur Freigabe)", "kind": "title1", "maxW": 3210},
 "t5": {"x": 0, "y": ROWY[5] - 260, "text": "6 · Designsystem v2 (Einfachheit), Widgets, Jahresring: halten, ziehen, loslassen", "kind": "title1", "maxW": 3210},
}
order = ["Main.dc.html"] + [k for k in BOARDS if k != "Main.dc.html"]
idx = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "Familienassistent v1 Flow",
       "launch": {"view": "canvas"}, "pages": [], "boards": BOARDS, "order": order, "notes": notes, "designSystems": []}
json.dump(idx, open(os.path.join(P, "canvas.json"), "w"), ensure_ascii=False, indent=1)
for n in USED:
    shutil.copy(os.path.join(ICONS, f"icon-{n}.webp"), os.path.join(P, "assets", f"icon-{n}.webp"))
print(len(BOARDS), "boards;", len(USED), "icons:", sorted(USED))
