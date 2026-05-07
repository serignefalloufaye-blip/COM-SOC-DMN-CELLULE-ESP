import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, UserRole, AccessCode } from '../types';
import { Shield, Mail, User as UserIcon, Trash2, CheckCircle2, Key, Plus, Copy, Check, Clock } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface UserRolesProps {
  users: AppUser[];
  currentUserEmail: string | null;
  currentUserRole: UserRole | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, msg: string, onConfirm: () => void) => void;
  accessCodeInput?: string;
  setAccessCodeInput?: (val: string) => void;
  isUsingCode?: boolean;
  handleUseAccessCode?: (e: React.FormEvent) => void;
}

const ROLES: { value: UserRole; label: string; color: string; desc: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700', desc: 'Contrôle total du système' },
  { value: 'caisse', label: 'Gestionnaire Caisse', color: 'bg-green-100 text-green-700', desc: 'Gestion Caisse Sociale uniquement' },
  { value: 'tickets', label: 'Gestionnaire Tickets', color: 'bg-blue-100 text-blue-700', desc: 'Gestion Tickets Resto uniquement' },
  { value: 'cafe', label: 'Gestionnaire Café', color: 'bg-amber-100 text-amber-700', desc: 'Gestion Module Café uniquement' },
  { value: 'lecteur', label: 'Lecture Seule', color: 'bg-gray-100 text-gray-700', desc: 'Consultation uniquement' },
];

