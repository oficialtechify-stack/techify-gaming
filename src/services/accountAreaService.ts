import { auth } from '../lib/firebase';
import type { AccountArea } from '../../lib/accountAreas';
export async function accountAreaRequest(body: Record<string, unknown>) {
  if (!auth.currentUser) throw new Error('Entre na sua conta para continuar.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/profile/account-area', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a área.');
  return result;
}
export async function activateArea(area: AccountArea, invitation = '', name = '') {
  return accountAreaRequest({ area, invitation, name });
}
