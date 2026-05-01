import React, { useMemo } from 'react';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketConversion, TicketDistribution } from '../types';
import { MOIS } from '../data';
import { 
  Building2, TrendingUp, TrendingDown, Users, AlertCircle, 
  Ticket, Wallet, ArrowUpRight, ArrowDownRight, Package, Calendar, Activity, Edit2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';

interface PremiumDashboardProps {
  membres: Membre[];
  cotisations: Cotisation[];
  depenses: Depense[];
  recettes: Recette[];
  dettes: Dette[];
  ticketCollectes: TicketCollecte[];
  ticketConversions: TicketConversion[];
  ticketDistributions: TicketDistribution[];
  globalYear: number;
  globalMonth: string;
  globalMode: string;
  logoUrl?: string;
  userRole?: 'admin' | 'visitor' | null;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PremiumDashboard({
  membres, cotisations, depenses, recettes, dettes,
  ticketCollectes, ticketConversions, ticketDistributions,
  globalYear, globalMonth, logoUrl, userRole, onLogoUpload
}: PremiumDashboardProps) {

  // Totaux Filtrés (Pour les flux du mois/année sélectionné)
  const filteredCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear && (!globalMonth || c.mois === globalMonth)), [cotisations, globalYear, globalMonth]);
  const filteredDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear && (!globalMonth || d.mois === globalMonth)), [depenses, globalYear, globalMonth]);
  const filteredRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear && (!globalMonth || r.mois === globalMonth)), [recettes, globalYear, globalMonth]);
  const filteredDettes = useMemo(() => dettes.filter(d => d.annee === globalYear && (!globalMonth || d.mois === globalMonth)), [dettes, globalYear, globalMonth]);
  
  const totCotisations = filteredCotisations.reduce((s, c) => s + c.montant, 0);
  const totRecettes = filteredRecettes.reduce((s, r) => s + r.montant, 0);
  const totDettesEnAttente = filteredDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);

  const totEntrees = totCotisations + totRecettes + totDettesEnAttente;
  const totDepenses = filteredDepenses.reduce((s, d) => s + d.montant, 0);

  // --- CALCUL DU SOLDE RÉEL (GLOBAL) ---
  const globalTotCotisations = useMemo(() => cotisations.reduce((s, c) => s + c.montant, 0), [cotisations]);
  const globalTotRecettes = useMemo(() => recettes.reduce((s, r) => s + r.montant, 0), [recettes]);
  
  const globalTotIncome = useMemo(() => {
    const base = globalTotCotisations + globalTotRecettes;
    const unpaid = dettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
    return base + unpaid;
  }, [globalTotCotisations, globalTotRecettes, dettes]);

  const globalTotExpenses = useMemo(() => depenses.reduce((s, d) => s + d.montant, 0), [depenses]);
  
  const soldeGlobal = globalTotIncome - globalTotExpenses;

  // --- ANNUEL (Pour certains graphiques, indépendant de globalMonth) ---
  const annualCotisations = useMemo(() => cotisations.filter(c => c.annee === globalYear), [cotisations, globalYear]);
  const annualDepenses = useMemo(() => depenses.filter(d => d.annee === globalYear), [depenses, globalYear]);
  const annualRecettes = useMemo(() => recettes.filter(r => r.annee === globalYear), [recettes, globalYear]);

  // --- TICKETS LOGIC ---
  const totalArgentCollecte = ticketCollectes.filter(c => c.type === 'argent').reduce((s, c) => s + (c.montantArgent || 0), 0);
  const totalArgentConverti = ticketConversions.reduce((s, c) => s + c.montant, 0);
  const argentDispoTickets = totalArgentCollecte - totalArgentConverti;

  const pdGeneres = ticketConversions.reduce((s, c) => s + (c.petitDej || 0), 0);
  const pdCollectes = ticketCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.petitDej || 0), 0);
  const pdDistribues = ticketDistributions.reduce((s, d) => s + (d.petitDej || 0), 0);
  const stockPD = pdGeneres + pdCollectes - pdDistribues;

  const repasGeneres = ticketConversions.reduce((s, c) => s + (c.repas || 0), 0);
  const repasCollectes = ticketCollectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.repas || 0), 0);
  const repasDistribues = ticketDistributions.reduce((s, d) => s + (d.repas || 0), 0);
  const stockRepas = repasGeneres + repasCollectes - repasDistribues;

  // --- MEMBRES LOGIC ---
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
  const membresEnRetard = membres.length - membresActifs;

  // --- GRAPHIQUES ---
  const evolutionSoldeData = MOIS.map(m => {
    const moisCot = annualCotisations.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0);
    const moisRec = annualRecettes.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0);
    const moisDep = annualDepenses.filter(c => c.mois === m).reduce((s, c) => s + c.montant, 0);
    return { name: m.substring(0, 3), Entrées: moisCot + moisRec, Dépenses: moisDep, Solde: moisCot + moisRec - moisDep };
  });

  const repartitionData = [
    { name: 'Catégorie Sociale', value: annualDepenses.filter(d => ['MALADIE', 'DÉCÈS', 'MARIAGE', 'NAISSANCE'].some(x => d.evenement.toUpperCase().includes(x))).reduce((s, d) => s + d.montant, 0) },
    { name: 'Organisation Ndogou/Dahira', value: annualDepenses.filter(d => ['NDOGOU', 'DAHIRA', 'MAGAL'].some(x => d.evenement.toUpperCase().includes(x))).reduce((s, d) => s + d.montant, 0) },
    { name: 'Autres', value: annualDepenses.filter(d => !['MALADIE', 'DÉCÈS', 'MARIAGE', 'NAISSANCE', 'NDOGOU', 'DAHIRA', 'MAGAL'].some(x => d.evenement.toUpperCase().includes(x))).reduce((s, d) => s + d.montant, 0) }
  ].filter(d => d.value > 0);

  const formatPrice = (p: number) => p.toLocaleString('fr-FR');

  // --- HISTORIQUE RECENT (Mix) ---
  const history = [
    ...cotisations.map(c => ({ date: c.createdAt || 0, label: `Cotisation de ${membres.find(m => m.id === c.mId)?.prenom} ${membres.find(m => m.id === c.mId)?.nom}`, amount: c.montant, type: 'in', icon: Wallet })),
    ...depenses.map(d => ({ date: d.createdAt || d.updatedAt || 0, label: `Dépense : ${d.evenement}`, amount: d.montant, type: 'out', icon: ArrowDownRight })),
    ...recettes.map(r => ({ date: r.createdAt || r.updatedAt || 0, label: `Recette : ${r.motif}`, amount: r.montant, type: 'in', icon: ArrowUpRight })),
    ...ticketDistributions.map(d => ({ date: d.createdAt || 0, label: `Tickets à ${membres.find(m => m.id === d.mId)?.prenom} ${membres.find(m => m.id === d.mId)?.nom}`, amount: (d.petitDej || 0) * 50 + (d.repas || 0) * 100, type: 'ticket', icon: Ticket }))
  ].sort((a, b) => b.date - a.date).slice(0, 5);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER BANDEAU */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 bg-white overflow-hidden text-green-700 rounded-2xl flex items-center justify-center font-black text-3xl shadow-inner uppercase relative group">
             {logoUrl ? (
               <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
             ) : (
               "🕌"
             )}
             {userRole === 'admin' && onLogoUpload && (
               <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                 <Edit2 size={20} className="text-white" />
                 <input type="file" className="hidden" accept="image/*" onChange={onLogoUpload} />
               </label>
             )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daara Madjmahoune Noreyni</h1>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">La transparence est une responsabilité spirituelle</p>
          </div>
        </div>
        <div className="relative z-10 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
             <Calendar size={18} /> Période affichée
          </div>
          <div className="text-gray-900 font-black mt-1 text-lg">
             {globalMonth ? `${globalMonth} ` : 'Année '} {globalYear}
          </div>
        </div>
      </div>

      {/* CARTES SUPERIEURES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARTE SOLDE (Façon Carte Bancaire) */}
        <div className="lg:col-span-1 bg-gradient-to-br from-green-800 to-green-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-xl -ml-8 -mb-8"></div>
          
          <div className="relative z-10 flex justify-between items-center mb-6">
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-green-200/80">Solde Réel de la Caisse</span>
            <Building2 size={24} className="text-green-300 opacity-80" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md">
              {formatPrice(soldeGlobal)} <span className="text-2xl text-green-300">FCFA</span>
            </h2>
            <div className="mt-4 flex items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] text-green-300/80 uppercase font-bold tracking-wider">Entrées ({globalMonth || globalYear})</span>
                  <span className="font-bold text-sm mt-1">+{formatPrice(totEntrees)} F</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-green-300/80 uppercase font-bold tracking-wider">Dépenses ({globalMonth || globalYear})</span>
                  <span className="font-bold text-sm mt-1">-{formatPrice(totDepenses)} F</span>
               </div>
            </div>
          </div>
        </div>

        {/* INDICATEURS GRID */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
           
           <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-green-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <ArrowUpRight size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cotisations ({globalMonth || 'An'})</p>
              <h3 className="text-xl font-black text-gray-900">{formatPrice(totCotisations)} F</h3>
           </div>
           
           <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-red-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <ArrowDownRight size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dépenses ({globalMonth || 'An'})</p>
              <h3 className="text-xl font-black text-gray-900">{formatPrice(totDepenses)} F</h3>
           </div>

           <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-orange-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Package size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Tickets</p>
              <div className="flex items-center gap-2">
                 <span className="text-sm font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md">{stockPD} PD</span>
                 <span className="text-sm font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md">{stockRepas} RP</span>
              </div>
           </div>

           <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-blue-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Users size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Membres Actifs</p>
              <h3 className="text-xl font-black text-gray-900">
                {membresActifs} <span className="text-xs text-gray-400 font-medium">/ {membres.length}</span>
              </h3>
              {membresEnRetard > 0 && (
                 <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded-full">
                   <AlertCircle size={10} /> {membresEnRetard} en retard
                 </div>
              )}
           </div>

        </div>
      </div>

      {/* GRAPHIQUES & HISTORIQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LIGNE EVOLUTION */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
             <TrendingUp size={18} className="text-green-500" />
             Évolution Financière ({globalYear})
           </h3>
           <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionSoldeData}>
                <defs>
                  <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={50} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 600 }} />
                <Area type="monotone" dataKey="Entrées" stroke="#10b981" fillOpacity={1} fill="url(#colorEntrees)" strokeWidth={3} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorDepenses)" strokeWidth={3} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* ACTIVITE RECENTE */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
           <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
             <Activity size={18} className="text-gray-400" />
             Activité Récente
           </h3>
           <div className="flex-1 overflow-y-auto pr-2 space-y-4">
             {history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                   {i !== history.length - 1 && <div className="absolute left-[19px] top-10 bottom-[-16px] w-[2px] bg-gray-100"></div>}
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white ${
                      h.type === 'in' ? 'bg-green-100 text-green-600' :
                      h.type === 'out' ? 'bg-red-100 text-red-600' :
                      'bg-orange-100 text-orange-500'
                   }`}>
                     <h.icon size={16} />
                   </div>
                   <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                      <p className="text-xs font-bold text-gray-900 leading-tight mb-1">{h.label}</p>
                      <div className="flex justify-between items-center mt-2">
                         <span className="text-[10px] text-gray-400 font-medium">
                           {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '---'}
                         </span>
                         <span className={`text-xs font-black ${
                            h.type === 'in' ? 'text-green-600' :
                            h.type === 'out' ? 'text-red-600' :
                            'text-orange-500'
                         }`}>
                            {h.type === 'in' ? '+' : '-'}{formatPrice(h.amount)} {h.type === 'ticket' ? 'F (Val.)' : 'F'}
                         </span>
                      </div>
                   </div>
                </div>
             ))}
             {history.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-10 font-medium">Aucune activité</div>
             )}
           </div>
        </div>

      </div>

    </div>
  );
}
