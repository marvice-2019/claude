"""Set page excerpts so Rank Math's llms.txt descriptions are clean (llms.txt uses %excerpt%). Dry run unless --apply."""
import json, os, sys, base64, urllib.request, re, subprocess
EX = {9:    'Worxforu, a Marvice brand, provides AI solutions, ERP and CRM software, business automation and custom development.',
      407:  'Business technology services: AI solutions, ERP and CRM, automation, custom software, web and mobile, SEO, market research, cloud and support.',
      4864: 'Implementation-led CRM, ERP, AI assistant, workflow automation, LMS, HR, project, helpdesk and analytics solutions.',
      26:   'Worxforu is the software and automation brand of Marvice Media Pvt Ltd.',
      24:   'Contact Worxforu (Marvice Media enquiries): +91 80562 91930, info@marvice.in. Monday to Saturday, 10am to 7pm; Sunday closed.'}
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
llms = subprocess.run(['curl', '-s', 'https://worxforu.com/llms.txt'], capture_output=True, text=True).stdout
print('CURRENT:'); [print('  ' + l) for l in llms.splitlines() if l.startswith('- [') and '/service/' not in l and '/case-study/' not in l]
print('PROPOSED:'); [print(f'  {i}: {e}') for i, e in EX.items()]
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
for i, e in EX.items():
    r = req('POST', f'/wp/v2/pages/{i}', {'excerpt': e})
    print(i, 'excerpt saved' if isinstance(r, dict) and 'excerpt' in r and r['excerpt'].get('raw', r['excerpt'].get('rendered', '')) else r if not isinstance(r, dict) else 'excerpt field not supported for pages')
req('POST', '/wpvibe/v1/cli/run', {'command': 'cache purge'})
