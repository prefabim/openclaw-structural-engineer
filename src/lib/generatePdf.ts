import jsPDF from "jspdf";
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
 * Convert markdown to styled HTML document.
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
      else { i++; while (i < lines.length && !lines[i].trim().endsWith("$$")) { math += " " + lines[i].trim(); i++; } if (i < lines.length) math += " " + lines[i].trim().slice(0, -2); }
      try { html += `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`; }
      catch { html += `<p>${math}</p>`; }
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

  // Inline KaTeX CSS directly (no external dependencies)
  const katexCss = getKatexInlineCss();

  return `<!DOCTYPE html><html><head>
<style>
${katexCss}
body { font-family: 'Times New Roman', Georgia, serif; font-size: 10pt; line-height: 1.55; color: #111; margin: 0; padding: 12mm; max-width: 180mm; }
.hdr { border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; }
.hdr h1 { font-size: 13pt; margin: 0 0 2px; }
.hdr .meta { font-size: 8pt; color: #666; }
h1 { font-size: 12pt; margin: 12px 0 5px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
h2 { font-size: 11pt; margin: 10px 0 4px; }
h3 { font-size: 10pt; margin: 8px 0 3px; }
p { margin: 3px 0; }
li { margin: 2px 0 2px 14px; }
hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 9pt; }
th, td { border: 1px solid #ccc; padding: 3px 6px; text-align: left; }
th { background: #f0f0f0; font-weight: bold; }
code { background: #f5f5f5; padding: 1px 3px; border-radius: 2px; font-size: 9pt; }
.math-block { text-align: center; margin: 6px 0; }
.katex { font-size: 1.0em; }
.ftr { margin-top: 16px; padding-top: 5px; border-top: 1px solid #ccc; font-size: 7pt; color: #999; text-align: center; font-style: italic; }
</style></head><body>
<div class="hdr"><h1>CALCULATION NOTE: ${escapeHtml(title)}</h1><div class="meta">${dateStr} | Structural Engineer AI</div></div>
${html}
<div class="ftr">For preliminary design only. Verify with a licensed structural engineer.</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Get minimal inline KaTeX CSS for PDF rendering.
 * We only need the font-face rules and basic layout - pull from the bundled KaTeX.
 */
function getKatexInlineCss(): string {
  // Extract KaTeX CSS from the loaded stylesheets
  for (const sheet of document.styleSheets) {
    try {
      const href = sheet.href || "";
      if (href.includes("katex") || href.includes("KaTeX")) {
        const rules = Array.from(sheet.cssRules);
        return rules.map(r => r.cssText).join("\n");
      }
    } catch { /* CORS-protected sheets */ }
  }
  // Fallback: return minimal KaTeX styles
  return `.katex { font: normal 1.05em KaTeX_Main, 'Times New Roman', serif; text-rendering: auto; }
.katex .mfrac .frac-line { border-bottom-style: solid; border-bottom-width: 1px; }
.katex .mfrac .frac-line::after { border-bottom-style: solid; border-bottom-width: 1px; }
.katex .msupsub { text-align: left; }
.katex .mord.mathnormal { font-family: KaTeX_Math; font-style: italic; }`;
}

/**
 * Generate PDF calculation note with proper math rendering.
 * Uses a hidden div + html2canvas for accurate KaTeX display.
 */
export async function generateCalcNotePdf(options: PdfOptions) {
  const { title = "Calculation Note", content } = options;
  const dateStr = new Date().toISOString().split("T")[0];
  const htmlContent = toHtml(content, title, dateStr);

  // Create a hidden container for rendering
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;z-index:-1;";
  container.innerHTML = htmlContent;

  // Copy KaTeX font-face rules from existing stylesheets
  const styleEl = document.createElement("style");
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.cssText.includes("@font-face") && rule.cssText.includes("KaTeX")) {
          styleEl.textContent += rule.cssText + "\n";
        }
      }
    } catch { /* skip */ }
  }
  container.prepend(styleEl);
  document.body.appendChild(container);

  // Wait for fonts to load
  try {
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch { /* proceed anyway */ }

  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    await new Promise<void>((resolve, reject) => {
      doc.html(container, {
        callback: (pdf) => {
          try {
            pdf.save(`calc-note-${dateStr}.pdf`);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        x: 5,
        y: 5,
        width: 190,
        windowWidth: 794,
        html2canvas: {
          scale: 0.25,
          useCORS: true,
          logging: false,
          allowTaint: true,
        },
      });
    });
  } finally {
    document.body.removeChild(container);
  }
}
