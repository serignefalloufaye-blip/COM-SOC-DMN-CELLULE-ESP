export interface Membre {
  id: string;
  prenom: string;
  nom: string;
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

export type UserRole = 'admin' | 'caisse' | 'tickets' | 'cafe' | 'lecteur';

export interface AppUser {
  uid: string;
  email: string;
  nom: string;
  role: UserRole;
  createdAt?: number;
}

export interface AccessCode {
  id?: string;
  code: string;
  role: UserRole;
  used: boolean;
  usedBy?: string;
  usedByName?: string;
  createdAt: number;
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
  typeCafe?: string;
  total: number;
  createdAt?: number;
}

export interface CafeVente {
  id: string;
  date: number;
  quantite: number;
  prixUnitaire: number;
  typeVente?: 'Sur place' | 'Commande';
  total: number;
  mode: ModePaiement;
  createdAt?: number;
}

export interface CafeDepense {
  id: string;
  date: number;
  motif: string;
  categorie?: 'Matières premières' | 'Transport' | 'Autres';
  montant: number;
  createdAt?: number;
}

export interface CafeTransfert {
  id: string;
  date: number;
  montant: number;
  message?: string;
  createdAt?: number;
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
