from pathlib import Path
import json


def replace(path, old, new, label):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Trecho não localizado em {path}: {label}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace(
    'index.html',
    '  <link rel="stylesheet" href="figma-interface.css?v=20260722-security-1">\n',
    '  <link rel="stylesheet" href="figma-interface.css?v=20260722-security-1">\n  <link rel="stylesheet" href="visual-system-v3.css?v=20260723-visual-system-v3-1">\n',
    'CSS visual global'
)
replace(
    'index.html',
    '  <script src="js/ui-polish.js?v=20260722-security-1"></script>\n',
    '  <script src="js/ui-polish.js?v=20260722-security-1"></script>\n  <script src="js/visual-system-v3.js?v=20260723-visual-system-v3-1"></script>\n',
    'JS visual global'
)

replace('sw.js', 'const CACHE = "opscontrol-20260723-data-layer-1";', 'const CACHE = "opscontrol-20260723-visual-system-v3-1";', 'versão do cache')
replace(
    'sw.js',
    '  "./figma-interface.css?v=20260722-security-1",\n',
    '  "./figma-interface.css?v=20260722-security-1",\n  "./visual-system-v3.css?v=20260723-visual-system-v3-1",\n',
    'CSS no PWA'
)
replace(
    'sw.js',
    '  "./js/ui-polish.js?v=20260722-deferred-dependencies-1",\n',
    '  "./js/ui-polish.js?v=20260722-deferred-dependencies-1",\n  "./js/visual-system-v3.js?v=20260723-visual-system-v3-1",\n',
    'JS no PWA'
)

package_path = Path('package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
scripts = package.setdefault('scripts', {})
if 'test:visual-system' not in scripts:
    scripts['test'] = scripts['test'].replace('npm run test:responsive &&', 'npm run test:responsive && npm run test:visual-system &&')
    scripts['test:visual-system'] = 'node tests/visual-system.spec.mjs'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

workflow = Path('.github/workflows/validate-interface.yml')
text = workflow.read_text(encoding='utf-8')
text = text.replace(
    '      - name: Run responsive tests\n        run: npm run test:responsive\n',
    '      - name: Run responsive tests\n        run: npm run test:responsive\n\n      - name: Run visual system tests\n        run: npm run test:visual-system\n',
    1
)
text = text.replace(
    "            Path('js/app-core.js'), Path('js/app-auth.js'), Path('js/app-data.js'),\n",
    "            Path('js/app-core.js'), Path('js/app-auth.js'), Path('js/app-data.js'), Path('js/visual-system-v3.js'),\n            Path('visual-system-v3.css'),\n",
    1
)
text = text.replace(
    "            Path('tests/app-core.spec.mjs'), Path('tests/auth-session.spec.mjs'), Path('tests/data-layer.spec.mjs'),\n",
    "            Path('tests/app-core.spec.mjs'), Path('tests/auth-session.spec.mjs'), Path('tests/data-layer.spec.mjs'),\n            Path('tests/visual-system.spec.mjs'),\n",
    1
)
text = text.replace(
    "          for token in ['CORE_FILES', 'cacheFirst', 'networkFirst', 'app-core.js', 'app-auth.js', 'app-data.js', 'data-layer-1']:\n",
    "          for token in ['CORE_FILES', 'cacheFirst', 'networkFirst', 'app-core.js', 'app-auth.js', 'app-data.js', 'data-layer-1', 'visual-system-v3.css', 'visual-system-v3.js']:\n",
    1
)
text = text.replace(
    "          core_index = index_html.find('js/app-core.js')\n",
    "          if 'visual-system-v3.css' not in index_html or 'visual-system-v3.js' not in index_html:\n            errors.append('Global visual system is not connected to index.html')\n\n          visual_css = Path('visual-system-v3.css').read_text(encoding='utf-8')\n          visual_js = Path('js/visual-system-v3.js').read_text(encoding='utf-8')\n          for token in ['visual-v3', 'visual-vessel-gauge', 'tv-control-room', 'prefers-reduced-motion']:\n            if token not in visual_css:\n              errors.append(f'Missing visual system CSS token: {token}')\n          for token in ['window.OpsControlVisual', 'addLoginScene', 'enhanceTankCard', 'IntersectionObserver']:\n            if token not in visual_js:\n              errors.append(f'Missing visual system JS token: {token}')\n\n          core_index = index_html.find('js/app-core.js')\n",
    1
)
workflow.write_text(text, encoding='utf-8')

print('Sistema visual V3 integrado ao HTML, PWA, testes e CI.')
