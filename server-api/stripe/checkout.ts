import { getServerAdminFirestore } from '../../lib/firebaseAdminServer';
import { getStripeTestClient } from '../../lib/stripeServer';
import { calculateSplit, toCents } from '../../lib/stripeSplit';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

function setHeaders(req: RequestLike, res: ResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const rawBase = process.env.LEADSPAY_BASE_URL?.trim();
  const allowedOrigin = rawBase ? new URL(rawBase).origin : '';
  if (typeof req.headers.origin === 'string' && req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
}

function fail(res: ResponseLike, status: number, error: string, code?: string) {
  return res.status(status).json({ error, ...(code ? { code } : {}) });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const planId = String(body.planId || '').trim();
    const attemptId = String(body.attemptId || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 120);
    const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 200);
    const affiliateCode = String(body.affiliateCode || '').trim().slice(0, 64);
    const customAmount = Number(body.amount || 0);

    if (!planId && customAmount <= 0) return fail(res, 400, 'Oferta ou valor inválido.');
    if (!/^[a-zA-Z0-9_-]{10,90}$/.test(attemptId)) return fail(res, 400, 'Atualize a página e tente novamente.');
    if (!buyerName || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) return fail(res, 400, 'Informe nome e e-mail válidos.');

    let db: any = null;
    try {
      db = getServerAdminFirestore();
    } catch (dbErr) {
      console.error('[Stripe checkout] Firestore Admin indisponível.');
      return fail(res, 503, 'Não foi possível registrar o pedido. Tente novamente mais tarde.', 'ORDER_STORAGE_UNAVAILABLE');
    }

    let planData: Record<string, any> | null = null;
    let planName = String(body.planName || body.description || 'Produto LeadsPay').slice(0, 160);
    let companyId = String(body.companyId || '').trim();
    let companyOwnerId = '';
    let companyName = 'LeadsPay';
    let companyAccountId = '';

    // 1. Tentar localizar plano no Firestore
    if (db && planId && !planId.startsWith('lp_') && !planId.startsWith('dyn_')) {
      try {
        const planSnap = await db.collection('plans').doc(planId).get();
        if (planSnap.exists) {
          planData = planSnap.data()!;
          planName = String(planData.name || planName).slice(0, 160);
          companyId = String(planData.companyId || companyId);
          companyOwnerId = String(planData.ownerId || '');
        }
      } catch (err) {
        console.warn('[Stripe checkout] Não foi possível consultar plano no Firestore:', err);
      }
    }

    // 2. Determinar valor base da compra
    let baseAmount = 0;
    if (planData) {
      baseAmount = Number(planData.priceSetup ?? planData.price ?? planData.priceMonthly ?? customAmount);
    } else {
      baseAmount = customAmount;
    }

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return fail(res, 400, 'Valor de pagamento inválido.');
    }

    // 3. Buscar dados da empresa se houver companyId
    if (db && companyId) {
      try {
        const companySnap = await db.collection('companies').doc(companyId).get();
        if (companySnap.exists) {
          const company = companySnap.data()!;
          companyName = String(company.name || companyName).slice(0, 160);
          companyOwnerId = companyOwnerId || String(company.ownerId || '');
          if (company.stripeAccountId) {
            companyAccountId = String(company.stripeAccountId);
          }
        }
      } catch (err) {
        console.warn('[Stripe checkout] Erro ao buscar empresa:', err);
      }
    }

    // Se o dono da empresa tiver conta conectada no user_profiles
    if (db && companyOwnerId && !companyAccountId) {
      try {
        const companyProfileSnap = await db.collection('user_profiles').doc(companyOwnerId).get();
        if (companyProfileSnap.exists) {
          const profile = companyProfileSnap.data()!;
          if (profile.stripeAccounts?.empresa) {
            companyAccountId = String(profile.stripeAccounts.empresa);
          }
        }
      } catch (err) {
        console.warn('[Stripe checkout] Erro ao buscar perfil da empresa:', err);
      }
    }

    // 4. Afiliado (se aplicável)
    let affiliateId = '';
    let affiliateAccountId = '';
    let affiliatePercent = 0;
    if (db && affiliateCode) {
      try {
        let affiliationSnap = await db.collection('affiliations').where('affiliateCode', '==', affiliateCode).limit(1).get();
        if (affiliationSnap.empty) affiliationSnap = await db.collection('affiliations').where('affiliate_code', '==', affiliateCode).limit(1).get();
        if (!affiliationSnap.empty) {
          const affiliation = affiliationSnap.docs[0].data();
          const affiliationStatus = String(affiliation.status || '').toLowerCase();
          if (affiliationStatus === 'ativo' || affiliationStatus === 'active') {
            affiliateId = String(affiliation.affiliateId || affiliation.userId || affiliation.user_id || '');
            affiliatePercent = Number(affiliation.commissionPercentage ?? planData?.commissionPercentage ?? 0);
            if (affiliateId) {
              const affiliateProfileSnap = await db.collection('user_profiles').doc(affiliateId).get();
              if (affiliateProfileSnap.exists) {
                const affProfile = affiliateProfileSnap.data()!;
                affiliateAccountId = String(affProfile.stripeAccounts?.afiliado || '');
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Stripe checkout] Erro ao buscar afiliação:', err);
      }
    }

    // 5. Cálculo do Split e Taxa LeadsPay (R$ 0,99)
    const productAmountCents = toCents(baseAmount);
    const grossAmountCents = productAmountCents + 99;
    const split = calculateSplit({ grossAmountCents, affiliatePercent, platformFeeCents: 99, commissionableAmountCents: productAmountCents });
    if (split.companyAmountCents <= 0) return fail(res, 422, 'O preço não cobre a taxa da plataforma e a comissão configurada.');

    const stripe = getStripeTestClient();

    // 6. Verificar se contas conectadas existem e são válidas (sem travar a compra caso estejam em onboarding)
    let validCompanyAccountId = '';
    if (companyAccountId) {
      try {
        const acc = await stripe.accounts.retrieve(companyAccountId);
        if (acc.payouts_enabled || acc.details_submitted) {
          validCompanyAccountId = companyAccountId;
        }
      } catch (err) {
        console.warn('[Stripe Connect account retrieve check]', err);
      }
    }

    const orderId = attemptId;
    let orderRef: any = null;

    if (db) {
      try {
        orderRef = db.collection('stripe_checkout_orders').doc(orderId);
        const existing = await orderRef.get();

        if (existing.exists) {
          const saved = existing.data()!;
          if (saved.stripePaymentIntentId) {
            try {
              const existingIntent = await stripe.paymentIntents.retrieve(String(saved.stripePaymentIntentId));
              if (existingIntent.status === 'succeeded' && saved.status === 'paid') {
                return fail(res, 409, 'Este pagamento já foi concluído. Não tente pagar novamente; confira a confirmação da compra.', 'PAYMENT_ALREADY_COMPLETED');
              }
              if (existingIntent.status === 'succeeded') {
                return fail(res, 503, 'O pagamento foi recebido e está aguardando a confirmação do sistema. Não tente pagar novamente; atualize em alguns instantes.', 'PAYMENT_PROCESSING');
              }
              if (existingIntent.client_secret && existingIntent.status !== 'canceled') {
                return res.status(200).json({ clientSecret: existingIntent.client_secret, orderId });
              }
            } catch {
              // Se não conseguir recuperar o intent anterior, prossegue com nova criação
            }
          }
        }

        const createdAt = new Date();
        const availableAt = new Date(createdAt.getTime() + 9 * 24 * 60 * 60 * 1000);

        await orderRef.set({
          firebaseUid: null,
          planId: planId || 'checkout-dinamico',
          planName,
          companyId: companyId || 'leadspay-direct',
          companyName,
          companyOwnerId: companyOwnerId || null,
          companyAccountId: validCompanyAccountId || null,
          affiliateId: affiliateId || null,
          affiliateName: null,
          affiliateCode: affiliateId ? affiliateCode : null,
          affiliateAccountId: affiliateAccountId || null,
          affiliatePercent,
          buyerName,
          buyerEmail,
          amountCents: split.grossAmountCents,
          productAmountCents,
          platformFeeCents: split.platformFeeCents,
          affiliateAmountCents: split.affiliateAmountCents,
          companyAmountCents: split.companyAmountCents,
          currency: 'brl',
          status: 'checkout_pending',
          transferStatus: 'not_started',
          createdAt: createdAt.toISOString(),
          availableAt: availableAt.toISOString(),
        }, { merge: true });
      } catch (dbSaveErr) {
        console.error('[Stripe checkout] Não foi possível persistir o pedido.');
        return fail(res, 503, 'Não foi possível registrar o pedido. Tente novamente mais tarde.', 'ORDER_STORAGE_UNAVAILABLE');
      }
    }

    // 7. Criar PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: grossAmountCents,
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      receipt_email: buyerEmail,
      description: planName,
      transfer_group: `LP_${orderId}`,
      metadata: { 
        orderId, 
        planId: planId || 'checkout-dinamico', 
        companyId: companyId || 'leadspay-direct', 
        companyOwnerId: companyOwnerId || '', 
        affiliateId: affiliateId || '', 
        buyerName,
        buyerEmail,
        checkoutSource: 'leadspay-elements' 
      },
    }, { idempotencyKey: `leadspay-pi-${orderId}` });

    if (!paymentIntent.client_secret) throw new Error('Stripe não retornou a chave do PaymentIntent.');

    if (orderRef) {
      try {
        await orderRef.set({
          stripePaymentIntentId: paymentIntent.id,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (dbUpdateErr) {
        console.error('[Stripe checkout] Não foi possível vincular o pagamento ao pedido.');
        return fail(res, 503, 'Não foi possível preparar o pagamento. Tente novamente com o mesmo pedido.', 'ORDER_STORAGE_UNAVAILABLE');
      }
    }

    return res.status(200).json({ clientSecret: paymentIntent.client_secret, orderId });
  } catch (error) {
    console.error('[Stripe checkout]', error instanceof Error ? error.message : 'Erro desconhecido');
    return fail(res, 500, 'Não foi possível iniciar o checkout Stripe. Confira os dados e tente novamente.');
  }
}
