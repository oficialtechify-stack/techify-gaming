import { randomBytes } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

type WorkerId =
  | 'lumy-manager'
  | 'frontend'
  | 'backend'
  | 'designer'
  | 'qa'
  | 'growth';

type TaskStatus =
  | 'queued'
  | 'working'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

type ExecutionReport = {
  summary: string;
  findings: string[];
  proposedChanges: string[];
  validation: string[];
  risks: string[];
  nextStep: string;
  filesReviewed: string[];
};

const WORKERS = [
  {
    id: 'lumy-manager',
    name: 'Lumy',
    role: 'Gerente IA',
    specialty: 'Quebra projetos grandes em tarefas, acompanha o time e pede sua aprovação.',
    palette: 0,
    permissions: ['planejar', 'coordenar', 'analisar_projeto', 'propor_subtarefas'],
    repoPrefixes: [] as string[],
  },
  {
    id: 'frontend',
    name: 'Pixel',
    role: 'Frontend',
    specialty: 'Interfaces, responsividade, acessibilidade e experiência do usuário.',
    palette: 1,
    permissions: ['ler_frontend', 'propor_frontend', 'propor_testes_ui'],
    repoPrefixes: ['src/components/', 'src/styles/', 'src/context/', 'src/types/'],
  },
  {
    id: 'backend',
    name: 'Stack',
    role: 'Backend',
    specialty: 'APIs, Firebase, regras de negócio, integrações e segurança.',
    palette: 2,
    permissions: ['ler_backend', 'propor_backend', 'propor_regras', 'propor_testes_api'],
    repoPrefixes: ['server-api/', 'lib/', 'api/', 'server.ts', 'firestore.rules'],
  },
  {
    id: 'designer',
    name: 'Iris',
    role: 'Designer UI/UX',
    specialty: 'Identidade visual, componentes, fluxos e acabamento profissional.',
    palette: 3,
    permissions: ['ler_interface', 'propor_design', 'propor_css', 'propor_fluxos'],
    repoPrefixes: ['src/components/', 'src/styles/'],
  },
  {
    id: 'qa',
    name: 'Scout',
    role: 'QA & Testes',
    specialty: 'Testes, regressões, validação de produção e checklist de aceite.',
    palette: 4,
    permissions: ['ler_projeto', 'analisar_riscos', 'propor_testes', 'validar_regressoes'],
    repoPrefixes: ['src/', 'server-api/', 'lib/', 'api/', 'package.json', 'firestore.rules'],
  },
  {
    id: 'growth',
    name: 'Nova',
    role: 'Marketing & Comunidade',
    specialty: 'Conteúdo, comunidade, campanhas e experiência de afiliados.',
    palette: 5,
    permissions: ['analisar_produto', 'criar_rascunhos', 'propor_campanhas', 'propor_comunidade'],
    repoPrefixes: ['src/components/platform/Comunidade', 'src/components/LeadspayLanding', 'src/styles/'],
  },
] as const;

const VALID_WORKER_IDS = new Set(WORKERS.map((worker) => worker.id));
const VALID_STATUS = new Set<TaskStatus>([
  'queued',
  'working',
  'waiting_approval',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);
const VALID_PRIORITY = new Set(['low', 'normal', 'high', 'urgent']);

const REPO_FULL_NAME = 'oficialtechify-stack/techify-gaming';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_CONTEXT_FILES = 6;
const MAX_FILE_CHARS = 22000;

function cleanText(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max);
}

function cleanList(value: unknown, maxItems = 12, maxChars = 700): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeReport(value: unknown, filesReviewed: string[]): ExecutionReport {
  const data = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  return {
    summary: cleanText(data.summary, 3500) || 'Análise concluída pelo funcionário IA.',
    findings: cleanList(data.findings, 12, 900),
    proposedChanges: cleanList(data.proposedChanges, 14, 1200),
    validation: cleanList(data.validation, 12, 900),
    risks: cleanList(data.risks, 10, 900),
    nextStep: cleanText(data.nextStep, 1600),
    filesReviewed: cleanList(data.filesReviewed, 12, 300).length
      ? cleanList(data.filesReviewed, 12, 300)
      : filesReviewed,
  };
}

