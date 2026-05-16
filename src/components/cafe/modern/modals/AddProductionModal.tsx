import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calendar, Package, DollarSign, Loader2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ChargeProduction, ModePaiement, CafeProduction } from '../../../../types';

interface AddProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  editData?: CafeProduction | null;
}

export function AddProductionModal({ isOpen, onClose, onSuccess, userId, editData }: AddProductionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantite, setQuantite] = useState(0);
  const [observations, setObservations] = useState('');
  const [charges, setCharges] = useState<ChargeProduction[]>([
    { id: '1', nature: 'Grains de Café', quantite: 1, prixUnitaire: 0, montant: 0 },
    { id: '2', nature: 'Transport', quantite: 1, prixUnitaire: 0, montant: 0 },
    { id: '3', nature: 'Transfert', quantite: 1, prixUnitaire: 0, montant: 0 },
    { id: '5', nature: 'Moulage', quantite: 1, prixUnitaire: 0, montant: 0 },
    { id: '4', nature: 'Emballage', quantite: 1, prixUnitaire: 0, montant: 0 }
  ]);

  useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date).toISOString().split('T')[0]);
      setQuantite(editData.quantite);
      setObservations(editData.observations || '');
      if (editData.charges && editData.charges.length > 0) {
        setCharges(editData.charges);
      }
    } else {
      // Reset to defaults
      setDate(new Date().toISOString().split('T')[0]);
      setQuantite(0);
      setObservations('');
      setCharges([
        { id: '1', nature: 'Grains de Café', quantite: 1, prixUnitaire: 0, montant: 0 },
        { id: '2', nature: 'Transport', quantite: 1, prixUnitaire: 0, montant: 0 },
        { id: '3', nature: 'Transfert', quantite: 1, prixUnitaire: 0, montant: 0 },
        { id: '5', nature: 'Moulage', quantite: 1, prixUnitaire: 0, montant: 0 },
        { id: '4', nature: 'Emballage', quantite: 1, prixUnitaire: 0, montant: 0 }
      ]);
    }
  }, [editData, isOpen]);

  const handleChargeChange = (id: string, field: keyof ChargeProduction, value: any) => {
    setCharges(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        if (field === 'quantite' || field === 'prixUnitaire') {
          updated.montant = (Number(updated.quantite) || 0) * (Number(updated.prixUnitaire) || 0);
        } else if (field === 'montant') {
          // If montant is changed directly, leave it.
        }
        return updated;
      }
      return c;
    }));
  };

  const addChargeRow = () => {
    setCharges(prev => [
      ...prev,
      { id: Date.now().toString(), nature: '', quantite: 1, prixUnitaire: 0, montant: 0 }
    ]);
  };

  const removeChargeRow = (id: string) => {
    setCharges(prev => prev.filter(c => c.id !== id));
  };

  const coutTotal = charges.reduce((sum, c) => sum + (c.montant || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantite <= 0) {
      setError("La quantité produite doit être supérieure à 0.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Filter out empty charges
      const finalCharges = charges.filter(c => c.nature.trim() !== '' && c.montant > 0);

      const productionData = {
        date: new Date(date).getTime(),
        quantite: Number(quantite),
        coutTotal: coutTotal,
        charges: finalCharges,
        observations: observations,
        responsable: userId,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_productions', editData.id), productionData);
      } else {
        await addDoc(collection(db, 'cafe_productions'), {
          ...productionData,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la production.");
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-emerald-500" />
              {editData ? 'Modifier Production' : 'Nouvelle Production'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            {/* Infos de base */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider px-2">Informations Générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={date ?? ''}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Quantité Produite (kg)</label>
                  <div className="relative">
                    <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={Number.isNaN(quantite) ? 0 : quantite}
                      onChange={(e) => setQuantite(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Détails des charges */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Charges & Coûts</h3>
                <button
                  type="button"
                  onClick={addChargeRow}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Ajouter une ligne
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-500">
                    <tr>
                      <th className="p-3 font-bold w-1/3 text-[10px] uppercase tracking-widest">Nature</th>
                      <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-right">Montant Total (F CFA)</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {charges.map((charge) => {
                      const isStandard = ['1', '2', '3', '4', '5'].includes(charge.id);
                      return (
                        <tr key={charge.id} className="bg-white group">
                          <td className="p-2">
                            <input
                              type="text"
                              value={charge.nature ?? ''}
                              onChange={(e) => handleChargeChange(charge.id, 'nature', e.target.value)}
                              placeholder="Matière, Transport..."
                              className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isStandard ? 'bg-gray-50 text-gray-400 font-bold italic' : ''}`}
                              required
                              readOnly={isStandard}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={Number.isNaN(charge.montant) ? 0 : charge.montant}
                              onChange={(e) => handleChargeChange(charge.id, 'montant', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-right font-black text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              required
                            />
                          </td>
                          <td className="p-2 text-center">
                            {!isStandard && (
                              <button
                                type="button"
                                onClick={() => removeChargeRow(charge.id)}
                                className="text-red-400 hover:text-red-600 p-1 opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td className="p-3 text-right font-bold text-gray-600">Total des Coûts :</td>
                      <td className="p-3 font-black text-gray-900 text-lg" colSpan={2}>
                        {coutTotal.toLocaleString()} F
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 mb-1 px-2">Observations (Optionnel)</label>
              <textarea
                value={observations ?? ''}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none h-24"
                placeholder="Détails supplémentaires..."
              />
            </div>
          </form>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors min-w-[140px] flex justify-center items-center"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
