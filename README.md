# 🏗️ Cyfrowy Projektant Konstrukcji — OpenClaw Skills

Zestaw skilli OpenClaw tworzących cyfrowego asystenta projektanta konstrukcji budowlanych. Działa przez WhatsApp i inne kanały czatowe.

## Co potrafi?

- **Wymiarowanie belek żelbetowych** wg Eurokodu 2 (EC2)
- **Wymiarowanie płyt żelbetowych** — jedno- i dwukierunkowe wg EC2
- **Wymiarowanie słupów żelbetowych** — ściskanie z efektami II rzędu (wyboczenie)
- **Dobór profili stalowych** wg Eurokodu 3 (EC3)
- **Analiza modeli IFC** — odczyt elementów z modeli BIM
- **Generowanie not obliczeniowych** w PDF
- **Kombinacje obciążeń** wg Eurokodu 0 (EC0)
- Dobór materiałów, profili stalowych, klas betonu

## Szybki start

### 1. Zainstaluj OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

### 2. Podłącz WhatsApp

```bash
openclaw channels login
# Zeskanuj QR kod telefonem w WhatsApp → Urządzenia połączone
```

### 3. Zainstaluj skille

Skopiuj folder `skills/` do workspace OpenClaw:

```bash
cp -r skills/* ~/.openclaw/skills/
```

Lub ustaw workspace na ten katalog:

```bash
# W openclaw.json dodaj:
# "skills": { "load": { "extraDirs": ["/ścieżka/do/tego/repo/skills"] } }
```

### 4. Zainstaluj zależności Python

```bash
pip install eurocodepy numpy fpdf2 ifcopenshell
```

### 5. Uruchom gateway

```bash
openclaw gateway
```

Teraz wyślij wiadomość na WhatsApp, np.:
> "Zwymiaruj belkę żelbetową o rozpiętości 6m, obciążenie stałe 15 kN/m, zmienne 10 kN/m, beton C30/37, stal B500SP"

## Struktura projektu

```
skills/
├── structural-engineer/        # Główny skill — persona i kontekst inżynierski
│   └── SKILL.md
├── ec2-concrete/               # Wymiarowanie żelbetu wg EC2
│   ├── SKILL.md
│   └── scripts/
│       ├── beam_bending.py     # Zginanie belki
│       └── beam_shear.py       # Ścinanie belki + strzemiona
├── ec2-slabs/                  # Płyty żelbetowe wg EC2
│   ├── SKILL.md
│   └── scripts/
│       └── slab_design.py      # Płyty jedno/dwukierunkowe
├── ec2-columns/                # Słupy żelbetowe wg EC2
│   ├── SKILL.md
│   └── scripts/
│       └── column_design.py    # Ściskanie + wyboczenie
├── ec3-steel/                  # Wymiarowanie stali wg EC3
│   ├── SKILL.md
│   └── scripts/
│       └── steel_beam.py       # Dobór profili IPE/HEA/HEB
├── ifc-reader/                 # Analiza modeli BIM
│   ├── SKILL.md
│   └── scripts/
│       └── ifc_analyze.py      # Odczyt elementów z IFC
├── calc-report/                # Generowanie not obliczeniowych
│   ├── SKILL.md
│   └── scripts/
│       └── generate_pdf.py     # Markdown → PDF
docs/
├── setup-whatsapp.md           # Instrukcja podłączenia WhatsApp
```

## Przykłady użycia

### Belka żelbetowa
> "Oblicz zbrojenie belki prostopodpartej: L=5m, b=30cm, h=50cm, g=20kN/m, q=12kN/m, C25/30, B500SP"

### Płyta żelbetowa
> "Zwymiaruj płytę 5×7m, grubość 20cm, g=7.5 kN/m², q=3.0 kN/m², podparta na 4 krawędziach"

### Słup żelbetowy
> "Sprawdź słup 40×40cm, H=3.5m, N=1500kN, M=80kNm, C30/37, B500SP"

### Element stalowy
> "Dobierz profil IPE dla belki o rozpiętości 8m, obciążenie 25 kN/m, stal S355"

### Analiza IFC
> "Przeanalizuj model budynku.ifc — pokaż listę belek z wymiarami"

### Nota obliczeniowa
> "Wygeneruj notę obliczeniową PDF z ostatnich obliczeń"

## Rozwijanie projektu

Dodaj nowe skille tworząc folder w `skills/` z plikiem `SKILL.md`. Każdy skill to:
- `SKILL.md` — kiedy używać, instrukcje, parametry
- `scripts/` — skrypty obliczeniowe Python
- `references/` — dokumentacja, tablice, wzory

### Pomysły na rozwój
- Fundamenty bezpośrednie (ławy, stopy) wg EC7
- Połączenia stalowe (śrubowe, spawane) wg EC3-1-8
- Konstrukcje drewniane wg EC5
- Obciążenia wiatrem i śniegiem wg EC1
- Eksport do formatu IFC

## Licencja

MIT
