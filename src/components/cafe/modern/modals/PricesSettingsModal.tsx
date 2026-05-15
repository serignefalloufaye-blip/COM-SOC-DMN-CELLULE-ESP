import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Loader2, Save, Tag, Box } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafePriceConfig } from '../../../../types';

interface PricesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceConfig: CafePriceConfig | null;
  onSuccess: () => void;
}

export function PricesSettingsModal({ isOpen, onClose, priceConfig, onSuccess }: PricesSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [prices, setPrices] = useState({
    '1kg': { normal: 6000, reduc: 5500, cost: 3000 },
    '500g': { normal: 3000, reduc: 2750, cost: 1500 }
  });

  useEffect(() => {
    if (priceConfig?.prices) {
      setPrices(priceConfig.prices);
    }
  }, [priceConfig]);

  const handleUpdatePrice = (format: '1kg' | '500g', field: 'normal' | 'reduc' | 'cost', value: number) => {
    setPrices(prev => ({
      ...prev,
      [format]: {
        ...prev[format],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const configDoc = doc(db, 'cafe_config', 'prices');
      await setDoc(configDoc, {
        prices,
        lastUpdated: Date.now()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour des prix.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100"
        >
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-dmn-gold text-dmn-green-950 flex items-center justify-center shadow-lg">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Configuration des Prix</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Définition des tarifs par format</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Format 1KG */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Box size={20} className="text-dmn-green-900" />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Format 1 Kilogramme</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prix Normal (Sénégal)</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={prices['1kg'].normal}
                        onChange={(e) => handleUpdatePrice('1kg', 'normal', parseInt(e.target.value) || 0)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-dmn-green-900 outline-none focus:ring-4 focus:ring-dmn-gold/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prix avec Réduction</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={prices['1kg'].reduc}
                        onChange={(e) => handleUpdatePrice('1kg', 'reduc', parseInt(e.target.value) || 0)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-dmn-gold outline-none focus:ring-4 focus:ring-dmn-gold/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Format 500G */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Box size={20} className="text-dmn-coffee" />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Format 500 Grammes</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prix Normal</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={prices['500g'].normal}
                        onChange={(e) => handleUpdatePrice('500g', 'normal', parseInt(e.target.value) || 0)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-dmn-green-900 outline-none focus:ring-4 focus:ring-dmn-gold/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prix avec Réduction</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={prices['500g'].reduc}
                        onChange={(e) => handleUpdatePrice('500g', 'reduc', parseInt(e.target.value) || 0)}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-dmn-gold outline-none focus:ring-4 focus:ring-dmn-gold/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end gap-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all active:scale-95"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-dmn-green-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-dmn-green-900/20 flex items-center gap-3 active:scale-95 hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} className="text-dmn-gold" /> Enregistrer les Tarifs</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
