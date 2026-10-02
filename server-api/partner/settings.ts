import { randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';
import { assertSafeWebhookUrl, webhookUrlErrorMessage } from '../../lib/webhookSecurity.js';

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
    if(!profileHasRole(profile,'empresa')||!profileRoleIsApproved(profile,'empresa')) return res.status(403).json({error:'A Empresa precisa estar aprovada para configurar integrações.'});
    const companyId=String(profile.companyId||'').trim();
    if(!companyId) return res.status(409).json({error:'A conta ainda não está vinculada a uma empresa válida.'});

    const companySnap=await db.collection('companies').doc(companyId).get();
    const company=companySnap.exists?companySnap.data()!:null;
    if(
      !company ||
      String(company.ownerId||company.submittedBy||'')!==identity.uid ||
      company.verified!==true ||
      String(company.status||'').toLowerCase()!=='approved' ||
      company.archived===true ||
      company.isArchived===true ||
      company.banned===true
    ) return res.status(403).json({error:'A empresa vinculada não está aprovada para configurar integrações.'});

    const ref=db.collection('partner_settings').doc(identity.uid);
    if(req.method==='GET'){
      const snap=await ref.get();
      const data=snap.exists?snap.data()!:null;
      return res.status(200).json({success:true,settings:data?{webhookUrl:data.webhookUrl||'',webhookSecret:data.webhookSecret||'',companyId}:null});
    }
    if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const rawWebhookUrl=String(body.webhookUrl||'').trim();
    let webhookUrl='';
    if(rawWebhookUrl){
      try{
        webhookUrl=await assertSafeWebhookUrl(rawWebhookUrl);
      }catch(error){
        return res.status(400).json({error:webhookUrlErrorMessage(error)});
      }
    }
    const existing=await ref.get();
    const webhookSecret=String(existing.data()?.webhookSecret||'') || 'whlp_'+randomBytes(24).toString('base64url');
    const now=new Date().toISOString();
    await ref.set({userId:identity.uid,companyId,webhookUrl,webhookSecret,updatedAt:now,...(existing.exists?{}:{createdAt:now})},{merge:true});
    return res.status(200).json({success:true,settings:{webhookUrl,webhookSecret,companyId}});
  }catch(error){
    const message=error instanceof Error?error.message:'Falha';
    console.error('[Partner settings]',message);
    if(/Firebase ID token|token inválido|auth\/id-token/i.test(message)){
      return res.status(401).json({error:'Sua sessão expirou. Entre novamente.'});
    }
    return res.status(503).json({error:'Não foi possível carregar ou salvar as configurações da integração.'});
  }
}
