import fs from 'node:fs/promises';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';

const PROJECT_ID = 'techify-gaming-106fe';
const outputUrl = new URL('../public/firebase-deploy-gate.json', import.meta.url);

async function writeResult(result) {
  await fs.writeFile(outputUrl, JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
}

async function main() {
  const shouldRun = process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === 'fix/production-payment-safety';

  if (!shouldRun) {
    console.log('[Firebase deploy gate] skipped outside the production-safety Vercel preview.');
    return { ok: true, skipped: true };
  }

  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) {
    throw new Error('[Firebase deploy gate] FIREBASE_SERVICE_ACCOUNT_JSON is missing in Vercel Preview.');
  }
  
  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.project_id !== PROJECT_ID) {
    throw new Error('[Firebase deploy gate] Firebase credential belongs to another project.');
  }
  
  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, 'firebase-deploy-gate');
  try {
    const credential = app.options.credential;
    if (!credential) throw new Error('Firebase Admin credential unavailable.');
    const token = await credential.getAccessToken();
    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    };
  
    async function api(url, options = {}, accepted = [200]) {
      const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      if (!accepted.includes(response.status)) {
        throw new Error(`${options.method || 'GET'} ${url} -> ${response.status}: ${typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body).slice(0, 900)}`);
      }
      return { status: response.status, body };
    }
  
    const rules = await fs.readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
    const rulesetResult = await api(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
      { method: 'POST', body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rules }] } }) },
      [200],
    );
    const rulesetName = rulesetResult.body?.name;
    if (!rulesetName) throw new Error('Firebase Rules API did not return a ruleset name.');
  
    const releasesResult = await api(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases?pageSize=100`,
      {},
      [200],
    );
    const releases = Array.isArray(releasesResult.body?.releases) ? releasesResult.body.releases : [];
    const existingRelease = releases.find((release) =>
      String(release.name || '').endsWith('/releases/cloud.firestore') ||
      String(release.name || '').endsWith('/releases/cloud.firestore/(default)')
    );
    const defaultReleaseName = existingRelease?.name || `projects/${PROJECT_ID}/releases/cloud.firestore`;
  
    if (existingRelease) {
      const patchUrl = `https://firebaserules.googleapis.com/v1/${defaultReleaseName}`;
      try {
        await api(
          patchUrl,
          { method: 'PATCH', body: JSON.stringify({ release: { name: defaultReleaseName, rulesetName }, updateMask: 'rulesetName' }) },
          [200],
        );
      } catch (firstError) {
        await api(
          `${patchUrl}?updateMask=rulesetName`,
          { method: 'PATCH', body: JSON.stringify({ name: defaultReleaseName, rulesetName }) },
          [200],
        );
      }
    } else {
      await api(
        `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
        { method: 'POST', body: JSON.stringify({ name: defaultReleaseName, rulesetName }) },
        [200],
      );
    }
    console.log('[Firebase deploy gate] Firestore security rules released.');
  
    const indexConfig = JSON.parse(await fs.readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
    const desiredIndexes = Array.isArray(indexConfig.indexes) ? indexConfig.indexes : [];
  
    for (const desired of desiredIndexes) {
      const collectionGroup = String(desired.collectionGroup || '');
      if (!collectionGroup) continue;
      const parent = `projects/${PROJECT_ID}/databases/(default)/collectionGroups/${encodeURIComponent(collectionGroup)}`;
      const list = await api(`https://firestore.googleapis.com/v1/${parent}/indexes`, {}, [200]);
      const existing = Array.isArray(list.body?.indexes) ? list.body.indexes : [];
      const desiredFields = (desired.fields || []).map((field) => ({
        fieldPath: String(field.fieldPath),
        order: field.order || undefined,
        arrayConfig: field.arrayConfig || undefined,
      }));
      const matches = existing.some((index) => {
        if (index.queryScope !== (desired.queryScope || 'COLLECTION')) return false;
        const actualFields = (index.fields || [])
          .filter((field) => field.fieldPath !== '__name__')
          .map((field) => ({ fieldPath: field.fieldPath, order: field.order, arrayConfig: field.arrayConfig }));
        if (actualFields.length !== desiredFields.length) return false;
        return desiredFields.every((field, i) =>
          actualFields[i]?.fieldPath === field.fieldPath &&
          (field.order ? actualFields[i]?.order === field.order : true) &&
          (field.arrayConfig ? actualFields[i]?.arrayConfig === field.arrayConfig : true)
        );
      });
  
      if (matches) {
        console.log(`[Firebase deploy gate] index already exists: ${collectionGroup}`);
        continue;
      }
  
      const created = await api(
        `https://firestore.googleapis.com/v1/${parent}/indexes`,
        {
          method: 'POST',
          body: JSON.stringify({
            queryScope: desired.queryScope || 'COLLECTION',
            fields: desired.fields,
          }),
        },
        [200, 409],
      );
      if (created.status === 409) {
        console.log(`[Firebase deploy gate] index already being created: ${collectionGroup}`);
      } else {
        console.log(`[Firebase deploy gate] index creation started: ${collectionGroup}`);
      }
    }
  } finally {
    await deleteApp(app).catch(() => {});
  }
  
  return { ok: true, skipped: false, message: 'Rules release and index synchronization request completed.' };
}

try {
  const result = await main();
  await writeResult(result);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Firebase deploy gate]', message);
  await writeResult({
    ok: false,
    skipped: false,
    error: message.slice(0, 1200),
    hasServiceAccount: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    vercelEnv: process.env.VERCEL_ENV || null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
  });
}
