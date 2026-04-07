import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CalendarDays, CreditCard, 
  CalendarRange, AlertTriangle, Plus, Search, Edit2, Edit3, Trash2, X, Wallet, Printer, LogOut,
  CheckCircle2, XCircle, Clock, ChevronRight, History,
  Smartphone, TrendingDown, Landmark, Zap, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { MOIS } from './data';
import { Membre, Cotisation, ModePaiement, Depense } from './types';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { User } from 'firebase/auth';

import { useDebounce } from './utils/useDebounce';
import { RotatingMessages } from './components/RotatingMessages';

type Tab = 'dashboard' | 'saisie' | 'membres' | 'annuel' | 'cotisations' | 'depenses' | 'recap' | 'nonpayeurs';

const ADMIN_CODE = (import.meta as any).env.VITE_ADMIN_CODE || 'DMN-ADMIN-ESP';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'visitor' | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  
  const [isMembreModalOpen, setIsMembreModalOpen] = useState(false);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  
  const [isDepenseModalOpen, setIsDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Partial<Depense>>({});

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Global Filters
  const currentMonthIndex = new Date().getMonth();
  const [globalYear, setGlobalYear] = useState<number>(new Date().getFullYear());
  const [globalMonth, setGlobalMonth] = useState<string>(MOIS[currentMonthIndex]);
  const [globalMode, setGlobalMode] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const debouncedGlobalSearch = useDebounce(globalSearch, 300);

  // Member History Modal
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<Membre | null>(null);

  // Quick Entry State
  const [quickAmounts, setQuickAmounts] = useState<Record<string, number>>({});
  const [quickMonths, setQuickMonths] = useState<Record<string, string[]>>({});
  const [activeActionMenu, setActiveActionMenu] = useState<{mId: string, mois: string} | null>(null);

  const [isCotModalOpen, setIsCotModalOpen] = useState(false);
  const [editingCot, setEditingCot] = useState<Partial<Cotisation>>({});
  const [fMois, setFMois] = useState('');
  const [fMode, setFMode] = useState('');
  const [searchCot, setSearchCot] = useState('');
  const debouncedSearchCot = useDebounce(searchCot, 300);
  const [npMois, setNpMois] = useState('');

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear(), ...cotisations.map(c => c.annee), ...depenses.map(d => d.annee)]);
    return Array.from(years).sort((a, b) => b - a);
  }, [cotisations, depenses]);

  const filteredCotisations = useMemo(() => {
    return cotisations.filter(c => {
      const m = membres.find(x => x.id === c.mId);
      const matchYear = c.annee === globalYear;
      const matchMonth = !globalMonth || c.mois === globalMonth;
      const matchMode = !globalMode || c.mode === globalMode;
      const matchSearch = !debouncedGlobalSearch || (m && `${m.prenom} ${m.nom}`.toLowerCase().includes(debouncedGlobalSearch.toLowerCase()));
      return matchYear && matchMonth && matchMode && matchSearch;
    });
  }, [cotisations, membres, globalYear, globalMonth, globalMode, debouncedGlobalSearch]);

  const filteredDepenses = useMemo(() => {
    return depenses.filter(d => {
      const matchYear = d.annee === globalYear;
      const matchMonth = !globalMonth || d.mois === globalMonth;
      return matchYear && matchMonth;
    });
  }, [depenses, globalYear, globalMonth]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      console.log("Auth state changed:", currentUser ? currentUser.email : "No user");
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDocFromServer(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            const isDefaultAdmin = currentUser.email === 'serignefalloufaye@esp.sn';
            const initialRole = isDefaultAdmin ? 'admin' : 'visitor';
            await setDoc(doc(db, 'users', currentUser.uid), {
              email: currentUser.email,
              role: initialRole
            });
            setUserRole(initialRole);
          }
        } catch (error: any) {
          console.error("Firestore initialization error:", error);
          showToast(`Erreur d'accès aux données : ${error.message}`, 'error');
          setUserRole('visitor');
        }
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      setMembres(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Membre)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'membres'));
    const unsubCotisations = onSnapshot(collection(db, 'cotisations'), (snapshot) => {
      setCotisations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cotisation)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'cotisations'));
    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      setDepenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Depense)));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'depenses');
      setIsLoading(false);
    });
    return () => { unsubMembres(); unsubCotisations(); unsubDepenses(); };
  }, [isAuthReady, user]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        showToast("Le popup a été bloqué par votre navigateur", 'error');
      } else if (error.code === 'auth/unauthorized-domain') {
        showToast("Domaine non autorisé dans Firebase", 'error');
      } else {
        showToast(`Erreur de connexion : ${error.message}`, 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === ADMIN_CODE && user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { role: 'admin', email: user.email }, { merge: true });
        setUserRole('admin');
        setIsAdminModalOpen(false);
        showToast('Vous êtes maintenant administrateur', 'success');
      } catch (error) {
        console.error(error);
        showToast('Erreur lors de la mise à jour du rôle', 'error');
      }
    } else {
      showToast('Code incorrect', 'error');
    }
  };

  const getMembre = (id: string) => membres.find(m => m.id === id);
  const nomComplet = (m?: Membre) => m ? `${m.prenom} ${m.nom}` : '—';

  const handleSaveMembre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const prenom = (formData.get('prenom') as string).trim().toUpperCase();
    const nom = (formData.get('nom') as string).trim().toUpperCase();
    if (!prenom || !nom) return;
    try {
      if (editingMembre?.id) {
        await updateDoc(doc(db, 'membres', editingMembre.id), { prenom, nom, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Membre modifié avec succès');
      } else {
        await addDoc(collection(db, 'membres'), { prenom, nom, createdAt: Date.now(), createdBy: user?.uid });
        showToast('Membre ajouté avec succès');
      }
      setIsMembreModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'membres');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteMembre = async (id: string) => {
    confirmAction(
      'Supprimer Membre',
      'Êtes-vous sûr de vouloir supprimer ce membre ? Toutes ses cotisations seront également supprimées.',
      async () => {
        try {
          await deleteDoc(doc(db, 'membres', id));
          const cotsToDelete = cotisations.filter(c => c.mId === id);
          for (const cot of cotsToDelete) {
            await deleteDoc(doc(db, 'cotisations', cot.id));
          }
          showToast('Membre supprimé avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'membres');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const handleQuickSaveCotisation = async (mId: string, montant: number, mode: ModePaiement) => {
    const selectedMonths = quickMonths[mId] !== undefined 
      ? quickMonths[mId] 
      : (globalMonth && !cotisations.some(c => c.mId === mId && c.mois === globalMonth && c.annee === globalYear && c.montant > 0) ? [globalMonth] : []);
      
    if (selectedMonths.length === 0) {
      showToast("Veuillez sélectionner au moins un mois à payer.", 'error');
      return;
    }
    try {
      await Promise.all(selectedMonths.map(async (mois) => {
        const existing = cotisations.find(c => c.mId === mId && c.mois === mois && c.annee === globalYear);
        if (existing) {
          await updateDoc(doc(db, 'cotisations', existing.id), { montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
        } else {
          await addDoc(collection(db, 'cotisations'), { mId, mois, annee: globalYear, montant, mode, createdAt: Date.now(), createdBy: user?.uid });
        }
      }));
      setQuickMonths(prev => ({ ...prev, [mId]: [] }));
      showToast('Cotisations enregistrées avec succès');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cotisations');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteCotisation = async (id: string) => {
    confirmAction(
      'Supprimer Cotisation',
      'Voulez-vous vraiment supprimer cette cotisation ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'cotisations', id));
          showToast('Cotisation supprimée avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'cotisations');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const openAddCot = (mId?: string, mois?: string, annee?: number) => {
    setEditingCot({ mId, mois, annee: annee || globalYear, montant: 500, mode: 'WAVE' });
    setIsCotModalOpen(true);
  };

  const handleSaveCotisation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('mId') as string;
    const mois = formData.get('mois') as string;
    const annee = parseInt(formData.get('annee') as string) || globalYear;
    const montant = parseInt(formData.get('montant') as string) || 0;
    const mode = formData.get('mode') as ModePaiement;

    try {
      if (editingCot?.id) {
        await updateDoc(doc(db, 'cotisations', editingCot.id), { mId, mois, annee, montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Cotisation modifiée avec succès');
      } else {
        const existing = cotisations.find(c => c.mId === mId && c.mois === mois && c.annee === annee);
        if (existing && existing.montant > 0) {
          showToast(`Ce membre a déjà payé pour ${mois} ${annee}`, 'error');
          return;
        } else if (existing) {
          await updateDoc(doc(db, 'cotisations', existing.id), { montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
          showToast('Cotisation enregistrée avec succès');
        } else {
          await addDoc(collection(db, 'cotisations'), { mId, mois, annee, montant, mode, createdAt: Date.now(), createdBy: user?.uid });
          showToast('Cotisation ajoutée avec succès');
        }
      }
      setIsCotModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cotisations');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleSaveDepense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const evenement = formData.get('evenement') as string;
    const mois = formData.get('mois') as string;
    const annee = parseInt(formData.get('annee') as string) || globalYear;
    const montant = parseInt(formData.get('montant') as string) || 0;
    const date = new Date().toISOString();
    try {
      if (editingDepense?.id) {
        await updateDoc(doc(db, 'depenses', editingDepense.id), { evenement, mois, annee, montant, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Dépense modifiée avec succès');
      } else {
        await addDoc(collection(db, 'depenses'), { evenement, mois, annee, montant, date, createdAt: Date.now(), createdBy: user?.uid });
        showToast('Dépense ajoutée avec succès');
      }
      setIsDepenseModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'depenses');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteDepense = async (id: string) => {
    confirmAction(
      'Supprimer Dépense',
      'Voulez-vous vraiment supprimer cette dépense ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'depenses', id));
          showToast('Dépense supprimée avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'depenses');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const Badge = ({ mode }: { mode: ModePaiement }) => {
    if (mode === 'WAVE') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-600">WAVE</span>;
    if (mode === 'OM') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600">OM</span>;
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">ESP</span>;
  };

  const renderDashboard = () => {
    const totCotisations = filteredCotisations.reduce((s, c) => s + c.montant, 0);
    const totWave = filteredCotisations.filter(c => c.mode === 'WAVE').reduce((s, c) => s + c.montant, 0);
    const totOM = filteredCotisations.filter(c => c.mode === 'OM').reduce((s, c) => s + c.montant, 0);
    const totDepenses = filteredDepenses.reduce((s, d) => s + d.montant, 0);
    const solde = totCotisations - totDepenses;
    
    const monthlyData = MOIS.map(mois => {
      const cot = cotisations.filter(c => c.annee === globalYear && c.mois === mois).reduce((sum, c) => sum + c.montant, 0);
      const dep = depenses.filter(d => d.annee === globalYear && d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      return { name: mois.substring(0, 3), Cotisations: cot, Dépenses: dep };
    });

    const modes = ['WAVE', 'OM', 'ESPÈCES'];
    const COLORS = ['#3b82f6', '#f97316', '#10b981'];
    const pieData = modes.map(mode => ({
      name: mode,
      value: filteredCotisations.filter(c => c.mode === mode).reduce((sum, c) => sum + c.montant, 0)
    })).filter(d => d.value > 0);

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8 mb-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-dmn-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-dmn-gold-light/10 rounded-full -ml-24 -mb-24 opacity-50"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md mb-4 sm:mb-6 border-4 border-dmn-green-50">
              <img 
                src="logo.png" 
                alt="Logo DMN" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => { 
                  e.currentTarget.style.display = 'none'; 
                  e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                }} 
              />
              <span className="hidden text-dmn-green-900 font-bold text-2xl sm:text-4xl">🕌</span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-heading font-bold text-dmn-green-900 mb-2 sm:mb-4">Daara Madjmahoune Noreyni</h2>
            <p className="text-xs sm:text-lg text-gray-600 max-w-2xl mx-auto font-medium">Commission Sociale – Cellule ESP UCAD. Transparence et Solidarité.</p>
          </div>
        </div>

        <RotatingMessages />
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-dmn-green-600"></div>
            <div className="w-10 h-10 bg-dmn-green-50 text-dmn-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Wallet size={20} /></div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">{totCotisations.toLocaleString()} <span className="text-sm text-gray-400 font-medium">F</span></h2>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Cotisations</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Smartphone size={20} /></div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">{totWave.toLocaleString()} <span className="text-sm text-gray-400 font-medium">F</span></h2>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Wave</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Smartphone size={20} /></div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">{totOM.toLocaleString()} <span className="text-sm text-gray-400 font-medium">F</span></h2>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">OM</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><TrendingDown size={20} /></div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">{totDepenses.toLocaleString()} <span className="text-sm text-gray-400 font-medium">F</span></h2>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Dépenses</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 left-0 w-full h-1 ${solde >= 0 ? 'bg-dmn-green-500' : 'bg-red-500'}`}></div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform ${solde >= 0 ? 'bg-dmn-green-50 text-dmn-green-600' : 'bg-red-50 text-red-500'}`}><Landmark size={20} /></div>
            <h2 className={`text-2xl font-heading font-bold ${solde >= 0 ? 'text-dmn-green-600' : 'text-red-600'}`}>
              {solde.toLocaleString()} <span className="text-sm opacity-70 font-medium">F</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Solde</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6">
            <h3 className="font-heading font-bold text-dmn-green-900 mb-6 text-xs sm:text-sm uppercase tracking-wider">Évolution Mensuelle {globalYear}</h3>
            <div className="h-48 sm:h-64 w-full relative min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} width={30} />
                  <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend wrapperStyle={{fontSize: '10px'}} />
                  <Bar dataKey="Cotisations" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6">
            <h3 className="font-heading font-bold text-dmn-green-900 mb-6 text-xs sm:text-sm uppercase tracking-wider">Répartition par Mode</h3>
            <div className="h-48 sm:h-64 w-full relative min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[modes.indexOf(entry.name)]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSaisieRapide = () => {
    const filteredMembres = membres.filter(m => {
      const matchSearch = !globalSearch || nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase());
      return matchSearch;
    });

    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><Zap size={18} className="text-dmn-gold-light" /> Saisie Rapide ({globalYear})</span>
          {globalMonth && <span className="hidden sm:inline-block bg-dmn-green-800/50 border border-dmn-green-700 px-3 py-1.5 rounded-lg text-xs font-medium">Mois : {globalMonth}</span>}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Membre</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mois à payer</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Montant/Mois</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Action Rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembres.map(m => {
                const currentAmount = quickAmounts[m.id] || '';
                const selectedMonths = quickMonths[m.id] !== undefined 
                  ? quickMonths[m.id] 
                  : (globalMonth && !cotisations.some(c => c.mId === m.id && c.mois === globalMonth && c.annee === globalYear && c.montant > 0) ? [globalMonth] : []);

                return (
                  <tr key={m.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedMemberHistory(m)}
                        className="font-semibold text-gray-900 hover:text-dmn-green-600 flex items-center gap-2 text-left transition-colors"
                      >
                        {nomComplet(m)}
                        <History size={14} className="text-gray-400" />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {MOIS.map(mois => {
                          const existingCot = cotisations.find(c => c.mId === m.id && c.mois === mois && c.annee === globalYear);
                          const isPaid = existingCot && existingCot.montant > 0;
                          const isSelected = selectedMonths.includes(mois);
                          
                          return (
                            <div className="relative" key={mois}>
                              <button
                                onClick={() => {
                                  if (isPaid) {
                                    setActiveActionMenu(activeActionMenu?.mId === m.id && activeActionMenu?.mois === mois ? null : { mId: m.id, mois });
                                    return;
                                  }
                                  setQuickMonths(prev => {
                                    const current = prev[m.id] !== undefined ? prev[m.id] : selectedMonths;
                                    if (current.includes(mois)) return { ...prev, [m.id]: current.filter(x => x !== mois) };
                                    return { ...prev, [m.id]: [...current, mois] };
                                  });
                                }}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-all duration-200 ${
                                  isPaid ? 'bg-dmn-green-50 text-dmn-green-700 border-dmn-green-200 hover:bg-dmn-green-100' :
                                  isSelected ? 'bg-dmn-gold text-white border-dmn-gold shadow-md transform scale-105 font-bold' :
                                  'bg-white text-gray-500 border-gray-200 hover:border-dmn-green-300 hover:text-dmn-green-600'
                                }`}
                                title={isPaid ? `Payé: ${existingCot.montant}F (${existingCot.mode}) - Clic pour options` : `Sélectionner ${mois}`}
                              >
                                {mois.substring(0, 3)} {isPaid ? '✓' : ''}
                              </button>
                              
                              {activeActionMenu?.mId === m.id && activeActionMenu?.mois === mois && isPaid && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1 min-w-[120px] animate-in zoom-in-95 duration-200">
                                  <button 
                                    onClick={() => {
                                      setEditingCot(existingCot);
                                      setIsCotModalOpen(true);
                                      setActiveActionMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-dmn-green-50 rounded-lg flex items-center gap-2 text-gray-700 font-medium"
                                  >
                                    <Edit3 size={12} className="text-dmn-green-600" /> Modifier
                                  </button>
                                  <button 
                                    onClick={() => {
                                      handleDeleteCotisation(existingCot.id);
                                      setActiveActionMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 rounded-lg flex items-center gap-2 text-red-600 font-medium"
                                  >
                                    <Trash2 size={12} /> Supprimer
                                  </button>
                                  <div className="h-px bg-gray-100 my-1"></div>
                                  <button 
                                    onClick={() => setActiveActionMenu(null)}
                                    className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600"
                                  >
                                    Fermer
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        placeholder="500"
                        value={currentAmount}
                        onChange={(e) => setQuickAmounts({...quickAmounts, [m.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 bg-white shadow-sm transition-all w-24"
                      />
                      {selectedMonths.length > 1 && currentAmount !== '' && (
                        <div className="text-xs font-bold text-dmn-green-700 bg-dmn-green-50 px-2 py-1 rounded-lg border border-dmn-green-100 mt-2 inline-block">
                          Total: {(selectedMonths.length * Number(currentAmount)).toLocaleString()} F
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'WAVE')}
                          disabled={selectedMonths.length === 0 || currentAmount === ''}
                          className="bg-[#00a1ff] hover:bg-[#008bde] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                        >
                          WAVE
                        </button>
                        <button 
                          onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'OM')}
                          disabled={selectedMonths.length === 0 || currentAmount === ''}
                          className="bg-[#ff6600] hover:bg-[#e65c00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                        >
                          OM
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredMembres.map(m => {
            const currentAmount = quickAmounts[m.id] || '';
            const selectedMonths = quickMonths[m.id] !== undefined 
              ? quickMonths[m.id] 
              : (globalMonth && !cotisations.some(c => c.mId === m.id && c.mois === globalMonth && c.annee === globalYear && c.montant > 0) ? [globalMonth] : []);

            return (
              <div key={m.id} className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedMemberHistory(m)}
                    className="font-bold text-dmn-green-900 flex items-center gap-2"
                  >
                    {nomComplet(m)} <History size={14} className="text-gray-400" />
                  </button>
                  <input 
                    type="number"
                    placeholder="500"
                    value={currentAmount}
                    onChange={(e) => setQuickAmounts({...quickAmounts, [m.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-dmn-green-500 bg-white shadow-sm w-20 text-center"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {MOIS.map(mois => {
                    const existingCot = cotisations.find(c => c.mId === m.id && c.mois === mois && c.annee === globalYear);
                    const isPaid = existingCot && existingCot.montant > 0;
                    const isSelected = selectedMonths.includes(mois);
                    
                    return (
                      <button
                        key={mois}
                        onClick={() => {
                          if (isPaid) {
                            confirmAction(
                              'Supprimer Cotisation',
                              `Supprimer la cotisation de ${existingCot.montant}F pour ${mois} ?`,
                              () => handleDeleteCotisation(existingCot.id)
                            );
                            return;
                          }
                          setQuickMonths(prev => {
                            const current = prev[m.id] !== undefined ? prev[m.id] : selectedMonths;
                            if (current.includes(mois)) return { ...prev, [m.id]: current.filter(x => x !== mois) };
                            return { ...prev, [m.id]: [...current, mois] };
                          });
                        }}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                          isPaid ? 'bg-dmn-green-50 text-dmn-green-700 border-dmn-green-200' :
                          isSelected ? 'bg-dmn-gold text-white border-dmn-gold font-bold' :
                          'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {mois.substring(0, 3)} {isPaid ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'WAVE')}
                    disabled={selectedMonths.length === 0 || currentAmount === ''}
                    className="flex-1 bg-[#00a1ff] text-white py-2.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    WAVE
                  </button>
                  <button 
                    onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'OM')}
                    disabled={selectedMonths.length === 0 || currentAmount === ''}
                    className="flex-1 bg-[#ff6600] text-white py-2.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    ORANGE MONEY
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMembres = () => {
    const filtered = membres.filter(m => nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase()));
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><Users size={18} className="text-dmn-gold-light" /> Membres ({membres.length})</span>
          {userRole === 'admin' && (
            <button 
              onClick={() => { setEditingMembre(null); setIsMembreModalOpen(true); }}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">N°</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Prénom & Nom</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Total payé ({globalYear})</th>
                {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m, i) => {
                const cots = cotisations.filter(c => c.mId === m.id && c.annee === globalYear && c.montant > 0);
                const tot = cots.reduce((s, c) => s + c.montant, 0);
                return (
                  <tr key={m.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-4 text-left whitespace-nowrap">
                      <button onClick={() => setSelectedMemberHistory(m)} className="hover:text-dmn-green-600 font-semibold text-gray-900 text-left flex items-center gap-2 transition-colors">
                        {m.prenom} <strong>{m.nom}</strong>
                        <History size={14} className="text-gray-400" />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-dmn-green-700">{tot.toLocaleString()} F</td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => { setEditingMembre(m); setIsMembreModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteMembre(m.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map((m, i) => {
            const cots = cotisations.filter(c => c.mId === m.id && c.annee === globalYear && c.montant > 0);
            const tot = cots.reduce((s, c) => s + c.montant, 0);
            return (
              <div key={m.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div>
                    <button onClick={() => setSelectedMemberHistory(m)} className="font-bold text-dmn-green-900 flex items-center gap-2">
                      {m.prenom} {m.nom} <History size={12} className="text-gray-400" />
                    </button>
                    <p className="text-xs font-bold text-dmn-green-600 mt-0.5">{tot.toLocaleString()} F payés</p>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMembre(m); setIsMembreModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteMembre(m.id)} className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnnuel = () => {
    const filtered = membres.filter(m => nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase()));
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><Calendar size={18} className="text-dmn-gold-light" /> Vue Annuelle {globalYear}</span>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex text-sm text-dmn-green-100 gap-4 font-normal">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-dmn-green-400 shadow-sm"></span> Payé</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></span> Non payé</span>
            </div>
            <Printer size={16} className="cursor-pointer hover:text-dmn-gold-light transition-colors" onClick={() => window.print()} />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full text-[10px] sm:text-xs text-center border-collapse">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-20 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-2 py-4 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">N°</th>
                <th className="px-4 py-4 font-semibold text-xs uppercase tracking-wider text-left min-w-[140px] sm:min-w-[180px] border-b border-gray-200 sticky left-0 bg-gray-50/95 backdrop-blur-sm z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Membre</th>
                {MOIS.map(m => <th key={m} className="px-1 py-4 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">{m.substring(0, 3)}</th>)}
                <th className="px-2 py-4 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m, i) => {
                const tot = cotisations.filter(c => c.mId === m.id && c.annee === globalYear && c.montant > 0).reduce((s, c) => s + c.montant, 0);
                return (
                  <tr key={m.id} className="hover:bg-dmn-green-50/30 group transition-colors">
                    <td className="px-2 py-3 border-r border-gray-100 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-left whitespace-nowrap border-r border-gray-100 sticky left-0 bg-white z-10 group-hover:bg-dmn-green-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)] transition-colors font-medium">
                      <button onClick={() => setSelectedMemberHistory(m)} className="hover:text-dmn-green-600 text-gray-900 text-left transition-colors">
                        {nomComplet(m)}
                      </button>
                    </td>
                    {MOIS.map(mo => {
                      const c = cotisations.find(x => x.mId === m.id && x.mois === mo && x.annee === globalYear);
                      if (!c) return <td key={mo} className="px-1 py-3 bg-gray-50/30 text-gray-300 border-r border-gray-100">—</td>;
                      if (c.montant > 0) return <td key={mo} className="px-1 py-3 bg-dmn-green-50 text-dmn-green-700 font-bold border-r border-dmn-green-100/50" title={c.mode}>{c.montant}</td>;
                      return <td key={mo} className="px-1 py-3 bg-red-50 text-red-600 font-medium border-r border-red-100/50">✗</td>;
                    })}
                    <td className="px-2 py-3 font-bold text-dmn-green-700 bg-dmn-green-50/30">{tot > 0 ? tot.toLocaleString() : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCotisations = () => {
    const filtered = cotisations.filter(c => {
      const m = getMembre(c.mId);
      const matchYear = c.annee === globalYear;
      return matchYear &&
             (!fMois || c.mois === fMois) && 
             (!fMode || c.mode === fMode) && 
             (!debouncedSearchCot || nomComplet(m).toLowerCase().includes(debouncedSearchCot.toLowerCase()));
    });

    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><CreditCard size={18} className="text-dmn-gold-light" /> Cotisations ({globalYear})</span>
          {userRole === 'admin' && (
            <button 
              onClick={() => openAddCot(undefined, undefined, globalYear)}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center">
          <select value={fMois} onChange={e => setFMois(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 bg-white shadow-sm transition-all flex-1 sm:flex-none">
            <option value="">Tous les mois</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={fMode} onChange={e => setFMode(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 bg-white shadow-sm transition-all flex-1 sm:flex-none">
            <option value="">Tous modes</option>
            <option value="WAVE">WAVE</option>
            <option value="OM">OM</option>
            <option value="ESPÈCES">ESPÈCES</option>
          </select>
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Membre..." 
              value={searchCot}
              onChange={e => setSearchCot(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Membre</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mois</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mode</th>
                {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 text-left whitespace-nowrap font-medium text-gray-900">{nomComplet(getMembre(c.mId))}</td>
                  <td className="px-6 py-4 text-gray-600">{c.mois}</td>
                  <td className="px-6 py-4 font-bold text-dmn-green-700">{c.montant > 0 ? `${c.montant.toLocaleString()} F` : <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4"><Badge mode={c.mode} /></td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 flex justify-center gap-2">
                      <button onClick={() => { setEditingCot(c); setIsCotModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteCotisation(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-gray-400 text-center">Aucune cotisation trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map(c => {
            const m = getMembre(c.mId);
            return (
              <div key={c.id} className="p-4 space-y-3 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-dmn-green-900">{nomComplet(m)}</p>
                    <p className="text-xs text-gray-500">{c.mois} {c.annee}</p>
                  </div>
                  <Badge mode={c.mode} />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <p className="font-bold text-dmn-green-600">{c.montant.toLocaleString()} F</p>
                  {userRole === 'admin' && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingCot(c); setIsCotModalOpen(true); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteCotisation(c.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400">Aucune cotisation</div>
          )}
        </div>
      </div>
    );
  };

  const renderRecap = () => {
    const yearCots = cotisations.filter(c => c.annee === globalYear);
    const moisDispo = [...new Set(yearCots.map(c => c.mois))];
    const tots = moisDispo.map(m => yearCots.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0));
    const max = Math.max(...tots, 1);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {MOIS.filter(m => moisDispo.includes(m)).map(m => {
          const c = yearCots.filter(x => x.mois === m);
          const tot = c.reduce((s, x) => s + x.montant, 0);
          const nb = c.filter(x => x.montant > 0).length;
          const w = c.filter(x => x.mode === 'WAVE' && x.montant > 0).length;
          const o = c.filter(x => x.mode === 'OM' && x.montant > 0).length;
          const pct = Math.round((tot / max) * 100);

          return (
            <div key={m} className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-1 h-full bg-dmn-green-600"></div>
              <h3 className="text-sm sm:text-base font-heading font-bold text-dmn-green-900 mb-3 flex items-center gap-2">
                <CalendarDays size={16} className="text-dmn-green-500" /> {m}
              </h3>
              <div className="text-xl sm:text-2xl font-bold text-dmn-green-700">{tot.toLocaleString()} <span className="text-xs sm:text-sm font-medium opacity-70">FCFA</span></div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">{nb} cotisants · WAVE:{w} · OM:{o}</div>
              <div className="bg-gray-100 rounded-full h-1.5 sm:h-2 mt-4 overflow-hidden">
                <div className="bg-dmn-green-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
        {moisDispo.length === 0 && (
          <div className="col-span-full p-8 text-gray-400 text-center bg-white rounded-2xl border border-gray-100">Aucune donnée pour {globalYear}</div>
        )}
      </div>
    );
  };

  const renderNonPayeurs = () => {
    const yearCots = cotisations.filter(c => c.annee === globalYear);
    const payeurs = new Set(yearCots.filter(c => c.mois === npMois && c.montant > 0).map(c => c.mId));
    const np = membres.filter(m => !payeurs.has(m.id));

    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex items-center gap-2">
          <AlertTriangle size={18} className="text-dmn-gold-light" /> Membres n'ayant pas encore payé ({globalYear})
        </div>
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <select value={npMois} onChange={e => setNpMois(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-500/20 bg-white shadow-sm transition-all w-full max-w-xs">
            <option value="">Choisir un mois...</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="p-4 sm:p-6">
          {!npMois ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
              <p className="text-gray-500 text-sm font-medium">Sélectionnez un mois pour voir les non-payeurs.</p>
            </div>
          ) : np.length === 0 ? (
            <div className="text-dmn-green-600 font-semibold text-sm flex flex-col items-center gap-4 bg-dmn-green-50 p-8 rounded-2xl border border-dmn-green-100 text-center">
              <div className="w-12 h-12 rounded-full bg-dmn-green-100 flex items-center justify-center text-dmn-green-700 text-2xl shadow-sm">✓</div> 
              <p>Félicitations ! Tous les membres ont payé pour le mois de {npMois}.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                <p className="text-gray-600 text-sm font-medium">⚠️ <strong className="text-red-500">{np.length}</strong> membre(s) n'ont pas encore payé en {npMois} :</p>
                <button onClick={() => window.print()} className="text-xs text-dmn-green-600 hover:underline flex items-center gap-1 font-bold">
                  <Printer size={14} /> Imprimer la liste
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {np.map(m => (
                  <div key={m.id} className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-sm flex flex-col justify-between hover:bg-red-50 transition-colors shadow-sm group">
                    <div>
                      <strong className="text-red-600 block mb-1 font-heading group-hover:scale-105 transition-transform origin-left">{m.prenom}</strong>
                      <span className="text-gray-800 font-medium">{m.nom}</span>
                    </div>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => { openAddCot(m.id, npMois, globalYear); setActiveTab('cotisations'); }}
                        className="mt-4 bg-dmn-gold-light hover:bg-dmn-gold text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 w-full flex justify-center items-center gap-1"
                      >
                        <Plus size={14} /> Enregistrer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDepenses = () => {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><TrendingDown size={18} className="text-dmn-gold-light" /> Dépenses ({globalYear})</span>
          {userRole === 'admin' && (
            <button 
              onClick={() => { setEditingDepense({ annee: globalYear, montant: 0 }); setIsDepenseModalOpen(true); }}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> Ajouter
            </button>
          )}
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Événement</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Mois</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Montant</th>
                {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDepenses.map(d => (
                <tr key={d.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-900">{d.evenement}</td>
                  <td className="px-6 py-4 text-gray-600">{d.mois} {d.annee}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{d.montant.toLocaleString()} F</td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingDepense(d); setIsDepenseModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteDepense(d.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredDepenses.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-medium">Aucune dépense trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredDepenses.map(d => (
            <div key={d.id} className="p-4 space-y-3 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-dmn-green-900">{d.evenement}</p>
                  <p className="text-xs text-gray-500">{d.mois} {d.annee}</p>
                </div>
                <p className="font-bold text-red-600">{d.montant.toLocaleString()} F</p>
              </div>
              {userRole === 'admin' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                  <button onClick={() => { setEditingDepense(d); setIsDepenseModalOpen(true); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteDepense(d.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredDepenses.length === 0 && (
            <div className="p-8 text-center text-gray-400">Aucune dépense</div>
          )}
        </div>
      </div>
    );
  };

  const renderMemberHistoryModal = () => {
    if (!selectedMemberHistory) return null;
    const m = selectedMemberHistory;
    const mCots = cotisations.filter(c => c.mId === m.id && c.annee === globalYear);
    const paidCots = mCots.filter(c => c.montant > 0);
    const totalPaid = paidCots.reduce((s, c) => s + c.montant, 0);
    const unpaidMonths = MOIS.filter(mois => {
      const c = mCots.find(x => x.mois === mois);
      return !c || c.montant === 0;
    });
    // Consider months up to current month for "En retard"
    const monthsPassed = MOIS.slice(0, currentMonthIndex + 1);
    const lateMonths = unpaidMonths.filter(um => monthsPassed.includes(um));

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-dmn-green-50/50 rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-heading font-bold text-dmn-green-900">{nomComplet(m)}</h2>
              <p className="text-dmn-green-700 font-medium flex items-center gap-2 mt-1">
                <CalendarRange size={16} /> Historique {globalYear}
              </p>
            </div>
            <button onClick={() => setSelectedMemberHistory(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 shadow-sm transition-colors"><X size={20} /></button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-dmn-green-50 p-4 rounded-xl border border-dmn-green-100">
                <p className="text-xs text-dmn-green-600 font-bold uppercase tracking-wider mb-1">Total Payé</p>
                <p className="text-2xl font-black text-dmn-green-800">{totalPaid.toLocaleString()} F</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Mois Payés</p>
                <p className="text-2xl font-black text-blue-800">{paidCots.length} <span className="text-sm font-medium text-blue-500">/ 12</span></p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Non Payés</p>
                <p className="text-2xl font-black text-amber-800">{unpaidMonths.length}</p>
              </div>
              <div className={`p-4 rounded-xl border ${lateMonths.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${lateMonths.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>En Retard</p>
                <p className={`text-2xl font-black ${lateMonths.length > 0 ? 'text-red-800' : 'text-gray-700'}`}>{lateMonths.length}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="text-dmn-green-500" size={20} /> Détail des paiements
                </h3>
                {paidCots.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">Mois</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">Montant</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paidCots.sort((a, b) => MOIS.indexOf(a.mois) - MOIS.indexOf(b.mois)).map(c => (
                          <tr key={c.id} className="hover:bg-dmn-green-50/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">{c.mois}</td>
                            <td className="px-4 py-3 font-bold text-dmn-green-600">{c.montant.toLocaleString()} F</td>
                            <td className="px-4 py-3"><Badge mode={c.mode} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">Aucun paiement enregistré pour {globalYear}.</p>
                )}
              </div>

              {lateMonths.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20} /> Mois en retard
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lateMonths.map(lm => (
                      <span key={lm} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-200">
                        {lm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Membres
    csvContent += "MEMBRES\n";
    csvContent += "ID,Prenom,Nom\n";
    membres.forEach(m => {
      csvContent += `${m.id},${m.prenom},${m.nom}\n`;
    });
    csvContent += "\n";

    // Cotisations
    csvContent += "COTISATIONS\n";
    csvContent += "ID,Membre,Mois,Annee,Montant,Mode\n";
    cotisations.forEach(c => {
      const m = getMembre(c.mId);
      csvContent += `${c.id},${nomComplet(m)},${c.mois},${c.annee},${c.montant},${c.mode}\n`;
    });
    csvContent += "\n";

    // Depenses
    csvContent += "DEPENSES\n";
    csvContent += "ID,Evenement,Mois,Annee,Montant\n";
    depenses.forEach(d => {
      csvContent += `${d.id},${d.evenement},${d.mois},${d.annee},${d.montant}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_dmn_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV réussi');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-dmn-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-dmn-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthReady || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-dmn-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-dmn-green-200 border-t-dmn-green-600 rounded-full animate-spin"></div>
          <p className="text-dmn-green-900 font-heading font-bold animate-pulse">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dmn-bg flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dmn-green-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-dmn-gold-light/10 rounded-full -ml-12 -mb-12 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md mb-6 border-4 border-dmn-green-50">
              <img 
                src="logo.png" 
                alt="Logo DMN" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => { 
                  console.error("Logo failed to load at logo.png");
                  e.currentTarget.style.display = 'none'; 
                  e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                }} 
              />
              <span className="hidden text-dmn-green-900 font-bold text-4xl">🕌</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-dmn-green-900 mb-2">Commission Sociale DMN</h1>
            <p className="text-sm font-heading font-semibold text-dmn-green-700 mb-4">Daara Madjmahoune Noreyni – UCAD ESP</p>
            <p className="text-gray-500 mb-8 font-medium">Connectez-vous pour gérer les cotisations et les dépenses.</p>
            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="w-full bg-dmn-green-600 hover:bg-dmn-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connexion en cours...
                </>
              ) : (
                "Se connecter avec Google"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dmn-bg text-gray-800 font-sans pb-10">
      {/* Header */}
      <header className="bg-dmn-green-900 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-lg border-b border-dmn-green-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner border-2 border-dmn-green-700">
            <img 
              src="logo.png" 
              alt="Logo DMN" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
              }} 
            />
            <span className="hidden text-dmn-green-900 font-bold text-xl">🕌</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-heading font-bold tracking-tight">Commission Sociale DMN</h1>
            <p className="text-[10px] sm:text-xs text-dmn-green-300 font-medium uppercase tracking-widest">Cellule ESP – UCAD</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {userRole !== 'admin' && (
            <button onClick={() => setIsAdminModalOpen(true)} className="flex items-center gap-2 bg-dmn-gold-light hover:bg-dmn-gold text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
              <Zap size={14} /> Admin
            </button>
          )}
          <div className="flex items-center gap-2">
            <button onClick={exportToCSV} className="hidden sm:flex items-center gap-2 bg-dmn-green-800 hover:bg-dmn-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Printer size={16} /> Export
            </button>
            <button onClick={logOut} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-500/30" title="Se déconnecter">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Filters Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-[110px] sm:top-[72px] z-30 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 sm:gap-3 items-center">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-gray-200 shadow-sm flex-1 sm:flex-none">
            <span className="text-[10px] sm:text-sm font-semibold text-gray-500">Année:</span>
            <select value={globalYear} onChange={e => setGlobalYear(Number(e.target.value))} className="bg-transparent font-bold text-dmn-green-700 focus:outline-none cursor-pointer text-xs sm:text-sm">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-gray-200 shadow-sm flex-1 sm:flex-none">
            <span className="text-[10px] sm:text-sm font-semibold text-gray-500">Mois:</span>
            <select value={globalMonth} onChange={e => setGlobalMonth(e.target.value)} className="bg-transparent font-bold text-dmn-green-700 focus:outline-none cursor-pointer text-xs sm:text-sm">
              <option value="">Tous</option>
              {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-4 overflow-x-auto no-scrollbar flex gap-2 print:hidden">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ...(userRole === 'admin' ? [{ id: 'saisie', label: 'Saisie', icon: Zap }] : []),
          { id: 'annuel', label: 'Annuel', icon: CalendarRange },
          { id: 'membres', label: 'Membres', icon: Users },
          { id: 'cotisations', label: 'Cotisations', icon: CreditCard },
          { id: 'depenses', label: 'Dépenses', icon: Wallet },
          { id: 'recap', label: 'Récap', icon: CalendarDays },
          { id: 'nonpayeurs', label: 'Retards', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-dmn-green-600 text-white shadow-dmn-green-600/20 scale-105' 
                : 'bg-white text-gray-600 hover:bg-dmn-green-50 hover:text-dmn-green-700 border border-gray-100'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="px-4 max-w-7xl mx-auto flex-1">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'saisie' && renderSaisieRapide()}
        {activeTab === 'membres' && renderMembres()}
        {activeTab === 'annuel' && renderAnnuel()}
        {activeTab === 'cotisations' && renderCotisations()}
        {activeTab === 'depenses' && renderDepenses()}
        {activeTab === 'recap' && renderRecap()}
        {activeTab === 'nonpayeurs' && renderNonPayeurs()}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm text-center">
        <p className="text-dmn-green-900 font-heading font-bold text-lg mb-1">Daara Madjmahoune Noreyni – UCAD ESP</p>
        <p className="text-gray-500 text-sm">Développé pour la Commission Sociale DMN © {new Date().getFullYear()}</p>
      </footer>

      {renderMemberHistoryModal()}

      {/* Modals for Membre and Depense */}
      {isMembreModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                {editingMembre ? <><Edit2 size={20} className="text-dmn-gold-light" /> Modifier membre</> : <><Users size={20} className="text-dmn-gold-light" /> Nouveau membre</>}
              </h3>
              <button onClick={() => setIsMembreModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveMembre} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom</label>
                <input name="prenom" defaultValue={editingMembre?.prenom} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
                <input name="nom" defaultValue={editingMembre?.nom} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsMembreModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCotModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                <CreditCard size={20} className="text-dmn-gold-light" /> {editingCot.id ? 'Modifier' : 'Enregistrer'} une cotisation
              </h3>
              <button onClick={() => setIsCotModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCotisation} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Membre</label>
                <select name="mId" defaultValue={editingCot.mId || ''} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  <option value="" disabled>Sélectionner un membre</option>
                  {membres.map(m => <option key={m.id} value={m.id}>{nomComplet(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mois</label>
                <select name="mois" defaultValue={editingCot.mois || ''} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  <option value="" disabled>Sélectionner un mois</option>
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année</label>
                <input type="number" name="annee" defaultValue={editingCot.annee || globalYear} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant (FCFA)</label>
                <input type="number" name="montant" defaultValue={editingCot.montant} placeholder="500" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mode de paiement</label>
                <select name="mode" defaultValue={editingCot.mode || 'WAVE'} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  <option value="WAVE">WAVE</option>
                  <option value="OM">OM</option>
                  <option value="ESPÈCES">ESPÈCES</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsCotModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDepenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                <TrendingDown size={20} className="text-dmn-gold-light" /> Enregistrer une dépense
              </h3>
              <button onClick={() => setIsDepenseModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDepense} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Événement / Motif</label>
                <input name="evenement" defaultValue={editingDepense.evenement} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mois</label>
                <select name="mois" defaultValue={editingDepense.mois || globalMonth || MOIS[currentMonthIndex]} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année</label>
                <input type="number" name="annee" defaultValue={editingDepense.annee || globalYear} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant (FCFA)</label>
                <input type="number" name="montant" defaultValue={editingDepense.montant || ''} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsDepenseModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                Accès Administrateur
              </h3>
              <button onClick={() => { setIsAdminModalOpen(false); setAdminCodeInput(''); }} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code d'accès</label>
                <input 
                  type="password" 
                  value={adminCodeInput}
                  onChange={e => setAdminCodeInput(e.target.value)}
                  required 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" 
                  placeholder="Entrez le code secret"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setIsAdminModalOpen(false); setAdminCodeInput(''); }} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-heading font-bold">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }} 
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
            toast.type === 'success' ? 'bg-white border-dmn-green-100 text-dmn-green-800' : 'bg-white border-red-100 text-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="text-dmn-green-500" size={24} /> : <XCircle className="text-red-500" size={24} />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
