"""Set demo content to draft (not deleted) and hide homepage blog section + fabricated chart. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
def cli(c):
    r = req('POST', '/wpvibe/v1/cli/run', {'command': c})
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c[:80]}: {r}')
    return r['stdout']
KEEP_PAGES = {9, 24, 26, 407, 4864}
lst = lambda t: json.loads(cli(f'post list --post_type={t} --post_status=publish --posts_per_page=100 --fields=ID,post_title --format=json'))
plan = {t: lst(t) for t in ['page', 'post', 'portfolio', 'product']}
plan['page'] = [p for p in plan['page'] if int(p['ID']) not in KEEP_PAGES]
for t, items in plan.items():
    print(f'{t}: {len(items)} -> draft'); [print(f"   {p['ID']} {p['post_title']}") for p in items]
print('keep published pages:', sorted(KEEP_PAGES))
HIDE = {'4d73357': 'homepage blog section', '3dd9d0c4': 'homepage line chart with sample figures'}
print('hide on all devices:', HIDE)
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
for t, items in plan.items():
    ids = ' '.join(str(p['ID']) for p in items)
    if ids: cli(f'post update {ids} --post_status=draft'); print('drafted', t)
d = json.loads(cli('post meta get 9 _elementor_data'))
def walk(es):
    for e in es:
        if e['id'] in HIDE: e['settings'].update(hide_desktop='hidden-desktop', hide_tablet='hidden-tablet', hide_mobile='hidden-mobile')
        walk(e.get('elements', []))
walk(d)
print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': 9, 'data': d}))
print(cli('cache purge')[:60])
