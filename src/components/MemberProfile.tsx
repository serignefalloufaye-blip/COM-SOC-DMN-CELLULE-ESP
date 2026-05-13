import React from 'react';
import { motion } from 'motion/react';
import { X, Smartphone, Wallet, CalendarRange, History, AlertCircle, Edit2 } from 'lucide-react';
import { Membre, Cotisation, ModePaiement } from '../types';
import { MOIS } from '../data';

interface MemberProfileProps {
  membre: Membre;
  onClose: () => void;
  onEdit?: (m: Membre) => void;
  isAdmin: boolean;
  isCaisse: boolean;
  status: {
    isLate: boolean;
    unpaidCount: number;
    unpaidMonths: string[];
  };
  cotisations: Cotisation[];
  setPaymentModal: (val: any) => void;
  formatPrice: (p: number) => string;
  simpleDate: (d: number | string) => string;
  Badge: React.FC<{ mode: ModePaiement; date?: number | string }>;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({ 
  membre, 
  onClose, 
  onEdit, 
  isAdmin, 
  isCaisse, 
  status, 
  cotisations, 
  setPaymentModal, 
  formatPrice, 
  simpleDate, 
  Badge 
}) => {
  const memberCotisations = cotisations
    .filter(c => c.mId === membre.id)
    .sort((a, b) => b.annee - a.annee || MOIS.indexOf(b.mois) - MOIS.indexOf(a.mois));
  
  const totalPaid = memberCotisations.reduce((sum, c) => sum + c.montant, 0);
  const monthsPaid = memberCotisations.filter(c => c.montant > 0).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100"
      >
        <div className="bg-dmn-green-900 p-10 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white transition-all p-3 hover:bg-white/10 rounded-full active:scale-90">
            <X size={24} />
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-32 h-32 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl font-black border-4 border-white/20 shadow-inner transform -rotate-3">
              {membre.prenom[0]}{membre.nom[0]}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{membre.prenom} {membre.nom}</h2>
                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase self-center sm:self-auto border-2 ${status.isLate ? 'border-red-400 text-red-100 bg-red-400/10' : 'border-dmn-green-400 text-dmn-green-100 bg-dmn-green-400/10'}`}>
                  {status.isLate ? 'En Retard' : 'Régulier'}
                </span>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-6">
                <span className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                  <Smartphone size={14} className="text-dmn-gold" /> 
                  <span className="text-dmn-green-200">+221</span> {membre.telephone || 'Non renseigné'}
                </span>
                <span className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {membre.statut || 'Statut non défini'}
                </span>
              </div>
            </div>
          </div>
          
          {status.isLate && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 bg-white/5 border border-white/10 p-6 rounded-3xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-red-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">
                  Régularisation ({status.unpaidCount} mois)
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setPaymentModal({ isOpen: true, mode: 'WAVE', membre, unpaidMonths: status.unpaidMonths, selectedMonths: status.unpaidMonths, customAmountPerMonth: 500 })} 
                  className="bg-[#1dc6f8] hover:bg-[#15b2e0] text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#1dc6f8]/20 active:scale-95"
                >
                  <Smartphone size={14} /> Régler via Wave
                </button>
              </div>
            </motion.div>
          )}

          {(isAdmin || isCaisse) && (
            <div className="absolute top-8 left-8 flex gap-3">
                  <button 
                    onClick={() => onEdit?.(membre)}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 bg-gray-50/30 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5">
              <div className="w-16 h-16 bg-dmn-green-50 text-dmn-green-600 rounded-2xl flex items-center justify-center">
                <Wallet size={32} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">Total Cotisations</p>
                <p className="text-3xl font-black text-dmn-green-900">{formatPrice(totalPaid)} <span className="text-xs font-bold text-gray-400">F</span></p>
              </div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <CalendarRange size={32} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">Mois Payés</p>
                <p className="text-3xl font-black text-blue-900">{monthsPaid} <span className="text-xs font-bold text-gray-400">/ 12</span></p>
              </div>
            </motion.div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <History size={16} className="text-dmn-green-600" /> Historique des Paiements
              </h3>
            </div>
            <div className="relative pl-10 space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-1 before:bg-gray-100/50 before:rounded-full">
              {memberCotisations.length > 0 ? (
                memberCotisations.map((c, idx) => (
                  <motion.div 
                    key={c.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative"
                  >
                    <div className="absolute -left-[35px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white border-4 border-gray-50 rounded-2xl z-10 flex items-center justify-center shadow-sm">
                      <div className="w-3 h-3 bg-dmn-green-500 rounded-lg"></div>
                    </div>
                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between group">
                      <div className="space-y-1">
                        <p className="font-black text-dmn-green-950 text-base">{c.mois} {c.annee}</p>
                        <div className="flex items-center gap-3">
                          <Badge mode={c.mode} date={c.createdAt || c.updatedAt} />
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Le {simpleDate(c.createdAt || Date.now())}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-dmn-green-600 text-xl">+{formatPrice(c.montant)} F</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                    <History size={40} />
                  </div>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Aucun paiement enregistré</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
