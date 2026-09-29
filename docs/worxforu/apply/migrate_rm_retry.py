"""Retry: insert Rank Math option keys that did not exist yet + meta for project-task-solution."""
import json, os, sys, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import migrate_to_rankmath as M
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})
q = lambda s: "'" + s.replace("'", "'\\''") + "'"
for opt, keys in [('rank-math-options-titles', ['website_alternate_name', 'knowledgegraph_logo', 'knowledgegraph_logo_id', 'phone_numbers', 'email', 'url', 'social_additional_profiles']),
                  ('rank-math-options-general', ['robots_txt_content'])]:
    src = M.TITLES if 'titles' in opt else M.GENERAL
    for k in keys:
        v = src[k]; s = v if isinstance(v, str) else json.dumps(v)
        r = cli(f"option patch insert {opt} {k} {q(s)}" + ('' if isinstance(v, str) else ' --format=json'))
        print(opt, k, r.get('exit_code'), r.get('stderr', '')[:80])
pid = json.loads(cli('post list --post_type=case-study --post_status=publish --s=Project --fields=ID,post_name --format=json')['stdout'])[0]['ID']
v = M.POSTS['project-task-solution']
print('meta', req('POST', '/rankmath/v1/updateMeta', {'objectType': 'post', 'objectID': pid, 'meta': {'rank_math_title': v['title'], 'rank_math_description': v['desc'],
      'rank_math_facebook_title': v['title'], 'rank_math_facebook_description': v['desc']}}))
print(cli('cache purge')['stdout'][:40])
