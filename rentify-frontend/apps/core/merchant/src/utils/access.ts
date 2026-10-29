import { useAuth } from '@rentify/utils';

/**
 * Staff permissions the Core/Commerce APIs enforce (docs/authorization-policy-matrix.md).
 * The dashboard only mirrors them so people see what they can use; the backend stays the real gate.
 */
export const STAFF_PERMISSIONS = {
  manage_products: { label: 'Products', detail: 'Add, edit and publish products and stock' },
  manage_orders: { label: 'Orders', detail: 'Process orders, deliveries, COD and refunds; see customers' },
  manage_pos: { label: 'POS', detail: 'Sell at the counter in the POS app' },
  manage_invoices: { label: 'Invoices', detail: 'Create and send invoices' },
  manage_analytics: { label: 'Analytics', detail: 'See sales, money and reports' },
  manage_settings: { label: 'Settings', detail: 'Change store settings' },
} as const;

export type StaffPermission = keyof typeof STAFF_PERMISSIONS;

// Owner-only areas: Store ownership and Website ownership are never delegated to staff in Release 1
export const OWNER_ONLY = ['staff', 'billing', 'website'] as const;

export interface Access {
  role: 'owner' | 'staff' | 'admin';
  isOwner: boolean;
  permissions: string[];
  can: (permission: StaffPermission | 'settings') => boolean;
}

export const accessFor = (profile: any, roleOverride?: string): Access => {
  const rawRole = roleOverride || profile?.role || 'user';
  const permissions: string[] = profile?.roleSpecific?.permissions || profile?.permissions || [];
  const role: Access['role'] = rawRole === 'staff' ? 'staff' : rawRole === 'admin' ? 'admin' : 'owner';
  const isOwner = role !== 'staff';
  const can = (permission: StaffPermission | 'settings') => {
    if (isOwner) return true;
    if (permission === 'settings' || permission === 'manage_settings') {
      return permissions.includes('manage_settings') || permissions.includes('settings');
    }
    return permissions.includes(permission);
  };
  return { role, isOwner, permissions, can };
};

export function useAccess(): Access {
  const { profile, role } = useAuth() as { profile?: any; role?: string };
  return accessFor(profile, role);
}

export default useAccess;
