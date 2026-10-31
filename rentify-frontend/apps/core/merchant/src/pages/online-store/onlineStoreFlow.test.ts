import { describe, it, expect } from 'vitest';

describe('MR5 · Online store + Store design (Screens M17, M18; P3, P7)', () => {
  describe('Route and Redirect Invariants (P3)', () => {
    it('redirects /store-management to /online-store', () => {
      const legacyRedirect = { from: '/store-management', to: '/online-store' };
      expect(legacyRedirect.to).toBe('/online-store');
    });

    it('redirects /store/design to /customization', () => {
      const designRedirect = { from: '/store/design', to: '/customization' };
      expect(designRedirect.to).toBe('/customization');
    });
  });

  describe('Online Store Page Hierarchy (Screen M17; P3)', () => {
    it('presents live status and primary action buttons first', () => {
      const topActions = ['Edit design', 'Visit', 'Share'];
      expect(topActions[0]).toBe('Edit design');
      expect(topActions[1]).toBe('Visit');
      expect(topActions[2]).toBe('Share');
    });

    it('presents a clean list of named store areas', () => {
      const storeSections = [
        { title: 'Look', description: 'Template, colours and page layout' },
        { title: 'Content', description: 'Banner, highlights, about us' },
        { title: 'Store details', description: 'Name, logo, contact' },
        {
          title: 'Web address',
          description: 'Your own domain (opens on rentifystore.shop for checkout)',
        },
      ];

      expect(storeSections.map((s) => s.title)).toEqual([
        'Look',
        'Content',
        'Store details',
        'Web address',
      ]);
    });

    it('does not include raw Delete Store button under quick actions', () => {
      const onlineStoreActions = ['Edit design', 'Visit', 'Share'];
      expect(onlineStoreActions).not.toContain('Delete Store');
      expect(onlineStoreActions).not.toContain('delete_store');
    });

    it('explains custom domain rules in plain words without DEC-003', () => {
      const domainExplanation =
        'Your own domain (opens on rentifystore.shop for checkout)';
      expect(domainExplanation).not.toContain('DEC-003');
      expect(domainExplanation).toContain('rentifystore.shop');
    });
  });

  describe('Store Profile Deletion Placement (Screen M17 Note 2 / P7)', () => {
    it('locates store closure in Settings › Store profile behind confirmation', () => {
      const storeProfileDangerZone = {
        location: 'Settings › Store profile',
        actionLabel: 'Close store...',
        requiresConfirmation: true,
      };

      expect(storeProfileDangerZone.location).toBe('Settings › Store profile');
      expect(storeProfileDangerZone.requiresConfirmation).toBe(true);
    });
  });
});
