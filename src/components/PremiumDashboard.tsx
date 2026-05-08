import React, { useMemo } from 'react';
import { 
  Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution, CafeProduction, CafeVente, 
  CafeDepense, UserRole, CafeSeller, CafeClient, CafeOrder 
} from '../types';
import { MOIS } from '../data';
import { 
  Building2, TrendingUp, TrendingDown, Users, AlertCircle, 
  Ticket, Wallet, ArrowUpRight, ArrowDownRight, Package, Calendar, Activity, Edit2, Coffee, ArrowRight, ChevronRight, LayoutGrid, Zap, BarChart3, Shield, Star, MessageCircle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAdaptive } from '../hooks/useAdaptive';
import { hasPermission } from '../utils/permissions';
import { simpleDate, relativeDate } from '../utils/date';

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
  cafeSellers?: CafeSeller[];
  cafeClients?: CafeClient[];
  globalYear: number;
  globalMonth: string;
  globalMode: string;
  logoUrl?: string;
  userRole?: UserRole | 'visitor' | null;
  currentUser?: any;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuickAction?: (action: 'membre' | 'ticket' | 'cafe' | 'rapport') => void;
}

const formatPrice = (p: number) => {
  if (p === undefined || p === null) return "0";
  return p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

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

export function PremiumDashboard({
  membres, cotisations, depenses, recettes, dettes,
  ticketCollectes, ticketConversions, ticketDistributions,
  cafeProductions, cafeVentes, cafeDepenses,
  cafeSellers = [], cafeClients = [],
  globalYear, globalMonth, logoUrl, userRole, currentUser, onLogoUpload,
  onQuickAction
}: PremiumDashboardProps) {

  const { isMobile, isLowEndDevice, performance } = useAdaptive();

  // --- TOP SELLERS & CLIENTS ---
  const commercialInsights = useMemo(() => {
    const topSellers = cafeSellers.map(s => {
      const sales = cafeVentes.filter(v => v.vendeurId === s.id);
      return { ...s, total: sales.reduce((sum, v) => sum + v.total, 0), count: sales.length };
    }).sort((a,b) => b.total - a.total).slice(0, 3);

    const clientActivity = cafeVentes.reduce((acc: any, v) => {
       const client = cafeClients.find(c => c.id === v.clientId);
       const nom = client?.nom || 'Anonyme';
       acc[nom] = (acc[nom] || 0) + v.total;
       return acc;
    }, {});
    
    const topClients = Object.entries(clientActivity)
      .map(([nom, total]) => ({ nom, total: total as number }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 3);

    return { topSellers, topClients };
  }, [cafeSellers, cafeVentes]);

  // --- LOGIC CALCULATIONS ---
  const formattedRole = userRole === 'visitor' ? null : userRole;
  const isAdmin = userRole === 'admin';
  const isCaisse = userRole === 'caisse' || hasPermission(formattedRole, 'caisse.read');
  const isCafe = userRole === 'cafe' || hasPermission(formattedRole, 'cafe.production.read');
  const isTickets = userRole === 'tickets' || hasPermission(formattedRole, 'tickets.read');
  const isRevendeur = !isAdmin && !isCafe && Boolean(cafeSellers.some(s => s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()));
  const isMembreSimple = !isAdmin && !isCaisse && !isCafe && !isTickets && !isRevendeur && Boolean(currentUser?.email);
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
    return globalTotCotisations + globalTotRecettes;
  }, [globalTotCotisations, globalTotRecettes]);

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

  const generatePaymentMessage = () => {
    const paidMembers = membres.filter(m => getMembreStatus(m.id) === 'À jour');
    const totalMembers = membres.length;
    const percentage = Math.round((paidMembers.length / totalMembers) * 100);
    
    let message = `Mensualité mois de ${globalMonth || MOIS[new Date().getMonth()]} ${globalYear} `;
    paidMembers.forEach((m, index) => {
        message += `${index + 1}- ${m.prenom.toUpperCase()} ${m.nom.toUpperCase()}  `;
    });
    message += `Total : ${paidMembers.length} membres sur ${totalMembers} (${percentage}%) Daara Madjmahoune Noreyni UCAD - Commission Sociale Cellule ESP.`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(message);
    alert('Message copié dans le presse-papier !');
  };

  const membresActifs = membres.filter(m => getMembreStatus(m.id) === 'À jour').length;

  const myMembre = useMemo(() => membres.find(m => m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase()), [membres, currentUser]);
  const mySeller = useMemo(() => cafeSellers.find(s => s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()), [cafeSellers, currentUser]);
  const sellerQtySold = mySeller ? cafeVentes.filter(v => v.vendeurId === mySeller.id).reduce((s, v) => s + v.quantite, 0) : 0;
  const sellerRevenue = mySeller ? cafeVentes.filter(v => v.vendeurId === mySeller.id).reduce((s, v) => s + v.total, 0) : 0;
  const sellerStock = mySeller ? (mySeller.stockActuel || 0) : 0;

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

  // Personal history for regular members
  if (isMembreSimple && currentUser?.email) {
    if (myMembre) {
      historyItems.push(...cotisations.filter(c => c.mId === myMembre.id).map(c => ({ date: c.createdAt || 0, label: `Ma cotisation (${c.mois} ${c.annee})`, amount: c.montant, type: 'in', icon: Wallet })));
      historyItems.push(...ticketDistributions.filter(d => d.mId === myMembre.id).map(d => ({ date: d.createdAt || 0, label: `Mes tickets (${d.petitDej || 0} PD, ${d.repas || 0} R)`, amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, type: 'ticket', icon: Ticket })));
    }
  }
  
  if (isRevendeur && mySeller) {
    historyItems.push(...cafeVentes.filter(v => v.vendeurId === mySeller.id).map(v => ({ date: v.createdAt || v.date, label: `Mes ventes CAFE (${v.quantite})`, amount: v.total, type: 'cafe', icon: Coffee })));
  }

  const history = historyItems.sort((a, b) => b.date - a.date);
  const recentHistory = history.slice(0, 8);

  const today = new Date().setHours(0,0,0,0);
  const todayTransactions = history.filter(h => new Date(h.date).setHours(0,0,0,0) === today);
  const todayIn = todayTransactions.filter(t => t.type === 'in' || t.type === 'cafe').reduce((s, t) => s + t.amount, 0);
  const todayOut = todayTransactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

  // --- Smart Insights ---
  const smartInsights = useMemo(() => {
    const insights = [];
    if (soldeGlobal < 50000) insights.push({ text: "Solde faible. Surveillez les prochaines cotisations.", icon: AlertCircle, color: "text-amber-600" });
    if (totDettesEnAttente > 100000) insights.push({ text: "Volume important de dettes non payées.", icon: TrendingUp, color: "text-red-500" });
    if (membresActifs / membres.length < 0.6) insights.push({ text: "Taux de régularité des membres en baisse.", icon: Users, color: "text-orange-500" });
    return insights.slice(0, 2);
  }, [soldeGlobal, totDettesEnAttente, membresActifs, membres.length]);

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-10 pb-32 pt-4 sm:pt-12 px-2 sm:px-6"
    >
      {/* WELCOME & LOGO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-dmn-green-500/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[1.5rem] sm:rounded-[2rem] p-1 sm:p-1.5 shadow-soft border border-gray-100/80 overflow-hidden relative z-10 transition-transform group-hover:scale-105 duration-500">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-[1.2rem] sm:rounded-[1.5rem]" />
              ) : (
                <div className="w-full h-full bg-dmn-green-50 flex items-center justify-center text-dmn-green-700">
                  <Building2 size={32} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-3xl lg:text-4xl fintech-heading leading-tight max-w-[250px] sm:max-w-none">Daara Madjmahoune Noreyni UCAD</h1>
            <p className="text-[9px] sm:text-[11px] font-black text-dmn-green-600 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-1 sm:mt-2 flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-dmn-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Système de Gestion DMN
            </p>
          </div>
          <button 
              onClick={generatePaymentMessage}
              className="bg-dmn-green-600 hover:bg-dmn-green-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2"
          >
              <MessageCircle size={14} /> Partager Message
          </button>
        </div>
        
        {smartInsights.length > 0 && (
          <div className="hidden sm:flex flex-col gap-2">
            {smartInsights.map((insight, idx) => (
              <div key={idx} className="bg-white/50 backdrop-blur-sm border border-gray-100 py-2.5 px-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-500 shadow-sm">
                <insight.icon size={16} className={insight.color} />
                <p className="text-[10px] font-bold text-gray-600 leading-none">{insight.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN WALLET CARD */}
      {(isCaisse || isStats) && (
      <motion.div variants={itemVariants} className="relative group px-2 sm:px-0">
        <div className="absolute inset-x-0 -bottom-6 h-12 bg-dmn-green-900/10 blur-3xl rounded-full scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative h-64 sm:h-80 w-full bg-dmn-green-900 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 shadow-2xl shadow-dmn-green-900/30 overflow-hidden transition-all duration-700 group-hover:translate-y-[-4px]">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-dmn-green-500/20 rounded-full blur-[80px] sm:blur-[120px] -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 transition-transform group-hover:scale-110 duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 sm:w-60 h-60 bg-dmn-gold/20 rounded-full blur-[60px] sm:blur-[100px] -ml-20 -mb-20 sm:-ml-30 sm:-mb-30 transition-transform group-hover:scale-110 duration-1000"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-2 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-white/40 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Solde Trésorerie Centrale</p>
                  <Shield size={12} className="text-white/20 sm:block hidden" />
                </div>
                <div className="flex items-baseline gap-2 sm:gap-4">
                  <span className="text-xl sm:text-3xl font-heading font-black text-dmn-gold opacity-80 tracking-tighter">FCFA</span>
                  <h2 className="text-4xl sm:text-7xl lg:text-8xl fintech-kpi text-white drop-shadow-2xl">
                    {formatPrice(soldeGlobal)}
                  </h2>
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-lg ring-1 ring-white/20 hover:scale-110 transition-transform cursor-help">
                <LayoutGrid size={20} className="text-dmn-gold-light sm:block hidden" />
                <Zap size={20} className="text-dmn-gold-light sm:hidden" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-16 max-w-sm">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-dmn-green-400/60 text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 line-clamp-1">
                  <TrendingUp size={10} /> Entrées
                </p>
                <p className="text-lg sm:text-2xl font-black text-white">{formatPrice(totEntrees)} <span className="text-[10px] text-white/40">F</span></p>
                <div className="w-8 sm:w-12 h-1 bg-dmn-green-500/30 rounded-full overflow-hidden">
                   <div className="h-full bg-dmn-green-400 w-2/3 shimmer"></div>
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <p className="text-red-400/60 text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 line-clamp-1">
                  <TrendingDown size={10} /> Sorties
                </p>
                <p className="text-lg sm:text-2xl font-black text-white">{formatPrice(totDepenses)} <span className="text-[10px] text-white/40">F</span></p>
                <div className="w-8 sm:w-12 h-1 bg-red-500/30 rounded-full overflow-hidden">
                   <div className="h-full bg-red-400 w-1/3"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-4 sm:pt-6">
              <p className="text-[8px] sm:text-[11px] font-mono tracking-[0.2em] sm:tracking-[0.4em] text-white/30 uppercase line-clamp-1">VALID UNTIL {globalYear + 1}</p>
              <div className="flex items-center gap-1 scale-75 sm:scale-100">
                 <div className="w-8 h-5 bg-white/10 rounded-md"></div>
                 <div className="w-8 h-5 bg-white/5 rounded-md"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-1">
        {[
          { show: isAdmin || isCaisse || isStats, label: 'Cotis. Annuelles', value: formatPrice(annualCotisations.reduce((s, c) => s + c.montant, 0)) + ' F', color: 'text-dmn-gold', bg: 'bg-amber-50', icon: Wallet, sub: `${globalYear}` },
          { show: isAdmin || isCaisse || isStats, label: 'Membres Actifs', value: membresActifs, color: 'text-dmn-green-600', bg: 'bg-dmn-green-50', icon: Users, sub: `${membres.length} total` },
          { show: isAdmin || isCaisse || isStats, label: 'Dettes / Attentes', value: formatPrice(totDettesEnAttente) + ' F', color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle, sub: 'À recouvrer' },
          { show: isAdmin || isTickets, label: 'Repas', value: stockRepas, color: 'text-amber-600', bg: 'bg-amber-50', icon: Ticket, sub: 'En stock' },
          { show: isAdmin || isCafe, label: 'Café (Global)', value: cafeStock, color: 'text-[#78350f]', bg: 'bg-[#f5ebe0]', icon: Coffee, sub: 'Unités dispo' },
          { show: isRevendeur, label: 'Mon Stock', value: sellerStock, color: 'text-purple-600', bg: 'bg-purple-50', icon: Package, sub: 'Unités' },
          { show: isRevendeur, label: 'Mes Ventes', value: formatPrice(sellerRevenue) + ' F', color: 'text-dmn-green-600', bg: 'bg-dmn-green-50', icon: TrendingUp, sub: `${sellerQtySold} vendus` },
          { show: isMembreSimple && myMembre, label: 'Mon Statut', value: myMembre ? getMembreStatus(myMembre.id) : '-', color: myMembre && getMembreStatus(myMembre.id) === 'À jour' ? 'text-dmn-green-600' : 'text-red-500', bg: myMembre && getMembreStatus(myMembre.id) === 'À jour' ? 'bg-dmn-green-50' : 'bg-red-50', icon: Shield, sub: 'Cotisations' },
          { show: isMembreSimple && myMembre, label: 'Mes Cotisations', value: formatPrice(myMembre ? cotisations.filter(c => c.mId === myMembre.id && c.annee === globalYear).reduce((s, c) => s + c.montant, 0) : 0) + ' F', color: 'text-dmn-gold', bg: 'bg-amber-50', icon: Wallet, sub: `En ${globalYear}` },
        ].filter(item => item.show).map((item, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className={`premium-card p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 relative overflow-hidden`}
          >
            <div className={`p-2 w-9 h-9 sm:w-10 sm:h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-1 sm:mb-2`}>
              <item.icon size={18} />
            </div>
            <div>
              <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest line-clamp-1">{item.label}</p>
              <h4 className={`text-sm sm:text-lg font-black ${item.color} leading-none mt-1`}>{item.value}</h4>
              <p className="text-[7px] sm:text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-tighter opacity-60 leading-none">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* COMMERCIAL INSIGHTS */}
      {isCafe && (
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
             <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Star className="text-amber-500" size={16} /> Top Vendeurs (CA)
             </h3>
             <div className="space-y-4">
                {commercialInsights.topSellers.map((seller, idx) => (
                  <div key={seller.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-xs text-gray-400">
                           {idx + 1}
                        </div>
                        <p className="text-sm font-black text-gray-900">{seller.nom}</p>
                     </div>
                     <p className="text-sm font-black text-dmn-green-600">{formatPrice(seller.total)} F</p>
                  </div>
                ))}
                {commercialInsights.topSellers.length === 0 && (
                  <p className="text-xs font-bold text-gray-400 italic text-center py-4">Pas encore de données de vente par vendeur.</p>
                )}
             </div>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
             <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Zap className="text-dmn-gold" size={16} /> Meilleurs Clients
             </h3>
             <div className="space-y-4">
                {commercialInsights.topClients.map((client, idx) => (
                  <div key={client.nom} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                           <Star size={14} />
                        </div>
                        <p className="text-sm font-black text-gray-900">{client.nom}</p>
                     </div>
                     <p className="text-sm font-black text-dmn-gold">{formatPrice(client.total)} F</p>
                  </div>
                ))}
                {commercialInsights.topClients.length === 0 && (
                  <p className="text-xs font-bold text-gray-400 italic text-center py-4">Pas encore de clients enregistrés.</p>
                )}
             </div>
          </div>
        </motion.section>
      )}

      {/* QUICK ACTIONS (Floating Style) */}
      <motion.div variants={itemVariants} className="bg-gray-900 rounded-[3rem] p-4 flex items-center justify-between shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-dmn-green-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex gap-2 sm:gap-6 overflow-x-auto no-scrollbar py-1">
           {[
             { id: 'membre', label: 'Inscrire Membre', icon: Users, color: 'bg-dmn-green-500', perm: ['admin'] },
             { id: 'ticket', label: 'Distribuer Tickets', icon: Ticket, color: 'bg-amber-500', perm: ['admin', 'tickets'] },
             { id: 'cafe', label: 'Action Café', icon: Coffee, color: 'bg-orange-500', perm: ['admin', 'cafe'] },
             { id: 'rapport', label: 'Générer Rapport', icon: BarChart3, color: 'bg-blue-500', perm: ['admin', 'caisse'] }
           ].filter(a => !userRole || a.perm.includes(userRole as any)).map((action) => (
             <button 
               key={action.id}
               onClick={() => onQuickAction?.(action.id as any)}
               className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 active:scale-95 outline-none transition-all group/btn whitespace-nowrap"
             >
               <div className={`p-2.5 ${action.color} text-black font-black rounded-xl group-hover/btn:scale-110 transition-transform`}>
                  <action.icon size={18} />
               </div>
               <span className="text-xs font-black text-gray-300 uppercase tracking-widest group-hover/btn:text-white transition-colors">{action.label}</span>
             </button>
           ))}
        </div>
      </motion.div>

      {/* ANALYTICS SECTION */}
      {(isCaisse || isStats) && (
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card p-8">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                  <TrendingUp size={16} className="text-dmn-green-500" /> Courbe de Flux Mensuels
                </h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Comparaison des entrées et du solde annuel ({globalYear})</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-dmn-green-500"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Entrées</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-dmn-gold"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Solde</span>
                </div>
              </div>
           </div>
           <div className="h-64 w-full">
              {isLowEndDevice ? (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                  <p className="text-xs font-bold text-gray-400 italic">Veuillez activer le mode performance pour voir les graphiques</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionSoldeData}>
                    <defs>
                      <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" dataKey="Entrées" stroke="#22C55E" strokeWidth={4} fillOpacity={1} fill="url(#colorEnt)" radius={4}
                    />
                    <Line type="monotone" dataKey="Solde" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706' }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
           </div>
        </div>

        <div className="bg-dmn-green-950 rounded-[3rem] p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-xl shadow-dmn-green-950/40">
           <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
           <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-dmn-green-400 mb-6">Résumé de l'année ({globalYear})</h4>
              
              <div className="space-y-8">
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Impact Social</p>
                  <p className="text-3xl font-black">{formatPrice(globalTotExpenses)} <span className="text-sm font-light text-white/50 italic">Utilisés</span></p>
                  <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-red-400 shimmer" style={{ width: `${Math.min(100, (globalTotExpenses / globalTotIncome) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Volume Café</p>
                  <p className="text-3xl font-black">{totCafeQtySold || 0} <span className="text-sm font-light text-white/50 italic">Tasses</span></p>
                  <p className="text-[9px] font-bold text-dmn-green-500 mt-2">+{formatPrice(totCafeRevenus)} FCFA en CA</p>
                </div>

                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Régularité</p>
                  <p className="text-3xl font-black">{Math.round((membresActifs / (membres.length || 1)) * 100)}% <span className="text-sm font-light text-white/50 italic">À jour</span></p>
                </div>
              </div>
           </div>

           <button 
             onClick={() => onQuickAction?.('rapport')}
             className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 active:scale-95 outline-none transition-all rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border border-white/10"
           >
              Analyses détaillées <ArrowRight size={14} />
           </button>
        </div>
      </motion.div>
      )}

      {/* ACTIVITY STREAM */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
             Flux d'activités <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-shimmer"></div>
          </h3>
          <button className="text-[10px] font-black text-dmn-green-600 hover:text-dmn-green-700 active:scale-95 outline-none transition-all uppercase tracking-widest flex items-center gap-1">
             Historique complet <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {recentHistory.map((h, i) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i}
                className="premium-card p-5 sm:p-6 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-5 min-w-0 flex-1">
                  <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${
                    h.type === 'in' ? 'bg-dmn-green-50 text-dmn-green-600' :
                    h.type === 'out' ? 'bg-red-50 text-red-600' :
                    h.type === 'cafe' ? 'bg-orange-50 text-orange-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <h.icon size={22} className={h.type === 'in' ? 'animate-bounce-slow' : ''} />
                  </div>
                  <div className="min-w-0 pr-4">
                    <h4 className="text-sm sm:text-base font-black text-gray-900 group-hover:text-dmn-green-800 transition-colors truncate">
                      {h.label}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                       <Calendar size={10} /> {h.date ? simpleDate(h.date) : '---'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm sm:text-lg font-black tracking-tight ${
                    h.type === 'in' || h.type === 'cafe' ? 'text-dmn-green-600' : 'text-red-500'
                  }`}>
                    {h.type === 'in' || h.type === 'cafe' ? '+' : '-'}{formatPrice(h.amount)}
                  </p>
                  <div className={`mt-2 h-1 w-16 bg-gray-100 rounded-full overflow-hidden ml-auto`}>
                    <div className={`h-full rounded-full ${h.type === 'in' || h.type === 'cafe' ? 'bg-dmn-green-500' : 'bg-red-400'} shimmer`} style={{ width: '100%' }}></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {history.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
               <Activity size={32} className="text-gray-200 mx-auto mb-4" />
               <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Aucune activité détectée</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* 🧭 MOTIVATIONAL FOOTER */}
      <motion.div variants={itemVariants} className="pt-10">
        <div className="bg-dmn-green-950 rounded-[4rem] p-12 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div className="w-12 h-1 bg-dmn-gold-light/40 rounded-full"></div>
            <p className="text-lg sm:text-2xl font-black text-dmn-gold-light italic tracking-tight italic max-w-lg leading-relaxed">
              “La rectitude dans la gestion est le garant de la prospérité sociale.”
            </p>
            <div className="space-y-1">
               <p className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Daara Madjmahoune Noreyni</p>
               <p className="text-[9px] font-bold text-dmn-green-400 uppercase tracking-[0.2em]">Gestion Transparente | Engagement Solidaire</p>
            </div>
            <div className="pt-4 flex gap-3">
               <div className="w-2 h-2 bg-dmn-green-500 rounded-full"></div>
               <div className="w-2 h-2 bg-white/20 rounded-full"></div>
               <div className="w-2 h-2 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
