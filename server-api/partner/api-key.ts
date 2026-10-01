import { createHash, randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown};

export default async function handler(req:Req,res:Res){
  res.setHeader('Cache-Control','no-store');
  try{
    const identity=await verifyFirebaseIdentity(typeof req.headers.authorization==='string'?req.headers.authorization:undefined);
    const db=getServerAdminFirestore();
    const [profileSnap,requestSnap]=await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
    ]);
    if(!profileSnap.exists) return res.status(404).json({error:'Perfil não encontrado.'});
    const profile=applyVerificationRequest(profileSnap.data()!,requestSnap.exists?requestSnap.data()!:null) as Record<string,any>;
    if(!profileHasRole(profile,'empresa')||!profileRoleIsApproved(profile,'empresa')) return res.status(403).json({error:'A Empresa precisa estar aprovada para usar a API.'});
    const companyId=String(profile.companyId||'');
    if(!companyId) return res.status(409).json({error:'Empresa não vinculada ao perfil.'});

    const keys=await db.collection('partner_api_keys').where('userId','==',identity.uid).limit(20).get();
    if(req.method==='GET'){
      const active=keys.docs.map(d=>({id:d.id,...d.data()})).find((x:any)=>x.active===true);
      return res.status(200).json({success:true,key:active?{id:(active as any).id,prefix:(active as any).prefix,createdAt:(active as any).createdAt}:null});
    }
    if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});

    const prefix=process.env.VERCEL_ENV==='production'?'lp_live_':'lp_test_';
    const apiKey=prefix+randomBytes(24).toString('base64url');
    const keyHash=createHash('sha256').update(apiKey).digest('hex');
    const keyId='key_'+randomBytes(12).toString('hex');
    const now=new Date().toISOString();
    const batch=db.batch();
    for(const doc of keys.docs) if(doc.data().active===true) batch.set(doc.ref,{active:false,revokedAt:now,updatedAt:now},{merge:true});
    batch.create(db.collection('partner_api_keys').doc(keyId),{
      id:keyId,userId:identity.uid,companyId,keyHash,prefix:apiKey.slice(0,16)+'…',active:true,createdAt:now,updatedAt:now,
    });
    batch.set(db.collection('user_profiles').doc(identity.uid),{partnerApiKeyId:keyId,updatedAt:now},{merge:true});
    await batch.commit();
    return res.status(200).json({success:true,apiKey,key:{id:keyId,prefix:apiKey.slice(0,16)+'…',createdAt:now}});
  }catch(error){
    console.error('[Partner API key]',error instanceof Error?error.message:'Falha');
    return res.status(401).json({error:'Não foi possível gerenciar a chave de API.'});
  }
}
