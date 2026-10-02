import { randomUUID } from 'node:crypto';
import checkoutHandler from '../stripe/checkout.js';
import { authenticateMcpApiKey, extractApiKey } from '../../lib/mcpApi.js';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';

type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader(name:string,value:string):void;status(code:number):Res;json(body:unknown):unknown;end():unknown};

export default async function handler(req:Req,res:Res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});

  try{
    const raw=extractApiKey(req.headers);
    if(!raw) return res.status(401).json({error:'API Key ausente.'});

    const principal=await authenticateMcpApiKey(raw);
    if(!principal.approvedRoles.includes('empresa') || !principal.scopes.includes('payments:create')){
      return res.status(403).json({error:'Esta chave não possui permissão de Empresa para criar pagamentos.'});
    }

    const companyId=String(principal.companyId||'').trim();
    if(!companyId) return res.status(403).json({error:'Esta chave não está vinculada a uma empresa ativa.'});

    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const planId=String(body.planId||'').trim();
    if(!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) return res.status(400).json({error:'planId inválido.'});

    const db=getServerAdminFirestore();
    const planSnap=await db.collection('plans').doc(planId).get();
    if(!planSnap.exists || String(planSnap.data()!.companyId||'')!==companyId){
      return res.status(403).json({error:'Esta oferta não pertence à empresa vinculada à chave.'});
    }

    const plan=planSnap.data()!;
    if(
      String(plan.status||'').toLowerCase()!=='ativo' ||
      plan.active===false ||
      plan.archived===true ||
      plan.isArchived===true
    ){
      return res.status(409).json({error:'Esta oferta está pausada ou indisponível.'});
    }

    if(
      String(plan.billingType||'').toLowerCase()==='recorrente' ||
      String(plan.paymentType||'').toLowerCase()==='recorrente'
    ){
      return res.status(409).json({
        error:'Assinaturas recorrentes usam o checkout hospedado da Stripe. Gere o link oficial de checkout para esta oferta.',
        code:'RECURRING_REQUIRES_HOSTED_CHECKOUT',
      });
    }

    const buyerName=String(body.buyerName||body.customerName||'').trim().slice(0,120);
    const buyerEmail=String(body.buyerEmail||body.customerEmail||'').trim().toLowerCase().slice(0,200);
    if(!buyerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)){
      return res.status(400).json({error:'buyerName e buyerEmail válidos são obrigatórios.'});
    }

    const attemptId=String(body.attemptId||'').trim() || ('api_'+randomUUID().replace(/-/g,''));
    const safeReq:any={...req,body:{
      planId,
      attemptId,
      buyerName,
      buyerEmail,
      affiliateCode:String(body.affiliateCode||'').trim().slice(0,64),
      couponCode:String(body.couponCode||'').trim().slice(0,64),
      utmSource:String(body.utmSource||'api_partner').trim().slice(0,100),
      utmMedium:String(body.utmMedium||'api').trim().slice(0,100),
      utmCampaign:String(body.utmCampaign||'').trim().slice(0,140),
    }};
    return checkoutHandler(safeReq,res as any);
  }catch(error){
    const message=error instanceof Error?error.message:'Falha';
    console.error('[Partner payments]',message);
    if(/API Key|chave|bloqueada|arquivada|perfil aprovado/i.test(message)){
      return res.status(401).json({error:message});
    }
    return res.status(503).json({error:'Não foi possível iniciar o pagamento pela API.'});
  }
}
