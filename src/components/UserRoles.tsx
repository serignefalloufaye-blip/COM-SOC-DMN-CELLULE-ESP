import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, UserRole } from '../types';
import { Shield, Mail, User as UserIcon, Trash2, UserCheck } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface UserRolesProps {
  users: AppUser[];
  currentUserEmail: string | null;
  currentUserRole: UserRole | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  confirmAction: (title: string, msg: string, onConfirm: () => void) => void;
}

const ROLES: { value: UserRole; label: string; color: string; desc: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700', desc: 'Contrôle total du système' },
  { value: 'caisse', label: 'Gestionnaire Caisse', color: 'bg-green-100 text-green-700', desc: 'Gestion Caisse Sociale uniquement' },
  { value: 'tickets', label: 'Gestionnaire Tickets', color: 'bg-blue-100 text-blue-700', desc: 'Gestion Tickets Resto uniquement' },
  { value: 'cafe', label: 'Gestionnaire Café', color: 'bg-amber-100 text-amber-700', desc: 'Gestion Module Café uniquement' },
  { value: 'revendeur', label: 'Revendeur Café', color: 'bg-orange-100 text-orange-700', desc: 'Accès limité au Module Café (Ventes)' },
  { value: 'lecteur', label: 'Lecture Seule', color: 'bg-gray-100 text-gray-700', desc: 'Consultation uniquement' },
];

export function UserRoles({ 
  users, 
  currentUserEmail, 
  currentUserRole, 
  showToast, 
  confirmAction
}: UserRolesProps) {
  const isAdmin = currentUserRole === 'admin';
  const visibleRoles = isAdmin ? ROLES : ROLES.filter(r => r.value === currentUserRole || r.value === 'lecteur');

  const [filterRole, setFilterRole] = useState<UserRole | 'all'>(isAdmin ? 'all' : (currentUserRole || 'lecteur'));

  const handleRoleChange = async (user: AppUser, newRole: UserRole) => {
    confirmAction(
      'Modifier le rôle',
      `Voulez-vous vraiment changer le rôle de ${user.nom} de ${user.role} vers ${newRole} ?`,
      async () => {
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
      }
    );
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

      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-16"
        >
          {/* TEAM SECTION */}
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
                      className="mt-10 w-full flex items-center justify-center gap-3 py-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all outline-none"
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
    </motion.div>
  );
}
