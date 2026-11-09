import os, re, sys
D = sys.argv[1]
routes = {d for d in os.listdir(D) if os.path.isfile(os.path.join(D, d, 'index.html'))}
assets = r'(?:_astro|astro|media|fonts)/|favicon'
pat = re.compile(r'(?<=[\s"\'(,=])/(?!/)(' + assets + r'[^\s"\'),]*|(?:' + '|'.join(routes) + r')(?=[/"\'#?\s])/?|(?=["\'#?]))')

def fix(text, prefix):
    def rep(m):
        p = m.group(1)
        if re.match(assets, p):
            return prefix + p
        name = p.rstrip('/')
        return prefix + (name + '/index.html' if name else 'index.html')
    return pat.sub(rep, text)

for root, _, files in os.walk(D):
    for f in files:
        path = os.path.join(root, f)
        rel = os.path.relpath(path, D)
        if f.endswith('.html'):
            depth = rel.count('/')
        elif f.endswith('.css'):
            depth = 1
        else:
            continue
        prefix = '../' * depth or ''
        s = open(path, encoding='utf-8').read()
        n = fix(s, prefix)
        open(path, 'w', encoding='utf-8').write(n)
print(sorted(routes))