function serializeTask(id: string, data: Record<string, any>) {
  return {
    id,
    workerId: String(data.workerId || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    project: String(data.project || 'LeadsPay'),
    priority: String(data.priority || 'normal'),
    status: String(data.status || 'queued'),
    progress: Math.max(0, Math.min(100, Number(data.progress || 0))),
    requiresApproval: data.requiresApproval !== false,
    executionMode: String(data.executionMode || 'gemini_supervised'),
    runtimeStatus: String(data.runtimeStatus || 'awaiting_executor'),
    resultSummary: data.resultSummary ? String(data.resultSummary) : null,
    executionReport: data.executionReport || null,
    executorProvider: data.executorProvider ? String(data.executorProvider) : null,
    executorModel: data.executorModel ? String(data.executorModel) : null,
    lastRunAt: data.lastRunAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    startedAt: data.startedAt || null,
    completedAt: data.completedAt || null,
    createdBy: data.createdBy || null,
  };
}

function isReadableRepoPath(path: string, worker: (typeof WORKERS)[number]): boolean {
  if (!path || path.includes('node_modules/') || path.includes('dist/')) return false;
  if (/(^|\/)(\.env|secrets?|credentials?|service-account)/i.test(path)) return false;
  if (/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|zip|pdf|lock)$/i.test(path)) return false;
  if (!/\.(tsx?|jsx?|css|json|md|rules|mjs|cjs)$/i.test(path) && !['server.ts', 'package.json'].includes(path)) {
    return false;
  }
  if (!worker.repoPrefixes.length) return false;
  return worker.repoPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function taskTerms(task: Record<string, any>): string[] {
  const stop = new Set([
    'para', 'com', 'que', 'uma', 'uns', 'das', 'dos', 'por', 'como', 'esta', 'esse',
    'essa', 'isso', 'site', 'leadspay', 'fazer', 'ajustar', 'criar', 'deixar', 'funcao',
    'função', 'tela', 'pagina', 'página', 'parte', 'mais', 'todo', 'toda',
  ]);
  return String(`${task.title || ''} ${task.description || ''}`)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !stop.has(term))
    .slice(0, 30);
}

async function collectRepoContext(
  task: Record<string, any>,
  worker: (typeof WORKERS)[number],
): Promise<{ context: string; files: string[] }> {
  if (task.project !== 'LeadsPay' || !worker.repoPrefixes.length) {
    return { context: '', files: [] };
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_FULL_NAME}/git/trees/main?recursive=1`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LeadsPay-AI-Employees',
      },
    },
  );

  if (!response.ok) return { context: '', files: [] };

  const tree = await response.json() as { tree?: Array<{ path?: string; type?: string }> };
  const terms = taskTerms(task);
  const candidates = (tree.tree || [])
    .filter((item) => item.type === 'blob' && item.path && isReadableRepoPath(item.path, worker))
    .map((item) => {
      const path = String(item.path);
      const lower = path.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (lower.includes(term)) score += term.length >= 7 ? 6 : 3;
      }
      if (worker.id === 'frontend' && /View\.tsx$|Page\.tsx$|Layout\.tsx$/.test(path)) score += 2;
      if (worker.id === 'designer' && /\.css$|View\.tsx$|Page\.tsx$/.test(path)) score += 2;
      if (worker.id === 'backend' && /server-api|lib|api\//.test(path)) score += 2;
      if (worker.id === 'qa' && /package\.json|rules|server-api|View\.tsx$/.test(path)) score += 1;
      return { path, score };
    })
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, MAX_CONTEXT_FILES);

  const parts: string[] = [];
  const files: string[] = [];

  for (const candidate of candidates) {
    try {
      const fileResponse = await fetch(
        `https://raw.githubusercontent.com/${REPO_FULL_NAME}/main/${candidate.path}`,
        { headers: { 'User-Agent': 'LeadsPay-AI-Employees' } },
      );
      if (!fileResponse.ok) continue;
      const raw = (await fileResponse.text()).slice(0, MAX_FILE_CHARS);
      files.push(candidate.path);
      parts.push(`\n--- FILE: ${candidate.path} ---\n${raw}\n--- END FILE ---`);
    } catch {
      // Um arquivo indisponível não deve derrubar a execução inteira.
    }
  }

  return { context: parts.join('\n'), files };
}

