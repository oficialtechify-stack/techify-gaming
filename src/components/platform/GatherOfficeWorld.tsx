import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellOff,
  Camera,
  Check,
  CameraOff,
  ChevronRight,
  ClipboardList,
  LocateFixed,
  Lock,
  MapPinned,
  Maximize2,
  Minimize2,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Pencil,
  Shirt,
  Smile,
  UserRound,
  Users,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Worker = {
  id: string;
  name: string;
  role: string;
  palette: number;
  brain?: {
    mood?: string;
    focus?: string;
    currentIntent?: string;
    lastThought?: string;
  } | null;
};

type OfficeAvatarStyle = 'social' | 'all-black' | 'old-money' | 'wine';

type OfficeAvatarConfig = {
  style: OfficeAvatarStyle;
  skinTone: number;
  hair: number;
  facialHair: number;
  accessory: number;
};

type AvatarCategory =
  | 'skin'
  | 'hair'
  | 'facial'
  | 'top'
  | 'jacket'
  | 'bottom'
  | 'shoes'
  | 'hat'
  | 'glasses'
  | 'other'
  | 'costume';

type OfficeMember = {
  id?: string;
  userId: string;
  displayName: string;
  email?: string;
  officeRole: 'ceo' | 'designer' | 'member';
  title: string;
  palette: number;
  deskId: string;
  avatarConfig?: OfficeAvatarConfig | null;
  position?: { x: number; y: number; direction?: string; updatedAt?: string; mapVersion?: string } | null;
  emote?: { emoji?: string; updatedAt?: string } | null;
};

type TaskStatus =
  | 'queued'
  | 'working'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

type TaskLite = {
  id: string;
  workerId: string;
  title: string;
  status: TaskStatus;
};

type HumanTaskLite = {
  id: string;
  assigneeUid: string;
  title: string;
  status: 'todo' | 'working' | 'review' | 'completed' | 'blocked';
};

type Direction = 'down' | 'up' | 'left' | 'right';
type Cell = { x: number; y: number };

type MotionState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: Direction;
  path: Cell[];
  targetKey: string;
  idleIndex: number;
  nextIdleAt: number;
};

type OfficeArea = {
  id: string;
  name: string;
  kind: 'open' | 'private' | 'social';
  x: number;
  y: number;
  w: number;
  h: number;
  max?: number;
  subtitle: string;
};

type CallParticipant = {
  uid: string;
  displayName: string;
  officeRole?: string;
  palette?: number;
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  updatedAt?: string;
};

type CallSignal = {
  id: string;
  fromUid: string;
  toUid: string;
  signalType: 'offer' | 'answer' | 'candidate';
  payload: any;
  createdAt?: string;
};

type Interaction =
  | { type: 'computer'; label: string; ownerUid?: string }
  | { type: 'meeting'; label: string }
  | { type: 'ai'; label: string; workerId: string }
  | { type: 'human'; label: string; userId: string }
  | { type: 'object'; label: string; objectId: 'coffee' | 'creative-board' | 'lab-terminal' | 'designer-board' }
  | null;

interface GatherOfficeWorldProps {
  workers: Worker[];
  tasks: TaskLite[];
  humanTasks?: HumanTaskLite[];
  officeMembers?: OfficeMember[];
  currentUserId?: string | null;
  selectedWorkerId: string;
  onSelectWorker: (workerId: string) => void;
  onSelectHuman?: (userId: string) => void;
  onPlayerMove?: (position: { x: number; y: number; direction: Direction }) => void;
  onInteract?: (interaction: Exclude<Interaction, null>) => void;
  onOpenTasks?: () => void;
  areaNames?: Record<string, string>;
  canManageAreas?: boolean;
  onRenameArea?: (areaId: string, name: string) => Promise<void> | void;
  onUpdateSelfProfile?: (patch: {
    displayName?: string;
    avatarConfig?: OfficeAvatarConfig;
  }) => Promise<void> | void;
}

const TILE = 32;
const COLS = 72;
const ROWS = 48;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const PLAYER_SPEED = 176;
const AI_SPEED = 42;
const PLAYER_RADIUS_X = 8;
const PLAYER_RADIUS_Y = 5;
const FRAME_MS = 84;
const OFFICE_MAP_VERSION = 'gather-v2';

const CEO_AVATAR_STYLES: Array<{
  id: OfficeAvatarStyle;
  name: string;
  subtitle: string;
  sprite: string;
}> = [
  { id: 'social', name: 'Rick', subtitle: 'Social clássico', sprite: '/pixel-agents/assets/characters/ceo_social.png' },
  { id: 'all-black', name: 'All Black', subtitle: 'Moderno', sprite: '/pixel-agents/assets/characters/ceo_all_black.png' },
  { id: 'old-money', name: 'Old Money', subtitle: 'Sofisticado', sprite: '/pixel-agents/assets/characters/ceo_old_money.png' },
  { id: 'wine', name: 'Vinho / Preto', subtitle: 'Personalidade', sprite: '/pixel-agents/assets/characters/ceo_wine.png' },
];

const DEFAULT_CEO_AVATAR_CONFIG: OfficeAvatarConfig = {
  style: 'all-black',
  skinTone: 0,
  hair: 0,
  facialHair: 0,
  accessory: 0,
};

const CEO_AVATAR_CATEGORIES: Array<{
  id: AvatarCategory;
  label: string;
  kind: 'identity' | 'clothing' | 'accessory';
}> = [
  { id: 'skin', label: 'Tom da pele', kind: 'identity' },
  { id: 'hair', label: 'Cabelo', kind: 'identity' },
  { id: 'facial', label: 'Pelos faciais', kind: 'identity' },
  { id: 'top', label: 'Parte de cima', kind: 'clothing' },
  { id: 'jacket', label: 'Jaqueta', kind: 'clothing' },
  { id: 'bottom', label: 'Parte de baixo', kind: 'clothing' },
  { id: 'shoes', label: 'Sapatos', kind: 'clothing' },
  { id: 'hat', label: 'Chapéu', kind: 'accessory' },
  { id: 'glasses', label: 'Óculos', kind: 'accessory' },
  { id: 'other', label: 'Outro', kind: 'accessory' },
  { id: 'costume', label: 'Fantasia', kind: 'clothing' },
];

function avatarCategoryMeta(category: AvatarCategory) {
  return CEO_AVATAR_CATEGORIES.find((item) => item.id === category) || CEO_AVATAR_CATEGORIES[3];
}

function isClothingCategory(category: AvatarCategory) {
  return avatarCategoryMeta(category).kind === 'clothing';
}

function avatarStyleOf(member?: OfficeMember | null): OfficeAvatarStyle {
  const value = member?.avatarConfig?.style;
  return CEO_AVATAR_STYLES.some((style) => style.id === value) ? value as OfficeAvatarStyle : 'all-black';
}

function spriteForMember(member: OfficeMember) {
  if (member.officeRole === 'ceo') {
    return CEO_AVATAR_STYLES.find((style) => style.id === avatarStyleOf(member))?.sprite || CEO_AVATAR_STYLES[1].sprite;
  }
  return '/pixel-agents/assets/characters/char_' + member.palette + '.png';
}

const AREAS: OfficeArea[] = [
  { id: 'operations', name: 'Operação', kind: 'open', x: 3, y: 3, w: 29, h: 19, subtitle: 'Mesas dos funcionários IA e operação diária' },
  { id: 'team-pods', name: 'Team', kind: 'open', x: 33, y: 3, w: 18, h: 19, subtitle: 'Área da equipe' },
  { id: 'meeting', name: 'Sala de Reunião', kind: 'private', x: 53, y: 3, w: 16, h: 12, max: 8, subtitle: 'Reuniões privadas e alinhamentos' },
  { id: 'lab', name: 'Laboratório', kind: 'private', x: 53, y: 16, w: 16, h: 6, max: 4, subtitle: 'Backend, testes e investigações técnicas' },
  { id: 'ceo', name: 'Sala do CEO', kind: 'private', x: 3, y: 25, w: 18, h: 20, max: 4, subtitle: 'Planejamento, aprovações e decisões' },
  { id: 'lobby', name: 'Lobby', kind: 'social', x: 22, y: 25, w: 24, h: 20, subtitle: 'Ponto central para encontros rápidos' },
  { id: 'designer', name: 'Sala da Designer', kind: 'private', x: 47, y: 25, w: 22, h: 20, max: 4, subtitle: 'Design, referências e produção visual' },
];

const AREA_ENTRY_TARGET: Record<string, Cell> = {
  operations: { x: 27, y: 11 },
  'team-pods': { x: 49, y: 11 },
  meeting: { x: 55, y: 12 },
  lab: { x: 55, y: 19 },
  ceo: { x: 12, y: 27 },
  lobby: { x: 34, y: 27 },
  designer: { x: 50, y: 27 },
};

const HOME_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 7, y: 9 },
  frontend: { x: 13, y: 9 },
  backend: { x: 19, y: 9 },
  designer: { x: 7, y: 17 },
  qa: { x: 13, y: 17 },
  growth: { x: 19, y: 17 },
};

const MEETING_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 55, y: 12 },
  frontend: { x: 57, y: 12 },
  backend: { x: 59, y: 12 },
  designer: { x: 62, y: 12 },
  qa: { x: 64, y: 12 },
  growth: { x: 66, y: 12 },
};

const QUEUE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 26, y: 20 },
  frontend: { x: 28, y: 20 },
  backend: { x: 30, y: 20 },
  designer: { x: 32, y: 20 },
  qa: { x: 40, y: 20 },
  growth: { x: 42, y: 20 },
};

const PAUSE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 39, y: 18 },
  frontend: { x: 40, y: 18 },
  backend: { x: 41, y: 18 },
  designer: { x: 39, y: 20 },
  qa: { x: 40, y: 20 },
  growth: { x: 41, y: 20 },
};

const IDLE_TARGETS: Record<string, Cell[]> = {
  'lumy-manager': [{ x: 37, y: 34 }, { x: 38, y: 39 }, { x: 38, y: 18 }],
  frontend: [{ x: 38, y: 10 }, { x: 42, y: 18 }, { x: 35, y: 38 }],
  backend: [{ x: 61, y: 19 }, { x: 41, y: 18 }, { x: 35, y: 34 }],
  designer: [{ x: 56, y: 36 }, { x: 65, y: 39 }, { x: 39, y: 34 }],
  qa: [{ x: 61, y: 20 }, { x: 43, y: 10 }, { x: 33, y: 37 }],
  growth: [{ x: 41, y: 32 }, { x: 48, y: 16 }, { x: 38, y: 41 }],
};

const AI_DESKS = [
  { workerId: 'lumy-manager', col: 5, row: 6 },
  { workerId: 'frontend', col: 11, row: 6 },
  { workerId: 'backend', col: 17, row: 6 },
  { workerId: 'designer', col: 5, row: 14 },
  { workerId: 'qa', col: 11, row: 14 },
  { workerId: 'growth', col: 17, row: 14 },
];

