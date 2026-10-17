import os
import re
import fitz  # PyMuPDF
from core.database import SessionLocal, Recipe, RecipeIngredient, engine, Base
from services.normalizer.parser import parse_ingredient_line

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
PDF_DIR = os.path.join(DATA_DIR, "pdfs")
IMG_DIR = os.path.join(DATA_DIR, "images")
os.makedirs(IMG_DIR, exist_ok=True)

BULLET_CHARS = ("•", "●", "▪", "▫", "◦", "‣", "⁃", "-", "*", "–")

def slugify(text: str) -> str:
    replacements = {"ă": "a", "â": "a", "î": "i", "ș": "s", "ş": "s", "ț": "t", "ţ": "t"}
    s = text.lower()
    for k, v in replacements.items():
        s = s.replace(k, v)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def extract_largest_image(doc, page, slug: str) -> str | None:
    image_list = page.get_images(full=True)
    best_xref = None
    max_area = 0
    for img_info in image_list:
        xref = img_info[0]
        width, height = img_info[2], img_info[3]
        area = width * height
        if width > 200 and height > 150 and area > max_area:
            max_area = area
            best_xref = xref

    if not best_xref:
        return None

    try:
        base_image = doc.extract_image(best_xref)
        image_bytes = base_image["image"]
        ext = base_image["ext"]
        filename = f"{slug}.{ext}"
        filepath = os.path.join(IMG_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        return filename
    except Exception:
        return None

def is_valid_title(cand: str) -> bool:
    u = cand.upper().strip("*←•- ")
    if len(u) < 4 or not u.isupper():
        return False
    # Never allow "(6 PORȚII)", "2 PORȚII", headers, or macro lines to be the title
    if u.startswith("(") or re.search(r"\b(?:PORȚII|PORTII|PORȚIE|PORTIE|MINUTE|CALORII|KCA|FELII|BUCĂȚI|BUCATI|CHIFLE|LIPII|TURTE)\b", u):
        return False
    if any(k in u for k in ["INGREDIENTE", "INSTRUC", "SFATURI", "MACRO", "SUGESTIE", "CUPRINS"]):
        return False
    return True

def clean_and_merge_lines(lines: list[str], is_ingredients: bool = False) -> list[str]:
    merged = []
    pending_bullet = False

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        # If the PDF has a standalone bullet glyph on its own line, remember it for the next line
        if line in BULLET_CHARS or line == ".":
            pending_bullet = True
            continue

        has_bullet = line.startswith(BULLET_CHARS) or pending_bullet
        pending_bullet = False

        if is_ingredients:
            clean_item = line.lstrip("".join(BULLET_CHARS) + " .").strip()
            # Skip any accidental header words
            if any(h in clean_item.upper() for h in ["INGREDIENTE", "INSTRUCȚIUNI", "INSTRUCTIUNI", "SFATURI PRACTICE", "MACRO/POR"]):
                continue
            is_new = (
                has_bullet
                or re.match(r"^(\d+|\d+/\d+)\b", clean_item)
                or clean_item.endswith(":")
                or len(merged) == 0
            )
            if is_new or len(merged[-1]) > 55:
                merged.append(clean_item)
            else:
                merged[-1] = f"{merged[-1]} {clean_item}"
        else:
            clean_txt = line.lstrip("".join(BULLET_CHARS) + " ").strip()
            is_step = re.match(r"^\d+[\.\)]\s*", line)
            is_label = re.match(r"^(Alergeni|Alternative|Variante|Sfaturi)\s*:", clean_txt, re.IGNORECASE) or clean_txt.endswith(":")
            # Also detect new sentences in SFATURI PRACTICE when previous line ended with a period
            prev_ended_sentence = len(merged) > 0 and merged[-1].endswith((".", "!")) and clean_txt[:1].isupper() and not re.match(r"^\d", merged[-1])

            if has_bullet:
                merged.append(f"• {clean_txt}")
            elif not merged or is_step or is_label or prev_ended_sentence:
                merged.append(line)
            else:
                merged[-1] = f"{merged[-1]} {line}"
    return merged

def parse_recipe_page_spatial(page, book_name: str, page_num: int) -> dict | None:
    full_text = page.get_text("text")
    if "INGREDIENTE" not in full_text.upper() or ("INSTRUCȚIUNI" not in full_text.upper() and "INSTRUCTIUNI" not in full_text.upper()):
        return None

    # Extract individual lines with their exact (x0, y0, x1, y1, text, max_font_size) using get_text("dict")
    page_dict = page.get_text("dict")
    styled_lines = []
    for block in page_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            bbox = line["bbox"]
            spans = line.get("spans", [])
            txt = "".join(s["text"] for s in spans).strip()
            if not txt:
                continue
            max_size = max((s.get("size", 10) for s in spans), default=10)
            styled_lines.append((bbox[0], bbox[1], bbox[2], bbox[3], txt, max_size))

    # Locate INGREDIENTE and INSTRUCȚIUNI line coordinates
    ing_header_y = None
    inst_header_x = None
    for x0, y0, x1, y1, txt, sz in styled_lines:
        u = txt.upper()
        if "INGREDIENTE" in u and "INSTRUC" not in u and ing_header_y is None:
            # Make sure it's the section header "INGREDIENTE", not "LASAGNA CU 4 INGREDIENTE"
            if u.startswith("INGREDIENTE"):
                ing_header_y = y0
        if ("INSTRUCȚIUNI" in u or "INSTRUCTIUNI" in u) and inst_header_x is None:
            inst_header_x = x0
            if ing_header_y is None:
                ing_header_y = y0

    if ing_header_y is None:
        return None

    split_x = (inst_header_x - 15) if (inst_header_x and inst_header_x > 140) else (page.rect.width * 0.40)

    # 1. Header lines above INGREDIENTE
    header_lines = sorted([l for l in styled_lines if l[1] < ing_header_y - 3], key=lambda l: (round(l[1], 1), l[0]))
    header_text = "\n".join(l[4] for l in header_lines)

    serv_m = re.search(r"(\d+)\s*(?:porții|portii|porție|portie|biluțe|bucăți|felii|chifle|lipii|turte|cozonac)", header_text, re.IGNORECASE)
    if not serv_m:
        serv_m = re.search(r"INGREDIENTE\s*\(\s*(\d+)", full_text, re.IGNORECASE)

    time_m = re.search(r"(\d+(?:\s*[-–]\s*\d+)?)\s*minute", header_text, re.IGNORECASE)
    if not time_m:
        top_text = "\n".join(l[4] for l in styled_lines if l[1] < page.rect.height * 0.18)
        time_m = re.search(r"(\d+)\s*minute", top_text, re.IGNORECASE)

    # Find Title: pick the uppercase line above INGREDIENTE (or largest font uppercase line on page)
    title = None
    for x0, y0, x1, y1, txt, sz in reversed(header_lines):
        cand = txt.strip("*← ")
        if is_valid_title(cand):
            title = cand
            break

    if not title:
        # Fallback: look at all lines sorted by font size descending, then Y ascending
        for x0, y0, x1, y1, txt, sz in sorted(styled_lines, key=lambda l: (-round(l[5], 1), l[1])):
            cand = txt.strip("*← ")
            if is_valid_title(cand):
                title = cand
                break

    if not title:
        return None

    # 2. Separate Left Column vs Right Column below ing_header_y
    left_items = []
    right_items = []
    for item in styled_lines:
        x0, y0, x1, y1, txt, sz = item
        if y0 < ing_header_y - 5:
            continue
        if x0 < split_x:
            left_items.append(item)
        else:
            right_items.append(item)

    left_items.sort(key=lambda l: (round(l[1], 1), l[0]))
    right_items.sort(key=lambda l: (round(l[1], 1), l[0]))

    left_lines = [l[4] for l in left_items]
    right_lines = [l[4] for l in right_items]

    # 3. Parse Left Column: INGREDIENTE -> MACRO/PORȚIE
    raw_ing_lines = []
    macro_lines = []
    left_mode = "ING"
    for line in left_lines:
        u = line.upper().strip()
        if u.startswith("INGREDIENTE") or u in ["INSTRUCȚIUNI", "INSTRUCTIUNI"]:
            continue
        if "MACRO" in u or re.match(r"^\(\s*[~≈]?\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:g|gr|ml)\s*\)$", line, re.IGNORECASE):
            left_mode = "MACRO"
            macro_lines.append(line)
            continue
        if any(u.startswith(k) for k in ["CALORII:", "PROTEINE:", "CARBOHIDRA", "GRĂSIMI:", "GRASIMI:", "FIBRE:"]):
            left_mode = "MACRO"
            macro_lines.append(line)
            continue

        if re.match(r"^\(?\s*\d+\s*POR", u) or "SUGESTIE DE PREZENTARE" in u:
            continue
        if re.match(r"^\d+\s*(?:porții|portii|minute|calorii|kcal)$", line, re.IGNORECASE):
            continue

        if left_mode == "ING":
            raw_ing_lines.append(line)
        else:
            macro_lines.append(line)

    # 4. Parse Right Column: INSTRUCȚIUNI -> SFATURI PRACTICE
    inst_raw = []
    tips_raw = []
    allergens = ""
    variants_raw = []

    right_mode = "INST"
    for line in right_lines:
        u = line.upper().strip()
        if "INSTRUCȚIUNI" in u or "INSTRUCTIUNI" in u or u.startswith("INGREDIENTE"):
            continue
        if "SFATURI PRACTICE" in u:
            right_mode = "TIPS"
            continue
        if "SUGESTIE DE PREZENTARE" in u or re.match(r"^\(?\s*\d+\s*(?:porții|portii|minute|calorii|kcal)\s*\)?$", line, re.IGNORECASE):
            continue

        if re.match(r"^Alergeni\s*:", line, re.IGNORECASE):
            allergens = re.sub(r"^Alergeni\s*:\s*", "", line, flags=re.IGNORECASE).strip()
            right_mode = "ALLERGENS"
            continue
        if re.match(r"^(?:Alternative|Variante)\s*:", line, re.IGNORECASE):
            right_mode = "VARIANTS"
            variants_raw.append(line)
            continue

        if right_mode == "INST":
            inst_raw.append(line)
        elif right_mode == "TIPS":
            tips_raw.append(line)
        elif right_mode == "ALLERGENS":
            if not line.startswith(BULLET_CHARS):
                allergens = f"{allergens} {line}".strip()
            else:
                right_mode = "VARIANTS"
                variants_raw.append(line)
        elif right_mode == "VARIANTS":
            variants_raw.append(line)

    clean_ings = [
        i for i in clean_and_merge_lines(raw_ing_lines, is_ingredients=True)
        if len(i) > 1 and not i.endswith(":") and not re.match(r"^\(?\d+\s*POR", i.upper())
    ]
    clean_inst = clean_and_merge_lines(inst_raw, is_ingredients=False)
    # Prefix tips bullets with • so they always render as a bulleted list like in the PDF
    merged_tips = clean_and_merge_lines(tips_raw, is_ingredients=False)
    formatted_tips = [t if t.startswith("•") or t.endswith(":") else f"• {t}" for t in merged_tips]
    merged_variants = clean_and_merge_lines(variants_raw, is_ingredients=False)
    clean_tips = formatted_tips + merged_variants

    macro_text = "\n".join(macro_lines) + "\n" + full_text
    cal_m = re.search(r"Calorii:\s*~?(\d+(?:[.,]\d+)?)\s*kcal", macro_text, re.IGNORECASE) or re.search(r"(\d+(?:[.,]\d+)?)\s*(?:calorii|kcal)", header_text, re.IGNORECASE)
    prot_m = re.search(r"Proteine:\s*~?(\d+(?:[.,]\d+)?)\s*g", macro_text, re.IGNORECASE)
    carb_m = re.search(r"Carbohidra[țt]i:\s*~?(\d+(?:[.,]\d+)?)\s*g", macro_text, re.IGNORECASE)
    fat_m = re.search(r"Gr[ăa]simi:\s*~?(\d+(?:[.,]\d+)?)\s*g", macro_text, re.IGNORECASE)
    fib_m = re.search(r"Fibre:\s*~?(\d+(?:[.,]\d+)?)\s*g", macro_text, re.IGNORECASE)

    prep_time = 20
    if time_m:
        prep_time = int(re.split(r"[-–]", time_m.group(1))[-1].strip())

    return {
        "title": title.title(),
        "book_source": book_name,
        "page_number": page_num,
        "servings": int(serv_m.group(1)) if serv_m else 2,
        "prep_time_min": prep_time,
        "calories_kcal": float(cal_m.group(1).replace(",", ".")) if cal_m else 0.0,
        "protein_g": float(prot_m.group(1).replace(",", ".")) if prot_m else 0.0,
        "carbs_g": float(carb_m.group(1).replace(",", ".")) if carb_m else 0.0,
        "fat_g": float(fat_m.group(1).replace(",", ".")) if fat_m else 0.0,
        "fiber_g": float(fib_m.group(1).replace(",", ".")) if fib_m else 0.0,
        "ing_lines": clean_ings,
        "instructions": "\n".join(clean_inst),
        "tips": "\n".join(clean_tips),
        "allergens": allergens,
        "is_vegan": "post" in book_name.lower() or "vegan" in title.lower() or "post" in title.lower()
    }

def ingest_all_pdfs(reset_existing: bool = False):
    if reset_existing:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    pdf_files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print(f"No PDFs found in {PDF_DIR}.")
        return

    added = 0
    for pdf_file in pdf_files:
        path = os.path.join(PDF_DIR, pdf_file)
        print(f"Scanning {pdf_file} with line-level coordinate parser...")
        doc = fitz.open(path)
        for page_index in range(len(doc)):
            page = doc[page_index]
            parsed = parse_recipe_page_spatial(page, pdf_file, page_index + 1)
            if not parsed or not parsed["ing_lines"]:
                continue

            slug = slugify(parsed["title"])
            if not slug:
                continue

            existing = db.query(Recipe).filter(Recipe.slug == slug).first()
            if existing:
                if pdf_file not in (existing.book_source or ""):
                    existing.book_source = f"{existing.book_source}, {pdf_file}"
                    db.commit()
                continue

            img_file = extract_largest_image(doc, page, slug)
            recipe = Recipe(
                title=parsed["title"],
                slug=slug,
                book_source=parsed["book_source"],
                page_number=parsed["page_number"],
                servings=parsed["servings"],
                prep_time_min=parsed["prep_time_min"],
                calories_kcal=parsed["calories_kcal"],
                protein_g=parsed["protein_g"],
                carbs_g=parsed["carbs_g"],
                fat_g=parsed["fat_g"],
                fiber_g=parsed["fiber_g"],
                instructions=parsed["instructions"],
                tips=parsed["tips"],
                allergens=parsed["allergens"],
                image_filename=img_file,
                is_vegan=parsed["is_vegan"]
            )
            db.add(recipe)
            db.flush()

            for raw_ing in parsed["ing_lines"]:
                ing_data = parse_ingredient_line(raw_ing)
                db.add(RecipeIngredient(recipe_id=recipe.id, **ing_data))

            db.commit()
            added += 1
        doc.close()

    db.close()
    print(f"Done! Cleanly imported {added} unique recipes into SQLite.")

if __name__ == "__main__":
    ingest_all_pdfs(reset_existing=True)
