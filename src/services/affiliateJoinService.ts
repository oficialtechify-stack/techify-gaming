type FirebaseUserForJoin = {
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

export async function joinAffiliateOffer(planId: string, currentUser: FirebaseUserForJoin | null | undefined) {
  if (!currentUser) throw new Error('Entre novamente na sua conta para solicitar a afiliação.');
  const token = await currentUser.getIdToken();
  const response = await fetch('/api/affiliates/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId }),
  });
  const text = await response.text();
  let data: Record<string, any> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // A non-JSON deployment error must never be treated as a successful join.
  }
  if (!response.ok || data.success !== true || !data.affiliation) {
    throw new Error(typeof data.error === 'string' ? data.error : `Não foi possível confirmar a afiliação (HTTP ${response.status}).`);
  }
  return data.affiliation;
}
