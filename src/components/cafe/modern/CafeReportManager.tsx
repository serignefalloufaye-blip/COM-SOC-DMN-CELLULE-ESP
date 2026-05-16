import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Download, FileText, Printer, FileSpreadsheet, Loader2, BrainCircuit, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { ReportService } from '../../../services/ReportService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

interface CafeReportManagerProps {
  productions: any[];
  ventes: any[];
  depenses: any[];
  finance: any;
  periodString: string;
}

export function CafeReportManager({ productions, ventes, depenses, finance, periodString }: CafeReportManagerProps) {
  const { kpi, sales, costs, production } = finance;
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const insights = useMemo(() => {
    return ReportService.getCafeInsights({ ventes, productions, depenses });
  }, [ventes, productions, depenses]);

  const chartData = useMemo(() => {
    // Group sales by date for the chart
    const dailyMap = new Map();
    ventes.forEach(v => {
      const d = simpleDate(v.date);
      dailyMap.set(d, (dailyMap.get(d) || 0) + (v.total || 0));
    });
    return Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total })).sort((a,b) => a.date.localeCompare(b.date));
  }, [ventes]);

  const handlePrint = () => {
    window.print();
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Rapport_Noreyni_${periodString.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Data for Summary
      const summaryData = [
        ["Rapport Analytique - Café Noreyni Madjmahoune"],
        ["Période", periodString],
        [""],
        ["Synthèse Financière"],
        ["KPI", "Valeur"],
        ["Chiffre d'Affaires", sales.total],
        ["Coût Production", costs.totalProd],
        ["Marge Production", kpi.resultatProduction],
        ["Frais Fonctionnement", costs.operating],
        ["Solde Net", kpi.soldeNet]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse");

      // Data for Sales
      const salesData = ventes.map(v => ({
        Date: simpleDate(v.date),
        Format: v.format,
        Client: v.clientType === 'revendeur' ? 'Revendeur' : 'Standard',
        Quantité: v.quantite,
        'Prix Unitaire': v.prixUnitaire,
        Total: v.total
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, "Ventes");

      // Data for Costs
      const costsData = depenses.map(d => ({
        Date: simpleDate(d.date),
        Motif: d.motif,
        Type: d.type === 'prod' ? 'Production' : 'Fonctionnement',
        Montant: d.montant
      }));
      const wsCosts = XLSX.utils.json_to_sheet(costsData);
      XLSX.utils.book_append_sheet(wb, wsCosts, "Dépenses");

      XLSX.writeFile(wb, `Audit_Noreyni_${periodString.replace(/\s+/g, '_')}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("Erreur lors de la génération du fichier Excel.");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <div className="premium-card p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 bg-gray-900 border-gray-800 print:hidden overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/[0.03] text-dmn-green-500 rounded-2xl sm:rounded-[2rem] border border-white/5 flex items-center justify-center shadow-2xl backdrop-blur-xl shrink-0">
            <FileText size={24} strokeWidth={2.5} className="sm:hidden" />
            <FileText size={32} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Console de Rapports</h2>
            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Exportations certifiées</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 relative z-10 w-full md:w-auto">
          <button 
             onClick={handlePrint} 
             className="flex-1 md:flex-none h-[42px] sm:h-[54px] px-3 sm:px-6 bg-white/5 text-white/70 border border-white/10 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-white/10 hover:text-white"
          >
             <Printer size={14} />
             <span className="hidden sm:inline">Papier</span>
             <span className="sm:hidden">Print</span>
          </button>
          
          <button 
             onClick={downloadPDF} 
             disabled={isExporting}
             className="flex-1 md:flex-none h-[42px] sm:h-[54px] px-3 sm:px-6 bg-white text-gray-900 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 hover:bg-gray-100 disabled:opacity-50"
          >
             {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
             <span>PDF</span>
          </button>

          <button 
             onClick={downloadExcel} 
             className="flex-1 md:flex-none h-[42px] sm:h-[54px] px-3 sm:px-6 bg-dmn-green-900 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 hover:bg-dmn-green-800"
          >
             <FileSpreadsheet size={14} />
             <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Intelligent Analysis Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 premium-card p-6 sm:p-10 bg-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-dmn-green-50 text-dmn-green-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Évolution des Revenus</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Analyse Temporelle</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 800, color: '#10b981' }}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card p-6 sm:p-10 bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-dmn-green-500 text-white rounded-xl flex items-center justify-center">
                <BrainCircuit size={20} />
              </div>
              <h3 className="text-lg font-black tracking-tight">Intelligence DMN</h3>
            </div>

            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all"
                >
                  <div className="shrink-0 mt-1">
                    {insight.includes('Attention') || insight.includes('Alerte') ? (
                      <AlertCircle size={18} className="text-amber-400" />
                    ) : (
                      <CheckCircle2 size={18} className="text-dmn-green-400" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-300 leading-relaxed group-hover:text-white transition-colors">{insight}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-[9px] font-black text-dmn-green-500 uppercase tracking-[0.3em]">Recommandation</p>
              <p className="text-[11px] font-medium text-gray-400 mt-2 italic leading-relaxed">
                "Analysez les pics de vente pour optimiser les plannings de production et réduire les ruptures de stock."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resellers Performance Section */}
      <div className="premium-card p-6 sm:p-10 bg-white overflow-hidden relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Performance des Revendeurs</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Classement & Analyse Commerciale</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {ventes.filter(v => v.vendeurId).length === 0 ? (
             <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Aucune donnée revendeur sur cette période</p>
             </div>
           ) : (
             Object.entries(
               ventes.filter(v => v.vendeurId).reduce((acc: any, curr) => {
                 const vId = curr.vendeurId;
                 if (!acc[vId]) acc[vId] = { qty: 0, total: 0, count: 0 };
                 acc[vId].qty += curr.quantite || 0;
                 acc[vId].total += curr.total || 0;
                 acc[vId].count++;
                 return acc;
               }, {})
             )
             .sort((a: any, b: any) => b[1].total - a[1].total)
             .map(([vId, stats]: any, idx) => (
                <div key={vId} className="group p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-dmn-gold text-white' : 'bg-gray-200 text-gray-500'} rounded-bl-2xl`}>
                    #{idx + 1}
                  </div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Revendeur ID: {vId.substring(0, 8)}</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-gray-500">Volume Vendu</span>
                      <span className="text-lg font-black text-gray-900">{stats.qty} <span className="text-[10px] opacity-30">kg</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-dmn-green-500" style={{ width: `${Math.min(100, (stats.total / (sales.total || 1)) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-gray-500">Chiffre d'Affaire</span>
                      <span className="text-xl font-black text-dmn-green-600">{formatPrice(stats.total)} F</span>
                    </div>
                  </div>
                </div>
             ))
           )}
        </div>
      </div>

      {/* A4 Report Preview */}
      <div 
        className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-premium border border-gray-100 mx-auto w-full max-w-4xl p-6 sm:p-20 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none transition-all duration-500 hover:shadow-2xl" 
        ref={printRef} 
        id="printable-report"
      >
         <div className="border-b-[6px] sm:border-b-[10px] border-dmn-green-950 pb-6 sm:pb-10 mb-8 sm:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <div className="w-12 h-1 bg-dmn-gold mb-4 sm:mb-6 rounded-full" />
               <h1 className="text-2xl sm:text-4xl font-black text-dmn-green-950 tracking-tighter uppercase mb-1 sm:mb-2 text-wrap">RAPPORT ANALYTIQUE</h1>
               <h2 className="text-base sm:text-xl font-bold text-gray-400 tracking-tight uppercase">Café Noreyni Madjmahoune</h2>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
               <p className="text-[8px] sm:text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-1 sm:mb-2 leading-none">Exercice Commercial</p>
               <p className="text-xl sm:text-3xl font-black text-dmn-green-950 tracking-tighter">{periodString}</p>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-12 mb-8 sm:mb-16">
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-gray-50 border border-gray-100 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-16 h-16 bg-dmn-green-900/5 rounded-full blur-xl animate-pulse" />
               <h3 className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 sm:mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-dmn-coffee" />
                 Synthèse Production
               </h3>
               <div className="space-y-3 sm:space-y-4">
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-xs sm:text-sm">Volume Global</span><span className="fintech-kpi text-lg sm:text-xl text-gray-900">{production.quantity} <span className="text-[10px] opacity-30 ml-0.5 sm:ml-1">kg</span></span></div>
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-xs sm:text-sm">Coût Revient</span><span className="fintech-kpi text-lg sm:text-xl text-dmn-green-950">{formatPrice(costs.totalProd)} <span className="text-[10px] opacity-30 ml-0.5 sm:ml-1">F</span></span></div>
               </div>
            </div>
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-gray-50 border border-gray-100 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-16 h-16 bg-dmn-green-900/5 rounded-full blur-xl animate-pulse" />
               <h3 className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 sm:mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-dmn-green-600" />
                 Synthèse Commerciale
               </h3>
               <div className="space-y-3 sm:space-y-4">
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-xs sm:text-sm">Quantité Vendue</span><span className="fintech-kpi text-lg sm:text-xl text-gray-900">{sales.quantity} <span className="text-[10px] opacity-30 ml-0.5 sm:ml-1 text-emerald-600">kg</span></span></div>
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-xs sm:text-sm">Chiffre Affaires</span><span className="fintech-kpi text-xl sm:text-2xl text-dmn-green-900">{formatPrice(sales.total)} <span className="text-[10px] opacity-30 ml-0.5 sm:ml-1">F</span></span></div>
               </div>
            </div>
         </div>

         <div className="mb-8 sm:mb-16">
            <h3 className="text-lg sm:text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
               <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-[10px] sm:text-xs font-black">01</span>
               Ventilation Analytique
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                 <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Poste</th>
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails</th>
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">Grains</td><td className="p-4 sm:p-6 text-gray-500 text-[10px] sm:text-sm">Achat matière première</td><td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(costs.grains)} F</td></tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">Transport</td><td className="p-4 sm:p-6 text-gray-500 text-[10px] sm:text-sm">Acheminement & Logistique</td><td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(costs.transport)} F</td></tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">Moulage</td><td className="p-4 sm:p-6 text-gray-500 text-[10px] sm:text-sm">Transformation & Usinage</td><td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(costs.transfert)} F</td></tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">Emballage</td><td className="p-4 sm:p-6 text-gray-500 text-[10px] sm:text-sm">Sachets & Étiquetage</td><td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(costs.emballage)} F</td></tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">Frais transfert</td><td className="p-4 sm:p-6 text-gray-500 text-[10px] sm:text-sm">Transactions & Commissions</td><td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(costs.autresProduction)} F</td></tr>
                 </tbody>
                 <tfoot>
                    <tr className="bg-dmn-green-950 text-white rounded-b-xl overflow-hidden">
                       <td colSpan={2} className="p-4 sm:p-8 font-black text-right uppercase text-[8px] sm:text-[10px] tracking-[0.3em] opacity-60">Total Investissement Production</td>
                       <td className="p-4 sm:p-8 fintech-kpi text-lg sm:text-2xl text-right text-dmn-gold">{formatPrice(costs.totalProd)} F</td>
                    </tr>
                 </tfoot>
              </table>
            </div>
         </div>

         <div className="mb-0 sm:mb-16">
            <h3 className="text-lg sm:text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
               <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-[10px] sm:text-xs font-black">02</span>
               Détail des Ventes
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                 <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Éléments</th>
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qté</th>
                       <th className="p-4 sm:p-6 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    <tr className="group hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">1Kg (Normal)</td>
                      <td className="p-4 sm:p-6 text-center font-bold">{sales.v1kgNormal.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                      <td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(sales.v1kgNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                    </tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">500g (Normal)</td>
                      <td className="p-4 sm:p-6 text-center font-bold">{sales.v500gNormal.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                      <td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-gray-900">{formatPrice(sales.v500gNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                    </tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">1Kg (Promo/Rev.)</td>
                      <td className="p-4 sm:p-6 text-center font-bold">{sales.v1kgReduc.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                      <td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-dmn-gold">{formatPrice(sales.v1kgReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                    </tr>
                    <tr className="group hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-6 font-bold text-gray-900 text-xs sm:text-base">500g (Promo/Rev.)</td>
                      <td className="p-4 sm:p-6 text-center font-bold">{sales.v500gReduc.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                      <td className="p-4 sm:p-6 text-right fintech-kpi text-base sm:text-lg text-dmn-gold">{formatPrice(sales.v500gReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                    </tr>
                 </tbody>
                 <tfoot>
                    <tr className="bg-gray-900 text-white rounded-b-xl overflow-hidden">
                       <td colSpan={2} className="p-4 sm:p-8 font-black text-right uppercase text-[8px] sm:text-[10px] tracking-[0.3em] opacity-60">Chiffre d'Affaires Total (CA)</td>
                       <td className="p-4 sm:p-8 fintech-kpi text-lg sm:text-2xl text-right text-white">{formatPrice(sales.total)} F</td>
                    </tr>
                 </tfoot>
              </table>
            </div>
         </div>

         <div className="mb-0 sm:mb-16">
            <h3 className="text-lg sm:text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
               <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-[10px] sm:text-xs font-black">03</span>
               Flux & Résultat Net
            </h3>
            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border-2 sm:border-4 border-dmn-green-950 overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center p-4 sm:p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">Chiffre Affaires</span>
                  <span className="fintech-kpi text-xl sm:text-3xl text-dmn-green-900">{formatPrice(sales.total)} F</span>
               </div>
               <div className="flex justify-between items-center p-4 sm:p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">Charges Dir.</span>
                  <span className="fintech-kpi text-lg sm:text-2xl text-red-600">-{formatPrice(costs.totalProd)} F</span>
               </div>
               <div className="flex justify-between items-center p-4 sm:p-8 bg-gray-50 border-b border-gray-100">
                  <span className="font-black text-dmn-green-950 uppercase tracking-widest text-[10px] sm:text-xs">Marge Opérat.</span>
                  <span className="fintech-kpi text-xl sm:text-2xl text-dmn-green-900">{formatPrice(kpi.resultatProduction)} F</span>
               </div>
               <div className="flex justify-between items-center p-4 sm:p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">Charges Op.</span>
                  <span className="fintech-kpi text-lg sm:text-2xl text-dmn-coffee">-{formatPrice(costs.operating)} F</span>
               </div>
               <div className={`flex flex-col sm:flex-row justify-between items-center p-6 sm:p-12 ${kpi.soldeNet >= 0 ? 'bg-dmn-green-900' : 'bg-red-900'} text-white relative overflow-hidden text-center sm:text-left gap-4`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <span className="font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-sm sm:text-xl relative z-10">SOLDE NET</span>
                  <span className="fintech-kpi text-3xl sm:text-6xl relative z-10 tracking-tighter">{kpi.soldeNet > 0 ? '+' : ''}{formatPrice(kpi.soldeNet)} <span className="text-xs sm:text-xl opacity-50 ml-1 sm:ml-2">F CFA</span></span>
               </div>
            </div>
         </div>

         <div className="mt-16 sm:mt-32 pt-8 sm:pt-16 border-t-2 border-dashed border-gray-200 flex flex-col md:flex-row justify-between gap-12 sm:gap-12">
            <div className="text-center md:text-left">
               <p className="font-black text-gray-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[8px] sm:text-[9px] mb-8 sm:mb-20">Certification Responsable</p>
               <div className="border-t border-gray-200 w-48 sm:w-64 mx-auto md:mx-0 pt-4 text-[10px] sm:text-xs font-black uppercase text-gray-900 tracking-widest">Signat. & Date</div>
            </div>
            <div className="text-center md:text-right">
               <p className="font-black text-gray-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[8px] sm:text-[9px] mb-8 sm:mb-20">Contrôle Financier</p>
               <div className="border-t border-gray-200 w-48 sm:w-64 mx-auto md:ml-auto pt-4 text-[10px] sm:text-xs font-black uppercase text-gray-900 tracking-widest">Cachet</div>
            </div>
         </div>

         <div className="mt-16 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
             Système Certifié Noreyni Analytique • Gen: {new Date().toLocaleDateString('fr-FR')} • {new Date().toLocaleTimeString('fr-FR')}
         </div>
      </div>
      
      {/* Styles d'impression globaux */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2cm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
