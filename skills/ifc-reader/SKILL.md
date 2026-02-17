---
name: ifc-reader
description: Odczyt i analiza modeli BIM w formacie IFC. Wyciąganie geometrii, materiałów i właściwości elementów konstrukcyjnych.
---

# IFC Reader — Analiza modeli BIM

Skill do odczytu plików IFC (Industry Foundation Classes) i wyciągania informacji o elementach konstrukcyjnych.

## Kiedy używać

- Użytkownik przesyła plik .ifc i pyta o elementy konstrukcyjne
- Potrzebna lista belek, słupów, płyt z modelu
- Ekstrakcja geometrii, materiałów, właściwości z modelu BIM
- Porównanie modelu z wymaganiami projektowymi

## Dostępne skrypty

### 1. `scripts/ifc_analyze.py` — Analiza modelu IFC

```bash
python scripts/ifc_analyze.py --file model.ifc --output summary
python scripts/ifc_analyze.py --file model.ifc --output beams
python scripts/ifc_analyze.py --file model.ifc --output columns
python scripts/ifc_analyze.py --file model.ifc --output slabs
```

Parametry:
- `--file` — ścieżka do pliku .ifc
- `--output` — typ raportu:
  - `summary` — ogólne podsumowanie modelu
  - `beams` — lista belek z wymiarami
  - `columns` — lista słupów z wymiarami
  - `slabs` — lista płyt z grubościami
  - `materials` — lista materiałów
  - `all` — pełny raport

## Wymagania

```bash
pip install ifcopenshell
```

## Obsługiwane typy elementów IFC

| Typ IFC | Element |
|---------|---------|
| IfcBeam | Belka |
| IfcColumn | Słup |
| IfcSlab | Płyta |
| IfcWall | Ściana |
| IfcFooting | Fundament |
| IfcMember | Element ogólny |

## Typowe workflow

1. Użytkownik przesyła plik .ifc
2. Uruchom `ifc_analyze.py --output summary` — podsumowanie modelu
3. Na podstawie wyników, użytkownik pyta o konkretne elementy
4. Uruchom szczegółową analizę (beams/columns/slabs)
5. Opcjonalnie: przekaż dane do skilli EC2/EC3 do weryfikacji
