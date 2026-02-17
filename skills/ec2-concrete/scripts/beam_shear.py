#!/usr/bin/env python3
"""
Wymiarowanie belki żelbetowej na ścinanie wg EC2.
PN-EN 1992-1-1, rozdział 6.2.

Oblicza:
- Nośność na ścinanie bez zbrojenia V_Rd,c
- Wymagane strzemiona (jeśli V_Ed > V_Rd,c)
- Sprawdzenie nośności krzyżulca betonowego V_Rd,max

Użycie:
    python beam_shear.py --width 0.30 --d_eff 0.555 \
        --V_Ed 180.0 --concrete C30_37 --steel B500SP
"""

import argparse
import math
import sys

CONCRETE_GRADES = {
    "C20_25": {"fck": 20, "fctm": 2.21},
    "C25_30": {"fck": 25, "fctm": 2.56},
    "C30_37": {"fck": 30, "fctm": 2.90},
    "C35_45": {"fck": 35, "fctm": 3.21},
    "C40_50": {"fck": 40, "fctm": 3.51},
    "C45_55": {"fck": 45, "fctm": 3.80},
    "C50_60": {"fck": 50, "fctm": 4.07},
}

STEEL_GRADES = {
    "B500SP": {"fyk": 500},
    "B500A":  {"fyk": 500},
    "B500B":  {"fyk": 500},
    "B400":   {"fyk": 400},
}

GAMMA_C = 1.50
GAMMA_S = 1.15


def calculate_shear(
    b: float,         # szerokość [m]
    d: float,         # wysokość użyteczna [m]
    V_Ed: float,      # siła poprzeczna obliczeniowa [kN]
    concrete: str,
    steel: str,
    As_l: float = 0,  # zbrojenie podłużne rozciągane [mm²] (opcjonalnie)
    theta_deg: float = 45,  # kąt krzyżulca ściskanego [°]
) -> dict:

    conc = CONCRETE_GRADES[concrete]
    st = STEEL_GRADES[steel]

    fck = conc["fck"]
    fcd = fck / GAMMA_C
    fyk = st["fyk"]
    fywd = fyk / GAMMA_S

    b_mm = b * 1000
    d_mm = d * 1000
    V_Ed_N = V_Ed * 1000  # N

    # ============================================================
    # Nośność bez zbrojenia na ścinanie (6.2.2)
    # ============================================================
    k = min(1 + math.sqrt(200 / d_mm), 2.0)
    rho_l = min(As_l / (b_mm * d_mm), 0.02) if As_l > 0 else 0.0

    C_Rd_c = 0.18 / GAMMA_C
    k1 = 0.15
    sigma_cp = 0  # brak sprężenia

    V_Rd_c = (C_Rd_c * k * (100 * rho_l * fck) ** (1/3) + k1 * sigma_cp) * b_mm * d_mm / 1000  # kN

    # Minimalna nośność
    v_min = 0.035 * k ** 1.5 * fck ** 0.5
    V_Rd_c_min = v_min * b_mm * d_mm / 1000  # kN
    V_Rd_c = max(V_Rd_c, V_Rd_c_min)

    needs_shear_reinf = V_Ed > V_Rd_c

    # ============================================================
    # Wymiarowanie strzemion (6.2.3)
    # ============================================================
    theta = math.radians(theta_deg)
    cot_theta = 1 / math.tan(theta)
    alpha_cw = 1.0  # brak sprężenia
    nu_1 = 0.6 * (1 - fck / 250)

    # Nośność krzyżulca betonowego
    V_Rd_max = alpha_cw * b_mm * 0.9 * d_mm * nu_1 * fcd * (cot_theta / (1 + cot_theta**2)) / 1000  # kN

    # Wymagane strzemiona
    Asw_s = 0  # mm²/mm
    s_required = 0
    stirrup_dia = 0
    n_legs = 2

    if needs_shear_reinf:
        Asw_s = V_Ed_N / (0.9 * d_mm * fywd * cot_theta)  # mm²/mm

        # Dobór strzemion
        for dia in [8, 10, 12]:
            area_stirrup = n_legs * math.pi * dia**2 / 4
            s = area_stirrup / Asw_s
            s_max = min(0.75 * d_mm, 600)  # EC2 9.2.2

            if s <= s_max:
                stirrup_dia = dia
                s_required = math.floor(s / 10) * 10  # zaokrąglij w dół do 10mm
                s_required = max(s_required, 50)  # min 50mm
                break
        else:
            stirrup_dia = 12
            area_stirrup = n_legs * math.pi * 12**2 / 4
            s_required = math.floor(area_stirrup / Asw_s / 10) * 10

    # Strzemiona minimalne wg EC2 9.2.2
    rho_w_min = 0.08 * math.sqrt(fck) / fyk
    Asw_s_min = rho_w_min * b_mm  # mm²/mm × mm = mm²/mm ... per m

    return {
        "b": b,
        "d": d,
        "V_Ed": V_Ed,
        "concrete": concrete,
        "steel": steel,
        "fck": fck,
        "fcd": round(fcd, 2),
        "fywd": round(fywd, 1),
        "k": round(k, 3),
        "V_Rd_c": round(V_Rd_c, 1),
        "V_Rd_max": round(V_Rd_max, 1),
        "needs_shear_reinf": needs_shear_reinf,
        "theta_deg": theta_deg,
        "Asw_s": round(Asw_s, 4),
        "stirrup_dia": stirrup_dia,
        "n_legs": n_legs,
        "s_required": s_required,
        "safe": V_Ed <= V_Rd_max,
    }


