import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { profileHasRole, profileRoleStatus } from '../../lib/profileEligibility.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

type Role = 'empresa' | 'afiliado';
const PROFILE_FIELDS = [
  'name', 'firstName', 'lastName', 'email', 'cpf', 'cleanCpf', 'phone', 'whatsapp', 'cep', 'country', 'state', 'city', 'address', 'avatar',
  'companyName', 'companyLegalName', 'companyCnpj', 'cleanCnpj', 'companyDocType', 'documentType', 'companyPhone', 'companyCategory', 'companyTagline',
  'companyWebsite', 'companyLogo', 'companyCep', 'companyCountry', 'companyState', 'companyCity', 'companyAddress',
] as const;

function digits(value: unknown): string { return typeof value === 'string' ? value.replace(/\D/g, '') : ''; }
function validCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^([0-9])\1{10}$/.test(value)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(value[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return (rest === 10 ? 0 : rest) === Number(value[length]);
  };
  return check(9) && check(10);
}
function validCnpj(value: string): boolean {
  if (!/^\d{14}$/.test(value) || /^([0-9])\1{13}$/.test(value)) return false;
  const digit = (base: string, weights: number[]) => {
    const rest = base.split('').reduce((sum, char, index) => sum + Number(char) * weights[index], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(value[12]) && second === Number(value[13]);
}
function nonEmpty(body: Record<string, unknown>, key: string): boolean {
  return typeof body[key] === 'string' && (body[key] as string).trim().length > 0;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Faça login novamente para enviar seu perfil.' });
  }

  try {
    const identity = await verifyFirebaseIdentity(req.headers.authorization);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const role = body.role as Role;
    if (role !== 'empresa' && role !== 'afiliado') return res.status(400).json({ error: 'Tipo de perfil inválido.' });

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil LeadsPay não encontrado. Atualize a página e tente novamente.' });
    const current = profileSnap.data()!;
    const accountType = String(current.accountType || '').toLowerCase();
    if (role === 'afiliado' && !profileHasRole(current, role)) {
      return res.status(403).json({ error: 'O tipo do perfil não corresponde à conta autenticada.' });
    }
    if (current.banned === true || current.status === 'banned') {
      return res.status(403).json({ error: 'Esta conta não pode enviar cadastros.' });
    }

    const currentRoleStatus = profileRoleStatus(current, role);
    const editUnlocked = role === 'empresa' && current.companyProfileEditUnlocked === true;
    if ((currentRoleStatus === 'approved' || currentRoleStatus === 'verified') && !editUnlocked) {
      return res.status(409).json({ error: 'Este perfil já foi aprovado e está bloqueado. Solicite um ajuste à administração.' });
    }
    if ((currentRoleStatus === 'pending' || currentRoleStatus === 'submitted') && !editUnlocked) {
      return res.status(409).json({ error: 'Seu perfil já está em análise.' });
    }

    let stripeAccountId = '';
    if (role === 'empresa') {
      stripeAccountId = String(current.stripeAccounts?.empresa || '').trim();
      if (!stripeAccountId) {
        return res.status(409).json({
          error: 'Conecte e conclua a verificação da Stripe antes de preencher o perfil da empresa.',
          code: 'STRIPE_REQUIRED_FIRST',
        });
      }

      const stripe = getStripeTestClient();
      let account;
      try {
        account = await stripe.accounts.retrieve(stripeAccountId);
      } catch {
        return res.status(409).json({
          error: 'Não foi possível confirmar sua conta Stripe. Atualize a página e tente novamente.',
          code: 'STRIPE_ACCOUNT_UNAVAILABLE',
        });
      }

      if (
        account.metadata?.firebase_uid !== identity.uid ||
        account.metadata?.leadspay_role !== 'empresa'
      ) {
        return res.status(409).json({
          error: 'A conta Stripe conectada não pertence a este perfil LeadsPay.',
          code: 'STRIPE_ACCOUNT_MISMATCH',
        });
      }

      const stripeReady =
        account.details_submitted === true &&
        account.payouts_enabled === true &&
        account.capabilities?.transfers === 'active';

      if (!stripeReady) {
        return res.status(409).json({
          error: 'Finalize todas as etapas da Stripe antes de preencher o perfil da empresa.',
          code: 'STRIPE_NOT_READY',
        });
      }
    }

    const email = role === 'afiliado' ? String(identity.email || '').trim().toLowerCase() : String(body.email || identity.email || '').trim().toLowerCase();
    const phone = String(body.phone || body.whatsapp || body.companyPhone || '').trim();
    const cep = digits(body.cep || body.companyCep);
    const state = String(body.state || body.companyState || '').trim();
    const city = String(body.city || body.companyCity || '').trim();
    const address = String(body.address || body.companyAddress || '').trim();
    if (!email.includes('@') || !phone || cep.length !== 8 || !state || !city || !address) {
      return res.status(400).json({ error: 'Confira e preencha e-mail, telefone e endereço completo antes do envio.' });
    }

    const cpf = digits(body.cleanCpf || body.cpf);
    const companyDocument = digits(body.cleanCnpj || body.companyCnpj || body.cnpj);
    const docType = String(body.companyDocType || body.documentType || 'CNPJ').toUpperCase();
    if (role === 'afiliado') {
      if (!validCpf(cpf)) return res.status(400).json({ error: 'O CPF informado é inválido.' });
      if (!nonEmpty(body, 'name')) return res.status(400).json({ error: 'Informe seu nome completo.' });
    } else {
      if (!nonEmpty(body, 'companyName') || !nonEmpty(body, 'name')) return res.status(400).json({ error: 'Informe o nome da empresa e da pessoa responsável.' });
      const validDocument = companyDocument.length === 11 ? validCpf(companyDocument) : validCnpj(companyDocument);
      if (!validDocument) return res.status(400).json({ error: 'O CPF/CNPJ informado para a empresa é inválido.' });
      if (!['CNPJ', 'CPF', 'MEI', 'SEM_CNPJ'].includes(docType)) return res.status(400).json({ error: 'Selecione um tipo de documento válido.' });
    }

    const documentDigits = role === 'empresa' ? companyDocument : cpf;
    const documentQueries = role === 'empresa'
      ? [db.collection('user_profiles').where('cleanCnpj', '==', documentDigits), db.collection('user_profiles').where('companyCnpj', '==', body.companyCnpj || ''), db.collection('companies').where('cleanCnpj', '==', documentDigits), db.collection('companies').where('cnpj', '==', body.companyCnpj || '')]
      : [db.collection('user_profiles').where('cleanCpf', '==', documentDigits), db.collection('user_profiles').where('cpf', '==', body.cpf || ''), db.collection('companies').where('cleanCpf', '==', documentDigits), db.collection('companies').where('cpf', '==', body.cpf || '')];
    const duplicateSnapshots = await Promise.all(documentQueries.map((query) => query.limit(20).get()));
    const duplicate = duplicateSnapshots.some((snapshot) => snapshot.docs.some((doc) => {
      if (doc.id === identity.uid) return false;
      const record = doc.data();
      if (doc.ref.parent.id === 'companies') return String(record.ownerId || record.submittedBy || '') !== identity.uid;
      return true;
    }));
    if (duplicate) return res.status(409).json({ error: 'Este documento já está associado a outro cadastro LeadsPay.' });

    const now = new Date().toISOString();
    const profileFields: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS) if (field in body) profileFields[field] = body[field];
    profileFields.email = email;
    profileFields.verificationRoleType = role;
    profileFields.activeRoleMode = role;
    profileFields[role === 'empresa' ? 'empresaVerificationStatus' : 'affiliateVerificationStatus'] = 'pending';
    const isCurrentRole = current.activeRoleMode === role || current.verificationRoleType === role || accountType === role || (accountType === 'admin' && role === 'afiliado');
    if (isCurrentRole) {
      profileFields.verificationStatus = 'pending';
      profileFields.kyc_status = 'submitted';
      profileFields.verified = false;
    }
    profileFields.verificationSubmittedAt = now;
    profileFields.verificationRejectionReason = null;
    profileFields.updatedAt = now;
    const batch = db.batch();

    const requestRef = db.collection('verification_requests').doc(identity.uid);
    const requestData: Record<string, unknown> = {
      ...profileFields,
      id: identity.uid,
      userId: identity.uid,
      roleType: role,
      name: String(body.name || '').trim(),
      email,
      phone,
      status: 'pending',
      submittedAt: now,
      kyc_status: 'submitted',
      verified: false,
      rejectionReason: null,
      reviewedAt: null,
    };
    if (role === 'empresa') {
      const companyId = String(current.companyId || `comp-${identity.uid.slice(0, 10)}`);
      const companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();
      if (companySnap.exists && companySnap.data()?.ownerId !== identity.uid) {
        return res.status(409).json({ error: 'O cadastro da empresa não pertence a esta conta.' });
      }
      const companyName = String(body.companyName).trim();

      // A conta Empresa e o documento da empresa precisam compartilhar um único companyId.
      profileFields.companyId = companyId;
      profileFields.companyName = companyName;
      profileFields.hasCompanyProfile = true;
      profileFields.accountType = current.hasAffiliateProfile === true || current.accountType === 'afiliado' || current.accountType === 'ambos'
        ? 'ambos'
        : 'empresa';
      profileFields.activeRoleMode = 'empresa';

      const slug = companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      batch.set(companyRef, {
        ...(companySnap.exists ? {} : { id: companyId, createdAt: now, totalPlansCount: 0, totalAffiliatesCount: 0, totalSalesVolume: 0, commissionRange: '10% - 50%' }),
        stripeAccountId,
        stripeOnboardingStatus: 'connected',
        stripeDetailsSubmitted: true,
        stripePayoutsEnabled: true,
        stripeConnectOwnerId: identity.uid,
        name: companyName,
        slug: slug || companyId,
        tagline: String(body.companyTagline || 'Startup parceira LeadsPay'),
        logo: String(body.companyLogo || body.avatar || ''),
        bannerImage: String(companySnap.data()?.bannerImage || ''),
        category: String(body.companyCategory || 'SaaS / B2B'),
        description: String(body.companyTagline || `Empresa parceira ${companyName} integrada à LeadsPay.`),
        website: String(body.companyWebsite || ''),
        email,
        whatsapp: phone,
        cnpj: docType === 'CPF' || companyDocument.length === 11 ? '' : String(body.companyCnpj || ''),
        cpf: companyDocument.length === 11 ? String(body.companyCnpj || body.cleanCnpj || '') : '',
        cleanCnpj: companyDocument.length === 14 ? companyDocument : '',
        cleanCpf: companyDocument.length === 11 ? companyDocument : '',
        companyDocType: docType,
        status: 'pending',
        kyc_status: 'submitted',
        verified: false,
        ownerId: identity.uid,
        submittedBy: identity.uid,
        submittedByName: String(body.name || '').trim(),
        submittedByEmail: email,
        submittedAt: now,
        updatedAt: now,
      }, { merge: true });
      requestData.companyId = companyId;
      requestData.companyName = companyName;

      batch.set(db.collection('users').doc(identity.uid), {
        companyId,
        companyName,
        hasCompanyProfile: true,
        activeRoleMode: 'empresa',
        companyProfileEditUnlocked: false,
        companyEditRequestStatus: null,
        updatedAt: now,
      }, { merge: true });

      profileFields.companyProfileEditUnlocked = false;
      profileFields.companyEditRequestStatus = null;
      profileFields.companyEditRequestReason = null;
      profileFields.companyEditRequestedAt = null;

      try {
        const stripe = getStripeTestClient();
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (!account.metadata?.leadspay_company_id) {
          await stripe.accounts.update(stripeAccountId, {
            metadata: {
              ...account.metadata,
              firebase_uid: identity.uid,
              leadspay_role: 'empresa',
              leadspay_company_id: companyId,
            },
          });
        }
      } catch (stripeLinkError) {
        console.warn('[Profile submission] Stripe account metadata sync failed:', stripeLinkError instanceof Error ? stripeLinkError.message : 'falha');
      }
    }

    // Só grava o perfil depois que os campos específicos do papel foram
    // resolvidos; assim companyId/accountType e o lock de edição não se perdem.
    batch.set(profileRef, profileFields, { merge: true });
    batch.set(requestRef, {
      ...requestData,
      ...(role === 'empresa' ? {
        companyEditRequestStatus: null,
        companyEditRequestReason: null,
        companyEditRequestedAt: null,
        companyProfileEditUnlocked: false,
      } : {}),
    }, { merge: true });
    await batch.commit();
    return res.status(200).json({ success: true, status: 'pending', submittedAt: now });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Profile submission]', detail);
    const missingAdminConfig = /Credencial privada Firebase Admin não configurada|FIREBASE_SERVICE_ACCOUNT_JSON precisa conter|Credencial Firebase Admin (incompleta|de outro projeto|inválida)/i.test(detail);
    const invalidIdentity = /Firebase ID token (ausente|inválido)|Firebase ID token has|ID token has expired/i.test(detail);
    if (invalidIdentity) return res.status(401).json({ code: 'AUTH_INVALID', error: 'Sua sessão expirou. Entre novamente e reenvie o perfil.' });
    if (missingAdminConfig) return res.status(503).json({ code: 'FIREBASE_ADMIN_NOT_CONFIGURED', error: 'O serviço de validação ainda não está configurado neste ambiente.' });
    return res.status(503).json({ code: 'PROFILE_SUBMISSION_UNAVAILABLE', error: 'Não foi possível enviar o cadastro neste momento. Nenhum dado foi enviado para validação.' });
  }
}
