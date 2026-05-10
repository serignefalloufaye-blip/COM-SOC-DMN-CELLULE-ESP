import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole } from '../types';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type Permission = 
  | 'caisse.read' | 'caisse.create' | 'caisse.update' | 'caisse.validate'
  | 'tickets.read' | 'tickets.create' | 'tickets.update' | 'tickets.validate'
  | 'cafe.production.read' | 'cafe.production.create' | 'cafe.production.update'
  | 'cafe.stock.read' | 'cafe.stock.update'
  | 'cafe.sales.read' | 'cafe.sales.create'
  | 'cafe.expenses.read' | 'cafe.expenses.create'
  | 'stats.read' | 'reports.generate'
  | 'members.read' | 'members.create' | 'members.update' | 'members.delete'
  | 'users.manage'
  | '*';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['*'],
  caisse: [
    'caisse.read',
    'caisse.create',
    'caisse.update',
    'caisse.validate',
    'stats.read',
    'reports.generate',
    'members.read'
  ],
  tickets: [
    'tickets.read',
    'tickets.create',
    'tickets.update',
    'tickets.validate',
    'members.read'
  ],
  cafe: [
    'cafe.production.read',
    'cafe.production.create',
    'cafe.production.update',
    'cafe.stock.read',
    'cafe.stock.update',
    'cafe.sales.read',
    'cafe.sales.create',
    'cafe.expenses.read',
    'cafe.expenses.create',
    'stats.read'
  ],
  lecteur: [
    'caisse.read',
    'tickets.read',
    'cafe.production.read',
    'cafe.sales.read',
    'stats.read',
    'members.read'
  ],
  revendeur: [
    'cafe.sales.read',
    'cafe.sales.create'
  ]
};

interface PermissionsContextType {
  role: UserRole | null;
  permissions: Permission[];
  hasPermission: (permission: string) => boolean;
  logAction: (permissionUsed: string, module: string, action: string, details?: any) => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  role: null,
  permissions: [],
  hasPermission: () => false,
  logAction: async () => {}
});

export const usePermissions = () => useContext(PermissionsContext);

export const PermissionsProvider: React.FC<{ children: React.ReactNode, role: UserRole | null | undefined }> = ({ children, role }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (role) {
      setPermissions(ROLE_PERMISSIONS[role] || []);
    } else {
      setPermissions([]);
    }
  }, [role]);

  const hasPermission = (permission: string) => {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    if (perms.includes('*')) return true;

    for (const p of perms) {
      if (p === permission) return true;
      if (p.endsWith('.*')) {
        const prefix = p.substring(0, p.length - 2);
        if (permission.startsWith(prefix)) return true;
      }
    }
    return false;
  };

  const logAction = async (permissionUsed: string, moduleName: string, action: string, details?: any) => {
    const user = auth.currentUser;
    if (!user || !role) return;

    try {
      await addDoc(collection(db, 'audit_logs'), {
        userId: user.uid,
        userEmail: user.email,
        role: role,
        permissionUsed,
        module: moduleName,
        action,
        details: details || null,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error("Failed to log action", error);
    }
  };

  return (
    <PermissionsContext.Provider value={{ role: role || null, permissions, hasPermission, logAction }}>
      {children}
    </PermissionsContext.Provider>
  );
};
