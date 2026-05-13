import React, { useMemo, useState } from 'react';
import { Membre, Cotisation, PaiementAttente } from '../types';
import { 
  CheckCircle2, XCircle, AlertTriangle, Wallet, Calendar, CalendarDays, 
  TrendingUp, Download, PieChart as PieChartIcon, Activity, Printer, Info, UserCheck, Loader2, Smartphone, Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formalizeDate } from '../utils/date';
import { formatPrice } from '../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface MemberDashboardProps {
  myMembre: Membre | null;
  membres: Membre[];
  currentUser: FirebaseUser | null;
  cotisations: Cotisation[];
  globalYear: number;
  MOIS: string[];
  paiementsAttente: PaiementAttente[];
  defaultPrice: number;
  onDirectPaymentClick?: (mode: 'WAVE' | 'OM', amount: number, unpaidMonths: string[]) => void;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ myMembre, membres, currentUser, cotisations, globalYear, MOIS, paiementsAttente, defaultPrice, onDirectPaymentClick }) => {
  const [linkingMembreId, setLinkingMembreId] = useState('');
  const [linkingSearch, setLinkingSearch] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const myCotisations = useMemo(() => {
    if (!myMembre) return [];
    return cotisations.filter(c => c.mId === myMembre.id && c.montant > 0);
  }, [cotisations, myMembre]);

  const currentYearCotisations = myCotisations; // Already filtered by globalYear in App.tsx

  // Statut - Alignement avec la logique de la Caisse (App.tsx)
  const getUnpaidMonths = () => {
    if (!myMembre) return [];
    
    let startMonthIndex = 0;
    if (myMembre.anneeIntegration && myMembre.moisIntegration) {
      if (Number(myMembre.anneeIntegration) === Number(globalYear)) {
        startMonthIndex = MOIS.indexOf(myMembre.moisIntegration);
      } else if (Number(myMembre.anneeIntegration) > Number(globalYear)) {
        return []; // Pas encore de cotisations dues pour cette année passée
      }
    } else if (myMembre.createdAt) {
      const createdDate = new Date(myMembre.createdAt);
      if (createdDate.getFullYear() === Number(globalYear)) {
        startMonthIndex = createdDate.getMonth();
      } else if (createdDate.getFullYear() > Number(globalYear)) {
        return [];
      }
    }

    const currentYear = new Date().getFullYear();
    const currentActualMonthIndex = new Date().getMonth();
    
    // Si on regarde une année future, pas encore de dettes
    if (Number(globalYear) > currentYear) return [];

    // Si on regarde l'année en cours, on s'arrête au mois actuel. 
    // Sinon on regarde toute l'année (jusqu'à décembre).
    const currentMonthIndex = Number(globalYear) === currentYear ? currentActualMonthIndex : 11;
    
    const unpaid = [];
    for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
      const month = MOIS[i];
      if (!currentYearCotisations.some(c => c.mois === month)) {
        unpaid.push(month);
      }
    }
    return unpaid;
  };

  const unpaidMonths = useMemo(() => getUnpaidMonths(), [myMembre, globalYear, currentYearCotisations, MOIS]);
  
  const myPendingPayments = useMemo(() => {
    if (!myMembre) return [];
    return paiementsAttente.filter(p => p.mId === myMembre.id && p.statut === 'EN_ATTENTE');
  }, [paiementsAttente, myMembre]);

  const handleLinkProfile = async () => {
    if (!linkingMembreId) {
      setLinkError('Veuillez sélectionner un profil.');
      return;
    }
    if (!currentUser) {
      setLinkError('Vous devez être connecté.');
      return;
    }
    
    setIsLinking(true);
    setLinkError('');
    try {
      await updateDoc(doc(db, 'membres', linkingMembreId), {
        email: currentUser.email || '',
        telephone: currentUser.phoneNumber || '',
        userId: currentUser.uid,
        updatedAt: Date.now()
      });
      // Component will automatically re-render when myMembre gets detected via updated firestore members.
    } catch (err: any) {
      console.error("Erreur lors de la liaison du profil", err);
      setLinkError('Une erreur est survenue.');
      setIsLinking(false);
    }
  };

  if (!myMembre) {
    const unlinkedMembres = membres.filter(m => !m.userId && !m.email);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <UserCheck size={32} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Détection du Profil</h2>
          <p className="text-gray-500 mb-6 text-center text-sm">
            Votre compte Google (<strong>{currentUser?.email}</strong>) n'a pas été automatiquement lié à un profil membre. 
            Sélectionnez votre profil dans la liste ci-dessous pour le lier.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-semibold text-gray-700">Choisir mon profil</label>
              <input 
                type="text" 
                placeholder="Filtrer par prénom ou nom..."
                value={linkingSearch}
                onChange={(e) => setLinkingSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
              <select 
                value={linkingMembreId} 
                onChange={(e) => setLinkingMembreId(e.target.value)}
                size={5}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm max-h-48"
              >
                {unlinkedMembres
                  .filter(m => `${m.prenom} ${m.nom}`.toLowerCase().includes(linkingSearch.toLowerCase()))
                  .map(m => (
                    <option key={m.id} value={m.id} className="py-1">
                      {m.prenom} {m.nom} {m.telephone ? `(${m.telephone})` : ''} - {m.statut || 'N/A'}
                    </option>
                  ))
                }
              </select>
            </div>
            
            {linkError && <p className="text-red-500 text-sm font-semibold text-center">{linkError}</p>}
            
            <button
              onClick={handleLinkProfile}
              disabled={isLinking || !linkingMembreId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm mt-4"
            >
              {isLinking ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
              Confirmer et Lier mon compte
            </button>
            <p className="text-xs text-gray-400 text-center mt-4">
              Si votre nom n'apparaît pas dans la liste, veuillez contacter un administrateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPaid = currentYearCotisations.reduce((acc, c) => acc + c.montant, 0);
  const allTimeTotalPaid = myCotisations.reduce((acc, c) => acc + c.montant, 0);
  const montantRestant = unpaidMonths.length * defaultPrice;

  const isEnRetard = unpaidMonths.length > 0;
  const isRetardLeger = unpaidMonths.length === 1;

  const getStatusDisplay = () => {
    if (!isEnRetard) return { icon: CheckCircle2, text: 'À jour', color: 'text-dmn-green-600', bg: 'bg-dmn-green-50', border: 'border-dmn-green-100', glow: 'shadow-dmn-green-500/10' };
    if (isRetardLeger) return { icon: AlertTriangle, text: 'Retard léger', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', glow: 'shadow-amber-500/10' };
    return { icon: XCircle, text: 'En retard', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', glow: 'shadow-rose-500/10' };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  const modePaiementFrequents = Object.entries(myCotisations.reduce((acc, c) => {
    acc[c.mode || 'WAVE'] = (acc[c.mode || 'WAVE'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'N/A';

  const chartData = MOIS.map(m => {
    const cots = currentYearCotisations.filter(c => c.mois === m);
    const sum = cots.reduce((acc, c) => acc + c.montant, 0);
    return { name: m.substring(0, 3), montant: sum };
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(`Rapport Personnel - ${globalYear}`, 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Membre: ${myMembre.prenom} ${myMembre.nom}`, 14, 30);
    doc.text(`Statut: ${status.text}`, 14, 37);
    doc.text(`Total payé en ${globalYear}: ${formatPrice(totalPaid)} FCFA`, 14, 44);
    if (unpaidMonths.length > 0) {
      doc.text(`Mois non payés: ${unpaidMonths.join(', ')}`, 14, 51);
    }

    const tableData = currentYearCotisations.map(c => [
      c.mois,
      formalizeDate(c.createdAt),
      `${c.montant} FCFA`,
      c.mode || '-'
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Mois', 'Date de paiement', 'Montant', 'Mode']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`Rapport_Cotisations_${myMembre.nom}_${globalYear}.pdf`);
  };

  const downloadReceipt = (cot: Cotisation) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150] // Receipt style format
    });
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text("COMMISSION SOCIALE DMN", 40, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Cellule ESP - Dakar, Sénégal", 40, 20, { align: 'center' });
    
    doc.setDrawColor(220);
    doc.line(10, 25, 70, 25);
    
    // Receipt Info
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("REÇU DE COTISATION", 40, 35, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`N°: ${cot.id.substring(0, 8).toUpperCase()}`, 40, 40, { align: 'center' });
    
    // Details
    doc.setFont("helvetica", "normal");
    doc.text("Membre:", 10, 55);
    doc.setFont("helvetica", "bold");
    doc.text(`${myMembre!.prenom} ${myMembre!.nom}`, 35, 55);
    
    doc.setFont("helvetica", "normal");
    doc.text("Mois:", 10, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${cot.mois} ${cot.annee}`, 35, 65);
    
    doc.setFont("helvetica", "normal");
    doc.text("Mode:", 10, 75);
    doc.setFont("helvetica", "bold");
    doc.text(cot.mode, 35, 75);
    
    doc.setFont("helvetica", "normal");
    doc.text("Date:", 10, 85);
    doc.setFont("helvetica", "bold");
    doc.text(formalizeDate(cot.createdAt), 35, 85);
    
    doc.line(10, 95, 70, 95);
    
    // Amount
    doc.setFontSize(14);
    doc.text("MONTANT:", 10, 110);
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text(`${formatPrice(cot.montant)} FCFA`, 40, 125, { align: 'center' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    doc.text("Merci pour votre contribution.", 40, 140, { align: 'center' });
    
    doc.save(`Recu_${cot.mois}_${cot.annee}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Header Mobile avec Statut rapide */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black text-gray-900 tracking-tight leading-tight">
            Bonjour, <span className="text-dmn-green-600">{myMembre.prenom} !</span>
          </h1>
          <p className="text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mt-1 italic">
            Tableau de bord personnel • {globalYear}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
            <UserCheck size={14} className="text-dmn-green-500" /> Profil lié
          </div>
          <button 
            onClick={exportPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-900/10"
          >
            <Download size={16} /> Reçu Annuel
          </button>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {myPendingPayments.length > 0 && (
        <div className="bg-[#1dc6f8]/10 border border-[#1dc6f8]/30 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 animate-in zoom-in-95 duration-500">
          <div className="w-12 h-12 bg-[#1dc6f8] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#1dc6f8]/20">
            <Clock size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-[#1dc6f8] uppercase tracking-[0.2em]">Validation en cours</h4>
            <p className="text-xs text-[#15b2e0] font-black mt-1">
              Vous avez {myPendingPayments.length} signalement{myPendingPayments.length > 1 ? 's' : ''} de paiement en attente de vérification.
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
              {myPendingPayments.map(p => (
                <div key={p.id} className="bg-white/80 px-3 py-1.5 rounded-xl text-[10px] font-black text-gray-700 border border-[#1dc6f8]/10 shadow-sm flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-[#1dc6f8] rounded-full animate-pulse"></div>
                   {formatPrice(p.montantTotal)} FCFA • {p.mode}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {unpaidMonths.length > 0 && (
         <div className="bg-white border-2 border-rose-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-rose-900/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-rose-50/50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                  <AlertTriangle size={20} />
                </div>
                <h4 className="font-heading font-black text-rose-900 uppercase tracking-wider text-xs">Payer mes mois de retard</h4>
              </div>
              <span className="text-[10px] bg-rose-100 text-rose-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                {unpaidMonths.length} Mois impayé{unpaidMonths.length > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {unpaidMonths.map(month => {
                      const amount = defaultPrice; 
                      return (
                        <div key={month} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500 font-black text-xs border border-rose-50 group-hover:scale-110 transition-transform">
                              {month.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{month} {globalYear}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-gray-900">{formatPrice(amount)} FCFA</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Dû</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-4 border-t border-dashed border-gray-200">
                    <div className="flex justify-between items-center px-2">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Total Retard</span>
                        <span className="text-gray-400 text-[9px] font-bold">{unpaidMonths.length} mois impayés</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-heading font-black text-dmn-green-600 leading-tight">👉 {formatPrice(montantRestant)} <span className="text-xs font-medium">FCFA</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute inset-x-0 -bottom-2 h-4 bg-dmn-green-900/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {onDirectPaymentClick ? (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => onDirectPaymentClick('WAVE', montantRestant, unpaidMonths)} 
                        className="w-full bg-[#1dc6f8] hover:bg-[#15b2e0] text-white py-4 sm:py-5 px-6 sm:px-8 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-[#1dc6f8]/30 active:scale-95 group"
                      >
                        <Smartphone size={20} className="sm:w-5 sm:h-5" />
                        <span>Payer avec Wave</span>
                      </button>
                      <button 
                        onClick={() => onDirectPaymentClick('OM', montantRestant, unpaidMonths)} 
                        className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white py-4 sm:py-5 px-6 sm:px-8 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-[#FF6600]/30 active:scale-95 group"
                      >
                        <Smartphone size={20} className="sm:w-5 sm:h-5" />
                        <span>Payer avec Orange Money</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                      <p className="text-xs text-gray-500 font-medium">Contactez un administrateur pour activer le paiement en ligne.</p>
                    </div>
                  )}
                  <p className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 size={12} className="text-dmn-green-500" /> Paiement sécurisé • Mise à jour instantanée
                  </p>
                </div>
              </div>
            </div>
         </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 md:p-2.5 bg-dmn-green-50 rounded-xl">
              <Wallet size={18} className="text-dmn-green-600" />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-black tracking-wider">Total {globalYear}</p>
          </div>
          <p className="text-xl md:text-3xl font-heading font-black text-gray-900">{formatPrice(totalPaid)} <span className="text-sm font-medium text-gray-500">FCFA</span></p>
        </div>

        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 md:p-2.5 ${status.bg} rounded-xl shadow-inner ${status.glow} transition-all group-hover:scale-110`}>
              <StatusIcon size={18} className={status.color} />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-black tracking-wider">Statut</p>
          </div>
          <p className={`text-lg md:text-xl font-heading font-black ${status.color}`}>{status.text}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 md:p-2.5 bg-blue-50 rounded-xl">
              <CalendarDays size={18} className="text-blue-600" />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-black tracking-wider">Mois Payés</p>
          </div>
          <p className="text-xl md:text-3xl font-heading font-black text-gray-900">{currentYearCotisations.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 md:p-2.5 bg-purple-50 rounded-xl">
              <Activity size={18} className="text-purple-600" />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-black tracking-wider">Moyen Favori</p>
          </div>
          <p className="text-lg md:text-xl font-heading font-black text-gray-900">{modePaiementFrequents}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historique Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-dmn-green-500" /> Historique des Paiements ({globalYear})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead className="bg-white text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-left">Mois</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Montant</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentYearCotisations.length > 0 ? currentYearCotisations.sort((a,b)=>MOIS.indexOf(a.mois)-MOIS.indexOf(b.mois)).map(cot => (
                  <tr key={cot.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-left font-bold text-gray-900">{cot.mois}</td>
                    <td className="px-6 py-4 text-gray-500">{formalizeDate(cot.createdAt)}</td>
                    <td className="px-6 py-4 text-right font-black text-dmn-green-600">
                      <div className="flex flex-col items-end">
                        <span>{formatPrice(cot.montant)} FCFA</span>
                        {cot.mode === 'WAVE' && (
                          <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter mt-1 flex items-center gap-1">
                            <CheckCircle2 size={8} /> Payé via Wave
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          cot.mode === 'WAVE' ? 'bg-[#1dc6f8]/10 text-[#1dc6f8]' : 
                          cot.mode === 'OM' ? 'bg-orange-50 text-orange-600' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {cot.mode}
                        </span>
                        <button 
                          onClick={() => downloadReceipt(cot)}
                          className="p-1.5 bg-gray-50 text-gray-400 hover:text-dmn-green-600 hover:bg-dmn-green-50 rounded-lg transition-colors group"
                          title="Télécharger le reçu"
                        >
                          <Printer size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-medium">
                      Aucune cotisation trouvée pour cette année.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-dmn-green-500" /> Régularité ({globalYear})
          </h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="montant" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
             <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-500 font-medium">Total cumulatif payé global</span>
                <span className="font-black text-gray-900">{formatPrice(allTimeTotalPaid)} FCFA</span>
             </div>
             <p className="text-[10px] text-gray-400 flex items-center gap-1"><Info size={12}/> Depuis votre inscription</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
