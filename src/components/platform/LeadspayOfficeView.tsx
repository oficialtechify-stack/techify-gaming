import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Expand,
  Gamepad2,
  Home,
  Loader2,
  Map,
  MessageCircle,
  Monitor,
  Palette,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/leadspay-office-workadventure.css';

type OfficeTool = 'world' | 'tasks' | 'chat' | 'computer' | 'team' | 'ai' | 'decorator';
type WorldScene = 'city' | 'office';

type OfficeWorker = {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  brain?: {
    mood?: string;
    focus?: string;
    currentIntent?: string;
    lastThought?: string;
  } | null;
};

type OfficeTask = {
  id: string;
  workerId?: string;
  title: string;
  description?: string;
  status?: string;
  progress?: number;
  priority?: string;
  updatedAt?: string | null;
};

type HumanTask = {
  id: string;
  assigneeUid: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  updatedAt?: string;
};

type OfficeMember = {
  userId: string;
  displayName: string;
  email?: string;
  officeRole?: 'ceo' | 'designer' | 'member';
  title?: string;
  active?: boolean;
};

type TeamMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

type OfficeAccess = {
  officeRole?: 'ceo' | 'designer' | 'member';
  isOfficeAdmin?: boolean;
  canManageTeam?: boolean;
  canUseAi?: boolean;
};

type OfficeShellData = {
  workers: OfficeWorker[];
  tasks: OfficeTask[];
  humanTasks: HumanTask[];
  officeMembers: OfficeMember[];
  teamMessages: TeamMessage[];
  access: OfficeAccess | null;
  engine: {
    connected?: boolean;
    provider?: string | null;
    model?: string | null;
    message?: string;
  } | null;
};

interface LeadspayOfficeViewProps {
  standalone?: boolean;
  initialScene?: WorldScene;
  embeddedPanel?: Exclude<OfficeTool, 'world'> | null;
  onExit?: () => void;
}

const EMPTY_DATA: OfficeShellData = {
  workers: [],
  tasks: [],
  humanTasks: [],
  officeMembers: [],
  teamMessages: [],
  access: null,
  engine: null,
};

const TOOL_ITEMS: Array<{ id: OfficeTool; label: string; icon: React.ElementType }> = [
  { id: 'world', label: 'Mundo', icon: Gamepad2 },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'computer', label: 'Computador', icon: Monitor },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'ai', label: 'Funcionários IA', icon: Bot },
  { id: 'decorator', label: 'Decorador', icon: Palette },
];

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    queued: 'Na fila',
    working: 'Trabalhando',
    waiting_approval: 'Aguardando você',
    paused: 'Pausada',
    completed: 'Concluída',
    failed: 'Falhou',
    cancelled: 'Cancelada',
    todo: 'A fazer',
    review: 'Em revisão',
    blocked: 'Bloqueada',
  };
  return map[status || ''] || status || 'Sem status';
}

function safeDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function resolveMapUrl(scene: WorldScene) {
  const env = import.meta.env as Record<string, string | undefined>;
  const direct = scene === 'city'
    ? env.VITE_WORKADVENTURE_CITY_URL
    : env.VITE_WORKADVENTURE_OFFICE_URL;

  if (direct?.trim()) return direct.trim();

  if (typeof window === 'undefined') return '';

  const playBase = (env.VITE_WORKADVENTURE_PLAY_URL || 'https://play.workadventu.re').replace(/\/$/, '');
  const mapOrigin = (env.VITE_LEADSPAY_OFFICE_MAP_ORIGIN || window.location.origin).replace(/\/$/, '');
  const map = new URL('/office-world/' + scene + '.tmj', mapOrigin);
  const instance = (env.VITE_WORKADVENTURE_INSTANCE || 'leadspay-office').replace(/[^a-zA-Z0-9_-]/g, '-');

  return playBase + '/_/' + instance + '/' + map.host + map.pathname;
}

