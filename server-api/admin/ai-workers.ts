import { randomBytes } from 'node:crypto';
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

const WORKERS = [
  {
    id: 'lumy-manager',
    name: 'Lumy',
    role: 'Gerente IA',
    specialty: 'Quebra projetos grandes em tarefas, acompanha o time e pede sua aprovação.',
    palette: 0,
  },
  {
    id: 'frontend',
    name: 'Pixel',
    role: 'Frontend',
    specialty: 'Interfaces, responsividade, acessibilidade e experiência do usuário.',
    palette: 1,
  },
  {
    id: 'backend',
    name: 'Stack',
    role: 'Backend',
    specialty: 'APIs, Firebase, regras de negócio, integrações e segurança.',
    palette: 2,
  },
  {
    id: 'designer',
    name: 'Iris',
    role: 'Designer UI/UX',
    specialty: 'Identidade visual, componentes, fluxos e acabamento profissional.',
    palette: 3,
  },
  {
    id: 'qa',
    name: 'Scout',
    role: 'QA & Testes',
    specialty: 'Testes, regressões, validação de produção e checklist de aceite.',
    palette: 4,
  },
  {
    id: 'growth',
    name: 'Nova',
    role: 'Marketing & Comunidade',
    specialty: 'Conteúdo, comunidade, campanhas e experiência de afiliados.',
    palette: 5,
  },
] as const;

const VALID_WORKER_IDS = new Set(WORKERS.map((worker) => worker.id));
const VALID_STATUS = new Set([
  'queued',
  'working',
  'waiting_approval',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);
const VALID_PRIORITY = new Set(['low', 'normal', 'high', 'urgent']);

function cleanText(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max);
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
    executionMode: String(data.executionMode || 'supervised'),
    runtimeStatus: String(data.runtimeStatus || 'awaiting_executor'),
    resultSummary: data.resultSummary ? String(data.resultSummary) : null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    startedAt: data.startedAt || null,
    completedAt: data.completedAt || null,
    createdBy: data.createdBy || null,
  };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const admin = await requireAdminIdentity(req.headers);
    const db = getServerAdminFirestore();
    const tasks = db.collection('admin_ai_tasks');

    if (req.method === 'GET') {
      const snap = await tasks.orderBy('createdAt', 'desc').limit(250).get();
      const taskList = snap.docs.map((doc) => serializeTask(doc.id, doc.data() as Record<string, any>));

      return res.status(200).json({
        success: true,
        workers: WORKERS,
        tasks: taskList,
        executionEngine: {
          connected: false,
          mode: 'supervised',
          message: 'Fila real criada. O executor automático dos agentes será conectado na próxima etapa.',
        },
      });
    }

    const body = req.body && typeof req.body === 'object'
      ? req.body as Record<string, unknown>
      : {};

    if (req.method === 'POST') {
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
        executionMode: 'supervised',
        runtimeStatus: 'awaiting_executor',
        resultSummary: null,
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
      const status = cleanText(body.status, 40).toLowerCase();
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
        update.runtimeStatus = 'manual_supervision';
      }
      if (status === 'queued') update.runtimeStatus = 'awaiting_executor';
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
