from pathlib import Path
import re

source = Path("js/app.js").read_text(encoding="utf-8")
lines = source.splitlines()

function_pattern = re.compile(r"^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(")
auth_name_pattern = re.compile(r"auth|login|logout|session|password|credential|remember|recovery|client", re.I)
auth_reference_pattern = re.compile(
    r"\.auth\.|signInWithPassword|signOut|getSession|onAuthStateChange|resetPasswordForEmail|"
    r"updateUser\(\{\s*password|createClient\(|REMEMBER_LOGIN_KEY|APP_ENV_KEY|CONFIG_KEY"
)

functions = []
references = []
for line_number, line in enumerate(lines, start=1):
    match = function_pattern.search(line)
    if match and auth_name_pattern.search(match.group(1)):
        functions.append((line_number, match.group(1), line.strip()))
    if auth_reference_pattern.search(line):
        references.append((line_number, line.strip()))

report = [
    "# Índice de autenticação e sessão",
    "",
    "Relatório temporário baseado somente em linhas e nomes. Não tenta interpretar blocos JavaScript.",
    "",
    f"- Funções com nome relacionado: **{len(functions)}**",
    f"- Referências diretas: **{len(references)}**",
    "",
    "## Funções",
    "",
]
for line_number, name, declaration in functions:
    safe = declaration.replace("`", "\\`")
    report.append(f"- Linha `{line_number}` — `{name}`: `{safe}`")

report.extend(["", "## Referências diretas", ""])
for line_number, text in references:
    safe = text.replace("`", "\\`")
    report.append(f"- Linha `{line_number}`: `{safe}`")

Path("docs/AUTH_EXTRACTION_REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
print(f"Índice gerado com {len(functions)} funções e {len(references)} referências.")