export const LeadspayOfficeView: React.FC<LeadspayOfficeViewProps> = ({
  standalone = false,
  initialScene = 'city',
  embeddedPanel = null,
  onExit,
}) => {
  const { currentUser, userProfile } = useAuth();
  const worldShellRef = useRef<HTMLDivElement | null>(null);
  const [activeTool, setActiveTool] = useState<OfficeTool>(embeddedPanel || 'world');
  const [scene, setScene] = useState<WorldScene>(initialScene);
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);
  const [data, setData] = useState<OfficeShellData>(EMPTY_DATA);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const activeSceneUrl = useMemo(() => resolveMapUrl(scene), [scene, frameKey]);
  const isEmbedded = Boolean(embeddedPanel);

  const authHeaders = async () => {
    if (!currentUser) throw new Error('Sessão do LeadsPay Office não encontrada.');
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + await currentUser.getIdToken(),
    };
  };

  const loadOfficeData = async (full = false) => {
    if (!currentUser) return;
    setDataLoading(true);
    setError('');
    try {
      const response = await fetch(full ? '/api/office/workers' : '/api/office/workers?officeShell=1', {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os dados do Office.');
      setData({
        workers: Array.isArray(payload.workers) ? payload.workers : [],
        tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
        humanTasks: Array.isArray(payload.humanTasks) ? payload.humanTasks : [],
        officeMembers: Array.isArray(payload.officeMembers) ? payload.officeMembers : [],
        teamMessages: Array.isArray(payload.teamMessages) ? payload.teamMessages : [],
        access: payload.access || null,
        engine: payload.executionEngine || null,
      });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os dados do Office.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    void loadOfficeData(isEmbedded || activeTool !== 'world');
  }, [currentUser?.uid, activeTool, isEmbedded]);

  const sendTeamMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = teamInput.trim();
    if (!message || sendingMessage) return;
    setSendingMessage(true);
    setError('');
    try {
      const response = await fetch('/api/office/workers', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'team-message', message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar a mensagem.');
      if (payload.message) {
        setData((current) => ({
          ...current,
          teamMessages: [...current.teamMessages, payload.message],
        }));
      } else {
        await loadOfficeData(true);
      }
      setTeamInput('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const requestFullscreen = async () => {
    const node = worldShellRef.current;
    if (!node || !document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch {
      // Fullscreen is optional; browser policy can deny it.
    }
  };

  const renderTasks = () => {
    const combined = [
      ...data.tasks.map((task) => ({ ...task, kind: 'IA' })),
      ...data.humanTasks.map((task) => ({ ...task, kind: 'Equipe' })),
    ];
    return (
      <div className="lp-office-panel">
        <div className="lp-office-panel-heading">
          <div><strong>Tarefas do Office</strong><span>IA e equipe humana no mesmo lugar.</span></div>
          <button type="button" onClick={() => void loadOfficeData(true)}><RefreshCw className="h-4 w-4" />Atualizar</button>
        </div>
        {combined.length === 0 ? (
          <div className="lp-office-empty"><ClipboardList /><strong>Nenhuma tarefa encontrada</strong><span>As próximas tarefas do Office aparecem aqui.</span></div>
        ) : (
          <div className="lp-office-task-list">
            {combined.map((task) => (
              <article key={task.kind + '-' + task.id} className="lp-office-task-card">
                <div>
                  <span className="lp-office-kicker">{task.kind}</span>
                  <strong>{task.title}</strong>
                  {task.description && <p>{task.description}</p>}
                </div>
                <div className="lp-office-task-meta">
                  <span>{statusLabel(task.status)}</span>
                  {'progress' in task && typeof task.progress === 'number' && <b>{Math.round(task.progress)}%</b>}
                  <small>{safeDate(task.updatedAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => (
    <div className="lp-office-panel lp-office-chat-panel">
      <div className="lp-office-panel-heading">
        <div><strong>Chat da equipe</strong><span>Canal interno do LeadsPay Office.</span></div>
        <button type="button" onClick={() => void loadOfficeData(true)}><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>
      <div className="lp-office-chat-list">
        {data.teamMessages.length === 0 ? (
          <div className="lp-office-empty compact"><MessageCircle /><strong>O canal está vazio</strong></div>
        ) : data.teamMessages.map((message) => (
          <article key={message.id} className="lp-office-message">
            <div><strong>{message.userName || 'Equipe'}</strong><small>{safeDate(message.createdAt)}</small></div>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="lp-office-chat-form" onSubmit={sendTeamMessage}>
        <input value={teamInput} onChange={(event) => setTeamInput(event.target.value)} placeholder="Escreva para a equipe..." />
        <button type="submit" disabled={!teamInput.trim() || sendingMessage}>
          {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );

  const renderTeam = () => (
    <div className="lp-office-panel">
      <div className="lp-office-panel-heading">
        <div><strong>Equipe do Office</strong><span>Pessoas com acesso ao ambiente.</span></div>
        <button type="button" onClick={() => void loadOfficeData(true)}><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>
      <div className="lp-office-grid">
        {data.officeMembers.map((member) => (
          <article key={member.userId} className="lp-office-person-card">
            <div className="lp-office-avatar">{(member.displayName || '?').slice(0, 1).toUpperCase()}</div>
            <div><strong>{member.displayName}</strong><span>{member.title || member.officeRole || 'Equipe'}</span></div>
            <i className={member.active === false ? 'offline' : 'online'} />
          </article>
        ))}
        {data.officeMembers.length === 0 && <div className="lp-office-empty"><Users /><strong>Nenhum membro carregado</strong></div>}
      </div>
    </div>
  );

  const renderAi = () => (
    <div className="lp-office-panel">
      <div className="lp-office-panel-heading">
        <div><strong>Funcionários IA</strong><span>O cérebro continua no LeadsPay; o WorkAdventure vira o mundo visual.</span></div>
        <button type="button" onClick={() => void loadOfficeData(true)}><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>
      <div className="lp-office-grid">
        {data.workers.map((worker) => (
          <article key={worker.id} className="lp-office-ai-card">
            <div className="lp-office-ai-icon"><Bot /></div>
            <div>
              <strong>{worker.name}</strong>
              <span>{worker.role}</span>
              <p>{worker.brain?.currentIntent || worker.brain?.focus || worker.specialty || 'Disponível para uma nova tarefa.'}</p>
            </div>
          </article>
        ))}
        {data.workers.length === 0 && <div className="lp-office-empty"><Bot /><strong>Nenhum funcionário IA carregado</strong></div>}
      </div>
    </div>
  );

  const renderComputer = () => (
    <div className="lp-office-panel">
      <div className="lp-office-panel-heading">
        <div><strong>Computador do Office</strong><span>Central interna sem sair da aba LeadsPay Office.</span></div>
      </div>
      <div className="lp-office-app-grid">
        <button type="button" onClick={() => setActiveTool('tasks')}><ClipboardList /><strong>Tarefas</strong><span>Acompanhar execução da equipe e das IAs.</span></button>
        <button type="button" onClick={() => setActiveTool('chat')}><MessageCircle /><strong>Chat</strong><span>Conversar com a equipe do Office.</span></button>
        <button type="button" onClick={() => setActiveTool('team')}><Users /><strong>Equipe</strong><span>Ver quem faz parte do escritório.</span></button>
        <button type="button" onClick={() => setActiveTool('ai')}><Bot /><strong>Funcionários IA</strong><span>Status dos agentes e tarefas atuais.</span></button>
      </div>
      <div className="lp-office-computer-note">
        <Cpu className="h-5 w-5" />
        <div><strong>Integração com objetos do mapa</strong><span>Os computadores do mapa podem abrir estes mesmos painéis como co-websites do WorkAdventure.</span></div>
      </div>
    </div>
  );

  const renderDecorator = () => (
    <div className="lp-office-panel">
      <div className="lp-office-panel-heading">
        <div><strong>Decorador</strong><span>Os móveis passam a ser administrados pelo editor do WorkAdventure.</span></div>
      </div>
      <div className="lp-office-decorator">
        <Palette />
        <strong>Editor nativo de objetos</strong>
        <p>No mundo, use o editor do WorkAdventure para enviar PNG/WebP, posicionar o móvel, definir profundidade e colisão. Assim não precisamos manter um editor de móveis separado em React.</p>
        <button type="button" onClick={() => setActiveTool('world')}><Gamepad2 className="h-4 w-4" />Voltar para o mundo</button>
      </div>
    </div>
  );

  const renderActivePanel = () => {
    if (dataLoading && activeTool !== 'world') {
      return <div className="lp-office-loading-panel"><Loader2 className="animate-spin" /><span>Carregando Office...</span></div>;
    }
    if (activeTool === 'tasks') return renderTasks();
    if (activeTool === 'chat') return renderChat();
    if (activeTool === 'computer') return renderComputer();
    if (activeTool === 'team') return renderTeam();
    if (activeTool === 'ai') return renderAi();
    if (activeTool === 'decorator') return renderDecorator();
    return null;
  };

  if (isEmbedded) {
    return (
      <div className="lp-office-embedded">
        {error && <div className="lp-office-error"><XCircle />{error}</div>}
        {renderActivePanel()}
      </div>
    );
  }

  return (
    <section className={'lp-office-app' + (standalone ? ' is-standalone' : '')}>
      <header className="lp-office-header">
        <div className="lp-office-brand">
          <span className="lp-office-logo"><Building2 /></span>
          <div>
            <strong>LeadsPay Office</strong>
            <small>{userProfile?.name || currentUser?.displayName || 'Equipe LeadsPay'} · WorkAdventure</small>
          </div>
          <span className="lp-office-status"><i /> novo mundo</span>
        </div>

        <nav className="lp-office-nav">
          {TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={activeTool === item.id ? 'active' : ''} onClick={() => setActiveTool(item.id)}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="lp-office-header-actions">
          <button type="button" title="Atualizar mundo" onClick={() => { setFrameLoading(true); setFrameKey((value) => value + 1); }}><RefreshCw className="h-4 w-4" /></button>
          <button type="button" title="Tela cheia" onClick={() => void requestFullscreen()}><Expand className="h-4 w-4" /></button>
          {onExit && <button type="button" className="exit" onClick={onExit}>Sair</button>}
        </div>
      </header>

      {error && <div className="lp-office-error"><XCircle />{error}</div>}

      <div className="lp-office-content" ref={worldShellRef}>
        {activeTool === 'world' ? (
          <div className="lp-office-world">
            <div className="lp-office-world-toolbar">
              <div className="lp-office-scene-tabs">
                <button type="button" className={scene === 'city' ? 'active' : ''} onClick={() => { setScene('city'); setFrameLoading(true); }}>
                  <Map className="h-4 w-4" />Cidade
                </button>
                <button type="button" className={scene === 'office' ? 'active' : ''} onClick={() => { setScene('office'); setFrameLoading(true); }}>
                  <Home className="h-4 w-4" />Escritório
                </button>
              </div>
              <div className="lp-office-world-help">
                <span>WASD / setas para andar</span>
                <span>Espaço para interagir</span>
                <span>A porta liga cidade e escritório</span>
              </div>
            </div>

            <div className="lp-office-frame-wrap">
              {frameLoading && (
                <div className="lp-office-frame-loading">
                  <Loader2 className="animate-spin" />
                  <strong>Entrando no mundo...</strong>
                  <span>Carregando WorkAdventure</span>
                </div>
              )}
              {activeSceneUrl ? (
                <iframe
                  key={scene + '-' + frameKey}
                  className="lp-office-frame"
                  src={activeSceneUrl}
                  title={scene === 'city' ? 'Cidade LeadsPay' : 'LeadsPay Office'}
                  allow="camera *; microphone *; fullscreen *; display-capture *; clipboard-read *; clipboard-write *; autoplay *"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => setFrameLoading(false)}
                />
              ) : (
                <div className="lp-office-frame-loading">
                  <XCircle />
                  <strong>WorkAdventure ainda não configurado</strong>
                  <span>Defina as URLs do mundo para ativar o mapa.</span>
                </div>
              )}
            </div>
          </div>
        ) : renderActivePanel()}
      </div>

      <footer className="lp-office-footer">
        <div><Sparkles className="h-3.5 w-3.5" /><span>Engine WorkAdventure · mapas separados · tudo dentro do LeadsPay Office</span></div>
        <div>
          <span>{data.access?.officeRole || 'office'}</span>
          {data.engine?.connected ? <span className="engine-online"><CheckCircle2 className="h-3.5 w-3.5" />IA online</span> : <span>IA supervisionada</span>}
        </div>
      </footer>
    </section>
  );
};

export default LeadspayOfficeView;
