import assert from 'node:assert/strict';
import test from 'node:test';
import { activateAccountArea, validateAffiliateInvitation } from './accountAreas.ts';
import { resolveProfileRole, profileRoleIsApproved } from './profileEligibility.ts';

test('ativação do afiliado preserva empresa, saldo e contas Stripe sem conceder aprovação', () => {
  const original = { accountType: 'empresa', hasCompanyProfile: true, empresaVerificationStatus: 'approved', empresaAvailableBalanceCents: 9000, stripeAccounts: { empresa: 'existing' } };
  const updated = { ...original, ...activateAccountArea(original, 'afiliado') };
  assert.equal(updated.accountType, 'ambos');
  assert.equal(updated.activeRoleMode, 'afiliado');
  assert.equal(updated.empresaAvailableBalanceCents, 9000);
  assert.deepEqual(updated.stripeAccounts, original.stripeAccounts);
  assert.equal(profileRoleIsApproved(updated, 'empresa'), true);
  assert.equal(profileRoleIsApproved(updated, 'afiliado'), false);
});
test('ativação da empresa preserva perfil afiliado e não copia aprovação', () => {
  const original = { accountType: 'afiliado', hasAffiliateProfile: true, affiliateVerificationStatus: 'approved', afiliadoAvailableBalanceCents: 1200 };
  const updated = { ...original, ...activateAccountArea(original, 'empresa') };
  assert.equal(updated.accountType, 'ambos');
  assert.equal(profileRoleIsApproved(updated, 'afiliado'), true);
  assert.equal(profileRoleIsApproved(updated, 'empresa'), false);
  assert.equal(updated.afiliadoAvailableBalanceCents, 1200);
});
test('troca de área existente não redefine aprovação ou valores', () => {
  const original = { accountType: 'ambos', hasCompanyProfile: true, hasAffiliateProfile: true, affiliateVerificationStatus: 'approved', empresaVerificationStatus: 'pending' };
  const update = activateAccountArea(original, 'afiliado');
  assert.equal('affiliateVerificationStatus' in update, false);
  assert.equal('availableBalance' in update, false);
  assert.equal('stripeAccounts' in update, false);
  assert.equal(resolveProfileRole({ ...original, ...update, verificationRoleType: 'empresa' }), 'afiliado');
});
test('convite vinculado ao e-mail rejeita ausente, expirado, revogado e outro usuário', () => {
  const invite = { email: 'person@example.com', expiresAt: 1000 };
  assert.equal(validateAffiliateInvitation(invite, 'PERSON@example.com', 'one', 100), null);
  assert.ok(validateAffiliateInvitation(undefined, 'person@example.com', 'one', 100));
  assert.ok(validateAffiliateInvitation(invite, 'other@example.com', 'one', 100));
  assert.ok(validateAffiliateInvitation(invite, 'person@example.com', 'one', 1000));
  assert.ok(validateAffiliateInvitation({ ...invite, revoked: true }, 'person@example.com', 'one', 100));
  assert.ok(validateAffiliateInvitation({ ...invite, usedBy: 'two' }, 'person@example.com', 'one', 100));
  assert.equal(validateAffiliateInvitation({ ...invite, usedBy: 'one' }, 'person@example.com', 'one', 100), null);
});
