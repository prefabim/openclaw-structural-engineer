#!/usr/bin/env python3
"""
Wymiarowanie płyty żelbetowej wg EC2.
Obsługuje płyty jedno- i dwukierunkowo zbrojone.

Metoda współczynników momentów dla płyt dwukierunkowych
(tablice wg Pigeaud / metoda paskowa / EC2 Annex).

Użycie:
    python slab_design.py --lx 5.0 --ly 7.0 --thickness 0.20 \
        --g 7.5 --q 3.0 --concrete C30_37 --steel B500SP --cover 25
"""

import argparse
import math
import sys

# ============================================================
# Materiały
# ============================================================
CONCRETE_GRADES = {
    "C20_25": {"fck": 20, "fctm": 2.21},
    "C25_30": {"fck": 25, "fctm": 2.56},
    "C30_37": {"fck": 30, "fctm": 2.90},
    "C35_45": {"fck": 35, "fctm": 3.21},
    "C40_50": {"fck": 40, "fctm": 3.51},
}

STEEL_GRADES = {
    "B500SP": {"fyk": 500, "Es": 200000},
    "B500A":  {"fyk": 500, "Es": 200000},
    "B500B":  {"fyk": 500, "Es": 200000},
}

GAMMA_C = 1.50
GAMMA_S = 1.15
GAMMA_G = 1.35
GAMMA_Q = 1.50

# ============================================================
# Współczynniki momentów dla płyt dwukierunkowych
# Klucz: (support_type, ly/lx zaokrąglone do 0.1)
# Wartości: (alpha_x_field, alpha_y_field, alpha_x_support, alpha_y_support)
# Uproszczone tablice wg standardowej metody współczynników
# ============================================================

# Współczynniki α dla płyt swobodnie podpartych na 4 krawędziach
COEFF_SIMPLY_SUPPORTED = {
    1.0: (0.0625, 0.0625),
    1.1: (0.0698, 0.0571),
    1.2: (0.0769, 0.0520),
    1.3: (0.0833, 0.0474),
    1.4: (0.0892, 0.0432),
    1.5: (0.0948, 0.0393),
    1.6: (0.0996, 0.0360),
    1.7: (0.1040, 0.0331),
    1.8: (0.1080, 0.0305),
    1.9: (0.1112, 0.0283),
    2.0: (0.1140, 0.0264),
}

# Współczynniki dla płyt utwierdzonych na 4 krawędziach
COEFF_ALL_FIXED = {
    1.0: (0.0340, 0.0340),
    1.1: (0.0398, 0.0310),
    1.2: (0.0452, 0.0284),
    1.3: (0.0501, 0.0262),
    1.4: (0.0545, 0.0243),
    1.5: (0.0585, 0.0227),
    1.6: (0.0620, 0.0213),
    1.7: (0.0650, 0.0202),
    1.8: (0.0676, 0.0192),
    1.9: (0.0699, 0.0184),
    2.0: (0.0718, 0.0177),
}


def interpolate_coeff(table, ratio):
    """Interpoluj współczynniki dla danego ly/lx."""
    ratio = min(max(ratio, 1.0), 2.0)
    r_low = round(math.floor(ratio * 10) / 10, 1)
    r_high = round(math.ceil(ratio * 10) / 10, 1)

    if r_low == r_high or r_low not in table:
        r_key = round(ratio, 1)
        if r_key in table:
            return table[r_key]
        return table[min(table.keys(), key=lambda k: abs(k - ratio))]

    c_low = table[r_low]
    c_high = table[r_high]
    t = (ratio - r_low) / (r_high - r_low) if r_high != r_low else 0

    return tuple(c_low[i] + t * (c_high[i] - c_low[i]) for i in range(len(c_low)))


def bar_area(dia):
    return math.pi * dia**2 / 4


