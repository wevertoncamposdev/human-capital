import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_DEFINITIONS } from '../registration/registration.constants';
import {
  CORE_PERMISSION_KEYS,
  CORE_PERMISSIONS,
  CORE_ROLE_PERMISSION_TEMPLATES,
} from './core-permissions';
import { REQUIRED_PERMISSIONS } from './required-permissions';

describe('core permissions catalog', () => {
  it('keeps the runtime sync list aligned with registration defaults', () => {
    expect(REQUIRED_PERMISSIONS).toEqual(CORE_PERMISSIONS);
    expect(DEFAULT_PERMISSIONS).toEqual(CORE_PERMISSIONS);
  });

  it('grants all core permissions to the default admin role', () => {
    const adminRole = DEFAULT_ROLE_DEFINITIONS.find((role) => role.name === 'Admin');

    expect(adminRole?.permissionKeys).toEqual(CORE_PERMISSION_KEYS);
  });

  it('grants all core permissions to admin aliases during backfill', () => {
    const adminTemplate = CORE_ROLE_PERMISSION_TEMPLATES.find((template) =>
      template.roleNames.includes('Admin'),
    );

    expect(adminTemplate?.roleNames).toContain('Administrador');
    expect(adminTemplate?.permissionKeys).toEqual(CORE_PERMISSION_KEYS);
  });
});
