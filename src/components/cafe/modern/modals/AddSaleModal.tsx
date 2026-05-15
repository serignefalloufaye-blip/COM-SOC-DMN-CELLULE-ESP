import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, Loader2, Calendar, Package, Tag, Users } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafeSeller, CafeClient, ModePaiement, CafePriceConfig, CafeVente } from '../../../../types';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  sellers: CafeSeller[];
  clients: CafeClient[];
  priceConfig: CafePriceConfig | null;
  editData?: CafeVente | null;
}

export function AddSaleModal({ isOpen, onClose, onSuccess, userId, sellers, priceConfig, editData }: AddSaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [typeVente, setTypeVente] = useState<'normale' | 'revendeur'>('normale');
  const [tarif, setTarif] = useState<'normal' | 'reduc'>('normal');
  const [format, setFormat] = useState<'1kg' | '500g'>('1kg');
  const [quantite, setQuantite] = useState<number>(1);
  
  // Default values or from priceConfig
  const getInitialPrice = (fmt: '1kg' | '500g', trf: 'normal' | 'reduc') => {
    if (priceConfig?.prices?.[fmt]?.[trf]) {
      return priceConfig.prices[fmt][trf];
    }
    // Fallback defaults
    if (fmt === '1kg') return trf === 'normal' ? 6000 : 5500;
    return trf === 'normal' ? 3000 : 2750;
  };

  const [prixUnitaire, setPrixUnitaire] = useState<number>(getInitialPrice('1kg', 'normal'));
  const [vendeurId, setVendeurId] = useState('');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('ESPÈCES');

  React.useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date).toISOString().split('T')[0]);
      setTypeVente(editData.type === 'normale' || editData.type === 'revendeur' ? editData.type : 'normale');
      setFormat(editData.format === '1kg' || editData.format === '500g' ? editData.format : '1kg');
      setQuantite(editData.quantite);
      setPrixUnitaire(editData.prixUnitaire);
      setVendeurId(editData.vendeurId || '');
      setModePaiement(editData.mode as ModePaiement || 'ESPÈCES');
      // If tarif isn't in editData (legacy), try to guess it
      if ((editData as any).tarif) {
        setTarif((editData as any).tarif);
      }
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTypeVente('normale');
      setTarif('normal');
      setFormat('1kg');
      setQuantite(1);
      setPrixUnitaire(getInitialPrice('1kg', 'normal'));
      setVendeurId('');
      setModePaiement('ESPÈCES');
    }
  }, [editData, isOpen]);

  // Update prix unitaire when format or tarif changes
  const handleFormatChange = (newFormat: '1kg' | '500g') => {
    setFormat(newFormat);
    if (!editData) setPrixUnitaire(getInitialPrice(newFormat, tarif));
  };

  const handleTarifChange = (newTarif: 'normal' | 'reduc') => {
    setTarif(newTarif);
    if (!editData) setPrixUnitaire(getInitialPrice(format, newTarif));
  };

  const total = quantite * prixUnitaire;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantite <= 0 || prixUnitaire < 0) {
      setError("Les valeurs doivent être valides.");
      return;
    }
    if (typeVente === 'revendeur' && !vendeurId) {
      setError("Veuillez sélectionner un revendeur.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const saleData = {
        date: new Date(date).getTime(),
        type: typeVente,
        tarif: tarif,
        format,
        quantite: Number(quantite),
        prixUnitaire: Number(prixUnitaire),
        total: total,
        vendeurId: typeVente === 'revendeur' ? vendeurId : null,
        mode: modePaiement,
        responsable: userId,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_ventes', editData.id), saleData);
      } else {
        await addDoc(collection(db, 'cafe_ventes'), {
          ...saleData,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la vente.");
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
              <ShoppingCart size={20} className="text-blue-500" />
              {editData ? 'Modifier la Vente' : 'Nouvelle Vente'}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Type de vente</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={typeVente}
                    onChange={(e) => setTypeVente(e.target.value as 'normale' | 'revendeur')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="normale">Directe (Client)</option>
                    <option value="revendeur">Via Revendeur</option>
                  </select>
                </div>
              </div>
            </div>

            {typeVente === 'revendeur' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Revendeur</label>
                <select
                  value={vendeurId}
                  onChange={(e) => setVendeurId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  required
                >
                  <option value="">Sélectionner un revendeur...</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name || s.nom}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 mt-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Format de sachet</label>
                <div className="relative">
                  <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={format}
                    onChange={(e) => handleFormatChange(e.target.value as '1kg' | '500g')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="1kg">1 Kilogramme</option>
                    <option value="500g">500 Grammes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Type de Tarif</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={tarif}
                    onChange={(e) => handleTarifChange(e.target.value as 'normal' | 'reduc')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="normal">Sans Réduction (Normal)</option>
                    <option value="reduc">Avec Réduction</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Quantité (unités)</label>
                <input
                  type="number"
                  min="1"
                  value={quantite}
                  onChange={(e) => setQuantite(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Prix unitaire (F CFA)</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(parseInt(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mode de paiement</label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="ESPÈCES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="OM">Orange Money</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center mt-6">
               <span className="font-bold text-blue-900">Total à encaisser :</span>
               <span className="text-2xl font-black text-blue-600">{total.toLocaleString()} F</span>
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
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer la vente"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
