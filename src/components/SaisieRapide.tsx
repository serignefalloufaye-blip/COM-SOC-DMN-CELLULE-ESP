import React from 'react';
import { History, CheckCircle2, Edit3, Trash2, Smartphone, Search, Zap, Plus } from 'lucide-react';
import { Membre, Cotisation } from '../types';
import { MOIS } from '../data';
import { formatPrice } from '../utils/format';
import { formatMoisPreposition } from '../utils/date';

interface SaisieRapideProps {
  membres: Membre[];
  cotisations: Cotisation[];
  globalYear: number;
  globalMonth: string;
  globalSearch: string;
  quickAmounts: Record<string, number | ''>;
  setQuickAmounts: React.Dispatch<React.SetStateAction<Record<string, number | ''>>>;
  quickMonths: Record<string, string[]>;
  setQuickMonths: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  activeActionMenu: { mId: string, mois: string } | null;
  setActiveActionMenu: React.Dispatch<React.SetStateAction<{ mId: string, mois: string } | null>>;
  isAdmin: boolean;
  isCaisse: boolean;
  setEditingCot: (cot: Partial<Cotisation>) => void;
  setIsCotModalOpen: (open: boolean) => void;
  setEditingRecette: (rec: any) => void;
  setIsRecetteModalOpen: (open: boolean) => void;
  handleDeleteCotisation: (id: string) => Promise<void>;
  handleQuickSaveCotisation: (mId: string, montant: number, mode: string) => Promise<void>;
  setSelectedMemberProfile: (m: Membre) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  nomComplet: (m: Membre) => string;
}

