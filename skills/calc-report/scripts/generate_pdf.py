#!/usr/bin/env python3
"""
Generowanie noty obliczeniowej PDF z Markdown.

Wymaga: pip install fpdf2

Użycie:
    python generate_pdf.py --input nota.md --output nota.pdf \
        --title "Belka B-1" --project "Budynek A" --author "Jan Kowalski"

    # Lub z stdin:
    python beam_bending.py ... | python generate_pdf.py --output nota.pdf --title "Belka B-1"
"""

import argparse
import sys
import re
from datetime import date

try:
    from fpdf import FPDF
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False


class CalcReportPDF(FPDF):
    """Nota obliczeniowa PDF z nagłówkiem i stopką."""

    def __init__(self, title="", project="", author="", calc_date=""):
        super().__init__()
        self.doc_title = title
        self.project = project
        self.author = author
        self.calc_date = calc_date or date.today().isoformat()
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        # Linia górna
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, f"NOTA OBLICZENIOWA: {self.doc_title}", 0, 1, "L")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 4, f"Projekt: {self.project} | Autor: {self.author} | Data: {self.calc_date}", 0, 1, "L")
        self.line(10, self.get_y() + 1, 200, self.get_y() + 1)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Strona {self.page_no()}/{{nb}}", 0, 0, "C")

    def add_markdown(self, md_text):
        """Parsuj Markdown i dodaj do PDF."""
        lines = md_text.split("\n")
        in_table = False
        table_rows = []

        for line in lines:
            stripped = line.strip()

            # Pusta linia
            if not stripped:
                if in_table and table_rows:
                    self._render_table(table_rows)
                    table_rows = []
                    in_table = False
                self.ln(3)
                continue

            # Nagłówki
            if stripped.startswith("# "):
                if in_table and table_rows:
                    self._render_table(table_rows)
                    table_rows = []
                    in_table = False
                self.set_font("Helvetica", "B", 14)
                self.cell(0, 8, self._clean_text(stripped[2:]), 0, 1)
                self.ln(2)
                continue

            if stripped.startswith("## "):
                if in_table and table_rows:
                    self._render_table(table_rows)
                    table_rows = []
                    in_table = False
                self.set_font("Helvetica", "B", 12)
                self.ln(3)
                self.cell(0, 7, self._clean_text(stripped[3:]), 0, 1)
                self.ln(1)
                continue

            if stripped.startswith("### "):
                self.set_font("Helvetica", "B", 10)
                self.ln(2)
                self.cell(0, 6, self._clean_text(stripped[4:]), 0, 1)
                continue

            # Separator
            if stripped == "---":
                if in_table and table_rows:
                    self._render_table(table_rows)
                    table_rows = []
                    in_table = False
                self.ln(2)
                self.line(10, self.get_y(), 200, self.get_y())
                self.ln(4)
                continue

            # Tabela
            if "|" in stripped and stripped.startswith("|"):
                # Pomijaj linie separatora tabeli
                if re.match(r"^\|[\s\-:|]+\|$", stripped):
                    continue
                in_table = True
                cells = [c.strip() for c in stripped.split("|")[1:-1]]
                table_rows.append(cells)
                continue

            if in_table and table_rows:
                self._render_table(table_rows)
                table_rows = []
                in_table = False

            # Zwykły tekst / wzory
            self.set_font("Helvetica", "", 10)
            text = self._clean_text(stripped)

            # Pogrubienie prostego formatu **tekst**
            if "**" in stripped:
                self._add_rich_text(stripped)
            else:
                self.multi_cell(0, 5, text)

        # Flush remaining table
        if in_table and table_rows:
            self._render_table(table_rows)

    def _clean_text(self, text):
        """Usuń formatowanie Markdown."""
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
        text = re.sub(r"\*(.*?)\*", r"\1", text)
        text = re.sub(r"`(.*?)`", r"\1", text)
        text = text.replace("✅", "[OK]").replace("❌", "[X]").replace("⚠️", "[!]")
        text = text.replace("←", "<-").replace("→", "->")
        return text

    def _add_rich_text(self, text):
        """Dodaj tekst z prostym formatowaniem bold."""
        text = text.replace("✅", "[OK]").replace("❌", "[X]").replace("⚠️", "[!]")
        text = text.replace("←", "<-").replace("→", "->")
        text = re.sub(r"`(.*?)`", r"\1", text)

        parts = re.split(r"(\*\*.*?\*\*)", text)
        x_start = self.get_x()
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                self.set_font("Helvetica", "B", 10)
                self.write(5, part[2:-2])
            else:
                part = re.sub(r"\*(.*?)\*", r"\1", part)
                self.set_font("Helvetica", "", 10)
                self.write(5, part)
        self.ln(6)

    def _render_table(self, rows):
        """Renderuj tabelę."""
        if not rows:
            return

        n_cols = max(len(r) for r in rows)
        col_width = (190) / n_cols  # marginesy 10mm z każdej strony

        # Nagłówek tabeli (pierwszy wiersz)
        self.set_font("Helvetica", "B", 9)
        for i, cell in enumerate(rows[0]):
            w = col_width
            self.cell(w, 6, self._clean_text(cell)[:40], 1, 0, "C")
        self.ln()

        # Dane
        self.set_font("Helvetica", "", 9)
        for row in rows[1:]:
            for i, cell in enumerate(row):
                w = col_width
                self.cell(w, 5, self._clean_text(cell)[:40], 1, 0, "L")
            self.ln()

        self.ln(2)


def generate_pdf(md_text, output_path, title, project, author, calc_date):
    """Generuj PDF z tekstu Markdown."""
    if not HAS_FPDF:
        print("❌ Brak biblioteki fpdf2.")
        print("Zainstaluj: pip install fpdf2")
        return False

    pdf = CalcReportPDF(
        title=title,
        project=project,
        author=author,
        calc_date=calc_date,
    )
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_markdown(md_text)

    pdf.output(output_path)
    print(f"✅ Wygenerowano: {output_path}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Generuj notę obliczeniową PDF")
    parser.add_argument("--input", type=str, help="Plik Markdown (domyślnie stdin)")
    parser.add_argument("--output", type=str, required=True, help="Ścieżka PDF")
    parser.add_argument("--title", type=str, default="Nota obliczeniowa")
    parser.add_argument("--project", type=str, default="")
    parser.add_argument("--author", type=str, default="")
    parser.add_argument("--date", type=str, default="")

    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            md_text = f.read()
    else:
        md_text = sys.stdin.read()

    generate_pdf(md_text, args.output, args.title, args.project, args.author, args.date)


if __name__ == "__main__":
    main()
