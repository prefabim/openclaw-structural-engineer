import jsPDF from "jspdf";

interface PdfOptions {
  title?: string;
  project?: string;
  author?: string;
  content: string;
}

// Convert LaTeX to Unicode text for PDF (jsPDF doesn't support HTML/SVG rendering)
function latexToUnicode(latex: string): string {
  // Greek letters
  const greekMap: Record<string, string> = {
    "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ",
    "\\epsilon": "ε", "\\varepsilon": "ε", "\\zeta": "ζ", "\\eta": "η",
    "\\theta": "θ", "\\iota": "ι", "\\kappa": "κ", "\\lambda": "λ",
    "\\mu": "μ", "\\nu": "ν", "\\xi": "ξ", "\\pi": "π",
    "\\rho": "ρ", "\\sigma": "σ", "\\tau": "τ", "\\upsilon": "υ",
    "\\phi": "φ", "\\varphi": "φ", "\\chi": "χ", "\\psi": "ψ", "\\omega": "ω",
    "\\Gamma": "Γ", "\\Delta": "Δ", "\\Theta": "Θ", "\\Lambda": "Λ",
    "\\Xi": "Ξ", "\\Pi": "Π", "\\Sigma": "Σ", "\\Phi": "Φ",
    "\\Psi": "Ψ", "\\Omega": "Ω",
  };

  // Operators and symbols
  const symbolMap: Record<string, string> = {
    "\\cdot": "·", "\\times": "×", "\\div": "÷", "\\pm": "±",
    "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\approx": "≈",
    "\\infty": "∞", "\\sum": "Σ", "\\prod": "∏", "\\int": "∫",
    "\\sqrt": "√", "\\partial": "∂", "\\nabla": "∇",
    "\\leftarrow": "←", "\\rightarrow": "→", "\\Rightarrow": "⇒",
    "\\quad": " ", "\\qquad": "  ", "\\,": " ", "\\;": " ", "\\!": "",
    "\\left": "", "\\right": "", "\\Big": "", "\\big": "",
  };

  let result = latex;

  // Replace \text{...} with just the text content
  result = result.replace(/\\text\s*\{([^}]*)\}/g, "$1");
  result = result.replace(/\\textbf\s*\{([^}]*)\}/g, "$1");
  result = result.replace(/\\mathrm\s*\{([^}]*)\}/g, "$1");

  // Replace fractions: \frac{a}{b} → (a)/(b)
  let prevResult = "";
  while (prevResult !== result) {
    prevResult = result;
    result = result.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  }

  // Replace Greek letters (longer names first to avoid partial matches)
  const sortedGreek = Object.entries(greekMap).sort((a, b) => b[0].length - a[0].length);
  for (const [tex, uni] of sortedGreek) {
    result = result.replaceAll(tex, uni);
  }

  // Replace symbols
  const sortedSymbols = Object.entries(symbolMap).sort((a, b) => b[0].length - a[0].length);
  for (const [tex, uni] of sortedSymbols) {
    result = result.replaceAll(tex, uni);
  }

  // Subscripts: _{...} → with subscript Unicode where possible
  const subscriptMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "a": "ₐ", "e": "ₑ", "i": "ᵢ", "o": "ₒ", "r": "ᵣ",
    "u": "ᵤ", "v": "ᵥ", "x": "ₓ",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  };

  const superscriptMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "n": "ⁿ",
  };

  // Handle subscripts: _{content} or _x (single char)
  result = result.replace(/\_\{([^}]*)\}/g, (_match, inner: string) => {
    // Try to convert each char to subscript
    let sub = "";
    for (const ch of inner) {
      sub += subscriptMap[ch] || ch;
    }
    return sub;
  });
  result = result.replace(/\_([a-zA-Z0-9])/g, (_match, ch: string) => {
    return subscriptMap[ch] || `_${ch}`;
  });

  // Handle superscripts: ^{content} or ^x
  result = result.replace(/\^\{([^}]*)\}/g, (_match, inner: string) => {
    let sup = "";
    for (const ch of inner) {
      sup += superscriptMap[ch] || ch;
    }
    return sup;
  });
  result = result.replace(/\^([a-zA-Z0-9])/g, (_match, ch: string) => {
    return superscriptMap[ch] || `^${ch}`;
  });

  // Clean up remaining LaTeX commands
  result = result.replace(/\\[a-zA-Z]+/g, "");
  // Remove remaining braces
  result = result.replace(/[{}]/g, "");

  return result.trim();
}