def select_reinforcement(As_req_per_m, h_mm, direction="main"):
    """Dobierz zbrojenie na m.b. płyty."""
    proposals = []
    max_spacing = min(3 * h_mm, 400) if direction == "main" else min(3.5 * h_mm, 450)

    for dia in [8, 10, 12, 16, 20]:
        area_one = bar_area(dia)
        # Rozstaw
        spacing = area_one * 1000 / As_req_per_m  # mm (na 1m = 1000mm)

        if spacing > max_spacing:
            spacing = max_spacing

        spacing_round = math.floor(spacing / 10) * 10  # zaokrąglij w dół do 10mm
        spacing_round = max(spacing_round, max(dia + 5, 50))

        n_bars = math.ceil(1000 / spacing_round)
        As_provided = n_bars * area_one

        if As_provided >= As_req_per_m and spacing_round >= 50:
            proposals.append({
                "dia": dia,
                "spacing": spacing_round,
                "As_provided": round(As_provided, 1),
                "ratio": As_provided / As_req_per_m,
            })

    proposals.sort(key=lambda p: p["ratio"])
    return proposals[:4]


def calculate_slab(lx, ly, thickness, g, q, concrete, steel, cover, support_type):
    conc = CONCRETE_GRADES[concrete]
    st = STEEL_GRADES[steel]

    fck = conc["fck"]
    fctm = conc["fctm"]
    fcd = fck / GAMMA_C
    fyk = st["fyk"]
    fyd = fyk / GAMMA_S

    h_mm = thickness * 1000
    main_bar_dia = 10  # założenie
    d_mm = h_mm - cover - main_bar_dia / 2
    d2_mm = h_mm - cover - main_bar_dia - main_bar_dia / 2  # drugi kierunek

    ratio = ly / lx

    # Obciążenie obliczeniowe [kN/m²]
    q_Ed = GAMMA_G * g + GAMMA_Q * q

    # Określ typ płyty
    is_one_way = ratio > 2.0 or support_type == "one_way"

    results = {
        "lx": lx, "ly": ly, "thickness": thickness,
        "g": g, "q": q, "concrete": concrete, "steel": steel,
        "cover": cover, "ratio": round(ratio, 2),
        "q_Ed": round(q_Ed, 2),
        "fcd": round(fcd, 2), "fyd": round(fyd, 1),
        "d_x": round(d_mm, 1), "d_y": round(d2_mm, 1),
        "is_one_way": is_one_way,
        "h_mm": h_mm,
    }

    if is_one_way:
        # Płyta jednokierunkowa — traktuj jak belkę o szer. 1m
        # Moment w przęśle (swobodnie podparta)
        if support_type in ("all_fixed", "two_adjacent_fixed"):
            M_Ed_span = q_Ed * lx**2 / 16  # przybliżone dla ciągłej
            M_Ed_support = q_Ed * lx**2 / 12
        else:
            M_Ed_span = q_Ed * lx**2 / 8
            M_Ed_support = 0

        # Wymiarowanie na m.b. (b=1000mm)
        b = 1000
        mu_span = M_Ed_span * 1e6 / (b * d_mm**2 * fcd)
        xi_span = 1 - math.sqrt(1 - 2 * mu_span) if mu_span < 0.5 else 0.5
        As_span = xi_span * b * d_mm * fcd / fyd

        As_min = max(0.26 * fctm / fyk * b * d_mm, 0.0013 * b * d_mm)
        As_span = max(As_span, As_min)

        # Zbrojenie poprzeczne (rozdzielcze) — min 20% zbrojenia głównego
        As_transverse = max(0.2 * As_span, As_min)

        results.update({
            "M_Ed_span_x": round(M_Ed_span, 2),
            "M_Ed_support_x": round(M_Ed_support, 2),
            "mu_span": round(mu_span, 4),
            "As_span_x": round(As_span, 1),
            "As_transverse": round(As_transverse, 1),
            "As_min": round(As_min, 1),
            "reinf_span_x": select_reinforcement(As_span, h_mm, "main"),
            "reinf_transverse": select_reinforcement(As_transverse, h_mm, "secondary"),
        })

        if M_Ed_support > 0:
            mu_sup = M_Ed_support * 1e6 / (b * d_mm**2 * fcd)
            xi_sup = 1 - math.sqrt(1 - 2 * mu_sup) if mu_sup < 0.5 else 0.5
            As_sup = max(xi_sup * b * d_mm * fcd / fyd, As_min)
            results.update({
                "As_support_x": round(As_sup, 1),
                "reinf_support_x": select_reinforcement(As_sup, h_mm, "main"),
            })

    else:
        # Płyta dwukierunkowa
        if support_type == "all_fixed":
            coeffs = interpolate_coeff(COEFF_ALL_FIXED, ratio)
        else:
            coeffs = interpolate_coeff(COEFF_SIMPLY_SUPPORTED, ratio)

        alpha_x = coeffs[0]
        alpha_y = coeffs[1]

        M_Ed_x = alpha_x * q_Ed * lx**2  # kNm/m
        M_Ed_y = alpha_y * q_Ed * lx**2  # kNm/m

        # Zbrojenie dla podpory (utwierdzonej) — przybliżenie 1.33× przęsło
        M_Ed_x_sup = 0
        M_Ed_y_sup = 0
        if support_type == "all_fixed":
            M_Ed_x_sup = 1.33 * M_Ed_x
            M_Ed_y_sup = 1.33 * M_Ed_y

        # Wymiarowanie kierunek X (na m.b.)
        b = 1000
        mu_x = M_Ed_x * 1e6 / (b * d_mm**2 * fcd)
        xi_x = 1 - math.sqrt(1 - 2 * mu_x) if mu_x < 0.5 else 0.5
        As_x = xi_x * b * d_mm * fcd / fyd

        mu_y = M_Ed_y * 1e6 / (b * d2_mm**2 * fcd)
        xi_y = 1 - math.sqrt(1 - 2 * mu_y) if mu_y < 0.5 else 0.5
        As_y = xi_y * b * d2_mm * fcd / fyd

        As_min = max(0.26 * fctm / fyk * b * d_mm, 0.0013 * b * d_mm)
        As_x = max(As_x, As_min)
        As_y = max(As_y, As_min)

        results.update({
            "alpha_x": round(alpha_x, 4),
            "alpha_y": round(alpha_y, 4),
            "M_Ed_x": round(M_Ed_x, 2),
            "M_Ed_y": round(M_Ed_y, 2),
            "M_Ed_x_sup": round(M_Ed_x_sup, 2),
            "M_Ed_y_sup": round(M_Ed_y_sup, 2),
            "mu_x": round(mu_x, 4),
            "mu_y": round(mu_y, 4),
            "As_x": round(As_x, 1),
            "As_y": round(As_y, 1),
            "As_min": round(As_min, 1),
            "reinf_x": select_reinforcement(As_x, h_mm, "main"),
            "reinf_y": select_reinforcement(As_y, h_mm, "main"),
        })

        if M_Ed_x_sup > 0:
            mu_xs = M_Ed_x_sup * 1e6 / (b * d_mm**2 * fcd)
            xi_xs = 1 - math.sqrt(1 - 2 * mu_xs) if mu_xs < 0.5 else 0.5
            As_x_sup = max(xi_xs * b * d_mm * fcd / fyd, As_min)
            mu_ys = M_Ed_y_sup * 1e6 / (b * d2_mm**2 * fcd)
            xi_ys = 1 - math.sqrt(1 - 2 * mu_ys) if mu_ys < 0.5 else 0.5
            As_y_sup = max(xi_ys * b * d2_mm * fcd / fyd, As_min)
            results.update({
                "As_x_sup": round(As_x_sup, 1),
                "As_y_sup": round(As_y_sup, 1),
                "reinf_x_sup": select_reinforcement(As_x_sup, h_mm, "main"),
                "reinf_y_sup": select_reinforcement(As_y_sup, h_mm, "main"),
            })

    # Sprawdzenie ugięć — metoda uproszczona wg EC2 7.4.2
    rho = As_span / (b * d_mm) if is_one_way else max(As_x, As_y) / (b * d_mm)
    rho_0 = 1e-3 * math.sqrt(fck)
    K = 1.3 if support_type in ("all_fixed",) else 1.0

    if rho <= rho_0:
        Ld_basic = K * (11 + 1.5 * math.sqrt(fck) * rho_0 / rho)
    else:
        Ld_basic = K * (11 + 1.5 * math.sqrt(fck) * rho_0 / (rho - rho_0))
    Ld_basic = min(Ld_basic, 40 * K)  # ograniczenie

    L_eff = lx if is_one_way else min(lx, ly)
    Ld_actual = L_eff * 1000 / d_mm
    deflection_ok = Ld_actual <= Ld_basic

    results.update({
        "Ld_basic": round(Ld_basic, 1),
        "Ld_actual": round(Ld_actual, 1),
        "deflection_ok": deflection_ok,
    })

    return results


