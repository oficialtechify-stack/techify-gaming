import { actionExists, authenticateMcpApiKey, executeMcpAction, extractApiKey, MCP_TOOLS } from '../../lib/mcpApi.js';

type Req = {
  method?: string;
  headers: Record<string,string|string[]|undefined>;
  body?: unknown;
};
type Res = {
  setHeader(name:string,value:string):void;
  status(code:number):Res;
  json(body:unknown):unknown;
  end():unknown;
};

type RpcRequest={jsonrpc?:string;id?:string|number|null;method?:string;params?:any};

function baseHeaders(res:Res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-API-Key, MCP-Protocol-Version');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
}

function result(id:RpcRequest['id'],value:any){
  return {jsonrpc:'2.0',id:id??null,result:value};
}
function rpcError(id:RpcRequest['id'],code:number,message:string,data?:any){
  return {jsonrpc:'2.0',id:id??null,error:{code,message,...(data===undefined?{}:{data})}};
}

export default async function handler(req:Req,res:Res){
  baseHeaders(res);
  if(req.method==='OPTIONS') return res.status(204).end();

  if(req.method==='GET'){
    return res.status(200).json({
      name:'LeadsPay MCP',
      version:'1.0.0',
      status:'active',
      transport:'Streamable HTTP / stateless JSON-RPC',
      protocolCompatibility:['2025-11-25','2025-06-18'],
      tools:MCP_TOOLS.map((tool)=>tool.name),
      authentication:'Authorization: Bearer lp_live_...',
      openapi:'/openapi.json',
    });
  }

  if(req.method!=='POST') return res.status(405).json({error:'Use GET ou POST.'});

  const body=req.body&&typeof req.body==='object'?req.body as RpcRequest:{};
  const method=String(body.method||'');
  const id=body.id;

  if(body.jsonrpc!=='2.0' || !method){
    return res.status(400).json(rpcError(id,-32600,'Invalid Request'));
  }

  // Current clients may probe the modern era first. Returning Method not found
  // intentionally triggers their documented fallback to the 2025 handshake.
  if(method==='server/discover'){
    return res.status(200).json(rpcError(id,-32601,'Method not found'));
  }

  if(method==='initialize'){
    try{
      const rawKey=extractApiKey(req.headers);
      if(!rawKey) return res.status(401).json(rpcError(id,-32001,'Authentication required'));
      await authenticateMcpApiKey(rawKey);
      res.setHeader('MCP-Protocol-Version','2025-11-25');
      return res.status(200).json(result(id,{
        protocolVersion:'2025-11-25',
        capabilities:{tools:{}},
        serverInfo:{name:'leadspay',version:'1.0.0'},
        instructions:'Use as ferramentas LeadsPay para consultar saldo, listar produtos, criar cupons da sua empresa e gerar checkouts oficiais.'
      }));
    }catch(error){
      return res.status(401).json(rpcError(id,-32001,error instanceof Error?error.message:'Authentication failed'));
    }
  }

  if(method==='notifications/initialized'){
    return res.status(202).end();
  }

  try{
    const rawKey=extractApiKey(req.headers);
    if(!rawKey) return res.status(401).json(rpcError(id,-32001,'Authentication required'));
    const principal=await authenticateMcpApiKey(rawKey);
    res.setHeader('MCP-Protocol-Version','2025-11-25');

    if(method==='ping') return res.status(200).json(result(id,{}));
    if(method==='tools/list'){
      return res.status(200).json(result(id,{tools:MCP_TOOLS}));
    }
    if(method==='tools/call'){
      const name=body.params?.name;
      if(!actionExists(name)) return res.status(200).json(rpcError(id,-32602,'Ferramenta inválida.'));
      try{
        const actionResult=await executeMcpAction(name,body.params?.arguments||{},principal);
        return res.status(200).json(result(id,{
          content:[{type:'text',text:JSON.stringify(actionResult,null,2)}],
          structuredContent:actionResult,
          isError:false,
        }));
      }catch(error){
        const message=error instanceof Error?error.message:'Falha ao executar ferramenta.';
        return res.status(200).json(result(id,{
          content:[{type:'text',text:message}],
          structuredContent:{success:false,error:message},
          isError:true,
        }));
      }
    }
    return res.status(200).json(rpcError(id,-32601,'Method not found'));
  }catch(error){
    return res.status(401).json(rpcError(id,-32001,error instanceof Error?error.message:'Authentication failed'));
  }
}
