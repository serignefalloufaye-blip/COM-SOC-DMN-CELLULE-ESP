import React, { useMemo } from 'react';
import { 
  CalendarRange, TrendingUp, TrendingDown, Wallet, Users, 
  BarChart3, PieChart as PieChartIcon, Activity, AlertCircle, Award, Calendar, Search
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MOIS } from '../data';
import { Membre, Cotisation, Depense, Recette, Dette } from '../types';

interface AnnuelProps {
  globalYear: number;
  setGlobalYear: (year: number) => void;
  membres: Membre[];
  cotisations: Cotisation[];
  depenses: Depense[];
  recettes: Recette[];
  dettes: Dette[];
  appSettings: any;
  globalSearch: string;
  setSelectedMemberHistory: (m: Membre) => void;
}

export const Annuel = ({ globalYear, setGlobalYear, membres, cotisations, depenses, recettes, dettes, appSettings, globalSearch, setSelectedMemberHistory }: AnnuelProps) => {
  const nomComplet = (m: Membre) => `${m.prenom} ${m.nom}`;
  
  const annualCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear), [cotisations, globalYear]);
  const annualDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear), [depenses, globalYear]);
  const annualRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear), [recettes, globalYear]);
  const annualDettes = useMemo(() => dettes.filter(d => d.annee === globalYear), [dettes, globalYear]);

  const totCot = annualCotisations.reduce((s, c) => s + c.montant, 0);
  const totRec = annualRecettes.reduce((s, r) => s + r.montant, 0);
  const totDep = annualDepenses.reduce((s, d) => s + d.montant, 0);
  
  const totDettesNonPayees = annualDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
  const totDettesPayees = annualDettes.filter(d => d.estPayee).reduce((s, d) => s + d.montant, 0);
  const solde = totCot + totRec - totDep + totDettesNonPayees - totDettesPayees;
  const moyenneMensuelle = Math.round(totCot / 12);

  const monthlyData = useMemo(() => {
    return MOIS.map(mois => {
      const cot = annualCotisations.filter(c => c.mois === mois).reduce((sum, c) => sum + c.montant, 0);
      const rec = annualRecettes.filter(r => r.mois === mois).reduce((sum, r) => sum + r.montant, 0);
      const dep = annualDepenses.filter(d => d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      
      const dnp = annualDettes.filter(d => !d.estPayee && d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      const dp = annualDettes.filter(d => d.estPayee && d.mois === mois).reduce((sum, d) => sum + d.montant, 0);
      
      return { 
        name: mois.substring(0, 3),
        fullMonth: mois,
        Cotisations: cot + rec,
        Dépenses: dep,
        Solde: (cot + rec) - dep + dnp - dp
      };
    });
  }, [annualCotisations, annualRecettes, annualDepenses, annualDettes]);

  const currentMonthIndex = new Date().getMonth();
  const currentMonthName = MOIS[currentMonthIndex];
  const currentMonthData = monthlyData.find(d => d.fullMonth === currentMonthName) || { Cotisations: 0, Dépenses: 0, Solde: 0, fullMonth: currentMonthName };

  const membresAJourCeMois = useMemo(() => {
    return membres.filter(m => {
      return cotisations.some(c => c.mId === m.id && c.annee === globalYear && c.mois === currentMonthName && c.montant > 0);
    }).length;
  }, [membres, cotisations, globalYear, currentMonthName]);

  const depensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    annualDepenses.forEach(d => {
      const cat = d.evenement || 'Autre';
      categories[cat] = (categories[cat] || 0) + d.montant;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [annualDepenses]);

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Annuel */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-dmn-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-md border-2 border-dmn-green-50 flex items-center justify-center p-2">
              <img 
                src={appSettings?.logoUrl || "logo.png"} 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <h2 className="text-3xl font-heading font-black text-dmn-green-900 tracking-tight flex items-center gap-3">
                Vue Annuelle – {globalYear}
              </h2>
              <p className="text-dmn-green-600 font-medium mt-1">Résumé global des cotisations et dépenses</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <span className="text-sm font-bold text-gray-500 pl-3">Année :</span>
            <select 
              value={globalYear} 
              onChange={(e) => setGlobalYear(Number(e.target.value))}
              className="bg-white border-none text-dmn-green-700 font-bold text-lg rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-dmn-green-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
          <Award className="text-dmn-gold" size={20} />
          <p className="text-sm font-bold text-gray-500 italic">"La rigueur dans la gestion est une responsabilité"</p>
        </div>
      </div>

      {/* Tableau de Bord Annuel (Cartes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Total Cotisations", value: totCot + totRec, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { title: "Total Dépenses", value: totDep, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
          { title: "Solde Annuel", value: solde, icon: Wallet, color: solde >= 0 ? "text-dmn-green-600" : "text-red-600", bg: solde >= 0 ? "bg-dmn-green-50" : "bg-red-50", border: solde >= 0 ? "border-dmn-green-100" : "border-red-100" },
          { title: "Total Membres", value: membres.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", isNumber: true },
          { title: "Moyenne Mensuelle", value: moyenneMensuelle, icon: Activity, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" }
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-3xl p-6 border ${stat.border} shadow-sm hover:shadow-md transition-all group hover:-translate-y-1`}>
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">{stat.title}</p>
            <h3 className={`text-2xl font-black ${stat.color}`}>
              {stat.isNumber ? stat.value : `${stat.value.toLocaleString('fr-FR')} F`}
            </h3>
          </div>
        ))}
      </div>

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-dmn-green-900 mb-6 flex items-center gap-2">
            <BarChart3 className="text-dmn-green-500" size={20} /> Évolution Mensuelle
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCot" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value.toLocaleString()} F`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Cotisations" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorCot)" />
                <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-dmn-green-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="text-dmn-green-500" size={20} /> Répartition Dépenses
          </h3>
          {depensesByCategory.length > 0 ? (
            <div className="h-[300px] w-full grow">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={depensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {depensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => `${value.toLocaleString()} F`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend layout="vertical" verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 grow">
              <PieChartIcon size={48} className="mb-4 opacity-20" />
              <p>Aucune dépense enregistrée</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphique Solde Mensuel */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-dmn-green-900 mb-6 flex items-center gap-2">
          <Activity className="text-blue-500" size={20} /> Évolution du Solde Mensuel
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [`${value.toLocaleString()} F`, 'Solde']}
              />
              <Area 
                type="monotone" 
                dataKey="Solde" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorSolde)" 
                activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Indicateurs Importants & Tableau Mensuel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Indicateurs */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-dmn-green-900 mb-4 px-2">Analyse du Mois ({currentMonthName})</h3>
          
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase">Cotisations</p>
              <p className="text-lg font-black text-emerald-900">{currentMonthData.Cotisations.toLocaleString('fr-FR')} F</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-2xl p-5 border border-red-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 uppercase">Dépenses</p>
              <p className="text-lg font-black text-red-900">{currentMonthData.Dépenses.toLocaleString('fr-FR')} F</p>
            </div>
          </div>

          <div className={`rounded-2xl p-5 border flex items-center gap-4 ${currentMonthData.Solde >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentMonthData.Solde >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
              <Wallet size={20} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase ${currentMonthData.Solde >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Solde du mois</p>
              <p className={`text-lg font-black ${currentMonthData.Solde >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                {currentMonthData.Solde > 0 ? '+' : ''}{currentMonthData.Solde.toLocaleString('fr-FR')} F
              </p>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase">Membres à jour</p>
              <p className="text-lg font-black text-purple-900">{membresAJourCeMois} / {membres.length}</p>
            </div>
          </div>
        </div>

        {/* Tableau Mensuel */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex items-center gap-2">
            <CalendarRange size={18} className="text-dmn-gold-light" /> Détail Mensuel
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Mois</th>
                  <th className="px-6 py-4 text-right">Cotisations</th>
                  <th className="px-6 py-4 text-right">Dépenses</th>
                  <th className="px-6 py-4 text-right">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthlyData.map((data, idx) => (
                  <tr key={data.name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{data.fullMonth}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">{data.Cotisations > 0 ? `${data.Cotisations.toLocaleString('fr-FR')} F` : '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">{data.Dépenses > 0 ? `${data.Dépenses.toLocaleString('fr-FR')} F` : '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold ${data.Solde > 0 ? 'text-emerald-600' : data.Solde < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {data.Solde > 0 ? '+' : ''}{data.Solde !== 0 ? `${data.Solde.toLocaleString('fr-FR')} F` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-black text-gray-900 border-t-2 border-gray-200">
                  <td className="px-6 py-4">TOTAL ANNUEL</td>
                  <td className="px-6 py-4 text-right text-emerald-600">{(totCot + totRec).toLocaleString('fr-FR')} F</td>
                  <td className="px-6 py-4 text-right text-red-600">{totDep.toLocaleString('fr-FR')} F</td>
                  <td className={`px-6 py-4 text-right ${solde >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {solde > 0 ? '+' : ''}{solde.toLocaleString('fr-FR')} F
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tableau Matrice Annuel des Membres */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="flex items-center gap-2"><Users size={18} className="text-dmn-gold-light" /> Détail des Cotisations par Membre</span>
          <div className="hidden sm:flex text-sm text-dmn-green-100 gap-4 font-normal">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-dmn-green-400 shadow-sm"></span> Payé</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></span> Non payé</span>
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
              {membres.filter(m => nomComplet(m).toLowerCase().includes(globalSearch.toLowerCase())).map((m, i) => {
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
    </div>
  );
};
