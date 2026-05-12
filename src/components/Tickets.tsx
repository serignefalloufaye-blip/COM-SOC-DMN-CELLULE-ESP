import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { Membre, TicketCollecte, TicketConversion, TicketDistribution, UserRole } from '../types';
import { db } from '../firebase';
import { hasPermission, logAudit } from '../utils/permissions';
import { addDoc, deleteDoc, doc, setDoc, collection } from 'firebase/firestore';
import { MOIS } from '../data';
import { relativeDate } from '../utils/date';
import { Ticket, ArrowRightLeft, Users, History, Minus, Plus, Search, Activity, Calendar, TrendingUp, TrendingDown, Clock, X, AlertCircle, CheckCircle2, Download, Table, Printer, BarChart3, MessageCircle, Share2, Copy, Info, Smartphone } from 'lucide-react';
import { TicketsStats } from './TicketsStats';
import { useAdaptive } from '../hooks/useAdaptive';

interface TicketsProps {
  membres: Membre[];
  globalYear: number;
  globalMonth: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  collectes: TicketCollecte[];
  conversions: TicketConversion[];
  distributions: TicketDistribution[];
  userRole: UserRole | null;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
  activeTab: 'statistiques' | 'collecte' | 'conversion' | 'distribution' | 'historique';
  setActiveTab: (tab: 'statistiques' | 'collecte' | 'conversion' | 'distribution' | 'historique') => void;
}

