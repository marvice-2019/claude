"""SEO rewrite of 'AI Agent Setup & Managed Automation' (service 4995). Reuses the service template and the
facts verified against official docs (see apply_ai_agents.py). Dry run unless --apply."""
import json, os, sys, re, html, copy, random, base64, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
import ai_agents_const as C
PID = 4995
CTA, CTA_URL = C.CTA, 'https://worxforu.com/contact/?service-interest=AI+Agent+Setup+%26+Managed+Automation#wpcf7-f91-p24-o1'
TITLE_SEO = 'AI Agent Setup & n8n Automation Services | Worxforu'
DESC_SEO = ('Self-hosted AI agent setup for OpenClaw, Hermes Agent and Paperclip, plus n8n workflow automation '
            'and managed support. Hosting and AI usage scoped separately.')
HEADING = 'AI Agent Setup, n8n Automation and Managed Support'
INTRO = ('Worxforu sets up self-hosted AI agents and workflow automation for businesses across India. We deploy and configure '
         '<strong>OpenClaw</strong>, <strong>Hermes Agent</strong>, <strong>Paperclip</strong> and <strong>n8n</strong> on infrastructure you control, '
         'connect them to WhatsApp, Telegram, Slack, email and your business systems, and keep them running with managed support. '
         'These are open-source and fair-code third-party tools: Worxforu provides the AI agent deployment, integration and support around them.')
LINKS = ('Related services: <a href="https://worxforu.com/service/business-automation/">Business Automation</a> · '
         '<a href="https://worxforu.com/service/ai-solutions/">AI Solutions</a> · '
         '<a href="https://worxforu.com/service/api-integration/">API Development and Integration</a> · '
         '<a href="https://worxforu.com/service/support-maintenance/">Maintenance and Support</a>')
SCOPE = ('<strong>What is scoped separately:</strong> hosting, AI model usage (billed by your model provider on your own account), '
         'third-party subscriptions and ongoing support are quoted separately from setup. Timelines depend on your environment, '
         'channels, integrations and security requirements and are confirmed after discovery. No AI subscription is bundled and usage is not unlimited. '
         f'<a href="{CTA_URL}">{CTA} →</a><br/><br/>{LINKS}')
INCLUDED = ['OpenClaw setup and gateway configuration', 'Hermes Agent installation and configuration', 'n8n workflow automation with AI agent nodes',
            'Paperclip setup for managing AI agent teams', 'Managed AI automation support', 'Security review, documentation and handover']
OFFERINGS = (C.OFFERINGS.replace('<strong>OpenClaw Setup</strong>', '<strong>OpenClaw setup service</strong>')
             .replace('<strong>Hermes Agent Setup</strong>', '<strong>Hermes Agent installation</strong>')
             .replace('<strong>n8n Workflow Automation</strong>', '<strong>n8n workflow automation services</strong>')
             .replace('<strong>Paperclip Setup</strong>', '<strong>Paperclip AI agent orchestration setup</strong>')
             .replace('<strong>Managed Support</strong>', '<strong>Managed AI automation support</strong>'))
USE_CASES = ('<p><strong>AI assistant on WhatsApp, Telegram or Slack</strong><br/>An OpenClaw or Hermes Agent assistant that answers team or customer questions in the chat apps you already use, with allowlists and human handoff.</p>'
             '<p><strong>Lead capture and CRM automation</strong><br/>n8n workflows that validate website enquiries, create CRM records, assign an owner and schedule follow-ups, with approvals for sensitive steps.</p>'
             '<p><strong>Internal knowledge assistant</strong><br/>An agent that answers questions from your approved documents and policies, so staff find answers without searching folders.</p>'
             '<p><strong>Scheduled reports and alerts</strong><br/>Daily or weekly summaries pulled from your systems and delivered to Slack, email or Telegram on a schedule.</p>'
             '<p><strong>Coordinating multiple AI agents</strong><br/>Paperclip to assign goals, set monthly budgets per agent, require approvals and keep an audit trail when several agents work together.</p>')
EXTRA_FAQ = ('<p><strong>What is AI agent setup?</strong><br/>It is the work of installing an AI agent platform, connecting it to your channels, data and model provider, setting access and approval rules, and testing it against real tasks before your team relies on it.</p>'
             '<p><strong>Which AI agent platform should we choose?</strong><br/>OpenClaw suits assistants that live in chat apps; Hermes Agent suits assistants that need persistent memory, reusable skills and scheduled tasks; n8n suits predictable, rule-based workflows with optional AI steps; Paperclip suits coordinating several agents with budgets and approvals. We recommend a platform after discovery.</p>'
             '<p><strong>Where are the agents hosted?</strong><br/>On infrastructure you control, such as your own server, cloud account or n8n Cloud account. Hosting is scoped and billed separately.</p>')
