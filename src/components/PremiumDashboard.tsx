import React, { useMemo } from 'react';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution, CafeProduction, CafeVente, CafeDepense, UserRole } from '../types';
import { MOIS } from '../data';
import { 
  Building2, TrendingUp, TrendingDown, Users, AlertCircle, 
  Ticket, Wallet, ArrowUpRight, ArrowDownRight, Package, Calendar, Activity, Edit2, Coffee, ArrowRight, ChevronRight, LayoutGrid, Zap, BarChart3, Shield
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAdaptive } from '../hooks/useAdaptive';
import { hasPermission } from '../utils/permissions';

interface PremiumDashboardProps {
  membres: Membre[];
  cotisations: Cotisation[];
  depenses: Depense[];
  recettes: Recette[];
  dettes: Dette[];
  ticketCollectes: TicketCollecte[];
  ticketConversions: TicketConversion[];
  ticketDistributions: TicketDistribution[];
  cafeProductions: CafeProduction[];
  cafeVentes: CafeVente[];
  cafeDepenses: CafeDepense[];
  globalYear: number;
  globalMonth: string;
  globalMode: string;
  logoUrl?: string;
  userRole?: UserRole | 'visitor' | null;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuickAction?: (action: 'membre' | 'ticket' | 'cafe' | 'rapport') => void;
}

const formatPrice = (p: number) => p.toLocaleString('fr-FR');

