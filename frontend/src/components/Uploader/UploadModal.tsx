import React, { useState } from 'react';
import { X, Upload, PlusCircle } from 'lucide-react';

interface UploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(2);
  const [prepTime, setPrepTime] = useState(15);
  const [calories, setCalories] = useState(300);
  const [protein, setProtein] = useState(25);
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    await fetch('http://localhost:8000/api/recipes/upload-pdf', { method: 'POST', body: formData });
    setUploadingPdf(false);
    onSuccess();
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:8000/api/recipes/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        servings,
        prep_time_min: prepTime,
        calories_kcal: calories,
        protein_g: protein,
        carbs_g: 20,
        fat_g: 10,
        fiber_g: 4,
        is_vegan: false,
        allergens: '',
        instructions,
        tips: '',
        ingredients_raw: ingredientsText.split('\n').filter(Boolean)
      })
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold text-slate-900">Încarcă PDF sau Adaugă Rețetă</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/40 text-center space-y-2">
          <Upload className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-xs font-medium text-slate-700">Încarcă o carte PDF nouă cu rețete</p>
          <input type="file" accept=".pdf" onChange={handlePdfUpload} className="text-xs" />
          {uploadingPdf && <p className="text-xs text-emerald-700 font-bold">Se procesează PDF-ul și imaginile...</p>}
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
          <h3 className="font-bold text-slate-700 uppercase">Sau adaugă o rețetă manual</h3>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlul rețetei" className="w-full p-2.5 border rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            <input type="number" value={servings} onChange={(e) => setServings(Number(e.target.value))} placeholder="Porții" className="p-2 border rounded-xl" />
            <input type="number" value={prepTime} onChange={(e) => setPrepTime(Number(e.target.value))} placeholder="Minute" className="p-2 border rounded-xl" />
            <input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} placeholder="Calorii" className="p-2 border rounded-xl" />
            <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} placeholder="Proteine (g)" className="p-2 border rounded-xl" />
          </div>
          <textarea required rows={4} value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} placeholder="Ingrediente (câte unul pe rând, ex: 200 g piept de pui)" className="w-full p-2.5 border rounded-xl" />
          <textarea required rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instrucțiuni de preparare..." className="w-full p-2.5 border rounded-xl" />
          <button type="submit" className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800">
            <PlusCircle className="w-4 h-4" /> Salvează Rețeta
          </button>
        </form>
      </div>
    </div>
  );
};
