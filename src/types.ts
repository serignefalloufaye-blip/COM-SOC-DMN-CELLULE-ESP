export interface Membre {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
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

export type UserRole = 'admin' | 'caisse' | 'tickets' | 'cafe' | 'revendeur' | 'lecteur';

export interface CafeVersement {
  id: string;
  vendeurId: string;
  date: number;
  montant: number;
  mode: 'WAVE' | 'OM' | 'ESPÈCES' | string;
  responsable?: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  nom: string;
  role: UserRole;
  createdAt?: number;
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

export interface CafeProduction {
  id: string;
  date: number;
  quantite: number;
  coutUnitaire: number;
  typeCafe?: '1kg' | '500g' | string;
  total: number;
  responsable?: string;
  remarque?: string;
  createdAt?: number;
}

export interface CafeVente {
  id: string;
  date: number;
  quantite: number;
  prixUnitaire: number;
  typeCafe?: '1kg' | '500g' | string;
  typeVente?: 'Sur place' | 'Commande' | string;
  vendeurId?: string;
  clientId?: string;
  total: number;
  mode?: ModePaiement;
  responsable?: string;
  createdAt?: number;
}

export interface CafeDistribution {
  id: string;
  date: number;
  celluleId: string;
  typeCafe: '1kg' | '500g' | string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  responsable?: string;
  createdAt: number;
}

export interface CafeSeller {
  id: string;
  nom: string;
  cellule: string;
  telephone?: string;
  email?: string;
  codeAcces?: string;
  active: boolean;
  createdAt: number;
}

export interface CafeClient {
  id: string;
  nom: string;
  telephone?: string;
  totalAchats: number;
  lastAchat?: number;
  createdAt: number;
}

export interface CafeOrder {
  id: string;
  date: number;
  sellerId?: string;
  sellerName?: string;
  cellule?: string;
  quantite: number;
  typeCafe: '1kg' | '500g' | string;
  status: 'EN_ATTENTE' | 'VALIDÉ' | 'ANNULÉ';
  createdAt: number;
  validatedAt?: number;
  validatedBy?: string;
}

export interface CafeDepense {
  id: string;
  date: number;
  motif: string;
  categorie?: 'Matières premières' | 'Transport' | 'Autres' | string;
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
    '1kg': { cost: number; price: number };
    '500g': { cost: number; price: number };
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
