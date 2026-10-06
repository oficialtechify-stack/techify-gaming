import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';
import { resolveApprovedOwnedCompany } from '../lib/companyAccess.js';
import { applyVerificationRequest, profileRoleIsApproved } from '../lib/profileEligibility.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown;query?:Record<string,string|string[]|undefined>};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown};
const cleanCode=(v:unknown)=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,40);
const activeAffiliation=(value:unknown)=>['ativo','active','approved'].includes(String(value||'').trim().toLowerCase());

async function listAffiliateCoupons(
  db: FirebaseFirestore.Firestore,
  identity: { uid: string },
  rawProfile: Record<string, any>,
) {
  const requestSnap = await db.collection('verification_requests').doc(identity.uid).get();
  const profile = applyVerificationRequest(rawProfile, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
  if (!profileRoleIsApproved(profile, 'afiliado')) {
    return { error: 'O perfil de Afiliado precisa estar aprovado para acessar cupons.', status: 403 } as const;
  }

  const affiliationSnap = await db.collection('affiliations').where('userId','==',identity.uid).limit(300).get();
  const affiliations = affiliationSnap.docs
    .map((doc)=>({id:doc.id,...doc.data()} as Record<string,any>))
    .filter((item)=>activeAffiliation(item.status));

  if (!affiliations.length) return { coupons: [] } as const;

  const couponSnap = await db.collection('coupons').limit(1000).get();
  const now = Date.now();
  const coupons = couponSnap.docs.flatMap((doc)=>{
    const item={id:doc.id,...doc.data()} as Record<string,any>;
    if(String(item.status||'').toLowerCase()!=='active') return [];
    const expiresMs=item.expiresAt?Date.parse(String(item.expiresAt)):NaN;
    if(Number.isFinite(expiresMs)&&expiresMs<=now) return [];
    const maxUses=Number(item.maxUses||0);
    const usedCount=Number(item.usedCount||0);
    if(maxUses>0&&usedCount>=maxUses) return [];

    const planRules=Array.isArray(item.applicablePlans)?item.applicablePlans.map(String):['all'];
    const affiliateRules=Array.isArray(item.applicableAffiliates)?item.applicableAffiliates.map(String):['all'];

    const eligiblePlans=affiliations.flatMap((aff)=>{
      const planId=String(aff.planId||aff.plan_id||'');
      const companyId=String(aff.companyId||'');
      const affiliateCode=String(aff.affiliateCode||aff.affiliate_code||'');
      if(!planId||!companyId||!affiliateCode||companyId!==String(item.companyId||'')) return [];
      if(!planRules.includes('all')&&!planRules.includes(planId)) return [];
      const affiliateAllowed=
        affiliateRules.includes('all')||
        affiliateRules.includes(identity.uid)||
        affiliateRules.includes(affiliateCode);
      if(!affiliateAllowed) return [];
      return [{planId,affiliateCode,companyId}];
    });

    if(!eligiblePlans.length) return [];
    return [{
      ...item,
      eligiblePlans,
    }];
  }).slice(0,200);

  return { coupons } as const;
}

export default async function handler(req:Req,res:Res){
  res.setHeader('Cache-Control','no-store');
  try{
    const identity=await verifyFirebaseIdentity(typeof req.headers.authorization==='string'?req.headers.authorization:undefined);
    const db=getServerAdminFirestore();
    const profileSnap=await db.collection('user_profiles').doc(identity.uid).get();
    if(!profileSnap.exists) return res.status(404).json({error:'Perfil não encontrado.'});
    const rawProfile=profileSnap.data() as Record<string,any>;

    const requestedRole=typeof req.query?.role==='string'?String(req.query.role).toLowerCase():'';
    if(req.method==='GET'&&requestedRole==='afiliado'){
      const result=await listAffiliateCoupons(db,identity,rawProfile);
      if('error' in result) return res.status(result.status).json({error:result.error});
      return res.status(200).json({success:true,coupons:result.coupons});
    }

    const approvedCompany=await resolveApprovedOwnedCompany(
      db,
      identity.uid,
      String(rawProfile.companyId||'').trim(),
    );
    if(!approvedCompany) return res.status(403).json({error:'A empresa precisa estar aprovada e ativa para gerenciar cupons.'});
    const companyId=approvedCompany.companyId;

    if(req.method==='GET'){
      const snap=await db.collection('coupons').where('companyId','==',companyId).limit(200).get();
      return res.status(200).json({success:true,coupons:snap.docs.map(d=>({id:d.id,...d.data()}))});
    }

    const body=req.body&&typeof req.body==='object'?req.body as Record<string,any>:{};
    if(req.method==='DELETE'){
      const id=String(body.id||req.query?.id||'');
      if(!id) return res.status(400).json({error:'Cupom inválido.'});
      const ref=db.collection('coupons').doc(id);
      const snap=await ref.get();
      if(!snap.exists) return res.status(404).json({error:'Cupom não encontrado.'});
      if(String(snap.data()!.companyId||'')!==companyId) return res.status(403).json({error:'Cupom pertence a outra empresa.'});
      await ref.delete();
      return res.status(200).json({success:true});
    }
    if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});

    const code=cleanCode(body.code);
    const discountType=body.discountType==='fixed'?'fixed':'percentage';
    const value=Number(body.value);
    const maxUses=Math.max(0,Math.floor(Number(body.maxUses||0)));
    const applicablePlans=Array.isArray(body.applicablePlans)?body.applicablePlans.map(String).slice(0,100):['all'];
    const applicableAffiliates=Array.isArray(body.applicableAffiliates)?body.applicableAffiliates.map(String).slice(0,100):['all'];
    const expiresAt=String(body.expiresAt||'').trim();
    if(expiresAt && !Number.isFinite(Date.parse(expiresAt))) return res.status(400).json({error:'Data de expiração inválida.'});
    if(code.length<3) return res.status(400).json({error:'O código precisa ter pelo menos 3 caracteres.'});
    if(!Number.isFinite(value)||value<=0||(discountType==='percentage'&&value>100)) return res.status(400).json({error:'Desconto inválido.'});
    for(const planId of applicablePlans.filter((p:string)=>p!=='all')){
      const plan=await db.collection('plans').doc(planId).get();
      if(!plan.exists || String(plan.data()!.companyId||'')!==companyId) return res.status(403).json({error:'Uma das ofertas selecionadas não pertence à empresa.'});
      const planData=plan.data()!;
      if(String(planData.billingType||'').toLowerCase()==='recorrente' || String(planData.paymentType||'').toLowerCase()==='recorrente'){
        return res.status(400).json({error:'Cupons são aceitos somente em produtos de pagamento único.'});
      }
    }
    const id=`${companyId}_${code}`;
    const ref=db.collection('coupons').doc(id);
    const old=await ref.get();
    const now=new Date().toISOString();
    const coupon={id,companyId,code,discountType,value,maxUses,usedCount:Number(old.data()?.usedCount||0),expiresAt,status:'active',applicablePlans,applicableAffiliates,updatedAt:now,...(old.exists?{}:{createdAt:now})};
    await ref.set(coupon,{merge:true});
    return res.status(200).json({success:true,coupon});
  }catch(error){
    const message=error instanceof Error?error.message:'Falha';
    console.error('[Coupons API]',message);
    if(/Firebase ID token|token inválido|auth\/id-token/i.test(message)){
      return res.status(401).json({error:'Sua sessão expirou. Entre novamente.'});
    }
    return res.status(503).json({error:'Não foi possível gerenciar cupons agora.'});
  }
}
