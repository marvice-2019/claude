"""Hidden side panel (sidebar-hidden) cleanup. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def cli(c):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=/wpvibe/v1/cli/run', method='POST', headers=H, data=json.dumps({'command': c}).encode())
    with urllib.request.urlopen(rq, timeout=120) as f: r = json.loads(f.read())
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c[:80]}: {r}')
    return r['stdout']
get = lambda o: json.loads(cli(f'option get {o} --format=json'))
new = {}
sw = get('sidebars_widgets'); old = list(sw['sidebar-hidden'])
sw['sidebar-hidden'] = [w for w in old if w not in ('block-5', 'block-6')]; new['sidebars_widgets'] = sw
mi = get('widget_media_image'); mi['1'].update({'attachment_id': 4782, 'url': 'https://worxforu.com/wp-content/uploads/2023/03/Asset-24x-8.png',
      'width': 333, 'height': 98, 'alt': 'Worxforu', 'link_url': 'https://worxforu.com/'}); new['widget_media_image'] = mi
tx = get('widget_text'); tx['1']['text'] = ('Worxforu, a Marvice brand, provides AI solutions, business software, automation and custom '
      'development for connected business operations.'); new['widget_text'] = tx
so = get('widget_cs_social_widget')
for k in list(so['1']):
    if k.startswith('link_'): so['1'][k] = ''
so['1']['link_instagram'] = 'https://www.instagram.com/worxforu/'; new['widget_cs_social_widget'] = so
print('sidebar-hidden:', old, '->', sw['sidebar-hidden'])
print('logo:', mi['1']['url'], '| link', mi['1']['link_url'])
print('text:', tx['1']['text'])
print('social:', {k: v for k, v in so['1'].items() if k.startswith('link_') and v})
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
for o, v in new.items():
    cli(f"option update {o} '{json.dumps(v).replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}' --format=json"); print('updated', o)
print(cli('cache purge'))