FAQ = EXTRA_FAQ + C.FAQ
TPL = C.TPL
hid = lambda: '%07x' % random.getrandbits(28)
def build():
    d = copy.deepcopy(TPL)
    def walk(es):
        keep = []
        for e in es:
            s = e.get('settings', {}); i = e.get('id')
            if i == '526a9100': continue
            if i == '5236cc5c': s['title'] = HEADING
            if i == '5bf474db': s['editor'] = f'<p>{INTRO}</p>'
            if i == '21ca04a4': s['editor'] = f'<p>{SCOPE}</p>'
            if i == '118ec289': s['list'] = [{'title': '', 'content': x, '_id': hid()} for x in INCLUDED]
            if i == '9a22fc5':
                b = s['tabs'][0]; s['tabs'] = [dict(b, tab_title=t, tab_content=c, _id=hid()) for t, c in
                    [('Offerings', OFFERINGS), ('Use Cases', USE_CASES), ('How We Deliver', C.DELIVER), ('FAQs', FAQ), ('Costs & Scope', C.COSTS.replace('https://worxforu.com/?page_id=24&service-interest=AI+Agent+Setup+%26+Managed+Automation', 'https://worxforu.com/contact/?service-interest=AI+Agent+Setup+%26+Managed+Automation'))]]
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
txt = lambda h: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()
faqs = [(txt(q), txt(a)) for q, a in re.findall(r'<strong>(.*?)</strong><br/>(.*?)</p>', FAQ)]
LD = {'@context': 'https://schema.org', '@graph': [
  {'@type': 'Service', 'name': 'AI Agent Setup & Managed Automation', 'serviceType': 'AI agent setup and workflow automation',
   'description': txt(INTRO), 'provider': {'@id': 'https://worxforu.com/#organization'}, 'brand': {'@type': 'Brand', 'name': 'Worxforu'},
   'areaServed': {'@type': 'Country', 'name': 'India'},
   'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'AI agent and automation services', 'itemListElement': [
       {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': n}} for n in ['OpenClaw setup', 'Hermes Agent installation', 'n8n workflow automation', 'Paperclip setup', 'Managed AI automation support']]},
   'availableChannel': {'@type': 'ServiceChannel', 'serviceUrl': 'https://worxforu.com/contact/', 'servicePhone': '+91 80562 91930', 'availableLanguage': 'English'}},
  {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]}]}
data = build(); body = txt(json.dumps(data, ensure_ascii=False))
visible = ' '.join(txt(x) for x in [HEADING, INTRO, SCOPE, ' '.join(INCLUDED), OFFERINGS, USE_CASES, C.DELIVER, FAQ, C.COSTS])
print('meta title', len(TITLE_SEO), TITLE_SEO); print('meta desc', len(DESC_SEO), DESC_SEO)
print('visible words ~', len(visible.split()), '| FAQs', len(faqs), '| tabs: Offerings, Use Cases, How We Deliver, FAQs, Costs & Scope')
for kw in ['AI agent setup', 'OpenClaw', 'Hermes Agent', 'n8n workflow automation', 'Paperclip', 'managed AI automation', 'self-hosted AI agents']:
    print(f'  kw {kw!r}: {visible.lower().count(kw.lower())}')
bad = [w for w in ['forex', 'mt4', 'mt5', 'prop firm', 'infyst', 'one-minute', 'guarantee', 'lorem', 'pennsylvania'] if w in (visible + body).lower()]
print('banned/demo:', bad or 'none')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})['stdout']
json.dump(json.loads(cli(f'post meta get {PID} _elementor_data')), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backup', 'service-4995-before-seo.json'), 'w'))
print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': PID, 'post_type': 'service', 'data': data})['warnings'])
print(cli(f"post meta update {PID} service_except 'Self-hosted AI agent setup for OpenClaw, Hermes Agent and Paperclip, plus n8n workflow automation and managed support.'")[:40])
print(req('POST', '/aioseo/v1/post', {'id': PID, 'title': TITLE_SEO, 'description': DESC_SEO, 'og_title': TITLE_SEO, 'og_description': DESC_SEO,
      'schema': {'blockGraphs': [], 'graphs': [], 'customGraphs': [{'id': '#aioseo-worxforu', 'label': 'Worxforu', 'schema': json.dumps(LD, ensure_ascii=False)}]}}))
print(cli('cache purge')[:40])
