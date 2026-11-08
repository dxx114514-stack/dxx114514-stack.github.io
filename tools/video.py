#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快捷添加视频页面到 docs/index.html 的“视频文件”板块，支持 Markdown。

用法：
  python tools/video.py                     # 交互式添加
  python tools/video.py add "标题"           # 交互式添加（创建本地页面）
  python tools/video.py add "标题" -m 内容.md
  python tools/video.py add "标题" -u https://example.com -d "**简介**"
  python tools/video.py list                # 查看已有条目
  python tools/video.py remove 1            # 按序号删除
  python tools/video.py rebuild             # 按 tools/videos.json 重新生成板块

数据保存在 tools/videos.json，页面 Markdown 保存在 docs/P{n}/index.md。
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
INDEX = DOCS / "index.html"
DATA = ROOT / "tools" / "videos.json"
PNUM = ROOT / "pnum.txt"

START = "<!-- video:start -->"
END = "<!-- video:end -->"


# --------------------------------------------------------------------------
# 终端输出
# --------------------------------------------------------------------------

def setup_console():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def say(msg=""):
    print(msg)


def fail(msg):
    print("错误：" + msg, file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------
# Markdown 渲染（无第三方依赖）
# --------------------------------------------------------------------------

def _escape(text):
    return html.escape(text, quote=False)


def safe_url(url):
    """校验并转义链接，拒绝 javascript: 等危险协议。"""
    url = url.strip()
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*:", url):
        if not re.match(r"^(https?|mailto):", url, re.I):
            raise ValueError("不支持的链接协议：" + url)
    return html.escape(url, quote=True)


_BLOCK_START = re.compile(
    r"^\s*(?:"
    r"#{1,6}\s|"
    r"```|"
    r">\s?|"
    r"[-*+]\s+|"
    r"\d+[.)]\s+|"
    r"(?:[-*_]\s*){3,}$|"
    r"\|.*\|\s*$"
    r")"
)


def render_inline(text, breaks=True):
    """渲染行内 Markdown：代码、链接、图片、粗体、斜体、删除线。"""
    stash = []

    def keep(fragment):
        stash.append(fragment)
        return "\x00%d\x00" % (len(stash) - 1)

    # 行内代码先占位，避免内部符号被当成 Markdown
    text = re.sub(
        r"`([^`\n]+)`",
        lambda m: keep("<code>" + _escape(m.group(1)) + "</code>"),
        text,
    )

    # 自动链接 <https://...>
    text = re.sub(
        r"<((?:https?|mailto):[^>\s]+)>",
        lambda m: keep(
            '<a href="%s">%s</a>' % (safe_url(m.group(1)), _escape(m.group(1)))
        ),
        text,
    )

    # 图片
    text = re.sub(
        r"!\[([^\]]*)\]\(([^)\s]+)\)",
        lambda m: keep(
            '<img src="%s" alt="%s" loading="lazy">'
            % (safe_url(m.group(2)), html.escape(m.group(1), quote=True))
        ),
        text,
    )

    # 链接
    text = re.sub(
        r"\[([^\]]+)\]\(([^)\s]+)\)",
        lambda m: keep(
            '<a href="%s">%s</a>' % (safe_url(m.group(2)), _escape(m.group(1)))
        ),
        text,
    )

    # 剩余文本转义，再处理强调
    text = _escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\w)__(.+?)__(?!\w)", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"(?<!\w)_([^_\n]+)_(?!\w)", r"<em>\1</em>", text)
    text = re.sub(r"~~(.+?)~~", r"<del>\1</del>", text)

    if breaks:
        text = text.replace("\n", "<br>\n")

    for i, fragment in enumerate(stash):
        text = text.replace("\x00%d\x00" % i, fragment)
    return text


def _split_row(row):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    return [cell.strip() for cell in row.split("|")]


