import katex from "katex";

interface PdfOptions {
  title?: string;
  content: string;
}

/**
 * Render LaTeX math to KaTeX HTML.
 */
function renderMath(text: string): string {
  // Display math $$...$$
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex: string) => {
    try {
      return `<div class="math-block">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return latex; }
  });
  // Inline math $...$
  result = result.replace(/\$([^$\n]+?)\$/g, (_m, latex: string) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch { return latex; }
  });
  return result;
}

/**
 * Convert markdown content to styled HTML.
 */
function toHtml(content: string, title: string, dateStr: string): string {
  const lines = content.split("\n");
  let html = "";
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { if (inTable) { html += "</table>"; inTable = false; } continue; }

    // Display math block
    if (t.startsWith("$$")) {
      let math = t.slice(2);
      if (math.endsWith("$$")) { math = math.slice(0, -2); }
      else {
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("$$")) { math += " " + lines[i].trim(); i++; }
        if (i < lines.length) math += " " + lines[i].trim().slice(0, -2);
      }
      try {
        html += `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch { html += `<p>${math}</p>`; }
      continue;
    }

    if (t.startsWith("### ")) { html += `<h3>${renderMath(t.slice(4))}</h3>`; continue; }
    if (t.startsWith("## ")) { html += `<h2>${renderMath(t.slice(3))}</h2>`; continue; }
    if (t.startsWith("# ")) { html += `<h1>${renderMath(t.slice(2))}</h1>`; continue; }
    if (t === "---" || t === "***") { html += "<hr>"; continue; }

    // Table
    if (t.startsWith("|") && t.endsWith("|")) {
      if (!inTable) { html += "<table>"; inTable = true; }
      if (/^\|[\s\-:|]+\|$/.test(t)) continue;
      const cells = t.split("|").slice(1, -1).map(c => renderMath(c.trim()));
      const tag = html.endsWith("<table>") ? "th" : "td";
      html += `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      continue;
    }
    if (inTable) { html += "</table>"; inTable = false; }

    // Paragraph with markdown + math
    let p = t;
    p = p.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    p = p.replace(/\*(.*?)\*/g, "<em>$1</em>");
    p = p.replace(/`(.*?)`/g, "<code>$1</code>");
    p = renderMath(p);

    if (t.startsWith("- ") || t.startsWith("* ")) html += `<li>${p.slice(2)}</li>`;
    else if (/^\d+\.\s/.test(t)) html += `<li>${p.replace(/^\d+\.\s/, "")}</li>`;
    else html += `<p>${p}</p>`;
  }
  if (inTable) html += "</table>";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Calculation Note - ${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
<style>
  @page {
    size: A4;
    margin: 18mm 15mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  body {
    font-family: 'Times New Roman', Georgia, 'DejaVu Serif', serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #111;
    margin: 0 auto;
    max-width: 720px;
    padding: 20px 40px;
  }
  .header {
    border-bottom: 2.5px solid #222;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 15pt;
    margin: 0 0 4px;
    letter-spacing: -0.3px;
  }
  .header .meta {
    font-size: 8.5pt;
    color: #555;
  }
  h1 { font-size: 13pt; margin: 16px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  h2 { font-size: 11.5pt; margin: 14px 0 5px; color: #222; }
  h3 { font-size: 10.5pt; margin: 12px 0 4px; color: #333; }
  p { margin: 4px 0; }
  li { margin: 3px 0 3px 18px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 9.5pt;
  }
  th, td {
    border: 1px solid #bbb;
    padding: 5px 8px;
    text-align: left;
  }
  th {
    background: #f0f0f0;
    font-weight: bold;
  }
  code {
    background: #f3f3f3;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9.5pt;
    font-family: 'Courier New', monospace;
  }
  strong { font-weight: bold; }
  em { font-style: italic; }
  .math-block {
    text-align: center;
    margin: 10px 0;
  }
  .katex { font-size: 1.05em; }
  .footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1.5px solid #bbb;
    font-size: 7.5pt;
    color: #888;
    text-align: center;
    font-style: italic;
  }
  .actions {
    text-align: center;
    margin: 20px 0;
    padding: 16px;
    background: #f8f8f8;
    border-radius: 8px;
  }
  .actions button {
    font-size: 14px;
    padding: 10px 32px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }
  .actions button:hover { background: #1d4ed8; }
  .actions p { font-size: 11px; color: #888; margin-top: 8px; }
  @media print {
    .actions { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>CALCULATION NOTE: ${escapeHtml(title)}</h1>
    <div class="meta">${dateStr} &nbsp;|&nbsp; Structural Engineer AI &nbsp;|&nbsp; For preliminary design only</div>
  </div>
  ${html}
  <div class="footer">
    This document is generated by AI for preliminary design purposes only. All calculations must be verified by a qualified structural engineer.
  </div>
  <div class="actions">
    <button onclick="window.print()">Save as PDF / Print</button>
    <p>Use "Save as PDF" as the destination in the print dialog</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate a PDF calculation note by opening a print-ready window.
 * Uses browser's native print → "Save as PDF" for perfect math rendering.
 * No hidden DOM manipulation, no page layout changes.
 */
export async function generateCalcNotePdf(options: PdfOptions) {
  const { title = "Calculation Note", content } = options;
  const dateStr = new Date().toISOString().split("T")[0];
  const htmlContent = toHtml(content, title, dateStr);

  // Open a new window with the formatted content
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked — please allow popups for this site and try again.");
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
