import re

AISLE_KEYWORDS = {
    "Carne & Pește": ["pui", "curcan", "vită", "vita", "porc", "somon", "ton", "creveți", "creveti", "pește", "peste", "crap", "păstrăv", "scrumbie", "nisetru", "șuncă", "sunca", "mușchi", "muschi", "bacon", "ficăței", "ficatei", "ficat", "miel", "rață", "rata", "afumătură", "burtă", "anșoa"],
    "Lactate & Ouă": ["ou", "ouă", "oua", "albuș", "albus", "gălbenuș", "lapte", "iaurt", "skyr", "cottage", "telemea", "feta", "mozzarella", "cașcaval", "cascaval", "parmezan", "halloumi", "brânză", "branza", "smântână", "smantana", "unt", "ricotta", "cheddar"],
    "Legume & Fructe": ["roșii", "rosii", "castravete", "castraveți", "ardei", "ceapă", "ceapa", "usturoi", "spanac", "rucola", "salată", "salata", "avocado", "ciuperci", "pleurotus", "dovlecel", "dovlecei", "vinete", "vânătă", "morcov", "cartof", "broccoli", "conopidă", "conopida", "țelină", "telina", "pătrunjel", "patrunjel", "mărar", "marar", "leuștean", "lobodă", "ștevie", "varză", "varza", "sfeclă", "sfecla", "păstârnac", "lămâie", "lamaie", "lime", "banană", "banana", "măr", "mere", "afine", "zmeură", "căpșuni", "capsuni", "mango", "ananas", "piersici", "cireșe", "vișine", "portocală", "kiwi", "pepene", "rodie", "ridichi", "ghimbir", "dovleac", "hrean"],
    "Băcănie & Cereale": ["ovăz", "ovaz", "făină", "faina", "mălai", "malai", "griș", "gris", "orez", "paste", "lasagna", "quinoa", "hrișcă", "hrisca", "bulgur", "couscous", "năut", "naut", "linte", "fasole", "mazăre", "mazare", "edamame", "porumb", "tofu", "pâine", "paine", "lipie", "lipii", "bagel", "pita", "crackeri", "rondele", "pesmet", "amidon", "biscuiți", "pișcoturi", "arpacaș", "mucenici"],
    "Nuci, Semințe & Dulciuri": ["nuci", "nucă", "migdale", "caju", "arahide", "fistic", "alune", "semințe", "seminte", "chia", "susan", "in", "cânepă", "mac", "cocos", "tahini", "cacao", "ciocolată", "eritritol", "miere", "curmale", "stafide", "agave", "gem", "dulceață"],
    "Condimente & Uleiuri": ["ulei", "oțet", "otet", "muștar", "mustar", "soia", "borș", "bors", "pesto", "sare", "piper", "boia", "paprika", "oregano", "cimbru", "rozmarin", "busuioc", "scorțișoară", "scortisoara", "vanilie", "chimen", "chimion", "turmeric", "chili", "chilli", "dafin", "drojdie", "praf de copt", "bicarbonat", "gelatină", "tarhon", "coriandru", "mentă"]
}

UNITS = r"(?:g|gr|kg|ml|l|L|linguriță|lingurițe|lingurita|lingurite|lingură|linguri|lingura|felii|felie|bucăți|bucati|bucată|bucata|buc|căței|catei|cățel|catel|legătură|legatura|legături|fire|fir|conserve|conservă|pachet|caserolă|pungă|tije|foi|foaie|chifle|lipii|plic|vârf de cuțit|praf)"

def classify_aisle(name: str) -> str:
    lower = name.lower()
    for aisle, keywords in AISLE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return aisle
    return "Diverse"

def parse_ingredient_line(line: str) -> dict:
    clean = line.strip().lstrip("•-*.").strip()
    is_optional = "opțional" in clean.lower() or "optional" in clean.lower() or "după gust" in clean.lower()

    # Check parenthetical gram weight e.g. "1 ceapă (~120 g)" or "ciuperci — 1 caserolă (500 g)"
    paren_match = re.search(r"\([~≈]?\s*(\d+(?:[.,]\d+)?)\s*(g|gr|ml|kg)\)", clean, re.IGNORECASE)
    
    # Dash format: "ciuperci champignon — 1 caserolă (500 g)"
    if "—" in clean or " - " in clean:
        parts = re.split(r"\s*[—\-]\s*", clean, maxsplit=1)
        name_part = parts[0].strip()
        qty_part = parts[1].strip() if len(parts) > 1 else ""
        if paren_match:
            qty = float(paren_match.group(1).replace(",", "."))
            unit = paren_match.group(2).lower()
            if unit == "gr": unit = "g"
            return {"raw_text": clean, "name": name_part.capitalize(), "quantity": qty, "unit": unit, "aisle": classify_aisle(name_part), "is_optional": is_optional}

    # Standard prefix format: "240 g piept de pui" or "1/2 linguriță boia"
    match = re.match(rf"^(\d+\s*/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*({UNITS})?\b\s*(.*)$", clean, re.IGNORECASE)
    if match:
        qty_str, unit_str, rest = match.groups()
        if "/" in qty_str:
            num, den = qty_str.split("/")
            qty = float(num) / float(den)
        elif "-" in qty_str or "–" in qty_str:
            qty = float(re.split(r"[-–]", qty_str)[-1].replace(",", ".").strip())
        else:
            qty = float(qty_str.replace(",", "."))
        
        unit = (unit_str or "buc").lower()
        if unit == "gr": unit = "g"
        name = re.sub(r"^de\s+", "", rest.strip(), flags=re.IGNORECASE)
        name = re.sub(r"\(.*?\)", "", name).strip(" ,.-")
        if not name:
            name = clean
        return {
            "raw_text": clean,
            "name": name.capitalize(),
            "quantity": round(qty, 2),
            "unit": unit,
            "aisle": classify_aisle(name),
            "is_optional": is_optional
        }

    return {
        "raw_text": clean,
        "name": clean.capitalize(),
        "quantity": 1.0,
        "unit": "după gust" if is_optional else "buc",
        "aisle": classify_aisle(clean),
        "is_optional": is_optional
    }
