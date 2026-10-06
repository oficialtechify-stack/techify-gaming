import React, { useEffect, useMemo, useRef, useState } from 'react';

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

type OfficeMember = {
  id?: string;
  userId: string;
  displayName: string;
  email?: string;
  officeRole: 'ceo' | 'designer' | 'member';
  title: string;
  palette: number;
  deskId: string;
  position?: { x: number; y: number; direction?: string; updatedAt?: string } | null;
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

type Direction = 'down' | 'up' | 'left' | 'right';
type Cell = { x: number; y: number };

type MotionState = {
  x: number;
  y: number;
  direction: Direction;
  path: Cell[];
  targetKey: string;
  idleIndex: number;
  nextIdleAt: number;
};

type Interaction =
  | { type: 'computer'; label: string; ownerUid?: string }
  | { type: 'meeting'; label: string }
  | null;

interface PixelOfficeWorldProps {
  workers: Worker[];
  tasks: TaskLite[];
  officeMembers?: OfficeMember[];
  currentUserId?: string | null;
  selectedWorkerId: string;
  tick: number;
  pcTick: number;
  onSelectWorker: (workerId: string) => void;
  onSelectHuman?: (userId: string) => void;
  onPlayerMove?: (position: { x: number; y: number; direction: Direction }) => void;
  onInteract?: (interaction: Exclude<Interaction, null>) => void;
}

const TILE = 32;
const COLS = 54;
const ROWS = 42;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const AI_WALK_SPEED = 34;
const PLAYER_WALK_SPEED = 72;
const EPSILON = 1.4;

const HOME_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 6, y: 21 },
  frontend: { x: 11, y: 21 },
  backend: { x: 16, y: 21 },
  designer: { x: 6, y: 28 },
  qa: { x: 11, y: 28 },
  growth: { x: 16, y: 28 },
};

const MEETING_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 24, y: 3 },
  frontend: { x: 20, y: 6 },
  backend: { x: 30, y: 6 },
  designer: { x: 21, y: 9 },
  qa: { x: 29, y: 9 },
  growth: { x: 25, y: 9 },
};

const QUEUE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 20, y: 17 },
  frontend: { x: 21, y: 19 },
  backend: { x: 20, y: 23 },
  designer: { x: 19, y: 26 },
  qa: { x: 22, y: 27 },
  growth: { x: 20, y: 29 },
};

const IDLE_TARGETS: Record<string, Cell[]> = {
  'lumy-manager': [{ x: 23, y: 17 }, { x: 24, y: 12 }, { x: 39, y: 28 }],
  frontend: [{ x: 21, y: 18 }, { x: 35, y: 27 }, { x: 39, y: 17 }],
  backend: [{ x: 10, y: 37 }, { x: 21, y: 24 }, { x: 42, y: 17 }],
  designer: [{ x: 34, y: 30 }, { x: 42, y: 34 }, { x: 21, y: 26 }],
  qa: [{ x: 12, y: 36 }, { x: 21, y: 23 }, { x: 20, y: 18 }],
  growth: [{ x: 38, y: 29 }, { x: 42, y: 18 }, { x: 33, y: 34 }],
};

const PAUSE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 36, y: 32 },
  frontend: { x: 34, y: 32 },
  backend: { x: 39, y: 32 },
  designer: { x: 42, y: 32 },
  qa: { x: 36, y: 36 },
  growth: { x: 42, y: 36 },
};

const AI_DESKS = [
  { workerId: 'lumy-manager', col: 5, row: 17 },
  { workerId: 'frontend', col: 10, row: 17 },
  { workerId: 'backend', col: 15, row: 17 },
  { workerId: 'designer', col: 5, row: 24 },
  { workerId: 'qa', col: 10, row: 24 },
  { workerId: 'growth', col: 15, row: 24 },
];

