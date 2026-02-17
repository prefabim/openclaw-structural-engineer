# Konfiguracja OpenClaw z WhatsApp

## Wymagania

- OpenClaw zainstalowany (`curl -fsSL https://openclaw.ai/install.sh | bash`)
- Telefon z aktywnym WhatsApp
- Node.js 22+

## Krok 1: Onboarding

```bash
openclaw onboard --install-daemon
```

Podczas onboardingu:
1. Wybierz dostawcę LLM (np. Anthropic Claude, OpenAI GPT)
2. Podaj klucz API
3. Wybierz model

## Krok 2: Podłącz WhatsApp

```bash
openclaw channels login
```

- Pojawi się QR kod w terminalu
- Na telefonie: WhatsApp → Ustawienia → Urządzenia połączone → Połącz urządzenie
- Zeskanuj QR kod

## Krok 3: Zainstaluj skille konstrukcyjne

```bash
# Opcja A: Skopiuj do katalogu OpenClaw
cp -r skills/* ~/.openclaw/skills/

# Opcja B: Dodaj jako extra dir w konfiguracji
# ~/.openclaw/openclaw.json:
# {
#   "skills": {
#     "load": {
#       "extraDirs": ["/ścieżka/do/repo/skills"]
#     },
#     "entries": {
#       "structural-engineer": { "enabled": true },
#       "ec2-concrete": { "enabled": true },
#       "ec3-steel": { "enabled": true }
#     }
#   }
# }
```

## Krok 4: Zainstaluj zależności Python

```bash
pip install eurocodepy numpy
```

## Krok 5: Uruchom gateway

```bash
openclaw gateway
```

## Krok 6: Testuj!

Wyślij wiadomość do siebie na WhatsApp:
> "Zwymiaruj belkę żelbetową: L=5m, b=30cm, h=50cm, g=12kN/m, q=8kN/m, beton C25/30"

## Wskazówki

- OpenClaw odpowiada na wiadomości wysłane **do siebie** na WhatsApp
- Można też użyć dedykowanego numeru telefonu (zalecane dla użytku zespołowego)
- Gateway dashboard: `http://127.0.0.1:18789/`
- Logi: `openclaw gateway status`

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|------------|
| QR kod wygasł | Uruchom ponownie `openclaw channels login` |
| Brak odpowiedzi | Sprawdź `openclaw gateway status` |
| Skill niewidoczny | Restart gateway po dodaniu skilli |
| Błąd Python | Sprawdź `pip list` — czy eurocodepy zainstalowane |
