import React, { useState } from 'react';
import type { Recipe } from '../../types';
import { Clock, Flame, Users, Plus, Check, Eye, X, BookOpen, AlertTriangle } from 'lucide-react';

interface CatalogProps {
  recipes: Recipe[];
  selectedIds: number[];
  onToggleSelect: (recipe: Recipe) => void;
}

export const Catalog: React.FC<CatalogProps> = ({ recipes, selectedIds, onToggleSelect }) => {
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {recipes.map((r) => {
          const isSelected = selectedIds.includes(r.id);
          return (
            <div key={r.id} className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}>
              <div>
                <div className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setActiveRecipe(r)}>
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Fără imagine</div>
                  )}
                  {r.is_vegan && (
                    <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow">
                      De Post / Vegan
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" /> {Math.round(r.calories_kcal)} kcal
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 cursor-pointer hover:text-emerald-700" onClick={() => setActiveRecipe(r)}>
                    {r.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.prep_time_min} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.servings} porții</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                    <div><span className="block font-bold text-slate-800">{r.protein_g}g</span><span className="text-slate-400">Prot</span></div>
                    <div><span className="block font-bold text-slate-800">{r.carbs_g}g</span><span className="text-slate-400">Carb</span></div>
                    <div><span className="block font-bold text-slate-800">{r.fat_g}g</span><span className="text-slate-400">Grăs</span></div>
                    <div><span className="block font-bold text-slate-800">{r.fiber_g}g</span><span className="text-slate-400">Fibre</span></div>
                  </div>
                </div>
              </div>

              <div className="p-3 pt-0 flex gap-2">
                <button
                  onClick={() => setActiveRecipe(r)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Detalii
                </button>
                <button
                  onClick={() => onToggleSelect(r)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? <><Check className="w-3.5 h-3.5" /> Selectat</> : <><Plus className="w-3.5 h-3.5" /> În Listă</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeRecipe && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="relative h-64 bg-slate-100">
              {activeRecipe.image_url && (
                <img src={activeRecipe.image_url} alt={activeRecipe.title} className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => setActiveRecipe(null)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
              >
                <X className="w-5 h-5 text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mb-1">
                    <BookOpen className="w-3.5 h-3.5" /> {activeRecipe.book_source} (Pag. {activeRecipe.page_number})
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{activeRecipe.title}</h2>
                </div>
                <button
                  onClick={() => onToggleSelect(activeRecipe)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    selectedIds.includes(activeRecipe.id) ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  {selectedIds.includes(activeRecipe.id) ? <><Check className="w-4 h-4" /> În Lista de Cumpărături</> : <><Plus className="w-4 h-4" /> Adaugă în Plan</>}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl text-center text-xs">
                <div><span className="text-slate-400 block">Porții</span><span className="font-bold text-slate-800">{activeRecipe.servings}</span></div>
                <div><span className="text-slate-400 block">Timp</span><span className="font-bold text-slate-800">{activeRecipe.prep_time_min} min</span></div>
                <div><span className="text-slate-400 block">Calorii</span><span className="font-bold text-emerald-700">{activeRecipe.calories_kcal} kcal</span></div>
                <div><span className="text-slate-400 block">Proteine</span><span className="font-bold text-slate-800">{activeRecipe.protein_g} g</span></div>
                <div><span className="text-slate-400 block">Carbohidrați</span><span className="font-bold text-slate-800">{activeRecipe.carbs_g} g</span></div>
                <div><span className="text-slate-400 block">Grăsimi</span><span className="font-bold text-slate-800">{activeRecipe.fat_g} g</span></div>
              </div>

              {activeRecipe.allergens && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>Alergeni:</strong> {activeRecipe.allergens}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Ingrediente ({activeRecipe.servings} porții)</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {activeRecipe.ingredients.map((ing) => (
                      <li key={ing.id} className="flex items-start justify-between border-b border-slate-100 pb-1.5">
                        <span>• {ing.raw_text}</span>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-2 shrink-0">{ing.aisle}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Instrucțiuni de preparare</h4>
                    <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {activeRecipe.instructions}
                    </div>
                  </div>

                  {activeRecipe.tips && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider text-emerald-700">Sfaturi Practice & Variante</h4>
                      <div className="text-xs text-slate-600 whitespace-pre-line bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                        {activeRecipe.tips}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
