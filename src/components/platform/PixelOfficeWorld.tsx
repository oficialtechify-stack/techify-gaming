import React, { useEffect, useMemo, useState } from 'react';

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

type OfficeNode = {
  x: number;
  y: number;
  neighbors: string[];
};

type WorkerMotion = {
  node: string;
  direction: 'down' | 'up' | 'left' | 'right';
  walking: boolean;
  idleTarget: string;
};

interface PixelOfficeWorldProps {
  workers: Worker[];
  tasks: TaskLite[];
  selectedWorkerId: string;
  tick: number;
  pcTick: number;
  onSelectWorker: (workerId: string) => void;
}

const NODES: Record<string, OfficeNode> = {
  // Main office / operations
  'office-center': { x: 410, y: 625, neighbors: ['office-door', 'desk-lumy', 'desk-pixel', 'desk-stack', 'desk-iris', 'desk-scout', 'desk-nova', 'office-left', 'office-right'] },
  'office-left': { x: 220, y: 625, neighbors: ['office-center', 'lab-door', 'desk-lumy', 'desk-iris'] },
  'office-right': { x: 620, y: 610, neighbors: ['office-center', 'kitchen-door', 'lounge-door', 'desk-stack', 'desk-nova'] },
  'office-door': { x: 555, y: 350, neighbors: ['office-center', 'hall-low'] },

  // Hall / meeting connection
  'hall-low': { x: 555, y: 300, neighbors: ['office-door', 'hall-mid'] },
  'hall-mid': { x: 555, y: 255, neighbors: ['hall-low', 'meeting-door'] },
  'meeting-door': { x: 555, y: 220, neighbors: ['hall-mid', 'meeting-center'] },
  'meeting-center': { x: 555, y: 145, neighbors: ['meeting-door', 'meeting-l', 'meeting-r', 'meeting-top'] },
  'meeting-l': { x: 480, y: 150, neighbors: ['meeting-center'] },
  'meeting-r': { x: 630, y: 150, neighbors: ['meeting-center'] },
  'meeting-top': { x: 555, y: 95, neighbors: ['meeting-center'] },

  // Kitchen
  'kitchen-door': { x: 690, y: 405, neighbors: ['office-right', 'kitchen-center'] },
  'kitchen-center': { x: 825, y: 410, neighbors: ['kitchen-door', 'kitchen-coffee', 'kitchen-water'] },
  'kitchen-coffee': { x: 900, y: 395, neighbors: ['kitchen-center'] },
  'kitchen-water': { x: 770, y: 425, neighbors: ['kitchen-center'] },

  // Lounge / creative room
  'lounge-door': { x: 690, y: 690, neighbors: ['office-right', 'lounge-center'] },
  'lounge-center': { x: 835, y: 745, neighbors: ['lounge-door', 'lounge-sofa', 'lounge-window'] },
  'lounge-sofa': { x: 815, y: 835, neighbors: ['lounge-center'] },
  'lounge-window': { x: 920, y: 710, neighbors: ['lounge-center'] },

  // Lab
  'lab-door': { x: 190, y: 745, neighbors: ['office-left', 'lab-center'] },
  'lab-center': { x: 175, y: 835, neighbors: ['lab-door', 'lab-terminal', 'lab-board'] },
  'lab-terminal': { x: 265, y: 855, neighbors: ['lab-center'] },
  'lab-board': { x: 120, y: 795, neighbors: ['lab-center'] },

  // Desk seats: characters sit below desks and face UP.
  'desk-lumy': { x: 255, y: 585, neighbors: ['office-center', 'office-left'] },
  'desk-pixel': { x: 410, y: 585, neighbors: ['office-center'] },
  'desk-stack': { x: 565, y: 585, neighbors: ['office-center', 'office-right'] },
  'desk-iris': { x: 255, y: 715, neighbors: ['office-left', 'office-center'] },
  'desk-scout': { x: 410, y: 715, neighbors: ['office-center'] },
  'desk-nova': { x: 565, y: 715, neighbors: ['office-right', 'office-center'] },
};

const HOME_NODE: Record<string, string> = {
  'lumy-manager': 'desk-lumy',
  frontend: 'desk-pixel',
  backend: 'desk-stack',
  designer: 'desk-iris',
  qa: 'desk-scout',
  growth: 'desk-nova',
};

const MEETING_NODE: Record<string, string> = {
  'lumy-manager': 'meeting-top',
  frontend: 'meeting-l',
  backend: 'meeting-r',
  designer: 'meeting-l',
  qa: 'meeting-r',
  growth: 'meeting-center',
};

const IDLE_NODES = [
  'office-center',
  'kitchen-coffee',
  'kitchen-water',
  'lounge-center',
  'lounge-sofa',
  'lab-center',
  'lab-board',
];

const rolePreferredIdle: Record<string, string[]> = {
  'lumy-manager': ['meeting-center', 'office-center', 'lounge-center'],
  frontend: ['office-center', 'lounge-center', 'kitchen-coffee'],
  backend: ['lab-terminal', 'lab-center', 'kitchen-water'],
  designer: ['lounge-window', 'lounge-sofa', 'office-center'],
  qa: ['lab-board', 'lab-center', 'office-center'],
  growth: ['lounge-center', 'kitchen-coffee', 'lounge-window'],
};

