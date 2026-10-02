import { randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown};

function validWebhookUrl(value:string):boolean{
  try{const url=new URL(value);return url.protocol==='https:' && !['localhost','127.0.0.1'].includes(url.hostname);}catch{return false;}
}

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
    if(!profileHasRole(profile,'empresa')||!profileRoleIsApproved(profile,'empresa')) return res.status(403).json({error:'A Empresa precisa estar aprovada para configurar integrações.'});
    const companyId=String(profile.companyId||'');
    const ref=db.collection('partner_settings').doc(identity.uid);
    if(req.method==='GET'){
      const snap=await ref.get();
      const data=snap.exists?snap.data()!:null;
      return res.status(200).json({success:true,settings:data?{webhookUrl:data.webhookUrl||'',webhookSecret:data.webhookSecret||'',companyId}:null});
    }
    if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const webhookUrl=String(body.webhookUrl||'').trim();
    if(webhookUrl && !validWebhookUrl(webhookUrl)) return res.status(400).json({error:'O webhook precisa usar uma URL HTTPS pública válida.'});
    const existing=await ref.get();
    const webhookSecret=String(existing.data()?.webhookSecret||'') || 'whlp_'+randomBytes(24).toString('base64url');
    const now=new Date().toISOString();
    await ref.set({userId:identity.uid,companyId,webhookUrl,webhookSecret,updatedAt:now,...(existing.exists?{}:{createdAt:now})},{merge:true});
    return res.status(200).json({success:true,settings:{webhookUrl,webhookSecret,companyId}});
  }catch(error){
    console.error('[Partner settings]',error instanceof Error?error.message:'Falha');
    return res.status(401).json({error:'Não foi possível salvar as configurações da integração.'});
  }
}
