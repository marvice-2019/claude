"""Phase 1 change set for worxforu.com: global settings + homepage text.
Default is DRY RUN (prints before -> after). Pass --apply to write.
Credentials are read from $WP_AUTH_FILE (user:application-password); never commit them."""
import json, os, sys, base64, urllib.request, urllib.parse, copy

SITE = 'https://worxforu.com/?rest_route='
HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(HERE, '..', 'backup')

# ---------- 1. Theme options (Consultio Redux: ct_theme_options) ----------
THEME_OPTIONS = {
    'newsletter_popup': '0',                       # disable newsletter popup
    'cart_icon': '0',                              # hide WooCommerce cart icon
    'wellcome': 'Worxforu, a Marvice brand: AI, business software and automation',
    'h_phone_label': 'Call Us: +91 80562 91930',
    'h_phone': '+91 80562 91930',
    'h_phone_link': '+918056291930',
    'h_address_label': 'Marvice Media',
    'h_address': 'Bengaluru · Chennai',
    'h_time_label': 'Mon-Sat 10am - 7pm',
    'h_time': '(Sunday closed)',
    'h_email': 'info@marvice.in',
    'h_btn_text': 'Discuss Your Project',
    'h_btn_link_type': 'page', 'h_btn_link': '24',
    'h_social_facebook_url': '', 'h_social_twitter_url': '',
    'h_social_inkedin_url': '', 'h_social_pinterest_url': '',
    'h_popup_instagram_url': 'https://www.instagram.com/worxforu/',
    'h_popup_twitter_url': '', 'h_popup_tripadvisor_url': '',
}

# ---------- 2. Off-canvas "Get in touch" widget ----------
GETINTOUCH = {
    'address_label': 'Marvice Media enquiries', 'address_text': 'Bengaluru · Chennai',
    'phone_label': 'Call Us: +91 80562 91930', 'phone_text': 'info@marvice.in',
    'time_label': 'Monday - Saturday', 'time_text': '(10am - 7pm, Sunday closed)',
    'btn_text': 'Contact us', 'btn_link': 'https://worxforu.com/?page_id=24',
}

# ---------- 3. Homepage (page 9) widget text, keyed by Elementor element id ----------
L = lambda url: {'url': url, 'is_external': '', 'nofollow': '', 'custom_attributes': ''}
HOME = {
    # intro cards under slider
    '9b0c8bd': {'title_text': 'AI Solutions', 'description_text': 'Support your team with practical AI assistants and connected knowledge.', 'btn_text': 'Learn more'},
    '35b48ed': {'title_text': 'Connected Operations', 'description_text': 'Bring customer data, workflows and business systems together.', 'btn_text': 'Learn more'},
    'ceac700': {'title_text': 'Custom Development', 'description_text': 'Build applications that fit your processes and growth plans.', 'btn_text': 'Learn more'},
    # about block
    '8c6202e': {'title': 'A Marvice Brand', 'desc': 'Software and automation from Marvice Media Pvt Ltd.'},
    'a0ffde0': {'title': 'Technology Built Around Your Business', 'sub_title': 'About Worxforu'},
    '8f1ff1d': {'text_editor': 'Worxforu, a brand of Marvice Media Pvt Ltd, helps businesses plan, build and improve the systems they use every day. From AI assistants and workflow automation to ERP, CRM and custom software, we focus on practical solutions shaped around your operations.'},
    'd4f74df': {'title': 'Start With Your Requirements'},
    '8814fb6': {'text_editor': 'We define the problem, users and outcome before recommending technology.'},
    '44785c7': {'title': 'Connect Your Tools'},
    '018290c': {'text_editor': 'New systems work with your existing software, data and processes.'},
    # services heading (carousel itself is fed by Service records, phase 2)
    '4bd9bd6': {'title': 'Solutions for the Way You Work', 'sub_title': 'Services'},
    'b873548': {'text_editor': 'Explore services that help you organise information, connect processes and deliver better digital experiences.'},
    # counters -> process steps (no fabricated numbers)
    '2f82a2f': {'title': 'Discover<br/> Requirements'},
    'a8025b9': {'title': 'Design<br/> Scope & Flows'},
    '0cd2bbf': {'title': 'Develop<br/> Build & Test'},
    '0462d27': {'title': 'Support<br/> Launch & Improve'},
    # statistic block -> how we deliver
    '32b2c0f': {'title': 'Every engagement follows four clear stages.', 'sub_title': 'How We Deliver'},
    '8cba82c': {'text_editor': 'Discover, design, develop and support. You always know what is happening, what comes next and what you will receive.'},
    'fda3141': {'text': 'Explore our services'},
    # case-study area -> products & solutions showcase
    '977a010': {'title': 'Explore Our Products and Solutions', 'sub_title': 'Products and Solutions'},
    '3c2ec70': {'text_editor': 'Implementation-led solutions for common business needs, scoped to your users, modules and integrations.'},
    # team area -> delivery disciplines
    '9e3b7c8': {'title': 'The disciplines behind every project.', 'sub_title': 'How We Work'},
    '8effce3': {'editor': 'Each engagement brings together the skills your project needs, from first requirement to post-launch support.'},
    '4968d178': {'editor': 'Have a system that needs fixing, connecting or building? Talk to us.'},
    '20bce1a1': {'html': '<div class="about-call3">\n\t<i class="fas fa-phone-alt"></i>\n\t<a href="tel:+918056291930">Call Now for any help!</a>\n\t<span>+91 80562 91930</span>\n</div>'},
    '7e916a8': {'text': 'Discuss Your Project'},
    # blog heading
    '33ff7f01': {'title': 'Practical notes on AI, automation and business software.', 'sub_title': 'Insights'},
    '7e4d65f9': {'editor': 'Ideas and guides to help you plan better systems for your business.'},
    # closing
    'f0d9518': {'title': 'Let’s Discuss Your Next Business System', 'sub_title': 'Tell us what you want to improve'},
    '64b13f9e': {'text': 'Share Your Requirements'},
}
# team grids: replace demo people with disciplines (no names, no bios)
TEAM = {
    '61465678': [('Business Analysis', 'Requirements & process mapping'), ('Solution Architecture', 'Systems & integrations'),
                 ('Engineering', 'Web, mobile & backend'), ('Quality Assurance', 'Testing & release readiness')],
    '4b1ed7cb': [('UI/UX Design', 'Flows & prototypes'), ('Support', 'Maintenance & training')],
}
ICONS = [(1,4482),(2,4483),(3,4484),(4,4486),(5,4487),(6,4488)]
# links for buttons (existing link objects replaced)
LINKS = {'9b0c8bd': 'btn_link', '35b48ed': 'btn_link', 'ceac700': 'btn_link', 'fda3141': 'link', '7e916a8': 'link', '64b13f9e': 'link'}
LINK_TARGET = {'9b0c8bd': '/?page_id=407', '35b48ed': '/?page_id=407', 'ceac700': '/?page_id=407',
               'fda3141': '/?page_id=407', '7e916a8': '/?page_id=24', '64b13f9e': '/?page_id=24'}

