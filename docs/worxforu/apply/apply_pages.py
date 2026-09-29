"""Products (case studies), Products hub, Services hub, About, Contact, enquiry form. Dry run unless --apply."""
import json, os, sys, copy, random, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from pages_data import *
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.environ['PAGE_SRC']   # dir with p407/p26/p24/p2442.json
P = lambda i: json.load(open(os.path.join(SRC, f'p{i}.json')))
hexid = lambda: '%07x' % random.getrandbits(28)
LNK = lambda u, ext='': {'url': u, 'is_external': ext, 'nofollow': '', 'custom_attributes': ''}
CONTACT = 'https://worxforu.com/?page_id=24'

def edit(data, fn):
    def walk(es):
        out = []
        for e in es:
            r = fn(e, e.get('settings', {}))
            if r == 'DROP': continue
            if 'elements' in e: e['elements'] = walk(e['elements'])
            out.append(e)
        return out
    return walk(copy.deepcopy(data))

def reid(e):
    e = copy.deepcopy(e)
    def w(x):
        x['id'] = '%08x' % random.getrandbits(32)
        for c in x.get('elements', []): w(c)
    w(e); return e

# ---------- product (case study) ----------
def product(p):
    _, slug, title, avail, who, exc, overview, modules, img, cta = p
    def fn(e, s):
        i = e['id']
        if i == '273f5ae9': s['title'] = 'Scoped to your users, modules and integrations.'; s['sub_title'] = 'Products and Solutions'
        if i == '1f5a4cf': s['editor'] = PRICING
        if i == '11e5f03c': s['image'] = {'url': '', 'id': img}
        if i == '62c7ab10': s['title'] = title
        if i == '23bc3b25': s['editor'] = overview
        if i == '37bc7c6b': s['editor'] = f'<strong>Modules:</strong> {modules}<br/><br/><a href="{CONTACT}"><strong>{cta} →</strong></a>'
        if i == '1946a97a':
            c = s['portfolio_content']
            vals = [('Availability:', avail), ('For:', who), ('Pricing:', 'Scoped proposal'), ('Enquiries:', 'info@marvice.in')]
            for item, (l, v) in zip(c, vals): item['label'], item['content'] = l, v
        if i == '52624d78':
            e['widgetType'] = 'ct_case_study_carousel'
            e['settings'] = {'layout': '4', 'limit': 4, 'col_md': '2', 'slides_to_scroll': '2', 'dots': 'true'}
    return edit(P(2442), fn)

# ---------- services hub 407 ----------
def services_hub():
    d = P(407)
    def fn(e, s):
        i = e['id']
        if i == 'd3b6aca': s['title'] = 'Business technology services, from one workflow to a complete system.'; s['sub_title'] = 'Services'
        if i == '8a619a7': s['editor'] = "Worxforu helps you plan, build, connect and support the technology your operations depend on. Start with one need and we'll scope the rest around it."
        if i == '16d5b63': s['source'] = ['corporate|service-category', 'business|service-category']; s['limit'] = 30; s['button_text'] = 'Learn more'
        if i == '2b5b5683': return 'DROP'
    d = edit(d, fn)
    ind = reid(P(407)[0])
    def fn2(e, s):
        if e.get('widgetType') == 'ct_heading': s['title'] = 'Industries we serve.'; s['sub_title'] = 'Industries'
        if e.get('widgetType') == 'text-editor': s['editor'] = f'<p>{INDUSTRIES}</p><p>Every industry runs differently. Tell us how yours works and we will show you where technology can help. <a href="{CONTACT}">Share your requirements →</a></p>'
    d.append(edit([ind], fn2)[0])
    return d

