export interface Membre {
  id: string;
  prenom: string;
  nom: string;
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

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
