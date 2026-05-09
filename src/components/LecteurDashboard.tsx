import React, { useMemo, useState } from 'react';
import { Membre, Cotisation } from '../types';
import { 
  CheckCircle2, XCircle, AlertTriangle, Wallet, Calendar, CalendarDays, 
  TrendingUp, Download, PieChart as PieChartIcon, Activity, Printer, Info, UserCheck, Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formalizeDate } from '../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface LecteurDashboardProps {
  myMembre: Membre | null;
  membres: Membre[];
  currentUser: FirebaseUser | null;
  cotisations: Cotisation[];
  globalYear: number;
  MOIS: string[];
}

export const LecteurDashboard: React.FC<LecteurDashboardProps> = ({ myMembre, membres, currentUser, cotisations, globalYear, MOIS }) => {
  const [selectedYear, setSelectedYear] = useState(globalYear);
  const [linkingMembreId, setLinkingMembreId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

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
    const unlinkedMembres = membres.filter(m => !m.email && !m.telephone);
    
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Choisir mon profil</label>
              <select 
                value={linkingMembreId} 
                onChange={(e) => setLinkingMembreId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              >
                <option value="">-- Sélectionnez votre profil --</option>
                {unlinkedMembres.map(m => (
                  <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                ))}
              </select>
            </div>
            
            {linkError && <p className="text-red-500 text-sm font-semibold text-center">{linkError}</p>}
            
            <button
              onClick={handleLinkProfile}
              disabled={isLinking || !linkingMembreId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
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

  const myCotisations = useMemo(() => cotisations.filter(c => c.mId === myMembre.id && c.montant > 0), [cotisations, myMembre.id]);
  const currentYearCotisations = useMemo(() => myCotisations.filter(c => c.annee === selectedYear), [myCotisations, selectedYear]);

  // Statut
  const startMonthIndex = (myMembre.anneeIntegration === selectedYear && myMembre.moisIntegration) ? MOIS.indexOf(myMembre.moisIntegration) : (myMembre.anneeIntegration && myMembre.anneeIntegration > selectedYear ? 12 : 0);
  const currentMonthIndex = selectedYear === new Date().getFullYear() ? new Date().getMonth() : 11;
  
  const unpaidMonths = [];
  for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
    const month = MOIS[i];
    if (!currentYearCotisations.some(c => c.mois === month)) {
      unpaidMonths.push(month);
    }
  }

  const totalPaid = currentYearCotisations.reduce((acc, c) => acc + c.montant, 0);
  const allTimeTotalPaid = myCotisations.reduce((acc, c) => acc + c.montant, 0);
  const montantRestant = unpaidMonths.length * 500; // assuming 500 FCFA

  const isEnRetard = unpaidMonths.length > 0;
  const isRetardLeger = unpaidMonths.length === 1;

  const getStatusDisplay = () => {
    if (!isEnRetard) return { icon: CheckCircle2, text: 'À jour', color: 'text-green-600', bg: 'bg-green-100' };
    if (isRetardLeger) return { icon: AlertTriangle, text: 'Retard léger', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { icon: XCircle, text: 'En retard', color: 'text-red-600', bg: 'bg-red-100' };
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
    doc.text(`Rapport Personnel - ${selectedYear}`, 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Membre: ${myMembre.prenom} ${myMembre.nom}`, 14, 30);
    doc.text(`Statut: ${status.text}`, 14, 37);
    doc.text(`Total payé en ${selectedYear}: ${totalPaid.toLocaleString()} FCFA`, 14, 44);
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

    doc.save(`Rapport_Cotisations_${myMembre.nom}_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black text-gray-900">
            Espace Personnel
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <span className="font-semibold text-dmn-green-600">{myMembre.prenom} {myMembre.nom}</span>
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full uppercase font-bold text-gray-600">Mode Lecture Seule</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-dmn-green-500 outline-none transition-all shadow-sm"
          >
            {[...new Set([globalYear, ...cotisations.map(c => c.annee)])].sort((a,b)=>b-a).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            onClick={exportPDF}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <Download size={16} /> Exporter
          </button>
        </div>
      </div>

      {unpaidMonths.length > 0 && (
         <div className="bg-red-50 border border-red-100 p-4 md:p-5 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="p-2 bg-white rounded-full shrink-0 shadow-sm">
                <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div>
                <h4 className="font-bold text-red-800 text-sm md:text-base">Rappel de cotisation</h4>
                <p className="text-red-600 text-xs md:text-sm mt-1">
                    Vous avez {unpaidMonths.length} mois de retard ({unpaidMonths.join(', ')}). 
                    Montant restant estimé : <strong className="font-black">{montantRestant} FCFA</strong>.
                </p>
            </div>
         </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 md:p-2.5 bg-dmn-green-50 rounded-xl">
              <Wallet size={18} className="text-dmn-green-600" />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-black tracking-wider">Total {selectedYear}</p>
          </div>
          <p className="text-xl md:text-3xl font-heading font-black text-gray-900">{totalPaid.toLocaleString()} <span className="text-sm font-medium text-gray-500">FCFA</span></p>
        </div>

        <div className="bg-white p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 md:p-2.5 ${status.bg} rounded-xl`}>
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
              <Calendar size={18} className="text-dmn-green-500" /> Historique des Paiements ({selectedYear})
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
                    <td className="px-6 py-4 text-right font-black text-dmn-green-600">{cot.montant.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                        {cot.mode}
                      </span>
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
            <TrendingUp size={18} className="text-dmn-green-500" /> Régularité ({selectedYear})
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
                <span className="font-black text-gray-900">{allTimeTotalPaid.toLocaleString()} FCFA</span>
             </div>
             <p className="text-[10px] text-gray-400 flex items-center gap-1"><Info size={12}/> Depuis votre inscription</p>
          </div>
        </div>
      </div>
    </div>
  );
};