function workerPolicy(worker: (typeof WORKERS)[number]): string {
  const common = [
    'Você trabalha dentro do Admin da LeadsPay e responde em português do Brasil.',
    'Nunca diga que editou, publicou, fez deploy ou alterou arquivos se a execução atual apenas analisou o repositório.',
    'Não exponha nem peça chaves, tokens, segredos, CPF, dados bancários ou credenciais.',
    'Mudanças de Stripe, saldo, saques, autenticação, exclusão de dados, regras de acesso e deploy são críticas e exigem aprovação explícita do Admin.',
    'Se faltar contexto, diga exatamente o que falta e faça a melhor análise possível com o que recebeu.',
    'Priorize uma solução que preserve isolamento entre Empresa, Afiliado e Admin.',
  ];

  const roleRules: Record<WorkerId, string[]> = {
    'lumy-manager': [
      'Seu papel é coordenar: decomponha o objetivo, defina ordem, responsáveis, riscos e critérios de aceite.',
      'Não invente que os outros funcionários já executaram subtarefas.',
    ],
    frontend: [
      'Concentre-se em React, TypeScript, responsividade, acessibilidade e experiência visual.',
      'Não proponha alterações financeiras/backend fora do necessário para explicar uma dependência.',
    ],
    backend: [
      'Concentre-se em API, Firestore, regras de negócio, segurança, validação, idempotência e isolamento de tenant.',
      'Em pagamentos e saques, seja conservador e trate qualquer mutação como crítica.',
    ],
    designer: [
      'Concentre-se em layout, hierarquia, legibilidade, consistência visual, mobile e estados de interação.',
      'Não mude lógica de negócio; sinalize dependências para Frontend/Backend.',
    ],
    qa: [
      'Atue como leitura e validação: encontre riscos, regressões e cenários de teste.',
      'Não proponha deploy automático e não assuma que um teste passou sem evidência.',
    ],
    growth: [
      'Concentre-se em conteúdo, comunidade, onboarding, campanhas e experiência de afiliados.',
      'Não invente métricas nem resultados de campanha.',
    ],
  };

  return [...common, ...(roleRules[worker.id as WorkerId] || [])].map((line) => '- ' + line).join('\n');
}

function parseGeminiJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^\`\`\`(?:json)?\s*/i, '')
    .replace(/\s*\`\`\`$/i, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1));
    }
    throw new Error('O executor respondeu em um formato inválido.');
  }
}

async function executeWithGemini(task: Record<string, any>) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY não está configurada neste projeto.');

  const worker = WORKERS.find((item) => item.id === task.workerId);
  if (!worker) throw new Error('Funcionário IA inválido.');

  const model = String(process.env.AI_EMPLOYEE_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const repo = await collectRepoContext(task, worker);

  const prompt = `
Você é ${worker.name}, funcionário "${worker.role}" da equipe virtual da LeadsPay.
Especialidade: ${worker.specialty}
Permissões: ${worker.permissions.join(', ')}

REGRAS DO FUNCIONÁRIO
${workerPolicy(worker)}

TAREFA RECEBIDA
Projeto: ${task.project}
Prioridade: ${task.priority}
Título: ${task.title}
Descrição:
${task.description}

CONTEXTO DO REPOSITÓRIO
${repo.context || 'Nenhum arquivo do repositório foi anexado nesta execução. Analise a tarefa sem alegar que inspecionou arquivos.'}