def _render_table(lines, i):
    header = _split_row(lines[i])
    aligns = []
    for cell in _split_row(lines[i + 1]):
        cell = cell.strip()
        if cell.startswith(":") and cell.endswith(":"):
            aligns.append("center")
        elif cell.endswith(":"):
            aligns.append("right")
        elif cell.startswith(":"):
            aligns.append("left")
        else:
            aligns.append("")
    i += 2
    rows = []
    while i < len(lines) and lines[i].strip() and "|" in lines[i]:
        rows.append(_split_row(lines[i]))
        i += 1

    def style(k):
        align = aligns[k] if k < len(aligns) else ""
        return ' style="text-align:%s"' % align if align else ""

    out = ["<table>", "<thead><tr>"]
    for k, cell in enumerate(header):
        out.append("<th%s>%s</th>" % (style(k), render_inline(cell, breaks=False)))
    out.append("</tr></thead><tbody>")
    for row in rows:
        out.append("<tr>")
        for k in range(len(header)):
            cell = row[k] if k < len(row) else ""
            out.append("<td%s>%s</td>" % (style(k), render_inline(cell, breaks=False)))
        out.append("</tr>")
    out.append("</tbody></table>")
    return "\n".join(out), i


def render_markdown(text):
    """渲染块级 Markdown：标题、段落、列表、引用、代码块、表格、分隔线。"""
    text = (text or "").lstrip("\ufeff")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    out = []
    i, n = 0, len(lines)

    while i < n:
        line = lines[i]

        # 代码块
        m = re.match(r"^```\s*([\w+#.-]*)\s*$", line)
        if m:
            lang = m.group(1)
            i += 1
            buf = []
            while i < n and not re.match(r"^```\s*$", lines[i]):
                buf.append(lines[i])
                i += 1
            i += 1
            cls = ' class="language-%s"' % lang if lang else ""
            out.append("<pre><code%s>%s</code></pre>" % (cls, _escape("\n".join(buf))))
            continue

        # 标题
        m = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if m:
            level = len(m.group(1))
            out.append(
                "<h%d>%s</h%d>" % (level, render_inline(m.group(2), breaks=False), level)
            )
            i += 1
            continue

        # 分隔线
        if re.match(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$", line):
            out.append("<hr>")
            i += 1
            continue

        # 引用
        if re.match(r"^\s*>\s?", line):
            buf = []
            while i < n and re.match(r"^\s*>\s?", lines[i]):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + render_markdown("\n".join(buf)) + "</blockquote>")
            continue

        # 表格
        if (
            "|" in line
            and i + 1 < n
            and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", lines[i + 1])
            and "-" in lines[i + 1]
        ):
            table, i = _render_table(lines, i)
            out.append(table)
            continue

        # 无序列表
        if re.match(r"^\s*[-*+]\s+", line):
            items = []
            while i < n and re.match(r"^\s*[-*+]\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*+]\s+", "", lines[i]))
                i += 1
            out.append(
                "<ul>" + "".join("<li>%s</li>" % render_inline(x) for x in items) + "</ul>"
            )
            continue

        # 有序列表
        if re.match(r"^\s*\d+[.)]\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+[.)]\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+[.)]\s+", "", lines[i]))
                i += 1
            out.append(
                "<ol>" + "".join("<li>%s</li>" % render_inline(x) for x in items) + "</ol>"
            )
            continue

        # 空行
        if not line.strip():
            i += 1
            continue

        # 段落
        buf = [line]
        i += 1
        while i < n and lines[i].strip() and not _BLOCK_START.match(lines[i]):
            buf.append(lines[i])
            i += 1
        out.append("<p>" + render_inline("\n".join(buf)) + "</p>")

    return "\n".join(out)


# --------------------------------------------------------------------------
# 页面模板
# --------------------------------------------------------------------------

