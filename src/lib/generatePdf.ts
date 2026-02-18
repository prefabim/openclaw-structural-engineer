import jsPDF from "jspdf";
import katex from "katex";

interface PdfOptions {
  title?: string;
  project?: string;
  author?: string;
  content: string;
}

/**
 * Render LaTeX math in a string to KaTeX HTML spans.
 * Handles both display $$...$$ and inline $...$ math.
 */
function renderMathInText(text: string): string {
  // Display math $$...$$
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex: string) => {
    try {
      return `<div class="math-display">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return latex;
    }
  });

  // Inline math $...$
  result = result.replace(/\$([^$\n]+?)\$/g, (_match, latex: string) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return latex;
    }
  });

  return result;
}

/**
 * Convert markdown content to styled HTML for PDF rendering.
 */
function markdownToHtml(content: string, title: string, dateStr: string): string {
  const lines = content.split("\n");
  let html = "";
  let i = 0;
  let inTable = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inTable) {
        html += "</table>";
        inTable = false;
      }
      i++;
      continue;
    }

    // Display math block
    if (trimmed.startsWith("$$")) {
      let mathBlock = trimmed.slice(2);
      if (mathBlock.endsWith("$$")) {
        mathBlock = mathBlock.slice(0, -2);
      } else {
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("$$")) {
          mathBlock += " " + lines[i].trim();
          i++;
        }
        if (i < lines.length) {
          mathBlock += " " + lines[i].trim().slice(0, -2);
        }
      }
      try {
        html += `<div class="math-display">${katex.renderToString(mathBlock.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch {
        html += `<p>${mathBlock}</p>`;
      }
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      html += `<h3>${renderMathInText(trimmed.slice(4))}</h3>`;
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      html += `<h2>${renderMathInText(trimmed.slice(3))}</h2>`;
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html += `<h1>${renderMathInText(trimmed.slice(2))}</h1>`;
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      html += "<hr>";
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!inTable) {
        html += '<table>';
        inTable = true;
      }
      // Skip separator rows
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        i++;
        continue;
      }
      const cells = trimmed.split("|").slice(1, -1).map((c) => renderMathInText(c.trim()));
      // First row after table start is header
      const isFirstRow = html.endsWith("<table>");
      const tag = isFirstRow ? "th" : "td";
      html += `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      i++;
      continue;
    }

    if (inTable) {
      html += "</table>";
      inTable = false;
    }

    // Regular paragraph — process markdown bold/italic/code + math
    let pText = trimmed;
    pText = pText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    pText = pText.replace(/\*(.*?)\*/g, "<em>$1</em>");
    pText = pText.replace(/`(.*?)`/g, '<code>$1</code>');
    pText = renderMathInText(pText);

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      html += `<li>${pText.slice(2)}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      html += `<li>${pText.replace(/^\d+\.\s/, "")}</li>`;
    } else {
      html += `<p>${pText}</p>`;
    }
    i++;
  }

  if (inTable) html += "</table>";

  return `
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css">
<style>
  @page { margin: 15mm; }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #111;
    max-width: 170mm;
    margin: 0 auto;
  }
  .pdf-header {
    border-bottom: 2px solid #333;
    padding-bottom: 6px;
    margin-bottom: 12px;
  }
  .pdf-header h1 {
    font-size: 14pt;
    margin: 0 0 2px 0;
  }
  .pdf-header .meta {
    font-size: 8pt;
    color: #666;
  }
  h1 { font-size: 13pt; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  h2 { font-size: 11pt; margin: 12px 0 5px 0; }
  h3 { font-size: 10pt; margin: 10px 0 4px 0; }
  p { margin: 4px 0; }
  li { margin: 2px 0 2px 16px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 9pt;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    text-align: left;
  }
  th {
    background: #f0f0f0;
    font-weight: bold;
  }
  code {
    background: #f5f5f5;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9pt;
  }
  strong { font-weight: bold; }
  .math-display {
    text-align: center;
    margin: 8px 0;
  }
  .katex { font-size: 1.05em; }
  .pdf-footer {
    margin-top: 20px;
    padding-top: 6px;
    border-top: 1px solid #ccc;
    font-size: 7pt;
    color: #999;
    text-align: center;
    font-style: italic;
  }
</style>
</head>
<body>
  <div class="pdf-header">
    <h1>CALCULATION NOTE: ${title}</h1>
    <div class="meta">${dateStr} | Structural Engineer AI | For preliminary design only</div>
  </div>
  ${html}
  <div class="pdf-footer">
    This document is generated by AI for preliminary design purposes only. All calculations must be verified by a licensed structural engineer.
  </div>
</body>
</html>`;
}

/**
 * Generate a structural calculation note PDF with proper math rendering.
 * Uses KaTeX HTML → html2canvas → jsPDF for accurate formula display.
 */
export function generateCalcNotePdf(options: PdfOptions) {
  const {
    title = "Calculation Note",
    content,
  } = options;

  const dateStr = new Date().toISOString().split("T")[0];
  const htmlContent = markdownToHtml(content, title, dateStr);

  // Create hidden iframe for rendering
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Could not create rendering context");
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Wait for KaTeX CSS and fonts to load, then generate PDF
  setTimeout(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.html(iframeDoc.body, {
      callback: (pdf) => {
        document.body.removeChild(iframe);
        pdf.save(`calc-note-${dateStr}.pdf`);
      },
      x: 10,
      y: 10,
      width: 180,
      windowWidth: 794,
      html2canvas: {
        scale: 0.25,
        useCORS: true,
        logging: false,
      },
    });
  }, 1500); // Give time for KaTeX fonts to load in iframe
}