export function UserRoles({ 
  users, 
  currentUserEmail, 
  currentUserRole, 
  showToast, 
  confirmAction,
  accessCodeInput = '',
  setAccessCodeInput = () => {},
  isUsingCode = false,
  handleUseAccessCode = () => {}
}: UserRolesProps) {
  const isAdmin = currentUserRole === 'admin';
  const visibleRoles = isAdmin ? ROLES : ROLES.filter(r => r.value === currentUserRole || r.value === 'lecteur');

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [newCodeRole, setNewCodeRole] = useState<UserRole>('lecteur');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>(isAdmin ? 'all' : (currentUserRole || 'lecteur'));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'access_codes'), (snap) => {
      setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessCode)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'access_codes'));
    return unsub;
  }, []);

  const generateCode = async () => {
    if (newCodeRole === 'lecteur' || newCodeRole === 'admin') {
      showToast('Choisissez un rôle valide (Caisse, Tickets ou Café)', 'error');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await addDoc(collection(db, 'access_codes'), {
        code,
        role: newCodeRole,
        used: false,
        createdAt: Date.now()
      });
      showToast('Code généré avec succès');
    } catch (error) {
      showToast('Erreur de génération', 'error');
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Code copié !');
  };

  const deleteCode = (id: string) => {
    confirmAction('Supprimer le code', 'Voulez-vous supprimer ce code d\'accès ?', async () => {
      try {
        await deleteDoc(doc(db, 'access_codes', id));
        showToast('Code supprimé');
      } catch (error) {
        showToast('Erreur de suppression', 'error');
      }
    });
  };

  const handleRoleChange = async (user: AppUser, newRole: UserRole) => {
    try {
      // Use setDoc with merge to ensure all required fields are present and satisfy Firestore rules
      await setDoc(doc(db, 'users', user.uid), {
         uid: user.uid,
         email: user.email || '',
         nom: user.nom || 'Utilisateur',
         role: newRole
      }, { merge: true });
      showToast('Rôle mis à jour avec succès');
    } catch (error: any) {
      console.error(error);
      showToast('Erreur lors de la mise à jour du rôle: ' + error.message, 'error');
    }
  };

  const handleDeleteUser = (user: AppUser) => {
    if (user.email === 'serignefalloufaye@esp.sn') {
      showToast('Impossible de supprimer le super-admin', 'error');
      return;
    }
    confirmAction(
      'Supprimer Utilisateur',
      `Voulez-vous vraiment supprimer l'accès de ${user.nom} ?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid));
          showToast('Utilisateur supprimé');
        } catch (error) {
          showToast('Erreur de suppression', 'error');
        }
      }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-12 pb-40 px-4 sm:px-6 mt-8"
    >
      {/* 🧭 PREMIUM NAVIGATION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 sm:p-10 rounded-[3.5rem] shadow-soft border border-gray-100">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">Équipe & Sécurité</h2>
          <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-[0.4em] flex items-center gap-2">
            <Shield size={14} className="text-dmn-gold" /> Contrôle d'accès & Privilèges
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {isAdmin && (
            <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] flex-1 lg:flex-none overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterRole('all')}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterRole === 'all' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Tous
              </button>
              {ROLES.map(role => (
                <button
                  key={role.value}
                  onClick={() => setFilterRole(role.value)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filterRole === role.value ? role.color : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-premium p-10 max-w-2xl mx-auto text-center space-y-8 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-dmn-gold to-dmn-gold/20"></div>
          <div>
            <div className="w-20 h-20 bg-dmn-gold/10 text-dmn-gold rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              <Key size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Saisie du Code</h3>
            <p className="text-gray-500 font-medium text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Veuillez saisir votre code d'accès personnel pour activer vos privilèges de gestionnaire.
            </p>
          </div>
          
          <form onSubmit={handleUseAccessCode} className="space-y-4">
            <input 
              type="text" 
              maxLength={6}
              placeholder="E X E M P L E"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-[2rem] px-8 py-6 text-center font-mono font-black text-3xl text-gray-900 uppercase tracking-[0.5em] focus:ring-4 focus:ring-dmn-gold/10 focus:border-dmn-gold outline-none transition-all placeholder:text-gray-300 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:font-medium text-sm"
              required
            />
            <button 
              type="submit"
              disabled={isUsingCode && !accessCodeInput}
              className="w-full bg-dmn-gold hover:bg-dmn-gold-dark text-white px-10 py-6 rounded-[2rem] shadow-xl shadow-dmn-gold/20 font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="flex items-center justify-center gap-2">
                {isUsingCode ? 'Validation en cours...' : 'Vérifier mon code'}
                <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          </form>
        </div>
      )}

      {!isUsingCode && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-16"
          >
            {/* 🔑 ACCESS CODES SECTION */}
            {isAdmin && (
              <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-soft p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <Key className="text-dmn-gold" size={24} /> Invitations
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Générez des accès pour vos collaborateurs</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <select 
                      value={newCodeRole}
                      onChange={(e) => setNewCodeRole(e.target.value as UserRole)}
                      className="w-full sm:w-auto bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer border-transparent hover:border-gray-200 transition-all font-bold"
                    >
                      <option value="lecteur">Privilège...</option>
                      <option value="caisse">Caisse</option>
                      <option value="tickets">Tickets</option>
                      <option value="cafe">Café</option>
                    </select>
                    <button 
                      onClick={generateCode}
                      className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl shadow-xl shadow-gray-900/20 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                    >
                      <Plus size={16} /> Générer un code
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {codes.filter(c => !c.used).map(code => (
                    <div key={code.id} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 relative group">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          ROLES.find(r => r.value === code.role)?.color || 'bg-gray-100 text-gray-500'
                        }`}>
                          {ROLES.find(r => r.value === code.role)?.label}
                        </span>
                        <button onClick={() => deleteCode(code.id!)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-2xl font-black text-gray-900 font-mono tracking-[0.2em] mb-6">{code.code}</p>
                      <button 
                        onClick={() => copyCode(code.id!, code.code)}
                        className="w-full py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        {copiedId === code.id ? <Check size={14} className="text-dmn-green-600" /> : <Copy size={14} />}
                        {copiedId === code.id ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  ))}
                  {codes.filter(c => !c.used).length === 0 && (
                    <div className="col-span-full py-16 text-center border-4 border-dashed border-gray-50 rounded-[3rem]">
                       <Clock className="mx-auto text-gray-200 mb-4" size={48} />
                       <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Aucune invitation en attente</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 👤 TEAM SECTION */}
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <UserIcon className="text-dmn-green-600" size={24} /> Équipe Active
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gestion des accès et permissions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...users]
                  .filter(user => filterRole === 'all' ? (isAdmin || visibleRoles.some(v => v.value === user.role)) : user.role === filterRole)
                  .sort((a,b) => (a.role === 'admin' ? -1 : 1))
                  .map(user => (
                  <div key={user.uid} className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-soft hover:shadow-premium transition-all group relative overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-dmn-green-50/50 transition-colors duration-500"></div>
                    
                    <div className="relative flex-1">
                      <div className="flex items-center gap-5 mb-8">
                         <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                            <UserIcon size={32} className="text-gray-300" />
                         </div>
                         <div className="min-w-0">
                            <h4 className="text-lg font-black text-gray-900 truncate tracking-tight">{user.nom}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 truncate">
                              <Mail size={12} className="shrink-0" /> {user.email}
                            </p>
                         </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                             {ROLES.map(role => (
                                <button
                                   key={role.value}
                                   disabled={!isAdmin || user.email === 'serignefalloufaye@esp.sn' || user.email === currentUserEmail}
                                   onClick={() => handleRoleChange(user, role.value)}
                                   className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                      user.role === role.value 
                                      ? `${role.color} border-transparent ring-2 ring-offset-2 ring-current`
                                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                   } ${!isAdmin && user.role !== role.value ? 'hidden' : ''}`}
                                >
                                   {role.label}
                                </button>
                             ))}
                          </div>
                          {user.role && (
                             <p className="mt-3 text-[10px] font-medium text-gray-400 italic leading-relaxed">
                                {ROLES.find(r => r.value === user.role)?.desc}
                             </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && user.email !== currentUserEmail && user.email !== 'serignefalloufaye@esp.sn' && (
                      <button 
                        onClick={() => handleDeleteUser(user)}
                        className="mt-10 w-full flex items-center justify-center gap-3 py-4 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <Trash2 size={16} /> Révoquer l'accès
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
