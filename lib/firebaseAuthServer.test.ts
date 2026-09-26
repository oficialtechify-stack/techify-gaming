import assert from 'node:assert/strict';
import test from 'node:test';
import { extractBearerToken, isAdminUid } from './firebaseAuthServer';

test('aceita token Bearer no cabeçalho e rejeita parâmetros extras', () => {
  assert.equal(extractBearerToken('Bearer um-token'), 'um-token');
  assert.equal(extractBearerToken('bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('Bearer primeiro segundo'), null);
  assert.equal(extractBearerToken('Basic segredo'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('somente o UID completo na lista é administrador', () => {
  assert.equal(isAdminUid('uid-completo', 'outra-conta, uid-completo'), true);
  assert.equal(isAdminUid('uid', 'uid-completo'), false);
  assert.equal(isAdminUid('uid-completo', undefined), false);
  assert.equal(isAdminUid('', 'uid-completo'), false);
});
