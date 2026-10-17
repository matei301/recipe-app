import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
os.makedirs(BASE_DIR, exist_ok=True)
DB_PATH = os.path.join(BASE_DIR, "recipes.db")

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True)
    book_source = Column(String, index=True)
    page_number = Column(Integer)
    servings = Column(Integer, default=2)
    prep_time_min = Column(Integer, default=15)
    calories_kcal = Column(Float, default=0.0)
    protein_g = Column(Float, default=0.0)
    carbs_g = Column(Float, default=0.0)
    fat_g = Column(Float, default=0.0)
    fiber_g = Column(Float, default=0.0)
    instructions = Column(Text, default="")
    tips = Column(Text, default="")
    allergens = Column(String, default="")
    image_filename = Column(String, nullable=True)
    is_vegan = Column(Boolean, default=False)

    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    raw_text = Column(String, nullable=False)
    name = Column(String, index=True, nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String, default="buc")
    aisle = Column(String, default="Diverse")
    is_optional = Column(Boolean, default=False)

    recipe = relationship("Recipe", back_populates="ingredients")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
