import { createHash } from 'node:crypto';
import checkoutHandler from '../stripe/checkout.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown;end():unknown};

export default async function handler(req:Req,res:Res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
  try{
    const raw=typeof req.headers['x-api-key']==='string'?req.headers['x-api-key'] as string:
      (typeof req.headers.authorization==='string'?req.headers.authorization.replace(/^Bearer\s+/i,''):'');
    if(!raw) return res.status(401).json({error:'API Key ausente.'});
    const {getServerAdminFirestore}=await import('../../lib/firebaseAdminServer.js');
    const db=getServerAdminFirestore();
    const keyHash=createHash('sha256').update(raw).digest('hex');
    const keySnap=await db.collection('partner_api_keys').where('keyHash','==',keyHash).where('active','==',true).limit(1).get();
    if(keySnap.empty) return res.status(401).json({error:'API Key inválida ou revogada.'});
    const key=keySnap.docs[0].data();
    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const planId=String(body.planId||'').trim();
    if(!planId) return res.status(400).json({error:'planId é obrigatório.'});
    const planSnap=await db.collection('plans').doc(planId).get();
    if(!planSnap.exists || String(planSnap.data()!.companyId||'')!==String(key.companyId||'')) return res.status(403).json({error:'Esta oferta não pertence à chave informada.'});
    const attemptId=String(body.attemptId||'').trim() || ('api_'+crypto.randomUUID().replace(/-/g,''));
    const safeReq:any={...req,body:{
      planId,
      attemptId,
      buyerName:String(body.buyerName||body.customerName||'Cliente').slice(0,120),
      buyerEmail:String(body.buyerEmail||body.customerEmail||'').slice(0,200),
      affiliateCode:String(body.affiliateCode||'').slice(0,64),
      couponCode:String(body.couponCode||'').slice(0,64),
    }};
    return checkoutHandler(safeReq,res as any);
  }catch(error){
    console.error('[Partner payments]',error instanceof Error?error.message:'Falha');
    return res.status(503).json({error:'Não foi possível iniciar o pagamento pela API.'});
  }
}
