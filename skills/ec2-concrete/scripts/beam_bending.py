#!/usr/bin/env python3
"""
Wymiarowanie belki żelbetowej prostopodpartej na zginanie wg EC2.
PN-EN 1992-1-1 z polskim załącznikiem krajowym (NA).

Oblicza:
- Moment obliczeniowy M_Ed (kombinacja 6.10 wg EC0)
- Wymagane zbrojenie rozciągane A_s
- Propozycję doboru prętów
- Sprawdzenie zbrojenia minimalnego i maksymalnego

Użycie:
    python beam_bending.py --span 6.0 --width 0.30 --height 0.60 \
        --g 15.0 --q 10.0 --concrete C30_37 --steel B500SP --cover 35
"""

import argparse
import math
import sys

# ============================================================
# Baza materiałów
# ============================================================

CONCRETE_GRADES = {
    "C20_25": {"fck": 20, "fctm": 2.21, "Ecm": 30000},
    "C25_30": {"fck": 25, "fctm": 2.56, "Ecm": 31000},
    "C30_37": {"fck": 30, "fctm": 2.90, "Ecm": 33000},
    "C35_45": {"fck": 35, "fctm": 3.21, "Ecm": 34000},
    "C40_50": {"fck": 40, "fctm": 3.51, "Ecm": 35000},
    "C45_55": {"fck": 45, "fctm": 3.80, "Ecm": 36000},
    "C50_60": {"fck": 50, "fctm": 4.07, "Ecm": 37000},
}

STEEL_GRADES = {
    "B500SP": {"fyk": 500, "Es": 200000},
    "B500A":  {"fyk": 500, "Es": 200000},
    "B500B":  {"fyk": 500, "Es": 200000},
    "B400":   {"fyk": 400, "Es": 200000},
}

# Współczynniki bezpieczeństwa (polska NA)
GAMMA_C = 1.50   # beton
GAMMA_S = 1.15   # stal zbrojeniowa
GAMMA_G = 1.35   # obciążenia stałe (niekorzystne)
GAMMA_Q = 1.50   # obciążenia zmienne

# Średnice prętów zbrojeniowych [mm]
BAR_DIAMETERS = [8, 10, 12, 16, 20, 25, 32]


def bar_area(diameter_mm: float) -> float:
    """Pole przekroju pręta [mm²]."""
    return math.pi * diameter_mm**2 / 4


def find_bars(As_required_mm2: float, b_mm: float, cover_mm: float, stirrup_dia: int = 8):
    """
    Dobiera pręty zbrojeniowe.
    Zwraca listę propozycji (n × ø) z zapasem.
    """
    proposals = []
    min_spacing = 25  # mm — minimalne odległości wg EC2

    for dia in BAR_DIAMETERS:
        if dia < 12:
            continue  # zbrojenie główne min ø12
        area_one = bar_area(dia)
        n_required = math.ceil(As_required_mm2 / area_one)

        # Sprawdź czy mieszczą się w szerokości
        space_available = b_mm - 2 * cover_mm - 2 * stirrup_dia
        space_needed = n_required * dia + (n_required - 1) * max(min_spacing, dia)

        if space_needed <= space_available and n_required >= 2:
            As_provided = n_required * area_one
            ratio = As_provided / As_required_mm2
            proposals.append({
                "n": n_required,
                "dia": dia,
                "As_provided": As_provided,
                "ratio": ratio,
                "spacing": (space_available - n_required * dia) / (n_required - 1) if n_required > 1 else 0,
            })

    # Sortuj po zapasie (bliżej 1.0 = ekonomiczniej)
    proposals.sort(key=lambda p: p["ratio"])
    return proposals[:5]  # top 5 propozycji


