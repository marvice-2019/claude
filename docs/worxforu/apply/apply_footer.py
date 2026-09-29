"""Footer (post 20) content update. Dry run unless --apply."""
import json, os, sys, copy, base64, urllib.request
BK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backup', 'p20.json')
L = lambda u, ext='': {'url': u, 'is_external': ext, 'nofollow': '', 'custom_attributes': ''}
QUICK = ('<p><a href="https://worxforu.com/?page_id=407">Services</a><br/><a href="https://worxforu.com/?page_id=4864">Products and Solutions</a><br/>'
         '<a href="https://worxforu.com/?page_id=26">About</a><br/><a href="https://worxforu.com/?page_id=24">Contact</a><br/>'
         '<a href="https://marvice.in/" target="_blank" rel="noopener">Marvice Media</a></p>')
CHANGES = {
 '24e2b0d1': lambda s: s.update(link=L('https://worxforu.com/'), image=dict(s['image'], url='https://worxforu.com/wp-content/uploads/2023/03/Asset-44x-8.png', alt='Worxforu')),
 '470037ce': lambda s: s.update(text_editor='Worxforu, a Marvice brand, provides AI solutions, business software, automation and custom development for connected business operations.'),
 '7c1c964':  lambda s: s.update(text='About us', link=L('https://worxforu.com/?page_id=26')),
 '886b039':  lambda s: s.update(title='Insights'),
 '47713f32': lambda s: s.update(text_editor='Occasional practical notes on AI, automation and business software. Unsubscribe any time.'),
 '613047a6': lambda s: s.update(icons=[dict(s['icons'][0], icon_link=L('https://www.instagram.com/worxforu/', 'on'), ct_icon={'value': 'fab fa-instagram', 'library': 'fa-brands'})]),
 '2177f15':  lambda s: s.update(title='Marvice Media enquiries:'),
 '2cf337cd': lambda s: s.update(contact_info=[
                 dict(s['contact_info'][0], content='<a href="https://worxforu.com/?page_id=24">Bengaluru · Chennai</a>'),
                 dict(s['contact_info'][1], content='<a href="tel:+918056291930">+91 80562 91930</a>'),
                 dict(s['contact_info'][1], _id='9e1c26f', content='<a href="mailto:info@marvice.in">info@marvice.in</a>', ct_icon={'value': 'fas fa-envelope', 'library': 'fa-solid'})]),
 'c6ee381':  lambda s: s.update(editor='Mon - Sat: 10 am - 7 pm,<br/>\nSunday: CLOSED'),
 '3bc6c05':  lambda s: s.update(title='Quick links'),
 'd7243db':  lambda s: s.update(editor=QUICK),
 '75ac8cec': lambda s: s.update(text_editor='© <span class="ct-year">2026</span> Worxforu. A brand of <a href="https://marvice.in/" target="_blank" rel="noopener">Marvice Media Pvt Ltd</a>. All rights reserved.'),
}
d = json.load(open(BK)); hit = []
def walk(es):
    for e in es:
        if e['id'] in CHANGES: before = json.dumps(e['settings'], ensure_ascii=False); CHANGES[e['id']](e['settings']); hit.append(e['id'])
        walk(e.get('elements', []))
walk(d)
print('changed widgets:', len(hit), 'missing:', set(CHANGES) - set(hit) or 'none')
t = json.dumps(d, ensure_ascii=False)
print('demo strings left:', [w for w in ['Fratton', '452-1505', 'CaseThemes', 'instagram-feed', 'localhost', '8 am - 5 pm', 'advertising sector'] if w in t] or 'none')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': 20, 'post_type': 'footer', 'data': d}))
print(req('POST', '/wpvibe/v1/cli/run', {'command': 'cache purge'})['stdout'][:60])
