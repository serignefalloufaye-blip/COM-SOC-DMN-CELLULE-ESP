import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Wallet, ShoppingBag, 
  Package, DollarSign, Activity, PieChart as PieChartIcon, Lightbulb
} from 'lucide-react';
import { formatPrice } from '../../../utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardOverviewProps {
  finance: any;
  periodString: string;
}

export function DashboardOverview({ finance, periodString }: DashboardOverviewProps) {
  const { kpi, sales, costs, production } = finance;

  const StatCard = ({ title, value, subValue, icon: Icon, color, delay }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="premium-card p-4 sm:p-6 flex flex-col justify-between group h-full"
    >
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300
          ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
            color === 'blue' ? 'bg-blue-50 text-blue-600' : 
            color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
            color === 'red' ? 'bg-red-50 text-red-600' : 
            color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'}`}
        >
          <Icon size={20} strokeWidth={2.5} className="sm:hidden" />
          <Icon size={24} strokeWidth={2.5} className="hidden sm:block" />
        </div>
      </div>
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="fintech-kpi text-xl sm:text-2xl text-gray-900">{value}</h3>
        {subValue && (
          <p className="text-[11px] font-bold text-gray-400 mt-1.5 sm:mt-2 line-clamp-1">{subValue}</p>
        )}
      </div>
    </motion.div>
  );

  // Data for Charts
  const costsData = [
    { name: 'Matières premières', value: costs.grains, color: '#0B5D3B' },
    { name: 'Transport', value: costs.transport, color: '#3b82f6' },
    { name: 'Emballage', value: costs.emballage, color: '#D4AF37' },
    { name: 'Transfert', value: costs.transfert, color: '#8b5cf6' },
    { name: 'Fonctionnement', value: costs.operating, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const salesVsCostsData = [
    { name: 'Performances', Ventes: sales.total, Coûts: costs.totalProd + costs.operating }
  ];

  // AI Analysis Logic
  let insightText = "L'activité nécessite plus de données pour une analyse complète.";
  let insightTone = "neutral";

  if (sales.total > 0 && kpi.soldeNet > 0) {
    insightTone = "positive";
    insightText = `Excellente performance. Les ventes couvrent largement les coûts, dégageant un solde net de ${formatPrice(kpi.soldeNet)} F CFA. Rentabilité brute de ${kpi.margin.toFixed(1)}%.`;
  } else if (sales.total > 0 && kpi.resultatProduction > 0 && kpi.soldeNet <= 0) {
    insightTone = "warning";
    insightText = `Attention : bien que la production soit rentable (+${formatPrice(kpi.resultatProduction)} F CFA), les dépenses de fonctionnement (${formatPrice(costs.operating)} F CFA) absorbent tout le bénéfice.`;
  } else if (sales.total > 0 && kpi.resultatProduction <= 0) {
    insightTone = "critical";
    insightText = `Alerte : les ventes ne couvrent pas les coûts directs. Déficit de ${formatPrice(Math.abs(kpi.resultatProduction))} F CFA sur la production seule. Considérez une révision des tarifs.`;
  } else if (costs.totalProd > 0 && sales.total === 0) {
    insightTone = "warning";
    insightText = `Production en cours (${formatPrice(costs.totalProd)} F CFA d'investissement) mais aucune vente enregistrée sur cette période.`;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Financial Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-premium group
          ${kpi.soldeNet >= 0 
            ? 'bg-gradient-to-br from-dmn-green-900 via-dmn-green-800 to-dmn-green-950' 
            : 'bg-gradient-to-br from-red-800 via-red-900 to-black'}`}
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 translate-x-20 -translate-y-20">
          <Wallet size={400} />
        </div>
        
        {/* Abstract Mesh Effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(212,175,55,0.3),transparent_50%)]" />
        </div>

        <div className="relative z-10 flex flex-col items-center sm:items-start">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] mb-6 sm:mb-8 mx-auto sm:mx-0">
             <Activity size={10} className={kpi.soldeNet >= 0 ? "text-emerald-400" : "text-red-400 animate-pulse"} />
             Performance Financière • {periodString}
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 sm:gap-12 w-full">
            <div className="text-center sm:text-left">
              <p className="text-white/60 font-medium text-base sm:text-lg mb-1 sm:mb-2">Solde Net Restant</p>
              <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-4">
                <h1 className="fintech-kpi text-5xl sm:text-8xl">
                  {kpi.soldeNet > 0 ? '+' : ''}{formatPrice(kpi.soldeNet)}
                </h1>
                <span className="text-xl sm:text-4xl font-black text-white/30 uppercase tracking-tighter sm:tracking-normal">F CFA</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl border border-white/10 flex items-center gap-4 ${kpi.soldeNet >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${kpi.soldeNet >= 0 ? 'bg-emerald-400 text-dmn-green-950' : 'bg-red-400 text-black'}`}>
                   {kpi.soldeNet >= 0 ? <TrendingUp size={16} strokeWidth={3} className="sm:hidden" /> : <TrendingDown size={16} strokeWidth={3} className="sm:hidden" />}
                   {kpi.soldeNet >= 0 ? <TrendingUp size={20} strokeWidth={3} className="hidden sm:block" /> : <TrendingDown size={20} strokeWidth={3} className="hidden sm:block" />}
                </div>
                <div>
                   <p className="text-[11px] font-black text-white/50 uppercase tracking-wider">Marge Nette</p>
                   <p className="text-xl sm:text-2xl font-black">{kpi.netMargin.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl border border-white/10 bg-white/5 flex items-center sm:block gap-4 sm:gap-0">
                <p className="text-[11px] font-black text-white/50 uppercase tracking-wider mb-0 sm:mb-0.5">Rentabilité Brute</p>
                <div className="flex items-center gap-2">
                   <p className="text-xl sm:text-2xl font-black text-dmn-gold">{kpi.margin.toFixed(1)}%</p>
                   <div className="w-2 h-2 rounded-full bg-dmn-gold animate-pulse shadow-[0_0_10px_#D4AF37]" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 pt-8 sm:pt-12 mt-8 sm:mt-12 border-t border-white/10">
            <div className="group/item cursor-default text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 sm:mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover/item:scale-150 transition-transform" />
                <p className="text-white/40 text-[11px] font-black uppercase tracking-widest">Recherche de Profits</p>
              </div>
              <p className="text-white/60 text-xs font-bold mb-0.5 sm:mb-1">Chiffre d'Affaires</p>
              <p className="text-2xl sm:text-3xl font-black group-hover/item:text-white transition-colors">{formatPrice(sales.total)} <span className="text-xs opacity-40 uppercase ml-1">CFA</span></p>
            </div>
            
            <div className="group/item cursor-default text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 sm:mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover/item:scale-150 transition-transform" />
                <p className="text-white/40 text-[11px] font-black uppercase tracking-widest">Investissement Direct</p>
              </div>
              <p className="text-white/60 text-xs font-bold mb-0.5 sm:mb-1">Production (Brute)</p>
              <p className="text-2xl sm:text-3xl font-black text-red-200/80 group-hover/item:text-red-100 transition-colors">-{formatPrice(costs.totalProd)} <span className="text-xs opacity-40 uppercase ml-1">CFA</span></p>
            </div>

            <div className="group/item cursor-default text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 sm:mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 group-hover/item:scale-150 transition-transform" />
                <p className="text-white/40 text-[11px] font-black uppercase tracking-widest">Charges Externes</p>
              </div>
              <p className="text-white/60 text-xs font-bold mb-0.5 sm:mb-1">Fonctionnement</p>
              <p className="text-2xl sm:text-3xl font-black text-orange-200/80 group-hover/item:text-orange-100 transition-colors">-{formatPrice(costs.operating)} <span className="text-xs opacity-40 uppercase ml-1">CFA</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Résultat Production" 
          value={`${formatPrice(kpi.resultatProduction)} F`}
          subValue="Bénéfice Direct (Ventes - Coûts)"
          icon={Activity} 
          color="blue"
          delay={0.1}
        />
        <StatCard 
          title="Volume de Vente" 
          value={`${sales.quantity} kg`}
          subValue={`${sales.v1kgNormal.length + sales.v1kgReduc.length} sacs 1kg • ${sales.v500gNormal.length + sales.v500gReduc.length} sacs 500g`}
          icon={ShoppingBag} 
          color="indigo"
          delay={0.2}
        />
        <StatCard 
          title="Capacité Produite" 
          value={`${production.quantity} kg`}
          subValue="Conditionné sur cette période"
          icon={Package} 
          color="emerald"
          delay={0.3}
        />
        <StatCard 
          title="Niveau de Stock" 
          value={`${production.quantity - sales.quantity} kg`}
          subValue="Estimation sur mouvement"
          icon={PieChartIcon} 
          color="purple"
          delay={0.4}
        />
      </div>

      {/* Analytics & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-5 premium-card p-6 sm:p-10 flex flex-col relative overflow-hidden"
        >
          <div className="absolute -right-12 -top-12 text-gray-50 opacity-20 group-hover:opacity-30 transition-opacity">
             <PieChartIcon size={250} />
          </div>
          
          <div className="flex items-center gap-3 mb-6 sm:mb-10 relative z-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-dmn-green-900 text-white flex items-center justify-center shadow-lg shadow-dmn-green-900/20 shrink-0">
              <Lightbulb size={18} className="sm:hidden" />
              <Lightbulb size={20} className="hidden sm:block" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Intelligence Commerciale</h3>
          </div>

          <div className="space-y-6 sm:space-y-8 relative z-10 flex-1">
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-soft transition-all duration-300">
               <div className={`p-1.5 sm:p-2 rounded-lg text-xs font-black uppercase tracking-widest w-fit mb-2 sm:mb-3 ${
                  insightTone === 'positive' ? 'bg-emerald-100 text-emerald-800' : 
                  insightTone === 'warning' ? 'bg-orange-100 text-orange-800' : 
                  'bg-red-100 text-red-800'
               }`}>
                  Synthèse Périodique
               </div>
               <p className="text-gray-600 font-medium leading-relaxed italic text-base sm:text-lg">
                 "{insightText}"
               </p>
            </div>

            <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 border-dashed ${
               insightTone === 'positive' ? 'bg-emerald-50/30 border-emerald-100' : 
               insightTone === 'warning' ? 'bg-orange-50/30 border-orange-100' : 
               'bg-red-50/30 border-red-100'
            }`}>
               <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 sm:mb-4">Plan d'Optimisation</p>
               <p className="text-sm sm:text-base text-gray-900 font-bold leading-snug">
                 {insightTone === 'positive' && "Modèle stable. Envisagez une expansion de la force de vente revendeurs pour augmenter les volumes globaux."}
                 {insightTone === 'warning' && "Optimisez les frais de fonctionnement. Chaque 1000F économisé sur les charges fixes augmente directement votre solde net."}
                 {insightTone === 'critical' && "Déséquilibre identifié. Reconsidérer les remises revendeurs ou ajuster le prix public."}
                 {insightTone === 'neutral' && "Analyse en attente de flux de données (ventes & production)."}
               </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-7 premium-card p-6 sm:p-10"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Répartition des Flux</h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5 text-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Revenus</span>
               </div>
               <div className="flex items-center gap-1.5 ml-0 sm:ml-4 text-center">
                  <div className="w-2 h-2 rounded-full bg-dmn-coffee" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dépenses</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 min-h-[300px] sm:h-[350px]">
             {/* Pie Chart */}
             <div className="flex-col h-[250px] sm:h-full bg-gray-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 flex">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 sm:mb-6">Origine des Coûts</p>
                {costsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        stroke="none"
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {costsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }}
                        formatter={(value) => `${formatPrice(value as number)} F`} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-300 font-black text-[8px] sm:text-[10px] uppercase tracking-widest">Données insuffisantes</div>
                )}
             </div>

             {/* Bar Chart */}
             <div className="flex-col h-[250px] sm:h-full bg-gray-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 flex">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 sm:mb-6">Ratio Ventes / Charges</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesVsCostsData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }}
                       cursor={{fill: 'rgba(0,0,0,0.02)'}} 
                       formatter={(value) => `${formatPrice(value as number)} F`} 
                    />
                    <Bar dataKey="Ventes" fill="#10B981" radius={[8, 8, 8, 8]} maxBarSize={25} />
                    <Bar dataKey="Coûts" fill="#6B3F2A" radius={[8, 8, 8, 8]} maxBarSize={25} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