def format_report(r):
    slab_type = "jednokierunkowo zbrojona" if r["is_one_way"] else "dwukierunkowo zbrojona"
    lines = [
        f"# Nota obliczeniowa — Płyta żelbetowa ({slab_type})",
        "## Wymiarowanie wg PN-EN 1992-1-1 (EC2)",
        "",
        "## 1. Dane wejściowe",
        "",
        f"| Parametr | Wartość |",
        f"|----------|---------|",
        f"| Wymiar lx | {r['lx']:.2f} m |",
        f"| Wymiar ly | {r['ly']:.2f} m |",
        f"| ly/lx | {r['ratio']:.2f} {'(> 2.0 → jednokierunkowa)' if r['is_one_way'] else ''} |",
        f"| Grubość h | {r['thickness']*100:.0f} cm |",
        f"| g_k | {r['g']:.1f} kN/m² |",
        f"| q_k | {r['q']:.1f} kN/m² |",
        f"| Beton | {r['concrete'].replace('_','/')} |",
        f"| Stal | {r['steel']} |",
        "",
        "## 2. Obciążenie obliczeniowe",
        "",
        f"q_Ed = {GAMMA_G}×{r['g']:.1f} + {GAMMA_Q}×{r['q']:.1f} = **{r['q_Ed']} kN/m²**",
        "",
    ]

    if r["is_one_way"]:
        lines.extend([
            "## 3. Momenty zginające (na m.b.)",
            "",
            f"M_Ed (przęsło) = **{r['M_Ed_span_x']:.2f} kNm/m**",
        ])
        if r.get("M_Ed_support_x", 0) > 0:
            lines.append(f"M_Ed (podpora) = **{r['M_Ed_support_x']:.2f} kNm/m**")
        lines.extend([
            "",
            "## 4. Zbrojenie główne (kierunek lx)",
            "",
            f"Wymagane A_s = **{r['As_span_x']:.1f} mm²/m** (min: {r['As_min']:.1f} mm²/m)",
            "",
            "| Propozycja | A_s [mm²/m] | Zapas |",
            "|-----------|-----------|-------|",
        ])
        for i, p in enumerate(r.get("reinf_span_x", [])):
            marker = " ← zalecane" if i == 0 else ""
            lines.append(f"| ø{p['dia']}/{p['spacing']} | {p['As_provided']:.1f} | {(p['ratio']-1)*100:.1f}% |{marker}")

        lines.extend([
            "",
            "## 5. Zbrojenie rozdzielcze (kierunek ly)",
            "",
            f"Wymagane A_s = **{r['As_transverse']:.1f} mm²/m**",
            "",
            "| Propozycja | A_s [mm²/m] | Zapas |",
            "|-----------|-----------|-------|",
        ])
        for i, p in enumerate(r.get("reinf_transverse", [])):
            marker = " ← zalecane" if i == 0 else ""
            lines.append(f"| ø{p['dia']}/{p['spacing']} | {p['As_provided']:.1f} | {(p['ratio']-1)*100:.1f}% |{marker}")

    else:
        lines.extend([
            "## 3. Momenty zginające (metoda współczynników)",
            "",
            f"α_x = {r['alpha_x']:.4f}, α_y = {r['alpha_y']:.4f}",
            "",
            f"M_Ed,x = α_x · q_Ed · lx² = {r['alpha_x']:.4f} × {r['q_Ed']} × {r['lx']}² = **{r['M_Ed_x']:.2f} kNm/m**",
            f"M_Ed,y = α_y · q_Ed · lx² = {r['alpha_y']:.4f} × {r['q_Ed']} × {r['lx']}² = **{r['M_Ed_y']:.2f} kNm/m**",
        ])
        if r.get("M_Ed_x_sup", 0) > 0:
            lines.extend([
                "",
                f"M_Ed,x (podpora) = **{r['M_Ed_x_sup']:.2f} kNm/m**",
                f"M_Ed,y (podpora) = **{r['M_Ed_y_sup']:.2f} kNm/m**",
            ])

        lines.extend([
            "",
            "## 4. Zbrojenie — kierunek X (przęsło)",
            "",
            f"Wymagane A_s,x = **{r['As_x']:.1f} mm²/m** (min: {r['As_min']:.1f} mm²/m)",
            "",
            "| Propozycja | A_s [mm²/m] | Zapas |",
            "|-----------|-----------|-------|",
        ])
        for i, p in enumerate(r.get("reinf_x", [])):
            marker = " ← zalecane" if i == 0 else ""
            lines.append(f"| ø{p['dia']}/{p['spacing']} | {p['As_provided']:.1f} | {(p['ratio']-1)*100:.1f}% |{marker}")

        lines.extend([
            "",
            "## 5. Zbrojenie — kierunek Y (przęsło)",
            "",
            f"Wymagane A_s,y = **{r['As_y']:.1f} mm²/m** (min: {r['As_min']:.1f} mm²/m)",
            "",
            "| Propozycja | A_s [mm²/m] | Zapas |",
            "|-----------|-----------|-------|",
        ])
        for i, p in enumerate(r.get("reinf_y", [])):
            marker = " ← zalecane" if i == 0 else ""
            lines.append(f"| ø{p['dia']}/{p['spacing']} | {p['As_provided']:.1f} | {(p['ratio']-1)*100:.1f}% |{marker}")

    # Ugięcia
    lines.extend([
        "",
        "## 6. Sprawdzenie ugięć (metoda uproszczona wg EC2 7.4.2)",
        "",
        f"L/d dopuszczalne = {r['Ld_basic']:.1f}",
        f"L/d rzeczywiste = {r['Ld_actual']:.1f}",
        f"Sprawdzenie: {r['Ld_actual']:.1f} {'≤' if r['deflection_ok'] else '>'} {r['Ld_basic']:.1f} → {'✅ OK' if r['deflection_ok'] else '❌ Zwiększ grubość płyty!'}",
        "",
        "---",
        "",
        "⚠️ *Obliczenia mają charakter pomocniczy. Wymagana weryfikacja przez uprawnionego projektanta.*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Wymiarowanie płyty żelbetowej wg EC2")
    parser.add_argument("--lx", type=float, required=True, help="Krótszy wymiar [m]")
    parser.add_argument("--ly", type=float, required=True, help="Dłuższy wymiar [m]")
    parser.add_argument("--thickness", type=float, required=True, help="Grubość h [m]")
    parser.add_argument("--g", type=float, required=True, help="Obciążenie stałe [kN/m²]")
    parser.add_argument("--q", type=float, required=True, help="Obciążenie zmienne [kN/m²]")
    parser.add_argument("--concrete", type=str, default="C30_37")
    parser.add_argument("--steel", type=str, default="B500SP")
    parser.add_argument("--cover", type=float, default=25)
    parser.add_argument("--support_type", type=str, default="simply_supported",
                        choices=["simply_supported", "all_fixed", "three_fixed_one_free",
                                 "two_adjacent_fixed", "one_way"])

    args = parser.parse_args()
    result = calculate_slab(
        lx=args.lx, ly=args.ly, thickness=args.thickness,
        g=args.g, q=args.q, concrete=args.concrete, steel=args.steel,
        cover=args.cover, support_type=args.support_type,
    )
    print(format_report(result))


if __name__ == "__main__":
    main()
