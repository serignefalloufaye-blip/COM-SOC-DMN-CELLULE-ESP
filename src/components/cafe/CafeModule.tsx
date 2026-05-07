import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, TrendingUp, TrendingDown, Package, Plus, Search, 
  Trash2, ArrowRightLeft, BarChart3, Calendar, Wallet, History,
  AlertCircle, Filter, PieChart as PieChartIcon, Users as UsersIcon,
  ShoppingBag, Star, UserPlus, CheckCircle2 as CheckIcon, XCircle,
  Truck, Tag, ChevronRight, MapPin
} from 'lucide-react';
import { 
  CafeProduction, CafeVente, CafeDepense, CafeTransfert, ModePaiement,
  CafeSeller, CafeClient, CafeOrder
} from '../../types';
import { db } from '../../firebase';
import { hasPermission, logAudit } from '../../utils/permissions';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
  sellers: CafeSeller[];
  clients: CafeClient[];
  orders: CafeOrder[];
  userRole: string;
  globalYear: number;
  globalMonth: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onTransferToCaisse: (montant: number) => Promise<void>;
}

export function CafeModule({ 
  productions, ventes, depenses, transferts, 
  sellers, clients, orders,
  userRole, globalYear, globalMonth, showToast, onTransferToCaisse 
}: CafeModuleProps) {
  const { isMobile, isLowEndDevice, performance } = useAdaptive();
  const [activeTab, setActiveTab] = useState<'stats' | 'ventes' | 'production' | 'depenses' | 'stock' | 'historique' | 'vendeurs' | 'clients' | 'commandes'>('stats');
  const [filterPeriod, setFilterPeriod] = useState<'Mois' | 'Trimestre' | 'Année'>('Mois');
  const [searchHistory, setSearchHistory] = useState('');
  
  const canSell = hasPermission(userRole as any, 'cafe.sales.create');
  const canProduce = hasPermission(userRole as any, 'cafe.production.create');
  const canExpense = hasPermission(userRole as any, 'cafe.expenses.create');
  const isAdmin = userRole === 'admin';

  // Memoized filter function logic - Respecting Global Year
  const filterByPeriod = useMemo(() => (date: number | string, period: string) => {
    const d = new Date(date || Date.now());
    const yearMatch = d.getFullYear() === globalYear;
    if (!yearMatch) return false;

    if (period === 'Mois') {
      const now = new Date();
      // If globalMonth is set in App, we could use it, but Cafe has its own "Mois" filter.
      // Let's make it smarter: use current month if looking at current year.
      return d.getMonth() === now.getMonth();
    } else if (period === 'Trimestre') {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dateQuarter = Math.floor(d.getMonth() / 3);
      return currentQuarter === dateQuarter;
    } 
    return true; // "Année" period (yearMatch is already true)
  }, [globalYear]);

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

  const handleAddSeller = async (nom: string, telephone: string) => {
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'cafe_sellers'), {
        nom, telephone, active: true, createdAt: Date.now()
      });
      showToast("Vendeur ajouté !");
    } catch (e) { showToast("Erreur", "error"); }
  };

  const handleDeleteSeller = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'cafe_sellers', id));
      showToast("Vendeur supprimé");
    } catch (e) { showToast("Erreur", "error"); }
  };

  const handleAddOrder = async (clientNom: string, quantite: number, prixUnitaire: number, mode: ModePaiement) => {
    if (!canSell) return;
    try {
      await addDoc(collection(db, 'cafe_orders'), {
        clientNom, quantite, prixUnitaire, total: quantite * prixUnitaire,
        statut: 'en_attente', date: Date.now(), mode, createdAt: Date.now()
      });
      showToast("Commande enregistrée !");
    } catch (e) { showToast("Erreur", "error"); }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: CafeOrder['statut']) => {
    if (!canSell) return;
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (newStatus === 'livree' && order.statut !== 'livree') {
        // Automatically create a sale when delivered
        await addDoc(collection(db, 'cafe_ventes'), {
          date: Date.now(),
          quantite: order.quantite,
          prixUnitaire: order.prixUnitaire,
          total: order.total,
          mode: order.mode,
          typeVente: 'Commande',
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'cafe_orders', orderId), { statut: newStatus });
      showToast(`Statut mis à jour : ${newStatus}`);
    } catch (e) { showToast("Erreur", "error"); }
  };

  const handleAddVente = async (quantite: number, prixUnitaire: number, mode: ModePaiement, typeVente: 'Sur place' | 'Commande', vendeurId?: string) => {
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
        vendeurId: vendeurId || '',
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
      { name: 'Achats Divers', value: filteredDepenses.filter(d => d.categorie === 'Matières premières' || d.categorie === 'Autres' || !d.categorie).reduce((s, d) => s + d.montant, 0) },
      { name: 'Transport', value: filteredDepenses.filter(d => d.categorie === 'Transport').reduce((s, d) => s + d.montant, 0) },
      { name: 'Coût Production', value: totalProductionCoutFiltered }
    ].filter(d => d.value > 0);

    // Monthly data for the current year
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthVentes = ventes.filter(v => {
        const d = new Date(v.date);
        return d.getFullYear() === globalYear && d.getMonth() === i;
      });
      const monthProd = productions.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === globalYear && d.getMonth() === i;
      });
      const monthDep = depenses.filter(dep => {
        const depDate = new Date(dep.date);
        return depDate.getFullYear() === globalYear && depDate.getMonth() === i;
      });

      const rev = monthVentes.reduce((s, v) => s + v.total, 0);
      const cost = monthProd.reduce((s, p) => s + p.total, 0) + monthDep.reduce((s, d) => s + d.montant, 0);

      return {
        name: new Date(0, i).toLocaleString('fr-FR', { month: 'short' }),
        Revenus: rev,
        Bénéfice: rev - cost
      };
    });

    const COLORS = ['#8d6e63', '#bcaaa4', '#5d4037'];

    return (
      <div className="space-y-6">
        {/* Row 1: Main Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                    <TrendingUp className="text-brown-600" /> Performance Annuelle ({globalYear})
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Revenus vs Bénéfices par mois</p>
                </div>
             </div>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8d6e63" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8d6e63" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="Revenus" stroke="#8d6e63" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                    <Area type="monotone" dataKey="Bénéfice" stroke="#10b981" fillOpacity={1} fill="url(#colorBen)" strokeWidth={2} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                    <PieChartIcon className="text-brown-600" size={18} /> Structure des Coûts
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Période: {filterPeriod}</p>
                </div>
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

        {/* Row 2: Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <BarChart3 className="text-brown-600" /> Flux de Production vs Ventes (Qté)
                </h3>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.map((d, i) => ({
                    name: d.name,
                    Produit: productions.filter(p => new Date(p.date).getFullYear() === globalYear && new Date(p.date).getMonth() === i).reduce((s,p) => s+p.quantite, 0),
                    Vendu: ventes.filter(v => new Date(v.date).getFullYear() === globalYear && new Date(v.date).getMonth() === i).reduce((s,v) => s+v.quantite, 0)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                    <Legend />
                    <Bar dataKey="Produit" fill="#d7ccc8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vendu" fill="#8d6e63" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-brown-900 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brown-300">Récapitulatif Global ({globalYear})</h4>
              <div className="space-y-6 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-brown-400 uppercase">Revenus Cumulés</p>
                  <p className="text-2xl font-black">{formats.price(ventes.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,v) => s+v.total, 0))}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brown-400 uppercase">Investissements Totaux</p>
                  <p className="text-2xl font-black text-red-300">
                    {formats.price(
                      depenses.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,d) => s+d.montant, 0) +
                      productions.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,p) => s+p.total, 0)
                    )}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold text-dmn-green-400 uppercase">Bénéfice Virtuel</p>
                  <p className="text-3xl font-black text-dmn-green-400">
                    {formats.price(
                      ventes.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,v) => s+v.total, 0) -
                      (depenses.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,d) => s+d.montant, 0) +
                       productions.filter(v => new Date(v.date).getFullYear() === globalYear).reduce((s,p) => s+p.total, 0))
                    )}
                  </p>
                </div>
              </div>
            </div>
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
                d.get('type') as any,
                d.get('vendeur') as string
              );
              (e.target as any).reset();
            }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
              <input name="qty" type="number" placeholder="Quantité" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20" required />
              <input name="prix" type="number" placeholder="Prix U." defaultValue={250} className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20" required />
              <select name="vendeur" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-brown-600/20">
                <option value="">Vendeur (Optionnel)</option>
                {sellers.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
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

  const renderVendeurs = () => {
    return (
      <div className="space-y-6">
        {isAdmin && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <UserPlus className="text-blue-500" /> Ajouter un Vendeur
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              handleAddSeller(d.get('nom') as string, d.get('tel') as string);
              (e.target as any).reset();
            }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input name="nom" placeholder="Nom Complet" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
              <input name="tel" placeholder="Téléphone" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" />
              <button type="submit" className="bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all">
                Enregistrer
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sellers.map(s => {
            const sellerSales = ventes.filter(v => v.vendeurId === s.id);
            const totalPerf = sellerSales.reduce((sum, v) => sum + v.total, 0);
            return (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <UsersIcon size={24} />
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteSeller(s.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <h4 className="text-lg font-black text-gray-900">{s.nom}</h4>
                <p className="text-xs font-bold text-gray-400 mt-1">{s.telephone || 'Pas de numéro'}</p>
                <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-gray-400">Total Ventes</span>
                    <span className="text-emerald-600">{formats.price(totalPerf)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-gray-400">Transactions</span>
                    <span className="text-gray-900">{sellerSales.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCommandes = () => {
    return (
      <div className="space-y-6">
        {canSell && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <ShoppingBag className="text-amber-500" /> Nouvelle Commande Directe
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              handleAddOrder(d.get('nom') as string, Number(d.get('qty')), Number(d.get('prix')), d.get('mode') as ModePaiement);
              (e.target as any).reset();
            }} className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <input name="nom" placeholder="Nom Client" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none sm:col-span-1" required />
              <input name="qty" type="number" placeholder="Quantité" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
              <input name="prix" type="number" placeholder="Prix U." defaultValue={250} className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none" required />
              <select name="mode" className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none">
                <option value="ESPÈCES">Espèces</option>
                <option value="WAVE">Wave</option>
                <option value="OM">Orange Money</option>
              </select>
              <button type="submit" className="bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all">
                Commander
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {orders.sort((a,b) => b.date - a.date).map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className={`p-4 rounded-2xl ${
                  order.statut === 'livree' ? 'bg-emerald-50 text-emerald-600' :
                  order.statut === 'validee' ? 'bg-blue-50 text-blue-600' :
                  order.statut === 'annulee' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-600 animate-pulse'
                }`}>
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900">{order.clientNom || 'Client Anonyme'}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {formats.date(order.date)} • {order.quantite} Unités • {formats.price(order.total)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {order.statut === 'en_attente' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'validee')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Valider</button>
                )}
                {order.statut === 'validee' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'livree')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Livrer (Créer Vente)</button>
                )}
                {order.statut !== 'livree' && order.statut !== 'annulee' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'annulee')} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                )}
                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  order.statut === 'livree' ? 'bg-emerald-600 text-white' :
                  order.statut === 'annulee' ? 'bg-gray-200 text-gray-600' :
                  'hidden'
                }`}>
                  {order.statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderClients = () => {
    // Derive clients from sales and orders
    const clientsData = useMemo(() => {
      const map = new Map<string, {nom: string, total: number, count: number, last: number}>();
      ventes.forEach(v => {
        if (v.clientId) {
           // If we had a client management system... but we can also use clientNom from orders as a base.
        }
      });
      orders.forEach(o => {
        const nom = o.clientNom || 'Anonyme';
        const current = map.get(nom) || {nom, total: 0, count: 0, last: 0};
        current.total += o.total;
        current.count += 1;
        current.last = Math.max(current.last, o.date);
        map.set(nom, current);
      });
      return Array.from(map.values()).sort((a,b) => b.total - a.total);
    }, [ventes, orders]);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientsData.map(client => (
          <div key={client.nom} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Star size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900">{client.nom}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dernier achat: {formats.date(client.last)}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dépense Totale</p>
                <p className="text-2xl font-black text-dmn-green-600">{formats.price(client.total)}</p>
              </div>
              <div className="text-right">
                 <p className="text-xs font-black text-gray-900">{client.count}</p>
                 <p className="text-[10px] font-bold text-gray-400">Commandes</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-10"
    >
      {/* 🧭 PREMIUM NAVIGATION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 sm:p-10 rounded-[3.5rem] shadow-soft border border-gray-100">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">Module Café</h2>
          <p className="text-[10px] font-black text-orange-900 uppercase tracking-[0.4em] flex items-center gap-2">
            <Coffee size={14} className="text-dmn-gold" /> Intelligence Production & Ventes ({filterPeriod})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-gray-100 p-1.5 rounded-[2rem] flex-1 lg:flex-none overflow-x-auto no-scrollbar">
            {[
              { id: 'stats', label: 'Dashboard', icon: BarChart3 },
              { id: 'ventes', label: 'Ventes', icon: TrendingUp },
              { id: 'commandes', label: 'Commandes', icon: ShoppingBag },
              { id: 'production', label: 'Prods', icon: Coffee },
              { id: 'vendeurs', label: 'Vendeurs', icon: UsersIcon },
              { id: 'clients', label: 'Clients', icon: Star },
              { id: 'depenses', label: 'Charges', icon: TrendingDown },
              { id: 'stock', label: 'Stock', icon: Package },
              { id: 'historique', label: 'Logs', icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <tab.icon size={12} className={activeTab === tab.id ? 'text-orange-600' : ''} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-2xl">
            <Filter size={14} className="text-gray-400" />
            <select 
              value={filterPeriod} 
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-700 focus:ring-0 cursor-pointer"
            >
              <option value="Mois">Mois</option>
              <option value="Trimestre">Trimestre</option>
              <option value="Année">Année</option>
            </select>
          </div>
        </div>
      </div>

      {/* 🚀 QUICK STAT BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Revenus</p>
           <p className="text-xl font-black text-dmn-green-600">{formats.price(totalVentesFiltered)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dépenses</p>
           <p className="text-xl font-black text-red-500">{formats.price(totalDepensesFiltered + totalProductionCoutFiltered)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bénéfice</p>
           <p className={`text-xl font-black ${beneficeNetFiltered >= 0 ? 'text-dmn-green-600' : 'text-red-500'}`}>{formats.price(beneficeNetFiltered)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock</p>
           <p className="text-xl font-black text-gray-900">{currentStock} <span className="text-[10px] opacity-40">uts</span></p>
        </div>
        <div className="bg-gray-900 p-6 rounded-[2.5rem] text-white relative overflow-hidden group flex flex-col justify-between">
           <div>
              <p className="text-[9px] font-black text-dmn-gold uppercase tracking-widest mb-1">Caisse Café</p>
              <p className="text-xl font-black text-dmn-gold">{formats.price(soldeDisponible)}</p>
           </div>
           {isAdmin && soldeDisponible > 0 && (
             <button 
               onClick={() => onTransferToCaisse(soldeDisponible)}
               className="mt-2 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border border-white/10"
             >
               <Wallet size={12} /> Virer
             </button>
           )}
        </div>
      </div>

      {/* 📊 DYNAMIC CONTENT */}
           <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ type: 'spring', damping: 25, stiffness: 300 }}
           className="min-h-[400px]"
        >
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'ventes' && renderVentes()}
          {activeTab === 'vendeurs' && renderVendeurs()}
          {activeTab === 'commandes' && renderCommandes()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'production' && renderProduction()}
          {activeTab === 'depenses' && renderDepenses()}
          {activeTab === 'stock' && renderStock()}
          {activeTab === 'historique' && renderHistorique()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
