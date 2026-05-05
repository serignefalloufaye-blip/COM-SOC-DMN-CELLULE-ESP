import React, { useMemo } from 'react';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution, CafeProduction, CafeVente, CafeDepense } from '../types';
import { MOIS } from '../data';
import { 
  Building2, TrendingUp, TrendingDown, Users, AlertCircle, 
  Ticket, Wallet, ArrowUpRight, ArrowDownRight, Package, Calendar, Activity, Edit2, Coffee, ArrowRight, ChevronRight, LayoutGrid, Zap, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

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
  userRole?: 'admin' | 'visitor' | 'caisse' | 'cafe' | 'tickets' | 'lecteur' | null;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const formatPrice = (p: number) => p.toLocaleString('fr-FR');

export function PremiumDashboard({
  membres, cotisations, depenses, recettes, dettes,
  ticketCollectes, ticketConversions, ticketDistributions,
  cafeProductions, cafeVentes, cafeDepenses,
  globalYear, globalMonth, logoUrl, userRole, onLogoUpload
}: PremiumDashboardProps) {

  // --- LOGIC CALCULATIONS (Keep from original) ---
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

  const history = [
    ...cotisations.map(c => ({ date: c.createdAt || 0, label: `Cotisation de ${membres.find(m => m.id === c.mId)?.prenom} ${membres.find(m => m.id === c.mId)?.nom}`, amount: c.montant, type: 'in', icon: Wallet })),
    ...depenses.map(d => ({ date: d.createdAt || d.updatedAt || 0, label: `Dépense : ${d.evenement}`, amount: d.montant, type: 'out', icon: ArrowDownRight })),
    ...recettes.map(r => ({ date: r.createdAt || r.updatedAt || 0, label: `Recette : ${r.motif}`, amount: r.montant, type: 'in', icon: ArrowUpRight })),
    ...ticketDistributions.map(d => ({ date: d.createdAt || 0, label: `Tickets à ${membres.find(m => m.id === d.mId)?.prenom} ${membres.find(m => m.id === d.mId)?.nom}`, amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, type: 'ticket', icon: Ticket })),
    ...cafeVentes.map(v => ({ date: v.createdAt || v.date, label: `Vente Café (${v.quantite})`, amount: v.total, type: 'cafe', icon: Coffee }))
  ].sort((a, b) => b.date - a.date).slice(0, 6);

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
      className="max-w-md mx-auto space-y-8 pb-20 pt-4"
    >
      {/* 💳 MAIN WALLET CARD */}
      <motion.div variants={itemVariants} className="px-4 card-stack">
        <div className="relative h-64 w-full bg-dmn-green-900 rounded-[3rem] p-8 shadow-premium overflow-hidden transition-transform hover:scale-[1.02] duration-500 cursor-pointer group">
          {/* Background effects */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-dmn-green-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-dmn-gold/20 rounded-full blur-[80px] -ml-16 -mb-16"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-dmn-green-300 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Solde Global</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-black text-white tracking-tight">
                    {formatPrice(soldeGlobal)}
                  </h2>
                  <span className="text-lg font-bold text-dmn-green-400">FCFA</span>
                </div>
              </div>
              <div className="w-10 h-10 glass-dark rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-dmn-gold-light" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-dmn-green-400/60 text-[9px] font-black uppercase tracking-widest">Entrées</p>
                <p className="text-white font-black text-xs">+{formatPrice(totEntrees)} F</p>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="space-y-1">
                <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Dépenses</p>
                <p className="text-white font-black text-xs">-{formatPrice(totDepenses)} F</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-white/40">
              <p className="text-[8px] font-mono tracking-widest uppercase">**** **** **** {globalYear}</p>
              <Building2 size={24} className="opacity-50" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 📲 HORIZONTAL MODULE SCROLL */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="px-6 flex justify-between items-center">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Services</h3>
          <ChevronRight size={14} className="text-gray-300" />
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 no-scrollbar pb-2">
          {/* Caisse Module Card */}
          <div className="min-w-[140px] premium-card p-5 flex flex-col gap-4 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-2xl bg-dmn-green-50 text-dmn-green-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400">Caisse</p>
              <p className="font-black text-gray-900">{formatPrice(totCotisations)} F</p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-dmn-green-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Tickets Module Card */}
          <div className="min-w-[140px] premium-card p-5 flex flex-col gap-4 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Ticket size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400">Tickets</p>
              <p className="font-black text-gray-900">{stockPD + stockRepas} uts</p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Café Module Card */}
          <div className="min-w-[140px] premium-card p-5 flex flex-col gap-4 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-2xl bg-[#f5ebe0] text-[#78350f] flex items-center justify-center transition-transform group-hover:scale-110">
              <Coffee size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400">Café</p>
              <p className="font-black text-gray-900">{cafeStock} uts</p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#fdfaf6] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Stats Module Card */}
          <div className="min-w-[140px] premium-card p-5 flex flex-col gap-4 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400">Stats</p>
              <p className="font-black text-gray-900">{membresActifs} actifs</p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
      </motion.section>

      {/* 📊 ANALYTICS PREVIEW */}
      <motion.div variants={itemVariants} className="px-4">
        <div className="premium-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Activity size={16} className="text-dmn-green-500" /> Analystiques
            </h3>
            <button className="text-[10px] font-black text-dmn-green-600 uppercase tracking-widest flex items-center gap-1">
              Détails <ArrowRight size={12} />
            </button>
          </div>
          <div className="h-40 w-full">
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
                    padding: '12px 16px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="Entrées" 
                  stroke="#22C55E" 
                  fillOpacity={1} 
                  fill="url(#colorArea)" 
                  strokeWidth={3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 📋 RECENT TRANSACTIONS */}
      <motion.section variants={itemVariants} className="px-4 space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Transactions Récentes</h3>
          <button className="text-[11px] font-black text-dmn-green-600 uppercase tracking-widest">Voir tout</button>
        </div>
        <div className="space-y-2">
          {history.map((h, i) => (
            <motion.div 
              key={i}
              whileTap={{ scale: 0.98 }}
              className="premium-card p-4 flex items-center justify-between group transition-colors hover:bg-gray-50/50"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  h.type === 'in' ? 'bg-green-50 text-green-600' :
                  h.type === 'out' ? 'bg-red-50 text-red-600' :
                  'bg-orange-50 text-orange-500'
                }`}>
                  <h.icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate pr-2">{h.label}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '---'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${
                  h.type === 'in' ? 'text-dmn-green-600' :
                  h.type === 'out' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {h.type === 'in' ? '+' : '-'}{formatPrice(h.amount)}
                </p>
                <div className="w-full h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${
                    h.type === 'in' ? 'bg-dmn-green-500' : 'bg-red-400'
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
        <div className="bg-dmn-green-900/5 rounded-[2.5rem] p-8 border border-dmn-green-100 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-1 bg-dmn-green-600/20 rounded-full"></div>
          <p className="text-sm font-black text-dmn-green-900">“Le travail est une adoration”</p>
          <p className="text-[10px] font-bold text-dmn-green-600 uppercase tracking-[0.2em]">Daara Madjmahoune Noreyni</p>
        </div>
      </motion.div>

    </motion.div>
  );
}
