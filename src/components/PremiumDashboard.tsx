import React, { useMemo } from 'react';
import { 
  Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution, CafeProduction, CafeVente, 
  CafeDepense, UserRole, CafeSeller, CafeClient, CafeOrder 
} from '../types';
import { MOIS } from '../data';
import { 
  Building2, TrendingUp, TrendingDown, Users, AlertCircle, 
  Ticket, Wallet, ArrowUpRight, ArrowDownRight, Package, Calendar, Activity, Edit2, Coffee, ArrowRight, ChevronRight, LayoutGrid, Zap, BarChart3, Shield, Star
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAdaptive } from '../hooks/useAdaptive';
import { formatPrice } from '../utils/format';
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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      damping: 25, 
      stiffness: 400,
      mass: 0.8
    } 
  }
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
       const nom = client?.name || 'Anonyme';
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
  const isLecteur = userRole === 'lecteur';
  const isAdmin = userRole === 'admin';
  const isCaisse = userRole === 'caisse' || hasPermission(formattedRole, 'caisse.read');
  const isCafe = userRole === 'cafe' || hasPermission(formattedRole, 'cafe.production.read');
  const isTickets = userRole === 'tickets' || hasPermission(formattedRole, 'tickets.read');
  const isRevendeur = !isAdmin && !isCafe && Boolean(cafeSellers.some(s => s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()));
  const isMembreSimple = !isAdmin && !isCaisse && !isCafe && !isTickets && !isRevendeur && Boolean(currentUser?.email);
  const isStats = hasPermission(formattedRole, 'stats.read');
  const canViewGlobalKPIs = isAdmin || isCaisse || isStats || isLecteur;

  const filteredCafeVentes = useMemo(() => cafeVentes.filter(v => new Date(v.date).getFullYear() === globalYear), [cafeVentes, globalYear]);

  const totCafeRevenus = filteredCafeVentes.reduce((s, v) => s + v.total, 0);
  const totCafeQtySold = filteredCafeVentes.reduce((s, v) => s + v.quantite, 0);
  const totCafeQtyProd = cafeProductions.reduce((s, p) => s + p.quantite, 0);
  const cafeStock = totCafeQtyProd - cafeVentes.reduce((s, v) => s + v.quantite, 0);

  const filteredCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear && (!globalMonth || c.mois?.toUpperCase() === globalMonth?.toUpperCase())), [cotisations, globalYear, globalMonth]);
  const filteredDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear && (!globalMonth || d.mois?.toUpperCase() === globalMonth?.toUpperCase())), [depenses, globalYear, globalMonth]);
  const filteredRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear && (!globalMonth || r.mois?.toUpperCase() === globalMonth?.toUpperCase())), [recettes, globalYear, globalMonth]);
  const filteredDettes = useMemo(() => dettes.filter(d => d.annee === globalYear && (!globalMonth || d.mois?.toUpperCase() === globalMonth?.toUpperCase())), [dettes, globalYear, globalMonth]);
  
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

  const currentMonthIndex = MOIS.indexOf(globalMonth?.toUpperCase() || MOIS[new Date().getMonth()]);
  const getMembreStatus = (mId: string) => {
    const membre = membres.find(m => m.id === mId);
    let startMonthIndex = 0;
    if (membre && membre.anneeIntegration && membre.moisIntegration) {
      if (membre.anneeIntegration > globalYear) return "Non membre";
      if (membre.anneeIntegration === globalYear) {
        startMonthIndex = MOIS.indexOf(membre.moisIntegration?.toUpperCase() || '') + 1;
      }
    }
    let isEnRetard = false;
    for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
        const month = MOIS[i];
        if (!cotisations.some(c => c.mId === mId && c.mois?.toUpperCase() === month?.toUpperCase() && c.annee === globalYear && c.montant > 0)) {
            isEnRetard = true;
            break;
        }
    }
    return isEnRetard ? 'En retard' : 'À jour';
  };

  const membresActifs = membres.filter(m => getMembreStatus(m.id) === 'À jour').length;

  const myMembre = useMemo(() => membres.find(m => m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase()), [membres, currentUser]);
  const mySeller = useMemo(() => cafeSellers.find(s => s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()), [cafeSellers, currentUser]);
  const sellerQtySold = mySeller ? cafeVentes.filter(v => v.vendeurId === mySeller.id).reduce((s, v) => s + v.quantite, 0) : 0;
  const sellerRevenue = mySeller ? cafeVentes.filter(v => v.vendeurId === mySeller.id).reduce((s, v) => s + v.total, 0) : 0;
  const sellerStock = mySeller ? (mySeller.stockActuel || 0) : 0;

  const evolutionSoldeData = MOIS.map(m => {
    const moisCot = annualCotisations.filter(c => c.mois?.toUpperCase() === m?.toUpperCase()).reduce((s, c) => s + c.montant, 0);
    const moisRec = annualRecettes.filter(c => c.mois?.toUpperCase() === m?.toUpperCase()).reduce((s, c) => s + c.montant, 0);
    const moisDep = annualDepenses.filter(c => c.mois?.toUpperCase() === m?.toUpperCase()).reduce((s, d) => s + d.montant, 0);
    return { name: m.substring(0, 3), Entrées: moisCot + moisRec, Dépenses: moisDep, Solde: moisCot + moisRec - moisDep };
  });

  const history = useMemo(() => {
    const historyItems = [];
    if (isCaisse) {
      historyItems.push(...cotisations.map(c => ({ 
        id: `cot-${c.id}`,
        date: c.createdAt || 0, 
        label: `Cotisation de ${membres.find(m => m.id === c.mId)?.prenom} ${membres.find(m => m.id === c.mId)?.nom}`, 
        amount: c.montant, 
        type: 'in' as const, 
        icon: Wallet 
      })));
      historyItems.push(...depenses.map(d => ({ 
        id: `dep-${d.id}`,
        date: d.createdAt || d.updatedAt || 0, 
        label: `Dépense : ${d.evenement}`, 
        amount: d.montant, 
        type: 'out' as const, 
        icon: ArrowDownRight 
      })));
      historyItems.push(...recettes.map(r => ({ 
        id: `rec-${r.id}`,
        date: r.createdAt || r.updatedAt || 0, 
        label: `Recette : ${r.motif}`, 
        amount: r.montant, 
        type: 'in' as const, 
        icon: ArrowUpRight 
      })));
    }
    if (isTickets) {
      historyItems.push(...ticketDistributions.map(d => ({ 
        id: `tick-${d.id}`,
        date: d.createdAt || 0, 
        label: `Tickets à ${membres.find(m => m.id === d.mId)?.prenom} ${membres.find(m => m.id === d.mId)?.nom}`, 
        amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, 
        type: 'ticket' as const, 
        icon: Ticket 
      })));
    }
    if (isCafe) {
      historyItems.push(...cafeVentes.map(v => ({ 
        id: `cafe-${v.id}`,
        date: v.createdAt || v.date, 
        label: `Vente Café (${v.quantite})`, 
        amount: v.total, 
        type: 'cafe' as const, 
        icon: Coffee 
      })));
    }

    if (isMembreSimple && currentUser?.email && myMembre) {
      historyItems.push(...cotisations.filter(c => c.mId === myMembre.id).map(c => ({ 
        id: `mycot-${c.id}`,
        date: c.createdAt || 0, 
        label: `Ma cotisation (${c.mois} ${c.annee})`, 
        amount: c.montant, 
        type: 'in' as const, 
        icon: Wallet 
      })));
      historyItems.push(...ticketDistributions.filter(d => d.mId === myMembre.id).map(d => ({ 
        id: `mytick-${d.id}`,
        date: d.createdAt || 0, 
        label: `Mes tickets (${d.petitDej || 0} PD, ${d.repas || 0} R)`, 
        amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, 
        type: 'ticket' as const, 
        icon: Ticket 
      })));
    }
    
    if (isRevendeur && mySeller) {
      historyItems.push(...cafeVentes.filter(v => v.vendeurId === mySeller.id).map(v => ({ 
        id: `mysell-${v.id}`,
        date: v.createdAt || v.date, 
        label: `Mes ventes CAFE (${v.quantite})`, 
        amount: v.total, 
        type: 'cafe' as const, 
        icon: Coffee 
      })));
    }

    return historyItems.sort((a, b) => b.date - a.date);
  }, [isCaisse, isTickets, isCafe, isMembreSimple, isRevendeur, cotisations, depenses, recettes, ticketDistributions, cafeVentes, membres, myMembre, mySeller, currentUser?.email]);

  const recentHistory = useMemo(() => history.slice(0, 8), [history]);

  const todayStats = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayTransactions = history.filter(h => new Date(h.date).setHours(0,0,0,0) === today);
    return {
      in: todayTransactions.filter(t => t.type === 'in' || t.type === 'cafe').reduce((s, t) => s + t.amount, 0),
      out: todayTransactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    };
  }, [history]);

  // --- Smart Insights ---
  const smartInsights = useMemo(() => {
    const insights = [];
    if (soldeGlobal < 50000) insights.push({ text: "Solde faible. Surveillez les prochaines cotisations.", icon: AlertCircle, color: "text-amber-600" });
    if (totDettesEnAttente > 100000) insights.push({ text: "Volume important de dettes non payées.", icon: TrendingUp, color: "text-red-500" });
    if (membres.length > 0 && membresActifs / membres.length < 0.6) insights.push({ text: "Taux de régularité des membres en baisse.", icon: Users, color: "text-orange-500" });
    return insights.slice(0, 2);
  }, [soldeGlobal, totDettesEnAttente, membresActifs, membres.length]);

  if (isLecteur) {
    return (
      <motion.div 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="max-w-5xl mx-auto space-y-6 sm:space-y-10 pb-32 pt-4 sm:pt-12 px-2 sm:px-6"
      >
        {/* WELCOME & LOGO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 px-2 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
            <div className="relative group shrink-0">
              <div className="absolute inset-0 bg-dmn-green-500/10 rounded-[1.2rem] sm:rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-[1.2rem] sm:rounded-[2rem] p-1 sm:p-1.5 shadow-soft border border-gray-100/80 overflow-hidden relative z-10 transition-transform group-hover:scale-105 duration-500">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-[1rem] sm:rounded-[1.5rem]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-dmn-green-50 flex items-center justify-center text-dmn-green-700">
                    <Building2 size={24} strokeWidth={2.5} className="sm:w-8 sm:h-8" />
                  </div>
                )}
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-lg sm:text-3xl lg:text-4xl fintech-heading leading-tight max-w-[220px] sm:max-w-none">Daara Madjmahoune Noreyni UCAD</h1>
              <p className="text-[8px] sm:text-[11px] font-black text-dmn-green-600 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-1 sm:mt-2 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3">
                <span className="w-1 h-1 sm:w-2 sm:h-2 bg-dmn-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Vue Transparence Globale
              </p>
            </div>
          </div>
        </div>

        {/* LECTEUR SPECIFIC METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
           <motion.div variants={itemVariants} className="p-6 sm:p-10 bg-[#064e3b] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-md border border-[#043327] text-white overflow-hidden relative group min-h-[160px] sm:min-h-[200px]">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-dmn-gold/20 rounded-full blur-[60px] transform group-hover:scale-125 transition-transform duration-700 -mr-10 -mt-10"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                 <p className="text-[10px] sm:text-xs uppercase font-black tracking-[0.3em] text-white/50 mb-4 flex items-center gap-2"><Wallet size={14} className="text-dmn-gold"/> Solde Global Caisse</p>
                 <h2 className="text-4xl lg:text-5xl xl:text-6xl font-black text-white drop-shadow-lg fintech-kpi mt-auto">{formatPrice(soldeGlobal)} <span className="text-lg opacity-60">FCFA</span></h2>
              </div>
           </motion.div>

           <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
               <div className="p-4 flex flex-col justify-between bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm relative overflow-hidden border border-gray-100">
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><TrendingUp size={12} className="text-dmn-green-600"/> Total Recettes</p>
                   <h4 className="text-lg sm:text-2xl font-black mt-auto text-dmn-green-700">{formatPrice(globalTotIncome)} <span className="text-[10px] opacity-60">F</span></h4>
               </div>

               <div className="p-4 flex flex-col justify-between bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm relative overflow-hidden border border-gray-100">
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><TrendingDown size={12} className="text-red-500"/> Total Dépenses</p>
                   <h4 className="text-lg sm:text-2xl font-black mt-auto text-red-600">{formatPrice(globalTotExpenses)} <span className="text-[10px] opacity-60">F</span></h4>
               </div>

               <div className="p-4 sm:p-5 flex flex-col justify-between col-span-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-[1.5rem] sm:rounded-[2rem] shadow-md relative overflow-hidden group border border-amber-400">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-4 -mt-4"></div>
                   <p className="text-[9px] sm:text-xs font-black uppercase text-white/90 tracking-[0.2em] relative z-10 flex items-center gap-1.5"><Ticket size={14} className="text-white"/> Tickets Disponibles</p>
                   <div className="flex items-end gap-2 mt-auto relative z-10">
                       <h4 className="text-3xl sm:text-4xl font-black text-white leading-none">{stockRepas}</h4>
                       <span className="text-[10px] uppercase font-bold text-white/70 mb-1">Repas</span>
                   </div>
               </div>
           </motion.div>
        </div>

        {/* DECORATIVE VALUES OF THE DAARA CAISSE */}
        <motion.div variants={itemVariants} className="relative w-full rounded-[2.5rem] bg-gradient-to-br from-[#0a1f12] to-[#041009] p-8 sm:p-12 overflow-hidden shadow-base mt-4 border border-white/5">
             <div className="absolute top-0 left-0 w-96 h-96 bg-dmn-gold/5 blur-[100px] -ml-20 -mt-20 pointer-events-none"></div>
             <div className="absolute bottom-0 right-0 w-80 h-80 bg-dmn-green-500/10 blur-[80px] -mr-10 -mb-10 pointer-events-none"></div>
             
             <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 text-center sm:text-left">
                 {[
                   { title: "NDIGËL & KHIDMA", desc: "Celui qui participe à l'effort commun par ses biens ou sa sueur, accomplit une Khidma précieuse envers Serigne Touba.", icon: Users },
                   { title: "JËF JËL (L'ACTION)", desc: "Les grandes œuvres se bâtissent par l'action. Chaque contribution est une pierre à l'édifice de notre Daara à l'UCAD.", icon: Activity },
                   { title: "DIMBËLËNTÉ", desc: "Ce système est le reflet de notre solidarité de talibés. Unissons nos forces pour ne laisser aucun condisciple derrière.", icon: Shield },
                   { title: "AMAANAH", desc: "La confiance est sacrée. La clarté totale dans notre gestion est une exigence spirituelle et un devoir moral.", icon: Star },
                 ].map((val, idx) => (
                     <div key={idx} className="flex flex-col items-center sm:items-start gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-dmn-gold group-hover:bg-dmn-gold/10 group-hover:text-dmn-gold transition-colors">
                           <val.icon size={20} />
                        </div>
                        <div>
                          <h5 className="text-white text-[11px] font-black uppercase tracking-[0.2em] mb-2">{val.title}</h5>
                          <p className="text-white/40 text-[10px] sm:text-[11px] leading-relaxed max-w-[200px] text-center sm:text-left">{val.desc}</p>
                        </div>
                     </div>
                 ))}
             </div>
        </motion.div>

      </motion.div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-10 pb-32 pt-4 sm:pt-12 px-2 sm:px-6"
    >
      {/* WELCOME & LOGO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 px-2 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-dmn-green-500/10 rounded-[1.2rem] sm:rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-[1.2rem] sm:rounded-[2rem] p-1 sm:p-1.5 shadow-soft border border-gray-100/80 overflow-hidden relative z-10 transition-transform group-hover:scale-105 duration-500">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-[1rem] sm:rounded-[1.5rem]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-dmn-green-50 flex items-center justify-center text-dmn-green-700">
                  <Building2 size={24} strokeWidth={2.5} className="sm:w-8 sm:h-8" />
                </div>
              )}
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-lg sm:text-3xl lg:text-4xl fintech-heading leading-tight max-w-[220px] sm:max-w-none">Daara Madjmahoune Noreyni UCAD</h1>
            <p className="text-[8px] sm:text-[11px] font-black text-dmn-green-600 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-1 sm:mt-2 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3">
              <span className="w-1 h-1 sm:w-2 sm:h-2 bg-dmn-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Système de Gestion DMN
            </p>
          </div>
        </div>
        
        {smartInsights.length > 0 && (
          <div className="hidden sm:flex flex-col gap-2">
            {smartInsights.map((insight, idx) => (
              <div key={idx} className="bg-white/80 border border-gray-100 py-2.5 px-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-500 shadow-sm">
                <insight.icon size={16} className={insight.color} />
                <p className="text-[10px] font-bold text-gray-600 leading-none">{insight.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN WALLET CARD */}
      {(isCaisse || isStats) && (
      <motion.div 
        variants={itemVariants} 
        layout
        className="relative group px-1 sm:px-0"
      >
        <div className="absolute inset-x-0 -bottom-4 h-10 bg-dmn-green-900/10 blur-3xl rounded-full scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative h-60 sm:h-80 w-full bg-dmn-green-900 rounded-[2rem] sm:rounded-[3.5rem] p-5 sm:p-10 shadow-2xl shadow-dmn-green-900/30 overflow-hidden"
        >
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-dmn-green-500/20 rounded-full blur-[80px] sm:blur-[120px] -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 transition-transform group-hover:scale-110 duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 sm:w-60 h-60 bg-dmn-gold/20 rounded-full blur-[60px] sm:blur-[100px] -ml-20 -mb-20 sm:-ml-30 sm:-mb-30 transition-transform group-hover:scale-110 duration-1000"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <p className="text-white/40 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Solde Trésorerie Centrale</p>
                  <Shield size={10} className="text-white/20 sm:block hidden" />
                </div>
                <div className="flex items-baseline gap-1.5 sm:gap-4">
                  <span className="text-lg sm:text-3xl font-heading font-black text-dmn-gold opacity-80 tracking-tighter">FCFA</span>
                  <h2 className="text-3xl sm:text-7xl lg:text-8xl fintech-kpi text-white drop-shadow-2xl">
                    {formatPrice(soldeGlobal)}
                  </h2>
                </div>
              </div>
              <div className="p-2.5 sm:p-4 bg-white/20 border border-white/20 rounded-xl sm:rounded-3xl shadow-lg ring-1 ring-white/20 hover:scale-110 transition-transform cursor-help">
                <LayoutGrid size={18} className="text-dmn-gold-light sm:block hidden" />
                <Zap size={18} className="text-dmn-gold-light sm:hidden" />
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
        </motion.div>
      </motion.div>
      )}

      {/* KPI GRID */}
      <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-1">
        {[
          { show: canViewGlobalKPIs, label: 'Cotisations', value: formatPrice(annualCotisations.reduce((s, c) => s + c.montant, 0)) + ' F', color: 'text-dmn-gold', bg: 'bg-amber-50', icon: Wallet, sub: `${globalYear}` },
          { show: isAdmin || isCaisse || isStats, label: 'Dépenses', value: formatPrice(totDepenses) + ' F', color: 'text-red-500', bg: 'bg-red-50', icon: TrendingDown, sub: `Année ${globalYear}` },
          { show: isAdmin || isCaisse || isStats, label: 'Retards', value: formatPrice(totDettesEnAttente) + ' F', color: 'text-orange-500', bg: 'bg-orange-50', icon: AlertCircle, sub: 'À recouvrer' },
          { show: isAdmin || isCafe || isLecteur, label: 'Bénéfices Café', value: formatPrice(filteredCafeVentes.reduce((s, v) => s + v.total, 0) - (cafeDepenses.filter(d => new Date(d.date).getFullYear() === globalYear).reduce((s,d) => s + d.montant, 0) + cafeProductions.filter(p => new Date(p.date).getFullYear() === globalYear).reduce((s,p) => s + p.coutsProduction, 0))) + ' F', color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp, sub: 'Net' },
          { show: isAdmin || isCafe || isLecteur, label: 'Stock Café', value: cafeStock, color: 'text-[#78350f]', bg: 'bg-[#f5ebe0]', icon: Coffee, sub: 'Unités' },
          { show: isRevendeur, label: 'Mon Stock', value: sellerStock, color: 'text-purple-600', bg: 'bg-purple-50', icon: Package, sub: 'Unités' },
          { show: isRevendeur, label: 'Mes Ventes', value: formatPrice(sellerRevenue) + ' F', color: 'text-dmn-green-600', bg: 'bg-dmn-green-50', icon: TrendingUp, sub: `${sellerQtySold} vendus` },
          { show: isMembreSimple && myMembre, label: 'Mon Statut', value: myMembre ? getMembreStatus(myMembre.id) : '-', color: myMembre && getMembreStatus(myMembre.id) === 'À jour' ? 'text-dmn-green-600' : 'text-red-500', bg: myMembre && getMembreStatus(myMembre.id) === 'À jour' ? 'bg-dmn-green-50' : 'bg-red-50', icon: Shield, sub: 'Cotisations' },
        ].filter(item => item.show).map((item, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            layout
            whileHover={{ 
              y: -8, 
              scale: 1.03,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              transition: { type: 'spring', stiffness: 400, damping: 15 }
            }}
            whileTap={{ scale: 0.95 }}
            className={`premium-card p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 relative overflow-hidden group cursor-pointer border-transparent hover:border-dmn-green-500/20`}
          >
            <div className={`absolute top-0 right-0 w-16 h-16 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`}>
               <item.icon size={64} className="-mr-4 -mt-4 rotate-12" />
            </div>
            <div className={`p-2 w-9 h-9 sm:w-10 sm:h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-1 sm:mb-2 transition-transform group-hover:scale-110`}>
              <item.icon size={18} />
            </div>
            <div>
              <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest line-clamp-1">{item.label}</p>
              <h4 className={`text-sm sm:text-lg font-black ${item.color} leading-none mt-1`}>{item.value}</h4>
              <p className="text-[7px] sm:text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-tighter opacity-60 leading-none">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
             { id: 'membre', label: 'Ajouter Membre', icon: Users, color: 'bg-dmn-green-500', perm: ['admin'] },
             { id: 'pay', label: 'Enregistrer Paiement', icon: Wallet, color: 'bg-emerald-500', perm: ['admin', 'caisse'] },
             { id: 'cafe', label: 'Ajouter Vente', icon: Coffee, color: 'bg-orange-500', perm: ['admin', 'cafe', 'revendeur'] },
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
                    <div className="h-full bg-red-400 shimmer" style={{ width: `${Math.min(100, (globalTotExpenses / (globalTotIncome || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                {(isAdmin || isCafe) && (
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Volume Café</p>
                    <p className="text-3xl font-black">{totCafeQtySold || 0} <span className="text-sm font-light text-white/50 italic">Tasses</span></p>
                    <p className="text-[9px] font-bold text-dmn-green-500 mt-2">+{formatPrice(totCafeRevenus)} FCFA en CA</p>
                  </div>
                )}

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
              Consulter les rapports <ArrowRight size={14} />
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
                key={h.id}
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
