import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CafeDepense } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';
import { Receipt, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { AddExpenseModal } from './modals/AddExpenseModal';
import { db } from '../../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface ExpensesManagerProps {
  depenses: CafeDepense[];
  finance: any;
  userRole: any;
  isAdmin: boolean;
  isCafeManager: boolean;
  userId?: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

export function ExpensesManager({ 
  depenses, 
  finance, 
  userRole, 
  isAdmin, 
  isCafeManager, 
  userId = '',
  showToast,
  confirmAction
}: ExpensesManagerProps) {
  const canExpense = hasPermission(userRole, 'cafe.expenses.create') && (isAdmin || isCafeManager);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CafeDepense | null>(null);

  const handleDelete = async (id: string) => {
    confirmAction(
      "Supprimer la dépense",
      "Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action impactera votre bilan financier.",
      async () => {
        try {
          await deleteDoc(doc(db, 'cafe_depenses', id));
          showToast("Dépense supprimée avec succès !", "success");
        } catch (err) {
          showToast("Erreur lors de la suppression.", "error");
        }
      }
    );
  };

  const handleEdit = (d: CafeDepense) => {
    setEditingExpense(d);
    setIsAddExpenseOpen(true);
  };

  const { costs } = finance;

  const CategoryBox = ({ label, amount, isProd = false, subtitle }: any) => (
    <div className={`p-6 rounded-[2rem] border transition-all duration-300 group hover:shadow-soft
      ${isProd ? 'bg-gray-50 border-gray-100 hover:bg-white' : 'bg-dmn-coffee/5 border-dmn-coffee/10 hover:bg-white hover:border-dmn-coffee/30'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-[11px] font-bold text-gray-400 mt-0.5 uppercase tracking-tight">{subtitle}</p>
        </div>
        {isProd && <div className="w-2 h-2 rounded-full bg-dmn-green-500 animate-pulse" />}
      </div>
      <p className={`fintech-kpi text-xl ${isProd ? 'text-gray-900' : 'text-dmn-coffee'}`}>{formatPrice(amount)}<span className="text-xs opacity-30 ml-1 font-medium">F</span></p>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <AddExpenseModal 
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
          showToast(editingExpense ? "Dépense mise à jour !" : "Dépense enregistrée !", "success");
        }}
        userId={userId}
        editData={editingExpense}
      />
      
      {/* Overview Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 premium-card p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute left-0 top-0 w-32 h-32 bg-dmn-green-900/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-8 sm:mb-12 relative z-10 gap-6">
             <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-dmn-green-900 text-white rounded-xl sm:rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-dmn-green-900/20 shrink-0">
                   <Receipt size={24} strokeWidth={2.5} className="sm:hidden" />
                   <Receipt size={32} strokeWidth={2.5} className="hidden sm:block" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-1 sm:mb-2 text-center sm:text-left">Charges Totales</p>
                  <h1 className="fintech-kpi text-3xl sm:text-5xl lg:text-6xl text-gray-900 tracking-tighter">
                    {formatPrice(costs.totalProd + costs.operating)}<span className="text-sm sm:text-2xl text-gray-300 ml-2 sm:ml-4">F CFA</span>
                  </h1>
                </div>
             </div>
             {canExpense && (
               <button 
                  onClick={() => setIsAddExpenseOpen(true)} 
                  className="btn-primary w-full sm:w-auto h-[48px] sm:h-[60px] px-6 sm:px-8 group active:scale-95 transition-transform flex items-center justify-center gap-2"
               >
                 <Plus size={16} strokeWidth={3} />
                 <span className="text-xs sm:text-sm font-black uppercase tracking-widest">Enregistrer</span>
               </button>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-6 relative z-10">
             <div className="premium-card p-4 sm:p-6 bg-dmn-green-950 text-white flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <p className="text-xs font-black text-dmn-green-300 uppercase tracking-widest mb-2 sm:mb-4">Prod.</p>
                <p className="fintech-kpi text-lg sm:text-3xl text-dmn-gold">{formatPrice(costs.totalProd)}<span className="text-xs sm:text-sm opacity-50 ml-1">F</span></p>
             </div>
             <div className="premium-card p-4 sm:p-6 bg-dmn-coffee text-white flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <p className="text-xs font-black text-dmn-coffee-100 uppercase tracking-widest mb-2 sm:mb-4">Fonct.</p>
                <p className="fintech-kpi text-lg sm:text-3xl">{formatPrice(costs.operating)}<span className="text-xs sm:text-sm opacity-50 ml-1">F</span></p>
             </div>
          </div>
        </div>

        <div className="premium-card p-6 sm:p-10 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 sm:h-2 bg-dmn-gold" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 sm:mb-8">Répartition</h3>
          <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto no-scrollbar scrollbar-premium pr-1 max-h-[300px] sm:max-h-none">
             <CategoryBox label="Grains" amount={costs.grains} isProd={true} subtitle="Matière Première" />
             <CategoryBox label="Logistique" amount={costs.transport} isProd={true} subtitle="Transport & Fret" />
             <CategoryBox label="Packaging" amount={costs.emballage} isProd={true} subtitle="Conditionnement" />
             <CategoryBox label="Energie" amount={costs.transfert} isProd={true} subtitle="Process Tech." />
             
             {costs.depensesList.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-dashed border-gray-100 space-y-3 sm:space-y-4">
                   <p className="text-xs font-black text-dmn-coffee uppercase tracking-widest opacity-60">Flux Opérationnels</p>
                   {costs.depensesList.map((d: CafeDepense) => (
                      <CategoryBox key={d.id} label={d.motif} amount={d.montant} subtitle="Fonctionnement" />
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Journal Area */}
      <div className="premium-card overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30 text-gray-900">
          <div>
            <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">Journal des Sorties</h3>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">Traçabilité complète des flux financiers</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-dmn-green-50 rounded-full border border-dmn-green-100">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-dmn-green-600" />
            <span className="text-xs font-black text-dmn-green-900 uppercase tracking-tight">Focus Production</span>
          </div>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          {depenses.length === 0 ? (
            <div className="p-12 sm:p-24 text-center grayscale opacity-30 flex flex-col items-center">
               <AlertCircle size={40} strokeWidth={1} className="mb-4 sm:hidden" />
               <AlertCircle size={60} strokeWidth={1} className="mb-6 hidden sm:block" />
               <p className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Aucune sortie détectée</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-white">
                <tr>
                  <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                  <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Désignation</th>
                  <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Montant</th>
                  {(isAdmin || isCafeManager) && <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {depenses.slice().sort((a,b)=>b.date - a.date).map(d => {
                  const isProd = d.categorie === 'matières premières' || d.categorie === 'transport' || d.categorie === 'emballage' || (d.categorie === 'autres' && d.motif?.toLowerCase().includes('transfert'));
                  
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                      <td className="p-4 sm:p-8 whitespace-nowrap">
                         <span className="font-bold text-gray-900 text-xs sm:text-base">{simpleDate(d.date)}</span>
                      </td>
                      <td className="p-4 sm:p-8">
                        <div className="flex flex-col">
                           <span className="font-black text-gray-900 uppercase text-xs tracking-tight line-clamp-1">{d.motif || 'Aucun motif'}</span>
                           <span className={`w-fit mt-1 sm:mt-2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
                             ${isProd ? 'bg-dmn-green-900 text-white' : 'bg-dmn-coffee text-white'}`}>
                             {isProd ? 'Production' : 'Opérationnelle'}
                           </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-8 text-right">
                         <div className="flex flex-col items-end">
                            <span className="fintech-kpi text-lg sm:text-2xl text-dmn-green-900">{formatPrice(d.montant)} F</span>
                            <div className={`w-8 h-1 rounded-full mt-1 group-hover:w-16 transition-all duration-500 sm:w-12 sm:group-hover:w-24 
                               ${isProd ? 'bg-dmn-green-500/20' : 'bg-dmn-coffee/20'}`} />
                         </div>
                      </td>
                      {(isAdmin || isCafeManager) && (
                        <td className="p-4 sm:p-8 text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(d)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} className="sm:hidden" />
                              <Edit2 size={16} className="hidden sm:block" />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} className="sm:hidden" />
                              <Trash2 size={16} className="hidden sm:block" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
