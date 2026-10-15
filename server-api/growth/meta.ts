import { randomBytes } from 'node:crypto';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getAuth } from 'firebase-admin/auth';

type Req = { method?: string; query?: Record<string,unknown>; body?: any; headers: Record<string,string|string[]|undefined> };
type Res = { setHeader(k:string,v:string):void; status(n:number):Res; json(v:unknown):unknown; redirect(n:number,url:string):unknown };
const base = 'https://graph.facebook.com/v24.0';
const clientId = () => process.env.META_APP_ID || '';
const secret = () => process.env.META_APP_SECRET || '';
const redirectUri = () => process.env.META_GROWTH_REDIRECT_URI || '';
async function identity(req:Req) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) throw new Error('Autenticação necessária.');
  return getAuth().verifyIdToken(authorization.slice(7),true);
}
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','no-store');
  try {
    if (req.method === 'GET' && req.query?.action === 'callback') {
      const state = String(req.query.state || '');
      const code = String(req.query.code || '');
      const origin = process.env.META_GROWTH_RETURN_URL || '/';
      if (!state || !code) return res.redirect(302,origin + '?meta=cancelled');
      const db = getServerAdminFirestore();
      const stateRef = db.collection('growthMetaOAuthStates').doc(state);
      const snap = await stateRef.get();
      if (!snap.exists || Date.now() - Number(snap.data()?.createdAtMs || 0) > 600000) return res.redirect(302,origin + '?meta=expired');
      await stateRef.delete();
      const companyId = String(snap.data()?.companyId || '');
      const ownerId = String(snap.data()?.ownerId || '');
      const company = await db.collection('companies').doc(companyId).get();
      if (!company.exists || company.data()?.ownerId !== ownerId) return res.redirect(302,origin + '?meta=denied');
      const tokenUrl = new URL(base + '/oauth/access_token');
      tokenUrl.searchParams.set('client_id',clientId());tokenUrl.searchParams.set('client_secret',secret());
      tokenUrl.searchParams.set('redirect_uri',redirectUri());tokenUrl.searchParams.set('code',code);
      const response = await fetch(tokenUrl);
      const data:any = await response.json();
      if (!response.ok || !data.access_token) return res.redirect(302,origin + '?meta=failed');
      // Token only on server, never in client-side state or Firestore.
      // Do not persist credentials until an encrypted secrets vault is configured.
      return res.redirect(302,origin + '?meta=authorized-not-linked');
    }
    if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido.'});
    const user = await identity(req);
    const companyId = String(req.body?.companyId || '');
    const company = await getServerAdminFirestore().collection('companies').doc(companyId).get();
    if (!company.exists || company.data()?.ownerId !== user.uid) return res.status(403).json({error:'Empresa não autorizada.'});
    if (!clientId() || !secret() || !redirectUri()) return res.status(503).json({error:'Configure META_APP_ID, META_APP_SECRET e META_GROWTH_REDIRECT_URI na Vercel.'});
    if (req.body?.action !== 'connect') return res.status(400).json({error:'Ação inválida.'});
    const state = randomBytes(24).toString('hex');
    await getServerAdminFirestore().collection('growthMetaOAuthStates').doc(state).set({companyId,ownerId:user.uid,createdAtMs:Date.now()});
    const url = new URL('https://www.facebook.com/v24.0/dialog/oauth');
    url.searchParams.set('client_id',clientId());url.searchParams.set('redirect_uri',redirectUri());
    url.searchParams.set('state',state);url.searchParams.set('response_type','code');
    url.searchParams.set('scope','ads_management,ads_read,business_management');
    return res.status(200).json({url:url.toString()});
  } catch(e) {return res.status(401).json({error:e instanceof Error ? e.message : 'Erro na integração Meta.'});}
}