PAGE_CSS = """
  :root {
    --bg: #f4f6fb;
    --surface: #ffffff;
    --text: #172033;
    --muted: #616b80;
    --border: #e2e8f2;
    --accent: #3b6ef6;
    --accent-soft: rgba(59, 110, 246, .1);
    --code-bg: rgba(59, 110, 246, .08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0c1018;
      --surface: #141b26;
      --text: #e7ecf6;
      --muted: #98a4ba;
      --border: #232c3c;
      --accent: #6f9bff;
      --accent-soft: rgba(111, 155, 255, .14);
      --code-bg: rgba(111, 155, 255, .12);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 20px 80px;
    background:
      radial-gradient(900px 420px at 12% -8%, var(--accent-soft), transparent 70%),
      var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 820px; margin: 0 auto; }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 28px 0 8px;
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
  }
  .back:hover { color: var(--accent); }
  article {
    margin-top: 16px;
    padding: clamp(22px, 4vw, 44px);
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(16, 24, 40, .05), 0 14px 40px rgba(16, 24, 40, .07);
  }
  article h1 {
    margin: 0 0 .6em;
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.25;
    letter-spacing: -.02em;
  }
  article h2 {
    margin: 1.8em 0 .6em;
    padding-bottom: .3em;
    font-size: 1.35em;
    border-bottom: 1px solid var(--border);
  }
  article h3 { margin: 1.5em 0 .5em; font-size: 1.15em; }
  article h4, article h5, article h6 { margin: 1.2em 0 .4em; font-size: 1em; }
  article p { margin: 0 0 1em; }
  article a { color: var(--accent); text-decoration: none; }
  article a:hover { text-decoration: underline; }
  article img { max-width: 100%; height: auto; border-radius: 10px; }
  article code {
    padding: .15em .4em;
    border-radius: 5px;
    background: var(--code-bg);
    font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    font-size: .9em;
  }
  article pre {
    margin: 0 0 1em;
    padding: 14px 16px;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--code-bg);
  }
  article pre code { padding: 0; background: none; font-size: .88em; line-height: 1.6; }
  article blockquote {
    margin: 0 0 1em;
    padding: .2em 1em;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }
  article ul, article ol { margin: 0 0 1em; padding-left: 1.4em; }
  article li { margin: .25em 0; }
  article hr { margin: 2em 0; border: 0; border-top: 1px solid var(--border); }
  article table { width: 100%; margin: 0 0 1em; border-collapse: collapse; font-size: .94em; }
  article th, article td { padding: .5em .7em; border: 1px solid var(--border); text-align: left; }
  article th { background: var(--accent-soft); }
"""

PAGE_MATHJAX = """<script>
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
  }
};
</script>
<script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>"""

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@@TITLE@@ - DXX's HTML Programs</title>
<style>@@CSS@@</style>
@@MATHJAX@@
</head>
<body>
<div class="wrap">
  <a class="back" href="../index.html">← 返回首页</a>
  <article>
@@CONTENT@@
  </article>
