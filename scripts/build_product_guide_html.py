"""Create a print-ready HTML companion from the numbered Markdown docs."""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUTPUT = DOCS / "exports" / "AI-Tutor-Product-and-Architecture-Guide.html"
SOURCES = [DOCS / f"{number:02d}-{name}.md" for number, name in [
    (1, "product-and-principles"), (2, "user-experience"),
    (3, "capabilities-and-content"), (4, "learning-and-knowledge"),
    (5, "ai-and-assessment"), (6, "architecture-v1"),
    (7, "contracts-data-and-events"), (8, "speaking-slice-current-state"),
    (9, "roadmap"), (10, "operations-and-quality"), (11, "glossary"),
]]


def inline(value: str) -> str:
    escaped = html.escape(value)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    return escaped


def parse_table(lines):
    rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
            continue
        rows.append(cells)
    return rows


def render_markdown(content: str) -> str:
    lines, result, index, in_code, code = content.splitlines(), [], 0, False, []
    while index < len(lines):
        line, stripped = lines[index], lines[index].strip()
        if stripped.startswith("```"):
            if in_code:
                result.append(f"<pre><code>{html.escape(chr(10).join(code))}</code></pre>")
                code = []
            in_code = not in_code
            index += 1
            continue
        if in_code:
            code.append(line)
            index += 1
            continue
        if not stripped:
            index += 1
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            result.append(f"<h{level}>{inline(heading.group(2))}</h{level}>")
            index += 1
            continue
        if stripped.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            rows = parse_table(table_lines)
            if rows:
                head = "".join(f"<th>{inline(cell)}</th>" for cell in rows[0])
                body = "".join("<tr>" + "".join(f"<td>{inline(cell)}</td>" for cell in row) + "</tr>" for row in rows[1:])
                result.append(f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>")
            continue
        if re.match(r"^-\s+", stripped):
            items = []
            while index < len(lines) and re.match(r"^-\s+", lines[index].strip()):
                items.append(re.sub(r"^-\s+", "", lines[index].strip()))
                index += 1
            result.append("<ul>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[index].strip()))
                index += 1
            result.append("<ol>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ol>")
            continue
        paragraph = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate or candidate.startswith(("#", "|", "```")) or re.match(r"^(?:-|\d+\.)\s+", candidate):
                break
            paragraph.append(candidate)
            index += 1
        result.append(f"<p>{inline(' '.join(paragraph))}</p>")
    return "\n".join(result)


def main():
    body = "\n".join(render_markdown(path.read_text(encoding="utf-8")) for path in SOURCES)
    document = f"""<!doctype html>
<html><head><meta charset=\"utf-8\"><title>AI Tutor Product & Architecture Guide</title>
<style>
@page {{ size: A4; margin: 18mm 17mm 18mm; }}
body {{ font-family: Arial, sans-serif; color:#0B2545; font-size:10.5pt; line-height:1.45; }}
.cover {{ height:245mm; display:flex; flex-direction:column; justify-content:center; text-align:center; page-break-after:always; }}
.kicker {{ color:#2E74B5; font-size:10pt; font-weight:700; letter-spacing:1.3px; }}
.title {{ font-size:34pt; margin:14px 0 6px; }} .subtitle {{ color:#5B6470; font-size:16pt; margin:0; }}
.cover p:last-child {{ margin-top:34px; color:#5B6470; font-size:9.5pt; }}
h1 {{ color:#2E74B5; font-size:18pt; margin:28px 0 10px; page-break-after:avoid; }}
h2 {{ color:#2E74B5; font-size:14pt; margin:20px 0 7px; page-break-after:avoid; }}
h3 {{ color:#1F4D78; font-size:12pt; margin:14px 0 5px; page-break-after:avoid; }}
p {{ margin:0 0 8px; }} ul,ol {{ margin:5px 0 9px 20px; padding-left:16px; }} li {{ margin-bottom:4px; }}
table {{ width:100%; border-collapse:collapse; margin:10px 0 14px; font-size:9.2pt; page-break-inside:auto; }}
thead {{ display:table-header-group; }} tr {{ page-break-inside:avoid; }} th {{ background:#E8EEF5; }} th,td {{ border:1px solid #C9D4E0; padding:6px 7px; text-align:left; vertical-align:top; }}
pre {{ background:#F2F4F7; border-left:3px solid #2E74B5; padding:9px 11px; white-space:pre-wrap; font-size:8.6pt; line-height:1.35; }}
code {{ font-family:Consolas,monospace; font-size:.92em; }}
</style></head><body>
<section class=\"cover\"><div class=\"kicker\">PRODUCT & ARCHITECTURE GUIDE</div><h1 class=\"title\">AI Tutor</h1><p class=\"subtitle\">Learning platform foundation, product flows and Architecture V1.0</p><p>A practical guide to what the product is building, how a learner moves through it, and what is implemented today.</p><p>Source of truth: numbered Markdown files in /docs</p></section>
{body}
</body></html>"""
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(document, encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
