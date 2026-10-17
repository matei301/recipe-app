import { useEffect, useState } from 'react';
import { Recipe, SelectedMeal, GroceryItem } from './types';
import { FilterBar } from './components/FilterBar/FilterBar';
import { Catalog } from './components/Catalog/Catalog';
import { GroceryListModal } from './components/GroceryList/GroceryListModal';
import { UploadModal } from './components/Uploader/UploadModal';
import { UtensilsCrossed, ShoppingBag, Plus } from 'lucide-react';

export function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [book, setBook] = useState('');
  const [maxCalories, setMaxCalories] = useState(1000);
  const [minProtein, setMinProtein] = useState(0);
  const [maxTime, setMaxTime] = useState(240);
  const [onlyVegan, setOnlyVegan] = useState(false);
  const [excludeAllergen, setExcludeAllergen] = useState('');

  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [aisles, setAisles] = useState<Record<string, GroceryItem[]>>({});
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchRecipes = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (book) params.set('book', book);
    if (maxCalories < 1000) params.set('max_calories', String(maxCalories));
    if (minProtein > 0) params.set('min_protein', String(minProtein));
    if (maxTime < 240) params.set('max_time', String(maxTime));
    if (onlyVegan) params.set('only_vegan', 'true');
    if (excludeAllergen) params.set('exclude_allergen', excludeAllergen);

    const res = await fetch(`http://localhost:8000/api/recipes?${params.toString()}`);
    const data = await res.json();
    setRecipes(data);
  };

  useEffect(() => {
    fetchRecipes();
  }, [search, book, maxCalories, minProtein, maxTime, onlyVegan, excludeAllergen]);

  useEffect(() => {
    const updateGrocery = async () => {
      if (selectedMeals.length === 0) {
        setAisles({});
        return;
      }
      const res = await fetch('http://localhost:8000/api/grocery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedMeals.map((m) => ({
            recipe_id: m.recipe.id,
            desired_servings: m.desired_servings
          }))
        })
      });
      const data = await res.json();
      setAisles(data.aisles || {});
    };
    updateGrocery();
  }, [selectedMeals]);

  const toggleSelectRecipe = (recipe: Recipe) => {
    setSelectedMeals((prev) => {
      const exists = prev.find((m) => m.recipe.id === recipe.id);
      if (exists) return prev.filter((m) => m.recipe.id !== recipe.id);
      return [...prev, { recipe, desired_servings: recipe.servings || 2 }];
    });
  };

  const updateServings = (recipeId: number, servings: number) => {
    setSelectedMeals((prev) =>
      prev.map((m) => (m.recipe.id === recipeId ? { ...m, desired_servings: servings } : m))
    );
  };

  const resetFilters = () => {
    setSearch('');
    setBook('');
    setMaxCalories(1000);
    setMinProtein(0);
    setMaxTime(240);
    setOnlyVegan(false);
    setExcludeAllergen('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900">BT FIT Recipe & Grocery Planner</h1>
              <p className="text-xs text-slate-500">Catalog local de rețete & generator listă de cumpărături</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Adaugă Rețetă / PDF
            </button>

            <button
              onClick={() => setShowGroceryModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Listă Cumpărături
              <span className="bg-white text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                {selectedMeals.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FilterBar
          search={search} setSearch={setSearch}
          book={book} setBook={setBook}
          maxCalories={maxCalories} setMaxCalories={setMaxCalories}
          minProtein={minProtein} setMinProtein={setMinProtein}
          maxTime={maxTime} setMaxTime={setMaxTime}
          onlyVegan={onlyVegan} setOnlyVegan={setOnlyVegan}
          excludeAllergen={excludeAllergen} setExcludeAllergen={setExcludeAllergen}
          onReset={resetFilters}
          totalCount={recipes.length}
        />

        <Catalog
          recipes={recipes}
          selectedIds={selectedMeals.map((m) => m.recipe.id)}
          onToggleSelect={toggleSelectRecipe}
        />
      </main>

      {showGroceryModal && (
        <GroceryListModal
          selectedMeals={selectedMeals}
          onUpdateServings={updateServings}
          onRemoveMeal={(id) => setSelectedMeals((prev) => prev.filter((m) => m.recipe.id !== id))}
          onClearAll={() => setSelectedMeals([])}
          aisles={aisles}
          onClose={() => setShowGroceryModal(false)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchRecipes}
        />
      )}
    </div>
  );
}
export default App;
