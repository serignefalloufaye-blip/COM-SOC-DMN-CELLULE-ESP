import React from 'react';
import { CreditCard, Plus, Users, Printer, Search, Edit3, Trash2, TrendingDown, TrendingUp, Banknote, Smartphone, CheckCircle2 } from 'lucide-react';
import { Membre, Cotisation, Recette, Depense, Dette, PaiementAttente } from '../types';
import { MOIS } from '../data';
import { formatPrice } from '../utils/format';


// --- VALIDATIONS TABLE ---
interface ValidationsTableProps {
  paiementsAttente: PaiementAttente[];
  handleValidate: (pp: PaiementAttente, decision: 'VALIDE' | 'REJETE') => Promise<void>;
  isAdmin: boolean;
  isCaisse: boolean;
}

export const ValidationsTable: React.FC<ValidationsTableProps> = ({
  paiementsAttente, handleValidate, isAdmin, isCaisse
}) => {
  const pending = paiementsAttente.filter(p => p.statut === 'EN_ATTENTE');
  const history = paiementsAttente.filter(p => p.statut !== 'EN_ATTENTE').sort((a, b) => (b.dateValidation || 0) - (a.dateValidation || 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Liste des paiements en attente */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
          <span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-dmn-gold-light" /> Paiements à Valider</span>
        </div>
        <div className="overflow-x-auto">
          {pending.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-medium italic">Aucun paiement en attente de validation.</div>
          ) : (
            <table className="w-full text-sm text-center">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-left">Membre</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase">Mois</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase">Montant Total</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase">Mode / Réf</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase">Date</th>
                  {(isAdmin || isCaisse) && <th className="px-6 py-4 font-semibold text-xs uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-left font-bold text-gray-900">{p.membreNomComplet}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {p.mois.map(m => <span key={m} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black">{m}</span>)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-dmn-green-600">{formatPrice(p.montantTotal)} F</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${p.mode === 'WAVE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.mode}</span>
                        {p.reference && <span className="text-[10px] text-gray-400 font-mono mt-1">{p.reference}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">{new Date(p.dateSignalee).toLocaleString()}</td>
                    {(isAdmin || isCaisse) && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleValidate(p, 'VALIDE')} className="bg-dmn-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-sm active:scale-95">Valider</button>
                          <button onClick={() => handleValidate(p, 'REJETE')} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase border border-red-100 active:scale-95">Rejeter</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Historiques des validations */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden opacity-80">
          <div className="bg-gray-100 text-gray-700 px-6 py-4 font-heading font-semibold text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">Historique des Validations</span>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
             <table className="w-full text-xs text-center">
                <thead className="bg-gray-50 text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase text-left">Membre</th>
                    <th className="px-4 py-3 font-bold uppercase">Mois / Montant</th>
                    <th className="px-4 py-3 font-bold uppercase">Statut</th>
                    <th className="px-4 py-3 font-bold uppercase">Date Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-left font-bold text-gray-700">{p.membreNomComplet}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{formatPrice(p.montantTotal)} F</p>
                        <p className="text-[9px] text-gray-400">{p.mois.join(', ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.statut === 'VALIDE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-medium italic">
                        {p.dateValidation ? new Date(p.dateValidation).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};


// --- COTISATIONS TABLE ---
interface CotisationsTableProps {
  membres: Membre[];
  cotisations: Cotisation[];
  globalYear: number;
  fMois: string;
  setFMois: (m: string) => void;
  fMode: string;
  setFMode: (m: string) => void;
  searchCot: string;
  setSearchCot: (s: string) => void;
  debouncedSearchCot: string;
  isAdmin: boolean;
  isCaisse: boolean;
  openAddCot: (mId?: string, mois?: string, annee?: number) => void;
  setEditingCot: (c: Cotisation) => void;
  setIsCotModalOpen: (open: boolean) => void;
  handleDeleteCotisation: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success'|'error') => void;
  nomComplet: (m: Membre | undefined) => string;
  getMembre: (id: string) => Membre | undefined;
}

export const CotisationsTable: React.FC<CotisationsTableProps> = ({
  membres,
  cotisations,
  globalYear,
  fMois,
  setFMois,
  fMode,
  setFMode,
  searchCot,
  setSearchCot,
  debouncedSearchCot,
  isAdmin,
  isCaisse,
  openAddCot,
  setEditingCot,
  setIsCotModalOpen,
  handleDeleteCotisation,
  showToast,
  nomComplet,
  getMembre
}) => {
  const shareWhatsAppSituation = () => {
    const today = new Date();
    const monthToShare = fMois || MOIS[today.getMonth()];
    const paidInfos = membres
      .map(m => {
        const cot = cotisations.find(c => c.mId === m.id && c.mois?.toUpperCase() === monthToShare?.toUpperCase() && Number(c.annee) === globalYear && c.montant > 0);
        return cot ? { member: m, cotisation: cot } : null;
      })
      .filter((info): info is { member: Membre; cotisation: Cotisation } => info !== null)
      .sort((a, b) => (a.cotisation.createdAt || 0) - (b.cotisation.createdAt || 0));

    let message = `*📊 SITUATION MENSUELLE - ${monthToShare.toUpperCase()} ${globalYear}*\n\n`;
    message += `Assalamou halaykoum Mbokkou talibé,\n\nVoici la liste des membres qui ont déjà déposé leur participation pour le compte de ce mois :\n\n`;
    if (paidInfos.length > 0) {
      paidInfos.forEach((info, index) => { message += `${index + 1}. ${info.member.prenom} ${info.member.nom} ✅\n`; });
      message += `\n`;
    } else {
      message += `Aucune cotisation n'a été enregistrée pour le moment.\n\n`;
    }
    const pct = membres.length > 0 ? Math.round((paidInfos.length / membres.length) * 100) : 0;
    message += `*📈 Statistiques*\nParticipations : ${paidInfos.length} / ${membres.length} (${pct}%)\n\nJazakoumoullahou khayran. 🙏`;

    navigator.clipboard.writeText(message).then(() => {
      showToast('Situation prête !', 'success');
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }).catch(() => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    });
  };

  const filtered = cotisations.filter(c => {
    const m = getMembre(c.mId);
    return c.annee === globalYear &&
           (!fMois || c.mois?.toUpperCase() === fMois?.toUpperCase()) && 
           (!fMode || c.mode === fMode) && 
           (!debouncedSearchCot || nomComplet(m).toLowerCase().includes(debouncedSearchCot.toLowerCase()));
  });

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span className="flex items-center gap-2"><CreditCard size={18} className="text-dmn-gold-light" /> Cotisations ({globalYear})</span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={shareWhatsAppSituation} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2">
            <Users size={16} /> <span className="hidden sm:inline">Situation</span>
          </button>
          {(isAdmin || isCaisse) && (
            <button onClick={() => openAddCot(undefined, undefined, globalYear)} className="flex-1 sm:flex-none h-10 px-5 bg-dmn-green-600 text-white rounded-xl hover:bg-dmn-green-700 flex items-center justify-center gap-2 text-sm font-bold shadow-soft transition-all">
              <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>
      </div>
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center">
        <select value={fMois} onChange={e => setFMois(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium bg-white shadow-sm flex-1 sm:flex-none outline-none">
          <option value="">Tous les mois</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fMode} onChange={e => setFMode(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium bg-white shadow-sm flex-1 sm:flex-none outline-none">
          <option value="">Tous modes</option>
          <option value="WAVE">WAVE</option>
          <option value="OM">OM</option>
          <option value="ESPÈCES">ESPÈCES</option>
        </select>
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Membre..." 
            value={searchCot}
            onChange={e => setSearchCot(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none shadow-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-left">Membre</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Mois</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Montant</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Mode</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Date</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Statut</th>
              {(isAdmin || isCaisse) && <th className="px-6 py-4 font-semibold text-xs uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(c => {
                  const m = getMembre(c.mId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-left font-semibold text-gray-900">{nomComplet(m)}</td>
                      <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{c.mois}</span></td>
                      <td className="px-6 py-4 font-bold text-dmn-green-700">{formatPrice(c.montant)} F</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                          c.mode === 'WAVE' ? 'bg-blue-100 text-blue-700' : 
                          c.mode === 'OM' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>{c.mode}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{new Date(c.datePaiement).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4"><span className="text-dmn-green-600 font-bold flex items-center justify-center gap-1"><CheckCircle2 size={12}/> Confirmé</span></td>
                      {(isAdmin || isCaisse) && (
                        <td className="px-6 py-4 flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingCot(c); setIsCotModalOpen(true); }} className="p-2 hover:bg-dmn-green-50 text-dmn-green-600 rounded-lg"><Edit3 size={16}/></button>
                          <button onClick={() => handleDeleteCotisation(c.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- RECETTES TABLE ---
interface RecettesTableProps {
  recettes: Recette[];
  globalYear: number;
  fMois: string;
  setFMois: (m: string) => void;
  isAdmin: boolean;
  isCaisse: boolean;
  setEditingRecette: (r: Partial<Recette>) => void;
  setIsRecetteModalOpen: (open: boolean) => void;
  handleDeleteRecette: (id: string) => Promise<void>;
}

export const RecettesTable: React.FC<RecettesTableProps> = ({
  recettes, globalYear, fMois, setFMois, isAdmin, isCaisse, setEditingRecette, setIsRecetteModalOpen, handleDeleteRecette
}) => {
  const filtered = recettes.filter(r => r.annee === globalYear && (!fMois || r.mois?.toUpperCase() === fMois?.toUpperCase()));
  const total = filtered.reduce((acc, r) => acc + r.montant, 0);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
        <span className="flex items-center gap-2"><TrendingUp size={18} className="text-dmn-gold-light" /> Recettes Diverses ({globalYear})</span>
        {(isAdmin || isCaisse) && (
          <button onClick={() => { setEditingRecette({}); setIsRecetteModalOpen(true); }} className="h-8 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 text-[10px] font-black uppercase">
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <select value={fMois} onChange={e => setFMois(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium bg-white shadow-sm outline-none">
          <option value="">Tous les mois</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase">Total Période</p>
          <p className="text-lg font-black text-dmn-green-700">{formatPrice(total)} F</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-left">Libellé</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Mois</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Montant</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-left font-bold text-gray-900">{r.motif}</td>
                <td className="px-6 py-4 font-black uppercase text-[10px] text-gray-500">{r.mois}</td>
                <td className="px-6 py-4 font-black text-dmn-green-600">{formatPrice(r.montant)} F</td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  {(isAdmin || isCaisse) && (
                    <>
                      <button onClick={() => { setEditingRecette(r); setIsRecetteModalOpen(true); }} className="p-2 text-dmn-green-600"><Edit3 size={16}/></button>
                      <button onClick={() => handleDeleteRecette(r.id)} className="p-2 text-red-600"><Trash2 size={16}/></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- DEPENSES TABLE ---
interface DepensesTableProps {
  depenses: Depense[];
  globalYear: number;
  fMois: string;
  setFMois: (m: string) => void;
  isAdmin: boolean;
  isCaisse: boolean;
  setEditingDep: (d: Partial<Depense>) => void;
  setIsDepModalOpen: (open: boolean) => void;
  handleDeleteDepense: (id: string) => Promise<void>;
}

export const DepensesTable: React.FC<DepensesTableProps> = ({
  depenses, globalYear, fMois, setFMois, isAdmin, isCaisse, setEditingDep, setIsDepModalOpen, handleDeleteDepense
}) => {
  const filtered = depenses.filter(d => d.annee === globalYear && (!fMois || d.mois?.toUpperCase() === fMois?.toUpperCase()));
  const total = filtered.reduce((acc, d) => acc + d.montant, 0);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
        <span className="flex items-center gap-2"><TrendingDown size={18} className="text-dmn-gold-light" /> Dépenses ({globalYear})</span>
        {(isAdmin || isCaisse) && (
          <button onClick={() => { setEditingDep({}); setIsDepModalOpen(true); }} className="h-8 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 text-[10px] font-black uppercase">
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <select value={fMois} onChange={e => setFMois(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium bg-white shadow-sm outline-none">
          <option value="">Tous les mois</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase">Total Période</p>
          <p className="text-lg font-black text-red-600">{formatPrice(total)} F</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-left">Événement</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Mois</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Montant</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-left font-bold text-gray-900">{d.evenement}</td>
                <td className="px-6 py-4 font-black uppercase text-[10px] text-gray-500">{d.mois}</td>
                <td className="px-6 py-4 font-black text-red-600">{formatPrice(d.montant)} F</td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  {(isAdmin || isCaisse) && (
                    <>
                      <button onClick={() => { setEditingDep(d); setIsDepModalOpen(true); }} className="p-2 text-dmn-green-600"><Edit3 size={16}/></button>
                      <button onClick={() => handleDeleteDepense(d.id)} className="p-2 text-red-600"><Trash2 size={16}/></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- DETTES TABLE ---
interface DettesTableProps {
  dettes: Dette[];
  globalYear: number;
  isAdmin: boolean;
  isCaisse: boolean;
  setEditingDette: (d: Partial<Dette>) => void;
  setIsDetteModalOpen: (open: boolean) => void;
  handleDeleteDette: (id: string) => Promise<void>;
  handlePayDette: (d: Dette) => Promise<void>;
}

export const DettesTable: React.FC<DettesTableProps> = ({
  dettes, globalYear, isAdmin, isCaisse, setEditingDette, setIsDetteModalOpen, handleDeleteDette, handlePayDette
}) => {
  const filtered = dettes.filter(d => d.annee === globalYear);
  const total = filtered.filter(d => !d.estPayee).reduce((acc, d) => acc + d.montant, 0);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-dmn-green-900 text-white px-6 py-4 font-heading font-semibold text-base flex justify-between items-center">
        <span className="flex items-center gap-2"><Banknote size={18} className="text-dmn-gold-light" /> Registre des Dettes ({globalYear})</span>
        {(isAdmin || isCaisse) && (
          <button onClick={() => { setEditingDette({}); setIsDetteModalOpen(true); }} className="h-8 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 text-[10px] font-black uppercase">
            <Plus size={14} /> Engager Dette
          </button>
        )}
      </div>
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 text-right">
        <p className="text-[10px] font-black text-gray-400 uppercase">Restant à Payer</p>
        <p className="text-lg font-black text-red-600">{formatPrice(total)} F</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-left">Motif</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Date d'Engagement</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Montant</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase">Statut</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-left font-bold text-gray-900">{d.motif}</td>
                <td className="px-6 py-4 font-medium text-gray-500">{new Date(d.dateEngagement).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-black text-gray-900">{formatPrice(d.montant)} F</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${d.estPayee ? 'bg-dmn-green-100 text-dmn-green-700' : 'bg-red-100 text-red-700'}`}>
                    {d.estPayee ? 'Réglée' : 'Dûe'}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  {(isAdmin || isCaisse) && (
                    <>
                      {!d.estPayee && <button onClick={() => handlePayDette(d)} className="bg-dmn-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase">Payer</button>}
                      <button onClick={() => { setEditingDette(d); setIsDetteModalOpen(true); }} className="p-2 text-dmn-green-600"><Edit3 size={16}/></button>
                      <button onClick={() => handleDeleteDette(d.id)} className="p-2 text-red-600"><Trash2 size={16}/></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