export function Tickets({ membres, globalYear, globalMonth, showToast, collectes, conversions, distributions, userRole, confirmAction, activeTab, setActiveTab }: TicketsProps) {
  const { isMobile, isLowEndDevice } = useAdaptive();
  const isTickets = hasPermission(userRole as any, 'tickets.create');
  const canDelete = hasPermission(userRole as any, 'tickets.delete');

  const currentMonthIndex = new Date().getMonth();
  const currentMonthName = MOIS[currentMonthIndex];
  const effectiveMonth = globalMonth || currentMonthName;

  // New state for announcement
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementRooms, setAnnouncementRooms] = useState({
    'goorYalla': '43G et 47B',
    'sokhnaYi': '59B et 66G'
  });


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
    if (!isTickets) {
      showToast("Accès refusé. Vous n'avez pas le rôle Tickets.", 'error');
      return;
    }
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
      logAudit(userRole, 'tickets.create', 'Social', 'Collecte tickets/argent', { mId, type, petitDej, repas });
      showToast('Enregistrement réussi !');
    } catch (e) {
      console.error("Error collecting tickets:", e);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleAnnulerCollecte = async (colId: string) => {
    if (!canDelete && userRole !== 'admin') {
      showToast("Accès refusé. Vous n'avez pas le droit de supprimer.", 'error');
      return;
    }
    
    confirmAction(
      'Annuler Collecte',
      'Êtes-vous sûr de vouloir annuler cette collecte ?',
      async () => {
        try {
          await deleteDoc(doc(db, 'tickets_collectes', colId));
          logAudit(userRole, 'tickets.delete', 'Social', 'Annulation collecte', { colId });
          showToast('Collecte annulée !');
        } catch (e) {
          console.error("Error cancelling collection:", e);
          showToast('Erreur lors de l\'annulation', 'error');
        }
      }
    );
  };

  const handleAnnulerOperation = async (id: string, type: 'Collecte' | 'Conversion' | 'Distribution') => {
    if (!canDelete && userRole !== 'admin') {
      showToast("Accès refusé", 'error');
      return;
    }
    
    confirmAction(
      `Annuler ${type}`,
      `Voulez-vous vraiment annuler cette ${type.toLowerCase()} ?`,
      async () => {
        try {
          const collectionName = 
            type === 'Collecte' ? 'tickets_collectes' : 
            type === 'Conversion' ? 'tickets_conversions' : 
            'tickets_distributions';
          
          if (type === 'Collecte') {
            const collecte = collectes.find(c => c.id === id);
            if (collecte && collecte.type === 'argent' && collecte.montantArgent) {
              const matchingConv = conversions.find(c => c.montant === collecte.montantArgent);
              if (matchingConv) {
                await deleteDoc(doc(db, 'tickets_conversions', matchingConv.id!));
              }
            }
          }
          
          await deleteDoc(doc(db, collectionName, id));
          logAudit(userRole, 'tickets.delete', 'Social', `Annulation ${type.toLowerCase()}`, { id });
          showToast(`${type} annulée !`);
        } catch (e) {
          showToast('Erreur lors de l\'annulation', 'error');
        }
      }
    );
  };

  const handleSendReminder = (m: Membre, platform: 'whatsapp' | 'sms') => {
    const message = `*COMMISION SOCIALE DAARA MADJMAHOUNE NOREYNI CELLULE ESP*

Assalamou halaykoum cher membre,

Ceci est un rappel concernant la collecte de la contribution pour les *Tickets Restauration* (500 FCFA) au titre du mois en cours.

Votre participation est précieuse et contribue directement au soutien des membres de notre communauté.

*Modalités de règlement :*
- Via Wave ou Orange Money au : *78 277 70 11*
- Ou en espèces auprès du responsable.

Barakallahou fikoum.`;
    
    // SMS message without markdown (stars) for basic compatibility
    const smsMessage = `COMMISION SOCIALE DAARA MADJMAHOUNE NOREYNI CELLULE ESP 
Rappel : Collecte Tickets Restauration (500F).
Paiement via Wave/OM au 782777011 ou en espèces.
Barakallahou fikoum.`;

    const phone = m.telephone?.replace(/\s/g, '');
    if (!phone) {
      navigator.clipboard.writeText(message);
      showToast('Message de rappel copié ! (Pas de numéro trouvé)', 'success');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : '+221' + phone;
    const encodedMsg = platform === 'whatsapp' ? encodeURIComponent(message) : encodeURIComponent(smsMessage);

    if (platform === 'whatsapp') {
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;
      window.open(whatsappUrl, '_blank');
      showToast('Redirection WhatsApp...', 'success');
    } else {
      const smsUrl = `sms:${formattedPhone}?body=${encodedMsg}`;
      window.location.href = smsUrl;
      showToast('Ouverture SMS...', 'success');
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
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">{m.prenom} {m.nom}</h3>
                  {!collecteDuMois && (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleSendReminder(m, 'sms')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="Rappel par SMS"
                      >
                        <Smartphone size={16} />
                      </button>
                      <button 
                        onClick={() => handleSendReminder(m, 'whatsapp')}
                        className="p-2 text-dmn-green-600 hover:bg-dmn-green-50 rounded-full transition-all"
                        title="Rappel par WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  )}
                </div>
                
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
                    {isTickets && (
                      <button onClick={() => handleAnnulerCollecte(collecteDuMois.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Annuler">
                        <Minus size={18} />
                      </button>
                    )}
                  </div>
                ) : (
                  isTickets ? (
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
                  ) : (
                    <div className="mt-4 p-4 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                      <p className="text-xs text-gray-400 font-medium">Non payé - En attente</p>
                    </div>
                  )
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
    if (!isTickets) {
      showToast("Accès refusé", "error");
      return;
    }
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

    confirmAction(
      'Convertir en tickets',
      `Voulez-vous vraiment convertir ${montant} FCFA en ${pd} petits déj' et ${repas} repas ?`,
      async () => {
        try {
          await addDoc(collection(db, 'tickets_conversions'), {
            montant,
            petitDej: pd,
            repas: repas,
            createdAt: Date.now()
          });
          logAudit(userRole, 'tickets.create', 'Social', 'Conversion argent en tickets', { montant, pd, repas });
          setConvMontant(''); setConvPD(0); setConvRepas(0);
          showToast("Conversion réussie !");
          setIsAnnouncementModalOpen(true);
        } catch (err) {
          showToast("Erreur lors de la conversion", "error");
        }
      }
    );
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
                <button type="button" onClick={() => setConvPD(p => Math.max(0, p - 1))} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{convPD}</span>
                <button type="button" onClick={() => setConvPD(p => p + 1)} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Plus size={18} /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tickets Repas (100F)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setConvRepas(p => Math.max(0, p - 1))} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{convRepas}</span>
                <button type="button" onClick={() => setConvRepas(p => p + 1)} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Plus size={18} /></button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 font-bold text-sm text-center">
            Total Tickets : {(convPD * 50) + (convRepas * 100)} FCFA
          </div>

          <button type="submit" className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-[0_8px_16px_-6px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none mb-4">
            Convertir
          </button>

          <button 
            type="button"
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="w-full py-4 bg-dmn-green-50 text-dmn-green-700 rounded-xl font-bold border border-dmn-green-100 flex items-center justify-center gap-2 hover:bg-dmn-green-100 transition-all active:scale-95 mb-4"
          >
            <Share2 size={18} /> Annoncer la disponibilité
          </button>
        </form>
      </div>
    );
  };

  const [distPD, setDistPD] = useState(0);
  const [distRepas, setDistRepas] = useState(0);

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTickets) {
      showToast("Accès refusé", "error");
      return;
    }
    if (distPD === 0 && distRepas === 0) return showToast("Saisissez des tickets", "error");

    if (distPD > stockPetitDej) return showToast(`Stock Petit Dèj insuffisant (${stockPetitDej} restants)`, "error");
    if (distRepas > stockRepas) return showToast(`Stock Repas insuffisant (${stockRepas} restants)`, "error");

    confirmAction(
      'Distribuer les tickets',
      `Voulez-vous vraiment sortir ${distPD} petits déj' et ${distRepas} repas du stock ?`,
      async () => {
        try {
          await addDoc(collection(db, 'tickets_distributions'), {
            petitDej: distPD,
            repas: distRepas,
            mois: globalMonth,
            annee: globalYear,
            createdAt: Date.now()
          });
          logAudit(userRole, 'tickets.create', 'Social', 'Distribution tickets (sortie stock)', { pd: distPD, repas: distRepas });
          setDistPD(0); setDistRepas(0);
          showToast("Tickets distribués !");
        } catch (err) {
          showToast("Erreur de distribution", "error");
        }
      }
    );
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
                <button type="button" onClick={() => setDistPD(p => Math.max(0, p - 1))} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{distPD}</span>
                <button type="button" onClick={() => setDistPD(p => p + 1)} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Plus size={18} /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Repas (Dispo: {stockRepas})</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDistRepas(p => Math.max(0, p - 1))} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Minus size={18} /></button>
                <span className="font-bold text-lg w-8 text-center">{distRepas}</span>
                <button type="button" onClick={() => setDistRepas(p => p + 1)} className="p-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 flex items-center justify-center"><Plus size={18} /></button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-[0_8px_16px_-6px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(249,115,22,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none">
            Valider la sortie de stock
          </button>
        </form>
      </div>
    );
  };

  const [searchHistory, setSearchHistory] = useState('');

  const renderHistorique = () => {
    type Operation = { id: string, date: number, type: 'Collecte' | 'Conversion' | 'Distribution', desc: string, detail: string };
    const history: Operation[] = [];
    
    collectes.forEach(c => {
      const membre = membres.find(m => m.id === c.mId);
      history.push({
        id: c.id || `${c.mId}_${c.annee}_${c.mois}`,
        date: c.createdAt || 0,
        type: 'Collecte',
        desc: `de ${membre?.prenom} ${membre?.nom}`,
        detail: c.type === 'argent' ? '500 FCFA' : `${c.petitDej} PD, ${c.repas} RP`
      });
    });

    conversions.forEach(c => {
      history.push({
        id: c.id || '',
        date: c.createdAt || 0,
        type: 'Conversion',
        desc: 'Argent vers Tickets',
        detail: `-${c.montant} F ➔ +${c.petitDej} PD, +${c.repas} RP`
      });
    });

    distributions.forEach(d => {
      const membre = d.mId ? membres.find(m => m.id === d.mId) : null;
      history.push({
        id: d.id || '',
        date: d.createdAt || 0,
        type: 'Distribution',
        desc: membre ? `Sortie pour ${membre.prenom}` : 'Sortie Stock',
        detail: `-${d.petitDej} PD, -${d.repas} RP`
      });
    });

    const filteredHistory = history.filter(h => 
      h.desc.toLowerCase().includes(searchHistory.toLowerCase()) || 
      h.type.toLowerCase().includes(searchHistory.toLowerCase()) ||
      h.detail.toLowerCase().includes(searchHistory.toLowerCase())
    );

    const sortedHistory = filteredHistory.sort((a, b) => b.date - a.date);

    return (
      <div className="space-y-4">
        <div className="flex gap-3 mb-2 px-1">
           <div className="relative flex-1">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Filtrer l'historique..." 
               value={searchHistory}
               onChange={(e) => setSearchHistory(e.target.value)}
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-dmn-green-500/20 text-sm font-medium"
             />
           </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="sm:hidden space-y-3">
           {sortedHistory.map((h, i) => (
             <div key={h.id || i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 relative">
                {isTickets && (
                  <button 
                    onClick={() => handleAnnulerOperation(h.id, h.type)}
                    className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Minus size={16} />
                  </button>
                )}
                <div className="flex justify-between items-center pr-8">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                     h.type === 'Collecte' ? 'bg-dmn-green-100 text-dmn-green-700' :
                     h.type === 'Conversion' ? 'bg-purple-100 text-purple-700' :
                     'bg-orange-100 text-orange-700'
                   }`}>{h.type}</span>
                   <span className="text-[9px] text-gray-400 font-bold">
                     {relativeDate(h.date)}
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
                {isTickets && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedHistory.map((h, i) => (
                <tr key={h.id || i} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {relativeDate(h.date)}
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
                  {isTickets && (
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleAnnulerOperation(h.id, h.type)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <Minus size={18} />
                      </button>
                    </td>
                  )}
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
    { id: 'statistiques', label: 'Dashboard', icon: Activity },
    { id: 'collecte', label: 'Enr. Collecte', icon: Plus },
    { id: 'conversion', label: 'Conversion F', icon: ArrowRightLeft },
    { id: 'distribution', label: 'Distrib. Directe', icon: Users },
    { id: 'historique', label: 'Logs Activité', icon: History }
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-10 pb-40 px-4 sm:px-6"
    >
      {/* NAVIGATION SECONDAIRE */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-soft border border-gray-100/80">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-2xl sm:text-4xl fintech-heading">Gestion Tickets Resto</h2>
          <p className="text-[10px] font-black text-dmn-green-600 uppercase tracking-[0.4em] flex items-center gap-3">
            <span className="w-2 h-2 bg-dmn-gold rounded-full shadow-[0_0_8px_rgba(107,63,42,0.4)]"></span> Flux Logistique – {effectiveMonth} {globalYear}
          </p>
        </div>

        <div className="w-full lg:w-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="flex bg-gray-50/80 p-1.5 rounded-[1.5rem] sm:rounded-[2rem] overflow-x-auto no-scrollbar border border-gray-100/50 shadow-inner snap-x snap-mandatory">
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`snap-center shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-[1.25rem] sm:rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white text-dmn-green-950 shadow-md shadow-dmn-green-900/5 border border-gray-100 scale-100 sm:scale-105 relative z-10' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'
                }`}
              >
                <tab.icon size={14} className={`transition-all duration-300 ${activeTab === tab.id ? 'text-dmn-green-600 stroke-[2.5px]' : 'stroke-2'}`} />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* STATISTIQUES RAPIDES */}
      {activeTab !== 'statistiques' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div whileHover={{ y: -5 }} className="premium-card p-10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-dmn-green-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Argent Dispo</p>
             <p className="text-3xl fintech-kpi text-dmn-green-950 relative z-10">{argentDisponible} <span className="text-xs font-black text-gray-400 tracking-normal">FCFA</span></p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="premium-card p-10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Stock PetitDèj</p>
             <p className="text-3xl fintech-kpi text-dmn-green-950 relative z-10">{stockPetitDej} <span className="text-xs font-black text-gray-400 tracking-normal">UTS</span></p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="premium-card p-10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Stock Repas</p>
             <p className="text-3xl fintech-kpi text-dmn-green-950 relative z-10">{stockRepas} <span className="text-xs font-black text-gray-400 tracking-normal">UTS</span></p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="premium-card bg-dmn-green-900 border-none p-10 text-white relative overflow-hidden group">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mb-16 transition-transform group-hover:scale-150 duration-700"></div>
             <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Total Distribué</p>
             <p className="text-3xl fintech-kpi text-white relative z-10">{ticketsDistribuesPetitDej + ticketsDistribuesRepas} <span className="text-xs font-black text-white/30 tracking-normal">UTS</span></p>
          </motion.div>
        </div>
      )}

      {/* CONTENU DYNAMIQUE */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="min-h-[400px]"
        >
          {activeTab === 'statistiques' && (
            <TicketsStats 
              membres={membres} collectes={collectes} conversions={conversions} distributions={distributions} 
            />
          )}

          {activeTab === 'collecte' && renderCollecte()}
          {activeTab === 'conversion' && renderConversion()}
          {activeTab === 'distribution' && renderDistribution()}
          {activeTab === 'historique' && renderHistorique()}
        </motion.div>
      </AnimatePresence>

      <AnnouncementModal 
        isOpen={isAnnouncementModalOpen} 
        onClose={() => setIsAnnouncementModalOpen(false)}
        rooms={announcementRooms}
        setRooms={setAnnouncementRooms}
        showToast={showToast}
      />
    </motion.div>
  );
}

function AnnouncementModal({ 
  isOpen, 
  onClose, 
  rooms, 
  setRooms,
  showToast 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  rooms: { goorYalla: string, sokhnaYi: string },
  setRooms: React.Dispatch<React.SetStateAction<{ goorYalla: string, sokhnaYi: string }>>,
  showToast: (m: string, t?: 'success' | 'error') => void
}) {
  const getMessage = () => `🚨🚨 TICKETS RESTO DISPONIBLES À NOUVEAU 🍽️🍽️

La Commission Sociale du DMN Cellule ESP informe tous les membres que les TICKETS RESTO (repas 🍛 et petits déjeuners ☕) sont à nouveau disponible 
Disponibilité actuelle :

- ✅ Goor Yalla : ${rooms.goorYalla}

- ✅ Sokhna yi  : ${rooms.sokhnaYi}


Pour plus d'information contactez 
782777011
764531437`;

  const handleShare = () => {
    const text = getMessage();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getMessage());
    showToast("Message copié ! N'oubliez pas d'envoyer l'image d'accompagnement.", 'success');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-dmn-green-50 rounded-2xl flex items-center justify-center mx-auto text-dmn-green-600 mb-4">
                  <Share2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Annoncer la disponibilité</h3>
                <p className="text-gray-500 text-sm mt-1">Générez le message pour le groupe Daara</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chambres Goor Yalla</label>
                    <input 
                      type="text" 
                      value={rooms.goorYalla} 
                      onChange={e => setRooms(prev => ({ ...prev, goorYalla: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold focus:ring-2 focus:ring-dmn-green-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chambres Sokhna Yi</label>
                    <input 
                      type="text" 
                      value={rooms.sokhnaYi} 
                      onChange={e => setRooms(prev => ({ ...prev, sokhnaYi: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold focus:ring-2 focus:ring-dmn-green-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Prévisualisation du message</p>
                  <pre className="text-xs font-sans whitespace-pre-wrap leading-relaxed text-gray-700 max-h-60 overflow-y-auto custom-scrollbar">
                    {getMessage()}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleCopy}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Copier le texte
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex-1 py-4 bg-dmn-green-600 hover:bg-dmn-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-dmn-green-600/20"
                  >
                    <MessageCircle size={16} /> Partager via WhatsApp
                  </button>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-800 font-medium leading-normal">
                    Note: Une fois le message copié ou partagé, n'oubliez pas de joindre manuellement l'image "Commission Sociale" dans le groupe WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
          <div className="flex items-center justify-between bg-white pl-1 pr-1 py-1 rounded-xl border border-orange-200">
            <button onClick={() => setPd(p => Math.max(0, p - 1))} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors active:scale-95"><Minus size={16}/></button>
            <span className="text-base font-black w-8 text-center">{pd}</span>
            <button onClick={() => setPd(p => p + 1)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors active:scale-95"><Plus size={16}/></button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Repas</p>
          <div className="flex items-center justify-between bg-white pl-1 pr-1 py-1 rounded-xl border border-blue-200">
            <button onClick={() => setRepas(p => Math.max(0, p - 1))} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors active:scale-95"><Minus size={16}/></button>
            <span className="text-base font-black w-8 text-center">{repas}</span>
            <button onClick={() => setRepas(p => p + 1)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors active:scale-95"><Plus size={16}/></button>
          </div>
        </div>
      </div>
      <button 
        onClick={() => {
          onSubmit(pd, repas);
          setPd(0); setRepas(0);
        }}
        className="w-full p-4 mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        <Ticket size={18} />
        Enregistrer les tickets
      </button>
    </div>
  );
}
