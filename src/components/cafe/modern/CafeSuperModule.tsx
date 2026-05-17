import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CafeProduction, CafeVente, CafeDepense, CafeTransfert, ModePaiement,
  CafeSeller, CafeOrder, CafeDistribution, CafeVersement,
  CafePriceConfig, AppUser, CafeClient, UserRole
} from '../../../types';
import { db, auth } from '../../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DashboardOverview } from './DashboardOverview';
import { ProductionManager } from './ProductionManager';
import { SalesManager } from './SalesManager';
import { ExpensesManager } from './ExpensesManager';
import { ResellerManager } from './ResellerManager';
import { CafeReportManager } from './CafeReportManager';
import { ResellerDashboard } from './ResellerDashboard';
import { BilanManager } from './BilanManager';
import { useCafeFinance } from './useCafeFinance';
import { 
  BarChart3, Box, ShoppingCart, Users, Receipt, 
  Settings, Download, TrendingUp 
} from 'lucide-react';
import { MOIS } from '../../../data';
import { PricesSettingsModal } from './modals/PricesSettingsModal';

export interface CafeModuleProps {
  productions: CafeProduction[];
  ventes: CafeVente[];
  depenses: CafeDepense[];
  transferts: CafeTransfert[];
  distributions: CafeDistribution[];
  versements: CafeVersement[];
  sellers: CafeSeller[];
  clients: CafeClient[];
  priceConfig: CafePriceConfig | null;
  userRole: UserRole | null;
  globalYear: number;
  globalMonth: string | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onTransferToCaisse?: (amount: number) => void;
  confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

type TabType = 'dashboard' | 'production' | 'ventes' | 'revendeurs' | 'depenses' | 'bilans' | 'rapports';

export function CafeSuperModule(props: CafeModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Period Filtering States
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(props.globalMonth || MOIS[new Date().getMonth()]);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState<number>(props.globalYear);

  // Filter Data based on selected period
  const filteredProductions = useMemo(() => {
    return props.productions.filter(p => {
      const d = new Date(p.date);
      if (d.getFullYear() !== selectedYear) return false;
      if (periodType === 'year') return true;
      if (periodType === 'month') return MOIS[d.getMonth()] === selectedMonth;
      if (periodType === 'quarter') return Math.floor(d.getMonth() / 3) + 1 === selectedQuarter;
      return true;
    });
  }, [props.productions, periodType, selectedMonth, selectedQuarter, selectedYear]);

  const filteredVentes = useMemo(() => {
    return props.ventes.filter(v => {
      const d = new Date(v.date);
      if (d.getFullYear() !== selectedYear) return false;
      if (periodType === 'year') return true;
      if (periodType === 'month') return MOIS[d.getMonth()] === selectedMonth;
      if (periodType === 'quarter') return Math.floor(d.getMonth() / 3) + 1 === selectedQuarter;
      return true;
    });
  }, [props.ventes, periodType, selectedMonth, selectedQuarter, selectedYear]);

  const filteredDepenses = useMemo(() => {
    return props.depenses.filter(e => {
      const d = new Date(e.date);
      if (d.getFullYear() !== selectedYear) return false;
      if (periodType === 'year') return true;
      if (periodType === 'month') return MOIS[d.getMonth()] === selectedMonth;
      if (periodType === 'quarter') return Math.floor(d.getMonth() / 3) + 1 === selectedQuarter;
      return true;
    });
  }, [props.depenses, periodType, selectedMonth, selectedQuarter, selectedYear]);

  const periodString = useMemo(() => {
    if (periodType === 'year') return `Année ${selectedYear}`;
    if (periodType === 'quarter') return `Trimestre ${selectedQuarter} - ${selectedYear}`;
    return `${selectedMonth} ${selectedYear}`;
  }, [periodType, selectedMonth, selectedQuarter, selectedYear]);

  const isAdmin = props.userRole === 'admin';
  const isCafeManager = props.userRole === 'cafe';
  
  const isRevendeur = useMemo(() => {
    if (isAdmin || isCafeManager) return false;
    if (props.userRole === 'revendeur') return true;
    const userEmail = auth.currentUser?.email?.toLowerCase().trim();
    return props.sellers.some(s => 
      s.active && (
        (s.email && s.email.toLowerCase().trim() === userEmail) || 
        (s.codeAcces && s.codeAcces === auth.currentUser?.uid)
      )
    );
  }, [props.sellers, props.userRole, isAdmin, isCafeManager]);

  const currentSeller = useMemo(() => {
    if (!isRevendeur) return null;
    const userEmail = auth.currentUser?.email?.toLowerCase().trim();
    return props.sellers.find(s => 
      s.active && (
        (s.email && s.email.toLowerCase().trim() === userEmail) || 
        (s.codeAcces && s.codeAcces === auth.currentUser?.uid)
      )
    );
  }, [isRevendeur, props.sellers]);

  const finance = useCafeFinance(
    filteredProductions, 
    filteredVentes, 
    filteredDepenses, 
    props.versements,
    props.priceConfig, 
    periodType === 'month' ? selectedMonth : null, 
    selectedYear
  );

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'production', label: 'Production', icon: Box },
      { id: 'ventes', label: 'Ventes', icon: ShoppingCart },
      { id: 'revendeurs', label: 'Revendeurs', icon: Users },
      { id: 'depenses', label: 'Dépenses', icon: Receipt },
      { id: 'bilans', label: 'Bilans', icon: TrendingUp },
      { id: 'rapports', label: 'Rapports', icon: Download },
    ];

    if (isRevendeur) return allTabs.filter(t => ['dashboard', 'ventes'].includes(t.id));
    if (props.userRole === 'lecteur') return allTabs.filter(t => ['dashboard', 'bilans', 'rapports'].includes(t.id));
    
    return allTabs;
  }, [isRevendeur, props.userRole]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 pt-4 sm:pt-8 px-4 sm:px-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-3xl shadow-premium border border-gray-100 flex items-center justify-center text-dmn-green-900 overflow-hidden relative group shrink-0">
              <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp size={24} className="relative z-10 sm:hidden" strokeWidth={2.5} />
              <TrendingUp size={32} className="relative z-10 hidden sm:block" strokeWidth={2.5} />
            </div>
        <div className="min-w-0 flex-1">
              <h1 className="fintech-heading text-xl sm:text-5xl tracking-tighter truncate uppercase">Café <span className="text-dmn-gold">Noreyni</span></h1>
              <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-[0.2em] mt-0.5 sm:mt-1">
                <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-dmn-green-500 shrink-0 animate-pulse" />
                <span className="truncate">{periodString}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Global Search & Filters */}
        <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl sm:rounded-2xl ring-1 ring-gray-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['month', 'quarter', 'year'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${periodType === type ? 'bg-white text-dmn-green-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {type === 'month' ? 'Mois' : type === 'quarter' ? 'Trim.' : 'Annuel'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
            {periodType === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:flex-none h-[42px] sm:h-[50px] px-3 sm:px-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-dmn-gold/30 shadow-sm appearance-none whitespace-nowrap"
              >
                {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}

            {periodType === 'quarter' && (
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                className="flex-1 sm:flex-none h-[42px] sm:h-[50px] px-3 sm:px-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-dmn-gold/30 shadow-sm appearance-none whitespace-nowrap"
              >
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>T{q}</option>)}
              </select>
            )}

            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 sm:flex-none h-[42px] sm:h-[50px] px-3 sm:px-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-dmn-gold/30 shadow-sm appearance-none whitespace-nowrap"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            
            {(isAdmin || isCafeManager) && (
              <button 
                onClick={() => setShowSettings(true)}
                className="btn-primary h-[42px] sm:h-[50px] px-4 sm:px-6 flex items-center justify-center gap-2 shrink-0"
                title="Configuration des Prix"
              >
                <Settings size={16} className="text-dmn-gold" strokeWidth={3} />
                <span className="text-xs uppercase tracking-tighter hidden sm:inline">Prix</span>
              </button>
            )}
          </div>

          <div className="relative group w-full md:w-64">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-input pl-10 sm:pl-12 h-[42px] sm:h-[50px] shadow-soft focus:shadow-premium text-xs"
            />
            <BarChart3 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-dmn-green-600 transition-colors sm:hidden" />
            <BarChart3 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-dmn-green-600 transition-colors hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="sticky top-2 sm:top-4 z-50 print:hidden px-4 sm:px-0">
        <div className="glass p-1.5 sm:p-2 rounded-2xl sm:rounded-[2rem] flex overflow-x-auto no-scrollbar gap-1 ring-4 sm:ring-8 ring-gray-900/5 shadow-xl sm:shadow-2xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-500 whitespace-nowrap active:scale-95
                  ${isActive 
                    ? 'bg-dmn-green-900 text-white shadow-lg sm:shadow-xl shadow-dmn-green-900/20' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon size={14} strokeWidth={isActive ? 3 : 2} className={`${isActive ? "text-dmn-gold" : ""} sm:hidden`} />
                <Icon size={18} strokeWidth={isActive ? 3 : 2} className={`${isActive ? "text-dmn-gold" : ""} hidden sm:block`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, scale: 0.99, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-[600px] px-4 sm:px-0"
      >
        {activeTab === 'dashboard' && (
          isRevendeur && currentSeller ? (
            <ResellerDashboard 
              seller={currentSeller}
              distributions={props.distributions}
              versements={props.versements}
              globalYear={props.globalYear}
              globalMonth={props.globalMonth}
            />
          ) : (
            <DashboardOverview finance={finance} periodString={periodString} />
          )
        )}
        {activeTab === 'production' && (
          <ProductionManager 
            productions={filteredProductions.filter(p => p.observations?.toLowerCase().includes(searchTerm.toLowerCase()) || p.quantite.toString().includes(searchTerm))} 
            depenses={filteredDepenses} 
            finance={finance} 
            userRole={props.userRole} 
            isAdmin={isAdmin} 
            isCafeManager={isCafeManager} 
            userId={auth.currentUser?.uid || ''}
            showToast={props.showToast}
            confirmAction={props.confirmAction}
          />
        )}
        {activeTab === 'ventes' && (
          <SalesManager 
            ventes={isRevendeur ? filteredVentes.filter(v => v.vendeurId === currentSeller?.id) : filteredVentes.filter(v => v.format?.toLowerCase().includes(searchTerm.toLowerCase()) || v.prixUnitaire.toString().includes(searchTerm) || v.total.toString().includes(searchTerm))} 
            finance={finance} 
            userRole={props.userRole} 
            priceConfig={props.priceConfig}
            sellers={props.sellers}
            clients={props.clients}
            userId={auth.currentUser?.uid || ''}
            currentSellerId={currentSeller?.id}
            showToast={props.showToast}
            confirmAction={props.confirmAction}
          />
        )}
        {activeTab === 'revendeurs' && (
          <ResellerManager 
            sellers={props.sellers.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.nom?.toLowerCase().includes(searchTerm.toLowerCase()))}
            distributions={props.distributions}
            versements={props.versements}
            userRole={props.userRole}
            isAdmin={isAdmin}
            isCafeManager={isCafeManager}
            userId={auth.currentUser?.uid || ''}
            priceConfig={props.priceConfig}
            showToast={props.showToast}
            confirmAction={props.confirmAction}
          />
        )}
        {activeTab === 'depenses' && (
          <ExpensesManager 
            depenses={filteredDepenses.filter(d => d.motif?.toLowerCase().includes(searchTerm.toLowerCase()) || d.categorie?.toLowerCase().includes(searchTerm.toLowerCase()))}
            finance={finance}
            userRole={props.userRole}
            isAdmin={isAdmin}
            isCafeManager={isCafeManager}
            userId={auth.currentUser?.uid || ''}
            showToast={props.showToast}
            confirmAction={props.confirmAction}
          />
        )}
        {activeTab === 'bilans' && (
          <BilanManager 
            productions={filteredProductions}
            ventes={filteredVentes}
            depenses={filteredDepenses}
            finance={finance}
            periodString={periodString}
          />
        )}
        {activeTab === 'rapports' && (
          <CafeReportManager 
            productions={filteredProductions}
            ventes={filteredVentes}
            depenses={filteredDepenses}
            finance={finance}
            periodString={periodString}
          />
        )}
      </motion.div>

      <PricesSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        priceConfig={props.priceConfig}
        onSuccess={() => {
           props.showToast("Prix mis à jour avec succès !", "success");
           // Normally we'd refresh, but Firebase should sync
        }}
      />
    </div>
  );
}
