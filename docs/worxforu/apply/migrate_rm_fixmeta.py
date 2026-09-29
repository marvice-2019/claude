import json, os, sys, base64, urllib.request, io, contextlib
sys.path.insert(0, os.path.dirname(__file__))
with contextlib.redirect_stdout(io.StringIO()):
    import migrate_to_rankmath as M
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})['stdout']
ids = {p['post_name']: p['ID'] for p in json.loads(cli('post list --post_type=case-study --post_status=publish --posts_per_page=100 --fields=ID,post_name --format=json'))}
for slug in ('analytics-dashboard', 'project-task-solution'):
    v = M.POSTS[slug]
    req('POST', '/rankmath/v1/updateMeta', {'objectType': 'post', 'objectID': ids[slug], 'meta': {'rank_math_title': v['title'], 'rank_math_description': v['desc'],
        'rank_math_facebook_title': v['title'], 'rank_math_facebook_description': v['desc']}})
    got = cli(f'post meta get {ids[slug]} rank_math_title').strip()
    print(slug, ids[slug], '->', got, '| OK' if got == v['title'] else '| MISMATCH')
cli('cache purge')
