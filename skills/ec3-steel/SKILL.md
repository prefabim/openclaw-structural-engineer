---
name: ec3-steel
description: Wymiarowanie elementów stalowych wg Eurokodu 3 (EC3). Dobór profili, sprawdzenie nośności na zginanie i ścinanie.
---

# EC3 — Konstrukcje stalowe

Skill do wymiarowania elementów stalowych wg PN-EN 1993-1-1 (Eurokod 3).

## Kiedy używać

- Dobór profilu stalowego (IPE, HEA, HEB) dla belki lub słupa
- Sprawdzenie nośności na zginanie, ścinanie, ściskanie
- Klasyfikacja przekroju (klasa 1-4)
- Obliczenia wg EC3 z polskim załącznikiem krajowym (NA)

## Dostępne skrypty

### 1. `scripts/steel_beam.py` — Dobór profilu stalowego dla belki

Dobiera profil IPE/HEA/HEB dla belki prostopodpartej z weryfikacją nośności i ugięć.

```bash
python scripts/steel_beam.py \
  --span 8.0 \
  --g 10.0 \
  --q 15.0 \
  --steel S355 \
  --series IPE \
  --deflection_limit 250
```

Parametry:
- `--span` — rozpiętość [m]
- `--g` — obciążenie stałe [kN/m]
- `--q` — obciążenie zmienne [kN/m]
- `--steel` — gatunek stali (S235, S275, S355, S460)
- `--series` — seria profilu: IPE, HEA, HEB (domyślnie IPE)
- `--deflection_limit` — dopuszczalne ugięcie L/x (domyślnie 250)

## Gatunki stali — parametry wg EC3

| Gatunek | f_y [MPa] | f_u [MPa] | E [GPa] |
|---------|----------|----------|---------|
| S235    | 235      | 360      | 210     |
| S275    | 275      | 430      | 210     |
| S355    | 355      | 510      | 210     |
| S460    | 460      | 550      | 210     |

Uwaga: f_y zależy od grubości — powyższe wartości dla t ≤ 40mm.

## Współczynniki bezpieczeństwa

- γ_M0 = 1.00 (nośność przekroju)
- γ_M1 = 1.00 (nośność na stateczność)
- γ_M2 = 1.25 (nośność netto, połączenia)
