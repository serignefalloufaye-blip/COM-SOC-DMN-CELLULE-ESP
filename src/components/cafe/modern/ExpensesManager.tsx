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
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-tight">{subtitle}</p>
        </div>
        {isProd && <div className="w-2 h-2 rounded-full bg-dmn-green-500 animate-pulse" />}
      </div>
      <p className={`fintech-kpi text-xl ${isProd ? 'text-gray-900' : 'text-dmn-coffee'}`}>{formatPrice(amount)}<span className="text-xs opacity-30 ml-1 font-medium">F</span></p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute left-0 top-0 w-32 h-32 bg-dmn-green-900/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex items-start justify-between mb-12 relative z-10">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-dmn-green-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-dmn-green-900/20">
                   <Receipt size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Total des Charges</p>
                  <h1 className="fintech-kpi text-5xl sm:text-6xl text-gray-900 tracking-tighter">
                    {formatPrice(costs.totalProd + costs.operating)}<span className="text-2xl text-gray-300 ml-4">F CFA</span>
                  </h1>
                </div>
             </div>
             {canExpense && (
               <button 
                  onClick={() => setIsAddExpenseOpen(true)} 
                  className="btn-primary h-[60px] px-8 group active:scale-95 transition-transform"
               >
                 <Plus size={20} strokeWidth={3} />
                 <span className="text-sm font-black uppercase tracking-widest ml-2">Enregistrer</span>
               </button>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-6 relative z-10">
             <div className="premium-card p-6 bg-dmn-green-950 text-white flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <p className="text-[10px] font-black text-dmn-green-300 uppercase tracking-widest mb-4">Investissement Prod.</p>
                <p className="fintech-kpi text-3xl text-dmn-gold">{formatPrice(costs.totalProd)}<span className="text-sm opacity-50 ml-1">F</span></p>
             </div>
             <div className="premium-card p-6 bg-dmn-coffee text-white flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <p className="text-[10px] font-black text-dmn-coffee-100 uppercase tracking-widest mb-4">Fonctionnement / Op.</p>
                <p className="fintech-kpi text-3xl">{formatPrice(costs.operating)}<span className="text-sm opacity-50 ml-1">F</span></p>
             </div>
          </div>
        </div>

        <div className="premium-card p-10 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-2 bg-dmn-gold" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Répartition Analytique</h3>
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar scrollbar-premium pr-2">
             <CategoryBox label="Matière Première" amount={costs.grains} isProd={true} subtitle="Achat Grains Verts" />
             <CategoryBox label="Logistique" amount={costs.transport} isProd={true} subtitle="Transport & Fret" />
             <CategoryBox label="Conditionnement" amount={costs.emballage} isProd={true} subtitle="Packaging & Étiquettes" />
             <CategoryBox label="Process Tech." amount={costs.transfert} isProd={true} subtitle="Moulage & Energie" />
             
             {costs.depensesList.length > 0 && (
                <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 space-y-4">
                   <p className="text-[10px] font-black text-dmn-coffee uppercase tracking-widest opacity-60">Autres Flux Opérationnels</p>
                   {costs.depensesList.map((d: CafeDepense) => (
                      <CategoryBox key={d.id} label={d.motif} amount={d.montant} subtitle="Frais de fonctionnement" />
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Journal Area */}
      <div className="premium-card overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30 text-gray-900">
          <div>
            <h3 className="text-2xl font-black tracking-tight">Journal des Sorties</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Traçabilité complète des flux financiers sortants</p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-dmn-green-50 rounded-full border border-dmn-green-100">
                <div className="w-2 h-2 rounded-full bg-dmn-green-600" />
                <span className="text-[10px] font-black text-dmn-green-900 uppercase tracking-tight">Flux Production</span>
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {depenses.length === 0 ? (
            <div className="p-24 text-center grayscale opacity-30 flex flex-col items-center">
               <AlertCircle size={60} strokeWidth={1} className="mb-6" />
               <p className="font-black uppercase tracking-[0.2em] text-xs">Aucune sortie de trésorerie détectée</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-white">
                <tr>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Horodatage</th>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Désignation</th>
                  <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Montant Transaction</th>
                  {(isAdmin || isCafeManager) && <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {depenses.slice().sort((a,b)=>b.date - a.date).map(d => {
                  const isProd = d.categorie === 'matières premières' || d.categorie === 'transport' || d.categorie === 'emballage' || (d.categorie === 'autres' && d.motif?.toLowerCase().includes('transfert'));
                  
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                      <td className="p-8">
                         <span className="font-bold text-gray-900">{simpleDate(d.date)}</span>
                      </td>
                      <td className="p-8">
                        <div className="flex flex-col">
                           <span className="font-black text-gray-900 uppercase text-xs tracking-tight">{d.motif || 'Aucun motif spécifié'}</span>
                           <span className={`w-fit mt-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm
                             ${isProd ? 'bg-dmn-green-900 text-white' : 'bg-dmn-coffee text-white'}`}>
                             {isProd ? 'Charge Production' : 'Charge Fonctionnement'}
                           </span>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                         <div className="flex flex-col items-end">
                            <span className="fintech-kpi text-2xl text-dmn-green-900">{formatPrice(d.montant)} F</span>
                            <div className={`w-12 h-1 rounded-full mt-1 group-hover:w-24 transition-all duration-500 
                               ${isProd ? 'bg-dmn-green-500/20' : 'bg-dmn-coffee/20'}`} />
                         </div>
                      </td>
                      {(isAdmin || isCafeManager) && (
                        <td className="p-8 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(d)}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
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
