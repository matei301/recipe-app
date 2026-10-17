export interface Ingredient {
  id: number;
  raw_text: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  is_optional: boolean;
}

export interface Recipe {
  id: number;
  title: string;
  slug: string;
  book_source: string;
  page_number: number;
  servings: number;
  prep_time_min: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  instructions: string;
  tips: string;
  allergens: string;
  is_vegan: boolean;
  image_url: string | null;
  ingredients: Ingredient[];
}

export interface SelectedMeal {
  recipe: Recipe;
  desired_servings: number;
}

export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  is_optional: boolean;
  from_recipes: string[];
}

// Runtime dummy exports so Vite 8 / browser ES modules never throw SyntaxError
export const Recipe = {};
export const Ingredient = {};
export const SelectedMeal = {};
export const GroceryItem = {};
