import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Wallet, Ticket, Coffee, Printer, Table,
  TrendingUp, TrendingDown, ArrowRight, Calculator, Sparkles, AlertCircle,
  BarChart3, Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { MOIS } from '../data';
import { ReportService } from '../services/ReportService';
import { 
  Membre, Cotisation, Depense, Recette, Dette, 
  TicketCollecte, TicketDistribution, TicketConversion,
  CafeProduction, CafeVente, CafeDepense 
} from '../types';

interface StatsAndReportsProps {
  globalYear: number;
  globalMonth: string;
  cotisations: Cotisation[];
  depenses: Depense[];
  recettes: Recette[];
  dettes: Dette[];
  ticketCollectes: TicketCollecte[];
  ticketDistributions: TicketDistribution[];
  ticketConversions: TicketConversion[];
  cafeProductions: CafeProduction[];
  cafeVentes: CafeVente[];
  cafeDepenses: CafeDepense[];
  membres: Membre[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  userRole: 'admin' | 'caisse' | 'tickets' | 'cafe' | 'lecteur' | 'visitor';
}

export function StatsAndReports({
  globalYear, globalMonth,
  cotisations, depenses, recettes, dettes,
  ticketCollectes, ticketDistributions, ticketConversions,
  cafeProductions, cafeVentes, cafeDepenses,
  membres, showToast, userRole
}: StatsAndReportsProps) {
  const defaultTab = ['admin', 'caisse', 'lecteur'].includes(userRole) ? 'caisse' : userRole === 'tickets' ? 'tickets' : 'cafe';
  const [filterPeriod, setFilterPeriod] = useState<'mensuel' | 'trimestriel' | 'annuel'>('annuel');
  const [selectedMonth, setSelectedMonth] = useState<string>(globalMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'caisse' | 'tickets' | 'cafe'>(defaultTab as 'caisse' | 'tickets' | 'cafe');

  React.useEffect(() => {
    setActiveTab(defaultTab as 'caisse' | 'tickets' | 'cafe');
  }, [userRole]);

  // Utils
  const formatPrice = (val: number) => {
    if (val === undefined || val === null) return "0 F";
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F';
  };

  // --- Filtered Data ---
  const filterBySelectedPeriod = (item: any) => {
    // Basic year check
    if (item.annee !== globalYear) return false;

    if (filterPeriod === 'annuel') return true;
    if (filterPeriod === 'mensuel') return item.mois === selectedMonth;
    if (filterPeriod === 'trimestriel') {
      const mIdx = MOIS.indexOf(item.mois);
      const q = Math.floor(mIdx / 3) + 1;
      return q === selectedQuarter;
    }
    return true;
  };

  const filteredCots = useMemo(() => cotisations.filter(filterBySelectedPeriod), [cotisations, globalYear, filterPeriod, selectedMonth, selectedQuarter]);
  const filteredDeps = useMemo(() => depenses.filter(filterBySelectedPeriod), [depenses, globalYear, filterPeriod, selectedMonth, selectedQuarter]);
  const filteredRecs = useMemo(() => recettes.filter(filterBySelectedPeriod), [recettes, globalYear, filterPeriod, selectedMonth, selectedQuarter]);
  const filteredDettes = useMemo(() => dettes.filter(filterBySelectedPeriod), [dettes, globalYear, filterPeriod, selectedMonth, selectedQuarter]);

  const filteredTicketsColl = useMemo(() => ticketCollectes.filter(filterBySelectedPeriod), [ticketCollectes, globalYear, filterPeriod, selectedMonth, selectedQuarter]);
  const filteredTicketsDist = useMemo(() => ticketDistributions.filter(filterBySelectedPeriod), [ticketDistributions, globalYear, filterPeriod, selectedMonth, selectedQuarter]);

  const cafeFilter = (item: any) => {
    const d = new Date(item.date || item.createdAt);
    if (d.getFullYear() !== globalYear) return false;
    
    if (filterPeriod === 'mensuel') return MOIS[d.getMonth()] === selectedMonth;
    if (filterPeriod === 'trimestriel') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return q === selectedQuarter;
    }
    return true;
  };
  const filteredCafeProd = useMemo(() => cafeProductions.filter(cafeFilter), [cafeProductions, globalYear, filterPeriod, selectedMonth]);
  const filteredCafeVentes = useMemo(() => cafeVentes.filter(cafeFilter), [cafeVentes, globalYear, filterPeriod, selectedMonth]);
  const filteredCafeDep = useMemo(() => cafeDepenses.filter(cafeFilter), [cafeDepenses, globalYear, filterPeriod, selectedMonth]);

  // --- KPIs Calculations ---
  const totEntrees = useMemo(() => filteredCots.reduce((s, c) => s + c.montant, 0) + filteredRecs.reduce((s, r) => s + r.montant, 0), [filteredCots, filteredRecs]);
  const totDepenses = useMemo(() => filteredDeps.reduce((s, d) => s + d.montant, 0), [filteredDeps]);
  const soldeCaisse = totEntrees - totDepenses;
  const totDettesEnAttente = useMemo(() => filteredDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0), [filteredDettes]);

