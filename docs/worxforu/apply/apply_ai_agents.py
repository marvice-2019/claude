"""Add 'AI Agent Setup & Managed Automation' service (own category), menus, grid source, CF7 option + preselect.
Tool facts verified 29 Sep 2026 against: docs.openclaw.ai, docs.openclaw.ai/gateway/security, hermes-agent.nousresearch.com/docs,
github.com/paperclipai/paperclip, docs.n8n.io (choose-how-to-use-n8n, community licence FAQ, AI agent nodes). Dry run unless --apply."""
import json, os, sys, copy, random, base64, urllib.request, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
TITLE = 'AI Agent Setup & Managed Automation'; SLUG = 'ai-agent-setup-managed-automation'
CAT_NAME, CAT_SLUG = 'AI Agents & Automation', 'ai-agents-automation'
CTA = 'Discuss Your Automation Requirements'
CTA_URL = 'https://worxforu.com/?page_id=24&' + urllib.parse.urlencode({'service-interest': TITLE}) + '#wpcf7-f91-p24-o1'
EXCERPT = 'Deployment, integration and managed support for OpenClaw, Hermes Agent, n8n and Paperclip.'
INTRO = ('Worxforu deploys, configures and integrates open-source AI agent and automation tools on infrastructure you control, '
         'then connects them to your channels, business systems and workflows. These are third-party tools: Worxforu provides the '
         'setup, integration and support around them.')
SCOPE = ('<strong>Scoped separately:</strong> hosting, AI model usage (billed by your model provider on your own account), third-party '
         'subscriptions and ongoing support are quoted and billed separately from setup. Timelines depend on your environment, integrations '
         'and security requirements and are confirmed after discovery. No AI subscription is bundled and usage is not unlimited. '
         f'<a href="{CTA_URL}">{CTA} →</a>')
INCLUDED = ['OpenClaw Setup', 'Hermes Agent Setup', 'n8n Workflow Automation', 'Paperclip Setup', 'Managed Support', 'Security review and handover']
OFFERINGS = (
 '<p><strong>OpenClaw Setup</strong><br/>OpenClaw is an MIT-licensed, self-hosted gateway that connects chat apps such as WhatsApp, Telegram, Slack, Discord and Microsoft Teams to AI agents. '
 'We install the Gateway on your server or machine, connect your channels, configure your own model-provider API keys, set allowlists and per-agent access profiles in line with OpenClaw’s security guidance, and run its security audit before go-live.</p>'
 '<p><strong>Hermes Agent Setup</strong><br/>Hermes Agent is Nous Research’s MIT-licensed agent with persistent memory, reusable skills and built-in scheduling. '
 'We install it on your server or a supported sandbox backend, connect your messaging platforms and chosen model provider, and configure command approval and container isolation.</p>'
 '<p><strong>n8n Workflow Automation</strong><br/>We design, build and maintain n8n workflows, including AI Agent nodes and human-in-the-loop approvals for sensitive steps. '
 'n8n runs on your own infrastructure or n8n Cloud account under your licence, or on our instance where you receive the automation outputs. All work follows n8n’s Sustainable Use License.</p>'
 '<p><strong>Paperclip Setup</strong><br/>Paperclip is an MIT-licensed, self-hosted platform for managing teams of AI agents, with org charts, per-agent budgets, approval workflows and audit logs. '
 'It works with agent runtimes such as OpenClaw, Claude Code and Codex. We deploy it with a production PostgreSQL database, connect your agents and configure budgets and approval policies.</p>'
 '<p><strong>Managed Support</strong><br/>Monitoring, updates, backups, credential rotation, workflow fixes and change requests under an agreed support plan. '
 'Support hours: Monday to Saturday, 10am to 7pm (Sunday closed).</p>')
