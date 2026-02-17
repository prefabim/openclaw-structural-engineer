#!/usr/bin/env python3
"""
Wymiarowanie słupa żelbetowego wg EC2.
PN-EN 1992-1-1, rozdział 5.8 (efekty II rzędu).

Oblicza:
- Smukłość i porównanie z λ_lim
- Mimośród I i II rzędu
- Wymagane zbrojenie podłużne
- Dobór strzemion

Użycie:
    python column_design.py --height_col 3.5 --width 0.40 --depth 0.40 \
        --N_Ed 1500 --M_Ed 80 --concrete C30_37 --steel B500SP --cover 30
"""

import argparse
import math
import sys

CONCRETE_GRADES = {
    "C20_25": {"fck": 20, "fctm": 2.21, "Ecm": 30000},
    "C25_30": {"fck": 25, "fctm": 2.56, "Ecm": 31000},
    "C30_37": {"fck": 30, "fctm": 2.90, "Ecm": 33000},
    "C35_45": {"fck": 35, "fctm": 3.21, "Ecm": 34000},
    "C40_50": {"fck": 40, "fctm": 3.51, "Ecm": 35000},
}

STEEL_GRADES = {
    "B500SP": {"fyk": 500, "Es": 200000},
    "B500A":  {"fyk": 500, "Es": 200000},
    "B500B":  {"fyk": 500, "Es": 200000},
}

GAMMA_C = 1.50
GAMMA_S = 1.15


def bar_area(dia):
    return math.pi * dia**2 / 4