</div>
</body>
</html>
"""


def render_page(title, md):
    md = (md or "").lstrip("\ufeff")
    content = render_markdown(md)
    if not re.match(r"^\s*#\s+", md or ""):
        content = "<h1>%s</h1>\n%s" % (html.escape(title), content)
    needs_math = "$" in (md or "") or "\\(" in (md or "") or "\\[" in (md or "")
    return (
        PAGE_TEMPLATE.replace("@@TITLE@@", html.escape(title))
        .replace("@@CSS@@", PAGE_CSS)
        .replace("@@MATHJAX@@", PAGE_MATHJAX if needs_math else "")
        .replace("@@CONTENT@@", content)
    )


def summarize(md, limit=90):
    """从 Markdown 里提取一段纯文本摘要，用于卡片描述。"""
    text = re.sub(r"```.*?```", " ", md or "", flags=re.S)
    text = re.sub(r"^\s*#{1,6}\s+.*$", "", text, count=1, flags=re.M)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"^\s{0,3}>\s?", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.M)
    text = re.sub(r"^\s*\d+[.)]\s+", "", text, flags=re.M)
    text = re.sub(r"[*_~]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[:limit].rstrip() + "…"
    return text


# --------------------------------------------------------------------------
# 数据读写
# --------------------------------------------------------------------------

def read_json():
    if not DATA.exists():
        return []
    try:
        data = json.loads(DATA.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        fail("tools/videos.json 格式错误：%s" % exc)
    return data if isinstance(data, list) else []


def write_json(entries):
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def read_index():
    with INDEX.open("r", encoding="utf-8", newline="") as fh:
        text = fh.read()
    nl = "\r\n" if "\r\n" in text else "\n"
    return text.replace("\r\n", "\n"), nl


def write_index(text, nl):
    with INDEX.open("w", encoding="utf-8", newline="") as fh:
        fh.write(text.replace("\n", nl))


def card_html(entry):
    url = safe_url(entry["url"])
    title = html.escape(entry["title"], quote=False)
    desc = (entry.get("desc") or "").strip()
    lines = [
        '        <div class="card">',
        '          <span class="card-title"><a class="card-link" href="%s">%s</a></span>'
        % (url, title),
    ]
    if desc:
        body = render_markdown(desc).replace("\n", "\n          ")
        lines.append('          <div class="card-desc md">%s</div>' % body)
    lines.append("        </div>")
    return "\n".join(lines)


def rebuild():
    text, nl = read_index()
    start = text.find(START)
    end = text.find(END)
    if start == -1 or end == -1 or end < start:
        fail("docs/index.html 里找不到 %s / %s 标记，请先补上。" % (START, END))

    entries = read_json()
    if entries:
        block = "\n".join(
            [START, '      <div class="grid">']
            + [card_html(e) for e in entries]
            + ["      </div>", "      " + END]
        )
    else:
        block = "\n".join(
            [START, '      <p class="empty">暂无视频</p>', "      " + END]
        )

    new_text = text[:start] + block + text[end + len(END):]
    if new_text != text:
        write_index(new_text, nl)
        say("已更新 docs/index.html（共 %d 个视频条目）" % len(entries))
    else:
        say("docs/index.html 无变化")


# --------------------------------------------------------------------------
# 页面创建
# --------------------------------------------------------------------------

def next_page_number():
    number = 0
    if PNUM.exists():
        try:
            number = int(PNUM.read_text(encoding="utf-8").strip() or 0)
        except ValueError:
            number = 0
    number += 1
    while (DOCS / ("P%d" % number)).exists():
        number += 1
    return number


def create_page(title, md):
    number = next_page_number()
    folder = DOCS / ("P%d" % number)
    folder.mkdir(parents=True, exist_ok=True)

    md = (md or "").strip()
    if not md:
        md = "# %s\n" % title
    (folder / "index.md").write_text(md + "\n", encoding="utf-8", newline="\n")
    (folder / "index.html").write_text(
        render_page(title, md), encoding="utf-8", newline="\n"
    )
    PNUM.write_text(str(number), encoding="utf-8", newline="\n")
    say("已创建页面：docs/P%d/index.html" % number)
    return "P%d" % number, "./P%d/index.html" % number


# --------------------------------------------------------------------------
# 交互输入
# --------------------------------------------------------------------------

def ask(prompt, default=""):
    suffix = "[%s]" % default if default else ""
    try:
        value = input(prompt + suffix + "：").strip()
    except EOFError:
        value = ""
    return value or default


def ask_multiline(prompt):
    say(prompt + "（逐行输入，单独一行 .end 结束）")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == ".end":
            break
        lines.append(line)
    return "\n".join(lines)


def read_md_file(path):
    if path == "-":
        return sys.stdin.read()
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    if not p.exists():
        fail("找不到文件：" + str(p))
    return p.read_text(encoding="utf-8-sig")


def normalize_url(url):
    url = url.strip()
    if not url:
        return ""
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*:", url):
        return url
    if url.startswith(("./", "../", "/", "#", "?", "//")):
        return url
    if "." in url.split("/")[0]:
        return "https://" + url
    return url


# --------------------------------------------------------------------------
# Git
# --------------------------------------------------------------------------

def git(args):
    return subprocess.run(args, cwd=str(ROOT)).returncode


def git_publish(paths, message):
    if git(["git", "add"] + paths) != 0:
        say("git add 失败")
        return
    if git(["git", "commit", "-m", message]) != 0:
        say("git commit 失败（可能没有改动）")
        return
    if git(["git", "push"]) == 0:
        say("已提交并推送")
    else:
        say("git push 失败，请检查网络或权限")


# --------------------------------------------------------------------------
# 命令
# --------------------------------------------------------------------------

def cmd_add(args):
    interactive = args.title is None
    title = args.title or ask("视频标题")
    if not title:
        fail("标题不能为空")

    url = normalize_url(args.url or "")
    if interactive and not url:
        url = normalize_url(ask("链接（留空 = 自动创建本地页面）"))
    if url:
        try:
            safe_url(url)
        except ValueError as exc:
            fail(str(exc))
    md = read_md_file(args.md) if args.md else None

    if not url:
        if md is None:
            if interactive:
                md = ask_multiline("页面 Markdown 内容")
            else:
                md = "# %s\n" % title
        page_name, url = create_page(title, md)
        desc = args.desc if args.desc is not None else summarize(md)
        created_paths = ["docs/" + page_name]
    else:
        created_paths = []
        desc = args.desc
        if desc is None and md is not None:
            desc = md
        if desc is None and interactive:
            desc = ask("卡片描述（Markdown，可留空）")
        if desc is None:
            desc = ""

    entry = {
        "title": title,
        "url": url,
        "desc": desc.strip(),
        "created": date.today().isoformat(),
    }

    entries = read_json()
    if args.first:
        entries.insert(0, entry)
    else:
        entries.append(entry)
    write_json(entries)
    rebuild()

    say("已添加：%s -> %s" % (title, url))
    say("如需修改描述，编辑 tools/videos.json 后运行：python tools/video.py rebuild")

    do_push = args.push
    if interactive and not do_push:
        do_push = ask("提交并推送？(y/N)", "N").lower() in ("y", "yes")
    if do_push:
        paths = ["docs/index.html", "tools/videos.json"]
        if PNUM.exists():
            paths.append("pnum.txt")
        paths += created_paths
        git_publish(paths, "add video: " + title)


def cmd_list(args):
    entries = read_json()
    if not entries:
        say("还没有视频条目。")
        return
    say("%-4s %-28s %-34s %s" % ("序号", "标题", "链接", "日期"))
    say("-" * 90)
    for i, entry in enumerate(entries, 1):
        say(
            "%-4d %-28s %-34s %s"
            % (
                i,
                entry.get("title", "")[:28],
                entry.get("url", "")[:34],
                entry.get("created", ""),
            )
        )


def cmd_remove(args):
    entries = read_json()
    if not entries:
        fail("还没有视频条目。")
    key = str(args.key).strip()
    index = None
    if key.isdigit() and 1 <= int(key) <= len(entries):
        index = int(key) - 1
    else:
        for i, entry in enumerate(entries):
            if key in (entry.get("url"), entry.get("title")):
                index = i
                break
    if index is None:
        fail("找不到条目：" + key)

    removed = entries.pop(index)
    write_json(entries)
    rebuild()
    say("已删除：%s (%s)" % (removed.get("title", ""), removed.get("url", "")))
    if re.match(r"^\./P\d+/", removed.get("url", "")):
        say("提示：对应的 docs/P… 页面文件仍然保留，可手动删除。")


def cmd_rebuild(args):
    rebuild()


def main():
    setup_console()
    parser = argparse.ArgumentParser(
        description="快捷添加视频页面到“视频文件”板块（支持 Markdown）"
    )
    sub = parser.add_subparsers(dest="cmd")

    p_add = sub.add_parser("add", help="添加视频")
    p_add.add_argument("title", nargs="?", help="视频标题；省略则进入交互模式")
    p_add.add_argument("-u", "--url", help="卡片链接；省略则自动创建本地页面")
    p_add.add_argument(
        "-m", "--md", help="Markdown 文件：无 --url 时作为页面内容，有 --url 时作为描述"
    )
    p_add.add_argument("-d", "--desc", help="卡片描述（Markdown）")
    p_add.add_argument("--first", action="store_true", help="插入到最前面")
    p_add.add_argument("--push", action="store_true", help="完成后自动提交并推送")

    sub.add_parser("list", help="列出所有视频条目")
    sub.add_parser("rebuild", help="按 tools/videos.json 重新生成板块")

    p_remove = sub.add_parser("remove", help="删除视频条目")
    p_remove.add_argument("key", help="序号、链接或标题")

    args = parser.parse_args()

    if args.cmd in (None, "add"):
        if args.cmd is None:
            args = argparse.Namespace(
                title=None, url=None, md=None, desc=None, first=False, push=False
            )
        cmd_add(args)
    elif args.cmd == "list":
        cmd_list(args)
    elif args.cmd == "remove":
        cmd_remove(args)
    elif args.cmd == "rebuild":
        cmd_rebuild(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    try:
        main()
    except ValueError as exc:
        fail(str(exc))
    except KeyboardInterrupt:
        print()
        sys.exit(130)
