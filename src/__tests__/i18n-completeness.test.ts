import enTranslations from '../../locales/en.json';
import ukTranslations from '../../locales/uk.json';

describe('i18n Translation Keys Completeness', () => {
  /**
   * Recursively checks if all keys in the source object exist in the target object
   */
  function findMissingKeys(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    path = ''
  ): string[] {
    const missing: string[] = [];

    for (const key in source) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          missing.push(currentPath);
        } else {
          missing.push(
            ...findMissingKeys(
              source[key] as Record<string, unknown>,
              target[key] as Record<string, unknown>,
              currentPath
            )
          );
        }
      } else {
        if (!(key in target)) {
          missing.push(currentPath);
        }
      }
    }

    return missing;
  }

  describe('Ukrainian (uk) locale completeness', () => {
    it('should have all keys from English locale', () => {
      const missingKeys = findMissingKeys(enTranslations, ukTranslations);
      
      if (missingKeys.length > 0) {
        console.log('Missing keys in uk.json:');
        missingKeys.forEach(key => console.log(`  - ${key}`));
      }

      expect(missingKeys).toEqual([]);
    });

    it('should have specific organization-related keys', () => {
      const requiredKeys = [
        'organizations.title',
        'organizations.subtitle',
        'organizations.createOrganization',
        'orgDetail.title',
        'orgDetail.editLogo',
        'orgDetail.editBanner',
        'orgAdmins.title',
        'orgAdmins.addAdmin',
      ];

      requiredKeys.forEach(keyPath => {
        const keys = keyPath.split('.');
        let value: unknown = ukTranslations;

        for (const key of keys) {
          expect(value).toHaveProperty(key);
          value = (value as Record<string, unknown>)[key];
        }

        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      });
    });

    it('should have all admin.clubs pagination keys', () => {
      expect(ukTranslations.admin.clubs).toHaveProperty('page');
      expect(ukTranslations.admin.clubs).toHaveProperty('of');
      expect(ukTranslations.admin.clubs).toHaveProperty('showing');
      expect(ukTranslations.admin.clubs).toHaveProperty('to');
      expect(ukTranslations.admin.clubs).toHaveProperty('results');
      expect(ukTranslations.admin.clubs).toHaveProperty('pageSize');
      expect(ukTranslations.admin.clubs).toHaveProperty('itemsPerPage');
    });

    it('should have wizard confirmation step key', () => {
      expect(ukTranslations.wizard.steps).toHaveProperty('confirmation');
      expect(ukTranslations.wizard).toHaveProperty('step0Title');
      expect(ukTranslations.wizard).toHaveProperty('loadingClubs');
      expect(ukTranslations.wizard).toHaveProperty('bookingReference');
      expect(ukTranslations.wizard).toHaveProperty('closeAndViewBookings');
    });

    it('should have court availability keys', () => {
      expect(ukTranslations.court).toHaveProperty('noAvailabilityData');
      expect(ukTranslations.court).toHaveProperty('showMoreSlots');
      expect(ukTranslations.court).toHaveProperty('moreSlots');
    });

    it('should have clubAdmins management keys', () => {
      expect(ukTranslations.clubAdmins).toHaveProperty('addAdmin');
      expect(ukTranslations.clubAdmins).toHaveProperty('adminAdded');
      expect(ukTranslations.clubAdmins).toHaveProperty('adminUpdated');
      expect(ukTranslations.clubAdmins).toHaveProperty('adminRemoved');
      expect(ukTranslations.clubAdmins).toHaveProperty('editAdmin');
      expect(ukTranslations.clubAdmins).toHaveProperty('lastLogin');
      expect(ukTranslations.clubAdmins).toHaveProperty('noAdmins');
    });

    it('should have orgAdmins section with all required keys', () => {
      expect(ukTranslations).toHaveProperty('orgAdmins');
      expect(ukTranslations.orgAdmins).toHaveProperty('title');
      expect(ukTranslations.orgAdmins).toHaveProperty('addAdmin');
      expect(ukTranslations.orgAdmins).toHaveProperty('removeAdmin');
      expect(ukTranslations.orgAdmins).toHaveProperty('changeOwner');
      expect(ukTranslations.orgAdmins).toHaveProperty('owner');
      expect(ukTranslations.orgAdmins).toHaveProperty('noAdmins');
    });

    it('should have booking.playerQuickBooking key', () => {
      expect(ukTranslations.booking).toHaveProperty('playerQuickBooking');
      expect(ukTranslations.booking.playerQuickBooking).toHaveProperty('title');
    });
  });

  describe('Translation quality checks', () => {
    it('should not have empty translation values', () => {
      function checkEmptyValues(obj: Record<string, unknown>, path = ''): string[] {
        const emptyKeys: string[] = [];

        for (const key in obj) {
          const currentPath = path ? `${path}.${key}` : key;
          const value = obj[key];

          if (typeof value === 'string' && value.trim().length === 0) {
            emptyKeys.push(currentPath);
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            emptyKeys.push(...checkEmptyValues(value as Record<string, unknown>, currentPath));
          }
        }

        return emptyKeys;
      }

      const emptyKeys = checkEmptyValues(ukTranslations);

      if (emptyKeys.length > 0) {
        console.log('Empty translation values in uk.json:');
        emptyKeys.forEach(key => console.log(`  - ${key}`));
      }

      expect(emptyKeys).toEqual([]);
    });
  });
});
