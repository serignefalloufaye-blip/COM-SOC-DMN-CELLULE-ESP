import React, { useState, useEffect } from 'react';
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
  { value: 'caisse', label: 'Caisse', color: 'bg-green-100 text-green-700', desc: 'Gestion Caisse Sociale uniquement' },
  { value: 'tickets', label: 'Tickets', color: 'bg-blue-100 text-blue-700', desc: 'Gestion Tickets Resto uniquement' },
  { value: 'cafe', label: 'Café', color: 'bg-amber-100 text-amber-700', desc: 'Gestion Module Café uniquement' },
  { value: 'lecteur', label: 'Lecteur', color: 'bg-gray-100 text-gray-700', desc: 'Consultation uniquement' },
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="text-dmn-green-600" size={32} /> Gestion des Rôles
          </h2>
          <p className="text-gray-500 font-medium">Contrôlez qui accède à quoi dans l'organisation</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <div className="max-w-md">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
              <Key className="text-dmn-gold" size={24} /> Entrer un Code d'Accès
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Si l'administrateur vous a fourni un code d'accès pour modifier votre rôle, veuillez le saisir ci-dessous.</p>
            
            <form onSubmit={handleUseAccessCode} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ex: XYZ-123"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-center font-mono font-black text-xl text-gray-900 uppercase tracking-widest focus:ring-2 focus:ring-dmn-gold/20 outline-none transition-all placeholder:text-gray-300 placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal"
                required
              />
              <button 
                type="submit"
                disabled={isUsingCode || !accessCodeInput}
                className="bg-dmn-gold hover:bg-dmn-gold-dark text-white px-8 py-4 rounded-2xl shadow-lg shadow-dmn-gold/20 font-black uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
              >
                {isUsingCode ? 'Vérification...' : 'Valider'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Access Codes Section */}
      {isAdmin && (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Key className="text-dmn-gold" size={24} /> Codes d'Accès
            </h3>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Générer des codes pour inviter des gestionnaires</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={newCodeRole}
              onChange={(e) => setNewCodeRole(e.target.value as UserRole)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-dmn-gold/20 outline-none"
            >
              <option value="lecteur">Choisir un rôle...</option>
              <option value="caisse">Caisse</option>
              <option value="tickets">Tickets</option>
              <option value="cafe">Café</option>
            </select>
            <button 
              onClick={generateCode}
              className="bg-dmn-gold hover:bg-dmn-gold-dark text-white p-3 rounded-2xl shadow-lg shadow-dmn-gold/20 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
              <Plus size={18} /> Générer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {codes.filter(c => !c.used).map(code => (
            <div key={code.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 relative group">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-full ${
                  ROLES.find(r => r.value === code.role)?.color || 'bg-gray-100 text-gray-500'
                }`}>
                  {ROLES.find(r => r.value === code.role)?.label}
                </span>
                <button onClick={() => deleteCode(code.id!)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xl font-black text-gray-900 font-mono tracking-widest mb-4">{code.code}</p>
              <button 
                onClick={() => copyCode(code.id!, code.code)}
                className="w-full py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                {copiedId === code.id ? <Check size={14} className="text-dmn-green-600" /> : <Copy size={14} />}
                {copiedId === code.id ? 'Copié' : 'Copier'}
              </button>
            </div>
          ))}
          {codes.filter(c => !c.used).length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
               <Clock className="mx-auto text-gray-200 mb-2" size={32} />
               <p className="text-sm font-bold text-gray-400">Aucun code actif généré</p>
            </div>
          )}
        </div>

        {/* Used Codes History */}
        {codes.some(c => c.used) && (
          <div className="mt-12">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Codes Utilisés</h4>
            <div className="space-y-2">
              {codes.filter(c => c.used).sort((a,b) => b.createdAt - a.createdAt).slice(0, 5).map(code => (
                <div key={code.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-black text-gray-400 text-xs px-2 py-1 bg-gray-50 rounded-lg">{code.code}</span>
                    <div>
                      <p className="text-xs font-black text-gray-900">{code.usedByName}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">A obtenu le rôle {code.role}</p>
                    </div>
                  </div>
                  <CheckCircle2 size={16} className="text-dmn-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserIcon className="text-dmn-green-600" size={24} /> Équipe & Utilisateurs
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {isAdmin && (
            <button
              onClick={() => setFilterRole('all')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap rounded-xl transition-all ${
                filterRole === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              Tous
            </button>
            )}
            {visibleRoles.map(role => (
              <button
                key={role.value}
                onClick={() => setFilterRole(role.value)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap rounded-xl transition-all ${
                  filterRole === role.value
                    ? role.color
                    : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...users]
            .filter(user => filterRole === 'all' ? (isAdmin || visibleRoles.some(v => v.value === user.role)) : user.role === filterRole)
            .sort((a,b) => (a.role === 'admin' ? -1 : 1))
            .map(user => (
            <div key={user.uid} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
               {/* Background Decoration */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-dmn-green-50 transition-colors"></div>
               
               <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0 border-2 border-white shadow-inner">
                        <UserIcon size={24} />
                     </div>
                     <div className="min-w-0">
                        <h4 className="font-black text-gray-900 truncate">{user.nom}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Mail size={10} /> {user.email}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Rôle Actuel</p>
                        <div className="grid grid-cols-1 gap-2">
                           {ROLES.map(role => (
                              <button
                                 key={role.value}
                                 disabled={!isAdmin || user.email === 'serignefalloufaye@esp.sn'}
                                 onClick={() => handleRoleChange(user, role.value)}
                                 className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                                    user.role === role.value 
                                    ? `${role.color} border-transparent ring-2 ring-offset-1 ring-current font-black`
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 font-bold'
                                 } ${!isAdmin && user.role !== role.value ? 'hidden' : ''}`}
                              >
                                 <div className="flex flex-col">
                                    <span className="text-xs">{role.label}</span>
                                    {user.role === role.value && <span className="text-[8px] opacity-70 uppercase tracking-tighter">{role.desc}</span>}
                                 </div>
                                 {user.role === role.value && <CheckCircle2 size={14} />}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {isAdmin && user.email !== currentUserEmail && user.email !== 'serignefalloufaye@esp.sn' && (
                    <button 
                      onClick={() => handleDeleteUser(user)}
                      className="mt-6 w-full flex items-center justify-center gap-2 p-3 text-red-500 bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Supprimer l'accès
                    </button>
                  )}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
