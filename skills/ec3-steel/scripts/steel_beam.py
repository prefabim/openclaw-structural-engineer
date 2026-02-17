#!/usr/bin/env python3
"""
Dobór profilu stalowego dla belki prostopodpartej wg EC3.
PN-EN 1993-1-1.

Dobiera najlżejszy profil z wybranej serii (IPE/HEA/HEB)
spełniający warunki nośności na zginanie, ścinanie i ugięcia.

Użycie:
    python steel_beam.py --span 8.0 --g 10.0 --q 15.0 \
        --steel S355 --series IPE --deflection_limit 250
"""

import argparse
import math
import sys

# ============================================================
# Baza profili stalowych (podstawowe serie europejskie)
# h, b, tw, tf, Iy, Wel_y, Wpl_y, Av, mass
# Iy [cm4], Wel/Wpl [cm3], Av [cm2], mass [kg/m]
# ============================================================

PROFILES = {
    "IPE": {
        "IPE200": {"h": 200, "b": 100, "tw": 5.6, "tf": 8.5, "Iy": 1943, "Wely": 194.3, "Wply": 220.6, "Av": 14.0, "mass": 22.4},
        "IPE220": {"h": 220, "b": 110, "tw": 5.9, "tf": 9.2, "Iy": 2772, "Wely": 252.0, "Wply": 285.4, "Av": 16.3, "mass": 26.2},
        "IPE240": {"h": 240, "b": 120, "tw": 6.2, "tf": 9.8, "Iy": 3892, "Wely": 324.3, "Wply": 366.6, "Av": 18.5, "mass": 30.7},
        "IPE270": {"h": 270, "b": 135, "tw": 6.6, "tf": 10.2, "Iy": 5790, "Wely": 428.9, "Wply": 484.0, "Av": 22.1, "mass": 36.1},
        "IPE300": {"h": 300, "b": 150, "tw": 7.1, "tf": 10.7, "Iy": 8356, "Wely": 557.1, "Wply": 628.4, "Av": 26.2, "mass": 42.2},
        "IPE330": {"h": 330, "b": 160, "tw": 7.5, "tf": 11.5, "Iy": 11770, "Wely": 713.1, "Wply": 804.3, "Av": 30.8, "mass": 49.1},
        "IPE360": {"h": 360, "b": 170, "tw": 8.0, "tf": 12.7, "Iy": 16270, "Wely": 903.6, "Wply": 1019, "Av": 35.1, "mass": 57.1},
        "IPE400": {"h": 400, "b": 180, "tw": 8.6, "tf": 13.5, "Iy": 23130, "Wely": 1156, "Wply": 1307, "Av": 42.7, "mass": 66.3},
        "IPE450": {"h": 450, "b": 190, "tw": 9.4, "tf": 14.6, "Iy": 33740, "Wely": 1500, "Wply": 1702, "Av": 51.0, "mass": 77.6},
        "IPE500": {"h": 500, "b": 200, "tw": 10.2, "tf": 16.0, "Iy": 48200, "Wely": 1928, "Wply": 2194, "Av": 59.9, "mass": 90.7},
        "IPE550": {"h": 550, "b": 210, "tw": 11.1, "tf": 17.2, "Iy": 67120, "Wely": 2441, "Wply": 2787, "Av": 71.7, "mass": 106},
        "IPE600": {"h": 600, "b": 220, "tw": 12.0, "tf": 19.0, "Iy": 92080, "Wely": 3069, "Wply": 3512, "Av": 83.8, "mass": 122},
    },
    "HEA": {
        "HEA200": {"h": 190, "b": 200, "tw": 6.5, "tf": 10.0, "Iy": 3692, "Wely": 388.6, "Wply": 429.5, "Av": 15.3, "mass": 42.3},
        "HEA240": {"h": 230, "b": 240, "tw": 7.5, "tf": 12.0, "Iy": 7763, "Wely": 675.1, "Wply": 744.6, "Av": 21.1, "mass": 60.3},
        "HEA280": {"h": 270, "b": 280, "tw": 8.0, "tf": 13.0, "Iy": 13670, "Wely": 1013, "Wply": 1112, "Av": 26.4, "mass": 76.4},
        "HEA300": {"h": 290, "b": 300, "tw": 8.5, "tf": 14.0, "Iy": 18260, "Wely": 1260, "Wply": 1383, "Av": 29.8, "mass": 88.3},
        "HEA360": {"h": 350, "b": 300, "tw": 10.0, "tf": 17.5, "Iy": 33090, "Wely": 1891, "Wply": 2088, "Av": 41.6, "mass": 112},
        "HEA400": {"h": 390, "b": 300, "tw": 11.0, "tf": 19.0, "Iy": 45070, "Wely": 2311, "Wply": 2562, "Av": 49.2, "mass": 125},
    },
    "HEB": {
        "HEB200": {"h": 200, "b": 200, "tw": 9.0, "tf": 15.0, "Iy": 5696, "Wely": 569.6, "Wply": 642.5, "Av": 22.5, "mass": 61.3},
        "HEB240": {"h": 240, "b": 240, "tw": 10.0, "tf": 17.0, "Iy": 11260, "Wely": 938.3, "Wply": 1053, "Av": 30.0, "mass": 83.2},
        "HEB280": {"h": 280, "b": 280, "tw": 10.5, "tf": 18.0, "Iy": 19270, "Wely": 1376, "Wply": 1534, "Av": 37.0, "mass": 103},
        "HEB300": {"h": 300, "b": 300, "tw": 11.0, "tf": 19.0, "Iy": 25170, "Wely": 1678, "Wply": 1869, "Av": 41.3, "mass": 117},
        "HEB360": {"h": 360, "b": 300, "tw": 12.5, "tf": 22.5, "Iy": 43190, "Wely": 2400, "Wply": 2683, "Av": 54.1, "mass": 142},
        "HEB400": {"h": 400, "b": 300, "tw": 13.5, "tf": 24.0, "Iy": 57680, "Wely": 2884, "Wply": 3232, "Av": 63.1, "mass": 155},
    },
}

