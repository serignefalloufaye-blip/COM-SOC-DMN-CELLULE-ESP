import React, { useState, useMemo } from 'react';
import { 
  Coffee, TrendingUp, TrendingDown, Package, Plus, Search, 
  Trash2, ArrowRightLeft, BarChart3, Calendar, Wallet, History,
  AlertCircle, Filter, PieChart as PieChartIcon
} from 'lucide-react';
import { CafeProduction, CafeVente, CafeDepense, CafeTransfert, ModePaiement } from '../../types';
import { db } from '../../firebase';
import { hasPermission, logAudit } from '../../utils/permissions';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { useAdaptive } from '../../hooks/useAdaptive';

interface CafeModuleProps {
  productions: CafeProduction[];
  ventes: CafeVente[];
  depenses: CafeDepense[];
  transferts: CafeTransfert[];
  userRole: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onTransferToCaisse: (montant: number) => Promise<void>;
}

export function CafeModule({ 
  productions, ventes, depenses, transferts, 
  userRole, showToast, onTransferToCaisse 
}: CafeModuleProps) {
  const { isMobile, isLowEndDevice, performance } = useAdaptive();
  const [activeTab, setActiveTab] = useState<'stats' | 'ventes' | 'production' | 'depenses' | 'stock' | 'historique'>('stats');
  const [filterPeriod, setFilterPeriod] = useState<'Mois' | 'Trimestre' | 'Année'>('Mois');
  const [searchHistory, setSearchHistory] = useState('');
  
  const canSell = hasPermission(userRole as any, 'cafe.sales.create');
  const canProduce = hasPermission(userRole as any, 'cafe.production.create');
  const canExpense = hasPermission(userRole as any, 'cafe.expenses.create');
  const isAdmin = userRole === 'admin';

  // Memoized filter function logic
  const filterByPeriod = useMemo(() => (date: number, period: string) => {
    const d = new Date(date || Date.now());
    const now = new Date();
    if (period === 'Mois') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (period === 'Trimestre') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dateQuarter = Math.floor(d.getMonth() / 3);
      return currentQuarter === dateQuarter && d.getFullYear() === now.getFullYear();
    } else {
      return d.getFullYear() === now.getFullYear();
    }
  }, []);

  const filteredVentes = useMemo(() => ventes.filter(v => filterByPeriod(v.date, filterPeriod)), [ventes, filterPeriod, filterByPeriod]);
  const filteredProductions = useMemo(() => productions.filter(p => filterByPeriod(p.date, filterPeriod)), [productions, filterPeriod, filterByPeriod]);
  const filteredDepenses = useMemo(() => depenses.filter(d => filterByPeriod(d.date, filterPeriod)), [depenses, filterPeriod, filterByPeriod]);

  // All activities memoized for history
  const allActivities = useMemo(() => {
    const combined = [
      ...productions.map(p => ({ ...p, _type: 'production', _title: `Production: ${p.quantite} Unités (${p.typeCafe||'Café'})` })),
      ...ventes.map(v => ({ ...v, _type: 'vente', _title: `Vente: ${v.quantite} Unités` })),
      ...depenses.map(d => ({ ...d, _type: 'depense', _title: `Dépense: ${d.motif}` })),
      ...transferts.map(t => ({ ...t, _type: 'transfert', _title: `Transfert: ${t.message || 'Vers Caisse Sociale'}` }))
    ];

    const searchLower = searchHistory.toLowerCase();
    return combined
      .filter(act => 
        act._title.toLowerCase().includes(searchLower) ||
        act._type.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [productions, ventes, depenses, transferts, searchHistory]);

  // Calculate Totals (Global or Filtered)
  // For Dashboard KPI we show Filtered. Stock is always Global.
  const totalVentesFiltered = useMemo(() => filteredVentes.reduce((s, v) => s + v.total, 0), [filteredVentes]);
  const totalDepensesFiltered = useMemo(() => filteredDepenses.reduce((s, d) => s + d.montant, 0), [filteredDepenses]);
  const totalProductionCoutFiltered = useMemo(() => filteredProductions.reduce((s, p) => s + p.total, 0), [filteredProductions]);
  
  // Overall for Solde
  const totalVentes = useMemo(() => ventes.reduce((s, v) => s + v.total, 0), [ventes]);
  const totalDepenses = useMemo(() => depenses.reduce((s, d) => s + d.montant, 0), [depenses]);
  const totalProductionCout = useMemo(() => productions.reduce((s, p) => s + p.total, 0), [productions]);
  const totalTransfert = useMemo(() => transferts.reduce((s, t) => s + t.montant, 0), [transferts]);
  
  const beneficeNetFiltered = totalVentesFiltered - totalDepensesFiltered - totalProductionCoutFiltered;
  const soldeDisponible = (totalVentes - totalDepenses - totalProductionCout) - totalTransfert;

  // Stock Calculation
  const totalQtyProduced = useMemo(() => productions.reduce((s, p) => s + p.quantite, 0), [productions]);
  const totalQtySold = useMemo(() => ventes.reduce((s, v) => s + v.quantite, 0), [ventes]);
  const currentStock = totalQtyProduced - totalQtySold;

  const handleAddVente = async (quantite: number, prixUnitaire: number, mode: ModePaiement, typeVente: 'Sur place' | 'Commande') => {
    if (!canSell) {
      showToast("Accès refusé", "error");
      return;
    }
    if (quantite > currentStock) {
      showToast("Stock insuffisant !", "error");
      return;
    }
    try {
      await addDoc(collection(db, 'cafe_ventes'), {
        date: Date.now(),
        quantite,
        prixUnitaire,
        total: quantite * prixUnitaire,
        mode,
        typeVente,
        createdAt: serverTimestamp()
      });
      showToast("Vente enregistrée !");
    } catch (e) {
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleAddProduction = async (quantite: number, coutUnitaire: number, typeCafe: string) => {
    if (!canProduce) {
      showToast("Accès refusé", "error");
      return;
    }
    try {
      await addDoc(collection(db, 'cafe_productions'), {
        date: Date.now(),
        quantite,
        coutUnitaire,
        typeCafe,
        total: quantite * coutUnitaire,
        createdAt: serverTimestamp()
      });
      showToast("Production enregistrée !");
    } catch (e) {
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const formats = {
    price: (val: number) => {
      if (val === undefined || val === null) return "0 F";
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F';
    },
    date: (val: number) => new Date(val).toLocaleDateString('fr-FR')
  };

  const sortedVentesForChart = useMemo(() => 
    filteredVentes.slice().sort((a, b) => (a.date || 0) - (b.date || 0)), 
  [filteredVentes]);

  const sortedVentes = useMemo(() => filteredVentes.slice().sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredVentes]);
  const sortedProductions = useMemo(() => filteredProductions.slice().sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredProductions]);
  const sortedDepenses = useMemo(() => filteredDepenses.slice().sort((a,b) => (b.date || 0) - (a.date || 0)), [filteredDepenses]);

  const renderStats = () => {
    // Data preparation for charts
    const pieData = [
      { name: 'Matières premières', value: filteredDepenses.filter(d => d.categorie === 'Matières premières').reduce((s, d) => s + d.montant, 0) },
      { name: 'Transport', value: filteredDepenses.filter(d => d.categorie === 'Transport').reduce((s, d) => s + d.montant, 0) },
      { name: 'Autres', value: filteredDepenses.filter(d => d.categorie === 'Autres' || !d.categorie).reduce((s, d) => s + d.montant, 0) },
      { name: 'Coût Production', value: totalProductionCoutFiltered }
    ].filter(d => d.value > 0);

    const COLORS = ['#8d6e63', '#a1887f', '#bcaaa4', '#6d4c41'];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <TrendingUp className="text-brown-600" /> Évolution des ventes
                </h3>
             </div>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedVentesForChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formats.date}
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      dy={10}
                     />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      labelFormatter={formats.date}
                      formatter={(value: any) => [`${value} F`, 'Total']}
                    />
                    <Line type="monotone" dataKey="total" stroke="#8d6e63" strokeWidth={3} dot={{r: 4, fill: '#8d6e63'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <PieChartIcon className="text-brown-600" size={18} /> Répartition Dépenses
                </h3>
             </div>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formats.price(val)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <BarChart3 className="text-brown-600" /> Production vs Ventes (Quantité)
              </h3>
           </div>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Production', quantity: filteredProductions.reduce((s,p) => s+p.quantite, 0) },
                  { name: 'Ventes', quantity: filteredVentes.reduce((s,v) => s+v.quantite, 0) }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="quantity" fill="#8d6e63" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    );
  };

  const renderVentes = () => {
    return (
      <div className="space-y-6">
        {canSell && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-500"/> Enregistrer une vente
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              handleAddVente(
                Number(d.get('qty')), 
                Number(d.get('prix')), 
                d.get('mode') as ModePaiement,
                d.get('type') as any
              );
              (e.target as any).reset();
            }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <input name="qty" type="number" placeholder="Quantité" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20" required />
              <input name="prix" type="number" placeholder="Prix U." defaultValue={250} className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20" required />
              <select name="type" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20">
                <option value="Sur place">Sur place</option>
                <option value="Commande">Commande</option>
              </select>
              <select name="mode" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20">
                <option value="ESPÈCES">Espèces</option>
                <option value="WAVE">Wave</option>
                <option value="OM">Orange Money</option>
              </select>
              <button type="submit" className="md:col-span-1 bg-brown-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brown-700 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Valider
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-center">
                <thead className="bg-gray-50 border-b border-gray-100">
                   <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Quantité</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Prix U.</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mode</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {sortedVentes.map(v => (
                     <tr key={v.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-xs font-bold text-gray-600">{formats.date(v.date)}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-600">{v.typeVente || 'Sur place'}</td>
                        <td className="px-6 py-4 text-xs font-black text-gray-900">{v.quantite}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{v.prixUnitaire} F</td>
                        <td className="px-6 py-4 text-xs font-black text-emerald-600">{formats.price(v.total)}</td>
                        <td className="px-6 py-4">
                           <span className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black text-gray-500">{v.mode}</span>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-50">
             {sortedVentes.map(v => (
               <div key={v.id} className="p-4 flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">{v.typeVente || 'Sur place'}</span>
                     <span className="text-xs font-bold text-gray-500">{formats.date(v.date)}</span>
                   </div>
                   <span className="px-2 py-1 bg-gray-100 rounded-lg text-[9px] font-black text-gray-500">{v.mode}</span>
                 </div>
                 <div className="flex justify-between items-end mt-1">
                   <div>
                     <p className="text-xs font-bold text-gray-600">{v.quantite} × {v.prixUnitaire} F</p>
                   </div>
                   <p className="text-lg font-black text-emerald-600">{formats.price(v.total)}</p>
                 </div>
               </div>
             ))}
             {filteredVentes.length === 0 && (
               <div className="p-6 text-center text-sm font-medium text-gray-400">Aucune vente enregistrée</div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderProduction = () => {
    return (
      <div className="space-y-6">
        {canProduce && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
               <Coffee className="text-brown-600"/> Nouvelle Production
             </h3>
             <form onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                handleAddProduction(Number(d.get('qty')), Number(d.get('cout')), d.get('type') as string);
                (e.target as any).reset();
             }} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input name="type" type="text" placeholder="Type de café (ex: Touba classique)" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                <input name="qty" type="number" placeholder="Nombre d'unités" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                <input name="cout" type="number" placeholder="Coût U." className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                <button type="submit" className="bg-brown-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brown-700 transition-all flex items-center justify-center gap-2">
                   <Plus size={18} /> Enregistrer
                </button>
             </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {sortedProductions.map(p => (
             <div key={p.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-brown-200 transition-all">
                <div>
                   <p className="text-xs font-bold text-gray-400">{formats.date(p.date)}</p>
                   <h4 className="text-lg font-black text-gray-900 mt-1">{p.quantite} Unités <span className="text-sm font-medium text-gray-500">({p.typeCafe || 'Café Touba'})</span></h4>
                   <p className="text-xs font-medium text-gray-500 mt-1">Coût: {p.coutUnitaire} F / unité</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-red-600">{formats.price(p.total)}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Investissement</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const renderDepenses = () => {
    return (
      <div className="space-y-6">
        {canExpense && (
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                <TrendingDown className="text-red-500"/> Enregistrer une Dépense Café
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                try {
                  await addDoc(collection(db, 'cafe_depenses'), {
                    date: Date.now(),
                    motif: d.get('motif'),
                    categorie: d.get('categorie'),
                    montant: Number(d.get('montant')),
                    createdAt: serverTimestamp()
                  });
                  showToast("Dépense enregistrée !");
                } catch (e) { showToast("Erreur", "error"); }
                (e.target as any).reset();
              }} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                 <input name="motif" type="text" placeholder="Motif (ex: Achat sucre)" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                 <select name="categorie" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                    <option value="Matières premières">Matières premières</option>
                    <option value="Transport">Transport</option>
                    <option value="Autres">Autres</option>
                 </select>
                 <input name="montant" type="number" placeholder="Montant" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
                 <button type="submit" className="bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                    <Plus size={18} /> Valider
                 </button>
              </form>
           </div>
        )}

        <div className="space-y-3">
           {sortedDepenses.map(d => (
             <div key={d.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-red-100 transition-all">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                      <TrendingDown size={18} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-gray-900">{d.motif}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md uppercase tracking-widest">{d.categorie || 'Autres'}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formats.date(d.date)}</span>
                      </div>
                   </div>
                </div>
                <p className="text-base font-black text-red-700">{formats.price(d.montant)}</p>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const renderStock = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
           <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${currentStock < 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-brown-50 text-brown-600'}`}>
              <Package size={48} />
           </div>
           <div>
              <h3 className="text-4xl font-black text-gray-900">{currentStock} <span className="text-base font-bold text-gray-400">Unités</span></h3>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Stock Disponible</p>
           </div>
           {currentStock < 10 && (
             <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-center gap-2 text-red-700 text-sm font-bold max-w-sm mx-auto">
                <AlertCircle size={20} /> Alerte: Stock très faible ! Prévoyez une production.
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Production Totale Cumulée</p>
              <p className="text-2xl font-black text-gray-900">{totalQtyProduced}</p>
              <div className="h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-brown-400" style={{width: '100%'}}></div>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ventes Totales Cumulées</p>
              <p className="text-2xl font-black text-gray-900">{totalQtySold}</p>
              <div className="h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                 <div 
                  className="h-full bg-emerald-400 transition-all duration-1000" 
                  style={{width: `${(totalQtySold / (totalQtyProduced || 1)) * 100}%`}}
                 ></div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderHistorique = () => {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
              <History size={18} className="text-gray-400"/> Historique Global
           </h3>
           <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Chercher..." 
                 value={searchHistory}
                 onChange={(e) => setSearchHistory(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20"
              />
           </div>
         </div>

         {/* Desktop View */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Détails</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Montant</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {allActivities.map((act: any) => (
                    <tr key={`${act._type}-${act.id}`} className="hover:bg-gray-50/50">
                       <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">{formats.date(act.date)}</td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            act._type === 'production' ? 'bg-amber-100 text-amber-700' :
                            act._type === 'vente' ? 'bg-emerald-100 text-emerald-700' :
                            act._type === 'transfert' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {act._type}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-xs font-bold text-gray-900">{act._title}</td>
                       <td className={`px-6 py-4 text-xs font-black text-right whitespace-nowrap ${
                         act._type === 'vente' ? 'text-emerald-600' : 'text-red-600'
                       }`}>
                         {act._type === 'vente' ? '+' : '-'}{formats.price(act.total || act.montant)}
                       </td>
                    </tr>
                  ))}
                  {allActivities.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm font-medium text-gray-400">
                        Aucun historique trouvé
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Mobile View */}
         <div className="md:hidden divide-y divide-gray-50">
            {allActivities.map((act: any) => (
              <div key={`${act._type}-${act.id}`} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                      act._type === 'production' ? 'bg-amber-100 text-amber-700' :
                      act._type === 'vente' ? 'bg-emerald-100 text-emerald-700' :
                      act._type === 'transfert' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {act._type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{formats.date(act.date)}</span>
                  </div>
                  <p className={`text-xs font-black ${
                    act._type === 'vente' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {act._type === 'vente' ? '+' : '-'}{formats.price(act.total || act.montant)}
                  </p>
                </div>
                <p className="text-xs font-bold text-gray-900">{act._title}</p>
              </div>
            ))}
            {allActivities.length === 0 && (
              <div className="px-6 py-10 text-center text-sm font-medium text-gray-400">
                Aucun historique trouvé
              </div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-brown-50 border border-brown-100 p-6 rounded-3xl mb-6">
        <h2 className="text-2xl font-black text-brown-900 flex items-center gap-3">
          <Coffee size={32} /> Module Café
        </h2>
        <p className="text-brown-600 font-medium text-sm mt-1">Gestion de production et vente de café</p>
      </div>

      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenus ({filterPeriod})</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-black text-gray-900">{formats.price(totalVentesFiltered)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-2xl">
              <TrendingDown size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dépenses ({filterPeriod})</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-black text-gray-900">{formats.price(totalDepensesFiltered + totalProductionCoutFiltered)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-2xl ${beneficeNetFiltered >= 0 ? 'bg-dmn-green-50 text-dmn-green-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bénéfice Net ({filterPeriod})</p>
          <div className="flex items-baseline gap-1">
            <h3 className={`text-xl font-black ${beneficeNetFiltered >= 0 ? 'text-dmn-green-800' : 'text-red-700'}`}>{formats.price(beneficeNetFiltered)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
              <Package size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Actuel (Total)</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-black text-gray-900">{currentStock}</h3>
            <span className="text-[10px] font-bold text-gray-500">Unités</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm ring-2 ring-brown-600/20 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-brown-50 text-brown-600 rounded-2xl">
                <ArrowRightLeft size={24} />
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Solde Dispo (Global)</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-black text-brown-800">{formats.price(soldeDisponible)}</h3>
            </div>
          </div>
          {isAdmin && soldeDisponible > 0 && (
            <button 
              onClick={() => onTransferToCaisse(soldeDisponible)}
              className="mt-4 w-full py-2 bg-brown-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brown-700 transition-all shadow-lg shadow-brown-600/20 flex items-center justify-center gap-2"
            >
              <Wallet size={14} /> Transférer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center overflow-x-auto no-scrollbar mb-6 gap-4">
        <div className="flex gap-2">
          {[
            { id: 'stats', label: 'Tableau de bord', icon: BarChart3 },
            { id: 'ventes', label: 'Ventes', icon: TrendingUp },
            { id: 'production', label: 'Productions', icon: Coffee },
            { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
            { id: 'stock', label: 'État du Stock', icon: Package },
            { id: 'historique', label: 'Historique', icon: History }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all shadow-sm group whitespace-nowrap ${
                activeTab === t.id 
                  ? 'bg-brown-600 text-white shadow-md shadow-brown-600/20 ring-4 ring-brown-600/10' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200'
              }`}
            >
              <t.icon size={20} className={activeTab === t.id ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:scale-110 transition-transform text-gray-400 group-hover:text-brown-600'} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 px-2">
          <Filter size={16} className="text-gray-400" />
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none"
          >
            <option value="Mois">Ce mois</option>
            <option value="Trimestre">Ce trimestre</option>
            <option value="Année">Cette année</option>
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50/50 min-h-[400px]">
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'ventes' && renderVentes()}
        {activeTab === 'production' && renderProduction()}
        {activeTab === 'depenses' && renderDepenses()}
        {activeTab === 'stock' && renderStock()}
        {activeTab === 'historique' && renderHistorique()}
      </div>
    </div>
  );
}
