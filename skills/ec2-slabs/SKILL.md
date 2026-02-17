---
name: ec2-slabs
description: Wymiarowanie płyt żelbetowych wg Eurokodu 2 (EC2). Płyty jednokierunkowo i dwukierunkowo zbrojone.
---

# EC2 — Płyty żelbetowe

Skill do wymiarowania płyt żelbetowych wg PN-EN 1992-1-1 (Eurokod 2).

## Kiedy używać

- Wymiarowanie płyty jednokierunkowo zbrojonej (Ly/Lx > 2)
- Wymiarowanie płyty dwukierunkowo zbrojonej (Ly/Lx ≤ 2)
- Sprawdzenie ugięć płyty metodą uproszczoną
- Dobór zbrojenia na m.b. płyty

## Dostępne skrypty

### 1. `scripts/slab_design.py` — Wymiarowanie płyty żelbetowej

Obsługuje płyty jedno- i dwukierunkowo zbrojone z różnymi warunkami podparcia.

```bash
python scripts/slab_design.py \
  --lx 5.0 \
  --ly 7.0 \
  --thickness 0.20 \
  --g 7.5 \
  --q 3.0 \
  --concrete C30_37 \
  --steel B500SP \
  --cover 25 \
  --support_type "three_fixed_one_free"
```

Parametry:
- `--lx` — krótszy wymiar płyty [m]
- `--ly` — dłuższy wymiar płyty [m]
- `--thickness` — grubość płyty h [m]
- `--g` — obciążenie stałe [kN/m²] (ciężar własny + warstwy wykończeniowe)
- `--q` — obciążenie zmienne [kN/m²]
- `--concrete` — klasa betonu
- `--steel` — klasa stali zbrojeniowej
- `--cover` — otulina [mm]
- `--support_type` — warunki podparcia:
  - `simply_supported` — swobodnie podparta na 4 krawędziach
  - `all_fixed` — utwierdzona na 4 krawędziach
  - `three_fixed_one_free` — 3 krawędzie utwierdzone, 1 wolna
  - `two_adjacent_fixed` — 2 sąsiednie utwierdzone
  - `one_way` — wymuszenie jednokierunkowe

## Współczynniki momentów dla płyt dwukierunkowych

Metoda współczynników wg tablic (uproszczenie wg EC2, Annex I):

Dla płyty swobodnie podpartej:
```
m_x = α_x · q_Ed · lx²
m_y = α_y · q_Ed · lx²
```

Współczynniki α zależą od stosunku ly/lx i warunków podparcia.

## Grubości minimalne płyt

| Typ | h_min |
|-----|-------|
| Płyta jednokierunkowa | L/30 (swobodna), L/35 (ciągła) |
| Płyta dwukierunkowa | L/40 (swobodna), L/45 (ciągła) |

## Zbrojenie minimalne płyty

```
A_s,min = max(0.26 · f_ctm/f_yk · b · d, 0.0013 · b · d)
```
gdzie b = 1000 mm (na m.b. płyty)

## Maksymalny rozstaw prętów w płycie

- Kierunek główny: s_max = min(3h, 400mm) w obszarze max M
- Kierunek drugi: s_max = min(3.5h, 450mm)
