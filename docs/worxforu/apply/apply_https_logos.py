"""Switch theme-option logo/favicon URLs from http:// to https:// (fixes mixed content). Dry run unless --apply."""
import json, os, sys, base64, urllib.request
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def cli(c):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=/wpvibe/v1/cli/run', method='POST', headers=H, data=json.dumps({'command': c}).encode())
    with urllib.request.urlopen(rq, timeout=120) as f: r = json.loads(f.read())
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c[:80]}: {r}')
    return r['stdout']
t = json.loads(cli('option get ct_theme_options --format=json'))
ch = {}
for k in ('logo', 'logo_light', 'logo_mobile', 'favicon'):
    v = t.get(k)
    if isinstance(v, dict) and any(isinstance(x, str) and x.startswith('http://worxforu.com') for x in v.values()):
        ch[k] = {a: (b.replace('http://worxforu.com', 'https://worxforu.com') if isinstance(b, str) else b) for a, b in v.items()}
        print(k, v.get('url'), '->', ch[k]['url'])
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
for k, v in ch.items(): cli(f"option patch update ct_theme_options {k} '{json.dumps(v)}' --format=json"); print('updated', k)
print(cli('cache purge')[:50])
