import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import { formatPrice } from '../../../utils/format';
import { simpleDate } from '../../../utils/date';

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="premium-card p-10 flex flex-col md:flex-row items-center justify-between gap-8 bg-gray-900 border-gray-800 print:hidden overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-white/[0.03] text-dmn-green-500 rounded-[2rem] border border-white/5 flex items-center justify-center shadow-2xl backdrop-blur-xl">
            <FileText size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Console de Rapports</h2>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Exportations certifiées & Documentations</p>
          </div>
        </div>
        
        <div className="flex gap-4 relative z-10 w-full md:w-auto">
          <button 
             onClick={handlePrint} 
             className="flex-1 md:flex-none h-[60px] px-8 bg-white text-gray-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 hover:bg-gray-100"
          >
             <Printer size={18} strokeWidth={3} />
             <span>Imprimer / PDF</span>
          </button>
          <button 
             onClick={() => alert("L'export Excel BI sera disponible prochainement.")} 
             className="flex-1 md:flex-none h-[60px] px-8 bg-dmn-green-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 hover:bg-dmn-green-800"
          >
             <FileSpreadsheet size={18} strokeWidth={3} />
             <span>Excel BI</span>
          </button>
        </div>
      </div>

      {/* A4 Report Preview */}
      <div 
        className="bg-white rounded-[3rem] shadow-premium border border-gray-100 mx-auto w-full max-w-4xl p-12 sm:p-20 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none transition-all duration-500 hover:shadow-2xl" 
        ref={printRef} 
        id="printable-report"
      >
         <div className="border-b-[10px] border-dmn-green-950 pb-10 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <div className="w-16 h-1 bg-dmn-gold mb-6 rounded-full" />
               <h1 className="text-4xl font-black text-dmn-green-950 tracking-tighter uppercase mb-2">RAPPORT ANALYTIQUE</h1>
               <h2 className="text-xl font-bold text-gray-400 tracking-tight uppercase">Café Noreyni Madjmahoune</h2>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-2 leading-none">Exercice Commercial</p>
               <p className="text-3xl font-black text-dmn-green-950 tracking-tighter">{periodString}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-12 mb-16">
            <div className="p-8 rounded-[2.5rem] bg-gray-50 border border-gray-100 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-16 h-16 bg-dmn-green-900/5 rounded-full blur-xl animate-pulse" />
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-dmn-coffee" />
                 Synthèse Production
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-sm">Volume Global</span><span className="fintech-kpi text-xl text-gray-900">{production.quantity} <span className="text-xs opacity-30 ml-1">kg</span></span></div>
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-sm">Coût de Revient</span><span className="fintech-kpi text-xl text-dmn-green-950">{formatPrice(costs.totalProd)} <span className="text-xs opacity-30 ml-1">F</span></span></div>
                 <div className="flex justify-between items-center pt-4 mt-4 border-t border-dashed border-gray-200"><span className="text-gray-400 font-black text-[10px] uppercase">P.R.U Estimé</span><span className="fintech-kpi text-2xl text-dmn-gold">{formatPrice(Math.round(costs.totalProd / (production.quantity || 1)))} <span className="text-xs opacity-50 ml-1">F/kg</span></span></div>
               </div>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-gray-50 border border-gray-100 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-16 h-16 bg-dmn-green-900/5 rounded-full blur-xl animate-pulse" />
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-dmn-green-600" />
                 Synthèse Commerciale
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-sm">Quantité Vendue</span><span className="fintech-kpi text-xl text-gray-900">{sales.quantity} <span className="text-xs opacity-30 ml-1 text-emerald-600">kg</span></span></div>
                 <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-sm">Chiffre Affaires</span><span className="fintech-kpi text-2xl text-dmn-green-900">{formatPrice(sales.total)} <span className="text-xs opacity-30 ml-1">F</span></span></div>
               </div>
            </div>
         </div>

         <div className="mb-16">
            <h3 className="text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-4 mb-8">
               <span className="w-8 h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-xs font-black">01</span>
               Ventilation Analytique des Coûts
            </h3>
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Poste de Charge</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails Opérationnels</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valorisation</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-6 font-bold text-gray-900">Grains</td><td className="p-6 text-gray-500 text-sm">Achat matière première (Café Vert)</td><td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(costs.grains)} F</td></tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-6 font-bold text-gray-900">Transport</td><td className="p-6 text-gray-500 text-sm">Acheminement & Logistique</td><td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(costs.transport)} F</td></tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-6 font-bold text-gray-900">Moulage</td><td className="p-6 text-gray-500 text-sm">Frais d'usinage et transformation</td><td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(costs.transfert)} F</td></tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-6 font-bold text-gray-900">Emballage</td><td className="p-6 text-gray-500 text-sm">Sachets & Étiquetage Noreyni</td><td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(costs.emballage)} F</td></tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors"><td className="p-6 font-bold text-gray-900">Frais transfert</td><td className="p-6 text-gray-500 text-sm">Transactions & Commissions</td><td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(costs.autresProduction)} F</td></tr>
               </tbody>
               <tfoot>
                  <tr className="bg-dmn-green-950 text-white rounded-b-xl overflow-hidden">
                     <td colSpan={2} className="p-8 font-black text-right uppercase text-[10px] tracking-[0.3em] opacity-60">Total Investissement Production</td>
                     <td className="p-8 fintech-kpi text-2xl text-right text-dmn-gold">{formatPrice(costs.totalProd)} F</td>
                  </tr>
               </tfoot>
            </table>
         </div>

         <div className="mb-16">
            <h3 className="text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-4 mb-8">
               <span className="w-8 h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-xs font-black">02</span>
               Détail des Ventes par Segment
            </h3>
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Éléments de Vente</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantité</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">P.U Moyen</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Montant Global</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  <tr className="group hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-gray-900">1Kg Sachet (Normal)</td>
                    <td className="p-6 text-center font-bold">{sales.v1kgNormal.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                    <td className="p-6 text-center text-gray-500 text-sm">~{formatPrice(sales.v1kgNormal.length > 0 ? sales.v1kgNormal.reduce((a:any,b:any)=>a+b.prixUnitaire, 0) / sales.v1kgNormal.length : 0)} F</td>
                    <td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(sales.v1kgNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                  </tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-gray-900">500g Sachet (Normal)</td>
                    <td className="p-6 text-center font-bold">{sales.v500gNormal.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                    <td className="p-6 text-center text-gray-500 text-sm">~{formatPrice(sales.v500gNormal.length > 0 ? sales.v500gNormal.reduce((a:any,b:any)=>a+b.prixUnitaire, 0) / sales.v500gNormal.length : 0)} F</td>
                    <td className="p-6 text-right fintech-kpi text-lg text-gray-900">{formatPrice(sales.v500gNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                  </tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-gray-900">1Kg Sachet (Réduction/Revendeur)</td>
                    <td className="p-6 text-center font-bold">{sales.v1kgReduc.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                    <td className="p-6 text-center text-gray-500 text-sm">~{formatPrice(sales.v1kgReduc.length > 0 ? sales.v1kgReduc.reduce((a:any,b:any)=>a+b.prixUnitaire, 0) / sales.v1kgReduc.length : 0)} F</td>
                    <td className="p-6 text-right fintech-kpi text-lg text-dmn-gold">{formatPrice(sales.v1kgReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                  </tr>
                  <tr className="group hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-gray-900">500g Sachet (Réduction/Revendeur)</td>
                    <td className="p-6 text-center font-bold">{sales.v500gReduc.reduce((a:any,b:any)=>a+b.quantite, 0)}</td>
                    <td className="p-6 text-center text-gray-500 text-sm">~{formatPrice(sales.v500gReduc.length > 0 ? sales.v500gReduc.reduce((a:any,b:any)=>a+b.prixUnitaire, 0) / sales.v500gReduc.length : 0)} F</td>
                    <td className="p-6 text-right fintech-kpi text-lg text-dmn-gold">{formatPrice(sales.v500gReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))} F</td>
                  </tr>
               </tbody>
               <tfoot>
                  <tr className="bg-gray-900 text-white rounded-b-xl overflow-hidden">
                     <td colSpan={3} className="p-8 font-black text-right uppercase text-[10px] tracking-[0.3em] opacity-60">Chiffre d'Affaires Total (CA)</td>
                     <td className="p-8 fintech-kpi text-2xl text-right text-white">{formatPrice(sales.total)} F</td>
                  </tr>
               </tfoot>
            </table>
         </div>

         <div className="mb-16">
            <h3 className="text-xl font-black text-dmn-green-950 tracking-tight flex items-center gap-4 mb-8">
               <span className="w-8 h-8 rounded-full bg-dmn-green-950 text-white flex items-center justify-center text-xs font-black">03</span>
               Synthèse des Flux & Résultat Net
            </h3>
            <div className="bg-white rounded-[2.5rem] border-4 border-dmn-green-950 overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[10px]">Chiffre Affaires (CA)</span>
                  <span className="fintech-kpi text-3xl text-dmn-green-900">{formatPrice(sales.total)} F</span>
               </div>
               <div className="flex justify-between items-center p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[10px]">Charges Production (COGS)</span>
                  <span className="fintech-kpi text-2xl text-red-600">-{formatPrice(costs.totalProd)} F</span>
               </div>
               <div className="flex justify-between items-center p-8 bg-gray-50 border-b border-gray-100">
                  <span className="font-black text-dmn-green-950 uppercase tracking-widest text-xs">Marge Brute Opérationnelle</span>
                  <span className="fintech-kpi text-2xl text-dmn-green-900">{formatPrice(kpi.resultatProduction)} F</span>
               </div>
               <div className="flex justify-between items-center p-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-500 uppercase tracking-[0.2em] text-[10px]">Dépenses de Fonctionnement (OPEX)</span>
                  <span className="fintech-kpi text-2xl text-dmn-coffee">-{formatPrice(costs.operating)} F</span>
               </div>
               <div className={`flex flex-col sm:flex-row justify-between items-center p-12 ${kpi.soldeNet >= 0 ? 'bg-dmn-green-900' : 'bg-red-900'} text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <span className="font-black uppercase tracking-[0.4em] text-xl relative z-10">SOLDE DU PÉRIODE (NET)</span>
                  <span className="fintech-kpi text-6xl relative z-10 tracking-tighter">{kpi.soldeNet > 0 ? '+' : ''}{formatPrice(kpi.soldeNet)} <span className="text-xl opacity-50 ml-2">F CFA</span></span>
               </div>
            </div>
         </div>

         <div className="mt-32 pt-16 border-t-2 border-dashed border-gray-200 flex flex-col md:flex-row justify-between gap-12">
            <div className="text-center md:text-left">
               <p className="font-black text-gray-300 uppercase tracking-[0.4em] text-[9px] mb-20 uppercase">Certification Responsable Café</p>
               <div className="border-t border-gray-200 w-64 pt-4 text-xs font-black uppercase text-gray-900 tracking-widest">Signature & Date</div>
            </div>
            <div className="text-center md:text-right">
               <p className="font-black text-gray-300 uppercase tracking-[0.4em] text-[9px] mb-20 uppercase">Certification Contrôle Financier</p>
               <div className="border-t border-gray-200 w-64 md:ml-auto pt-4 text-xs font-black uppercase text-gray-900 tracking-widest">Cachet du Daara</div>
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
