import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CafeVente, CafePriceConfig, CafeSeller, CafeClient } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';
import { ShoppingCart, TrendingUp, TrendingDown, Plus, Users, Percent, Box, Edit2, Trash2 } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { AddSaleModal } from './modals/AddSaleModal';
import { db } from '../../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface SalesManagerProps {
  ventes: CafeVente[];
  finance: any;
  userRole: any;
  priceConfig: CafePriceConfig | null;
  sellers?: CafeSeller[];
  clients?: CafeClient[];
  userId?: string;
  currentSellerId?: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

export function SalesManager({ 
  ventes, 
  finance, 
  userRole, 
  priceConfig, 
  sellers = [], 
  clients = [], 
  userId = '',
  currentSellerId,
  showToast,
  confirmAction
}: SalesManagerProps) {
  const isRevendeur = !!currentSellerId;
  const canSell = isRevendeur || hasPermission(userRole, 'cafe.sales.create');
  const isAdmin = userRole === 'admin';
  const isCafeManager = userRole === 'cafe';
  const canModify = isAdmin || isCafeManager;
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<CafeVente | null>(null);

  // Stats calculate locals for reseller if needed
  const localStats = React.useMemo(() => {
    if (!isRevendeur) return null;
    const v1kgNormal = ventes.filter(v => v.format === '1kg' && v.prixUnitaire >= (priceConfig?.prices?.['1kg']?.normal || 0));
    const v1kgReduc = ventes.filter(v => v.format === '1kg' && v.prixUnitaire < (priceConfig?.prices?.['1kg']?.normal || 0));
    const v500gNormal = ventes.filter(v => v.format === '500g' && v.prixUnitaire >= (priceConfig?.prices?.['500g']?.normal || 0));
    const v500gReduc = ventes.filter(v => v.format === '500g' && v.prixUnitaire < (priceConfig?.prices?.['500g']?.normal || 0));
    const total = ventes.reduce((s, v) => s + v.total, 0);
    return { v1kgNormal, v1kgReduc, v500gNormal, v500gReduc, total };
  }, [ventes, isRevendeur, priceConfig]);

  const activeSales = isRevendeur && localStats ? localStats : finance.sales;

  const handleDelete = async (id: string) => {
    confirmAction(
      "Supprimer la vente",
      "Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action annulera le flux financier dans vos bilans.",
      async () => {
        try {
          await deleteDoc(doc(db, 'cafe_ventes', id));
          showToast("Vente supprimée avec succès !", "success");
        } catch (err) {
          showToast("Erreur lors de la suppression.", "error");
        }
      }
    );
  };

  const handleEdit = (v: CafeVente) => {
    setEditingSale(v);
    setIsAddSaleOpen(true);
  };

  const { sales } = finance;

    const DetailCard = ({ title, subtitle, dataNormal, dataReduc, colorClass }: any) => {
      const totalNormal = dataNormal.reduce((a: number, b: any) => a + (b.total || 0), 0);
      const totalReduc = dataReduc.reduce((a: number, b: any) => a + (b.total || 0), 0);
      const totalVentes = totalNormal + totalReduc;
      const qteNormal = dataNormal.reduce((a: number, b: any) => a + b.quantite, 0);
      const qteReduc = dataReduc.reduce((a: number, b: any) => a + b.quantite, 0);
  
      return (
        <div className="premium-card p-6 sm:p-8 flex flex-col relative overflow-hidden group">
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 bg-current transition-transform group-hover:scale-125 ${colorClass}`} />
          
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 relative z-10 gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mb-0.5 sm:mb-1">{title}</h3>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{subtitle}</p>
            </div>
            <div className="sm:text-right w-full sm:w-auto">
              <p className="fintech-kpi text-2xl sm:text-3xl text-gray-900">{formatPrice(totalVentes)}<span className="text-xs sm:text-sm opacity-30 ml-2">F</span></p>
              <div className="flex items-center gap-1 sm:justify-end mt-1 text-dmn-green-600 font-bold text-[11px] uppercase tracking-widest">
                 <Box size={10} />
                 {qteNormal + qteReduc} unités
              </div>
            </div>
          </div>
  
          <div className="grid grid-cols-2 gap-3 sm:gap-6 relative z-10">
            <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-soft transition-all duration-300">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-2 sm:mb-3">
                Standard
                <TrendingUp size={10} className="text-dmn-green-600 sm:hidden" />
                <TrendingUp size={12} className="text-dmn-green-600 hidden sm:block" />
              </p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{formatPrice(totalNormal)}<span className="text-[10px] opacity-30 ml-0.5">F</span></p>
              <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-tight line-clamp-1">{qteNormal} sacs</p>
            </div>
            <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-soft transition-all duration-300">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-2 sm:mb-3">
                Réduit
                <Percent size={10} className="text-dmn-gold sm:hidden" />
                <Percent size={12} className="text-dmn-gold hidden sm:block" />
              </p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{formatPrice(totalReduc)}<span className="text-[10px] opacity-30 ml-0.5">F</span></p>
              <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-tight line-clamp-1">{qteReduc} remisés</p>
            </div>
          </div>
        </div>
      );
    };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <AddSaleModal 
        isOpen={isAddSaleOpen}
        onClose={() => {
          setIsAddSaleOpen(false);
          setEditingSale(null);
        }}
        onSuccess={() => {
          setIsAddSaleOpen(false);
          setEditingSale(null);
          showToast(editingSale ? "Vente mise à jour !" : "Vente enregistrée !", "success");
        }}
        userId={userId}
        sellers={sellers}
        clients={clients}
        priceConfig={priceConfig}
        editData={editingSale}
        fixedSellerId={currentSellerId}
      />
      
      {/* Ventes Overview Header */}
      <div className="premium-card p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-dmn-green-900/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex items-center gap-4 sm:gap-8 relative z-10 w-full sm:w-auto">
          <div className="w-12 h-12 sm:w-20 sm:h-20 bg-dmn-green-900 text-white rounded-xl sm:rounded-[2rem] flex items-center justify-center shadow-xl shadow-dmn-green-900/20 active:scale-95 transition-transform cursor-pointer shrink-0">
            <ShoppingCart size={24} strokeWidth={2.5} className="sm:hidden" />
            <ShoppingCart size={40} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-1 sm:mb-2">{isRevendeur ? 'Mes Ventes' : "Chiffre d'Affaires"}</p>
            <h2 className="fintech-kpi text-3xl sm:text-7xl text-dmn-green-950">
              {formatPrice(activeSales.total)}<span className="text-sm sm:text-2xl text-gray-300 ml-2 sm:ml-4">F CFA</span>
            </h2>
          </div>
        </div>
        
        {canSell && (
          <button 
             onClick={() => setIsAddSaleOpen(true)} 
             className="btn-primary w-full md:w-auto h-[50px] sm:h-[70px] px-6 sm:px-12 group flex items-center justify-center gap-3 sm:gap-4 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <Plus size={18} strokeWidth={3} className="sm:hidden" />
            <Plus size={24} strokeWidth={3} className="hidden sm:block" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{isRevendeur ? 'Vendre du café' : 'Enregistrer une vente'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <DetailCard 
          title="Format 1 Kilogramme"
          subtitle={isRevendeur ? "Mes ventes directes" : `Std: ${formatPrice(priceConfig?.prices?.['1kg']?.normal || 6000)} F | Réduc: ${formatPrice(priceConfig?.prices?.['1kg']?.reduc || 5500)} F`}
          dataNormal={activeSales.v1kgNormal}
          dataReduc={activeSales.v1kgReduc}
          colorClass="text-dmn-green-900"
        />

        <DetailCard 
          title="Format 500 Grammes"
          subtitle={isRevendeur ? "Mes ventes directes" : `Std: ${formatPrice(priceConfig?.prices?.['500g']?.normal || 3000)} F | Réduc: ${formatPrice(priceConfig?.prices?.['500g']?.reduc || 2750)} F`}
          dataNormal={activeSales.v500gNormal}
          dataReduc={activeSales.v500gReduc}
          colorClass="text-dmn-gold"
        />
      </div>

      {/* History Area */}
      <div className="premium-card overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">Journal des Transactions</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">Dernières opérations commerciales</p>
          </div>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar w-full sm:w-auto">
             <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-lg sm:rounded-xl border border-gray-100 text-[11px] font-black uppercase tracking-widest text-blue-600 shadow-sm whitespace-nowrap">
                Focus 1kg
             </div>
             <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-lg sm:rounded-xl border border-gray-100 text-[11px] font-black uppercase tracking-widest text-emerald-600 shadow-sm whitespace-nowrap">
                Focus 500g
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead className="bg-white">
              <tr>
                <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Config</th>
                <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Qte</th>
                <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">U.P</th>
                <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Montant</th>
                {(canModify) && <th className="p-4 sm:p-8 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {ventes.slice().sort((a,b)=>b.date - a.date).slice(0, 15).map(v => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                  <td className="p-4 sm:p-8 whitespace-nowrap">
                    <span className="font-bold text-gray-900 text-xs sm:text-base">{simpleDate(v.date)}</span>
                  </td>
                  <td className="p-4 sm:p-8">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm shrink-0
                        ${v.format === '1kg' ? 'bg-dmn-green-900 text-white' : 'bg-dmn-gold text-white'}`}>
                        {v.format}
                      </span>
                      {v.type === 'revendeur' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-dmn-coffee/10 text-dmn-coffee rounded-full text-[11px] font-black uppercase tracking-tight shrink-0">
                           <Users size={8} strokeWidth={3} className="sm:hidden" />
                           <Users size={10} strokeWidth={3} className="hidden sm:block" />
                           <span className="hidden sm:inline">Revendeur</span>
                           <span className="sm:hidden">Rev.</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 sm:p-8 text-right">
                    <span className="fintech-kpi text-lg sm:text-xl text-gray-900">{v.quantite}</span>
                  </td>
                  <td className="p-4 sm:p-8 text-right font-bold text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                    {formatPrice(v.prixUnitaire)} F
                  </td>
                  <td className="p-4 sm:p-8 text-right">
                     <div className="flex flex-col items-end">
                        <span className="fintech-kpi text-xl sm:text-2xl text-dmn-green-900 whitespace-nowrap">{formatPrice(v.total || 0)} F</span>
                        <div className="w-8 h-1 bg-dmn-green-500/10 rounded-full mt-1 group-hover:w-16 transition-all duration-500 sm:w-12 sm:group-hover:w-24" />
                     </div>
                  </td>
                  {canModify && (
                    <td className="p-4 sm:p-8 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={14} className="sm:hidden" />
                          <Edit2 size={16} className="hidden sm:block" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
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
          {ventes.length === 0 && (
            <div className="p-10 sm:p-20 text-center flex flex-col items-center">
              <ShoppingCart size={40} className="text-gray-100 mb-4 sm:hidden" />
              <ShoppingCart size={60} className="text-gray-100 mb-6 hidden sm:block" />
              <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-sm">Aucun flux financier détecté</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
