import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer';

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
    return res.status(401).json({ error: 'Faça login novamente para enviar seu perfil.' });
  }
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return res.status(401).json({ error: 'Faça login novamente para enviar seu perfil.' });
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
    const ownsRole = role === 'empresa'
      ? accountType === 'empresa' || accountType === 'ambos' || current.hasCompanyProfile === true
      : accountType === 'afiliado' || accountType === 'ambos' || current.hasAffiliateProfile === true;
    if (!ownsRole || accountType === 'admin') return res.status(403).json({ error: 'O tipo do perfil não corresponde à conta autenticada.' });
    if (current.banned === true || current.status === 'banned') return res.status(403).json({ error: 'Esta conta não pode enviar cadastros.' });
    if (current.verified === true || current.verificationStatus === 'approved') return res.status(409).json({ error: 'Este perfil já foi aprovado.' });
    if (current.verificationStatus === 'pending') return res.status(409).json({ error: 'Seu perfil já está em análise.' });

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
    profileFields.verificationStatus = 'pending';
    profileFields.kyc_status = 'submitted';
    profileFields.verified = false;
    profileFields.verificationSubmittedAt = now;
    profileFields.verificationRejectionReason = null;
    profileFields.updatedAt = now;
    const batch = db.batch();
    batch.set(profileRef, profileFields, { merge: true });

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
      const slug = companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      batch.set(companyRef, {
        ...(companySnap.exists ? {} : { id: companyId, createdAt: now, totalPlansCount: 0, totalAffiliatesCount: 0, totalSalesVolume: 0, commissionRange: '10% - 50%' }),
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
    }
    batch.set(requestRef, requestData, { merge: true });
    await batch.commit();
    return res.status(200).json({ success: true, status: 'pending', submittedAt: now });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Profile submission]', detail);
    return res.status(503).json({ error: 'Não foi possível enviar o cadastro neste momento. Tente novamente mais tarde.' });
  }
}
