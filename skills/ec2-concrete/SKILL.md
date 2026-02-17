---
name: ec2-concrete
description: Wymiarowanie elementów żelbetowych wg Eurokodu 2 (EC2). Obliczenia zginania, ścinania i sprawdzenia SLS.
---

# EC2 — Konstrukcje żelbetowe

Skill do wymiarowania elementów żelbetowych wg PN-EN 1992-1-1 (Eurokod 2).

## Kiedy używać

- Wymiarowanie belki żelbetowej na zginanie lub ścinanie
- Sprawdzenie stanów granicznych użytkowalności (ugięcia, zarysowanie)
- Dobór zbrojenia dla płyty, belki, słupa żelbetowego
- Obliczenia wg EC2 z polskim załącznikiem krajowym (NA)

## Dostępne skrypty

### 1. `scripts/beam_bending.py` — Zginanie belki prostopodpartej

Oblicza wymagane zbrojenie dolne (rozciągane) dla belki prostopodpartej o przekroju prostokątnym.

```bash
python scripts/beam_bending.py \
  --span 6.0 \
  --width 0.30 \
  --height 0.60 \
  --g 15.0 \
  --q 10.0 \
  --concrete C30_37 \
  --steel B500SP \
  --cover 35
```

Parametry:
- `--span` — rozpiętość w świetle [m]
- `--width` — szerokość przekroju b [m]
- `--height` — wysokość przekroju h [m]
- `--g` — obciążenie stałe charakterystyczne [kN/m]
- `--q` — obciążenie zmienne charakterystyczne [kN/m]
- `--concrete` — klasa betonu (C20_25, C25_30, C30_37, C35_45, C40_50)
- `--steel` — klasa stali (B500SP, B500A, B500B)
- `--cover` — otulina nominalna [mm] (domyślnie 35)

Output: nota obliczeniowa z doborem zbrojenia, sprawdzeniem μ < μ_lim, propozycją prętów.

### 2. `scripts/beam_shear.py` — Ścinanie belki

Oblicza nośność na ścinanie i projektuje strzemiona.

```bash
python scripts/beam_shear.py \
  --width 0.30 \
  --d_eff 0.555 \
  --V_Ed 180.0 \
  --concrete C30_37 \
  --steel B500SP
```

### 3. `scripts/sls_checks.py` — Sprawdzenia SLS

Weryfikacja ugięć i szerokości rys.

## Klasy betonu — parametry wg EC2

| Klasa   | f_ck [MPa] | f_cd [MPa] | f_ctm [MPa] | E_cm [GPa] |
|---------|-----------|-----------|-------------|-----------|
| C20/25  | 20        | 13.33     | 2.21        | 30.0      |
| C25/30  | 25        | 16.67     | 2.56        | 31.0      |
| C30/37  | 30        | 20.00     | 2.90        | 33.0      |
| C35/45  | 35        | 23.33     | 3.21        | 34.0      |
| C40/50  | 40        | 26.67     | 3.51        | 35.0      |

## Stal zbrojeniowa

| Klasa   | f_yk [MPa] | f_yd [MPa] | E_s [GPa] |
|---------|-----------|-----------|----------|
| B500SP  | 500       | 434.8     | 200      |
| B500A   | 500       | 434.8     | 200      |
| B500B   | 500       | 434.8     | 200      |

## Wzory kluczowe

### Zginanie — metoda uproszczona
```
μ = M_Ed / (b · d² · f_cd)
ξ = 1 - √(1 - 2μ)
A_s = ξ · b · d · f_cd / f_yd
```

### Sprawdzenie: μ ≤ μ_lim
Dla B500: ξ_lim = 0.494, μ_lim ≈ 0.372
Jeśli μ > μ_lim → zbrojenie podwójne lub zmiana przekroju.

### Minimalne zbrojenie
```
A_s,min = max(0.26 · f_ctm/f_yk · b · d, 0.0013 · b · d)
```
