type CompanyDoc = FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot;

function ownedBy(company: Record<string, any>, uid: string): boolean {
  return String(company.ownerId || company.submittedBy || '').trim() === uid;
}

function available(company: Record<string, any>): boolean {
  return company.archived !== true && company.isArchived !== true && company.banned !== true;
}

export function isApprovedCompany(company: Record<string, any> | null | undefined): boolean {
  if (!company) return false;
  return (
    company.verified === true &&
    String(company.status || '').trim().toLowerCase() === 'approved' &&
    String(company.kyc_status || 'verified').trim().toLowerCase() === 'verified' &&
    available(company)
  );
}

export async function resolveOwnedCompany(
  db: FirebaseFirestore.Firestore,
  uid: string,
  preferredCompanyId?: string | null,
): Promise<{ companyId: string; company: Record<string, any>; ref: FirebaseFirestore.DocumentReference } | null> {
  const preferred = String(preferredCompanyId || '').trim();
  if (preferred) {
    const snap = await db.collection('companies').doc(preferred).get();
    if (snap.exists) {
      const company = snap.data() as Record<string, any>;
      if (ownedBy(company, uid) && available(company)) {
        return { companyId: snap.id, company, ref: snap.ref };
      }
    }
  }

  const byOwner = await db.collection('companies').where('ownerId', '==', uid).limit(20).get();
  const ownerMatch = byOwner.docs.find((doc) => {
    const company = doc.data() as Record<string, any>;
    return available(company);
  });
  if (ownerMatch) {
    return { companyId: ownerMatch.id, company: ownerMatch.data() as Record<string, any>, ref: ownerMatch.ref };
  }

  const bySubmitter = await db.collection('companies').where('submittedBy', '==', uid).limit(20).get();
  const submitterMatch = bySubmitter.docs.find((doc) => {
    const company = doc.data() as Record<string, any>;
    return available(company);
  });
  if (submitterMatch) {
    return { companyId: submitterMatch.id, company: submitterMatch.data() as Record<string, any>, ref: submitterMatch.ref };
  }

  return null;
}

export async function resolveApprovedOwnedCompany(
  db: FirebaseFirestore.Firestore,
  uid: string,
  preferredCompanyId?: string | null,
) {
  const resolved = await resolveOwnedCompany(db, uid, preferredCompanyId);
  if (!resolved || !isApprovedCompany(resolved.company)) return null;
  return resolved;
}
