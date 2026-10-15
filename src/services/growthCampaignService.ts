import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type GrowthCampaignStatus = 'aguardando_analise' | 'ajustes_solicitados' | 'aprovada';
export type GrowthCampaign = {
  id: string; companyId: string; ownerId: string; productId: string; productName: string;
  goal: string; budget: number; brief: string; onboardingAnswers: Record<string,string>;
  plan: 'essential' | 'designer'; adChannel: string; adDestination: string;
  adRegion: string; adUrl: string; status: GrowthCampaignStatus; createdAt?: unknown;
  reviewedAt?: unknown; reviewNote?: string;
};
const campaigns = collection(db, 'growthCampaigns');
export async function submitGrowthCampaign(data: Omit<GrowthCampaign,'id'|'ownerId'|'status'|'createdAt'>) {
  const user = auth.currentUser;
  if (!user || !data.companyId || !data.productId || !Number.isFinite(data.budget) || data.budget <= 0) throw new Error('Dados da campanha inválidos.');
  return addDoc(campaigns, { ...data, ownerId: user.uid, status: 'aguardando_analise', createdAt: serverTimestamp() });
}
export function subscribeCompanyGrowthCampaigns(companyId: string, onData: (items: GrowthCampaign[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(campaigns, where('companyId','==',companyId), limit(50)), snapshot => onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as GrowthCampaign))), onError);
}
export function subscribeAdminGrowthCampaigns(onData: (items: GrowthCampaign[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(campaigns, orderBy('createdAt','desc'), limit(100)), snapshot => onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as GrowthCampaign))), onError);
}
export async function reviewGrowthCampaign(id: string, status: GrowthCampaignStatus, reviewNote: string) {
  if (status !== 'aprovada' && status !== 'ajustes_solicitados') throw new Error('Status inválido.');
  if (status === 'ajustes_solicitados' && !reviewNote.trim()) throw new Error('Informe o ajuste solicitado.');
  await updateDoc(doc(db,'growthCampaigns',id), {status, reviewNote: reviewNote.trim().slice(0,1000), reviewedAt: serverTimestamp(), reviewedBy: auth.currentUser?.uid || ''});
}
