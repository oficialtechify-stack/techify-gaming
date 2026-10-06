import { actionExists, authenticateMcpApiKey, executeMcpAction, extractApiKey } from '../../lib/mcpApi.js';

type Req = {
  method?: string;
  headers: Record<string,string|string[]|undefined>;
  body?: unknown;
  query?: Record<string,string|string[]|undefined>;
  mcpRoute?: string;
};
type Res = {
  setHeader(name:string,value:string):void;
  status(code:number):Res;
  json(body:unknown):unknown;
  end():unknown;
};

function cors(res:Res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-API-Key');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
}

const queryText=(value:string|string[]|undefined):string=>Array.isArray(value)?String(value[0]||''):String(value||'');

export default async function handler(req:Req,res:Res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();

  const route=String(req.mcpRoute||'').replace(/^\/+|\/+$/g,'');
  if(route==='status' && req.method==='GET'){
    return res.status(200).json({
      ok:true,
      service:'LeadsPay AI API',
      version:'1.0.0',
      environment:process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown',
      authentication:'Bearer API Key',
      endpoints:['balance','products','coupons','checkout','affiliations','affiliate-performance','affiliate-coupons'],
    });
  }

  try{
    const rawKey=extractApiKey(req.headers);
    if(!rawKey) return res.status(401).json({error:'Envie Authorization: Bearer <SUA_CHAVE_LEADSPAY>.'});
    const principal=await authenticateMcpApiKey(rawKey);

    if(route==='' && req.method==='POST'){
      const body=req.body&&typeof req.body==='object'?req.body as Record<string,any>:{};
      const action=body.action;
      if(!actionExists(action)) return res.status(400).json({error:'Ação inválida.'});
      const result=await executeMcpAction(action,body.params&&typeof body.params==='object'?body.params:{},principal);
      return res.status(200).json(result);
    }

    if(route==='balance' && req.method==='GET'){
      return res.status(200).json(await executeMcpAction('get_balance',{
        role:queryText(req.query?.role)||undefined,
      },principal));
    }

    if(route==='products' && req.method==='GET'){
      return res.status(200).json(await executeMcpAction('list_products',{
        limit:queryText(req.query?.limit)||undefined,
        scope:queryText(req.query?.scope)||undefined,
      },principal));
    }

    if(route==='affiliations' && req.method==='GET'){
      return res.status(200).json(await executeMcpAction('get_affiliations',{},principal));
    }

    if(route==='affiliate-performance' && req.method==='GET'){
      return res.status(200).json(await executeMcpAction('get_affiliate_performance',{
        days:queryText(req.query?.days)||undefined,
      },principal));
    }

    if(route==='affiliate-coupons' && req.method==='GET'){
      return res.status(200).json(await executeMcpAction('list_affiliate_coupons',{},principal));
    }

    if(route==='coupons'){
      if(req.method==='GET') return res.status(200).json(await executeMcpAction('list_coupons',{},principal));
      if(req.method==='POST'){
        const body=req.body&&typeof req.body==='object'?req.body as Record<string,any>:{};
        return res.status(200).json(await executeMcpAction('create_coupon',body,principal));
      }
    }

    if(route==='checkout' && req.method==='POST'){
      const body=req.body&&typeof req.body==='object'?req.body as Record<string,any>:{};
      return res.status(200).json(await executeMcpAction('create_checkout',body,principal));
    }

    return res.status(404).json({error:'Endpoint MCP/Actions não encontrado.'});
  }catch(error){
    const message=error instanceof Error?error.message:'Falha na API.';
    const unauthorized=/API Key|chave|bloqueada|arquivada|perfil aprovado/i.test(message);
    const forbidden=/requer perfil|permissão|não possui afiliação|não pertence|empresa não está aprovada/i.test(message);
    return res.status(unauthorized?401:forbidden?403:400).json({error:message});
  }
}
