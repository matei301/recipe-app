from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import os, shutil
from core.database import get_db, Recipe, RecipeIngredient
from services.extractor.pdf_parser import ingest_all_pdfs, PDF_DIR, slugify
from services.normalizer.parser import parse_ingredient_line
from pydantic import BaseModel

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])

class ManualRecipeCreate(BaseModel):
    title: str
    servings: int = 2
    prep_time_min: int = 20
    calories_kcal: float = 250.0
    protein_g: float = 20.0
    carbs_g: float = 20.0
    fat_g: float = 10.0
    fiber_g: float = 3.0
    is_vegan: bool = False
    allergens: str = ""
    instructions: str
    tips: str = ""
    ingredients_raw: list[str]

@router.get("")
def list_recipes(
    search: Optional[str] = Query(None),
    book: Optional[str] = Query(None),
    max_calories: Optional[float] = Query(None),
    min_protein: Optional[float] = Query(None),
    max_time: Optional[int] = Query(None),
    only_vegan: bool = Query(False),
    exclude_allergen: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Recipe).options(joinedload(Recipe.ingredients))

    if only_vegan:
        query = query.filter(Recipe.is_vegan == True)
    if max_calories is not None and max_calories > 0:
        query = query.filter(Recipe.calories_kcal <= max_calories, Recipe.calories_kcal > 0)
    if min_protein is not None and min_protein > 0:
        query = query.filter(Recipe.protein_g >= min_protein)
    if max_time is not None and max_time > 0:
        query = query.filter(Recipe.prep_time_min <= max_time)
    if book:
        query = query.filter(Recipe.book_source.ilike(f"%{book}%"))
    if exclude_allergen:
        query = query.filter(~Recipe.allergens.ilike(f"%{exclude_allergen}%"))

    recipes = query.order_by(Recipe.title.asc()).all()

    if search:
        s_clean = slugify(search).replace("-", " ")
        filtered = []
        for r in recipes:
            title_match = s_clean in slugify(r.title).replace("-", " ")
            ing_match = any(s_clean in slugify(i.raw_text).replace("-", " ") for i in r.ingredients)
            if title_match or ing_match:
                filtered.append(r)
        recipes = filtered

    return [
        {
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "book_source": r.book_source,
            "page_number": r.page_number,
            "servings": r.servings,
            "prep_time_min": r.prep_time_min,
            "calories_kcal": r.calories_kcal,
            "protein_g": r.protein_g,
            "carbs_g": r.carbs_g,
            "fat_g": r.fat_g,
            "fiber_g": r.fiber_g,
            "instructions": r.instructions,
            "tips": r.tips,
            "allergens": r.allergens,
            "is_vegan": r.is_vegan,
            "image_url": f"http://localhost:8000/images/{r.image_filename}" if r.image_filename else None,
            "ingredients": [
                {
                    "id": i.id,
                    "raw_text": i.raw_text,
                    "name": i.name,
                    "quantity": i.quantity,
                    "unit": i.unit,
                    "aisle": i.aisle,
                    "is_optional": i.is_optional
                }
                for i in r.ingredients
            ]
        }
        for r in recipes
    ]

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    os.makedirs(PDF_DIR, exist_ok=True)
    dest = os.path.join(PDF_DIR, file.filename)
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    ingest_all_pdfs()
    return {"status": "ok", "filename": file.filename}

@router.post("/manual")
def create_manual_recipe(payload: ManualRecipeCreate, db: Session = Depends(get_db)):
    slug = slugify(payload.title)
    if db.query(Recipe).filter(Recipe.slug == slug).first():
        raise HTTPException(status_code=400, detail="A recipe with this title already exists.")
    recipe = Recipe(
        title=payload.title,
        slug=slug,
        book_source="Adăugat Manual",
        page_number=1,
        servings=payload.servings,
        prep_time_min=payload.prep_time_min,
        calories_kcal=payload.calories_kcal,
        protein_g=payload.protein_g,
        carbs_g=payload.carbs_g,
        fat_g=payload.fat_g,
        fiber_g=payload.fiber_g,
        instructions=payload.instructions,
        tips=payload.tips,
        allergens=payload.allergens,
        is_vegan=payload.is_vegan
    )
    db.add(recipe)
    db.flush()
    for line in payload.ingredients_raw:
        if line.strip():
            ing_data = parse_ingredient_line(line)
            db.add(RecipeIngredient(recipe_id=recipe.id, **ing_data))
    db.commit()
    return {"status": "created", "id": recipe.id}
