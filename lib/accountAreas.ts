export type AccountArea = 'empresa' | 'afiliado';
export function hasAccountArea(p: Record<string, any>, area: AccountArea): boolean {
  return p.accountType === 'ambos' || p.accountType === area || (area === 'empresa' ? p.hasCompanyProfile === true : p.hasAffiliateProfile === true);
}
export function activateAccountArea(p: Record<string, any>, area: AccountArea) {
  const company = area === 'empresa' || hasAccountArea(p, 'empresa');
  const affiliate = area === 'afiliado' || hasAccountArea(p, 'afiliado');
  return { accountType: p.accountType === 'admin' ? 'admin' : company && affiliate ? 'ambos' : area, hasCompanyProfile: company, hasAffiliateProfile: affiliate, activeRoleMode: area,
    ...(!hasAccountArea(p, area) ? { [area === 'empresa' ? 'empresaVerificationStatus' : 'affiliateVerificationStatus']: 'draft' } : {}) };
}
export function validateAffiliateInvitation(invite: Record<string, any> | undefined, email: string, uid: string, now = Date.now()): string | null {
  if (!invite || invite.email !== email.trim().toLowerCase()) return 'Convite inválido para este e-mail.';
  if (invite.revoked === true) return 'Este convite foi revogado.';
  if (!Number.isFinite(invite.expiresAt) || invite.expiresAt <= now) return 'Este convite expirou.';
  if (invite.usedBy && invite.usedBy !== uid) return 'Este convite já foi utilizado.';
  return null;
}
