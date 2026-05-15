import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketDistribution, CafeProduction, CafeVente, CafeDepense } from '../types';
import { MOIS } from '../data';

export class ReportService {
  private static formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return "0 FCFA";
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  private static getMonthName(monthIndex: number): string {
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
      cotisations, depenses, recettes, dettes,
      ticketsCollectes, ticketsDistributions,
      cafeProductions, cafeVentes, cafeDepenses
    } = params;

    const workbook = XLSX.utils.book_new();

    // Helper to filter data
    const filterByPeriod = (item: any) => {
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
      ['Date', 'Type', 'Libellé', 'Montant'],
      ...cotisations.filter(filterByPeriod).map(c => [c.mois + ' ' + c.annee, 'Cotisation', `Cotisation ${c.mId}`, c.montant]),
      ...recettes.filter(filterByPeriod).map(r => [r.date || '', 'Recette', r.motif, r.montant]),
      ...depenses.filter(filterByPeriod).map(d => [d.date || '', 'Dépense', d.evenement, d.montant]),
      ...dettes.filter(filterByPeriod).map(d => [d.date || '', 'Dette', d.motif, d.montant])
    ];

    const ticketsData = [
      ['Date', 'Type', 'Petit Déj', 'Repas', 'Montant'],
      ...ticketsCollectes.filter(filterByPeriod).map(t => [t.mois + ' ' + t.annee, 'Collecte', t.petitDej, t.repas, t.montantArgent || 0]),
      ...ticketsDistributions.filter(filterByPeriod).map(t => [t.mois + ' ' + t.annee, 'Distribution', t.petitDej, t.repas, 0])
    ];

    const cafeData = [
      ['Date', 'Type', 'Libellé', 'Quantité/Montant'],
      ...cafeProductions.filter(p => filterByPeriod({ date: p.date })).map(p => [new Date(p.date).toLocaleDateString(), 'Production', p.typeCafe || 'Café', p.quantite]),
      ...cafeVentes.filter(v => filterByPeriod({ date: v.date })).map(v => [new Date(v.date).toLocaleDateString(), 'Vente', v.typeVente || 'Vente', v.total]),
      ...cafeDepenses.filter(d => filterByPeriod({ date: d.date })).map(d => [new Date(d.date).toLocaleDateString(), 'Dépense', d.motif, d.montant])
    ];