export const SaisieRapide: React.FC<SaisieRapideProps> = ({
  membres,
  cotisations,
  globalYear,
  globalMonth,
  globalSearch,
  quickAmounts,
  setQuickAmounts,
  quickMonths,
  setQuickMonths,
  activeActionMenu,
  setActiveActionMenu,
  isAdmin,
  isCaisse,
  setEditingCot,
  setIsCotModalOpen,
  setEditingRecette,
  setIsRecetteModalOpen,
  handleDeleteCotisation,
  handleQuickSaveCotisation,
  setSelectedMemberProfile,
  showToast,
  nomComplet
}) => {
  const filteredMembres = membres.filter(m => nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase()));

  const [bulkAmount, setBulkAmount] = React.useState<number | ''>(500);
  const [bulkMonths, setBulkMonths] = React.useState<string[]>([]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span className="flex items-center gap-2">
          <Zap size={18} className="text-dmn-gold-light" /> Saisie Rapide ({globalYear})
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => { setEditingRecette({}); setIsRecetteModalOpen(true); }}
            className="bg-white text-dmn-green-900 border-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 outline-none"
          >
            <Plus size={14} strokeWidth={2.5} /> Recette
          </button>
          <div className="text-[10px] bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest font-bold">
            {filteredMembres.length} Membres
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 sm:p-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex-1 w-full">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Sélection groupée (Mois & Montant)</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1 p-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex-1">
              {MOIS.map(m => (
                <button
                  key={m}
                  onClick={() => setBulkMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                  className={`text-[9px] font-black px-2 py-1.5 rounded-lg border transition-all ${
                    bulkMonths.includes(m) 
                      ? 'bg-dmn-green-600 text-white border-dmn-green-500 shadow-md shadow-dmn-green-600/10' 
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  {m.substring(0, 3)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <input 
                  type="number" 
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Montant"
                  className="w-24 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-dmn-green-500/20 outline-none transition-all pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">F</span>
              </div>
              <button 
                onClick={() => {
                  const updates: Record<string, string[]> = {};
                  const amounts: Record<string, number> = {};
                  filteredMembres.forEach(m => {
                    const unpaidInBulk = bulkMonths.filter(mois => !cotisations.some(c => c.mId === m.id && c.mois?.toUpperCase() === mois?.toUpperCase() && c.annee === globalYear && c.montant > 0));
                    if (unpaidInBulk.length > 0) {
                      updates[m.id] = unpaidInBulk;
                      amounts[m.id] = Number(bulkAmount) || 500;
                    }
                  });
                  setQuickMonths(prev => ({ ...prev, ...updates }));
                  setQuickAmounts(prev => ({ ...prev, ...amounts }));
                  showToast(`${Object.keys(updates).length} membres mis à jour`);
                }}
                disabled={bulkMonths.length === 0}
                className="bg-dmn-green-600 hover:bg-dmn-green-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-dmn-green-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Zap size={14} /> Appliquer à tous
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto max-h-[600px]">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Membre</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mois</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Montant (F)</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Actions Directes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredMembres.map(m => {
              const currentAmount = quickAmounts[m.id] === undefined ? '' : quickAmounts[m.id];
              const defaultMonth = globalMonth || MOIS[new Date().getMonth()];
              const selectedMonths = quickMonths[m.id] !== undefined 
                ? quickMonths[m.id] 
                : (!cotisations.some(c => c.mId === m.id && c.mois?.toUpperCase() === defaultMonth?.toUpperCase() && c.annee === globalYear && c.montant > 0) ? [defaultMonth] : []);

              return (
                <tr key={m.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedMemberProfile(m)}
                      className="font-semibold text-gray-900 hover:text-dmn-green-600 flex items-center gap-2 text-left transition-colors"
                    >
                      {nomComplet(m)}
                      <History size={14} className="text-gray-400" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sélection :</p>
                      <button 
                        onClick={() => {
                          const unpaid = MOIS.filter(mois => !cotisations.some(c => c.mId === m.id && c.mois?.toUpperCase() === mois?.toUpperCase() && c.annee === globalYear && c.montant > 0));
                          setQuickMonths(prev => ({ ...prev, [m.id]: unpaid }));
                        }}
                        className="text-[9px] font-black text-dmn-green-600 hover:text-dmn-green-700 bg-dmn-green-50 px-2 py-1 rounded-lg uppercase tracking-widest transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 size={10} /> Tout impayé
                      </button>
                      <button 
                        onClick={() => setQuickMonths(prev => ({ ...prev, [m.id]: [] }))}
                        className="text-[9px] font-black text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-widest transition-colors"
                      >
                        Vider
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                      {MOIS.map(mois => {
                        const existingCot = cotisations.find(c => c.mId === m.id && c.mois?.toUpperCase() === mois?.toUpperCase() && c.annee === globalYear);
                        const isPaid = existingCot && existingCot.montant > 0;
                        const isSelected = selectedMonths.includes(mois);
                        
                        return (
                          <div className="relative" key={mois}>
                            <button
                              onClick={() => {
                                if (isPaid) {
                                  setActiveActionMenu(activeActionMenu?.mId === m.id && activeActionMenu?.mois?.toUpperCase() === mois?.toUpperCase() ? null : { mId: m.id, mois });
                                  return;
                                }
                                setQuickMonths(prev => {
                                  const current = prev[m.id] !== undefined ? prev[m.id] : selectedMonths;
                                  if (current.includes(mois)) return { ...prev, [m.id]: current.filter(x => x !== mois) };
                                  return { ...prev, [m.id]: [...current, mois] };
                                });
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md border transition-all duration-200 ${
                                isPaid ? 'bg-dmn-green-50 text-dmn-green-700 border-dmn-green-200 hover:bg-dmn-green-100' :
                                isSelected ? 'bg-dmn-gold text-white border-dmn-gold shadow-md transform scale-105 font-bold' :
                                'bg-white text-gray-500 border-gray-200 hover:border-dmn-green-300 hover:text-dmn-green-600'
                              }`}
                              title={isPaid ? `Payé: ${existingCot.montant}F (${existingCot.mode}) - Clic pour options` : `Sélectionner le ${formatMoisPreposition(mois)}`}
                            >
                              {mois.substring(0, 4)} {isPaid ? '✓' : ''}
                            </button>
                            
                            {activeActionMenu?.mId === m.id && activeActionMenu?.mois?.toUpperCase() === mois?.toUpperCase() && isPaid && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1 min-w-[120px] animate-in zoom-in-95 duration-200">
                                {(isAdmin || isCaisse) ? (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setEditingCot(existingCot);
                                        setIsCotModalOpen(true);
                                        setActiveActionMenu(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-dmn-green-50 rounded-lg flex items-center gap-2 text-gray-700 font-medium"
                                    >
                                      <Edit3 size={12} className="text-dmn-green-600" /> Modifier
                                    </button>
                                    {(isAdmin || isCaisse) && (
                                      <button 
                                        onClick={() => {
                                          handleDeleteCotisation(existingCot.id);
                                          setActiveActionMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 rounded-lg flex items-center gap-2 text-red-600 font-medium"
                                      >
                                        <Trash2 size={12} /> Supprimer
                                      </button>
                                    )}
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button 
                                      onClick={() => setActiveActionMenu(null)}
                                      className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600"
                                    >
                                      Fermer
                                    </button>
                                  </>
                                ) : (
                                  <div className="px-3 py-2 text-[10px] text-gray-400 font-medium italic">
                                    Lecture seule
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      placeholder="500"
                      value={currentAmount}
                      onChange={(e) => setQuickAmounts({...quickAmounts, [m.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 bg-white shadow-sm transition-all w-24"
                    />
                    {selectedMonths.length > 1 && currentAmount !== '' && (
                      <div className="text-xs font-bold text-dmn-green-700 bg-dmn-green-50 px-2 py-1 rounded-lg border border-dmn-green-100 mt-2 inline-block">
                        Total: {formatPrice(selectedMonths.length * Number(currentAmount))} F
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'WAVE')}
                        disabled={selectedMonths.length === 0 || currentAmount === ''}
                        className="bg-[#00a1ff] hover:bg-[#008bde] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                      >
                        WAVE
                      </button>
                      <button 
                        onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'OM')}
                        disabled={selectedMonths.length === 0 || currentAmount === ''}
                        className="bg-[#ff6600] hover:bg-[#e65c00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                      >
                        OM
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-50 flex flex-col bg-white">
        {filteredMembres.map(m => {
          const currentAmount = quickAmounts[m.id] === undefined ? '' : quickAmounts[m.id];
          const defaultMonth = globalMonth || MOIS[new Date().getMonth()];
          const selectedMonths = quickMonths[m.id] !== undefined 
            ? quickMonths[m.id] 
            : (!cotisations.some(c => c.mId === m.id && c.mois === defaultMonth && c.annee === globalYear && c.montant > 0) ? [defaultMonth] : []);

          return (
            <div key={m.id} className="p-4 sm:p-5 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-700 font-black text-sm">
                    {m.prenom[0]}{m.nom[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-dmn-green-900 text-sm leading-tight">{m.prenom} {m.nom}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Saisie directe</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 relative">
                  <div className="flex gap-1.5 justify-end mb-1">
                    <button onClick={(e) => { e.preventDefault(); setQuickAmounts({...quickAmounts, [m.id]: 500}); }} className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600 hover:bg-gray-200">500</button>
                    <button onClick={(e) => { e.preventDefault(); setQuickAmounts({...quickAmounts, [m.id]: 1000}); }} className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600 hover:bg-gray-200">1000</button>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="500"
                      value={currentAmount}
                      onChange={(e) => setQuickAmounts({...quickAmounts, [m.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                      className="border border-gray-200 rounded-2xl pl-3 pr-8 py-2.5 text-sm font-black focus:outline-none focus:border-dmn-green-500 bg-gray-50/50 shadow-inner w-24 text-right"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">F</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Mois à payer :</p>
                <button 
                  onClick={() => {
                    const unpaid = MOIS.filter(mois => !cotisations.some(c => c.mId === m.id && c.mois?.toUpperCase() === mois?.toUpperCase() && c.annee === globalYear && c.montant > 0));
                    setQuickMonths(prev => ({ ...prev, [m.id]: unpaid }));
                  }}
                  className="text-[8px] font-black text-dmn-green-600 bg-dmn-green-50 px-2 py-1 rounded-lg uppercase transition-colors"
                >
                  Tout
                </button>
                <button 
                  onClick={() => setQuickMonths(prev => ({ ...prev, [m.id]: [] }))}
                  className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase transition-colors"
                >
                  Vider
                </button>
              </div>
              <div className="bg-gray-50/50 rounded-2xl p-2.5 flex flex-wrap gap-1.5 border border-gray-100">
                {MOIS.map(mois => {
                  const existingCot = cotisations.find(c => c.mId === m.id && c.mois?.toUpperCase() === mois?.toUpperCase() && c.annee === globalYear);
                  const isPaid = existingCot && existingCot.montant > 0;
                  const isSelected = selectedMonths.includes(mois);
                  
                  return (
                    <button
                      key={mois}
                      onClick={() => {
                        if (isPaid) {
                          if (isAdmin || isCaisse) {
                            handleDeleteCotisation(existingCot.id);
                          } else {
                            showToast("Accès manager requis pour supprimer", 'error');
                          }
                          return;
                        }
                        setQuickMonths(prev => {
                          const current = prev[m.id] !== undefined ? prev[m.id] : selectedMonths;
                          if (current.includes(mois)) return { ...prev, [m.id]: current.filter(x => x !== mois) };
                          return { ...prev, [m.id]: [...current, mois] };
                        });
                      }}
                      className={`text-[9px] px-2.5 py-1.5 rounded-xl border transition-all flex items-center justify-center min-w-[42px] uppercase font-black tracking-tighter ${
                        isPaid ? 'bg-dmn-green-50 text-dmn-green-700 border-dmn-green-200' :
                        isSelected ? 'bg-dmn-gold text-white border-dmn-gold shadow-md shadow-dmn-gold/20' :
                        'bg-white text-gray-400 border-gray-100'
                      }`}
                    >
                      {mois.substring(0, 4)} {isPaid ? '✓' : ''}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'WAVE')}
                  disabled={selectedMonths.length === 0 || currentAmount === ''}
                  className="bg-[#1dc6f8] hover:bg-[#15b2e0] flex items-center justify-center gap-2 text-white py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30 transition-all"
                >
                  <Smartphone size={16} /> WAVE
                </button>
                <button 
                  onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'OM')}
                  disabled={selectedMonths.length === 0 || currentAmount === ''}
                  className="bg-[#ff6600] hover:bg-[#e65c00] flex items-center justify-center gap-2 text-white py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-30 transition-all"
                >
                  <Smartphone size={16} className="text-orange-200" /> ORANGE
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
