import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Loader2, Calendar } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafeSeller, ModePaiement, CafeVersement } from '../../../../types';

interface AddVersementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  seller: CafeSeller | null;
  soldeDu: number;
  editData?: CafeVersement | null;
  isAdmin?: boolean;
}

export function AddVersementModal({ isOpen, onClose, onSuccess, userId, seller, soldeDu, editData, isAdmin = false }: AddVersementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [montant, setMontant] = useState<number>(0);
  const [mode, setMode] = useState<ModePaiement>('Espèces');

  React.useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date).toISOString().split('T')[0]);
      setMontant(editData.montant);
      setMode(editData.mode as ModePaiement || 'Espèces');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setMontant(0);
      setMode('Espèces');
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller && !editData) return;
    const finalSellerId = seller?.id || editData?.sellerId;
    if (!finalSellerId) return;

    if (montant <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const versementData: any = {
        date: new Date(date).getTime(),
        sellerId: finalSellerId,
        montant: Number(montant),
        mode,
        responsable: userId,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_versements', editData.id), versementData);
      } else {
        await addDoc(collection(db, 'cafe_versements'), {
          ...versementData,
          statut: isAdmin ? 'VALIDE' : 'EN_ATTENTE',
          validePar: isAdmin ? userId : null,
          dateValidation: isAdmin ? new Date().getTime() : null,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du versement.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || (!seller && !editData)) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
              <Wallet size={20} className="text-emerald-500" />
              {editData ? 'Modifier le Versement' : `Versement ${seller?.name || 'Revendeur'}`}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-100">
              <span className="font-bold text-sm">Solde restant dû :</span>
              <span className="font-black text-lg">{soldeDu.toLocaleString()} F CFA</span>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Date du versement</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Montant versé (F CFA)</label>
                <input
                  type="number"
                  min="1"
                  max={soldeDu > 0 ? soldeDu : undefined}
                  value={Number.isNaN(montant) ? 0 : montant}
                  onChange={(e) => setMontant(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-black text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mode</label>
                <select
                  value={mode ?? 'Espèces'}
                  onChange={(e) => setMode(e.target.value as ModePaiement)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors min-w-[140px] flex justify-center items-center"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Valider le versement"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
