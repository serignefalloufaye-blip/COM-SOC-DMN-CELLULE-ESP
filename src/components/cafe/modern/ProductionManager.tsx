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
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
        <h3 className={`fintech-kpi text-3xl text-gray-900`}>{value}</h3>
        {subLabel && <p className="text-[10px] font-bold text-gray-400 mt-2">{subLabel}</p>}
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg ${colorClass}`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatPanel 
          label="Volume Production" 
          value={`${production.quantity} kg`}
          subLabel="Total traité sur la période"
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
          label="P.R.U (1kg)" 
          value={`${formatPrice(Math.round(coutMoyenKg))} F/kg`}
          subLabel="Coût de revient unitaire"
          icon={Tag}
          colorClass="bg-dmn-gold text-white shadow-dmn-gold/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Breakdown */}
        <div className="premium-card p-10 flex flex-col relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-gray-50 rounded-full" />
          
          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="w-10 h-10 rounded-full bg-dmn-green-900 text-white flex items-center justify-center shadow-lg">
              <PieChart size={20} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Décomposition des Coûts</h3>
          </div>

          <div className="space-y-4 relative z-10">
            {[
              { l: "Grains", v: costs.grains, s: "Achat matière première" },
              { l: "Transport", v: costs.transport, s: "Logistique & Fret" },
              { l: "Moulage", v: costs.transfert, s: "Transformation & Usinage" },
              { l: "Emballage", v: costs.emballage, s: "Sachets & Étiquetage" },
              { l: "Frais transfert", v: costs.autresProduction, s: "Autres charges directes" }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100 flex justify-between items-center hover:bg-white hover:shadow-soft transition-all duration-300">
                <div>
                  <p className="font-bold text-gray-900">{item.l}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.s}</p>
                </div>
                <p className="fintech-kpi text-xl text-gray-900">{formatPrice(item.v)}<span className="text-xs opacity-30 ml-1">F</span></p>
              </div>
            ))}
            
            <div className="pt-6 mt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
               <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Total Investi</p>
               <p className="fintech-kpi text-3xl text-dmn-green-900">{formatPrice(costs.totalProd)}<span className="text-sm opacity-30 ml-2">F CFA</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-10 relative z-10">
             <div className="bg-gray-900 p-6 rounded-[2.5rem] text-white">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Simul. Coût 1kg</p>
                <p className="text-3xl font-black text-dmn-gold">{formatPrice(Math.round(coutMoyenKg))}<span className="text-sm opacity-50 ml-1 font-medium">F</span></p>
             </div>
             <div className="bg-dmn-coffee p-6 rounded-[2.5rem] text-white">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Simul. Coût 500g</p>
                <p className="text-3xl font-black text-white">{formatPrice(Math.round(coutMoyenSachet500g))}<span className="text-sm opacity-50 ml-1 font-medium">F</span></p>
             </div>
          </div>
        </div>

        {/* Production History */}
        <div className="premium-card flex flex-col overflow-hidden">
          <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Registre Production</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Historique des lots conditionnés</p>
            </div>
            {canProduce && (
              <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="btn-primary py-3 px-8 flex items-center gap-3 transition-transform hover:-translate-y-1"
              >
                <Plus size={18} strokeWidth={3} />
                <span>Nouveau Lot</span>
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-[400px]">
            {productions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 p-20 grayscale opacity-50">
                <Package size={80} strokeWidth={1} className="mb-6" />
                <p className="font-black uppercase tracking-widest text-xs">Aucun registre de production</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10">
                  <tr>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Lot Qualité</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Volume</th>
                    {(isAdmin || isCafeManager) && <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50">
                  {productions.slice().sort((a,b)=>b.date - a.date).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-8">
                        <span className="font-bold text-gray-900">{simpleDate(p.date)}</span>
                      </td>
                      <td className="p-8">
                        <span className="text-sm font-medium text-gray-500 italic">
                          {p.observations || 'Aucune note spécifique'}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-900 fintech-kpi text-xl rounded-2xl group-hover:bg-emerald-100 transition-colors">
                          {p.quantite} <span className="text-xs opacity-50 font-black uppercase">kg</span>
                        </span>
                      </td>
                      {(isAdmin || isCafeManager) && (
                        <td className="p-8 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
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
