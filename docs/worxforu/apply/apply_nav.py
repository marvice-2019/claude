"""New header navigation: left + right menus (desktop layout 14) and a full primary menu (mobile). Old menus kept, just unassigned."""
import json, os, sys, base64, urllib.request
SVC = [(446,'AI Solutions'),(448,'ERP and CRM Software'),(649,'Business Automation'),(2627,'Custom Software'),
       (645,'Website and Mobile'),(647,'Consulting and Support'),(651,'SEO Services'),(2625,'Market Research')]
PRD = [(2442,'CRM Solution'),(2441,'ERP Solution'),(2440,'AI Business Assistant'),(2439,'Workflow Automation'),(4876,'LMS Solution')]
SERVICES_HUB, PRODUCTS_HUB, ABOUT, CONTACT, HOME = 407, 4864, 26, 24, 9
TREE = {
 'Worxforu Left':  [('post', HOME, 'Home', []), ('post', SERVICES_HUB, 'Services', SVC + [(SERVICES_HUB, 'All Services')]),
                    ('post', PRODUCTS_HUB, 'Products', PRD + [(PRODUCTS_HUB, 'All Solutions')])],
 'Worxforu Right': [('post', ABOUT, 'About', []), ('post', CONTACT, 'Contact', []),
                    ('custom', 'https://marvice.in/', 'Marvice', [])],
}
TREE['Worxforu Main'] = TREE['Worxforu Left'] + TREE['Worxforu Right']
LOC = {'Worxforu Left': 'menu-left', 'Worxforu Right': 'menu-right', 'Worxforu Main': 'primary'}
for m, items in TREE.items():
    print(f'{m}  ->  location "{LOC[m]}"')
    for kind, ref, title, kids in items:
        print(f'   {title}' + ('  ▾' if kids else ''))
        for _, t in kids: print(f'      - {t}')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def cli(c):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=/wpvibe/v1/cli/run', method='POST', headers=H, data=json.dumps({'command': c}).encode())
    with urllib.request.urlopen(rq, timeout=120) as f: r = json.loads(f.read())
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c}: {r}')
    return r['stdout'].strip()
for m, items in TREE.items():
    mid = cli(f"menu create '{m}' --porcelain")
    for kind, ref, title, kids in items:
        pid = cli(f"menu item add-post {mid} {ref} --title='{title}' --porcelain") if kind == 'post' else cli(f"menu item add-custom {mid} '{title}' '{ref}' --target=_blank --porcelain")
        for ref2, t2 in kids: cli(f"menu item add-post {mid} {ref2} --title='{t2}' --parent-id={pid} --porcelain")
    cli(f"menu location assign {mid} {LOC[m]}"); print('assigned', m, mid, LOC[m])
