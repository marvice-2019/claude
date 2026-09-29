"""Hero readability: dark overlay on the hero section + subtitle text shadow. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})['stdout']
d = json.loads(cli('post meta get 9 _elementor_data'))
json.dump(d, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backup', 'page-9-before-hero-contrast.json'), 'w'))
SEC = {'background_overlay_background': '', 'background_overlay_color': '', 'background_overlay_opacity': {'unit': 'px', 'size': '', 'sizes': []},
       'background_position': 'center center', 'background_position_tablet': '', 'background_position_mobile': '',
       'content_position': 'top', 'padding': {'unit': 'px', 'top': '70', 'right': '20', 'bottom': '110', 'left': '20', 'isLinked': False},
       'padding_tablet': {'unit': 'px', 'top': '60', 'right': '20', 'bottom': '110', 'left': '20', 'isLinked': False},
       'padding_mobile': {'unit': 'px', 'top': '45', 'right': '20', 'bottom': '110', 'left': '20', 'isLinked': False}}
SUB = {'text_shadow_text_shadow_type': 'yes', 'text_shadow_text_shadow': {'horizontal': 0, 'vertical': 2, 'blur': 10, 'color': 'rgba(0,0,0,0.55)'},
       'typography_font_weight': '500'}
hit = []
def walk(es):
    for e in es:
        if e['id'] == 'a1b2c3d4': e['settings'].update(SEC); hit.append('overlay removed (original colours); text block anchored near top, clear of the photo subject')
        if e['id'] == 'a1b2c3d5': e['settings'].update({'content_position': 'top', 'align': 'center'}); hit.append('column vertical align top')
        if e['id'] == 'a1b2c3d7': e['settings'].update(SUB); hit.append('subtitle shadow + weight 500')
        walk(e.get('elements', []))
walk(d); print(hit)
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': 9, 'data': d})['warnings']); print(cli('cache purge')[:40])
