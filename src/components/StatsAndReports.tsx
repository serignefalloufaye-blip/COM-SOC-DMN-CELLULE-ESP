import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Wallet, Ticket, Coffee, Printer, Table,
  TrendingUp, TrendingDown, ArrowRight, Calculator, Sparkles, AlertCircle
} from 'lucide-react';
import { MOIS } from '../data';
import { ReportService } from '../services/ReportService';
import { 
  Membre, Cotisation, Depense, Recette, Dette, 
  TicketCollecte, TicketDistribution, 
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
  ticketCollectes, ticketDistributions,
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
  const formatPrice = (val: number) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F';

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

  // CAISSE
  const totCotis = filteredCots.reduce((s, c) => s + c.montant, 0);
  const totRecettes = filteredRecs.reduce((s, r) => s + r.montant, 0);
  const totDettesEnAttente = filteredDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
  const totDepenses = filteredDeps.reduce((s, d) => s + d.montant, 0);
  const totEntrees = totCotis + totRecettes + totDettesEnAttente;
  const soldeCaisse = totEntrees - totDepenses;

  // TICKETS
  const totPD_Coll = filteredTicketsColl.reduce((s, c) => s + c.petitDej, 0);
  const totRep_Coll = filteredTicketsColl.reduce((s, c) => s + c.repas, 0);
  const totPD_Dist = filteredTicketsDist.reduce((s, d) => s + d.petitDej, 0);
  const totRep_Dist = filteredTicketsDist.reduce((s, d) => s + d.repas, 0);
  const stockPD = ticketCollectes.reduce((sum, c) => sum + c.petitDej, 0) - ticketDistributions.reduce((sum, d) => sum + d.petitDej, 0);
  const stockRepas = ticketCollectes.reduce((sum, c) => sum + c.repas, 0) - ticketDistributions.reduce((sum, d) => sum + d.repas, 0);

  // CAFE
  const totCafeProdQty = filteredCafeProd.reduce((s, p) => s + p.quantite, 0);
  const totCafeRevenus = filteredCafeVentes.reduce((s, v) => s + v.total, 0);
  const totCafeDepenses = filteredCafeDep.reduce((s, d) => s + d.montant, 0);
  const beneficeCafe = totCafeRevenus - totCafeDepenses;

  // --- Insights Generation ---
  const insights = useMemo(() => {
    const list: { label: string, type: 'success' | 'warning' | 'info' }[] = [];
    
    if (activeTab === 'caisse') {
      if (soldeCaisse > 0) list.push({ label: `Le bénéfice global du Daara est de ${formatPrice(soldeCaisse)} pour cette période.`, type: 'success' });
      else if (soldeCaisse < 0) list.push({ label: `Déficit financier de ${formatPrice(Math.abs(soldeCaisse))} sur cette période.`, type: 'warning' });

      const prevMonthIdx = MOIS.indexOf(selectedMonth) - 1;
      if (filterPeriod === 'mensuel' && prevMonthIdx >= 0) {
        const prevMonth = MOIS[prevMonthIdx];
        const prevMonthEntrees = cotisations.filter(c => c.annee === globalYear && c.mois === prevMonth).reduce((s, c) => s + c.montant, 0) + recettes.filter(r => r.annee === globalYear && r.mois === prevMonth).reduce((s, r) => s + r.montant, 0);
        if (totEntrees > prevMonthEntrees && prevMonthEntrees > 0) {
          const increase = ((totEntrees - prevMonthEntrees) / prevMonthEntrees * 100).toFixed(1);
          list.push({ label: `Les entrées ont augmenté de ${increase}% par rapport au mois précédent.`, type: 'success' });
        }
      }
    }

    if (activeTab === 'tickets') {
      if (stockPD < 100 || stockRepas < 100) list.push({ label: "Le stock de tickets devient faible. Pensez à ré-approvisionner.", type: 'warning' });
      if (totPD_Coll > totPD_Dist) list.push({ label: "Collecte de tickets supérieure à la distribution ce mois.", type: 'info' });
    }

    if (activeTab === 'cafe') {
      if (beneficeCafe > 50000) list.push({ label: "Excellente performance du café sur cette période.", type: 'success' });
      const avgProd = totCafeProdQty / (filterPeriod === 'annuel' ? 12 : 1);
      if (avgProd > 500) list.push({ label: "Forte intensité de production café.", type: 'info' });
    }

    return list;
  }, [activeTab, soldeCaisse, totEntrees, stockPD, stockRepas, beneficeCafe, filterPeriod, selectedMonth]);

  // --- Charts Data ---
  const lineChartData = useMemo(() => {
    return MOIS.map(m => {
      const mc = cotisations.filter(c => c.annee === globalYear && c.mois === m).reduce((s, c) => s + c.montant, 0);
      const mr = recettes.filter(r => r.annee === globalYear && r.mois === m).reduce((s, r) => s + r.montant, 0);
      const mdettes = dettes.filter(d => d.annee === globalYear && d.mois === m && !d.estPayee).reduce((s, d) => s + d.montant, 0);
      const md = depenses.filter(d => d.annee === globalYear && d.mois === m).reduce((s, d) => s + d.montant, 0);
      const mEntrees = mc + mr + mdettes;
      return {
        name: m.substring(0, 3),
        Entrées: mEntrees,
        Dépenses: md,
        Solde: mEntrees - md
      };
    });
  }, [cotisations, recettes, dettes, depenses, globalYear]);

  const cafeChartData = useMemo(() => {
    return MOIS.map((m, i) => {
      const revenus = cafeVentes.filter(v => {
        const d = new Date(v.date || v.createdAt || 0);
        return d.getFullYear() === globalYear && d.getMonth() === i;
      }).reduce((s, v) => s + v.total, 0);
      return { name: m.substring(0, 3), Revenus: revenus };
    });
  }, [cafeVentes, globalYear]);

  // --- Generators ---
  const generatePDF = () => {
    ReportService.generateFinancialReport({
      type: filterPeriod,
      year: globalYear,
      month: filterPeriod === 'mensuel' ? selectedMonth : undefined,
      quarter: filterPeriod === 'trimestriel' ? selectedQuarter : undefined,
      activeTab: userRole === 'admin' ? 'all' : activeTab,
      membres,
      cotisations,
      depenses,
      recettes,
      dettes,
      ticketsCollectes: ticketCollectes,
      ticketsDistributions: ticketDistributions,
      cafeProductions: cafeProductions,
      cafeVentes: cafeVentes,
      cafeDepenses: cafeDepenses
    });
    showToast(`Rapport PDF ${filterPeriod} généré`, 'success');
  };

  const generateExcel = () => {
    ReportService.generateExcelReport({
      type: filterPeriod,
      year: globalYear,
      month: filterPeriod === 'mensuel' ? selectedMonth : undefined,
      quarter: filterPeriod === 'trimestriel' ? selectedQuarter : undefined,
      cotisations,
      depenses,
      recettes,
      dettes,
      ticketsCollectes: ticketCollectes,
      ticketsDistributions: ticketDistributions,
      cafeProductions: cafeProductions,
      cafeVentes: cafeVentes,
      cafeDepenses: cafeDepenses
    });
    showToast(`Rapport Excel généré`, 'success');
  };

  return (
    <div className="space-y-6 pb-24 px-4 sm:px-0">
      {/* BRANDING HEADER */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daara M.</h1>
        <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-[0.3em]">Système de Gestion – Daara M.</p>
        <div className="w-12 h-1 bg-dmn-green-500 mx-auto rounded-full opacity-50"></div>
        <p className="text-[9px] font-medium text-gray-400 italic">“La transparence est une responsabilité”</p>
      </div>

      {/* HEADER & FILTERS */}
      <div className="bg-white rounded-[2.5rem] p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-50 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto no-scrollbar">
          {['mensuel', 'trimestriel', 'annuel'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPeriod(p as any)}
              className={`flex-1 sm:flex-none capitalize px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filterPeriod === p ? 'bg-white shadow-sm text-dmn-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {p}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {filterPeriod === 'mensuel' && (
            <select 
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-dmn-green-500 transition-all appearance-none"
            >
              {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          {filterPeriod === 'trimestriel' && (
            <select 
              value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-dmn-green-500 transition-all appearance-none"
            >
              {[1,2,3,4].map(q => <option key={q} value={q}>Trimestre {q}</option>)}
            </select>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={generatePDF}
              className="flex-1 bg-dmn-green-600 hover:bg-dmn-green-700 text-white rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-dmn-green-600/20 active:scale-95 transition-all"
            >
              <Printer size={16} /> PDF
            </button>
            <button 
              onClick={generateExcel}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Table size={16} /> EXCEL
            </button>
          </div>
        </div>
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {insights.map((insight, idx) => (
            <div key={idx} className={`flex items-start gap-4 p-4 rounded-3xl border animate-in slide-in-from-top-2 duration-300 ${
              insight.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
              insight.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <div className="mt-0.5 shrink-0">
                {insight.type === 'warning' ? <AlertCircle size={18}/> : <Sparkles size={18}/>}
              </div>
              <p className="text-xs font-bold leading-relaxed">{insight.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* MODULE TABS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-2">
        {['admin', 'caisse', 'lecteur'].includes(userRole) && (
          <button onClick={() => setActiveTab('caisse')} className={`snap-center flex-shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all border ${activeTab === 'caisse' ? 'bg-dmn-green-600 text-white border-dmn-green-600 shadow-xl' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <Wallet size={16} /> Caisse Sociale
          </button>
        )}
        {['admin', 'tickets', 'lecteur'].includes(userRole) && (
          <button onClick={() => setActiveTab('tickets')} className={`snap-center flex-shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all border ${activeTab === 'tickets' ? 'bg-amber-500 text-white border-amber-500 shadow-xl' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <Ticket size={16} /> Tickets
          </button>
        )}
        {['admin', 'cafe', 'lecteur'].includes(userRole) && (
          <button onClick={() => setActiveTab('cafe')} className={`snap-center flex-shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all border ${activeTab === 'cafe' ? 'bg-brown-600 text-white border-brown-600 shadow-xl' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <Coffee size={16} /> Café
          </button>
        )}
      </div>

      {/* STATS CONTENT */}
      {activeTab === 'caisse' && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><TrendingUp size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Entrées</p>
              <p className="text-xl font-black text-gray-900">{formatPrice(totEntrees)}</p></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0"><TrendingDown size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dépenses</p>
              <p className="text-xl font-black text-gray-900">{formatPrice(totDepenses)}</p></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow ring-2 ring-blue-100/50">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Wallet size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Solde</p>
              <p className="text-xl font-black text-blue-600">{formatPrice(soldeCaisse)}</p></div>
            </div>
          </div>
          
          <div className="bg-white p-5 sm:p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mt-4">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-[11px] mb-6 flex items-center gap-2">
              <TrendingUp size={16} className="text-dmn-green-500"/> Évolution du Solde Global
            </h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip wrapperClassName="rounded-xl border-none shadow-xl text-xs font-bold" />
                  <Area type="monotone" dataKey="Solde" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorSolde)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0"><Ticket size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Collecte</p>
              <p className="text-sm font-black text-gray-900">{totPD_Coll} PD | {totRep_Coll} Repas</p></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0"><ArrowRight size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Distribution</p>
              <p className="text-sm font-black text-gray-900">{totPD_Dist} PD | {totRep_Dist} Repas</p></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Calculator size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Stock</p>
              <p className="text-sm font-black text-blue-600">{stockPD} PD | {stockRepas} Repas</p></div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-[2rem] p-6 text-center border border-amber-100 mt-4">
             <p className="text-amber-700 font-bold text-xs leading-relaxed italic">“Le rapport exporté contient l'historique complet des mouvements pour une traçabilité totale.”</p>
          </div>
        </div>
      )}

      {activeTab === 'cafe' && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
           <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Production</p>
              <p className="text-xl font-black text-gray-900">{totCafeProdQty} <span className="text-xs text-gray-400">tasses</span></p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Revenus</p>
              <p className="text-xl font-black text-emerald-600">{formatPrice(totCafeRevenus)}</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dépenses</p>
              <p className="text-xl font-black text-red-600">{formatPrice(totCafeDepenses)}</p>
            </div>
            <div className="bg-brown-600 p-5 rounded-[2rem] border border-brown-700 shadow-lg shadow-brown-600/20">
              <p className="text-[10px] font-black text-brown-200 uppercase tracking-widest leading-none mb-1">Bénéfice</p>
              <p className="text-xl font-black text-white">{formatPrice(beneficeCafe)}</p>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mt-4">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-[11px] mb-6 flex items-center gap-2">
              <Coffee size={16} className="text-brown-500"/> Revenus Café (Année)
            </h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cafeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip wrapperClassName="rounded-xl border-none shadow-xl text-xs font-bold" cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="Revenus" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