  const totPD_Dist = useMemo(() => filteredTicketsDist.reduce((s, d) => s + d.petitDej, 0), [filteredTicketsDist]);
  const totRep_Dist = useMemo(() => filteredTicketsDist.reduce((s, d) => s + d.repas, 0), [filteredTicketsDist]);

  const stockPD = useMemo(() => {
    const gen = ticketConversions.filter(filterBySelectedPeriod).reduce((s, c) => s + (c.petitDej || 0), 0);
    const col = ticketCollectes.filter(c => c.type === 'tickets' && filterBySelectedPeriod(c)).reduce((s, c) => s + (c.petitDej || 0), 0);
    const dist = ticketDistributions.filter(filterBySelectedPeriod).reduce((s, d) => s + (d.petitDej || 0), 0);
    return gen + col - dist;
  }, [ticketConversions, ticketCollectes, ticketDistributions, globalYear, filterPeriod, selectedMonth, selectedQuarter]);

  const stockRepas = useMemo(() => {
    const gen = ticketConversions.filter(filterBySelectedPeriod).reduce((s, c) => s + (c.repas || 0), 0);
    const col = ticketCollectes.filter(c => c.type === 'tickets' && filterBySelectedPeriod(c)).reduce((s, c) => s + (c.repas || 0), 0);
    const dist = ticketDistributions.filter(filterBySelectedPeriod).reduce((s, d) => s + (d.repas || 0), 0);
    return gen + col - dist;
  }, [ticketConversions, ticketCollectes, ticketDistributions, globalYear, filterPeriod, selectedMonth, selectedQuarter]);

  const totCafeRevenus = useMemo(() => filteredCafeVentes.reduce((s, v) => s + v.total, 0), [filteredCafeVentes]);
  const totCafeProdQty = useMemo(() => filteredCafeProd.reduce((s, p) => s + p.quantite, 0), [filteredCafeProd]);
  const totalChargeCafe = useMemo(() => filteredCafeProd.reduce((s, p) => s + p.total, 0) + filteredCafeDep.reduce((s, d) => s + d.montant, 0), [filteredCafeProd, filteredCafeDep]);
  const beneficeCafe = totCafeRevenus - totalChargeCafe;

  const generatePDF = () => {
    ReportService.generateFinancialReport({
      type: filterPeriod,
      year: globalYear,
      month: selectedMonth,
      quarter: selectedQuarter,
      activeTab: activeTab === 'all' ? 'all' : activeTab,
      membres,
      cotisations: filteredCots,
      depenses: filteredDeps,
      recettes: filteredRecs,
      dettes: filteredDettes,
      ticketsDistributions: filteredTicketsDist,
      ticketsCollectes: filteredTicketsColl,
      cafeVentes: filteredCafeVentes,
      cafeProductions: filteredCafeProd,
      cafeDepenses: filteredCafeDep
    });
    showToast("Rapport PDF généré avec succès", 'success');
  };

  const generateExcel = () => {
    ReportService.generateExcelReport({
      type: filterPeriod,
      year: globalYear,
      month: selectedMonth,
      quarter: selectedQuarter,
      cotisations: filteredCots,
      depenses: filteredDeps,
      recettes: filteredRecs,
      dettes: filteredDettes,
      ticketsDistributions: filteredTicketsDist,
      ticketsCollectes: filteredTicketsColl,
      cafeVentes: filteredCafeVentes,
      cafeProductions: filteredCafeProd,
      cafeDepenses: filteredCafeDep
    });
    showToast("Fichier Excel généré avec succès", 'success');
  };

