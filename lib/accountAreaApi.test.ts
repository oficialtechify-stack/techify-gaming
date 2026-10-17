import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createAccountAreaHandler } from '../server-api/profile/account-area.ts';

function fixture(profile: Record<string, any> | null, invitation?: Record<string, any>) {
  const token = 'a'.repeat(64);
  const invitationId = createHash('sha256').update(token).digest('hex');
  const records = new Map<string, any>();
  if (profile) records.set('user_profiles/person', structuredClone(profile));
  if (invitation) records.set(`affiliate_invitations/${invitationId}`, structuredClone(invitation));
  const db: any = {
    collection: (collection: string) => ({ doc: (id: string) => ({ key: `${collection}/${id}` }) }),
    runTransaction: async (work: any) => {
      const writes: any[] = [];
      const result = await work({ get: async (ref: any) => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }), set: (ref: any, value: any) => writes.push([ref.key, value]) });
      for (const [key, value] of writes) records.set(key, { ...records.get(key), ...value });
      return result;
    },
  };
  const handler = createAccountAreaHandler({ getDb: () => db, verifyIdentity: async () => ({ uid: 'person', email: 'person@example.com', emailVerified: true }), resolveCompany: async () => null });
  async function request(body: any) {
    let status = 200, data: any;
    const response: any = { setHeader() {}, status(code: number) { status = code; return response; }, json(value: any) { data = value; } };
    await handler({ method: 'POST', headers: {}, body }, response);
    return { status, data };
  }
  return { records, request, token };
}
test('API rejeita ativação sem convite sem alterar saldo ou perfil', async () => {
  const original = { accountType: 'empresa', empresaAvailableBalanceCents: 3000 };
  const f = fixture(original);
  assert.equal((await f.request({ area: 'afiliado', availableBalance: 99999, affiliateVerificationStatus: 'approved' })).status, 403);
  assert.deepEqual(f.records.get('user_profiles/person'), original);
});
test('API resgata convite e ignora dados financeiros e aprovação enviados pelo cliente', async () => {
  const f = fixture({ accountType: 'empresa', empresaVerificationStatus: 'approved', empresaAvailableBalanceCents: 3000, stripeAccounts: { empresa: 'company-account' } }, { email: 'person@example.com', expiresAt: Date.now() + 60000, companyId: 'inviter' });
  const result = await f.request({ area: 'afiliado', invitation: f.token, affiliateVerificationStatus: 'approved', empresaAvailableBalanceCents: 0, stripeAccounts: { afiliado: 'injected' } });
  assert.equal(result.status, 200);
  assert.equal(result.data.profile.accountType, 'ambos');
  assert.equal(result.data.profile.affiliateVerificationStatus, 'draft');
  assert.equal(result.data.profile.empresaAvailableBalanceCents, 3000);
  assert.deepEqual(result.data.profile.stripeAccounts, { empresa: 'company-account' });
  assert.deepEqual(result.data.profile.affiliateInvitedCompanyIds, ['inviter']);
  assert.equal([...f.records.values()].find(x => x.usedBy)?.usedBy, 'person');
});
test('API rejeita empresa não aprovada tentando convidar', async () => {
  const f = fixture({ accountType: 'empresa' });
  assert.equal((await f.request({ action: 'company-invite', email: 'other@example.com' })).status, 403);
});
test('API bloqueia conta banida antes de consumir convite', async () => {
  const f = fixture({ accountType: 'empresa', banned: true }, { email: 'person@example.com', expiresAt: Date.now() + 60000 });
  assert.equal((await f.request({ area: 'afiliado', invitation: f.token })).status, 403);
  assert.equal([...f.records.values()].some(x => x.usedBy), false);
});
test('API não permite reativar área para fugir de aprovação pendente', async () => {
  const f = fixture({ accountType: 'ambos', hasAffiliateProfile: true, hasCompanyProfile: true, affiliateVerificationStatus: 'pending', empresaVerificationStatus: 'approved' });
  const result = await f.request({ area: 'afiliado' });
  assert.equal(result.status, 200);
  assert.equal(result.data.profile.affiliateVerificationStatus, 'pending');
  assert.equal(result.data.profile.empresaVerificationStatus, 'approved');
});