    if (activeTab === 'all' || activeTab === 'caisse' || (activeTab as string) === 'finance') {
       XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(financeData), 'Finance');
    }
    if (activeTab === 'all' || activeTab === 'tickets') {
       XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ticketsData), 'Tickets');
    }
    if (activeTab === 'all' || activeTab === 'cafe') {
       XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(cafeData), 'Café');
    }

    XLSX.writeFile(workbook, `Rapport_DMN_${type}_${year}.xlsx`);
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
      activeTab, membres, 
      cotisations, depenses, recettes, dettes,
      ticketsCollectes, ticketsDistributions,
      cafeProductions, cafeVentes, cafeDepenses
    } = params;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(34, 197, 94); // dmn-green-500
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DAARA MADJMAHOUNE NOREYNI UCAD', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Commission Sociale DMN cellule ESP', pageWidth / 2, 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    let reportTitle = '';
    if (type === 'annuel') reportTitle = `RAPPORT ANNUEL ${year}`;
    else if (type === 'mensuel') reportTitle = `RAPPORT MENSUEL - ${month} ${year}`;
    else if (type === 'trimestriel') reportTitle = `RAPPORT TRIMESTRIEL T${quarter} ${year}`;
    else if (type === 'personnalise' && customStartDate && customEndDate) {
       reportTitle = `RAPPORT PÉRIODE : ${customStartDate.toLocaleDateString('fr-FR')} - ${customEndDate.toLocaleDateString('fr-FR')}`;
    }
    
    doc.setFontSize(11);
    doc.text(reportTitle, pageWidth / 2, 32, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 39, { align: 'center' });

    let currentY = 55;

    // Filter data based on period
    const filterByPeriod = (item: any) => {
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

      const totCotisations = fCotisations.reduce((s, c) => s + c.montant, 0);
      const totRecettes = fRecettes.reduce((s, r) => s + r.montant, 0);
      const totDettes = fDettes.filter(d => !d.estPayee).reduce((s, d) => s + d.montant, 0);
      const totDepenses = fDepenses.reduce((s, d) => s + d.montant, 0);
      const totEntrees = totCotisations + totRecettes + totDettes;
      const solde = totEntrees - totDepenses;

      autoTable(doc, {
        startY: currentY,
        head: [['Catégorie', 'Montant']],
        body: [
          ['Cotisations sociales', this.formatCurrency(totCotisations)],
          ['Recettes diverses', this.formatCurrency(totRecettes)],
          ['Dettes en attente (Entrées)', this.formatCurrency(totDettes)],
          ['Dépenses effectuées', this.formatCurrency(totDepenses)],
          [{ content: 'SOLDE GLOBAL (Incl. Dettes)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: this.formatCurrency(solde), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 101, 52] },
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
      const totPD_Coll = fTicketsCollectes.reduce((s, c) => s + c.petitDej, 0);
      const totRep_Coll = fTicketsCollectes.reduce((s, c) => s + c.repas, 0);
      
      const totPD_Dist = fTicketsDistributions.reduce((s, d) => s + d.petitDej, 0);
      const totRep_Dist = fTicketsDistributions.reduce((s, d) => s + d.repas, 0);

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Collectes (Argent)', 'Collectes (Tickets)', 'Distributions']],
        body: [
          ['Argent récolté', this.formatCurrency(totArgTickets), '-', '-'],
          ['Petit Déjeuner', '-', `${totPD_Coll} unités`, `${totPD_Dist} unités`],
          ['Repas complets', '-', `${totRep_Coll} unités`, `${totRep_Dist} unités`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }


    // CAFÉ SUMMARY
    if ((activeTab === 'all' || activeTab === 'cafe') && fCafeProd.length + fCafeVentes.length + fCafeDepenses.length > 0) {
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.text('3. MODULE CAFÉ', 14, currentY);
      currentY += 10;

      const totCafeProd = fCafeProd.reduce((s, p) => s + p.total, 0);
      const totCafeProdQty = fCafeProd.reduce((s, p) => s + p.quantite, 0);
      const totCafeVentes = fCafeVentes.reduce((s, v) => s + v.total, 0);
      const totCafeVentesQty = fCafeVentes.reduce((s, v) => s + v.quantite, 0);
      const totCafeDep = fCafeDepenses.reduce((s, d) => s + d.montant, 0);

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Quantité', 'Montant']],
        body: [
          ['Production (Coût)', `${totCafeProdQty} tasses`, this.formatCurrency(totCafeProd)],
          ['Ventes (Chiffre d\'Affaire)', `${totCafeVentesQty} tasses`, this.formatCurrency(totCafeVentes)],
          ['Dépenses Café', '-', this.formatCurrency(totCafeDep)],
          [{ content: 'RÉSULTAT NET CAFÉ', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, '-', { content: this.formatCurrency(totCafeVentes - totCafeDep), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [154, 52, 18] }, // orange-800
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
         const mTot = mCot.reduce((s, c) => s + c.montant, 0);
         return [
           `${m.prenom} ${m.nom}`,
           m.statut || 'N/A',
           mCot.length + ' mois',
           this.formatCurrency(mTot)
         ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Membre', 'Statut', 'Périodes payées', 'Total']],
        body: memberData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }, // slate-800
        styles: { fontSize: 8 }
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
          const totalQty = vVentes.reduce((sum, vv) => sum + vv.quantite, 0);
          const totalCa = vVentes.reduce((sum, vv) => sum + vv.total, 0);
          return [
            nom,
            `${totalQty} tasses`,
            this.formatCurrency(totalCa)
          ];
        });

        // Sort by total CA (numeric value)
        revendeursData.sort((a, b) => {
          const valA = parseFloat(a[2].toString().replace(/[^\d]/g, ''));
          const valB = parseFloat(b[2].toString().replace(/[^\d]/g, ''));
          return valB - valA;
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Revendeur', 'Total Ventes (Tasses)', 'Chiffre d\'Affaire']],
          body: revendeursData,
          theme: 'grid',
          headStyles: { fillColor: [154, 52, 18] }, // orange-800
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
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Daara Madjmahoune Noreyni UCAD - Page ${i} sur ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
        doc.text('“La transparence est une responsabilité”', pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`Rapport_DMN_${type}_${year}${month ? '_' + month : ''}.pdf`);
  }
}
