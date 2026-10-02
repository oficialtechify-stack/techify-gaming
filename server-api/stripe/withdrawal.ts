import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';
import {
  MIN_WITHDRAWAL_CENTS,
  WITHDRAWAL_FEE_CENTS,
  roleAvailableCentsField,
  type PlatformRole,
} from '../../lib/platformBilling.js';
import { toCents } from '../../lib/stripeSplit.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

function fail(res: ResponseLike, status: number, error: string, code?: string) {
  return res.status(status).json({ error: true, message: error, ...(code ? { code } : {}) });
}

function readRoleAvailableCents(profile: Record<string, any>, role: PlatformRole): number {
  const field = roleAvailableCentsField(role);
  const roleValue = Number(profile[field]);
  if (Number.isSafeInteger(roleValue) && roleValue >= 0) return roleValue;

  const accountType = String(profile.accountType || '').toLowerCase();
  const isSingleRole = accountType === role || (role === 'empresa' ? profile.hasAffiliateProfile !== true : profile.hasCompanyProfile !== true);
  if (!isSingleRole) return 0;
  const legacy = Math.round(Number(profile.availableBalance || 0) * 100);
  return Number.isSafeInteger(legacy) && legacy > 0 ? legacy : 0;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const role = body.role as PlatformRole;
    if (role !== 'empresa' && role !== 'afiliado') return fail(res, 400, 'Selecione Empresa ou Afiliado.', 'INVALID_ROLE');

    const amountCents = toCents(body.amount);
    if (amountCents < MIN_WITHDRAWAL_CENTS) return fail(res, 400, 'O valor mínimo de saque é R$ 10,00.', 'MINIMUM_WITHDRAWAL');
    if (amountCents <= WITHDRAWAL_FEE_CENTS) return fail(res, 400, 'O valor solicitado não cobre a taxa do saque.', 'INVALID_WITHDRAWAL');

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const [profileSnap, requestSnap] = await Promise.all([
      profileRef.get(),
      db.collection('verification_requests').doc(identity.uid).get(),
    ]);
    if (!profileSnap.exists) return fail(res, 404, 'Perfil não encontrado.', 'PROFILE_NOT_FOUND');
    const profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (!profileHasRole(profile, role) || !profileRoleIsApproved(profile, role)) {
      return fail(res, 403, 'Seu perfil precisa estar aprovado antes de solicitar saques.', 'PROFILE_NOT_APPROVED');
    }

    const accountId = String(profile.stripeAccounts?.[role] || '');
    if (!accountId) return fail(res, 409, 'Conecte sua conta Stripe para receber saques.', 'CONNECT_NOT_CONFIGURED');

    let companyId = '';
    if (role === 'empresa') {
      companyId = String(profile.companyId || '').trim();
      if (!companyId) {
        return fail(res, 409, 'A conta Empresa não possui vínculo com uma empresa válida.', 'COMPANY_NOT_LINKED');
      }

      const companySnap = await db.collection('companies').doc(companyId).get();
      if (!companySnap.exists) {
        return fail(res, 404, 'A empresa vinculada não foi encontrada.', 'COMPANY_NOT_FOUND');
      }

      const company = companySnap.data()!;
      if (
        String(company.ownerId || company.submittedBy || '') !== identity.uid ||
        company.verified !== true ||
        String(company.status || '').toLowerCase() !== 'approved'
      ) {
        return fail(res, 403, 'A empresa vinculada não está aprovada para movimentar saldo.', 'COMPANY_NOT_APPROVED');
      }
    }

    const stripe = getStripeTestClient();
    let account = await stripe.accounts.retrieve(accountId);
    if (
      account.metadata?.firebase_uid !== identity.uid ||
      account.metadata?.leadspay_role !== role ||
      (role === 'empresa' && account.metadata?.leadspay_company_id && account.metadata.leadspay_company_id !== companyId)
    ) {
      return fail(res, 409, 'A conta Stripe não corresponde a este perfil/empresa.', 'CONNECT_OWNERSHIP_MISMATCH');
    }

    if (role === 'empresa' && companyId && !account.metadata?.leadspay_company_id) {
      account = await stripe.accounts.update(accountId, {
        metadata: {
          ...account.metadata,
          firebase_uid: identity.uid,
          leadspay_role: 'empresa',
          leadspay_company_id: companyId,
        },
      });
    }

    if (
      account.details_submitted !== true ||
      account.payouts_enabled !== true ||
      account.capabilities?.transfers !== 'active'
    ) {
      return fail(res, 409, 'Finalize a configuração de recebimentos na Stripe antes de sacar.', 'CONNECT_NOT_READY');
    }

    const withdrawalId = `wth_${randomUUID().replace(/-/g, '')}`;
    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
    const configuredStripeKey = String(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY || '');
    const stripeIsTest = configuredStripeKey.includes('_test_');
    const availableField = roleAvailableCentsField(role);
    const now = new Date().toISOString();

    const reserved = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(profileRef);
      if (!fresh.exists) return false;
      const data = fresh.data()!;
      const availableCents = readRoleAvailableCents(data, role);
      if (availableCents < amountCents) return false;
      const aggregateAvailable = Number(data.availableBalance || 0);
      tx.set(profileRef, {
        [availableField]: availableCents - amountCents,
        availableBalance: Number(Math.max(0, aggregateAvailable - amountCents / 100).toFixed(2)),
        updatedAt: now,
      }, { merge: true });
      tx.create(withdrawalRef, {
        id: withdrawalId,
        userId: identity.uid,
        userName: String(profile.name || identity.email || 'Conta LeadsPay').slice(0, 160),
        role,
        ...(companyId ? { companyId } : {}),
        requestedAmount: amountCents / 100,
        amount: amountCents / 100,
        amountCents,
        fee: WITHDRAWAL_FEE_CENTS / 100,
        feeAmount: WITHDRAWAL_FEE_CENTS / 100,
        feeCents: WITHDRAWAL_FEE_CENTS,
        netAmount: (amountCents - WITHDRAWAL_FEE_CENTS) / 100,
        netAmountCents: amountCents - WITHDRAWAL_FEE_CENTS,
        stripeAccountId: accountId,
        status: 'PROCESSING',
        createdAt: now,
        requestedAt: now,
        is_test: stripeIsTest,
        environment: stripeIsTest ? 'development' : 'production',
      });
      return true;
    });

    if (!reserved) return fail(res, 409, 'Saldo disponível insuficiente para este saque.', 'INSUFFICIENT_BALANCE');

    const netAmountCents = amountCents - WITHDRAWAL_FEE_CENTS;
    let transferId = '';
    try {
      const transfer = await stripe.transfers.create({
        amount: netAmountCents,
        currency: 'brl',
        destination: accountId,
        metadata: {
          leadspay_withdrawal_id: withdrawalId,
          leadspay_user_id: identity.uid,
          leadspay_role: role,
          ...(companyId ? { leadspay_company_id: companyId } : {}),
        },
      }, { idempotencyKey: `leadspay-withdrawal-transfer-${withdrawalId}` });
      transferId = transfer.id;
    } catch (error) {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(profileRef);
        const withdrawal = await tx.get(withdrawalRef);
        if (!fresh.exists || !withdrawal.exists || withdrawal.data()!.status !== 'PROCESSING') return;
        const data = fresh.data()!;
        const currentRoleAvailable = Number(data[availableField] || 0);
        tx.set(profileRef, {
          [availableField]: currentRoleAvailable + amountCents,
          availableBalance: Number((Number(data.availableBalance || 0) + amountCents / 100).toFixed(2)),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        tx.set(withdrawalRef, {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message.slice(0, 250) : 'Falha na transferência Stripe',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      return fail(res, 503, 'A Stripe não conseguiu reservar a transferência. Seu saldo foi restaurado.', 'TRANSFER_FAILED');
    }

    let payoutId = '';
    let payoutStatus = 'TRANSFERRED_TO_STRIPE';
    try {
      const payout = await stripe.payouts.create({
        amount: netAmountCents,
        currency: 'brl',
        metadata: { leadspay_withdrawal_id: withdrawalId },
      }, {
        stripeAccount: accountId,
        idempotencyKey: `leadspay-withdrawal-payout-${withdrawalId}`,
      });
      payoutId = payout.id;
      payoutStatus = payout.status === 'paid' ? 'COMPLETED' : 'PAYOUT_PENDING';
    } catch (error) {
      console.warn('[Stripe withdrawal payout] Transferência enviada à conta conectada; payout automático não foi criado:', error instanceof Error ? error.message : 'falha');
    }

    const completedAt = payoutStatus === 'COMPLETED' ? new Date().toISOString() : null;
    await withdrawalRef.set({
      status: payoutStatus,
      stripeTransferId: transferId,
      stripePayoutId: payoutId || null,
      completedAt,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await db.collection('platform_finances').doc('global_summary').set({
      totalPlatformRevenue: FieldValue.increment(WITHDRAWAL_FEE_CENTS / 100),
      totalWithdrawalFees: FieldValue.increment(WITHDRAWAL_FEE_CENTS / 100),
      totalWithdrawalsProcessed: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    const finalDoc = await withdrawalRef.get();
    return res.status(200).json({
      success: true,
      message: payoutId
        ? 'Saque enviado à Stripe e encaminhado para o banco cadastrado.'
        : 'Saque enviado à sua conta Stripe. A liquidação bancária seguirá a configuração da sua conta conectada.',
      withdrawal: { id: withdrawalId, ...finalDoc.data() },
    });
  } catch (error) {
    console.error('[Stripe withdrawal]', error instanceof Error ? error.message : 'Falha desconhecida');
    return fail(res, 503, 'Não foi possível processar o saque agora.', 'WITHDRAWAL_UNAVAILABLE');
  }
}
