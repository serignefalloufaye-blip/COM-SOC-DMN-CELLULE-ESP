import React, { useState, useMemo } from 'react';
import { Membre, TicketCollecte, TicketConversion, TicketDistribution } from '../types';
import { MOIS } from '../data';
import { Search, Filter, TrendingUp, TrendingDown, Users, Package, Navigation, Calendar, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface TicketsStatsProps {
  membres: Membre[];
  collectes: TicketCollecte[];
  conversions: TicketConversion[];
  distributions: TicketDistribution[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export function TicketsStats({ membres, collectes, conversions, distributions }: TicketsStatsProps) {
  const [filterYear, setFilterYear] = useState<number | ''>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterTrimestre, setFilterTrimestre] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchMembre, setSearchMembre] = useState<string>('');

  const trimestres = {
    'T1': ['Janvier', 'Février', 'Mars'],
    'T2': ['Avril', 'Mai', 'Juin'],
    'T3': ['Juillet', 'Août', 'Septembre'],
    'T4': ['Octobre', 'Novembre', 'Décembre'],
  };

  const getMonthIndex = (m: string) => MOIS.indexOf(m);

  // Filter Data
  const filteredCollectes = useMemo(() => {
    return collectes.filter(c => {
      const matchYear = filterYear === '' || c.annee === filterYear;
      const matchMonth = filterMonth === '' || c.mois === filterMonth;
      const matchTrimestre = filterTrimestre === '' || trimestres[filterTrimestre as keyof typeof trimestres].includes(c.mois);
      const membre = membres.find(m => m.id === c.mId);
      const matchMembre = searchMembre === '' || (membre && `${membre.prenom} ${membre.nom}`.toLowerCase().includes(searchMembre.toLowerCase()));
      const matchType = filterType === '' || filterType === 'Collecte';
      return matchYear && matchMonth && matchTrimestre && matchMembre && matchType;
    });
  }, [collectes, filterYear, filterMonth, filterTrimestre, searchMembre, filterType, membres]);

  const filteredConversions = useMemo(() => {
    return conversions.filter(c => {
      const date = new Date(c.createdAt || 0);
      const cYear = date.getFullYear();
      const cMonth = MOIS[date.getMonth()];
      const matchYear = filterYear === '' || cYear === filterYear;
      const matchMonth = filterMonth === '' || cMonth === filterMonth;
      const matchTrimestre = filterTrimestre === '' || trimestres[filterTrimestre as keyof typeof trimestres].includes(cMonth);
      const matchMembre = searchMembre === ''; // Conversions have no member, so if member is searched, this usually hides unless we ignore
      const matchType = filterType === '' || filterType === 'Conversion';
      return matchYear && matchMonth && matchTrimestre && matchMembre && matchType;
    });
  }, [conversions, filterYear, filterMonth, filterTrimestre, searchMembre, filterType]);

  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => {
      const matchYear = filterYear === '' || d.annee === filterYear;
      const matchMonth = filterMonth === '' || d.mois === filterMonth;
      const matchTrimestre = filterTrimestre === '' || trimestres[filterTrimestre as keyof typeof trimestres].includes(d.mois);
      const membre = membres.find(m => m.id === d.mId);
      const matchMembre = searchMembre === '' || (membre && `${membre.prenom} ${membre.nom}`.toLowerCase().includes(searchMembre.toLowerCase()));
      const matchType = filterType === '' || filterType === 'Distribution';
      return matchYear && matchMonth && matchTrimestre && matchMembre && matchType;
    });
  }, [distributions, filterYear, filterMonth, filterTrimestre, searchMembre, filterType, membres]);

  // Indicators
  const totalArgentCollecte = filteredCollectes.filter(c => c.type === 'argent').reduce((s, c) => s + (c.montantArgent || 0), 0);
  const totalPDCollectes = filteredCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.petitDej || 0), 0);
  const totalRepasCollectes = filteredCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.repas || 0), 0);
  
  const totalPDCov = filteredConversions.reduce((s, c) => s + (c.petitDej || 0), 0);
  const totalRepasCov = filteredConversions.reduce((s, c) => s + (c.repas || 0), 0);
  
  const totalPDDist = filteredDistributions.reduce((s, d) => s + (d.petitDej || 0), 0);
  const totalRepasDist = filteredDistributions.reduce((s, d) => s + (d.repas || 0), 0);

  const stockPD = (totalPDCollectes + totalPDCov) - totalPDDist;
  const stockRepas = (totalRepasCollectes + totalRepasCov) - totalRepasDist;

  const membresContributeurs = new Set([
    ...filteredCollectes.map(c => c.mId),
    ...filteredDistributions.map(d => d.mId)
  ]).size;

  // Chart Data
  const collectesParMois = MOIS.map(mois => {
    const cols = filteredCollectes.filter(c => c.mois === mois);
    const pd = cols.reduce((s, c) => s + (c.petitDej || 0), 0);
    const repas = cols.reduce((s, c) => s + (c.repas || 0), 0);
    const argent = cols.reduce((s, c) => s + (c.montantArgent || 0), 0);
    return { name: mois.substring(0, 3), pd, repas, argent };
  });

  const distParMois = MOIS.map(mois => {
    const dist = filteredDistributions.filter(d => d.mois === mois);
    const pd = dist.reduce((s, d) => s + (d.petitDej || 0), 0);
    const repas = dist.reduce((s, d) => s + (d.repas || 0), 0);
    return { name: mois.substring(0, 3), pd, repas };
  });

  const pieData = [
    { name: 'Petit Dèj', value: stockPD },
    { name: 'Repas', value: stockRepas },
  ].filter(d => d.value > 0);

  // Historique unifié
  const historique = [
    ...filteredCollectes.map(c => ({
      id: c.id,
      date: c.createdAt || 0,
      mId: c.mId,
      type: 'Collecte',
      detail: c.type === 'argent' ? `+${c.montantArgent} FCFA` : `+${c.petitDej} PD, +${c.repas} RP`
    })),
    ...filteredConversions.map(c => ({
      id: c.id,
      date: c.createdAt || 0,
      mId: null,
      type: 'Conversion',
      detail: `-${c.montant} FCFA ➔ +${c.petitDej} PD, +${c.repas} RP`
    })),
    ...filteredDistributions.map(d => ({
      id: d.id,
      date: d.createdAt || 0,
      mId: d.mId,
      type: 'Distribution',
      detail: `-${d.petitDej} PD, -${d.repas} RP`
    }))
  ].sort((a, b) => b.date - a.date);

  // Stats par membre
  const statsMembres = membres.map(m => {
    const cols = filteredCollectes.filter(c => c.mId === m.id);
    const dists = filteredDistributions.filter(d => d.mId === m.id);
    const totalArgent = cols.reduce((s, c) => s + (c.montantArgent || 0), 0);
    const totalPDCol = cols.reduce((s, c) => s + (c.petitDej || 0), 0);
    const totalRepasCol = cols.reduce((s, c) => s + (c.repas || 0), 0);
    const moisPayes = new Set(cols.map(c => c.mois)).size;
    const totalPDDistMembre = dists.reduce((s, d) => s + (d.petitDej || 0), 0);
    const totalRepasDistMembre = dists.reduce((s, d) => s + (d.repas || 0), 0);
    return {
      m,
      totalArgent,
      totalPDCol,
      totalRepasCol,
      moisPayes,
      totalPDDistMembre,
      totalRepasDistMembre,
      nbTicketsRecus: totalPDDistMembre + totalRepasDistMembre
    };
  }).filter(sm => sm.totalArgent > 0 || sm.totalPDCol > 0 || sm.totalRepasCol > 0 || sm.nbTicketsRecus > 0)
    .sort((a, b) => b.totalArgent - a.totalArgent);

  return (
    <div className="space-y-6">
      {/* Barre de Filtres */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-dmn-green-600" />
          <span className="font-bold text-sm text-gray-700">Filtres :</span>
        </div>
        
        <select value={filterYear} onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : '')} className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-dmn-green-500">
          <option value="">Toutes les années</option>
          {Array.from(new Set([...collectes.map(c => c.annee), new Date().getFullYear()])).sort().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-dmn-green-500">
          <option value="">Tous les mois</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={filterTrimestre} onChange={e => setFilterTrimestre(e.target.value)} className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-dmn-green-500">
          <option value="">Tous les trimestres</option>
          <option value="T1">T1 (Jan-Mar)</option>
          <option value="T2">T2 (Avr-Jun)</option>
          <option value="T3">T3 (Jul-Sep)</option>
          <option value="T4">T4 (Oct-Déc)</option>
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-dmn-green-500">
          <option value="">Tous les types</option>
          <option value="Collecte">Collecte</option>
          <option value="Conversion">Conversion</option>
          <option value="Distribution">Distribution</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher un membre..." 
            value={searchMembre} 
            onChange={e => setSearchMembre(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-dmn-green-500"
          />
        </div>
      </div>

      {/* Cartes Indicateurs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Argent Collecté</p>
          <p className="text-xl font-black text-emerald-600">{totalArgentCollecte} F</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total P.D (50F)</p>
          <p className="text-xl font-black text-blue-600">{totalPDCollectes + totalPDCov}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Repas (100F)</p>
          <p className="text-xl font-black text-indigo-600">{totalRepasCollectes + totalRepasCov}</p>
        </div>
        <div className="bg-green-600 p-4 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center text-white">
          <p className="text-[10px] uppercase font-bold text-green-200 mb-1">Stock Actuel</p>
          <p className="text-xl font-black">{stockPD} PD / {stockRepas} RP</p>
          {(stockPD < 10 || stockRepas < 10) && (
             <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full mt-1 animate-pulse">Stock Faible!</span>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Distribués</p>
          <p className="text-xl font-black text-orange-600">{totalPDDist + totalRepasDist}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Contributeurs</p>
          <p className="text-xl font-black text-gray-800">{membresContributeurs} 👥</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-dmn-green-500"/> Évolution des Collectes</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectesParMois}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={40} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={40} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" name="Argent (FCFA)" dataKey="argent" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                <Line yAxisId="right" type="step" name="P.D" dataKey="pd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="step" name="Repas" dataKey="repas" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-orange-500"/> Tickets Distribués</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distParMois}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={30} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar name="Petit Dèj" dataKey="pd" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar name="Repas" dataKey="repas" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col lg:col-span-2 lg:flex-row gap-6">
           <div className="flex-1">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-500"/> État du Stock</h3>
             <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" verticalAlign="middle" layout="vertical" align="right" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
           
           <div className="flex-[2] overflow-x-auto">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={18} className="text-purple-500"/> Stats par Membre (Top)</h3>
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Membre</th>
                    <th className="px-4 py-3">Argent</th>
                    <th className="px-4 py-3">Tickets (Donnés)</th>
                    <th className="px-4 py-3">Reçus</th>
                    <th className="px-4 py-3">Mois</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {statsMembres.slice(0, 5).map((sm, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sm.m.prenom} {sm.m.nom}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{sm.totalArgent} F</td>
                      <td className="px-4 py-3 text-gray-600">{sm.totalPDCol} PD / {sm.totalRepasCol} RP</td>
                      <td className="px-4 py-3 text-orange-600 font-medium">{sm.nbTicketsRecus}</td>
                      <td className="px-4 py-3 font-bold">{sm.moisPayes}</td>
                      <td className="px-4 py-3">
                         <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${sm.moisPayes >= (new Date().getMonth() + 1) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {sm.moisPayes >= (new Date().getMonth() + 1) ? 'Régulier' : 'En retard'}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {statsMembres.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Aucune stat trouvée</td></tr>}
                </tbody>
             </table>
           </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
           <div className="p-6 border-b border-gray-100">
             <h3 className="font-bold text-gray-800 flex items-center gap-2"><Navigation size={18} className="text-gray-500"/> Historique Filtré</h3>
           </div>
           <div className="overflow-x-auto max-h-[400px]">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Membre</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historique.map((h, i) => {
                    const membre = h.mId ? membres.find(m => m.id === h.mId) : null;
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {membre ? `${membre.prenom} ${membre.nom}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                            h.type === 'Collecte' ? 'bg-dmn-green-100 text-dmn-green-700' :
                            h.type === 'Conversion' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{h.detail}</td>
                      </tr>
                    );
                  })}
                  {historique.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Aucune opération trouvée pour ce(s) filtre(s)</td></tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}
