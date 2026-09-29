"""Give every published service a featured image (Consultio's service grid skips posts without one). Dry run unless --apply."""
import json, os, sys, base64, urllib.request
MAP = {4171: 1531, 4174: 1532, 4177: 1533, 4819: 1535, 4822: 1536, 4825: 1537, 4828: 1540,
       4831: 1542, 4834: 1543, 4837: 1552, 4840: 1553, 4995: 1555}
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def cli(c):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=/wpvibe/v1/cli/run', method='POST', headers=H, data=json.dumps({'command': c}).encode())
    with urllib.request.urlopen(rq, timeout=120) as f: r = json.loads(f.read())
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c}: {r}')
    return r['stdout']
for pid, img in MAP.items():
    t = json.loads(cli(f'post get {pid} --fields=post_title --format=json'))['post_title']
    m = json.loads(cli(f'post get {img} --fields=post_title,post_type --format=json'))
    assert m['post_type'] == 'attachment', (img, m)
    print(f'{pid} {t:40} <- image {img} ({m["post_title"]})')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
for pid, img in MAP.items(): cli(f'post meta update {pid} _thumbnail_id {img} --force')
print(cli('cache purge')[:40])
