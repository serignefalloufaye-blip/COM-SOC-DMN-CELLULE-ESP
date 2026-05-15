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
  showToast,
  confirmAction
}: SalesManagerProps) {
  const canSell = hasPermission(userRole, 'cafe.sales.create');
  const isAdmin = userRole === 'admin';
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<CafeVente | null>(null);

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
      <div className="premium-card p-8 flex flex-col relative overflow-hidden group">
        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 bg-current transition-transform group-hover:scale-125 ${colorClass}`} />
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">{title}</h3>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="fintech-kpi text-3xl text-gray-900">{formatPrice(totalVentes)}<span className="text-sm opacity-30 ml-2">F</span></p>
            <div className="flex items-center gap-1 justify-end mt-1 text-dmn-green-600 font-bold text-[10px] uppercase tracking-widest">
               <Box size={10} />
               {qteNormal + qteReduc} unités
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 relative z-10">
          <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-soft transition-all transition-duration-300">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-3">
              Standard
              <TrendingUp size={12} className="text-dmn-green-600" />
            </p>
            <p className="text-2xl font-black text-gray-900">{formatPrice(totalNormal)}<span className="text-xs opacity-30 ml-1">F</span></p>
            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tight">{qteNormal} sacs standard</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-soft transition-all transition-duration-300">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-3">
              Réduit / Rev.
              <Percent size={12} className="text-dmn-gold" />
            </p>
            <p className="text-2xl font-black text-gray-900">{formatPrice(totalReduc)}<span className="text-xs opacity-30 ml-1">F</span></p>
            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tight">{qteReduc} sacs remisés</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
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
      />
      
      {/* Ventes Overview Header */}
      <div className="premium-card p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-dmn-green-900/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 bg-dmn-green-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-dmn-green-900/20 active:scale-95 transition-transform cursor-pointer">
            <ShoppingCart size={40} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Chiffre d'Affaires de la Période</p>
            <h2 className="fintech-kpi text-5xl sm:text-7xl text-dmn-green-950">
              {formatPrice(sales.total)}<span className="text-2xl text-gray-300 ml-4">F CFA</span>
            </h2>
          </div>
        </div>
        
        {canSell && (
          <button 
             onClick={() => setIsAddSaleOpen(true)} 
             className="btn-primary w-full md:w-auto h-[70px] px-12 group flex items-center justify-center gap-4 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <Plus size={24} strokeWidth={3} />
            <span className="text-sm font-black uppercase tracking-widest">Enregistrer une vente</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DetailCard 
          title="Format 1 Kilogramme"
          subtitle={`Std: ${formatPrice(priceConfig?.prices?.['1kg']?.normal || 6000)} F | Réduc: ${formatPrice(priceConfig?.prices?.['1kg']?.reduc || 5500)} F`}
          dataNormal={sales.v1kgNormal}
          dataReduc={sales.v1kgReduc}
          colorClass="text-dmn-green-900"
        />

        <DetailCard 
          title="Format 500 Grammes"
          subtitle={`Std: ${formatPrice(priceConfig?.prices?.['500g']?.normal || 3000)} F | Réduc: ${formatPrice(priceConfig?.prices?.['500g']?.reduc || 2750)} F`}
          dataNormal={sales.v500gNormal}
          dataReduc={sales.v500gReduc}
          colorClass="text-dmn-gold"
        />
      </div>

      {/* History Area */}
      <div className="premium-card overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Journal des Transactions</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">15 dernières opérations commerciales</p>
          </div>
          <div className="hidden sm:flex gap-4">
             <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                Focus Format 1kg
             </div>
             <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                Focus Format 500g
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-white">
              <tr>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Configuration</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Quantité</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">U. Price</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Transaction</th>
                {(isAdmin) && <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {ventes.slice().sort((a,b)=>b.date - a.date).slice(0, 15).map(v => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                  <td className="p-8">
                    <span className="font-bold text-gray-900">{simpleDate(v.date)}</span>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
                        ${v.format === '1kg' ? 'bg-dmn-green-900 text-white' : 'bg-dmn-gold text-white'}`}>
                        {v.format}
                      </span>
                      {v.type === 'revendeur' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-dmn-coffee/10 text-dmn-coffee rounded-full text-[9px] font-black uppercase tracking-tight">
                           <Users size={10} strokeWidth={3} />
                           Revendeur
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <span className="fintech-kpi text-xl text-gray-900">{v.quantite}</span>
                  </td>
                  <td className="p-8 text-right font-bold text-gray-400 text-sm">
                    {formatPrice(v.prixUnitaire)} F
                  </td>
                  <td className="p-8 text-right">
                     <div className="flex flex-col items-end">
                        <span className="fintech-kpi text-2xl text-dmn-green-900">{formatPrice(v.total || 0)} F</span>
                        <div className="w-12 h-1 bg-dmn-green-500/10 rounded-full mt-1 group-hover:w-24 transition-all duration-500" />
                     </div>
                  </td>
                  {isAdmin && (
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
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
          {ventes.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center">
              <ShoppingCart size={60} className="text-gray-100 mb-6" />
              <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-sm">Aucun flux financier détecté</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
