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
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">{label}</p>
        <h3 className={`fintech-kpi text-4xl leading-tight ${type === 'positive' ? 'text-dmn-green-900' : type === 'negative' ? 'text-red-950' : 'text-gray-900'}`}>
           {value}
        </h3>
      </div>
      <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{subValue}</p>
        {trend !== undefined && (
          <div className={`px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Premium Header */}
      <div className="premium-card p-12 flex flex-col md:flex-row items-center justify-between gap-10 bg-dmn-green-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(212,175,55,0.12),transparent_50%)]" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 flex items-center justify-center text-dmn-gold shadow-2xl">
            <PieChart size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight leading-none mb-3">Centre de Bilan</h2>
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 bg-dmn-gold rounded-full animate-pulse" />
               <p className="text-xs font-black text-dmn-green-300 uppercase tracking-[0.4em] leading-none">Analyse Consolidée • {periodString}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
           <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Marge Nette</span>
              <span className="text-lg font-black text-dmn-gold">{kpi.netMargin.toFixed(1)}%</span>
           </div>
           <div className="px-6 py-3 bg-dmn-coffee/20 rounded-2xl border border-white/10 flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Vol. Prod</span>
              <span className="text-lg font-black text-white">{finance.production.quantity} kg</span>
           </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatItem 
          label="Chiffre d'Affaires" 
          value={`${formatPrice(sales.total)} F`} 
          subValue={`${sales.quantity} kg vendus`}
          trend={8.4}
        />
        <StatItem 
          label="Coûts Production" 
          value={`${formatPrice(costs.totalProd)} F`} 
          subValue="Consommation & Logistique"
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
          subValue="Après déduction OPEX"
          type={kpi.soldeNet >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Analysis Chart */}
        <div className="lg:col-span-2 premium-card p-10 flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-dmn-green-50 text-dmn-green-900 flex items-center justify-center shadow-sm">
                <BarChartIcon size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Évolution Temporelle</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Trajectoire des revenus et résultats</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-dmn-green-600 rounded-full" />
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Revenus</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-dmn-coffee rounded-full" />
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Évolution</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
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
                    tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1', letterSpacing: '0.1em'}} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 900, fontSize: '13px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ca" 
                    name="Chiffre d'Affaires"
                    stroke="#064e3b" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorCa)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resultat" 
                    name="Résultat Net"
                    stroke="#D4AF37" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Meter */}
        <div className="premium-card p-10 flex flex-col justify-between bg-gray-50 border-gray-100 hover:border-dmn-green-100 transition-all duration-500">
           <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Score Santé</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-12">Performance Relative OPEX / CA</p>
              
              <div className="relative w-48 h-48 mx-auto">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="96" cy="96" r="80" 
                      fill="transparent" 
                      stroke="#f1f5f9" 
                      strokeWidth="18"
                    />
                    <circle 
                      cx="96" cy="96" r="80" 
                      fill="transparent" 
                      stroke={kpi.netMargin >= 0 ? '#064e3b' : '#991b1b'} 
                      strokeWidth="18"
                      strokeDasharray={502.4}
                      strokeDashoffset={502.4 - (502.4 * Math.min(Math.max(kpi.netMargin, 0), 100)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="fintech-kpi text-4xl text-gray-900 leading-none">
                      {kpi.netMargin >= 0 ? '+' : ''}{kpi.netMargin.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">MARGE NETTE</span>
                 </div>
              </div>
           </div>
           
           <div className="mt-12 p-8 bg-white rounded-[2.5rem] shadow-soft border border-gray-50">
              <p className="text-xs font-bold text-gray-600 leading-relaxed italic text-center">
                "{kpi.netMargin > 25 ? 'Modèle économique hautement performant. Capacité d\'investissement élevée.' : kpi.netMargin > 10 ? 'Rentabilité stable. Surveillance des charges d\'exploitation recommandée.' : 'Attention: Marge étroite. Analyser les dépenses variables.'}"
              </p>
           </div>
        </div>
      </div>

      {/* Segment Distribution */}
      <div className="premium-card p-12 overflow-hidden relative">
         <div className="absolute -left-10 -top-10 w-40 h-40 bg-gray-50 rounded-full" />
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
               <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
                  <FileText size={24} />
               </div>
               <h3 className="text-3xl font-black text-gray-900 tracking-tight">Répartition des Ventes</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                   <div key={i} className="space-y-6 p-8 bg-gray-50/50 rounded-[3rem] border border-gray-100">
                      <div className="flex justify-between items-end">
                         <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{seg.label}</h4>
                         <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{seg.qte} sachets</span>
                      </div>
                      
                      <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                         <div className="h-full bg-dmn-green-900" style={{ width: `${(seg.normal / (totalSeg || 1)) * 100}%` }} />
                         <div className="h-full bg-dmn-gold" style={{ width: `${(seg.reduc / (totalSeg || 1)) * 100}%` }} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Standard</span>
                            <span className="fintech-kpi text-xl text-dmn-green-900">{formatPrice(seg.normal)} F</span>
                         </div>
                         <div className="flex flex-col text-right">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Promotion</span>
                            <span className="fintech-kpi text-xl text-dmn-gold">{formatPrice(seg.reduc)} F</span>
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
