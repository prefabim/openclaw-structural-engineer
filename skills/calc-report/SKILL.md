---
name: calc-report
description: Generowanie not obliczeniowych w formacie PDF. Eksport wyników obliczeń konstrukcyjnych do profesjonalnych dokumentów.
---

# Nota obliczeniowa — Generator PDF

Skill do generowania profesjonalnych not obliczeniowych w formacie PDF z wyników obliczeń konstrukcyjnych.

## Kiedy używać

- Użytkownik prosi o "notę obliczeniową", "raport", "dokumentację obliczeń"
- Po zakończeniu obliczeń — eksport wyników do PDF
- Potrzeba formalnego dokumentu z obliczeń

## Dostępne skrypty

### 1. `scripts/generate_pdf.py` — Generowanie PDF z Markdown

Konwertuje notę obliczeniową (Markdown) na profesjonalny PDF.

```bash
python scripts/generate_pdf.py --input nota.md --output nota.pdf \
  --title "Belka żelbetowa B-1" \
  --project "Budynek mieszkalny, ul. Przykładowa 1" \
  --author "Jan Kowalski" \
  --date "2026-02-17"
```

Parametry:
- `--input` — plik Markdown z obliczeniami (lub stdin)
- `--output` — ścieżka pliku PDF
- `--title` — tytuł dokumentu
- `--project` — nazwa projektu/inwestycji
- `--author` — autor obliczeń
- `--date` — data (domyślnie dzisiejsza)

## Wymagania

```bash
pip install markdown weasyprint
```

Lub alternatywnie (lżejsze):
```bash
pip install fpdf2
```

## Szablon noty obliczeniowej

Każda nota zawiera:
1. **Nagłówek** — tytuł, projekt, autor, data, numer strony
2. **Dane wejściowe** — parametry elementu i materiałów
3. **Obliczenia** — krok po kroku ze wzorami
4. **Wyniki** — dobrane zbrojenie/profil
5. **Sprawdzenia** — ULS, SLS
6. **Disclaimer** — informacja o charakterze pomocniczym

## Workflow

1. Uruchom obliczenia (ec2-concrete, ec3-steel, ec2-slabs, ec2-columns)
2. Zapisz wynik Markdown do pliku
3. Uruchom `generate_pdf.py` z odpowiednimi metadanymi
4. Prześlij PDF użytkownikowi
