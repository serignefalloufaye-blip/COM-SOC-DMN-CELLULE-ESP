export interface Membre {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  userId?: string;
  statut?: 'Boursier' | 'Non Boursier' | 'Professionnel' | 'Autre';
  moisIntegration?: string;
  anneeIntegration?: number;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export type ModePaiement = 'WAVE' | 'OM' | 'ESPÈCES';

export interface Cotisation {
  id: string;
  mId: string;
  mois: string;
  annee: number;
  montant: number;
  mode: ModePaiement;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface Depense {
  id: string;
  evenement: string;
  montant: number;
  mois: string;
  annee: number;
  date: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface Recette {
  id: string;
  motif: string;
  montant: number;
  mois: string;
  annee: number;
  date: string;
  mode: ModePaiement;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface Dette {
  id: string;
  motif: string;
  montant: number;
  mois: string;
  annee: number;
  date: string;
  estPayee: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface PaiementAttente {
  id: string;
  mId: string;
  membreNomComplet: string;
  mois: string[];
  annee: number;
  montantTotal: number;
  mode: ModePaiement;
  reference?: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  dateSignalee: number;
  dateValidation?: number;
  validePar?: string;
  createdBy?: string;
}

export type UserRole = 'admin' | 'caisse' | 'tickets' | 'cafe' | 'revendeur' | 'lecteur';

export interface CafeVersement {
  id: string;
  vendeurId?: string;
  sellerId?: string;
  date: number;
  montant: number;
  mode: 'WAVE' | 'OM' | 'ESPÈCES' | string;
  responsable?: string;
  createdAt: number;
}
export interface CafeClient {
  id: string;
  name: string;
}
export interface CafeOrder {
  id: string;
}

export interface AppUser {
  uid: string;
  email: string;
  nom: string;
  role: UserRole;
  createdAt?: number;
}

export interface AppSettings {
  logoUrl?: string;
  prices: {
    default: number;
    conjoint: number;
    [key: string]: number;
  };
  wave_merchant_url?: string;
  lastUpdated: number;
}

export interface TicketCollecte {
  id: string;
  mId: string;
  mois: string;
  annee: number;
  type: 'argent' | 'tickets';
  montantArgent?: number;
  petitDej: number;
  repas: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface TicketConversion {
  id: string;
  montant: number;
  petitDej: number;
  repas: number;
  createdAt?: number;
}

export interface TicketDistribution {
  id: string;
  mId?: string;
  petitDej: number;
  repas: number;
  mois: string;
  annee: number;
  createdAt?: number;
}

export interface ChargeProduction {
  id: string;
  nature: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface CafeProduction {
  id: string;
  date: number;
  quantite: number; // kg
  coutTotal: number;
  charges?: ChargeProduction[];
  // Legacy fields below:
  coutUnitaire?: number;
  typeCafe?: '1kg' | '500g' | string;
  total?: number;
  responsable?: string;
  observations?: string;
  createdAt?: number;
}

export interface CafeVente {
  id: string;
  date: number;
  format: '1kg' | '500g' | string; // Use 'format' for consistency in modern code
  type?: 'normale' | 'revendeur'; // 'normale' = direct, 'revendeur' = via seller
  quantite: number;
  prixUnitaire: number;
  total: number;
  vendeurId?: string;
  clientId?: string;
  mode?: ModePaiement;
  responsable?: string;
  createdAt?: number;
  // Legacy fields:
  typeCafe?: string;
  typeVente?: string;
}

export interface CafeDistribution {
  id: string;
  date: number;
  sellerId: string;
  format: '1kg' | '500g' | string;
  quantite: number;
  prixVenteUnitaire?: number; // The price at which the seller should sell
  commissionUnitaire?: number; // The commission per item
  status?: 'en_cours' | 'vendu' | 'retourné';
  responsable?: string;
  createdAt: number;
  // Legacy
  celluleId?: string;
  typeCafe?: string;
  total?: number;
  prixUnitaire?: number;
}

export interface CafeSeller {
  id: string;
  name: string;
  telephone?: string;
  phone?: string;
  email?: string;
  active: boolean;
  codeAcces?: string;
  createdAt: number;
  // Legacy
  nom?: string;
  cellule?: string;
}

export interface CafeDepense {
  id: string;
  date: number;
  motif: string; // The description
  categorie: string; // The type (e.g. 'fonctionnement', 'marketing')
  montant: number;
  responsable?: string;
  createdAt?: number;
}

export interface CafeTransfert {
  id: string;
  date: number;
  montant: number;
  message?: string;
  createdAt?: number;
}

export interface CafePriceConfig {
  id: string;
  prices: {
    '1kg': { 
      normal: number; 
      reduc: number; 
      cost: number;
    };
    '500g': { 
      normal: number; 
      reduc: number; 
      cost: number;
    };
  };
  lastUpdated: number;
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  role: UserRole;
  permissionUsed: string;
  module: string;
  action: string;
  details?: any;
  createdAt: number;
}
