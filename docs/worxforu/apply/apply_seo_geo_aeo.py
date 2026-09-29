"""Site-wide SEO/GEO/AEO via AIOSEO's own REST endpoints + per-page meta and JSON-LD. Dry run unless --apply.
Global: brand entity (name, logo, phone, contact type, Instagram), '|' separator, sitemap = pages/services/products only,
robots.txt rules incl. explicit AI-crawler access, local-business hours/contact (no office address claimed for Worxforu).
Per page: title + description; Service + FAQPage JSON-LD on services (FAQ text mirrors the visible FAQ tab); Service on products;
Organization enrichment (parentOrganization Marvice, knowsAbout, contactPoint) on the homepage."""
import json, os, sys, re, html, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from services_data import SERVICES, FAQ as STD_FAQ
from pages_data import PRODUCTS
import ai_agents_const as AG   # constants from the AI-agent service change set
ORG = 'https://worxforu.com/#organization'
LOGO = 'https://worxforu.com/wp-content/uploads/2023/03/Asset-24x-8.png'
AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'Googlebot']
rule = lambda ua, r, p: json.dumps({'userAgent': ua, 'rule': r, 'directoryPath': p})
OPTIONS = {
 'searchAppearance': {'global': {'separator': '&#124;', 'schema': {
     'websiteName': 'Worxforu', 'websiteAlternateName': 'Worxforu by Marvice Media', 'siteRepresents': 'organization',
     'organizationName': 'Worxforu', 'organizationLogo': LOGO, 'phone': '+918056291930', 'contactType': 'Sales'}}},
 'social': {'profiles': {'urls': {'instagramUrl': 'https://www.instagram.com/worxforu/'}}},
 'sitemap': {'general': {'enable': True, 'postTypes': {'all': False, 'included': ['page', 'service', 'case-study']},
                         'taxonomies': {'all': False, 'included': []}, 'author': False, 'date': False}},
 'tools': {'robots': {'enable': True, 'rules': [rule('*', 'allow', '/'), rule('*', 'disallow', '/wp-admin/'), rule('*', 'allow', '/wp-admin/admin-ajax.php'),
            rule('*', 'disallow', '/?s='), rule('*', 'disallow', '/cart/'), rule('*', 'disallow', '/checkout/'), rule('*', 'disallow', '/my-account/')]
            + [rule(b, 'allow', '/') for b in AI_BOTS]}},
 'localBusiness': {'locations': {'business': {'name': 'Worxforu', 'businessType': 'ProfessionalService', 'areaServed': 'India',
      'urls': {'website': 'https://worxforu.com/', 'aboutPage': 'https://worxforu.com/?page_id=26', 'contactPage': 'https://worxforu.com/?page_id=24'},
      'contact': {'email': 'info@marvice.in', 'phone': '+918056291930', 'phoneFormatted': '+91 80562 91930'}}},
   'openingHours': {'show': True, 'use24hFormat': False, 'timezone': 'Asia/Kolkata', 'days': {
      **{d: {'open24h': False, 'closed': False, 'openTime': '10:00', 'closeTime': '19:00'} for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']},
      'sunday': {'open24h': False, 'closed': True, 'openTime': '10:00', 'closeTime': '19:00'}}}},
}
txt = lambda h: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()
def faq_pairs(h):
    return [(txt(q), txt(a)) for q, a in re.findall(r'<strong>(.*?)</strong><br/>(.*?)</p>', h)]
def service_ld(name, desc, faqs):
    g = [{'@type': 'Service', 'name': name, 'serviceType': name, 'description': desc, 'provider': {'@id': ORG},
          'brand': {'@type': 'Brand', 'name': 'Worxforu'}, 'areaServed': {'@type': 'Country', 'name': 'India'},
          'availableChannel': {'@type': 'ServiceChannel', 'servicePhone': '+91 80562 91930', 'availableLanguage': 'English'}}]
    if faqs: g.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]})
    return {'@context': 'https://schema.org', '@graph': g}
def clip(s, n=158):
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0].rstrip(',.;:') + '…'
POSTS = {}
for (pid, slug, cat, _i, title, excerpt, heading, intro, scope, inc, extra) in SERVICES:
    POSTS[slug] = dict(title=f'{title} | Worxforu', desc=clip(f'{excerpt.rstrip(".")}. Scoped and delivered by Worxforu, a Marvice Media brand.'),
                       ld=service_ld(title, intro, faq_pairs(extra + STD_FAQ)))