Entregue trabalho real de análise e preparação. Quando houver código, descreva exatamente os arquivos e mudanças propostas, mas NÃO afirme que os arquivos foram editados.
Responda APENAS JSON válido, sem markdown, neste formato:
{
  "summary": "resumo objetivo do trabalho realizado",
  "findings": ["descoberta concreta"],
  "proposedChanges": ["arquivo/camada: alteração proposta de forma específica"],
  "validation": ["teste ou verificação que deve ser feita"],
  "risks": ["risco relevante"],
  "nextStep": "próximo passo recomendado",
  "filesReviewed": ["caminho/do/arquivo"]
}
`.trim();

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: 5000,
      responseMimeType: 'application/json',
    },
  });

  const raw = String(response.text || '').trim();
  if (!raw) throw new Error('O executor Gemini não retornou conteúdo.');

  const parsed = parseGeminiJson(raw);
  return {
    report: safeReport(parsed, repo.files),
    model,
  };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const admin = await requireAdminIdentity(req.headers);
    const db = getServerAdminFirestore();
    const tasks = db.collection('admin_ai_tasks');
    const geminiConnected = Boolean(String(process.env.GEMINI_API_KEY || '').trim());

    if (req.method === 'GET') {
      const snap = await tasks.orderBy('createdAt', 'desc').limit(250).get();
      const taskList = snap.docs.map((doc) => serializeTask(doc.id, doc.data() as Record<string, any>));

      return res.status(200).json({
        success: true,
        workers: WORKERS,
        tasks: taskList,
        executionEngine: {
          connected: geminiConnected,
          mode: geminiConnected ? 'gemini_supervised' : 'supervised',
          provider: geminiConnected ? 'Gemini' : null,
          model: geminiConnected ? String(process.env.AI_EMPLOYEE_MODEL || DEFAULT_MODEL) : null,
          repoReadConnected: true,
          repoWriteConnected: false,
          message: geminiConnected
            ? 'Cérebro Gemini conectado. Os funcionários já analisam tarefas e o repositório. Escrita automática no GitHub continua bloqueada até a etapa de aprovação/credencial de execução.'
            : 'Fila real criada. Configure GEMINI_API_KEY para os funcionários executarem análises automaticamente.',
        },
      });
    }

    const body = req.body && typeof req.body === 'object'
      ? req.body as Record<string, unknown>
      : {};

    if (req.method === 'POST') {
      const action = cleanText(body.action, 40).toLowerCase();

      if (action === 'run-task') {
        const taskId = cleanText(body.taskId, 180);
        if (!taskId || !/^aitask_[A-Za-z0-9_]+$/.test(taskId)) {
          return res.status(400).json({ error: 'Tarefa inválida.' });
        }
        if (!geminiConnected) {
          return res.status(503).json({ error: 'O executor Gemini ainda não está conectado.' });
        }

        const ref = tasks.doc(taskId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Tarefa não encontrada.' });

        const task = snap.data() as Record<string, any>;
        if (['completed', 'cancelled'].includes(String(task.status || ''))) {
          return res.status(409).json({ error: 'Esta tarefa já foi encerrada.' });
        }

        const startedAt = task.startedAt || new Date().toISOString();
        await ref.set({
          status: 'working',
          progress: Math.max(15, Number(task.progress || 0)),
          executionMode: 'gemini_supervised',
          runtimeStatus: 'ai_analyzing',
          startedAt,
          updatedAt: new Date().toISOString(),
          executorProvider: 'gemini',
        }, { merge: true });

        try {
          const { report, model } = await executeWithGemini(task);
          const now = new Date().toISOString();
          const requiresApproval = task.requiresApproval !== false;
          const nextStatus: TaskStatus = requiresApproval ? 'waiting_approval' : 'completed';

          await ref.set({
            status: nextStatus,
            progress: requiresApproval ? 85 : 100,
            executionMode: 'gemini_supervised',
            runtimeStatus: requiresApproval ? 'ai_waiting_admin' : 'done',
            resultSummary: report.summary,
            executionReport: report,
            executorProvider: 'gemini',
            executorModel: model,
            lastRunAt: now,
            updatedAt: now,
            ...(requiresApproval ? {} : { completedAt: now }),
          }, { merge: true });

          const after = await ref.get();
          return res.status(200).json({
            success: true,
            task: serializeTask(taskId, after.data() as Record<string, any>),
          });
        } catch (executionError) {
          const message = executionError instanceof Error
            ? executionError.message
            : 'Falha desconhecida no executor.';
          const now = new Date().toISOString();
          await ref.set({
            status: 'failed',
            runtimeStatus: 'ai_failed',
            resultSummary: message,
            updatedAt: now,
            lastRunAt: now,
          }, { merge: true });

          return res.status(503).json({
            error: 'O funcionário não conseguiu concluir a análise agora.',
            detail: message,
          });
        }
      }

      const workerId = cleanText(body.workerId, 80);
      const title = cleanText(body.title, 140);
      const description = cleanText(body.description, 5000);
      const project = cleanText(body.project, 100) || 'LeadsPay';
      const priority = cleanText(body.priority, 20).toLowerCase() || 'normal';
      const requiresApproval = body.requiresApproval !== false;

      if (!VALID_WORKER_IDS.has(workerId as any)) {
        return res.status(400).json({ error: 'Funcionário IA inválido.' });
      }
      if (title.length < 3) {
        return res.status(400).json({ error: 'Informe um título para a tarefa.' });
      }
      if (description.length < 10) {
        return res.status(400).json({ error: 'Descreva melhor a tarefa para o funcionário.' });
      }
      if (!VALID_PRIORITY.has(priority)) {
        return res.status(400).json({ error: 'Prioridade inválida.' });
      }

      const id = 'aitask_' + Date.now().toString(36) + '_' + randomBytes(5).toString('hex');
      const now = new Date().toISOString();
      const task = {
        id,
        workerId,
        title,
        description,
        project,
        priority,
        status: 'queued',
        progress: 0,
        requiresApproval,
        executionMode: geminiConnected ? 'gemini_supervised' : 'supervised',
        runtimeStatus: geminiConnected ? 'ready_for_ai' : 'awaiting_executor',
        resultSummary: null,
        executionReport: null,
        executorProvider: geminiConnected ? 'gemini' : null,
        executorModel: null,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
        createdBy: admin.email || admin.uid,
      };

      await tasks.doc(id).set(task);
      return res.status(201).json({ success: true, task: serializeTask(id, task) });
    }

    if (req.method === 'PATCH') {
      const taskId = cleanText(body.taskId, 180);
      const status = cleanText(body.status, 40).toLowerCase() as TaskStatus;
      const resultSummary = cleanText(body.resultSummary, 5000);
      const progressRaw = Number(body.progress);

      if (!taskId || !/^aitask_[A-Za-z0-9_]+$/.test(taskId)) {
        return res.status(400).json({ error: 'Tarefa inválida.' });
      }
      if (!VALID_STATUS.has(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
      }

      const ref = tasks.doc(taskId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Tarefa não encontrada.' });

      const now = new Date().toISOString();
      const update: Record<string, unknown> = {
        status,
        updatedAt: now,
      };

      if (Number.isFinite(progressRaw)) {
        update.progress = Math.max(0, Math.min(100, Math.round(progressRaw)));
      }
      if (resultSummary) update.resultSummary = resultSummary;
      if (status === 'working') {
        update.startedAt = snap.data()?.startedAt || now;
        update.runtimeStatus = geminiConnected ? 'ready_for_ai' : 'manual_supervision';
      }
      if (status === 'queued') update.runtimeStatus = geminiConnected ? 'ready_for_ai' : 'awaiting_executor';
      if (status === 'waiting_approval') update.runtimeStatus = 'waiting_admin';
      if (status === 'completed') {
        update.progress = 100;
        update.completedAt = now;
        update.runtimeStatus = 'done';
      }
      if (status === 'failed') update.runtimeStatus = 'failed';
      if (status === 'cancelled') update.runtimeStatus = 'cancelled';

      await ref.set(update, { merge: true });
      const after = await ref.get();
      return res.status(200).json({
        success: true,
        task: serializeTask(taskId, after.data() as Record<string, any>),
      });
    }

    if (req.method === 'DELETE') {
      const taskId = cleanText(body.taskId, 180);
      if (!taskId || !/^aitask_[A-Za-z0-9_]+$/.test(taskId)) {
        return res.status(400).json({ error: 'Tarefa inválida.' });
      }
      await tasks.doc(taskId).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Não foi possível carregar os Funcionários IA.',
    });
  }
}