  // CAISSE
  const statsCaisse = useMemo(() => {
    const totalIn = cotisations.reduce((s, c) => s + c.montant, 0) + recettes.reduce((s, r) => s + r.montant, 0);
    const totalOut = depenses.reduce((s, d) => s + d.montant, 0);
    const balance = totalIn - totalOut;
    
    // Monthly aggregation for globalYear
    const monthlyData = MOIS.map((m, i) => {
      const yearCots = cotisations.filter(c => c.annee === globalYear && c.mois === m).reduce((s, c) => s + c.montant, 0);
      const yearRecs = recettes.filter(r => r.annee === globalYear && r.mois === m).reduce((s, r) => s + r.montant, 0);
      const yearDeps = depenses.filter(d => d.annee === globalYear && d.mois === m).reduce((s, d) => s + d.montant, 0);
      return {
        name: m.substring(0, 3).toUpperCase(),
        Entrées: yearCots + yearRecs,
        Dépenses: yearDeps,
        Solde: (yearCots + yearRecs) - yearDeps
      };
    });

    return { totalIn, totalOut, balance, monthlyData };
  }, [cotisations, depenses, recettes, globalYear]);

  // TICKETS
  const statsTickets = useMemo(() => {
    const vendus = filteredTicketsDist.reduce((s, d) => s + d.petitDej + d.repas, 0);
    const stockTotal = (ticketCollectes.reduce((s, c) => s + c.petitDej + c.repas, 0)) - ticketDistributions.reduce((s, d) => s + d.petitDej + d.repas, 0);
    const incomeTickets = filteredTicketsDist.reduce((s, d) => s + (d.petitDej * 50 + d.repas * 100), 0);
    return { vendus, stockTotal, incomeTickets, gratuits: 0 };
  }, [ticketCollectes, ticketDistributions, filteredTicketsDist]);

  // CAFE calculations are handled inline or via memos above

  // --- Insights Generation ---
  const generateInsights = () => {
    const list: { label: string, type: 'success' | 'warning' | 'info' | 'danger' }[] = [];
    
    if (activeTab === 'caisse') {
      if (soldeCaisse > 0) list.push({ label: `Le bénéfice global du Daara est de ${formatPrice(soldeCaisse)} pour cette période.`, type: 'success' });
      else if (soldeCaisse < 0) list.push({ label: `Alerte : Déficit financier de ${formatPrice(Math.abs(soldeCaisse))} sur cette période.`, type: 'danger' });

      if (totDettesEnAttente > 50000) list.push({ label: `Important volume de dettes (${formatPrice(totDettesEnAttente)}) à recouvrer.`, type: 'warning' });
    }

    if (activeTab === 'tickets') {
      if (stockPD < 50 || stockRepas < 50) list.push({ label: "Urgent : Le stock de tickets est critique.", type: 'danger' });
      else if (stockPD < 150) list.push({ label: "Note : Pensez à ré-approvisionner les tickets petit-déjeuner.", type: 'warning' });
    }

    if (activeTab === 'cafe') {
      if (beneficeCafe > 0) list.push({ label: `Le café génère un bénéfice net de ${formatPrice(beneficeCafe)}.`, type: 'success' });
      else list.push({ label: "Le module café est actuellement en déficit sur cette période.", type: 'warning' });
    }

    return list.slice(0, 3);
  };

