export type ConnectRole = 'empresa' | 'afiliado';
export type ProfileLike = Record<string, unknown>;

const asText = (value: unknown): string => typeof value === 'string' ? value.trim().toLowerCase() : '';
const roleStatusField = (role: ConnectRole): string => role === 'afiliado' ? 'affiliateVerificationStatus' : 'empresaVerificationStatus';

export function applyVerificationRequest(profile: ProfileLike, request?: ProfileLike | null): ProfileLike {
  if (!request) return profile;
  const requestRole = asText(request.roleType || request.verificationRoleType);
  if (requestRole !== 'empresa' && requestRole !== 'afiliado') return profile;

  const currentType = asText(profile.accountType);
  const otherRole = requestRole === 'afiliado' ? 'empresa' : 'afiliado';
  const otherStatus = asText(profile[roleStatusField(otherRole)]);
  const hasOtherApprovedProfile = otherStatus === 'approved';
  const preserveAdmin = currentType === 'admin';
  const correctedType = preserveAdmin
    ? 'admin'
    : hasOtherApprovedProfile || currentType === 'ambos'
      ? 'ambos'
      : requestRole;

  return {
    ...profile,
    accountType: correctedType,
    activeRoleMode: requestRole,
    verificationRoleType: requestRole,
    hasAffiliateProfile: requestRole === 'afiliado' || hasOtherApprovedProfile && otherRole === 'afiliado' || currentType === 'ambos' && profile.hasAffiliateProfile === true || preserveAdmin && profile.hasAffiliateProfile === true,
    hasCompanyProfile: requestRole === 'empresa' || hasOtherApprovedProfile && otherRole === 'empresa' || currentType === 'ambos' && profile.hasCompanyProfile === true || preserveAdmin && profile.hasCompanyProfile === true,
    [roleStatusField(requestRole)]: request.status,
  };
}

export function profileHasRole(profile: ProfileLike, role: ConnectRole): boolean {
  const accountType = asText(profile.accountType);
  if (accountType === 'admin') {
    if (role !== 'afiliado') return false;
    return profile.hasAffiliateProfile === true || Boolean(profile.affiliateId) ||
      asText(profile.verificationRoleType || profile.roleType) === 'afiliado';
  }
  if (accountType === 'ambos') return true;
  if (accountType === 'afiliado' || accountType === 'empresa') return accountType === role;

  const verificationRole = asText(profile.verificationRoleType || profile.roleType);
  if (verificationRole === role) return true;
  if (accountType === role) return true;

  if (role === 'afiliado') {
    return profile.hasAffiliateProfile === true || Boolean(profile.affiliateId) || Boolean(profile.affiliateCode);
  }
  return profile.hasCompanyProfile === true || Boolean(profile.companyId) || Boolean(profile.companyName);
}

export function profileRoleStatus(profile: ProfileLike, role: ConnectRole): string {
  const verificationRole = asText(profile.verificationRoleType || profile.roleType);
  const accountType = asText(profile.accountType);
  const globalStatusBelongsToRole = verificationRole === role || (!verificationRole && accountType === role);
  const status = asText(profile[roleStatusField(role)]) ||
    (globalStatusBelongsToRole ? asText(profile.verificationStatus || profile.status || profile.kyc_status) : '');
  if (status === 'banned') return 'banned';
  if (status === 'rejected' || status === 'revoked') return 'rejected';
  if (status === 'pending' || status === 'submitted' || status === 'under_review') return 'pending';
  if (status === 'approved' || status === 'verified') return 'approved';
  return profile.verified === true && globalStatusBelongsToRole ? 'approved' : 'unsubmitted';
}

export function profileRoleIsApproved(profile: ProfileLike, role: ConnectRole): boolean {
  const status = asText(profile.status);
  if (profile.banned === true || status === 'banned' || profile.archived === true || profile.isArchived === true || status === 'archived') return false;
  if (!profileHasRole(profile, role)) return false;
  return profileRoleStatus(profile, role) === 'approved' ||
    (profileRoleStatus(profile, role) === 'verified' && profile.verified === true);
}

export function resolveProfileRole(
  profile: ProfileLike,
  preferredRole?: ConnectRole,
): ConnectRole | 'admin' {
  const accountType = asText(profile.accountType);
  const verificationRole = asText(profile.verificationRoleType || profile.roleType);
  const affiliateEvidence = profile.hasAffiliateProfile === true || Boolean(profile.affiliateId) ||
    profile.affiliateVerificationStatus !== undefined || verificationRole === 'afiliado';

  // The platform's sole administrator remains an administrator by email, but
  // may operate a separately verified Affiliate profile in the same account.
  if (accountType === 'admin') {
    if (!affiliateEvidence || !profileHasRole(profile, 'afiliado')) return 'admin';
    if (preferredRole === 'afiliado') return 'afiliado';
    return verificationRole === 'afiliado' ? 'afiliado' : 'afiliado';
  }

  if (accountType === 'empresa' || accountType === 'afiliado') return accountType;
  if (accountType === 'ambos') {
    if (preferredRole) return preferredRole;
    if ((verificationRole === 'empresa' || verificationRole === 'afiliado') && profileHasRole(profile, verificationRole)) return verificationRole;
    const activeRole = asText(profile.activeRoleMode);
    return activeRole === 'empresa' ? 'empresa' : 'afiliado';
  }

  if ((verificationRole === 'empresa' || verificationRole === 'afiliado') && profileHasRole(profile, verificationRole)) {
    return verificationRole;
  }
  if (preferredRole && profileHasRole(profile, preferredRole)) return preferredRole;

  if (preferredRole) return preferredRole;

  if (profile.hasAffiliateProfile === true && profile.hasCompanyProfile !== true) return 'afiliado';
  if (profile.hasCompanyProfile === true || profile.companyId || profile.companyName) return 'empresa';
  return 'afiliado';
}
