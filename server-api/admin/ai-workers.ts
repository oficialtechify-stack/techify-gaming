import { randomBytes } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getAuth } from 'firebase-admin/auth';
import { getServerAdminApp, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { assertOfficeAdmin, requireOfficeIdentity, type OfficeIdentity } from '../../lib/officeAccess.js';

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

type WorkerProfile = {
  id: WorkerId;
  name: string;
  role: string;
  specialty: string;
  palette: number;
  permissions: readonly string[];
  repoPrefixes: readonly string[];
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

type OfficeMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  officeRole: 'ceo' | 'designer' | 'member';
  title: string;
  palette: number;
  active: boolean;
  deskId: string;
  avatar?: string | null;
  position?: { x: number; y: number; direction?: string; updatedAt?: string } | null;
  createdAt?: string | null;
};

type HumanTaskStatus = 'todo' | 'working' | 'review' | 'completed' | 'blocked';

type HumanTask = {
  id: string;
  assigneeUid: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: HumanTaskStatus;
  response?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

type WorkerBrain = {
  workerId: WorkerId;
  mood: string;
  focus: string;
  currentIntent: string;
  lastThought: string;
  updatedAt: string;
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

async function resolveWorkers(db: FirebaseFirestore.Firestore): Promise<WorkerProfile[]> {
  const profiles = await db.collection('admin_ai_worker_profiles').get();
  const customNames = new Map(
    profiles.docs.map((doc) => [doc.id, cleanText(doc.data()?.name, 32)] as const),
  );

  return WORKERS.map((worker) => ({
    ...worker,
    permissions: [...worker.permissions],
    repoPrefixes: [...worker.repoPrefixes],
    name: customNames.get(worker.id) || worker.name,
  })) as WorkerProfile[];
}

function serializeChatMessage(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): ChatMessage {
  const data = (doc.data() || {}) as Record<string, any>;
  return {
    id: doc.id,
    role: data.role === 'assistant' ? 'assistant' : 'user',
    text: String(data.text || ''),
    createdAt: String(data.createdAt || ''),
  };
}

async function loadWorkerChat(
  db: FirebaseFirestore.Firestore,
  workerId: WorkerId,
  limit = 40,
): Promise<ChatMessage[]> {
  const snap = await db
    .collection('admin_ai_worker_chats')
    .doc(workerId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(serializeChatMessage).reverse();
}

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
const VALID_HUMAN_TASK_STATUS = new Set<HumanTaskStatus>(['todo', 'working', 'review', 'completed', 'blocked']);
const DEFAULT_MEMBER_PALETTE = 3;


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

function serializeOfficeMember(id: string, data: Record<string, any>): OfficeMember {
  const roleRaw = String(data.officeRole || 'member').toLowerCase();
  const officeRole: OfficeMember['officeRole'] =
    roleRaw === 'designer' ? 'designer' : roleRaw === 'ceo' ? 'ceo' : 'member';

  const paletteRaw = Number(data.palette);
  return {
    id,
    userId: String(data.userId || id),
    displayName: String(data.displayName || data.name || data.email || 'Membro LeadsPay'),
    email: String(data.email || ''),
    officeRole,
    title: String(data.title || (officeRole === 'designer' ? 'Designer' : officeRole === 'ceo' ? 'CEO' : 'Equipe')),
    palette: Number.isFinite(paletteRaw) ? Math.max(0, Math.min(5, Math.round(paletteRaw))) : DEFAULT_MEMBER_PALETTE,
    active: data.active !== false,
    deskId: String(data.deskId || (officeRole === 'designer' ? 'designer-human' : 'team')),
    avatar: data.avatar ? String(data.avatar) : null,
    position: data.position && typeof data.position === 'object'
      ? {
          x: Number(data.position.x || 0),
          y: Number(data.position.y || 0),
          direction: data.position.direction ? String(data.position.direction) : undefined,
          updatedAt: data.position.updatedAt ? String(data.position.updatedAt) : undefined,
        }
      : null,
    createdAt: data.createdAt ? String(data.createdAt) : null,
  };
}

async function resolveOfficeMembers(
  db: FirebaseFirestore.Firestore,
  identity: OfficeIdentity,
): Promise<OfficeMember[]> {
  const snap = await db.collection('admin_office_members').get();
  const members = snap.docs
    .map((doc) => serializeOfficeMember(doc.id, doc.data() as Record<string, any>))
    .filter((member) => member.active);

  const adminExists = members.some((member) => member.userId === identity.uid);
  if (identity.isOfficeAdmin && !adminExists) {
    let displayName = 'CEO LeadsPay';
    let avatar: string | null = null;
    try {
      const profile = await db.collection('user_profiles').doc(identity.uid).get();
      if (profile.exists) {
        const data = profile.data() as Record<string, any>;
        displayName = String(data.name || data.firstName || displayName);
        avatar = data.avatar ? String(data.avatar) : null;
      }
    } catch {}

    const ceoMember: OfficeMember = {
      id: identity.uid,
      userId: identity.uid,
      displayName,
      email: identity.email || '',
      officeRole: 'ceo',
      title: 'CEO',
      palette: 0,
      active: true,
      deskId: 'ceo',
      avatar,
      position: null,
      createdAt: new Date().toISOString(),
    };
    members.unshift(ceoMember);
    try {
      await db.collection('admin_office_members').doc(identity.uid).set({
        userId: identity.uid,
        displayName,
        email: identity.email || '',
        officeRole: 'ceo',
        title: 'CEO',
        palette: 0,
        active: true,
        deskId: 'ceo',
        avatar,
        createdAt: ceoMember.createdAt,
        updatedAt: ceoMember.createdAt,
      }, { merge: true });
    } catch {}
  }

  return members;
}

function serializeHumanTask(id: string, data: Record<string, any>): HumanTask {
  const priorityRaw = String(data.priority || 'normal');
  const statusRaw = String(data.status || 'todo') as HumanTaskStatus;
  return {
    id,
    assigneeUid: String(data.assigneeUid || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    priority: VALID_PRIORITY.has(priorityRaw) ? priorityRaw as HumanTask['priority'] : 'normal',
    status: VALID_HUMAN_TASK_STATUS.has(statusRaw) ? statusRaw : 'todo',
    response: data.response ? String(data.response) : null,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || data.createdAt || ''),
    createdBy: String(data.createdBy || ''),
  };
}

async function resolveHumanTasks(
  db: FirebaseFirestore.Firestore,
  identity: OfficeIdentity,
): Promise<HumanTask[]> {
  const collection = db.collection('admin_office_human_tasks');
  const snap = identity.isOfficeAdmin
    ? await collection.orderBy('createdAt', 'desc').limit(250).get()
    : await collection.where('assigneeUid', '==', identity.uid).limit(250).get();

  return snap.docs
    .map((doc) => serializeHumanTask(doc.id, doc.data() as Record<string, any>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function resolveWorkerBrains(
  db: FirebaseFirestore.Firestore,
  workers: WorkerProfile[],
  tasks: Array<ReturnType<typeof serializeTask>>,
): Promise<Record<string, WorkerBrain>> {
  const snap = await db.collection('admin_ai_worker_state').get();
  const stored = new Map(snap.docs.map((doc) => [doc.id, doc.data() as Record<string, any>]));
  const result: Record<string, WorkerBrain> = {};
  const now = new Date().toISOString();

  for (const worker of workers) {
    const task = tasks.find((item) =>
      item.workerId === worker.id && ['working', 'waiting_approval', 'paused', 'queued'].includes(item.status),
    );
    const data = stored.get(worker.id) || {};
    const fallbackIntent = task
      ? task.status === 'working'
        ? `Concluir “${task.title}”`
        : task.status === 'waiting_approval'
          ? `Aguardar revisão de “${task.title}”`
          : `Organizar “${task.title}”`
      : 'Observar o escritório e ficar disponível';

    result[worker.id] = {
      workerId: worker.id,
      mood: String(data.mood || (task?.status === 'working' ? 'focado' : 'tranquilo')),
      focus: String(data.focus || task?.title || 'LeadsPay'),
      currentIntent: String(data.currentIntent || fallbackIntent),
      lastThought: String(data.lastThought || 'Estou disponível para ajudar quando precisar.'),
      updatedAt: String(data.updatedAt || now),
    };
  }

  return result;
}

async function writeWorkerBrain(
  db: FirebaseFirestore.Firestore,
  workerId: WorkerId,
  patch: Partial<Omit<WorkerBrain, 'workerId'>>,
) {
  await db.collection('admin_ai_worker_state').doc(workerId).set({
    workerId,
    ...patch,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
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

function isReadableRepoPath(path: string, worker: WorkerProfile): boolean {
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
  worker: WorkerProfile,
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

function workerPolicy(worker: WorkerProfile): string {
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

async function executeWithGemini(task: Record<string, any>, worker: WorkerProfile) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY não está configurada neste projeto.');

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

async function chatWithGemini(
  db: FirebaseFirestore.Firestore,
  worker: WorkerProfile,
  message: string,
): Promise<{ text: string; model: string }> {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY não está configurada neste projeto.');

  const model = String(process.env.AI_EMPLOYEE_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const history = await loadWorkerChat(db, worker.id, 16);
  const repo = await collectRepoContext(
    {
      title: message,
      description: message,
      project: 'LeadsPay',
    },
    worker,
  );

  const historyText = history
    .slice(-12)
    .map((item) => `${item.role === 'user' ? 'ADMIN' : worker.name.toUpperCase()}: ${item.text}`)
    .join('\n');

  const prompt = `
Você é ${worker.name}, funcionário "${worker.role}" da LeadsPay.
Especialidade: ${worker.specialty}
Permissões: ${worker.permissions.join(', ')}

REGRAS
${workerPolicy(worker)}
- Este é um CHAT de ajuda, explicação e dúvidas. Não diga que executou uma mudança no código.
- Seja útil, direto e explique como um funcionário que conhece a função dele.
- Se a pessoa pedir uma execução que deveria virar tarefa, explique o que faria e sugira criar/atribuir a tarefa.
- Use o contexto do repositório apenas quando ele realmente ajudar a responder.

CONVERSA RECENTE
${historyText || 'Sem histórico anterior.'}

CONTEXTO RELEVANTE DO REPOSITÓRIO
${repo.context || 'Nenhum arquivo relevante foi carregado para esta pergunta.'}

MENSAGEM DO ADMIN
${message}
`.trim();

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.35,
      maxOutputTokens: 2800,
    },
  });

  const text = cleanText(response.text, 9000);
  if (!text) throw new Error('O funcionário não respondeu agora.');
  return { text, model };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const officeIdentity = await requireOfficeIdentity(req.headers);
    const db = getServerAdminFirestore();
    const tasks = db.collection('admin_ai_tasks');
    const geminiConnected = Boolean(String(process.env.GEMINI_API_KEY || '').trim());
    const resolvedWorkers = await resolveWorkers(db);

    if (req.method === 'GET') {
      const accessOnly = cleanText(req.query?.accessOnly, 10) === '1';
      if (accessOnly) {
        return res.status(200).json({
          success: true,
          access: {
            uid: officeIdentity.uid,
            email: officeIdentity.email,
            officeRole: officeIdentity.officeRole,
            isOfficeAdmin: officeIdentity.isOfficeAdmin,
            canManageTeam: officeIdentity.isOfficeAdmin,
            canAssignHumanTasks: officeIdentity.isOfficeAdmin,
            canUseAi: true,
          },
        });
      }

      const requestedWorkerId = cleanText(req.query?.workerId, 80);
      if (requestedWorkerId && VALID_WORKER_IDS.has(requestedWorkerId as WorkerId)) {
        const messages = await loadWorkerChat(db, requestedWorkerId as WorkerId);
        return res.status(200).json({
          success: true,
          worker: resolvedWorkers.find((worker) => worker.id === requestedWorkerId) || null,
          access: {
            uid: officeIdentity.uid,
            officeRole: officeIdentity.officeRole,
            isOfficeAdmin: officeIdentity.isOfficeAdmin,
          },
          messages,
        });
      }

      const snap = await tasks.orderBy('createdAt', 'desc').limit(250).get();
      const taskList = snap.docs.map((doc) => serializeTask(doc.id, doc.data() as Record<string, any>));
      const [officeMembers, humanTasks, workerBrains] = await Promise.all([
        resolveOfficeMembers(db, officeIdentity),
        resolveHumanTasks(db, officeIdentity),
        resolveWorkerBrains(db, resolvedWorkers, taskList),
      ]);

      return res.status(200).json({
        success: true,
        access: {
          uid: officeIdentity.uid,
          email: officeIdentity.email,
          officeRole: officeIdentity.officeRole,
          isOfficeAdmin: officeIdentity.isOfficeAdmin,
          canManageTeam: officeIdentity.isOfficeAdmin,
          canAssignHumanTasks: officeIdentity.isOfficeAdmin,
          canUseAi: true,
        },
        workers: resolvedWorkers,
        brains: workerBrains,
        officeMembers,
        humanTasks,
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

      if (action === 'add-office-member') {
        assertOfficeAdmin(officeIdentity);
        const email = cleanText(body.email, 180).toLowerCase();
        const displayNameInput = cleanText(body.displayName, 80);
        const officeRoleRaw = cleanText(body.officeRole, 30).toLowerCase();
        const officeRole: OfficeMember['officeRole'] = officeRoleRaw === 'designer' ? 'designer' : 'member';

        if (!email || !email.includes('@')) {
          return res.status(400).json({ error: 'Informe o e-mail da conta LeadsPay da pessoa.' });
        }

        let authUser;
        try {
          authUser = await getAuth(getServerAdminApp()).getUserByEmail(email);
        } catch {
          return res.status(404).json({
            error: 'Essa pessoa precisa criar ou entrar na conta LeadsPay antes de ser adicionada ao escritório.',
          });
        }

        let profileData: Record<string, any> = {};
        try {
          const profile = await db.collection('user_profiles').doc(authUser.uid).get();
          if (profile.exists) profileData = profile.data() as Record<string, any>;
        } catch {}

        const now = new Date().toISOString();
        const existing = await db.collection('admin_office_members').doc(authUser.uid).get();
        const existingData = existing.exists ? existing.data() as Record<string, any> : {};
        const palette = Number.isFinite(Number(body.palette))
          ? Math.max(0, Math.min(5, Math.round(Number(body.palette))))
          : Number.isFinite(Number(existingData.palette))
            ? Number(existingData.palette)
            : DEFAULT_MEMBER_PALETTE;

        const memberData = {
          userId: authUser.uid,
          email,
          displayName:
            displayNameInput ||
            cleanText(profileData.name || authUser.displayName || email.split('@')[0], 80),
          officeRole,
          title: cleanText(body.title, 80) || (officeRole === 'designer' ? 'Designer' : 'Equipe LeadsPay'),
          palette,
          active: true,
          deskId: cleanText(body.deskId, 80) || (officeRole === 'designer' ? 'designer-human' : 'team'),
          avatar: profileData.avatar || authUser.photoURL || null,
          createdAt: existingData.createdAt || now,
          updatedAt: now,
          addedBy: officeIdentity.email || officeIdentity.uid,
        };

        await db.collection('admin_office_members').doc(authUser.uid).set(memberData, { merge: true });
        const members = await resolveOfficeMembers(db, officeIdentity);
        return res.status(200).json({ success: true, members });
      }

      if (action === 'update-office-member') {
        assertOfficeAdmin(officeIdentity);
        const userId = cleanText(body.userId, 180);
        if (!userId) return res.status(400).json({ error: 'Membro inválido.' });

        const update: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
          updatedBy: officeIdentity.email || officeIdentity.uid,
        };
        const displayName = cleanText(body.displayName, 80);
        const title = cleanText(body.title, 80);
        const role = cleanText(body.officeRole, 30).toLowerCase();
        if (displayName) update.displayName = displayName;
        if (title) update.title = title;
        if (role === 'designer' || role === 'member') update.officeRole = role;
        if (typeof body.active === 'boolean') update.active = body.active;
        if (Number.isFinite(Number(body.palette))) {
          update.palette = Math.max(0, Math.min(5, Math.round(Number(body.palette))));
        }

        await db.collection('admin_office_members').doc(userId).set(update, { merge: true });
        const members = await resolveOfficeMembers(db, officeIdentity);
        return res.status(200).json({ success: true, members });
      }

      if (action === 'update-presence') {
        const x = Number(body.x);
        const y = Number(body.y);
        const direction = cleanText(body.direction, 12) || 'down';
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return res.status(400).json({ error: 'Posição inválida.' });
        }
        const now = new Date().toISOString();
        if (officeIdentity.isOfficeAdmin) {
          await db.collection('admin_office_members').doc(officeIdentity.uid).set({
            userId: officeIdentity.uid,
            email: officeIdentity.email || '',
            displayName: officeIdentity.displayName || 'CEO LeadsPay',
            officeRole: 'ceo',
            title: 'CEO',
            palette: 0,
            active: true,
            deskId: 'ceo',
            position: { x, y, direction, updatedAt: now },
            updatedAt: now,
          }, { merge: true });
        } else {
          await db.collection('admin_office_members').doc(officeIdentity.uid).set({
            position: { x, y, direction, updatedAt: now },
            updatedAt: now,
          }, { merge: true });
        }
        return res.status(200).json({ success: true });
      }

      if (action === 'create-human-task') {
        assertOfficeAdmin(officeIdentity);
        const assigneeUid = cleanText(body.assigneeUid, 180);
        const title = cleanText(body.title, 140);
        const description = cleanText(body.description, 5000);
        const priorityRaw = cleanText(body.priority, 20).toLowerCase();
        if (!assigneeUid || title.length < 3 || description.length < 5) {
          return res.status(400).json({ error: 'Preencha a pessoa, o título e a descrição da demanda.' });
        }
        const member = await db.collection('admin_office_members').doc(assigneeUid).get();
        if (!member.exists || member.data()?.active === false) {
          return res.status(404).json({ error: 'A pessoa não está ativa no LeadsPay Office.' });
        }

        const id = 'humantask_' + Date.now().toString(36) + '_' + randomBytes(5).toString('hex');
        const now = new Date().toISOString();
        const data = {
          assigneeUid,
          title,
          description,
          priority: VALID_PRIORITY.has(priorityRaw) ? priorityRaw : 'normal',
          status: 'todo',
          response: null,
          createdAt: now,
          updatedAt: now,
          createdBy: officeIdentity.email || officeIdentity.uid,
        };
        await db.collection('admin_office_human_tasks').doc(id).set(data);
        return res.status(201).json({ success: true, task: serializeHumanTask(id, data) });
      }

      if (action === 'update-human-task') {
        const taskId = cleanText(body.taskId, 180);
        const status = cleanText(body.status, 30) as HumanTaskStatus;
        const responseText = cleanText(body.response, 5000);
        if (!taskId) return res.status(400).json({ error: 'Demanda inválida.' });

        const ref = db.collection('admin_office_human_tasks').doc(taskId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Demanda não encontrada.' });
        const taskData = snap.data() as Record<string, any>;
        if (!officeIdentity.isOfficeAdmin && String(taskData.assigneeUid) !== officeIdentity.uid) {
          return res.status(403).json({ error: 'Essa demanda pertence a outro membro.' });
        }

        const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (VALID_HUMAN_TASK_STATUS.has(status)) update.status = status;
        if (responseText) update.response = responseText;
        await ref.set(update, { merge: true });
        const after = await ref.get();
        return res.status(200).json({
          success: true,
          task: serializeHumanTask(taskId, after.data() as Record<string, any>),
        });
      }

      if (action === 'think') {
        const workerId = cleanText(body.workerId, 80) as WorkerId;
        if (!VALID_WORKER_IDS.has(workerId)) return res.status(400).json({ error: 'Funcionário IA inválido.' });
        if (!geminiConnected) return res.status(503).json({ error: 'O cérebro Gemini ainda não está conectado.' });
        const worker = resolvedWorkers.find((item) => item.id === workerId);
        if (!worker) return res.status(404).json({ error: 'Funcionário não encontrado.' });
        await writeWorkerBrain(db, workerId, {
          mood: 'atento',
          focus: message.slice(0, 120),
          currentIntent: 'Responder e ajudar na conversa',
          lastThought: 'Estou entendendo a pergunta antes de responder.',
        });

        const recent = await tasks.where('workerId', '==', workerId).limit(12).get();
        const recentText = recent.docs
          .map((doc) => {
            const data = doc.data() as Record<string, any>;
            return `${data.status || 'unknown'}: ${data.title || ''}`;
          })
          .join('\n');

        const ai = new GoogleGenAI({ apiKey: String(process.env.GEMINI_API_KEY || '').trim() });
        const model = String(process.env.AI_EMPLOYEE_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
        const response = await ai.models.generateContent({
          model,
          contents: `
Você é ${worker.name}, ${worker.role} da LeadsPay. Gere um estado interno curto e útil, sem fingir consciência.
Tarefas recentes:
${recentText || 'nenhuma'}

Responda APENAS JSON:
{"mood":"uma palavra","focus":"foco curto","thought":"pensamento profissional curto","intent":"próxima intenção útil"}
`.trim(),
          config: { temperature: 0.4, maxOutputTokens: 450, responseMimeType: 'application/json' },
        });
        const parsed = parseGeminiJson(String(response.text || '{}'));
        const brain = {
          mood: cleanText(parsed.mood, 40) || 'tranquilo',
          focus: cleanText(parsed.focus, 120) || 'LeadsPay',
          lastThought: cleanText(parsed.thought, 260) || 'Estou organizando o próximo passo.',
          currentIntent: cleanText(parsed.intent, 260) || 'Ficar disponível para a equipe.',
        };
        await writeWorkerBrain(db, workerId, brain);
        return res.status(200).json({
          success: true,
          brain: { workerId, ...brain, updatedAt: new Date().toISOString() },
        });
      }

      if (action === 'rename-worker') {
        assertOfficeAdmin(officeIdentity);
        const workerId = cleanText(body.workerId, 80) as WorkerId;
        const name = cleanText(body.name, 32);

        if (!VALID_WORKER_IDS.has(workerId)) {
          return res.status(400).json({ error: 'Funcionário IA inválido.' });
        }
        if (name.length < 2) {
          return res.status(400).json({ error: 'O nome precisa ter pelo menos 2 caracteres.' });
        }

        const now = new Date().toISOString();
        await db.collection('admin_ai_worker_profiles').doc(workerId).set({
          workerId,
          name,
          updatedAt: now,
          updatedBy: officeIdentity.email || officeIdentity.uid,
        }, { merge: true });

        const updatedWorkers = await resolveWorkers(db);
        return res.status(200).json({
          success: true,
          workers: updatedWorkers,
          worker: updatedWorkers.find((worker) => worker.id === workerId) || null,
        });
      }

      if (action === 'chat') {
        const workerId = cleanText(body.workerId, 80) as WorkerId;
        const message = cleanText(body.message, 5000);
        if (!VALID_WORKER_IDS.has(workerId)) {
          return res.status(400).json({ error: 'Funcionário IA inválido.' });
        }
        if (message.length < 1) {
          return res.status(400).json({ error: 'Escreva uma mensagem.' });
        }
        if (!geminiConnected) {
          return res.status(503).json({ error: 'O cérebro Gemini ainda não está conectado.' });
        }

        const worker = resolvedWorkers.find((item) => item.id === workerId);
        if (!worker) return res.status(404).json({ error: 'Funcionário não encontrado.' });

        const messagesRef = db
          .collection('admin_ai_worker_chats')
          .doc(workerId)
          .collection('messages');
        const now = new Date().toISOString();
        const userRef = messagesRef.doc('msg_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex'));
        await userRef.set({
          role: 'user',
          text: message,
          createdAt: now,
          createdBy: officeIdentity.email || officeIdentity.uid,
        });

        try {
          const answer = await chatWithGemini(db, worker, message);
          const answerAt = new Date().toISOString();
          const assistantRef = messagesRef.doc('msg_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex'));
          await assistantRef.set({
            role: 'assistant',
            text: answer.text,
            createdAt: answerAt,
            provider: 'gemini',
            model: answer.model,
          });
          await writeWorkerBrain(db, workerId, {
            mood: 'engajado',
            focus: message.slice(0, 120),
            currentIntent: 'Ficar disponível para esclarecer o próximo ponto',
            lastThought: answer.text.slice(0, 240),
          });

          return res.status(200).json({
            success: true,
            message: {
              id: assistantRef.id,
              role: 'assistant',
              text: answer.text,
              createdAt: answerAt,
            },
          });
        } catch (chatError) {
          const messageText = chatError instanceof Error ? chatError.message : 'Falha no chat.';
          return res.status(503).json({ error: messageText });
        }
      }

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
        await writeWorkerBrain(db, String(task.workerId) as WorkerId, {
          mood: 'focado',
          focus: String(task.title || 'Tarefa'),
          currentIntent: 'Analisar a tarefa e preparar uma resposta para revisão',
          lastThought: 'Vou revisar o contexto e identificar o melhor caminho antes de concluir.',
        });

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
          const worker = resolvedWorkers.find((item) => item.id === task.workerId);
          if (!worker) throw new Error('Funcionário IA inválido.');
          const { report, model } = await executeWithGemini(task, worker);
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

          await writeWorkerBrain(db, String(task.workerId) as WorkerId, {
            mood: requiresApproval ? 'aguardando' : 'satisfeito',
            focus: String(task.title || 'Tarefa'),
            currentIntent: requiresApproval ? 'Aguardar a revisão da equipe' : 'Ficar disponível para a próxima tarefa',
            lastThought: report.summary.slice(0, 240),
          });

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
        createdBy: officeIdentity.email || officeIdentity.uid,
      };

      const taskRef = tasks.doc(id);
      await taskRef.set(task);

      if (geminiConnected && body.autoRun !== false) {
        const worker = resolvedWorkers.find((item) => item.id === workerId);
        if (worker) {
          try {
            await taskRef.set({
              status: 'working',
              progress: 15,
              runtimeStatus: 'ai_analyzing',
              startedAt: now,
              updatedAt: now,
              executorProvider: 'gemini',
            }, { merge: true });

            const { report, model } = await executeWithGemini(task, worker);
            const finishedAt = new Date().toISOString();
            const nextStatus: TaskStatus = requiresApproval ? 'waiting_approval' : 'completed';
            await taskRef.set({
              status: nextStatus,
              progress: requiresApproval ? 85 : 100,
              runtimeStatus: requiresApproval ? 'ai_waiting_admin' : 'done',
              resultSummary: report.summary,
              executionReport: report,
              executorProvider: 'gemini',
              executorModel: model,
              lastRunAt: finishedAt,
              updatedAt: finishedAt,
              ...(requiresApproval ? {} : { completedAt: finishedAt }),
            }, { merge: true });

            const executed = await taskRef.get();
            return res.status(201).json({
              success: true,
              autoExecuted: true,
              task: serializeTask(id, executed.data() as Record<string, any>),
            });
          } catch (executionError) {
            const detail = executionError instanceof Error ? executionError.message : 'Falha no executor.';
            const failedAt = new Date().toISOString();
            await taskRef.set({
              status: 'failed',
              runtimeStatus: 'ai_failed',
              resultSummary: detail,
              lastRunAt: failedAt,
              updatedAt: failedAt,
            }, { merge: true });
            const failed = await taskRef.get();
            return res.status(201).json({
              success: true,
              autoExecuted: false,
              warning: detail,
              task: serializeTask(id, failed.data() as Record<string, any>),
            });
          }
        }
      }

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
      assertOfficeAdmin(officeIdentity);
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