STEEL_GRADES = {
    "S235": {"fy": 235, "fu": 360},
    "S275": {"fy": 275, "fu": 430},
    "S355": {"fy": 355, "fu": 510},
    "S460": {"fy": 460, "fu": 550},
}

GAMMA_G = 1.35
GAMMA_Q = 1.50
GAMMA_M0 = 1.00
E_STEEL = 210000  # MPa


def select_beam(span, g, q, steel_grade, series, deflection_limit):
    st = STEEL_GRADES[steel_grade]
    fy = st["fy"]

    profiles = PROFILES[series]

    # Obciążenia
    q_Ed = GAMMA_G * g + GAMMA_Q * q  # kN/m
    q_char = g + q  # kN/m (charakterystyczne, dla ugięć)

    M_Ed = q_Ed * span**2 / 8  # kNm
    V_Ed = q_Ed * span / 2     # kN

    # Wymagany Wpl,y
    Wply_req = M_Ed * 1e3 / (fy / GAMMA_M0)  # cm³

    # Wymagany Iy (z warunku ugięcia)
    # Jednostki: q[kN/m]=q[N/mm], L[mm]=span*1000, E[MPa], I[mm4]=Iy*1e4
    delta_max = span * 1000 / deflection_limit  # mm
    Iy_req = 5 * q_char * span**4 * 1e12 / (384 * E_STEEL * delta_max) / 1e4  # cm4

    # Szukaj najlżejszego profilu
    candidates = []
    for name, p in sorted(profiles.items(), key=lambda x: x[1]["mass"]):
        wply_ok = p["Wply"] >= Wply_req
        iy_ok = p["Iy"] >= Iy_req

        # Nośność na ścinanie
        V_pl_Rd = p["Av"] * 100 * fy / (math.sqrt(3) * GAMMA_M0) / 1000  # kN
        shear_ok = V_Ed <= V_pl_Rd

        if wply_ok and iy_ok and shear_ok:
            # Ugięcie rzeczywiste
            delta_actual = 5 * q_char * span**4 * 1e12 / (384 * E_STEEL * p["Iy"] * 1e4)  # mm
            ratio_actual = span * 1000 / delta_actual if delta_actual > 0 else 9999

            M_pl_Rd = p["Wply"] * fy / GAMMA_M0 / 1e3  # kNm
            utilization_M = M_Ed / M_pl_Rd * 100
            utilization_V = V_Ed / V_pl_Rd * 100

            candidates.append({
                "name": name,
                "mass": p["mass"],
                "h": p["h"],
                "Wply": p["Wply"],
                "Iy": p["Iy"],
                "M_pl_Rd": round(M_pl_Rd, 1),
                "V_pl_Rd": round(V_pl_Rd, 1),
                "delta_mm": round(delta_actual, 1),
                "L_over_delta": round(ratio_actual, 0),
                "util_M": round(utilization_M, 1),
                "util_V": round(utilization_V, 1),
            })

    return {
        "span": span,
        "g": g,
        "q": q,
        "steel": steel_grade,
        "fy": fy,
        "series": series,
        "q_Ed": round(q_Ed, 2),
        "M_Ed": round(M_Ed, 2),
        "V_Ed": round(V_Ed, 2),
        "Wply_req": round(Wply_req, 1),
        "Iy_req": round(Iy_req, 0),
        "deflection_limit": deflection_limit,
        "candidates": candidates[:5],
    }


