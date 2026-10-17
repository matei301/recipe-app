import React from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface FilterProps {
  search: string;
  setSearch: (v: string) => void;
  book: string;
  setBook: (v: string) => void;
  maxCalories: number;
  setMaxCalories: (v: number) => void;
  minProtein: number;
  setMinProtein: (v: number) => void;
  maxTime: number;
  setMaxTime: (v: number) => void;
  onlyVegan: boolean;
  setOnlyVegan: (v: boolean) => void;
  excludeAllergen: string;
  setExcludeAllergen: (v: string) => void;
  onReset: () => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterProps> = ({
  search, setSearch, book, setBook, maxCalories, setMaxCalories,
  minProtein, setMinProtein, maxTime, setMaxTime, onlyVegan, setOnlyVegan,
  excludeAllergen, setExcludeAllergen, onReset, totalCount
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută rețetă sau ingredient (ex: pui, avocado, năut)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={book}
            onChange={(e) => setBook(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="">Toate Cărțile (PDF)</option>
            <option value="367">367 Rețete Sănătoase</option>
            <option value="POST">Rețete de Post</option>
            <option value="INTERNA">Rețete Internaționale</option>
            <option value="TRADI">Rețete Tradiționale</option>
            <option value="SĂRBĂTORI">Sărbători Sănătoase</option>
            <option value="Manual">Adăugate Manual</option>
          </select>

          <select
            value={excludeAllergen}
            onChange={(e) => setExcludeAllergen(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="">Fără restricții alergeni</option>
            <option value="lact">Fără Lactoză / Lactate</option>
            <option value="gluten">Fără Gluten</option>
            <option value="ou">Fără Ouă</option>
            <option value="nuci">Fără Nuci / Arahide</option>
            <option value="soia">Fără Soia</option>
            <option value="pește">Fără Pește</option>
          </select>

          <label className="flex items-center gap-2 text-sm font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyVegan}
              onChange={(e) => setOnlyVegan(e.target.checked)}
              className="rounded text-emerald-600"
            />
            Doar De Post / Vegan
          </label>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Resetează
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs text-slate-600">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> Calorii Max:</span>
            <span className="font-bold text-slate-800">{maxCalories === 1000 ? 'Oricât' : `${maxCalories} kcal`}</span>
          </div>
          <input type="range" min="100" max="1000" step="25" value={maxCalories} onChange={(e) => setMaxCalories(Number(e.target.value))} className="w-full accent-emerald-600" />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">Proteine Minime:</span>
            <span className="font-bold text-slate-800">{minProtein} g / porție</span>
          </div>
          <input type="range" min="0" max="50" step="5" value={minProtein} onChange={(e) => setMinProtein(Number(e.target.value))} className="w-full accent-emerald-600" />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">Timp Preparare Max:</span>
            <span className="font-bold text-slate-800">{maxTime === 240 ? 'Oricât' : `${maxTime} min`}</span>
          </div>
          <input type="range" min="5" max="240" step="5" value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))} className="w-full accent-emerald-600" />
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium">
        Afișate: <span className="text-emerald-700 font-bold">{totalCount}</span> rețete
      </div>
    </div>
  );
};
