import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Download, Printer, PieChart, Activity, Box, ShoppingCart, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { CafeProduction, CafeVente, CafeDepense } from '../../types';

interface CafeProductionReportProps {
  ventes: CafeVente[];
  depenses: CafeDepense[];
  productions: CafeProduction[];
  priceConfig: any;
}

const StatCard = ({ icon: Icon, title, value, subValue, color, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 bg-${color}-500 transform group-hover:scale-150 transition-transform duration-500`} />
    <div className="flex items-start justify-between relative z-10">
      <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="mt-4 relative z-10">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className={`text-2xl sm:text-3xl font-black text-gray-900 tracking-tight`}>{value}</h3>
      {subValue && <p className={`text-xs font-bold mt-1 text-${color}-600`}>{subValue}</p>}
    </div>
  </motion.div>
);

const DetailRow = ({ label, qte, total, isReduc = false }: any) => (
  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${isReduc ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </div>
    <div className="flex items-center gap-4">
      {qte !== undefined && <span className="text-xs font-black text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">{qte} u</span>}
      <span className="text-sm font-black text-gray-900 tabular-nums w-24 text-right">{formatPrice(total)} F</span>
    </div>
  </div>
);

export const CafeProductionReport: React.FC<CafeProductionReportProps> = ({ ventes, depenses, productions, priceConfig }) => {
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [referenceDate, setReferenceDate] = useState(new Date());

  const periodString = useMemo(() => {
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth();
    if (periodType === 'year') return `Année ${y}`;
    if (periodType === 'quarter') {
      const q = Math.floor(m / 3) + 1;
      return `Trimestre ${q} ${y}`;
    }
    return referenceDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  }, [periodType, referenceDate]);

  const changePeriod = (dir: number) => {
    const d = new Date(referenceDate);
    if (periodType === 'month') d.setMonth(d.getMonth() + dir);
    if (periodType === 'quarter') d.setMonth(d.getMonth() + (dir * 3));
    if (periodType === 'year') d.setFullYear(d.getFullYear() + dir);
    setReferenceDate(d);
  };

  const isInPeriod = (timestamp: number) => {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = d.getMonth();
    const ry = referenceDate.getFullYear();
    const rm = referenceDate.getMonth();

    if (y !== ry) return false;
    if (periodType === 'year') return true;
    if (periodType === 'quarter') return Math.floor(m / 3) === Math.floor(rm / 3);
    return m === rm;
  };

  const periodVentes = useMemo(() => ventes.filter(v => isInPeriod(v.date || 0)), [ventes, periodType, referenceDate]);
  const periodDepenses = useMemo(() => depenses.filter(d => isInPeriod(d.date || 0)), [depenses, periodType, referenceDate]);
  const periodProductions = useMemo(() => productions.filter(p => isInPeriod(p.date || 0)), [productions, periodType, referenceDate]);

  // Production Costs
  const grains = periodDepenses.filter(d => d.categorie === 'matières premières' || d?.motif?.toLowerCase().includes('grain') || d?.motif?.toLowerCase().includes('cafe')).reduce((a,b)=>a+b.montant, 0);
  const transport = periodDepenses.filter(d => d.categorie === 'transport').reduce((a,b)=>a+b.montant, 0);
  const emballage = periodDepenses.filter(d => d.categorie === 'emballage').reduce((a,b)=>a+b.montant, 0);
  // Any "autres" expense that has "transfert" in it is considered as production cost "Frais de transfert"
  const fraisTransfert = periodDepenses.filter(d => d.categorie === 'autres' && d?.motif?.toLowerCase().includes('transfert')).reduce((a,b)=>a+b.montant, 0);
  
  const sumProdCosts = grains + transport + emballage + fraisTransfert;

  // Monthly Expenses (non-production expenses)
  const depensesMois = periodDepenses.filter(d => d.categorie === 'autres' && !d?.motif?.toLowerCase().includes('grain') && !d?.motif?.toLowerCase().includes('cafe') && !d?.motif?.toLowerCase().includes('transfert'));
  const totalDepensesMois = depensesMois.reduce((a, b) => a + b.montant, 0);

  // Sales
  const offPx1 = priceConfig?.prices?.['1kg']?.price || 2500;
  const offPx5 = priceConfig?.prices?.['500g']?.price || 1300;

  const v1kg = periodVentes.filter(v => v.format === '1kg');
  const v1kNormal = v1kg.filter(v => v.prixUnitaire >= offPx1);
  const v1kReduc = v1kg.filter(v => v.prixUnitaire < offPx1);

  const v500g = periodVentes.filter(v => v.format === '500g' || v.format === '1/2kg');
  const v500gNormal = v500g.filter(v => v.prixUnitaire >= offPx5);
  const v500gReduc = v500g.filter(v => v.prixUnitaire < offPx5);

  const totalVentes = periodVentes.reduce((a, b) => a + (b.total || 0), 0);
  
  // Results Logic matching Spreadsheet 
  // RESULTAT DU MOIS (Bénéfice) = Ventes - Coût Production
  const resultatMois = totalVentes - sumProdCosts;
  // SOLDE DU MOIS = Bénéfice - Dépenses du mois
  const soldeMois = resultatMois - totalDepensesMois;
  const margin = totalVentes > 0 ? (resultatMois / totalVentes) * 100 : 0;

  // AI Comment
  let comment = "Période sans activité significative enregistrée.";
  let insightMode: 'success' | 'warning' | 'info' = 'info';
  
  if (totalVentes > 0 && soldeMois > 0) {
    comment = `Le solde est positif de ${formatPrice(soldeMois)} F avec un résultat de production de ${formatPrice(resultatMois)} F (${margin.toFixed(1)}% de marge). La stratégie commerciale couvre efficacement les charges.`;
    insightMode = 'success';
  } else if (totalVentes > 0 && soldeMois <= 0 && resultatMois > 0) {
    comment = `Le résultat de production est excédentaire, mais les dépenses de fonctionnement (${formatPrice(totalDepensesMois)} F) absorbent l'intégralité du bénéfice, causant un solde négatif.`;
    insightMode = 'warning';
  } else if (totalVentes > 0 && resultatMois <= 0) {
    comment = `Attention, les ventes ne couvrent pas le coût de production. Le résultat est déficitaire de ${formatPrice(resultatMois)} F. Révisez les charges de production ou augmentez les tarifs.`;
    insightMode = 'warning';
  } else if (sumProdCosts > 0 && totalVentes === 0) {
    comment = `Investissements réalisés (${formatPrice(sumProdCosts)} F), en attente des premières ventes pour la période.`;
    insightMode = 'warning';
  }

  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 p-2 sm:p-0 rounded-3xl print:hidden">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Rapport d'Exploitation</h2>
          <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-full">Finance & Production</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="bg-white p-1.5 rounded-2xl flex border border-gray-100 shadow-sm w-full sm:w-auto">
            <button onClick={() => setPeriodType('month')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${periodType==='month'?'bg-blue-500 shadow-md shadow-blue-500/20 text-white':'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>Mois</button>
            <button onClick={() => setPeriodType('quarter')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${periodType==='quarter'?'bg-blue-500 shadow-md shadow-blue-500/20 text-white':'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>Trim.</button>
            <button onClick={() => setPeriodType('year')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${periodType==='year'?'bg-blue-500 shadow-md shadow-blue-500/20 text-white':'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>Année</button>
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 bg-white px-2 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <button onClick={() => changePeriod(-1)} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 transition-colors active:scale-95"><ChevronLeft size={16}/></button>
            <span className="text-xs font-black text-gray-900 min-w-[120px] text-center capitalize">{periodString}</span>
            <button onClick={() => changePeriod(1)} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 transition-colors active:scale-95"><ChevronRight size={16}/></button>
          </div>

          <button onClick={handlePrint} className="hidden sm:flex p-3 bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all active:scale-95">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div id="print-area" className="space-y-6 sm:space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            icon={TrendingUp} 
            title="Total Ventes" 
            value={`${formatPrice(totalVentes)} F`} 
            subValue={`${periodVentes.length} transactions`}
            color="emerald" 
            delay={0.1} 
          />
          <StatCard 
            icon={Box} 
            title="Coûts Production" 
            value={`${formatPrice(sumProdCosts)} F`} 
            subValue="Matières 1ères & Traitements"
            color="red" 
            delay={0.2} 
          />
          <StatCard 
            icon={Activity} 
            title="Dépenses Fonctionnement" 
            value={`${formatPrice(totalDepensesMois)} F`} 
            subValue="Hors coûts de production"
            color="orange" 
            delay={0.3} 
          />
          <StatCard 
            icon={DollarSign} 
            title="Résultat Production" 
            value={`${formatPrice(resultatMois)} F`} 
            subValue={`Marge: ${margin.toFixed(1)}%`}
            color={resultatMois >= 0 ? "blue" : "red"} 
            delay={0.4} 
          />
        </div>

        {/* AI Insight */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center border ${
            insightMode === 'success' ? 'bg-emerald-50/50 border-emerald-100' :
            insightMode === 'warning' ? 'bg-amber-50/50 border-amber-100' :
            'bg-blue-50/50 border-blue-100'
          }`}
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className={`p-4 rounded-2xl shrink-0 ${
            insightMode === 'success' ? 'bg-emerald-100 text-emerald-600' :
            insightMode === 'warning' ? 'bg-amber-100 text-amber-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {insightMode === 'success' ? <CheckCircle2 size={32} /> :
             insightMode === 'warning' ? <AlertCircle size={32} /> :
             <Info size={32} />}
          </div>
          <div className="z-10 relative">
            <h3 className={`text-xs font-black uppercase tracking-widest mb-2 ${
              insightMode === 'success' ? 'text-emerald-800' :
              insightMode === 'warning' ? 'text-amber-800' :
              'text-blue-800'
            }`}>Analyse Financière Intuitive</h3>
            <p className={`text-sm md:text-base font-bold leading-relaxed ${
              insightMode === 'success' ? 'text-emerald-950' :
              insightMode === 'warning' ? 'text-amber-950' :
              'text-blue-950'
            }`}>{comment}</p>
          </div>
        </motion.div>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Left Column: Cost & Expenses */}
          <div className="space-y-6 sm:space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm"
            >
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-500 rounded-xl"><Box size={18} /></div>
                Détails Coût de Production
              </h3>
              <div className="space-y-2">
                <DetailRow label="Grains / Matières Premières" total={grains} />
                <DetailRow label="Transport" total={transport} />
                <DetailRow label="Moulage / Traitement" total={0} />
                <DetailRow label="Emballage" total={emballage} />
                <DetailRow label="Frais divers / Transferts" total={fraisTransfert} />
              </div>
              <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center px-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Coûts</span>
                <span className="text-xl font-black text-red-600">{formatPrice(sumProdCosts)} F</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col h-[400px]"
            >
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3 shrink-0">
                <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Activity size={18} /></div>
                Timeline des Dépenses (Fonctionnement)
              </h3>
              
              <div className="flex-1 overflow-y-auto w-full pr-2 space-y-4 no-scrollbar">
                {depensesMois.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Activity size={32} className="mb-2 opacity-50" />
                    <p className="text-xs font-bold">Aucune dépense enregistrée</p>
                  </div>
                ) : (
                  <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                    {depensesMois.slice().sort((a,b)=>b.date - a.date).map(d => (
                      <div key={d.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-white border-2 border-orange-400 rounded-full" />
                        <div className="pl-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                          <div className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 capitalize">{d.categorie}</h4>
                                {d.motif && d.motif !== d.categorie && (
                                  <p className="text-xs font-medium text-gray-500 mt-1 line-clamp-2">{d.motif}</p>
                                )}
                              </div>
                              <span className="text-sm font-black text-orange-600 whitespace-nowrap">{formatPrice(d.montant)} F</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Sales Analysis & Final Result */}
          <div className="space-y-6 sm:space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm"
            >
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><ShoppingCart size={18} /></div>
                Analyse des Ventes
              </h3>
              
              <div className="space-y-2">
                <DetailRow label="KG Sans Réduction" qte={v1kNormal.reduce((a,b)=>a+b.quantite,0)} total={v1kNormal.reduce((a,b)=>a+b.total,0)} />
                <DetailRow label="1/2 KG Sans Réduction" qte={v500gNormal.reduce((a,b)=>a+b.quantite,0)} total={v500gNormal.reduce((a,b)=>a+b.total,0)} />
                <DetailRow label="KG Avec Réduction" isReduc qte={v1kReduc.reduce((a,b)=>a+b.quantite,0)} total={v1kReduc.reduce((a,b)=>a+b.total,0)} />
                <DetailRow label="1/2 KG Avec Réduction" isReduc qte={v500gReduc.reduce((a,b)=>a+b.quantite,0)} total={v500gReduc.reduce((a,b)=>a+b.total,0)} />
              </div>
              
              <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center px-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Revenus des Ventes</span>
                <span className="text-xl font-black text-emerald-600">{formatPrice(totalVentes)} F</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className={`rounded-3xl p-8 border shadow-lg relative overflow-hidden ${
                soldeMois >= 0 
                  ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-gray-800'
                  : 'bg-gradient-to-br from-red-900 to-red-950 border-red-800'
              }`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <PieChart size={120} className="text-white" />
              </div>
              
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[250px]">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Bilan & Solde du {periodString}</h3>
                  <div className="flex justify-between items-center border-b border-gray-700/50 pb-4 mb-4">
                    <p className="text-sm font-bold text-gray-400">Résultat Production</p>
                    <p className={`text-xl font-black tracking-tighter ${resultatMois >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                       {formatPrice(resultatMois)} F
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-300 mb-2">Solde Net du Mois</p>
                  <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter ${soldeMois >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {soldeMois > 0 ? '+' : ''}{formatPrice(soldeMois)} <span className="text-xl sm:text-3xl font-bold opacity-50">CFA</span>
                  </h1>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-700/50">
                   <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Marge Nette</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-800/50 h-2.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                            transition={{ delay: 1, duration: 1 }}
                            className={`h-full ${margin > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                          />
                        </div>
                        <p className="text-lg font-bold text-white">{margin.toFixed(1)}%</p>
                      </div>
                   </div>
                   <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-gray-700/50 pt-4 sm:pt-0 sm:pl-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Qtes Vendues.</p>
                      <p className="text-lg font-bold text-white">{periodVentes.reduce((a,b)=>a+b.quantite,0)} Unités</p>
                   </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};
