import re, base64, json, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icons') + '/'
_unused = 'assets/icons/'
def tag(n): return f'<img src="data:image/webp;base64,{base64.b64encode(open(D+"icon-"+n+".webp","rb").read()).decode()}" alt="" width="32" height="32">'
js = sorted(set(re.findall(r'(?:icon: |\[)"([a-z-]+)"', s.split('<script>')[1])))
s = s.replace('{{imgmap}}', json.dumps({n: tag(n) for n in js}))
s = re.sub(r'\{\{img:([a-z-]+)\}\}', lambda m: tag(m.group(1)), s)
s = s.replace('{{chk}}', '<span class="okc"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span>')
assert '{{' not in s
open(out, 'w').write(s); print(len(s), js)
