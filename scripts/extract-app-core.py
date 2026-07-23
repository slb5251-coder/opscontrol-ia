from pathlib import Path
import json
import re

app_path = Path("js/app.js")
text = app_path.read_text(encoding="utf-8")

if not ("window.OpsControlCore" in text and "const UI_ICONS =" not in text):
    replacement = '''  if (!window.OpsControlCore) {
    throw new Error("OpsControlCore não foi carregado antes do aplicativo.");
  }

  const {
    esc,
    userInitials,
    profileAvatarHtml,
    uiIcon,
    uid,
    dateOnly,
    dateTime,
    toLocalInput,
    daysUntil,
    localDateKey,
    recordDateKey,
    addDaysToDateKey,
    normalizedAlertLevel,
    isCriticalAlert,
    latestTimestamp,
    normalizeSearch,
    MOBILE_PAGE_META,
    DESKTOP_PAGE_META
  } = window.OpsControlCore;

  function filterIsActive() {'''

    helpers = re.compile(
        r'^  function esc\(value = ""\) \{.*?^  function filterIsActive\(\) \{',
        re.MULTILINE | re.DOTALL,
    )
    text, helper_count = helpers.subn(replacement, text, count=1)
    if helper_count != 1:
        raise SystemExit(f"Bloco de utilitários não localizado: {helper_count}")

    page_meta = re.compile(
        r'^  const MOBILE_PAGE_META = \{.*?^  function isMobileViewport\(\) \{',
        re.MULTILINE | re.DOTALL,
    )
    text, meta_count = page_meta.subn('  function isMobileViewport() {', text, count=1)
    if meta_count != 1:
        raise SystemExit(f"Metadados de página não localizados: {meta_count}")

    normalize_block = '''  function normalizeSearch(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

'''
    if normalize_block not in text:
        raise SystemExit("Função normalizeSearch não localizada")
    text = text.replace(normalize_block, "", 1)

text = text.replace('const APP_VERSION = "20260722-security-1";', 'const APP_VERSION = "20260723-app-core-1";', 1)

for forbidden in ["const UI_ICONS =", "function userInitials(", "function normalizeSearch(", "const MOBILE_PAGE_META ="]:
    if forbidden in text:
        raise SystemExit(f"Símbolo duplicado permaneceu no app.js: {forbidden}")
app_path.write_text(text, encoding="utf-8")

index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")
old_scripts = '''  <script src="js/config.js?v=20260722-security-1"></script>
  <script src="vendor/qrcode.js?v=20260722-security-1"></script>
  <script src="js/app.js?v=20260722-security-1"></script>
'''
new_scripts = '''  <script src="js/config.js?v=20260722-security-1"></script>
  <script src="vendor/qrcode.js?v=20260722-security-1"></script>
  <script src="js/app-core.js?v=20260723-app-core-1"></script>
  <script src="js/app.js?v=20260723-app-core-1"></script>
'''
if old_scripts in index:
    index = index.replace(old_scripts, new_scripts, 1)
elif new_scripts not in index:
    raise SystemExit("Bloco de scripts do index.html não localizado")
index_path.write_text(index, encoding="utf-8")

sw_path = Path("sw.js")
sw = sw_path.read_text(encoding="utf-8")
sw = sw.replace('const CACHE = "opscontrol-20260722-deferred-dependencies-1";', 'const CACHE = "opscontrol-20260723-app-core-1";', 1)
old_app = '  "./js/app.js?v=20260722-security-1",\n'
new_app = '  "./js/app-core.js?v=20260723-app-core-1",\n  "./js/app.js?v=20260723-app-core-1",\n'
if old_app in sw:
    sw = sw.replace(old_app, new_app, 1)
elif new_app not in sw:
    raise SystemExit("Entrada do app.js no service worker não localizada")
sw_path.write_text(sw, encoding="utf-8")

package_path = Path("package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
scripts = package.setdefault("scripts", {})
if "test:app-core" not in scripts:
    scripts["test"] = scripts["test"].replace("npm run test:performance-loader &&", "npm run test:performance-loader && npm run test:app-core &&")
    scripts["test:app-core"] = "node tests/app-core.spec.mjs"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("app-core conectado ao aplicativo, PWA e testes")
