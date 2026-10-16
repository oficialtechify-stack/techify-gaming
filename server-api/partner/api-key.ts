import { createHash, randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import {
  applyVerificationRequest,
  profileHasRole,
  profileRoleIsApproved,
  profileRoleStatus,
} from '../../lib/profileEligibility.js';
import { resolveApprovedOwnedCompany } from '../../lib/companyAccess.js';
import { scopesForApprovedRoles } from '../../lib/mcpApi.js';
import type { PlatformRole } from '../../lib/platformBilling.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown;end?():unknown};

function preferredRole(value:unknown):PlatformRole|undefined{
  return value==='empresa'||value==='afiliado'?value:undefined;
}

export default async function handler(req:Req,res:Res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');

  try{
    const identity=await verifyFirebaseIdentity(typeof req.headers.authorization==='string'?req.headers.authorization:undefined,{requireVerifiedEmail:true});
    const db=getServerAdminFirestore();
    const [profileSnap,requestSnap]=await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
    ]);

    if(!profileSnap.exists) return res.status(404).json({error:'Perfil não encontrado.'});

    const rawProfile=profileSnap.data()!;
    const profile=applyVerificationRequest(rawProfile,requestSnap.exists?requestSnap.data()!:null) as Record<string,any>;
    const blocked=
      profile.banned===true ||
      profile.archived===true ||
      profile.isArchived===true ||
      ['banned','archived'].includes(String(profile.status||'').toLowerCase());

    const allowedRoles:PlatformRole[]=[];
    if(!blocked && profileHasRole(profile,'afiliado')&&profileRoleIsApproved(profile,'afiliado')) {
      allowedRoles.push('afiliado');
    }

    const approvedCompany=!blocked
      ? await resolveApprovedOwnedCompany(
          db,
          identity.uid,
          String(rawProfile.companyId||profile.companyId||'').trim(),
        )
      : null;
    const companyId=approvedCompany?.companyId||'';
    if(approvedCompany) allowedRoles.push('empresa');

    const keys=await db.collection('partner_api_keys').where('userId','==',identity.uid).limit(20).get();
    const active=keys.docs
      .map(d=>({id:d.id,...d.data()} as Record<string,any>))
      .find(x=>x.active===true);

    if(req.method==='GET'){
      return res.status(200).json({
        success:true,
        eligible:allowedRoles.length>0,
        allowedRoles,
        blocked,
        roleStatus:{
          afiliado:profileRoleStatus(profile,'afiliado'),
          empresa:profileRoleStatus(profile,'empresa'),
        },
        key:active?{
          id:active.id,
          prefix:active.prefix||'',
          createdAt:active.createdAt||null,
          preferredRole:active.preferredRole||null,
          allowedRoles:Array.isArray(active.allowedRoles)?active.allowedRoles:allowedRoles,
          scopes:Array.isArray(active.scopes)?active.scopes:scopesForApprovedRoles(allowedRoles),
          environment:active.environment||null,
          usable:allowedRoles.length>0,
        }:null,
        legacyKeyDetected:Boolean(rawProfile.apiKey),
        message:allowedRoles.length
          ? 'Integrações de IA liberadas para o perfil aprovado.'
          : blocked
            ? 'Esta conta está bloqueada ou arquivada.'
            : 'Conclua a aprovação do perfil para liberar integrações de IA/API.',
      });
    }

    if(req.method==='DELETE'){
      const now=new Date().toISOString();
      const batch=db.batch();
      for(const doc of keys.docs){
        if(doc.data().active===true) batch.set(doc.ref,{active:false,revokedAt:now,updatedAt:now},{merge:true});
      }
      batch.set(db.collection('user_profiles').doc(identity.uid),{
        partnerApiKeyId:FieldValue.delete(),
        apiKey:FieldValue.delete(),
        updatedAt:now,
      },{merge:true});
      await batch.commit();
      return res.status(200).json({success:true,revoked:true});
    }

    if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
    if(blocked) return res.status(403).json({error:'Esta conta está bloqueada ou arquivada.'});
    if(!allowedRoles.length) {
      return res.status(403).json({error:'Seu perfil precisa estar aprovado e ativo para gerar uma chave de IA/API.'});
    }

    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const requestedRole=preferredRole(body.preferredRole);
    if(requestedRole && !allowedRoles.includes(requestedRole)){
      return res.status(403).json({error:`O perfil ${requestedRole} ainda não está aprovado.`});
    }

    const env=process.env.VERCEL_ENV==='production'?'production':'test';
    const prefix=env==='production'?'lp_live_':'lp_test_';
    const apiKey=prefix+randomBytes(32).toString('base64url');
    const keyHash=createHash('sha256').update(apiKey).digest('hex');
    const keyId='key_'+randomBytes(12).toString('hex');
    const now=new Date().toISOString();
    const scopes=scopesForApprovedRoles(allowedRoles);

    const batch=db.batch();
    for(const doc of keys.docs){
      if(doc.data().active===true) batch.set(doc.ref,{active:false,revokedAt:now,updatedAt:now},{merge:true});
    }

    batch.create(db.collection('partner_api_keys').doc(keyId),{
      id:keyId,
      userId:identity.uid,
      companyId:companyId||null,
      keyHash,
      prefix:apiKey.slice(0,18)+'…',
      active:true,
      environment:env,
      preferredRole:requestedRole||allowedRoles[0],
      allowedRoles,
      scopes,
      createdAt:now,
      updatedAt:now,
      lastUsedAt:null,
    });

    batch.set(db.collection('user_profiles').doc(identity.uid),{
      partnerApiKeyId:keyId,
      apiKey:FieldValue.delete(),
      updatedAt:now,
    },{merge:true});

    await batch.commit();

    return res.status(200).json({
      success:true,
      apiKey,
      key:{
        id:keyId,
        prefix:apiKey.slice(0,18)+'…',
        createdAt:now,
        preferredRole:requestedRole||allowedRoles[0],
        allowedRoles,
        scopes,
        environment:env,
        usable:true,
      },
      warning:'Copie esta chave agora. Por segurança, o valor completo não será exibido novamente.',
    });
  }catch(error){
    const message=error instanceof Error?error.message:'Falha';
    console.error('[Partner API key]',message);
    if(/Firebase ID token|token inválido|auth\/id-token/i.test(message)){
      return res.status(401).json({error:'Sua sessão expirou. Entre novamente.'});
    }
    return res.status(503).json({error:'Não foi possível gerenciar a chave de API agora.'});
  }
}