export function PremiumDashboard({
  membres, cotisations, depenses, recettes, dettes,
  ticketCollectes, ticketConversions, ticketDistributions,
  cafeProductions, cafeVentes, cafeDepenses,
  globalYear, globalMonth, logoUrl, userRole, onLogoUpload,
  onQuickAction
}: PremiumDashboardProps) {

  const { isMobile, isLowEndDevice, performance } = useAdaptive();

  // --- LOGIC CALCULATIONS (Keep from original) ---
  const formattedRole = userRole === 'visitor' ? null : userRole;
  const isCaisse = hasPermission(formattedRole, 'caisse.read');
  const isCafe = hasPermission(formattedRole, 'cafe.production.read');
  const isTickets = hasPermission(formattedRole, 'tickets.read');
  const isStats = hasPermission(formattedRole, 'stats.read');

  const filteredCafeVentes = useMemo(() => cafeVentes.filter(v => new Date(v.date).getFullYear() === globalYear), [cafeVentes, globalYear]);

  const totCafeRevenus = filteredCafeVentes.reduce((s, v) => s + v.total, 0);
  const totCafeQtySold = filteredCafeVentes.reduce((s, v) => s + v.quantite, 0);
  const totCafeQtyProd = cafeProductions.reduce((s, p) => s + p.quantite, 0);
  const cafeStock = totCafeQtyProd - cafeVentes.reduce((s, v) => s + v.quantite, 0);

  const filteredCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear && (!globalMonth || c.mois === globalMonth)), [cotisations, globalYear, globalMonth]);
  const filteredDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear && (!globalMonth || d.mois === globalMonth)), [depenses, globalYear, globalMonth]);
  const filteredRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear && (!globalMonth || r.mois === globalMonth)), [recettes, globalYear, globalMonth]);
  const filteredDettes = useMemo(() => dettes.filter(d => d.annee === globalYear && (!globalMonth || d.mois === globalMonth)), [dettes, globalYear, globalMonth]);
  
  const totCotisations = filteredCotisations.reduce((s, c) => s + c.montant, 0);
  const totRecettes = filteredRecettes.reduce((s, r) => s + r.montant, 0);
  const totDettesEnAttente = filteredDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);

  const totEntrees = totCotisations + totRecettes + totDettesEnAttente;
  const totDepenses = filteredDepenses.reduce((s, d) => s + d.montant, 0);

  const globalTotCotisations = useMemo(() => cotisations.reduce((s, c) => s + c.montant, 0), [cotisations]);
  const globalTotRecettes = useMemo(() => recettes.reduce((s, r) => s + r.montant, 0), [recettes]);
  
  const globalTotIncome = useMemo(() => {
    const base = globalTotCotisations + globalTotRecettes;
    const unpaid = dettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    return base + unpaid;
  }, [globalTotCotisations, globalTotRecettes, dettes]);

  const globalTotExpenses = useMemo(() => depenses.reduce((s, d) => s + d.montant, 0), [depenses]);
  const soldeGlobal = globalTotIncome - globalTotExpenses;

  const annualCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear), [cotisations, globalYear]);
  const annualDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear), [depenses, globalYear]);
  const annualRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear), [recettes, globalYear]);

  const pdGeneres = ticketConversions.reduce((s, c) => s + (c.petitDej || 0), 0);
  const pdCollectes = ticketCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.petitDej || 0), 0);
  const pdDistribues = ticketDistributions.reduce((s, d) => s + (d.petitDej || 0), 0);
  const stockPD = pdGeneres + pdCollectes - pdDistribues;

  const repasGeneres = ticketConversions.reduce((s, c) => s + (c.repas || 0), 0);
  const repasCollectes = ticketCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.repas || 0), 0);
  const repasDistribues = ticketDistributions.reduce((s, d) => s + (d.repas || 0), 0);
  const stockRepas = repasGeneres + repasCollectes - repasDistribues;

  const currentMonthIndex = MOIS.indexOf(globalMonth || MOIS[new Date().getMonth()]);
  const getMembreStatus = (mId: string) => {
    const membre = membres.find(m => m.id === mId);
    let startMonthIndex = 0;
    if (membre && membre.anneeIntegration && membre.moisIntegration) {
      if (membre.anneeIntegration > globalYear) return "Non membre";
      if (membre.anneeIntegration === globalYear) {
        startMonthIndex = MOIS.indexOf(membre.moisIntegration);
      }
    }
    let isEnRetard = false;
    for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
        const month = MOIS[i];
        if (!cotisations.some(c => c.mId === mId && c.mois === month && c.annee === globalYear && c.montant > 0)) {
            isEnRetard = true;
            break;
        }
    }
    return isEnRetard ? 'En retard' : 'À jour';
  };

  const membresActifs = membres.filter(m => getMembreStatus(m.id) === 'À jour').length;

  const evolutionSoldeData = MOIS.map(m => {
    const moisCot = annualCotisations.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0);
    const moisRec = annualRecettes.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0);
    const moisDep = annualDepenses.filter(c => c.mois === m).reduce((s, d) => s + d.montant, 0);
    return { name: m.substring(0, 3), Entrées: moisCot + moisRec, Dépenses: moisDep, Solde: moisCot + moisRec - moisDep };
  });

  const historyItems = [];
  if (isCaisse) {
    historyItems.push(...cotisations.map(c => ({ date: c.createdAt || 0, label: `Cotisation de ${membres.find(m => m.id === c.mId)?.prenom} ${membres.find(m => m.id === c.mId)?.nom}`, amount: c.montant, type: 'in', icon: Wallet })));
    historyItems.push(...depenses.map(d => ({ date: d.createdAt || d.updatedAt || 0, label: `Dépense : ${d.evenement}`, amount: d.montant, type: 'out', icon: ArrowDownRight })));
    historyItems.push(...recettes.map(r => ({ date: r.createdAt || r.updatedAt || 0, label: `Recette : ${r.motif}`, amount: r.montant, type: 'in', icon: ArrowUpRight })));
  }
  if (isTickets) {
    historyItems.push(...ticketDistributions.map(d => ({ date: d.createdAt || 0, label: `Tickets à ${membres.find(m => m.id === d.mId)?.prenom} ${membres.find(m => m.id === d.mId)?.nom}`, amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, type: 'ticket', icon: Ticket })));
  }
  if (isCafe) {
    historyItems.push(...cafeVentes.map(v => ({ date: v.createdAt || v.date, label: `Vente Café (${v.quantite})`, amount: v.total, type: 'cafe', icon: Coffee })));
  }

  const history = historyItems.sort((a, b) => b.date - a.date);

  const recentHistory = history.slice(0, 6);

  const today = new Date().setHours(0,0,0,0);
  const todayTransactions = history.filter(h => new Date(h.date).setHours(0,0,0,0) === today);
  const todayIn = todayTransactions.filter(t => t.type === 'in' || t.type === 'cafe').reduce((s, t) => s + t.amount, 0);
  const todayOut = todayTransactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-4xl mx-auto space-y-8 pb-32 pt-4 sm:pt-10"
    >
      {/* 💳 MAIN WALLET CARD */}
      {(isCaisse || isStats) && (
      <motion.div variants={itemVariants} className="px-5 sm:px-0">
        <div className="relative h-64 w-full bg-dmn-green-900 rounded-[3rem] p-8 shadow-2xl overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.98] duration-500 cursor-pointer group">
          {/* Background Gradient Overlays */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-dmn-green-500/20 rounded-full blur-[110px] -mr-40 -mt-40 transition-transform group-hover:scale-125 duration-700"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-dmn-gold/30 rounded-full blur-[90px] -ml-20 -mb-20 transition-transform group-hover:scale-125 duration-700"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-dmn-green-300 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Solde Disponible</p>
                  <div className="w-1.5 h-1.5 bg-dmn-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {formatPrice(soldeGlobal)}
                  </h2>
                  <span className="text-lg font-bold text-dmn-green-400 group-hover:translate-x-1 transition-transform">FCFA</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={22} className="text-dmn-gold-light" />
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-10">
              <div className="space-y-1">
                <p className="text-dmn-green-400/60 text-[9px] font-black uppercase tracking-widest">Entrées Globales</p>
                <div className="flex items-center gap-1.5">
                   <ArrowUpRight size={12} className="text-dmn-green-400" />
                   <p className="text-white font-black text-sm">{formatPrice(totEntrees)} F</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="space-y-1">
                <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Dépenses Globales</p>
                <div className="flex items-center gap-1.5">
                   <ArrowDownRight size={12} className="text-red-400" />
                   <p className="text-white font-black text-sm">{formatPrice(totDepenses)} F</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-white/40">
              <div className="flex gap-4">
                 <p className="text-[10px] font-mono tracking-[0.3em] uppercase">**** {globalYear}</p>
                 <Shield size={16} className="opacity-30" />
              </div>
              <Building2 size={24} className="opacity-50" />
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* ⚡ QUICK ACTIONS & DAILY STATUS */}
      <motion.div variants={itemVariants} className="px-5 sm:px-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Summary */}
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-600">
                 <Zap size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aujourd'hui</p>
                 <div className="flex items-center gap-2">
                    <span className="text-green-600 font-black">+{formatPrice(todayIn)}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-red-500 font-black">-{formatPrice(todayOut)}</span>
                 </div>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-widest bg-dmn-green-50 px-2 py-0.5 rounded-md inline-block mb-1">Live</p>
              <p className="text-[9px] font-bold text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</p>
           </div>
        </div>

        {/* Quick Access Menu */}
        <div className="bg-gray-900 rounded-[2rem] p-3 flex items-center justify-around overflow-hidden relative shadow-xl shadow-dmn-green-950/20">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
           {(!userRole || ['admin', 'caisse'].includes(userRole)) && (
           <button onClick={() => onQuickAction?.('membre')} className="flex flex-col items-center gap-1 group active:scale-90 transition-all">
             <div className="p-2.5 bg-white/10 rounded-xl text-white group-hover:bg-dmn-green-500 group-hover:text-gray-900 transition-all">
                <Users size={18} />
             </div>
             <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Membre</span>
           </button>
           )}
           {(!userRole || ['admin', 'tickets'].includes(userRole)) && (
           <button onClick={() => onQuickAction?.('ticket')} className="flex flex-col items-center gap-1 group active:scale-90 transition-all">
             <div className="p-2.5 bg-white/10 rounded-xl text-white group-hover:bg-amber-500 group-hover:text-gray-900 transition-all">
                <Ticket size={18} />
             </div>
             <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Tickets</span>
           </button>
           )}
           {(!userRole || ['admin', 'cafe'].includes(userRole)) && (
           <button onClick={() => onQuickAction?.('cafe')} className="flex flex-col items-center gap-1 group active:scale-90 transition-all">
             <div className="p-2.5 bg-white/10 rounded-xl text-white group-hover:bg-orange-500 group-hover:text-gray-900 transition-all">
                <Coffee size={18} />
             </div>
             <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Café</span>
           </button>
           )}
           {(!userRole || ['admin', 'caisse'].includes(userRole)) && (
           <button onClick={() => onQuickAction?.('rapport')} className="flex flex-col items-center gap-1 group active:scale-90 transition-all">
             <div className="p-2.5 bg-white/10 rounded-xl text-white group-hover:bg-blue-500 group-hover:text-gray-900 transition-all">
                <BarChart3 size={18} />
             </div>
             <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Rapport</span>
           </button>
           )}
        </div>
      </motion.div>

      {/* 📲 HORIZONTAL MODULE SCROLL */}
      <motion.section variants={itemVariants} className="space-y-5">
        <div className="px-7 flex justify-between items-center">
          <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.25em]">Services Actifs</h3>
          <div className="flex items-center gap-1 text-[10px] font-bold text-dmn-green-600 bg-dmn-green-50 px-3 py-1 rounded-full uppercase tracking-widest">
             Live <div className="w-1.5 h-1.5 bg-dmn-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-4 sm:gap-5 overflow-x-auto px-6 no-scrollbar pb-2 sm:pb-3">
          {/* Caisse Module Card */}
          {(!userRole || ['admin', 'caisse'].includes(userRole)) && (
          <div className="min-w-[140px] sm:min-w-[170px] bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 sm:gap-6 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-dmn-green-600/5 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-dmn-green-50 text-dmn-green-600 flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm text-xs sm:text-base">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Caisse</p>
              <p className="font-black text-lg sm:text-xl text-gray-900 group-hover:text-dmn-green-600 transition-colors uppercase">{formatPrice(totCotisations)} F</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-dmn-green-50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
          </div>
          )}

          {/* Tickets Module Card */}
          {(!userRole || ['admin', 'tickets'].includes(userRole)) && (
          <div className="min-w-[140px] sm:min-w-[170px] bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 sm:gap-6 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-amber-600/5 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-all group-hover:scale-110 group-hover:-rotate-3 shadow-sm text-xs sm:text-base">
              <Ticket size={18} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tickets en Stock</p>
              <div className="flex items-baseline gap-1">
                <p className="font-black text-lg sm:text-xl text-gray-900 group-hover:text-amber-600 transition-colors uppercase">{stockPD + stockRepas}</p>
                <span className="text-[9px] font-black text-gray-300">UTS</span>
              </div>
              <div className="w-full h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, ((stockPD + stockRepas) / 100) * 100)}%` }}></div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-amber-50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
          </div>
          )}

          {/* Café Module Card */}
          {(!userRole || ['admin', 'cafe'].includes(userRole)) && (
          <div className="min-w-[140px] sm:min-w-[170px] bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 sm:gap-6 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-orange-800/5 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#f5ebe0] text-[#78350f] flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm text-xs sm:text-base">
              <Coffee size={18} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Stock Café</p>
              <div className="flex items-baseline gap-1">
                <p className="font-black text-lg sm:text-xl text-gray-900 group-hover:text-[#78350f] transition-colors uppercase">{cafeStock}</p>
                <span className="text-[9px] font-black text-gray-300">UTS</span>
              </div>
              <div className="w-full h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#78350f] rounded-full" style={{ width: `${Math.min(100, (cafeStock / 500) * 100)}%` }}></div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#fdfaf6] rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
          </div>
          )}

          {/* Stats Module Card */}
          {(!userRole || ['admin', 'caisse'].includes(userRole)) && (
          <div className="min-w-[140px] sm:min-w-[170px] bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 sm:gap-6 relative overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-blue-600/5 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-all group-hover:scale-110 group-hover:-rotate-3 shadow-sm text-xs sm:text-base">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Membres</p>
              <p className="font-black text-lg sm:text-xl text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{membresActifs} actifs</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
          </div>
          )}
        </div>
      </motion.section>

      {/* 📊 ANALYTICS PREVIEW (Adaptive) */}
      {(isCaisse || isStats) && (
      <motion.div variants={itemVariants} className="px-4">
        <div className="premium-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Activity size={16} className="text-dmn-green-500" /> Analystiques
            </h3>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
              {performance === 'low' ? 'Simplifié (Eco)' : 'Détaillé (HD)'}
            </div>
          </div>
          <div className="h-40 w-full">
            {isLowEndDevice ? (
              <div className="h-full flex items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 italic text-[10px] text-gray-400 font-bold px-10 text-center">
                Affichage optimisé pour votre appareil
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionSoldeData}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                      padding: '12px 16px',
                      fontSize: '10px',
                      fontWeight: '900'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Entrées" 
                    stroke="#22C55E" 
                    fillOpacity={1} 
                    fill="url(#colorArea)" 
                    strokeWidth={3} 
                    animationDuration={performance === 'high' ? 2000 : 0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>
      )}

      {/* 📋 RECENT TRANSACTIONS */}
      <motion.section variants={itemVariants} className="px-5 sm:px-0 space-y-5">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.25em]">Historique récent</h3>
          <button className="text-[10px] font-black text-dmn-green-600 bg-dmn-green-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-dmn-green-100 transition-colors">Tout voir</button>
        </div>
        <div className="space-y-4">
          {recentHistory.map((h, i) => (
            <motion.div 
              key={i}
              whileTap={{ scale: 0.985 }}
              className="bg-white p-5 rounded-[2.5rem] flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-gray-200/40 border border-gray-100"
            >
              <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                  h.type === 'in' ? 'bg-green-50 text-green-600' :
                  h.type === 'out' ? 'bg-red-50 text-red-600' :
                  'bg-orange-50 text-orange-500'
                }`}>
                  <h.icon size={20} className={`sm:hidden ${h.type === 'in' ? 'animate-bounce-slow' : ''}`} />
                  <h.icon size={24} className={`hidden sm:block ${h.type === 'in' ? 'animate-bounce-slow' : ''}`} />
                </div>
                <div className="min-w-0 pr-2">
                  <p className="text-[13px] sm:text-base font-black text-gray-900 truncate group-hover:text-dmn-green-700 transition-colors leading-tight">
                    {h.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '---'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm sm:text-base font-black ${
                  h.type === 'in' ? 'text-dmn-green-600' :
                  h.type === 'out' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {h.type === 'in' ? '+' : '-'}{formatPrice(h.amount)}
                </p>
                <div className="w-16 h-1.5 bg-gray-50 rounded-full mt-3 overflow-hidden ml-auto">
                  <div className={`h-full rounded-full transition-all duration-700 delay-300 ${
                    h.type === 'in' ? 'bg-green-500' : 'bg-red-400'
                  }`} style={{ width: '100%' }}></div>
                </div>
              </div>
            </motion.div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-10 text-gray-400 font-medium">Aucun mouvement récent</div>
          )}
        </div>
      </motion.section>

      {/* 🧭 PREMIUM INFOS */}
      <motion.div variants={itemVariants} className="px-4">
        {userRole === 'lecteur' && (
          <div className="bg-amber-50 rounded-[2.5rem] p-8 mt-8 border border-amber-100 flex flex-col items-center text-center space-y-4 shadow-sm mb-8">
            <Shield size={40} className="text-amber-500 mb-2" />
            <h3 className="text-xl font-black text-amber-900">Espace Membre</h3>
            <p className="text-sm font-medium text-amber-800/80 max-w-sm">
              Votre compte est en cours de configuration. Pour voir vos propres cotisations et tickets, veuillez vous rapprocher d'un administrateur pour lier votre compte à votre profil de membre sur l'application.
            </p>
          </div>
        )}
        <div className="bg-dmn-green-900/5 rounded-[2.5rem] p-8 border border-dmn-green-100 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-1 bg-dmn-green-600/20 rounded-full"></div>
          <p className="text-sm font-black text-dmn-green-900">“Le travail est une adoration”</p>
          <p className="text-[10px] font-bold text-dmn-green-600 uppercase tracking-[0.2em]">Daara Madjmahoune Noreyni</p>
        </div>
      </motion.div>

    </motion.div>
  );
}
