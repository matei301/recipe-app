import os
import re
import fitz  # PyMuPDF
from core.database import SessionLocal, Recipe, RecipeIngredient, init_db
from services.normalizer.parser import parse_ingredient_line

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
PDF_DIR = os.path.join(DATA_DIR, "pdfs")
IMG_DIR = os.path.join(DATA_DIR, "images")
os.makedirs(IMG_DIR, exist_ok=True)

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
        # Filter out small icons, arrows, and star badges
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

def parse_recipe_page(text: str, book_name: str, page_num: int) -> dict | None:
    if "INGREDIENTE" not in text.upper() or ("INSTRUCȚIUNI" not in text.upper() and "INSTRUCTIUNI" not in text.upper()):
        return None

    # Metrics from top bar
    serv_m = re.search(r"(\d+)\s*(?:porții|portii|porție|portie|biluțe|bucăți|felii|chifle|lipii|turte|cozonac)", text, re.IGNORECASE)
    time_m = re.search(r"(\d+)\s*minute", text, re.IGNORECASE)
    cal_m = re.search(r"Calorii:\s*(\d+(?:[.,]\d+)?)\s*kcal", text, re.IGNORECASE) or re.search(r"(\d+(?:[.,]\d+)?)\s*(?:calorii|kcal)", text, re.IGNORECASE)
    
    prot_m = re.search(r"Proteine:\s*~?(\d+(?:[.,]\d+)?)\s*g", text, re.IGNORECASE)
    carb_m = re.search(r"Carbohidra[țt]i:\s*~?(\d+(?:[.,]\d+)?)\s*g", text, re.IGNORECASE)
    fat_m = re.search(r"Grăsimi:\s*~?(\d+(?:[.,]\d+)?)\s*g", text, re.IGNORECASE)
    fib_m = re.search(r"Fibre:\s*~?(\d+(?:[.,]\d+)?)\s*g", text, re.IGNORECASE)

    # Extract Title (uppercase line preceding INGREDIENTE or following SUGESTIE DE PREZENTARE)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    title = None
    for idx, line in enumerate(lines):
        if "INGREDIENTE" in line.upper():
            # Look backwards for uppercase title
            for back in range(idx - 1, max(-1, idx - 6), -1):
                cand = lines[back].strip("* ")
                if len(cand) > 4 and cand.isupper() and "SUGESTIE" not in cand and "MACRO" not in cand and "CALORII" not in cand:
                    title = cand
                    break
            break
    if not title:
        for line in lines:
            if len(line) > 5 and line.isupper() and not any(k in line for k in ["INGREDIENTE", "INSTRUC", "SFATURI", "MACRO", "SUGESTIE"]):
                title = line
                break
    if not title:
        return None

    # Split sections
    ing_lines = []
    inst_lines = []
    tips_lines = []
    allergens = ""

    mode = None
    for line in lines:
        u = line.upper()
        if "INGREDIENTE" in u:
            mode = "ING"
            continue
        elif "INSTRUCȚIUNI" in u or "INSTRUCTIUNI" in u:
            mode = "INST"
            continue
        elif "SFATURI PRACTICE" in u:
            mode = "TIPS"
            continue
        elif "MACRO/POR" in u or "SUGESTIE DE PREZENTARE" in u:
            continue

        if line.lower().startswith("alergeni:"):
            allergens = line.split(":", 1)[1].strip()
            continue

        if mode == "ING":
            if not any(k in u for k in ["CALORII:", "PROTEINE:", "CARBOHIDRA", "GRĂSIMI:", "FIBRE:", "MACRO"]):
                ing_lines.append(line)
        elif mode == "INST":
            inst_lines.append(line)
        elif mode == "TIPS":
            tips_lines.append(line)

    return {
        "title": title.title(),
        "book_source": book_name,
        "page_number": page_num,
        "servings": int(serv_m.group(1)) if serv_m else 2,
        "prep_time_min": int(time_m.group(1)) if time_m else 20,
        "calories_kcal": float(cal_m.group(1).replace(",", ".")) if cal_m else 0.0,
        "protein_g": float(prot_m.group(1).replace(",", ".")) if prot_m else 0.0,
        "carbs_g": float(carb_m.group(1).replace(",", ".")) if carb_m else 0.0,
        "fat_g": float(fat_m.group(1).replace(",", ".")) if fat_m else 0.0,
        "fiber_g": float(fib_m.group(1).replace(",", ".")) if fib_m else 0.0,
        "ing_lines": [l for l in ing_lines if len(l) > 2 and not l.endswith(":")],
        "instructions": "\n".join(inst_lines),
        "tips": "\n".join(tips_lines),
        "allergens": allergens,
        "is_vegan": "post" in book_name.lower() or "vegan" in title.lower() or "post" in title.lower()
    }

def ingest_all_pdfs():
    init_db()
    db = SessionLocal()
    pdf_files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print(f"No PDFs found in {PDF_DIR}. Please copy your PDF files there first!")
        return

    added = 0
    for pdf_file in pdf_files:
        path = os.path.join(PDF_DIR, pdf_file)
        print(f"Scanning {pdf_file}...")
        doc = fitz.open(path)
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text("text")
            parsed = parse_recipe_page(text, pdf_file, page_index + 1)
            if not parsed:
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
    print(f"Done! Imported {added} unique recipes with photos into SQLite.")

if __name__ == "__main__":
    ingest_all_pdfs()
