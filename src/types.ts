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

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'user';
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
  mId: string;
  petitDej: number;
  repas: number;
  mois: string;
  annee: number;
  createdAt?: number;
}
