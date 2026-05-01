import React, { useState } from 'react';
import { Membre, TicketCollecte, TicketConversion, TicketDistribution } from '../types';
import { db } from '../firebase';
import { addDoc, deleteDoc, doc, setDoc, collection } from 'firebase/firestore';
import { MOIS } from '../data';
import { Ticket, ArrowRightLeft, Users, History, Minus, Plus, Search, Activity, Calendar } from 'lucide-react';
import { TicketsStats } from './TicketsStats';

interface TicketsProps {
  membres: Membre[];
  globalYear: number;
  globalMonth: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  collectes: TicketCollecte[];
  conversions: TicketConversion[];
  distributions: TicketDistribution[];
}

export function Tickets({ membres, globalYear, globalMonth, showToast, collectes, conversions, distributions }: TicketsProps) {
  const [activeTab, setActiveTab] = useState<'collecte' | 'conversion' | 'distribution' | 'historique' | 'statistiques'>('statistiques');

  const currentMonthIndex = new Date().getMonth();
  const currentMonthName = MOIS[currentMonthIndex];
  const effectiveMonth = globalMonth || currentMonthName;

  // Calculate global numbers
  const totalArgentCollecte = collectes.filter(c => c.type === 'argent').reduce((s, c) => s + (c.montantArgent || 0), 0);
  const totalArgentConverti = conversions.reduce((s, c) => s + c.montant, 0);
  const argentDisponible = totalArgentCollecte - totalArgentConverti;

  const ticketsGeneresParConversionPetitDej = conversions.reduce((s, c) => s + (c.petitDej || 0), 0);
  const ticketsGeneresParConversionRepas = conversions.reduce((s, c) => s + (c.repas || 0), 0);

  const ticketsCollectesPetitDej = collectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.petitDej || 0), 0);
  const ticketsCollectesRepas = collectes.filter(c => c.type === 'tickets').reduce((s, c) => s + (c.repas || 0), 0);

  const ticketsDistribuesPetitDej = distributions.reduce((s, c) => s + (c.petitDej || 0), 0);
  const ticketsDistribuesRepas = distributions.reduce((s, c) => s + (c.repas || 0), 0);

  const stockPetitDej = ticketsGeneresParConversionPetitDej + ticketsCollectesPetitDej - ticketsDistribuesPetitDej;
  const stockRepas = ticketsGeneresParConversionRepas + ticketsCollectesRepas - ticketsDistribuesRepas;

  // Render Collection View
  const [searchMembre, setSearchMembre] = useState('');
  
  const handleCollecte = async (mId: string, type: 'argent' | 'tickets', petitDej: number, repas: number) => {
    try {
      if (type === 'tickets' && petitDej === 0 && repas === 0) {
        showToast("Veuillez saisir au moins un ticket", 'error');
        return;
      }
      
      const colId = `${mId}_${globalYear}_${effectiveMonth}`;
      await setDoc(doc(db, 'tickets_collectes', colId), {
        mId,
        annee: globalYear,
        mois: effectiveMonth,
        type,
        montantArgent: type === 'argent' ? 500 : 0,
        petitDej: type === 'tickets' ? petitDej : 0,
        repas: type === 'tickets' ? repas : 0,
        createdAt: Date.now()
      });
      showToast('Enregistrement réussi !');
    } catch (e) {
      console.error("Error collecting tickets:", e);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleAnnulerCollecte = async (mId: string) => {
    try {
      const colId = `${mId}_${globalYear}_${effectiveMonth}`;
      await deleteDoc(doc(db, 'tickets_collectes', colId));
      showToast('Collecte annulée !');
    } catch (e) {
      showToast('Erreur lors de l\'annulation', 'error');
    }
  };

  const renderCollecte = () => {
    const nomComplet = (m: Membre) => `${m.prenom} ${m.nom}`;
    const filteredMembres = membres.filter(m => nomComplet(m).toLowerCase().includes(searchMembre.toLowerCase()));

    return (
      <div className="space-y-4">
        <div className="bg-dmn-green-50 px-6 py-3 rounded-2xl border border-dmn-green-100 flex items-center justify-between">
          <p className="text-dmn-green-800 font-bold">Collecte pour <span className="text-dmn-green-600 font-black">{effectiveMonth} {globalYear}</span></p>
          <p className="text-[10px] font-black text-dmn-green-400 uppercase tracking-widest">Enregistrement Mensuel</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchMembre}
            onChange={(e) => setSearchMembre(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-dmn-green-500 focus:ring-2 focus:ring-dmn-green-200 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembres.map(m => {
            const collecteDuMois = collectes.find(c => c.mId === m.id && c.annee === globalYear && c.mois === effectiveMonth);
            
            return (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-900 text-lg">{m.prenom} {m.nom}</h3>
                
                {collecteDuMois ? (
                  <div className="mt-4 p-4 rounded-xl bg-dmn-green-50 border border-dmn-green-100 flex justify-between items-center">
                    <div>
                      <p className="text-dmn-green-700 font-bold uppercase text-xs tracking-wider mb-1">Payé ce mois-ci</p>
                      {collecteDuMois.type === 'argent' ? (
                        <p className="text-base font-black text-gray-900">500 FCFA</p>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                            <p className="text-sm font-black text-gray-700">{collecteDuMois.petitDej} Petit Déj</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            <p className="text-sm font-black text-gray-700">{collecteDuMois.repas} Repas</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleAnnulerCollecte(m.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Annuler">
                      <Minus size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <button 
                      onClick={() => handleCollecte(m.id, 'argent', 0, 0)}
                      className="w-full py-2.5 bg-dmn-green-600 hover:bg-dmn-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-dmn-green-600/20"
                    >
                      <Plus size={16} /> 500 FCFA (Argent)
                    </button>
                    
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-3 text-center">Ajouter Tickets Resto</p>
                      <TicketForm onSubmit={(pd, r) => handleCollecte(m.id, 'tickets', pd, r)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const [convMontant, setConvMontant] = useState('');
  const [convPD, setConvPD] = useState(0);
  const [convRepas, setConvRepas] = useState(0);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseFloat(convMontant);
    const pd = convPD;
    const repas = convRepas;

    if (!montant || montant <= 0 || montant > argentDisponible) {
      showToast("Montant invalide ou supérieur au disponible", "error");
      return;
    }

    const neededMoney = (pd * 50) + (repas * 100);
    if (montant !== neededMoney) {
      showToast(`Le montant doit être exactement ${neededMoney} FCFA pour ces tickets`, "error");
      return;
    }

    try {
      await addDoc(collection(db, 'tickets_conversions'), {
        montant,
        petitDej: pd,
        repas: repas,
        createdAt: Date.now()
      });
      setConvMontant(''); setConvPD(0); setConvRepas(0);
      showToast("Conversion réussie !");
    } catch (err) {
      showToast("Erreur lors de la conversion", "error");
    }
  };

  const renderConversion = () => {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <ArrowRightLeft className="text-dmn-green-600" />
          Convertir Argent en Tickets
        </h3>

        <div className="bg-dmn-green-50 p-4 rounded-xl mb-6 border border-dmn-green-100">
          <p className="text-sm text-dmn-green-800 font-bold uppercase tracking-widest mb-1">Argent Disponible</p>
          <p className="text-3xl font-black text-dmn-green-700">{argentDisponible} FCFA</p>
        </div>

        <form onSubmit={handleConvert} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Montant à convertir (FCFA)</label>
            <input type="number" required value={convMontant} onChange={e => setConvMontant(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-dmn-green-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tickets P.Déj (50F)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setConvPD(p => Math.max(0, p - 1))} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{convPD}</span>
                <button type="button" onClick={() => setConvPD(p => p + 1)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Plus size={18} /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tickets Repas (100F)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setConvRepas(p => Math.max(0, p - 1))} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{convRepas}</span>
                <button type="button" onClick={() => setConvRepas(p => p + 1)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Plus size={18} /></button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 font-bold text-sm text-center">
            Total Tickets : {(convPD * 50) + (convRepas * 100)} FCFA
          </div>

          <button type="submit" className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">
            Convertir
          </button>
        </form>
      </div>
    );
  };

  const [distPD, setDistPD] = useState(0);
  const [distRepas, setDistRepas] = useState(0);

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (distPD === 0 && distRepas === 0) return showToast("Saisissez des tickets", "error");

    if (distPD > stockPetitDej) return showToast(`Stock Petit Dèj insuffisant (${stockPetitDej} restants)`, "error");
    if (distRepas > stockRepas) return showToast(`Stock Repas insuffisant (${stockRepas} restants)`, "error");

    try {
      await addDoc(collection(db, 'tickets_distributions'), {
        petitDej: distPD,
        repas: distRepas,
        mois: globalMonth,
        annee: globalYear,
        createdAt: Date.now()
      });
      setDistPD(0); setDistRepas(0);
      showToast("Tickets distribués !");
    } catch (err) {
      showToast("Erreur de distribution", "error");
    }
  };

  const renderDistribution = () => {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <Ticket className="text-orange-500" />
          Sortie de Tickets du Stock
        </h3>

        <form onSubmit={handleDistribute} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Petit Dèj (Dispo: {stockPetitDej})</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDistPD(p => Math.max(0, p - 1))} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{distPD}</span>
                <button type="button" onClick={() => setDistPD(p => p + 1)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Plus size={18} /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Repas (Dispo: {stockRepas})</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDistRepas(p => Math.max(0, p - 1))} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{distRepas}</span>
                <button type="button" onClick={() => setDistRepas(p => p + 1)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"><Plus size={18} /></button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">
            Valider la sortie de stock
          </button>
        </form>
      </div>
    );
  };

  const renderHistorique = () => {
    type Operation = { date: number, type: 'Collecte' | 'Conversion' | 'Distribution', desc: string, detail: string };
    const history: Operation[] = [];
    
    collectes.forEach(c => {
      const membre = membres.find(m => m.id === c.mId);
      history.push({
        date: c.createdAt || 0,
        type: 'Collecte',
        desc: `de ${membre?.prenom} ${membre?.nom}`,
        detail: c.type === 'argent' ? '500 FCFA' : `${c.petitDej} PD, ${c.repas} RP`
      });
    });

    conversions.forEach(c => {
      history.push({
        date: c.createdAt || 0,
        type: 'Conversion',
        desc: 'Argent vers Tickets',
        detail: `-${c.montant} F ➔ +${c.petitDej} PD, +${c.repas} RP`
      });
    });

    distributions.forEach(d => {
      const membre = d.mId ? membres.find(m => m.id === d.mId) : null;
      history.push({
        date: d.createdAt || 0,
        type: 'Distribution',
        desc: membre ? `Sortie pour ${membre.prenom}` : 'Sortie Stock',
        detail: `-${d.petitDej} PD, -${d.repas} RP`
      });
    });

    const sortedHistory = history.sort((a, b) => b.date - a.date);

    return (
      <div className="space-y-3">
        {/* Mobile View: Cards */}
        <div className="sm:hidden space-y-3">
           {sortedHistory.map((h, i) => (
             <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                     h.type === 'Collecte' ? 'bg-dmn-green-100 text-dmn-green-700' :
                     h.type === 'Conversion' ? 'bg-purple-100 text-purple-700' :
                     'bg-orange-100 text-orange-700'
                   }`}>{h.type}</span>
                   <span className="text-[9px] text-gray-400 font-bold">
                     {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '---'}
                   </span>
                </div>
                <p className="text-xs font-bold text-gray-900">{h.desc}</p>
                <div className="bg-white border border-gray-200/50 rounded-lg px-3 py-1.5 text-[11px] font-mono text-dmn-green-800">
                   {h.detail}
                </div>
             </div>
           ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Opération</th>
                <th className="px-6 py-4">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedHistory.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest mr-3 ${
                      h.type === 'Collecte' ? 'bg-dmn-green-100 text-dmn-green-700' :
                      h.type === 'Conversion' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {h.type}
                    </span>
                    <span className="font-medium text-gray-900">{h.desc}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600 bg-gray-50/50">{h.detail}</td>
                </tr>
              ))}
              {sortedHistory.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Aucune opération trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'statistiques', label: 'Statistiques avancées', icon: Activity },
    { id: 'collecte', label: 'Collecte Mensuelle', icon: Users },
    { id: 'conversion', label: 'Conversion', icon: ArrowRightLeft },
    { id: 'distribution', label: 'Distribution', icon: Ticket },
    { id: 'historique', label: 'Historique', icon: History },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Dashboard Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-gray-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Argent Dispo</p>
          <p className="text-xl sm:text-3xl font-black text-gray-900">{argentDisponible}F</p>
        </div>
        <div className="bg-dmn-green-600 p-4 sm:p-6 rounded-[2rem] shadow-sm border border-dmn-green-700 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-dmn-green-100 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Petit Dèj</p>
          <p className="text-xl sm:text-3xl font-black">{stockPetitDej}</p>
        </div>
        <div className="bg-dmn-green-800 p-4 sm:p-6 rounded-[2rem] shadow-sm border border-dmn-green-900 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-dmn-green-100 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Stock Repas</p>
          <p className="text-xl sm:text-3xl font-black">{stockRepas}</p>
        </div>
        <div className="bg-orange-500 p-4 sm:p-6 rounded-[2rem] shadow-sm border border-orange-600 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-orange-100 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Total Sortis</p>
          <p className="text-xl sm:text-3xl font-black">{ticketsDistribuesPetitDej + ticketsDistribuesRepas}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar px-2 pt-2 scroll-smooth">
          {tabs.map(t => (
             <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-bold text-xs sm:text-sm whitespace-nowrap transition-all rounded-t-2xl min-w-fit ${
                activeTab === t.id 
                  ? 'text-dmn-green-700 bg-dmn-green-50 shadow-sm border-b-2 border-dmn-green-500' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-b-2 border-transparent opacity-60'
              }`}
             >
               <t.icon size={16} className="sm:size-18" /> {t.label}
             </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'statistiques' && <TicketsStats membres={membres} collectes={collectes} conversions={conversions} distributions={distributions} />}
          {activeTab === 'collecte' && renderCollecte()}
          {activeTab === 'conversion' && renderConversion()}
          {activeTab === 'distribution' && renderDistribution()}
          {activeTab === 'historique' && renderHistorique()}
        </div>
      </div>
    </div>
  );
}

function TicketForm({ onSubmit }: { onSubmit: (pd: number, repas: number) => void }) {
  const [pd, setPd] = useState(0);
  const [repas, setRepas] = useState(0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1">Petit Déj</p>
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-orange-200">
            <button onClick={() => setPd(p => Math.max(0, p - 1))} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Minus size={14}/></button>
            <span className="text-sm font-black w-6 text-center">{pd}</span>
            <button onClick={() => setPd(p => p + 1)} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Plus size={14}/></button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Repas</p>
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-200">
            <button onClick={() => setRepas(p => Math.max(0, p - 1))} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Minus size={14}/></button>
            <span className="text-sm font-black w-6 text-center">{repas}</span>
            <button onClick={() => setRepas(p => p + 1)} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Plus size={14}/></button>
          </div>
        </div>
      </div>
      <button 
        onClick={() => {
          onSubmit(pd, repas);
          setPd(0); setRepas(0);
        }}
        className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        <Ticket size={18} />
        Enregistrer les tickets
      </button>
    </div>
  );
}
