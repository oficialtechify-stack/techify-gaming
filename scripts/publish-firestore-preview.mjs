import fs from 'node:fs/promises';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TARGET_PROJECT = 'techify-gaming-106fe';
const TARGET_BRANCH = 'fix/production-payment-safety';
const PRODUCTION_BRANCH = 'main';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isQuotaExceeded = (error) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /RESOURCE_EXHAUSTED|Quota exceeded|quota exceeded/i.test(message);
};

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

  const isTargetProduction =
    process.env.VERCEL_ENV === 'production' &&
    process.env.VERCEL_GIT_COMMIT_REF === PRODUCTION_BRANCH;

  if (!isTargetPreview && !isTargetProduction) {
    console.log('[Firestore publish] ignorado fora do Preview de segurança e da produção main.');
    return;
  }

  console.log(
    `[Firestore publish] destino: ${isTargetProduction ? 'produção/main' : 'preview de segurança'}.`
  );

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

    // projects.rulesets.create compila e valida a Source. Se houver erro
    // sintático/semântico, a API rejeita a criação e o build falha.
    const createdRuleset = await request(
      `https://firebaserules.googleapis.com/v1/projects/${TARGET_PROJECT}/rulesets`,
      token,
      { method: 'POST', body: JSON.stringify({ source }) },
      [200],
    );
    const rulesetName = createdRuleset.body?.name;
    if (!rulesetName) throw new Error('A API do Firebase não retornou o nome do ruleset.');

    console.log('[Firestore publish] Security Rules compiladas e ruleset criado.');

    const releaseName = `projects/${TARGET_PROJECT}/releases/cloud.firestore`;
    const releases = await request(
      `https://firebaserules.googleapis.com/v1/projects/${TARGET_PROJECT}/releases?pageSize=100`,
      token,
      {},
      [200],
    );
    const existingRelease = (releases.body?.releases || []).find((release) =>
      release.name === releaseName ||
      release.name === `${releaseName}/(default)`
    );

    if (existingRelease) {
      await request(
        `https://firebaserules.googleapis.com/v1/${existingRelease.name}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({
            release: {
              name: existingRelease.name,
              rulesetName,
            },
            updateMask: 'rulesetName',
          }),
        },
        [200],
      );
    } else {
      await request(
        `https://firebaserules.googleapis.com/v1/projects/${TARGET_PROJECT}/releases`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            name: releaseName,
            rulesetName,
          }),
        },
        [200],
      );
    }
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
    try {
      await db.collection('balance_releases')
        .where('availableAt', '<=', new Date().toISOString())
        .orderBy('availableAt', 'asc')
        .limit(1)
        .get();
      console.log('[Firestore publish] Consulta financeira do cron validada.');
    } catch (error) {
      if (!isQuotaExceeded(error)) throw error;
      console.warn('[Firestore publish] Regras já publicadas. Validação financeira pós-publicação ignorada porque a cota de leitura do Firestore está temporariamente esgotada.');
    }

    const apiKey = String(
      process.env.VITE_FIREBASE_API_KEY ||
      'AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM'
    ).trim();

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

    const publicValidationQuotaBlocked = plansStatus === 429 || couponsStatus === 429;
    if (publicValidationQuotaBlocked) {
      console.warn(`[Firestore publish] Regras já publicadas. Validação pública pós-publicação adiada por cota temporária: plans=${plansStatus}, coupons=${couponsStatus}.`);
    } else if (plansStatus !== 200 || couponsStatus !== 403) {
      throw new Error(`Rules publicadas, mas a validação pública não bateu com o esperado: plans=${plansStatus}, coupons=${couponsStatus}.`);
    } else {
      console.log('[Firestore publish] Validação final OK: plans público (200) e coupons protegido (403).');
    }
  } finally {
    await deleteApp(app).catch(() => {});
  }
}

const resultPath = new URL('../public/firestore-publish-result.json', import.meta.url);
try {
  await main();
  await fs.writeFile(resultPath, JSON.stringify({
    ok: true,
    project: TARGET_PROJECT,
    message: 'Publicação e validação do Firestore concluídas.',
    at: new Date().toISOString(),
  }, null, 2) + '\n', 'utf8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Firestore publish]', message);
  await fs.writeFile(resultPath, JSON.stringify({
    ok: false,
    project: TARGET_PROJECT,
    error: message.slice(0, 2000),
    at: new Date().toISOString(),
  }, null, 2) + '\n', 'utf8');

  // Em produção, falha de publicação das regras deve impedir um deploy
  // que deixaria o frontend/backend novos apontando para regras antigas.
  if (process.env.VERCEL_ENV === 'production') {
    throw error;
  }
}