def calculate_column(height_col, b, h, N_Ed, M_Ed, concrete, steel, cover, eff_length_factor):
    conc = CONCRETE_GRADES[concrete]
    st = STEEL_GRADES[steel]

    fck = conc["fck"]
    fcd = fck / GAMMA_C
    Ecm = conc["Ecm"]
    fyk = st["fyk"]
    fyd = fyk / GAMMA_S
    Es = st["Es"]

    b_mm = b * 1000
    h_mm = h * 1000
    Ac = b_mm * h_mm  # mm²

    main_bar_dia = 20  # założenie
    d_mm = h_mm - cover - 8 - main_bar_dia / 2  # otulina + strzemię + pręt/2
    d2_mm = cover + 8 + main_bar_dia / 2  # odl. zbrojenia ściskanego od krawędzi

    # ============================================================
    # 1. Smukłość
    # ============================================================
    l_0 = eff_length_factor * height_col * 1000  # długość wyboczeniowa [mm]
    i = h_mm / math.sqrt(12)  # promień bezwładności (prostokąt)
    lam = l_0 / i  # smukłość

    # Smukłość graniczna wg EC2 5.8.3.1
    n = N_Ed * 1000 / (Ac * fcd)  # siła względna
    A_coeff = 0.7   # uproszczenie (φ_ef nieznane)
    B_coeff = 1.1   # uproszczenie (ω nieznane)
    C_coeff = 0.7   # uproszczenie (r_m nieznane)

    lam_lim = 20 * A_coeff * B_coeff * C_coeff / math.sqrt(n) if n > 0 else 999

    second_order_needed = lam > lam_lim

    # ============================================================
    # 2. Mimośrody
    # ============================================================
    # Mimośród I rzędu
    e_1 = M_Ed * 1e6 / (N_Ed * 1000) if N_Ed > 0 else 0  # mm
    e_min = max(h_mm / 30, 20)  # mimośród minimalny wg EC2
    e_1 = max(e_1, e_min)

    # Mimośród od imperfekcji
    e_i = l_0 / 400  # mm (uproszczenie wg EC2 5.2)

    # Mimośród II rzędu (metoda nominalnej krzywizny wg EC2 5.8.8)
    e_2 = 0
    if second_order_needed:
        # Krzywizna 1/r
        n_u = 1 + (fyd * 0.01 * Ac) / (fcd * Ac)  # przybliżone ω=0.01 na start
        n_bal = 0.4  # przybliżenie
        K_r = min((n_u - n) / (n_u - n_bal), 1.0) if n_u > n_bal else 1.0
        K_r = max(K_r, 0)

        # Współczynnik pełzania
        K_phi = 1.0  # uproszczenie (brak danych o φ_ef)

        epsilon_yd = fyd / Es
        one_over_r_0 = epsilon_yd / (0.45 * d_mm)
        one_over_r = K_r * K_phi * one_over_r_0

        c_factor = 10  # π² ≈ 10 (EC2)
        e_2 = one_over_r * l_0**2 / c_factor

    # Mimośród całkowity
    e_tot = e_1 + e_i + e_2

    # Moment obliczeniowy z efektami II rzędu
    M_Ed_total = N_Ed * e_tot / 1000  # kNm

    # ============================================================
    # 3. Wymiarowanie zbrojenia
    # ============================================================
    # Metoda uproszczona — zbrojenie symetryczne
    # M_Ed_total = N_Ed · e_tot ≤ M_Rd = A_s · f_yd · (d - d2) + N_Ed · (h/2 - d2)
    # ... lub z diagramu interakcji

    # Uproszczone wymiarowanie (zbrojenie symetryczne, duży N_Ed):
    z_s = d_mm - d2_mm  # ramię zbrojenia

    # Nośność samego betonu
    N_Rd_c = fcd * b_mm * 0.8 * d_mm / 1000  # przybliżone, kN

    # Wymagane zbrojenie (metoda iteracyjna uproszczona)
    # Z równania równowagi dla ściskania mimośrodowego:
    # N_Ed · e_tot = A_s/2 · f_yd · z_s  (przybliżenie dla dużego N)
    As_total_from_moment = 2 * M_Ed_total * 1e6 / (fyd * z_s) if z_s > 0 else 0

    # Nośność na czyste ściskanie
    # N_Rd = A_c · f_cd + A_s · f_yd
    # A_s = (N_Ed - A_c · f_cd * reducton_for_eccentricity) / f_yd
    # Redukcja za mimośród:
    e_rel = e_tot / h_mm  # mimośród względny
    if e_rel < 0.1:
        # Prawie osiowe ściskanie
        As_from_N = max((N_Ed * 1000 - 0.85 * Ac * fcd) / fyd, 0)
        As_total = max(As_from_N, As_total_from_moment)
    else:
        As_total = As_total_from_moment

    # Zbrojenie minimalne i maksymalne
    As_min_1 = 0.10 * N_Ed * 1000 / fyd
    As_min_2 = 0.002 * Ac
    As_min = max(As_min_1, As_min_2)
    As_max = 0.04 * Ac

    As_required = max(As_total, As_min)
    As_required = min(As_required, As_max)  # cap at max

    # Dobór prętów (zbrojenie symetryczne — min 4 pręty narożne)
    proposals = []
    for dia in [16, 20, 25, 32]:
        for n_bars in range(4, 16, 2):  # parzysta liczba (symetria)
            As_prov = n_bars * bar_area(dia)
            if As_prov >= As_required:
                # Sprawdź max rozstaw
                n_per_side = n_bars // 2
                spacing = (b_mm - 2 * cover - 2 * 8 - dia) / max(n_per_side - 1, 1)
                if spacing >= max(dia, 20) and As_prov <= As_max:
                    proposals.append({
                        "n": n_bars,
                        "dia": dia,
                        "As_provided": round(As_prov, 1),
                        "ratio": As_prov / As_required,
                        "rho": round(As_prov / Ac * 100, 2),
                    })
                    break  # jeden wariant na średnicę

    proposals.sort(key=lambda p: p["ratio"])
    proposals = proposals[:4]

    # Strzemiona
    if proposals:
        main_dia = proposals[0]["dia"]
    else:
        main_dia = 20
    stirrup_dia = max(6, math.ceil(main_dia / 4))
    stirrup_dia = max(stirrup_dia, 8)  # praktyczne minimum
    stirrup_spacing = min(20 * main_dia, b_mm, h_mm, 400)
    stirrup_spacing = int(math.floor(stirrup_spacing / 10) * 10)

    return {
        "height_col": height_col, "b": b, "h": h,
        "N_Ed": N_Ed, "M_Ed": M_Ed,
        "concrete": concrete, "steel": steel, "cover": cover,
        "fcd": round(fcd, 2), "fyd": round(fyd, 1),
        "l_0": round(l_0, 0), "lam": round(lam, 1), "lam_lim": round(lam_lim, 1),
        "second_order_needed": second_order_needed,
        "n": round(n, 3),
        "e_1": round(e_1, 1), "e_i": round(e_i, 1), "e_2": round(e_2, 1),
        "e_tot": round(e_tot, 1),
        "M_Ed_total": round(M_Ed_total, 2),
        "As_required": round(As_required, 1),
        "As_min": round(As_min, 1), "As_max": round(As_max, 1),
        "proposals": proposals,
        "stirrup_dia": stirrup_dia,
        "stirrup_spacing": stirrup_spacing,
        "eff_length_factor": eff_length_factor,
    }


