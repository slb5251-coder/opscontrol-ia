from pathlib import Path
import re

path = Path("js/app.js")
text = path.read_text(encoding="utf-8")

if "window.OpsControlCore" in text and "const UI_ICONS =" not in text:
    print("app-core já extraído")
    raise SystemExit(0)

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

path.write_text(text, encoding="utf-8")
print("app-core extraído com sucesso")
