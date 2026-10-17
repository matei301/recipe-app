from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from core.database import init_db
from modules.recipes.router import router as recipes_router
from modules.grocery.router import router as grocery_router

init_db()

app = FastAPI(title="BT FIT Modular Recipe & Grocery App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

images_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/images"))
os.makedirs(images_path, exist_ok=True)
app.mount("/images", StaticFiles(directory=images_path), name="images")

app.include_router(recipes_router)
app.include_router(grocery_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
