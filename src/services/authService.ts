import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS, DEFAULT_USER_ID, sanitizeForFirestore } from './firestoreService';
import { UserSellerProfile, CompanyStartup, UserRoleMode } from '../types/platform';
import { isSuperAdminEmail, ADMIN_EMAILS, INITIAL_USER_PROFILE } from '../data/platformData';

export interface RegisterAffiliateData {
  name: string;
  email: string;
  password: string;
  whatsapp?: string;
  cpf?: string;
  pixKey?: string;
  pixKeyType?: string;
}

export interface RegisterCompanyData {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
  whatsapp?: string;
  documentType?: 'CNPJ' | 'CPF' | 'SEM_CNPJ';
  cnpj?: string;
  cpf?: string;
  hasNoCnpj?: boolean;
  category: string;
  website?: string;
  tagline?: string;
  description?: string;
  logo?: string;
}

export interface AuthResult {
  user: User;
  profile: UserSellerProfile;
  company?: CompanyStartup;
}

/**
 * Remove any non-numeric character
 */
export function cleanDigits(value: string = ''): string {
  return value.replace(/\D/g, '');
}

/**
 * Format CPF: 000.000.000-00
 */
export function formatCPF(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Format CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Format Brazilian Phone / WhatsApp: (00) 00000-0000 or (00) 0000-0000
 */
export function formatPhone(value: string = ''): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validates Brazilian CPF format
 */
export function isValidCPF(cpf: string = ''): boolean {
  const clean = cleanDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Validates Brazilian CNPJ format
 */
export function isValidCNPJ(cnpj: string = ''): boolean {
  const clean = cleanDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Check if a CPF is already registered to a DIFFERENT user
 */
export async function checkCpfAlreadyExists(cpf: string, currentUserId?: string): Promise<boolean> {
  const clean = cleanDigits(cpf);
  if (!clean || clean.length !== 11) return false;

  try {
    const formatted = formatCPF(clean);
    const profilesColl = collection(db, COLLECTIONS.PROFILES);
    
    // Query by cleanCpf
    const q1 = query(profilesColl, where('cleanCpf', '==', clean));
    const snap1 = await getDocs(q1);
    const conflictingDocs1 = snap1.docs.filter(d => 
      d.id !== DEFAULT_USER_ID && (!currentUserId || d.id !== currentUserId)
    );
    if (conflictingDocs1.length > 0) return true;

    // Query by formatted cpf
    const q2 = query(profilesColl, where('cpf', '==', formatted));
    const snap2 = await getDocs(q2);
    const conflictingDocs2 = snap2.docs.filter(d => 
      d.id !== DEFAULT_USER_ID && (!currentUserId || d.id !== currentUserId)
    );
    if (conflictingDocs2.length > 0) return true;

    return false;
  } catch (err) {
    console.warn('Verificação de CPF secundária:', err);
    return false;
  }
}

/**
 * Check if a CNPJ is already registered to a DIFFERENT company
 */
export async function checkCnpjAlreadyExists(cnpj: string, currentOwnerId?: string): Promise<boolean> {
  const clean = cleanDigits(cnpj);
  if (!clean || clean.length !== 14) return false;

  try {
    const formatted = formatCNPJ(clean);
    const companiesColl = collection(db, COLLECTIONS.COMPANIES);
    
    const q1 = query(companiesColl, where('cleanCnpj', '==', clean));
    const snap1 = await getDocs(q1);
    const conflictingDocs1 = snap1.docs.filter(d => 
      !currentOwnerId || (d.data() as any).ownerId !== currentOwnerId
    );
    if (conflictingDocs1.length > 0) return true;

    const q2 = query(companiesColl, where('cnpj', '==', formatted));
    const snap2 = await getDocs(q2);
    const conflictingDocs2 = snap2.docs.filter(d => 
      !currentOwnerId || (d.data() as any).ownerId !== currentOwnerId
    );
    if (conflictingDocs2.length > 0) return true;

    return false;
  } catch (err) {
    console.warn('Verificação de CNPJ secundária:', err);
    return false;
  }
}

/**
 * Maps Firebase Auth, Firestore and Custom error codes to friendly Portuguese messages
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Ocorreu um erro ao processar. Tente novamente.';

  const code: string = typeof error === 'string' 
    ? error 
    : (error.code || error.message || error.toString() || '');

  // Custom Application Errors
  if (code.includes('custom/invalid-cpf') || code.includes('invalid-cpf')) {
    return 'O CPF informado é inválido. Por favor, verifique os 11 dígitos digitados.';
  }
  if (code.includes('custom/invalid-cnpj') || code.includes('invalid-cnpj')) {
    return 'O CNPJ informado é inválido. Por favor, verifique os 14 dígitos digitados.';
  }
  if (code.includes('custom/cpf-already-in-use') || code.includes('cpf-already-in-use')) {
    return 'Este CPF já está vinculado a outra conta no LeadsPay. Cada afiliado pode possuir apenas uma conta por CPF.';
  }
  if (code.includes('custom/cnpj-already-in-use') || code.includes('cnpj-already-in-use')) {
    return 'Este CNPJ já está cadastrado em outra empresa parceira no LeadsPay.';
  }
  if (code.includes('custom/affiliate-cannot-create-company') || code.includes('affiliate-cannot-create-company')) {
    return 'Este e-mail já está cadastrado como AFILIADO. Por segurança e regras da plataforma, uma conta de afiliado não pode ser usada para cadastrar empresa. Utilize um e-mail diferente para a sua Empresa/Startup.';
  }
  if (code.includes('custom/company-cannot-create-affiliate') || code.includes('company-cannot-create-affiliate')) {
    return 'Este e-mail já está cadastrado como EMPRESA. Por segurança e regras da plataforma, contas corporativas não podem ser usadas para atuar como afiliado. Utilize um e-mail pessoal diferente para sua conta de Afiliado.';
  }
  if (code.includes('custom/email-already-in-use')) {
    return 'Este e-mail já possui uma conta no LeadsPay. Você pode fazer login diretamente com sua senha.';
  }

  // Firebase Authentication Errors
  if (code.includes('auth/email-already-in-use')) {
    return 'Este e-mail já possui uma conta cadastrada no LeadsPay. Por favor, utilize a aba "Fazer Login" ou recupere sua senha.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'O formato do e-mail informado é inválido. Digite um e-mail válido (ex: seuemail@exemplo.com).';
  }
  if (code.includes('auth/weak-password')) {
    return 'A senha é muito fraca. Digite pelo menos 6 caracteres seguros.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'Nenhuma conta encontrada com este e-mail. Crie sua conta gratuitamente.';
  }
  if (code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais ou utilize a recuperação de senha.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Muitas tentativas em sequência. Por segurança, aguarde alguns instantes e tente novamente.';
  }
  if (code.includes('auth/user-disabled')) {
    return 'Esta conta de usuário foi temporariamente desativada pelo administrador.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Falha de conexão com os servidores do Firebase. Verifique sua internet e tente novamente.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'A janela de autenticação com o Google foi fechada antes de concluir o login.';
  }
  if (code.includes('auth/cancelled-popup-request')) {
    return 'A autenticação popup foi cancelada.';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'A janela popup foi bloqueada pelo seu navegador. Habilite popups para este site nas configurações do navegador.';
  }
  if (code.includes('auth/unauthorized-domain')) {
    return 'Este domínio ainda não foi autorizado no Firebase Console. Adicione seu domínio da Vercel (techify-gaming.vercel.app) em Firebase Console -> Authentication -> Configurações -> Domínios autorizados.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Este método de login (E-mail ou Google) ainda não está habilitado no Firebase Console. Acesse Authentication -> Sign-in method e ative o provedor.';
  }
  if (code.includes('auth/configuration-not-found')) {
    return 'Configuração de autenticação não encontrada no Firebase Console.';
  }

  // Firestore Errors
  if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED')) {
    return 'Permissão negada no banco de dados Firestore. Verifique as Regras de Segurança (firestore.rules) no Firebase Console.';
  }
  if (code.includes('unavailable')) {
    return 'Serviço temporariamente indisponível. Verifique sua conexão e tente novamente.';
  }

  if (code.startsWith('custom/')) {
    return code.replace('custom/', '');
  }

  return 'Ocorreu um erro ao processar. Verifique os dados informados e tente novamente.';
}

/**
 * Cadastrar Afiliado Real no Firebase Auth e Firestore
 * Se o usuário já existir no Auth com a mesma senha (ex: recadastro ou teste), efetua login e atualiza perfil sem erro.
 */
export async function registerAffiliate(data: RegisterAffiliateData): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const cleanCpf = data.cpf ? cleanDigits(data.cpf) : '';
  const formattedCpf = cleanCpf ? formatCPF(cleanCpf) : '';

  // 0. Pre-verificação: Garantir que não existe conta cadastrada como EMPRESA com este e-mail
  try {
    const compQ = query(collection(db, COLLECTIONS.PROFILES), where('email', '==', normalizedEmail));
    const compSnap = await getDocs(compQ);
    if (!compSnap.empty) {
      const existing = compSnap.docs[0].data() as UserSellerProfile;
      const isCompany = existing.accountType === 'empresa' || 
                        existing.hasCompanyProfile === true || 
                        Boolean(existing.companyId) || 
                        existing.activeRoleMode === 'empresa';
      if (isCompany) {
        const err = new Error('custom/company-cannot-create-affiliate');
        (err as any).code = 'custom/company-cannot-create-affiliate';
        throw err;
      }
    }
  } catch (checkErr: any) {
    if (checkErr.code === 'custom/company-cannot-create-affiliate') {
      throw checkErr;
    }
  }

  // 1. Validar CPF se fornecido completo
  if (cleanCpf && cleanCpf.length === 11) {
    if (!isValidCPF(cleanCpf)) {
      const err = new Error('custom/invalid-cpf');
      (err as any).code = 'custom/invalid-cpf';
      throw err;
    }
  }

  let user: User;

  try {
    // Tentar criar nova conta no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
    user = userCredential.user;
  } catch (authError: any) {
    if (authError.code === 'auth/email-already-in-use') {
      // Se a conta já existe, tentar entrar com a senha fornecida pelo usuário
      try {
        const loginCredential = await signInWithEmailAndPassword(auth, normalizedEmail, data.password);
        user = loginCredential.user;
      } catch (loginError: any) {
        // Se a senha estiver incorreta para a conta existente, lançar erro amigável
        const err = new Error('auth/email-already-in-use');
        (err as any).code = 'auth/email-already-in-use';
        throw err;
      }
    } else {
      throw authError;
    }
  }

  // 2. Verificar se CPF está em uso por OUTRO usuário diferente
  if (cleanCpf && cleanCpf.length === 11) {
    const cpfExists = await checkCpfAlreadyExists(cleanCpf, user.uid);
    if (cpfExists) {
      const err = new Error('custom/cpf-already-in-use');
      (err as any).code = 'custom/cpf-already-in-use';
      throw err;
    }
  }

  // 3. Atualizar Display Name no Firebase Auth
  try {
    await updateProfile(user, { displayName: data.name.trim() });
  } catch (err) {
    console.warn('Erro ao atualizar displayName no Auth:', err);
  }

  const now = new Date().toISOString();
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name.trim())}`;

  // 4. Buscar perfil existente para verificar se a conta já era empresa
  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const existingSnap = await getDoc(profileRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as UserSellerProfile) : null;

  if (existingData) {
    const isCompany = existingData.accountType === 'empresa' || 
                      existingData.hasCompanyProfile === true || 
                      Boolean(existingData.companyId) || 
                      existingData.activeRoleMode === 'empresa';
    if (isCompany) {
      const err = new Error('custom/company-cannot-create-affiliate');
      (err as any).code = 'custom/company-cannot-create-affiliate';
      throw err;
    }
  }

  const profile: UserSellerProfile = {
    userId: user.uid,
    name: data.name.trim(),
    email: normalizedEmail,
    role: 'Afiliado de Alta Performance',
    avatar: existingData?.avatar || avatar,
    pixKey: data.pixKey?.trim() || formattedCpf || existingData?.pixKey || '',
    pixKeyType: data.pixKeyType || existingData?.pixKeyType || 'CPF',
    availableBalance: existingData?.availableBalance ?? 0,
    pendingBalance: existingData?.pendingBalance ?? 0,
    totalEarned: existingData?.totalEarned ?? 0,
    totalSalesCount: existingData?.totalSalesCount ?? 0,
    partnerLevel: existingData?.partnerLevel || 'Afiliado Starter',
    targetGoal: existingData?.targetGoal || 100000,
    currentSalesProgress: existingData?.currentSalesProgress || 0,
    accountType: 'afiliado',
    hasAffiliateProfile: true,
    hasCompanyProfile: false,
    activeRoleMode: 'afiliado',
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : (existingData?.whatsapp || ''),
    cpf: formattedCpf || existingData?.cpf || '',
    cleanCpf: cleanCpf || existingData?.cleanCpf || '',
    companyId: undefined,
    companyName: undefined,
    cnpj: undefined,
    cleanCnpj: undefined,
    verificationRoleType: 'afiliado',
    verified: existingData?.verified ?? false,
    verificationStatus: existingData?.verificationStatus ?? 'pending',
    updatedAt: now
  };

  // Salvar perfil atualizado no Firestore
  await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });

  // Criar ou atualizar verificação do afiliado
  try {
    const verifRef = doc(db, COLLECTIONS.VERIFICATIONS, user.uid);
    const verifData = {
      id: user.uid,
      userId: user.uid,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.whatsapp ? formatPhone(data.whatsapp) : '',
      cpf: formattedCpf || '',
      pixKey: data.pixKey?.trim() || formattedCpf || '',
      pixKeyType: data.pixKeyType || 'CPF',
      roleType: 'afiliado',
      status: existingData?.verificationStatus || 'pending',
      avatar,
      submittedAt: now
    };
    await setDoc(verifRef, sanitizeForFirestore(verifData), { merge: true });
  } catch (verifErr) {
    console.warn('Erro ao registrar verificação de afiliado:', verifErr);
  }

  return { user, profile };
}

/**
 * Cadastrar Empresa / Startup Real no Firebase Auth e Firestore
 */
export async function registerCompany(data: RegisterCompanyData): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  
  const docType = data.documentType || (data.cnpj ? 'CNPJ' : data.cpf ? 'CPF' : data.hasNoCnpj ? 'SEM_CNPJ' : 'CNPJ');
  const cleanCnpj = data.cnpj ? cleanDigits(data.cnpj) : '';
  const formattedCnpj = cleanCnpj ? formatCNPJ(cleanCnpj) : '';
  const cleanCpf = data.cpf ? cleanDigits(data.cpf) : '';
  const formattedCpf = cleanCpf ? formatCPF(cleanCpf) : '';

  // 1. Validar formato de CNPJ se informado como tipo CNPJ
  if (docType === 'CNPJ' && cleanCnpj) {
    if (cleanCnpj.length === 14 && !isValidCNPJ(cleanCnpj)) {
      const err = new Error('custom/invalid-cnpj');
      (err as any).code = 'custom/invalid-cnpj';
      throw err;
    }
  }

  // Validar formato de CPF se informado como tipo CPF
  if (docType === 'CPF' && cleanCpf) {
    if (cleanCpf.length === 11 && !isValidCPF(cleanCpf)) {
      const err = new Error('custom/invalid-cpf');
      (err as any).code = 'custom/invalid-cpf';
      throw err;
    }
  }

  let user: User;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
    user = userCredential.user;
  } catch (authError: any) {
    if (authError.code === 'auth/email-already-in-use') {
      try {
        const loginCredential = await signInWithEmailAndPassword(auth, normalizedEmail, data.password);
        user = loginCredential.user;
      } catch (loginError: any) {
        const err = new Error('auth/email-already-in-use');
        (err as any).code = 'auth/email-already-in-use';
        throw err;
      }
    } else {
      throw authError;
    }
  }

  // 2. Obter perfil existente se houver
  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const existingSnap = await getDoc(profileRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as UserSellerProfile) : null;

  // Buscar empresa existente por ownerId ou submittedBy ou existingData.companyId
  let existingCompany: CompanyStartup | null = null;
  const compQ = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', user.uid));
  const compSnap = await getDocs(compQ);

  if (!compSnap.empty) {
    const d = compSnap.docs[0];
    existingCompany = { id: d.id, ...(d.data() as Omit<CompanyStartup, 'id'>) };
  } else if (existingData?.companyId) {
    const cDoc = await getDoc(doc(db, COLLECTIONS.COMPANIES, existingData.companyId));
    if (cDoc.exists()) {
      existingCompany = { id: cDoc.id, ...(cDoc.data() as Omit<CompanyStartup, 'id'>) };
    }
  }

  const now = new Date().toISOString();

  // Se já existe empresa cadastrada para este usuário / conta:
  if (existingCompany) {
    const updatedProfile: UserSellerProfile = {
      ...existingData,
      userId: user.uid,
      name: existingData?.name || data.ownerName.trim() || user.displayName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role: 'Fundador / Startup',
      avatar: existingCompany.logo || existingData?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(existingCompany.name)}`,
      pixKey: existingData?.pixKey || '',
      pixKeyType: existingData?.pixKeyType || 'Chave Aleatória',
      availableBalance: existingData?.availableBalance ?? 0,
      pendingBalance: existingData?.pendingBalance ?? 0,
      totalEarned: existingData?.totalEarned ?? 0,
      totalSalesCount: existingData?.totalSalesCount ?? 0,
      partnerLevel: 'Empresa Parceira',
      targetGoal: 500000,
      currentSalesProgress: existingData?.currentSalesProgress || 0,
      accountType: 'empresa',
      hasAffiliateProfile: false,
      hasCompanyProfile: true,
      activeRoleMode: 'empresa',
      companyId: existingCompany.id,
      companyName: existingCompany.name,
      companyLegalName: existingCompany.name,
      companyCategory: existingCompany.category || data.category || 'SaaS / B2B',
      companyTagline: existingCompany.tagline,
      companyWebsite: existingCompany.website,
      companyLogo: existingCompany.logo,
      companyPhone: existingCompany.whatsapp || (data.whatsapp ? formatPhone(data.whatsapp) : ''),
      companyDocType: docType as any,
      whatsapp: existingData?.whatsapp || (data.whatsapp ? formatPhone(data.whatsapp) : ''),
      cpf: existingData?.cpf || (docType === 'CPF' ? formattedCpf : ''),
      cleanCpf: existingData?.cleanCpf || (docType === 'CPF' ? cleanCpf : ''),
      cnpj: existingCompany.cnpj || existingData?.cnpj || (docType === 'CNPJ' ? formattedCnpj : ''),
      cleanCnpj: existingCompany.cleanCnpj || existingData?.cleanCnpj || (docType === 'CNPJ' ? cleanCnpj : ''),
      companyCnpj: existingCompany.cnpj || (docType === 'CNPJ' ? formattedCnpj : (docType === 'CPF' ? formattedCpf : '')),
      verificationRoleType: 'empresa',
      verified: existingCompany.verified ?? existingData?.verified ?? false,
      verificationStatus: existingCompany.status === 'approved' ? 'approved' : (existingData?.verificationStatus || 'pending'),
      kyc_status: existingCompany.status === 'approved' ? 'verified' : 'submitted',
      updatedAt: now
    };

    await setDoc(profileRef, sanitizeForFirestore(updatedProfile), { merge: true });

    // Atualizar verificação vinculada
    try {
      const verifData = {
        id: user.uid,
        userId: user.uid,
        name: existingCompany.name,
        firstName: data.ownerName.trim(),
        email: normalizedEmail,
        phone: data.whatsapp ? formatPhone(data.whatsapp) : '',
        avatar: existingCompany.logo,
        roleType: 'empresa',
        companyId: existingCompany.id,
        companyName: existingCompany.name,
        companyCnpj: existingCompany.cnpj || (docType === 'CNPJ' ? formattedCnpj : ''),
        status: existingCompany.status === 'approved' ? 'approved' : 'pending',
        submittedAt: now
      };
      await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, user.uid), sanitizeForFirestore(verifData), { merge: true });
      await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, existingCompany.id), sanitizeForFirestore(verifData), { merge: true });
    } catch (vErr) {}

    return {
      user,
      profile: updatedProfile,
      company: existingCompany
    };
  }

  // 3. Verificar se CNPJ já existe em outra empresa (se aplicável)
  if (docType === 'CNPJ' && cleanCnpj && cleanCnpj.length === 14) {
    const cnpjExists = await checkCnpjAlreadyExists(cleanCnpj, user.uid);
    if (cnpjExists) {
      const err = new Error('custom/cnpj-already-in-use');
      (err as any).code = 'custom/cnpj-already-in-use';
      throw err;
    }
  }

  // 4. Atualizar Display Name no Firebase Auth
  try {
    await updateProfile(user, { displayName: data.ownerName.trim() });
  } catch (err) {
    console.warn('Erro ao atualizar displayName no Auth:', err);
  }

  const companyId = `comp-${user.uid.slice(0, 10)}`;
  const slug = data.companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  const defaultLogo = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.companyName.trim())}`;
  const logo = data.logo?.trim() || defaultLogo;
  const bannerImage = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';

  // 1. Criar/Atualizar Empresa no Firestore
  const company: CompanyStartup = {
    id: companyId,
    name: data.companyName.trim(),
    slug: slug || companyId,
    tagline: data.tagline?.trim() || `${data.category || 'SaaS / B2B'} de alta performance e escala comercial`,
    logo,
    bannerImage,
    category: (data.category as any) || 'SaaS / B2B',
    description: data.description?.trim() || `Empresa parceira ${data.companyName.trim()} integrada ao ecossistema LeadsPay.`,
    website: data.website?.trim() || 'https://leadspay.com',
    email: normalizedEmail,
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : '',
    totalPlansCount: 0,
    totalAffiliatesCount: 0,
    totalSalesVolume: 0,
    commissionRange: '30% - 50%',
    verified: false,
    status: 'pending',
    ownerId: user.uid,
    submittedBy: user.uid,
    submittedByName: data.ownerName.trim(),
    submittedByEmail: normalizedEmail,
    docType: docType as any,
    cnpj: docType === 'CNPJ' ? formattedCnpj : undefined,
    cleanCnpj: docType === 'CNPJ' ? cleanCnpj : undefined,
    cpf: docType === 'CPF' ? formattedCpf : undefined,
    cleanCpf: docType === 'CPF' ? cleanCpf : undefined,
    hasNoCnpj: docType === 'SEM_CNPJ',
    createdAt: now
  };

  await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), sanitizeForFirestore(company), { merge: true });

  // 2. Criar/Atualizar Perfil de Usuário como EMPRESA estrita
  const profile: UserSellerProfile = {
    userId: user.uid,
    name: data.ownerName.trim(),
    email: normalizedEmail,
    role: 'Fundador / Startup',
    avatar: logo,
    pixKey: existingData?.pixKey || '',
    pixKeyType: existingData?.pixKeyType || 'Chave Aleatória',
    availableBalance: existingData?.availableBalance ?? 0,
    pendingBalance: existingData?.pendingBalance ?? 0,
    totalEarned: existingData?.totalEarned ?? 0,
    totalSalesCount: existingData?.totalSalesCount ?? 0,
    partnerLevel: 'Empresa Parceira',
    targetGoal: 500000,
    currentSalesProgress: existingData?.currentSalesProgress || 0,
    accountType: 'empresa',
    hasAffiliateProfile: false,
    hasCompanyProfile: true,
    activeRoleMode: 'empresa',
    companyId: companyId,
    companyName: data.companyName.trim(),
    companyLegalName: data.companyName.trim(),
    companyCnpj: docType === 'CNPJ' ? formattedCnpj : (docType === 'CPF' ? formattedCpf : ''),
    cleanCnpj: docType === 'CNPJ' ? cleanCnpj : (docType === 'CPF' ? cleanCpf : ''),
    companyDocType: docType as any,
    companyCategory: data.category || 'SaaS / B2B',
    companyTagline: company.tagline,
    companyWebsite: company.website,
    companyLogo: logo,
    companyPhone: data.whatsapp ? formatPhone(data.whatsapp) : '',
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : (existingData?.whatsapp || ''),
    phone: data.whatsapp ? formatPhone(data.whatsapp) : (existingData?.whatsapp || ''),
    cpf: docType === 'CPF' ? formattedCpf : '',
    cleanCpf: docType === 'CPF' ? cleanCpf : '',
    cnpj: docType === 'CNPJ' ? formattedCnpj : '',
    verificationRoleType: 'empresa',
    verificationStatus: 'pending',
    kyc_status: 'submitted',
    verified: false,
    verificationSubmittedAt: now,
    updatedAt: now
  };

  await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });

  // 3. Criar registro de verificação para a fila de "Aprovação de Empresas" do Super Painel Admin
  try {
    const verifData = {
      id: user.uid,
      userId: user.uid,
      name: data.companyName.trim(),
      firstName: data.ownerName.trim(),
      email: normalizedEmail,
      phone: data.whatsapp ? formatPhone(data.whatsapp) : '',
      avatar: logo,
      roleType: 'empresa',
      companyId: companyId,
      companyName: data.companyName.trim(),
      companyLegalName: data.companyName.trim(),
      companyCnpj: docType === 'CNPJ' ? formattedCnpj : (docType === 'CPF' ? formattedCpf : ''),
      companyCategory: data.category || 'SaaS / B2B',
      companyTagline: company.tagline,
      companyWebsite: company.website,
      companyLogo: logo,
      companyPhone: data.whatsapp ? formatPhone(data.whatsapp) : '',
      companyDocType: docType as any,
      status: 'pending',
      kyc_status: 'submitted',
      submittedAt: now
    };

    await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, user.uid), sanitizeForFirestore(verifData), { merge: true });
    await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, companyId), sanitizeForFirestore(verifData), { merge: true });
  } catch (vErr) {
    console.warn('Erro ao salvar registro de verificação de empresa:', vErr);
  }

  return { user, profile, company };
}

/**
 * Login de Usuário (Afiliado ou Empresa) com E-mail e Senha
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCredential.user;

  // Buscar perfil no Firestore
  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const profileSnap = await getDoc(profileRef);

  let profile: UserSellerProfile;

  if (profileSnap.exists()) {
    profile = profileSnap.data() as UserSellerProfile;
    const isAdm = isSuperAdminEmail(normalizedEmail) || profile.accountType === 'admin' || profile.role === 'Administrador do Sistema';
    
    if (isAdm) {
      profile.accountType = 'admin';
      profile.activeRoleMode = 'admin';
      profile.role = 'Administrador do Sistema';
      profile.partnerLevel = 'Super Administrador';
      profile.hasCompanyProfile = false;
      profile.hasAffiliateProfile = false;
    } else {
      const isCompany = profile.accountType === 'empresa' || 
                        profile.hasCompanyProfile === true || 
                        Boolean(profile.companyId) || 
                        Boolean(profile.companyName) ||
                        profile.activeRoleMode === 'empresa' ||
                        (typeof profile.role === 'string' && (
                          profile.role.toLowerCase().includes('startup') || 
                          profile.role.toLowerCase().includes('empresa') || 
                          profile.role.toLowerCase().includes('produtor') ||
                          profile.role.toLowerCase().includes('fundador')
                        ));
      profile.accountType = isCompany ? 'empresa' : 'afiliado';
      profile.activeRoleMode = isCompany ? 'empresa' : 'afiliado';
      profile.hasCompanyProfile = isCompany;
      profile.hasAffiliateProfile = !isCompany;
      if (isCompany && (!profile.role || profile.role === 'Afiliado de Alta Performance')) {
        profile.role = 'Fundador / Startup';
        profile.partnerLevel = 'Empresa Parceira';
      }
    }
  } else {
    // Tentar localizar por e-mail em caso de migração
    const profilesColl = collection(db, COLLECTIONS.PROFILES);
    const q = query(profilesColl, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);

    if (!snap.empty) {
      profile = snap.docs[0].data() as UserSellerProfile;
      const isAdm = isSuperAdminEmail(normalizedEmail) || profile.accountType === 'admin' || profile.role === 'Administrador do Sistema';
      
      if (isAdm) {
        profile.accountType = 'admin';
        profile.activeRoleMode = 'admin';
        profile.role = 'Administrador do Sistema';
        profile.partnerLevel = 'Super Administrador';
        profile.hasCompanyProfile = false;
        profile.hasAffiliateProfile = false;
      } else {
        const isCompany = profile.accountType === 'empresa' || 
                          profile.hasCompanyProfile === true || 
                          Boolean(profile.companyId) || 
                          Boolean(profile.companyName) ||
                          profile.activeRoleMode === 'empresa' ||
                          (typeof profile.role === 'string' && (
                            profile.role.toLowerCase().includes('startup') || 
                            profile.role.toLowerCase().includes('empresa') || 
                            profile.role.toLowerCase().includes('produtor') ||
                            profile.role.toLowerCase().includes('fundador')
                          ));
        profile.accountType = isCompany ? 'empresa' : 'afiliado';
        profile.activeRoleMode = isCompany ? 'empresa' : 'afiliado';
        profile.hasCompanyProfile = isCompany;
        profile.hasAffiliateProfile = !isCompany;
        if (isCompany && (!profile.role || profile.role === 'Afiliado de Alta Performance')) {
          profile.role = 'Fundador / Startup';
          profile.partnerLevel = 'Empresa Parceira';
        }
      }
      await setDoc(profileRef, sanitizeForFirestore({ ...profile, userId: user.uid }), { merge: true });
    } else {
      const isAdm = isSuperAdminEmail(normalizedEmail);
      profile = {
        userId: user.uid,
        name: user.displayName || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: isAdm ? 'Administrador do Sistema' : 'Afiliado de Alta Performance',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
        pixKey: '',
        pixKeyType: 'Chave Aleatória',
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalSalesCount: 0,
        partnerLevel: isAdm ? 'Super Administrador' : 'Afiliado Starter',
        targetGoal: 100000,
        currentSalesProgress: 0,
        accountType: isAdm ? 'admin' : 'afiliado',
        hasAffiliateProfile: !isAdm,
        hasCompanyProfile: false,
        activeRoleMode: isAdm ? 'admin' : 'afiliado',
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, sanitizeForFirestore(profile));
    }
  }

  return { user, profile };
}

/**
 * Login / Cadastro Rápido com Google
 */
export async function loginWithGoogle(preferredRole: UserRoleMode = 'afiliado'): Promise<AuthResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const isAdm = isSuperAdminEmail(normalizedEmail);

  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  let profile: UserSellerProfile;

  try {
    const profileSnap = await getDoc(profileRef);
    const existing = profileSnap.exists() ? (profileSnap.data() as UserSellerProfile) : null;

    if (isAdm) {
      profile = {
        ...INITIAL_USER_PROFILE,
        ...existing,
        userId: user.uid,
        name: user.displayName || existing?.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: 'Administrador do Sistema',
        avatar: user.photoURL || existing?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
        partnerLevel: 'Super Administrador',
        accountType: 'admin',
        hasAffiliateProfile: false,
        hasCompanyProfile: false,
        activeRoleMode: 'admin',
        verified: true,
        verificationStatus: 'approved',
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });
      return { user, profile };
    }

    // Verificar se o usuário já possui empresa registrada no Firestore
    let existingUserCompanyId: string | undefined = existing?.companyId;
    let existingUserCompanyName: string | undefined = existing?.companyName;
    let hasCompany = Boolean(existingUserCompanyId);

    const compQ = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', user.uid));
    const compSnap = await getDocs(compQ);
    if (!compSnap.empty) {
      const userComp = compSnap.docs[0];
      existingUserCompanyId = userComp.id;
      existingUserCompanyName = userComp.data()?.name || userComp.data()?.companyName;
      hasCompany = true;
    }

    // Se o usuário clicou na aba Empresa OU já é uma Empresa previamente registrada:
    const isCompanyRegistration = preferredRole === 'empresa' || hasCompany || existing?.accountType === 'empresa' || existing?.hasCompanyProfile === true;

    if (isCompanyRegistration) {
      const now = new Date().toISOString();
      const companyId = existingUserCompanyId || `comp-${user.uid.slice(0, 10)}`;
      const companyName = existingUserCompanyName || (user.displayName ? `${user.displayName} (Startup)` : 'Minha Startup');
      const companyLogo = user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(companyName)}`;

      // Se ainda não existir empresa na coleção 'companies', criá-la imediatamente para o Super Admin gerenciar
      if (!hasCompany) {
        const newCompany: CompanyStartup = {
          id: companyId,
          name: companyName,
          slug: companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          tagline: 'SaaS / B2B de alta performance e escala comercial',
          logo: companyLogo,
          bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
          category: 'SaaS / B2B',
          description: `Empresa parceira ${companyName} integrada ao ecossistema LeadsPay.`,
          website: 'https://leadspay.com',
          email: normalizedEmail,
          whatsapp: '',
          totalPlansCount: 0,
          totalAffiliatesCount: 0,
          totalSalesVolume: 0,
          commissionRange: '30% - 50%',
          verified: false,
          status: 'pending',
          ownerId: user.uid,
          submittedBy: user.uid,
          submittedByName: user.displayName || 'Produtor',
          submittedByEmail: normalizedEmail,
          createdAt: now
        };
        await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), sanitizeForFirestore(newCompany), { merge: true });

        // Criar registro na fila de verificação de empresas
        const verifData = {
          id: user.uid,
          userId: user.uid,
          name: companyName,
          firstName: user.displayName || 'Produtor',
          email: normalizedEmail,
          phone: '',
          avatar: companyLogo,
          roleType: 'empresa',
          companyId: companyId,
          companyName: companyName,
          companyCategory: 'SaaS / B2B',
          status: 'pending',
          kyc_status: 'submitted',
          submittedAt: now
        };
        await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, user.uid), sanitizeForFirestore(verifData), { merge: true });
        await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, companyId), sanitizeForFirestore(verifData), { merge: true });
      }

      profile = {
        ...INITIAL_USER_PROFILE,
        ...existing,
        userId: user.uid,
        name: user.displayName || existing?.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: 'Fundador / Startup',
        avatar: companyLogo,
        partnerLevel: 'Empresa Parceira',
        targetGoal: 500000,
        accountType: 'empresa',
        hasAffiliateProfile: false,
        hasCompanyProfile: true,
        activeRoleMode: 'empresa',
        companyId: companyId,
        companyName: companyName,
        verificationRoleType: 'empresa',
        verificationStatus: existing?.verificationStatus || 'pending',
        verified: existing?.verified ?? false,
        updatedAt: now
      };
      await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });
    } else {
      // Afiliado de Alta Performance
      const avatar = user.photoURL || existing?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`;
      profile = {
        ...INITIAL_USER_PROFILE,
        ...existing,
        userId: user.uid,
        name: user.displayName || existing?.name || normalizedEmail.split('@')[0] || 'Afiliado LeadsPay',
        email: normalizedEmail,
        role: 'Afiliado de Alta Performance',
        avatar,
        partnerLevel: existing?.partnerLevel || 'Afiliado Starter',
        targetGoal: 100000,
        accountType: 'afiliado',
        hasAffiliateProfile: true,
        hasCompanyProfile: false,
        activeRoleMode: 'afiliado',
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });
    }
  } catch (firestoreErr) {
    console.warn('Sincronização Firestore offline ou pendente:', firestoreErr);
    const isCompany = preferredRole === 'empresa';
    profile = {
      ...INITIAL_USER_PROFILE,
      userId: user.uid,
      name: user.displayName || normalizedEmail.split('@')[0] || 'Usuário LeadsPay',
      email: normalizedEmail,
      role: isAdm ? 'Administrador do Sistema' : (isCompany ? 'Fundador / Startup' : 'Afiliado de Alta Performance'),
      avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
      partnerLevel: isAdm ? 'Super Administrador' : (isCompany ? 'Empresa Parceira' : 'Afiliado Starter'),
      targetGoal: isCompany ? 500000 : 100000,
      accountType: isAdm ? 'admin' : (isCompany ? 'empresa' : 'afiliado'),
      hasAffiliateProfile: !isAdm && !isCompany,
      hasCompanyProfile: !isAdm && isCompany,
      activeRoleMode: isAdm ? 'admin' : (isCompany ? 'empresa' : 'afiliado'),
      updatedAt: new Date().toISOString()
    };
  }

  return { user, profile };
}

/**
 * Completar / Registrar perfil de Afiliado para um usuário já autenticado (ex: empresa que quer virar afiliado ou login Google)
 */
export async function completeAffiliateProfile(
  userId: string,
  data: {
    name: string;
    cpf: string;
    pixKey: string;
    pixKeyType: string;
    whatsapp?: string;
  }
): Promise<UserSellerProfile> {
  const cleanCpf = cleanDigits(data.cpf);
  const formattedCpf = formatCPF(cleanCpf);

  if (cleanCpf.length !== 11 || !isValidCPF(cleanCpf)) {
    const err = new Error('custom/invalid-cpf');
    (err as any).code = 'custom/invalid-cpf';
    throw err;
  }

  const cpfInUse = await checkCpfAlreadyExists(cleanCpf, userId);
  if (cpfInUse) {
    const err = new Error('custom/cpf-already-in-use');
    (err as any).code = 'custom/cpf-already-in-use';
    throw err;
  }

  const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
  const snap = await getDoc(profileRef);
  const existing = snap.exists() ? (snap.data() as UserSellerProfile) : null;

  const now = new Date().toISOString();
  const updatedProfile: UserSellerProfile = {
    userId,
    name: data.name.trim() || existing?.name || 'Afiliado LeadsPay',
    email: existing?.email || '',
    role: 'Afiliado de Alta Performance',
    avatar: existing?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`,
    pixKey: data.pixKey.trim(),
    pixKeyType: data.pixKeyType,
    availableBalance: existing?.availableBalance ?? 0,
    pendingBalance: existing?.pendingBalance ?? 0,
    totalEarned: existing?.totalEarned ?? 0,
    totalSalesCount: existing?.totalSalesCount ?? 0,
    partnerLevel: existing?.partnerLevel || 'Afiliado Starter',
    targetGoal: existing?.targetGoal || 100000,
    currentSalesProgress: existing?.currentSalesProgress || 0,
    hasAffiliateProfile: true,
    hasCompanyProfile: existing?.hasCompanyProfile || false,
    activeRoleMode: 'afiliado',
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : (existing?.whatsapp || ''),
    cpf: formattedCpf,
    cleanCpf: cleanCpf,
    companyId: existing?.companyId,
    companyName: existing?.companyName,
    cnpj: existing?.cnpj,
    cleanCnpj: existing?.cleanCnpj,
    updatedAt: now
  };

  await setDoc(profileRef, sanitizeForFirestore(updatedProfile), { merge: true });
  return updatedProfile;
}

