import React, { useEffect, useMemo, useRef, useState } from 'react';

type Worker = {
  id: string;
  name: string;
  role: string;
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

interface PixelOfficeWorldProps {
  workers: Worker[];
  tasks: TaskLite[];
  selectedWorkerId: string;
  tick: number;
  pcTick: number;
  onSelectWorker: (workerId: string) => void;
}

const TILE = 32;
const COLS = 48;
const ROWS = 38;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const WALK_SPEED = 38; // px/s — intentionally closer to a walking pace than a run.
const EPSILON = 1.5;

const HOME_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 7, y: 20 },
  frontend: { x: 12, y: 20 },
  backend: { x: 17, y: 20 },
  designer: { x: 7, y: 26 },
  qa: { x: 12, y: 26 },
  growth: { x: 17, y: 26 },
};

const MEETING_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 22, y: 3 },
  frontend: { x: 19, y: 5 },
  backend: { x: 27, y: 5 },
  designer: { x: 20, y: 8 },
  qa: { x: 26, y: 8 },
  growth: { x: 23, y: 8 },
};

const QUEUE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 6, y: 21 },
  frontend: { x: 11, y: 21 },
  backend: { x: 16, y: 21 },
  designer: { x: 6, y: 28 },
  qa: { x: 11, y: 28 },
  growth: { x: 16, y: 28 },
};

const IDLE_TARGETS: Record<string, Cell[]> = {
  'lumy-manager': [{ x: 21, y: 17 }, { x: 23, y: 11 }, { x: 35, y: 24 }],
  frontend: [{ x: 19, y: 17 }, { x: 32, y: 26 }, { x: 36, y: 18 }],
  backend: [{ x: 8, y: 34 }, { x: 20, y: 18 }, { x: 36, y: 16 }],
  designer: [{ x: 33, y: 29 }, { x: 39, y: 31 }, { x: 20, y: 22 }],
  qa: [{ x: 11, y: 34 }, { x: 20, y: 23 }, { x: 20, y: 19 }],
  growth: [{ x: 38, y: 27 }, { x: 34, y: 17 }, { x: 31, y: 30 }],
};

const PAUSE_TARGET: Record<string, Cell> = {
  'lumy-manager': { x: 34, y: 29 },
  frontend: { x: 32, y: 29 },
  backend: { x: 36, y: 29 },
  designer: { x: 38, y: 29 },
  qa: { x: 34, y: 32 },
  growth: { x: 38, y: 32 },
};

const DESKS = [
  { workerId: 'lumy-manager', col: 5, row: 16 },
  { workerId: 'frontend', col: 10, row: 16 },
  { workerId: 'backend', col: 15, row: 16 },
  { workerId: 'designer', col: 5, row: 22 },
  { workerId: 'qa', col: 10, row: 22 },
  { workerId: 'growth', col: 15, row: 22 },
];

const BLOCKED_RECTS: Array<[number, number, number, number]> = [
  // Office desks (x, y, width, height in grid cells).
  [5, 16, 4, 3], [10, 16, 4, 3], [15, 16, 4, 3],
  [5, 22, 4, 3], [10, 22, 4, 3], [15, 22, 4, 3],
  // Office bookcases / plants.
  [2, 14, 3, 2], [20, 14, 3, 2], [2, 27, 2, 2], [21, 27, 2, 2],
  // Meeting table + furniture.
  [20, 4, 7, 3], [16, 2, 2, 2], [28, 2, 2, 2],
  // Kitchen.
  [31, 15, 4, 2], [27, 18, 2, 2], [41, 17, 2, 2],
  // Creative room.
  [28, 26, 4, 2], [39, 26, 4, 2], [34, 27, 3, 2],
  [27, 34, 2, 2], [42, 34, 2, 2], [31, 22, 2, 2], [41, 22, 2, 2],
  // Lab.
  [4, 32, 3, 2], [9, 32, 4, 2], [3, 35, 2, 1], [12, 35, 2, 1],
];

const WALL_BLOCKS: Array<[number, number, number, number]> = [
  // Boundary between office and kitchen except the door at rows 16-17.
  [24, 13, 1, 3], [24, 18, 1, 3],
  // Boundary between office and creative except rows 24-25.
  [24, 21, 1, 3], [24, 26, 1, 4],
  // Boundary between office and lab except cols 8-9.
  [2, 29, 6, 1], [10, 29, 5, 1],
  // Boundary between copa and sala criativa except cols 34-35.
  [25, 20, 9, 1], [36, 20, 9, 1],
];

function inRect(cell: Cell, x: number, y: number, width: number, height: number) {
  return cell.x >= x && cell.x < x + width && cell.y >= y && cell.y < y + height;
}

