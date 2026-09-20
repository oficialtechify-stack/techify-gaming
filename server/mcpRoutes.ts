import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { 
  Firestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  collection, 
  query, 
  where, 
  limit, 
  orderBy 
} from 'firebase/firestore';
import { validateApiKey } from '../lib/auth-partner';

// Tool definitions for MCP Protocol & Documentation
const MCP_TOOLS = [
  {
    name: 'get_balance',
    description: 'Consulta o saldo financeiro do afiliado/empresa na LeadsPay, incluindo saldo disponível para saque imediato via Pix, saldo pendente com liberação em 9 dias e dados bancários/Pix.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'create_coupon',
    description: 'Cria um novo cupom de desconto no sistema LeadsPay válido para planos e links de checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Código do cupom em letras maiúsculas (ex: PROMO15, VIP30)'
        },
        discount: {
          type: 'number',
          description: 'Valor numérico do desconto (ex: 15 para 15% ou 50 para R$ 50)'
        },
        discountType: {
          type: 'string',
          enum: ['percentage', 'fixed'],
          description: 'Tipo de desconto: percentage (%) ou fixed (R$). Padrão: percentage'
        },
        maxUses: {
          type: 'number',
          description: 'Limite máximo de utilizações do cupom. Padrão: 100'
        },
        expiresAt: {
          type: 'string',
          description: 'Data de validade do cupom (ex: 31/12/2026)'
        },
        planId: {
          type: 'string',
          description: 'ID do plano específico ou "all" para todos os produtos da empresa'
        }
      },
      required: ['code', 'discount']
    }
  },
  {
    name: 'create_checkout',
    description: 'Gera um link de checkout comissionado oficial na LeadsPay para um produto/plano com rastreamento do código de afiliado e cupom opcional.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID do produto ou plano (ex: pln_principal_exemplo, comp-1741...)'
        },
        affiliateId: {
          type: 'string',
          description: 'Código ou ID do afiliado (opcional; se omitido, usa o código do perfil autenticado)'
        },
        couponCode: {
          type: 'string',
          description: 'Código de cupom a ser pré-aplicado no checkout (opcional)'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'list_products',
    description: 'Lista os produtos e planos ativos disponíveis no marketplace da LeadsPay com seus IDs, preços e percentuais de comissão para afiliação.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Quantidade máxima de produtos a retornar (padrão: 15)'
        }
      }
    }
  },
  {
    name: 'list_coupons',
    description: 'Lista os cupons de desconto ativos cadastrados no sistema LeadsPay.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_affiliations',
    description: 'Retorna as afiliações e produtos promovidos pelo afiliado autenticado com seus links de comissão prontos.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

function formatBRL(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function resolveAppBaseUrl(req: Request): string {
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return 'https://techify-gaming.vercel.app';
}

/**
 * Setup MCP & Custom Actions Routes
 */
export function setupMcpRoutes(app: express.Express, db: Firestore) {
  // 1. Dynamic OpenAPI Specification Route
  const sendOpenApiSpec = (req: Request, res: Response) => {
    try {
      const filePath = path.join(process.cwd(), 'public', 'openapi.json');
      let content = '';
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }

      const spec = content ? JSON.parse(content) : {};
      const baseUrl = resolveAppBaseUrl(req);
      
      // Update dynamic servers
      spec.servers = [
        {
          url: `${baseUrl}/api/mcp/v1`,
          description: 'Servidor Dinâmico LeadsPay Atual'
        },
        {
          url: 'https://techify-gaming.vercel.app/api/mcp/v1',
          description: 'Servidor de Produção Oficial'
        }
      ];

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      return res.json(spec);
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao carregar especificação OpenAPI', details: e.message });
    }
  };

  app.get('/openapi.json', sendOpenApiSpec);
  app.get('/api/mcp/openapi.json', sendOpenApiSpec);
  app.get('/api/mcp/v1/openapi.json', sendOpenApiSpec);

  // 2. Info & Documentation Route
  const sendMcpInfo = (req: Request, res: Response) => {
    const baseUrl = resolveAppBaseUrl(req);
    res.json({
      name: 'LeadsPay MCP & Custom Actions Server',
      description: 'Conecte ChatGPT, Claude e Gemini diretamente à sua conta LeadsPay para consultar saldo, emitir cupons e gerar checkouts comissionados.',
      status: 'active',
      version: '1.0.0',
      protocol: 'Model Context Protocol (MCP 2024-11-05) & OpenAPI 3.1.0 Actions',
      openapi_schema_url: `${baseUrl}/openapi.json`,
      endpoints: {
        mcp_post: `${baseUrl}/api/mcp/v1`,
        mcp_legacy: `${baseUrl}/api/mcp`,
        balance: `${baseUrl}/api/mcp/v1/balance`,
        coupons: `${baseUrl}/api/mcp/v1/coupons`,
        checkout: `${baseUrl}/api/mcp/v1/checkout`,
        products: `${baseUrl}/api/mcp/v1/products`
      },
      tools: MCP_TOOLS.map(t => ({ name: t.name, description: t.description })),
      quick_setup: {
        chatgpt: {
          steps: [
            '1. No ChatGPT, acesse "Explore GPTs" > "Create a GPT".',
            '2. Vá na aba "Configure" e clique em "Create new action".',
            `3. Em Schema, insira: ${baseUrl}/openapi.json`,
            '4. Em Authentication, escolha "API Key", tipo "Bearer", e cole sua chave pessoal (lp_live_...).'
          ]
        },
        claude: {
          steps: [
            '1. No Claude Desktop ou cliente MCP, adicione o servidor LeadsPay.',
            `2. URL do endpoint: ${baseUrl}/api/mcp`,
            '3. Configure o cabeçalho "Authorization: Bearer <SUA_CHAVE_LEADSPAY>".'
          ]
        }
      }
    });
  };

  app.get('/api/mcp', sendMcpInfo);
  app.get('/api/mcp/v1', sendMcpInfo);

  // Helper to extract & validate API Key
  const authenticateUserApiKey = async (req: Request) => {
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || req.headers['apikey'];
    let apiKey = '';
    
    if (typeof authHeader === 'string') {
      apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (Array.isArray(authHeader) && authHeader[0]) {
      apiKey = authHeader[0].replace(/^Bearer\s+/i, '').trim();
    }

    // Also check query param ?api_key=... as fallback
    if (!apiKey && req.query.api_key && typeof req.query.api_key === 'string') {
      apiKey = req.query.api_key.trim();
    }

    if (!apiKey) {
      return { 
        success: false, 
        status: 401, 
        error: 'Chave API não fornecida. Envie o cabeçalho "Authorization: Bearer lp_live_..." com sua chave LeadsPay.' 
      };
    }

    const authResult = await validateApiKey(apiKey, db);
    if (!authResult.isValid || !authResult.userId) {
      return { 
        success: false, 
        status: 401, 
        error: authResult.error || 'Chave API da LeadsPay inválida ou não encontrada. Verifique na aba "Meu Perfil".' 
      };
    }

    // Fetch fresh user profile from Firestore
    let userProfile: any = authResult.raw || {};
    try {
      const profSnap = await getDoc(doc(db, 'user_profiles', authResult.userId));
      if (profSnap.exists()) {
        userProfile = { ...userProfile, ...profSnap.data() };
      } else {
        const userSnap = await getDoc(doc(db, 'users', authResult.userId));
        if (userSnap.exists()) {
          userProfile = { ...userProfile, ...userSnap.data() };
        }
      }
    } catch (e) {
      console.warn('[MCP Auth] Aviso ao buscar perfil completo:', e);
    }

    return {
      success: true,
      userId: authResult.userId,
      companyId: authResult.companyId || userProfile.companyId,
      companyName: authResult.companyName || userProfile.companyName,
      userProfile,
      apiKey
    };
  };

  /**
   * CORE ACTION EXECUTOR
   * Centralizes business logic for get_balance, create_coupon, create_checkout, etc.
   */
  async function executeAction(actionName: string, params: any, auth: any, req: Request) {
    const { userId, companyId, userProfile } = auth;
    const baseUrl = resolveAppBaseUrl(req);

    switch (actionName) {
      case 'get_balance': {
        const available = Number(userProfile.availableBalance) || 0;
        const pending = Number(userProfile.pendingBalance) || 0;
        const total = Number(userProfile.totalEarned) || (available + pending);
        const userName = userProfile.name || userProfile.firstName || 'Afiliado LeadsPay';

        return {
          success: true,
          action: 'get_balance',
          userName,
          email: userProfile.email || '',
          role: userProfile.role || 'afiliado',
          availableBalance: available,
          pendingBalance: pending,
          totalEarned: total,
          currency: 'BRL',
          formattedAvailable: formatBRL(available),
          formattedPending: formatBRL(pending),
          formattedTotalEarned: formatBRL(total),
          pixKey: userProfile.pixKey || null,
          pixKeyType: userProfile.pixKeyType || null,
          payoutSchedule: 'Liberação D+9 após aprovação da venda Asaas Pix',
          partnerLevel: userProfile.partnerLevel || 'Afiliado Starter'
        };
      }

      case 'create_coupon': {
        const rawCode = (params?.code || params?.couponCode || '').toString().trim();
        if (!rawCode) {
          throw new Error('Parâmetro "code" obrigatório para criar o cupom (ex: PROMO15).');
        }

        const cleanCode = rawCode.toUpperCase().replace(/\s+/g, '');
        const discountValue = Number(params?.discount || params?.value || params?.discountValue || 10);
        const discountType = params?.discountType === 'fixed' ? 'fixed' : 'percentage';
        const maxUses = Number(params?.maxUses || 100);
        const planScope = params?.planId || 'all';

        // Formata data de expiração (padrão 90 dias)
        const expiry = params?.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
        const nowIso = new Date().toISOString();
        const couponId = `cup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newCouponData: any = {
          id: couponId,
          code: cleanCode,
          discountType,
          value: discountValue,
          maxUses,
          usedCount: 0,
          expiresAt: expiry,
          status: 'active',
          applicablePlans: planScope === 'all' ? ['all'] : [planScope],
          applicablePlansNames: planScope === 'all' ? ['Todos os Produtos'] : [planScope],
          applicableAffiliates: ['all'],
          applicableAffiliatesNames: ['Todos os Afiliados'],
          companyId: companyId || userProfile.companyId || 'global',
          createdBy: userId,
          createdByName: userProfile.name || 'Assistente IA',
          createdAt: nowIso,
          updatedAt: nowIso
        };

        // Persiste no Firestore
        await setDoc(doc(db, 'coupons', couponId), newCouponData);
        console.log(`🤖 [MCP / Action] Cupom ${cleanCode} (${discountValue}${discountType === 'percentage' ? '%' : ' BRL'}) criado com sucesso para ${userId}.`);

        return {
          success: true,
          action: 'create_coupon',
          message: `Cupom "${cleanCode}" criado com sucesso! Desconto: ${discountType === 'percentage' ? `${discountValue}%` : formatBRL(discountValue)}.`,
          coupon: {
            id: couponId,
            code: cleanCode,
            discountType,
            value: discountValue,
            formattedDiscount: discountType === 'percentage' ? `${discountValue}% OFF` : `${formatBRL(discountValue)} OFF`,
            maxUses,
            expiresAt: expiry,
            status: 'active'
          }
        };
      }

      case 'create_checkout': {
        const productId = (params?.productId || params?.planId || params?.id || '').toString().trim();
        if (!productId) {
          throw new Error('Parâmetro "productId" obrigatório para gerar o checkout.');
        }

        // Tenta buscar o plano correspondente no Firestore
        let planName = 'Produto LeadsPay';
        let planPrice = 197.00;
        let commissionPercentage = 50;

        try {
          const planDocRef = doc(db, 'plans', productId);
          const planSnap = await getDoc(planDocRef);
          if (planSnap.exists()) {
            const pData = planSnap.data();
            planName = pData.name || planName;
            planPrice = Number(pData.priceSetup || pData.price || planPrice);
            commissionPercentage = Number(pData.commissionPercentage || commissionPercentage);
          } else {
            // Tenta buscar por slug ou código
            const q = query(collection(db, 'plans'), where('slug', '==', productId), limit(1));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              const pData = qSnap.docs[0].data();
              planName = pData.name || planName;
              planPrice = Number(pData.priceSetup || pData.price || planPrice);
              commissionPercentage = Number(pData.commissionPercentage || commissionPercentage);
            }
          }
        } catch (planErr) {
          console.warn('[MCP create_checkout] Aviso ao localizar plano:', planErr);
        }

        // Resolve o código do afiliado
        let affiliateCode = params?.affiliateId || params?.affiliateCode || userProfile.affiliateCode;
        if (!affiliateCode) {
          // Se o usuário tem cleanCpf ou ID
          affiliateCode = userProfile.cleanCpf ? `AFF${userProfile.cleanCpf.slice(-6)}` : `AFF${userId.slice(-6).toUpperCase()}`;
        }

        const couponCode = params?.couponCode || params?.coupon;
        const queryParams = new URLSearchParams();
        queryParams.set('ref', affiliateCode);
        if (couponCode) {
          queryParams.set('coupon', String(couponCode).toUpperCase().trim());
        }

        const checkoutUrl = `${baseUrl}/plan/${productId}?${queryParams.toString()}`;
        const directCheckoutUrl = `${baseUrl}/checkout/${productId}?${queryParams.toString()}`;

        return {
          success: true,
          action: 'create_checkout',
          productId,
          productName: planName,
          price: planPrice,
          formattedPrice: formatBRL(planPrice),
          affiliateCode,
          commissionPercentage: `${commissionPercentage}%`,
          estimatedCommission: formatBRL((planPrice * commissionPercentage) / 100),
          checkoutUrl,
          directCheckoutUrl,
          message: `Link de checkout gerado com sucesso para ${planName} com rastreamento do afiliado ${affiliateCode}.`
        };
      }

      case 'list_products':
      case 'list_plans': {
        const itemLimit = Math.min(Number(params?.limit) || 15, 50);
        let plansList: any[] = [];

        try {
          const plansQuery = query(collection(db, 'plans'), limit(itemLimit));
          const snap = await getDocs(plansQuery);
          snap.forEach(d => {
            const data = d.data();
            plansList.push({
              id: d.id,
              name: data.name,
              category: data.category || 'Geral',
              price: Number(data.priceSetup || data.price || 0),
              formattedPrice: formatBRL(Number(data.priceSetup || data.price || 0)),
              commissionPercentage: Number(data.commissionPercentage || 0),
              companyName: data.companyName || 'Empresa Parceira',
              checkoutUrl: `${baseUrl}/plan/${d.id}?ref=${userProfile.affiliateCode || userId.slice(-6).toUpperCase()}`
            });
          });
        } catch (pErr) {
          console.warn('[MCP list_products] Erro ao listar:', pErr);
        }

        return {
          success: true,
          action: 'list_products',
          total: plansList.length,
          products: plansList
        };
      }

      case 'list_coupons': {
        let couponsList: any[] = [];
        try {
          const cQuery = query(collection(db, 'coupons'), limit(20));
          const snap = await getDocs(cQuery);
          snap.forEach(d => {
            const data = d.data();
            couponsList.push({
              id: d.id,
              code: data.code,
              discountType: data.discountType,
              value: data.value,
              status: data.status,
              expiresAt: data.expiresAt,
              usedCount: data.usedCount || 0,
              maxUses: data.maxUses || 0
            });
          });
        } catch (cErr) {
          console.warn('[MCP list_coupons] Erro:', cErr);
        }

        return {
          success: true,
          action: 'list_coupons',
          total: couponsList.length,
          coupons: couponsList
        };
      }

      case 'get_affiliations': {
        let affList: any[] = [];
        try {
          const affQ = query(collection(db, 'affiliations'), where('userId', '==', userId), limit(25));
          const snap = await getDocs(affQ);
          snap.forEach(d => {
            const data = d.data();
            affList.push({
              id: d.id,
              planId: data.planId,
              planName: data.planName,
              companyName: data.companyName,
              commissionPercentage: data.commissionPercentage,
              affiliateCode: data.affiliateCode,
              affiliateLink: data.affiliateLink || `${baseUrl}/plan/${data.planId}?ref=${data.affiliateCode}`,
              clicks: data.clicks || 0,
              salesCount: data.salesCount || 0,
              totalEarned: data.totalEarned || 0,
              formattedEarned: formatBRL(data.totalEarned || 0)
            });
          });
        } catch (aErr) {
          console.warn('[MCP get_affiliations] Erro:', aErr);
        }

        return {
          success: true,
          action: 'get_affiliations',
          total: affList.length,
          affiliations: affList
        };
      }

      default:
        throw new Error(`Ação não reconhecida: "${actionName}". Ações suportadas: get_balance, create_coupon, create_checkout, list_products, list_coupons, get_affiliations.`);
    }
  }

  // 3. MCP Unified POST Endpoint (/api/mcp/v1 and /api/mcp)
  const handleMcpPost = async (req: Request, res: Response) => {
    // Enable CORS for AI Studio, ChatGPT and custom frontends
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-api-key');

    const auth = await authenticateUserApiKey(req);
    if (!auth.success) {
      return res.status(auth.status).json({ 
        error: auth.error, 
        tip: 'Obtenha sua Chave API acessando LeadsPay > Meu Perfil > Conectar com ChatGPT / Claude.' 
      });
    }

    const body = req.body || {};

    // 3A. MCP Protocol (JSON-RPC 2.0 for Claude Desktop / Claude Web)
    if (body.jsonrpc === '2.0') {
      const requestId = body.id !== undefined ? body.id : null;
      const method = body.method;

      if (method === 'initialize') {
        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'leadspay-mcp-server',
              version: '1.0.0'
            },
            capabilities: {
              tools: {}
            }
          }
        });
      }

      if (method === 'tools/list') {
        return res.json({
          jsonrpc: '2.0',
          id: requestId,
          result: {
            tools: MCP_TOOLS
          }
        });
      }

      if (method === 'tools/call') {
        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments || {};

        try {
          const actionResult = await executeAction(toolName, toolArgs, auth, req);
          return res.json({
            jsonrpc: '2.0',
            id: requestId,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(actionResult, null, 2)
                }
              ]
            }
          });
        } catch (toolErr: any) {
          return res.json({
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32603,
              message: toolErr.message || 'Erro ao executar ferramenta LeadsPay'
            }
          });
        }
      }

      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32601,
          message: `Método MCP não encontrado: ${method}`
        }
      });
    }

    // 3B. ChatGPT Custom Actions / OpenAPI Action Format
    const action = body.action || body.operationId || body.name;
    const params = body.params || body.arguments || body;

    if (!action) {
      return res.status(400).json({
        error: 'Parâmetro "action" obrigatório.',
        supported_actions: ['get_balance', 'create_coupon', 'create_checkout', 'list_products', 'list_coupons', 'get_affiliations'],
        example: {
          action: 'get_balance'
        }
      });
    }

    try {
      const result = await executeAction(action, params, auth, req);
      return res.json(result);
    } catch (err: any) {
      console.error(`[MCP Action Error] Ação "${action}":`, err);
      return res.status(400).json({
        error: err.message || 'Erro ao processar ação na LeadsPay.',
        action
      });
    }
  };

  app.post('/api/mcp/v1', handleMcpPost);
  app.post('/api/mcp', handleMcpPost);

  // 4. Dedicated REST Endpoints for Direct HTTP / OpenAPI Clients
  app.get('/api/mcp/v1/balance', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const auth = await authenticateUserApiKey(req);
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });

    try {
      const result = await executeAction('get_balance', {}, auth, req);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/mcp/v1/coupons', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const auth = await authenticateUserApiKey(req);
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });

    try {
      const result = await executeAction('create_coupon', req.body, auth, req);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/mcp/v1/checkout', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const auth = await authenticateUserApiKey(req);
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });

    try {
      const result = await executeAction('create_checkout', req.body, auth, req);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/mcp/v1/products', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const auth = await authenticateUserApiKey(req);
    if (!auth.success) return res.status(auth.status).json({ error: auth.error });

    try {
      const result = await executeAction('list_products', req.query, auth, req);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  console.log('🤖 [MCP & Custom Actions] Rotas /api/mcp/v1, /api/mcp e /openapi.json registradas com sucesso.');
}