# ---------- products hub (new page from 407 layout) ----------
def products_hub():
    d = P(407)
    def fn(e, s):
        i = e['id']
        if i == 'd3b6aca': s['title'] = 'Implementation-led solutions for common business needs.'; s['sub_title'] = 'Products and Solutions'
        if i == '8a619a7': s['editor'] = 'Each solution is scoped to your users, modules, integrations and deployment requirements. ' + PRICING
        if i == '16d5b63':
            e['widgetType'] = 'ct_case_study_grid'
            e['settings'] = {'limit': 12, 'col_md': '2', 'col_lg': '3', 'col_xl': '3', 'filter': 'false'}
        if i == '2b5b5683': return 'DROP'
    return [reid(x) for x in edit(d, fn)]

# ---------- about 26 ----------
def about():
    def fn(e, s):
        i = e['id']
        if i == '9d091b6': s['title'] = 'Worxforu is the software and automation brand of Marvice Media Pvt Ltd.'
        if i == '176c3a2': s['editor'] = 'We help businesses plan and implement AI solutions, custom applications and connected operational systems. Our focus is practical: understand how your operations run, then plan, build and support the systems that make them simpler.'
        if i == '4b32f49': s['editor'] = 'Our areas: automation, custom software, web portals, AI development, learning management systems, SaaS implementation, websites and mobile apps, SEO and market research.'
        if i == '11f730c':
            base = s['list'][0]
            s['list'] = [dict(base, content=t, _id=hexid()) for t in ['Requirements first, technology second.', 'Deliverables scoped in writing before build.', 'Built to connect with the tools you use.', 'Supported after launch with training and documentation.']]
        if i == '596ae67': s['editor'] = '<div class="about-call">Call to ask <a href="tel:+918056291930">any question</a>  <span>+91 80562 91930</span></div>'
        if i in ('41e6e03', 'dffa2c1', '8ddf128', 'a158a9e', '7d781fc', '720bd044'): return 'DROP'
        if i == '1a03c0b':
            s['title'] = 'Part of Marvice Media'; s['desc'] = 'For branding, gifting, events and PR, visit Marvice.'
            s['btn_text'] = 'Visit Marvice'; s['btn_link'] = LNK('https://marvice.in/', 'on'); s['btn_icon'] = {'value': 'fas fa-arrow-right', 'library': 'fa-solid'}
        if i == '4cae67e': s['title'] = 'Core services for connected business operations.'
        if i == '83f630e': s['editor'] = 'From AI assistants and workflow automation to ERP, CRM and custom software, every engagement starts with your requirements.'
        if i == '584b9d6': s['source'] = ['corporate|service-category']
    return edit(P(26), fn)

# ---------- contact 24 ----------
def contact():
    def fn(e, s):
        i = e['id']
        if i == 'c8a2f48': s['title_text'] = 'Marvice offices:'; s['description_text'] = ('<strong>Bengaluru:</strong> No.38, 3rd Floor, Green Leaf Extension, 3rd Cross, 80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034<br/>'
                                                                                            '<strong>Chennai:</strong> Prestige Palladium Bayan, 8th Floor, 43/1 Greams Road, Nungambakkam, Chennai 600006')
        if i == '9e16110': s['title_text'] = 'Marvice Media enquiries:'; s['description_text'] = '<a href="tel:+918056291930">+91 80562 91930</a><br/>Mon–Sat 10am–7pm (Sunday closed)'
        if i == '485cc85': s['title_text'] = 'Email and social:'; s['description_text'] = '<a href="mailto:info@marvice.in">info@marvice.in</a><br/><a href="https://www.instagram.com/worxforu/" target="_blank" rel="noopener" aria-label="Worxforu on Instagram">Worxforu on Instagram</a>'
        if i == 'd6bfcba': s['title'] = 'Discuss your project with our team.'
        if i == '0f30a93': s['editor'] = "Tell us what you want to improve. We'll review your requirements and suggest the right scope and next steps."
        if i == 'd33da39': return 'DROP'
    return edit(P(24), fn)