def calculate_beam_bending(
    span: float,      # rozpiętość [m]
    b: float,         # szerokość [m]
    h: float,         # wysokość [m]
    g: float,         # obciążenie stałe [kN/m]
    q: float,         # obciążenie zmienne [kN/m]
    concrete: str,    # klasa betonu
    steel: str,       # klasa stali
    cover: float,     # otulina [mm]
) -> dict:
    """Główna funkcja obliczeniowa."""

    # Parametry materiałowe
    conc = CONCRETE_GRADES[concrete]
    st = STEEL_GRADES[steel]

    fck = conc["fck"]          # MPa
    fctm = conc["fctm"]       # MPa
    fcd = fck / GAMMA_C        # MPa
    fyk = st["fyk"]            # MPa
    fyd = fyk / GAMMA_S        # MPa
    Es = st["Es"]              # MPa

    # Wymiary w mm
    b_mm = b * 1000
    h_mm = h * 1000

    # Wysokość użyteczna
    stirrup_dia = 8  # mm
    main_bar_dia_assumed = 20  # mm — założenie do iteracji
    d_mm = h_mm - cover - stirrup_dia - main_bar_dia_assumed / 2
    d = d_mm / 1000  # [m]

    # ============================================================
    # Kombinacja obciążeń wg EC0, wyrażenie 6.10
    # ============================================================
    q_Ed = GAMMA_G * g + GAMMA_Q * q  # kN/m

    # Moment zginający — belka prostopodparta
    M_Ed = q_Ed * span**2 / 8  # kNm
    M_Ed_Nmm = M_Ed * 1e6     # Nmm

    # ============================================================
    # Wymiarowanie na zginanie
    # ============================================================
    mu = M_Ed_Nmm / (b_mm * d_mm**2 * fcd)

    # Granica dla zbrojenia pojedynczego
    epsilon_cu = 3.5e-3  # odkształcenie graniczne betonu
    epsilon_yd = fyd / Es
    xi_lim = epsilon_cu / (epsilon_cu + epsilon_yd)
    mu_lim = xi_lim * (1 - 0.5 * xi_lim)

    if mu > mu_lim:
        return {
            "error": True,
            "message": f"μ = {mu:.4f} > μ_lim = {mu_lim:.4f}. "
                       f"Wymagane zbrojenie podwójne lub zmiana przekroju. "
                       f"Zwiększ wysokość belki lub klasę betonu.",
            "M_Ed": M_Ed,
            "q_Ed": q_Ed,
            "mu": mu,
            "mu_lim": mu_lim,
        }

    xi = 1 - math.sqrt(1 - 2 * mu)
    As_mm2 = xi * b_mm * d_mm * fcd / fyd

    # Zbrojenie minimalne wg EC2, 9.2.1.1
    As_min_1 = 0.26 * fctm / fyk * b_mm * d_mm
    As_min_2 = 0.0013 * b_mm * d_mm
    As_min = max(As_min_1, As_min_2)

    # Zbrojenie maksymalne
    As_max = 0.04 * b_mm * h_mm

    # Wymagane zbrojenie
    As_required = max(As_mm2, As_min)

    # Dobór prętów
    proposals = find_bars(As_required, b_mm, cover, stirrup_dia)

    return {
        "error": False,
        # Dane wejściowe
        "span": span,
        "b": b,
        "h": h,
        "d": round(d, 4),
        "g": g,
        "q": q,
        "concrete": concrete,
        "steel": steel,
        "cover": cover,
        # Materiały
        "fck": fck,
        "fcd": round(fcd, 2),
        "fyk": fyk,
        "fyd": round(fyd, 1),
        # Obciążenia
        "q_Ed": round(q_Ed, 2),
        "M_Ed": round(M_Ed, 2),
        # Wymiarowanie
        "mu": round(mu, 4),
        "mu_lim": round(mu_lim, 4),
        "xi": round(xi, 4),
        "As_required_mm2": round(As_required, 1),
        "As_calc_mm2": round(As_mm2, 1),
        "As_min_mm2": round(As_min, 1),
        "As_max_mm2": round(As_max, 1),
        "is_min_governing": As_mm2 < As_min,
        # Propozycje prętów
        "proposals": proposals,
    }


