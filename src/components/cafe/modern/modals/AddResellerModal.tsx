import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Contact2, Loader2, Shield } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CafeSeller } from '../../../../types';

interface AddResellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  editData?: CafeSeller | null;
}

export function AddResellerModal({ isOpen, onClose, onSuccess, userId, editData }: AddResellerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [codeAcces, setCodeAcces] = useState('');

  React.useEffect(() => {
    if (editData) {
      setName(editData.name || editData.nom || '');
      setTelephone(editData.telephone || editData.phone || '');
      setEmail(editData.email || '');
      setCodeAcces(editData.codeAcces || '');
    } else {
      setName('');
      setTelephone('');
      setEmail('');
      setCodeAcces('');
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resellerData = {
        name: name.trim(),
        nom: name.trim(), // Legacy support
        telephone: telephone.trim(),
        email: email.trim(),
        codeAcces: codeAcces.trim(),
        active: editData ? editData.active : true,
        updatedAt: serverTimestamp()
      };

      if (editData) {
        await updateDoc(doc(db, 'cafe_sellers', editData.id), resellerData);
      } else {
        await addDoc(collection(db, 'cafe_sellers'), {
          ...resellerData,
          createdBy: userId,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du revendeur.");
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
              <Contact2 size={20} className="text-purple-500" />
              {editData ? 'Modifier le Revendeur' : 'Nouveau Revendeur'}
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nom Complet</label>
              <input
                type="text"
                value={name ?? ''}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Babacar Ndiaye"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={telephone ?? ''}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex: +221 77 123 45 67"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>

            <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Email (Obligatoire pour la connexion)</label>
               <input
                 type="email"
                 value={email ?? ''}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="Ex: contact@exemple.com"
                 className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                 required
               />
             </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Code Secret (Accès)</label>
                <input
                  type="text"
                  value={codeAcces ?? ''}
                  onChange={(e) => setCodeAcces(e.target.value)}
                  placeholder="Ex: CAFE2026"
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-black text-purple-700 tracking-widest"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <h4 className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Shield size={12} /> Instructions de connexion
              </h4>
              <p className="text-[11px] text-purple-900 leading-relaxed font-medium">
                Le revendeur doit se connecter avec son adresse <strong className="font-black text-purple-700">Email</strong>. 
                Une fois connecté, le système lui demandera son <strong className="font-black text-purple-700">Code Secret (Accès)</strong>.
                <br/><br/>
                <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-widest">Important</span> Vous devez lui communiquer ce <strong>Code Secret</strong> !
              </p>
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
                className="px-5 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors min-w-[140px] flex justify-center items-center"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Créer le profil"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
