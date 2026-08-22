import fs from "node:fs"
import path from "node:path"

const input = process.argv[2]
const output = process.argv[3]

if (!input || !output) {
  console.error("Usage: node scripts/render-merchant-agreement.mjs <input.md> <output.html>")
  process.exit(1)
}

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")

function inline(value) {
  let result = escapeHtml(value)
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  result = result.replace(/`(.+?)`/g, "<code>$1</code>")
  result = result.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
  return result
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "")
  return trimmed.split("|").map((cell) => cell.trim())
}

function isTableSeparator(line) {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell))
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/)
  const output = []
  let paragraph = []
  let majorHeadingSeen = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p>${inline(paragraph.join(" ").trim())}</p>`)
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      continue
    }

    if (/^\|/.test(trimmed) && index + 1 < lines.length && /^\|/.test(lines[index + 1].trim())) {
      flushParagraph()
      const header = splitTableRow(trimmed)
      index += 1
      if (!isTableSeparator(lines[index])) {
        index -= 1
        paragraph.push(line)
        continue
      }
      const rows = []
      while (index + 1 < lines.length && /^\|/.test(lines[index + 1].trim())) {
        index += 1
        rows.push(splitTableRow(lines[index]))
      }
      output.push(`<table><thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      const text = heading[2]
      const classes = []
      if (level === 1) {
        classes.push("major-heading")
        if (!majorHeadingSeen) classes.push("first-major")
        majorHeadingSeen = true
      }
      if (level === 2 && /^1\./.test(text)) classes.push("agreement-start")
      output.push(`<h${level}${classes.length ? ` class="${classes.join(" ")}"` : ""}>${inline(text)}</h${level}>`)
      continue
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph()
      output.push("<hr>")
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph()
      const quote = trimmed.replace(/^>\s?/, "")
      output.push(`<blockquote>${inline(quote)}</blockquote>`)
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph()
      const items = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""))
        index += 1
      }
      index -= 1
      output.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`)
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  return output.join("\n")
}

const markdown = fs.readFileSync(input, "utf8")
const body = renderMarkdown(markdown)
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Nurava Tech Merchant Store Hosting and SaaS Services Agreement</title>
<style>
  @page { size: A4; margin: 17mm 16mm 18mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c2430; background: #fff; font-family: Georgia, "Times New Roman", serif; font-size: 10.2pt; line-height: 1.42; }
  h1, h2, h3 { color: #142b4a; page-break-after: avoid; }
  h1 { font: 700 19pt Arial, sans-serif; letter-spacing: .05em; margin: 18pt 0 10pt; border-bottom: 2px solid #d3a84c; padding-bottom: 6pt; }
  h1:first-of-type { font-size: 26pt; text-align: center; letter-spacing: .13em; border-bottom: 0; margin-top: 65pt; }
  h2 { font: 700 14pt Arial, sans-serif; margin: 18pt 0 7pt; border-bottom: 1px solid #d8e0e8; padding-bottom: 3pt; }
  h3 { font: 700 11.5pt Arial, sans-serif; margin: 13pt 0 5pt; }
  p { margin: 0 0 7pt; orphans: 3; widows: 3; }
  ul { margin: 3pt 0 9pt 18pt; padding: 0; }
  li { margin: 0 0 3pt; }
  blockquote { margin: 12pt 0; padding: 10pt 12pt; border-left: 4px solid #d3a84c; background: #f7f9fb; color: #354154; font-size: 9.5pt; }
  hr { border: 0; border-top: 1px solid #d8e0e8; margin: 12pt 0; }
  table { width: 100%; border-collapse: collapse; margin: 9pt 0 12pt; font-size: 8.5pt; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #142b4a; color: white; text-align: left; font: 700 8.2pt Arial, sans-serif; }
  th, td { border: 1px solid #c8d2dc; padding: 5pt 5.5pt; vertical-align: top; }
  tr:nth-child(even) td { background: #f7f9fb; }
  code { font-family: Consolas, monospace; font-size: 8.5pt; }
  a { color: #142b4a; }
  .major-heading:not(.first-major) { break-before: page; }
  .agreement-start { break-before: page; }
  .first-major + h2 { text-align: center; border: 0; font-size: 17pt; margin-top: 0; }
  .first-major + h2 + p { text-align: center; }
  .first-major ~ p:nth-of-type(1) { text-align: center; }
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 0 28px; } }
</style>
</head>
<body>${body}</body>
</html>`

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, html)
console.log(`Rendered ${output}`)
