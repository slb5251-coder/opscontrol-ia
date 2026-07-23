from pathlib import Path
import re

source_path = Path("js/app.js")
source = source_path.read_text(encoding="utf-8")
lines = source.splitlines()


def matching_brace(text: str, start: int) -> int:
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ('"', "'", "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError("Unbalanced function body")


functions = []
pattern = re.compile(r"(^|\n)  (async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{")
for match in pattern.finditer(source):
    open_brace = source.find("{", match.start())
    close_brace = matching_brace(source, open_brace)
    start_line = source.count("\n", 0, match.start()) + 1
    end_line = source.count("\n", 0, close_brace) + 1
    body = source[open_brace + 1:close_brace]
    functions.append({
        "name": match.group(3),
        "async": bool(match.group(2)),
        "args": match.group(4).strip(),
        "start": start_line,
        "end": end_line,
        "body": body,
        "full": source[match.start() + (1 if match.group(1) else 0):close_brace + 1],
    })

names = {item["name"] for item in functions}
auth_terms = re.compile(r"auth|login|logout|session|password|credential|remember|supabase|client|recovery", re.I)
selected = []
for item in functions:
    direct = bool(auth_terms.search(item["name"]))
    body_hit = bool(re.search(
        r"\.auth\.|signInWithPassword|signOut|getSession|onAuthStateChange|resetPasswordForEmail|updateUser\(\{\s*password|createClient\(",
        item["body"],
    ))
    if direct or body_hit:
        calls = sorted(
            name for name in names
            if name != item["name"] and re.search(rf"\b{re.escape(name)}\s*\(", item["body"])
        )
        selected.append({**item, "calls": calls})

references = []
for idx, line in enumerate(lines, start=1):
    if re.search(
        r"\.auth\.|signInWithPassword|signOut|getSession|onAuthStateChange|resetPasswordForEmail|updateUser\(\{\s*password|createClient\(|REMEMBER_LOGIN_KEY|APP_ENV_KEY",
        line,
    ):
        references.append((idx, line.strip()))

report = [
    "# Mapa de autenticação e sessão",
    "",
    "Gerado automaticamente a partir de `js/app.js`. Este arquivo é temporário e serve para planejar uma extração segura.",
    "",
    f"- Funções totais encontradas: **{len(functions)}**",
    f"- Funções relacionadas a autenticação/configuração: **{len(selected)}**",
    f"- Referências diretas encontradas: **{len(references)}**",
    "",
    "## Funções relacionadas",
    "",
]
for item in selected:
    dependency_text = ", ".join(f"`{name}`" for name in item["calls"]) or "nenhuma"
    report.extend([
        f"### `{item['name']}({item['args']})`",
        "",
        f"- Linhas: `{item['start']}-{item['end']}`",
        f"- Assíncrona: `{'sim' if item['async'] else 'não'}`",
        f"- Dependências internas chamadas: {dependency_text}",
        "",
        "```js",
        item["full"],
        "```",
        "",
    ])

report.extend(["## Referências diretas fora das funções selecionadas", ""])
for line_no, text in references:
    safe_text = text.replace("`", "\\`")
    report.append(f"- Linha `{line_no}`: `{safe_text}`")

Path("docs/AUTH_EXTRACTION_REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
print(f"Relatório gerado com {len(selected)} funções e {len(references)} referências.")
