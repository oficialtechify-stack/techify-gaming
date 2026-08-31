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
import { COLLECTIONS, DEFAULT_USER_ID } from './firestoreService';
import { UserSellerProfile, CompanyStartup, UserRoleMode } from '../types/platform';

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
  cnpj?: string;
  category: string;
  website?: string;
  tagline?: string;
  description?: string;
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
 * Maps Firebase Auth and Custom error codes to friendly Portuguese messages
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
    case 'custom/email-already-in-use':
      return 'Este e-mail já possui uma conta no Techify. Você pode fazer login com sua senha cadastrada ou redefinir a senha com 1 clique abaixo.';
    case 'custom/cpf-already-in-use':
      return 'Este CPF já está vinculado a outra conta no Techify. Cada usuário pode possuir uma conta por CPF.';
    case 'custom/cnpj-already-in-use':
      return 'Este CNPJ já está cadastrado em outra empresa parceira no Techify.';
    case 'custom/invalid-cpf':
      return 'O CPF informado é inválido. Verifique os números digitados.';
    case 'custom/invalid-cnpj':
      return 'O CNPJ informado é inválido. Verifique os números digitados.';
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Utilize pelo menos 6 caracteres.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail. Crie sua conta gratuitamente.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique os dados ou recupere sua senha.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Por segurança, aguarde alguns instantes e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi temporariamente suspensa pelo suporte.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet e tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'A autenticação com o Google foi cancelada antes de concluir.';
    case 'auth/popup-blocked':
      return 'A janela popup foi bloqueada pelo navegador. Permita popups para este site.';
    default:
      return errorCode.startsWith('custom/') ? errorCode.replace('custom/', '') : 'Ocorreu um erro ao processar. Tente novamente.';
  }
}

/**
 * Cadastrar Afiliado Real no Firebase Auth e Firestore
 * Se o usuário já existir no Auth com a mesma senha (ex: recadastro ou teste), efetua login e atualiza perfil sem erro.
 */
export async function registerAffiliate(data: RegisterAffiliateData): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const cleanCpf = data.cpf ? cleanDigits(data.cpf) : '';
  const formattedCpf = cleanCpf ? formatCPF(cleanCpf) : '';

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

  // 4. Buscar perfil existente para manter saldos se já houver
  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const existingSnap = await getDoc(profileRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as UserSellerProfile) : null;

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
    activeRoleMode: 'afiliado',
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : (existingData?.whatsapp || ''),
    cpf: formattedCpf || existingData?.cpf || '',
    cleanCpf: cleanCpf || existingData?.cleanCpf || '',
    updatedAt: now
  };

  // Salvar perfil atualizado no Firestore
  await setDoc(profileRef, profile, { merge: true });

  return { user, profile };
}

/**
 * Cadastrar Empresa / Startup Real no Firebase Auth e Firestore
 */
export async function registerCompany(data: RegisterCompanyData): Promise<AuthResult> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const cleanCnpj = data.cnpj ? cleanDigits(data.cnpj) : '';
  const formattedCnpj = cleanCnpj ? formatCNPJ(cleanCnpj) : '';

  // 1. Validar formato de CNPJ se fornecido
  if (cleanCnpj && cleanCnpj.length === 14) {
    if (!isValidCNPJ(cleanCnpj)) {
      const err = new Error('custom/invalid-cnpj');
      (err as any).code = 'custom/invalid-cnpj';
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

  // 2. Verificar se CNPJ já existe em outra empresa
  if (cleanCnpj && cleanCnpj.length === 14) {
    const cnpjExists = await checkCnpjAlreadyExists(cleanCnpj, user.uid);
    if (cnpjExists) {
      const err = new Error('custom/cnpj-already-in-use');
      (err as any).code = 'custom/cnpj-already-in-use';
      throw err;
    }
  }

  // 3. Atualizar Display Name no Firebase Auth
  try {
    await updateProfile(user, { displayName: data.ownerName.trim() });
  } catch (err) {
    console.warn('Erro ao atualizar displayName no Auth:', err);
  }

  const now = new Date().toISOString();
  const companyId = `comp-${user.uid.slice(0, 10)}`;
  const slug = data.companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  const logo = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.companyName.trim())}`;
  const bannerImage = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';

  // 1. Criar/Atualizar Empresa no Firestore
  const company: CompanyStartup = {
    id: companyId,
    name: data.companyName.trim(),
    slug: slug || companyId,
    tagline: data.tagline?.trim() || `${data.category} de alta performance e escala comercial`,
    logo,
    bannerImage,
    category: data.category as any,
    description: data.description?.trim() || `Empresa parceira ${data.companyName} integrada ao ecossistema Techify.`,
    website: data.website?.trim() || 'https://techify.com',
    email: normalizedEmail,
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : '',
    totalPlansCount: 0,
    totalAffiliatesCount: 0,
    totalSalesVolume: 0,
    commissionRange: '30% - 50%',
    verified: true,
    ownerId: user.uid,
    cnpj: formattedCnpj,
    cleanCnpj: cleanCnpj,
    createdAt: now
  };

  await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), company, { merge: true });

  // 2. Criar/Atualizar Perfil de Usuário
  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const existingSnap = await getDoc(profileRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as UserSellerProfile) : null;

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
    activeRoleMode: 'empresa',
    companyId: companyId,
    companyName: data.companyName.trim(),
    whatsapp: data.whatsapp ? formatPhone(data.whatsapp) : (existingData?.whatsapp || ''),
    cnpj: formattedCnpj,
    cleanCnpj: cleanCnpj,
    updatedAt: now
  };

  await setDoc(profileRef, profile, { merge: true });

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
  } else {
    // Tentar localizar por e-mail em caso de migração
    const profilesColl = collection(db, COLLECTIONS.PROFILES);
    const q = query(profilesColl, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);

    if (!snap.empty) {
      profile = snap.docs[0].data() as UserSellerProfile;
      await setDoc(profileRef, { ...profile, userId: user.uid }, { merge: true });
    } else {
      // Criar perfil padrão se não existir
      profile = {
        userId: user.uid,
        name: user.displayName || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: 'Usuário Techify',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
        pixKey: '',
        pixKeyType: 'Chave Aleatória',
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalSalesCount: 0,
        partnerLevel: 'Afiliado Starter',
        targetGoal: 100000,
        currentSalesProgress: 0,
        activeRoleMode: 'afiliado',
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, profile);
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

  const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
  const profileSnap = await getDoc(profileRef);

  let profile: UserSellerProfile;

  if (profileSnap.exists()) {
    profile = profileSnap.data() as UserSellerProfile;
  } else {
    const avatar = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`;
    profile = {
      userId: user.uid,
      name: user.displayName || normalizedEmail.split('@')[0] || 'Usuário Techify',
      email: normalizedEmail,
      role: preferredRole === 'empresa' ? 'Fundador / Startup' : 'Afiliado de Alta Performance',
      avatar,
      pixKey: '',
      pixKeyType: 'Chave Aleatória',
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalSalesCount: 0,
      partnerLevel: preferredRole === 'empresa' ? 'Empresa Parceira' : 'Afiliado Starter',
      targetGoal: preferredRole === 'empresa' ? 500000 : 100000,
      currentSalesProgress: 0,
      activeRoleMode: preferredRole,
      updatedAt: new Date().toISOString()
    };
    await setDoc(profileRef, profile, { merge: true });
  }

  return { user, profile };
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
