import React from 'react';
import { Users, History, Edit2, Trash2, Info, CreditCard, Shield, Plus } from 'lucide-react';
import { Membre } from '../types';

interface MembersTableProps {
  membres: Membre[];
  globalSearch: string;
  nomComplet: (m: Membre) => string;
  memberStatsMap: Record<string, { totalPaid: number }>;
  isAdmin: boolean;
  isCaisse: boolean;
  globalYear: number;
  formatPrice: (amount: number) => string;
  setSelectedMemberProfile: (m: Membre) => void;
  setEditingMembre: (m: Membre | null) => void;
  setIsMembreModalOpen: (open: boolean) => void;
  handleDeleteMembre: (id: string) => void;
  openAddCot: (mId: string, mois?: string, annee?: number) => void;
  setActiveTab: (val: string) => void;
  setFinanceSubTab: (val: string) => void;
}

export const MembersTable: React.FC<MembersTableProps> = ({
  membres,
  globalSearch,
  nomComplet,
  memberStatsMap,
  isAdmin,
  isCaisse,
  globalYear,
  formatPrice,
  setSelectedMemberProfile,
  setEditingMembre,
  setIsMembreModalOpen,
  handleDeleteMembre,
  openAddCot,
  setActiveTab,
  setFinanceSubTab
}) => {
  const filtered = membres.filter(m => nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
        <span className="flex items-center gap-2"><Users size={18} className="text-dmn-gold-light" /> Membres ({membres.length})</span>
        <div className="flex items-center gap-2">
          {isCaisse && (
            <button 
              onClick={() => { setEditingMembre(null); setIsMembreModalOpen(true); }}
              className="h-10 px-5 bg-dmn-green-600 text-white rounded-xl hover:bg-dmn-green-700 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_8px_16px_-6px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto max-h-[600px]">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">N°</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Prénom & Nom</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Total payé ({globalYear})</th>
              {(isAdmin || isCaisse) && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m, i) => {
              const stats = memberStatsMap[m.id] || { totalPaid: 0 };
              const tot = stats.totalPaid;
              return (
                <tr key={m.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedMemberProfile(m)} className="hover:text-dmn-green-600 font-semibold text-gray-900 text-left flex items-center gap-2 transition-colors">
                        {m.prenom} <strong>{m.nom}</strong>
                      </button>
                      <button onClick={() => setSelectedMemberProfile(m)} className="p-1 text-gray-400 hover:text-dmn-green-600 transition-colors" title="Historique">
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-dmn-green-700">{formatPrice(tot)} F</td>
                  {isCaisse && (
                    <td className="px-6 py-4 flex justify-center gap-2">
                      <button onClick={() => setSelectedMemberProfile(m)} className="p-2 bg-dmn-green-50 text-dmn-green-600 rounded-lg hover:bg-dmn-green-100 transition-colors" title="Profil">
                        <Users size={16} />
                      </button>
                      <button onClick={() => { setEditingMembre(m); setIsMembreModalOpen(true); }} className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-95 shadow-sm">
                        <Edit2 size={16} />
                      </button>
                      {(isAdmin || isCaisse) && (
                        <button onClick={() => handleDeleteMembre(m.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 hover:text-red-700 transition-all active:scale-95 shadow-sm">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-50 bg-white">
        {filtered.map((m, i) => {
          const stats = memberStatsMap[m.id] || { totalPaid: 0 };
          const tot = stats.totalPaid;
          return (
            <div key={m.id} className="p-4 sm:p-5 flex flex-col gap-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-700 font-black text-sm">
                    {m.prenom[0]}{m.nom[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-dmn-green-900 text-sm leading-tight">{m.prenom} {m.nom}</h4>
                    <p className="text-[10px] font-black text-dmn-green-500 uppercase tracking-widest mt-0.5">{formatPrice(tot)} F de cotisations</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMemberProfile(m)} className="p-2 text-gray-400 hover:text-dmn-green-600">
                  <Info size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                <button 
                  onClick={() => { openAddCot(m.id, undefined, globalYear); setFinanceSubTab('cotisations'); setActiveTab('finance'); }}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 bg-dmn-green-50 hover:bg-dmn-green-100 rounded-2xl text-dmn-green-700 active:scale-95 transition-all outline-none border border-dmn-green-100/50"
                >
                  <CreditCard size={18} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Cotiser</span>
                </button>
                <button 
                  onClick={() => setSelectedMemberProfile(m)}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl text-blue-700 active:scale-95 transition-all outline-none border border-blue-100/50"
                >
                  <History size={18} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Historique</span>
                </button>
                {(isAdmin || isCaisse) ? (
                  <button 
                    onClick={() => { setEditingMembre(m); setIsMembreModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 bg-orange-50 hover:bg-orange-100 rounded-2xl text-orange-700 active:scale-95 transition-all outline-none border border-orange-100/50 col-span-2 min-[400px]:col-span-1"
                  >
                    <Edit2 size={18} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Modifier</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-50 rounded-2xl text-gray-400 border border-gray-100/50 opacity-40 col-span-2 min-[400px]:col-span-1">
                    <Shield size={18} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Lecteur</span>
                  </div>
                )}
                {(isAdmin || isCaisse) && (
                  <button 
                    onClick={() => handleDeleteMembre(m.id)}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 bg-red-50 hover:bg-red-100 rounded-2xl text-red-700 active:scale-95 transition-all outline-none border border-red-100/50 col-span-3 min-[400px]:col-span-3"
                  >
                    <Trash2 size={18} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Supprimer le Membre</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
