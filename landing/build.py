import re, base64, json, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icons') + '/'
def tag(n): return f'<img src="data:image/webp;base64,{base64.b64encode(open(D+"icon-"+n+".webp","rb").read()).decode()}" alt="" width="32" height="32">'
js = sorted(set(re.findall(r'(?:icon: |\[)"([a-z-]+)"', s.split('<script>')[1])))
s = s.replace('{{imgmap}}', json.dumps({n: tag(n) for n in js}))
s = re.sub(r'\{\{img:([a-z-]+)\}\}', lambda m: tag(m.group(1)), s)
s = s.replace('{{chk}}', '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>')
CHKSVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>'
s = s.replace('{{chkraw}}', CHKSVG)
s = s.replace('{{camsvg}}', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>')
dots = {2:"t",3:"j",5:"jt",9:"t",11:"j",14:"jt",16:"t",18:"j",20:"t",23:"j",25:"jt",27:"t",29:"j"}
cells = [(d, True) for d in range(26, 32)] + [(d, False) for d in range(1, 31)] + [(d, True) for d in range(1, 7)]
s = s.replace('{{month}}', "".join(f'<span class="{"o" if o else ""}"><b>{d}</b><span class="d">{"" if o else "".join(f"<i class={chr(34)}{c}{chr(34)}></i>" for c in dots.get(d, ""))}</span></span>' for d, o in cells))
assert '{{' not in s
open(out, 'w').write(s); print(len(s), js)
