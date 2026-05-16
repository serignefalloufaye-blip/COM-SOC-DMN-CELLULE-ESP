import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CafeProduction, CafeDepense } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';
import { Plus, Package, Calendar, Tag, Factory, Wallet, PieChart, Edit2, Trash2 } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { AddProductionModal } from './modals/AddProductionModal';
import { db } from '../../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface ProductionManagerProps {
  productions: CafeProduction[];
  depenses: CafeDepense[];
  finance: any;
  userRole: any;
  isAdmin: boolean;
  isCafeManager: boolean;
  userId: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

export function ProductionManager({ 
  productions, 
  depenses, 
  finance, 
  userRole, 
  isAdmin, 
  isCafeManager, 
  userId,
  showToast,
  confirmAction
}: ProductionManagerProps) {
  const canProduce = hasPermission(userRole, 'cafe.production.create') && (isAdmin || isCafeManager);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<CafeProduction | null>(null);
  
  const handleDelete = async (id: string) => {
    confirmAction(
      "Supprimer la production",
      "Êtes-vous sûr de vouloir supprimer ce lot de production ? Cette action est irréversible.",
      async () => {
        try {
          await deleteDoc(doc(db, 'cafe_productions', id));
          showToast("Production supprimée avec succès !", "success");
        } catch (err) {
          showToast("Erreur lors de la suppression.", "error");
        }
      }
    );
  };

  const handleEdit = (p: CafeProduction) => {
    setEditingProduction(p);
    setIsAddModalOpen(true);
  };

  const { costs, production } = finance;

  // Calculs par unité
  const coutMoyenKg = production.quantity > 0 ? costs.totalProd / production.quantity : 0;
  const coutMoyenSachet500g = coutMoyenKg / 2;

  const StatPanel = ({ label, value, subLabel, icon: Icon, colorClass }: any) => (
    <div className="premium-card p-8 group flex items-center justify-between border-gray-100 hover:border-emerald-100">
      <div className="relative z-10">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
        <h3 className={`fintech-kpi text-3xl text-gray-900`}>{value}</h3>
        {subLabel && <p className="text-[11px] font-bold text-gray-400 mt-2">{subLabel}</p>}
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg ${colorClass}`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <AddProductionModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduction(null);
        }} 
        onSuccess={() => {
          setIsAddModalOpen(false);
          setEditingProduction(null);
          showToast(editingProduction ? "Production mise à jour !" : "Production ajoutée !", "success");
        }} 
        userId={userId}
        editData={editingProduction}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
        <StatPanel 
          label="Volume Production" 
          value={`${production.quantity} kg`}
          subLabel="Total traité"
          icon={Factory}
          colorClass="bg-emerald-900 text-white shadow-emerald-900/20"
        />
        <StatPanel 
          label="Investissement Brut" 
          value={`${formatPrice(costs.totalProd)} F`}
          subLabel="Cumul des charges directes"
          icon={Wallet}
          colorClass="bg-dmn-coffee text-white shadow-dmn-coffee/20"
        />
        <StatPanel 
          label="Matières Secondaires" 
          value={`${formatPrice(costs.transport + costs.transfert + costs.emballage)} F`}
          subLabel="Logistique & emballage"
          icon={Tag}
          colorClass="bg-dmn-gold text-white shadow-dmn-gold/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Cost Breakdown */}
        <div className="premium-card p-6 sm:p-10 flex flex-col relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-gray-50 rounded-full" />
          
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10 relative z-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-dmn-green-900 text-white flex items-center justify-center shadow-lg shrink-0">
              <PieChart size={18} className="sm:hidden" />
              <PieChart size={20} className="hidden sm:block" />
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">Coûts de Production</h3>
          </div>

          <div className="space-y-3 sm:space-y-4 relative z-10">
            {[
              { l: "Grains", v: costs.grains, s: "Achat matière première" },
              { l: "Transport", v: costs.transport, s: "Logistique & Fret" },
              { l: "Moulage", v: costs.transfert, s: "Transformation" },
              { l: "Emballage", v: costs.emballage, s: "Sachets" },
              { l: "Autres", v: costs.autresProduction, s: "Charges directes" }
            ].map((item, i) => (
              <div key={i} className="p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-gray-50 border border-gray-100 flex justify-between items-center hover:bg-white hover:shadow-soft transition-all duration-300">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{item.l}</p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 mt-1 truncate">{item.s}</p>
                </div>
                <p className="fintech-kpi text-lg sm:text-xl text-gray-900 whitespace-nowrap">{formatPrice(item.v)}<span className="text-xs opacity-30 ml-1 uppercase">CFA</span></p>
              </div>
            ))}
            
            <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
               <p className="text-[10px] sm:text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Total</p>
               <p className="fintech-kpi text-2xl sm:text-3xl text-dmn-green-900">{formatPrice(costs.totalProd)}<span className="text-[10px] sm:text-sm opacity-30 ml-2">F CFA</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-10 relative z-10">
             <div className="bg-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] text-white">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-2">Coût 1kg</p>
                <p className="text-xl sm:text-3xl font-black text-dmn-gold">{formatPrice(Math.round(coutMoyenKg))}<span className="text-xs opacity-50 ml-0.5 font-medium uppercase">CFA</span></p>
             </div>
             <div className="bg-dmn-coffee p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] text-white">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-2">Coût 500g</p>
                <p className="text-xl sm:text-3xl font-black text-white">{formatPrice(Math.round(coutMoyenSachet500g))}<span className="text-xs opacity-50 ml-0.5 font-medium uppercase">CFA</span></p>
             </div>
          </div>
        </div>

        {/* Production History */}
        <div className="premium-card flex flex-col overflow-hidden">
          <div className="p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">Registre Production</h3>
              <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">Derniers lots conditionnés</p>
            </div>
            {canProduce && (
              <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="btn-primary w-full sm:w-auto h-[48px] sm:h-[56px] px-6 sm:px-8 flex items-center justify-center gap-3 transition-transform hover:-translate-y-1"
              >
                <Plus size={16} strokeWidth={3} className="sm:hidden" />
                <Plus size={18} strokeWidth={3} className="hidden sm:block" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest">Nouveau Lot</span>
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-x-auto no-scrollbar min-h-[300px] sm:min-h-[400px]">
            {productions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 p-10 sm:p-20 grayscale opacity-50">
                <Package size={60} strokeWidth={1} className="mb-4 sm:hidden" />
                <Package size={80} strokeWidth={1} className="mb-6 hidden sm:block" />
                <p className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Aucun registre</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                <thead className="bg-white sticky top-0 z-10">
                  <tr>
                    <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                    <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Lot Qualité</th>
                    <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Volume</th>
                    {(isAdmin || isCafeManager) && <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right whitespace-nowrap">Act.</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50">
                  {productions.slice().sort((a,b)=>b.date - a.date).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4 sm:p-8 whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-xs sm:text-base">{simpleDate(p.date)}</span>
                      </td>
                      <td className="p-4 sm:p-8">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 italic line-clamp-1 sm:line-clamp-none">
                          {p.observations || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-8 text-right">
                        <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-emerald-50 text-emerald-900 fintech-kpi text-base sm:text-xl rounded-xl sm:rounded-2xl group-hover:bg-emerald-100 transition-colors whitespace-nowrap">
                          {p.quantite} <span className="text-xs opacity-50 font-black uppercase">kg</span>
                        </span>
                      </td>
                      {(isAdmin || isCafeManager) && (
                        <td className="p-4 sm:p-8 text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} className="sm:hidden" />
                              <Edit2 size={16} className="hidden sm:block" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} className="sm:hidden" />
                              <Trash2 size={16} className="hidden sm:block" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