DEMO = ['Lorem', 'Real Madrid', 'giorf', 'At vero', 'Natalia', 'Consultio', 'Constrio', 'envato', 'Hartford', '734) 697', '540-325', 'Client 1', 'Kathleen', 'Dut perspiciatis', 'Easily apply']
def check(name, data):
    t = json.dumps(data, ensure_ascii=False); bad = [w for w in DEMO if w in t]
    print(f'  {name:40} widgets={t.count(chr(34)+"widgetType"+chr(34)):3} demo-left={bad or "none"}')

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    print('DRY RUN' if not apply else 'APPLY')
    plan = [('page 407 Services hub (title->Services, slug services)', services_hub()), ('NEW page Products and Solutions', products_hub()),
            ('page 26 About', about()), ('page 24 Contact', contact())]
    for p in PRODUCTS: plan.append((f"{'case-study '+str(p[0]) if p[0] else 'NEW case-study'} {p[2]}", product(p)))
    for n, d in plan: check(n, d)
    print('  CF7 form 91: replace fields, mail to info@marvice.in, success/error messages')
    print('  terms: service-category corporate->"Core Services", business->"Specialised Services"; case-study-category financial->"Solutions"')
    if not apply: sys.exit()
    A = open(os.environ['WP_AUTH_FILE']).read().strip()
    H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    def req(m, r, b=None):
        rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
        with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
    def cli(c):
        r = req('POST', '/wpvibe/v1/cli/run', {'command': c})
        if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c[:80]}: {r}')
        return r['stdout']
    q = lambda s: "'" + s.replace("'", "'\\''") + "'"
    log = {}
    if os.environ.get('RESUME_PRODUCTS'): pass
    else:
     cli('term update service-category corporate --by=slug --name=' + q('Core Services'))
     cli('term update service-category business --by=slug --name=' + q('Specialised Services'))
     cli('term update case-study-category financial --by=slug --name=Solutions')
     cli("post update 407 --post_title=Services --post_name=services")
     log[407] = req('POST', '/wpvibe/v1/elementor/save-page', {'id': 407, 'data': plan[0][1]})
     tpl = cli('post meta get 407 _wp_page_template').strip() or 'default'
     r = req('POST', '/wpvibe/v1/elementor/save-page', {'title': 'Products and Solutions', 'status': 'publish', 'page_template': tpl, 'data': plan[1][1]})
     cli(f"post update {r['id']} --post_name=products"); log['products'] = r
     log[26] = req('POST', '/wpvibe/v1/elementor/save-page', {'id': 26, 'data': plan[2][1]})
     log[24] = req('POST', '/wpvibe/v1/elementor/save-page', {'id': 24, 'data': plan[3][1]})
    for p, (_, data) in zip(PRODUCTS, plan[4:]):
        pid, slug, title, img, exc = p[0], p[1], p[2], p[8], p[5]
        if pid is None:
            pid = int(cli(f"post create --post_type=case-study --post_status=publish --post_title={q(title)} --porcelain").strip())
            cli(f"post meta update {pid} case_study_content_padding '{{\"padding-top\":\"0\",\"padding-bottom\":\"0\",\"units\":\"px\"}}' --format=json")
            cli(f"post term set {pid} case-study-category financial --by=slug")
        cli(f"post update {pid} --post_title={q(title)} --post_name={slug} --post_status=publish")
        cli(f"post meta update {pid} case_study_except {q(exc)}")
        if p[0] is None: cli(f"post meta update {pid} _thumbnail_id {img} --force")
        log[slug] = req('POST', '/wpvibe/v1/elementor/save-page', {'id': pid, 'post_type': 'case-study', 'data': data})
    f = req('GET', '/contact-form-7/v1/contact-forms/91')
    mail = dict(f['properties']['mail']); mail.update(CF7_MAIL)
    msgs = dict(f['properties']['messages']); msgs.update(CF7_MESSAGES)
    log['cf7'] = req('POST', '/contact-form-7/v1/contact-forms/91', {'title': 'Worxforu Enquiry', 'form': CF7_FORM, 'mail': mail, 'messages': msgs})
    for k, v in log.items(): print(k, str(v)[:160])
    json.dump({str(k): v for k, v in log.items()}, open(os.path.join(HERE, 'pages_applied.json'), 'w'), indent=1, default=str)
