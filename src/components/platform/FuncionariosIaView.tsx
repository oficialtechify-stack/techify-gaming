import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Code2,
  Cpu,
  Filter,
  GitBranch,
  Gamepad2,
  Brain,
  Laptop,
  Loader2,
  MessageCircle,
  MapPinned,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  UserRoundCog,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GatherOfficeWorld } from './GatherOfficeWorld';
import '../../styles/ai-pixel-office.css';

type WorkerBrain = {
  workerId?: string;
  mood?: string;
  focus?: string;
  currentIntent?: string;
  lastThought?: string;
  updatedAt?: string;
};

type Worker = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  palette: number;
  brain?: WorkerBrain | null;
};

type OfficeAccess = {
  uid: string;
  email?: string | null;
  officeRole: 'ceo' | 'designer' | 'member';
  isOfficeAdmin: boolean;
  canManageTeam?: boolean;
  canAssignHumanTasks?: boolean;
  canUseAi?: boolean;
};

type OfficeAvatarStyle = 'social' | 'all-black' | 'old-money' | 'wine';

type OfficeAvatarConfig = {
  style: OfficeAvatarStyle;
  skinTone: number;
  hair: number;
  facialHair: number;
  accessory: number;
};

type OfficeMember = {
  id?: string;
  userId: string;
  displayName: string;
  email: string;
  officeRole: 'ceo' | 'designer' | 'member';
  title: string;
  palette: number;
  active: boolean;
  deskId: string;
  avatar?: string | null;
  avatarConfig?: OfficeAvatarConfig | null;
  position?: { x: number; y: number; direction?: string; updatedAt?: string; mapVersion?: string } | null;
  emote?: { emoji?: string; updatedAt?: string } | null;
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

type TaskStatus =
  | 'queued'
  | 'working'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

type AiExecutionReport = {
  summary?: string;
  findings?: string[];
  proposedChanges?: string[];
  validation?: string[];
  risks?: string[];
  nextStep?: string;
  filesReviewed?: string[];
};

type CodePatch = {
  operation: 'replace' | 'create';
  path: string;
  search: string;
  replace: string;
  reason: string;
};

type CodeProposal = {
  status: 'draft' | 'branch_ready' | 'published' | 'blocked';
  patches: CodePatch[];
  critical: boolean;
  criticalReasons: string[];
  baseSha?: string | null;
  preparedAt?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  appliedAt?: string | null;
  publishedAt?: string | null;
};

type TeamMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

type AiTask = {
  id: string;
  workerId: string;
  title: string;
  description: string;
  project: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: TaskStatus;
  progress: number;
  requiresApproval: boolean;
  executionMode: string;
  runtimeStatus: string;
  resultSummary?: string | null;
  executionReport?: AiExecutionReport | null;
  executorProvider?: string | null;
  executorModel?: string | null;
  lastRunAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdByUid?: string | null;
  codeProposal?: CodeProposal | null;
};

type EngineInfo = {
  connected: boolean;
  mode: string;
  message: string;
  provider?: string | null;
  model?: string | null;
  repoReadConnected?: boolean;
  repoWriteConnected?: boolean;
};

type WorkerChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

const FALLBACK_WORKERS: Worker[] = [
  { id: 'lumy-manager', name: 'Lumy', role: 'Gerente IA', specialty: 'Coordena o time e divide projetos.', palette: 0 },
  { id: 'frontend', name: 'Pixel', role: 'Frontend', specialty: 'Interface, responsividade e UX.', palette: 1 },
  { id: 'backend', name: 'Stack', role: 'Backend', specialty: 'APIs, Firebase e integrações.', palette: 2 },
  { id: 'designer', name: 'Iris', role: 'Designer UI/UX', specialty: 'Design e acabamento visual.', palette: 3 },
  { id: 'qa', name: 'Scout', role: 'QA & Testes', specialty: 'Validação e regressões.', palette: 4 },
  { id: 'growth', name: 'Nova', role: 'Marketing & Comunidade', specialty: 'Campanhas e comunidade.', palette: 5 },
];

function isOfficeQuotaError(value: unknown) {
  const message = String(value || '');
  return /RESOURCE_EXHAUSTED|Quota exceeded|quota.*exceeded|8 RESOURCE_EXHAUSTED/i.test(message);
}

function readLocalOfficeProfile(uid?: string | null) {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('leadspay-office-profile:' + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: 'Na fila',
  working: 'Trabalhando',
  waiting_approval: 'Aguardando você',
  paused: 'Pausada',
  completed: 'Concluída',
  failed: 'Falhou',
  cancelled: 'Cancelada',
};

const PRIORITY_LABEL = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const fmtDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const statusTone = (status: TaskStatus) => {
  if (status === 'working') return 'working';
  if (status === 'waiting_approval') return 'approval';
  if (status === 'completed') return 'done';
  if (status === 'failed') return 'error';
  if (status === 'paused') return 'paused';
  if (status === 'cancelled') return 'muted';
  return 'queued';
};

interface FuncionariosIaViewProps {
  standalone?: boolean;
  scene?: 'office' | 'city';
  onExit?: () => void;
}

export const FuncionariosIaView: React.FC<FuncionariosIaViewProps> = ({ standalone = false, scene = 'office', onExit }) => {
  const { currentUser } = useAuth();
  const isCityScene = scene === 'city';

  const navigateScene = (path: '/office' | '/cidade') => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const [workers, setWorkers] = useState<Worker[]>(FALLBACK_WORKERS);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [access, setAccess] = useState<OfficeAccess | null>(null);
  const [officeMembers, setOfficeMembers] = useState<OfficeMember[]>([]);
  const officeMembersRef = useRef<OfficeMember[]>([]);
  const lastPresenceSentRef = useRef(0);
  const lastFullSyncRef = useRef(0);
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  const [humanTasks, setHumanTasks] = useState<HumanTask[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [teamChatInput, setTeamChatInput] = useState('');
  const [teamChatSending, setTeamChatSending] = useState(false);
  const teamChatBodyRef = useRef<HTMLDivElement | null>(null);
  const [codeActionTaskId, setCodeActionTaskId] = useState<string | null>(null);
  const [officeNotice, setOfficeNotice] = useState('');
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [engine, setEngine] = useState<EngineInfo>({
    connected: false,
    mode: 'local_first',
    message: 'Office local ativo. IA só é usada quando você abre uma função de Funcionários IA.',
  });
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('lumy-manager');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [taskScope, setTaskScope] = useState<'selected' | 'all'>('selected');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<WorkerChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [thinkingWorkerId, setThinkingWorkerId] = useState<string | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isComputerOpen, setIsComputerOpen] = useState(false);
  const [selectedHumanId, setSelectedHumanId] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [savingHumanTask, setSavingHumanTask] = useState(false);
  const [memberForm, setMemberForm] = useState({
    email: '',
    displayName: '',
    officeRole: 'designer' as 'designer' | 'member',
    title: 'Designer',
    palette: 3,
  });
  const [humanTaskForm, setHumanTaskForm] = useState({
    assigneeUid: '',
    title: '',
    description: '',
    priority: 'normal' as HumanTask['priority'],
  });
  const [form, setForm] = useState({
    workerId: 'lumy-manager',
    title: '',
    description: '',
    project: 'LeadsPay',
    priority: 'normal' as AiTask['priority'],
    requiresApproval: true,
  });

  useEffect(() => {
    officeMembersRef.current = officeMembers;
  }, [officeMembers]);

  useEffect(() => {
    if (!isChatOpen) return;
    const node = chatBodyRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [chatMessages, chatSending, isChatOpen]);

  useEffect(() => {
    if (!isTeamChatOpen) return;
    const node = teamChatBodyRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [teamMessages, teamChatSending, isTeamChatOpen]);

  const authHeaders = async () => {
    if (!currentUser) throw new Error('Sessão do LeadsPay Office não encontrada.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
    };
  };

  const load = async (silent = false, full = false) => {
    if (!currentUser) return;
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await fetch(full ? '/api/office/workers' : '/api/office/workers?officeShell=1', {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o LeadsPay Office.');

      const workerList = Array.isArray(data.workers) && data.workers.length ? data.workers : FALLBACK_WORKERS;
      const brains = data.brains && typeof data.brains === 'object' ? data.brains : {};
      setWorkers(workerList.map((worker: Worker) => ({ ...worker, brain: brains[worker.id] || worker.brain || null })));

      if (Array.isArray(data.tasks)) setTasks(data.tasks);
      if (data.areaNames && typeof data.areaNames === 'object') setAreaNames(data.areaNames);
      if (Array.isArray(data.humanTasks)) setHumanTasks(data.humanTasks);
      if (Array.isArray(data.teamMessages)) setTeamMessages(data.teamMessages);
      if (data.access) setAccess(data.access);
      if (data.executionEngine) setEngine(data.executionEngine);

      if (Array.isArray(data.officeMembers)) {
        const localProfile = readLocalOfficeProfile(currentUser.uid);
        const incoming = data.officeMembers.map((member: OfficeMember) =>
          member.userId === currentUser.uid && localProfile
            ? {
                ...member,
                ...(typeof localProfile.displayName === 'string' ? { displayName: localProfile.displayName } : {}),
                ...(localProfile.avatarConfig && typeof localProfile.avatarConfig === 'object' ? { avatarConfig: localProfile.avatarConfig } : {}),
              }
            : member
        );
        setOfficeMembers(incoming);
      }

      if (full) lastFullSyncRef.current = Date.now();
    } catch (err: any) {
      const message = err?.message || 'Não foi possível carregar o escritório.';
      if (isOfficeQuotaError(message)) {
        // O mapa, player, avatar e mobiliário continuam locais; não exibimos erro global de quota.
        if (!silent) setOfficeNotice('Office local ativo. Os recursos online serão retomados quando o serviço estiver disponível.');
      } else if (!silent) {
        setError(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const localProfile = readLocalOfficeProfile(currentUser.uid);
    setOfficeMembers((current) => {
      if (current.some((member) => member.userId === currentUser.uid)) return current;
      return [{
        userId: currentUser.uid,
        displayName:
          (typeof localProfile?.displayName === 'string' && localProfile.displayName.trim()) ||
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'Você',
        email: currentUser.email || '',
        officeRole: 'ceo',
        title: 'CEO',
        palette: 0,
        active: true,
        deskId: 'ceo-local',
        avatarConfig: localProfile?.avatarConfig || {
          style: 'all-black',
          skinTone: 0,
          hair: 0,
          facialHair: 0,
          accessory: 0,
        },
        position: null,
      }, ...current];
    });

    // Só carrega a casca leve. Não existe mais polling automático do Firestore.
    void load(false, false);
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) return;
    const needsOnlineData = taskDrawerOpen || isTeamChatOpen || isTeamModalOpen || isComputerOpen || isChatOpen;
    if (!needsOnlineData) return;
    if (Date.now() - lastFullSyncRef.current < 30000) return;
    void load(true, true);
  }, [currentUser?.uid, taskDrawerOpen, isTeamChatOpen, isTeamModalOpen, isComputerOpen, isChatOpen]);

  const runTask = async (taskId: string) => {
    if (runningTaskId) return;
    setRunningTaskId(taskId);
    setError('');
    setTasks((current) => current.map((task) =>
      task.id === taskId
        ? { ...task, status: 'working', progress: Math.max(15, task.progress || 0), runtimeStatus: 'ai_analyzing' }
        : task
    ));

    const visualStartedAt = Date.now();
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'run-task', taskId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || 'O funcionário não conseguiu executar a tarefa.');
      const remainingVisualTime = Math.max(0, 4500 - (Date.now() - visualStartedAt));
      if (remainingVisualTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingVisualTime));
      }
      setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
      setSelectedTaskId(taskId);
    } catch (err: any) {
      setError(err?.message || 'O funcionário não conseguiu executar a tarefa.');
      await load();
    } finally {
      setRunningTaskId(null);
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || form.description.trim().length < 10) return;

    setSavingTask(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ ...form, autoRun: false }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar a tarefa.');

      setTasks((current) => [data.task, ...current]);
      setSelectedWorkerId(form.workerId);
      setSelectedTaskId(data.task.id);
      setIsTaskModalOpen(false);
      setForm((current) => ({ ...current, title: '', description: '' }));
      window.setTimeout(() => void runTask(data.task.id), 120);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a tarefa.');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTask = async (taskId: string, status: TaskStatus, progress?: number) => {
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ taskId, status, ...(progress === undefined ? {} : { progress }) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar a tarefa.');
      setTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a tarefa.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Excluir esta tarefa do histórico?')) return;
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'DELETE',
        headers: await authHeaders(),
        body: JSON.stringify({ taskId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível excluir a tarefa.');
      setTasks((current) => current.filter((task) => task.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir a tarefa.');
    }
  };

  const loadChat = async (workerId: string) => {
    if (!currentUser) return;
    setChatLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/office/workers?workerId=${encodeURIComponent(workerId)}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a conversa.');
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a conversa.');
    } finally {
      setChatLoading(false);
    }
  };

  const openChat = (workerId: string) => {
    selectWorker(workerId);
    setIsChatOpen(true);
    setChatInput('');
    void loadChat(workerId);
  };

  const sendChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !selectedWorker || chatSending) return;

    const optimistic: WorkerChatMessage = {
      id: 'local-' + Date.now(),
      role: 'user',
      text: message,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((current) => [...current, optimistic]);
    setChatInput('');
    setChatSending(true);
    setError('');

    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'chat',
          workerId: selectedWorker.id,
          message,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'O funcionário não conseguiu responder.');
      if (data.message) {
        setChatMessages((current) => [...current, data.message]);
      } else {
        await loadChat(selectedWorker.id);
      }
    } catch (err: any) {
      setError(err?.message || 'O funcionário não conseguiu responder.');
      setChatMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setChatInput(message);
    } finally {
      setChatSending(false);
    }
  };

  const beginRename = () => {
    if (!selectedWorker) return;
    setNameDraft(selectedWorker.name);
    setEditingName(true);
  };

  const saveWorkerName = async () => {
    if (!selectedWorker || nameDraft.trim().length < 2 || savingName) return;
    setSavingName(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'rename-worker',
          workerId: selectedWorker.id,
          name: nameDraft.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível trocar o nome.');
      if (Array.isArray(data.workers)) setWorkers(data.workers);
      setEditingName(false);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível trocar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  const sendTeamMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = teamChatInput.trim();
    if (!message || teamChatSending) return;
    setTeamChatSending(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'team-message', message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      if (data.message) setTeamMessages((current) => [...current, data.message]);
      setTeamChatInput('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setTeamChatSending(false);
    }
  };

  const applyCodeProposal = async (task: AiTask) => {
    const proposal = task.codeProposal;
    if (!proposal?.patches?.length || codeActionTaskId) return;
    const criticalConfirmed = !proposal.critical || window.confirm(
      `Essa proposta altera uma área sensível: ${(proposal.criticalReasons || []).join(', ')}. Você revisou os patches e quer criar uma branch de teste?`
    );
    if (!criticalConfirmed) return;

    setCodeActionTaskId(task.id);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'apply-code-proposal',
          taskId: task.id,
          criticalConfirmed,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar a branch de revisão.');
      if (data.task) {
        setTasks((current) => current.map((item) => item.id === task.id ? data.task : item));
      }
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a branch de revisão.');
    } finally {
      setCodeActionTaskId(null);
    }
  };

  const publishCodeProposal = async (task: AiTask) => {
    const proposal = task.codeProposal;
    if (!proposal || codeActionTaskId) return;
    const previewConfirmed = window.confirm(
      'Confirme somente se você já revisou/testou a branch de revisão. Publicar vai mover essa alteração para a main e disparar o deploy de produção.'
    );
    if (!previewConfirmed) return;
    const criticalConfirmed = !proposal.critical || window.confirm(
      `Confirma novamente a publicação da alteração sensível: ${(proposal.criticalReasons || []).join(', ')}?`
    );
    if (!criticalConfirmed) return;

    setCodeActionTaskId(task.id);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'publish-code-proposal',
          taskId: task.id,
          confirmProduction: true,
          criticalConfirmed,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível publicar a alteração.');
      if (data.task) {
        setTasks((current) => current.map((item) => item.id === task.id ? data.task : item));
      }
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar a alteração.');
    } finally {
      setCodeActionTaskId(null);
    }
  };

  const showOfficeNotice = (message: string) => {
    setOfficeNotice(message);
    window.setTimeout(() => {
      setOfficeNotice((current) => current === message ? '' : current);
    }, 2600);
  };

  const askWorkerToThink = async (workerId: string) => {
    if (thinkingWorkerId || !engine.connected) return;
    setThinkingWorkerId(workerId);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'think', workerId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'O funcionário não conseguiu organizar o pensamento agora.');
      setWorkers((current) => current.map((worker) =>
        worker.id === workerId ? { ...worker, brain: data.brain || worker.brain } : worker
      ));
    } catch (err: any) {
      setError(err?.message || 'O funcionário não conseguiu pensar agora.');
    } finally {
      setThinkingWorkerId(null);
    }
  };

  const addOfficeMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberForm.email.trim() || savingMember) return;
    setSavingMember(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'add-office-member', ...memberForm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível adicionar essa pessoa.');
      setOfficeMembers(Array.isArray(data.members) ? data.members : officeMembers);
      setMemberForm({ email: '', displayName: '', officeRole: 'designer', title: 'Designer', palette: 3 });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível adicionar essa pessoa.');
    } finally {
      setSavingMember(false);
    }
  };

  const toggleMember = async (member: OfficeMember, active: boolean) => {
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'update-office-member', userId: member.userId, active }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o acesso.');
      setOfficeMembers(Array.isArray(data.members) ? data.members : officeMembers);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o acesso.');
    }
  };

  const createHumanTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!humanTaskForm.assigneeUid || humanTaskForm.title.trim().length < 3 || savingHumanTask) return;
    setSavingHumanTask(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'create-human-task', ...humanTaskForm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a demanda.');
      if (data.task) setHumanTasks((current) => [data.task, ...current]);
      setHumanTaskForm((current) => ({ ...current, title: '', description: '', priority: 'normal' }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a demanda.');
    } finally {
      setSavingHumanTask(false);
    }
  };

  const updateHumanTask = async (
    taskId: string,
    status: HumanTaskStatus,
    responseText?: string,
  ) => {
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'update-human-task',
          taskId,
          status,
          response: responseText || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar a demanda.');
      if (data.task) {
        setHumanTasks((current) => current.map((task) => task.id === taskId ? data.task : task));
      }
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a demanda.');
    }
  };

  const renameOfficeArea = async (areaId: string, name: string) => {
    if (!currentUser || !access?.isOfficeAdmin) return;
    setError('');
    const response = await fetch('/api/office/workers', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ action: 'rename-office-area', areaId, name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível renomear a área.');
    if (data.areaNames && typeof data.areaNames === 'object') setAreaNames(data.areaNames);
  };

  const updateOwnOfficeProfile = async (patch: {
    displayName?: string;
    avatarConfig?: OfficeAvatarConfig;
  }) => {
    if (!currentUser) return;
    setError('');

    let localMember: OfficeMember | null = null;
    setOfficeMembers((current) => {
      const existing = current.find((member) => member.userId === currentUser.uid);
      localMember = {
        ...(existing || {
          userId: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Você',
          email: currentUser.email || '',
          officeRole: 'ceo' as const,
          title: 'CEO',
          palette: 0,
          active: true,
          deskId: 'ceo-local',
          avatarConfig: { style: 'all-black', skinTone: 0, hair: 0, facialHair: 0, accessory: 0 },
          position: null,
        }),
        ...(patch.displayName ? { displayName: patch.displayName } : {}),
        ...(patch.avatarConfig ? { avatarConfig: patch.avatarConfig } : {}),
      };
      const withoutSelf = current.filter((member) => member.userId !== currentUser.uid);
      return [localMember, ...withoutSelf];
    });

    try {
      window.localStorage.setItem(
        'leadspay-office-profile:' + currentUser.uid,
        JSON.stringify({
          displayName: patch.displayName || localMember?.displayName,
          avatarConfig: patch.avatarConfig || localMember?.avatarConfig,
        }),
      );
    } catch {}

    // Persistência online é best-effort: nunca bloqueia o personagem/roupa locais.
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'update-own-office-profile', ...patch }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Falha ao sincronizar perfil.');
      if (data.member) {
        setOfficeMembers((current) =>
          current.map((member) => member.userId === data.member.userId
            ? { ...data.member, displayName: localMember?.displayName || data.member.displayName, avatarConfig: localMember?.avatarConfig || data.member.avatarConfig }
            : member
          )
        );
      }
    } catch (err: any) {
      if (!isOfficeQuotaError(err?.message)) {
        setOfficeNotice('Perfil salvo neste dispositivo. A sincronização online será tentada depois.');
      }
    }
  };

  const sendPresence = useCallback((position: { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right' }) => {
    if (!currentUser) return;

    // O CEO é local/manual. Só publicamos presença quando existe outra pessoa real no Office.
    const hasRemotePerson = officeMembersRef.current.some((member) => member.userId !== currentUser.uid);
    if (!hasRemotePerson) return;

    const now = Date.now();
    // Presença online é apenas telemetria para outros usuários; o movimento do jogador é 100% local.
    // Mantemos no máximo uma gravação a cada 30s para não drenar a cota do Firestore.
    if (now - lastPresenceSentRef.current < 30000) return;
    lastPresenceSentRef.current = now;

    void currentUser.getIdToken().then((token) =>
      fetch('/api/office/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'update-presence', ...position }),
      })
    ).catch(() => undefined);
  }, [currentUser?.uid]);

  const openMyComputer = (ownerUid?: string) => {
    if (access?.isOfficeAdmin && ownerUid && ownerUid !== currentUser?.uid) {
      setSelectedHumanId(ownerUid);
      setHumanTaskForm((current) => ({ ...current, assigneeUid: ownerUid }));
    } else {
      setSelectedHumanId(currentUser?.uid || null);
    }
    setIsComputerOpen(true);
  };

  const activeTaskForWorker = (workerId: string) =>
    tasks.find((task) =>
      task.workerId === workerId &&
      ['working', 'waiting_approval', 'paused', 'queued'].includes(task.status),
    );

  const counts = useMemo(() => ({
    working: tasks.filter((task) => task.status === 'working').length,
    queued: tasks.filter((task) => task.status === 'queued').length,
    approval: tasks.filter((task) => task.status === 'waiting_approval').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) || workers[0];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const selectedWorkerTasks = tasks.filter((task) => task.workerId === selectedWorker?.id);
  const scopedTasks = taskScope === 'selected' ? selectedWorkerTasks : tasks;
  const visibleTasks = scopedTasks.filter((task) => filter === 'all' || task.status === filter);
  const currentOfficeMember = officeMembers.find((member) => member.userId === currentUser?.uid) || null;
  const selectedHuman = selectedHumanId
    ? (officeMembers.find((member) => member.userId === selectedHumanId) || null)
    : (access?.isOfficeAdmin ? null : currentOfficeMember);
  const computerTasks = access?.isOfficeAdmin
    ? (selectedHuman?.userId ? humanTasks.filter((task) => task.assigneeUid === selectedHuman.userId) : humanTasks)
    : humanTasks.filter((task) => task.assigneeUid === currentUser?.uid);

  const selectWorker = (workerId: string) => {
    const nextTask = activeTaskForWorker(workerId) ||
      tasks.find((task) => task.workerId === workerId) ||
      null;

    setSelectedWorkerId(workerId);
    setSelectedTaskId(nextTask?.id || null);
    setTaskScope('selected');
    setFilter('all');
  };

  const openTaskFor = (workerId?: string) => {
    const nextWorkerId = workerId || selectedWorkerId || workers[0]?.id || 'lumy-manager';
    setForm((current) => ({ ...current, workerId: nextWorkerId }));
    setIsTaskModalOpen(true);
  };

  return (
    <div className={`ai-staff-page ${standalone ? 'office-standalone-page' : ''}`} id="leadspay-ai-staff-office">
      {standalone ? (
        <section className="office-standalone-nav">
          <div className="office-standalone-brand">
            <span className="office-standalone-logo"><Gamepad2 className="h-4 w-4" /></span>
            <div>
              <strong>{isCityScene ? 'Cidade LeadsPay' : 'LeadsPay Office'}</strong>
              <small>{access?.officeRole === 'ceo' ? 'CEO' : access?.officeRole === 'designer' ? 'Designer' : 'Equipe'} · {isCityScene ? 'mundo externo' : 'escritório ao vivo'}</small>
            </div>
            <span className={`office-standalone-engine ${engine.connected ? 'online' : 'supervised'}`}>
              <i />
              {engine.connected ? 'IA online' : 'Supervisionado'}
            </span>
          </div>

          <nav className="office-standalone-tabs">
            <button type="button" className={!isCityScene && !taskDrawerOpen && !isTeamChatOpen && !isComputerOpen && !isTeamModalOpen ? 'active' : ''} onClick={() => {
              setTaskDrawerOpen(false);
              setIsTeamChatOpen(false);
              setIsComputerOpen(false);
              setIsTeamModalOpen(false);
              navigateScene('/office');
            }}>
              <Gamepad2 className="h-4 w-4" />
              Escritório
            </button>
            <button type="button" className={isCityScene ? 'active' : ''} onClick={() => {
              setTaskDrawerOpen(false);
              setIsTeamChatOpen(false);
              setIsComputerOpen(false);
              setIsTeamModalOpen(false);
              navigateScene('/cidade');
            }}>
              <MapPinned className="h-4 w-4" />
              Cidade
            </button>
            <button type="button" className={taskDrawerOpen ? 'active' : ''} onClick={() => setTaskDrawerOpen((value) => !value)}>
              <ClipboardList className="h-4 w-4" />
              Tarefas
              {tasks.length > 0 && <b>{tasks.length}</b>}
            </button>
            <button type="button" className={isTeamChatOpen ? 'active' : ''} onClick={() => setIsTeamChatOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              Chat
            </button>
            <button type="button" className={isComputerOpen ? 'active' : ''} onClick={() => setIsComputerOpen(true)}>
              <Laptop className="h-4 w-4" />
              Computador
            </button>
            {access?.canManageTeam && (
              <button type="button" className={isTeamModalOpen ? 'active' : ''} onClick={() => setIsTeamModalOpen(true)}>
                <Users className="h-4 w-4" />
                Equipe
              </button>
            )}
            <button type="button" onClick={() => selectedWorker && openChat(selectedWorker.id)}>
              <Brain className="h-4 w-4" />
              Funcionários IA
            </button>
          </nav>

          <div className="office-standalone-actions">
            <button type="button" title="Atualizar dados" onClick={() => void load(false, true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" className="new-task" onClick={() => openTaskFor()}>
              <Plus className="h-4 w-4" />
              Nova tarefa
            </button>
            <button type="button" title="Voltar para LeadsPay" onClick={onExit}>
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : (
        <section className="ai-staff-header">
          <div>
            <div className="ai-staff-eyebrow">
              <Gamepad2 className="h-4 w-4" />
              LEADSPAY OFFICE · {access?.officeRole === 'ceo' ? 'CEO' : access?.officeRole === 'designer' ? 'DESIGNER' : 'EQUIPE'}
            </div>
            <h1>LeadsPay Office</h1>
            <p>
              Um escritório jogável para você, sua equipe humana e os funcionários IA trabalharem no mesmo ambiente.
            </p>
          </div>

          <div className="ai-staff-header-actions">
            <div className={`ai-engine-pill ${engine.connected ? 'online' : 'supervised'}`}>
              <span className="ai-engine-dot" />
              {engine.connected ? 'Executor conectado' : 'Modo supervisionado'}
            </div>
            <button type="button" className="ai-staff-secondary" onClick={() => setIsTeamChatOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              Chat da equipe
            </button>
            <button type="button" className="ai-staff-secondary" onClick={() => setIsComputerOpen(true)}>
              <Laptop className="h-4 w-4" />
              Meu computador
            </button>
            {access?.canManageTeam && (
              <button type="button" className="ai-staff-secondary" onClick={() => setIsTeamModalOpen(true)}>
                <Users className="h-4 w-4" />
                Equipe humana
              </button>
            )}
            <button type="button" className="ai-staff-secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button type="button" className="ai-staff-primary" onClick={() => openTaskFor()}>
              <Plus className="h-4 w-4" />
              Nova tarefa IA
            </button>
          </div>
        </section>
      )}

      {!standalone && (
        <>
          {!engine.connected ? (
            <div className="ai-engine-note">
              <ShieldCheck className="h-4 w-4" />
              <div>
                <strong>A fila de tarefas já é real e fica salva no Admin.</strong>
                <span>{engine.message} Nenhuma tarefa será marcada como concluída automaticamente sem retorno real de um executor.</span>
              </div>
            </div>
          ) : (
            <div className="ai-engine-note online">
              <Sparkles className="h-4 w-4" />
              <div>
                <strong>{engine.provider || 'IA'} conectado · {engine.model || 'modelo ativo'}</strong>
                <span>
                  {engine.repoWriteConnected
                    ? 'Os funcionários podem preparar patches e, após sua aprovação, criar uma branch de revisão antes de qualquer publicação.'
                    : 'Os funcionários já preparam patches executáveis. Falta conectar LEADSPAY_GITHUB_TOKEN para o botão de aplicar no GitHub funcionar.'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-staff-error">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <section className="ai-staff-stats">
            <article>
              <span className="stat-icon working"><Cpu className="h-4 w-4" /></span>
              <div><small>Trabalhando</small><strong>{counts.working}</strong></div>
            </article>
            <article>
              <span className="stat-icon queued"><ClipboardList className="h-4 w-4" /></span>
              <div><small>Na fila</small><strong>{counts.queued}</strong></div>
            </article>
            <article>
              <span className="stat-icon approval"><Clock3 className="h-4 w-4" /></span>
              <div><small>Aguardando você</small><strong>{counts.approval}</strong></div>
            </article>
            <article>
              <span className="stat-icon done"><CheckCircle2 className="h-4 w-4" /></span>
              <div><small>Concluídas</small><strong>{counts.completed}</strong></div>
            </article>
          </section>
        </>
      )}

      {standalone && error && (
        <div className="office-standalone-error">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <section className="ai-staff-workspace">
        <div className="ai-office-panel ai-office-panel-world">
          <div className="ai-office-toolbar">
            <div>
              <strong>{isCityScene ? 'Cidade LeadsPay' : 'Escritório LeadsPay'}</strong>
              <span>{isCityScene
                ? 'Mundo externo separado do escritório: ruas, prédios, praça, lojas e áreas urbanas para explorar.'
                : 'Ambiente interno separado: CEO, equipe humana e IAs trabalham dentro do escritório.'}</span>
            </div>
            <div className="ai-office-legend">
              <span><i className="legend-dot working" /> trabalhando</span>
              <span><i className="legend-dot queued" /> fila</span>
              <span><i className="legend-dot approval" /> aprovação</span>
            </div>
          </div>

          {officeNotice && (
            <div className="office-game-notice">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{officeNotice}</span>
            </div>
          )}

          <GatherOfficeWorld
            workers={workers}
            tasks={tasks}
            humanTasks={humanTasks}
            officeMembers={officeMembers}
            currentUserId={currentUser?.uid || null}
            selectedWorkerId={selectedWorkerId}
            areaNames={areaNames}
            canManageAreas={access?.isOfficeAdmin === true}
            scene={scene}
            onRenameArea={renameOfficeArea}
            onUpdateSelfProfile={updateOwnOfficeProfile}
            onSelectWorker={selectWorker}
            onSelectHuman={(userId) => {
              setSelectedHumanId(userId);
              setHumanTaskForm((current) => ({ ...current, assigneeUid: userId }));
              setIsComputerOpen(true);
            }}
            onOpenTasks={() => setTaskDrawerOpen(true)}
            onPlayerMove={sendPresence}
            onInteract={(interaction) => {
              if (interaction.type === 'computer') openMyComputer(interaction.ownerUid);
              if (interaction.type === 'meeting') setIsTeamChatOpen(true);
              if (interaction.type === 'ai') openChat(interaction.workerId);
              if (interaction.type === 'human') {
                setSelectedHumanId(interaction.userId);
                if (access?.isOfficeAdmin) setIsComputerOpen(true);
                else setIsTeamChatOpen(true);
              }
              if (interaction.type === 'object') {
                if (interaction.objectId === 'creative-board') {
                  setIsTeamChatOpen(true);
                  showOfficeNotice('Quadro criativo aberto para o brainstorming da equipe.');
                }
                if (interaction.objectId === 'lab-terminal') {
                  openChat('backend');
                  showOfficeNotice('Terminal do laboratório conectado ao Stack.');
                }
                if (interaction.objectId === 'designer-board') {
                  const designer = officeMembers.find((member) => member.officeRole === 'designer');
                  if (designer) {
                    setSelectedHumanId(designer.userId);
                    setHumanTaskForm((current) => ({ ...current, assigneeUid: designer.userId }));
                    setIsComputerOpen(true);
                  } else {
                    showOfficeNotice('Adicione sua designer à Equipe Humana para usar este moodboard com ela.');
                  }
                }
                if (interaction.objectId === 'coffee') {
                  showOfficeNotice('☕ Café pego. A copa agora é um ponto de pausa do escritório.');
                }
              }
            }}
          />
        </div>

        <aside className={'ai-task-panel gather-task-drawer ' + (taskDrawerOpen ? 'open' : '')}>
          <div className="ai-task-panel-head">
            <div>
              <strong>{taskScope === 'selected' ? `Tarefas de ${selectedWorker?.name || 'funcionário'}` : 'Fila de tarefas'}</strong>
              <span>
                {taskScope === 'selected'
                  ? `${selectedWorkerTasks.length} tarefa${selectedWorkerTasks.length === 1 ? '' : 's'} deste funcionário`
                  : `${tasks.length} tarefa${tasks.length === 1 ? '' : 's'} registrada${tasks.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="gather-task-head-actions">
              <button type="button" onClick={() => openTaskFor(selectedWorker?.id)} className="mini-add-task" title="Nova tarefa">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setTaskDrawerOpen(false)} className="mini-add-task" title="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="ai-task-scope">
            <button type="button" className={taskScope === 'selected' ? 'active' : ''} onClick={() => setTaskScope('selected')}>
              {selectedWorker?.name || 'Funcionário'}
            </button>
            <button type="button" className={taskScope === 'all' ? 'active' : ''} onClick={() => setTaskScope('all')}>
              Equipe inteira
            </button>
          </div>

          <div className="ai-task-filter">
            <Filter className="h-3.5 w-3.5" />
            {(['all', 'queued', 'working', 'waiting_approval', 'completed'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'active' : ''}
                onClick={() => setFilter(value)}
              >
                {value === 'all' ? 'Todas' : STATUS_LABEL[value]}
              </button>
            ))}
          </div>

          <div className="ai-task-list">
            {loading ? (
              <div className="ai-task-empty">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando escritório...
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="ai-task-empty">
                <ClipboardList className="h-7 w-7" />
                <strong>Nenhuma tarefa aqui</strong>
                <span>
                  {taskScope === 'selected'
                    ? `${selectedWorker?.name || 'Este funcionário'} ainda não tem tarefa neste filtro.`
                    : 'Crie uma tarefa e escolha quem será responsável.'}
                </span>
                <button type="button" onClick={() => openTaskFor(taskScope === 'selected' ? selectedWorker?.id : undefined)}>
                  <Plus className="h-3.5 w-3.5" />
                  Criar primeira tarefa
                </button>
              </div>
            ) : (
              visibleTasks.map((task) => {
                const worker = workers.find((item) => item.id === task.workerId);
                return (
                  <button
                    type="button"
                    key={task.id}
                    className={`ai-task-card ${selectedTaskId === task.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      if (worker) {
                        setSelectedWorkerId(worker.id);
                        setTaskScope('selected');
                      }
                    }}
                  >
                    <div className="ai-task-card-top">
                      <span className={`ai-task-status ${statusTone(task.status)}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                      <span className={`ai-task-priority priority-${task.priority}`}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </div>
                    <strong>{task.title}</strong>
                    <p>{task.project} · {worker?.name || 'Funcionário IA'}</p>
                    {task.status === 'working' && (
                      <div className="ai-task-progress"><i style={{ width: `${task.progress || 10}%` }} /></div>
                    )}
                    <small>{fmtDate(task.createdAt)}</small>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </section>

      {!standalone && (
        <section className="ai-worker-detail">
          <div className="ai-worker-profile">
            <span
              className="pixel-agent-sprite profile-sprite"
              style={{
                backgroundImage: `url('/pixel-agents/assets/characters/char_${selectedWorker?.palette || 0}.png')`,
                backgroundPosition: `${-48}px 0px`,
              }}
            />
            <div>
              <span className="ai-worker-kicker">FUNCIONÁRIO SELECIONADO</span>
              {editingName ? (
                <div className="ai-worker-rename">
                  <input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    maxLength={32}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveWorkerName();
                      if (event.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <button type="button" onClick={() => void saveWorkerName()} disabled={savingName}>
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setEditingName(false)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="ai-worker-name-line">
                  <h2>{selectedWorker?.name}</h2>
                  {access?.isOfficeAdmin && (
                    <button type="button" onClick={beginRename} title="Trocar nome">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              <strong>{selectedWorker?.role}</strong>
              <p>{selectedWorker?.specialty}</p>
              {selectedWorker?.brain && (
                <div className="ai-worker-brain-card">
                  <div>
                    <Brain className="h-3.5 w-3.5" />
                    <strong>{selectedWorker.brain.mood || 'tranquilo'}</strong>
                    <span>· {selectedWorker.brain.focus || 'LeadsPay'}</span>
                  </div>
                  <p>{selectedWorker.brain.lastThought || 'Estou disponível para ajudar.'}</p>
                  <small>{selectedWorker.brain.currentIntent || 'Aguardando o próximo passo.'}</small>
                </div>
              )}
            </div>
          </div>

          <div className="ai-worker-detail-actions">
            <div>
              <small>Tarefas deste funcionário</small>
              <strong>{selectedWorkerTasks.length}</strong>
            </div>
            <button
              type="button"
              className="ai-staff-secondary"
              disabled={!engine.connected || thinkingWorkerId === selectedWorker?.id}
              onClick={() => selectedWorker && void askWorkerToThink(selectedWorker.id)}
            >
              {thinkingWorkerId === selectedWorker?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              Pensar
            </button>
            <button type="button" className="ai-staff-secondary ai-chat-button" onClick={() => selectedWorker && openChat(selectedWorker.id)}>
              <MessageCircle className="h-4 w-4" />
              Conversar
            </button>
            <button type="button" className="ai-staff-primary" onClick={() => openTaskFor(selectedWorker?.id)}>
              <Plus className="h-4 w-4" />
              Atribuir tarefa
            </button>
          </div>
        </section>
      )}

      {selectedTask && (
        <section className={`ai-selected-task ${standalone ? `office-standalone-task-detail ${taskDrawerOpen ? 'open' : ''}` : ''}`}>
          <div className="ai-selected-task-main">
            <div className="ai-selected-task-meta">
              <span className={`ai-task-status ${statusTone(selectedTask.status)}`}>{STATUS_LABEL[selectedTask.status]}</span>
              <span>{selectedTask.project}</span>
              <span>{PRIORITY_LABEL[selectedTask.priority]}</span>
              {selectedTask.requiresApproval && <span>aprovação crítica ativa</span>}
            </div>
            <h3>{selectedTask.title}</h3>
            <p>{selectedTask.description}</p>
            {selectedTask.resultSummary && (
              <div className="ai-task-result">
                <Sparkles className="h-4 w-4" />
                <span>{selectedTask.resultSummary}</span>
              </div>
            )}

            {selectedTask.executionReport && (
              <div className="ai-execution-report">
                <div className="ai-execution-report-head">
                  <div>
                    <Sparkles className="h-4 w-4" />
                    <strong>Trabalho do funcionário</strong>
                  </div>
                  <span>
                    {selectedTask.executorProvider || 'IA'}
                    {selectedTask.executorModel ? ` · ${selectedTask.executorModel}` : ''}
                    {selectedTask.lastRunAt ? ` · ${fmtDate(selectedTask.lastRunAt)}` : ''}
                  </span>
                </div>

                {!!selectedTask.executionReport.findings?.length && (
                  <div className="ai-report-block">
                    <strong>O que encontrou</strong>
                    <ul>
                      {selectedTask.executionReport.findings.map((item, index) => <li key={`finding-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {!!selectedTask.executionReport.proposedChanges?.length && (
                  <div className="ai-report-block">
                    <strong>Mudanças propostas</strong>
                    <ul>
                      {selectedTask.executionReport.proposedChanges.map((item, index) => <li key={`change-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {!!selectedTask.executionReport.validation?.length && (
                  <div className="ai-report-block">
                    <strong>Validação</strong>
                    <ul>
                      {selectedTask.executionReport.validation.map((item, index) => <li key={`validation-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {!!selectedTask.executionReport.risks?.length && (
                  <div className="ai-report-block warning">
                    <strong>Riscos</strong>
                    <ul>
                      {selectedTask.executionReport.risks.map((item, index) => <li key={`risk-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {!!selectedTask.executionReport.filesReviewed?.length && (
                  <div className="ai-report-files">
                    <strong>Arquivos analisados</strong>
                    <div>
                      {selectedTask.executionReport.filesReviewed.map((file) => <code key={file}>{file}</code>)}
                    </div>
                  </div>
                )}

                {selectedTask.executionReport.nextStep && (
                  <div className="ai-report-next">
                    <ChevronRight className="h-4 w-4" />
                    <span>{selectedTask.executionReport.nextStep}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedTask.codeProposal && (
            <div className={`office-code-proposal status-${selectedTask.codeProposal.status}`}>
              <div className="office-code-proposal-head">
                <div>
                  <Code2 className="h-4 w-4" />
                  <strong>Execução de código preparada</strong>
                </div>
                <span>
                  {selectedTask.codeProposal.status === 'draft'
                    ? 'aguardando aprovação'
                    : selectedTask.codeProposal.status === 'branch_ready'
                      ? 'branch de revisão criada'
                      : selectedTask.codeProposal.status === 'published'
                        ? 'publicado'
                        : 'sem patch aplicável'}
                </span>
              </div>

              {selectedTask.codeProposal.critical && (
                <div className="office-code-critical">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    Alteração sensível: {(selectedTask.codeProposal.criticalReasons || []).join(', ')}.
                    Ela exige confirmação extra antes da branch e antes da produção.
                  </span>
                </div>
              )}

              {!!selectedTask.codeProposal.patches?.length && (
                <div className="office-code-files">
                  {selectedTask.codeProposal.patches.map((patch, index) => (
                    <article key={`${patch.path}-${index}`}>
                      <div>
                        <GitBranch className="h-3.5 w-3.5" />
                        <code>{patch.path}</code>
                        <span>{patch.operation === 'create' ? 'novo arquivo' : 'alteração'}</span>
                      </div>
                      <p>{patch.reason || 'Patch preparado pela IA para esta tarefa.'}</p>
                    </article>
                  ))}
                </div>
              )}

              {selectedTask.codeProposal.branch && (
                <div className="office-code-branch">
                  <div>
                    <small>Branch de revisão</small>
                    <code>{selectedTask.codeProposal.branch}</code>
                  </div>
                  <a
                    href={`https://github.com/oficialtechify-stack/techify-gaming/tree/${encodeURIComponent(selectedTask.codeProposal.branch)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir no GitHub
                  </a>
                </div>
              )}

              {selectedTask.codeProposal.status === 'draft' && selectedTask.codeProposal.patches.length > 0 && access?.isOfficeAdmin && (
                <div className="office-code-actions">
                  <button
                    type="button"
                    className="run-ai-task"
                    disabled={!engine.repoWriteConnected || codeActionTaskId === selectedTask.id}
                    onClick={() => void applyCodeProposal(selectedTask)}
                  >
                    {codeActionTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                    {engine.repoWriteConnected ? 'Criar branch de revisão' : 'GitHub ainda não conectado'}
                  </button>
                  {!engine.repoWriteConnected && (
                    <small>Adicione LEADSPAY_GITHUB_TOKEN na Vercel com acesso apenas a este repositório e Contents: Read and write.</small>
                  )}
                </div>
              )}

              {selectedTask.codeProposal.status === 'branch_ready' && access?.isOfficeAdmin && (
                <div className="office-code-actions production">
                  <div>
                    <strong>Teste a branch antes da produção.</strong>
                    <span>O projeto Vercel conectado ao GitHub pode gerar um Preview automaticamente para essa branch.</span>
                  </div>
                  <button
                    type="button"
                    className="approve-task"
                    disabled={codeActionTaskId === selectedTask.id}
                    onClick={() => void publishCodeProposal(selectedTask)}
                  >
                    {codeActionTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Publicar em produção
                  </button>
                </div>
              )}

              {selectedTask.codeProposal.status === 'published' && (
                <div className="office-code-published">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mudança aprovada e enviada para a main. O deploy de produção segue o Git conectado.</span>
                </div>
              )}
            </div>
          )}

          <div className="ai-selected-task-actions">
            {selectedTask.status === 'queued' && engine.connected && (
              <button
                type="button"
                className="run-ai-task"
                disabled={runningTaskId === selectedTask.id}
                onClick={() => void runTask(selectedTask.id)}
              >
                {runningTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {runningTaskId === selectedTask.id ? 'IA trabalhando...' : 'Executar com IA'}
              </button>
            )}

            {selectedTask.status === 'working' && (
              runningTaskId === selectedTask.id ? (
                <button type="button" className="run-ai-task" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  IA trabalhando...
                </button>
              ) : engine.connected ? (
                <button type="button" className="run-ai-task" onClick={() => void runTask(selectedTask.id)}>
                  <Sparkles className="h-4 w-4" />
                  Continuar com IA
                </button>
              ) : (
                <button type="button" className="pause-task" onClick={() => void updateTask(selectedTask.id, 'paused', selectedTask.progress)}>
                  <Pause className="h-4 w-4" />
                  Pausar
                </button>
              )
            )}

            {selectedTask.status === 'paused' && engine.connected && (
              <button type="button" className="run-ai-task" onClick={() => void runTask(selectedTask.id)}>
                <Play className="h-4 w-4" />
                Continuar com IA
              </button>
            )}

            {selectedTask.status === 'waiting_approval' && (
              <>
                <button
                  type="button"
                  className="approve-task"
                  onClick={() => void updateTask(selectedTask.id, 'completed', 100)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aprovar trabalho
                </button>
                {engine.connected && (
                  <button type="button" className="run-ai-task secondary" onClick={() => void runTask(selectedTask.id)}>
                    <RefreshCw className="h-4 w-4" />
                    Pedir nova análise
                  </button>
                )}
              </>
            )}

            {selectedTask.status === 'failed' && engine.connected && (
              <button type="button" className="run-ai-task" onClick={() => void runTask(selectedTask.id)}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            )}

            {!['completed', 'cancelled'].includes(selectedTask.status) && runningTaskId !== selectedTask.id && (
              <button type="button" className="cancel-task" onClick={() => void updateTask(selectedTask.id, 'cancelled', selectedTask.progress)}>
                <X className="h-4 w-4" />
                Cancelar
              </button>
            )}
            {access?.isOfficeAdmin && (
              <button type="button" className="delete-task" onClick={() => void deleteTask(selectedTask.id)}>
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            )}
          </div>
        </section>
      )}

      {isTeamChatOpen && (
        <div className="ai-chat-backdrop" onMouseDown={() => setIsTeamChatOpen(false)}>
          <section className="office-team-chat-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="office-modal-head">
              <div>
                <span><MessageCircle className="h-4 w-4" /></span>
                <div>
                  <small>SALA DE REUNIÃO</small>
                  <h2>Chat da equipe LeadsPay</h2>
                </div>
              </div>
              <button type="button" onClick={() => setIsTeamChatOpen(false)}><X className="h-4 w-4" /></button>
            </header>

            <div className="office-team-chat-body" ref={teamChatBodyRef}>
              {teamMessages.length === 0 ? (
                <div className="office-computer-empty">
                  <MessageCircle className="h-6 w-6" />
                  <strong>A sala está quieta</strong>
                  <span>Use este chat para você e sua designer alinharem demandas sem sair da LeadsPay.</span>
                </div>
              ) : (
                teamMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`office-team-message ${message.userId === currentUser?.uid ? 'mine' : ''}`}
                  >
                    <div>
                      <strong>{message.userId === currentUser?.uid ? 'Você' : message.userName}</strong>
                      <small>{fmtDate(message.createdAt)}</small>
                    </div>
                    <p>{message.text}</p>
                  </article>
                ))
              )}
            </div>

            <form className="office-team-chat-composer" onSubmit={sendTeamMessage}>
              <textarea
                rows={2}
                value={teamChatInput}
                onChange={(event) => setTeamChatInput(event.target.value)}
                placeholder="Escreva para a equipe..."
                maxLength={3000}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button type="submit" disabled={!teamChatInput.trim() || teamChatSending}>
                {teamChatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </section>
        </div>
      )}

      {isTeamModalOpen && access?.isOfficeAdmin && (
        <div className="ai-chat-backdrop" onMouseDown={() => setIsTeamModalOpen(false)}>
          <section className="office-team-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="office-modal-head">
              <div>
                <span><Users className="h-4 w-4" /></span>
                <div>
                  <small>EQUIPE HUMANA</small>
                  <h2>Quem trabalha no LeadsPay Office</h2>
                </div>
              </div>
              <button type="button" onClick={() => setIsTeamModalOpen(false)}><X className="h-4 w-4" /></button>
            </header>

            <div className="office-team-content">
              <form className="office-member-form" onSubmit={addOfficeMember}>
                <div className="office-form-title">
                  <UserPlus className="h-4 w-4" />
                  <div>
                    <strong>Adicionar pessoa</strong>
                    <span>Ela precisa já ter uma conta na LeadsPay.</span>
                  </div>
                </div>

                <label>
                  E-mail da conta LeadsPay
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="designer@exemplo.com"
                    required
                  />
                </label>

                <div className="office-member-grid">
                  <label>
                    Nome no escritório
                    <input
                      value={memberForm.displayName}
                      onChange={(event) => setMemberForm((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder="Nome da designer"
                    />
                  </label>
                  <label>
                    Função
                    <select
                      value={memberForm.officeRole}
                      onChange={(event) => {
                        const role = event.target.value as 'designer' | 'member';
                        setMemberForm((current) => ({
                          ...current,
                          officeRole: role,
                          title: role === 'designer' ? 'Designer' : current.title || 'Equipe LeadsPay',
                        }));
                      }}
                    >
                      <option value="designer">Designer</option>
                      <option value="member">Outro membro</option>
                    </select>
                  </label>
                </div>

                <div className="office-member-grid">
                  <label>
                    Cargo
                    <input
                      value={memberForm.title}
                      onChange={(event) => setMemberForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Designer gráfico"
                    />
                  </label>
                  <label>
                    Personagem
                    <select
                      value={memberForm.palette}
                      onChange={(event) => setMemberForm((current) => ({ ...current, palette: Number(event.target.value) }))}
                    >
                      {[0,1,2,3,4,5].map((palette) => (
                        <option key={palette} value={palette}>Visual {palette + 1}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <button type="submit" className="ai-staff-primary" disabled={savingMember || !memberForm.email.trim()}>
                  {savingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {savingMember ? 'Adicionando...' : 'Adicionar ao escritório'}
                </button>
              </form>

              <div className="office-member-list">
                <div className="office-list-title">
                  <strong>Membros</strong>
                  <span>{officeMembers.length}</span>
                </div>
                {officeMembers.map((member) => (
                  <article key={member.userId} className="office-member-card">
                    <span
                      className="pixel-agent-sprite office-member-sprite"
                      style={{
                        backgroundImage: `url('/pixel-agents/assets/characters/char_${member.palette}.png')`,
                        backgroundPosition: `${-48}px 0px`,
                      }}
                    />
                    <div>
                      <strong>{member.displayName}</strong>
                      <span>{member.officeRole === 'ceo' ? 'CEO' : member.title}</span>
                      <small>{member.email}</small>
                    </div>
                    {member.officeRole !== 'ceo' && (
                      <button
                        type="button"
                        className="office-member-disable"
                        onClick={() => void toggleMember(member, false)}
                      >
                        Desativar
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {isComputerOpen && (
        <div className="ai-chat-backdrop" onMouseDown={() => setIsComputerOpen(false)}>
          <section className="office-computer-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="office-modal-head">
              <div>
                <span><Laptop className="h-4 w-4" /></span>
                <div>
                  <small>ESTAÇÃO DE TRABALHO</small>
                  <h2>{access?.isOfficeAdmin && selectedHuman ? `Computador de ${selectedHuman.displayName}` : 'Meu computador'}</h2>
                </div>
              </div>
              <button type="button" onClick={() => setIsComputerOpen(false)}><X className="h-4 w-4" /></button>
            </header>

            <div className="office-computer-content">
              {access?.isOfficeAdmin && (
                <aside className="office-computer-sidebar">
                  <strong>Pessoa</strong>
                  <button
                    type="button"
                    className={!selectedHumanId ? 'active' : ''}
                    onClick={() => {
                      setSelectedHumanId(null);
                      setHumanTaskForm((current) => ({ ...current, assigneeUid: '' }));
                    }}
                  >
                    Toda a equipe
                  </button>
                  {officeMembers.filter((member) => member.officeRole !== 'ceo').map((member) => (
                    <button
                      type="button"
                      key={member.userId}
                      className={selectedHuman?.userId === member.userId ? 'active' : ''}
                      onClick={() => {
                        setSelectedHumanId(member.userId);
                        setHumanTaskForm((current) => ({ ...current, assigneeUid: member.userId }));
                      }}
                    >
                      {member.displayName}
                      <small>{member.title}</small>
                    </button>
                  ))}
                </aside>
              )}

              <main className="office-computer-main">
                {access?.canAssignHumanTasks && (
                  <form className="office-demand-form" onSubmit={createHumanTask}>
                    <div className="office-demand-title">
                      <strong>Nova demanda humana</strong>
                      <span>Envie uma tarefa para sua designer ou outro membro real da equipe.</span>
                    </div>

                    {!selectedHuman?.userId && (
                      <select
                        value={humanTaskForm.assigneeUid}
                        onChange={(event) => setHumanTaskForm((current) => ({ ...current, assigneeUid: event.target.value }))}
                        required
                      >
                        <option value="">Escolha a pessoa</option>
                        {officeMembers.filter((member) => member.officeRole !== 'ceo').map((member) => (
                          <option key={member.userId} value={member.userId}>{member.displayName} · {member.title}</option>
                        ))}
                      </select>
                    )}

                    <div className="office-demand-grid">
                      <input
                        value={humanTaskForm.title}
                        onChange={(event) => setHumanTaskForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Título da demanda"
                        maxLength={140}
                        required
                      />
                      <select
                        value={humanTaskForm.priority}
                        onChange={(event) => setHumanTaskForm((current) => ({ ...current, priority: event.target.value as HumanTask['priority'] }))}
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={humanTaskForm.description}
                      onChange={(event) => setHumanTaskForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Explique o que precisa ser feito, arquivos, referências e resultado esperado."
                      required
                    />

                    <button
                      type="submit"
                      className="ai-staff-primary"
                      disabled={
                        savingHumanTask ||
                        !(selectedHuman?.userId || humanTaskForm.assigneeUid) ||
                        humanTaskForm.title.trim().length < 3 ||
                        humanTaskForm.description.trim().length < 5
                      }
                      onClick={() => {
                        if (selectedHuman?.userId) {
                          setHumanTaskForm((current) => ({ ...current, assigneeUid: selectedHuman.userId }));
                        }
                      }}
                    >
                      {savingHumanTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Enviar demanda
                    </button>
                  </form>
                )}

                <div className="office-human-task-list">
                  <div className="office-list-title">
                    <strong>{access?.isOfficeAdmin ? 'Demandas' : 'Minhas demandas'}</strong>
                    <span>{computerTasks.length}</span>
                  </div>

                  {computerTasks.length === 0 ? (
                    <div className="office-computer-empty">
                      <ClipboardList className="h-6 w-6" />
                      <strong>Nenhuma demanda</strong>
                      <span>{access?.isOfficeAdmin ? 'Escolha uma pessoa e envie a primeira demanda.' : 'Quando o CEO enviar uma demanda, ela aparece aqui.'}</span>
                    </div>
                  ) : (
                    computerTasks.map((task) => {
                      const assignee = officeMembers.find((member) => member.userId === task.assigneeUid);
                      return (
                        <article key={task.id} className={`office-human-task status-${task.status}`}>
                          <div className="office-human-task-top">
                            <span>{task.status === 'todo' ? 'A fazer' : task.status === 'working' ? 'Trabalhando' : task.status === 'review' ? 'Em revisão' : task.status === 'blocked' ? 'Bloqueada' : 'Concluída'}</span>
                            <small>{PRIORITY_LABEL[task.priority]}</small>
                          </div>
                          <h3>{task.title}</h3>
                          {access?.isOfficeAdmin && <em>{assignee?.displayName || 'Equipe'}</em>}
                          <p>{task.description}</p>
                          {task.response && <blockquote>{task.response}</blockquote>}
                          <small>{fmtDate(task.updatedAt || task.createdAt)}</small>

                          <div className="office-human-task-actions">
                            {task.status === 'todo' && (
                              <button type="button" onClick={() => void updateHumanTask(task.id, 'working')}>Iniciar</button>
                            )}
                            {task.status === 'working' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const note = window.prompt('Escreva uma atualização ou o que foi feito:') || '';
                                    void updateHumanTask(task.id, 'review', note);
                                  }}
                                >
                                  Enviar para revisão
                                </button>
                                <button type="button" onClick={() => void updateHumanTask(task.id, 'blocked')}>Marcar bloqueio</button>
                              </>
                            )}
                            {task.status === 'blocked' && (
                              <button type="button" onClick={() => void updateHumanTask(task.id, 'working')}>Retomar</button>
                            )}
                            {task.status === 'review' && access?.isOfficeAdmin && (
                              <>
                                <button type="button" onClick={() => void updateHumanTask(task.id, 'completed')}>Aprovar</button>
                                <button type="button" onClick={() => void updateHumanTask(task.id, 'working')}>Pedir ajuste</button>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </main>
            </div>
          </section>
        </div>
      )}

      {isChatOpen && selectedWorker && (
        <div className="ai-chat-backdrop" onMouseDown={() => setIsChatOpen(false)}>
          <section className="ai-worker-chat" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="ai-worker-chat-head">
              <div className="ai-worker-chat-person">
                <span
                  className="pixel-agent-sprite chat-sprite"
                  style={{
                    backgroundImage: `url('/pixel-agents/assets/characters/char_${selectedWorker.palette}.png')`,
                    backgroundPosition: `${-48}px 0px`,
                  }}
                />
                <div>
                  <strong>{selectedWorker.name}</strong>
                  <span>{selectedWorker.role} · disponível para conversar</span>
                </div>
              </div>
              <button type="button" onClick={() => setIsChatOpen(false)} aria-label="Fechar conversa">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="ai-worker-chat-body" ref={chatBodyRef}>
              {chatLoading ? (
                <div className="ai-chat-loading">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando conversa...
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="ai-chat-welcome">
                  <MessageCircle className="h-7 w-7" />
                  <strong>Converse com {selectedWorker.name}</strong>
                  <span>
                    Tire dúvidas, peça explicações, discuta ideias ou peça ajuda antes de transformar algo em uma tarefa.
                  </span>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className={`ai-chat-message ${message.role}`}>
                    <span>{message.role === 'user' ? 'Você' : selectedWorker.name}</span>
                    <p>{message.text}</p>
                    <small>{fmtDate(message.createdAt)}</small>
                  </div>
                ))
              )}
              {chatSending && (
                <div className="ai-chat-typing">
                  <span /><span /><span />
                  {selectedWorker.name} está pensando...
                </div>
              )}
            </div>

            <form className="ai-worker-chat-composer" onSubmit={sendChat}>
              <textarea
                rows={2}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={`Pergunte algo para ${selectedWorker.name}...`}
                maxLength={5000}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button type="submit" disabled={!chatInput.trim() || chatSending || !engine.connected}>
                {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>

            <footer className="ai-worker-chat-foot">
              O chat serve para conversar e entender. Para execução, use <strong>Atribuir tarefa</strong>.
            </footer>
          </section>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="ai-task-modal-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setIsTaskModalOpen(false);
        }}>
          <form className="ai-task-modal" onSubmit={createTask}>
            <button type="button" className="ai-task-modal-close" onClick={() => setIsTaskModalOpen(false)}>
              <X className="h-4 w-4" />
            </button>

            <div className="ai-task-modal-title">
              <span><UserRoundCog className="h-4 w-4" /></span>
              <div>
                <small>NOVA MISSÃO</small>
                <h2>Atribuir tarefa a um funcionário</h2>
              </div>
            </div>

            <label>
              Funcionário
              <select value={form.workerId} onChange={(event) => setForm((current) => ({ ...current, workerId: event.target.value }))}>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.name} · {worker.role}</option>
                ))}
              </select>
            </label>

            <div className="ai-task-modal-grid">
              <label>
                Projeto
                <select value={form.project} onChange={(event) => setForm((current) => ({ ...current, project: event.target.value }))}>
                  <option>LeadsPay</option>
                  <option>Comunidade LeadsPay</option>
                  <option>LeadsPay Connect</option>
                  <option>Lumy</option>
                  <option>Outro</option>
                </select>
              </label>
              <label>
                Prioridade
                <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as AiTask['priority'] }))}>
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
            </div>

            <label>
              Título
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Revisar o checkout mobile"
                maxLength={140}
              />
            </label>

            <label>
              Instruções da tarefa
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Explique o objetivo, o que deve ser analisado e o resultado esperado..."
                rows={6}
                maxLength={5000}
              />
            </label>

            <label className="ai-task-approval-toggle">
              <input
                type="checkbox"
                checked={form.requiresApproval}
                onChange={(event) => setForm((current) => ({ ...current, requiresApproval: event.target.checked }))}
              />
              <span>
                <strong>Exigir minha aprovação para ações críticas</strong>
                <small>Deploy, exclusões, mudanças financeiras e alterações sensíveis devem parar antes da execução final.</small>
              </span>
            </label>

            <div className="ai-task-modal-footer">
              <button type="button" className="ai-staff-secondary" onClick={() => setIsTaskModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="ai-staff-primary"
                disabled={savingTask || form.title.trim().length < 3 || form.description.trim().length < 10}
              >
                {savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {savingTask ? 'Enviando...' : 'Enviar para a fila'}
                {!savingTask && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