def format_report(r: dict) -> str:
    lines = [
        "# Nota obliczeniowa — Belka żelbetowa (ścinanie)",
        "## Wymiarowanie wg PN-EN 1992-1-1 (EC2), rozdz. 6.2",
        "",
        "## 1. Dane wejściowe",
        "",
        f"| Parametr | Wartość |",
        f"|----------|---------|",
        f"| Szerokość b | {r['b']*100:.0f} cm |",
        f"| Wys. użyteczna d | {r['d']*100:.1f} cm |",
        f"| V_Ed | {r['V_Ed']:.1f} kN |",
        f"| Beton | {r['concrete'].replace('_','/')} |",
        f"| f_cd | {r['fcd']} MPa |",
        f"| f_ywd | {r['fywd']} MPa |",
        "",
        "## 2. Nośność bez zbrojenia na ścinanie",
        "",
        f"k = min(1 + √(200/d), 2.0) = {r['k']:.3f}",
        f"",
        f"V_Rd,c = **{r['V_Rd_c']:.1f} kN**",
        "",
    ]

    if not r["needs_shear_reinf"]:
        lines.extend([
            f"V_Ed = {r['V_Ed']:.1f} kN ≤ V_Rd,c = {r['V_Rd_c']:.1f} kN → ✅ **Strzemiona konstrukcyjne wystarczą**",
        ])
    else:
        lines.extend([
            f"V_Ed = {r['V_Ed']:.1f} kN > V_Rd,c = {r['V_Rd_c']:.1f} kN → ⚠️ **Wymagane strzemiona obliczeniowe**",
            "",
            "## 3. Wymiarowanie strzemion",
            "",
            f"Kąt θ = {r['theta_deg']}°",
            f"",
            f"V_Rd,max = **{r['V_Rd_max']:.1f} kN** {'✅' if r['safe'] else '❌ PRZEKROCZONA NOŚNOŚĆ KRZYŻULCA!'}",
            "",
        ])

        if r["safe"]:
            lines.extend([
                f"Wymagane: A_sw/s = {r['Asw_s']:.4f} mm²/mm",
                f"",
                f"**Przyjęto: strzemiona ø{r['stirrup_dia']}/{r['n_legs']}-cięte co {r['s_required']} mm**",
            ])
        else:
            lines.extend([
                "❌ V_Ed > V_Rd,max — zmienić przekrój lub klasę betonu!",
            ])

    lines.extend([
        "",
        "---",
        "",
        "⚠️ *Obliczenia mają charakter pomocniczy. Wymagana weryfikacja przez uprawnionego projektanta.*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Wymiarowanie belki na ścinanie wg EC2")
    parser.add_argument("--width", type=float, required=True, help="Szerokość b [m]")
    parser.add_argument("--d_eff", type=float, required=True, help="Wysokość użyteczna d [m]")
    parser.add_argument("--V_Ed", type=float, required=True, help="Siła poprzeczna V_Ed [kN]")
    parser.add_argument("--concrete", type=str, default="C30_37")
    parser.add_argument("--steel", type=str, default="B500SP")
    parser.add_argument("--As_l", type=float, default=0, help="Zbrojenie podłużne [mm²]")
    parser.add_argument("--theta", type=float, default=45, help="Kąt krzyżulca [°]")

    args = parser.parse_args()
    result = calculate_shear(
        b=args.width, d=args.d_eff, V_Ed=args.V_Ed,
        concrete=args.concrete, steel=args.steel,
        As_l=args.As_l, theta_deg=args.theta,
    )
    print(format_report(result))


if __name__ == "__main__":
    main()