const SOLID_RECTS: Array<[number, number, number, number]> = [
  // CEO room
  [4, 4, 5, 3], [3, 2, 3, 2], [10, 2, 2, 2], [3, 8, 2, 1],
  // Meeting room
  [21, 4, 8, 3], [18, 2, 2, 2], [31, 2, 2, 2],
  // AI desks — padded enough that 48px-wide sprites do not clip the furniture.
  [4, 16, 5, 4], [9, 16, 5, 4], [14, 16, 5, 4],
  [4, 23, 5, 4], [9, 23, 5, 4], [14, 23, 5, 4],
  [2, 14, 4, 2], [20, 14, 4, 2], [2, 29, 2, 2], [22, 29, 2, 2],
  // Kitchen
  [31, 15, 5, 3], [43, 16, 4, 3], [28, 18, 3, 2], [49, 17, 2, 2],
  // Creative
  [29, 26, 5, 3], [42, 26, 5, 3], [35, 28, 4, 3],
  [28, 37, 2, 2], [48, 37, 2, 2], [31, 22, 2, 2], [47, 22, 2, 2],
  // Human designer workstation
  [38, 23, 6, 4],
  // Lab
  [4, 34, 4, 2], [10, 34, 5, 3], [3, 38, 2, 1], [13, 38, 2, 1],
];

const WALL_RECTS: Array<[number, number, number, number]> = [
  // CEO ↔ central connector, leave cols 14-17 open at rows 5-6.
  [2, 10, 12, 1],
  // Meeting bottom wall, doorway at cols 24-26.
  [18, 10, 6, 1], [27, 10, 7, 1],
  // Office right boundary, doors at 17-18 and 26-27.
  [25, 13, 1, 4], [25, 19, 1, 7], [25, 28, 1, 4],
  // Office bottom / lab door at cols 8-10.
  [2, 32, 6, 1], [11, 32, 14, 1],
  // Kitchen / creative wall, door at cols 38-40.
  [26, 21, 12, 1], [41, 21, 11, 1],
];

const INTERACTIONS = [
  { type: 'computer' as const, owner: 'ceo', cell: { x: 7, y: 8 }, label: 'Abrir computador do CEO' },
  { type: 'computer' as const, owner: 'designer-human', cell: { x: 41, y: 28 }, label: 'Abrir computador da designer' },
  { type: 'meeting' as const, owner: 'meeting', cell: { x: 25, y: 9 }, label: 'Abrir sala de reunião' },
];

function inRect(cell: Cell, x: number, y: number, width: number, height: number) {
  return cell.x >= x && cell.x < x + width && cell.y >= y && cell.y < y + height;
}

function isWalkable(cell: Cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= COLS || cell.y >= ROWS) return false;

  const inCeo = inRect(cell, 2, 1, 13, 10);
  const inCeoHall = inRect(cell, 14, 5, 4, 2);
  const inMeeting = inRect(cell, 18, 1, 16, 10);
  const inMainHall = inRect(cell, 24, 10, 3, 4);
  const inOffice = inRect(cell, 2, 13, 24, 20);
  const inKitchen = inRect(cell, 26, 13, 26, 9);
  const inCreative = inRect(cell, 26, 21, 26, 20);
  const inLab = inRect(cell, 2, 32, 14, 9);
  const inKitchenDoor = inRect(cell, 25, 17, 2, 2);
  const inCreativeDoor = inRect(cell, 25, 26, 2, 2);
  const inLabDoor = inRect(cell, 8, 31, 3, 2);
  const inKitchenCreativeDoor = inRect(cell, 38, 20, 3, 2);

  if (!(
    inCeo || inCeoHall || inMeeting || inMainHall || inOffice || inKitchen ||
    inCreative || inLab || inKitchenDoor || inCreativeDoor || inLabDoor ||
    inKitchenCreativeDoor
  )) return false;

  if (WALL_RECTS.some(([x, y, width, height]) => inRect(cell, x, y, width, height))) return false;
  if (SOLID_RECTS.some(([x, y, width, height]) => inRect(cell, x, y, width, height))) return false;
  return true;
}

function cellKey(cell: Cell) {
  return `${cell.x}:${cell.y}`;
}

function centerOf(cell: Cell) {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2 };
}

function nearestWalkableCell(x: number, y: number): Cell {
  const base = {
    x: Math.max(0, Math.min(COLS - 1, Math.floor(x / TILE))),
    y: Math.max(0, Math.min(ROWS - 1, Math.floor(y / TILE))),
  };
  if (isWalkable(base)) return base;

  for (let radius = 1; radius < 10; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const candidate = { x: base.x + dx, y: base.y + dy };
        if (isWalkable(candidate)) return candidate;
      }
    }
  }
  return { x: 20, y: 18 };
}