def format_report(r: dict) -> str:
    """Generuje notę obliczeniową w Markdown."""
    if r.get("error"):
        return f"""# ⚠️ Błąd wymiarowania

{r['message']}

- q_Ed = {r['q_Ed']:.2f} kN/m
- M_Ed = {r['M_Ed']:.2f} kNm
- μ = {r['mu']:.4f} > μ_lim = {r['mu_lim']:.4f}
"""

    lines = [
        "# Nota obliczeniowa — Belka żelbetowa (zginanie)",
        "## Wymiarowanie wg PN-EN 1992-1-1 (EC2)",
        "",
        "## 1. Dane wejściowe",
        "",
        f"| Parametr | Wartość |",
        f"|----------|---------|",
        f"| Rozpiętość L | {r['span']:.2f} m |",
        f"| Szerokość b | {r['b']*100:.0f} cm |",
        f"| Wysokość h | {r['h']*100:.0f} cm |",
        f"| Wys. użyteczna d | {r['d']*100:.1f} cm |",
        f"| Obciążenie stałe g_k | {r['g']:.1f} kN/m |",
        f"| Obciążenie zmienne q_k | {r['q']:.1f} kN/m |",
        f"| Beton | {r['concrete'].replace('_','/')} |",
        f"| Stal | {r['steel']} |",
        f"| Otulina c_nom | {r['cover']:.0f} mm |",
        "",
        "## 2. Parametry materiałowe",
        "",
        f"- f_ck = {r['fck']} MPa → f_cd = f_ck / γ_c = {r['fck']} / {GAMMA_C} = **{r['fcd']} MPa**",
        f"- f_yk = {r['fyk']} MPa → f_yd = f_yk / γ_s = {r['fyk']} / {GAMMA_S} = **{r['fyd']} MPa**",
        "",
        "## 3. Obciążenie obliczeniowe",
        "",
        f"Kombinacja 6.10 wg EC0:",
        f"",
        f"q_Ed = γ_G · g_k + γ_Q · q_k = {GAMMA_G} × {r['g']:.1f} + {GAMMA_Q} × {r['q']:.1f} = **{r['q_Ed']} kN/m**",
        "",
        "## 4. Siły wewnętrzne",
        "",
        f"Belka prostopodparta, schemat q·L²/8:",
        f"",
        f"M_Ed = q_Ed · L² / 8 = {r['q_Ed']} × {r['span']}² / 8 = **{r['M_Ed']} kNm**",
        "",
        "## 5. Wymiarowanie na zginanie",
        "",
        f"μ = M_Ed / (b · d² · f_cd) = {r['M_Ed']*1e6:.0f} / ({r['b']*1000:.0f} × {r['d']*1000:.1f}² × {r['fcd']}) = **{r['mu']:.4f}**",
        f"",
        f"Sprawdzenie: μ = {r['mu']:.4f} {'≤' if r['mu'] <= r['mu_lim'] else '>'} μ_lim = {r['mu_lim']:.4f} → {'✅ OK — zbrojenie pojedyncze' if r['mu'] <= r['mu_lim'] else '❌ Zbrojenie podwójne!'}",
        f"",
        f"ξ = 1 - √(1 - 2μ) = 1 - √(1 - 2×{r['mu']:.4f}) = **{r['xi']:.4f}**",
        f"",
        f"A_s = ξ · b · d · f_cd / f_yd = {r['xi']:.4f} × {r['b']*1000:.0f} × {r['d']*1000:.1f} × {r['fcd']} / {r['fyd']} = **{r['As_calc_mm2']:.1f} mm²**",
        "",
    ]

    if r["is_min_governing"]:
        lines.extend([
            "### Zbrojenie minimalne (miarodajne!)",
            f"",
            f"A_s,min = max(0.26·f_ctm/f_yk·b·d, 0.0013·b·d) = **{r['As_min_mm2']:.1f} mm²**",
            f"",
            f"A_s,min = {r['As_min_mm2']:.1f} mm² > A_s,calc = {r['As_calc_mm2']:.1f} mm²",
            f"",
            f"**Przyjęto A_s = {r['As_required_mm2']:.1f} mm²** (zbrojenie minimalne miarodajne)",
            "",
        ])
    else:
        lines.extend([
            f"Zbrojenie minimalne: A_s,min = {r['As_min_mm2']:.1f} mm² < {r['As_calc_mm2']:.1f} mm² ✅",
            "",
        ])

    lines.extend([
        f"Zbrojenie maksymalne: A_s,max = {r['As_max_mm2']:.1f} mm² > {r['As_required_mm2']:.1f} mm² ✅",
        "",
        "## 6. Dobór zbrojenia",
        f"",
        f"**Wymagane: A_s ≥ {r['As_required_mm2']:.1f} mm²**",
        "",
        "| Propozycja | A_s [mm²] | Zapas | Rozstaw [mm] |",
        "|-----------|----------|-------|-------------|",
    ])

    for i, p in enumerate(r["proposals"]):
        marker = " ← zalecane" if i == 0 else ""
        lines.append(
            f"| {p['n']}ø{p['dia']} | {p['As_provided']:.1f} | "
            f"{(p['ratio']-1)*100:.1f}% | {p['spacing']:.0f} |{marker}"
        )

    lines.extend([
        "",
        "---",
        "",
        "⚠️ *Obliczenia mają charakter pomocniczy. Wymagana weryfikacja przez uprawnionego projektanta.*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Wymiarowanie belki żelbetowej na zginanie wg EC2")
    parser.add_argument("--span", type=float, required=True, help="Rozpiętość [m]")
    parser.add_argument("--width", type=float, required=True, help="Szerokość b [m]")
    parser.add_argument("--height", type=float, required=True, help="Wysokość h [m]")
    parser.add_argument("--g", type=float, required=True, help="Obciążenie stałe g_k [kN/m]")
    parser.add_argument("--q", type=float, required=True, help="Obciążenie zmienne q_k [kN/m]")
    parser.add_argument("--concrete", type=str, default="C30_37", help="Klasa betonu (np. C30_37)")
    parser.add_argument("--steel", type=str, default="B500SP", help="Klasa stali (np. B500SP)")
    parser.add_argument("--cover", type=float, default=35, help="Otulina [mm]")

    args = parser.parse_args()

    if args.concrete not in CONCRETE_GRADES:
        print(f"❌ Nieznana klasa betonu: {args.concrete}")
        print(f"   Dostępne: {', '.join(CONCRETE_GRADES.keys())}")
        sys.exit(1)

    if args.steel not in STEEL_GRADES:
        print(f"❌ Nieznana klasa stali: {args.steel}")
        print(f"   Dostępne: {', '.join(STEEL_GRADES.keys())}")
        sys.exit(1)

    result = calculate_beam_bending(
        span=args.span,
        b=args.width,
        h=args.height,
        g=args.g,
        q=args.q,
        concrete=args.concrete,
        steel=args.steel,
        cover=args.cover,
    )

    report = format_report(result)
    print(report)


if __name__ == "__main__":
    main()
