"""Set media-library alt text for images rendered without alt. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
ALT = {4782: 'Worxforu logo', 4787: 'Worxforu logo', 4781: 'Worxforu icon',
       4408: 'AI solutions icon', 4409: 'Connected operations icon', 4410: 'Custom development icon',
       4434: 'Team working on business technology', 4438: 'Worxforu badge icon',
       4482: 'Business analysis icon', 4483: 'Solution architecture icon', 4484: 'Engineering icon',
       4486: 'Quality assurance icon', 4487: 'UI/UX design icon', 4488: 'Support icon',
       1568: 'Worxforu enquiry illustration', 1877: 'Worxforu team at work'}
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=60) as f: return json.loads(f.read())
for i, a in ALT.items():
    cur = req('GET', f'/wp/v2/media/{i}&context=edit&_fields=id,alt_text,source_url')
    print(i, cur['source_url'].split('/uploads/')[-1], repr(cur['alt_text']), '->', repr(a))
    if '--apply' in sys.argv: req('POST', f'/wp/v2/media/{i}', {'alt_text': a})
print('APPLIED' if '--apply' in sys.argv else 'DRY RUN')