function neighbors(cell: Cell) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter(isWalkable);
}

function heuristic(a: Cell, b: Cell) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start: Cell, goal: Cell): Cell[] {
  const safeGoal = isWalkable(goal) ? goal : nearestWalkableCell(...Object.values(centerOf(goal)) as [number, number]);
  if (start.x === safeGoal.x && start.y === safeGoal.y) return [];

  const open = new Map<string, { cell: Cell; f: number }>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const cells = new Map<string, Cell>();

  const startKey = cellKey(start);
  open.set(startKey, { cell: start, f: heuristic(start, safeGoal) });
  gScore.set(startKey, 0);
  cells.set(startKey, start);

  while (open.size) {
    const currentEntry = [...open.entries()].sort((a, b) => a[1].f - b[1].f)[0];
    const [currentKey, currentInfo] = currentEntry;
    const current = currentInfo.cell;
    open.delete(currentKey);

    if (current.x === safeGoal.x && current.y === safeGoal.y) {
      const path: Cell[] = [current];
      let walkKey = currentKey;
      while (cameFrom.has(walkKey)) {
        walkKey = cameFrom.get(walkKey)!;
        const previous = cells.get(walkKey);
        if (previous) path.unshift(previous);
      }
      return path.slice(1);
    }

    for (const next of neighbors(current)) {
      const nextKey = cellKey(next);
      cells.set(nextKey, next);
      const tentative = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1;
      if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      cameFrom.set(nextKey, currentKey);
      gScore.set(nextKey, tentative);
      open.set(nextKey, { cell: next, f: tentative + heuristic(next, safeGoal) });
    }
  }
  return [];
}

function currentTask(tasks: TaskLite[], workerId: string) {
  return tasks.find(
    (task) =>
      task.workerId === workerId &&
      ['working', 'waiting_approval', 'paused', 'queued'].includes(task.status),
  ) || null;
}

function visualState(tasks: TaskLite[], workerId: string): TaskStatus | 'idle' {
  return currentTask(tasks, workerId)?.status || 'idle';
}

function desiredTarget(
  workerId: string,
  state: TaskStatus | 'idle',
  motion: MotionState,
  now: number,
) {
  if (state === 'working') {
    return { key: 'work', cell: HOME_TARGET[workerId] || { x: 20, y: 18 }, idleIndex: motion.idleIndex, nextIdleAt: now + 5000 };
  }
  if (state === 'waiting_approval') {
    return { key: 'meeting', cell: MEETING_TARGET[workerId] || { x: 25, y: 9 }, idleIndex: motion.idleIndex, nextIdleAt: now + 5000 };
  }
  if (state === 'paused') {
    return { key: 'pause', cell: PAUSE_TARGET[workerId] || { x: 36, y: 32 }, idleIndex: motion.idleIndex, nextIdleAt: now + 5000 };
  }
  if (state === 'queued') {
    return { key: 'queue', cell: QUEUE_TARGET[workerId] || { x: 20, y: 18 }, idleIndex: motion.idleIndex, nextIdleAt: now + 5000 };
  }

  const list = IDLE_TARGETS[workerId] || [{ x: 20, y: 18 }];
  let idleIndex = motion.idleIndex % list.length;
  let nextIdleAt = motion.nextIdleAt;
  const currentCell = nearestWalkableCell(motion.x, motion.y);
  const destination = list[idleIndex];
  const atDestination =
    currentCell.x === destination.x &&
    currentCell.y === destination.y &&
    motion.path.length === 0;

  if (atDestination && now >= nextIdleAt) {
    idleIndex = (idleIndex + 1) % list.length;
    nextIdleAt = now + 8500 + idleIndex * 900;
  }

  return {
    key: `idle:${idleIndex}`,
    cell: list[idleIndex],
    idleIndex,
    nextIdleAt,
  };
}