def transform_home(data):
    out = copy.deepcopy(data); log = []
    def walk(es):
        for e in es:
            s = e.get('settings', {})
            if e.get('id') in HOME:
                for k, v in HOME[e['id']].items():
                    log.append((e['id'], k, s.get(k), v)); s[k] = v
            if e.get('id') in LINK_TARGET:
                k = LINKS[e['id']]; new = L('https://worxforu.com' + LINK_TARGET[e['id']])
                log.append((e['id'], k, s.get(k), new)); s[k] = new
            if e.get('id') in TEAM:
                items = s.get('content_list', [])
                for it, (t, p) in zip(items, TEAM[e['id']]):
                    log.append((e['id'], 'team', f"{it.get('title')} / {it.get('position')}", f'{t} / {p}'))
                    it['title'], it['position'] = t, p
                    ic = ICONS[len([x for x in log if x[1]=='team']) - 1]   # swap demo headshot for a service icon
                    it['image'] = {'url': f'https://worxforu.com/wp-content/uploads/2020/04/h14-service-icon{ic[0]}.png', 'id': ic[1]}
                    it['link'] = L('https://worxforu.com/?page_id=407'); it['social'] = ''
            walk(e.get('elements', []))
    walk(out)
    missing = set(HOME) - {l[0] for l in log}
    return out, log, missing

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    data = json.load(open(os.path.join(BACKUP, 'page-9-elementor.json')))
    new, log, missing = transform_home(data)
    print('== THEME OPTIONS'); [print(f'  {k}: -> {v!r}') for k, v in THEME_OPTIONS.items()]
    print('== GET IN TOUCH WIDGET'); [print(f'  {k}: -> {v!r}') for k, v in GETINTOUCH.items()]
    print(f'== HOME page 9: {len(log)} field changes; unmatched ids: {sorted(missing) or "none"}')
    for i, k, a, b in log: print(f'  [{i}] {k}: {str(a)[:70]!r} -> {str(b)[:70]!r}')
    json.dump(new, open(os.path.join(HERE, 'page-9-new.json'), 'w'), ensure_ascii=False)
    if not apply: print('\nDRY RUN: nothing written. Re-run with --apply after review.'); sys.exit()
    A = open(os.environ['WP_AUTH_FILE']).read().strip()
    H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    def req(m, r, b=None):
        rq = urllib.request.Request(SITE + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
        with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
    cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})
    for k, v in THEME_OPTIONS.items():
        print(cli("option patch update ct_theme_options %s '%s'" % (k, v.replace("'", "'\\''")))['exit_code'], k)
    for k, v in GETINTOUCH.items():
        print(cli("option patch update widget_getintouch_widget 1 %s '%s'" % (k, v.replace("'", "'\\''")))['exit_code'], k)
    print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': 9, 'data': new}))
    print(cli('cache flush'), cli('litespeed-purge all') if False else '')
