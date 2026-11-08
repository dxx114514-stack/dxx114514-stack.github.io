# 视频条目工具（video.py）

快捷把页面添加到首页「视频文件」板块，页面内容与卡片描述都支持 Markdown。

## 快速开始

双击 `tools/add-video.bat`，或在仓库根目录运行：

```bash
python tools/video.py
```

按提示输入标题、链接、Markdown 内容即可。链接留空会自动创建本地页面 `docs/P{n}/index.html`。

## 命令行用法

```bash
# 交互式添加
python tools/video.py

# 创建本地页面（Markdown 来自文件）
python tools/video.py add "标题" -m 内容.md

# 添加外部链接，并写一段 Markdown 描述
python tools/video.py add "标题" -u https://example.com -d "**简介** 和 [链接](https://x.y)"

# 把 Markdown 文件当作描述
python tools/video.py add "标题" -u https://example.com -m 描述.md

# 查看 / 删除 / 重新生成
python tools/video.py list
python tools/video.py remove 1
python tools/video.py remove "标题"
python tools/video.py rebuild

# 添加后自动提交并推送
python tools/video.py add "标题" -m 内容.md --push
```

## Markdown 支持

标题、段落、粗体、斜体、删除线、行内代码、代码块（带语言标记）、链接、图片、
有序/无序列表、引用、表格、分隔线、`<https://...>` 自动链接。

页面里出现 `$...$` 时会自动加载 MathJax 渲染公式。

## 数据与文件

| 路径 | 说明 |
| --- | --- |
| `tools/videos.json` | 条目数据（标题、链接、描述、日期） |
| `docs/P{n}/index.md` | 页面 Markdown 源文件 |
| `docs/P{n}/index.html` | 生成的页面 |
| `docs/index.html` | `video:start` 与 `video:end` 标记之间由脚本生成，请勿手改 |
| `pnum.txt` | 页面编号，自动递增 |

## 注意

- 卡片整块可点击；描述里的链接同样可以点击。
- `remove` 只删除条目，不会删除 `docs/P{n}` 页面文件。
- 修改 `tools/videos.json` 后运行 `python tools/video.py rebuild` 重新生成板块。