function isWalkable(cell: Cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= COLS || cell.y >= ROWS) return false;

  const inMeeting = inRect(cell, 15, 1, 16, 9);
  const inHall = inRect(cell, 22, 10, 3, 4);
  const inOffice = inRect(cell, 2, 13, 23, 17);
  const inKitchen = inRect(cell, 25, 13, 20, 8);
  const inCreative = inRect(cell, 25, 21, 20, 16);
  const inLab = inRect(cell, 2, 30, 13, 7);
  const inKitchenDoor = inRect(cell, 24, 16, 2, 2);
  const inCreativeDoor = inRect(cell, 24, 24, 2, 2);
  const inLabDoor = inRect(cell, 8, 29, 2, 2);

  if (!(inMeeting || inHall || inOffice || inKitchen || inCreative || inLab || inKitchenDoor || inCreativeDoor || inLabDoor)) {
    return false;
  }

  const blocked = [...BLOCKED_RECTS, ...WALL_BLOCKS].some(([x, y, width, height]) =>
    inRect(cell, x, y, width, height),
  );
  return !blocked;
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

  for (let radius = 1; radius < 8; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const candidate = { x: base.x + dx, y: base.y + dy };
        if (isWalkable(candidate)) return candidate;
      }
    }
  }
  return { x: 20, y: 17 };
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
  if (!isWalkable(goal)) return [];
  if (start.x === goal.x && start.y === goal.y) return [];

  const open = new Map<string, { cell: Cell; f: number }>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const cells = new Map<string, Cell>();

  const startKey = cellKey(start);
  open.set(startKey, { cell: start, f: heuristic(start, goal) });
  gScore.set(startKey, 0);
  cells.set(startKey, start);

  while (open.size) {
    const currentEntry = [...open.entries()].sort((a, b) => a[1].f - b[1].f)[0];
    const [currentKey, currentInfo] = currentEntry;
    const current = currentInfo.cell;
    open.delete(currentKey);

    if (current.x === goal.x && current.y === goal.y) {
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
      open.set(nextKey, { cell: next, f: tentative + heuristic(next, goal) });
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
): { key: string; cell: Cell; idleIndex: number; nextIdleAt: number } {
  if (state === 'working') {
    return {
      key: 'work',
      cell: HOME_TARGET[workerId] || { x: 20, y: 17 },
      idleIndex: motion.idleIndex,
      nextIdleAt: now + 5000,
    };
  }
  if (state === 'waiting_approval') {
    return {
      key: 'meeting',
      cell: MEETING_TARGET[workerId] || { x: 23, y: 8 },
      idleIndex: motion.idleIndex,
      nextIdleAt: now + 5000,
    };
  }
  if (state === 'paused') {
    return {
      key: 'pause',
      cell: PAUSE_TARGET[workerId] || { x: 34, y: 29 },
      idleIndex: motion.idleIndex,
      nextIdleAt: now + 5000,
    };
  }
  if (state === 'queued') {
    return {
      key: 'queue',
      cell: QUEUE_TARGET[workerId] || { x: 20, y: 17 },
      idleIndex: motion.idleIndex,
      nextIdleAt: now + 5000,
    };
  }

  const list = IDLE_TARGETS[workerId] || [{ x: 20, y: 17 }];
  let idleIndex = motion.idleIndex % list.length;
  let nextIdleAt = motion.nextIdleAt;

  const currentCell = nearestWalkableCell(motion.x, motion.y);
  const destination = list[idleIndex];
  const atDestination = currentCell.x === destination.x && currentCell.y === destination.y && motion.path.length === 0;

  if (atDestination && now >= nextIdleAt) {
    idleIndex = (idleIndex + 1) % list.length;
    nextIdleAt = now + 7000 + idleIndex * 850;
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
  state: TaskStatus | 'idle',
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

export const PixelOfficeWorld: React.FC<PixelOfficeWorldProps> = ({
  workers,
  tasks,
  selectedWorkerId,
  tick,
  pcTick,
  onSelectWorker,
}) => {
  const [motion, setMotion] = useState<Record<string, MotionState>>({});
  const tasksRef = useRef(tasks);
  const workersRef = useRef(workers);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    workersRef.current = workers;
    setMotion((current) => {
      const next = { ...current };
      for (const worker of workers) {
        if (next[worker.id]) continue;
        const home = HOME_TARGET[worker.id] || { x: 20, y: 17 };
        const pos = centerOf(home);
        next[worker.id] = {
          x: pos.x,
          y: pos.y,
          direction: 'up',
          path: [],
          targetKey: 'work',
          idleIndex: 0,
          nextIdleAt: Date.now() + 4500,
        };
      }
      return next;
    });
  }, [workers]);

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
            const start = nearestWalkableCell(existing.x, existing.y);
            path = findPath(start, target.cell);
          } else if (path.length === 0) {
            const currentCell = nearestWalkableCell(existing.x, existing.y);
            if (currentCell.x !== target.cell.x || currentCell.y !== target.cell.y) {
              path = findPath(currentCell, target.cell);
            }
          }

          let x = existing.x;
          let y = existing.y;
          let direction = existing.direction;
          let remaining = WALK_SPEED * dt;
          let nextPath = [...path];

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

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const taskMap = useMemo(
    () => new Map(workers.map((worker) => [worker.id, currentTask(tasks, worker.id)])),
    [workers, tasks],
  );

  return (
    <div className="pixel-game-scroll">
      <div className="pixel-game-stage">
        <div className="pixel-game-world" style={{ width: WORLD_W, height: WORLD_H }}>
          <div className="game-room game-room-meeting"><span>SALA DE REUNIÃO</span></div>
          <div className="game-hall game-hall-main" />
          <div className="game-room game-room-office"><span>OPERAÇÃO</span></div>
          <div className="game-room game-room-kitchen"><span>COPA</span></div>
          <div className="game-room game-room-creative"><span>SALA CRIATIVA</span></div>
          <div className="game-room game-room-lab"><span>LABORATÓRIO</span></div>

          <div className="game-door game-door-kitchen" />
          <div className="game-door game-door-creative" />
          <div className="game-door game-door-lab" />
          <div className="game-door game-door-kitchen-creative" />

          {/* Meeting furniture */}
          <img className="game-furniture meeting-board" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
          <img className="game-furniture meeting-plant-a" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="game-furniture meeting-plant-b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="game-furniture meeting-table" src="/pixel-agents/assets/furniture/TABLE_FRONT/TABLE_FRONT.png" alt="" />
          <img className="game-furniture meeting-chair mc1" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="game-furniture meeting-chair mc2" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="game-furniture meeting-chair mc3" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="game-furniture meeting-chair mc4" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />

          {/* Office furniture */}
          <img className="game-furniture office-books ob1" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="game-furniture office-books ob2" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="game-furniture office-plant op1" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="game-furniture office-plant op2" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />

          {DESKS.map((desk) => {
            const task = taskMap.get(desk.workerId);
            const pc = task?.status === 'working'
              ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${pcTick + 1}.png`
              : '/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png';

            return (
              <button
                key={desk.workerId}
                type="button"
                className={`game-workstation ${selectedWorkerId === desk.workerId ? 'selected' : ''}`}
                style={{ left: desk.col * TILE, top: desk.row * TILE }}
                onClick={() => onSelectWorker(desk.workerId)}
                aria-label="Selecionar funcionário desta mesa"
              >
                <img className="game-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
                <img className="game-desk" src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="" />
                <img className="game-pc" src={pc} alt="" />
              </button>
            );
          })}

          {/* Kitchen */}
          <img className="game-furniture kitchen-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="game-furniture kitchen-coffee" src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="" />
          <img className="game-furniture kitchen-bench" src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="" />
          <img className="game-furniture kitchen-bin" src="/pixel-agents/assets/furniture/BIN/BIN.png" alt="" />
          <img className="game-furniture kitchen-plant" src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="" />

          {/* Creative room */}
          <img className="game-furniture creative-books cb1" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="game-furniture creative-books cb2" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="game-furniture creative-picture" src="/pixel-agents/assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png" alt="" />
          <img className="game-furniture creative-sofa cs1" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="game-furniture creative-sofa cs2" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="game-furniture creative-table" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />
          <img className="game-furniture creative-plant cp1" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="game-furniture creative-plant cp2" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />

          {/* Lab */}
          <img className="game-furniture lab-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
          <img className="game-furniture lab-books" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="game-furniture lab-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="game-furniture lab-pc" src="/pixel-agents/assets/furniture/PC/PC_FRONT_ON_2.png" alt="" />
          <img className="game-furniture lab-cactus" src="/pixel-agents/assets/furniture/CACTUS/CACTUS.png" alt="" />

          {workers.map((worker) => {
            const state = visualState(tasks, worker.id);
            const agent = motion[worker.id];
            if (!agent) return null;
            const walking = agent.path.length > 0;
            const frame = spriteFrame(state, walking, agent.direction, tick);
            const task = taskMap.get(worker.id);

            return (
              <button
                key={worker.id}
                type="button"
                className={`game-agent state-${state} ${walking ? 'is-walking' : ''} ${selectedWorkerId === worker.id ? 'selected' : ''}`}
                style={{ left: agent.x, top: agent.y }}
                onClick={() => onSelectWorker(worker.id)}
                title={task ? `${worker.name}: ${task.title}` : `${worker.name}: livre`}
                aria-label={`Selecionar ${worker.name}`}
              >
                <span
                  className="game-agent-sprite"
                  style={{
                    backgroundImage: `url('/pixel-agents/assets/characters/char_${worker.palette}.png')`,
                    backgroundPosition: `${-frame.frame * 48}px ${-frame.row * 96}px`,
                    transform: frame.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                <span className="game-agent-label">
                  <strong>{worker.name}</strong>
                  <small>{walking ? 'andando' : state === 'idle' ? 'livre' : task?.title || worker.role}</small>
                </span>
                {state === 'working' && <i className="game-agent-bubble working">•••</i>}
                {state === 'waiting_approval' && <i className="game-agent-bubble approval">!</i>}
                {state === 'queued' && <i className="game-agent-bubble queued">⌛</i>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