// Process a line of text, converting inline $...$ and display $$...$$ math
function processLine(text: string): string {
  // Handle inline math $...$
  let result = text.replace(/\$\$([^$]+)\$\$/g, (_match, latex: string) => {
    return latexToUnicode(latex);
  });
  result = result.replace(/\$([^$]+)\$/g, (_match, latex: string) => {
    return latexToUnicode(latex);
  });

  // Also clean bold/italic markdown
  result = result.replace(/\*\*(.*?)\*\*/g, "$1");
  result = result.replace(/\*(.*?)\*/g, "$1");
  result = result.replace(/`(.*?)`/g, "$1");

  return result;
}

/**
 * Generate a structural calculation note PDF from markdown content.
 * Downloads directly in the browser.
 */
export function generateCalcNotePdf(options: PdfOptions) {
  const {
    title = "Calculation Note",
    project = "",
    author = "",
    content,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const dateStr = new Date().toISOString().split("T")[0];

  let y = margin;

  function addHeader() {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`CALCULATION NOTE: ${processLine(title)}`, margin, 8);
    doc.setFont("helvetica", "normal");
    const meta = [project, author, dateStr].filter(Boolean).join(" | ");
    doc.text(meta, margin, 12);
    doc.setDrawColor(180);
    doc.line(margin, 14, pageWidth - margin, 14);
    y = 20;
  }

  function addFooter(pageNum: number) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
    doc.text(
      "For preliminary design only. Verify with a licensed engineer.",
      pageWidth / 2,
      pageHeight - 4,
      { align: "center" },
    );
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      addFooter(doc.getNumberOfPages());
      doc.addPage();
      addHeader();
    }
  }

  addHeader();

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      y += 3;
      i++;
      continue;
    }

    // Display math block $$...$$
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
      checkPageBreak(10);
      y += 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const mathText = latexToUnicode(mathBlock);
      doc.text(mathText, pageWidth / 2, y, { align: "center" });
      y += 7;
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      checkPageBreak(12);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(processLine(trimmed.slice(2)), margin, y);
      y += 8;
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      checkPageBreak(10);
      y += 2;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(processLine(trimmed.slice(3)), margin, y);
      y += 7;
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      checkPageBreak(8);
      y += 1;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(processLine(trimmed.slice(4)), margin, y);
      y += 6;
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      checkPageBreak(6);
      y += 2;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        // Skip separator rows
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          const cells = row
            .split("|")
            .slice(1, -1)
            .map((c) => processLine(c.trim()));
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const nCols = Math.max(...tableRows.map((r) => r.length));
        const colWidth = contentWidth / nCols;
        const rowHeight = 5.5;

        checkPageBreak(rowHeight * (tableRows.length + 1));

        // Header row
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y - 3.5, contentWidth, rowHeight, "F");
        for (let c = 0; c < (tableRows[0]?.length ?? 0); c++) {
          doc.text(
            (tableRows[0]?.[c] ?? "").substring(0, 40),
            margin + c * colWidth + 2,
            y,
          );
        }
        y += rowHeight;

        // Data rows
        doc.setFont("helvetica", "normal");
        for (let r = 1; r < tableRows.length; r++) {
          checkPageBreak(rowHeight);
          for (let c = 0; c < (tableRows[r]?.length ?? 0); c++) {
            doc.text(
              (tableRows[r]?.[c] ?? "").substring(0, 40),
              margin + c * colWidth + 2,
              y,
            );
          }
          y += rowHeight;
        }
        y += 3;
      }
      continue;
    }

    // Regular text with math support
    checkPageBreak(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const cleaned = processLine(trimmed);
    const splitLines = doc.splitTextToSize(cleaned, contentWidth);
    for (const sl of splitLines) {
      checkPageBreak(5);
      doc.text(sl, margin, y);
      y += 4.5;
    }

    i++;
  }

  // Final footer
  addFooter(doc.getNumberOfPages());

  // Download
  const filename = `calc-note-${dateStr}.pdf`;
  doc.save(filename);
}
