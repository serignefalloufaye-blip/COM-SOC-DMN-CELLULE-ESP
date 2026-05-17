import React from 'react';
import { AlertTriangle, MessageCircle, Printer, Search, Calendar, Smartphone, CheckCircle2, Download } from 'lucide-react';
import { Membre, UserRole } from '../types';
import { MOIS } from '../data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from '../utils/format';

interface NonPayeursProps {
  membres: Membre[];
  getMemberStatus: (mId: string) => { isLate: boolean; unpaidCount: number; unpaidMonths: string[] };
  npSearch: string;
  setNpSearch: (s: string) => void;
  npMois: string;
  setNpMois: (m: string) => void;
  handleGeneralReminderWhatsApp: () => void;
  isAdmin: boolean;
  isCaisse: boolean;
  setSelectedMemberProfile: (m: Membre) => void;
  openAddCot: (mId: string, mois: string, annee: number) => void;
  fMois: string;
  globalYear: number;
  setActiveTab: (tab: any) => void;
  setFinanceSubTab: (tab: any) => void;
}

export const NonPayeurs: React.FC<NonPayeursProps> = ({
  membres,
  getMemberStatus,
  npSearch,
  setNpSearch,
  npMois,
  setNpMois,
  handleGeneralReminderWhatsApp,
  isAdmin,
  isCaisse,
  setSelectedMemberProfile,
  openAddCot,
  fMois,
  globalYear,
  setActiveTab,
  setFinanceSubTab
}) => {
  const filteredMembres = membres.filter(m => {
    const status = getMemberStatus(m.id);
    const matchSearch = !npSearch || `${m.prenom} ${m.nom}`.toLowerCase().includes(npSearch.toLowerCase());
    let matchMonth = true;
    if (npMois) {
      matchMonth = status.unpaidMonths.includes(npMois);
    }
    return status.isLate && matchSearch && matchMonth;
  });

  const exportRetardsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Professional
    doc.setFillColor(153, 27, 27); // red-800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(`ÉTAT DES IMPAYÉS CAISSE SOCIALE - ${globalYear}`, pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(`Document Administratif Confidentiel - Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 30, { align: 'center' });
    
    if (npMois) {
       doc.text(`Mois de référence : ${npMois}`, pageWidth / 2, 36, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text("SYNTHÈSE DES RETARDS", 14, 55);

    const totalRetardMontant = filteredMembres.reduce((s, m) => s + (getMemberStatus(m.id).unpaidCount * 500), 0);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Effectif en situation d'impayé : ${filteredMembres.length} membres`, 14, 63);
    doc.text(`Volume financier global en attente : ${formatPrice(totalRetardMontant)} FCFA`, 14, 70);

    const tableData = filteredMembres.map(m => {
      const status = getMemberStatus(m.id);
      return [
        `${m.prenom} ${m.nom}`,
        m.telephone || '---',
        `${status.unpaidCount} mois`,
        status.unpaidMonths.join(', '),
        `${formatPrice(status.unpaidCount * 500)} FCFA`
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Identité du Membre', 'Contact', 'Nb Retards', 'Mois en Souffrance', 'Montant Dû']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold', textColor: [153, 27, 27] }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.text(`MONTANT GLOBAL À RECOUVRER : ${formatPrice(totalRetardMontant)} FCFA`, 14, finalY);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} sur ${totalPages} - Daara Madjmahoune Noreyni`, pageWidth / 2, 285, { align: 'center' });
    }

    doc.save(`Etat_Impayes_DMN_${globalYear}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Total Retards</p>
          <p className="text-3xl font-heading font-black text-red-600">{filteredMembres.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Membres à jour</p>
          <p className="text-3xl font-heading font-black text-dmn-green-600">{membres.length - filteredMembres.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Taux de Recouvrement</p>
          <p className="text-3xl font-heading font-black text-blue-600">
            {membres.length > 0 ? Math.round(((membres.length - filteredMembres.length) / membres.length) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-dmn-green-900 text-white px-8 py-6 font-heading font-bold text-lg flex justify-between items-center sm:flex-row flex-col gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-dmn-gold-light" strokeWidth={2.5} /> 
            Suivi des Retards de Paiement
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleGeneralReminderWhatsApp} className="bg-[#25D366] hover:bg-[#1da851] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
              <MessageCircle size={14} /> Rappel Général
            </button>
            <button onClick={exportRetardsPDF} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10">
              <Download size={14} /> Imprimer la Liste
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un membre..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-dmn-green-500 outline-none transition-all font-medium"
                value={npSearch}
                onChange={(e) => setNpSearch(e.target.value)}
              />
            </div>
            <div className="relative w-full md:w-64">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-dmn-green-500 outline-none transition-all font-medium appearance-none"
                value={npMois}
                onChange={(e) => setNpMois(e.target.value)}
              >
                <option value="">Tous les mois (Retards cumulés)</option>
                {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Membre</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-x border-gray-100">Téléphone</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Plus ancien retard</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-x border-gray-100">Mois dus</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Rappels</th>
                  {(isAdmin || isCaisse) && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider border-l border-gray-100">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembres.map((m, idx) => {
                  const status = getMemberStatus(m.id);
                  return (
                    <tr key={m.id} className="hover:bg-red-50/30 transition-colors border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 text-left whitespace-nowrap">
                        <button onClick={() => setSelectedMemberProfile(m)} className="font-bold text-gray-900 hover:text-red-600 transition-colors block">
                          {m.prenom} {m.nom}
                        </button>
                      </td>
                      <td className="px-6 py-4 border-x border-gray-50 border-dashed">
                        <div className="inline-flex items-center gap-1.5 text-gray-600 font-medium">
                          <Smartphone size={14} className="text-gray-400" /> +221 {m.telephone || '---'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm">
                          {status.unpaidMonths[0]?.substring(0, 4) || '---'}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-x border-gray-50 border-dashed min-w-[200px]">
                        <div className="flex flex-col items-center gap-2">
                          <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg text-xs">{status.unpaidCount} mois dûs</span>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {status.unpaidMonths.slice(0, 4).map(mois => (
                              <span key={mois} className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold shadow-sm ${npMois?.toUpperCase() === mois?.toUpperCase() ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {mois.substring(0, 3)}
                              </span>
                            ))}
                            {status.unpaidMonths.length > 4 && <span className="text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold bg-gray-100 text-gray-500 shadow-sm">+{status.unpaidMonths.length - 4}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          {(() => {
                            const formattedTotal = formatPrice(status.unpaidCount * 500);
                            const smsBody = `Dieureudieufé Serigne Touba. Petit rappel fraternel pour votre Cotisation Mensuelle (500 FCFA). Jëf Jël ! Régularisez ici : https://com-soc-dmn-cellule-esp-delta.vercel.app/ ou au 770952647 (Wave/OM). Jaajëf Mûrid.`;
                            
                            const waBody = `*✨ JËF JËL - DAARA DMN CELLULE ESP ✨*\n\nAssalamou halaykoum Mbokkou talibé, \nNous vous prions de recevoir notre humble Ziar. 🙏\n\nDans l'esprit du service (Liggey) envers Serigne Touba, nous vous rappelons amicalement votre participation à la Commission Sociale.\n\n📌 *VOTRE RÉCAPITULATIF :*\n- 🗓️ Mois dus : *${status.unpaidMonths.join(', ')}*\n- 💰 Montant total : *${formattedTotal} FCFA*\n\n✅ *POUR RÉGULARISER :*\n1️⃣ *Par Wave (Direct)* :\n👉 https://com-soc-dmn-cellule-esp-delta.vercel.app/\n\n2️⃣ *Par Transfert (Wave/OM)* :\n📞 *77 095 26 47* (Faye)\n\nQue par la baraka de Khadimou Rassoul, Allah agrée votre dévouement. Jëf Jël ! ✨`;
                            const phone = m.telephone?.replace(/\s/g, '') || '';
                            
                            return (
                              <>
                                <a 
                                  href={`sms:${phone}?body=${encodeURIComponent(smsBody)}`}
                                  className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm"
                                  title="Rappel SMS"
                                >
                                  <Smartphone size={18} />
                                </a>
                                <a 
                                  href={`https://wa.me/${phone}?text=${encodeURIComponent(waBody)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
                                  title="Rappel WhatsApp"
                                >
                                  <MessageCircle size={18} />
                                </a>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      {(isAdmin || isCaisse) && (
                        <td className="px-6 py-4 border-l border-gray-50 border-dashed">
                          <button 
                            onClick={() => { openAddCot(m.id, npMois || status.unpaidMonths[0], globalYear); setFinanceSubTab('cotisations'); setActiveTab('finance'); }}
                            className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20 active:scale-95 whitespace-nowrap"
                          >
                            Régulariser {npMois ? `(${npMois.substring(0, 3)})` : ''}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-1 gap-6">
            {filteredMembres.map((m, idx) => {
              const status = getMemberStatus(m.id);
              return (
                <div key={m.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <button onClick={() => setSelectedMemberProfile(m)} className="font-heading font-bold text-gray-900 text-lg hover:text-red-600 transition-colors block text-left">
                        {m.prenom} {m.nom}
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                        <Smartphone size={12} className="text-gray-300" /> +221 {m.telephone || '---'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                        {status.unpaidMonths[0]?.substring(0, 4) || '---'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3">Mois dus ({status.unpaidCount})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {status.unpaidMonths.map(mois => (
                        <span key={mois} className={`text-[9px] px-2 py-1 rounded-lg uppercase font-black shadow-sm ${npMois?.toUpperCase() === mois?.toUpperCase() ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-100'}`}>
                          {mois.substring(0, 4)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(isAdmin || isCaisse) && (
                      <button 
                        onClick={() => { openAddCot(m.id, npMois || status.unpaidMonths[0], globalYear); setFinanceSubTab('cotisations'); setActiveTab('finance'); }}
                        className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        Régulariser
                      </button>
                    )}
                    <div className="flex gap-2">
                    {(() => {
                        const formattedTotal = formatPrice(status.unpaidCount * 500);
                        const smsBody = `Dieureudieufé Serigne Touba. Petit rappel fraternel pour votre Cotisation Mensuelle (500 FCFA). Jëf Jël ! Régularisez ici : https://com-soc-dmn-cellule-esp-delta.vercel.app/ ou au 770952647 (Wave/OM). Jaajëf Mûrid.`;
                        const waBody = `*✨ JËF JËL - DAARA DMN CELLULE ESP ✨*\n\nAssalamou halaykoum Mbokkou talibé, \nNous vous prions de recevoir notre humble Ziar. 🙏\n\nDans l'esprit du service (Liggey) envers Serigne Touba, nous vous rappelons amicalement votre participation à la Commission Sociale.\n\n📌 *VOTRE RÉCAPITULATIF :*\n- 🗓️ Mois dus : *${status.unpaidMonths.join(', ')}*\n- 💰 Montant total : *${formattedTotal} FCFA*\n\n✅ *POUR RÉGULARISER :*\n1️⃣ *Par Wave (Direct)* :\n👉 https://com-soc-dmn-cellule-esp-delta.vercel.app/\n\n2️⃣ *Par Transfert (Wave/OM)* :\n📞 *77 095 26 47* (Faye)\n\nQue par la baraka de Khadimou Rassoul, Allah agrée votre dévouement. Jëf Jël ! ✨`;
                        const phone = m.telephone?.replace(/\s/g, '') || '';
                        
                        return (
                          <>
                            <a href={`sms:${phone}?body=${encodeURIComponent(smsBody)}`} className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><Smartphone size={20} /></a>
                            <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waBody)}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm"><MessageCircle size={20} /></a>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMembres.length === 0 && (
            <div className="text-center py-20 bg-dmn-green-50/50 rounded-[40px] border-2 border-dashed border-dmn-green-100">
              <div className="w-24 h-24 bg-dmn-green-100 text-dmn-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-heading font-black text-dmn-green-900 mb-2">Tout est en ordre !</h3>
              <p className="text-dmn-green-600 font-medium">Félicitations, tous les membres sont à jour de leurs cotisations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
