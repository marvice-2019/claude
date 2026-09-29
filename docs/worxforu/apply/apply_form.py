"""Contact Form 7 #91: fields, mail settings (was empty = no emails sent), messages. Dry run unless --apply."""
import json, os, sys, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__)); from pages_data import CF7_FORM, CF7_MAIL, CF7_MESSAGES
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
bk = {k: cli(f'post meta get 91 {k}') for k in ('_form', '_mail', '_messages', '_mail_2', '_additional_settings')}
json.dump(bk, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backup', 'cf7-91-before.json'), 'w'), ensure_ascii=False, indent=1)
mail = dict(active=True, attachments='', use_html=False, exclude_blank=False, **CF7_MAIL)
msgs = json.loads(cli('post meta get 91 _messages --format=json') or '{}') or {}
msgs.update(CF7_MESSAGES)
print('current _mail:', repr(bk['_mail'])[:80])
print('new _mail:', json.dumps(mail, ensure_ascii=False)[:400])
print('new fields:', [l.split('[')[1].split(']')[0][:40] for l in CF7_FORM.splitlines() if '[' in l])
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
cli(f"post meta update 91 _form {q(CF7_FORM)} --force")
cli(f"post meta update 91 _mail {q(json.dumps(mail, ensure_ascii=False))} --format=json --force")
cli(f"post meta update 91 _messages {q(json.dumps(msgs, ensure_ascii=False))} --format=json --force")
cli(f"post update 91 --post_title={q('Worxforu Enquiry')} --post_content_base64={base64.b64encode(CF7_FORM.encode()).decode()}")
f = req('GET', '/contact-form-7/v1/contact-forms/91')
print('title:', f['title']); print('form starts:', f['properties']['form']['content'][:90]); print('mail:', json.dumps(f['properties']['mail'])[:200])
