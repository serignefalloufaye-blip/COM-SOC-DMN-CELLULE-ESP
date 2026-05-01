import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CalendarDays, CreditCard, 
  CalendarRange, AlertTriangle, Plus, Search, Edit2, Edit3, Trash2, X, Wallet, Printer, LogOut,
  CheckCircle2, XCircle, Clock, ChevronRight, History, Info, Shield,
  Smartphone, TrendingDown, TrendingUp, Landmark, Zap, Calendar, MessageCircle, Banknote, Ticket, ArrowRightLeft, Activity, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { MOIS } from './data';
import { Membre, Cotisation, ModePaiement, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution } from './types';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { User } from 'firebase/auth';

import { useDebounce } from './utils/useDebounce';
import { RotatingMessages } from './components/RotatingMessages';
import { Annuel } from './components/Annuel';
import { Tickets } from './components/Tickets';
import { PremiumDashboard } from './components/PremiumDashboard';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Tab = 'dashboard' | 'finance' | 'tickets' | 'membres';

const ADMIN_CODE = (import.meta as any).env.VITE_ADMIN_CODE || 'DMN-ADMIN-ESP';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'visitor' | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  
  // Advanced Features State
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Membre | null>(null);
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<'saisie' | 'cotisations' | 'recettes' | 'depenses' | 'dettes' | 'rapports'>('cotisations');
  const [membreSubTab, setMembreSubTab] = useState<'liste' | 'annuel' | 'retards'>('liste');
  const [rapportSubTab, setRapportSubTab] = useState<'recap' | 'stats' | 'pdf'>('stats');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [ticketCollectes, setTicketCollectes] = useState<TicketCollecte[]>([]);
  const [ticketConversions, setTicketConversions] = useState<TicketConversion[]>([]);
  const [ticketDistributions, setTicketDistributions] = useState<TicketDistribution[]>([]);
  const [appSettings, setAppSettings] = useState<{ logoUrl?: string }>({});
  
  const [isMembreModalOpen, setIsMembreModalOpen] = useState(false);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  
  const [isDepenseModalOpen, setIsDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Partial<Depense>>({});

  const [isRecetteModalOpen, setIsRecetteModalOpen] = useState(false);
  const [editingRecette, setEditingRecette] = useState<Partial<Recette>>({});

  const [isDetteModalOpen, setIsDetteModalOpen] = useState(false);
  const [editingDette, setEditingDette] = useState<Partial<Dette>>({});

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
  const [globalMonth, setGlobalMonth] = useState<string>('');
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
  const [npSearch, setNpSearch] = useState('');
  const debouncedNpSearch = useDebounce(npSearch, 300);

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear(), ...cotisations.map(c => c.annee), ...depenses.map(d => d.annee), ...recettes.map(r => r.annee)]);
    return Array.from(years).sort((a, b) => b - a);
  }, [cotisations, depenses, recettes]);

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

  const filteredRecettes = useMemo(() => {
    return recettes.filter(r => {
      const matchYear = r.annee === globalYear;
      const matchMonth = !globalMonth || r.mois === globalMonth;
      const matchMode = !globalMode || r.mode === globalMode;
      return matchYear && matchMonth && matchMode;
    });
  }, [recettes, globalYear, globalMonth, globalMode]);

  const annualCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear), [cotisations, globalYear]);
  const annualDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear), [depenses, globalYear]);
  const annualRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear), [recettes, globalYear]);

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
    const unsubRecettes = onSnapshot(collection(db, 'recettes'), (snapshot) => {
      setRecettes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recette)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'recettes'));
    const unsubDettes = onSnapshot(collection(db, 'dettes'), (snapshot) => {
      setDettes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dette)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'dettes'));

    const unsubTicketCollectes = onSnapshot(collection(db, 'tickets_collectes'), (snapshot) => {
      setTicketCollectes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketCollecte)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_collectes'));

    const unsubTicketConversions = onSnapshot(collection(db, 'tickets_conversions'), (snapshot) => {
      setTicketConversions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketConversion)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_conversions'));

    const unsubTicketDistributions = onSnapshot(collection(db, 'tickets_distributions'), (snapshot) => {
      setTicketDistributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketDistribution)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_distributions'));

    return () => { unsubMembres(); unsubCotisations(); unsubDepenses(); unsubRecettes(); unsubDettes(); unsubTicketCollectes(); unsubTicketConversions(); unsubTicketDistributions(); };
  }, [isAuthReady, user]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        setAppSettings(snapshot.data() as { logoUrl: string });
      }
    }, (error) => console.error("Settings fetch error:", error));
    return () => unsubSettings();
  }, []);

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
        const domain = window.location.hostname;
        showToast(`Veuillez ajouter ${domain} dans les domaines autorisés Firebase (Authentication > Settings > Authorized domains)`, 'error');
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) { // ~800KB limit for safety (Firestore doc limit is 1MB)
      showToast("L'image est trop lourde (max 800KB)", 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await setDoc(doc(db, 'settings', 'app'), { logoUrl: base64String }, { merge: true });
        showToast("Logo mis à jour avec succès");
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings');
        showToast("Erreur lors de la mise à jour du logo", 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const getMembre = (id: string) => membres.find(m => m.id === id);
  const nomComplet = (m?: Membre) => m ? `${m.prenom} ${m.nom}` : '—';

  const handleSaveMembre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const prenom = (formData.get('prenom') as string).trim().toUpperCase();
    const nom = (formData.get('nom') as string).trim().toUpperCase();
    const telephone = (formData.get('telephone') as string).trim();
    const statut = formData.get('statut') as string;
    const moisIntegration = formData.get('moisIntegration') as string || MOIS[new Date().getMonth()];
    const anneeIntegration = Number(formData.get('anneeIntegration')) || new Date().getFullYear();
    
    if (!prenom || !nom) return;
    try {
      if (editingMembre?.id) {
        await updateDoc(doc(db, 'membres', editingMembre.id), { prenom, nom, telephone, statut, moisIntegration, anneeIntegration, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Membre modifié avec succès');
      } else {
        await addDoc(collection(db, 'membres'), { prenom, nom, telephone, statut, moisIntegration, anneeIntegration, createdAt: Date.now(), createdBy: user?.uid });
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
    const defaultMonth = globalMonth || MOIS[new Date().getMonth()];
    const selectedMonths = quickMonths[mId] !== undefined 
      ? quickMonths[mId] 
      : (!cotisations.some(c => c.mId === mId && c.mois === defaultMonth && c.annee === globalYear && c.montant > 0) ? [defaultMonth] : []);
      
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

  const handleSaveRecette = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const motif = formData.get('motif') as string;
    const mois = formData.get('mois') as string;
    const annee = parseInt(formData.get('annee') as string) || globalYear;
    const montant = parseInt(formData.get('montant') as string) || 0;
    const mode = formData.get('mode') as ModePaiement;
    const date = new Date().toISOString();
    try {
      if (editingRecette?.id) {
        await updateDoc(doc(db, 'recettes', editingRecette.id), { motif, mois, annee, montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Entrée modifiée avec succès');
      } else {
        await addDoc(collection(db, 'recettes'), { motif, mois, annee, montant, mode, date, createdAt: Date.now(), createdBy: user?.uid });
        showToast('Entrée ajoutée avec succès');
      }
      setIsRecetteModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'recettes');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteRecette = async (id: string) => {
    confirmAction(
      'Supprimer Entrée',
      'Voulez-vous vraiment supprimer cette entrée d\'argent ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'recettes', id));
          showToast('Entrée supprimée avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'recettes');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const handleSaveDette = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const motif = formData.get('motif') as string;
    const mois = formData.get('mois') as string;
    const annee = parseInt(formData.get('annee') as string) || globalYear;
    const montant = parseInt(formData.get('montant') as string) || 0;
    const date = new Date().toISOString();
    try {
      if (editingDette?.id) {
        await updateDoc(doc(db, 'dettes', editingDette.id), { motif, mois, annee, montant, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Dette modifiée avec succès');
      } else {
        await addDoc(collection(db, 'dettes'), { motif, mois, annee, montant, date, estPayee: false, createdAt: Date.now(), createdBy: user?.uid });
        showToast('Dette ajoutée avec succès');
      }
      setIsDetteModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dettes');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteDette = async (id: string) => {
    confirmAction(
      'Supprimer Dette',
      'Voulez-vous vraiment supprimer cette dette ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'dettes', id));
          showToast('Dette supprimée avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'dettes');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const handleToggleDetteStatus = async (dette: Dette) => {
    try {
      await updateDoc(doc(db, 'dettes', dette.id), { estPayee: !dette.estPayee, updatedAt: Date.now(), updatedBy: user?.uid });
      showToast(`Dette marquée comme ${!dette.estPayee ? 'payée' : 'non payée'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dettes');
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const Badge = ({ mode, date }: { mode: ModePaiement, date?: number | string }) => {
    const formattedDate = date ? new Date(date).toLocaleDateString('fr-FR') : null;
    const baseClass = "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap";
    let colorClass = "bg-emerald-100 text-emerald-700";
    let label = "ESP";
    
    if (mode === 'WAVE') {
      colorClass = "bg-blue-100 text-blue-600";
      label = "WAVE";
    } else if (mode === 'OM') {
      colorClass = "bg-orange-100 text-orange-600";
      label = "OM";
    }

    return (
      <span className={`${baseClass} ${colorClass}`}>
        {label} {formattedDate && `- ${formattedDate}`}
      </span>
    );
  };
  
  const DateBadge = ({ date }: { date?: number | string }) => {
    if (!date) return null;
    const formattedDate = new Date(date).toLocaleDateString('fr-FR');
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-gray-100 text-gray-500">
        Enregistré le {formattedDate}
      </span>
    );
  };

  const getMemberStatus = (mId: string) => {
    const currentMonthIndex = MOIS.indexOf(globalMonth || MOIS[new Date().getMonth()]);
    const membre = membres.find(m => m.id === mId);
    
    let startMonthIndex = 0;
    if (membre) {
      if (membre.anneeIntegration && membre.moisIntegration) {
        if (membre.anneeIntegration === globalYear) {
          startMonthIndex = MOIS.indexOf(membre.moisIntegration) + 1; // Commence le mois suivant
        } else if (membre.anneeIntegration > globalYear) {
          return { isLate: false, unpaidCount: 0, unpaidMonths: [] };
        }
      } else if (membre.createdAt) {
        const createdDate = new Date(membre.createdAt);
        if (createdDate.getFullYear() === globalYear) {
          startMonthIndex = createdDate.getMonth() + 1; // Commence le mois suivant
        } else if (createdDate.getFullYear() > globalYear) {
          return { isLate: false, unpaidCount: 0, unpaidMonths: [] };
        }
      }
    }

    const unpaidMonths = MOIS.slice(startMonthIndex, currentMonthIndex + 1).filter(mois => {
      const cot = cotisations.find(c => c.mId === mId && c.mois === mois && c.annee === globalYear);
      return !cot || cot.montant === 0;
    });
    return {
      isLate: unpaidMonths.length > 0,
      unpaidCount: unpaidMonths.length,
      unpaidMonths
    };
  };

  const renderMemberProfile = (membre: Membre) => {
    const status = getMemberStatus(membre.id);
    const memberCotisations = cotisations.filter(c => c.mId === membre.id).sort((a, b) => b.annee - a.annee || MOIS.indexOf(b.mois) - MOIS.indexOf(a.mois));
    const totalPaid = memberCotisations.reduce((sum, c) => sum + c.montant, 0);
    const monthsPaid = memberCotisations.filter(c => c.montant > 0).length;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
          <div className="bg-dmn-green-900 p-8 text-white relative">
            <button onClick={() => setSelectedMemberProfile(null)} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
              <X size={24} />
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white/20 shadow-inner">
                {membre.prenom[0]}{membre.nom[0]}
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{membre.prenom} {membre.nom}</h2>
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase self-center sm:self-auto ${status.isLate ? 'bg-red-500 text-white' : 'bg-dmn-green-500 text-white'}`}>
                    {status.isLate ? 'En Retard' : 'Régulier'}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                  <span className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border border-white/10">
                    <Smartphone size={14} className="text-dmn-gold-light" /> 
                    <span className="text-dmn-green-100">+221</span> {membre.telephone || 'Non renseigné'}
                  </span>
                  <span className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10">
                    {membre.statut || 'Statut non défini'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-gray-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-dmn-green-50 text-dmn-green-600 rounded-xl flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Total Cotisations</p>
                  <p className="text-2xl font-heading font-bold text-dmn-green-900">{formatPrice(totalPaid)} F</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <CalendarRange size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Mois Payés</p>
                  <p className="text-2xl font-heading font-bold text-blue-900">{monthsPaid}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-heading font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                <History size={20} className="text-dmn-green-600" /> Historique des Paiements
              </h3>
              <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {memberCotisations.length > 0 ? (
                  memberCotisations.map((c, idx) => (
                    <div key={c.id} className="relative animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="absolute -left-[29px] top-1.5 w-6 h-6 bg-white border-2 border-dmn-green-500 rounded-full z-10 flex items-center justify-center">
                        <div className="w-2 h-2 bg-dmn-green-500 rounded-full"></div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{c.mois} {c.annee}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge mode={c.mode} date={c.createdAt || c.updatedAt} />
                            <span className="text-[10px] text-gray-400 font-medium italic">Enregistré le {new Date(c.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="font-black text-dmn-green-600">+{formatPrice(c.montant)} F</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                    <History size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 italic text-sm">Aucun paiement enregistré pour ce membre</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const formatPrice = (amount: number) => amount.toLocaleString('fr-FR');

  const formatFCFA = (val: number) => {
    return val.toLocaleString('fr-FR') + ' FCFA';
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Load logo if exists
    let logoData: HTMLImageElement | null = null;
    let logoHeight = 0;
    const logoWidth = 35;

    if (appSettings?.logoUrl) {
      try {
        logoData = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Logo load failed'));
          img.src = appSettings.logoUrl!;
        });
        logoHeight = (logoData!.height * logoWidth) / logoData!.width;
      } catch (err) {
        console.warn("Logo non chargé pour le PDF:", err);
      }
    }

    const totCot = annualCotisations.reduce((s, c) => s + c.montant, 0);
    const totRec = annualRecettes.reduce((s, r) => s + r.montant, 0);
    const totDep = annualDepenses.reduce((s, d) => s + d.montant, 0);
    
    const annualDettes = dettes.filter(d => d.annee === globalYear);
    const totDettesNonPayees = annualDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    const totDettesPayees = annualDettes.filter(d => d.estPayee).reduce((s, d) => s + d.montant, 0);
    const solde = totCot + totRec - totDep + totDettesNonPayees;
    const headerHeight = logoData ? logoHeight + 50 : 40;
    const logoY = 10;
    const titleY = logoData ? logoY + logoHeight + 15 : 20;

    // Header Background
    doc.setFillColor(6, 78, 59); // dmn-green-900
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Add Logo
    if (logoData) {
      doc.addImage(logoData, 'PNG', (pageWidth - logoWidth) / 2, logoY, logoWidth, logoHeight);
    }

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`Rapport Financier Annuel - ${globalYear}`, logoData ? pageWidth / 2 : 14, titleY, { align: logoData ? 'center' : 'left' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text('Daara Madjmahoune Noreyni – UCAD ESP', logoData ? pageWidth / 2 : 14, titleY + 10, { align: logoData ? 'center' : 'left' });

    // Summary Section
    const summaryY = headerHeight + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Résumé Financier', 14, summaryY);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Cotisations : ${formatFCFA(totCot)}`, 14, summaryY + 10);
    doc.text(`Autres Recettes : ${formatFCFA(totRec)}`, 14, summaryY + 17);
    doc.text(`Total Dépenses : ${formatFCFA(totDep)}`, 14, summaryY + 24);
    if (totDettesNonPayees > 0) {
      doc.text(`Dettes (Non Payées) : +${formatFCFA(totDettesNonPayees)}`, 14, summaryY + 31);
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(solde >= 0 ? 5 : 220, solde >= 0 ? 150 : 38, solde >= 0 ? 105 : 38); // Green or Red
    doc.text(`Solde Final : ${solde > 0 ? '+' : ''}${formatFCFA(solde)}`, 14, summaryY + (totDettesNonPayees > 0 ? 40 : 33));

    const tableData = membres.map(m => {
      const status = getMemberStatus(m.id);
      const totalCotise = cotisations.filter(c => c.mId === m.id && c.annee === globalYear).reduce((s, c) => s + c.montant, 0);
      return [
        nomComplet(m), 
        m.telephone || '-', 
        m.statut || '-', 
        status.isLate ? 'En Retard' : 'Régulier', 
        status.unpaidCount,
        totalCotise > 0 ? totalCotise.toLocaleString('fr-FR') : '0'
      ];
    });

    autoTable(doc, {
      head: [['Membre', 'Téléphone', 'Statut', 'État', 'Impayés', 'Total (F)']],
      body: tableData,
      startY: summaryY + 45,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      columnStyles: {
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Footer / Signature
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text('Le Trésorier', pageWidth - 50, finalY + 20);
    doc.line(pageWidth - 60, finalY + 35, pageWidth - 14, finalY + 35);
    
    // Page numbers & generation date
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i} sur ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Rapport_DMN_Cellule_ESP_${globalYear}.pdf`);
    showToast('Rapport PDF généré avec succès', 'success');
  };

  const exportToExcel = () => {
    const data = membres.map(m => ({
      'Prénom': m.prenom,
      'Nom': m.nom,
      'Téléphone': m.telephone || '',
      'Statut': m.statut || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [
      {wch: 25}, // Prénom
      {wch: 25}, // Nom
      {wch: 20}, // Téléphone
      {wch: 25}, // Statut
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membres");
    XLSX.writeFile(wb, `Liste_Membres_DMN_Cellule_ESP_${globalYear}.xlsx`);
    showToast('Liste des membres exportée (Excel) !', 'success');
  };

  const renderStats = () => {
    const annualDettes = dettes.filter(d => d.annee === globalYear);
    const annualCotisationsFiltered = cotisations.filter(c => c.annee === globalYear);
    const annualRecettesFiltered = recettes.filter(r => r.annee === globalYear);
    const annualDepensesFiltered = depenses.filter(d => d.annee === globalYear);

    const monthlyData = MOIS.map(mois => {
      const cot = annualCotisationsFiltered.filter(c => c.mois === mois).reduce((sum, c) => sum + c.montant, 0);
      const rec = annualRecettesFiltered.filter(r => r.mois === mois).reduce((sum, r) => sum + r.montant, 0);
      const dep = annualDepensesFiltered.filter(d => d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      const dnp = annualDettes.filter(d => !d.estPayee && d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      
      // Calculate participation
      const uniquePayers = new Set(annualCotisationsFiltered.filter(c => c.mois === mois).map(c => c.mId)).size;
      
      return { 
        name: mois.substring(0, 4), 
        Cotisations: cot,
        Recettes: rec,
        Dettes: dnp,
        Dépenses: dep,
        Participations: uniquePayers,
        Solde: (cot + rec + dnp) - dep
      };
    });

    const totalDettesUnpaid = annualDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    const totalIncome = annualCotisationsFiltered.reduce((s, c) => s + c.montant, 0) + 
                        annualRecettesFiltered.reduce((s, r) => s + r.montant, 0) + 
                        totalDettesUnpaid;
    
    const totalExpense = annualDepensesFiltered.reduce((s, d) => s + d.montant, 0);
    const totalUnpaidDebts = totalDettesUnpaid;
    const globalPaymentRate = membres.length > 0 ? (new Set(annualCotisationsFiltered.filter(c => c.mois === globalMonth).map(c => c.mId)).size / membres.length) * 100 : 0;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Taux participation', value: `${globalPaymentRate.toFixed(1)}%`, sub: `Mois: ${globalMonth}`, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Revenu Total', value: `${totalIncome.toLocaleString()} FCFA`, sub: `Année ${globalYear}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Dépenses Totales', value: `${totalExpense.toLocaleString()} FCFA`, sub: `Retrait caisse`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Dettes à recouvrir', value: `${totalUnpaidDebts.toLocaleString()} FCFA`, sub: 'Non soldées', icon: AlertTriangle, color: 'text-dmn-gold', bg: 'bg-amber-50' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center`}>
                <kpi.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</p>
                <h4 className="text-xl font-black text-gray-900">{kpi.value}</h4>
                <p className="text-[10px] text-gray-500 font-medium">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Evolution Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-heading font-bold text-dmn-green-900 text-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-dmn-green-50 text-dmn-green-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                Performance Financière {globalYear}
              </h3>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="w-2 h-2 bg-dmn-green-500 rounded-full"></div> Flux Entrant
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div> Dépenses
                </span>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'}}
                    itemStyle={{fontWeight: 800, fontSize: '13px'}}
                  />
                  <Area type="monotone" dataKey="Cotisations" name="Cotisations" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEnt)" />
                  <Area type="monotone" dataKey="Dépenses" name="Dépenses" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorSort)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Mini Charts */}
          <div className="space-y-8">
            {/* Participation Chart */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="font-heading font-bold text-dmn-green-900 mb-6 text-sm uppercase tracking-widest">Taux de Participation</h3>
              <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'Payé', value: globalPaymentRate },
                        { name: 'En attente', value: 100 - globalPaymentRate }
                      ]} 
                      cx="50%" cy="50%" innerRadius={55} outerRadius={75} startAngle={90} endAngle={450} paddingAngle={0} dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-dmn-green-900">{globalPaymentRate.toFixed(0)}%</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{globalMonth}</span>
                </div>
              </div>
              <p className="text-center text-xs font-semibold text-gray-500 mt-4">
                {new Set(annualCotisationsFiltered.filter(c => c.mois === globalMonth).map(c => c.mId)).size} membres sur {membres.length}
              </p>
            </div>

            {/* Income mix */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="font-heading font-bold text-dmn-green-900 mb-6 text-sm uppercase tracking-widest">Mix des Revenus</h3>
              <div className="space-y-4">
                {[
                  { label: 'Cotisations', amount: annualCotisationsFiltered.reduce((s, c) => s + c.montant, 0), color: 'bg-dmn-green-500' },
                  { label: 'Recettes Diverses', amount: annualRecettesFiltered.reduce((s, r) => s + r.montant, 0), color: 'bg-dmn-gold' },
                  { label: 'Dettes Recouvrées', amount: annualDettes.filter(d => d.estPayee).reduce((s, d) => s + d.montant, 0), color: 'bg-blue-500' }
                ].map((item, id) => {
                  const total = annualCotisationsFiltered.reduce((s, c) => s + c.montant, 0) + 
                                annualRecettesFiltered.reduce((s, r) => s + r.montant, 0) + 
                                annualDettes.filter(d => d.estPayee).reduce((s, d) => s + d.montant, 0);
                  const pct = total > 0 ? (item.amount / total) * 100 : 0;
                  return (
                    <div key={id}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="text-gray-900">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Lower Row: Bar Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h3 className="font-heading font-bold text-dmn-green-900 mb-8 text-lg flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" /> Solde Mensuel Net
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                  <Bar dataKey="Solde" radius={[8, 8, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Solde >= 0 ? '#3b82f6' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-xs text-gray-500 font-medium">Les barres rouges indiquent un déficit mensuel (dépenses &gt; entrées).</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h3 className="font-heading font-bold text-dmn-green-900 mb-8 text-lg flex items-center gap-2">
              <Users size={18} className="text-dmn-green-600" /> Évolution des Adhésions
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                  <Bar dataKey="Participations" fill="#10b981" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-xs text-gray-500 font-medium tracking-tight">Nombre de membres uniques ayant cotisé au moins une fois dans le mois.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderRapports = () => {
    const totCot = annualCotisations.reduce((s, c) => s + c.montant, 0);
    const totRec = annualRecettes.reduce((s, r) => s + r.montant, 0);
    const totDep = annualDepenses.reduce((s, d) => s + d.montant, 0);
    const annualDettes = dettes.filter(d => d.annee === globalYear);
    const totDettesNonPayees = annualDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    const totDettesPayees = annualDettes.filter(d => d.estPayee).reduce((s, d) => s + d.montant, 0);
    const solde = totCot + totRec - totDep + totDettesNonPayees;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-dmn-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          
          <h2 className="text-3xl font-heading font-black text-dmn-green-900 mb-2 relative z-10">Centre de Rapports</h2>
          <p className="text-gray-500 mb-8 relative z-10 font-medium">Générez et téléchargez les documents officiels et exports de données.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* PDF Card */}
            <div className="bg-gradient-to-br from-white to-red-50/30 rounded-3xl shadow-sm border border-red-100 p-8 hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <Printer size={32} />
              </div>
              <h3 className="text-2xl font-heading font-bold text-gray-900 mb-3">Bilan Financier PDF</h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">Document officiel formaté pour l'impression, incluant le résumé financier et l'état des membres.</p>
              <button 
                onClick={exportToPDF}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3"
              >
                <Printer size={20} /> Générer le Rapport PDF
              </button>
            </div>
            
            {/* Excel Card */}
            <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl shadow-sm border border-emerald-100 p-8 hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <CreditCard size={32} />
              </div>
              <h3 className="text-2xl font-heading font-bold text-gray-900 mb-3">Liste des Membres en Excel</h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">Export Excel contenant uniquement : Prénom, Nom, Téléphone et Statut.</p>
              <button 
                onClick={exportToExcel}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
              >
                <CreditCard size={20} /> Télécharger l'Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-4xl mx-auto">
          <div className="bg-dmn-green-900 p-8 text-white text-center">
            <h3 className="text-xl font-heading font-bold uppercase tracking-widest">Aperçu du Rapport Financier {globalYear}</h3>
            <p className="text-dmn-green-300 text-xs mt-2">Daara Madjmahoune Noreyni – Commission Sociale</p>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Total Entrées</p>
                <p className="text-3xl font-heading font-black text-dmn-green-600">{formatPrice(totCot + totRec)} F</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Total Dépenses</p>
                <p className="text-3xl font-heading font-black text-red-600">{formatPrice(totDep)} F</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Solde Net</p>
                <p className="text-3xl font-heading font-black text-blue-600">{formatPrice(solde)} F</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-12 flex flex-col sm:flex-row justify-between gap-12">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-16">Le Président</p>
                <div className="w-48 h-0.5 bg-gray-200 mx-auto sm:mx-0"></div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Signature & Cachet</p>
              </div>
              <div className="flex-1 text-center sm:text-right">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-16">Le Trésorier</p>
                <div className="w-48 h-0.5 bg-gray-200 mx-auto sm:ml-auto"></div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Signature & Cachet</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Document généré le {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}</p>
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
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setEditingRecette({}); setIsRecetteModalOpen(true); }}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Recette
            </button>
            {globalMonth && <span className="hidden sm:inline-block bg-dmn-green-800/50 border border-dmn-green-700 px-3 py-1.5 rounded-lg text-xs font-medium">Mois : {globalMonth}</span>}
          </div>
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
                const defaultMonth = globalMonth || MOIS[new Date().getMonth()];
                const selectedMonths = quickMonths[m.id] !== undefined 
                  ? quickMonths[m.id] 
                  : (!cotisations.some(c => c.mId === m.id && c.mois === defaultMonth && c.annee === globalYear && c.montant > 0) ? [defaultMonth] : []);

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
                                {mois.substring(0, 4)} {isPaid ? '✓' : ''}
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
                          Total: {formatPrice(selectedMonths.length * Number(currentAmount))} F
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
        <div className="md:hidden divide-y divide-gray-50 flex flex-col bg-white">
          {filteredMembres.map(m => {
            const currentAmount = quickAmounts[m.id] || '';
            const defaultMonth = globalMonth || MOIS[new Date().getMonth()];
            const selectedMonths = quickMonths[m.id] !== undefined 
              ? quickMonths[m.id] 
              : (!cotisations.some(c => c.mId === m.id && c.mois === defaultMonth && c.annee === globalYear && c.montant > 0) ? [defaultMonth] : []);

            return (
              <div key={m.id} className="p-4 sm:p-5 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-700 font-black text-sm">
                      {m.prenom[0]}{m.nom[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-dmn-green-900 text-sm leading-tight">{m.prenom} {m.nom}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Saisie directe</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="500"
                      value={currentAmount}
                      onChange={(e) => setQuickAmounts({...quickAmounts, [m.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                      className="border border-gray-200 rounded-2xl pl-3 pr-8 py-2.5 text-sm font-black focus:outline-none focus:border-dmn-green-500 bg-gray-50/50 shadow-inner w-24 text-right"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">F</span>
                  </div>
                </div>
                
                <div className="bg-gray-50/50 rounded-2xl p-2.5 flex flex-wrap gap-1.5 border border-gray-100">
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
                        className={`text-[9px] px-2.5 py-1.5 rounded-xl border transition-all flex items-center justify-center min-w-[42px] uppercase font-black tracking-tighter ${
                          isPaid ? 'bg-dmn-green-50 text-dmn-green-700 border-dmn-green-200' :
                          isSelected ? 'bg-dmn-gold text-white border-dmn-gold shadow-md shadow-dmn-gold/20' :
                          'bg-white text-gray-400 border-gray-100'
                        }`}
                      >
                        {mois.substring(0, 4)} {isPaid ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'WAVE')}
                    disabled={selectedMonths.length === 0 || currentAmount === ''}
                    className="bg-[#00a1ff] flex items-center justify-center gap-2 text-white py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    WAVE
                  </button>
                  <button 
                    onClick={() => handleQuickSaveCotisation(m.id, Number(currentAmount) || 500, 'OM')}
                    disabled={selectedMonths.length === 0 || currentAmount === ''}
                    className="bg-[#ff6600] flex items-center justify-center gap-2 text-white py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    ORANGE
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
          <div className="flex items-center gap-2">
            {userRole === 'admin' && (
              <button 
                onClick={() => { setEditingMembre(null); setIsMembreModalOpen(true); }}
                className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
              </button>
            )}
          </div>
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedMemberProfile(m)} className="hover:text-dmn-green-600 font-semibold text-gray-900 text-left flex items-center gap-2 transition-colors">
                          {m.prenom} <strong>{m.nom}</strong>
                        </button>
                        <button onClick={() => setSelectedMemberHistory(m)} className="p-1 text-gray-400 hover:text-dmn-green-600 transition-colors" title="Historique">
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-dmn-green-700">{formatPrice(tot)} F</td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => setSelectedMemberProfile(m)} className="p-2 bg-dmn-green-50 text-dmn-green-600 rounded-lg hover:bg-dmn-green-100 transition-colors" title="Profil">
                          <Users size={16} />
                        </button>
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
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {filtered.map((m, i) => {
            const cots = cotisations.filter(c => c.mId === m.id && c.annee === globalYear && c.montant > 0);
            const tot = cots.reduce((s, c) => s + c.montant, 0);
            return (
              <div key={m.id} className="p-4 sm:p-5 flex flex-col gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-700 font-black text-sm">
                      {m.prenom[0]}{m.nom[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-dmn-green-900 text-sm leading-tight">{m.prenom} {m.nom}</h4>
                      <p className="text-[10px] font-black text-dmn-green-500 uppercase tracking-widest mt-0.5">{formatPrice(tot)} F de cotisations</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMemberProfile(m)} className="p-2 text-gray-400 hover:text-dmn-green-600">
                    <Info size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => { openAddCot(m.id, undefined, globalYear); setActiveTab('cotisations'); }}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 bg-dmn-green-50 hover:bg-dmn-green-100 rounded-2xl text-dmn-green-700 transition-all border border-dmn-green-100/50"
                  >
                    <CreditCard size={18} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Cotiser</span>
                  </button>
                  <button 
                    onClick={() => setSelectedMemberHistory(m)}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl text-blue-700 transition-all border border-blue-100/50"
                  >
                    <History size={18} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Historique</span>
                  </button>
                  {userRole === 'admin' ? (
                    <button 
                      onClick={() => { setEditingMembre(m); setIsMembreModalOpen(true); }}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 bg-amber-50 hover:bg-amber-100 rounded-2xl text-amber-700 transition-all border border-amber-100/50"
                    >
                      <Edit2 size={18} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Modifier</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-50 rounded-2xl text-gray-400 border border-gray-100/50 opacity-40">
                      <Shield size={18} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Lecteur</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnnuel = () => {
    return (
      <Annuel 
        globalYear={globalYear}
        setGlobalYear={setGlobalYear}
        membres={membres}
        cotisations={cotisations}
        depenses={depenses}
        recettes={recettes}
        dettes={dettes}
        appSettings={appSettings}
        globalSearch={globalSearch}
        setSelectedMemberHistory={setSelectedMemberHistory}
      />
    );
  };

  const renderCotisations = () => {
    const shareWhatsAppList = () => {
      const monthToShare = fMois || MOIS[new Date().getMonth()];
      
      const cots = cotisations.filter(c => c.annee === globalYear && c.mois === monthToShare && c.montant > 0);
      
      const sortedCots = [...cots].sort((a, b) => {
        const dateA = a.createdAt || 0;
        const dateB = b.createdAt || 0;
        return dateA - dateB;
      });

      if (sortedCots.length === 0) {
        showToast(`Aucune cotisation pour le mois de ${monthToShare}.`, 'error');
        return;
      }

      let message = `Mensualité mois d’${monthToShare} ${globalYear}\n\n`;
      
      sortedCots.forEach((c, index) => {
        const m = getMembre(c.mId);
        message += `${index + 1}- ${m.prenom} ${m.nom} ✅\n`;
      });

      const totalMembres = membres.length;
      const percentage = totalMembres > 0 ? Math.round((sortedCots.length / totalMembres) * 100) : 0;

      message += `\nTotal : ${sortedCots.length} membre(s) sur ${totalMembres} (${percentage}%)\n`;
      message += `Daara Madjmahoune Noreyni - Com Soc Cellule ESP`;

      navigator.clipboard.writeText(message).then(() => {
        showToast('Liste copiée dans le presse-papier !', 'success');
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }).catch(() => {
        showToast('Erreur lors de la copie.', 'error');
      });
    };

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
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span className="flex items-center gap-2"><CreditCard size={18} className="text-dmn-gold-light" /> Cotisations ({globalYear})</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={shareWhatsAppList}
              className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
              title="Partager sur WhatsApp"
            >
              <MessageCircle size={16} /> <span className="hidden sm:inline">WhatsApp</span>
            </button>
            {userRole === 'admin' && (
              <button 
                onClick={() => openAddCot(undefined, undefined, globalYear)}
                className="flex-1 sm:flex-none bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
              </button>
            )}
          </div>
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
                  <td className="px-6 py-4 font-bold text-dmn-green-700">{c.montant > 0 ? `${formatPrice(c.montant)} F` : <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4"><Badge mode={c.mode} date={c.createdAt || c.updatedAt} /></td>
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
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {filtered.map(c => {
            const m = getMembre(c.mId);
            return (
              <div key={c.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-dmn-green-900 text-sm leading-tight">{nomComplet(m)}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{c.mois} {c.annee}</p>
                    </div>
                  </div>
                  <Badge mode={c.mode} date={c.createdAt || c.updatedAt} />
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-50/50">
                  <p className="text-lg font-black text-dmn-green-600">{formatPrice(c.montant)} <span className="text-[10px] font-bold">FCFA</span></p>
                  {userRole === 'admin' && (
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingCot(c); setIsCotModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteCotisation(c.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Search size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">Aucune cotisation</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDettes = () => {
    const filteredDettes = dettes.filter(d => 
      (globalYear ? d.annee === globalYear : true) &&
      (globalMonth ? d.mois === globalMonth : true)
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><Banknote size={18} className="text-dmn-gold-light" /> Dettes ({globalYear})</span>
          {userRole === 'admin' && (
            <button 
              onClick={() => { setEditingDette({ annee: globalYear, montant: 0, mois: globalMonth || MOIS[currentMonthIndex] }); setIsDetteModalOpen(true); }}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> Ajouter une Dette
            </button>
          )}
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Motif / Bénéficiaire</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Période</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Montant</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Statut</th>
                {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDettes.map(d => (
                <tr key={d.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-900">{d.motif}</td>
                  <td className="px-6 py-4 text-gray-600">{d.mois} {d.annee}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{formatPrice(d.montant)} F</td>
                  <td className="px-6 py-4 text-center">
                    {userRole === 'admin' ? (
                      <button 
                        onClick={() => handleToggleDetteStatus(d)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${d.estPayee ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} whitespace-nowrap`}
                      >
                        {d.estPayee ? `Payée le ${new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleDateString('fr-FR')}` : `Non Payée depuis le ${new Date(d.createdAt || Date.now()).toLocaleDateString('fr-FR')}`}
                      </button>
                    ) : (
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${d.estPayee ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} whitespace-nowrap`}>
                        {d.estPayee ? `Payée le ${new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleDateString('fr-FR')}` : `Non Payée depuis le ${new Date(d.createdAt || Date.now()).toLocaleDateString('fr-FR')}`}
                      </span>
                    )}
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingDette(d); setIsDetteModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteDette(d.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredDettes.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">Aucune dette trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {filteredDettes.map(d => (
            <div key={d.id} className="p-4 sm:p-5 flex flex-col gap-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${d.estPayee ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} rounded-2xl flex items-center justify-center`}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-dmn-green-900 text-sm leading-tight">{d.motif}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{d.mois} {d.annee}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                   {userRole === 'admin' ? (
                      <button 
                        onClick={() => handleToggleDetteStatus(d)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all border ${d.estPayee ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-600/5' : 'bg-red-50 text-red-700 border-red-100 animate-pulse-slow shadow-sm shadow-red-600/5'} whitespace-nowrap`}
                      >
                        {d.estPayee ? 'SOLDEE' : 'EN ATTENTE'}
                      </button>
                    ) : (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${d.estPayee ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'} whitespace-nowrap`}>
                        {d.estPayee ? 'SOLDEE' : 'EN ATTENTE'}
                      </span>
                    )}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50/50">
                <p className={`text-lg font-black ${d.estPayee ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(d.montant)} <span className="text-[10px] font-bold">FCFA</span></p>
                {userRole === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingDette(d); setIsDetteModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteDette(d.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {!d.estPayee && (
                <p className="text-[9px] font-bold text-gray-400">Dette contractée le {new Date(d.createdAt || Date.now()).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          ))}
          {filteredDettes.length === 0 && (
            <div className="p-12 text-center text-gray-400 font-medium">Aucune dette trouvée</div>
          )}
        </div>
      </div>
    );
  };

  const renderRecettes = () => {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><Plus size={18} className="text-dmn-gold-light" /> Autres Entrées ({globalYear})</span>
          {userRole === 'admin' && (
            <button 
              onClick={() => { setEditingRecette({}); setIsRecetteModalOpen(true); }}
              className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Motif</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mois</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mode</th>
                {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecettes.map(r => (
                <tr key={r.id} className="hover:bg-dmn-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 text-left font-medium text-gray-900">{r.motif}</td>
                  <td className="px-6 py-4 text-gray-600">{r.mois}</td>
                  <td className="px-6 py-4 font-bold text-dmn-green-700">{formatPrice(r.montant)} F</td>
                  <td className="px-6 py-4"><Badge mode={r.mode} date={r.createdAt || r.updatedAt} /></td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 flex justify-center gap-2">
                      <button onClick={() => { setEditingRecette(r); setIsRecetteModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteRecette(r.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredRecettes.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-gray-400 text-center">Aucune autre entrée trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {filteredRecettes.map(r => (
            <div key={r.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-dmn-green-900 text-sm leading-tight">{r.motif}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{r.mois} {r.annee}</p>
                  </div>
                </div>
                <Badge mode={r.mode} date={r.createdAt || r.updatedAt} />
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50/50">
                <p className="text-lg font-black text-emerald-600">{formatPrice(r.montant)} <span className="text-[10px] font-bold">FCFA</span></p>
                {userRole === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingRecette(r); setIsRecetteModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteRecette(r.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredRecettes.length === 0 && (
            <div className="p-12 text-center text-gray-400 font-medium">Aucune entrée trouvée</div>
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
              <div className="text-xl sm:text-2xl font-bold text-dmn-green-700">{formatPrice(tot)} <span className="text-xs sm:text-sm font-medium opacity-70">FCFA</span></div>
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
    const filteredMembres = membres.filter(m => {
      const status = getMemberStatus(m.id);
      
      // Filtre de recherche
      const matchSearch = !debouncedNpSearch || `${m.prenom} ${m.nom}`.toLowerCase().includes(debouncedNpSearch.toLowerCase());
      
      // Filtre de mois spécifique
      let matchMonth = true;
      if (npMois) {
        matchMonth = status.unpaidMonths.includes(npMois);
      }

      return status.isLate && matchSearch && matchMonth;
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Total Retards</p>
            <p className="text-3xl font-heading font-black text-red-600">{filteredMembres.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Membres à jour</p>
            <p className="text-3xl font-heading font-black text-dmn-green-600">{membres.length - filteredMembres.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Taux de Recouvrement</p>
            <p className="text-3xl font-heading font-black text-blue-600">
              {membres.length > 0 ? Math.round(((membres.length - filteredMembres.length) / membres.length) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-dmn-green-900 text-white px-8 py-6 font-heading font-bold text-lg flex justify-between items-center">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-dmn-gold-light" /> 
              Suivi des Retards de Paiement
            </div>
            <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10">
              <Printer size={14} /> Imprimer
            </button>
          </div>
          <div className="p-8">
            {/* Filtres */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un membre..." 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-dmn-green-500 outline-none transition-all font-medium"
                  value={npSearch}
                  onChange={(e) => setNpSearch(e.target.value)}
                />
              </div>
              <div className="relative w-full md:w-64">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-dmn-green-500 outline-none transition-all font-medium appearance-none"
                  value={npMois}
                  onChange={(e) => setNpMois(e.target.value)}
                >
                  <option value="">Tous les mois (Retards cumulés)</option>
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Membre</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-x border-gray-100">Téléphone</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Plus ancien retard</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-x border-gray-100">Mois dus</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Rappels</th>
                    {userRole === 'admin' && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-l border-gray-100">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembres.map((m, idx) => {
                    const status = getMemberStatus(m.id);
                    return (
                      <tr key={m.id} className="hover:bg-red-50/30 transition-colors border-b border-gray-50 last:border-0 relative">
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <button onClick={() => setSelectedMemberProfile(m)} className="font-bold text-gray-900 hover:text-red-600 transition-colors block">
                            {m.prenom} {m.nom}
                          </button>
                        </td>
                        <td className="px-6 py-4 border-x border-gray-50 border-dashed">
                          <div className="inline-flex items-center gap-1.5 text-gray-600 font-medium">
                            <Smartphone size={14} className="text-gray-400" /> +221 {m.telephone || '---'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm">
                            {status.unpaidMonths[0]?.substring(0, 4)}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-x border-gray-50 border-dashed min-w-[200px]">
                          <div className="flex flex-col items-center gap-2">
                            <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg text-xs">{status.unpaidCount} mois dûs</span>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {status.unpaidMonths.slice(0, 4).map(mois => (
                                <span key={mois} className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold shadow-sm ${npMois === mois ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                  {mois.substring(0, 3)}
                                </span>
                              ))}
                              {status.unpaidMonths.length > 4 && <span className="text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold bg-gray-100 text-gray-500 shadow-sm">+{status.unpaidMonths.length - 4}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <a 
                              href={`sms:${m.telephone?.replace(/\s/g, '')}?body=${encodeURIComponent(`Assalamu 'alaykoum ${m.prenom}, niogui ziar mbokou diléne fatali mensualité commission bi 500 FCFA ba lou way ame. Wave ou OM *77 095 26 47*. Jërëjëf!`)}`}
                              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all hover:scale-110 active:scale-95 shadow-sm"
                              title="Rappel SMS"
                            >
                              <MessageCircle size={18} />
                            </a>
                            <a 
                              href={`https://wa.me/${m.telephone?.replace(/\s/g, '')}?text=${encodeURIComponent(`Assalamu 'alaykoum ${m.prenom}, niogui ziar mbokou diléne fatali mensualité commission bi 500 FCFA ba lou way ame. Wave ou OM *77 095 26 47*. Jërëjëf!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all hover:scale-110 active:scale-95 shadow-sm"
                              title="Rappel WhatsApp"
                            >
                              <Smartphone size={18} />
                            </a>
                          </div>
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 border-l border-gray-50 border-dashed">
                            <button 
                              onClick={() => { openAddCot(m.id, npMois || status.unpaidMonths[0], globalYear); setActiveTab('cotisations'); }}
                              className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20 active:scale-95 whitespace-nowrap"
                            >
                              Régulariser {npMois ? `(${npMois.substring(0, 3)})` : ''}
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
            <div className="md:hidden grid grid-cols-1 gap-6">
              {filteredMembres.map((m, idx) => {
                const status = getMemberStatus(m.id);
                return (
                  <div key={m.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <button onClick={() => setSelectedMemberProfile(m)} className="font-heading font-bold text-gray-900 text-lg hover:text-red-600 transition-colors block text-left">
                          {m.prenom} {m.nom}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                          <Smartphone size={12} className="text-gray-300" /> +221 {m.telephone || '---'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                          {status.unpaidMonths[0]?.substring(0, 4)}
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Plus ancien</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3">Mois dus ({status.unpaidCount})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {status.unpaidMonths.map(mois => (
                          <span key={mois} className={`text-[9px] px-2 py-1 rounded-lg uppercase font-black shadow-sm ${npMois === mois ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-100'}`}>
                            {mois.substring(0, 4)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => { openAddCot(m.id, npMois || status.unpaidMonths[0], globalYear); setActiveTab('cotisations'); }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-xs font-black transition-all shadow-lg shadow-red-600/20 active:scale-95 whitespace-nowrap"
                        >
                          Régulariser {npMois ? `(${npMois.substring(0, 3)})` : ''}
                        </button>
                      )}
                      <a 
                        href={`sms:${m.telephone?.replace(/\s/g, '')}?body=${encodeURIComponent(`Assalamu 'alaykoum ${m.prenom}, niogui ziar mbokou diléne fatali mensualité commission bi 500 FCFA ba lou way ame. Wave ou OM *77 095 26 47*. Jërëjëf!`)}`}
                        className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Rappel SMS"
                      >
                        <MessageCircle size={20} />
                      </a>
                      <a 
                        href={`https://wa.me/${m.telephone?.replace(/\s/g, '')}?text=${encodeURIComponent(`Assalamu 'alaykoum ${m.prenom}, niogui ziar mbokou diléne fatali mensualité commission bi 500 FCFA ba lou way ame. Wave ou OM *77 095 26 47*. Jërëjëf!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Rappel WhatsApp"
                      >
                        <Smartphone size={20} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredMembres.length === 0 && (
              <div className="text-center py-20 bg-dmn-green-50/50 rounded-[40px] border-2 border-dashed border-dmn-green-100">
                <div className="w-24 h-24 bg-dmn-green-100 text-dmn-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-heading font-black text-dmn-green-900 mb-2">Tout est en ordre !</h3>
                <p className="text-dmn-green-600 font-medium">Félicitations, tous les membres sont à jour de leurs cotisations.</p>
              </div>
            )}
          </div>
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
                  <td className="px-6 py-4 text-gray-600">
                    <div>{d.mois} {d.annee}</div>
                    <div className="mt-1"><DateBadge date={d.createdAt || d.updatedAt} /></div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{formatPrice(d.montant)} F</td>
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
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {filteredDepenses.map(d => (
            <div key={d.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-dmn-green-900 text-sm leading-tight">{d.evenement}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d.mois} {d.annee}</p>
                      <DateBadge date={d.createdAt || d.updatedAt} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50/50">
                <p className="text-lg font-black text-red-600">{formatPrice(d.montant)} <span className="text-[10px] font-bold">FCFA</span></p>
                {userRole === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingDepense(d); setIsDepenseModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteDepense(d.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredDepenses.length === 0 && (
            <div className="p-12 text-center text-gray-400 font-medium">Aucune dépense trouvée</div>
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
                <p className="text-2xl font-black text-dmn-green-800">{formatPrice(totalPaid)} F</p>
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
                            <td className="px-4 py-3 font-bold text-dmn-green-600">{formatPrice(c.montant)} F</td>
                            <td className="px-4 py-3"><Badge mode={c.mode} date={c.createdAt || c.updatedAt} /></td>
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
    csvContent += "\n";

    // Recettes
    csvContent += "AUTRES ENTREES\n";
    csvContent += "ID,Motif,Mois,Annee,Montant,Mode\n";
    recettes.forEach(r => {
      csvContent += `${r.id},${r.motif},${r.mois},${r.annee},${r.montant},${r.mode}\n`;
    });
    csvContent += "\n";

    // Dettes
    csvContent += "DETTES\n";
    csvContent += "ID,Motif,Mois,Annee,Montant,EstPayee\n";
    dettes.forEach(d => {
      csvContent += `${d.id},${d.motif},${d.mois},${d.annee},${d.montant},${d.estPayee}\n`;
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

  if (!isAuthReady || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-dmn-bg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center border border-gray-100 animate-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-dmn-green-400 via-dmn-green-600 to-dmn-gold"></div>
          <div className="w-24 h-24 mx-auto bg-dmn-green-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner relative">
            <div className="absolute inset-0 border-4 border-dmn-green-200 border-t-dmn-green-600 rounded-3xl animate-spin"></div>
            <img 
              src={appSettings.logoUrl || "logo.png"} 
              alt="Logo DMN" 
              className="w-16 h-16 object-contain animate-pulse" 
              referrerPolicy="no-referrer"
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
              }} 
            />
            <span className="hidden text-dmn-green-600 font-bold text-lg uppercase tracking-tighter">DMN</span>
          </div>
          <h2 className="text-2xl font-heading font-black text-dmn-green-900 mb-2 tracking-tight">Commission Sociale DMN</h2>
          <p className="text-dmn-green-600 font-bold text-sm uppercase tracking-widest mb-6">Chargement sécurisé...</p>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-xs text-gray-500 italic font-medium">"La constance dans l'effort est la clé de la réussite."</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dmn-bg flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center border border-gray-100 relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-dmn-green-400 via-dmn-green-600 to-dmn-gold"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-dmn-green-50 rounded-full -mr-20 -mt-20 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-dmn-gold-light/10 rounded-full -ml-16 -mb-16 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="w-28 h-28 mx-auto bg-white rounded-[32px] flex items-center justify-center overflow-hidden shadow-xl mb-8 border-4 border-dmn-green-50 rotate-3 hover:rotate-0 transition-transform duration-300">
              <img 
                src={appSettings.logoUrl || "logo.png"} 
                alt="Logo DMN" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => { 
                  if (appSettings.logoUrl) {
                    e.currentTarget.src = "logo.png";
                  } else {
                    console.error("Logo failed to load at logo.png");
                    e.currentTarget.style.display = 'none'; 
                    e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                  }
                }} 
              />
              <span className="hidden text-dmn-green-600 font-bold text-2xl uppercase tracking-tighter">DMN</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-dmn-green-900 mb-2 tracking-tight">Commission Sociale</h1>
            <p className="text-sm font-bold text-dmn-green-600 uppercase tracking-widest mb-6">Daara Madjmahoune Noreyni</p>
            
            <div className="bg-gray-50 p-5 rounded-3xl mb-8 border border-gray-100">
              <p className="text-gray-500 font-medium text-sm leading-relaxed">
                Plateforme sécurisée de gestion des cotisations et des flux financiers.
              </p>
            </div>

            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="w-full bg-dmn-green-600 hover:bg-dmn-green-700 disabled:bg-gray-400 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-dmn-green-100 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connexion...
                </>
              ) : (
                "Accéder au Portail"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dmn-bg text-gray-800 font-sans pb-24 sm:pb-10">
      {/* Header */}
      <header className="bg-dmn-green-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-40 shadow-lg border-b border-dmn-green-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner border-2 border-dmn-green-700">
            <img 
              src={appSettings.logoUrl || "logo.png"} 
              alt="Logo DMN" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              onError={(e) => { 
                if (appSettings.logoUrl) {
                  e.currentTarget.src = "logo.png";
                } else {
                  e.currentTarget.style.display = 'none'; 
                  e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                }
              }} 
            />
            <span className="hidden text-dmn-green-900 font-bold text-xs uppercase">DMN</span>
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-heading font-bold tracking-tight leading-tight">CS DMN</h1>
            <p className="text-[8px] sm:text-xs text-dmn-green-300 font-medium uppercase tracking-[0.2em]">UCAD ESP</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {userRole !== 'admin' && (
            <button onClick={() => setIsAdminModalOpen(true)} className="flex items-center gap-1.5 bg-dmn-gold-light hover:bg-dmn-gold text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95">
              <Zap size={12} /> <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <button onClick={logOut} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10" title="Se déconnecter">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Quick Filters Toggle */}
      <div className="sm:hidden bg-white border-b border-gray-100 flex items-center justify-between px-4 py-2 sticky top-[57px] z-30 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-dmn-green-600 bg-dmn-green-50 px-2 py-0.5 rounded-md whitespace-nowrap">{globalYear}</span>
          {globalMonth && <span className="text-[10px] font-bold text-dmn-green-600 bg-dmn-green-50 px-2 py-0.5 rounded-md whitespace-nowrap">{globalMonth}</span>}
        </div>
        <button 
          onClick={() => {
            const el = document.getElementById('global-filters');
            el?.classList.toggle('hidden');
          }}
          className="flex items-center gap-1 bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200"
        >
          <Search size={12} /> Filtres
        </button>
      </div>

      {/* Global Filters Bar */}
      <div id="global-filters" className="hidden sm:block bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-[100px] sm:top-[80px] z-30 px-4 sm:px-6 py-3 sm:py-4 transition-all animate-in slide-in-from-top-4 duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex-1">
              <span className="text-[10px] sm:text-sm font-semibold text-gray-400">Année:</span>
              <select value={globalYear} onChange={e => setGlobalYear(Number(e.target.value))} className="bg-transparent font-bold text-dmn-green-700 focus:outline-none cursor-pointer text-xs sm:text-sm w-full">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex-1">
              <span className="text-[10px] sm:text-sm font-semibold text-gray-400">Mois:</span>
              <select value={globalMonth} onChange={e => setGlobalMonth(e.target.value)} className="bg-transparent font-bold text-dmn-green-700 focus:outline-none cursor-pointer text-xs sm:text-sm w-full">
                <option value="">Tous</option>
                {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher un membre ou transaction..." 
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden sm:flex max-w-7xl mx-auto px-4 py-4 overflow-x-auto no-scrollbar gap-2 print:hidden sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'finance', label: 'Caisse & Rapports', icon: Wallet },
          { id: 'tickets', label: 'Tickets Resto', icon: Ticket },
          { id: 'membres', label: 'Membres', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              activeTab === tab.id 
                ? 'bg-dmn-green-600 text-white shadow-dmn-green-600/20 scale-105' 
                : 'bg-white text-gray-600 hover:bg-dmn-green-50 hover:text-dmn-green-700 border border-gray-100 hover:scale-105'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Bottom Navigation for Mobile */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 w-full">
        <nav className="bg-white/90 backdrop-blur-xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl h-16 flex items-center justify-around px-2 relative">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'finance', label: 'Caisse', icon: Wallet },
            { id: 'tickets', label: 'Tickets', icon: Ticket },
            { id: 'membres', label: 'Membres', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-2xl transition-all relative ${
                activeTab === tab.id ? 'text-dmn-green-600' : 'text-gray-400'
              }`}
            >
              <tab.icon size={activeTab === tab.id ? 22 : 20} className={activeTab === tab.id ? 'animate-bounce-slow' : ''} />
              <span className={`text-[10px] font-black uppercase tracking-tighter mt-1 transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute -bottom-1 w-1 h-1 bg-dmn-green-600 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-Navigation */}
      {activeTab === 'finance' && (
        <div className="max-w-7xl mx-auto px-4 pb-4 overflow-x-auto no-scrollbar flex gap-2 print:hidden mb-2">
          {[
            ...(userRole === 'admin' ? [{ id: 'saisie', label: 'Saisie', icon: Zap }] : []),
            { id: 'cotisations', label: 'Cotis.', icon: CreditCard },
            { id: 'recettes', label: 'Recettes', icon: Plus },
            { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
            { id: 'dettes', label: 'Dettes', icon: Banknote },
            { id: 'rapports', label: 'Rapports', icon: TrendingUp },
          ].map(sub => (
            <button 
              key={sub.id} 
              onClick={() => setFinanceSubTab(sub.id as any)} 
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border shadow-sm ${
                financeSubTab === sub.id 
                  ? 'bg-dmn-green-600 text-white border-dmn-green-600 shadow-dmn-green-600/20' 
                  : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-100'
              }`}
            >
               <sub.icon size={12} /> {sub.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'membres' && (
        <div className="max-w-7xl mx-auto px-4 pb-4 overflow-x-auto no-scrollbar flex gap-2 print:hidden mb-2">
          {[
            { id: 'liste', label: 'Annuaire', icon: Users },
            { id: 'annuel', label: 'Annuel', icon: CalendarRange },
            { id: 'retards', label: 'Retards', icon: AlertTriangle },
          ].map(sub => (
            <button 
              key={sub.id} 
              onClick={() => setMembreSubTab(sub.id as any)} 
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border shadow-sm ${
                membreSubTab === sub.id 
                  ? 'bg-dmn-green-600 text-white border-dmn-green-600 shadow-dmn-green-600/20' 
                  : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-100'
              }`}
            >
               <sub.icon size={12} /> {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 max-w-7xl mx-auto flex-1">
        {activeTab === 'dashboard' && <PremiumDashboard 
          membres={membres} cotisations={cotisations} depenses={depenses} 
          recettes={recettes} dettes={dettes} 
          ticketCollectes={ticketCollectes} ticketConversions={ticketConversions} ticketDistributions={ticketDistributions}
          globalYear={globalYear} globalMonth={globalMonth} globalMode={globalMode} 
          logoUrl={appSettings.logoUrl} userRole={userRole} onLogoUpload={handleLogoUpload}
        />}

        {activeTab === 'finance' && financeSubTab === 'saisie' && renderSaisieRapide()}
        {activeTab === 'finance' && financeSubTab === 'cotisations' && renderCotisations()}
        {activeTab === 'finance' && financeSubTab === 'recettes' && renderRecettes()}
        {activeTab === 'finance' && financeSubTab === 'depenses' && renderDepenses()}
        {activeTab === 'finance' && financeSubTab === 'dettes' && renderDettes()}
        {activeTab === 'finance' && financeSubTab === 'rapports' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 pb-2">
               <button onClick={() => setRapportSubTab('recap')} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${rapportSubTab === 'recap' ? 'bg-dmn-green-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Tableau Récap</button>
               <button onClick={() => setRapportSubTab('stats')} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${rapportSubTab === 'stats' ? 'bg-dmn-green-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Graphiques Analystiques</button>
               <button onClick={() => setRapportSubTab('pdf')} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${rapportSubTab === 'pdf' ? 'bg-dmn-green-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Génération Rapports PDF</button>
            </div>
            {/* Conditional Sub-Rendering for Reports */}
            {rapportSubTab === 'recap' && renderRecap()}
            {rapportSubTab === 'stats' && renderStats()}
            {rapportSubTab === 'pdf' && renderRapports()}
          </div>
        )}

        {activeTab === 'membres' && membreSubTab === 'liste' && renderMembres()}
        {activeTab === 'membres' && membreSubTab === 'annuel' && renderAnnuel()}
        {activeTab === 'membres' && membreSubTab === 'retards' && renderNonPayeurs()}

        {activeTab === 'tickets' && <Tickets membres={membres} globalYear={globalYear} globalMonth={globalMonth} showToast={showToast} collectes={ticketCollectes} conversions={ticketConversions} distributions={ticketDistributions} />}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white text-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center gap-2 mb-3">
            {appSettings.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo DMN" className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-dmn-green-600 font-bold text-xl px-2 py-1 bg-dmn-green-50 rounded-lg">DMN</span>
            )}
            <p className="text-dmn-green-900 font-heading font-black text-xl tracking-tight">Daara Madjmahoune Noreyni</p>
          </div>
          <p className="text-dmn-green-700 font-bold text-sm uppercase tracking-widest mb-4">Commission Sociale – UCAD ESP</p>
          <div className="w-16 h-1 bg-dmn-gold mx-auto rounded-full mb-4"></div>
          <p className="text-gray-500 text-sm font-medium mb-2">
            "Le meilleur des hommes est celui qui est le plus utile aux autres."
          </p>
          <p className="text-gray-400 text-xs">
            Plateforme de gestion financière sécurisée © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {renderMemberHistoryModal()}
      {selectedMemberProfile && renderMemberProfile(selectedMemberProfile)}

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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                <input name="telephone" defaultValue={editingMembre?.telephone} placeholder="77 000 00 00" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
                <select name="statut" defaultValue={editingMembre?.statut || 'Non Boursier'} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  <option value="Boursier">Boursier</option>
                  <option value="Non Boursier">Non Boursier</option>
                  <option value="Professionnel">Professionnel</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mois d'intégration</label>
                  <select name="moisIntegration" defaultValue={editingMembre?.moisIntegration || MOIS[new Date().getMonth()]} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                    {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année d'intégration</label>
                  <input type="number" name="anneeIntegration" defaultValue={editingMembre?.anneeIntegration || new Date().getFullYear()} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
                </div>
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

      {isRecetteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                <Plus size={20} className="text-dmn-gold-light" /> Enregistrer une entrée
              </h3>
              <button onClick={() => setIsRecetteModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveRecette} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motif / Source</label>
                <input name="motif" defaultValue={editingRecette.motif} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" placeholder="Ex: Don, Subvention..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mois</label>
                <select name="mois" defaultValue={editingRecette.mois || globalMonth || MOIS[currentMonthIndex]} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année</label>
                <input type="number" name="annee" defaultValue={editingRecette.annee || globalYear} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant (FCFA)</label>
                <input type="number" name="montant" defaultValue={editingRecette.montant || ''} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mode de paiement</label>
                <select name="mode" defaultValue={editingRecette.mode || 'WAVE'} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  <option value="WAVE">WAVE</option>
                  <option value="OM">OM</option>
                  <option value="ESPÈCES">ESPÈCES</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsRecetteModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading font-bold text-dmn-green-900 flex items-center gap-2">
                <Banknote size={20} className="text-dmn-gold-light" /> Enregistrer une dette
              </h3>
              <button onClick={() => setIsDetteModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDette} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motif / Bénéficiaire</label>
                <input name="motif" defaultValue={editingDette.motif} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" placeholder="Ex: Achat matériel, Prêt à X..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mois</label>
                <select name="mois" defaultValue={editingDette.mois || globalMonth || MOIS[currentMonthIndex]} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm">
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Année</label>
                <input type="number" name="annee" defaultValue={editingDette.annee || globalYear} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant (FCFA)</label>
                <input type="number" name="montant" defaultValue={editingDette.montant || ''} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 focus:border-dmn-green-500 transition-all shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsDetteModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
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
        <div className="fixed inset-0 bg-dmn-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-heading font-black text-gray-900 mb-3">{confirmModal.title}</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-6 py-3 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }} 
                className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                Confirmer l'action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-white/95 border-emerald-100 text-emerald-900 shadow-emerald-900/10' 
              : 'bg-white/95 border-red-100 text-red-900 shadow-red-900/10'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            </div>
            <div>
              <h4 className="font-bold text-sm">{toast.type === 'success' ? 'Succès' : 'Erreur'}</h4>
              <p className="text-sm opacity-80 font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