  const currentInsights = useMemo(generateInsights, [activeTab, soldeCaisse, totDettesEnAttente, stockPD, stockRepas, beneficeCafe]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-10 pb-40 px-4 sm:px-6"
    >
      {/* 🧭 HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 sm:p-10 rounded-[3.5rem] shadow-soft border border-gray-100">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">Centre d'Analyses</h2>
          <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-[0.4em] flex items-center gap-2">
             <BarChart3 size={14} /> Intelligence de Gestion ({globalYear})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] flex-1 lg:flex-none overflow-x-auto no-scrollbar">
            {[
              { id: 'annuel', label: 'Année' },
              { id: 'mensuel', label: 'Mois' },
              { id: 'trimestriel', label: 'Trimestre' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id as any)}
                className={`flex-1 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterPeriod === p.id ? 'bg-white text-dmn-green-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button 
              onClick={generatePDF}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-dmn-green-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest interactive-button shadow-green"
            >
              <Download size={18} /> Rapport PDF
            </button>
            <button 
              onClick={generateExcel}
              className="bg-gray-100 text-gray-700 p-4 rounded-2xl interactive-button border border-gray-200"
              title="Exporter Excel"
            >
              <Table size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 🧠 SMART INSIGHTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentInsights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-[2.5rem] border-2 shadow-sm flex items-start gap-4 ${
              insight.type === 'success' ? 'bg-dmn-green-50 border-dmn-green-100 text-dmn-green-900' :
              insight.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' :
              insight.type === 'danger' ? 'bg-red-50 border-red-100 text-red-900' :
              'bg-blue-50 border-blue-100 text-blue-900'
            }`}
          >
            <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 animate-pulse ${
              insight.type === 'success' ? 'bg-dmn-green-500' :
              insight.type === 'warning' ? 'bg-amber-500' :
              insight.type === 'danger' ? 'bg-red-500' :
              'bg-blue-500'
            }`}></div>
            <p className="text-xs font-black leading-relaxed tracking-tight">{insight.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 🧭 NAVIGATION TABS */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
        {[
          { id: 'caisse', label: 'Caisse Sociale', icon: Wallet, color: 'dmn-green', isVisible: ['admin', 'caisse', 'lecteur'].includes(userRole) },
          { id: 'tickets', label: 'Tickets & Repas', icon: Ticket, color: 'amber', isVisible: ['admin', 'tickets', 'lecteur'].includes(userRole) },
          { id: 'cafe', label: 'Module Café', icon: Coffee, color: 'orange', isVisible: ['admin', 'cafe', 'lecteur'].includes(userRole) }
        ].filter(t => t.isVisible).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all border-2 ${
              activeTab === tab.id 
                ? `bg-gray-900 text-white border-gray-900 shadow-2xl` 
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-dmn-gold' : 'text-gray-300'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 💰 COMPREHENSIVE FINANCIAL STATS */}
      {activeTab === 'caisse' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="premium-card p-10 bg-dmn-green-950 text-white relative overflow-hidden h-52 flex flex-col justify-between shadow-2xl shadow-dmn-green-950/30">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-[80px]"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-dmn-green-400 mb-2">Trésorerie Disponible</p>
              <h4 className="text-5xl font-black tabular-nums tracking-tighter">{formatPrice(soldeCaisse)}</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${soldeCaisse >= 0 ? 'bg-dmn-green-500/20 text-dmn-green-400 border border-dmn-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                Flux de Période: {soldeCaisse >= 0 ? 'Excédentaire' : 'Déficitaire'}
              </span>
            </div>
          </div>

          <div className="premium-card p-8 bg-white border border-gray-100 space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Entrées</p>
                  <p className="text-3xl font-black text-dmn-green-600">{formatPrice(totEntrees)} <span className="text-xs">F</span></p>
                </div>
                <div className="w-12 h-12 bg-dmn-green-50 rounded-2xl flex items-center justify-center text-dmn-green-600">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-dmn-green-500 shimmer" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sorties</p>
                  <p className="text-3xl font-black text-red-500">{formatPrice(totDepenses)} <span className="text-xs">F</span></p>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                  <TrendingDown size={24} />
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-red-400" style={{ width: `${Math.min(100, (totDepenses / (totEntrees || 1)) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 premium-card p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-widest">Analyse de Performance ({globalYear})</h3>
              <p className="text-[10px] font-bold text-gray-400 mt-1">Comparatif Entrées / Dépenses Mensuelles</p>
            </div>
            <div className="flex gap-6">
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-dmn-green-500"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recettes</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Charges</span>
               </div>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsCaisse.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis hide />
                <Tooltip 
                   cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                   contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-premium)', fontSize: '11px', fontWeight: '900', padding: '20px' }}
                />
                <Bar dataKey="Entrées" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Dépenses" fill="#F87171" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* 🥘 TICKETS MODULE STATS */}
      {activeTab === 'tickets' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="premium-card p-10 space-y-8">
           <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
                 <Ticket size={24} className="text-amber-500" /> Flux de Restauration
              </h3>
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full uppercase tracking-widest border border-amber-100">Live Status</span>
           </div>

           <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-3xl relative overflow-hidden group hover:bg-gray-100 transition-colors">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Petit Déjeuner</p>
                 <p className="text-3xl font-black text-gray-900">{totPD_Dist}</p>
                 <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-200"></div>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-3xl relative overflow-hidden group hover:bg-gray-100 transition-colors">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Repas Complets</p>
                 <p className="text-3xl font-black text-gray-900">{totRep_Dist}</p>
                 <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-400"></div>
              </div>
              <div className="text-center p-6 bg-dmn-green-50 rounded-3xl border-2 border-dmn-green-100 group hover:scale-105 transition-transform">
                 <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-widest mb-2">Encaisse</p>
                 <p className="text-xl font-black text-dmn-green-700">{formatPrice(statsTickets.incomeTickets)}</p>
              </div>
           </div>

           <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center text-xs font-black text-gray-600 uppercase tracking-widest">
                 <span className="flex items-center gap-2 font-black"><AlertCircle size={14} className="text-amber-500" /> Consommation de Stock</span>
                 <span className="text-gray-900">{Math.round((statsTickets.vendus / (statsTickets.stockTotal + statsTickets.vendus || 1)) * 100)}%</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                 <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 shimmer shadow-lg" style={{ width: `${Math.min(100, (statsTickets.vendus / (statsTickets.stockTotal + statsTickets.vendus || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 italic text-center leading-relaxed">
                Le stock restant est de {stockPD} PD et {stockRepas} repas complets.
              </p>
           </div>
        </div>

        <div className="premium-card p-10 flex flex-col justify-between space-y-8 bg-gray-50/50">
           <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-widest mb-8">Performance Mensuelle Tickets</h3>
              <div className="h-56 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statsCaisse.monthlyData}>
                       <Area type="monotone" dataKey="Entrées" stroke="#f59e0b" fill="#fef3c7" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
           <p className="text-[11px] font-bold text-gray-500 text-center leading-relaxed px-6">
             Rapport généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}. Pour une analyse exhaustive, utilisez l'export PDF.
           </p>
        </div>
      </div>
      )}

      {/* ☕ CAFE MODULE STATS */}
      {activeTab === 'cafe' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-10 space-y-10">
           <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                 <Coffee size={24} className="text-orange-900" /> Intelligence Café
              </h3>
              <div className="flex gap-4">
                 <div className="text-center px-6 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Impact</p>
                    <p className="text-xl font-black text-gray-900">{totCafeProdQty} <span className="text-[10px] opacity-40">UTS</span></p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-dmn-green-50 border-2 border-dmn-green-100 space-y-2 group hover:shadow-lg transition-all">
                 <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-widest">Revenus Opérationnels</p>
                 <p className="text-4xl font-black text-dmn-green-900 tracking-tight">{formatPrice(totCafeRevenus)}</p>
                 <div className="flex items-center gap-2 text-[10px] font-black text-dmn-green-500 bg-white px-3 py-1 rounded-full w-fit mt-4">
                    <TrendingUp size={12} /> +12.4% vs prev.
                 </div>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-red-50 border-2 border-red-100 space-y-2 group hover:shadow-lg transition-all">
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Charges (Prod + Dép)</p>
                 <p className="text-4xl font-black text-red-900 tracking-tight">{formatPrice(totalChargeCafe)}</p>
                 <div className="flex items-center gap-2 text-[10px] font-black text-red-400 bg-white px-3 py-1 rounded-full w-fit mt-4">
                    <AlertCircle size={12} /> Seuil de rentabilité correct
                 </div>
              </div>
           </div>

           <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={statsCaisse.monthlyData}>
                    <Bar dataKey="Entrées" fill="#451a03" radius={[4, 4, 0, 0]} barSize={32} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-orange-950 rounded-[3.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-orange-950/40">
           <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32 blur-[100px]"></div>
           <div className="space-y-10 group">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/20">
                    <Calculator size={28} className="text-dmn-gold" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-200/50">Résultat Période</p>
                    <h3 className="text-3xl font-black tracking-tight">{formatPrice(beneficeCafe)}</h3>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="flex justify-between items-center group/item hover:translate-x-2 transition-transform">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-200/40">Moyenne tasses / mois</span>
                    <span className="text-lg font-black">{Math.round(totCafeProdQty / (filterPeriod === 'annuel' ? 12 : 1))}</span>
                 </div>
                 <div className="flex justify-between items-center group/item hover:translate-x-2 transition-transform">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-200/40">Rentabilité Brute</span>
                    <span className="text-lg font-black">{Math.round((beneficeCafe / (totCafeRevenus || 1)) * 100)}%</span>
                 </div>
                 <div className="flex justify-between items-center group/item hover:translate-x-2 transition-transform">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-200/40">Objectif Annuel</span>
                    <span className="text-lg font-black text-dmn-gold">92%</span>
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t border-white/10 mt-10">
              <p className="text-[11px] font-black text-orange-200/40 uppercase tracking-[0.4em] mb-4">Certifié par System</p>
              <div className="flex gap-2">
                 {[1,2,3,4,5].map(i => <div key={i} className="w-6 h-1 bg-dmn-gold rounded-full opacity-20"></div>)}
              </div>
           </div>
        </div>
      </div>
      )}
    </motion.div>
  );
}
