"""Replace the Slider Revolution widget on the homepage with a native Elementor hero (same image, same layout).
The slider itself is untouched and can be restored by putting widget 19d7353 back (see backup/page-9-elementor.json)."""
import json, os, sys, copy, base64, urllib.request
A = open(os.environ['WP_AUTH_FILE']).read().strip()
H = {'Authorization': 'Basic ' + base64.b64encode(A.encode()).decode(), 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
def req(m, r, b=None):
    rq = urllib.request.Request('https://worxforu.com/?rest_route=' + r, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read() or 'null')
cli = lambda c: req('POST', '/wpvibe/v1/cli/run', {'command': c})
PX = lambda n: {'unit': 'px', 'size': n, 'sizes': []}
DIM = lambda t, r, b, l: {'unit': 'px', 'top': str(t), 'right': str(r), 'bottom': str(b), 'left': str(l), 'isLinked': False}
HERO = {'id': 'a1b2c3d4', 'elType': 'section', 'isInner': True, 'settings': {
          'background_background': 'classic', 'background_image': {'url': 'https://worxforu.com/wp-content/uploads/2020/04/bg-slider1.jpg', 'id': 4402},
          'background_position': 'center center', 'background_size': 'cover', 'background_repeat': 'no-repeat',
          'height_inner': 'min-height', 'custom_height_inner': PX(640), 'custom_height_inner_tablet': PX(520), 'custom_height_inner_mobile': PX(460),
          'content_position': 'middle', 'padding': DIM(60, 20, 110, 20)},
        'elements': [{'id': 'a1b2c3d5', 'elType': 'column', 'isInner': True, 'settings': {'_column_size': 100, 'content_position': 'center', 'align': 'center'}, 'elements': [
          {'id': 'a1b2c3d6', 'elType': 'widget', 'widgetType': 'heading', 'settings': {
              'title': 'Smarter Systems<br>for Your Business.', 'header_size': 'h1', 'align': 'center', 'title_color': '#ffffff',
              'typography_typography': 'custom', 'typography_font_family': 'Poppins', 'typography_font_weight': '700',
              'typography_font_size': PX(80), 'typography_font_size_tablet': PX(56), 'typography_font_size_mobile': PX(36),
              'typography_line_height': {'unit': 'em', 'size': 1.1, 'sizes': []},
              'text_shadow_text_shadow_type': 'yes', 'text_shadow_text_shadow': {'horizontal': 0, 'vertical': 4, 'blur': 12, 'color': 'rgba(0,0,0,0.25)'},
              '_margin': DIM(0, 0, 24, 0)}, 'elements': []},
          {'id': 'a1b2c3d7', 'elType': 'widget', 'widgetType': 'text-editor', 'settings': {
              'editor': '<p>AI solutions, ERP and CRM software, business automation and custom applications built around the way you work.</p>',
              'align': 'center', 'text_color': '#ffffff', 'typography_typography': 'custom', 'typography_font_family': 'Roboto',
              'typography_font_size': PX(20), 'typography_font_size_mobile': PX(16), 'typography_line_height': {'unit': 'em', 'size': 1.6, 'sizes': []},
              '_element_width': 'initial', '_element_custom_width': {'unit': 'px', 'size': 560}, '_element_custom_width_mobile': {'unit': '%', 'size': 100},
              '_margin': DIM(0, 0, 36, 0)}, 'elements': []},
          {'id': 'a1b2c3d8', 'elType': 'widget', 'widgetType': 'button', 'settings': {
              'text': 'Discuss Your Project', 'link': {'url': 'https://worxforu.com/?page_id=24', 'is_external': '', 'nofollow': ''}, 'align': 'center',
              'selected_icon': {'value': 'fas fa-cog', 'library': 'fa-solid'}, 'icon_align': 'left', 'icon_indent': PX(12),
              'background_color': '#190200', 'button_text_color': '#ffffff', 'hover_color': '#ffffff', 'button_background_hover_color': '#ff0000',
              'typography_typography': 'custom', 'typography_font_family': 'Poppins', 'typography_font_weight': '600', 'typography_font_size': PX(18),
              'text_padding': DIM(24, 44, 24, 44), 'border_radius': DIM(0, 0, 0, 0)}, 'elements': []},
        ]}]}
data = json.load(open(os.path.join(os.path.dirname(__file__), 'page-9-new.json')))   # phase-1 homepage (already live)
live = json.loads(cli('post meta get 9 _elementor_data')['stdout']) if '--apply' in sys.argv else data
col = live[0]['elements'][0]['elements']
assert col[0]['id'] == '19d7353' and col[0]['widgetType'] == 'slider_revolution', 'unexpected first widget'
col[0] = HERO
print('replace [19d7353] slider_revolution -> native hero section: H1 "Smarter Systems for Your Business.", subtitle, button "Discuss Your Project" -> Contact; bg bg-slider1.jpg; keeps [17bc732] ct_angle divider')
if '--apply' not in sys.argv: print('DRY RUN'); sys.exit()
print(req('POST', '/wpvibe/v1/elementor/save-page', {'id': 9, 'data': live}))
print(cli('cache purge')['stdout'][:80])