const SOLID_RECTS: Array<[number, number, number, number]> = [
  // AI desks + wall furniture
  [5, 5, 5, 4], [11, 5, 5, 4], [17, 5, 5, 4],
  [5, 13, 5, 4], [11, 13, 5, 4], [17, 13, 5, 4],
  [3, 3, 4, 3], [26, 3, 4, 3], [3, 18, 2, 3], [28, 18, 3, 3],
  // Team area: 6 clean desks aligned to the 32px grid + lounge
  [34, 6, 5, 4], [40, 6, 5, 4], [46, 6, 5, 4],
  [34, 14, 5, 4], [40, 14, 5, 4], [46, 14, 5, 4],
  [34, 18, 4, 3], [43, 18, 4, 3],
  // Meeting table + chairs
  [57, 6, 8, 4], [55, 6, 2, 4], [65, 6, 2, 4], [58, 10, 2, 2], [62, 10, 2, 2],
  [53, 3, 2, 3], [67, 3, 2, 3],
  // Lab
  [56, 18, 4, 3], [63, 18, 3, 3],
  // CEO
  [7, 31, 7, 4], [5, 27, 3, 2], [16, 27, 2, 2], [4, 38, 5, 3], [9, 39, 4, 3], [15, 39, 3, 3],
  // Lobby
  [24, 31, 5, 3], [29, 31, 5, 4], [36, 31, 4, 3], [28, 39, 4, 3],
  // Designer
  [53, 31, 7, 4], [50, 28, 4, 2], [63, 28, 3, 2], [59, 39, 5, 3],
];

const WALL_RECTS: Array<[number, number, number, number]> = [
  // Building exterior
  [2, 2, 68, 1], [2, 45, 68, 1], [2, 2, 1, 44], [69, 2, 1, 44],
  // Right meeting/lab wing
  [52, 2, 1, 7], [52, 12, 1, 6], [52, 20, 1, 2],
  [52, 15, 18, 1],
  // Bottom wing split from open office, doors at 10-12, 33-36, 57-60
  [2, 23, 8, 1], [13, 23, 20, 1], [37, 23, 20, 1], [61, 23, 9, 1],
  // Bottom rooms vertical dividers with doorway gaps
  [21, 24, 1, 8], [21, 35, 1, 11],
  [46, 24, 1, 8], [46, 35, 1, 11],
];

const INTERACTIONS = [
  { type: 'computer' as const, owner: 'ceo', cell: { x: 10, y: 35 }, label: 'Abrir computador do CEO' },
  { type: 'computer' as const, owner: 'designer-human', cell: { x: 56, y: 35 }, label: 'Abrir computador da designer' },
  { type: 'meeting' as const, owner: 'meeting', cell: { x: 61, y: 12 }, label: 'Abrir sala de reunião' },
  { type: 'object' as const, objectId: 'coffee' as const, cell: { x: 40, y: 18 }, label: 'Pegar um café' },
  { type: 'object' as const, objectId: 'creative-board' as const, cell: { x: 52, y: 28 }, label: 'Abrir quadro criativo' },
  { type: 'object' as const, objectId: 'lab-terminal' as const, cell: { x: 58, y: 20 }, label: 'Usar terminal do laboratório' },
  { type: 'object' as const, objectId: 'designer-board' as const, cell: { x: 64, y: 28 }, label: 'Abrir moodboard da designer' },
];

function inRect(cell: Cell, x: number, y: number, w: number, h: number) {
  return cell.x >= x && cell.x < x + w && cell.y >= y && cell.y < y + h;
}

function cellKey(cell: Cell) {
  return cell.x + ':' + cell.y;
}

function centerOf(cell: Cell) {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2 };
}

function cellAtPixel(x: number, y: number): Cell {
  return {
    x: Math.max(0, Math.min(COLS - 1, Math.floor(x / TILE))),
    y: Math.max(0, Math.min(ROWS - 1, Math.floor(y / TILE))),
  };
}

function areaForCell(cell: Cell) {
  return AREAS.find((area) => inRect(cell, area.x, area.y, area.w, area.h)) || null;
}

function isWalkable(cell: Cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= COLS || cell.y >= ROWS) return false;
  if (!inRect(cell, 2, 2, 68, 44)) return false;
  if (WALL_RECTS.some(([x, y, w, h]) => inRect(cell, x, y, w, h))) return false;
  if (SOLID_RECTS.some(([x, y, w, h]) => inRect(cell, x, y, w, h))) return false;
  return true;
}

function canOccupy(x: number, y: number) {
  const samples = [
    [0, 0],
    [-PLAYER_RADIUS_X, 0],
    [PLAYER_RADIUS_X, 0],
    [0, PLAYER_RADIUS_Y],
    [0, -PLAYER_RADIUS_Y],
  ];
  return samples.every(([ox, oy]) => isWalkable(cellAtPixel(x + ox, y + oy)));
}

function nearestWalkableCell(x: number, y: number): Cell {
  const base = cellAtPixel(x, y);
  if (isWalkable(base)) return base;
  for (let radius = 1; radius < 14; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const candidate = { x: base.x + dx, y: base.y + dy };
        if (isWalkable(candidate)) return candidate;
      }
    }
  }
  return { x: 35, y: 34 };
}

function neighbors(cell: Cell) {
  return [
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x - 1, y: cell.y },
  ].filter(isWalkable);
}

function heuristic(a: Cell, b: Cell) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start: Cell, goal: Cell) {
  const safeGoalPoint = centerOf(goal);
  const safeGoal = isWalkable(goal) ? goal : nearestWalkableCell(safeGoalPoint.x, safeGoalPoint.y);
  const startKey = cellKey(start);
  const goalKey = cellKey(safeGoal);
  if (startKey === goalKey) return [];

  const queue: Cell[] = [start];
  let cursor = 0;
  const visited = new Set<string>([startKey]);
  const came = new Map<string, string>();
  const cells = new Map<string, Cell>([[startKey, start]]);

  while (cursor < queue.length) {
    const current = queue[cursor++];
    const currentKey = cellKey(current);

    for (const next of neighbors(current)) {
      const key = cellKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      came.set(key, currentKey);
      cells.set(key, next);

      if (key === goalKey) {
        const path: Cell[] = [next];
        let walk = key;
        while (came.has(walk)) {
          walk = came.get(walk) as string;
          const previous = cells.get(walk);
          if (previous) path.unshift(previous);
        }
        return path.slice(1);
      }

      queue.push(next);
    }
  }

  return [];
}

function clearLine(from: { x: number; y: number }, to: { x: number; y: number }) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (!canOccupy(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return false;
  }
  return true;
}

function smoothPath(from: { x: number; y: number }, path: Cell[]) {
  if (path.length < 3) return path;
  const result: Cell[] = [];
  let origin = from;
  let index = 0;
  while (index < path.length) {
    let best = index;
    for (let candidate = path.length - 1; candidate >= index; candidate -= 1) {
      if (clearLine(origin, centerOf(path[candidate]))) {
        best = candidate;
        break;
      }
    }
    result.push(path[best]);
    origin = centerOf(path[best]);
    index = best + 1;
  }
  return result;
}

function buildRoute(x: number, y: number, target: Cell) {
  return smoothPath({ x, y }, findPath(nearestWalkableCell(x, y), target));
}

function directionFor(dx: number, dy: number, fallback: Direction): Direction {
  if (Math.abs(dx) < .05 && Math.abs(dy) < .05) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function approach(current: number, target: number, maxDelta: number) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

function currentTask(tasks: TaskLite[], workerId: string) {
  return tasks.find((task) => task.workerId === workerId && ['queued', 'working', 'waiting_approval', 'paused'].includes(task.status)) || null;
}

function workerState(tasks: TaskLite[], workerId: string): TaskStatus | 'idle' {
  return currentTask(tasks, workerId)?.status || 'idle';
}

function activeHumanTask(tasks: HumanTaskLite[], userId: string) {
  return tasks.find((task) => task.assigneeUid === userId && task.status === 'working') ||
    tasks.find((task) => task.assigneeUid === userId && task.status === 'todo') ||
    tasks.find((task) => task.assigneeUid === userId && task.status === 'review') ||
    tasks.find((task) => task.assigneeUid === userId && task.status === 'blocked') ||
    null;
}

function defaultHumanPosition(member: OfficeMember) {
  if (member.officeRole === 'ceo') return centerOf({ x: 10, y: 37 });
  if (member.officeRole === 'designer') return centerOf({ x: 57, y: 37 });
  return centerOf({ x: 38, y: 36 });
}

function memberDirection(value?: string): Direction {
  return value === 'up' || value === 'left' || value === 'right' ? value : 'down';
}

function hasCurrentMapPosition(member: OfficeMember) {
  return Boolean(
    member.position &&
    member.position.mapVersion === OFFICE_MAP_VERSION &&
    Number.isFinite(member.position.x) &&
    Number.isFinite(member.position.y),
  );
}

function resolvedMemberPosition(member: OfficeMember) {
  if (hasCurrentMapPosition(member) && member.position) {
    return {
      x: member.position.x,
      y: member.position.y,
      direction: memberDirection(member.position.direction),
    };
  }
  return {
    ...defaultHumanPosition(member),
    direction: 'down' as Direction,
  };
}

function spriteFrame(direction: Direction) {
  const row = direction === 'up' ? 1 : direction === 'left' || direction === 'right' ? 2 : 0;
  return { row, flip: direction === 'left' };
}

function desiredWorkerTarget(workerId: string, state: TaskStatus | 'idle', motion: MotionState, now: number) {
  if (state === 'working') return { key: 'desk', cell: HOME_TARGET[workerId] || { x: 8, y: 10 }, idleIndex: motion.idleIndex, nextIdleAt: now + 7000 };
  if (state === 'waiting_approval') return { key: 'meeting', cell: MEETING_TARGET[workerId] || { x: 60, y: 10 }, idleIndex: motion.idleIndex, nextIdleAt: now + 7000 };
  if (state === 'queued') return { key: 'queue', cell: QUEUE_TARGET[workerId] || { x: 30, y: 20 }, idleIndex: motion.idleIndex, nextIdleAt: now + 6000 };
  if (state === 'paused') return { key: 'lounge', cell: PAUSE_TARGET[workerId] || { x: 39, y: 19 }, idleIndex: motion.idleIndex, nextIdleAt: now + 8000 };

  const home = HOME_TARGET[workerId] || { x: 8, y: 10 };
  const list = IDLE_TARGETS[workerId] || [{ x: 37, y: 34 }];
  const cell = cellAtPixel(motion.x, motion.y);
  const isBreak = motion.targetKey.startsWith('break:');

  if (!isBreak) {
    if (now < motion.nextIdleAt) {
      return { key: 'home', cell: home, idleIndex: motion.idleIndex, nextIdleAt: motion.nextIdleAt };
    }
    const idleIndex = (motion.idleIndex + 1) % list.length;
    return {
      key: 'break:' + idleIndex,
      cell: list[idleIndex],
      idleIndex,
      nextIdleAt: now + 18000 + idleIndex * 2500,
    };
  }

  const destination = list[motion.idleIndex % list.length];
  const reachedBreak = cell.x === destination.x && cell.y === destination.y && motion.path.length === 0;
  if (reachedBreak && now >= motion.nextIdleAt) {
    return {
      key: 'home',
      cell: home,
      idleIndex: motion.idleIndex,
      nextIdleAt: now + 78000 + motion.idleIndex * 9000,
    };
  }

  return {
    key: 'break:' + motion.idleIndex,
    cell: destination,
    idleIndex: motion.idleIndex,
    nextIdleAt: motion.nextIdleAt,
  };
}

function humanTaskText(task: HumanTaskLite | null) {
  if (!task) return null;
  if (task.status === 'working') return 'trabalhando';
  if (task.status === 'todo') return 'nova demanda';
  if (task.status === 'review') return 'em revisão';
  if (task.status === 'blocked') return 'bloqueada';
  return null;
}

function areaContains(area: OfficeArea, x: number, y: number) {
  return inRect(cellAtPixel(x, y), area.x, area.y, area.w, area.h);
}

function distanceTiles(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by) / TILE;
}

