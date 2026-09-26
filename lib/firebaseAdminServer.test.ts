import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_PROJECT_ID, parseServerServiceAccount } from './firebaseAdminServer';

const fakePrivateKey = '-----BEGIN PRIVATE KEY-----\\nTEST-ONLY\\n-----END PRIVATE KEY-----';
const fakeServiceAccount = {
  project_id: ADMIN_PROJECT_ID,
  client_email: 'test-only@techify-gaming-106fe.iam.gserviceaccount.com',
  private_key: fakePrivateKey,
};

test('aceita somente a conta de serviço do projeto LeadsPay', () => {
  const parsed = parseServerServiceAccount(JSON.stringify(fakeServiceAccount));
  assert.equal(parsed.projectId, ADMIN_PROJECT_ID);
  assert.equal(parsed.clientEmail, fakeServiceAccount.client_email);
  assert.equal(parsed.privateKey, fakePrivateKey.replace(/\\n/g, '\n'));
});

test('rejeita JSON inválido sem repetir conteúdo sensível no erro', () => {
  assert.throws(() => parseServerServiceAccount('{SEGREDO-TESTE'), (error: Error) => {
    assert.doesNotMatch(error.message, /SEGREDO-TESTE/);
    return /JSON/.test(error.message);
  });
});

test('rejeita conta de serviço de outro projeto', () => {
  const wrongProject = { ...fakeServiceAccount, project_id: 'outro-projeto' };
  assert.throws(() => parseServerServiceAccount(JSON.stringify(wrongProject)), /outro projeto/);
});

test('rejeita configuração incompleta', () => {
  const { private_key: _unused, ...incomplete } = fakeServiceAccount;
  assert.throws(() => parseServerServiceAccount(JSON.stringify(incomplete)), /incompleta/);
});
