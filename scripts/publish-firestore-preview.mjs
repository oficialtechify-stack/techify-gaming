import fs from 'node:fs/promises';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TARGET_PROJECT = 'techify-gaming-106fe';
const TARGET_BRANCH = 'fix/production-payment-safety';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, token, options = {}, accepted = [200]) {
  let last;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const raw = await response.text();
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
    if (accepted.includes(response.status)) return { status: response.status, body };
    last = { status: response.status, body };
    if (response.status !== 403 || attempt === 5) break;
    console.log(`[Firestore publish] IAM ainda propagando (tentativa ${attempt}/5). Aguardando...`);
    await sleep(8000);
  }
  const detail = typeof last?.body === 'string'
    ? last.body.slice(0, 900)
    : JSON.stringify(last?.body || {}).slice(0, 1200);
  throw new Error(`Firebase API respondeu ${last?.status}: ${detail}`);
}

async function publicFirestoreStatus(collectionName, apiKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${TARGET_PROJECT}/databases/(default)/documents/${collectionName}?pageSize=1&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  return response.status;
}

async function main() {
  const isTargetPreview =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH;

  if (!isTargetPreview) {
    console.log('[Firestore publish] ignorado fora do Preview de segurança.');
    return;
  }

  const rawCredential = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!rawCredential) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não está configurado no Preview da Vercel.');

  const serviceAccount = JSON.parse(rawCredential);
  if (serviceAccount.project_id !== TARGET_PROJECT) {
    throw new Error(`A credencial Firebase pertence ao projeto ${serviceAccount.project_id || 'desconhecido'}, não a ${TARGET_PROJECT}.`);
  }

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: TARGET_PROJECT,
  }, 'firestore-production-publisher');

  try {
    const credential = app.options.credential;
    if (!credential) throw new Error('Credencial Firebase Admin indisponível.');
    const access = await credential.getAccessToken();
    const token = access.access_token;

    const rules = await fs.readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
    const indexConfig = JSON.parse(await fs.readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
    const source = { files: [{ name: 'firestore.rules', content: rules }] };

    const validation = await request(
      `https://firebaserules.googleapis.com/v1/projects/${TARGET_PROJECT}:test`,
      token,
      { method: 'POST', body: JSON.stringify({ source }) },
      [200],
    );
    const validationErrors = (validation.body?.issues || []).filter((issue) => issue.severity === 'ERROR');
    if (validationErrors.length) {
      throw new Error('As Security Rules possuem erros: ' + JSON.stringify(validationErrors).slice(0, 1500));
    }
    console.log('[Firestore publish] Security Rules válidas.');

    const createdRuleset = await request(
      `https://firebaserules.googleapis.com/v1/projects/${TARGET_PROJECT}/rulesets`,
      token,
      { method: 'POST', body: JSON.stringify({ source }) },
      [200],
    );
    const rulesetName = createdRuleset.body?.name;
    if (!rulesetName) throw new Error('A API do Firebase não retornou o nome do ruleset.');

    const releaseName = `projects/${TARGET_PROJECT}/releases/cloud.firestore`;
    await request(
      `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: releaseName,
          rulesetName,
        }),
      },
      [200],
    );
    console.log('[Firestore publish] Security Rules publicadas em cloud.firestore.');

    const desiredIndexes = Array.isArray(indexConfig.indexes) ? indexConfig.indexes : [];
    if (desiredIndexes.length === 0) {
      console.log('[Firestore publish] Nenhum índice composto customizado é exigido pelo branch atual.');
    } else {
      for (const desired of desiredIndexes) {
        const group = String(desired.collectionGroup || '');
        if (!group) continue;
        const parent = `projects/${TARGET_PROJECT}/databases/(default)/collectionGroups/${encodeURIComponent(group)}`;
        const list = await request(`https://firestore.googleapis.com/v1/${parent}/indexes`, token, {}, [200]);
        const desiredFields = (desired.fields || []).map((field) => ({
          fieldPath: String(field.fieldPath),
          order: field.order || undefined,
          arrayConfig: field.arrayConfig || undefined,
        }));
        const exists = (list.body?.indexes || []).some((index) => {
          if (index.queryScope !== (desired.queryScope || 'COLLECTION')) return false;
          const fields = (index.fields || [])
            .filter((field) => field.fieldPath !== '__name__')
            .map((field) => ({
              fieldPath: field.fieldPath,
              order: field.order,
              arrayConfig: field.arrayConfig,
            }));
          if (fields.length !== desiredFields.length) return false;
          return desiredFields.every((field, i) =>
            fields[i]?.fieldPath === field.fieldPath &&
            (!field.order || fields[i]?.order === field.order) &&
            (!field.arrayConfig || fields[i]?.arrayConfig === field.arrayConfig)
          );
        });
        if (!exists) {
          await request(
            `https://firestore.googleapis.com/v1/${parent}/indexes`,
            token,
            {
              method: 'POST',
              body: JSON.stringify({
                queryScope: desired.queryScope || 'COLLECTION',
                fields: desired.fields,
              }),
            },
            [200, 409],
          );
          console.log(`[Firestore publish] Índice solicitado: ${group}.`);
        }
      }
    }

    const db = getFirestore(app);
    await db.collection('balance_releases')
      .where('availableAt', '<=', new Date().toISOString())
      .orderBy('availableAt', 'asc')
      .limit(1)
      .get();
    console.log('[Firestore publish] Consulta financeira do cron validada.');

    const apiKey = String(process.env.VITE_FIREBASE_API_KEY || '').trim();
    if (!apiKey) throw new Error('VITE_FIREBASE_API_KEY não está configurado; não foi possível validar as Rules publicamente.');

    // Pequena espera para propagação da release.
    let plansStatus = 0;
    let couponsStatus = 0;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      [plansStatus, couponsStatus] = await Promise.all([
        publicFirestoreStatus('plans', apiKey),
        publicFirestoreStatus('coupons', apiKey),
      ]);
      if (plansStatus === 200 && couponsStatus === 403) break;
      await sleep(4000);
    }

    if (plansStatus !== 200 || couponsStatus !== 403) {
      throw new Error(`Rules publicadas, mas a validação pública não bateu com o esperado: plans=${plansStatus}, coupons=${couponsStatus}.`);
    }

    console.log('[Firestore publish] Validação final OK: plans público (200) e coupons protegido (403).');
  } finally {
    await deleteApp(app).catch(() => {});
  }
}

await main();
