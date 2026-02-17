# 🏗️ Digital Structural Engineer — OpenClaw Skills

A set of OpenClaw skills that create a digital structural engineering assistant. Works through WhatsApp and other messaging channels.

## Features

- **Reinforced concrete beam design** per Eurocode 2 (EC2)
- **Reinforced concrete slab design** — one-way & two-way per EC2
- **Reinforced concrete column design** — compression with 2nd order effects (buckling)
- **Steel beam profile selection** per Eurocode 3 (EC3)
- **IFC model analysis** — extract structural elements from BIM models
- **Calculation note generation** in PDF
- **Load combinations** per Eurocode 0 (EC0)
- Material selection, steel profiles, concrete grades

## Quick Start

### 1. Install OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

### 2. Connect WhatsApp

```bash
openclaw channels login
# Scan the QR code with your phone in WhatsApp → Linked devices
```

### 3. Install skills

Copy the `skills/` folder to your OpenClaw workspace:

```bash
cp -r skills/* ~/.openclaw/skills/
```

Or point your workspace to this directory:

```bash
# In openclaw.json add:
# "skills": { "load": { "extraDirs": ["/path/to/this/repo/skills"] } }
```

### 4. Install Python dependencies

```bash
pip install eurocodepy numpy fpdf2 ifcopenshell
```

### 5. Start the gateway

```bash
openclaw gateway
```

Now send a message on WhatsApp, e.g.:
> "Design an RC beam: span 6m, permanent load 15 kN/m, variable load 10 kN/m, concrete C30/37, steel B500SP"

## Project Structure

```
skills/
├── structural-engineer/        # Main skill — engineering persona & context
│   └── SKILL.md
├── ec2-concrete/               # RC design per EC2
│   ├── SKILL.md
│   └── scripts/
│       ├── beam_bending.py     # Beam bending design
│       └── beam_shear.py       # Beam shear design + stirrups
├── ec2-slabs/                  # RC slabs per EC2
│   ├── SKILL.md
│   └── scripts/
│       └── slab_design.py      # One-way & two-way slabs
├── ec2-columns/                # RC columns per EC2
│   ├── SKILL.md
│   └── scripts/
│       └── column_design.py    # Compression + buckling
├── ec3-steel/                  # Steel design per EC3
│   ├── SKILL.md
│   └── scripts/
│       └── steel_beam.py       # IPE/HEA/HEB profile selection
├── ifc-reader/                 # BIM model analysis
│   ├── SKILL.md
│   └── scripts/
│       └── ifc_analyze.py      # Extract elements from IFC
├── calc-report/                # Calculation note generation
│   ├── SKILL.md
│   └── scripts/
│       └── generate_pdf.py     # Markdown → PDF
docs/
├── setup-whatsapp.md           # WhatsApp setup guide
```

## Usage Examples

### Reinforced concrete beam
> "Design a simply supported beam: L=5m, b=30cm, h=50cm, g=20kN/m, q=12kN/m, C25/30, B500SP"

### Reinforced concrete slab
> "Design a 5×7m slab, thickness 20cm, g=7.5 kN/m², q=3.0 kN/m², supported on 4 edges"

### Reinforced concrete column
> "Check a 40×40cm column, H=3.5m, N=1500kN, M=80kNm, C30/37, B500SP"

### Steel element
> "Select an IPE profile for an 8m span beam, load 25 kN/m, steel S355"

### IFC analysis
> "Analyse the model building.ifc — show a list of beams with dimensions"

### Calculation note
> "Generate a PDF calculation note from the last calculation"

## Extending the Project

Add new skills by creating a folder in `skills/` with a `SKILL.md` file. Each skill consists of:
- `SKILL.md` — when to use, instructions, parameters
- `scripts/` — Python calculation scripts
- `references/` — documentation, tables, formulas

### Ideas for Future Development
- Shallow foundations (strip & pad footings) per EC7
- Steel connections (bolted & welded) per EC3-1-8
- Timber structures per EC5
- Wind & snow loads per EC1
- IFC export

## License

MIT
