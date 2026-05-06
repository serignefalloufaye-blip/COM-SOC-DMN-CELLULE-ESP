import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Membre, Cotisation, Depense, Recette, Dette, TicketCollecte, TicketDistribution, CafeProduction, CafeVente, CafeDepense } from '../types';
import { MOIS } from '../data';

export class ReportService {
  private static formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }

  private static getMonthName(monthIndex: number): string {
    return MOIS[monthIndex];
  }

  static generateFinancialReport(
    params: {
      type: 'annual' | 'quarterly' | 'monthly';
      year: number;
      month?: string;
      quarter?: number;
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
      type, year, month, quarter, membres, 
      cotisations, depenses, recettes, dettes,
      ticketsCollectes, ticketsDistributions,
      cafeProductions, cafeVentes, cafeDepenses
    } = params;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(22, 101, 52); // dmn-green-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DAARA MADJMAHOUNE NOREYNI', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Système de Gestion - Rapport Financier', pageWidth / 2, 25, { align: 'center' });
    
    let reportTitle = '';
    if (type === 'annual') reportTitle = `RAPPORT ANNUEL ${year}`;
    else if (type === 'monthly') reportTitle = `RAPPORT MENSUEL - ${month} ${year}`;
    else if (type === 'quarterly') reportTitle = `RAPPORT TRIMESTRIEL T${quarter} ${year}`;
    
    doc.setFontSize(10);
    doc.text(reportTitle, pageWidth / 2, 32, { align: 'center' });

    let currentY = 50;

    // Filter data based on period
    const filterByPeriod = (item: any) => {
      const itemDate = item.date ? new Date(item.date) : (item.createdAt ? new Date(item.createdAt) : null);
      if (!itemDate) {
         // Fallback to month/year fields if date not available
         if (item.annee !== year) return false;
         if (type === 'monthly' && item.mois !== month) return false;
         if (type === 'quarterly') {
            const mIdx = MOIS.indexOf(item.mois);
            const q = Math.floor(mIdx / 3) + 1;
            if (q !== quarter) return false;
         }
         return true;
      }
      
      const itemYear = itemDate.getFullYear();
      const itemMonthIdx = itemDate.getMonth();
      const itemMonthName = MOIS[itemMonthIdx];
      const itemQuarter = Math.floor(itemMonthIdx / 3) + 1;

      if (itemYear !== year) return false;
      if (type === 'monthly' && itemMonthName !== month) return false;
      if (type === 'quarterly' && itemQuarter !== quarter) return false;
      return true;
    };

    // Filtered lists
    const fCotisations = cotisations.filter(c => {
       if (c.annee !== year) return false;
       if (type === 'monthly' && c.mois !== month) return false;
       if (type === 'quarterly') {
          const mIdx = MOIS.indexOf(c.mois);
          const q = Math.floor(mIdx / 3) + 1;
          if (q !== quarter) return false;
       }
       return true;
    });

    const fDepenses = depenses.filter(filterByPeriod);
    const fRecettes = recettes.filter(filterByPeriod);
    const fDettes = dettes.filter(filterByPeriod);
    const fCafeProd = cafeProductions.filter(p => filterByPeriod({ date: p.date }));
    const fCafeVentes = cafeVentes.filter(v => filterByPeriod({ date: v.date }));
    const fCafeDepenses = cafeDepenses.filter(d => filterByPeriod({ date: d.date }));

    // SUMMARY TABLE
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('1. RÉSUMÉ FINANCIER', 14, currentY);
    currentY += 10;

    const totCotisations = fCotisations.reduce((s, c) => s + c.montant, 0);
    const totRecettes = fRecettes.reduce((s, r) => s + r.montant, 0);
    const totDepenses = fDepenses.reduce((s, d) => s + d.montant, 0);
    const totDettes = fDettes.reduce((s, d) => s + d.montant, 0);
    const solde = totCotisations + totRecettes - totDepenses;

    autoTable(doc, {
      startY: currentY,
      head: [['Catégorie', 'Montant']],
      body: [
        ['Cotisations sociales', this.formatCurrency(totCotisations)],
        ['Recettes diverses', this.formatCurrency(totRecettes)],
        ['Dépenses effectuées', this.formatCurrency(totDepenses)],
        ['Dettes en attente', this.formatCurrency(totDettes)],
        [{ content: 'SOLDE DISPONIBLE', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: this.formatCurrency(solde), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // TICKETS SUMMARY
    if (currentY > 220) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14);
    doc.text('2. MODULE TICKETS', 14, currentY);
    currentY += 10;

    const fTicketsCollectes = ticketsCollectes.filter(filterByPeriod);
    const fTicketsDistributions = ticketsDistributions.filter(filterByPeriod);

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

    // CAFÉ SUMMARY
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

    // MEMBERS TABLE
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

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i} sur ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
        doc.text('“La transparence est une responsabilité”', pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`Rapport_DMN_${type}_${year}${month ? '_' + month : ''}.pdf`);
  }
}
