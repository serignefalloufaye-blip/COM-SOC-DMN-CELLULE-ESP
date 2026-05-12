import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Coffee, TrendingUp, TrendingDown, Package, Plus, Search, 
  Trash2, BarChart3, Calendar, Wallet, History,
  AlertCircle, Filter, ShoppingBag, Truck, Tag, ChevronRight,
  User, ClipboardList, Info, Edit2, X, Check, Download,
  Trophy, Medal, Star, TrendingUp as UpIcon, PieChart as PieChartIcon
} from 'lucide-react';
import { MOIS } from '../../data';
import { 
  CafeProduction, CafeVente, CafeDepense, CafeTransfert, ModePaiement,
  CafeSeller, CafeOrder, CafeDistribution, CafeVersement,
  CafePriceConfig, AppUser, CafeClient, UserRole
} from '../../types';
import { db, auth } from '../../firebase';
import { hasPermission, logAudit } from '../../utils/permissions';
import { collection, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { simpleDate } from '../../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CafeModuleProps {
  productions: CafeProduction[];
  ventes: CafeVente[];
  depenses: CafeDepense[];
  transferts: CafeTransfert[];
  distributions: CafeDistribution[];
  versements: CafeVersement[];
  sellers: CafeSeller[];
  clients: CafeClient[];
  priceConfig: CafePriceConfig | null;
  userRole: UserRole | null;
  globalYear: number;
  globalMonth: string | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onTransferToCaisse?: (amount: number) => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

type TabType = 'tableau' | 'production' | 'logistique' | 'ventes' | 'depenses' | 'stock' | 'stats' | 'historique';

export function CafeModule({ 
  productions, ventes, depenses, transferts, distributions,
  versements, sellers, clients, priceConfig,
  userRole, globalYear, globalMonth, showToast, onTransferToCaisse,
  confirmAction
}: CafeModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tableau');
  const [searchHistory, setSearchHistory] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'1kg' | '500g'>('1kg');
  const [selectedSellerLog, setSelectedSellerLog] = useState<string>('');
  const [statsPeriod, setStatsPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [viewingSellerId, setViewingSellerId] = useState<string | null>(null);
  const [unlockedSellerIds, setUnlockedSellerIds] = useState<string[]>([]);
  const [pinEntry, setPinEntry] = useState('');
  
  // Real-time calculation state
  const [saleQty, setSaleQty] = useState<number>(0);
  const [distQty, setDistQty] = useState<number>(0);
  const [prodQty, setProdQty] = useState<number>(0);
  const [prodCost, setProdCost] = useState<number>(0);
  const [selectedVersementSellerId, setSelectedVersementSellerId] = useState<string>('');
  const [selectedDistFormat, setSelectedDistFormat] = useState<'1kg' | '500g'>('1kg');
  const [selectedDepenseType, setSelectedDepenseType] = useState<string>('matières premières');
  const [editingDepenseType, setEditingDepenseType] = useState<string>('');
  
  // Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string | null>(null);

  const currentUser = auth.currentUser;
  const isAdmin = userRole === 'admin';
  const isCafeManager = userRole === 'cafe';
  const identifiedSeller = useMemo(() => {
    if (!currentUser?.email) return null;
    const userEmail = currentUser.email.toLowerCase().trim();
    return sellers.find(s => 
      s.active && (
        (s.email && s.email.toLowerCase().trim() === userEmail) || 
        (s.telephone && s.telephone.toLowerCase().trim() === userEmail)
      )
    );
  }, [sellers, currentUser]);

  const identifiedSellerId = identifiedSeller?.id || '';
  const isOnlySeller = !isAdmin && userRole !== 'cafe' && identifiedSellerId;
  const effectiveViewingSellerId = isOnlySeller ? identifiedSellerId : (viewingSellerId || '');
  const isViewingSellerSpace = !!effectiveViewingSellerId;
  const isSellerUnlocked = isAdmin || isCafeManager || unlockedSellerIds.includes(effectiveViewingSellerId);

  const canProduce = hasPermission(userRole as any, 'cafe.production.create') && (isAdmin || isCafeManager);
  const canSell = hasPermission(userRole as any, 'cafe.sales.create');
  const canExpense = hasPermission(userRole as any, 'cafe.expenses.create') && (isAdmin || isCafeManager);
  const canManageSellers = isAdmin || isCafeManager;

  // --- Logic Daara ---
  
  // 1. Stock Calculation (Logic Daara)
  
  // -- A. Production (Entrées Centrales)
  const totalProd1kg = useMemo(() => productions.filter(p => p.typeCafe === '1kg').reduce((s, p) => s + p.quantite, 0), [productions]);
  const totalProd500g = useMemo(() => productions.filter(p => p.typeCafe === '500g').reduce((s, p) => s + p.quantite, 0), [productions]);
  
  const totalDist1kg = useMemo(() => {
    const subset = isOnlySeller ? distributions.filter(d => d.celluleId === identifiedSellerId) : distributions;
    return subset.filter(d => d.typeCafe === '1kg').reduce((s, d) => s + d.quantite, 0);
  }, [distributions, isOnlySeller, identifiedSellerId]);
  
  const totalDist500g = useMemo(() => {
    const subset = isOnlySeller ? distributions.filter(d => d.celluleId === identifiedSellerId) : distributions;
    return subset.filter(d => d.typeCafe === '500g').reduce((s, d) => s + d.quantite, 0);
  }, [distributions, isOnlySeller, identifiedSellerId]);

  // -- C. Ventes Directes (Sorties Centrales -> Public sans cellule)
  const directVendue1kg = useMemo(() => ventes.filter(v => v.typeCafe === '1kg' && (!v.vendeurId || v.vendeurId === '')).reduce((s, v) => s + v.quantite, 0), [ventes]);
  const directVendue500g = useMemo(() => ventes.filter(v => v.typeCafe === '500g' && (!v.vendeurId || v.vendeurId === '')).reduce((s, v) => s + v.quantite, 0), [ventes]);

  // -- D. Ventes via Cellules (Sorties des Cellules)
  const cellVendue1kg = useMemo(() => ventes.filter(v => v.typeCafe === '1kg' && v.vendeurId).reduce((s, v) => s + v.quantite, 0), [ventes]);
  const cellVendue500g = useMemo(() => ventes.filter(v => v.typeCafe === '500g' && v.vendeurId).reduce((s, v) => s + v.quantite, 0), [ventes]);

  // -- E. Stock Final
  const stockDaara1kg = totalProd1kg - totalDist1kg - directVendue1kg;
  const stockDaara500g = totalProd500g - totalDist500g - directVendue500g;
  
  const stockCirculant1kg = totalDist1kg - cellVendue1kg;
  const stockCirculant500g = totalDist500g - cellVendue500g;

  // 2. Computed Summaries (Filtered by year AND month if selected)
  const filteredVentes = useMemo(() => {
    let subset = ventes.filter(v => {
      if (!v.date) return false;
      const d = new Date(v.date);
      const matchYear = d.getFullYear() === globalYear;
      const matchMonth = !globalMonth || d.getMonth() === MOIS.indexOf(globalMonth);
      return matchYear && matchMonth;
    });
    if (isOnlySeller) subset = subset.filter(v => v.vendeurId === identifiedSellerId);
    return subset;
  }, [ventes, globalYear, globalMonth, isOnlySeller, identifiedSellerId]);

  const filteredDepenses = useMemo(() => depenses.filter(d => {
    if (!d.date) return false;
    const dt = new Date(d.date);
    const matchYear = dt.getFullYear() === globalYear;
    const matchMonth = !globalMonth || dt.getMonth() === MOIS.indexOf(globalMonth);
    return matchYear && matchMonth;
  }), [depenses, globalYear, globalMonth]);
  
  const filteredProdEntries = useMemo(() => productions.filter(p => {
    if (!p.date) return false;
    const dt = new Date(p.date);
    const matchYear = dt.getFullYear() === globalYear;
    const matchMonth = !globalMonth || dt.getMonth() === MOIS.indexOf(globalMonth);
    return matchYear && matchMonth;
  }), [productions, globalYear, globalMonth]);
  
  const filteredVersements = useMemo(() => {
    let subset = versements.filter(v => {
      if (!v.date) return false;
      const dt = new Date(v.date);
      const matchYear = dt.getFullYear() === globalYear;
      const matchMonth = !globalMonth || dt.getMonth() === MOIS.indexOf(globalMonth);
      return matchYear && matchMonth;
    });
    if (isOnlySeller) subset = subset.filter(v => v.vendeurId === identifiedSellerId);
    return subset;
  }, [versements, globalYear, globalMonth, isOnlySeller, identifiedSellerId]);

  const filteredDistributions = useMemo(() => {
    let subset = distributions.filter(d => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      const matchYear = dt.getFullYear() === globalYear;
      const matchMonth = !globalMonth || dt.getMonth() === MOIS.indexOf(globalMonth);
      return matchYear && matchMonth;
    });
    if (isOnlySeller) subset = subset.filter(d => d.celluleId === identifiedSellerId);
    return subset;
  }, [distributions, globalYear, globalMonth, isOnlySeller, identifiedSellerId]);

  // -- F. Global Totals (Cumulative for "La Caisse" - might be what user expects for 29800)
  const globalTotalVentes = useMemo(() => ventes.reduce((s, v) => s + (v.total || 0), 0), [ventes]);
  const globalTotalDepenses = useMemo(() => depenses.reduce((s, d) => s + (d.montant || 0), 0), [depenses]);
  const globalTotalVersementsRecus = useMemo(() => versements.reduce((s, v) => s + (v.montant || 0), 0), [versements]);
  const globalTotalRecettesDirectes = useMemo(() => ventes.filter(v => !v.vendeurId || v.vendeurId === 'null' || v.vendeurId === '').reduce((s, v) => s + (v.total || 0), 0), [ventes]);
  
  const globalEncashed = globalTotalRecettesDirectes + globalTotalVersementsRecus;
  const globalSoldeReal = globalEncashed - globalTotalDepenses;
  const globalTheoretiqueBalance = globalTotalVentes - globalTotalDepenses;

  // -- G. Yearly KPI Data (Dashboard)
  const totalVentes = useMemo(() => filteredVentes.reduce((s, v) => s + (v.total || 0), 0), [filteredVentes]);
  const totalDepenses = useMemo(() => filteredDepenses.reduce((s, d) => s + (d.montant || 0), 0), [filteredDepenses]);
  
  // -- H. Ranking and Performance (Yearly)
  const sellerPerformance = useMemo(() => {
    return sellers.map(s => {
      const sVentes = filteredVentes.filter(v => v.vendeurId === s.id);
      const sTotalVol = sVentes.reduce((sum, v) => sum + (v.quantite || 0), 0);
      const sTotalVal = sVentes.reduce((sum, v) => sum + (v.total || 0), 0);
      const sVersements = filteredVersements.filter(v => v.vendeurId === s.id).reduce((sum, v) => sum + (v.montant || 0), 0);
      return {
        ...s,
        totalVol: sTotalVol,
        totalVal: sTotalVal,
        versements: sVersements,
        dette: sTotalVal - sVersements
      };
    }).sort((a, b) => b.totalVal - a.totalVal);
  }, [sellers, filteredVentes, filteredVersements]);

  // -- I. Sorted Data for Display (NEWEST FIRST and FILTERED BY YEAR)
  const sortedVentes = useMemo(() => [...filteredVentes].sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredVentes]);
  const sortedDepenses = useMemo(() => [...filteredDepenses].sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredDepenses]);
  const sortedProductions = useMemo(() => [...filteredProdEntries].sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredProdEntries]);
  const sortedDistributions = useMemo(() => [...filteredDistributions].sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredDistributions]);
  const sortedVersements = useMemo(() => [...filteredVersements].sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredVersements]);

  // 3. Formatters
  const formats = {
    price: (val: number) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F',
    date: (val: number) => simpleDate(val),
    percent: (val: number) => (val * 100).toFixed(1) + '%'
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export Excel réussi !", "success");
  };

  const exportToPDF = (data: any[], title: string) => {
    try {
      const doc = new jsPDF();
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);
      
      const tableColumn = Object.keys(data[0]);
      const tableRows = data.map(item => Object.values(item));

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105] }
      });

      doc.save(`${title}_${new Date().toLocaleDateString()}.pdf`);
      showToast("Export PDF réussi !", "success");
    } catch (err) {
      showToast("Erreur lors de l'export PDF", "error");
    }
  };

  // --- Actions ---

  const handleAddProduction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canProduce) return;
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('qty'));
    const cost = Number(fd.get('cost'));
    const format = fd.get('format') as string;
    const remark = fd.get('remark') as string;

    try {
      await addDoc(collection(db, 'cafe_productions'), {
        date: Date.now(),
        quantite: qty,
        coutUnitaire: cost / qty,
        total: cost,
        typeCafe: format,
        responsable: currentUser?.displayName || currentUser?.email || 'Admin',
        remarque: remark,
        createdAt: Date.now()
      });
      logAudit(userRole, 'cafe.production.create', 'Café', 'Nouvelle production', { qty, format, cost });
      showToast("Production enregistrée ✅", "success");
      (e.target as any).reset();
    } catch (err) { 
      showToast("Erreur lors de l'enregistrement de la production", "error"); 
    }
  };

  const handleAddVente = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('qty'));
    const format = fd.get('format') as '1kg' | '500g';
    const typeVenteMap = { 'sur place': 'Sur place', 'commande': 'Commande' };
    const typeVente = typeVenteMap[fd.get('type') as 'sur place' | 'commande'] || 'Sur place';
    const sellerId = fd.get('sellerId') as string;
    const mode = fd.get('mode') as ModePaiement || 'ESPÈCES';
    const price = priceConfig?.prices?.[format]?.price || (format === '1kg' ? 2500 : 1300);

    // Stock check
    if (sellerId) {
      // Cellule Stock
      const distToSeller = distributions
        .filter(d => d.celluleId === sellerId && d.typeCafe === format)
        .reduce((s, d) => s + d.quantite, 0);
      const soldBySeller = ventes
        .filter(v => v.vendeurId === sellerId && v.typeCafe === format)
        .reduce((s, v) => s + v.quantite, 0);
      
      if (qty > (distToSeller - soldBySeller)) {
        showToast("Stock insuffisant dans cette cellule", "error");
        return;
      }
    } else {
      // Daara Central Stock
      const currentStock = format === '1kg' ? stockDaara1kg : stockDaara500g;
      if (qty > currentStock) {
        showToast("Stock Daara insuffisant", "error");
        return;
      }
    }

    try {
      await addDoc(collection(db, 'cafe_ventes'), {
        date: Date.now(),
        quantite: qty,
        prixUnitaire: price,
        total: qty * price,
        typeCafe: format,
        typeVente: typeVente,
        vendeurId: sellerId || '',
        mode,
        responsable: currentUser?.displayName || currentUser?.email || 'Vendeur',
        createdAt: Date.now()
      });
      logAudit(userRole, 'cafe.sales.create', 'Café', 'Vente café', { qty, format, sellerId, total: qty * price });
      showToast("Vente enregistrée avec succès ✅", "success");
      setSaleQty(0);
      (e.target as any).reset();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, 'cafe_ventes'); 
    }
  };

  const handleAddSeller = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canProduce) return;
    const fd = new FormData(e.currentTarget);
    const nom = fd.get('nom') as string;
    const cellule = fd.get('cellule') as string;
    const telephone = fd.get('telephone') as string;
    const email = fd.get('email') as string || '';
    const codeAcces = fd.get('codeAcces') as string || '';

    try {
      await addDoc(collection(db, 'cafe_sellers'), {
        nom,
        cellule,
        telephone,
        email,
        codeAcces,
        active: true,
        createdAt: Date.now(),
        stockActuel: 0 // Initialize empty stock
      });
      logAudit(userRole, 'admin', 'Café', 'Nouveau revendeur', { nom, cellule });
      showToast("Nouveau revendeur ajouté !", "success");
      (e.target as any).reset();
    } catch (err) { 
      showToast("Erreur lors de la création du revendeur", "error"); 
    }
  };

  const handleAddDistribution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canProduce) return; // Manager of production does distribution
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('qty'));
    const format = fd.get('format') as '1kg' | '500g';
    const sellerId = fd.get('sellerId') as string;
    const price = priceConfig?.prices?.[format]?.price || (format === '1kg' ? 2500 : 1300);

    const currentStock = format === '1kg' ? stockDaara1kg : stockDaara500g;
    if (qty > currentStock) {
      showToast("Stock Daara insuffisant", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'cafe_distributions'), {
        date: Date.now(),
        celluleId: sellerId,
        quantite: qty,
        typeCafe: format,
        prixUnitaire: price,
        total: qty * price,
        responsable: currentUser?.displayName || currentUser?.email || 'Manager',
        createdAt: Date.now()
      });
      logAudit(userRole, 'cafe.production.create', 'Café', 'Distribution stock', { sellerId, qty, format });
      showToast("Distribution réussie ! ✅", "success");
      setDistQty(0);
      (e.target as any).reset();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, 'cafe_distributions');
    }
  };

  const handleAddDepense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canExpense) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const type = fd.get('type') as string;
    const motif = type === 'autres' ? (fd.get('motif') as string) : type;

    try {
      await addDoc(collection(db, 'cafe_depenses'), {
        date: Date.now(),
        montant: amount,
        motif: motif,
        categorie: type,
        responsable: currentUser?.displayName || currentUser?.email || 'Manager',
        createdAt: Date.now()
      });
      logAudit(userRole, 'cafe.expenses.create', 'Café', 'Dépense café', { amount, motif });
      showToast("Dépense enregistrée avec succès", "success");
      (e.target as any).reset();
    } catch (err) { 
      showToast("Erreur lors de l'enregistrement de la dépense", "error"); 
    }
  };

  const handleUpdatePrices = async (newPrices: any) => {
    if (!canProduce) return;
    try {
      await setDoc(doc(db, 'settings', 'cafe_prices'), {
        prices: newPrices,
        lastUpdated: Date.now()
      });
      logAudit(userRole, 'admin', 'Café', 'Mise à jour prix', { newPrices });
      showToast("Configuration des prix mise à jour !", "success");
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'settings/cafe_prices');
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!isAdmin && !isCafeManager) {
      showToast("Seul l'administrateur ou le gérant peut supprimer des données", "error");
      return;
    }

    confirmAction(
      "Supprimer l'élément",
      "Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.",
      async () => {
        try {
          await deleteDoc(doc(db, collectionName, id));
          logAudit(userRole, 'admin', 'Café', `Suppression ${collectionName}`, { id });
          showToast("Élément supprimé avec succès", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, collectionName);
        }
      }
    );
  };

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem || !editingType) return;
    
    const fd = new FormData(e.currentTarget);
    const updates: any = {};
    
    try {
      if (editingType === 'production') {
        const qty = Number(fd.get('qty'));
        const total = Number(fd.get('total'));
        updates.quantite = qty;
        updates.total = total;
        updates.coutUnitaire = total / qty;
        updates.typeCafe = fd.get('format');
        updates.remarque = fd.get('remark');
      } else if (editingType === 'vente') {
        const qty = Number(fd.get('qty'));
        const price = Number(fd.get('price'));
        updates.quantite = qty;
        updates.prixUnitaire = price;
        updates.total = qty * price;
        updates.typeCafe = fd.get('format');
        updates.mode = fd.get('mode');
        updates.typeVente = fd.get('type');
      } else if (editingType === 'depense') {
        const type = fd.get('type') as string;
        updates.montant = Number(fd.get('amount'));
        updates.motif = type === 'autres' ? (fd.get('motif') as string) : type;
        updates.categorie = type;
      } else if (editingType === 'distribution') {
        const qty = Number(fd.get('qty'));
        const price = Number(fd.get('price'));
        updates.quantite = qty;
        updates.prixUnitaire = price;
        updates.total = qty * price;
        updates.typeCafe = fd.get('format');
        updates.celluleId = fd.get('sellerId');
      } else if (editingType === 'versement') {
        updates.montant = Number(fd.get('amount'));
        updates.vendeurId = fd.get('sellerId');
        updates.mode = fd.get('mode');
      } else if (editingType === 'seller') {
        updates.nom = fd.get('nom');
        updates.cellule = fd.get('cellule');
        updates.telephone = fd.get('telephone');
        updates.email = fd.get('email');
        updates.codeAcces = fd.get('codeAcces');
      }

      const collRef = {
        'production': 'cafe_productions',
        'vente': 'cafe_ventes',
        'depense': 'cafe_depenses',
        'distribution': 'cafe_distributions',
        'versement': 'cafe_versements',
        'seller': 'cafe_sellers'
      }[editingType];

      if (collRef) {
        await updateDoc(doc(db, collRef, editingItem.id), updates);
        showToast("Élément mis à jour avec succès ✅", "success");
        setEditingItem(null);
        setEditingType(null);
      }
    } catch (err) {
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  // --- Render Sections ---

  const renderDashboard = () => {
    if (isViewingSellerSpace) {
      const s = sellerPerformance.find(p => p.id === effectiveViewingSellerId);

      if (!isSellerUnlocked) {
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl text-center max-w-md w-full">
               <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
                  <User className="text-amber-600" size={32} />
               </div>
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">Espace Protégé</h3>
               <p className="text-xs font-bold text-gray-400 uppercase mb-8">Bonjour {s?.nom}, entrez votre code d'accès</p>
               
               <div className="flex justify-center gap-4 mb-8">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`w-12 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${pinEntry.length > i ? 'bg-amber-500 text-white shadow-lg scale-110' : 'bg-gray-50 text-gray-300'}`}>
                       {pinEntry.length > i ? '•' : ''}
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6,7,8,9, 'C', 0, 'OK'].map(num => (
                    <button 
                      key={num.toString()}
                      onClick={() => {
                        if (num === 'C') setPinEntry('');
                        else if (num === 'OK') {
                          if (pinEntry === s?.codeAcces) {
                            setUnlockedSellerIds(prev => [...prev, effectiveViewingSellerId]);
                            showToast("Accès autorisé", "success");
                          } else {
                            showToast("Code incorrect", "error");
                            setPinEntry('');
                          }
                        }
                        else if (pinEntry.length < 4) setPinEntry(prev => prev + num);
                      }}
                      className={`h-14 rounded-2xl font-black text-lg transition-all ${
                        num === 'OK' ? 'bg-emerald-600 text-white col-span-1' : 
                        num === 'C' ? 'bg-red-50 text-red-500' : 
                        'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
               </div>
               {!isOnlySeller && (
                 <button onClick={() => setViewingSellerId(null)} className="mt-8 text-[10px] font-black text-gray-400 uppercase hover:text-gray-900 underline">Retour Admin</button>
               )}
            </div>
          </div>
        );
      }

      const myVentes = filteredVentes.filter(v => v.vendeurId === effectiveViewingSellerId);
      
      const myDistributions = distributions.filter(d => d.celluleId === effectiveViewingSellerId);
      const received1kg = myDistributions.filter(d => d.typeCafe === '1kg').reduce((sum, d) => sum + d.quantite, 0);
      const received500g = myDistributions.filter(d => d.typeCafe === '500g').reduce((sum, d) => sum + d.quantite, 0);
      
      const sold1kg = myVentes.filter(v => v.typeCafe === '1kg').reduce((sum, v) => sum + v.quantite, 0);
      const sold500g = myVentes.filter(v => v.typeCafe === '500g').reduce((sum, v) => sum + v.quantite, 0);

      const monS1kg = received1kg - sold1kg;
      const monS500g = received500g - sold500g;

      const myMonthly = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(globalYear, i).toLocaleString('default', { month: 'short' }),
        ventes: myVentes.filter(v => new Date(v.date).getMonth() === i).reduce((sum, v) => sum + v.total, 0)
      }));

      // Goal logic
      const monthlyGoal = 50000; // Example goal
      const currentMonthVentes = myVentes.filter(v => new Date(v.date).getMonth() === new Date().getMonth()).reduce((s, v) => s + v.total, 0);
      const goalProgress = Math.min(100, (currentMonthVentes / monthlyGoal) * 100);

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Profile Header */}
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6 text-center md:text-left">
                 <div className="w-20 h-20 rounded-full bg-brown-50 flex items-center justify-center border-4 border-white shadow-xl">
                    <User className="text-brown-600" size={32} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">{s?.nom}</h2>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest italic">{s?.cellule} • {s?.telephone || 'No Phone'}</p>
                 </div>
              </div>
              <div className="flex bg-gray-50 px-6 py-4 rounded-[2rem] border border-gray-100 items-center gap-4">
                 <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dernière Activité</p>
                    <p className="text-sm font-black text-gray-900">{myVentes.length > 0 ? formats.date(Math.max(...myVentes.map(v => v.date))) : 'Aucune'}</p>
                 </div>
                 {(isAdmin || isCafeManager) && (
                   <div className="ml-4 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[8px] font-black text-amber-600 uppercase">Code Accès</p>
                      <p className="text-xs font-black text-amber-900">{s?.codeAcces || '----'}</p>
                   </div>
                 )}
                 {!isOnlySeller && (
                   <button onClick={() => setViewingSellerId(null)} className="ml-4 p-2 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition-all">
                      <X size={16} />
                   </button>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Mes Ventes (CA)', val: formats.price(s?.totalVal || 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Sachets Vendus', val: (s?.totalVol || 0), unit: 'Uts', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Versements Faits', val: formats.price(s?.versements || 0), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Reste à Verser', val: formats.price(s?.dette || 0), icon: AlertCircle, color: (s?.dette || 0) > 0 ? 'text-red-500' : 'text-emerald-600', bg: 'bg-gray-50' }
              ].map((kpi, i) => (
                <div key={i} className={`p-6 rounded-[2.5rem] border border-gray-100 shadow-sm ${kpi.bg} transition-transform hover:scale-[1.02]`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl bg-white shadow-sm ${kpi.color}`}>
                      <kpi.icon size={20} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
                      <p className={`text-xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                  </div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 mb-8">
                      <BarChart3 className="text-emerald-600" size={18} /> Mon Évolution Mensuelle
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={myMonthly}>
                          <defs>
                            <linearGradient id="colorSeller" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="ventes" stroke="#059669" fill="url(#colorSeller)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Performance Badges */}
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-6 flex items-center gap-2">
                     <Trophy className="text-amber-500" size={18} /> Mes Récompenses & Badges
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-3xl border ${s?.totalVol && s.totalVol > 50 ? 'border-amber-200 bg-amber-50' : 'border-gray-50 opacity-40'} text-center`}>
                         <Medal className="mx-auto mb-2 text-amber-500" size={32} />
                         <p className="text-[10px] font-black uppercase">Vendeur Actif</p>
                         <p className="text-[8px] font-bold text-gray-400"> +50 sachets</p>
                      </div>
                      <div className={`p-4 rounded-3xl border ${s?.totalVal && s.totalVal > 200000 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-50 opacity-40'} text-center`}>
                         <Star className="mx-auto mb-2 text-emerald-500" size={32} />
                         <p className="text-[10px] font-black uppercase">Chiffre d'Or</p>
                         <p className="text-[8px] font-bold text-gray-400"> +200k CA</p>
                      </div>
                      <div className={`p-4 rounded-3xl border ${s?.dette === 0 && (s?.totalVal || 0) > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-50 opacity-40'} text-center`}>
                         <Check className="mx-auto mb-2 text-blue-500" size={32} />
                         <p className="text-[10px] font-black uppercase">Gestionnaire Rigoureux</p>
                         <p className="text-[8px] font-bold text-gray-400">Dette à Zéro</p>
                      </div>
                      <div className={`p-4 rounded-3xl border ${goalProgress >= 100 ? 'border-purple-200 bg-purple-50' : 'border-gray-50 opacity-40'} text-center`}>
                         <UpIcon className="mx-auto mb-2 text-purple-500" size={32} />
                         <p className="text-[10px] font-black uppercase">Dépassement Objectif</p>
                         <p className="text-[8px] font-bold text-gray-400">100% Mensuel</p>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="space-y-8">
                {/* Stock Card */}
                <div className="bg-brown-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Coffee size={120} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8">
                    <Package className="text-dmn-gold" size={18} /> Mon Stock en Main
                  </h3>
                  <div className="space-y-6 relative z-10">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-end mb-1">
                           <p className="text-[10px] font-black uppercase tracking-wider text-brown-300">Format 1KG</p>
                           <p className={`text-3xl font-black ${monS1kg < 3 ? 'text-red-400' : 'text-white'}`}>{monS1kg}</p>
                        </div>
                        <p className="text-[9px] font-bold text-white/40">Recu: {received1kg} • Vendu: {sold1kg}</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-end mb-1">
                           <p className="text-[10px] font-black uppercase tracking-wider text-brown-300">Format 500G</p>
                           <p className={`text-3xl font-black ${monS500g < 3 ? 'text-red-400' : 'text-white'}`}>{monS500g}</p>
                        </div>
                        <p className="text-[9px] font-bold text-white/40">Recu: {received500g} • Vendu: {sold500g}</p>
                     </div>
                     { (monS1kg < 3 || monS500g < 3) && (
                       <div className="mt-4 p-4 bg-red-500/20 rounded-2xl border border-red-500/30 flex items-center gap-3">
                          <AlertCircle className="text-red-400" size={18} />
                          <p className="text-[9px] font-black uppercase text-red-200">Stock faible ! Commandez via le responsable.</p>
                       </div>
                     )}
                  </div>
                </div>

                {/* Progress Card */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-6 flex items-center gap-2">
                     <TrendingUp className="text-emerald-500" size={18} /> Objectif Mensuel
                   </h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <p className="text-xs font-black text-gray-900">{formats.price(currentMonthVentes)}</p>
                         <p className="text-[10px] font-bold text-gray-400">Objectif: {formats.price(monthlyGoal)}</p>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${goalProgress}%` }}
                           className={`h-full rounded-full ${goalProgress >= 100 ? 'bg-emerald-500' : goalProgress > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                         />
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase text-center">Vous êtes à {goalProgress.toFixed(0)}% de votre objectif !</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      );
    }

    if (!isAdmin && !isCafeManager) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
              <AlertCircle className="text-gray-400" size={32} />
           </div>
           <div className="max-w-md">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-4">Accès Non Reconnu</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Votre adresse email <b>{currentUser?.email}</b> n'est pas encore liée à un compte Revendeur. 
                Veuillez contacter l'administrateur pour activer votre accès.
              </p>
              <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                 <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Instructions pour l'Admin:</p>
                 <p className="text-[10px] font-bold text-gray-500">Allez dans Logistique &gt; Revendeurs &gt; Modifier et assurez-vous que l'email {currentUser?.email} est bien renseigné.</p>
              </div>
           </div>
        </div>
      );
    }

    // Default Admin Dashboard Chart Data
    const monthlySales = Array.from({ length: 12 }, (_, i) => {
      const monthVentes = filteredVentes.filter(v => new Date(v.date).getMonth() === i);
      const monthProd = filteredProdEntries.filter(p => new Date(p.date).getMonth() === i);
      return {
        name: new Date(globalYear, i).toLocaleString('default', { month: 'short' }),
        ventes: monthVentes.reduce((s, v) => s + v.total, 0),
        production: monthProd.reduce((s, p) => s + p.total, 0)
      };
    });

    const bestSellers = sellerPerformance.slice(0, 3);

    return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Revenue Annuel', val: formats.price(totalVentes), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Dépenses Annuelles', val: formats.price(totalDepenses), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Bénéfice Théorique', val: formats.price(globalTheoretiqueBalance), icon: PieChartIcon, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Historique Global' },
            { label: 'SOLDE CAISSE RÉEL', val: formats.price(globalSoldeReal), icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-50', sub: 'Tous Versements - Dépenses' }
          ].map((kpi, i) => (
            <div key={i} className={`p-6 rounded-[2.2rem] border border-gray-100 shadow-sm ${kpi.bg} relative overflow-hidden group`}>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl bg-white shadow-sm ${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.val}</p>
                  {kpi.sub && <p className="text-[8px] font-bold text-gray-400 italic mt-0.5">{kpi.sub}</p>}
                </div>
              </div>
              <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden relative z-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  className={`h-full ${kpi.color.replace('text-', 'bg-')} opacity-40`} 
                />
              </div>
              {i === 3 && <div className="absolute -bottom-4 -right-4 text-emerald-100 opacity-20 pointer-events-none transform -rotate-12"><Wallet size={120} /></div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={18} /> Performance Annuelle
              </h3>
              <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase focus:outline-none">
                <option>{globalYear}</option>
              </select>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySales}>
                  <defs>
                    <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="ventes" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorVentes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking */}
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-8 flex items-center gap-2">
              <Trophy className="text-amber-500" size={18} /> Top Revendeurs
            </h3>
            <div className="space-y-6">
              {bestSellers.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                      {i === 0 ? <Trophy className="text-amber-500" size={24} /> : 
                       i === 1 ? <Medal className="text-gray-400" size={24} /> : 
                       <Medal className="text-orange-400" size={24} />}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center text-[10px] font-black">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => { setViewingSellerId(s.id); setActiveTab('tableau'); }}>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest hover:text-emerald-600 transition-colors">{s.nom}</p>
                    <p className="text-[10px] font-bold text-gray-400 italic">{s.cellule}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{formats.price(s.totalVal)}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.totalVol} Uts</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setActiveTab('stats')}
              className="w-full mt-8 py-3 rounded-2xl bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 outline-none"
            >
              Voir le classement complet
            </button>
          </div>
        </div>

        {/* Stock Summary */}
        <div className="bg-brown-900 rounded-[3rem] p-8 text-white flex flex-col lg:flex-row justify-between items-center gap-8 shadow-xl">
          <div className="text-center lg:text-left">
            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
               <Coffee className="text-amber-500" /> État des Stocks Central
            </h3>
            <p className="text-xs font-bold text-brown-300 mt-1 uppercase tracking-widest italic">Gestion Madjmahoune Noreyni</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full lg:w-auto">
            <div className="text-center px-4 md:border-r border-brown-800">
               <p className="text-[10px] font-black text-brown-400 uppercase tracking-widest mb-1 font-mono">DAARA 1KG</p>
               <p className={`text-2xl font-black ${stockDaara1kg < 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{stockDaara1kg}</p>
            </div>
            <div className="text-center px-4 md:border-r border-brown-800">
               <p className="text-[10px] font-black text-brown-400 uppercase tracking-widest mb-1 font-mono">DAARA 500G</p>
               <p className={`text-2xl font-black ${stockDaara500g < 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{stockDaara500g}</p>
            </div>
            <div className="text-center px-4 md:border-r border-brown-800">
               <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 font-mono">EN CIRCULATION 1KG</p>
               <p className="text-2xl font-black text-white">{stockCirculant1kg}</p>
            </div>
            <div className="text-center px-4">
               <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 font-mono">EN CIRCULATION 500G</p>
               <p className="text-2xl font-black text-white">{stockCirculant500g}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProduction = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
           <Plus className="text-blue-500" /> Enregistrer une production
        </h3>
        <form onSubmit={handleAddProduction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <select name="format" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-blue-500/10" required>
              <option value="1kg">Format 1 Kg</option>
              <option value="500g">Format 500 g</option>
           </select>
           <input 
             name="qty" 
             type="number" 
             placeholder="Quantité (Uts)" 
             className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-blue-500/10" 
             min="1" 
             onChange={(e) => setProdQty(Number(e.target.value))}
             required 
           />
           <input 
             name="cost" 
             type="number" 
             placeholder="Coût Total (F)" 
             className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-blue-500/10" 
             min="0" 
             onChange={(e) => setProdCost(Number(e.target.value))}
             required 
           />
           <button type="submit" className="bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 h-[48px]">
             <Package size={16} /> Valider Prod.
           </button>
           <div className="md:col-span-4 flex items-center justify-between px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 text-[10px] font-black uppercase text-blue-600">
             <span>Coût Unitaire Estimé:</span>
             <span className="text-sm">{formats.price(prodQty > 0 ? prodCost / prodQty : 0)}</span>
           </div>
           <textarea name="remark" placeholder="Note / Responsable..." className="md:col-span-4 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 ring-blue-500/10 h-20" />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedProductions.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center text-center sm:text-left">
             <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 mb-1">{formats.date(p.date)}</p>
                <p className="font-black text-gray-900">{p.quantite} Unités <span className="text-xs font-bold text-gray-400">({p.typeCafe})</span></p>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Par: {p.responsable || 'Inconnu'}</p>
             </div>
             <div className="flex flex-col items-end gap-2">
                <p className="font-black text-blue-600">{formats.price(p.total)}</p>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingItem(p); setEditingType('production'); }} className="p-2 text-gray-300 hover:text-amber-600 transition-colors">
                      <Edit2 size={14} />
                   </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete('cafe_productions', p.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                      <Trash2 size={14} />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {canProduce && (
        <div className="bg-gray-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp size={120} />
           </div>
           <h3 className="text-sm font-black uppercase tracking-widest mb-8 border-l-4 border-amber-500 pl-4 flex items-center gap-3">
              <Tag className="text-amber-500" /> Configuration des Prix Fixes
           </h3>
           <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const p1k = Number(fd.get('p1k'));
              const p500 = Number(fd.get('p500'));
              
              const newPrices = {
                 '1kg': { price: p1k, cost: priceConfig?.prices['1kg']?.cost || 0 },
                 '500g': { price: p500, cost: priceConfig?.prices['500g']?.cost || 0 }
              };
              handleUpdatePrices(newPrices);
           }} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Prix Format 1 Kg</label>
                 <input name="p1k" type="number" defaultValue={priceConfig?.prices['1kg']?.price || 2500} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 ring-amber-500/20" required />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Prix Format 500 g</label>
                 <input name="p500" type="number" defaultValue={priceConfig?.prices['500g']?.price || 1300} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 ring-amber-500/20" required />
              </div>
              <button type="submit" className="bg-amber-500 text-brown-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white shadow-[0_8px_16px_-6px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(245,158,11,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none h-14 mt-auto">
                 Mettre à jour les prix
              </button>
           </form>
        </div>
      )}
    </div>
  );

  const renderVentes = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
           <Plus className="text-emerald-500" /> Enregistrer une vente (Prix Fixe)
        </h3>
        <form onSubmit={handleAddVente} className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-7 gap-4">
            {!isOnlySeller ? (
              <select name="sellerId" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500/10">
                <option value="">Vente Directe (Stock Daara)</option>
                {sellers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            ) : (
              <input type="hidden" name="sellerId" value={identifiedSellerId} />
            )}
           <select name="type" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500/10">
              <option value="sur place">Sur place</option>
              <option value="commande">Commande</option>
           </select>
           <select 
             name="format" 
             value={selectedFormat}
             onChange={(e) => setSelectedFormat(e.target.value as any)}
             className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500/10" 
             required
           >
              <option value="1kg">Format 1 Kg</option>
              <option value="500g">Format 500 g</option>
           </select>
           <input 
             name="qty" 
             type="number" 
             placeholder="Quantité" 
             className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500/10" 
             min="1" 
             onChange={(e) => setSaleQty(Number(e.target.value))}
             required 
           />
           <select name="mode" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500/10" required>
              <option value="ESPÈCES">Espèces</option>
              <option value="WAVE">Wave</option>
              <option value="OM">OM</option>
           </select>
           <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-black text-gray-400 flex flex-col items-center justify-center">
             <span className="text-[8px] uppercase">Total Estimé</span>
             <span>{formats.price((priceConfig?.prices?.[selectedFormat]?.price || (selectedFormat === '1kg' ? 2500 : 1300)) * (saleQty || 0))}</span>
           </div>
           <button type="submit" className="bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-[0_8px_16px_-6px_rgba(5,150,105,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(5,150,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 h-full min-h-[48px]">
              Valider Vente
           </button>
        </form>
      </div>

      {/* Versement Form - Only for Admins/Managers (Sellers only declare, but here we prefer manager to record) */}
      {(isAdmin || isCafeManager) && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Wallet className="text-emerald-500" /> Enregistrer un Versement
          </h3>
          <form onSubmit={handleAddVersement} className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <select 
               name="sellerId" 
               className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" 
               required
               onChange={(e) => setSelectedVersementSellerId(e.target.value)}
             >
                <option value="">Sélectionner une Cellule</option>
                {sellers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
             </select>
             <input name="amount" type="number" placeholder="Montant Versé (F)" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
             <div className="flex gap-2">
               <select name="mode" className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                  <option value="ESPÈCES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="OM">OM</option>
               </select>
               <button type="submit" className="bg-emerald-600 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-[0_8px_16px_-6px_rgba(5,150,105,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(5,150,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2">
                 OK
               </button>
             </div>
             {selectedVersementSellerId && (
               <div className="md:col-span-3 px-6 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                 <span className="text-[10px] font-black text-emerald-600 uppercase">RESTE À VERSER ESTIMÉ (DETTE):</span>
                 <span className="text-sm font-black text-emerald-900">
                    {formats.price(sellerPerformance.find(s => s.id === selectedVersementSellerId)?.dette || 0)}
                 </span>
               </div>
             )}
          </form>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-center">
         <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
               <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                 <td className="px-6 py-4">Date</td>
                 <td className="px-6 py-4">Source / Vendeur</td>
                 <td className="px-6 py-4">Format</td>
                 <td className="px-6 py-4">Qté</td>
                 <td className="px-6 py-4">Total</td>
                 <td className="px-6 py-4">Actions</td>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {sortedVentes.map(v => {
                 const seller = sellers.find(s => s.id === v.vendeurId);
                 return (
                  <tr key={v.id} className="text-sm">
                    <td className="px-6 py-4 font-bold text-gray-500">{formats.date(v.date)}</td>
                    <td className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">
                      {seller ? seller.nom : 'Direct Daara'}
                    </td>
                    <td className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">{v.typeCafe}</td>
                    <td className="px-6 py-4 font-black">{v.quantite}</td>
                    <td className="px-6 py-4 font-black text-emerald-600">{formats.price(v.total)}</td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditingItem(v); setEditingType('vente'); }} className="p-1 text-gray-300 hover:text-amber-500">
                             <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete('cafe_ventes', v.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                 );
               })}
            </tbody>
         </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {sortedVentes.map(v => {
          const seller = sellers.find(s => s.id === v.vendeurId);
          return (
            <div key={v.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block mb-1">{v.typeCafe}</p>
                  <p className="text-sm font-black text-gray-900">{seller ? seller.nom : 'Direct Daara'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{formats.price(v.total)}</p>
                  <p className="text-[10px] font-bold text-gray-400">{v.quantite} uts</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-500">{formats.date(v.date)}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(v); setEditingType('vente'); }} className="p-2 text-amber-600 bg-amber-50 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete('cafe_ventes', v.id)} className="p-2 text-red-600 bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDepenses = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
           <Plus className="text-red-500" /> Nouvelle Dépense
        </h3>
        <form onSubmit={handleAddDepense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <select 
             name="type" 
             value={selectedDepenseType}
             onChange={(e) => setSelectedDepenseType(e.target.value)}
             className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-red-500/10"
           >
              <option value="matières premières">Matières premières</option>
              <option value="transport">Transport</option>
              <option value="emballage">Emballage</option>
              <option value="autres">Autres</option>
           </select>
            <AnimatePresence mode="wait">
              {selectedDepenseType === 'autres' ? (
                <motion.input 
                  key="autres-input"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  name="motif" 
                  placeholder="Précisez le motif..." 
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-red-500/10" 
                  required 
                />
              ) : (
                <motion.div 
                  key="auto-motif"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 flex items-center"
                >
                  Motif auto: {selectedDepenseType}
                </motion.div>
              )}
            </AnimatePresence>
           <input name="amount" type="number" placeholder="Montant (F)" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-red-500/10" required />
           <button type="submit" className="bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 shadow-[0_8px_16px_-6px_rgba(220,38,38,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(220,38,38,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none h-[48px]">
             Valider Dépense
           </button>
        </form>
      </div>

      <div className="space-y-3">
         {sortedDepenses.map(d => (
           <div key={d.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center transition-all">
             <div className="flex items-center gap-4">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={18} /></div>
                <div>
                   <p className="text-sm font-black text-gray-900">{d.motif}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.categorie} • {formats.date(d.date)}</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <p className="font-black text-red-600">{formats.price(d.montant)}</p>
                <div className="flex gap-1">
                   <button onClick={() => { setEditingItem(d); setEditingType('depense'); setEditingDepenseType(d.categorie || 'autres'); }} className="p-1 px-2 text-gray-300 hover:text-amber-500 border border-transparent hover:border-gray-100 rounded-lg">
                      <Edit2 size={14} />
                   </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete('cafe_depenses', d.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                      <Trash2 size={14} />
                   </button>
                </div>
             </div>
           </div>
         ))}
      </div>
    </div>
  );

  const renderHistorique = () => {
    // Merge filtered and sort for specific year/month historical view (requested by user)
    const all = [
      ...filteredProdEntries.map(p => ({ ...p, _type: 'production', _label: 'Production', _title: `Production ${p.quantite} uts (${p.typeCafe})`, _col: 'text-blue-600', _bg: 'bg-blue-50' })),
      ...filteredVentes.map(v => ({ ...v, _type: 'vente', _label: 'Vente', _title: `Vente ${v.quantite} uts (${v.typeCafe})`, _col: 'text-emerald-600', _bg: 'bg-emerald-50', total: v.total })),
      ...filteredDepenses.map(d => ({ ...d, _type: 'depense', _label: 'Dépense', _title: d.motif, _col: 'text-red-500', _bg: 'bg-red-50', total: d.montant })),
      ...filteredDistributions.map(item => ({ ...item, _type: 'distribution', _label: 'Distribution', _title: `Distribution ${item.quantite} uts`, _col: 'text-amber-600', _bg: 'bg-amber-50', total: item.total })),
      ...filteredVersements.map(item => ({ ...item, _type: 'versement', _label: 'Versement', _title: `Versement de ${formats.price(item.montant)}`, _col: 'text-emerald-600', _bg: 'bg-emerald-50', total: item.montant }))
    ].sort((a,b) => (b.date || 0) - (a.date || 0));

    const filtered = all.filter((item: any) => {
      const matchSearch = !searchHistory || item._title.toLowerCase().includes(searchHistory.toLowerCase()) || 
                          (item.responsable && item.responsable.toLowerCase().includes(searchHistory.toLowerCase()));
      const matchSeller = !isViewingSellerSpace || (item.vendeurId === effectiveViewingSellerId || item.celluleId === effectiveViewingSellerId);
      return matchSearch && matchSeller;
    }).slice(0, 100);

    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Journal de gestion complet</h3>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Chercher..." 
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none"
                onChange={(e) => setSearchHistory(e.target.value)}
              />
           </div>
        </div>
        <div className="divide-y divide-gray-50 text-center sm:text-left">
           {filtered.map((item: any) => (
             <div key={`${item._type}-${item.id}`} className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-4">
                   <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${item._bg} ${item._col}`}>
                      {item._label}
                   </div>
                   <div>
                      <p className="text-sm font-black text-gray-900">{item._title}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formats.date(item.date)} • Par: {item.responsable || 'Inconnu'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className={`text-sm font-black ${item._type === 'vente' || item._type === 'versement' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item._type === 'vente' || item._type === 'versement' ? '+' : '-'}{formats.price(item.total || item.montant)}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => { 
                      setEditingItem(item); 
                      setEditingType(item._type); 
                      if (item._type === 'depense') setEditingDepenseType(item.categorie || 'autres');
                    }} className="p-2 text-gray-400 hover:text-orange-500 transition-colors active:scale-95">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => { 
                      e.stopPropagation();
                      handleDelete({
                        'production': 'cafe_productions',
                        'vente': 'cafe_ventes',
                        'depense': 'cafe_depenses',
                        'distribution': 'cafe_distributions',
                        'versement': 'cafe_versements'
                      }[item._type as string] || '', item.id)
                    }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const handleAddVersement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canProduce) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const sellerId = fd.get('sellerId') as string;
    const mode = fd.get('mode') as ModePaiement || 'ESPÈCES';

    try {
      await addDoc(collection(db, 'cafe_versements'), {
        date: Date.now(),
        vendeurId: sellerId,
        montant: amount,
        mode,
        responsable: currentUser?.displayName || currentUser?.email || 'Manager',
        createdAt: Date.now()
      });
      showToast("Versement enregistré ✅", "success");
      (e.target as any).reset();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, 'cafe_versements');
    }
  };

  const renderLogistique = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
         <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <User className="text-amber-600" /> Gestion des Revendeurs Actifs
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellers.filter(s => s.active).map(s => (
               <div key={s.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-white rounded-xl shadow-sm text-amber-600">
                        <User size={18} />
                     </div>
                     <div className="cursor-pointer" onClick={() => { setViewingSellerId(s.id); setActiveTab('tableau'); }}>
                        <div className="flex items-center gap-2">
                           <p className="text-xs font-black text-gray-900 uppercase tracking-widest group-hover:text-emerald-600">{s.nom}</p>
                           {(!s.email && !s.telephone) ? (
                             <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md">NON LIÉ</span>
                           ) : (
                             <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md">LIÉ</span>
                           )}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 italic">{s.cellule} {s.codeAcces && `• Code: ${s.codeAcces}`}</p>
                     </div>
                  </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => { setEditingItem(s); setEditingType('seller'); }} className="p-2 text-gray-400 hover:text-amber-600 transition-all active:scale-95 outline-none">
                <Edit2 size={14} />
             </button>
             <button onClick={() => handleDelete('cafe_sellers', s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 outline-none">
                <Trash2 size={14} />
             </button>
          </div>
               </div>
            ))}
         </div>
      </div>
      {/* 🤝 GESTION DES REVENDEURS */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
           <User className="text-amber-600" /> Nouveau Revendeur (Cellule)
        </h3>
        <form onSubmit={handleAddSeller} className="grid grid-cols-1 md:grid-cols-6 gap-4">
           <input name="nom" placeholder="Prénom & Nom" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-500/10" required />
           <select name="cellule" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-500/10" required>
              <option value="ESP">ESP</option>
              <option value="CAMPUS">CAMPUS</option>
              <option value="PARCELLE">PARCELLE</option>
              <option value="AUTRES">AUTRES</option>
           </select>
           <input name="telephone" placeholder="Téléphone" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-500/10" required />
           <input name="email" type="email" placeholder="Email Connexion" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-500/10" />
           <input name="codeAcces" placeholder="Code (4 chiffres)" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-500/10" maxLength={4} />
           <button type="submit" className="bg-brown-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brown-700 shadow-[0_8px_16px_-6px_rgba(120,53,15,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(120,53,15,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none h-[48px]">
             Enregistrer
           </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Truck className="text-amber-600" /> Distribution (Manager Prod.)
          </h3>
          <form onSubmit={handleAddDistribution} className="space-y-4">
             <select name="sellerId" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                <option value="">Sélectionner une Cellule</option>
                {sellers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.nom} ({s.cellule})</option>)}
             </select>
             <div className="grid grid-cols-2 gap-4">
               <select 
                 name="format" 
                 value={selectedDistFormat}
                 onChange={(e) => setSelectedDistFormat(e.target.value as any)}
                 className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" 
                 required
               >
                  <option value="1kg">Format 1 Kg</option>
                  <option value="500g">Format 500 g</option>
               </select>
               <input 
                 name="qty" 
                 type="number" 
                 placeholder="Quantité" 
                 className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" 
                 min="1" 
                 onChange={(e) => setDistQty(Number(e.target.value))}
                 required 
               />
             </div>
             <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center px-6">
                <span className="text-[10px] font-black text-gray-400">VALEUR ESTIMÉE</span>
                <span className="text-sm font-black text-amber-600">
                    {formats.price((priceConfig?.prices?.[selectedDistFormat]?.price || (selectedDistFormat === '1kg' ? 2500 : 1300)) * (distQty || 0))}
                </span>
             </div>
             <button type="submit" className="w-full bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-700 shadow-[0_8px_16px_-6px_rgba(217,119,6,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(217,119,6,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 h-12">
               <Tag size={16} /> Effectuer Transfert
             </button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Wallet className="text-emerald-600" /> Versement (Recettes Ventes)
          </h3>
           <form onSubmit={handleAddVersement} className="space-y-4">
              <select name="sellerId" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                 <option value="">Sélectionner la Cellule</option>
                 {sellers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.nom} ({s.cellule})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                 <input name="amount" type="number" placeholder="Montant Versé (F)" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                 <select name="mode" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                    <option value="ESPÈCES">Espèces</option>
                    <option value="WAVE">Wave</option>
                    <option value="OM">OM</option>
                 </select>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-[0_8px_16px_-6px_rgba(5,150,105,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(5,150,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 h-12">
                <TrendingUp size={16} /> Valider Versement
              </button>
           </form>
        </div>
      </div>

      <div className="space-y-4">
         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Journal Logistique & Financier</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[...sortedDistributions, ...sortedVersements].sort((a,b) => (b.date || 0) - (a.date || 0)).slice(0, 10).map((item: any) => {
             const seller = sellers.find(s => s.id === (item.celluleId || item.vendeurId));
             const isVersement = !!item.montant;
             return (
               <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isVersement ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                     {isVersement ? <Wallet size={18} /> : <Truck size={18} />}
                  </div>
                  <div className="flex-1">
                     <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{seller?.nom || 'Cellule...'} ({seller?.cellule})</p>
                     <p className="text-[10px] font-bold text-gray-400">
                        {isVersement ? 'Versement' : `${item.quantite} sachets (${item.typeCafe})`}
                     </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                     <div>
                        <p className={`text-sm font-black ${isVersement ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {formats.price(item.total || item.montant)}
                        </p>
                        <p className="text-[9px] font-bold text-gray-300 uppercase">{formats.date(item.date)}</p>
                     </div>
                     <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingItem(item); setEditingType(isVersement ? 'versement' : 'distribution'); }} className="p-1 text-gray-300 hover:text-amber-500">
                           <Edit2 size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(isVersement ? 'cafe_versements' : 'cafe_distributions', item.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
               </div>
             );
           })}
         </div>
      </div>
    </div>
  );

  const renderStatsView = () => {
    // Determine data based on period
    const currentMonth = new Date().getMonth();
    const periodVentes = filteredVentes.filter(v => {
      const vDate = new Date(v.date);
      if (vDate.getFullYear() !== globalYear) return false;
      
      if (statsPeriod === 'month') return vDate.getMonth() === currentMonth;
      if (statsPeriod === 'quarter') return Math.floor(vDate.getMonth() / 3) === Math.floor(currentMonth / 3);
      return true; // Year
    });

    const totalPeriod = periodVentes.reduce((s, v) => s + v.total, 0);
    const volPeriod = periodVentes.reduce((s, v) => s + v.quantite, 0);

    const typeData = [
      { name: 'Sachet 1kg', value: periodVentes.filter(v => v.typeCafe === '1kg').reduce((s, v) => s + v.total, 0) },
      { name: 'Sachet 500g', value: periodVentes.filter(v => v.typeCafe === '500g').reduce((s, v) => s + v.total, 0) }
    ];

    const COLORS = ['#059669', '#d97706'];

    return (
      <div className="space-y-8 pb-12">
        {/* Period Selector */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Rapports Commerciaux</h3>
              <p className="text-xs font-bold text-gray-400 uppercase mt-1">Analyse avancée des performances</p>
           </div>
           <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              {(['month', 'quarter', 'year'] as const).map(p => (
                <button 
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statsPeriod === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {p === 'month' ? 'Mensuel' : p === 'quarter' ? 'Trimestriel' : 'Annuel'}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-lg">
              <TrendingUp className="text-emerald-100 mb-4" size={32} />
              <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Revenus Période</p>
              <p className="text-3xl font-black mt-1">{formats.price(totalPeriod)}</p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-emerald-100">
                <UpIcon size={14} /> +12% par rapport au précédent
              </div>
           </div>
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
              <PieChartIcon size={32} className="text-amber-500 mb-4" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Volume Vendu</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{volPeriod} <span className="text-sm font-bold text-gray-300">Unités</span></p>
              <div className="mt-6 flex gap-4">
                 <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">1 KG</p>
                    <p className="text-xs font-black">{periodVentes.filter(v => v.typeCafe === '1kg').reduce((s, v) => s + v.quantite, 0)} uts</p>
                 </div>
                 <div className="w-px h-6 bg-gray-100 my-auto" />
                 <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">500 G</p>
                    <p className="text-xs font-black">{periodVentes.filter(v => v.typeCafe === '500g').reduce((s, v) => s + v.quantite, 0)} uts</p>
                 </div>
              </div>
           </div>
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest -mt-4">Répartition par Format</p>
           </div>
        </div>

        {/* Top 10 Ranking Table */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Classement des Cellules</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Meilleures performances commerciales</p>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => exportToCSV(sellerPerformance.map(s => ({
                    Nom: s.nom,
                    Cellule: s.cellule,
                    Unites_Vendues: s.totalVol,
                    Chiffre_Affaire: s.totalVal,
                    Versements: s.versements,
                    Recette_Dette: s.dette
                  })), 'Classement_Cellules')}
                  className="p-3 rounded-2xl bg-gray-50 text-gray-900 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Download size={14} /> Excel
                </button>
                <button 
                  onClick={() => exportToPDF(sellerPerformance.map(s => ({
                    Nom: s.nom,
                    Cellule: s.cellule,
                    Ventes: s.totalVol,
                    CA: s.totalVal,
                    Versements: s.versements,
                    Dette: s.dette
                  })), 'Classement_Café_Cellules')}
                  className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Download size={14} /> PDF
                </button>
              </div>
           </div>
           <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                   <tr>
                      <td className="px-8 py-4">Rang</td>
                      <td className="px-8 py-4">Responsable / Cellule</td>
                      {(isAdmin || isCafeManager) && <td className="px-8 py-4">Code</td>}
                      <td className="px-8 py-4">Ventes (Uts)</td>
                      <td className="px-8 py-4">CA Total</td>
                      <td className="px-8 py-4">Versements</td>
                      <td className="px-8 py-4">Dette / Reste</td>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {sellerPerformance.map((s, i) => (
                     <tr 
                       key={s.id} 
                       onClick={() => {
                         if (isAdmin || isCafeManager) {
                           setViewingSellerId(s.id);
                           setActiveTab('tableau');
                         }
                       }}
                       className={`text-sm border-l-4 border-transparent hover:border-emerald-600 transition-all group ${isAdmin || isCafeManager ? 'cursor-pointer' : ''}`}
                     >
                        <td className="px-8 py-5">
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                             i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                           }`}>
                             {i + 1}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <p className="font-black text-gray-900 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{s.nom}</p>
                           <p className="text-[10px] font-bold text-emerald-600 uppercase italic">Cellule: {s.cellule}</p>
                        </td>
                        {(isAdmin || isCafeManager) && (
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-2">
                                <Tag size={12} className="text-amber-500" />
                                <span className="font-mono font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                                  {s.codeAcces || '----'}
                                </span>
                             </div>
                          </td>
                        )}
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900">{s.totalVol}</span>
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                 <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (s.totalVol / (sellerPerformance[0]?.totalVol || 1)) * 100)}%` }} 
                                 />
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5 font-black text-gray-900">{formats.price(s.totalVal)}</td>
                        <td className="px-8 py-5 text-emerald-600 font-bold">{formats.price(s.versements)}</td>
                        <td className="px-8 py-5">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black ${s.dette > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {s.dette > 0 ? formats.price(s.dette) : 'À JOUR'}
                           </span>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>

           {/* Mobile Stats Cards */}
           <div className="md:hidden space-y-4">
              {sellerPerformance.map((s, i) => (
                 <div
                   key={s.id}
                   onClick={() => {
                     if (isAdmin || isCafeManager) {
                       setViewingSellerId(s.id);
                       setActiveTab('tableau');
                     }
                   }}
                   className={`bg-gray-50 rounded-2xl p-4 border border-gray-100 relative ${isAdmin || isCafeManager ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
                 >
                    <div className={`absolute top-0 right-0 m-4 w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm ${
                      i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-gray-400 border border-gray-100'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="pr-10 mb-4">
                       <p className="font-black text-gray-900 uppercase tracking-widest">{s.nom}</p>
                       <p className="text-[10px] font-bold text-emerald-600 uppercase italic mb-2">Cellule: {s.cellule}</p>
                       {(isAdmin || isCafeManager) && (
                         <div className="inline-flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-100">
                           <Tag size={10} className="text-amber-500" />
                           <span className="font-mono font-black text-[9px] text-gray-900">{s.codeAcces || '----'}</span>
                         </div>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-left bg-white rounded-xl p-3 border border-gray-50">
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Unités (CA)</p>
                          <p className="font-black text-xs text-gray-900">{s.totalVol} <span className="text-emerald-600">({formats.price(s.totalVal)})</span></p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Versements</p>
                          <p className="font-bold text-xs text-emerald-600">{formats.price(s.versements)}</p>
                       </div>
                       <div className="col-span-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">État</p>
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black ${s.dette > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {s.dette > 0 ? `Dette: ${formats.price(s.dette)}` : 'À JOUR'}
                           </span>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderStockView = () => {
    if (isOnlySeller) {
      // Calculer précisément le stock du revendeur identifié
      const myDistributions = distributions.filter(d => d.celluleId === identifiedSellerId);
      const myVentes = ventes.filter(v => v.vendeurId === identifiedSellerId);
      
      const rec1k = myDistributions.filter(d => d.typeCafe === '1kg').reduce((s, d) => s + d.quantite, 0);
      const rec500 = myDistributions.filter(d => d.typeCafe === '500g').reduce((s, d) => s + d.quantite, 0);
      
      const sold1k = myVentes.filter(v => v.typeCafe === '1kg').reduce((s, d) => s + d.quantite, 0);
      const sold500 = myVentes.filter(v => v.typeCafe === '500g').reduce((s, d) => s + d.quantite, 0);
      
      const s1k = rec1k - sold1k;
      const s500 = rec500 - sold500;

      return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500 px-4">
           <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                 <Package size={180} />
              </div>
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-brown-50 mx-auto rounded-3xl flex items-center justify-center mb-6 border-2 border-white shadow-xl">
                   <Package className="text-brown-600" size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-2">Mon Inventaire Réel</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-4 py-1.5 rounded-full inline-block">
                  {identifiedSeller?.nom} • Cellule {identifiedSeller?.cellule}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
                   <div className="bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 group transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Sachets 1 KG</p>
                      <p className={`text-6xl font-black ${s1k < 3 ? 'text-red-500' : 'text-gray-900'}`}>{s1k}</p>
                      <div className="mt-8 flex justify-between items-center bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                         <div className="text-left">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Reçu</p>
                            <p className="text-xs font-black text-emerald-600">+{rec1k}</p>
                         </div>
                         <div className="w-px h-6 bg-gray-100" />
                         <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Vendu</p>
                            <p className="text-xs font-black text-red-500">-{sold1k}</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 group transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Sachets 500 G</p>
                      <p className={`text-6xl font-black ${s500 < 3 ? 'text-red-500' : 'text-gray-900'}`}>{s500}</p>
                      <div className="mt-8 flex justify-between items-center bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                         <div className="text-left">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Reçu</p>
                            <p className="text-xs font-black text-emerald-600">+{rec500}</p>
                         </div>
                         <div className="w-px h-6 bg-gray-100" />
                         <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Vendu</p>
                            <p className="text-xs font-black text-red-500">-{sold500}</p>
                         </div>
                      </div>
                   </div>
                </div>

                { (s1k < 3 || s500 < 3) && (
                  <div className="mt-12 p-6 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col md:flex-row items-center justify-center gap-4 group">
                     <AlertCircle className="text-red-500 animate-bounce" size={24} />
                     <div className="text-center md:text-left">
                        <p className="text-xs font-black text-red-700 uppercase tracking-widest">Alerte de Stock Faible</p>
                        <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase">Veuillez contacter l'administrateur pour une recharge rapide.</p>
                     </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      );
    }

    return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {[
           { title: 'Stock Daara 1 Kg', produced: totalProd1kg, out: totalDist1kg + directVendue1kg, stock: stockDaara1kg, color: 'bg-brown-600' },
           { title: 'Stock Daara 500 g', produced: totalProd500g, out: totalDist500g + directVendue500g, stock: stockDaara500g, color: 'bg-amber-600' }
         ].map((f, i) => (
           <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm text-center">
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg ${f.color}`}>
                 <Package size={24} />
              </div>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">{f.title}</h4>
              <p className="text-4xl font-black text-gray-900 mt-2">{f.stock}</p>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-50 pt-6">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Production</p>
                    <p className="text-xs font-black text-blue-600">+{f.produced}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Sorties</p>
                    <p className="text-xs font-black text-red-500">-{f.out}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
         <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-l-4 border-amber-500 pl-4">Détails par Cellule</h4>
         <div className="divide-y divide-gray-50">
            {sellers.filter(s => s.active).map(s => {
              const sDist1k = distributions.filter(d => d.celluleId === s.id && d.typeCafe === '1kg').reduce((sum, d) => sum + d.quantite, 0);
              const sDist500 = distributions.filter(d => d.celluleId === s.id && d.typeCafe === '500g').reduce((sum, d) => sum + d.quantite, 0);
              const sSold1k = ventes.filter(v => v.vendeurId === s.id && v.typeCafe === '1kg').reduce((sum, v) => sum + v.quantite, 0);
              const sSold500 = ventes.filter(v => v.vendeurId === s.id && v.typeCafe === '500g').reduce((sum, v) => sum + v.quantite, 0);
              
              const st1k = sDist1k - sSold1k;
              const st500 = sDist500 - sSold500;

              return (
                <div 
                  key={s.id} 
                  onClick={() => {
                    if (isAdmin || isCafeManager) {
                      setViewingSellerId(s.id);
                      setActiveTab('tableau');
                    }
                  }}
                  className={`py-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-all group ${isAdmin || isCafeManager ? 'cursor-pointer hover:bg-gray-50 px-4 rounded-2xl' : ''}`}
                >
                   <div className="flex items-center gap-3 w-full md:w-1/3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">{s.nom[0]}</div>
                      <div>
                        <p className="text-sm font-black text-gray-800 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{s.nom}</p>
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Cellule: {s.cellule} { (isAdmin || isCafeManager) && `• Code: ${s.codeAcces || '----'}` }</p>
                      </div>
                   </div>
                   <div className="flex gap-12 text-center">
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Format 1kg</p>
                         <p className={`text-sm font-black ${st1k > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{st1k} uts</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Format 500g</p>
                         <p className={`text-sm font-black ${st500 > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{st500} uts</p>
                      </div>
                   </div>
                   <div className="text-right w-full md:w-1/4 flex items-center justify-end gap-4">
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Responsable</p>
                         <p className="text-xs font-bold text-gray-600">{s.telephone || 'Non spécifié'}</p>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={(e) => { e.stopPropagation(); setEditingItem(s); setEditingType('seller'); }} className="p-3 text-gray-300 hover:text-amber-600 hover:bg-white rounded-xl transition-all">
                            <Edit2 size={16} />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleDelete('cafe_sellers', s.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
       </div>
    </div>
    );
  };

  const renderEditModal = () => {
    if (!editingItem || !editingType) return null;
    return (
       <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
          >
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-[2.5rem]">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                   <Edit2 size={16} className="text-amber-600" /> Modifier {editingType === 'seller' ? 'Revendeur' : editingType}
                </h3>
                <button onClick={() => { setEditingItem(null); setEditingType(null); }} className="p-2 hover:bg-white rounded-full transition-all">
                   <X size={20} />
                </button>
             </div>
             <form onSubmit={handleUpdateItem} className="p-8 space-y-6 overflow-y-auto">
                {editingType === 'production' && (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Format</label>
                           <select name="format" defaultValue={editingItem.typeCafe} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="1kg">1 Kg</option>
                              <option value="500g">500 g</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quantité</label>
                           <input name="qty" type="number" defaultValue={editingItem.quantite} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Coût Total</label>
                        <input name="total" type="number" defaultValue={editingItem.total} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Remarque</label>
                        <textarea name="remark" defaultValue={editingItem.remarque} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none h-24" />
                     </div>
                  </>
                )}

                {editingType === 'vente' && (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Format</label>
                           <select name="format" defaultValue={editingItem.typeCafe} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="1kg">1 Kg</option>
                              <option value="500g">500 g</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quantité</label>
                           <input name="qty" type="number" defaultValue={editingItem.quantite} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Type</label>
                           <select name="type" defaultValue={editingItem.typeVente} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="Sur place">Sur place</option>
                              <option value="Commande">Commande</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Mode</label>
                           <select name="mode" defaultValue={editingItem.mode} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="ESPÈCES">Espèces</option>
                              <option value="WAVE">Wave</option>
                              <option value="OM">OM</option>
                           </select>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Prix Unitaire</label>
                        <input name="price" type="number" defaultValue={editingItem.prixUnitaire} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                     </div>
                  </>
                )}

                {editingType === 'depense' && (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Catégorie</label>
                           <select 
                             name="type" 
                             defaultValue={editingItem.categorie} 
                             onChange={(e) => setEditingDepenseType(e.target.value)}
                             className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none"
                           >
                              <option value="matières premières">Matières premières</option>
                              <option value="transport">Transport</option>
                              <option value="emballage">Emballage</option>
                              <option value="autres">Autres</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Montant</label>
                           <input name="amount" type="number" defaultValue={editingItem.montant} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Motif</label>
                        {editingDepenseType === 'autres' ? (
                          <input name="motif" defaultValue={editingItem.motif} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        ) : (
                          <div className="w-full bg-gray-100/50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 flex items-center">
                            Motif auto: {editingDepenseType}
                          </div>
                        )}
                     </div>
                  </>
                )}

                {editingType === 'distribution' && (
                  <>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cellule</label>
                        <select name="sellerId" defaultValue={editingItem.celluleId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                           {sellers.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.cellule})</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Format</label>
                           <select name="format" defaultValue={editingItem.typeCafe} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="1kg">1 Kg</option>
                              <option value="500g">500 g</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quantité</label>
                           <input name="qty" type="number" defaultValue={editingItem.quantite} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Prix Unitaire</label>
                        <input name="price" type="number" defaultValue={editingItem.prixUnitaire} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                     </div>
                  </>
                )}

                {editingType === 'versement' && (
                  <>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cellule</label>
                        <select name="sellerId" defaultValue={editingItem.vendeurId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required>
                           {sellers.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.cellule})</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Montant Versé</label>
                           <input name="amount" type="number" defaultValue={editingItem.montant} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Mode</label>
                           <select name="mode" defaultValue={editingItem.mode} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="ESPÈCES">Espèces</option>
                              <option value="WAVE">Wave</option>
                              <option value="OM">OM</option>
                           </select>
                        </div>
                     </div>
                  </>
                )}

                {editingType === 'seller' && (
                  <>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Prénom & Nom</label>
                        <input name="nom" defaultValue={editingItem.nom} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cellule</label>
                           <select name="cellule" defaultValue={editingItem.cellule} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                              <option value="ESP">ESP</option>
                              <option value="CAMPUS">CAMPUS</option>
                              <option value="PARCELLE">PARCELLE</option>
                              <option value="AUTRES">AUTRES</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Téléphone</label>
                           <input name="telephone" defaultValue={editingItem.telephone} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Email</label>
                           <input name="email" type="email" defaultValue={editingItem.email} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Code Accès</label>
                           <input name="codeAcces" defaultValue={editingItem.codeAcces} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" maxLength={4} />
                        </div>
                     </div>
                  </>
                )}

                <div className="pt-4">
                   <button type="submit" className="w-full bg-amber-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-amber-600/20 hover:bg-amber-700 shadow-[0_8px_16px_-6px_rgba(217,119,6,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(217,119,6,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none flex items-center justify-center gap-2">
                      <Check size={18} /> Enregistrer les modifications
                   </button>
                </div>
             </form>
          </motion.div>
       </div>
    );
  };

    const availableTabs = useMemo(() => {
    const allTabs = [
      { id: 'tableau', label: isViewingSellerSpace ? 'Mon Espace' : 'Cahier', icon: isViewingSellerSpace ? User : ClipboardList },
      { id: 'production', label: 'Production', icon: Coffee },
      { id: 'logistique', label: 'Distribution', icon: Truck },
      { id: 'ventes', label: 'Ventes', icon: TrendingUp },
      { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
      { id: 'stock', label: 'Stocks', icon: BarChart3 },
      { id: 'stats', label: 'Rapports', icon: BarChart },
      { id: 'historique', label: 'Journal', icon: History }
    ];
    if (isOnlySeller) {
      return allTabs.filter(t => ['tableau', 'ventes', 'stock', 'historique'].includes(t.id));
    }
    return allTabs;
  }, [isOnlySeller, isViewingSellerSpace]);

  useEffect(() => {
    if (isOnlySeller && !['tableau', 'ventes', 'stock', 'historique'].includes(activeTab)) {
      setActiveTab('tableau');
    }
  }, [isOnlySeller, activeTab]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-10">
      {renderEditModal()}
      {/* HEADER DAARA STYLE */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 sm:space-y-1">
           <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
             <Coffee className="text-brown-600" /> Module Café
           </h2>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-1 ml-1">Gestion Madjmahoune Noreyni</p>
        </div>
        <div className="w-full md:w-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="flex bg-gray-50/80 p-1.5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-x-auto no-scrollbar border border-gray-100/50 shadow-inner snap-x snap-mandatory">
             {availableTabs.map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`snap-center shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-[1.25rem] sm:rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-white text-gray-900 shadow-md border border-gray-100 scale-100 sm:scale-105 relative z-10' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'
                  }`}
                >
                  <tab.icon size={16} className={`transition-all duration-300 ${activeTab === tab.id ? 'text-brown-600' : ''}`} />
                  <span>{tab.label}</span>
                </motion.button>
              ))}
          </div>
        </div>
      </div>

      {/* ACTIONS RAPIDES MOBILE */}
      <div className="md:hidden">
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 snap-x snap-mandatory">
          {canProduce && (
            <button onClick={() => setActiveTab('production')} className="snap-center shrink-0 w-[120px] bg-blue-50 text-blue-700 border border-blue-100 p-4 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all outline-none">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Production</span>
            </button>
          )}
          {canSell && (
            <button onClick={() => setActiveTab('ventes')} className="snap-center shrink-0 w-[120px] bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all outline-none">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Vente</span>
            </button>
          )}
          {canExpense && (
            <button onClick={() => setActiveTab('depenses')} className="snap-center shrink-0 w-[120px] bg-red-50 text-red-700 border border-red-100 p-4 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all outline-none">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">Dépense</span>
            </button>
          )}
          <button onClick={() => setActiveTab('logistique')} className="snap-center shrink-0 w-[120px] bg-purple-50 text-purple-700 border border-purple-100 p-4 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all outline-none">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Distribution</span>
          </button>
          <button onClick={() => setActiveTab('stock')} className="snap-center shrink-0 w-[120px] bg-amber-50 text-amber-700 border border-amber-100 p-4 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all outline-none">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Stock</span>
          </button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
        >
           {activeTab === 'tableau' && renderDashboard()}
           {activeTab === 'production' && renderProduction()}
           {activeTab === 'logistique' && renderLogistique()}
           {activeTab === 'ventes' && renderVentes()}
           {activeTab === 'depenses' && renderDepenses()}
           {activeTab === 'stock' && renderStockView()}
           {activeTab === 'stats' && renderStatsView()}
           {activeTab === 'historique' && renderHistorique()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
