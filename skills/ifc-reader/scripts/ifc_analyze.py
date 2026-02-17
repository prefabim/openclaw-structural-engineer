#!/usr/bin/env python3
"""
Analiza modelu IFC — odczyt elementów konstrukcyjnych.

Wymaga: pip install ifcopenshell

Użycie:
    python ifc_analyze.py --file model.ifc --output summary
    python ifc_analyze.py --file model.ifc --output beams
    python ifc_analyze.py --file model.ifc --output all
"""

import argparse
import sys

try:
    import ifcopenshell
    import ifcopenshell.util.element as element_util
    HAS_IFC = True
except ImportError:
    HAS_IFC = False


def get_property_value(element, prop_name):
    """Wyciągnij wartość właściwości z elementu IFC."""
    if not HAS_IFC:
        return None
    try:
        for definition in element.IsDefinedBy:
            if definition.is_a("IfcRelDefinesByProperties"):
                prop_set = definition.RelatingPropertyDefinition
                if prop_set.is_a("IfcPropertySet"):
                    for prop in prop_set.HasProperties:
                        if prop.Name == prop_name:
                            if hasattr(prop, "NominalValue") and prop.NominalValue:
                                return prop.NominalValue.wrappedValue
    except Exception:
        pass
    return None


def get_element_dimensions(element):
    """Próbuj wyciągnąć wymiary elementu."""
    dims = {}
    for prop_name in ["Width", "Height", "Depth", "Length", "Thickness",
                      "NominalWidth", "NominalHeight", "NominalLength"]:
        val = get_property_value(element, prop_name)
        if val is not None:
            dims[prop_name] = val
    return dims


def get_material(element):
    """Wyciągnij materiał elementu."""
    try:
        for rel in element.HasAssociations:
            if rel.is_a("IfcRelAssociatesMaterial"):
                mat = rel.RelatingMaterial
                if mat.is_a("IfcMaterial"):
                    return mat.Name
                elif mat.is_a("IfcMaterialLayerSetUsage"):
                    layers = mat.ForLayerSet.MaterialLayers
                    return ", ".join([l.Material.Name for l in layers if l.Material])
                elif mat.is_a("IfcMaterialProfileSetUsage"):
                    profiles = mat.ForProfileSet.MaterialProfiles
                    return ", ".join([p.Material.Name for p in profiles if p.Material])
                elif hasattr(mat, "Name"):
                    return str(mat.Name)
    except Exception:
        pass
    return "Nieznany"


def analyze_model(filepath, output_type):
    """Główna funkcja analizy modelu IFC."""
    if not HAS_IFC:
        return ("❌ Brak biblioteki ifcopenshell.\n"
                "Zainstaluj: pip install ifcopenshell\n\n"
                "Alternatywnie: prześlij plik, a spróbuję go przeanalizować "
                "za pomocą dostępnych narzędzi.")

    try:
        model = ifcopenshell.open(filepath)
    except Exception as e:
        return f"❌ Nie udało się otworzyć pliku IFC: {e}"

    # Zbierz elementy
    elements = {
        "beams": model.by_type("IfcBeam"),
        "columns": model.by_type("IfcColumn"),
        "slabs": model.by_type("IfcSlab"),
        "walls": model.by_type("IfcWall"),
        "footings": model.by_type("IfcFooting"),
        "members": model.by_type("IfcMember"),
    }

    report_lines = []

    if output_type in ("summary", "all"):
        report_lines.extend([
            "# Podsumowanie modelu IFC",
            "",
            f"**Plik:** {filepath}",
            f"**Schema:** {model.schema}",
            "",
            "## Elementy konstrukcyjne",
            "",
            "| Typ | Ilość |",
            "|-----|-------|",
            f"| Belki (IfcBeam) | {len(elements['beams'])} |",
            f"| Słupy (IfcColumn) | {len(elements['columns'])} |",
            f"| Płyty (IfcSlab) | {len(elements['slabs'])} |",
            f"| Ściany (IfcWall) | {len(elements['walls'])} |",
            f"| Fundamenty (IfcFooting) | {len(elements['footings'])} |",
            f"| Inne (IfcMember) | {len(elements['members'])} |",
            f"| **Razem** | **{sum(len(v) for v in elements.values())}** |",
            "",
        ])

        # Materiały
        materials = set()
        for elem_list in elements.values():
            for elem in elem_list:
                mat = get_material(elem)
                if mat != "Nieznany":
                    materials.add(mat)

        if materials:
            report_lines.extend([
                "## Materiały",
                "",
                "| Materiał |",
                "|----------|",
            ])
            for mat in sorted(materials):
                report_lines.append(f"| {mat} |")
            report_lines.append("")

    # Szczegóły elementów
    for elem_type, type_name in [("beams", "Belki"), ("columns", "Słupy"), ("slabs", "Płyty")]:
        if output_type not in (elem_type, "all"):
            continue

        elem_list = elements[elem_type]
        if not elem_list:
            report_lines.append(f"\n## {type_name}\nBrak elementów tego typu w modelu.\n")
            continue

        report_lines.extend([
            f"\n## {type_name} ({len(elem_list)} szt.)",
            "",
            "| # | Nazwa | Materiał | Wymiary |",
            "|---|-------|----------|---------|",
        ])

        for i, elem in enumerate(elem_list[:50], 1):  # max 50
            name = elem.Name or f"#{elem.id()}"
            mat = get_material(elem)
            dims = get_element_dimensions(elem)
            dims_str = ", ".join(f"{k}={v}" for k, v in dims.items()) if dims else "—"
            report_lines.append(f"| {i} | {name} | {mat} | {dims_str} |")

        if len(elem_list) > 50:
            report_lines.append(f"\n*... i {len(elem_list) - 50} więcej*")
        report_lines.append("")

    return "\n".join(report_lines)


def main():
    parser = argparse.ArgumentParser(description="Analiza modelu IFC")
    parser.add_argument("--file", type=str, required=True, help="Ścieżka do pliku .ifc")
    parser.add_argument("--output", type=str, default="summary",
                        choices=["summary", "beams", "columns", "slabs", "materials", "all"])

    args = parser.parse_args()
    print(analyze_model(args.file, args.output))


if __name__ == "__main__":
    main()