const RemoteVideoTile: React.FC<{ stream: MediaStream; label: string; volume?: number }> = ({ stream, label, volume = 1 }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.volume = Math.max(0, Math.min(1, volume));
  }, [stream, volume]);
  return (
    <div className="gather-remote-video">
      <video ref={ref} autoPlay playsInline />
      <span>{label}</span>
    </div>
  );
};

function spatialVolume(distance: number, quiet: boolean) {
  const radius = quiet ? 1.25 : 5.25;
  if (distance > radius) return 0;
  if (distance <= 2) return 1;
  return Math.max(.08, Math.min(1, 1 - (distance - 2) / Math.max(.25, radius - 2)));
}

export const GatherOfficeWorld: React.FC<GatherOfficeWorldProps> = ({
  workers,
  tasks,
  humanTasks = [],
  officeMembers = [],
  currentUserId,
  selectedWorkerId,
  onSelectWorker,
  onSelectHuman,
  onPlayerMove,
  onInteract,
  onOpenTasks,
  areaNames = {},
  canManageAreas = false,
  onRenameArea,
  onUpdateSelfProfile,
}) => {
  const { currentUser } = useAuth();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<MotionState | null>(null);
  const keyboardQueueRef = useRef<Cell | null>(null);
  const lastKeyboardStepRef = useRef(0);
  const pathRef = useRef<Cell[]>([]);
  const workersMotionRef = useRef<Record<string, MotionState>>({});
  const tasksRef = useRef(tasks);
  const workersRef = useRef(workers);
  const presenceRef = useRef(0);
  const localPositionSaveRef = useRef(0);
  const renderRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const [player, setPlayer] = useState<MotionState | null>(null);
  const [workersMotion, setWorkersMotion] = useState<Record<string, MotionState>>({});
  const [zoom, setZoom] = useState(.72);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const cameraRef = useRef(camera);
  const [followPlayer, setFollowPlayer] = useState(true);
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [selectedHumanId, setSelectedHumanId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areaEditing, setAreaEditing] = useState(false);
  const [areaNameDraft, setAreaNameDraft] = useState('');
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [lockedAreas, setLockedAreas] = useState<Record<string, boolean>>({});
  const [callNotice, setCallNotice] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [walkTarget, setWalkTarget] = useState<Cell | null>(null);
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [localEmote, setLocalEmote] = useState<{ emoji: string; updatedAt: number } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRefs = useRef(new Map<string, RTCPeerConnection>());
  const processedSignalIds = useRef(new Set<string>());
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);
  const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [callConnecting, setCallConnecting] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [avatarStyleDraft, setAvatarStyleDraft] = useState<OfficeAvatarStyle>('all-black');
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('top');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const fallbackCurrentMember = useMemo<OfficeMember | null>(() => {
    if (!currentUserId) return null;
    const displayName =
      currentUser?.displayName?.trim() ||
      currentUser?.email?.split('@')[0]?.trim() ||
      'Você';

    return {
      userId: currentUserId,
      displayName,
      email: currentUser?.email || '',
      officeRole: 'ceo',
      title: 'CEO',
      palette: 0,
      deskId: 'ceo-local',
      avatarConfig: DEFAULT_CEO_AVATAR_CONFIG,
      position: null,
    };
  }, [currentUserId, currentUser?.displayName, currentUser?.email]);

  // O jogador local nunca depende do Firestore para existir.
  // Mesmo com quota esgotada, o CEO continua visível e controlável.
  const currentMember =
    officeMembers.find((member) => member.userId === currentUserId) ||
    fallbackCurrentMember;

  const profileTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Recife',
    [],
  );

  const openSelfProfile = () => {
    if (!currentMember) return;
    setSelectedAreaId(null);
    setSelectedHumanId(currentMember.userId);
    setProfileError('');
  };

  const openProfileEditor = () => {
    if (!currentMember) return;
    setProfileNameDraft(currentMember.displayName || '');
    setAvatarStyleDraft(avatarStyleOf(currentMember));
    setProfileError('');
    setProfileEditorOpen(true);
  };

  const openAvatarEditor = () => {
    if (!currentMember) return;
    setAvatarStyleDraft(avatarStyleOf(currentMember));
    setAvatarCategory('top');
    setProfileError('');
    setAvatarEditorOpen(true);
  };

  const saveSelfProfile = async () => {
    if (!currentMember || !onUpdateSelfProfile || profileSaving) return;
    const displayName = profileNameDraft.trim();
    if (displayName.length < 2) {
      setProfileError('Digite um nome com pelo menos 2 caracteres.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await onUpdateSelfProfile({
        displayName,
        avatarConfig: currentMember.avatarConfig || DEFAULT_CEO_AVATAR_CONFIG,
      });
      setProfileEditorOpen(false);
    } catch (error: any) {
      setProfileError(error?.message || 'Não foi possível salvar seu perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveAvatarStyle = async () => {
    if (!currentMember || !onUpdateSelfProfile || profileSaving) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      await onUpdateSelfProfile({
        avatarConfig: {
          ...(currentMember.avatarConfig || DEFAULT_CEO_AVATAR_CONFIG),
          style: avatarStyleDraft,
        },
      });
      setAvatarEditorOpen(false);
    } catch (error: any) {
      setProfileError(error?.message || 'Não foi possível salvar seu avatar.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!profileEditorOpen && !avatarEditorOpen) return;
    const closeEditor = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (avatarEditorOpen) setAvatarEditorOpen(false);
      else setProfileEditorOpen(false);
    };
    window.addEventListener('keydown', closeEditor);
    return () => window.removeEventListener('keydown', closeEditor);
  }, [profileEditorOpen, avatarEditorOpen]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { workersRef.current = workers; }, [workers]);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  useEffect(() => {
    if (!currentMember) {
      playerRef.current = null;
      setPlayer(null);
      return;
    }

    let raw = resolvedMemberPosition(currentMember);

    // A posição do CEO é local-first: ele é um jogador manual, não um agente IA.
    // O servidor recebe presença só para os outros usuários enxergarem onde ele está.
    try {
      const saved = window.localStorage.getItem('leadspay-office-player:' + currentMember.userId);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          x?: number;
          y?: number;
          direction?: Direction;
          mapVersion?: string;
        };
        if (
          parsed.mapVersion === OFFICE_MAP_VERSION &&
          Number.isFinite(parsed.x) &&
          Number.isFinite(parsed.y) &&
          canOccupy(Number(parsed.x), Number(parsed.y))
        ) {
          raw = {
            x: Number(parsed.x),
            y: Number(parsed.y),
            direction: memberDirection(parsed.direction),
          };
        }
      }
    } catch {}

    const safe = centerOf(nearestWalkableCell(raw.x, raw.y));
    const initial: MotionState = {
      x: safe.x,
      y: safe.y,
      vx: 0,
      vy: 0,
      direction: raw.direction,
      path: [],
      targetKey: 'manual-player',
      idleIndex: 0,
      nextIdleAt: 0,
    };

    playerRef.current = initial;
    pathRef.current = [];
    keyboardQueueRef.current = null;
    setWalkTarget(null);
    setPlayer(initial);
  }, [currentMember?.userId]);

  useEffect(() => {
    const next = { ...workersMotionRef.current };
    for (const [index, worker] of workers.entries()) {
      if (next[worker.id]) continue;
      const home = centerOf(HOME_TARGET[worker.id] || { x: 8, y: 10 });
      next[worker.id] = {
        x: home.x,
        y: home.y,
        vx: 0,
        vy: 0,
        direction: 'down',
        path: [],
        targetKey: '',
        idleIndex: 0,
        nextIdleAt: Date.now() + 52000 + index * 11000,
      };
    }
    workersMotionRef.current = next;
    setWorkersMotion(next);
  }, [workers]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      const movement: Record<string, Cell> = {
        w: { x: 0, y: -1 },
        arrowup: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        arrowdown: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        arrowleft: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
        arrowright: { x: 1, y: 0 },
      };

      const step = movement[key];
      if (step) {
        const current = playerRef.current;
        if (!current) return;

        const now = performance.now();
        if (event.repeat && now - lastKeyboardStepRef.current < 105) {
          event.preventDefault();
          return;
        }
        lastKeyboardStepRef.current = now;

        if (!event.repeat) {
          pathRef.current = [];
          keyboardQueueRef.current = nearestWalkableCell(current.x, current.y);
        }

        const base = keyboardQueueRef.current ||
          pathRef.current[pathRef.current.length - 1] ||
          nearestWalkableCell(current.x, current.y);
        const target = { x: base.x + step.x, y: base.y + step.y };

        if (isWalkable(target)) {
          pathRef.current = [...pathRef.current, target].slice(-5);
          keyboardQueueRef.current = target;
          setWalkTarget(target);
          setFollowPlayer(true);
        }

        event.preventDefault();
        return;
      }

      if (key === 'e' && interaction && onInteract) {
        onInteract(interaction);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [interaction, onInteract]);

  const clampCamera = (next: { x: number; y: number }, currentZoom = zoom) => {
    const viewport = viewportRef.current;
    if (!viewport) return next;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const scaledW = WORLD_W * currentZoom;
    const scaledH = WORLD_H * currentZoom;

    const clampAxis = (value: number, viewportSize: number, scaledSize: number) => {
      if (scaledSize <= viewportSize) return (viewportSize - scaledSize) / 2;
      const min = viewportSize - scaledSize;
      return Math.max(min, Math.min(0, value));
    };

    return {
      x: clampAxis(next.x, width, scaledW),
      y: clampAxis(next.y, height, scaledH),
    };
  };

  const centerCameraOn = (x: number, y: number, currentZoom = zoom) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = clampCamera({
      x: viewport.clientWidth / 2 - x * currentZoom,
      y: viewport.clientHeight / 2 - y * currentZoom,
    }, currentZoom);
    cameraRef.current = next;
    setCamera(next);
  };

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(.035, Math.max(.001, (now - previous) / 1000));
      previous = now;

      const nextWorkers = { ...workersMotionRef.current };
      let workersMoved = false;
      for (const worker of workersRef.current) {
        const current = nextWorkers[worker.id];
        if (!current) continue;
        const state = workerState(tasksRef.current, worker.id);
        const target = desiredWorkerTarget(worker.id, state, current, Date.now());
        let route = current.path;
        const currentCell = nearestWalkableCell(current.x, current.y);
        const targetPoint = centerOf(target.cell);
        const safeTarget = isWalkable(target.cell) ? target.cell : nearestWalkableCell(targetPoint.x, targetPoint.y);

        if (current.targetKey !== target.key || (!route.length && (currentCell.x !== safeTarget.x || currentCell.y !== safeTarget.y))) {
          route = buildRoute(current.x, current.y, safeTarget);
        }

        let x = current.x;
        let y = current.y;
        let direction = current.direction;
        let vx = 0;
        let vy = 0;
        const nextRoute = [...route];

        if (nextRoute.length) {
          const point = centerOf(nextRoute[0]);
          const dx = point.x - x;
          const dy = point.y - y;
          const distance = Math.hypot(dx, dy);
          if (distance < 5) {
            nextRoute.shift();
          } else if (distance > 0) {
            vx = dx / distance * AI_SPEED;
            vy = dy / distance * AI_SPEED;
            const nx = x + vx * dt;
            const ny = y + vy * dt;
            if (canOccupy(nx, y)) x = nx;
            if (canOccupy(x, ny)) y = ny;
            direction = directionFor(vx, vy, direction);
          }
        }

        if (
          Math.abs(x - current.x) > .2 ||
          Math.abs(y - current.y) > .2 ||
          direction !== current.direction ||
          nextRoute.length !== current.path.length ||
          target.key !== current.targetKey
        ) {
          workersMoved = true;
        }

        nextWorkers[worker.id] = {
          x, y, vx, vy, direction,
          path: nextRoute,
          targetKey: target.key,
          idleIndex: target.idleIndex,
          nextIdleAt: target.nextIdleAt,
        };
      }
      workersMotionRef.current = nextWorkers;

      const currentPlayer = playerRef.current;
      if (currentPlayer) {
        let x = currentPlayer.x;
        let y = currentPlayer.y;
        let vx = 0;
        let vy = 0;
        let direction = currentPlayer.direction;
        const route = [...pathRef.current];

        if (route.length) {
          const point = centerOf(route[0]);
          const dx = point.x - x;
          const dy = point.y - y;
          const distance = Math.hypot(dx, dy);

          if (distance <= 2.4) {
            x = point.x;
            y = point.y;
            route.shift();
            pathRef.current = route;
            if (!route.length) {
              keyboardQueueRef.current = null;
              setWalkTarget(null);
              try {
                window.localStorage.setItem(
                  'leadspay-office-player:' + currentMember.userId,
                  JSON.stringify({ x, y, direction, mapVersion: OFFICE_MAP_VERSION }),
                );
              } catch {}
            }
          } else {
            const stepDistance = Math.min(distance, PLAYER_SPEED * dt);
            const ux = dx / distance;
            const uy = dy / distance;
            const nx = x + ux * stepDistance;
            const ny = y + uy * stepDistance;

            if (canOccupy(nx, ny)) {
              x = nx;
              y = ny;
              vx = ux * PLAYER_SPEED;
              vy = uy * PLAYER_SPEED;
              direction = directionFor(dx, dy, direction);
            } else {
              const safe = centerOf(nearestWalkableCell(x, y));
              x = safe.x;
              y = safe.y;
              pathRef.current = [];
              route.splice(0);
              keyboardQueueRef.current = null;
              setWalkTarget(null);
            }
          }
        }

        const nextPlayer: MotionState = {
          ...currentPlayer,
          x, y, vx, vy, direction,
          path: route,
        };
        playerRef.current = nextPlayer;

        const playerCell = cellAtPixel(x, y);
        let nearest: Interaction = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const item of INTERACTIONS) {
          const distance = heuristic(playerCell, item.cell);
          if (distance > 2.3 || distance >= nearestDistance) continue;
          if (item.type === 'computer') {
            const ownerUid = item.owner === 'ceo'
              ? officeMembers.find((member) => member.officeRole === 'ceo')?.userId
              : officeMembers.find((member) => member.officeRole === 'designer')?.userId;
            nearest = { type: 'computer', label: item.label, ownerUid };
          } else if (item.type === 'meeting') {
            nearest = { type: 'meeting', label: item.label };
          } else {
            nearest = { type: 'object', label: item.label, objectId: item.objectId };
          }
          nearestDistance = distance;
        }

        for (const worker of workersRef.current) {
          const motion = workersMotionRef.current[worker.id];
          if (!motion) continue;
          const distance = distanceTiles(x, y, motion.x, motion.y);
          if (distance <= 2.2 && distance < nearestDistance) {
            nearest = { type: 'ai', label: 'Conversar com ' + worker.name, workerId: worker.id };
            nearestDistance = distance;
          }
        }

        for (const member of officeMembers) {
          if (member.userId === currentUserId) continue;
          const resolved = resolvedMemberPosition(member);
          const px = resolved.x;
          const py = resolved.y;
          const distance = distanceTiles(x, y, px, py);
          if (distance <= 2.2 && distance < nearestDistance) {
            nearest = { type: 'human', label: 'Falar com ' + member.displayName, userId: member.userId };
            nearestDistance = distance;
          }
        }

        const isManualPlayerMoving = Math.abs(vx) + Math.abs(vy) > 4;

        if (isManualPlayerMoving && now - localPositionSaveRef.current > 700) {
          localPositionSaveRef.current = now;
          try {
            window.localStorage.setItem(
              'leadspay-office-player:' + currentMember.userId,
              JSON.stringify({ x, y, direction, mapVersion: OFFICE_MAP_VERSION }),
            );
          } catch {}
        }

        if (now - presenceRef.current > 1300 && onPlayerMove && isManualPlayerMoving) {
          presenceRef.current = now;
          onPlayerMove({ x, y, direction });
        }

        if (now - renderRef.current >= FRAME_MS) {
          renderRef.current = now;

          if (followPlayer) {
            const viewport = viewportRef.current;
            if (viewport) {
              const nextCamera = clampCamera({
                x: viewport.clientWidth / 2 - x * zoom,
                y: viewport.clientHeight / 2 - y * zoom,
              });
              cameraRef.current = nextCamera;
              setCamera(nextCamera);
            }
          }

          setPlayer((previousPlayer) => {
            if (
              previousPlayer &&
              Math.abs(previousPlayer.x - nextPlayer.x) < .2 &&
              Math.abs(previousPlayer.y - nextPlayer.y) < .2 &&
              previousPlayer.direction === nextPlayer.direction &&
              previousPlayer.path.length === nextPlayer.path.length
            ) {
              return previousPlayer;
            }
            return { ...nextPlayer };
          });
          if (workersMoved) setWorkersMotion({ ...nextWorkers });
          setInteraction((current) => {
            if (
              current?.type === nearest?.type &&
              current?.label === nearest?.label &&
              JSON.stringify(current) === JSON.stringify(nearest)
            ) return current;
            return nearest;
          });
        }
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [officeMembers, currentUserId, followPlayer, zoom, onPlayerMove]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = cameraOn ? localStream : null;
  }, [cameraOn, localStream]);

  useEffect(() => {
    if (!activeCallRoom || !currentUser) return;
    let cancelled = false;

    const syncCall = async () => {
      try {
        await sendCallAction({
          action: 'call-presence',
          roomId: activeCallRoom,
          audio: micOn,
          video: cameraOn,
          screen: screenOn,
        });
        const response = await fetch('/api/office/workers?callRoom=' + encodeURIComponent(activeCallRoom), {
          headers: await officeHeaders(),
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) setCallNotice(data.error || 'Não foi possível conectar a esta área.');
          return;
        }
        if (cancelled) return;
        if (callNotice) setCallNotice('');

        const participants = Array.isArray(data.participants) ? data.participants as CallParticipant[] : [];
        setCallParticipants((current) => {
          const currentKey = current.map((item) => [item.uid, item.audio, item.video, item.screen, item.updatedAt]).join('|');
          const nextKey = participants.map((item) => [item.uid, item.audio, item.video, item.screen, item.updatedAt]).join('|');
          return currentKey === nextKey ? current : participants;
        });
        if (data.room && typeof data.room.locked === 'boolean') {
          setLockedAreas((current) => {
            const nextLocked = data.room.locked === true;
            return current[activeCallRoom] === nextLocked ? current : { ...current, [activeCallRoom]: nextLocked };
          });
        }

        const mediaParticipants = participants.filter((item) =>
          item.uid !== currentUser.uid && (item.audio === true || item.video === true || item.screen === true)
        );
        const activePeerIds = new Set(mediaParticipants.map((item) => item.uid));
        for (const uid of [...peerRefs.current.keys()]) {
          if (!activePeerIds.has(uid) && !micOn && !cameraOn && !screenOn) closePeer(uid);
        }

        for (const participant of mediaParticipants) {
          const shouldOffer = currentUser.uid.localeCompare(participant.uid) < 0;
          await ensurePeer(activeCallRoom, participant.uid, shouldOffer);
        }

        const signals = Array.isArray(data.signals) ? data.signals as CallSignal[] : [];
        for (const signal of signals) {
          if (!signal?.id || processedSignalIds.current.has(signal.id) || signal.fromUid === currentUser.uid) continue;
          processedSignalIds.current.add(signal.id);
          const peer = await ensurePeer(activeCallRoom, signal.fromUid, false);

          if (signal.signalType === 'offer') {
            if (peer.signalingState !== 'stable') {
              try { await peer.setLocalDescription({ type: 'rollback' }); } catch {}
            }
            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendSignal(activeCallRoom, signal.fromUid, 'answer', answer);
          } else if (signal.signalType === 'answer') {
            if (peer.signalingState === 'have-local-offer') {
              await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
            }
          } else if (signal.signalType === 'candidate') {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
            } catch {}
          }
        }
      } catch (error: any) {
        if (!cancelled) setCallNotice(error?.message || 'Não foi possível conectar ao áudio desta área.');
      }
    };

    void syncCall();
    const interval = window.setInterval(() => void syncCall(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCallRoom, currentUser?.uid, micOn, cameraOn, screenOn, localStream, screenStream]);

  useEffect(() => {
    if (!player || !currentUser) return;
    const area = areaForCell(cellAtPixel(player.x, player.y));
    const desiredRoom = area?.kind === 'private' ? area.id : 'open-office';
    if (activeCallRoom === desiredRoom) return;

    const previousRoom = activeCallRoom;
    if (previousRoom) {
      void sendCallAction({ action: 'call-leave', roomId: previousRoom }).catch(() => undefined);
    }
    [...peerRefs.current.keys()].forEach(closePeer);
    processedSignalIds.current.clear();
    setCallParticipants([]);
    setCallNotice('');
    setActiveCallRoom(desiredRoom);
  }, [player ? cellKey(cellAtPixel(player.x, player.y)) : '', currentUser?.uid, activeCallRoom]);


  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    [...peerRefs.current.keys()].forEach(closePeer);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen();
    } catch {}
  };

  const sendEmote = async (emoji: string) => {
    setLocalEmote({ emoji, updatedAt: Date.now() });
    setEmoteMenuOpen(false);
    window.setTimeout(() => {
      setLocalEmote((current) => current?.emoji === emoji ? null : current);
    }, 4600);
    try {
      await sendCallAction({ action: 'office-emote', emoji });
    } catch {}
  };

  const officeHeaders = async () => {
    if (!currentUser) throw new Error('Sessão do Office não encontrada.');
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + await currentUser.getIdToken(),
    };
  };

  const sendCallAction = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/office/workers', {
      method: 'POST',
      headers: await officeHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Falha na chamada do Office.');
    return data;
  };

  const sendSignal = async (
    roomId: string,
    toUid: string,
    signalType: 'offer' | 'answer' | 'candidate',
    payload: any,
  ) => {
    await sendCallAction({
      action: 'call-signal',
      roomId,
      toUid,
      signalType,
      payload,
    });
  };

  const closePeer = (uid: string) => {
    const peer = peerRefs.current.get(uid);
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.close();
      peerRefs.current.delete(uid);
    }
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[uid];
      return next;
    });
  };

  const ensurePeer = async (roomId: string, peerUid: string, shouldOffer: boolean) => {
    const existing = peerRefs.current.get(peerUid);
    if (existing) return existing;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => peer.addTrack(track, screenStream));
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      void sendSignal(roomId, peerUid, 'candidate', event.candidate.toJSON()).catch(() => undefined);
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((current) => ({ ...current, [peerUid]: stream }));
    };

    peer.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        closePeer(peerUid);
      }
    };

    peerRefs.current.set(peerUid, peer);

    if (shouldOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(roomId, peerUid, 'offer', offer);
    }
    return peer;
  };

  const stopPrivateCall = async () => {
    const roomId = activeCallRoom;
    setActiveCallRoom(null);
    setCallParticipants([]);
    processedSignalIds.current.clear();
    [...peerRefs.current.keys()].forEach(closePeer);
    if (roomId) {
      void sendCallAction({ action: 'call-leave', roomId }).catch(() => undefined);
    }
  };

  const startPrivateCall = async (area: OfficeArea) => {
    if (area.kind !== 'private' || !currentUser) return;
    if (activeCallRoom && activeCallRoom !== area.id) await stopPrivateCall();
    setCallConnecting(true);
    try {
      setCallNotice('');
      const stream = await ensureLocalStream();
      if (!micOn && !cameraOn) {
        stream.getAudioTracks().forEach((track) => { track.enabled = true; });
        setMicOn(true);
      }
      setActiveCallRoom(area.id);
      await sendCallAction({
        action: 'call-presence',
        roomId: area.id,
        audio: true,
        video: cameraOn,
        screen: screenOn,
      });
    } catch (error: any) {
      setActiveCallRoom(null);
      setCallNotice(error?.message || 'Não foi possível entrar nessa reunião.');
    } finally {
      setCallConnecting(false);
    }
  };

  const toggleRoomLock = async (area: OfficeArea) => {
    const next = !lockedAreas[area.id];
    try {
      setCallNotice('');
      await sendCallAction({ action: 'call-room-lock', roomId: area.id, locked: next });
      setLockedAreas((current) => ({ ...current, [area.id]: next }));
    } catch (error: any) {
      setCallNotice(error?.message || 'Não foi possível alterar o bloqueio da sala.');
    }
  };

  const ensureLocalStream = async () => {
    if (localStream) return localStream;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getAudioTracks().forEach((track) => { track.enabled = false; });
    stream.getVideoTracks().forEach((track) => { track.enabled = false; });
    setLocalStream(stream);
    for (const [uid, peer] of peerRefs.current.entries()) {
      const existingTrackIds = new Set(peer.getSenders().map((sender) => sender.track?.id).filter(Boolean));
      stream.getTracks().forEach((track) => {
        if (!existingTrackIds.has(track.id)) peer.addTrack(track, stream);
      });
      if (activeCallRoom && currentUser) {
        void peer.createOffer()
          .then((offer) => peer.setLocalDescription(offer).then(() => offer))
          .then((offer) => sendSignal(activeCallRoom, uid, 'offer', offer))
          .catch(() => undefined);
      }
    }
    return stream;
  };

  const toggleMic = async () => {
    try {
      const stream = await ensureLocalStream();
      const next = !micOn;
      stream.getAudioTracks().forEach((track) => { track.enabled = next; });
      setMicOn(next);
    } catch {
      setMicOn(false);
    }
  };

  const toggleCamera = async () => {
    try {
      const stream = await ensureLocalStream();
      const next = !cameraOn;
      stream.getVideoTracks().forEach((track) => { track.enabled = next; });
      setCameraOn(next);
    } catch {
      setCameraOn(false);
    }
  };

  const toggleScreen = async () => {
    if (screenOn) {
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setScreenOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          setScreenStream(null);
          setScreenOn(false);
        }, { once: true });
      });
      setScreenStream(stream);
      setScreenOn(true);
      if (activeCallRoom) {
        for (const [uid, peer] of peerRefs.current.entries()) {
          stream.getTracks().forEach((track) => peer.addTrack(track, stream));
          void peer.createOffer()
            .then((offer) => peer.setLocalDescription(offer).then(() => offer))
            .then((offer) => sendSignal(activeCallRoom, uid, 'offer', offer))
            .catch(() => undefined);
        }
      }
    } catch {
      setScreenOn(false);
    }
  };

  const worldPointFromEvent = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - cameraRef.current.x) / zoom,
      y: (clientY - rect.top - cameraRef.current.y) / zoom,
    };
  };

  const goToWorldPoint = (x: number, y: number) => {
    const current = playerRef.current;
    if (!current) return;
    const target = nearestWalkableCell(x, y);
    pathRef.current = buildRoute(current.x, current.y, target);
    keyboardQueueRef.current = pathRef.current[pathRef.current.length - 1] || target;
    setWalkTarget(target);
    setFollowPlayer(true);
  };

  const locatePerson = (member: OfficeMember) => {
    const resolved = resolvedMemberPosition(member);
    const viewport = viewportRef.current;
    const nextZoom = Math.max(1.38, Math.min(1.72, zoom < 1.38 ? 1.5 : zoom));

    setFollowPlayer(false);
    setSelectedHumanId(member.userId);
    setSelectedAreaId(null);

    if (!viewport) {
      centerCameraOn(resolved.x, resolved.y);
      return;
    }

    const nextCamera = clampCamera({
      x: viewport.clientWidth / 2 - resolved.x * nextZoom,
      y: viewport.clientHeight / 2 - resolved.y * nextZoom,
    }, nextZoom);
    cameraRef.current = nextCamera;
    setZoom(nextZoom);
    setCamera(nextCamera);
    requestAnimationFrame(() => applyWorldTransform(nextCamera, nextZoom));
  };

  const applyWorldTransform = (nextCamera = cameraRef.current, nextZoom = zoom) => {
    if (!worldRef.current) return;
    worldRef.current.style.transform =
      'translate3d(' + nextCamera.x + 'px,' + nextCamera.y + 'px,0) scale(' + nextZoom + ')';
  };

  const setZoomAround = (nextZoom: number, clientX?: number, clientY?: number) => {
    const viewport = viewportRef.current;
    const next = Math.max(.34, Math.min(2.6, Number(nextZoom.toFixed(2))));
    if (!viewport) {
      setZoom(next);
      return;
    }

    let nextCamera = cameraRef.current;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const rect = viewport.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const worldX = (localX - cameraRef.current.x) / zoom;
      const worldY = (localY - cameraRef.current.y) / zoom;
      nextCamera = clampCamera({
        x: localX - worldX * next,
        y: localY - worldY * next,
      }, next);
      setFollowPlayer(false);
    } else {
      const current = playerRef.current;
      if (current && followPlayer) {
        nextCamera = clampCamera({
          x: viewport.clientWidth / 2 - current.x * next,
          y: viewport.clientHeight / 2 - current.y * next,
        }, next);
      } else {
        nextCamera = clampCamera(cameraRef.current, next);
      }
    }

    cameraRef.current = nextCamera;
    setZoom(next);
    setCamera(nextCamera);
    requestAnimationFrame(() => applyWorldTransform(nextCamera, next));
  };

  const changeZoom = (delta: number, clientX?: number, clientY?: number) => {
    setZoomAround(zoom + delta, clientX, clientY);
  };

  const fitMap = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = Math.max(.34, Math.min(1, Math.min(
      viewport.clientWidth / WORLD_W,
      viewport.clientHeight / WORLD_H,
    ) * .96));
    const centered = clampCamera({
      x: (viewport.clientWidth - WORLD_W * next) / 2,
      y: (viewport.clientHeight - WORLD_H * next) / 2,
    }, next);
    cameraRef.current = centered;
    setFollowPlayer(false);
    setZoom(next);
    setCamera(centered);
    requestAnimationFrame(() => applyWorldTransform(centered, next));
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let resizeFrame = 0;
    const refit = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => fitMap());
    };

    const initialFrame = window.requestAnimationFrame(() => fitMap());
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refit) : null;
    observer?.observe(viewport);
    window.addEventListener('resize', refit);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', refit);
    };
  }, []);

  const onViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, [data-no-pan="true"]')) return;
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !(event.buttons & 1)) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (followPlayer) setFollowPlayer(false);
    const next = clampCamera({
      x: cameraRef.current.x + dx,
      y: cameraRef.current.y + dy,
    });
    cameraRef.current = next;
    applyWorldTransform(next, zoom);
  };

  const onViewportPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsPanning(false);
    setCamera({ ...cameraRef.current });

    if (drag && !drag.moved) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('button, input, textarea, select, [data-no-pan="true"]')) {
        const point = worldPointFromEvent(event.clientX, event.clientY);
        const area = areaForCell(cellAtPixel(point.x, point.y));
        if (area) {
          setSelectedHumanId(null);
          setSelectedAreaId(area.id);
          setAreaEditing(false);
        } else {
          setSelectedAreaId(null);
        }
      }
    }

    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  };

  const onViewportPointerCancel = () => {
    dragRef.current = null;
    setIsPanning(false);
  };

  const onViewportDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, [data-no-pan="true"]')) return;
    const point = worldPointFromEvent(event.clientX, event.clientY);
    window.requestAnimationFrame(() => goToWorldPoint(point.x, point.y));
  };

  const selectedArea = selectedAreaId
    ? AREAS.find((area) => area.id === selectedAreaId) || null
    : null;

  const areaDisplayName = (area: OfficeArea) => areaNames[area.id] || area.name;

  const focusArea = (area: OfficeArea, preferredZoom?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const areaWidth = area.w * TILE;
    const areaHeight = area.h * TILE;
    const paddingX = Math.min(300, viewport.clientWidth * .28);
    const paddingY = Math.min(220, viewport.clientHeight * .28);
    const fitZoom = Math.min(
      (viewport.clientWidth - paddingX) / areaWidth,
      (viewport.clientHeight - paddingY) / areaHeight,
    );
    const nextZoom = Math.max(.52, Math.min(1.72, preferredZoom || fitZoom));
    const centerX = (area.x + area.w / 2) * TILE;
    const centerY = (area.y + area.h / 2) * TILE;
    const nextCamera = clampCamera({
      x: viewport.clientWidth / 2 - centerX * nextZoom,
      y: viewport.clientHeight / 2 - centerY * nextZoom,
    }, nextZoom);

    setFollowPlayer(false);
    cameraRef.current = nextCamera;
    setZoom(nextZoom);
    setCamera(nextCamera);
    requestAnimationFrame(() => applyWorldTransform(nextCamera, nextZoom));
  };

  const selectAndFocusArea = (area: OfficeArea) => {
    setSelectedHumanId(null);
    setSelectedAreaId(area.id);
    setAreaEditing(false);
    setAreasOpen(false);
    focusArea(area);
  };

  const goToArea = (area: OfficeArea) => {
    const target = AREA_ENTRY_TARGET[area.id] || nearestWalkableCell(
      (area.x + area.w / 2) * TILE,
      (area.y + area.h / 2) * TILE,
    );
    const point = centerOf(target);
    goToWorldPoint(point.x, point.y);
    setSelectedAreaId(area.id);
    setAreasOpen(false);
    focusArea(area, 1.12);
  };

  const saveAreaName = async (area: OfficeArea) => {
    const next = areaNameDraft.trim();
    if (!onRenameArea || next.length < 2) return;
    await onRenameArea(area.id, next);
    setAreaEditing(false);
  };

  const remoteHumans = officeMembers
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const resolved = resolvedMemberPosition(member);
      return {
        member,
        x: resolved.x,
        y: resolved.y,
        direction: resolved.direction,
      };
    });

  const currentArea = player ? areaForCell(cellAtPixel(player.x, player.y)) : null;
  const areaParticipants = currentArea
    ? officeMembers.filter((member) => {
        if (member.userId === currentUserId && player) return areaContains(currentArea, player.x, player.y);
        const resolved = resolvedMemberPosition(member);
        return areaContains(currentArea, resolved.x, resolved.y);
      })
    : [];

  const nearbyMembers = player
    ? remoteHumans
        .map((item) => ({ ...item, distance: distanceTiles(player.x, player.y, item.x, item.y) }))
        .filter((item) => item.distance <= (quietMode ? 1.25 : 5.25))
        .sort((a, b) => a.distance - b.distance)
    : [];

  const remoteMediaEntries = Object.entries(remoteStreams)
    .map(([uid, stream]) => {
      const remote = remoteHumans.find((item) => item.member.userId === uid);
      const distance = player && remote ? distanceTiles(player.x, player.y, remote.x, remote.y) : 0;
      const volume = activeCallRoom === 'open-office' ? spatialVolume(distance, quietMode) : 1;
      return { uid, stream, distance, volume };
    })
    .filter((item) => activeCallRoom !== 'open-office' || item.volume > 0);

  const selectedHuman = officeMembers.find((member) => member.userId === selectedHumanId) || null;
  const selfProfileSelected = Boolean(
    selectedHuman && currentMember && selectedHuman.userId === currentMember.userId,
  );
  const activeCeoStyle = currentMember
    ? CEO_AVATAR_STYLES.find((style) => style.id === avatarStyleOf(currentMember)) || CEO_AVATAR_STYLES[1]
    : CEO_AVATAR_STYLES[1];
  const draftCeoStyle = CEO_AVATAR_STYLES.find((style) => style.id === avatarStyleDraft) || CEO_AVATAR_STYLES[1];
  const playerWalking = player ? Math.abs(player.vx) + Math.abs(player.vy) > 7 : false;
  const playerFrame = player ? spriteFrame(player.direction) : null;

  return (
    <div className="gather-office-shell" ref={shellRef}>
      <div
        className={'gather-viewport' + (isPanning ? ' is-panning' : '')}
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
        onDoubleClick={onViewportDoubleClick}
        onWheel={(event) => {
          event.preventDefault();
          changeZoom(event.deltaY < 0 ? .14 : -.14, event.clientX, event.clientY);
        }}
      >
        <div
          className="gather-world"
          ref={worldRef}
          style={{
            width: WORLD_W,
            height: WORLD_H,
            transform: 'translate3d(' + camera.x + 'px,' + camera.y + 'px,0) scale(' + zoom + ')',
          }}
        >
          <div className="gather-grass" />
          <div className="gather-building-floor" />

          {walkTarget && (
            <div
              className="gather-walk-target"
              style={{
                left: walkTarget.x * TILE,
                top: walkTarget.y * TILE,
                width: TILE,
                height: TILE,
              }}
            />
          )}

          {AREAS.map((area) => (
            <div
              key={area.id}
              className={'gather-room gather-room-' + area.id + ' area-' + area.kind}
              style={{
                left: area.x * TILE,
                top: area.y * TILE,
                width: area.w * TILE,
                height: area.h * TILE,
              }}
            >
              <button
                type="button"
                data-no-pan="true"
                className="gather-room-name"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedHumanId(null);
                  setSelectedAreaId(area.id);
                  setAreaEditing(false);
                  focusArea(area);
                }}
              >
                {areaDisplayName(area)}
              </button>
            </div>
          ))}

          {selectedArea && (
            <div
              className="gather-area-selected-outline"
              style={{
                left: selectedArea.x * TILE,
                top: selectedArea.y * TILE,
                width: selectedArea.w * TILE,
                height: selectedArea.h * TILE,
              }}
            />
          )}

          <div className="gather-wall wall-meeting-left" />
          <div className="gather-wall wall-meeting-split" />
          <div className="gather-wall wall-bottom-a" />
          <div className="gather-wall wall-bottom-b" />
          <div className="gather-wall wall-bottom-c" />
          <div className="gather-wall wall-bottom-d" />
          <div className="gather-wall wall-ceo-split-a" />
          <div className="gather-wall wall-ceo-split-b" />
          <div className="gather-wall wall-designer-split-a" />
          <div className="gather-wall wall-designer-split-b" />

          <div className="gather-door door-meeting">REUNIÃO</div>
          <div className="gather-door door-ceo">CEO</div>
          <div className="gather-door door-lobby">LOBBY</div>
          <div className="gather-door door-designer">DESIGN</div>

          <div className="gather-lounge">
            <img src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" className="gather-furniture lounge-sofa-a" />
            <img src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" className="gather-furniture lounge-sofa-b" />
            <img src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" className="gather-furniture lounge-table" />
            <img src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" className="gather-furniture lounge-plant-a" />
            <img src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" className="gather-furniture lounge-plant-b" />
            <img src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="" className="gather-furniture lounge-coffee" />
          </div>

          {AI_DESKS.map((desk) => {
            const worker = workers.find((item) => item.id === desk.workerId);
            return (
              <button
                key={desk.workerId}
                type="button"
                className={'gather-workstation ' + (selectedWorkerId === desk.workerId ? 'selected' : '')}
                style={{ left: desk.col * TILE, top: desk.row * TILE }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectWorker(desk.workerId);
                }}
                title={worker ? 'Mesa de ' + worker.name : 'Mesa'}
              >
                <span className="desk-divider" />
                <img className="desk-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
                <span className="gather-desk-surface" />
              </button>
            );
          })}

          <div className="gather-operations-decor">
            <img className="operations-books-a" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
            <img className="operations-books-b" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
            <img className="operations-plant-a" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
            <img className="operations-plant-b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
            <img className="operations-clock" src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="" />
          </div>

          <div className="gather-team-pods">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className={'team-pod pod-' + index}>
                <span className="pod-divider" />
                <img className="pod-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
                <span className="gather-pod-surface" />
              </div>
            ))}
          </div>

          <div className="gather-meeting-furniture">
            <img className="meeting-table" src="/pixel-agents/assets/furniture/TABLE_FRONT/TABLE_FRONT.png" alt="" />
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <img key={index} className={'meeting-chair chair-' + index} src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
            ))}
            <img className="meeting-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
            <img className="meeting-plant-a" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
            <img className="meeting-plant-b" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
            <img className="meeting-clock" src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="" />
          </div>

          <div className="gather-lab-furniture">
            <div className="lab-station station-a">
              <img className="lab-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
              <img className="lab-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
            </div>
            <div className="lab-station station-b">
              <img className="lab-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
              <img className="lab-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
            </div>
            <img className="lab-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
            <span className="lab-console-a" />
            <span className="lab-console-b" />
            <img className="lab-books" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          </div>

          <div className="gather-ceo-furniture">
            <img className="ceo-books" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
            <img className="ceo-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
            <div className="ceo-desk">
              <img src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" className="desk-chair" />
              <span className="gather-desk-surface" />
            </div>
            <div className="ceo-rug" />
            <img className="ceo-sofa" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
            <img className="ceo-coffee-table" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />
            <img className="ceo-plant" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          </div>

          <div className="gather-lobby-furniture">
            <div className="lobby-rug" />
            <img className="lobby-sofa" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
            <img className="lobby-table" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />
            <img className="lobby-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
            <img className="lobby-plant-a" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
            <img className="lobby-plant-b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          </div>

          <div className="gather-designer-furniture">
            <div className="designer-rug" />
            <img className="designer-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
            <img className="designer-painting" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
            <div className="designer-desk">
              <img src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" className="desk-chair" />
              <span className="gather-desk-surface" />
            </div>
            <img className="designer-books" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
            <img className="designer-sofa" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
            <img className="designer-plant" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          </div>

          {currentArea?.kind === 'private' && (
            <div
              className="gather-private-focus"
              style={{
                left: currentArea.x * TILE,
                top: currentArea.y * TILE,
                width: currentArea.w * TILE,
                height: currentArea.h * TILE,
              }}
            />
          )}

          {workers.map((worker) => {
            const motion = workersMotion[worker.id];
            if (!motion) return null;
            const state = workerState(tasks, worker.id);
            const walking = motion.path.length > 0;
            const frame = spriteFrame(motion.direction);
            const task = currentTask(tasks, worker.id);
            return (
              <button
                key={worker.id}
                type="button"
                className={'gather-avatar ai-avatar state-' + state + (walking ? ' walking' : '') + (selectedWorkerId === worker.id ? ' selected' : '')}
                style={{ left: motion.x, top: motion.y, zIndex: 800 + Math.floor(motion.y) }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectWorker(worker.id);
                }}
              >
                <span
                  className="gather-avatar-sprite"
                  style={{
                    backgroundImage: 'url(/pixel-agents/assets/characters/char_' + worker.palette + '.png)',
                    backgroundPositionX: walking ? undefined : '-48px',
                    backgroundPositionY: (-frame.row * 96) + 'px',
                    transform: frame.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                <span className="gather-avatar-tag">
                  <strong>{worker.name}</strong>
                  <small>{state === 'working' ? 'trabalhando' : state === 'waiting_approval' ? 'aguardando você' : task?.title || worker.role}</small>
                </span>
                {state === 'working' && <i className="gather-avatar-status working">•••</i>}
                {state === 'waiting_approval' && <i className="gather-avatar-status approval">!</i>}
              </button>
            );
          })}

          {remoteHumans.map(({ member, x, y, direction }) => {
            const updatedAt = member.position?.updatedAt ? new Date(member.position.updatedAt).getTime() : 0;
            const moving = updatedAt > 0 && Date.now() - updatedAt < 4600;
            const frame = spriteFrame(direction);
            const humanTask = activeHumanTask(humanTasks, member.userId);
            return (
              <button
                key={member.userId}
                type="button"
                className={'gather-avatar human-avatar remote' + (member.officeRole === 'ceo' ? ' ceo-avatar' : '') + (moving ? ' walking' : '') + (selectedHumanId === member.userId ? ' selected' : '')}
                style={{ left: x, top: y, zIndex: 950 + Math.floor(y) }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedHumanId(member.userId);
                }}
              >
                <span
                  className="gather-avatar-sprite"
                  style={{
                    backgroundImage: 'url(' + spriteForMember(member) + ')',
                    backgroundPositionX: moving ? undefined : '-48px',
                    backgroundPositionY: (-frame.row * 96) + 'px',
                    transform: frame.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                <span className="gather-avatar-tag human">
                  <strong>{member.displayName}</strong>
                  <small>{humanTaskText(humanTask) || member.title}</small>
                </span>
                {member.emote?.emoji && member.emote.updatedAt && Date.now() - new Date(member.emote.updatedAt).getTime() < 5200 && (
                  <i className="gather-emote-bubble">{member.emote.emoji}</i>
                )}
              </button>
            );
          })}

          {player && currentMember && playerFrame && (
            <button
              type="button"
              className={'gather-avatar human-avatar me manual-player' + (currentMember.officeRole === 'ceo' ? ' ceo-avatar' : '') + (playerWalking ? ' walking' : '')}
              style={{ left: player.x, top: player.y, zIndex: 1100 + Math.floor(player.y) }}
              onClick={(event) => {
                event.stopPropagation();
                openSelfProfile();
              }}
            >
              <span
                className="gather-avatar-sprite"
                style={{
                  backgroundImage: 'url(' + spriteForMember(currentMember) + ')',
                  backgroundPositionX: playerWalking ? undefined : '-48px',
                  backgroundPositionY: (-playerFrame.row * 96) + 'px',
                  transform: playerFrame.flip ? 'scaleX(-1)' : undefined,
                }}
              />
              <span className="gather-avatar-tag me">
                <strong>{currentMember.displayName}</strong>
                <small>{currentMember.officeRole === 'ceo' ? 'CEO' : currentMember.title}</small>
              </span>
              {localEmote && <i className="gather-emote-bubble">{localEmote.emoji}</i>}
            </button>
          )}
        </div>

        {cameraOn && (
          <div className="gather-self-video">
            <video ref={videoRef} autoPlay muted playsInline />
            <span>Você</span>
          </div>
        )}

        {activeCallRoom && remoteMediaEntries.length > 0 && (
          <div className="gather-remote-video-strip">
            {remoteMediaEntries.map(({ uid, stream, volume }) => {
              const participant = callParticipants.find((item) => item.uid === uid);
              return (
                <RemoteVideoTile
                  key={uid}
                  stream={stream}
                  label={participant?.displayName || 'Equipe'}
                  volume={volume}
                />
              );
            })}
          </div>
        )}

        {nearbyMembers.length > 0 && (
          <div className="gather-nearby-strip">
            {nearbyMembers.slice(0, 4).map(({ member, distance }) => (
              <button key={member.userId} type="button" onClick={() => locatePerson(member)}>
                <span className="nearby-dot" />
                <strong>{member.displayName}</strong>
                <small>{distance <= 2.2 ? 'conectado' : 'por perto'}</small>
              </button>
            ))}
          </div>
        )}

        {interaction && (
          <button
            type="button"
            className="gather-interaction"
            onClick={(event) => {
              event.stopPropagation();
              onInteract?.(interaction);
            }}
          >
            <kbd>E</kbd>
            <span>{interaction.label}</span>
          </button>
        )}

        {(selectedArea || currentArea?.kind === 'private' || selectedHuman) && (
          <aside className="gather-context-card">
            <button type="button" className="context-close" onClick={() => {
              setSelectedHumanId(null);
              setSelectedAreaId(null);
              setAreaEditing(false);
            }}>
              <X className="h-4 w-4" />
            </button>

            {selectedHuman ? (
              selfProfileSelected ? (
                <>
                  <div className="gather-self-profile-head">
                    <span className="gather-self-profile-avatar">
                      <span
                        className="gather-self-profile-sprite"
                        style={{
                          backgroundImage: 'url(' + spriteForMember(selectedHuman) + ')',
                          backgroundPosition: '-48px 0',
                        }}
                      />
                      <i />
                    </span>
                    <div>
                      <strong>{selectedHuman.displayName}</strong>
                      <small>● online · {profileTimeZone}</small>
                    </div>
                  </div>

                  <div className="gather-self-profile-actions">
                    <button type="button" className="context-primary" onClick={openProfileEditor}>
                      <UserRound className="h-4 w-4" />
                      Editar perfil
                    </button>
                    <button type="button" className="gather-profile-icon-button" onClick={openAvatarEditor} title="Editar avatar">
                      <Shirt className="h-4 w-4" />
                    </button>
                    <button type="button" className="gather-profile-icon-button" title="Mais opções">•••</button>
                  </div>

                  <div className="gather-profile-avatar-summary">
                    <span
                      className="gather-profile-avatar-preview"
                      style={{
                        backgroundImage: 'url(' + activeCeoStyle.sprite + ')',
                        backgroundPosition: '-48px 0',
                      }}
                    />
                    <div>
                      <strong>Avatar CEO</strong>
                      <small>{activeCeoStyle.name} · {activeCeoStyle.subtitle}</small>
                    </div>
                    <button type="button" onClick={openAvatarEditor}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="context-title">
                    <span className="context-avatar">{selectedHuman.displayName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{selectedHuman.displayName}</strong>
                      <small>{selectedHuman.title}</small>
                    </div>
                  </div>
                  <button type="button" className="context-primary" onClick={() => {
                    locatePerson(selectedHuman);
                    const resolved = resolvedMemberPosition(selectedHuman);
                    goToWorldPoint(resolved.x, resolved.y);
                  }}>
                    <LocateFixed className="h-4 w-4" />
                    Ir até essa pessoa
                  </button>
                  <button type="button" className="context-secondary" onClick={() => onSelectHuman?.(selectedHuman.userId)}>
                    <ChevronRight className="h-4 w-4" />
                    Abrir estação
                  </button>
                </>
              )
            ) : (selectedArea || currentArea) ? (() => {
              const area = (selectedArea || currentArea) as OfficeArea;
              const people = officeMembers.filter((member) => {
                if (member.userId === currentUserId && player) return areaContains(area, player.x, player.y);
                const resolved = resolvedMemberPosition(member);
                return areaContains(area, resolved.x, resolved.y);
              });

              return (
                <>
                  <div className="context-title">
                    <span className="context-room-icon"><Users className="h-4 w-4" /></span>
                    <div>
                      <strong>{areaDisplayName(area)}</strong>
                      <small>{area.subtitle}</small>
                    </div>
                  </div>

                  {areaEditing ? (
                    <div className="context-area-edit">
                      <input
                        autoFocus
                        value={areaNameDraft}
                        maxLength={40}
                        onChange={(event) => setAreaNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void saveAreaName(area);
                          if (event.key === 'Escape') setAreaEditing(false);
                        }}
                      />
                      <button type="button" onClick={() => void saveAreaName(area)}>Salvar</button>
                    </div>
                  ) : (
                    <div className="context-room-actions">
                      <button type="button" onClick={() => focusArea(area)}>
                        <ZoomIn className="h-3.5 w-3.5" />
                        Aproximar
                      </button>
                      <button type="button" onClick={() => goToArea(area)}>
                        <LocateFixed className="h-3.5 w-3.5" />
                        Ir para
                      </button>
                      {canManageAreas && onRenameArea && (
                        <button type="button" onClick={() => {
                          setAreaNameDraft(areaDisplayName(area));
                          setAreaEditing(true);
                        }}>
                          <ChevronRight className="h-3.5 w-3.5" />
                          Editar nome
                        </button>
                      )}
                    </div>
                  )}

                  {area.kind === 'private' && (
                    <>
                      <button
                        type="button"
                        className={'context-primary ' + (activeCallRoom === area.id ? 'live' : '')}
                        disabled={callConnecting}
                        onClick={() => void toggleMic()}
                      >
                        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        {micOn ? 'Microfone ligado' : 'Ligar microfone'}
                      </button>
                      <div className="context-room-actions">
                        <button type="button" onClick={() => void toggleRoomLock(area)}>
                          <Lock className="h-3.5 w-3.5" />
                          {lockedAreas[area.id] ? 'Desbloquear' : 'Bloquear sala'}
                        </button>
                      </div>
                    </>
                  )}

                  {callNotice && <div className="context-call-notice">{callNotice}</div>}
                  <div className="context-participants">
                    <span>{people.length} participante{people.length === 1 ? '' : 's'}</span>
                    {people.map((member) => (
                      <button key={member.userId} type="button" onClick={() => locatePerson(member)}>
                        <i>{member.displayName.slice(0, 1).toUpperCase()}</i>
                        <strong>{member.userId === currentUserId ? 'Você' : member.displayName}</strong>
                      </button>
                    ))}
                  </div>
                </>
              );
            })() : null}
          </aside>
        )}

        <div className="gather-map-controls">
          <button type="button" onClick={() => changeZoom(.16)} title="Aumentar zoom"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" className="gather-zoom-value" onClick={() => setZoomAround(1)} title="Zoom 100%">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => changeZoom(-.16)} title="Diminuir zoom"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={fitMap} title="Ver mapa inteiro"><Maximize2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => {
            const current = playerRef.current;
            setFollowPlayer(true);
            if (current) centerCameraOn(current.x, current.y);
          }} title="Mostrar minha posição"><LocateFixed className="h-4 w-4" /></button>
          <button type="button" className={areasOpen ? 'active' : ''} onClick={() => {
            setAreasOpen((value) => !value);
            setParticipantsOpen(false);
          }} title="Áreas e salas"><MapPinned className="h-4 w-4" /></button>
          <button type="button" onClick={() => {
            setParticipantsOpen((value) => !value);
            setAreasOpen(false);
          }} title="Pessoas"><Users className="h-4 w-4" /></button>
          <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {areasOpen && (
          <aside className="gather-areas-panel">
            <div className="people-head">
              <div>
                <strong>Áreas do Office</strong>
                <small>Clique para aproximar ou caminhe até a área.</small>
              </div>
              <button type="button" onClick={() => setAreasOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="gather-areas-list">
              {AREAS.map((area) => {
                const count = officeMembers.filter((member) => {
                  if (member.userId === currentUserId && player) return areaContains(area, player.x, player.y);
                  const resolved = resolvedMemberPosition(member);
                  return areaContains(area, resolved.x, resolved.y);
                }).length;
                return (
                  <article key={area.id} className={selectedAreaId === area.id ? 'selected' : ''}>
                    <button type="button" className="area-main" onClick={() => selectAndFocusArea(area)}>
                      <span className={'area-kind ' + area.kind}>{area.kind === 'private' ? 'P' : area.kind === 'social' ? 'S' : 'T'}</span>
                      <div>
                        <strong>{areaDisplayName(area)}</strong>
                        <small>{area.subtitle} · {count} pessoa{count === 1 ? '' : 's'}</small>
                      </div>
                    </button>
                    <button type="button" className="area-go" onClick={() => goToArea(area)} title={'Ir para ' + areaDisplayName(area)}>
                      <LocateFixed className="h-3.5 w-3.5" />
                    </button>
                  </article>
                );
              })}
            </div>
          </aside>
        )}

        {participantsOpen && (
          <aside className="gather-people-panel">
            <div className="people-head">
              <div>
                <strong>Pessoas no Office</strong>
                <small>{officeMembers.length} membro{officeMembers.length === 1 ? '' : 's'}</small>
              </div>
              <button type="button" onClick={() => setParticipantsOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="people-list">
              {officeMembers.map((member) => (
                <button key={member.userId} type="button" onClick={() => locatePerson(member)}>
                  <span>{member.displayName.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{member.userId === currentUserId ? 'Você' : member.displayName}</strong>
                    <small>{member.officeRole === 'ceo' ? 'CEO' : member.title}</small>
                  </div>
                  <LocateFixed className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="gather-minimap" onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width * WORLD_W;
          const y = (event.clientY - rect.top) / rect.height * WORLD_H;
          const area = areaForCell(cellAtPixel(x, y));
          if (area) {
            selectAndFocusArea(area);
          } else {
            setFollowPlayer(false);
            centerCameraOn(x, y);
          }
        }}>
          {AREAS.map((area) => (
            <i
              key={area.id}
              className={'mini-area ' + area.kind + (selectedAreaId === area.id ? ' selected' : '')}
              style={{
                left: (area.x / COLS * 100) + '%',
                top: (area.y / ROWS * 100) + '%',
                width: (area.w / COLS * 100) + '%',
                height: (area.h / ROWS * 100) + '%',
              }}
            />
          ))}
          {player && <b style={{ left: (player.x / WORLD_W * 100) + '%', top: (player.y / WORLD_H * 100) + '%' }} />}
        </div>

        {emoteMenuOpen && (
          <div className="gather-emote-menu">
            {['👍', '🎉', '🔥', '💡', '😂', '❤️'].map((emoji) => (
              <button key={emoji} type="button" onClick={() => void sendEmote(emoji)}>{emoji}</button>
            ))}
          </div>
        )}

        <div className="gather-bottom-dock">
          <button type="button" className="dock-profile" onClick={openSelfProfile} title="Meu perfil">
            {currentMember?.officeRole === 'ceo' ? (
              <span
                className="dock-profile-sprite"
                style={{
                  backgroundImage: 'url(' + spriteForMember(currentMember) + ')',
                  backgroundPosition: '-48px 0',
                }}
              />
            ) : (
              <span>{currentMember?.displayName?.slice(0, 1).toUpperCase() || 'L'}</span>
            )}
            <i />
          </button>
          <button type="button" className={micOn ? 'active' : ''} onClick={() => void toggleMic()} title="Microfone">
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button type="button" className={cameraOn ? 'active' : ''} onClick={() => void toggleCamera()} title="Câmera">
            {cameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </button>
          <button type="button" className={screenOn ? 'active' : ''} onClick={() => void toggleScreen()} title="Compartilhar tela">
            <MonitorUp className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onInteract?.({ type: 'meeting', label: 'Chat da equipe' })} title="Chat">
            <MessageCircle className="h-5 w-5" />
          </button>
          <button type="button" className={emoteMenuOpen ? 'active' : ''} onClick={() => setEmoteMenuOpen((value) => !value)} title="Reação">
            <Smile className="h-5 w-5" />
          </button>
          <button type="button" className={quietMode ? 'active quiet' : ''} onClick={() => setQuietMode((value) => !value)} title="Modo foco">
            <BellOff className="h-5 w-5" />
          </button>
          <button type="button" onClick={onOpenTasks} title="Tarefas">
            <ClipboardList className="h-5 w-5" />
          </button>
        </div>

        {profileEditorOpen && currentMember && (
          <div className="gather-profile-modal-backdrop" data-no-pan="true">
            <section className="gather-profile-modal compact" role="dialog" aria-modal="true" aria-label="Editar perfil">
              <header>
                <strong>Editar perfil</strong>
                <button type="button" onClick={() => setProfileEditorOpen(false)}><X className="h-5 w-5" /></button>
              </header>

              <div className="gather-profile-modal-body">
                <div className="gather-profile-identity-grid">
                  <div>
                    <small>Foto de perfil</small>
                    <span className="gather-profile-letter">
                      {currentMember.displayName.slice(0, 1).toUpperCase()}
                      <button type="button" title="Editar nome"><Pencil className="h-3 w-3" /></button>
                    </span>
                  </div>
                  <div>
                    <small>Avatar</small>
                    <span className="gather-profile-avatar-large">
                      <span
                        style={{
                          backgroundImage: 'url(' + activeCeoStyle.sprite + ')',
                          backgroundPosition: '-48px 0',
                        }}
                      />
                      <button type="button" onClick={openAvatarEditor} title="Editar avatar"><Pencil className="h-3 w-3" /></button>
                    </span>
                  </div>
                </div>

                <label className="gather-profile-field">
                  <span>Nome completo*</span>
                  <input
                    autoFocus
                    value={profileNameDraft}
                    maxLength={80}
                    onChange={(event) => setProfileNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveSelfProfile();
                    }}
                  />
                </label>

                <label className="gather-profile-field">
                  <span>Fuso horário</span>
                  <div className="gather-profile-static-field">(UTC-03:00) {profileTimeZone}</div>
                </label>

                {profileError && <div className="gather-profile-error">{profileError}</div>}
              </div>

              <footer>
                <button type="button" className="secondary" onClick={() => setProfileEditorOpen(false)}>Cancelar</button>
                <button type="button" className="primary" disabled={profileSaving} onClick={() => void saveSelfProfile()}>
                  {profileSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {avatarEditorOpen && currentMember && (
          <div className="gather-profile-modal-backdrop avatar" data-no-pan="true">
            <section className="gather-avatar-editor" role="dialog" aria-modal="true" aria-label="Editar avatar">
              <header>
                <strong>Editar Avatar</strong>
                <button type="button" onClick={() => setAvatarEditorOpen(false)}><X className="h-5 w-5" /></button>
              </header>

              <div className="gather-avatar-editor-body">
                <nav className="gather-avatar-categories">
                  {CEO_AVATAR_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={avatarCategory === category.id ? 'active' : ''}
                      onClick={() => setAvatarCategory(category.id)}
                    >
                      {category.kind === 'clothing' ? <Shirt className="h-4 w-4" /> : category.kind === 'accessory' ? <Pencil className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                      <span>{category.label}</span>
                    </button>
                  ))}
                </nav>

                <div className="gather-avatar-options">
                  <div className="gather-avatar-options-head">
                    <strong>{avatarCategoryMeta(avatarCategory).label}</strong>
                    <small>
                      {isClothingCategory(avatarCategory)
                        ? 'Escolha um dos looks completos do seu personagem CEO.'
                        : 'Esta parte faz parte da identidade fixa do seu personagem CEO.'}
                    </small>
                  </div>

                  {isClothingCategory(avatarCategory) ? (
                    <>
                      <div className="gather-avatar-style-grid">
                        {CEO_AVATAR_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            className={avatarStyleDraft === style.id ? 'selected' : ''}
                            onClick={() => setAvatarStyleDraft(style.id)}
                          >
                            <span
                              className="gather-avatar-style-sprite"
                              style={{
                                backgroundImage: 'url(' + style.sprite + ')',
                                backgroundPosition: '-48px 0',
                              }}
                            />
                            <strong>{style.name}</strong>
                            <small>{style.subtitle}</small>
                            {avatarStyleDraft === style.id && <i><Check className="h-3.5 w-3.5" /></i>}
                          </button>
                        ))}
                      </div>
                      <div className="gather-avatar-palette" aria-hidden="true">
                        {['#171717', '#3b2a22', '#ece2ce', '#5b1d2b', '#ffffff', '#6b7280', '#9ca3af'].map((color) => (
                          <span key={color} style={{ background: color }} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="gather-avatar-simple-options">
                      <div className="gather-avatar-simple-icon"><Lock className="h-7 w-7" /></div>
                      <strong>Identidade do CEO preservada</strong>
                      <p>Rosto, tom da pele, cabelo e detalhes principais ficam fixos para o seu avatar continuar sendo o mesmo personagem em todos os looks e animações.</p>
                      <button type="button" onClick={() => setAvatarCategory('top')}>
                        <Shirt className="h-4 w-4" />
                        Ver roupas
                      </button>
                    </div>
                  )}
                </div>

                <div className="gather-avatar-live-preview">
                  <span className="gather-avatar-preview-name"><i />{currentMember.displayName}</span>
                  <span
                    className="gather-avatar-preview-sprite"
                    style={{
                      backgroundImage: 'url(' + draftCeoStyle.sprite + ')',
                      backgroundPosition: '-48px 0',
                    }}
                  />
                  <small>{draftCeoStyle.name}</small>
                </div>
              </div>

              {profileError && <div className="gather-profile-error avatar-error">{profileError}</div>}

              <footer>
                <button type="button" className="secondary" onClick={() => setAvatarEditorOpen(false)}>Cancelar</button>
                <button type="button" className="primary" disabled={profileSaving} onClick={() => void saveAvatarStyle()}>
                  {profileSaving ? 'Salvando...' : 'Feito'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {activeCallRoom && (
          <div className="gather-call-badge">
            <span className="live-dot" />
            <strong>{activeCallRoom === 'open-office' ? 'Áudio espacial' : AREAS.find((area) => area.id === activeCallRoom)?.name || 'Área privada'}</strong>
            <small>{callParticipants.length} conectado{callParticipants.length === 1 ? '' : 's'}</small>
          </div>
        )}

        <div className="gather-movement-help">
          <span><kbd>WASD</kbd> / setas · 1 bloco por passo</span>
          <span>clique + arraste · olhar o mapa</span>
          <span>duplo clique · caminhar até lá</span>
          <span><kbd>E</kbd> interagir</span>
        </div>
      </div>
    </div>
  );
};

export default GatherOfficeWorld;
