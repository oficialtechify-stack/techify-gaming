import assert from 'node:assert/strict';
import test from 'node:test';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved, profileRoleStatus, resolveProfileRole } from './profileEligibility';

test('accountType afiliado vence campos empresariais legados', () => {
  const profile = {
    accountType: 'afiliado',
    hasAffiliateProfile: true,
    hasCompanyProfile: true,
    companyId: 'comp-antiga',
    companyName: 'Empresa antiga',
    verificationRoleType: 'afiliado',
    verificationStatus: 'approved',
    verified: true,
  };
  assert.equal(resolveProfileRole(profile), 'afiliado');
  assert.equal(profileHasRole(profile, 'afiliado'), true);
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), true);
  assert.equal(profileHasRole(profile, 'empresa'), false);
});

test('solicitação de afiliado corrige classificação empresarial antiga sem perder admin', () => {
  const companyLegacy = applyVerificationRequest({ accountType: 'empresa', companyId: 'comp-old', hasCompanyProfile: true, verified: true }, { roleType: 'afiliado', status: 'approved' });
  assert.equal(companyLegacy.accountType, 'afiliado');
  assert.equal(companyLegacy.activeRoleMode, 'afiliado');
  assert.equal(profileRoleIsApproved(companyLegacy, 'afiliado'), true);
  assert.equal(profileHasRole(companyLegacy, 'empresa'), false);

  const admin = applyVerificationRequest({ accountType: 'admin', hasAffiliateProfile: false }, { roleType: 'afiliado', status: 'approved' });
  assert.equal(admin.accountType, 'admin');
  assert.equal(admin.hasAffiliateProfile, true);
  assert.equal(resolveProfileRole(admin), 'afiliado');
  assert.equal(profileRoleIsApproved(admin, 'afiliado'), true);
});

test('conta com dois perfis respeita o papel selecionado e status independente', () => {
  const profile = {
    accountType: 'ambos',
    hasAffiliateProfile: true,
    hasCompanyProfile: true,
    affiliateVerificationStatus: 'approved',
    empresaVerificationStatus: 'pending',
  };
  assert.equal(resolveProfileRole(profile, 'afiliado'), 'afiliado');
  assert.equal(resolveProfileRole(profile, 'empresa'), 'empresa');
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), true);
  assert.equal(profileRoleIsApproved(profile, 'empresa'), false);
  assert.equal(profileRoleStatus(profile, 'empresa'), 'pending');
});

test('aprovação de afiliado em conta dual mantém a empresa pendente', () => {
  const profile = applyVerificationRequest({
    accountType: 'ambos',
    hasAffiliateProfile: true,
    hasCompanyProfile: true,
    affiliateVerificationStatus: 'pending',
    empresaVerificationStatus: 'pending',
  }, { roleType: 'afiliado', status: 'approved' });
  assert.equal(profile.accountType, 'ambos');
  assert.equal(profile.hasCompanyProfile, true);
  assert.equal(profile.hasAffiliateProfile, true);
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), true);
  assert.equal(profileRoleIsApproved(profile, 'empresa'), false);
  assert.equal(profileRoleStatus(profile, 'empresa'), 'pending');
});

test('status de revogação específica prevalece sobre verified legado', () => {
  const profile = {
    accountType: 'afiliado',
    hasAffiliateProfile: true,
    affiliateVerificationStatus: 'rejected',
    verificationRoleType: 'afiliado',
    verificationStatus: 'approved',
    verified: true,
    kyc_status: 'verified',
  };
  assert.equal(profileRoleStatus(profile, 'afiliado'), 'rejected');
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), false);
});

test('estado aprovado da empresa não aprova o papel de afiliado', () => {
  const profile = { accountType: 'ambos', hasAffiliateProfile: true, hasCompanyProfile: true, empresaVerificationStatus: 'approved', verified: true, verificationRoleType: 'empresa' };
  assert.equal(profileRoleIsApproved(profile, 'empresa'), true);
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), false);
});

test('banimento bloqueia conexão mesmo quando cadastro está aprovado', () => {
  assert.equal(profileRoleIsApproved({ accountType: 'afiliado', verificationStatus: 'approved', banned: true }, 'afiliado'), false);
});

test('arquivamento bloqueia conexão mesmo quando cadastro está aprovado', () => {
  assert.equal(profileRoleIsApproved({ accountType: 'empresa', empresaVerificationStatus: 'approved', isArchived: true }, 'empresa'), false);
});

test('admin só pode operar seu próprio perfil afiliado quando existe registro explícito', () => {
  assert.equal(profileHasRole({ accountType: 'admin', hasAffiliateProfile: false }, 'afiliado'), false);
  const profile = { accountType: 'admin', hasAffiliateProfile: true, verificationRoleType: 'afiliado', affiliateVerificationStatus: 'approved' };
  assert.equal(profileHasRole(profile, 'afiliado'), true);
  assert.equal(profileRoleIsApproved(profile, 'afiliado'), true);
  assert.equal(resolveProfileRole(profile), 'afiliado');
  assert.equal(profileHasRole(profile, 'empresa'), false);
});
