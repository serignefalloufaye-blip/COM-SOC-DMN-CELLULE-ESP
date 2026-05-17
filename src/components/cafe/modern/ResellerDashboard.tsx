import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wallet, ShoppingBag, Package, TrendingUp, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { formatPrice } from '../../../utils/format';
import { CafeVersement, CafeDistribution } from '../../../types';
import { AddVersementModal } from './modals/AddVersementModal';

interface ResellerDashboardProps {
  seller: any;
  distributions: CafeDistribution[];
  versements: CafeVersement[];
  globalYear: number;
  globalMonth: string;
}

export function ResellerDashboard({ seller, distributions, versements, globalYear, globalMonth }: ResellerDashboardProps) {
  const [isVersementModalOpen, setIsVersementModalOpen] = useState(false);

  // Filter for the current seller
  const sellerDistributions = useMemo(() => distributions.filter(d => d.sellerId === seller.id), [distributions, seller.id]);
  const sellerVersements = useMemo(() => versements.filter(v => v.sellerId === seller.id), [versements, seller.id]);

  const totalCA = sellerDistributions.filter(d => d.status === 'vendu').reduce((a,b)=>a+((b.prixVenteUnitaire || 0)*b.quantite), 0);
  const totalCommission = sellerDistributions.filter(d => d.status === 'vendu').reduce((a,b)=>a+((b.commissionUnitaire || 0)*b.quantite), 0);

  const totalVendu = sellerDistributions.filter(d => d.status === 'vendu').reduce((a,b)=>a+b.quantite, 0);
  const totalRecu = sellerDistributions.reduce((a,b)=>a+b.quantite, 0);
  const remainingStock = totalRecu - totalVendu;

  const totalVentes = totalCA - totalCommission;
  
  const validesVers = sellerVersements.filter(v => !v.statut || v.statut === 'VALIDE');
  const attenteVers = sellerVersements.filter(v => v.statut === 'EN_ATTENTE');
  const totalVersements = validesVers.reduce((sum, v) => sum + v.montant, 0);
  
  const soldeDu = totalVentes - totalVersements;
  const pendingVersements = attenteVers.reduce((sum, v) => sum + v.montant, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-premium group bg-gradient-to-br from-dmn-green-900 via-dmn-green-800 to-dmn-green-950"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 translate-x-20 -translate-y-20">
          <Wallet size={400} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] mb-6 sm:mb-8 mx-auto sm:mx-0">
            <TrendingUp size={12} className="text-dmn-gold" />
            Espace Revendeur
          </div>
          
          <h2 className="text-sm font-black text-white/50 uppercase tracking-[0.3em] mb-2 sm:mb-3">Solde à verser</h2>
          <div className="flex items-baseline gap-2 sm:gap-4 mb-8">
            <span className="text-xl sm:text-3xl font-black text-dmn-gold/70">FCFA</span>
            <span className="fintech-kpi text-4xl sm:text-8xl text-dmn-gold drop-shadow-lg">{formatPrice(soldeDu)}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-12 w-full mt-4 pt-8 border-t border-white/10">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Vol. Vendu</p>
              <p className="text-lg sm:text-3xl font-bold">{totalVendu} <span className="text-sm font-normal text-white/40">sacs</span></p>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Stock Dépôt</p>
              <p className="text-lg sm:text-3xl font-bold">{remainingStock} <span className="text-sm font-normal text-white/40">sacs</span></p>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Total Versé</p>
              <p className="text-lg sm:text-3xl font-bold">{formatPrice(totalVersements)} <span className="text-sm font-normal text-white/40">F</span></p>
              {pendingVersements > 0 && (
                <p className="text-[10px] font-bold text-amber-400 mt-1">+{formatPrice(pendingVersements)} F en attente</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-4">
        <button 
          onClick={() => setIsVersementModalOpen(true)}
          disabled={soldeDu <= 0}
          className="btn-primary py-4 px-6 rounded-2xl flex-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="p-1 bg-white/20 rounded-md">
            <Plus size={16} className="text-white" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest text-shadow-sm">Faire un versement</span>
        </button>
      </div>

      <AddVersementModal
        isOpen={isVersementModalOpen}
        onClose={() => setIsVersementModalOpen(false)}
        seller={seller}
        userId=""
        soldeDu={soldeDu}
        onSuccess={() => setIsVersementModalOpen(false)}
      />
    </div>
  );
}
