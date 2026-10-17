from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from collections import defaultdict
from core.database import get_db, Recipe
from services.extractor.pdf_parser import slugify

router = APIRouter(prefix="/api/grocery", tags=["Grocery List"])

class PlanItem(BaseModel):
    recipe_id: int
    desired_servings: int

class GroceryRequest(BaseModel):
    items: list[PlanItem]

@router.post("/generate")
def generate_grocery_list(payload: GroceryRequest, db: Session = Depends(get_db)):
    if not payload.items:
        return {"aisles": {}, "total_recipes": 0}

    recipe_map = {item.recipe_id: item.desired_servings for item in payload.items}
    recipes = db.query(Recipe).options(joinedload(Recipe.ingredients)).filter(Recipe.id.in_(recipe_map.keys())).all()

    aggregated = {}

    for r in recipes:
        base_servings = r.servings if r.servings and r.servings > 0 else 2
        target_servings = recipe_map.get(r.id, base_servings)
        multiplier = target_servings / base_servings

        for ing in r.ingredients:
            # Group by normalized name + unit
            norm_key = (slugify(ing.name), ing.unit.lower())
            scaled_qty = round(ing.quantity * multiplier, 2)

            if norm_key not in aggregated:
                aggregated[norm_key] = {
                    "name": ing.name,
                    "quantity": scaled_qty,
                    "unit": ing.unit,
                    "aisle": ing.aisle,
                    "is_optional": ing.is_optional,
                    "from_recipes": [r.title]
                }
            else:
                aggregated[norm_key]["quantity"] = round(aggregated[norm_key]["quantity"] + scaled_qty, 2)
                if r.title not in aggregated[norm_key]["from_recipes"]:
                    aggregated[norm_key]["from_recipes"].append(r.title)

    aisles = defaultdict(list)
    for item in sorted(aggregated.values(), key=lambda x: x["name"]):
        aisles[item["aisle"]].append(item)

    return {"aisles": dict(aisles), "total_recipes": len(recipes)}
