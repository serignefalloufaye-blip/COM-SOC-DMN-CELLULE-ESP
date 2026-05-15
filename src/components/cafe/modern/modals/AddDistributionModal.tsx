import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Truck, Loader2, Calendar, Package } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafeSeller, CafeDistribution } from '../../../../types';

interface AddDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  seller: CafeSeller | null;
  editData?: CafeDistribution | null;
}

export function AddDistributionModal({ isOpen, onClose, onSuccess, userId, seller, editData }: AddDistributionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'1kg' | '500g'>('1kg');
  const [quantite, setQuantite] = useState<number>(0);

  React.useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date).toISOString().split('T')[0]);
      setFormat(editData.format);
      setQuantite(editData.quantite);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setFormat('1kg');
      setQuantite(0);
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller && !editData) return;
    const finalSellerId = seller?.id || editData?.sellerId;
    if (!finalSellerId) return;

    if (quantite <= 0) {
      setError("La quantité doit être supérieure à 0.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const distributionData = {
        date: new Date(date).getTime(),
        sellerId: finalSellerId,
        format,
        quantite: Number(quantite),
        status: editData?.status || 'en_cours',
        responsable: userId,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_distributions', editData.id), distributionData);
      } else {
        await addDoc(collection(db, 'cafe_distributions'), {
          ...distributionData,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la distribution.");
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />
              {editData ? 'Modifier la livraison' : `Livrer ${seller?.name || 'le revendeur'}`}
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Date de livraison</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Format</label>
                <div className="relative">
                  <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as '1kg' | '500g')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="1kg">1 Kilogramme</option>
                    <option value="500g">500 Grammes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Quantité (Sacs)</label>
                <input
                  type="number"
                  min="1"
                  value={quantite || ''}
                  onChange={(e) => setQuantite(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
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
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors min-w-[140px] flex justify-center items-center"
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