function directionFor(dx: number, dy: number, fallback: Direction): Direction {
  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function spriteFrame(
  state: TaskStatus | 'idle' | 'human',
  walking: boolean,
  direction: Direction,
  tick: number,
) {
  const row = direction === 'up' ? 1 : direction === 'left' || direction === 'right' ? 2 : 0;
  const flip = direction === 'left';

  if (walking) {
    const frames = [0, 1, 2, 1];
    return { row, frame: frames[Math.floor(tick / 2) % frames.length], flip };
  }

  if (state === 'working') return { row: 1, frame: tick % 2 === 0 ? 3 : 4, flip: false };
  if (state === 'waiting_approval') return { row: 0, frame: tick % 2 === 0 ? 5 : 6, flip: false };
  return { row, frame: 1, flip };
}

function defaultHumanPosition(member: OfficeMember) {
  if (member.officeRole === 'ceo') return centerOf({ x: 7, y: 8 });
  if (member.officeRole === 'designer') return centerOf({ x: 41, y: 29 });
  return centerOf({ x: 21, y: 28 });
}

function memberDirection(value?: string): Direction {
  return value === 'up' || value === 'left' || value === 'right' ? value : 'down';
}

export const PixelOfficeWorld: React.FC<PixelOfficeWorldProps> = ({
  workers,
  tasks,
  officeMembers = [],
  currentUserId,
  selectedWorkerId,
  tick,
  pcTick,
  onSelectWorker,
  onSelectHuman,
  onPlayerMove,
  onInteract,
}) => {
  const [motion, setMotion] = useState<Record<string, MotionState>>({});
  const [player, setPlayer] = useState<MotionState | null>(null);
  const [playerPath, setPlayerPath] = useState<Cell[]>([]);
  const [interaction, setInteraction] = useState<Interaction>(null);
  const tasksRef = useRef(tasks);
  const workersRef = useRef(workers);
  const keysRef = useRef(new Set<string>());
  const presenceRef = useRef(0);
  const worldRef = useRef<HTMLDivElement | null>(null);

  const currentMember = officeMembers.find((member) => member.userId === currentUserId) || null;

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    workersRef.current = workers;
    setMotion((current) => {
      const next = { ...current };
      for (const worker of workers) {
        if (next[worker.id]) continue;
        const home = HOME_TARGET[worker.id] || { x: 20, y: 18 };
        const pos = centerOf(home);
        next[worker.id] = {
          x: pos.x,
          y: pos.y,
          direction: 'up',
          path: [],
          targetKey: 'work',
          idleIndex: 0,
          nextIdleAt: Date.now() + 6000,
        };
      }
      return next;
    });
  }, [workers]);

  useEffect(() => {
    if (!currentMember) {
      setPlayer(null);
      return;
    }
    const fallback = defaultHumanPosition(currentMember);
    const stored = currentMember.position;
    const initial = stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
      ? {
          x: stored.x,
          y: stored.y,
          direction: memberDirection(stored.direction),
        }
      : { ...fallback, direction: 'down' as Direction };
    const safe = nearestWalkableCell(initial.x, initial.y);
    const safePosition = centerOf(safe);
    setPlayer({
      x: safePosition.x,
      y: safePosition.y,
      direction: initial.direction,
      path: [],
      targetKey: 'player',
      idleIndex: 0,
      nextIdleAt: 0,
    });
  }, [currentMember?.userId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysRef.current.add(key);
        setPlayerPath([]);
        event.preventDefault();
      }
      if (key === 'e' && interaction && onInteract) {
        onInteract(interaction);
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [interaction, onInteract]);

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;

      setMotion((current) => {
        const next = { ...current };
        for (const worker of workersRef.current) {
          const existing = next[worker.id];
          if (!existing) continue;

          const state = visualState(tasksRef.current, worker.id);
          const target = desiredTarget(worker.id, state, existing, Date.now());
          let path = existing.path;

          if (existing.targetKey !== target.key) {
            path = findPath(nearestWalkableCell(existing.x, existing.y), target.cell);
          } else if (path.length === 0) {
            const currentCell = nearestWalkableCell(existing.x, existing.y);
            if (currentCell.x !== target.cell.x || currentCell.y !== target.cell.y) {
              path = findPath(currentCell, target.cell);
            }
          }

          let x = existing.x;
          let y = existing.y;
          let direction = existing.direction;
          let remaining = AI_WALK_SPEED * dt;
          const nextPath = [...path];

          while (remaining > 0 && nextPath.length) {
            const point = centerOf(nextPath[0]);
            const dx = point.x - x;
            const dy = point.y - y;
            const distance = Math.hypot(dx, dy);
            direction = directionFor(dx, dy, direction);
            if (distance <= remaining + EPSILON) {
              x = point.x;
              y = point.y;
              remaining -= distance;
              nextPath.shift();
            } else if (distance > 0) {
              x += (dx / distance) * remaining;
              y += (dy / distance) * remaining;
              remaining = 0;
            }
          }

          next[worker.id] = {
            x,
            y,
            direction,
            path: nextPath,
            targetKey: target.key,
            idleIndex: target.idleIndex,
            nextIdleAt: target.nextIdleAt,
          };
        }
        return next;
      });

      setPlayer((current) => {
        if (!current) return current;
        let x = current.x;
        let y = current.y;
        let direction = current.direction;
        let walking = false;
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;

        let remainingPath = [...playerPath];

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy) || 1;
          const stepX = (dx / length) * PLAYER_WALK_SPEED * dt;
          const stepY = (dy / length) * PLAYER_WALK_SPEED * dt;
          const nextX = x + stepX;
          const nextY = y + stepY;
          direction = directionFor(stepX, stepY, direction);

          if (isWalkable(nearestWalkableCell(nextX, y))) x = nextX;
          if (isWalkable(nearestWalkableCell(x, nextY))) y = nextY;
          remainingPath = [];
          walking = true;
        } else if (remainingPath.length) {
          let remaining = PLAYER_WALK_SPEED * dt;
          while (remaining > 0 && remainingPath.length) {
            const point = centerOf(remainingPath[0]);
            const pathDx = point.x - x;
            const pathDy = point.y - y;
            const distance = Math.hypot(pathDx, pathDy);
            direction = directionFor(pathDx, pathDy, direction);
            walking = true;
            if (distance <= remaining + EPSILON) {
              x = point.x;
              y = point.y;
              remaining -= distance;
              remainingPath.shift();
            } else if (distance > 0) {
              x += (pathDx / distance) * remaining;
              y += (pathDy / distance) * remaining;
              remaining = 0;
            }
          }
          if (remainingPath.length !== playerPath.length) setPlayerPath(remainingPath);
        }

        const playerCell = nearestWalkableCell(x, y);
        let nextInteraction: Interaction = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const item of INTERACTIONS) {
          const distance = heuristic(playerCell, item.cell);
          if (distance <= 2 && distance < bestDistance) {
            const ownerUid =
              item.owner === 'ceo'
                ? officeMembers.find((member) => member.officeRole === 'ceo')?.userId
                : item.owner === 'designer-human'
                  ? officeMembers.find((member) => member.officeRole === 'designer')?.userId
                  : undefined;
            nextInteraction = item.type === 'computer'
              ? { type: 'computer', label: item.label, ownerUid }
              : { type: 'meeting', label: item.label };
            bestDistance = distance;
          }
        }
        setInteraction(nextInteraction);

        if (walking && onPlayerMove && now - presenceRef.current > 850) {
          presenceRef.current = now;
          onPlayerMove({ x, y, direction });
        }

        return { ...current, x, y, direction, path: remainingPath };
      });

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [officeMembers, onPlayerMove]);

  const taskMap = useMemo(
    () => new Map(workers.map((worker) => [worker.id, currentTask(tasks, worker.id)])),
    [workers, tasks],
  );

  const clickWorld = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!player || !worldRef.current) return;
    const rect = worldRef.current.getBoundingClientRect();
    const scaleX = WORLD_W / rect.width;
    const scaleY = WORLD_H / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const target = nearestWalkableCell(x, y);
    const start = nearestWalkableCell(player.x, player.y);
    setPlayerPath(findPath(start, target));
  };

  const humanPositions = officeMembers
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const fallback = defaultHumanPosition(member);
      const position = member.position && Number.isFinite(member.position.x) && Number.isFinite(member.position.y)
        ? member.position
        : fallback;
      return {
        member,
        x: position.x,
        y: position.y,
        direction: memberDirection('direction' in position ? position.direction : undefined),
      };
    });

  const currentFrame = player
    ? spriteFrame('human', playerPath.length > 0 || keysRef.current.size > 0, player.direction, tick)
    : null;

  return (
    <div className="pixel-game-scroll">
      <div className="pixel-game-stage-v3">
        <div
          className="pixel-game-world-v3"
          ref={worldRef}
          style={{ width: WORLD_W, height: WORLD_H }}
          onClick={clickWorld}
        >
          <div className="office-room-v3 room-ceo"><span>SALA DO CEO</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>
          <div className="office-room-v3 room-meeting"><span>SALA DE REUNIÃO</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>
          <div className="office-hall-v3 hall-ceo" />
          <div className="office-hall-v3 hall-main" />
          <div className="office-room-v3 room-office"><span>OPERAÇÃO</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>
          <div className="office-room-v3 room-kitchen"><span>COPA</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>
          <div className="office-room-v3 room-creative"><span>SALA CRIATIVA</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>
          <div className="office-room-v3 room-lab"><span>LABORATÓRIO</span><i className="room-wall wall-top" /><i className="room-wall wall-left" /></div>

          <div className="door-frame door-ceo"><i /></div>
          <div className="door-frame door-meeting"><i /></div>
          <div className="door-frame door-kitchen"><i /></div>
          <div className="door-frame door-creative"><i /></div>
          <div className="door-frame door-lab"><i /></div>
          <div className="door-frame door-kitchen-creative"><i /></div>

          {/* CEO furniture */}
          <img className="v3-furniture ceo-books" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="v3-furniture ceo-plant" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="v3-furniture ceo-painting" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
          <div className="human-workstation ceo-workstation">
            <img className="v3-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
            <img className="v3-desk" src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="" />
            <img className="v3-pc" src="/pixel-agents/assets/furniture/PC/PC_FRONT_ON_2.png" alt="" />
          </div>

          {/* Meeting */}
          <img className="v3-furniture meeting-picture-v3" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
          <img className="v3-furniture meeting-plant-v3 a" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="v3-furniture meeting-plant-v3 b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="v3-furniture meeting-table-v3" src="/pixel-agents/assets/furniture/TABLE_FRONT/TABLE_FRONT.png" alt="" />

          {/* Operation */}
          <img className="v3-furniture office-books-v3 a" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="v3-furniture office-books-v3 b" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="v3-furniture office-plant-v3 a" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="v3-furniture office-plant-v3 b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />

          {AI_DESKS.map((desk) => {
            const task = taskMap.get(desk.workerId);
            const pc = task?.status === 'working'
              ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${pcTick + 1}.png`
              : '/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png';
            return (
              <button
                key={desk.workerId}
                type="button"
                className={`ai-workstation-v3 ${selectedWorkerId === desk.workerId ? 'selected' : ''}`}
                style={{ left: desk.col * TILE, top: desk.row * TILE }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectWorker(desk.workerId);
                }}
              >
                <img className="v3-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
                <img className="v3-desk" src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="" />
                <img className="v3-pc" src={pc} alt="" />
              </button>
            );
          })}

          {/* Kitchen */}
          <img className="v3-furniture kitchen-table-v3" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="v3-furniture kitchen-coffee-v3" src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="" />
          <img className="v3-furniture kitchen-bench-v3" src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="" />
          <img className="v3-furniture kitchen-bin-v3" src="/pixel-agents/assets/furniture/BIN/BIN.png" alt="" />
          <img className="v3-furniture kitchen-plant-v3" src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="" />

          {/* Creative */}
          <img className="v3-furniture creative-books-v3 a" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="v3-furniture creative-books-v3 b" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="v3-furniture creative-sofa-v3 a" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="v3-furniture creative-sofa-v3 b" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="v3-furniture creative-table-v3" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />
          <div className="human-workstation designer-workstation">
            <img className="v3-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
            <img className="v3-desk" src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="" />
            <img className="v3-pc" src="/pixel-agents/assets/furniture/PC/PC_FRONT_ON_1.png" alt="" />
          </div>
          <img className="v3-furniture creative-plant-v3 a" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="v3-furniture creative-plant-v3 b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />

          {/* Lab */}
          <img className="v3-furniture lab-board-v3" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
          <img className="v3-furniture lab-books-v3" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="v3-furniture lab-table-v3" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="v3-furniture lab-pc-v3" src="/pixel-agents/assets/furniture/PC/PC_FRONT_ON_2.png" alt="" />
          <img className="v3-furniture lab-cactus-v3" src="/pixel-agents/assets/furniture/CACTUS/CACTUS.png" alt="" />

          {workers.map((worker) => {
            const state = visualState(tasks, worker.id);
            const agent = motion[worker.id];
            if (!agent) return null;
            const walking = agent.path.length > 0;
            const frame = spriteFrame(state, walking, agent.direction, tick);
            const task = taskMap.get(worker.id);
            const thought = worker.brain?.lastThought;

            return (
              <button
                key={worker.id}
                type="button"
                className={`game-agent-v3 state-${state} ${walking ? 'is-walking' : ''} ${selectedWorkerId === worker.id ? 'selected' : ''}`}
                style={{ left: agent.x, top: agent.y, zIndex: 100 + Math.floor(agent.y) }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectWorker(worker.id);
                }}
                title={thought || (task ? `${worker.name}: ${task.title}` : `${worker.name}: livre`)}
              >
                <span
                  className="game-agent-sprite-v3"
                  style={{
                    backgroundImage: `url('/pixel-agents/assets/characters/char_${worker.palette}.png')`,
                    backgroundPosition: `${-frame.frame * 48}px ${-frame.row * 96}px`,
                    transform: frame.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                <span className="game-agent-label-v3">
                  <strong>{worker.name}</strong>
                  <small>{walking ? 'andando' : state === 'idle' ? (worker.brain?.mood || 'livre') : task?.title || worker.role}</small>
                </span>
                {state === 'working' && <i className="game-agent-bubble-v3 working">•••</i>}
                {state === 'waiting_approval' && <i className="game-agent-bubble-v3 approval">!</i>}
                {!walking && state === 'idle' && thought && <i className="game-thought-bubble">💭</i>}
              </button>
            );
          })}

          {humanPositions.map(({ member, x, y, direction }) => {
            const frame = spriteFrame('human', false, direction, tick);
            return (
              <button
                key={member.userId}
                type="button"
                className="human-agent-v3"
                style={{ left: x, top: y, zIndex: 160 + Math.floor(y) }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectHuman?.(member.userId);
                }}
              >
                <span
                  className="game-agent-sprite-v3"
                  style={{
                    backgroundImage: `url('/pixel-agents/assets/characters/char_${member.palette}.png')`,
                    backgroundPosition: `${-frame.frame * 48}px ${-frame.row * 96}px`,
                    transform: frame.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                <span className="human-agent-label">
                  <strong>{member.displayName}</strong>
                  <small>{member.officeRole === 'ceo' ? 'CEO' : member.title}</small>
                </span>
              </button>
            );
          })}

          {player && currentMember && currentFrame && (
            <button
              type="button"
              className="human-agent-v3 current-player"
              style={{ left: player.x, top: player.y, zIndex: 220 + Math.floor(player.y) }}
              onClick={(event) => event.stopPropagation()}
            >
              <span
                className="game-agent-sprite-v3"
                style={{
                  backgroundImage: `url('/pixel-agents/assets/characters/char_${currentMember.palette}.png')`,
                  backgroundPosition: `${-currentFrame.frame * 48}px ${-currentFrame.row * 96}px`,
                  transform: currentFrame.flip ? 'scaleX(-1)' : undefined,
                }}
              />
              <span className="human-agent-label">
                <strong>{currentMember.displayName}</strong>
                <small>{currentMember.officeRole === 'ceo' ? 'Você · CEO' : 'Você · ' + currentMember.title}</small>
              </span>
              {currentMember.officeRole === 'ceo' && <i className="ceo-crown">★</i>}
            </button>
          )}

          {interaction && (
            <div className="game-interaction-prompt">
              <kbd>E</kbd>
              <span>{interaction.label}</span>
            </div>
          )}

          <div className="game-controls-hint">
            <span><kbd>WASD</kbd> ou setas para andar</span>
            <span>clique no chão para ir até lá</span>
            <span><kbd>E</kbd> para interagir</span>
          </div>
        </div>
      </div>
    </div>
  );
};
