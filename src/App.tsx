import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, CalendarDays, CreditCard, 
  CalendarRange, AlertTriangle, AlertCircle, CheckCircle, Plus, Search, Edit2, Edit3, Trash2, X, Wallet, Printer, LogOut,
  CheckCircle2, XCircle, Clock, ChevronRight, History, Info, Shield, Key, QrCode, Share2, UserCheck,
  Smartphone, TrendingDown, TrendingUp, Landmark, Zap, Calendar, MessageCircle, Banknote, Ticket, ArrowRightLeft, Activity, BarChart3, Coffee, Menu, Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { MOIS } from './data';
import { Membre, Cotisation, ModePaiement, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution, AppUser, UserRole, CafeProduction, CafeVente, CafeDepense, CafeTransfert, CafeSeller, CafeClient, CafeOrder, CafeDistribution, CafeVersement, CafePriceConfig } from './types';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { getAutoDateData, relativeDate, formalizeDate, simpleDate, formatMoisPreposition } from './utils/date';
import { formatPrice } from './utils/format';
import { User } from 'firebase/auth';

import { useDebounce } from './utils/useDebounce';
import { hasPermission, logAudit } from './utils/permissions';
import { RotatingMessages } from './components/RotatingMessages';
import { NetworkIndicator } from './components/NetworkIndicator';
import { ReportService } from './services/ReportService';
import AdminDateInput from './components/AdminDateInput';
import { SaisieRapide } from './components/SaisieRapide';
import { NonPayeurs } from './components/NonPayeurs';
import { MemberProfile } from './components/MemberProfile';
import { MembersTable } from './components/MembersTable';
import { CotisationsTable, RecettesTable, DepensesTable, DettesTable } from './components/FinanceModules';
import { Badge, DateBadge } from './components/ui/Badges';
import * as XLSX from 'xlsx';
import { useAdaptive } from './hooks/useAdaptive';
import { Skeleton, DashboardSkeleton } from './components/ui/Skeleton';

// Lazy load heavy components
const Tickets = lazy(() => import('./components/Tickets').then(m => ({ default: m.Tickets })));
const CafeModule = lazy(() => import('./components/cafe/CafeModule').then(m => ({ default: m.CafeModule })));
const PremiumDashboard = lazy(() => import('./components/PremiumDashboard').then(m => ({ default: m.PremiumDashboard })));
const LecteurDashboard = lazy(() => import('./components/LecteurDashboard'));
const UserRoles = lazy(() => import('./components/UserRoles').then(m => ({ default: m.UserRoles })));
const Annuel = lazy(() => import('./components/Annuel').then(m => ({ default: m.Annuel })));
const StatsAndReports = lazy(() => import('./components/StatsAndReports').then(m => ({ default: m.StatsAndReports })));

type Tab = 'dashboard' | 'finance' | 'tickets' | 'membres' | 'cafe' | 'roles' | 'rapports' | 'etat';