POSTS[AG.SLUG] = dict(title='AI Agent Setup & Managed Automation | Worxforu',
                      desc=clip('OpenClaw, Hermes Agent, n8n and Paperclip deployment, integration and managed support from Worxforu. Hosting and AI usage scoped separately.'),
                      ld=service_ld(AG.TITLE, AG.INTRO, faq_pairs(AG.FAQ)))
for (pid, slug, title, avail, who, exc, overview, modules, img, cta) in PRODUCTS:
    POSTS[slug] = dict(title=f'{title} | Worxforu', desc=clip(f'{exc.rstrip(".")}. {avail} from Worxforu, scoped to your users, modules and integrations.'),
                       ld=service_ld(title, overview, []))
HOME_LD = {'@context': 'https://schema.org', '@graph': [{'@type': 'Organization', '@id': ORG, 'name': 'Worxforu', 'url': 'https://worxforu.com/',
   'description': 'Worxforu is the software and automation brand of Marvice Media Pvt Ltd, providing AI solutions, ERP and CRM software, business automation and custom development.',
   'parentOrganization': {'@type': 'Organization', 'name': 'Marvice Media Pvt Ltd', 'url': 'https://marvice.in/'},
   'sameAs': ['https://www.instagram.com/worxforu/'],
   'contactPoint': {'@type': 'ContactPoint', 'contactType': 'sales', 'telephone': '+91-80562-91930', 'email': 'info@marvice.in', 'areaServed': 'IN', 'availableLanguage': 'English',
                    'hoursAvailable': {'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 'opens': '10:00', 'closes': '19:00'}},
   'knowsAbout': ['AI solutions', 'AI agents', 'Business automation', 'n8n', 'ERP software', 'CRM software', 'Custom software development', 'Web portals',
                  'Learning management systems', 'SaaS implementation', 'Website development', 'Mobile app development', 'Cloud migration', 'DevOps', 'API integration', 'Data analytics', 'SEO', 'Market research']}]}
BANNED = ['forex', 'mt4', 'mt5', 'prop firm', 'infyst', 'unlimited', 'one-minute', 'guarantee']
if __name__ == '__main__':
    print('GLOBAL OPTIONS:'); print(json.dumps(OPTIONS, indent=1)[:2500])
    print(f'\nPER-PAGE: {len(POSTS)} services/products + home/about FAQ')
    for s, v in POSTS.items():
        types = [g['@type'] for g in v['ld']['@graph']]; nq = sum(len(g.get('mainEntity', [])) for g in v['ld']['@graph'])
        print(f"  {s:34} t={len(v['title']):2} d={len(v['desc']):3} {types} q={nq}")
    allt = json.dumps([OPTIONS, POSTS, HOME_LD]).lower()
    print('banned strings:', [b for b in BANNED if b in allt] or 'none')
    print('example desc:', POSTS['ai-solutions']['desc'])
    if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
    A = open(os.environ['WP_AUTH_FILE']).read().strip()
    H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    def req(m, r, b=None):
        rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
        try:
            with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
        except urllib.error.HTTPError as e: return {'_err': e.code, 'body': e.read().decode()[:300]}
    def cli(c): return req('POST', '/wpvibe/v1/cli/run', {'command': c}).get('stdout', '')
    print('options:', req('POST', '/aioseo/v1/options', {'options': OPTIONS}).get('success'))
    ids = {p['post_name']: p['ID'] for t in ('service', 'case-study') for p in json.loads(cli(f'post list --post_type={t} --post_status=publish --posts_per_page=100 --fields=ID,post_name --format=json'))}
    def schema(ld): return {'blockGraphs': [], 'graphs': [], 'customGraphs': [{'id': '#aioseo-worxforu', 'label': 'Worxforu', 'schema': json.dumps(ld, ensure_ascii=False)}]}
    for s, v in POSTS.items():
        r = req('POST', '/aioseo/v1/post', {'id': ids[s], 'title': v['title'], 'description': v['desc'], 'og_title': v['title'], 'og_description': v['desc'], 'schema': schema(v['ld'])})
        print(s, r.get('success', r))
    r = req('POST', '/aioseo/v1/post', {'id': 9, 'title': 'Worxforu | AI Solutions, ERP, CRM and Custom Software',
             'description': 'Explore AI solutions, ERP and CRM software, business automation and custom development from Worxforu. Discuss the right scope for your business.',
             'og_title': 'Worxforu | AI Solutions, ERP, CRM and Custom Software',
             'og_description': 'Explore AI solutions, ERP and CRM software, business automation and custom development from Worxforu. Discuss the right scope for your business.',
             'schema': schema(HOME_LD)}); print('home', r.get('success', r))
    print(cli('cache purge')[:40])
