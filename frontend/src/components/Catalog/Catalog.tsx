import React, { useState } from 'react';
import type { Recipe } from '../../types';
import { Clock, Flame, Users, Plus, Check, Eye, X, BookOpen } from 'lucide-react';

interface CatalogProps {
  recipes: Recipe[];
  selectedIds: number[];
  onToggleSelect: (recipe: Recipe) => void;
}

export const Catalog: React.FC<CatalogProps> = ({ recipes, selectedIds, onToggleSelect }) => {
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  const renderFormattedLines = (text: string) => {
    return text.split('\n').filter(Boolean).map((line, idx) => {
      const trimmed = line.trim();
      const isNumbered = /^\d+[\.\)]/.test(trimmed);
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
      const isLabel = /^(Alergeni|Alternative|Variante|Sfaturi)\s*:/i.test(trimmed);

      if (isLabel) {
        const [label, ...rest] = trimmed.split(':');
        return (
          <p key={idx} className="mt-2 text-slate-800">
            <strong className="font-bold text-slate-900">{label}:</strong>
            {rest.join(':')}
          </p>
        );
      }
      if (isNumbered) {
        return <p key={idx} className="pl-1 py-0.5 text-slate-800">{trimmed}</p>;
      }
      if (isBullet) {
        return <p key={idx} className="pl-2 py-0.5 text-slate-700">{trimmed}</p>;
      }
      return <p key={idx} className="text-slate-600 italic mb-2">{trimmed}</p>;
    });
  };

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
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
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

            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-slate-700">
              <div className="flex items-center gap-6">
                <span>🍴 <strong>{activeRecipe.servings}</strong> porții</span>
                <span>🕒 <strong>{activeRecipe.prep_time_min}</strong> minute</span>
                <span>🔥 <strong>{Math.round(activeRecipe.calories_kcal)}</strong> calorii</span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> {activeRecipe.book_source} (Pag. {activeRecipe.page_number})
              </span>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">{activeRecipe.title}</h2>
                <button
                  onClick={() => onToggleSelect(activeRecipe)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shrink-0 ${
                    selectedIds.includes(activeRecipe.id) ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  {selectedIds.includes(activeRecipe.id) ? <><Check className="w-4 h-4" /> În Lista de Cumpărături</> : <><Plus className="w-4 h-4" /> Adaugă în Plan</>}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 flex flex-col justify-between space-y-8">
                  <div>
                    <h4 className="font-extrabold text-slate-900 mb-3 text-base uppercase tracking-wide">
                      INGREDIENTE ({activeRecipe.servings} PORȚII)
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-800">
                      {activeRecipe.ingredients.map((ing) => (
                        <li key={ing.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                          <span>• {ing.raw_text}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">{ing.aisle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-extrabold text-slate-900 mb-2 text-base uppercase tracking-wide">
                      MACRO/PORȚIE
                    </h4>
                    <ul className="space-y-1 text-sm text-slate-800">
                      <li>• <strong>Calorii:</strong> {activeRecipe.calories_kcal} kcal</li>
                      <li>• <strong>Proteine:</strong> {activeRecipe.protein_g} g</li>
                      <li>• <strong>Grăsimi:</strong> {activeRecipe.fat_g} g</li>
                      <li>• <strong>Carbohidrați:</strong> {activeRecipe.carbs_g} g</li>
                      {activeRecipe.fiber_g > 0 && <li>• <strong>Fibre:</strong> {activeRecipe.fiber_g} g</li>}
                    </ul>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col justify-between space-y-8">
                  <div>
                    <h4 className="font-extrabold text-slate-900 mb-3 text-base uppercase tracking-wide">
                      INSTRUCȚIUNI
                    </h4>
                    <div className="text-sm leading-relaxed space-y-1.5">
                      {renderFormattedLines(activeRecipe.instructions)}
                    </div>
                  </div>

                  {(activeRecipe.tips || activeRecipe.allergens) && (
                    <div className="pt-2 border-t border-slate-200">
                      <h4 className="font-extrabold text-slate-900 mb-3 text-base uppercase tracking-wide">
                        SFATURI PRACTICE
                      </h4>
                      <div className="text-sm leading-relaxed space-y-1.5">
                        {activeRecipe.tips && renderFormattedLines(activeRecipe.tips)}
                        {activeRecipe.allergens && (
                          <p className="mt-2 text-slate-800">
                            <strong className="font-bold text-slate-900">Alergeni:</strong> {activeRecipe.allergens}
                          </p>
                        )}
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