export default function App() {
  const { screenSize, isMobile, isLowEndDevice, shouldReduceMotion } = useAdaptive();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  
  // Test de connexion Firestore au démarrage
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'app_config'));
      } catch (error: any) {
        if (error.message?.includes('unavailable') || error.message?.includes('offline')) {
          console.warn("Firestore est actuellement hors ligne ou indisponible. Passage en mode déconnecté.");
        }
      }
    };
    testConnection();
  }, []);

  // Advanced Features State
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Membre | null>(null);
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    // Vibrate if available (haptic feedback)
    if (navigator.vibrate) {
      if (type === 'error') navigator.vibrate([10, 30, 10]);
      else navigator.vibrate(10);
    }
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<'saisie' | 'cotisations' | 'recettes' | 'depenses' | 'dettes' | 'rapports'>('cotisations');
  const [ticketsSubTab, setTicketsSubTab] = useState<'statistiques' | 'collecte' | 'conversion' | 'distribution' | 'historique'>('statistiques');
  
  const isCaisse = userRole === 'caisse' || hasPermission(userRole, 'caisse.read');
  const isTickets = userRole === 'tickets' || hasPermission(userRole, 'tickets.read');
  const isCafe = userRole === 'cafe' || hasPermission(userRole, 'cafe.production.read');
  const isAdmin = userRole === 'admin';

  const [membreSubTab, setMembreSubTab] = useState<'liste' | 'annuel' | 'retards'>('liste');

  const [membres, setMembres] = useState<Membre[]>([]);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [ticketCollectes, setTicketCollectes] = useState<TicketCollecte[]>([]);
  const [ticketConversions, setTicketConversions] = useState<TicketConversion[]>([]);
  const [ticketDistributions, setTicketDistributions] = useState<TicketDistribution[]>([]);
  const [cafeProductions, setCafeProductions] = useState<CafeProduction[]>([]);
  const [cafeVentes, setCafeVentes] = useState<CafeVente[]>([]);
  const [cafeDepenses, setCafeDepenses] = useState<CafeDepense[]>([]);
  const [cafeTransferts, setCafeTransferts] = useState<CafeTransfert[]>([]);
  const [cafeDistributions, setCafeDistributions] = useState<CafeDistribution[]>([]);
  const [cafeVersements, setCafeVersements] = useState<CafeVersement[]>([]);
  const [cafeSellers, setCafeSellers] = useState<CafeSeller[]>([]);
  const [cafeClients, setCafeClients] = useState<CafeClient[]>([]);
  const [cafePriceConfig, setCafePriceConfig] = useState<CafePriceConfig | null>(null);

  const isRevendeur = useMemo(() => {
    if (!user || isAdmin || userRole === 'cafe') return false;
    if (userRole === 'revendeur') return true;
    const userEmail = user.email?.toLowerCase().trim();
    return cafeSellers.some(s => 
      s.active && (
        (s.email && s.email.toLowerCase().trim() === userEmail) || 
        (s.codeAcces && s.codeAcces === user.uid)
      )
    );
  }, [cafeSellers, user, userRole, isAdmin]);

  const myMembre = useMemo(() => {
    if (!user) return null;
    const userEmail = user.email?.toLowerCase().trim();
    const userPhone = user.phoneNumber?.trim();
    const userDisplayName = user.displayName?.toLowerCase().trim();

    return membres.find(m => {
      if (m.userId && m.userId === user.uid) return true;

      const membreEmail = m.email?.toLowerCase().trim();
      const membrePhone = m.telephone?.trim();
      const membreFullName = `${m.prenom} ${m.nom}`.toLowerCase().trim();

      return (userEmail && membreEmail && userEmail === membreEmail) ||
             (userPhone && membrePhone && userPhone === membrePhone) ||
             (userDisplayName && userDisplayName === membreFullName);
    }) || null;
  }, [membres, user]);

  const navigationTabs = useMemo(() => {
    const ALL_TABS = [
      { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
      { id: 'etat', label: 'Mon État', icon: UserCheck },
      { id: 'finance', label: 'Caisse', icon: Wallet },
      { id: 'tickets', label: 'Tickets', icon: Ticket },
      { id: 'cafe', label: 'Café', icon: Coffee },
      { id: 'membres', label: 'Membres', icon: Users },
      { id: 'rapports', label: 'Rapports', icon: TrendingUp },
      { id: 'roles', label: 'Profil', icon: Shield },
    ];

    const isMember = !!myMembre;
    
    if (isAdmin) return ALL_TABS.filter(t => isMember || t.id !== 'etat');
    
    let tabs = ALL_TABS;
    if (userRole === 'caisse') tabs = ALL_TABS.filter(t => ['dashboard', 'finance', 'membres', 'rapports', 'roles', 'etat'].includes(t.id));
    else if (userRole === 'cafe') tabs = ALL_TABS.filter(t => ['dashboard', 'cafe', 'roles', 'etat'].includes(t.id));
    else if (userRole === 'tickets') tabs = ALL_TABS.filter(t => ['dashboard', 'tickets', 'roles', 'etat'].includes(t.id));
    else if (isRevendeur) tabs = ALL_TABS.filter(t => ['dashboard', 'cafe', 'etat'].includes(t.id));
    else if (userRole === 'lecteur' || userRole === 'visitor') tabs = ALL_TABS.filter(t => ['dashboard', 'rapports', 'etat'].includes(t.id));
    else tabs = ALL_TABS.filter(t => ['dashboard', 'etat'].includes(t.id));

    // Si pas membre, on enlève 'etat' sauf si c'est un lecteur (qui en a besoin pour se lier)
    if (!isMember && userRole !== 'lecteur') {
      tabs = tabs.filter(t => t.id !== 'etat');
    }
    
    return tabs;
  }, [userRole, isAdmin, isRevendeur, myMembre]);

  useEffect(() => {
    if (userRole && isAuthReady) {
      if (!navigationTabs.find(t => t.id === activeTab)) {
        showToast("Accès non autorisé", 'error');
        setActiveTab(navigationTabs[0].id as Tab);
      }
    }
  }, [userRole, isAuthReady, navigationTabs, activeTab]);

  const [appSettings, setAppSettings] = useState<{ logoUrl?: string }>({});
  
  const [isMembreModalOpen, setIsMembreModalOpen] = useState(false);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  
  const [isDepenseModalOpen, setIsDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Partial<Depense>>({});

  const [isRecetteModalOpen, setIsRecetteModalOpen] = useState(false);
  const [editingRecette, setEditingRecette] = useState<Partial<Recette>>({});

  const [isDetteModalOpen, setIsDetteModalOpen] = useState(false);
  const [editingDette, setEditingDette] = useState<Partial<Dette>>({});

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Direct Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    mode: 'WAVE' | null;
    membre: Membre | null;
    unpaidMonths: string[];
    selectedMonths: string[];
    customAmountPerMonth: number;
    isWaitingForValidation?: boolean;
  }>({
    isOpen: false,
    mode: null,
    membre: null,
    unpaidMonths: [],
    selectedMonths: [],
    customAmountPerMonth: 500,
    isWaitingForValidation: false,
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, financeSubTab, membreSubTab]);

  const handleQuickAction = (action: 'membre' | 'ticket' | 'cafe' | 'rapport') => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switch (action) {
      case 'membre':
        setActiveTab('membres');
        setMembreSubTab('liste');
        setEditingMembre(null);
        setIsMembreModalOpen(true);
        break;
      case 'ticket':
        setActiveTab('tickets');
        setTicketsSubTab('distribution');
        break;
      case 'cafe':
        setActiveTab('cafe');
        break;
      case 'rapport':
        setActiveTab('rapports');
        break;
    }
  };

  // Global Filters
  const currentMonthIndex = new Date().getMonth();
  const [globalYear, setGlobalYear] = useState<number>(new Date().getFullYear());
  const [globalMonth, setGlobalMonth] = useState<string>('');
  const [globalMode, setGlobalMode] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const debouncedGlobalSearch = useDebounce(globalSearch, 300);
  const membreMap = useMemo(() => {
    const map: Record<string, string> = {};
    membres.forEach(m => {
      map[m.id] = `${m.prenom} ${m.nom}`;
    });
    return map;
  }, [membres]);


  // Quick Entry State
  const [quickAmounts, setQuickAmounts] = useState<Record<string, number>>({});
  const [quickMonths, setQuickMonths] = useState<Record<string, string[]>>({});
  const [activeActionMenu, setActiveActionMenu] = useState<{mId: string, mois: string} | null>(null);

  const [isCotModalOpen, setIsCotModalOpen] = useState(false);
  const [editingCot, setEditingCot] = useState<Partial<Cotisation>>({});
  const [cotisationMembreFilter, setCotisationMembreFilter] = useState('');
  const [fMois, setFMois] = useState('');
  const [fMode, setFMode] = useState('');
  const [searchCot, setSearchCot] = useState('');
  const debouncedSearchCot = useDebounce(searchCot, 300);
  const [npMois, setNpMois] = useState('');
  const [npSearch, setNpSearch] = useState('');
  const debouncedNpSearch = useDebounce(npSearch, 300);
  // --- OPTIMIZATIONS FOR LARGE SCALE ---
  const paymentMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    cotisations.forEach(c => {
      if (c.montant > 0) {
        map[`${c.mId}_${c.annee}_${c.mois}`] = true;
      }
    });
    return map;
  }, [cotisations]);

  const memberStatsMap = useMemo(() => {
    const map: Record<string, { totalPaid: number; countPaid: number }> = {};
    cotisations.forEach(c => {
      if (c.annee === globalYear && c.montant > 0) {
        if (!map[c.mId]) map[c.mId] = { totalPaid: 0, countPaid: 0 };
        map[c.mId].totalPaid += c.montant;
        map[c.mId].countPaid += 1;
      }
    });
    return map;
  }, [cotisations, globalYear]);

  const getMemberStatus = (mId: string) => {
    const currentYear = new Date().getFullYear();
    const currentActualMonthIndex = new Date().getMonth();
    
    let currentMonthIndex;
    if (globalMonth) {
      currentMonthIndex = MOIS.indexOf(globalMonth);
    } else {
      currentMonthIndex = Number(globalYear) === currentYear ? currentActualMonthIndex : 11;
    }
    const membre = membres.find(m => m.id === mId);
    
    let startMonthIndex = 0;
    if (membre) {
      if (membre.anneeIntegration && membre.moisIntegration) {
        if (Number(membre.anneeIntegration) === Number(globalYear)) {
          startMonthIndex = MOIS.indexOf(membre.moisIntegration); // Commence le mois d'intégration
        } else if (Number(membre.anneeIntegration) > Number(globalYear)) {
          return { isLate: false, unpaidCount: 0, unpaidMonths: [] };
        }
      } else if (membre.createdAt) {
        const createdDate = new Date(membre.createdAt);
        if (createdDate.getFullYear() === Number(globalYear)) {
          startMonthIndex = createdDate.getMonth(); // Commence le mois de création
        } else if (createdDate.getFullYear() > Number(globalYear)) {
          return { isLate: false, unpaidCount: 0, unpaidMonths: [] };
        }
      }
    }

    const unpaidMonths = MOIS.slice(startMonthIndex, currentMonthIndex + 1).filter(mois => {
      return !paymentMap[`${mId}_${globalYear}_${mois}`];
    });
    return {
      isLate: unpaidMonths.length > 0,
      unpaidCount: unpaidMonths.length,
      unpaidMonths
    };
  };

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
      const dbDate = d.date ? new Date(d.date) : new Date(d.createdAt || Date.now());
      const itemAnnee = d.annee || dbDate.getFullYear();
      const itemMois = (d.mois || ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][dbDate.getMonth()]).toLowerCase();

      const matchYear = itemAnnee === globalYear;
      const matchMonth = !globalMonth || itemMois === globalMonth.toLowerCase();
      return matchYear && matchMonth;
    });
  }, [depenses, globalYear, globalMonth]);

  const filteredRecettes = useMemo(() => {
    return recettes.filter(r => {
      const dbDate = r.date ? new Date(r.date) : new Date(r.createdAt || Date.now());
      const itemAnnee = r.annee || dbDate.getFullYear();
      const itemMois = (r.mois || ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][dbDate.getMonth()]).toLowerCase();
      
      const matchYear = itemAnnee === globalYear;
      const matchMonth = !globalMonth || itemMois === globalMonth.toLowerCase();
      const matchMode = !globalMode || r.mode === globalMode;
      return matchYear && matchMonth && matchMode;
    });
  }, [recettes, globalYear, globalMonth, globalMode]);

  const annualCotisations = useMemo(() => cotisations.filter(c => (c.annee || new Date(c.date || c.createdAt || Date.now()).getFullYear()) === globalYear), [cotisations, globalYear]);
  const annualDepenses = useMemo(() => depenses.filter(d => (d.annee || new Date(d.date || d.createdAt || Date.now()).getFullYear()) === globalYear), [depenses, globalYear]);
  const annualRecettes = useMemo(() => recettes.filter(r => (r.annee || new Date(r.date || r.createdAt || Date.now()).getFullYear()) === globalYear), [recettes, globalYear]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Auth state changed:", currentUser ? currentUser.email : "No user");
      setUser(currentUser);
      if (!currentUser) {
        setUserRole(null);
        setIsLoading(false);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Listen to user document for role changes
    const unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log("User role updated:", data.role);
        setUserRole(data.role as UserRole);
      } else {
        // Create user doc if it doesn't exist (e.g. first login)
        console.log("Creating user doc for:", user.email);
        const isDefaultAdmin = user.email === 'serignefalloufaye@esp.sn';
        const initialRole: UserRole = isDefaultAdmin ? 'admin' : 'lecteur';
        const newUser: AppUser = {
          uid: user.uid,
          email: user.email || '',
          nom: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
          role: initialRole,
          createdAt: Date.now()
        };
        try {
          await setDoc(doc(db, 'users', user.uid), newUser);
        } catch (e) {
          console.error("Error creating user doc:", e);
        }
      }
      setIsAuthReady(true);
      setIsLoading(false);
    }, (error) => {
       console.error("User doc fetch error:", error);
       setUserRole('lecteur');
       setIsAuthReady(true);
       setIsLoading(false);
    });
    
    return () => unsubUserDoc();
  }, [user]);

  useEffect(() => {
    if (!isAuthReady || !user || !userRole) return;
    
    const unsubs: (() => void)[] = [];
    console.log(`Starting data listeners for role: ${userRole}`);

    // Members data - needed by almost all roles for display/selection
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      setMembres(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Membre)));
    }, (error) => {
      console.warn("Membres fetch restricted or failed:", error.message);
      // Don't toast for every restricted load to avoid spamming if role changed
    });
    unsubs.push(unsubMembres);

    // Finance data (Caisse, Finance, Stats)
    if (isAdmin || isCaisse || userRole === 'lecteur') {
      const financeQuery = query(collection(db, 'cotisations'), where('annee', '==', globalYear));
      const unsubCotisations = onSnapshot(financeQuery, (snapshot) => {
        setCotisations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cotisation)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cotisations'));
      unsubs.push(unsubCotisations);

      const depenseQuery = query(collection(db, 'depenses'), where('annee', '==', globalYear));
      const unsubDepenses = onSnapshot(depenseQuery, (snapshot) => {
        setDepenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Depense)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'depenses'));
      unsubs.push(unsubDepenses);

      const recetteQuery = query(collection(db, 'recettes'), where('annee', '==', globalYear));
      const unsubRecettes = onSnapshot(recetteQuery, (snapshot) => {
        setRecettes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recette)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'recettes'));
      unsubs.push(unsubRecettes);

      const detteQuery = query(collection(db, 'dettes'), where('annee', '==', globalYear));
      const unsubDettes = onSnapshot(detteQuery, (snapshot) => {
        setDettes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dette)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'dettes'));
      unsubs.push(unsubDettes);
    }

    // Ticket data
    if (isAdmin || isTickets || userRole === 'lecteur') {
      const unsubTicketCollectes = onSnapshot(collection(db, 'tickets_collectes'), (snapshot) => {
        setTicketCollectes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketCollecte)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_collectes'));
      unsubs.push(unsubTicketCollectes);

      const unsubTicketConversions = onSnapshot(collection(db, 'tickets_conversions'), (snapshot) => {
        setTicketConversions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketConversion)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_conversions'));
      unsubs.push(unsubTicketConversions);

      const unsubTicketDistributions = onSnapshot(collection(db, 'tickets_distributions'), (snapshot) => {
        setTicketDistributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketDistribution)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets_distributions'));
      unsubs.push(unsubTicketDistributions);
    }

    // Cafe data
    if (isAdmin || isCafe || isRevendeur || userRole === 'lecteur') {
      const unsubCafeProductions = onSnapshot(collection(db, 'cafe_productions'), (snapshot) => {
        setCafeProductions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeProduction)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_productions'));
      unsubs.push(unsubCafeProductions);

      const unsubCafeVentes = onSnapshot(collection(db, 'cafe_ventes'), (snapshot) => {
        setCafeVentes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeVente)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_ventes'));
      unsubs.push(unsubCafeVentes);

      const unsubCafeDepenses = onSnapshot(collection(db, 'cafe_depenses'), (snapshot) => {
        setCafeDepenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeDepense)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_depenses'));
      unsubs.push(unsubCafeDepenses);

      const unsubCafeTransferts = onSnapshot(collection(db, 'cafe_transferts'), (snapshot) => {
        setCafeTransferts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeTransfert)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_transferts'));
      unsubs.push(unsubCafeTransferts);

      const unsubCafeDistributions = onSnapshot(collection(db, 'cafe_distributions'), (snapshot) => {
        setCafeDistributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeDistribution)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_distributions'));
      unsubs.push(unsubCafeDistributions);

      const unsubCafeVersements = onSnapshot(collection(db, 'cafe_versements'), (snapshot) => {
        setCafeVersements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeVersement)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_versements'));
      unsubs.push(unsubCafeVersements);

      const unsubCafeSellers = onSnapshot(collection(db, 'cafe_sellers'), (snapshot) => {
        setCafeSellers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeSeller)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_sellers'));
      unsubs.push(unsubCafeSellers);

      const unsubCafeClients = onSnapshot(collection(db, 'cafe_clients'), (snapshot) => {
        setCafeClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CafeClient)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'cafe_clients'));
      unsubs.push(unsubCafeClients);

      const unsubCafePriceConfig = onSnapshot(doc(db, 'settings', 'cafe_prices'), (snapshot) => {
        if (snapshot.exists()) {
          setCafePriceConfig({ id: snapshot.id, ...snapshot.data() } as CafePriceConfig);
        }
      });
      unsubs.push(unsubCafePriceConfig);
    }

    // Admin only data
    if (isAdmin) {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
      unsubs.push(unsubUsers);
    }

    return () => {
      console.log("Cleaning up data listeners");
      unsubs.forEach(u => u());
    };
  }, [isAuthReady, user, userRole, isAdmin, isCaisse, isTickets, isCafe, isRevendeur, globalYear]);


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
  const nomComplet = (m?: Membre) => {
    if (!m) return '—';
    const baseName = `${m.prenom} ${m.nom}`;
    const duplicate = membres.some(other => other.id !== m.id && other.prenom === m.prenom && other.nom === m.nom);
    if (duplicate) {
      if (m.telephone) return `${baseName} (${m.telephone})`;
      if (m.statut) return `${baseName} [${m.statut}]`;
      return `${baseName} *`;
    }
    return baseName;
  };

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
        // Edit mode
        const duplicate = membres.find(m => m.id !== editingMembre.id && m.prenom === prenom && m.nom === nom && m.telephone === telephone);
        if (duplicate) return showToast('Un autre membre avec ces identifiants existe déjà.', 'error');
        
        await updateDoc(doc(db, 'membres', editingMembre.id), { prenom, nom, telephone, statut, moisIntegration, anneeIntegration, updatedAt: Date.now(), updatedBy: user?.uid });
        logAudit(userRole, 'members.update', 'Caisse', 'Modification membre', { id: editingMembre.id, prenom, nom });
        showToast('Membre modifié avec succès');
      } else {
        // Create mode
        const exists = membres.find(m => m.prenom === prenom && m.nom === nom && m.telephone === telephone);
        if (exists) return showToast('Ce membre existe déjà !', 'error');
        
        await addDoc(collection(db, 'membres'), { prenom, nom, telephone, statut, moisIntegration, anneeIntegration, createdAt: Date.now(), createdBy: user?.uid });
        logAudit(userRole, 'members.create', 'Caisse', 'Ajout membre', { prenom, nom });
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
          logAudit(userRole, 'members.delete', 'Caisse', 'Suppression membre', { id });
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
      logAudit(userRole, 'caisse.create', 'Caisse', 'Saisie rapide cotisations', { mId, months: selectedMonths, total: selectedMonths.length * montant });
      setQuickMonths(prev => ({ ...prev, [mId]: [] }));
      showToast('Cotisations enregistrées avec succès');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cotisations');
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  useEffect(() => {
    // Vérification retour API Wave - on attend d'être authentifié
    if (!user || (!userRole && user)) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('wave_success') === 'true') {
      const pendingStr = localStorage.getItem('pendingWavePayment');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          // On le finalise
          finalizePendingWavePayment(pending);
        } catch(e) {
          console.error("Erreur parsing pending payment", e);
        }
      }
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('wave_error') === 'true') {
      showToast("Paiement Wave annulé ou échoué", "error");
      localStorage.removeItem('pendingWavePayment');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, userRole]);

  const finalizePendingWavePayment = async (pending: any) => {
    const { sessionId, membre, selectedMonths, customAmountPerMonth, mode, globalYear: year } = pending;
    if (!membre || !selectedMonths.length || !sessionId) return;
    
    try {
      showToast("Vérification du paiement Wave...");
      
      const verifyRes = await fetch("/api/wave-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });

      if (!verifyRes.ok) {
         throw new Error("Erreur de vérification côté serveur");
      }

      const verifyData = await verifyRes.json();
      
      if (verifyData.payment_status !== "succeeded") {
         showToast(`Paiement Wave non validé (statut courant: ${verifyData.payment_status || "inconnu"}). Action annulée.`, "error");
         return; // N'enregistre pas la cotisation
      }

      showToast("Paiement validé par Wave! Enregistrement en cours...");
      
      const promises = selectedMonths.map((mois: string) => {
        const tIndex = MOIS.indexOf(mois);
        const trimestre = tIndex !== -1 ? Math.floor(tIndex / 3) + 1 : 1;
        const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        return addDoc(collection(db, 'cotisations'), {
          mId: membre.id,
          mois,
          annee: year,
          trimestre,
          heure,
          montant: customAmountPerMonth,
          mode: mode || 'WAVE',
          createdAt: Date.now(),
          createdBy: user?.uid
        });
      });

      await Promise.all(promises);
      
      logAudit(userRole, 'caisse.create', 'Caisse', 'Paiement Wave via API validé', { 
        mId: membre.id, 
        mois: selectedMonths, 
        total: selectedMonths.length * customAmountPerMonth 
      });
      
      localStorage.removeItem('pendingWavePayment');
      showToast('Bravo ! Paiement Wave enregistré avec succès.', 'success');
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'enregistrement final du paiement. Veuillez contacter l'admin.", 'error');
    }
  };

  const handleDeleteCotisation = async (id: string) => {
    confirmAction(
      'Supprimer Cotisation',
      'Voulez-vous vraiment supprimer cette cotisation ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'cotisations', id));
          logAudit(userRole, 'caisse.delete', 'Caisse', 'Suppression cotisation', { id });
          showToast('Cotisation supprimée avec succès');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'cotisations');
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const handleConfirmDirectPayment = async () => {
    if (!paymentModal.membre || paymentModal.unpaidMonths.length === 0) return;
    
    if (paymentModal.mode === "OM" || paymentModal.mode === "MAIN") {
        setPaymentModal(prev => ({ ...prev, isWaitingForValidation: true }));
        return;
    }

    const paymentAmountExFee = paymentModal.selectedMonths.length * paymentModal.customAmountPerMonth;
    const paymentFee = 0; // Wave marchand, pas de frais
    const paymentTotalAmount = paymentAmountExFee + paymentFee;

    try {
      showToast(`Création de la session Wave pour ${formatPrice(paymentTotalAmount)} F...`);
      
      // Ouvrir la fenêtre de manière synchrone pour éviter le bloqueur de popups
      const waveWindow = window.open('about:blank', '_blank');
      
      const success_url = window.location.origin + "?wave_success=true";
      const error_url = window.location.origin + "?wave_error=true";
      
      const res = await fetch("/api/wave-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentTotalAmount,
          success_url,
          error_url,
          client_reference: `cot_${paymentModal.membre.id}_${Date.now()}`
        })
      });
      
      if (!res.ok) {
        if (waveWindow) waveWindow.close();
        const errData = await res.text();
        console.error("Erreur serveur détaillées:", errData);
        throw new Error(`Erreur serveur lors de l'appel Wave: ${res.status} ${errData}`);
      }
      
      const data = await res.json();
      
      // On sauvegarde pour la redirection retour
      localStorage.setItem('pendingWavePayment', JSON.stringify({
        sessionId: data.id,
        membre: paymentModal.membre,
        selectedMonths: paymentModal.selectedMonths,
        customAmountPerMonth: paymentModal.customAmountPerMonth,
        mode: paymentModal.mode,
        globalYear
      }));

      // Redirection
      if (data.wave_launch_url) {
        if (waveWindow) {
           waveWindow.location.href = data.wave_launch_url;
        } else {
           window.open(data.wave_launch_url, '_blank');
        }
        showToast("Une nouvelle fenêtre a été ouverte pour le paiement Wave.");
        setPaymentModal(prev => ({ ...prev, isWaitingForValidation: true }));
      } else {
        if (waveWindow) waveWindow.close();
        showToast("Erreur: L'URL de paiement Wave est introuvable.", "error");
      }

    } catch (e) {
      console.error("Wave Checkout Error", e);
      showToast("Erreur lors de l'initialisation du paiement Wave.", "error");
    }
  };

  const handleFinalizeDirectPayment = async () => {
    if (!paymentModal.membre || paymentModal.selectedMonths.length === 0) return;
    
    const { membre, selectedMonths, customAmountPerMonth, mode } = paymentModal;
    const currentYear = globalYear; // On assume l'année globale
    
    try {
      showToast("Enregistrement de vos cotisations...");
      
      const promises = selectedMonths.map(mois => {
        const tIndex = MOIS.indexOf(mois);
        const trimestre = tIndex !== -1 ? Math.floor(tIndex / 3) + 1 : 1;
        const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        // Vérifier si une cotisation existe déjà (sécurité)
        const existing = cotisations.find(c => c.mId === membre.id && c.mois === mois && c.annee === currentYear);
        
        if (existing) {
          return updateDoc(doc(db, 'cotisations', existing.id), {
            montant: customAmountPerMonth,
            mode: mode || 'WAVE',
            updatedAt: Date.now()
          });
        } else {
          return addDoc(collection(db, 'cotisations'), {
            mId: membre.id,
            mois,
            annee: currentYear,
            trimestre,
            heure,
            montant: customAmountPerMonth,
            mode: mode || 'WAVE',
            createdAt: Date.now(),
            createdBy: user?.uid || 'auto'
          });
        }
      });

      await Promise.all(promises);
      
      logAudit(userRole, 'caisse.create', 'Caisse', 'Paiement direct Wave validé', { 
        mId: membre.id, 
        mois: selectedMonths, 
        total: selectedMonths.length * customAmountPerMonth 
      });
      
      showToast('Bravo ! Vos cotisations ont été mises à jour.', 'success');
      setPaymentModal({ isOpen: false, mode: null, membre: null, unpaidMonths: [], selectedMonths: [], customAmountPerMonth: 500, isWaitingForValidation: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cotisations');
      showToast("Erreur lors de l'enregistrement automatique", 'error');
    }
  };

  const handleGeneralReminderWhatsApp = () => {
    const message = `Assalamou haleykoum Mbokkou talibé yii,
Nous vous rappelons amicalement de bien vouloir régulariser vos cotisations.
Vous pouvez consulter votre état et payer directement par Wave via notre plateforme en cliquant sur ce lien :
👉 https://com-soc-dmn-cellule-esp-delta.vercel.app/
Pour ceux qui souhaitent payer par Orange Money, merci de le faire directement au 77 095 26 47.
Merci pour votre engagement envers la Commission Sociale du DMN`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openAddCot = (mId?: string, mois?: string, annee?: number) => {
    setEditingCot({ mId, mois, annee: annee || globalYear, montant: 500, mode: 'WAVE' });
    setIsCotModalOpen(true);
  };

  const handleSaveCotisation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('mId') as string;
    const montant = parseInt(formData.get('montant') as string) || 0;
    const mode = formData.get('mode') as ModePaiement;
    
    // Automatically set date information
    const customDateVal = formData.get('customDate') as string | null;
    const { mois, annee, date: fullDate, heure, trimestre } = getAutoDateData(customDateVal);

    try {
      if (editingCot?.id) {
        await updateDoc(doc(db, 'cotisations', editingCot.id), { mId, montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
        logAudit(userRole, 'caisse.update', 'Caisse', 'Modification cotisation', { id: editingCot.id, mId, montant });
        showToast('Cotisation modifiée avec succès');
      } else {
        const existing = cotisations.find(c => c.mId === mId && c.mois === mois && c.annee === annee);
        if (existing && existing.montant > 0) {
          showToast(`Ce membre a déjà payé pour le ${formatMoisPreposition(mois)} ${annee}`, 'error');
          return;
        } else if (existing) {
          await updateDoc(doc(db, 'cotisations', existing.id), { montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
          logAudit(userRole, 'caisse.create', 'Caisse', 'Ajout cotisation', { mId, mois, annee, montant });
          showToast('Cotisation enregistrée avec succès');
        } else {
          await addDoc(collection(db, 'cotisations'), { mId, mois, annee, trimestre, heure, montant, mode, createdAt: Date.now(), createdBy: user?.uid });
          logAudit(userRole, 'caisse.create', 'Caisse', 'Ajout cotisation', { mId, mois, annee, montant });
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
    const montant = parseInt(formData.get('montant') as string) || 0;
    
    const customDateVal = formData.get('customDate') as string | null;
    const { mois, annee, date, heure, trimestre } = getAutoDateData(customDateVal);
    try {
      if (editingDepense?.id) {
        await updateDoc(doc(db, 'depenses', editingDepense.id), { evenement, montant, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Dépense modifiée avec succès');
      } else {
        await addDoc(collection(db, 'depenses'), { evenement, mois, annee, trimestre, heure, montant, date, createdAt: Date.now(), createdBy: user?.uid });
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
    const montant = parseInt(formData.get('montant') as string) || 0;
    const mode = formData.get('mode') as ModePaiement;
    
    const customDateVal = formData.get('customDate') as string | null;
    const { mois, annee, date, heure, trimestre } = getAutoDateData(customDateVal);
    try {
      if (editingRecette?.id) {
        await updateDoc(doc(db, 'recettes', editingRecette.id), { motif, montant, mode, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Entrée modifiée avec succès');
      } else {
        await addDoc(collection(db, 'recettes'), { motif, mois, annee, trimestre, heure, montant, mode, date, createdAt: Date.now(), createdBy: user?.uid });
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
    const montant = parseInt(formData.get('montant') as string) || 0;
    
    const customDateVal = formData.get('customDate') as string | null;
    const { mois, annee, date, heure, trimestre } = getAutoDateData(customDateVal);
    try {
      if (editingDette?.id) {
        await updateDoc(doc(db, 'dettes', editingDette.id), { motif, montant, updatedAt: Date.now(), updatedBy: user?.uid });
        showToast('Dette modifiée avec succès');
      } else {
        await addDoc(collection(db, 'dettes'), { motif, mois, annee, trimestre, heure, montant, date, estPayee: false, createdAt: Date.now(), createdBy: user?.uid });
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

  const handleCafeTransferToCaisse = async (montant: number) => {
    if (montant <= 0 || userRole !== 'admin') return;
    confirmAction(
      'Transférer Bénéfices Café',
      `Voulez-vous transférer ${montant}F des bénéfices du café vers la caisse sociale ?`,
      async () => {
        try {
          // 1. Record transfer in coffee module
          await addDoc(collection(db, 'cafe_transferts'), {
            date: Date.now(),
            montant: montant,
            message: "Transfert annuel/mensuel vers caisse sociale",
            createdAt: serverTimestamp()
          });

          // 2. Add as a receipt (Recette) in global fund
          await addDoc(collection(db, 'recettes'), {
            motif: "Transfert Bénéfices Café ☕",
            mois: MOIS[new Date().getMonth()],
            annee: new Date().getFullYear(),
            montant: montant,
            mode: 'ESPÈCES',
            date: new Date().toISOString(),
            createdAt: Date.now(),
            createdBy: user?.uid
          });

          showToast('Transfert réussi ! Les fonds sont maintenant dans la caisse sociale.');
        } catch (error) {
          console.error("Transfer error:", error);
          showToast('Erreur lors du transfert', 'error');
        }
      }
    );
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
    const annualDettesItems = dettes.filter(d => d.annee === globalYear);
    const totDettesNonPayees = annualDettesItems.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    const solde = totCot + totRec - totDep;

    const generatePDF = (periodType: 'annuel' | 'trimestriel' | 'mensuel', pValue?: string | number) => {
      ReportService.generateFinancialReport({
        type: periodType,
        year: globalYear,
        month: periodType === 'mensuel' ? pValue as string : undefined,
        quarter: periodType === 'trimestriel' ? pValue as number : undefined,
        activeTab: 'all',
        membres,
        cotisations,
        depenses,
        recettes,
        dettes,
        ticketsCollectes: ticketCollectes,
        ticketsDistributions: ticketDistributions,
        cafeProductions,
        cafeVentes,
        cafeDepenses
      });
      showToast(`Rapport ${periodType} généré`, 'success');
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-dmn-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          
          <h2 className="text-3xl font-heading font-black text-dmn-green-900 mb-2 relative z-10">Centre de Rapports Sophistiqué</h2>
          <p className="text-gray-500 mb-8 relative z-10 font-medium">Documents certifiés incluant Finances, Tickets et Café.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* Annual Card */}
            <div className="bg-white rounded-3xl border border-dmn-green-100 p-6 hover:shadow-lg transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2 bg-dmn-green-100 text-dmn-green-600 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest">Premium</div>
              <div className="w-12 h-12 bg-dmn-green-50 text-dmn-green-600 rounded-xl flex items-center justify-center mb-4">
                <CalendarRange size={24} />
              </div>
              <h4 className="text-lg font-black text-gray-900 mb-2">Bilan Annuel {globalYear}</h4>
              <p className="text-xs text-gray-400 mb-6 font-bold leading-relaxed">Rapport exhaustif regroupant tous les modules de l'année.</p>
              <button 
                onClick={() => generatePDF('annuel')}
                className="w-full bg-dmn-green-950 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer size={14} /> Générer PDF Annuel
              </button>
            </div>

            {/* Quarterly Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-ambe-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 size={24} />
              </div>
              <h4 className="text-lg font-black text-gray-900 mb-2">Bilans Trimestriels</h4>
              <p className="text-xs text-gray-400 mb-6 font-bold leading-relaxed">Divisez l'année en 4 périodes pour un suivi agile.</p>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(q => (
                  <button 
                    key={q}
                    onClick={() => generatePDF('trimestriel', q)}
                    className="py-2.5 bg-gray-50 hover:bg-dmn-green-50 text-gray-600 hover:text-dmn-green-700 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all"
                  >
                    T{q} PDF
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-lg transition-all group overflow-y-auto max-h-[300px] no-scrollbar">
              <div className="sticky top-0 bg-white pb-4 z-10 border-b border-gray-50 mb-4">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                   <Calendar size={24} />
                 </div>
                 <h4 className="text-lg font-black text-gray-900">Rapports Mensuels</h4>
              </div>
              <div className="space-y-2">
                {MOIS.map(m => (
                  <button 
                    key={m}
                    onClick={() => generatePDF('mensuel', m)}
                    className="w-full py-2.5 px-4 flex justify-between items-center group/btn hover:bg-dmn-green-50 text-gray-500 hover:text-dmn-green-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-gray-50 hover:border-dmn-green-100"
                  >
                    <span>{m}</span>
                    <ChevronRight size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden max-w-4xl mx-auto shadow-dmn-green-900/5">
          <div className="bg-dmn-green-950 p-10 text-white text-center relative">
            <div className="absolute top-1/2 left-10 -translate-y-1/2 opacity-10"><Activity size={80} /></div>
            <h3 className="text-2xl font-heading font-black uppercase tracking-widest mb-1 italic">Vérification de Transparence</h3>
            <p className="text-dmn-green-300 text-[10px] font-bold uppercase tracking-[0.4em]">Daara Madjmahoune Noreyni UCAD – {globalYear}</p>
          </div>
          <div className="p-10 sm:p-14 space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gray-50 rounded-3xl">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Flux de Trésorerie</p>
                <p className="text-3xl font-heading font-black text-dmn-green-600">{formatPrice(totCot + totRec)} <span className="text-xs text-gray-400">FCFA</span></p>
              </div>
              <div className="text-center p-6 bg-red-50/50 rounded-3xl">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Total Engagements</p>
                <p className="text-3xl font-heading font-black text-red-600">{formatPrice(totDep)} <span className="text-xs text-gray-400">FCFA</span></p>
              </div>
              <div className="text-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Position Actuelle</p>
                <p className="text-3xl font-heading font-black text-blue-700">{formatPrice(solde)} <span className="text-xs text-gray-400">FCFA</span></p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 p-6 text-center border-t border-white/5">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Certifié Conforme par le bureau CS DMN UCAD</p>
          </div>
        </div>
      </div>
    );
  };





  const renderSaisieRapide = () => {
    return (
      <SaisieRapide 
        membres={membres}
        cotisations={cotisations}
        globalYear={globalYear}
        globalMonth={globalMonth}
        globalSearch={globalSearch}
        quickAmounts={quickAmounts}
        setQuickAmounts={setQuickAmounts}
        quickMonths={quickMonths}
        setQuickMonths={setQuickMonths}
        activeActionMenu={activeActionMenu}
        setActiveActionMenu={setActiveActionMenu}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        setEditingCot={setEditingCot}
        setIsCotModalOpen={setIsCotModalOpen}
        setEditingRecette={setEditingRecette}
        setIsRecetteModalOpen={setIsRecetteModalOpen}
        handleDeleteCotisation={handleDeleteCotisation}
        handleQuickSaveCotisation={handleQuickSaveCotisation}
        setSelectedMemberProfile={setSelectedMemberProfile}
        showToast={showToast}
        nomComplet={nomComplet}
      />
    );
  };

  const renderMembres = () => {
    return (
      <MembersTable
        membres={membres}
        globalSearch={globalSearch}
        nomComplet={nomComplet}
        memberStatsMap={memberStatsMap}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        globalYear={globalYear}
        formatPrice={formatPrice}
        setSelectedMemberProfile={setSelectedMemberProfile}
        setEditingMembre={setEditingMembre}
        setIsMembreModalOpen={setIsMembreModalOpen}
        handleDeleteMembre={handleDeleteMembre}
        openAddCot={openAddCot}
        setActiveTab={setActiveTab}
        setFinanceSubTab={setFinanceSubTab}
      />
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
        setSelectedMemberProfile={setSelectedMemberProfile}
      />
    );
  };

  const renderCotisations = () => {
    return (
      <CotisationsTable 
        membres={membres}
        cotisations={cotisations}
        globalYear={globalYear}
        fMois={fMois}
        setFMois={setFMois}
        fMode={fMode}
        setFMode={setFMode}
        searchCot={searchCot}
        setSearchCot={setSearchCot}
        debouncedSearchCot={debouncedSearchCot}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        openAddCot={openAddCot}
        setEditingCot={setEditingCot}
        setIsCotModalOpen={setIsCotModalOpen}
        handleDeleteCotisation={handleDeleteCotisation}
        showToast={showToast}
        nomComplet={nomComplet}
        getMembre={getMembre}
      />
    );
  };

  const renderDettes = () => {
    return (
      <DettesTable 
        dettes={dettes}
        globalYear={globalYear}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        setEditingDette={setEditingDette}
        setIsDetteModalOpen={setIsDetteModalOpen}
        handleDeleteDette={handleDeleteDette}
        handlePayDette={handleToggleDetteStatus}
      />
    );
  };

  const renderRecettes = () => {
    return (
      <RecettesTable 
        recettes={recettes}
        globalYear={globalYear}
        fMois={fMois}
        setFMois={setFMois}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        setEditingRecette={setEditingRecette}
        setIsRecetteModalOpen={setIsRecetteModalOpen}
        handleDeleteRecette={handleDeleteRecette}
      />
    );
  };

  const renderRecap = () => {
    const yearCots = cotisations.filter(c => Number(c.annee) === Number(globalYear));
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
    return (
      <NonPayeurs 
        membres={membres}
        getMemberStatus={getMemberStatus}
        npSearch={debouncedNpSearch}
        setNpSearch={setNpSearch}
        npMois={npMois}
        setNpMois={setNpMois}
        handleGeneralReminderWhatsApp={handleGeneralReminderWhatsApp}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        setSelectedMemberProfile={setSelectedMemberProfile}
        openAddCot={openAddCot}
        fMois={fMois}
        globalYear={globalYear}
        setActiveTab={setActiveTab}
        setFinanceSubTab={setFinanceSubTab}
      />
    );
  };

  const renderDepenses = () => {
    return (
      <DepensesTable 
        depenses={depenses}
        globalYear={globalYear}
        fMois={fMois}
        setFMois={setFMois}
        isAdmin={isAdmin}
        isCaisse={isCaisse}
        setEditingDep={setEditingDepense}
        setIsDepModalOpen={setIsDepenseModalOpen}
        handleDeleteDepense={handleDeleteDepense}
      />
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
          
          <div className="relative z-10">
            <div className="w-28 h-28 mx-auto bg-white rounded-[32px] flex items-center justify-center overflow-hidden shadow-2xl mb-8 border-4 border-dmn-beige rotate-3 hover:rotate-0 transition-transform duration-500">
              <img 
                src={appSettings.logoUrl || "logo.png"} 
                alt="Logo DMN" 
                className="w-full h-full object-contain p-2" 
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
              <span className="hidden text-dmn-green-600 font-bold text-2xl uppercase tracking-tighter">DMN</span>
            </div>
            <h1 className="text-3xl fintech-heading mb-2">Système de Gestion DMN</h1>
            <p className="text-[11px] font-black text-dmn-gold uppercase tracking-[0.3em] mb-8">Daara Madjmahoune Noreyni UCAD</p>
            
            <div className="bg-dmn-beige p-6 rounded-[2rem] mb-10 border border-dmn-gold-light/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-dmn-gold/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
              <p className="text-dmn-green-950 font-medium text-sm leading-relaxed relative z-10">
                “La transparence est une responsabilité”
              </p>
              <p className="text-[9px] font-black text-dmn-green-600/60 uppercase tracking-widest mt-2">DMN Premium Access</p>
            </div>

            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="btn-primary w-full flex items-center justify-center gap-4 text-sm"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Sécurisation...
                </>
              ) : (
                <>
                  <Shield size={20} className="text-dmn-gold-light" />
                  Accéder au Portail
                </>
              )}
            </button>
            <p className="mt-8 text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Propulsé par Commission Sociale DMN UCAD</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-dmn-bg text-gray-800 font-sans ${isMobile ? 'pb-32' : 'pb-10'} relative overflow-x-hidden`}>
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-3xl border-b border-gray-100/50 flex justify-between items-center px-4 sm:px-6 py-4 sticky top-0 z-[100] shadow-soft">
        <div className="flex items-center gap-3 sm:gap-5">
          <button 
            className="sm:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-premium border border-gray-100 p-0.5 transition-transform active:scale-95 group shrink-0">
            <div className="w-full h-full bg-dmn-green-50 rounded-[14px] flex items-center justify-center overflow-hidden">
              <img 
                src={appSettings.logoUrl || "logo.png"} 
                alt="Logo" 
                className="w-full h-full object-contain p-1" 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-[16px] fintech-heading leading-none uppercase hidden sm:block">Daara Madjmahoune Noreyni UCAD</h1>
              <h1 className="text-[16px] fintech-heading leading-none uppercase sm:hidden">DMN UCAD</h1>
              {!isMobile && (
                <div className="h-4 w-px bg-gray-200 hidden lg:block mx-1"></div>
              )}
              {!isMobile && (
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hidden lg:inline">Système de Gestion DMN</span>
              )}
            </div>
            <div className="text-[9px] font-black text-dmn-green-600 uppercase tracking-[0.2em] flex items-center gap-2">
               <span className="w-2 h-2 bg-dmn-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] animate-pulse"></span> Commission Sociale
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsQRModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-dmn-green-50 hover:bg-dmn-green-100 text-dmn-green-600 rounded-xl transition-all active:scale-90 border border-dmn-green-100 shadow-sm"
            title="Partager l'application"
          >
            <QrCode size={18} />
          </button>
          {userRole && userRole !== 'visitor' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-dmn-green-50 rounded-full border border-dmn-green-100">
               <Shield size={12} className="text-dmn-green-600" />
               <span className="text-[9px] font-black text-dmn-green-600 uppercase tracking-widest">{userRole}</span>
            </div>
          )}
          <button 
            onClick={logOut} 
            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-90 border border-gray-100 shadow-sm"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {/* Global Filters (Premium version) */}
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-2 sm:py-3 sticky top-[72px] z-[90]"
        >
          <div className="max-w-7xl mx-auto flex gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center bg-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft shrink-0">
              <Calendar size={12} className="text-dmn-green-500 mr-1.5 sm:mr-2 sm:w-4 sm:h-4" />
              <select 
                value={globalYear} 
                onChange={e => setGlobalYear(Number(e.target.value))} 
                className="bg-transparent font-black text-dmn-green-900 focus:outline-none cursor-pointer text-[10px] sm:text-xs uppercase"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div className="flex items-center bg-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft min-w-[90px] sm:min-w-[120px] shrink-0">
              <Clock size={12} className="text-dmn-green-500 mr-1.5 sm:mr-2 sm:w-4 sm:h-4" />
              <select 
                value={globalMonth} 
                onChange={e => setGlobalMonth(e.target.value)} 
                className="bg-transparent font-black text-dmn-green-900 focus:outline-none cursor-pointer text-[9px] sm:text-xs uppercase w-full"
              >
                <option value="">Tous</option>
                {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input 
                type="text" 
                placeholder="Chercher..." 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 shadow-soft"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Sub-Navigation (Modernized) */}
      <AnimatePresence>
        {(activeTab === 'finance' || activeTab === 'membres' || activeTab === 'tickets' || activeTab === 'cafe') && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 overflow-hidden"
          >
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2 sm:py-3">
              {activeTab === 'finance' && [
                ...((userRole === 'admin' || userRole === 'caisse') ? [{ id: 'saisie', label: 'Saisie', icon: Zap }] : []),
                { id: 'cotisations', label: 'Cotis.', icon: CreditCard },
                { id: 'recettes', label: 'Recettes', icon: Plus },
                { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
                { id: 'dettes', label: 'Dettes', icon: Banknote },
              ].map(sub => (
                <motion.button 
                  key={sub.id} 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFinanceSubTab(sub.id as any)} 
                  className={`flex items-center gap-1.5 sm:gap-3 px-3.5 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all shadow-sm group whitespace-nowrap border ${
                    financeSubTab === sub.id 
                      ? 'bg-dmn-green-900 text-white border-transparent shadow-xl shadow-dmn-green-900/10' 
                      : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}
                >
                   <sub.icon size={12} className={financeSubTab === sub.id ? 'stroke-[2.5px]' : 'stroke-2 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-dmn-green-600'} /> 
                   <span>{sub.label}</span>
                </motion.button>
              ))}

              {activeTab === 'membres' && [
                { id: 'liste', label: 'Annuaire', icon: Users },
                { id: 'annuel', label: 'Annuel', icon: CalendarRange },
                { id: 'retards', label: 'Retards', icon: AlertTriangle },
              ].map(sub => (
                <motion.button 
                  key={sub.id} 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMembreSubTab(sub.id as any)} 
                  className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm group whitespace-nowrap border ${
                    membreSubTab === sub.id 
                      ? 'bg-dmn-green-900 text-white border-transparent shadow-xl shadow-dmn-green-900/10' 
                      : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}
                >
                   <sub.icon size={14} className={membreSubTab === sub.id ? 'stroke-[2.5px]' : 'stroke-2 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-dmn-green-600'} /> 
                   <span>{sub.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Transition */}
      <main className="max-w-7xl mx-auto flex-1 min-h-[60vh] relative z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + financeSubTab + membreSubTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="p-3 sm:p-6 lg:p-8"
          >
            <Suspense fallback={<DashboardSkeleton />}>
        {activeTab === 'dashboard' && (
          <>
            {userRole === 'lecteur' ? (
              <LecteurDashboard 
                myMembre={myMembre}
                membres={membres}
                currentUser={user}
                cotisations={cotisations} 
                globalYear={globalYear} 
                MOIS={MOIS} 
                onDirectPaymentClick={(mode, amount, unpaidMonths) => {
                  if (myMembre) {
                    setPaymentModal({
                      isOpen: true,
                      mode,
                      membre: myMembre,
                      unpaidMonths,
                      selectedMonths: unpaidMonths,
                      customAmountPerMonth: 500
                    });
                  }
                }}
              />
            ) : (
              <>
                <RotatingMessages />
                <PremiumDashboard 
                  membres={membres} cotisations={cotisations} depenses={depenses} 
                  recettes={recettes} dettes={dettes} 
                  ticketCollectes={ticketCollectes} ticketConversions={ticketConversions} ticketDistributions={ticketDistributions}
                  cafeProductions={cafeProductions} cafeVentes={cafeVentes} cafeDepenses={cafeDepenses}
                  cafeSellers={cafeSellers} cafeClients={cafeClients}
                  globalYear={globalYear} globalMonth={globalMonth} globalMode={globalMode} 
                  logoUrl={appSettings.logoUrl} userRole={userRole} currentUser={user} onLogoUpload={handleLogoUpload}
                  onQuickAction={handleQuickAction}
                />
              </>
            )}
          </>
        )}

        {activeTab === 'etat' && (
          <LecteurDashboard 
            myMembre={myMembre}
            membres={membres}
            currentUser={user}
            cotisations={cotisations} 
            globalYear={globalYear} 
            MOIS={MOIS} 
            onDirectPaymentClick={(mode, amount, unpaidMonths) => {
              if (myMembre) {
                setPaymentModal({
                  isOpen: true,
                  mode,
                  membre: myMembre,
                  unpaidMonths,
                  selectedMonths: unpaidMonths,
                  customAmountPerMonth: 500
                });
              }
            }}
          />
        )}

        {activeTab === 'finance' && financeSubTab === 'saisie' && renderSaisieRapide()}
        {activeTab === 'finance' && financeSubTab === 'cotisations' && renderCotisations()}
        {activeTab === 'finance' && financeSubTab === 'recettes' && renderRecettes()}
        {activeTab === 'finance' && financeSubTab === 'depenses' && renderDepenses()}
        {activeTab === 'finance' && financeSubTab === 'dettes' && renderDettes()}
        {activeTab === 'rapports' && (
          <StatsAndReports
            globalYear={globalYear}
            globalMonth={globalMonth}
            cotisations={cotisations}
            depenses={depenses}
            recettes={recettes}
            dettes={dettes}
            ticketCollectes={ticketCollectes}
            ticketDistributions={ticketDistributions}
            ticketConversions={ticketConversions}
            cafeProductions={cafeProductions}
            cafeVentes={cafeVentes}
            cafeDepenses={cafeDepenses}
            membres={membres}
            showToast={showToast}
            userRole={userRole as any}
          />
        )}

        {activeTab === 'membres' && membreSubTab === 'liste' && renderMembres()}
        {activeTab === 'membres' && membreSubTab === 'annuel' && renderAnnuel()}
        {activeTab === 'membres' && membreSubTab === 'retards' && renderNonPayeurs()}

        {activeTab === 'tickets' && <Tickets membres={membres} globalYear={globalYear} globalMonth={globalMonth} showToast={showToast} collectes={ticketCollectes} conversions={ticketConversions} distributions={ticketDistributions} userRole={userRole as string} confirmAction={confirmAction} activeTab={ticketsSubTab} setActiveTab={setTicketsSubTab} />}
        
        {activeTab === 'cafe' && (
          <CafeModule 
            productions={cafeProductions}
            ventes={cafeVentes}
            depenses={cafeDepenses}
            transferts={cafeTransferts}
            distributions={cafeDistributions}
            versements={cafeVersements}
            sellers={cafeSellers}
            clients={cafeClients}
            priceConfig={cafePriceConfig}
            userRole={userRole || 'lecteur'}
            globalYear={globalYear}
            globalMonth={globalMonth}
            showToast={showToast}
            onTransferToCaisse={handleCafeTransferToCaisse}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === 'roles' && (
          <UserRoles 
            users={allUsers}
            currentUserEmail={user?.email || null}
            currentUserRole={userRole}
            showToast={showToast}
            confirmAction={confirmAction}
          />
        )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Desktop Navigation */}
      <nav className="hidden sm:flex max-w-7xl mx-auto px-6 py-4 overflow-x-auto no-scrollbar gap-2 print:hidden sticky top-[136px] z-[80] bg-white/80 backdrop-blur-md border-b border-gray-100">
        {navigationTabs.map(tab => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all shadow-sm group ${
              activeTab === tab.id 
                ? 'bg-dmn-green-600 text-white shadow-md shadow-dmn-green-600/20 ring-4 ring-dmn-green-600/10' 
                : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <tab.icon size={22} className={activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:scale-110 transition-transform text-gray-400 group-hover:text-dmn-green-600'} /> 
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Floating Bottom Navigation Apple Wallet Style (Mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[150] pb-[env(safe-area-inset-bottom,12px)] pt-10 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent pointer-events-none">
        <motion.nav 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-900/95 backdrop-blur-2xl border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-[2rem] h-[68px] flex items-center gap-1 overflow-x-auto no-scrollbar px-3 relative pointer-events-auto mx-auto max-w-[96%]"
        >
          {navigationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className="flex flex-col items-center justify-center min-w-[56px] flex-shrink-0 h-full relative group outline-none"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-dmn-green-500 text-gray-900 scale-110 shadow-lg shadow-dmn-green-500/20' 
                  : 'text-gray-400 active:scale-95'
              }`}>
                <tab.icon size={20} className={activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2 opacity-70'} />
              </div>
              <span className={`text-[7px] font-black uppercase tracking-tighter mt-1 transition-all duration-300 ${
                activeTab === tab.id ? 'opacity-100 text-white translate-y-0' : 'opacity-40 text-gray-400'
              }`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="nav-dot-mobile"
                  className="absolute -bottom-1 w-1 h-1 bg-dmn-green-500 rounded-full"
                />
              )}
            </button>
          ))}
        </motion.nav>
      </div>

      {/* Footer (Simplified for mobile) */}
      <footer className="mt-20 pb-40 px-6 text-center space-y-6">
        <div className="w-16 h-1 bg-dmn-green-100/50 mx-auto rounded-full"></div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Daara Madjmahoune Noreyni UCAD</p>
          <p className="text-[12px] font-black text-dmn-green-950 uppercase tracking-widest">Système de Gestion DMN</p>
        </div>
        <div className="inline-block px-4 py-2 bg-dmn-beige border border-dmn-gold-light/20 rounded-xl">
          <p className="text-[11px] font-black text-dmn-gold uppercase tracking-[0.2em]">“La transparence est une responsabilité”</p>
        </div>
        <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest pt-4">© {new Date().getFullYear()} DMN UCAD | Tous droits réservés</p>
      </footer>


      <AnimatePresence>
        {selectedMemberProfile && (
          <MemberProfile 
            membre={selectedMemberProfile} 
            onClose={() => setSelectedMemberProfile(null)}
            onEdit={(m) => { setEditingMembre(m); setIsMembreModalOpen(true); setSelectedMemberProfile(null); }}
            isAdmin={isAdmin}
            isCaisse={isCaisse}
            status={getMemberStatus(selectedMemberProfile.id)}
            cotisations={cotisations}
            setPaymentModal={setPaymentModal}
            formatPrice={formatPrice}
            simpleDate={simpleDate}
            Badge={Badge}
          />
        )}
      </AnimatePresence>

      {/* Modals for Membre and Depense */}
      <AnimatePresence>
        {isMembreModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-dmn-green-900 flex items-center gap-3">
                  {editingMembre ? (
                    <div className="w-12 h-12 bg-dmn-gold/10 rounded-2xl flex items-center justify-center">
                      <Edit2 size={24} className="text-dmn-gold" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-dmn-green-500/10 rounded-2xl flex items-center justify-center">
                      <Users size={24} className="text-dmn-green-600" />
                    </div>
                  )}
                  {editingMembre ? 'Modifier membre' : 'Nouveau membre'}
                </h3>
                <button onClick={() => setIsMembreModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveMembre} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Prénom</label>
                  <input name="prenom" defaultValue={editingMembre?.prenom} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nom</label>
                  <input name="nom" defaultValue={editingMembre?.nom} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Téléphone</label>
                  <input name="telephone" defaultValue={editingMembre?.telephone} placeholder="77 000 00 00" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Statut</label>
                  <select name="statut" defaultValue={editingMembre?.statut || 'Non Boursier'} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm">
                    <option value="Boursier">Boursier</option>
                    <option value="Non Boursier">Non Boursier</option>
                    <option value="Professionnel">Professionnel</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Mois d'intégration</label>
                    <select name="moisIntegration" defaultValue={editingMembre?.moisIntegration || MOIS[new Date().getMonth()]} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm">
                      {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Année</label>
                    <input type="number" name="anneeIntegration" defaultValue={editingMembre?.anneeIntegration || new Date().getFullYear()} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm" />
                  </div>
                </div>
                <div className="pt-4 sticky bottom-0 bg-white">
                  <button type="submit" className="w-full py-5 bg-dmn-green-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-dmn-green-900/20 hover:shadow-2xl hover:shadow-dmn-green-900/30 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                    {editingMembre ? 'Enregistrer les modifications' : 'Créer le membre'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCotModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-dmn-green-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-dmn-gold/10 rounded-2xl flex items-center justify-center text-dmn-gold">
                    <CreditCard size={24} />
                  </div>
                  {editingCot.id ? 'Modifier' : 'Nouvelle'} Cotisation
                </h3>
                <button onClick={() => setIsCotModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveCotisation} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Membre</label>
                    <input 
                      type="text" 
                      placeholder="Filtrer..." 
                      value={cotisationMembreFilter}
                      onChange={e => setCotisationMembreFilter(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl outline-none focus:border-dmn-green-500 bg-white"
                    />
                  </div>
                  <select name="mId" defaultValue={editingCot.mId || ''} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm">
                    <option value="" disabled>Sélectionner un membre</option>
                    {membres
                      .filter(m => nomComplet(m).toLowerCase().includes(cotisationMembreFilter.toLowerCase()))
                      .map(m => <option key={m.id} value={m.id}>{nomComplet(m)}</option>)
                    }
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Montant (FCFA)</label>
                  <input type="number" name="montant" defaultValue={editingCot.montant} placeholder="500" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Mode de paiement</label>
                  <select name="mode" defaultValue={editingCot.mode || 'WAVE'} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-500/10 focus:bg-white transition-all shadow-sm">
                    <option value="WAVE">WAVE</option>
                    <option value="OM">OM</option>
                    <option value="ESPÈCES">ESPÈCES</option>
                  </select>
                </div>
                <AdminDateInput userRole={userRole} />
                <div className="pt-4 sticky bottom-0 bg-white">
                  <button type="submit" className="w-full py-5 bg-dmn-green-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-dmn-green-900/20 hover:shadow-2xl hover:shadow-dmn-green-900/30 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                    {editingCot.id ? 'Mettre à jour' : 'Enregistrer la cotisation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isDepenseModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-dmn-green-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <TrendingDown size={24} />
                  </div>
                  Enregistrer une dépense
                </h3>
                <button onClick={() => setIsDepenseModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveDepense} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Événement / Motif</label>
                  <input name="evenement" defaultValue={editingDepense.evenement} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-red-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Montant (FCFA)</label>
                  <input type="number" name="montant" defaultValue={editingDepense.montant || ''} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-red-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <AdminDateInput userRole={userRole} />
                <div className="pt-4 sticky bottom-0 bg-white">
                  <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-red-600/20 hover:shadow-2xl hover:shadow-red-600/30 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                    Enregistrer la dépense
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isRecetteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-dmn-green-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-dmn-green-100 rounded-2xl flex items-center justify-center text-dmn-green-600">
                    <Plus size={24} />
                  </div>
                  Nouvelle Entrée
                </h3>
                <button onClick={() => setIsRecetteModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveRecette} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Motif / Source</label>
                  <input name="motif" defaultValue={editingRecette.motif} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-600/10 focus:bg-white transition-all shadow-sm" placeholder="Ex: Don, Subvention..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Montant (FCFA)</label>
                  <input type="number" name="montant" defaultValue={editingRecette.montant || ''} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-600/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Mode de paiement</label>
                  <select name="mode" defaultValue={editingRecette.mode || 'WAVE'} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-dmn-green-600/10 focus:bg-white transition-all shadow-sm">
                    <option value="WAVE">WAVE</option>
                    <option value="OM">OM</option>
                    <option value="ESPÈCES">ESPÈCES</option>
                  </select>
                </div>
                <AdminDateInput userRole={userRole} />
                <div className="pt-4 sticky bottom-0 bg-white">
                  <button type="submit" className="w-full py-5 bg-dmn-green-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-dmn-green-900/20 hover:shadow-2xl hover:shadow-dmn-green-900/30 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                    Enregistrer l'entrée
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isDetteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-dmn-green-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <Banknote size={24} />
                  </div>
                  Enregistrer une dette
                </h3>
                <button onClick={() => setIsDetteModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveDette} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Motif / Bénéficiaire</label>
                  <input name="motif" defaultValue={editingDette.motif} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-amber-500/10 focus:bg-white transition-all shadow-sm" placeholder="Ex: Achat matériel, Prêt à X..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Montant (FCFA)</label>
                  <input type="number" name="montant" defaultValue={editingDette.montant || ''} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 ring-amber-500/10 focus:bg-white transition-all shadow-sm" />
                </div>
                <AdminDateInput userRole={userRole} />
                <div className="pt-4 sticky bottom-0 bg-white">
                  <button type="submit" className="w-full py-5 bg-dmn-green-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-dmn-green-900/20 hover:shadow-2xl hover:shadow-dmn-green-900/30 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                    Enregistrer la dette
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative border border-gray-100"
            >
              <button 
                onClick={() => setIsQRModalOpen(false)} 
                className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
              
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-dmn-green-50 rounded-2xl flex items-center justify-center mx-auto text-dmn-green-600 mb-2">
                  <Share2 size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-dmn-green-900">Partager l'App</h3>
                  <p className="text-dmn-green-600 text-xs font-black uppercase tracking-widest">Commission Sociale DMN</p>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 inline-block mx-auto transform hover:scale-105 transition-transform duration-500">
                  <QRCodeSVG 
                    value={window.location.href}
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: appSettings.logoUrl || "logo.png",
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-gray-500 text-xs font-medium leading-relaxed px-4">
                    Scannez ce QR code avec votre téléphone pour accéder instantanément à l'application.
                  </p>
                  
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        showToast('Lien copié ✅');
                      }}
                      className="w-full py-4 bg-gray-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-900/10"
                    >
                      Copier le lien
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[500] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-gray-100 text-center"
            >
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4">{confirmModal.title}</h3>
              <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium px-4">
                {confirmModal.message}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }} 
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-95"
                >
                  Confirmer l'action
                </button>
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                  className="w-full py-5 bg-gray-50 text-gray-400 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct Payment Modal */}
      <AnimatePresence>
        {paymentModal.isOpen && paymentModal.membre && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[600] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative border-2 ${paymentModal.mode === 'WAVE' ? 'border-[#1DC6F8]/30' : 'border-[#FF6600]/30'} text-center overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${paymentModal.mode === 'WAVE' ? 'bg-[#1DC6F8]' : 'bg-[#FF6600]'}`}></div>
              
              <div className="flex justify-center mb-6 mt-4">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg transform -rotate-6 transition-transform ${paymentModal.mode === 'WAVE' ? 'bg-[#1DC6F8]/10 text-[#1DC6F8]' : 'bg-[#FF6600]/10 text-[#FF6600]'}`}>
                  {paymentModal.mode === 'WAVE' ? <Smartphone size={40} /> : <Wallet size={40} />}
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2">Paiement {paymentModal.mode}</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">
                Régularisation <span className="font-black text-gray-900">{paymentModal.membre.prenom} {paymentModal.membre.nom}</span> ({paymentModal.selectedMonths.length} mois)
              </p>

              <div className="text-left mb-6">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Mois à payer</p>
                <div className="flex flex-wrap gap-2 border border-gray-100 bg-gray-50/50 p-2 rounded-2xl mb-4">
                  {paymentModal.unpaidMonths.map(mois => {
                    const isSelected = paymentModal.selectedMonths.includes(mois);
                    return (
                      <button
                        key={mois}
                        onClick={() => {
                          setPaymentModal(prev => ({
                            ...prev,
                            selectedMonths: isSelected 
                              ? prev.selectedMonths.filter(m => m !== mois)
                              : [...prev.selectedMonths, mois].sort((a, b) => MOIS.indexOf(a) - MOIS.indexOf(b))
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? (paymentModal.mode === 'WAVE' ? 'bg-[#1DC6F8] text-white border-[#1DC6F8]' : 'bg-[#FF6600] text-white border-[#FF6600]') : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                      >
                        {formatMoisPreposition(mois)}
                      </button>
                    )
                  })}
                </div>
                <div className="px-1">
                  <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block">Montant par mois (FCFA)</label>
                  <input 
                    type="number" 
                    min="500"
                    value={paymentModal.customAmountPerMonth}
                    onChange={(e) => setPaymentModal(prev => ({ ...prev, customAmountPerMonth: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black focus:outline-none focus:border-dmn-green-500 bg-white"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Montant à payer</p>
                <div className="flex flex-col gap-1 items-center">
                  <p className={`text-4xl font-black ${paymentModal.mode === 'WAVE' ? 'text-[#1DC6F8]' : 'text-[#FF6600]'}`}>
                    {formatPrice((paymentModal.selectedMonths.length * paymentModal.customAmountPerMonth) + (paymentModal.mode === 'WAVE' ? 0 : Math.ceil(paymentModal.selectedMonths.length * paymentModal.customAmountPerMonth * 0.01)))} <span className="text-lg text-gray-400">F</span>
                  </p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center mt-1">
                    Base: {formatPrice(paymentModal.selectedMonths.length * paymentModal.customAmountPerMonth)}F {paymentModal.mode !== 'WAVE' && `+ Frais (1%): ${formatPrice(Math.ceil(paymentModal.selectedMonths.length * paymentModal.customAmountPerMonth * 0.01))}F`}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {!paymentModal.isWaitingForValidation ? (
                  <>
                    <button 
                      onClick={handleConfirmDirectPayment}
                      disabled={paymentModal.selectedMonths.length === 0}
                      className={`w-full py-5 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 hover:-translate-y-1 active:translate-y-0 active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-[#1DC6F8] hover:shadow-[#1DC6F8]/30 hover:bg-[#15b2e0]`}
                    >
                      <CheckCircle size={16} />
                      Ouvrir l'application de paiement
                    </button>
                    <button 
                      onClick={() => setPaymentModal({ isOpen: false, mode: null, membre: null, unpaidMonths: [], selectedMonths: [], customAmountPerMonth: 500, isWaitingForValidation: false })}
                      className="w-full py-4 text-gray-400 bg-gray-50 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-gray-100 hover:text-gray-600 transition-all"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-[#1DC6F8]/5 p-4 rounded-2xl border border-[#1DC6F8]/10 mb-2">
                       <p className="text-[10px] font-black text-[#1DC6F8] uppercase tracking-wider">Paiement en cours...</p>
                       <p className="text-xs text-gray-600 mt-1">Cliquez ci-dessous une fois que vous avez fini sur Wave.</p>
                    </div>
                    <button 
                      onClick={handleFinalizeDirectPayment}
                      className={`w-full py-5 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 hover:-translate-y-1 active:translate-y-0 active:scale-95 shadow-xl bg-dmn-green-500 hover:shadow-dmn-green-500/30 hover:bg-dmn-green-600`}
                    >
                      <CheckCircle size={16} />
                      J'ai terminé le paiement
                    </button>
                    <button 
                      onClick={() => setPaymentModal(prev => ({ ...prev, isWaitingForValidation: false }))}
                      className="w-full py-3 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all"
                    >
                      Modifier ou Retour
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] sm:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-[210] shadow-2xl flex flex-col sm:hidden overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dmn-green-50 rounded-xl flex items-center justify-center p-0.5 overflow-hidden">
                    <img src={appSettings.logoUrl || "logo.png"} alt="Logo" className="w-full h-full object-contain p-1" />
                  </div>
                  <h2 className="font-heading font-black text-dmn-green-900 text-lg">Menu</h2>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-2">
                {navigationTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as Tab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all font-bold text-sm ${
                      activeTab === tab.id 
                        ? 'bg-dmn-green-50 text-dmn-green-600 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon size={20} className={activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2 text-gray-400'} />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={() => { logOut(); setIsMobileMenuOpen(false); }} 
                  className="flex items-center gap-3 w-full p-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-colors text-sm"
                >
                  <LogOut size={20} />
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Network Status Indicator */}
      <NetworkIndicator />

      {/* Toast Notification (Modernized) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)', transition: { duration: 0.2 } }}
            className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 sm:left-auto sm:right-10 z-[300] w-[90%] sm:w-auto"
          >
            <div className={`flex items-center gap-4 px-6 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border backdrop-blur-2xl ${
              toast.type === 'success' 
                ? 'bg-white/90 border-emerald-100 text-emerald-950' 
                : toast.type === 'error'
                  ? 'bg-white/90 border-red-100 text-red-950'
                  : 'bg-white/90 border-blue-100 text-blue-950'
            }`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                toast.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                toast.type === 'error' ? 'bg-red-500 text-white shadow-red-500/20' :
                'bg-blue-500 text-white shadow-blue-500/20'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 size={24} /> : 
                 toast.type === 'error' ? <XCircle size={24} /> :
                 <Info size={24} />}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-black text-xs uppercase tracking-widest opacity-40 mb-0.5">
                  {toast.type === 'success' ? 'Succès' : toast.type === 'error' ? 'Erreur' : 'Information'}
                </h4>
                <p className="text-sm font-bold leading-tight">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToast(null)} 
                className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
