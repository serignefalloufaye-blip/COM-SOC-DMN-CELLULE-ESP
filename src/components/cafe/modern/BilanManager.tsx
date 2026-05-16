import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Calendar, FileText, PieChart, BarChart as BarChartIcon } from 'lucide-react';
import { formatPrice } from '../../../utils/format';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface BilanManagerProps {
  productions: any[];
  ventes: any[];
  depenses: any[];
  finance: any;
  periodString: string;
}

export function BilanManager({ finance, periodString }: BilanManagerProps) {
  const { costs, sales, kpi, monthlyTrend } = finance;

  const StatItem = ({ label, value, subValue, trend, type = 'default' }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 rounded-[2.5rem] bg-white border border-gray-100 flex flex-col justify-between group hover:border-dmn-green-100 hover:shadow-premium transition-all duration-500"
    >
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">{label}</p>
        <h3 className={`fintech-kpi text-3xl sm:text-4xl leading-tight ${type === 'positive' ? 'text-dmn-green-900' : type === 'negative' ? 'text-red-950' : 'text-gray-900'}`}>
           {value}
        </h3>
      </div>
      <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{subValue}</p>
        {trend !== undefined && (
          <div className={`px-3 py-1 rounded-full flex items-center gap-1 text-[11px] font-black ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Premium Header */}
      <div className="premium-card p-6 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10 bg-dmn-green-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(212,175,55,0.12),transparent_50%)]" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 relative z-10 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] border border-white/10 flex items-center justify-center text-dmn-gold shadow-2xl shrink-0">
            <PieChart size={28} strokeWidth={2.5} className="sm:hidden" />
            <PieChart size={36} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-none mb-2 sm:mb-3">Centre de Bilan</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
               <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-dmn-gold rounded-full animate-pulse" />
               <p className="text-xs font-black text-dmn-green-300 uppercase tracking-[0.2em] leading-none">Analyse Consolidée • {periodString}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 relative z-10">
           <div className="px-4 py-2 sm:px-6 sm:py-3 bg-white/10 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Marge Nette</span>
              <span className="text-base sm:text-lg font-black text-dmn-gold">{kpi.netMargin.toFixed(1)}%</span>
           </div>
           <div className="px-4 py-2 sm:px-6 sm:py-3 bg-dmn-coffee/20 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Vol. Prod</span>
              <span className="text-base sm:text-lg font-black text-white">{finance.production.quantity} kg</span>
           </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        <StatItem 
          label="Chiffre d'Affaires" 
          value={`${formatPrice(sales.total)} F`} 
          subValue={`${sales.quantity} kg vendus`}
          trend={8.4}
        />
        <StatItem 
          label="Coûts Production" 
          value={`${formatPrice(costs.totalProd)} F`} 
          subValue="Conso & Logistique"
          type="negative"
        />
        <StatItem 
          label="Bénéfice Brut" 
          value={`${formatPrice(kpi.resultatProduction)} F`} 
          subValue={`${kpi.margin.toFixed(1)}% de marge`}
          type="positive"
        />
        <StatItem 
          label="Résultat Net" 
          value={`${formatPrice(kpi.soldeNet)} F`} 
          subValue="Après OPEX"
          type={kpi.soldeNet >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Trend Analysis Chart */}
        <div className="lg:col-span-2 premium-card p-6 sm:p-10 flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-dmn-green-50 text-dmn-green-900 flex items-center justify-center shadow-sm shrink-0">
                <BarChartIcon size={20} className="sm:hidden" />
                <BarChartIcon size={24} className="hidden sm:block" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">Évolution</h3>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1.5 sm:mt-2">Revenus & résultats</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                 <div className="w-2 h-2 bg-dmn-green-600 rounded-full" />
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenus</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                 <div className="w-2 h-2 bg-dmn-gold rounded-full" />
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Résultats</span>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#064e3b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#064e3b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#64748b', letterSpacing: '0.05em'}} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 900, fontSize: '11px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ca" 
                    name="CA"
                    stroke="#064e3b" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorCa)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resultat" 
                    name="Résultat"
                    stroke="#D4AF37" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Meter */}
        <div className="premium-card p-6 sm:p-10 flex flex-col justify-between bg-gray-50 border-gray-100 hover:border-dmn-green-100 transition-all duration-500">
           <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mb-2">Score Santé</h3>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 sm:mb-12">Performance Relative</p>
              
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 mx-auto">
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                    <circle 
                      cx="64" cy="64" r="54" 
                      fill="transparent" 
                      stroke="#f1f5f9" 
                      strokeWidth="12"
                    />
                    <circle 
                      cx="64" cy="64" r="54" 
                      fill="transparent" 
                      stroke={kpi.netMargin >= 0 ? '#064e3b' : '#991b1b'} 
                      strokeWidth="12"
                      strokeDasharray={339.12} // 2 * pi * 54
                      strokeDashoffset={339.12 - (339.12 * Math.min(Math.max(kpi.netMargin, 0), 100)) / 100}
                      strokeLinecap="round"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="fintech-kpi text-2xl sm:text-4xl text-gray-900 leading-none">
                      {kpi.netMargin >= 0 ? '+' : ''}{kpi.netMargin.toFixed(0)}%
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1 sm:mt-2">MARGE NETTE</span>
                 </div>
              </div>
           </div>
           
           <div className="mt-8 sm:mt-12 p-4 sm:p-8 bg-white rounded-2xl sm:rounded-[2.5rem] shadow-soft border border-gray-50">
              <p className="text-xs font-bold text-gray-600 leading-relaxed italic text-center">
                "{kpi.netMargin > 25 ? 'Modèle économique hautement performant.' : kpi.netMargin > 10 ? 'Rentabilité stable.' : 'Attention: Marge étroite.'}"
              </p>
           </div>
        </div>
      </div>

      {/* Segment Distribution */}
      <div className="premium-card p-6 sm:p-12 overflow-hidden relative">
         <div className="absolute -left-10 -top-10 w-32 h-32 sm:w-40 sm:h-40 bg-gray-50 rounded-full" />
         <div className="relative z-10">
            <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                  <FileText size={20} className="sm:hidden" />
                  <FileText size={24} className="hidden sm:block" />
               </div>
               <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">Répartition Ventes</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
               {[
                 { 
                   label: "Format 1kg", 
                   normal: sales.v1kgNormal.reduce((a:any,b:any)=>a+(b.total||0), 0), 
                   reduc: sales.v1kgReduc.reduce((a:any,b:any)=>a+(b.total||0), 0),
                   qte: sales.v1kgNormal.reduce((a:any,b:any)=>a+b.quantite, 0) + sales.v1kgReduc.reduce((a:any,b:any)=>a+b.quantite, 0)
                 },
                 { 
                   label: "Format 500g", 
                   normal: sales.v500gNormal.reduce((a:any,b:any)=>a+(b.total||0), 0), 
                   reduc: sales.v500gReduc.reduce((a:any,b:any)=>a+(b.total||0), 0),
                   qte: sales.v500gNormal.reduce((a:any,b:any)=>a+b.quantite, 0) + sales.v500gReduc.reduce((a:any,b:any)=>a+b.quantite, 0)
                 }
               ].map((seg, i) => {
                 const totalSeg = seg.normal + seg.reduc;
                 return (
                   <div key={i} className="space-y-4 sm:space-y-6 p-6 sm:p-8 bg-gray-50/50 rounded-[2rem] sm:rounded-[3rem] border border-gray-100">
                      <div className="flex justify-between items-end">
                         <h4 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tighter">{seg.label}</h4>
                         <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{seg.qte} sacs</span>
                      </div>
                      
                      <div className="h-3 sm:h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                         <div className="h-full bg-dmn-green-900" style={{ width: `${(seg.normal / (totalSeg || 1)) * 100}%` }} />
                         <div className="h-full bg-dmn-gold" style={{ width: `${(seg.reduc / (totalSeg || 1)) * 100}%` }} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Standard</span>
                            <span className="fintech-kpi text-lg sm:text-xl text-dmn-green-900">{formatPrice(seg.normal)} F</span>
                         </div>
                         <div className="flex flex-col text-right">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Promo</span>
                            <span className="fintech-kpi text-lg sm:text-xl text-dmn-gold">{formatPrice(seg.reduc)} F</span>
                         </div>
                      </div>
                   </div>
                 )
               })}
            </div>
         </div>
      </div>
    </div>
  );
}
