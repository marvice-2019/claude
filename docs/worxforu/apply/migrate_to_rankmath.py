"""Migrate Worxforu SEO from AIOSEO to Rank Math via Rank Math's own REST endpoints + its option storage.
Dry run unless --apply. AIOSEO is deactivated (not deleted) only after Rank Math output is verified with --deactivate-aioseo."""
import json, os, sys, re, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from apply_seo_geo_aeo import POSTS, HOME_LD
def ns(path):
    g = {'__name__': 'x', '__file__': path}; sys.argv = [path]
    try: exec(open(path).read(), g)
    except SystemExit: pass
    return g
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    SEO = ns(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apply_seo.py'))
    AG = ns(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apply_ai_agents_seo.py'))
sys.argv = sys.argv  # restored by caller
APPLY = '--apply' in sys.__dict__.get('orig_argv', [])  # set below
PAGES = SEO['META']                                  # {9: (title, desc), 407: ..., 4864, 26, 24}
POSTS['ai-agent-setup-managed-automation'] = dict(title=AG['TITLE_SEO'], desc=AG['DESC_SEO'], ld=AG['LD'])
AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'Googlebot']
ROBOTS = ('User-agent: *\nAllow: /wp-admin/admin-ajax.php\nAllow: /\nDisallow: /wp-admin/\nDisallow: /?s=\nDisallow: /cart/\nDisallow: /checkout/\nDisallow: /my-account/\n\n'
          + '\n'.join(f'User-agent: {b}\nAllow: /\n' for b in AI_BOTS))
TITLES = {'title_separator': '|', 'knowledgegraph_type': 'company', 'knowledgegraph_name': 'Worxforu', 'website_name': 'Worxforu',
          'website_alternate_name': 'Worxforu by Marvice Media',
          'knowledgegraph_logo': 'https://worxforu.com/wp-content/uploads/2023/03/Asset-24x-8.png', 'knowledgegraph_logo_id': 4782,
          'phone_numbers': [{'type': 'sales', 'number': '+91 80562 91930'}], 'email': 'info@marvice.in', 'url': 'https://worxforu.com/',
          'social_additional_profiles': 'https://www.instagram.com/worxforu/', 'local_business_type': 'Organization',
          'opening_hours': [{'day': d, 'time': '10:00-19:00'} for d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']],
          'pt_page_default_rich_snippet': 'off', 'pt_service_default_rich_snippet': 'off', 'pt_case-study_default_rich_snippet': 'off'}
SITEMAP_ON = {'pt_page_sitemap', 'pt_service_sitemap', 'pt_case-study_sitemap'}
GENERAL = {'robots_txt_content': ROBOTS, 'llms_post_types': ['page', 'service', 'case-study'], 'attachment_redirect_urls': 'on'}
MODULES = {'local-seo': 'on', 'llms-txt': 'on', 'rich-snippet': 'on', 'sitemap': 'on'}
def rm_schema(ld, primary_type='Service'):
    out = {}
    for n, node in enumerate(ld['@graph']):
        node = dict(node); t = node['@type']
        node['metadata'] = {'title': t, 'type': 'custom', 'isPrimary': t == primary_type}
        out[f'new-{n}'] = node
    return out
if __name__ == '__main__':
    apply = '--apply' in sys.argv[1:] or '--apply' in os.environ.get('MIGRATE_FLAGS', '')
    print('MODULES', MODULES); print('TITLES', {k: (v if not isinstance(v, list) else f'{len(v)} items') for k, v in TITLES.items()})
    print('SITEMAP on only:', sorted(SITEMAP_ON)); print('GENERAL llms_post_types', GENERAL['llms_post_types'], '| robots lines', ROBOTS.count('\n'))
    print('PAGES', {k: v[0] for k, v in PAGES.items()})
    print('POSTS', len(POSTS), 'with schema types', sorted({g['@type'] for v in POSTS.values() for g in v['ld']['@graph']}))
    if not apply: print('DRY RUN'); sys.exit()
    A = open(os.environ['WP_AUTH_FILE']).read().strip()
    H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    def req(m, r, b=None):
        rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
        try:
            with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
        except urllib.error.HTTPError as e: return {'_err': e.code, 'body': e.read().decode()[:300]}
    def cli(c):
        r = req('POST', '/wpvibe/v1/cli/run', {'command': c})
        if r.get('exit_code') != 0: print('CLI ERR', c[:80], r)
        return r.get('stdout', '')
    q = lambda s: "'" + s.replace("'", "'\\''") + "'"
    for m, st in MODULES.items(): print('module', m, req('POST', '/rankmath/v1/saveModule', {'module': m, 'state': st}))
    for k, v in TITLES.items(): cli(f"option patch update rank-math-options-titles {k} {q(json.dumps(v) if not isinstance(v, str) else v)}" + (' --format=json' if not isinstance(v, str) else ''))
    sm = json.loads(cli('option get rank-math-options-sitemap --format=json'))
    for k in list(sm):
        if k.endswith('_sitemap') and (k.startswith('pt_') or k.startswith('tax_')):
            want = 'on' if k in SITEMAP_ON else 'off'
            if sm[k] != want: cli(f'option patch update rank-math-options-sitemap {k} {want}')
    for k in ('authors_sitemap', 'html_sitemap'): cli(f'option patch update rank-math-options-sitemap {k} off')
    for k, v in GENERAL.items(): cli(f"option patch update rank-math-options-general {k} {q(json.dumps(v) if not isinstance(v, str) else v)}" + (' --format=json' if not isinstance(v, str) else ''))
    ids = {p['post_name']: p['ID'] for t in ('service', 'case-study') for p in json.loads(cli(f'post list --post_type={t} --post_status=publish --posts_per_page=100 --fields=ID,post_name --format=json'))}
    def meta(pid, t, d): return req('POST', '/rankmath/v1/updateMeta', {'objectType': 'post', 'objectID': pid, 'meta': {
        'rank_math_title': t, 'rank_math_description': d, 'rank_math_facebook_title': t, 'rank_math_facebook_description': d}})
    for pid, (t, d) in PAGES.items(): print('page', pid, str(meta(pid, t, d))[:60])
    for slug, v in POSTS.items():
        r1 = meta(ids[slug], v['title'], v['desc']); r2 = req('POST', '/rankmath/v1/updateSchemas', {'objectType': 'post', 'objectID': ids[slug], 'schemas': rm_schema(v['ld'])})
        print(slug, str(r1)[:40], str(r2)[:60])
    print('home schema', str(req('POST', '/rankmath/v1/updateSchemas', {'objectType': 'post', 'objectID': 9, 'schemas': rm_schema(HOME_LD, primary_type='none')}))[:80])
    cli('rewrite flush'); print(cli('cache purge')[:40])
