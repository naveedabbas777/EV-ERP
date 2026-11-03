import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, sanitizeText, validateRequiredEnv } from '../src/lib/security.js';
import { canAccessShowroom, getUserRegions, hasABACAccess, hasPermission, normalizePermissions, rolePermissions } from '../src/lib/permissions.js';

test('rate limit blocks repeated requests', () => {
  const first = checkRateLimit('unit-test:auth', 2, 60_000);
  const second = checkRateLimit('unit-test:auth', 2, 60_000);
  const third = checkRateLimit('unit-test:auth', 2, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});

test('sanitizeText trims and collapses whitespace', () => {
  const value = sanitizeText('  admin   user   name  ');
  assert.equal(value, 'admin user name');
});

test('validateRequiredEnv requires DATABASE_URL', () => {
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'mysql://root:@localhost:3306/ev_erp';
  assert.equal(validateRequiredEnv(), true);
  process.env.DATABASE_URL = original;
});

test('permissions and ABAC enforce tenant-region access correctly', () => {
  const permissions = normalizePermissions(['dealers.read', 'payments.approve', 'payments.approve', null, '']);
  assert.deepEqual(permissions, ['dealers.read', 'payments.approve']);
  assert.equal(hasPermission(['dealers.read'], 'dealers.read'), true);
  assert.equal(hasPermission(['dealers.read'], 'payments.approve'), false);
  assert.equal(hasPermission(['*'], 'payments.approve'), true);

  assert.deepEqual(getUserRegions({ attributes: { region: 'LHR' } }), ['lhr']);
  assert.deepEqual(getUserRegions({ attributes: { regions: ['KHI', 'LHR'] } }), ['khi', 'lhr']);
  assert.equal(hasABACAccess({ attributes: { region: 'LHR' } }, 'lhr'), true);
  assert.equal(hasABACAccess({ attributes: { region: 'LHR' } }, 'khi'), false);
  assert.equal(hasABACAccess({ attributes: { regions: ['all'] } }, 'karachi'), true);
  assert.equal(rolePermissions['Finance Manager'].includes('payments.approve'), true);
  assert.equal(rolePermissions['Dealer User'].includes('returns.create'), true);
});

test('showroom access is limited to the assigned dealer and location', () => {
  const showroom = { id: 'showroom-1', dealerId: 'dealer-1' };

  assert.equal(canAccessShowroom({ dealerId: 'dealer-1' }, showroom), true);
  assert.equal(canAccessShowroom({ dealerId: 'dealer-2' }, showroom), false);
  assert.equal(canAccessShowroom({ dealerId: 'dealer-1', showroomId: 'showroom-1' }, showroom), true);
  assert.equal(canAccessShowroom({ dealerId: 'dealer-1', showroomId: 'showroom-2' }, showroom), false);
  assert.equal(canAccessShowroom({}, showroom), true);
});
