"""Rebuild Worxforu service records from the Consultio service template (post 651 backup)."""
import json, os, sys, copy, random, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from services_data import SERVICES, DELIVER, FAQ, PRICING
ICON = {'ai-solutions':'flaticon-light-bulb','erp-crm':'flaticon-graph','business-automation':'flaticon-gear',
 'custom-software':'flaticon-tools','web-mobile-development':'flaticon-internet','technology-consulting':'flaticon-strategy',
 'seo-optimization':'flaticon-bar-graph','market-research-and-advertising':'flaticon-pie-chart','web-portals':'flaticon-group',
 'learning-management-systems':'flaticon-skill','saas-implementation':'flaticon-cloud','ui-ux-design':'flaticon-eye',
 'cloud-solutions':'flaticon-cloud','devops':'flaticon-setting-spanner','api-integration':'flaticon-puzzle',
 'data-analytics':'flaticon-stats','support-maintenance':'flaticon-phone-call','ecommerce-development':'flaticon-product',
 'mobile-app-development':'flaticon-social-media'}
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization':'Basic '+base64.b64encode(A.encode()).decode(),'Content-Type':'application/json','User-Agent':'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route='+r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
def cli(c):
    r = req('POST', '/wpvibe/v1/cli/run', {'command': c})
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed: {c[:90]} -> {r}')
    return r['stdout']
q = lambda s: "'" + s.replace("'", "'\\''") + "'"
TPL = json.load(open(os.environ['SVC_TEMPLATE']))
hexid = lambda: '%08x' % random.getrandbits(32)
MENU_ID = os.environ.get('SVC_MENU_ID', '')

def build(slug, heading, intro, scope, included, extra_faq):
    d = copy.deepcopy(TPL)
    def walk(es):
        keep = []
        for e in es:
            s = e.get('settings', {}); i = e.get('id')
            if i == '526a9100': continue                                  # demo client logos: removed
            if i == '5236cc5c': s['title'] = heading
            if i == '5bf474db': s['editor'] = f'<p>{intro}</p>'
            if i == '21ca04a4': s['editor'] = f'<p><strong>Scope and boundaries:</strong> {scope}</p>'
            if i == '118ec289': s['list'] = [{'title': '', 'content': x, '_id': hexid()[:7]} for x in included]
            if i == '9a22fc5':
                base = s['tabs'][0]
                s['tabs'] = [dict(base, tab_title=t, tab_content=c, _id=hexid()[:7]) for t, c in
                             [('How We Deliver', DELIVER), ('FAQs', extra_faq + FAQ), ('Pricing', PRICING)]]
            if i == '5a3ebb17': s['source'] = ['corporate|service-category']; s['button_text'] = 'Learn more'
            if i == '415a7443' and MENU_ID: s['menu'] = MENU_ID
            if i == '64eeb67': s['title'] = 'Marvice Media enquiries'
            if i == '42ea80fc':
                ci = s['contact_info']
                ci[0]['content'] = 'Bengaluru · Chennai<br/>Mon–Sat 10am–7pm (Sunday closed)'
                ci[1]['content'] = '<a href="tel:+918056291930">+91 80562 91930</a>'
                ci[2]['content'] = '<a href="mailto:info@marvice.in">info@marvice.in</a>'
            if i == '233d4206': s['title'] = 'Start a Project'
            if i == '3651e4': s['editor'] = 'Tell us what you want to improve. We will help define the right scope and next steps.'
            if i == '71cdb235':
                it = s['download'][0]
                s['download'] = [dict(it, title='Share Your Requirements', link={'url': 'https://worxforu.com/?page_id=24', 'is_external': '', 'nofollow': ''})]
            if 'elements' in e: e['elements'] = walk(e['elements'])
            keep.append(e)
        return keep
    return walk(d)

apply = '--apply' in sys.argv
results = []
for (pid, slug, cat, _icon, title, excerpt, heading, intro, scope, included, extra) in SERVICES:
    data = build(slug, heading, intro, scope, included, extra)
    if not apply: print('DRY', pid, slug, title); continue
    if pid is None:
        pid = int(cli(f"post create --post_type=service --post_status=publish --post_title={q(title)} --porcelain").strip())
        cli(f"post meta update {pid} service_content_padding '{{\"padding-top\":\"0\",\"padding-bottom\":\"0\",\"units\":\"px\"}}' --format=json")
        cli(f"post meta update {pid} icon_type icon")
        cli(f"post meta update {pid} custom_pagetitle themeoption")
    cli(f"post update {pid} --post_title={q(title)} --post_name={slug} --post_status=publish")
    cli(f"post meta update {pid} service_except {q(excerpt)}")
    cli(f"post meta update {pid} service_icon {ICON[slug]}")
    cli(f"post term set {pid} service-category {cat} --by=slug")
    r = req('POST', '/wpvibe/v1/elementor/save-page', {'id': pid, 'post_type': 'service', 'data': data})
    results.append((pid, slug, title, r.get('warnings'))); print(pid, slug, r.get('view_url'), r.get('warnings'))
json.dump(results, open(os.path.join(os.path.dirname(__file__), 'services_applied.json'), 'w'), indent=1)
