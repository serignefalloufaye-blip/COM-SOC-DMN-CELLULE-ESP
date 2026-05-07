import React from 'react';
import { Clock } from 'lucide-react';

interface AdminDateInputProps {
  userRole: string;
  defaultValue?: string; // e.g., '2023-10-05T14:30'
}

export default function AdminDateInput({ userRole, defaultValue }: AdminDateInputProps) {
  if (userRole !== 'admin') return null;

  return (
    <div className="pt-2 border-t border-gray-100 mt-4">
      <label className="block text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1.5 flex items-center gap-1.5">
        <Clock size={12} /> Date Manuelle (Admin Seulement)
      </label>
      <input 
        type="datetime-local" 
        name="customDate" 
        defaultValue={defaultValue || ''}
        className="w-full border border-orange-200/50 bg-orange-50/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-orange-900/80"
      />
      <p className="text-[10px] text-orange-400 opacity-60 mt-1 italic">
        Laissez vide pour utiliser la date et heure actuelles.
      </p>
    </div>
  );
}