const DESKS = [
  { workerId: 'lumy-manager', x: 175, y: 45 },
  { workerId: 'frontend', x: 330, y: 45 },
  { workerId: 'backend', x: 485, y: 45 },
  { workerId: 'designer', x: 175, y: 175 },
  { workerId: 'qa', x: 330, y: 175 },
  { workerId: 'growth', x: 485, y: 175 },
];

function currentTask(tasks: TaskLite[], workerId: string) {
  return tasks.find((task) =>
    task.workerId === workerId &&
    ['working', 'waiting_approval', 'paused', 'queued'].includes(task.status),
  ) || null;
}

function visualState(tasks: TaskLite[], workerId: string): TaskStatus | 'idle' {
  const task = currentTask(tasks, workerId);
  return task?.status || 'idle';
}

function shortestPath(from: string, to: string): string[] {
  if (from === to) return [from];
  const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];
  const seen = new Set([from]);

  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of NODES[current.node]?.neighbors || []) {
      if (seen.has(neighbor)) continue;
      const path = [...current.path, neighbor];
      if (neighbor === to) return path;
      seen.add(neighbor);
      queue.push({ node: neighbor, path });
    }
  }
  return [from];
}

function directionBetween(from: OfficeNode, to: OfficeNode): WorkerMotion['direction'] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function spriteFrame(
  state: TaskStatus | 'idle',
  walking: boolean,
  direction: WorkerMotion['direction'],
  tick: number,
) {
  const row = direction === 'up' ? 1 : direction === 'left' || direction === 'right' ? 2 : 0;
  const flip = direction === 'left';

  if (walking) {
    const frames = [0, 1, 2, 1];
    return { row, frame: frames[tick % frames.length], flip };
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
  const [motion, setMotion] = useState<Record<string, WorkerMotion>>({});

  useEffect(() => {
    setMotion((current) => {
      const next = { ...current };
      for (const worker of workers) {
        if (next[worker.id]) continue;
        const node = HOME_NODE[worker.id] || 'office-center';
        const preferred = rolePreferredIdle[worker.id] || IDLE_NODES;
        next[worker.id] = {
          node,
          direction: 'up',
          walking: false,
          idleTarget: preferred[0] || 'office-center',
        };
      }
      return next;
    });
  }, [workers]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMotion((current) => {
        const next = { ...current };

        for (const worker of workers) {
          const state = visualState(tasks, worker.id);
          const existing = next[worker.id] || {
            node: HOME_NODE[worker.id] || 'office-center',
            direction: 'up' as const,
            walking: false,
            idleTarget: 'office-center',
          };

          let destination = existing.idleTarget;
          if (state === 'working') {
            destination = HOME_NODE[worker.id] || 'office-center';
          } else if (state === 'waiting_approval') {
            destination = MEETING_NODE[worker.id] || 'meeting-center';
          } else if (state === 'paused') {
            destination = 'lounge-sofa';
          } else if (state === 'queued') {
            destination = 'office-center';
          } else {
            const preferred = rolePreferredIdle[worker.id] || IDLE_NODES;
            if (existing.node === existing.idleTarget) {
              const currentIndex = Math.max(0, preferred.indexOf(existing.idleTarget));
              destination = preferred[(currentIndex + 1) % preferred.length] || IDLE_NODES[0];
            }
          }

          const path = shortestPath(existing.node, destination);
          const nextNodeName = path[1] || existing.node;
          const fromNode = NODES[existing.node] || NODES['office-center'];
          const toNode = NODES[nextNodeName] || fromNode;

          next[worker.id] = {
            node: nextNodeName,
            direction: nextNodeName === existing.node
              ? existing.direction
              : directionBetween(fromNode, toNode),
            walking: nextNodeName !== existing.node,
            idleTarget: destination,
          };
        }

        return next;
      });
    }, 920);

    return () => window.clearInterval(interval);
  }, [workers, tasks]);

  const taskMap = useMemo(
    () => new Map(workers.map((worker) => [worker.id, currentTask(tasks, worker.id)])),
    [workers, tasks],
  );

  return (
    <div className="pixel-world-scroll">
      <div className="pixel-world-stage">
      <div className="pixel-world" aria-label="Escritório completo dos Funcionários IA">
        <div className="pixel-world-void" />

        <section className="pixel-room pixel-room-meeting">
          <span className="pixel-room-title">SALA DE REUNIÃO</span>
          <img className="world-furniture meeting-picture" src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="" />
          <img className="world-furniture meeting-plant plant-a" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="world-furniture meeting-plant plant-b" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="world-furniture world-meeting-table" src="/pixel-agents/assets/furniture/TABLE_FRONT/TABLE_FRONT.png" alt="" />
          <img className="world-furniture world-meeting-chair m1" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="world-furniture world-meeting-chair m2" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="world-furniture world-meeting-chair m3" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="world-furniture world-meeting-chair m4" src="/pixel-agents/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png" alt="" />
          <img className="world-furniture meeting-coffee" src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="" />
        </section>

        <div className="pixel-corridor pixel-corridor-vertical" />
        <div className="pixel-corridor pixel-corridor-junction" />
        <div className="pixel-doorway pixel-doorway-kitchen" />
        <div className="pixel-doorway pixel-doorway-lounge" />
        <div className="pixel-doorway pixel-doorway-lab" />

        <section className="pixel-room pixel-room-office">
          <span className="pixel-room-title">OPERAÇÃO</span>
          <img className="world-furniture office-books b1" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="world-furniture office-books b2" src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="" />
          <img className="world-furniture office-plant-main p1" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="world-furniture office-plant-main p2" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
          <img className="world-furniture office-clock-main" src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="" />

          {DESKS.map((desk) => {
            const task = taskMap.get(desk.workerId);
            const pc = task?.status === 'working'
              ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${pcTick + 1}.png`
              : '/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png';
            return (
              <div
                key={desk.workerId}
                className={`world-workstation ${selectedWorkerId === desk.workerId ? 'selected' : ''}`}
                style={{ left: desk.x, top: desk.y }}
                onClick={() => onSelectWorker(desk.workerId)}
              >
                <img className="world-chair" src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png" alt="" />
                <img className="world-desk" src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="" />
                <img className="world-pc" src={pc} alt="" />
              </div>
            );
          })}
        </section>

        <section className="pixel-room pixel-room-kitchen">
          <span className="pixel-room-title">COPA</span>
          <img className="world-furniture kitchen-clock" src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="" />
          <img className="world-furniture kitchen-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="world-furniture kitchen-coffee" src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="" />
          <img className="world-furniture kitchen-bin" src="/pixel-agents/assets/furniture/BIN/BIN.png" alt="" />
          <img className="world-furniture kitchen-plant" src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="" />
          <img className="world-furniture kitchen-bench" src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="" />
        </section>

        <section className="pixel-room pixel-room-lounge">
          <span className="pixel-room-title">SALA CRIATIVA</span>
          <img className="world-furniture lounge-books lb1" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="world-furniture lounge-books lb2" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="world-furniture lounge-painting" src="/pixel-agents/assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png" alt="" />
          <img className="world-furniture lounge-sofa s1" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="world-furniture lounge-sofa s2" src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="" />
          <img className="world-furniture lounge-table" src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="" />
          <img className="world-furniture lounge-plant l1" src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="" />
          <img className="world-furniture lounge-plant l2" src="/pixel-agents/assets/furniture/LARGE_PLANT/LARGE_PLANT.png" alt="" />
        </section>

        <section className="pixel-room pixel-room-lab">
          <span className="pixel-room-title">LABORATÓRIO</span>
          <img className="world-furniture lab-board" src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png" alt="" />
          <img className="world-furniture lab-bookshelf" src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="" />
          <img className="world-furniture lab-table" src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="" />
          <img className="world-furniture lab-pc" src="/pixel-agents/assets/furniture/PC/PC_FRONT_ON_2.png" alt="" />
          <img className="world-furniture lab-cactus" src="/pixel-agents/assets/furniture/CACTUS/CACTUS.png" alt="" />
        </section>

        {workers.map((worker) => {
          const state = visualState(tasks, worker.id);
          const workerMotion = motion[worker.id] || {
            node: HOME_NODE[worker.id] || 'office-center',
            direction: 'up' as const,
            walking: false,
            idleTarget: 'office-center',
          };
          const node = NODES[workerMotion.node] || NODES['office-center'];
          const frame = spriteFrame(state, workerMotion.walking, workerMotion.direction, tick);
          const task = taskMap.get(worker.id);

          return (
            <button
              key={worker.id}
              type="button"
              className={`world-agent state-${state} ${workerMotion.walking ? 'is-walking' : ''} ${selectedWorkerId === worker.id ? 'selected' : ''}`}
              style={{ left: node.x, top: node.y }}
              onClick={() => onSelectWorker(worker.id)}
              aria-label={`Selecionar ${worker.name}`}
              title={task ? `${worker.name}: ${task.title}` : `${worker.name}: livre`}
            >
              <span
                className="world-agent-sprite"
                style={{
                  backgroundImage: `url('/pixel-agents/assets/characters/char_${worker.palette}.png')`,
                  backgroundPosition: `${-frame.frame * 48}px ${-frame.row * 96}px`,
                  transform: frame.flip ? 'scaleX(-1)' : undefined,
                }}
              />
              <span className="world-agent-name">
                <strong>{worker.name}</strong>
                <small>{state === 'idle' ? 'livre' : task?.title || worker.role}</small>
              </span>
              {state === 'working' && <i className="world-agent-bubble working">•••</i>}
              {state === 'waiting_approval' && <i className="world-agent-bubble approval">!</i>}
              {state === 'queued' && <i className="world-agent-bubble queued">⌛</i>}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
};