DELIVER = ('<p><strong>1. Discover:</strong> use cases, channels, systems, data and risk.</p>'
           '<p><strong>2. Plan:</strong> hosting, model provider, access rules and approval points, agreed in writing.</p>'
           '<p><strong>3. Deploy and integrate:</strong> install, connect channels and systems, test against real examples.</p>'
           '<p><strong>4. Harden and hand over:</strong> security review, documentation and team training.</p>'
           '<p><strong>5. Support:</strong> optional managed support plan.</p>')
FAQ = ('<p><strong>Are these Worxforu products?</strong><br/>No. OpenClaw, Hermes Agent, n8n and Paperclip are third-party tools. Worxforu provides deployment, integration and support services and is not affiliated with their developers.</p>'
       '<p><strong>Is ChatGPT or another AI subscription included?</strong><br/>No. The agents use a model provider you choose, and usage is billed by that provider on your own account.</p>'
       '<p><strong>How quickly can it be set up?</strong><br/>It depends on your environment, channels, integrations and security requirements. We confirm a timeline after discovery; a small pilot is usually the first step.</p>'
       '<p><strong>Is usage unlimited?</strong><br/>No. Capacity depends on your hosting and on your model provider’s limits and charges.</p>'
       '<p><strong>Can you host n8n for us to build our own workflows?</strong><br/>No. We can install and manage n8n on your own server or n8n Cloud account, or run workflows on our instance where you receive the outputs.</p>')
COSTS = ('<p>Setup is quoted after discovery. The following are scoped and billed separately:</p>'
         '<p>• Hosting and infrastructure<br/>• AI model usage (billed by your provider)<br/>• Third-party subscriptions and licences<br/>• Ongoing managed support</p>'
         f'<p><a href="{CTA_URL}"><strong>{CTA} →</strong></a></p>')
TPL = json.load(open(os.path.join(HERE, '..', 'backup', 'service-651-template.json')))
hid = lambda: '%07x' % random.getrandbits(28)
def build():
    d = copy.deepcopy(TPL)
    def walk(es):
        keep = []
        for e in es:
            s = e.get('settings', {}); i = e.get('id')
            if i == '526a9100': continue
            if i == '5236cc5c': s['title'] = TITLE
            if i == '5bf474db': s['editor'] = f'<p>{INTRO}</p>'
            if i == '21ca04a4': s['editor'] = f'<p>{SCOPE}</p>'
            if i == '118ec289': s['list'] = [{'title': '', 'content': x, '_id': hid()} for x in INCLUDED]
            if i == '9a22fc5':
                b = s['tabs'][0]; s['tabs'] = [dict(b, tab_title=t, tab_content=c, _id=hid()) for t, c in
                    [('Offerings', OFFERINGS), ('How We Deliver', DELIVER), ('FAQs', FAQ), ('Costs & Scope', COSTS)]]
            if i == '5a3ebb17': s['source'] = ['corporate|service-category']; s['button_text'] = 'Learn more'
            if i == '415a7443': s['menu'] = '46'
            if i == '64eeb67': s['title'] = 'Marvice Media enquiries'
            if i == '42ea80fc':
                ci = s['contact_info']
                ci[0]['content'] = 'Bengaluru · Chennai<br/>Mon–Sat 10am–7pm (Sunday closed)'
                ci[1]['content'] = '<a href="tel:+918056291930">+91 80562 91930</a>'
                ci[2]['content'] = '<a href="mailto:info@marvice.in">info@marvice.in</a>'
            if i == '233d4206': s['title'] = 'Start a Project'
            if i == '3651e4': s['editor'] = 'Tell us which tools, channels and systems you want to connect. We will help define the right scope and next steps.'
            if i == '71cdb235': s['download'] = [dict(s['download'][0], title=CTA, link={'url': CTA_URL, 'is_external': '', 'nofollow': ''})]
            if 'elements' in e: e['elements'] = walk(e['elements'])
            keep.append(e)
        return keep
    return walk(d)
