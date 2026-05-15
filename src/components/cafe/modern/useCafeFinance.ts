import { useMemo } from 'react';
import { CafeProduction, CafeVente, CafeDepense, CafePriceConfig } from '../../../types';
import { MOIS } from '../../../data';

export function useCafeFinance(
  productions: CafeProduction[],
  ventes: CafeVente[],
  depenses: CafeDepense[],
  priceConfig: CafePriceConfig | null,
  globalMonth: string | null,
  globalYear: number
) {
  return useMemo(() => {
    // Filter by period if needed, assuming data passed is already filtered or we filter here.
    // For now, let's assume the lists passed in correspond to the selected period.
    const periodVentes = ventes;
    const periodDepenses = depenses;
    const periodProductions = productions;

    // Production Costs (Modern Approach: From `charges` inside productions)
    let prodGrains = 0;
    let prodTransport = 0;
    let prodEmballage = 0;
    let prodFraisTransfert = 0;
    let prodAutres = 0;
    let fallbackToDepenses = periodProductions.length > 0 && !periodProductions.some(p => p.charges && p.charges.length > 0);

    // If new structure is present, compute from native charges
    periodProductions.forEach(p => {
      if (p.charges && p.charges.length > 0) {
        p.charges.forEach(c => {
          const cat = c.nature.toLowerCase();
          if (cat.includes('grain')) prodGrains += c.montant;
          else if (cat.includes('transport')) prodTransport += c.montant;
          else if (cat.includes('emballage')) prodEmballage += c.montant;
          else if (cat.includes('transfert') || cat.includes('moulage')) prodFraisTransfert += c.montant;
          else prodAutres += c.montant;
        });
      }
    });

    // Fallback approach (Legacy)
    if (fallbackToDepenses || periodProductions.length === 0) {
      prodGrains += periodDepenses.filter(d => d.categorie === 'matières premières' || d.motif?.toLowerCase().includes('grain') || d.motif?.toLowerCase().includes('cafe')).reduce((a,b)=>a+b.montant, 0);
      prodTransport += periodDepenses.filter(d => d.categorie.toLowerCase() === 'transport').reduce((a,b)=>a+b.montant, 0);
      prodEmballage += periodDepenses.filter(d => d.categorie.toLowerCase() === 'emballage').reduce((a,b)=>a+b.montant, 0);
      prodFraisTransfert += periodDepenses.filter(d => d.categorie.toLowerCase() === 'autres' && d.motif?.toLowerCase().includes('transfert')).reduce((a,b)=>a+b.montant, 0);
    }
    
    // Total Production Cost
    const totalProdCosts = prodGrains + prodTransport + prodEmballage + prodFraisTransfert + prodAutres;

    // Operating Expenses
    // We only take expenses that are not used in the fallback
    const depensesFonctionnement = periodDepenses.filter(d => {
      if (fallbackToDepenses || periodProductions.length === 0) {
        return d.categorie !== 'matières premières' && 
          d.categorie.toLowerCase() !== 'transport' && 
          d.categorie.toLowerCase() !== 'emballage' && 
          !(d.categorie.toLowerCase() === 'autres' && d.motif?.toLowerCase().includes('transfert')) &&
          !d.motif?.toLowerCase().includes('grain') && 
          !d.motif?.toLowerCase().includes('cafe');
      }
      return true; // if all costs were in charges, all expenses in cafe_depenses are operating expenses!
    });
    
    const totalOperatingExpenses = depensesFonctionnement.reduce((a,b)=>a+b.montant, 0);

    // Sales Breakdown
    const offPx1 = priceConfig?.prices?.['1kg']?.normal || 6000;
    const offPx5 = priceConfig?.prices?.['500g']?.normal || 3000;

    const v1kg = periodVentes.filter(v => v.format === '1kg' || v.typeCafe === '1kg');
    const v1kgNormal = v1kg.filter(v => v.prixUnitaire >= offPx1);
    const v1kgReduc = v1kg.filter(v => v.prixUnitaire < offPx1);

    const v500g = periodVentes.filter(v => v.format === '500g' || v.typeCafe === '500g');
    const v500gNormal = v500g.filter(v => v.prixUnitaire >= offPx5);
    const v500gReduc = v500g.filter(v => v.prixUnitaire < offPx5);

    const totalVentes = periodVentes.reduce((a, b) => a + (b.total || (b.quantite * b.prixUnitaire) || 0), 0);
    const qteVendues = periodVentes.reduce((a, b) => a + b.quantite, 0);

    const qteProduite = periodProductions.reduce((a, b) => a + b.quantite, 0);

    // Key Financial Indicators
    const resultatProduction = totalVentes - totalProdCosts; // Benefice Brut
    const soldeNet = resultatProduction - totalOperatingExpenses; // Benefice Net
    const margin = totalVentes > 0 ? (resultatProduction / totalVentes) * 100 : 0;
    const netMargin = totalVentes > 0 ? (soldeNet / totalVentes) * 100 : 0;

    // Monthly Trend Calculation
    const monthlyTrend = MOIS.map((m, idx) => {
      const monthVentes = ventes.filter(v => {
        const d = new Date(v.date);
        return d.getFullYear() === globalYear && d.getMonth() === idx;
      });
      const monthProd = productions.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === globalYear && d.getMonth() === idx;
      });
      const monthDepTotal = depenses.filter(d => {
        const dObj = new Date(d.date);
        return dObj.getFullYear() === globalYear && dObj.getMonth() === idx;
      }).reduce((acc, curr) => acc + curr.montant, 0);

      const ca = monthVentes.reduce((acc, v) => acc + (v.total || (v.quantite * v.prixUnitaire) || 0), 0);
      const prodVol = monthProd.reduce((acc, p) => acc + p.quantite, 0);

      return {
        name: m.substring(0, 4),
        ca,
        production: prodVol,
        resultat: ca - monthDepTotal
      };
    });

    return {
      costs: {
        grains: prodGrains,
        transport: prodTransport,
        emballage: prodEmballage,
        transfert: prodFraisTransfert,
        autresProduction: prodAutres,
        totalProd: totalProdCosts,
        operating: totalOperatingExpenses,
        depensesList: depensesFonctionnement
      },
      sales: {
        total: totalVentes,
        quantity: qteVendues,
        v1kgNormal,
        v1kgReduc,
        v500gNormal,
        v500gReduc
      },
      production: {
        quantity: qteProduite
      },
      kpi: {
        resultatProduction,
        soldeNet,
        margin,
        netMargin
      },
      monthlyTrend
    };
  }, [productions, ventes, depenses, priceConfig, globalYear, globalMonth]);
}