/**
 * Completar / Registrar Empresa e vincular ao perfil do usuário autenticado
 */
export async function completeCompanyProfile(
  userId: string,
  companyData: {
    companyName: string;
    cnpj?: string;
    category: string;
    website?: string;
    whatsapp?: string;
    tagline?: string;
    description?: string;
    commissionRange?: string;
    logo?: string;
  }
): Promise<{ company: CompanyStartup; profile: UserSellerProfile }> {
  const cleanCnpj = companyData.cnpj ? cleanDigits(companyData.cnpj) : '';
  const formattedCnpj = cleanCnpj ? formatCNPJ(cleanCnpj) : '';

  if (cleanCnpj && cleanCnpj.length === 14) {
    if (!isValidCNPJ(cleanCnpj)) {
      const err = new Error('custom/invalid-cnpj');
      (err as any).code = 'custom/invalid-cnpj';
      throw err;
    }

    const cnpjInUse = await checkCnpjAlreadyExists(cleanCnpj, userId);
    if (cnpjInUse) {
      const err = new Error('custom/cnpj-already-in-use');
      (err as any).code = 'custom/cnpj-already-in-use';
      throw err;
    }
  }

  const now = new Date().toISOString();
  const companyId = `comp-${userId.slice(0, 10)}`;
  const slug = companyData.companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  const logo = companyData.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(companyData.companyName.trim())}`;
  const bannerImage = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';

  const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
  const snap = await getDoc(profileRef);
  const existing = snap.exists() ? (snap.data() as UserSellerProfile) : null;

  const company: CompanyStartup = {
    id: companyId,
    name: companyData.companyName.trim(),
    slug: slug || companyId,
    tagline: companyData.tagline?.trim() || `${companyData.category} escalável no ecossistema LeadsPay`,
    logo,
    bannerImage,
    category: companyData.category as any,
    description: companyData.description?.trim() || `Empresa ${companyData.companyName} integrada ao LeadsPay.`,
    website: companyData.website?.trim() || 'https://leadspay.com',
    email: existing?.email || '',
    whatsapp: companyData.whatsapp ? formatPhone(companyData.whatsapp) : '',
    totalPlansCount: 0,
    totalAffiliatesCount: 0,
    totalSalesVolume: 0,
    commissionRange: companyData.commissionRange || '30% - 50%',
    verified: true,
    ownerId: userId,
    cnpj: formattedCnpj || undefined,
    cleanCnpj: cleanCnpj || undefined,
    createdAt: now
  };

  await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), sanitizeForFirestore(company), { merge: true });

  const updatedProfile: UserSellerProfile = {
    userId,
    name: existing?.name || 'Produtor / Startup',
    email: existing?.email || '',
    role: 'Fundador / Startup',
    avatar: existing?.avatar || logo,
    pixKey: existing?.pixKey || '',
    pixKeyType: existing?.pixKeyType || 'Chave Aleatória',
    availableBalance: existing?.availableBalance ?? 0,
    pendingBalance: existing?.pendingBalance ?? 0,
    totalEarned: existing?.totalEarned ?? 0,
    totalSalesCount: existing?.totalSalesCount ?? 0,
    partnerLevel: 'Empresa Parceira',
    targetGoal: 500000,
    currentSalesProgress: existing?.currentSalesProgress || 0,
    hasAffiliateProfile: existing?.hasAffiliateProfile || false,
    hasCompanyProfile: true,
    activeRoleMode: 'empresa',
    companyId: companyId,
    companyName: companyData.companyName.trim(),
    whatsapp: companyData.whatsapp ? formatPhone(companyData.whatsapp) : (existing?.whatsapp || ''),
    cpf: existing?.cpf,
    cleanCpf: existing?.cleanCpf,
    cnpj: formattedCnpj || existing?.cnpj,
    cleanCnpj: cleanCnpj || existing?.cleanCnpj,
    updatedAt: now
  };

  await setDoc(profileRef, sanitizeForFirestore(updatedProfile), { merge: true });

  return { company, profile: updatedProfile };
}

/**
 * Recuperação de Senha Real via Firebase Auth
 */
export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, normalizedEmail);
  return {
    success: true,
    message: `Link de redefinição enviado com sucesso para ${normalizedEmail}! Verifique sua caixa de entrada e pasta de spam.`
  };
}

/**
 * Desconectar / Logout
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Re-export Partner Auth services and types
export { validateApiKey, generatePartnerApiKey, getOrGenerateUserApiKey } from '../../lib/auth-partner';
export type { PartnerAuthResult } from '../../lib/auth-partner';
