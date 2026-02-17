---
name: ec2-columns
description: Wymiarowanie słupów żelbetowych wg Eurokodu 2 (EC2). Ściskanie z uwzględnieniem wyboczenia (efektów II rzędu).
---

# EC2 — Słupy żelbetowe

Skill do wymiarowania słupów żelbetowych wg PN-EN 1992-1-1 (Eurokod 2), rozdział 5.8.

## Kiedy używać

- Wymiarowanie słupa żelbetowego na ściskanie osiowe lub mimośrodowe
- Sprawdzenie smukłości i konieczności uwzględnienia efektów II rzędu
- Dobór zbrojenia podłużnego i strzemion

## Dostępne skrypty

### 1. `scripts/column_design.py` — Wymiarowanie słupa żelbetowego

```bash
python scripts/column_design.py \
  --height_col 3.5 \
  --width 0.40 \
  --depth 0.40 \
  --N_Ed 1500 \
  --M_Ed 80 \
  --concrete C30_37 \
  --steel B500SP \
  --cover 30 \
  --eff_length_factor 1.0
```

Parametry:
- `--height_col` — wysokość słupa [m]
- `--width` — wymiar b [m]
- `--depth` — wymiar h [m] (w kierunku zginania)
- `--N_Ed` — siła ściskająca obliczeniowa [kN]
- `--M_Ed` — moment zginający I rzędu [kNm]
- `--concrete` — klasa betonu
- `--steel` — klasa stali
- `--cover` — otulina [mm]
- `--eff_length_factor` — współczynnik długości wyboczeniowej (0.5-2.0)

## Smukłość i efekty II rzędu

### Smukłość graniczna (EC2 5.8.3.1)
```
λ_lim = 20 · A · B · C / √n
```
gdzie:
- A = 1/(1+0.2·φ_ef) ≈ 0.7 (jeśli φ_ef nieznane)
- B = √(1+2ω) ≈ 1.1
- C = 1.7 - r_m (r_m = stosunek momentów) ≈ 0.7
- n = N_Ed / (A_c · f_cd)

### Metoda nominalnej sztywności (EC2 5.8.7)
Uproszczona metoda dla słupów w ramach.

## Zbrojenie słupów

### Minimalne
```
A_s,min = max(0.10 · N_Ed / f_yd, 0.002 · A_c)
```

### Maksymalne
```
A_s,max = 0.04 · A_c (0.08 na zakładach)
```

### Strzemiona
- ø_sw ≥ max(6mm, ø_podłużne / 4)
- Rozstaw: s ≤ min(20·ø_min_podł, b, h, 400mm)
