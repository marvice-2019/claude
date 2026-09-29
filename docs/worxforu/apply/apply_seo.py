"""Site identity + AIOSEO titles/descriptions for published pages. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
SITE = {'blogname': 'Worxforu', 'blogdescription': 'AI Solutions, ERP, CRM and Custom Software'}
META = {
 9:    ('Worxforu | AI Solutions, ERP, CRM and Custom Software',
        'Explore AI solutions, ERP and CRM software, business automation and custom development from Worxforu. Discuss the right scope for your business.'),
 407:  ('Services | Worxforu',
        'AI solutions, ERP and CRM, automation, custom software, websites and apps, SEO, market research, cloud and support services from Worxforu, a Marvice brand.'),
 4864: ('Products and Solutions | Worxforu',
        'CRM, ERP, AI assistant, workflow automation, LMS, HR, project, helpdesk and analytics solutions, implemented and scoped to your business.'),
 26:   ('About Worxforu | A Marvice Brand',
        'Worxforu is the software and automation brand of Marvice Media Pvt Ltd, helping businesses plan and implement AI solutions, custom applications and connected systems.'),
 24:   ('Contact Worxforu | Discuss Your Project',
        'Share your requirements for AI solutions, ERP and CRM, automation or custom software. Marvice Media enquiries: +91 80562 91930, info@marvice.in.'),
}
for k, v in SITE.items(): print(f'{k}: -> {v!r}')
for i, (t, d) in META.items(): print(f'page {i}: title {len(t)}c {t!r}\n          desc {len(d)}c')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
print(req('POST', '/wp/v2/settings', {'title': SITE['blogname'], 'description': SITE['blogdescription']}))
for i, (t, d) in META.items():
    r = req('POST', f'/wp/v2/pages/{i}', {'aioseo_meta_data': {'title': t, 'description': d, 'og_title': t, 'og_description': d}})
    print(i, r.get('aioseo_meta_data', {}).get('title'))
print(req('POST', '/wpvibe/v1/cli/run', {'command': 'cache purge'})['stdout'][:50])
