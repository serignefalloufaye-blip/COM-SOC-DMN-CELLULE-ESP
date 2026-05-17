import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketDistribution, CafeProduction, CafeVente, CafeDepense } from '../types';
import { MOIS } from '../data';
import { formatPrice, formatFullPrice } from '../utils/format';

export class ReportService {
  private static formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return "0 FCFA";
    // Fix jsPDF issue with narrow no-break space in French locale which renders as weird chars like 10/000
    return new Intl.NumberFormat('fr-FR').format(amount).replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
  }

  static getCafeInsights(params: {
    ventes: CafeVente[];
    productions: CafeProduction[];
    depenses: CafeDepense[];
  }): string[] {
    const { ventes, productions, depenses } = params;
    const insights: string[] = [];

    const totalVentes = ventes.reduce((s, v) => s + (v.total || 0), 0);
    const totalProd = productions.reduce((s, p) => s + (p.coutTotal || p.total || 0), 0);
    const totalDep = depenses.reduce((s, d) => s + (d.montant || 0), 0);
    const soldeNet = totalVentes - totalDep;

    if (totalVentes > 0) {
      const v1kg = ventes.filter(v => v.format === '1kg' || v.typeCafe === '1kg');
      const v500g = ventes.filter(v => v.format === '500g' || v.typeCafe === '500g');
      
      if (v1kg.length > v500g.length) {
        insights.push("Le format 1KG est le produit leader en volume de transactions.");
      } else if (v500g.length > v1kg.length) {
        insights.push("Le format 500g est plus populaire ce mois-ci.");
      }

      const margeBrute = totalVentes - totalProd;
      const rentabilite = totalProd > 0 ? (margeBrute / totalProd) * 100 : 0;
      
      if (rentabilite > 30) {
        insights.push(`Excellente rentabilité de production (${rentabilite.toFixed(1)}%).`);
      } else if (rentabilite < 10 && totalProd > 0) {
        insights.push("Attention: La marge de production est faible. Vérifiez les coûts de revient.");
      }
    }

    if (totalDep > totalVentes * 0.4) {
      insights.push("Note: Les charges d'exploitation sont élevées par rapport au chiffre d'affaires.");
    }

    if (insights.length === 0) {
      insights.push("Activité stable. Continuez le suivi régulier des stocks et ventes.");
    }

    return insights;
  }

  static getSocialInsights(params: {
    cotisations: Cotisation[];
    depenses: Depense[];
    membres: Membre[];
  }): string[] {
    const { cotisations, depenses, membres } = params;
    const insights: string[] = [];

    const totalCot = cotisations.reduce((s, c) => s + c.montant, 0);
    if (membres.length > 0) {
      const effectifMoyen = membres.length;
      const membresAjour = new Set(cotisations.map(c => c.mId)).size;
      const tauxParticipation = (membresAjour / effectifMoyen) * 100;

      if (tauxParticipation > 80) {
        insights.push(`Taux de participation exemplaire (${tauxParticipation.toFixed(1)}%).`);
      } else if (tauxParticipation < 50) {
        insights.push(`Alerte: Faible taux de recouvrement des cotisations (${tauxParticipation.toFixed(1)}%).`);
      }
    }

    const modeWave = cotisations.filter(c => c.mode === 'WAVE').length;
    const modeOM = cotisations.filter(c => c.mode === 'OM').length;
    if (modeWave > modeOM * 2) {
      insights.push("Wave est devenu le canal de paiement numérique ultra-dominant.");
    }

    return insights;
  }

  private static getMonthName(monthIndex: number): string {
    if (monthIndex < 0 || monthIndex >= MOIS.length) return "Inconnu";
    return MOIS[monthIndex];
  }

  static generateExcelReport(params: {
    type: 'mensuel' | 'trimestriel' | 'annuel' | 'personnalise';
    year: number;
    month?: string;
    quarter?: number;
    customStartDate?: Date;
    customEndDate?: Date;
    activeTab?: 'all' | 'caisse' | 'tickets' | 'cafe' | 'finance';
    cotisations: Cotisation[];
    depenses: Depense[];
    recettes: Recette[];
    dettes: Dette[];
    ticketsCollectes: TicketCollecte[];
    ticketsDistributions: TicketDistribution[];
    cafeProductions: CafeProduction[];
    cafeVentes: CafeVente[];
    cafeDepenses: CafeDepense[];
  }) {
    const { 
      type, year, month, quarter, customStartDate, customEndDate,
      activeTab = 'all',
      cotisations = [], depenses = [], recettes = [], dettes = [],
      ticketsCollectes = [], ticketsDistributions = [],
      cafeProductions = [], cafeVentes = [], cafeDepenses = []
    } = params;

    try {
      const workbook = XLSX.utils.book_new();

      // Helper to filter data
      const filterByPeriod = (item: any) => {
        if (!item) return false;
        let itemAnnee = item.annee;
        let itemMois = item.mois;
        const d = item.date ? new Date(item.date) : (item.createdAt ? new Date(item.createdAt) : null);
        
        if (d && !isNaN(d.getTime())) {
          if (itemAnnee === undefined || itemAnnee === null) itemAnnee = d.getFullYear();
          if (itemMois === undefined || itemMois === null) itemMois = MOIS[d.getMonth()];
        }

        if (type === 'personnalise' && customStartDate && customEndDate && d) {
           const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
           const start = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate()).getTime();
           const end = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate()).getTime();
           return time >= start && time <= end;
        }

        if (Number(itemAnnee) !== year) return false;
        if (type === 'mensuel' && (itemMois as string)?.toUpperCase() !== (month as string)?.toUpperCase()) return false;
        if (type === 'trimestriel') {
          const mIdx = MOIS.indexOf((itemMois as string)?.toUpperCase());
          if (mIdx === -1) return false;
          const q = Math.floor(mIdx / 3) + 1;
          return q === quarter;
        }
        return true;
      };

      // Prepare Sheets
      const financeData = [
        ['Date', 'Catégorie', 'Libellé', 'Montant (FCFA)'],
        ...cotisations.filter(filterByPeriod).map(c => [(c.mois || '') + ' ' + (c.annee || ''), 'Cotisation', `Cotisation mensuelle`, c.montant || 0]),
        ...recettes.filter(filterByPeriod).map(r => [r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '', 'Recette', r.motif || '', r.montant || 0]),
        ...depenses.filter(filterByPeriod).map(d => [d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '', 'Dépense', d.evenement || '', d.montant || 0]),
        ...dettes.filter(filterByPeriod).map(d => [d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '', 'Dette ' + (d.estPayee ? '(Payée)' : '(En attente)'), d.motif || '', d.montant || 0])
      ];

      const ticketsData = [
        ['Date', 'Opération', 'Petit Déjeuner (Qté)', 'Repas (Qté)', 'Equivalent Financier (FCFA)'],
        ...ticketsCollectes.filter(filterByPeriod).map(t => [(t.mois || '') + ' ' + (t.annee || ''), 'Collecte Financière', t.petitDej || 0, t.repas || 0, t.montantArgent || 0]),
        ...ticketsDistributions.filter(filterByPeriod).map(t => [(t.mois || '') + ' ' + (t.annee || ''), 'Distribution', t.petitDej || 0, t.repas || 0, 0])
      ];

      const cafeData = [
        ['Date', 'Catégorie', 'Détails Opération', 'Volume / Quantité', 'Montant Financier (FCFA)'],
        ...cafeProductions.filter(p => filterByPeriod({ date: p.date })).map(p => [p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '', 'Production', p.typeCafe || 'Café', p.quantite || 0, p.total || 0]),
        ...cafeVentes.filter(v => filterByPeriod({ date: v.date })).map(v => [v.date ? new Date(v.date).toLocaleDateString('fr-FR') : '', 'Vente', v.typeVente || 'Vente Client', v.quantite || 0, v.total || 0]),
        ...cafeDepenses.filter(d => filterByPeriod({ date: d.date })).map(d => [d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '', 'Dépense / Charge', d.motif || '', '-', d.montant || 0])
      ];

      const formatSheet = (ws: XLSX.WorkSheet, colWidths: number[]) => {
        ws['!cols'] = colWidths.map(wch => ({ wch }));
        if (ws['!ref']) {
          ws['!autofilter'] = { ref: ws['!ref'] };
        }
      };

      if (activeTab === 'all' || activeTab === 'caisse' || (activeTab as string) === 'finance') {
         const ws = XLSX.utils.aoa_to_sheet(financeData);
         formatSheet(ws, [15, 20, 40, 20]);
         XLSX.utils.book_append_sheet(workbook, ws, 'Rapport Finance');
      }
      if (activeTab === 'all' || activeTab === 'tickets') {
         const ws = XLSX.utils.aoa_to_sheet(ticketsData);
         formatSheet(ws, [15, 25, 20, 20, 25]);
         XLSX.utils.book_append_sheet(workbook, ws, 'Logistique Tickets');
      }
      if (activeTab === 'all' || activeTab === 'cafe') {
         const ws = XLSX.utils.aoa_to_sheet(cafeData);
         formatSheet(ws, [15, 20, 40, 20, 25]);
         XLSX.utils.book_append_sheet(workbook, ws, 'Activité Café');
      }

      XLSX.writeFile(workbook, `Archive_DMN_${type}_${year}.xlsx`);
    } catch (error) {
      console.error("Excel Export Failure:", error);
      throw error;
    }
  }

  static generateMembersExcel(membres: Membre[]) {
    try {
      const data = membres.map((m) => ({
        'Prénom': m.prenom,
        'Nom': m.nom,
        'Téléphone': m.telephone || 'N/A',
        'Statut': m.statut || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Liste des Membres");

      // Professional formatting
      const wscols = [
        { wch: 30 }, // Prénom
        { wch: 30 }, // Nom
        { wch: 20 }, // Téléphone
        { wch: 20 }  // Statut
      ];
      ws['!cols'] = wscols;

      // Header styling (bold)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "166534" } }, // dmn-green-800
          alignment: { horizontal: "center" }
        };
      }

      XLSX.writeFile(wb, `DMN_Registre_Membres_${new Date().getFullYear()}.xlsx`);
    } catch (error) {
      console.error("Members Excel Export Failure:", error);
      throw error;
    }
  }

  static generateFinancialReport(
    params: {
      type: 'mensuel' | 'trimestriel' | 'annuel' | 'personnalise';
      year: number;
      month?: string;
      quarter?: number;
      customStartDate?: Date;
      customEndDate?: Date;
      activeTab: 'all' | 'caisse' | 'tickets' | 'cafe';
      membres: Membre[];
      cotisations: Cotisation[];
      depenses: Depense[];
      recettes: Recette[];
      dettes: Dette[];
      ticketsCollectes: TicketCollecte[];
      ticketsDistributions: TicketDistribution[];
      cafeProductions: CafeProduction[];
      cafeVentes: CafeVente[];
      cafeDepenses: CafeDepense[];
    }
  ) {
    const { 
      type, year, month, quarter, customStartDate, customEndDate,
      activeTab, membres = [], 
      cotisations = [], depenses = [], recettes = [], dettes = [],
      ticketsCollectes = [], ticketsDistributions = [],
      cafeProductions = [], cafeVentes = [], cafeDepenses = []
    } = params;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFillColor(22, 101, 52); // dmn-green-800
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('DAARA MADJMAHOUNE NOREYNI', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('COMMISSION SOCIALE - CELLULE ESP', pageWidth / 2, 26, { align: 'center' });
      
      let reportTitle = '';
      if (type === 'annuel') reportTitle = `BILAN FINANCIER ANNUEL ${year}`;
      else if (type === 'mensuel') reportTitle = `BILAN FINANCIER MENSUEL - ${month} ${year}`;
      else if (type === 'trimestriel') reportTitle = `BILAN FINANCIER TRIMESTRIEL T${quarter} ${year}`;
      else if (type === 'personnalise' && customStartDate && customEndDate) {
         reportTitle = `BILAN PÉRIODIQUE : ${customStartDate.toLocaleDateString('fr-FR')} - ${customEndDate.toLocaleDateString('fr-FR')}`;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 191, 0); // Gold
      doc.text(reportTitle, pageWidth / 2, 36, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 220, 220);
      doc.text(`Document officiel généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 44, { align: 'center' });

      let currentY = 65;

      // Filter data based on period
      const filterByPeriod = (item: any) => {
        if (!item) return false;
        let itemAnnee = item.annee;
        let itemMois = item.mois;
        const d = item.date ? new Date(item.date) : (item.createdAt ? new Date(item.createdAt) : null);
        
        if (d && !isNaN(d.getTime())) {
          if (itemAnnee === undefined || itemAnnee === null) itemAnnee = d.getFullYear();
          if (itemMois === undefined || itemMois === null) itemMois = MOIS[d.getMonth()];
        }

        if (type === 'personnalise' && customStartDate && customEndDate && d) {
           const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
           const start = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate()).getTime();
           const end = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate()).getTime();
           return time >= start && time <= end;
        }

        if (Number(itemAnnee) !== year) return false;
        if (type === 'mensuel' && (itemMois as string)?.toUpperCase() !== (month as string)?.toUpperCase()) return false;
        if (type === 'trimestriel') {
          const mIdx = MOIS.indexOf((itemMois as string)?.toUpperCase());
          if (mIdx === -1) return false;
          const q = Math.floor(mIdx / 3) + 1;
          return q === quarter;
        }
        return true;
      };

      // Filtered lists
      const fCotisations = cotisations.filter(filterByPeriod);
      const fDepenses = depenses.filter(filterByPeriod);
      const fRecettes = recettes.filter(filterByPeriod);
      const fDettes = dettes.filter(filterByPeriod);
      const fTicketsCollectes = ticketsCollectes.filter(filterByPeriod);
      const fTicketsDistributions = ticketsDistributions.filter(filterByPeriod);
      const fCafeProd = cafeProductions.filter(filterByPeriod);
      const fCafeVentes = cafeVentes.filter(filterByPeriod);
      const fCafeDepenses = cafeDepenses.filter(filterByPeriod);

      // SUMMARY TABLE (Finance)
      if (activeTab === 'all' || activeTab === 'caisse' || (activeTab as string) === 'finance') {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('1. RÉSUMÉ FINANCIER (CAISSE)', 14, currentY);
        currentY += 10;

        // Add Insights for Social
        const socialInsights = this.getSocialInsights({ cotisations: fCotisations, depenses: fDepenses, membres });
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        socialInsights.forEach(insight => {
          doc.text(`• ${insight}`, 16, currentY);
          currentY += 5;
        });
        currentY += 5;

        const totCotisations = fCotisations.reduce((s, c) => s + (c.montant || 0), 0);
        const totRecettes = fRecettes.reduce((s, r) => s + (r.montant || 0), 0);
        const totDettes = fDettes.filter(d => !d.estPayee).reduce((s, d) => s + (d.montant || 0), 0);
        const totDepenses = fDepenses.reduce((s, d) => s + (d.montant || 0), 0);
        const totEntrees = totCotisations + totRecettes + totDettes;
        const solde = totEntrees - totDepenses;

        autoTable(doc, {
          startY: currentY,
          head: [['Indicateur Financier', 'Volume (FCFA)']],
          body: [
            ['Cotisations sociales', this.formatCurrency(totCotisations)],
            ['Recettes diverses', this.formatCurrency(totRecettes)],
            ['Dettes en attente (À recouvrer)', this.formatCurrency(totDettes)],
            ['Dépenses effectuées', this.formatCurrency(totDepenses)],
            [{ content: 'SOLDE GLOBAL (Incl. Dettes)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: this.formatCurrency(solde), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: solde >= 0 ? [22, 101, 52] : [153, 27, 27] } }],
          ],
          theme: 'grid',
          headStyles: { fillColor: [22, 101, 52], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Payment Mode Breakdown in PDF
        const waveTot = fCotisations.filter(c => c.mode === 'WAVE').reduce((s, c) => s + c.montant, 0) + fRecettes.filter(r => r.mode === 'WAVE').reduce((s, r) => s + r.montant, 0);
        const omTot = fCotisations.filter(c => c.mode === 'OM').reduce((s, c) => s + c.montant, 0) + fRecettes.filter(r => r.mode === 'OM').reduce((s, r) => s + r.montant, 0);
        const cashTot = fCotisations.filter(c => c.mode === 'ESPÈCES').reduce((s, c) => s + c.montant, 0) + fRecettes.filter(r => r.mode === 'ESPÈCES').reduce((s, r) => s + r.montant, 0);

        autoTable(doc, {
          startY: currentY,
          head: [['Canal de Paiement', 'Volume Financier (FCFA)']],
          body: [
            ['Wave Mobile Money', this.formatCurrency(waveTot)],
            ['Orange Money', this.formatCurrency(omTot)],
            ['Espèces (Cash)', this.formatCurrency(cashTot)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // TICKETS SUMMARY
      if (activeTab === 'all' || activeTab === 'tickets') {
        if (currentY > 220) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.text('2. MODULE TICKETS', 14, currentY);
        currentY += 10;

        const totArgTickets = fTicketsCollectes.reduce((s, c) => s + (c.montantArgent || 0), 0);
        const totPD_Coll = fTicketsCollectes.reduce((s, c) => s + (c.petitDej || 0), 0);
        const totRep_Coll = fTicketsCollectes.reduce((s, c) => s + (c.repas || 0), 0);
        
        const totPD_Dist = fTicketsDistributions.reduce((s, d) => s + (d.petitDej || 0), 0);
        const totRep_Dist = fTicketsDistributions.reduce((s, d) => s + (d.repas || 0), 0);

        autoTable(doc, {
          startY: currentY,
          head: [['Opération', 'Collectes (Argent)', 'Collectes (Tickets)', 'Distributions']],
          body: [
            ['Financement', this.formatCurrency(totArgTickets), '-', '-'],
            ['Petit Déjeuner', '-', `${totPD_Coll} unités`, `${totPD_Dist} unités`],
            ['Repas Complets', '-', `${totRep_Coll} unités`, `${totRep_Dist} unités`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }


      // CAFÉ SUMMARY
      if ((activeTab === 'all' || activeTab === 'cafe') && fCafeProd.length + fCafeVentes.length + fCafeDepenses.length > 0) {
        if (currentY > 220) { doc.addPage(); currentY = 20; }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('3. MODULE CAFÉ', 14, currentY);
        currentY += 10;

        // Add Insights for Cafe
        const cafeInsights = this.getCafeInsights({ ventes: fCafeVentes, productions: fCafeProd, depenses: fCafeDepenses });
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        cafeInsights.forEach(insight => {
          doc.text(`• ${insight}`, 16, currentY);
          currentY += 5;
        });
        currentY += 5;

        const totCafeProd = fCafeProd.reduce((s, p) => s + (p.total || 0), 0);
        const totCafeProdQty = fCafeProd.reduce((s, p) => s + (p.quantite || 0), 0);
        const totCafeVentes = fCafeVentes.reduce((s, v) => s + (v.total || 0), 0);
        const totCafeVentesQty = fCafeVentes.reduce((s, v) => s + (v.quantite || 0), 0);
        const totCafeDep = fCafeDepenses.reduce((s, d) => s + (d.montant || 0), 0);

        autoTable(doc, {
          startY: currentY,
          head: [['Indicateur Café', 'Volume (Tasses)', 'Montant (FCFA)']],
          body: [
            ['Production (Coût de Revient)', `${totCafeProdQty} tasses`, this.formatCurrency(totCafeProd)],
            ['Ventes (Chiffre d\'Affaires)', `${totCafeVentesQty} tasses`, this.formatCurrency(totCafeVentes)],
            ['Charges d\'Exploitation', '-', this.formatCurrency(totCafeDep)],
            [{ content: 'RÉSULTAT NET EXPLOITATION', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, '-', { content: this.formatCurrency(totCafeVentes - totCafeDep), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: (totCafeVentes - totCafeDep) >= 0 ? [22, 101, 52] : [153, 27, 27] } }],
          ],
          theme: 'grid',
          headStyles: { fillColor: [154, 52, 18], fontStyle: 'bold' }, // orange-800
          alternateRowStyles: { fillColor: [255, 247, 237] },
          styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // MEMBERS TABLE
      if ((activeTab === 'all' || activeTab === 'caisse') && membres.length > 0) {
        if (currentY > 220) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(14);
        doc.text('4. ÉTAT DES COTISATIONS PAR MEMBRE', 14, currentY);
        currentY += 10;

        const memberData = membres.map(m => {
           const mCot = fCotisations.filter(c => c.mId === m.id && c.montant > 0);
           const mTot = mCot.reduce((s, c) => s + (c.montant || 0), 0);
           return [
             `${m.prenom || ''} ${m.nom || ''}`,
             m.statut || 'N/A',
             mCot.length + ' mois',
             this.formatCurrency(mTot)
           ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Membre', 'Statut', 'Mois Payés', 'Total Cumulé']],
          body: memberData,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' }, // slate-800
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // CAFE: REVENDEURS
      if ((activeTab === 'all' || activeTab === 'cafe') && fCafeVentes.length > 0) {
        const vendeursIds = [...new Set(fCafeVentes.map(v => v.vendeurId).filter(Boolean))];
        if (vendeursIds.length > 0) {
          if (currentY > 220) { doc.addPage(); currentY = 20; }
          
          doc.setFontSize(14);
          doc.text('5. PERFORMANCES DES REVENDEURS (CAFÉ)', 14, currentY);
          currentY += 10;

          const revendeursData = vendeursIds.map(vId => {
            const v = membres.find(m => m.id === vId);
            const nom = v ? `${v.prenom} ${v.nom}` : vId;
            const vVentes = fCafeVentes.filter(vv => vv.vendeurId === vId);
            const totalQty = vVentes.reduce((sum, vv) => sum + (vv.quantite || 0), 0);
            const totalCa = vVentes.reduce((sum, vv) => sum + (vv.total || 0), 0);
            return [
              nom,
              `${totalQty} tasses`,
              this.formatCurrency(totalCa)
            ];
          });

          // Sort by total CA (numeric value)
          revendeursData.sort((a, b) => {
            const valAStr = (a[2] || '0').toString().replace(/[^\d]/g, '');
            const valBStr = (b[2] || '0').toString().replace(/[^\d]/g, '');
            const valA = parseFloat(valAStr) || 0;
            const valB = parseFloat(valBStr) || 0;
            return valB - valA;
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Revendeur', 'Volume Ventes (Tasses)', 'Chiffre d\'Affaires']],
            body: revendeursData,
            theme: 'grid',
            headStyles: { fillColor: [154, 52, 18], fontStyle: 'bold' }, // orange-800
            alternateRowStyles: { fillColor: [255, 247, 237] },
            styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] }
          });

          currentY = (doc as any).lastAutoTable.finalY + 15;
        }
      }

      // SIGNATURES
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      else { currentY += 15; }
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Préparé par :', 30, currentY);
      doc.text('Validé par :', pageWidth - 80, currentY);
      
      currentY += 8;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Nom & Signature', 30, currentY);
      doc.text('La Direction du Daara / Président', pageWidth - 80, currentY);
      
      // Signature lines
      doc.setDrawColor(200, 200, 200);
      doc.line(30, currentY + 20, 80, currentY + 20);
      doc.line(pageWidth - 80, currentY + 20, pageWidth - 30, currentY + 20);

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Document de gestion interne - Daara Madjmahoune Noreyni - Page ${i} sur ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
          doc.setFont('helvetica', 'italic');
          doc.text('“La transparence est le gage de la confiance”', pageWidth / 2, 290, { align: 'center' });
      }

      doc.save(`Rapport_DMN_${type}_${year}${month ? '_' + month : ''}.pdf`);
    } catch (e) {
      console.error("PDF generation error:", e);
      throw e;
    }
  }

  static generateCafePDFReport(params: {
    periodString: string;
    finance: any;
    ventes: CafeVente[];
    productions: CafeProduction[];
    depenses: CafeDepense[];
  }) {
    const { periodString, finance, ventes, productions, depenses } = params;
    const { kpi, sales, costs, production } = finance;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header Banner
      doc.setFillColor(6, 78, 59); // dmn-green-950
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('MADJMAHOUNE NOREYNI', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('RAPPORT ANALYTIQUE CAFÉ', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(255, 191, 0); // Gold color
      doc.text(`PÉRIODE : ${periodString.toUpperCase()}`, pageWidth / 2, 38, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 45, { align: 'center' });

      let currentY = 65;

      // 1. Synthèse Financière (KPIs)
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('I. SYNTHÈSE FINANCIÈRE', 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur de Performance', 'Valeur Commerciale']],
        body: [
          ['Chiffre d\'Affaires Global', this.formatCurrency(sales.total)],
          ['Coût de Production (Frais Directs)', this.formatCurrency(costs.totalProd)],
          ['Marge sur Production', { content: this.formatCurrency(kpi.resultatProduction), styles: { textColor: kpi.resultatProduction >= 0 ? [22, 101, 52] : [153, 27, 27] } }],
          ['Charges d\'Exploitation (Frais Généraux)', this.formatCurrency(costs.operating)],
          [{ content: 'RÉSULTAT NET (BÉNÉFICE)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: this.formatCurrency(kpi.soldeNet), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: kpi.soldeNet >= 0 ? [22, 101, 52] : [153, 27, 27] } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 59], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;

      // 2. Analyse de la Production
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('II. ANALYSE DE LA PRODUCTION', 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Poste de Dépense', 'Détails', 'Montant Investi (FCFA)']],
        body: [
          ['Matières Premières (Grains)', 'Achat café vert/torréfié', this.formatCurrency(costs.grains)],
          ['Emballage', 'Sachets et étiquettes', this.formatCurrency(costs.emballage)],
          ['Transport', 'Acheminement logistique', this.formatCurrency(costs.transport)],
          ['Moulage / Usinage', 'Frais de transformation', this.formatCurrency(costs.transfert)],
          ['Frais de Transaction', 'Commissions & Transferts', this.formatCurrency(costs.autresProduction)],
          [{ content: 'TOTAL INVESTISSEMENT PRODUCTION', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: '-', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: this.formatCurrency(costs.totalProd), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;

      // 3. Ventilation des Ventes
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('III. VENTILATION DES VENTES', 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Format du Produit', 'Type Client', 'Quantité Écoulée', 'Chiffre d\'Affaires']],
        body: [
          ['Format 1Kg', 'Vente Standard', sales.v1kgNormal.reduce((a:any,b:any)=>a+b.quantite, 0), this.formatCurrency(sales.v1kgNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))],
          ['Format 1Kg', 'Revendeur / Promo', sales.v1kgReduc.reduce((a:any,b:any)=>a+b.quantite, 0), this.formatCurrency(sales.v1kgReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))],
          ['Format 500g', 'Vente Standard', sales.v500gNormal.reduce((a:any,b:any)=>a+b.quantite, 0), this.formatCurrency(sales.v500gNormal.reduce((a:any,b:any)=>a+(b.total||0), 0))],
          ['Format 500g', 'Revendeur / Promo', sales.v500gReduc.reduce((a:any,b:any)=>a+b.quantite, 0), this.formatCurrency(sales.v500gReduc.reduce((a:any,b:any)=>a+(b.total||0), 0))],
          [{ content: 'TOTAL PERFORMANCE VENTES', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: '-', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: `${sales.quantity} sachets`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
           { content: this.formatCurrency(sales.total), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 59], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] }
      });

      // 4. Intelligence & Insights
      currentY = (doc as any).lastAutoTable.finalY + 20;
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, pageWidth - 28, 40, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, currentY, pageWidth - 28, 40, 'D');
      
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES ET RECOMMANDATIONS STRATÉGIQUES', 20, currentY + 10);
      
      const insights = this.getCafeInsights({ ventes, productions, depenses });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      insights.forEach((insight, idx) => {
        doc.text(`• ${insight}`, 22, currentY + 20 + (idx * 6));
      });

      // Official Signatures
      doc.addPage();
      currentY = 40;
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('VALIDATION OFFICIELLE', pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 40;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Responsable de Production', 30, currentY);
      doc.text('Trésorerie Centrale DMN', pageWidth - 80, currentY);
      
      currentY += 40;
      doc.setDrawColor(200, 200, 200);
      doc.line(30, currentY, 80, currentY);
      doc.line(pageWidth - 80, currentY, pageWidth - 30, currentY);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Signature & Date', 45, currentY + 5, { align: 'center' });
      doc.text('Cachet & Signature', pageWidth - 55, currentY + 5, { align: 'center' });

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} sur ${totalPages} - Système Certifié Noreyni Analytique`, pageWidth / 2, 285, { align: 'center' });
        doc.setFont('helvetica', 'italic');
        doc.text('“Ligeyal Serigne Touba amul ludul ndiarigne”', pageWidth / 2, 290, { align: 'center' });
        doc.text('Unis pour le service de Borom Touba - Madjmahoune Noreyni', pageWidth / 2, 294, { align: 'center' });
      }

      doc.save(`Rapport_Cafe_Noreyni_${periodString.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation failure:", error);
      throw error;
    }
  }
}

