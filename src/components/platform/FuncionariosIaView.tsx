import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Cpu,
  Filter,
  Gamepad2,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCog,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ai-pixel-office.css';

type Worker = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  palette: number;
};

type TaskStatus =
  | 'queued'
  | 'working'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

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
  createdAt?: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

type EngineInfo = {
  connected: boolean;
  mode: string;
  message: string;
};

const FALLBACK_WORKERS: Worker[] = [
  { id: 'lumy-manager', name: 'Lumy', role: 'Gerente IA', specialty: 'Coordena o time e divide projetos.', palette: 0 },
  { id: 'frontend', name: 'Pixel', role: 'Frontend', specialty: 'Interface, responsividade e UX.', palette: 1 },
  { id: 'backend', name: 'Stack', role: 'Backend', specialty: 'APIs, Firebase e integrações.', palette: 2 },
  { id: 'designer', name: 'Iris', role: 'Designer UI/UX', specialty: 'Design e acabamento visual.', palette: 3 },
  { id: 'qa', name: 'Scout', role: 'QA & Testes', specialty: 'Validação e regressões.', palette: 4 },
  { id: 'growth', name: 'Nova', role: 'Marketing & Comunidade', specialty: 'Campanhas e comunidade.', palette: 5 },
];

const STATIONS = [
  { left: '15%', top: '37%' },
  { left: '40%', top: '37%' },
  { left: '65%', top: '37%' },
  { left: '24%', top: '72%' },
  { left: '50%', top: '72%' },
  { left: '76%', top: '72%' },
];

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

const workerVisualState = (tasks: AiTask[], workerId: string) => {
  const current = tasks.find((task) =>
    task.workerId === workerId &&
    ['working', 'waiting_approval', 'paused'].includes(task.status),
  );
  if (current) return current.status;
  if (tasks.some((task) => task.workerId === workerId && task.status === 'queued')) return 'queued';
  return 'idle';
};