data = build(); txt = json.dumps(data, ensure_ascii=False)
BANNED = ['Forex', 'MT4', 'MT5', 'Prop Firm', 'Liquidity', 'Copier', 'PAMM', 'MAMM', 'Infyst', 'one-minute', '1-minute', 'unlimited usage', 'ChatGPT subscription included', 'Lorem', 'Pennsylvania', 'consultio.com']
print('service:', TITLE, '| slug', SLUG, '| category', CAT_NAME)
print('CTA:', CTA, '->', CTA_URL)
print('banned/demo strings in page:', [b for b in BANNED if b.lower() in txt.lower() and b not in ('unlimited usage',)] or 'none')
print('menus: add under Services in "Worxforu Left"(47) and "Worxforu Main"(49); add to sidebar "Worxforu Services"(46)')
print('services hub grid 16d5b63: add source', CAT_SLUG); print('CF7 91: add option + default:get on service-interest')
print("theme option service_slug: 'service' -> 'services' (URL /services/%s/ once pretty permalinks are on)" % SLUG)
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
def cli(c):
    r = req('POST', '/wpvibe/v1/cli/run', {'command': c})
    if r.get('exit_code') != 0: raise SystemExit(f'CLI failed {c[:90]}: {r}')
    return r['stdout'].strip()
q = lambda s: "'" + s.replace("'", "'\\''") + "'"
terms = json.loads(cli('term list service-category --format=json'))
if not any(t['slug'] == CAT_SLUG for t in terms): cli(f"term create service-category {q(CAT_NAME)} --slug={CAT_SLUG}")
pid = int(cli(f"post create --post_type=service --post_status=publish --post_title={q(TITLE)} --porcelain"))
cli(f"post update {pid} --post_name={SLUG}")
cli(f"post meta update {pid} service_content_padding '{{\"padding-top\":\"0\",\"padding-bottom\":\"0\",\"units\":\"px\"}}' --format=json")
for k, v in [('icon_type', 'icon'), ('custom_pagetitle', 'themeoption'), ('service_icon', 'flaticon-target-1'), ('service_except', EXCERPT)]:
    cli(f"post meta update {pid} {k} {q(v)}")
cli(f"post term set {pid} service-category {CAT_SLUG} --by=slug")
print('save', req('POST', '/wpvibe/v1/elementor/save-page', {'id': pid, 'post_type': 'service', 'data': data}))
# menus
for m in (47, 49):
    items = json.loads(cli(f'menu item list {m} --format=json'))
    parent = next(i['db_id'] for i in items if i['title'] == 'Services' and int(i.get('parent') or 0) == 0)
    allsvc = next(i for i in items if i['title'] == 'All Services')
    cli(f"menu item add-post {m} {pid} --title={q('AI Agents & Automation')} --parent-id={parent} --position={int(allsvc['position'])}")
cli(f'menu item add-post 46 {pid}')
# services hub grid source
d = json.loads(cli('post meta get 407 _elementor_data'))
def w(es):
    for e in es:
        if e.get('id') == '16d5b63' and f'{CAT_SLUG}|service-category' not in e['settings']['source']: e['settings']['source'].append(f'{CAT_SLUG}|service-category')
        w(e.get('elements', []))
w(d); print('hub', req('POST', '/wpvibe/v1/elementor/save-page', {'id': 407, 'data': d})['warnings'])
# CF7 option + preselect
form = cli('post meta get 91 _form')
if TITLE not in form:
    form = form.replace('[select* service-interest first_as_label "Service interest" "AI Solutions"',
                        f'[select* service-interest default:get first_as_label "Service interest" "AI Solutions" "{TITLE}"')
    assert TITLE in form, 'select tag not found'
    cli(f"post meta update 91 _form {q(form)} --force")
cli("option patch update ct_theme_options service_slug services")
print(cli('cache purge')[:40]); json.dump({'service_id': pid}, open(os.path.join(HERE, 'ai_agents_applied.json'), 'w'))