def format_report(r):
    lines = [
        "# Nota obliczeniowa — Belka stalowa",
        "## Dobór profilu wg PN-EN 1993-1-1 (EC3)",
        "",
        "## 1. Dane wejściowe",
        "",
        f"| Parametr | Wartość |",
        f"|----------|---------|",
        f"| Rozpiętość L | {r['span']:.1f} m |",
        f"| Obciążenie stałe g_k | {r['g']:.1f} kN/m |",
        f"| Obciążenie zmienne q_k | {r['q']:.1f} kN/m |",
        f"| Stal | {r['steel']} (f_y = {r['fy']} MPa) |",
        f"| Seria profilu | {r['series']} |",
        f"| Dopuszczalne ugięcie | L/{r['deflection_limit']} |",
        "",
        "## 2. Obciążenia i siły wewnętrzne",
        "",
        f"q_Ed = {GAMMA_G}×{r['g']:.1f} + {GAMMA_Q}×{r['q']:.1f} = **{r['q_Ed']} kN/m**",
        f"",
        f"M_Ed = q_Ed·L²/8 = **{r['M_Ed']} kNm**",
        f"V_Ed = q_Ed·L/2 = **{r['V_Ed']} kN**",
        "",
        "## 3. Wymagania",
        "",
        f"- W_pl,y ≥ {r['Wply_req']:.1f} cm³",
        f"- I_y ≥ {r['Iy_req']:.0f} cm⁴ (warunek ugięcia L/{r['deflection_limit']})",
        "",
        "## 4. Dobór profilu",
        "",
    ]

    if not r["candidates"]:
        lines.append("❌ **Brak odpowiedniego profilu w serii** — rozważ wyższą serię lub mniejszą rozpiętość.")
    else:
        lines.extend([
            "| Profil | Masa [kg/m] | M_pl,Rd [kNm] | Wyt. M [%] | Ugięcie [mm] | L/δ |",
            "|--------|------------|---------------|-----------|-------------|-----|",
        ])
        for i, c in enumerate(r["candidates"]):
            marker = " ← **zalecany**" if i == 0 else ""
            lines.append(
                f"| {c['name']} | {c['mass']} | {c['M_pl_Rd']} | {c['util_M']}% | {c['delta_mm']} | L/{c['L_over_delta']:.0f} |{marker}"
            )

        best = r["candidates"][0]
        lines.extend([
            "",
            f"### Zalecenie: **{best['name']}**",
            f"",
            f"- Masa: {best['mass']} kg/m ({best['mass'] * r['span']:.0f} kg łącznie)",
            f"- Wykorzystanie zginanie: {best['util_M']}%",
            f"- Wykorzystanie ścinanie: {best['util_V']}%",
            f"- Ugięcie: {best['delta_mm']} mm (L/{best['L_over_delta']:.0f})",
        ])

    lines.extend([
        "",
        "---",
        "",
        "⚠️ *Obliczenia mają charakter pomocniczy. Nie uwzględniono zwichrzenia (LTB). Wymagana weryfikacja przez uprawnionego projektanta.*",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Dobór profilu stalowego wg EC3")
    parser.add_argument("--span", type=float, required=True, help="Rozpiętość [m]")
    parser.add_argument("--g", type=float, required=True, help="Obciążenie stałe [kN/m]")
    parser.add_argument("--q", type=float, required=True, help="Obciążenie zmienne [kN/m]")
    parser.add_argument("--steel", type=str, default="S355")
    parser.add_argument("--series", type=str, default="IPE", choices=["IPE", "HEA", "HEB"])
    parser.add_argument("--deflection_limit", type=int, default=250, help="L/x")

    args = parser.parse_args()
    result = select_beam(args.span, args.g, args.q, args.steel, args.series, args.deflection_limit)
    print(format_report(result))


if __name__ == "__main__":
    main()
