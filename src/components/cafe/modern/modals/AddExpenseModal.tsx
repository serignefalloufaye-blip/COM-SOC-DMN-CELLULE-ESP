import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, Loader2, Calendar, Tag } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafeDepense } from '../../../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  editData?: CafeDepense | null;
}

export function AddExpenseModal({ isOpen, onClose, onSuccess, userId, editData }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState<number>(0);

  React.useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date).toISOString().split('T')[0]);
      setMotif(editData.motif);
      setMontant(editData.montant);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setMotif('');
      setMontant(0);
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }
    if (!motif.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expenseData = {
        date: new Date(date).getTime(),
        categorie: editData?.categorie || 'divers',
        motif: motif.trim(),
        montant: Number(montant),
        responsable: userId,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_depenses', editData.id), expenseData);
      } else {
        await addDoc(collection(db, 'cafe_depenses'), {
          ...expenseData,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la dépense.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Receipt size={20} className="text-orange-500" />
              {editData ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date de l'opération</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Motif / Description</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex: Achat de tasses, paiement facture courant..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Montant (F CFA)</label>
              <input
                type="number"
                min="0"
                value={montant || ''}
                onChange={(e) => setMontant(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 text-lg font-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                required
              />
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
                className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors min-w-[140px] flex justify-center items-center"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