const characterFrameFor = (
  state: ReturnType<typeof workerVisualState>,
  tick: number,
): { row: number; frame: number } => {
  if (state === 'working') return { row: 0, frame: tick % 2 === 0 ? 3 : 4 };
  if (state === 'waiting_approval') return { row: 0, frame: 5 + (tick % 2) };
  if (state === 'paused') return { row: 0, frame: 1 };
  if (state === 'queued') return { row: 0, frame: tick % 4 === 0 ? 0 : 1 };
  return { row: 0, frame: 1 };
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

export const FuncionariosIaView: React.FC = () => {
  const { currentUser } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>(FALLBACK_WORKERS);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [engine, setEngine] = useState<EngineInfo>({
    connected: false,
    mode: 'supervised',
    message: 'Carregando executor...',
  });
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('lumy-manager');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [pcTick, setPcTick] = useState(0);

  const [form, setForm] = useState({
    workerId: 'lumy-manager',
    title: '',
    description: '',
    project: 'LeadsPay',
    priority: 'normal' as AiTask['priority'],
    requiresApproval: true,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
      setPcTick((value) => (value + 1) % 3);
    }, 360);
    return () => window.clearInterval(interval);
  }, []);

  const authHeaders = async () => {
    if (!currentUser) throw new Error('Sessão do administrador não encontrada.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
    };
  };

  const load = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/ai-workers', {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os Funcionários IA.');
      setWorkers(Array.isArray(data.workers) && data.workers.length ? data.workers : FALLBACK_WORKERS);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      if (data.executionEngine) setEngine(data.executionEngine);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar o escritório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.uid]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || form.description.trim().length < 10) return;

    setSavingTask(true);
    setError('');
    try {
      const response = await fetch('/api/admin/ai-workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar a tarefa.');

      setTasks((current) => [data.task, ...current]);
      setSelectedWorkerId(form.workerId);
      setSelectedTaskId(data.task.id);
      setIsTaskModalOpen(false);
      setForm((current) => ({ ...current, title: '', description: '' }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a tarefa.');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTask = async (taskId: string, status: TaskStatus, progress?: number) => {
    setError('');
    try {
      const response = await fetch('/api/admin/ai-workers', {
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
      const response = await fetch('/api/admin/ai-workers', {
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
  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);

  const openTaskFor = (workerId?: string) => {
    const nextWorkerId = workerId || selectedWorkerId || workers[0]?.id || 'lumy-manager';
    setForm((current) => ({ ...current, workerId: nextWorkerId }));
    setIsTaskModalOpen(true);
  };

  return (
    <div className="ai-staff-page" id="leadspay-ai-staff-office">
      <section className="ai-staff-header">
        <div>
          <div className="ai-staff-eyebrow">
            <Gamepad2 className="h-4 w-4" />
            PIXEL OFFICE · ADMIN
          </div>
          <h1>Funcionários IA</h1>
          <p>
            Seu escritório digital da LeadsPay. Crie tarefas, distribua responsabilidades e acompanhe cada funcionário visualmente.
          </p>
        </div>

        <div className="ai-staff-header-actions">
          <div className={`ai-engine-pill ${engine.connected ? 'online' : 'supervised'}`}>
            <span className="ai-engine-dot" />
            {engine.connected ? 'Executor conectado' : 'Modo supervisionado'}
          </div>
          <button type="button" className="ai-staff-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button type="button" className="ai-staff-primary" onClick={() => openTaskFor()}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </button>
        </div>
      </section>

      {!engine.connected && (
        <div className="ai-engine-note">
          <ShieldCheck className="h-4 w-4" />
          <div>
            <strong>A fila de tarefas já é real e fica salva no Admin.</strong>
            <span>{engine.message} Nenhuma tarefa será marcada como concluída automaticamente sem retorno real de um executor.</span>
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

      <section className="ai-staff-workspace">
        <div className="ai-office-panel">
          <div className="ai-office-toolbar">
            <div>
              <strong>Escritório LeadsPay</strong>
              <span>Clique em um funcionário para ver as tarefas dele.</span>
            </div>
            <div className="ai-office-legend">
              <span><i className="legend-dot working" /> trabalhando</span>
              <span><i className="legend-dot queued" /> fila</span>
              <span><i className="legend-dot approval" /> aprovação</span>
            </div>
          </div>

          <div className="ai-office-scroll">
            <div className="pixel-office-room" aria-label="Escritório pixel dos Funcionários IA">
              <div className="pixel-office-wall">
                <img className="pixel-furniture wall-books left" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
                <img className="pixel-furniture wall-clock" src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="" />
                <img className="pixel-furniture wall-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
                <img className="pixel-furniture wall-painting" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
                <img className="pixel-furniture wall-books right" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
              </div>

              <div className="pixel-office-floor" />

              <img className="pixel-furniture office-plant p1" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
              <img className="pixel-furniture office-plant p2" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
              <img className="pixel-furniture office-sofa" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
              <img className="pixel-furniture office-coffee-table" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />

              {workers.map((worker, index) => {
                const state = workerVisualState(tasks, worker.id);
                const frame = characterFrameFor(state, tick);
                const task = activeTaskForWorker(worker.id);
                const station = STATIONS[index] || STATIONS[index % STATIONS.length];
                const pcFrame = state === 'working'
                  ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${pcTick + 1}.png`
                  : '/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png';

                return (
                  <button
                    key={worker.id}
                    type="button"
                    className={`pixel-worker-station ${selectedWorkerId === worker.id ? 'selected' : ''} state-${state}`}
                    style={{ left: station.left, top: station.top }}
                    onClick={() => {
                      setSelectedWorkerId(worker.id);
                      if (task) setSelectedTaskId(task.id);
                    }}
                  >
                    <span className="pixel-worker-status-bubble">
                      {state === 'working' ? '...' : state === 'waiting_approval' ? '!' : state === 'queued' ? '⌛' : '✓'}
                    </span>

                    <img className="pixel-furniture station-pc" src={pcFrame} alt="" />

                    <span
                      className="pixel-agent-sprite"
                      style={{
                        backgroundImage: `url('/pixel-agents/assets/characters/char_${worker.palette}.png')`,
                        backgroundPosition: `${-frame.frame * 48}px ${-frame.row * 96}px`,
                      }}
                    />

                    <img
                      className="pixel-furniture station-desk"
                      src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png"
                      alt=""
                    />

                    <span className="pixel-worker-nameplate">
                      <strong>{worker.name}</strong>
                      <small>{task ? task.title : worker.role}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="ai-task-panel">
          <div className="ai-task-panel-head">
            <div>
              <strong>Fila de tarefas</strong>
              <span>{tasks.length} tarefa{tasks.length === 1 ? '' : 's'} registrada{tasks.length === 1 ? '' : 's'}</span>
            </div>
            <button type="button" onClick={() => openTaskFor()} className="mini-add-task" title="Nova tarefa">
              <Plus className="h-4 w-4" />
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
                <span>Crie uma tarefa e escolha quem será responsável.</span>
                <button type="button" onClick={() => openTaskFor()}>
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
                      if (worker) setSelectedWorkerId(worker.id);
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
            <h2>{selectedWorker?.name}</h2>
            <strong>{selectedWorker?.role}</strong>
            <p>{selectedWorker?.specialty}</p>
          </div>
        </div>

        <div className="ai-worker-detail-actions">
          <div>
            <small>Tarefas deste funcionário</small>
            <strong>{selectedWorkerTasks.length}</strong>
          </div>
          <button type="button" className="ai-staff-primary" onClick={() => openTaskFor(selectedWorker?.id)}>
            <Plus className="h-4 w-4" />
            Atribuir tarefa
          </button>
        </div>
      </section>

      {selectedTask && (
        <section className="ai-selected-task">
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
          </div>

          <div className="ai-selected-task-actions">
            {selectedTask.status === 'waiting_approval' && (
              <button type="button" className="approve-task" onClick={() => void updateTask(selectedTask.id, 'working', selectedTask.progress)}>
                <Play className="h-4 w-4" />
                Aprovar e continuar
              </button>
            )}
            {selectedTask.status === 'working' && (
              <button type="button" className="pause-task" onClick={() => void updateTask(selectedTask.id, 'paused', selectedTask.progress)}>
                <Pause className="h-4 w-4" />
                Pausar
              </button>
            )}
            {selectedTask.status === 'paused' && (
              <button type="button" className="approve-task" onClick={() => void updateTask(selectedTask.id, 'queued', selectedTask.progress)}>
                <Play className="h-4 w-4" />
                Voltar para fila
              </button>
            )}
            {!['completed', 'cancelled'].includes(selectedTask.status) && (
              <button type="button" className="cancel-task" onClick={() => void updateTask(selectedTask.id, 'cancelled', selectedTask.progress)}>
                <X className="h-4 w-4" />
                Cancelar
              </button>
            )}
            <button type="button" className="delete-task" onClick={() => void deleteTask(selectedTask.id)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </section>
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
