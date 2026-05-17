import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CafeSeller, CafeDistribution, CafeVersement } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';
import { Users, Truck, Wallet, Activity, Contact2, Box, Plus, Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { AddResellerModal } from './modals/AddResellerModal';
import { AddDistributionModal } from './modals/AddDistributionModal';
import { AddVersementModal } from './modals/AddVersementModal';
import { db } from '../../../firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface ResellerManagerProps {
  sellers: CafeSeller[];
  distributions: CafeDistribution[];
  versements: CafeVersement[];
  userRole: any;
  isAdmin: boolean;
  isCafeManager: boolean;
  userId?: string;
  priceConfig: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

export function ResellerManager({ 
  sellers, 
  distributions, 
  versements, 
  userRole, 
  isAdmin, 
  isCafeManager, 
  userId = '',
  priceConfig,
  showToast,
  confirmAction
}: ResellerManagerProps) {
  const canManageSellers = hasPermission(userRole, 'cafe.sellers.manage') && (isAdmin || isCafeManager);
  const [isAddResellerModalOpen, setIsAddResellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<CafeSeller | null>(null);
  const [selectedSellerForDist, setSelectedSellerForDist] = useState<CafeSeller | null>(null);
  const [selectedSellerForVers, setSelectedSellerForVers] = useState<CafeSeller | null>(null);
  const [soldeDuForVers, setSoldeDuForVers] = useState(0);

  const handleValidateVersement = async (versId: string, statut: 'VALIDE' | 'REJETE') => {
    confirmAction("Confirmer pff", `Confirmer le versement ?`, async () => {
      try {
        await updateDoc(doc(db, 'cafe_versements', versId), {
          statut,
          validePar: userId,
          dateValidation: Date.now()
        });
        showToast(`Versement ${statut === 'VALIDE' ? 'validé' : 'rejeté'} avec succès`, "success");
      } catch (e) {
        showToast("Erreur lors de l'opération", "error");
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    confirmAction(
      "Supprimer le revendeur",
      `Êtes-vous sûr de vouloir supprimer ${name} ? Cela n'effacera pas son historique, mais il ne pourra plus recevoir de café.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'cafe_sellers', id));
          showToast("Revendeur supprimé !", "success");
        } catch (err) {
          showToast("Erreur lors de la suppression.", "error");
        }
      }
    );
  };

  const handleEdit = (s: CafeSeller) => {
    setEditingSeller(s);
    setIsAddResellerModalOpen(true);
  };

  const handleOpenVersement = (seller: CafeSeller, solde: number) => {
    setSoldeDuForVers(solde);
    setSelectedSellerForVers(seller);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <AddResellerModal 
         isOpen={isAddResellerModalOpen}
         onClose={() => {
           setIsAddResellerModalOpen(false);
           setEditingSeller(null);
         }}
         onSuccess={() => {
           setIsAddResellerModalOpen(false);
           setEditingSeller(null);
           showToast(editingSeller ? "Profil mis à jour !" : "Revendeur ajouté !", "success");
         }}
         userId={userId}
         editData={editingSeller}
      />
      <AddDistributionModal
         isOpen={!!selectedSellerForDist}
         onClose={() => setSelectedSellerForDist(null)}
         onSuccess={() => setSelectedSellerForDist(null)}
         userId={userId}
         seller={selectedSellerForDist}
         priceConfig={priceConfig}
      />
      <AddVersementModal
         isOpen={!!selectedSellerForVers}
         onClose={() => setSelectedSellerForVers(null)}
         onSuccess={() => setSelectedSellerForVers(null)}
         userId={userId}
         seller={selectedSellerForVers}
         soldeDu={soldeDuForVers}
         isAdmin={canManageSellers}
      />
      
      {/* Network Header */}
      <div className="premium-card p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-dmn-green-900/5 blur-3xl translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 relative z-10 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-dmn-green-900 text-white rounded-2xl sm:rounded-[2rem] flex items-center justify-center shadow-xl shadow-dmn-green-900/20 active:scale-95 transition-transform shrink-0">
            <Users size={32} strokeWidth={2.5} className="sm:hidden" />
            <Users size={40} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-1 sm:mb-2 text-center sm:text-left">Réseau Local Noreyni</p>
            <h2 className="fintech-kpi text-3xl sm:text-5xl text-gray-900 text-center sm:text-left">
              {sellers.filter(s => s.active).length} <span className="text-xl sm:text-2xl text-gray-400 font-medium ml-1 sm:ml-2 uppercase tracking-tighter">Partenaires Aktifs</span>
            </h2>
          </div>
        </div>
        
        {canManageSellers && (
          <button 
             onClick={() => setIsAddResellerModalOpen(true)} 
             className="btn-primary h-[60px] sm:h-[70px] w-full sm:w-auto px-6 sm:px-12 group flex items-center justify-center gap-3 sm:gap-4 active:scale-95 transition-transform"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest">Nouveau Partenaire</span>
          </button>
        )}
      </div>

      {canManageSellers && versements.filter(v => v.statut === 'EN_ATTENTE').length > 0 && (
        <div className="mb-10 bg-amber-50 rounded-[2rem] p-6 border border-amber-200">
          <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle size={16} /> Versements en attente de validation
          </h3>
          <div className="space-y-3">
            {versements.filter(v => v.statut === 'EN_ATTENTE').map(vers => {
              const s = sellers.find(seller => seller.id === vers.sellerId || seller.id === vers.vendeurId);
              return (
                <div key={vers.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                  <div className="flex items-center gap-3 mb-3 sm:mb-0 w-full sm:w-auto">
                    <Wallet className="text-amber-500 shrink-0" size={24} />
                    <div>
                      <p className="text-sm font-black text-gray-900">{s?.name || s?.nom || 'Revendeur inconnu'}</p>
                      <p className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Montant: {new Intl.NumberFormat('fr-FR').format(vers.montant)} FCFA</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button 
                      onClick={() => handleValidateVersement(vers.id, 'VALIDE')}
                      className="flex-1 sm:flex-none py-2 px-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Valider
                    </button>
                    <button 
                      onClick={() => handleValidateVersement(vers.id, 'REJETE')}
                      className="flex-1 sm:flex-none py-2 px-4 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> Rejeter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {sellers.map(seller => {
           const sellerDists = distributions.filter(d => d.sellerId === seller.id);
           const totalRecu = sellerDists.reduce((a,b)=>a+b.quantite, 0);
           const totalVendu = sellerDists.filter(d => d.status === 'vendu').reduce((a,b)=>a+b.quantite, 0);
           const remaining = totalRecu - totalVendu;
           
           const totalCA = sellerDists.filter(d => d.status === 'vendu').reduce((a,b)=>a+((b.prixVenteUnitaire || 0)*b.quantite), 0);
           const totalCommission = sellerDists.filter(d => d.status === 'vendu').reduce((a,b)=>a+((b.commissionUnitaire || 0)*b.quantite), 0);
           
           const sellerVers = versements.filter(v => v.sellerId === seller.id);
           const validesVers = sellerVers.filter(v => !v.statut || v.statut === 'VALIDE');
           const attenteVers = sellerVers.filter(v => v.statut === 'EN_ATTENTE');
           const totalVerses = validesVers.reduce((a,b)=>a+b.montant, 0);
           const totalAttente = attenteVers.reduce((a,b)=>a+b.montant, 0);
           
           const resteAVerser = (totalCA - totalCommission) - totalVerses;

           return (
             <motion.div 
               key={seller.id} 
               layout
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               className="premium-card p-6 sm:p-8 flex flex-col group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ring-dmn-green-500/0 hover:ring-8"
             >
                <div className="flex justify-between items-start mb-6 gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="fintech-heading text-xl sm:text-2xl tracking-tighter truncate">{seller.name || seller.nom}</h3>
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mt-1 truncate">
                       <Contact2 size={12} className="shrink-0" />
                       {seller.telephone || seller.phone || 'Non renseigné'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManageSellers && (
                      <div className="flex sm:opacity-0 sm:group-hover:opacity-100 transition-opacity items-center gap-1">
                        <button 
                          onClick={() => handleEdit(seller)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(seller.id, seller.name || seller.nom || 'ce revendeur')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-lg ${seller.active ? 'bg-dmn-green-500 shadow-dmn-green-500/20' : 'bg-red-500 shadow-red-500/20'}`} />
                  </div>
                </div>
                
                <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-[1.5rem] bg-gray-50 flex justify-between items-center transition-colors group-hover:bg-white group-hover:shadow-soft">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Truck size={12}/> Volume Flux</span>
                    <span className="fintech-kpi text-base sm:text-lg text-gray-900">{totalRecu} <span className="text-xs opacity-30 text-emerald-600">/ {totalVendu}</span></span>
                  </div>
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-[1.5rem] bg-gray-50 flex justify-between items-center transition-colors group-hover:bg-white group-hover:shadow-soft">
                     <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Box size={12}/> Stock Dépôt</span>
                     <span className={`fintech-kpi text-base sm:text-lg ${remaining > 0 ? 'text-dmn-green-900' : 'text-gray-400'}`}>{remaining} sacs</span>
                  </div>
                  <div className={`p-4 sm:p-5 rounded-xl sm:rounded-[1.5rem] border flex justify-between items-center transition-all 
                     ${resteAVerser > 0 
                        ? 'bg-dmn-gold/5 border-dmn-gold animate-pulse text-dmn-gold' 
                        : 'bg-dmn-green-900 text-white border-transparent'}`}>
                    <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 opacity-60"><Wallet size={12}/> Balance</span>
                    <div className="flex flex-col items-end">
                      <span className="fintech-kpi text-lg sm:text-xl">{formatPrice(resteAVerser)} <span className="text-xs opacity-50 ml-0.5 sm:ml-1">F</span></span>
                      {totalAttente > 0 && <span className="text-[10px] font-bold text-amber-500 mt-1">+{formatPrice(totalAttente)} F en attente</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <div className="flex gap-2 sm:gap-3">
                      {canManageSellers && (
                        <button 
                           onClick={() => setSelectedSellerForDist(seller)} 
                           className="flex-1 h-[48px] sm:h-[54px] bg-gray-900 text-white rounded-lg sm:rounded-[1.2rem] font-black text-xs uppercase tracking-widest transition-transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                           <Box size={14} /> Distribuer
                        </button>
                      )}
                      {canManageSellers && resteAVerser > 0 && (
                        <button 
                           onClick={() => handleOpenVersement(seller, resteAVerser)} 
                           className="flex-1 h-[48px] sm:h-[54px] bg-dmn-green-900 text-white rounded-lg sm:rounded-[1.2rem] font-black text-xs uppercase tracking-widest transition-transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                           <Wallet size={14} /> Encaisser
                        </button>
                      )}
                   </div>
                </div>
             </motion.div>
           )
        })}
      </div>
    </div>
  );
}
