import React, { useState } from 'react';
import { SelectedMeal, GroceryItem } from '../../types';
import { X, Trash2, Copy, Check, Printer, ShoppingCart } from 'lucide-react';

interface GroceryProps {
  selectedMeals: SelectedMeal[];
  onUpdateServings: (recipeId: number, servings: number) => void;
  onRemoveMeal: (recipeId: number) => void;
  onClearAll: () => void;
  aisles: Record<string, GroceryItem[]>;
  onClose: () => void;
}

export const GroceryListModal: React.FC<GroceryProps> = ({
  selectedMeals, onUpdateServings, onRemoveMeal, onClearAll, aisles, onClose
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = () => {
    let text = "🛒 LISTA DE CUMPĂRĂTURI\n\n";
    text += "📋 Rețete selectate:\n";
    selectedMeals.forEach((m) => {
      text += `- ${m.recipe.title} (${m.desired_servings} porții)\n`;
    });
    text += "\n";
    Object.entries(aisles).forEach(([aisle, items]) => {
      text += `=== ${aisle.toUpperCase()} ===\n`;
      items.forEach((it) => {
        text += `[ ] ${it.name}: ${it.quantity} ${it.unit}\n`;
      });
      text += "\n";
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCalories = selectedMeals.reduce(
    (acc, m) => acc + m.recipe.calories_kcal * m.desired_servings, 0
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Planificator Mese & Listă de Cumpărături</h2>
              <p className="text-xs text-slate-500">
                {selectedMeals.length} rețete selectate • Total estimat plan: {Math.round(totalCalories)} kcal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={copyToClipboard} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700">
              {copied ? <><Check className="w-4 h-4" /> Copiat!</> : <><Copy className="w-4 h-4" /> Copiază Lista</>}
            </button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50">
              <Printer className="w-4 h-4" /> Printează
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border-r border-slate-100 pr-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Rețete Selectate</h3>
              {selectedMeals.length > 0 && (
                <button onClick={onClearAll} className="text-xs text-red-600 hover:underline">Golește tot</button>
              )}
            </div>

            {selectedMeals.map(({ recipe, desired_servings }) => (
              <div key={recipe.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-slate-800">{recipe.title}</span>
                  <button onClick={() => onRemoveMeal(recipe.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Porții dorite:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateServings(recipe.id, Math.max(1, desired_servings - 1))}
                      className="w-6 h-6 rounded bg-white border border-slate-300 font-bold"
                    >-</button>
                    <span className="font-bold text-slate-900 w-5 text-center">{desired_servings}</span>
                    <button
                      onClick={() => onUpdateServings(recipe.id, desired_servings + 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 font-bold"
                    >+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 space-y-5">
            <h3 className="font-bold text-slate-800 text-sm">Ingrediente Agregate pe Raioane</h3>
            {Object.keys(aisles).length === 0 ? (
              <p className="text-sm text-slate-400">Selectează cel puțin o rețetă din catalog pentru a genera lista de cumpărături.</p>
            ) : (
              Object.entries(aisles).map(([aisle, items]) => (
                <div key={aisle} className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-3">{aisle}</h4>
                  <ul className="space-y-2">
                    {items.map((item, idx) => {
                      const key = `${aisle}-${idx}`;
                      const isDone = !!checkedItems[key];
                      return (
                        <li
                          key={key}
                          onClick={() => toggleCheck(key)}
                          className={`flex items-center justify-between text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                            isDone ? 'line-through text-slate-400 bg-slate-100' : 'text-slate-800 bg-white border border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input type="checkbox" checked={isDone} readOnly className="rounded text-emerald-600" />
                            <span className="font-medium">{item.name}</span>
                            {item.is_optional && <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">opțional</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700">{item.quantity} {item.unit}</span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[180px]">
                              din: {item.from_recipes.join(', ')}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