def format_report(r):
    lines = [
        "# Nota obliczeniowa — Słup żelbetowy",
        "## Wymiarowanie wg PN-EN 1992-1-1 (EC2), rozdz. 5.8",
        "",
        "## 1. Dane wejściowe",
        "",
        f"| Parametr | Wartość |",
        f"|----------|---------|",
        f"| Wysokość słupa | {r['height_col']:.2f} m |",
        f"| Przekrój b × h | {r['b']*100:.0f} × {r['h']*100:.0f} cm |",
        f"| N_Ed | {r['N_Ed']:.1f} kN |",
        f"| M_Ed (I rząd) | {r['M_Ed']:.1f} kNm |",
        f"| Beton | {r['concrete'].replace('_','/')} (f_cd = {r['fcd']} MPa) |",
        f"| Stal | {r['steel']} (f_yd = {r['fyd']} MPa) |",
        f"| Wsp. dł. wyboczeniowej | {r['eff_length_factor']} |",
        "",
        "## 2. Smukłość",
        "",
        f"l_0 = {r['eff_length_factor']} × {r['height_col']*1000:.0f} = **{r['l_0']:.0f} mm**",
        f"λ = l_0 / i = **{r['lam']:.1f}**",
        f"λ_lim = **{r['lam_lim']:.1f}** (n = {r['n']:.3f})",
        "",
        f"Sprawdzenie: λ = {r['lam']:.1f} {'>' if r['second_order_needed'] else '≤'} λ_lim = {r['lam_lim']:.1f} → "
        f"{'⚠️ **Efekty II rzędu wymagane**' if r['second_order_needed'] else '✅ Efekty II rzędu pominięte'}",
        "",
        "## 3. Mimośrody",
        "",
        f"| Składowa | Wartość [mm] |",
        f"|----------|-------------|",
        f"| e₁ (I rząd) | {r['e_1']:.1f} |",
        f"| eᵢ (imperfekcje) | {r['e_i']:.1f} |",
        f"| e₂ (II rząd) | {r['e_2']:.1f} |",
        f"| **e_tot** | **{r['e_tot']:.1f}** |",
        "",
        f"M_Ed,total = N_Ed × e_tot = {r['N_Ed']:.0f} × {r['e_tot']:.1f}/1000 = **{r['M_Ed_total']:.2f} kNm**",
        "",
        "## 4. Zbrojenie podłużne",
        "",
        f"Wymagane A_s = **{r['As_required']:.1f} mm²**",
        f"A_s,min = {r['As_min']:.1f} mm², A_s,max = {r['As_max']:.1f} mm²",
        "",
        "| Propozycja | A_s [mm²] | ρ [%] | Zapas |",
        "|-----------|----------|------|-------|",
    ]

    for i, p in enumerate(r["proposals"]):
        marker = " ← zalecane" if i == 0 else ""
        lines.append(f"| {p['n']}ø{p['dia']} | {p['As_provided']:.1f} | {p['rho']}% | {(p['ratio']-1)*100:.1f}% |{marker}")

    lines.extend([
        "",
        "## 5. Strzemiona",
        "",
        f"**ø{r['stirrup_dia']} co {r['stirrup_spacing']} mm**",
        "",
        "---",
        "",
        "⚠️ *Obliczenia mają charakter pomocniczy. Zastosowano uproszczoną metodę wymiarowania. Wymagana weryfikacja przez uprawnionego projektanta.*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Wymiarowanie słupa żelbetowego wg EC2")
    parser.add_argument("--height_col", type=float, required=True, help="Wysokość słupa [m]")
    parser.add_argument("--width", type=float, required=True, help="Szerokość b [m]")
    parser.add_argument("--depth", type=float, required=True, help="Głębokość h [m]")
    parser.add_argument("--N_Ed", type=float, required=True, help="Siła ściskająca [kN]")
    parser.add_argument("--M_Ed", type=float, default=0, help="Moment I rzędu [kNm]")
    parser.add_argument("--concrete", type=str, default="C30_37")
    parser.add_argument("--steel", type=str, default="B500SP")
    parser.add_argument("--cover", type=float, default=30)
    parser.add_argument("--eff_length_factor", type=float, default=1.0,
                        help="Współczynnik długości wyboczeniowej")

    args = parser.parse_args()
    result = calculate_column(
        height_col=args.height_col, b=args.width, h=args.depth,
        N_Ed=args.N_Ed, M_Ed=args.M_Ed,
        concrete=args.concrete, steel=args.steel,
        cover=args.cover, eff_length_factor=args.eff_length_factor,
    )
    print(format_report(result))


if __name__ == "__main__":
    main()
