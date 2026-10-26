// 마구간 숨은그림찾기 (누가복음 2장): 잡동사니 사이에 숨은 물건 6개를 90초 안에 찾는다.
// 물건은 판마다 무작위로 골라 무작위 자리에 숨긴다.

const CONFIG = {
  durationSec: 90,
  targets: 6, // 찾을 물건 수 (HIDDEN 수보다 많을 수 없다)
  missPenaltySec: 2, // 엉뚱한 곳을 누르면 줄어드는 시간
  hintAfterSec: 15, // 이 시간 동안 못 찾으면 남은 물건 하나가 반짝인다
  cellSize: 11, // 잡동사니를 까는 칸 크기 (vmin)
  clutterChance: 0.8, // 칸마다 잡동사니가 놓일 확률
  clutterSize: [7, 11], // 잡동사니 크기 (vmin)
  targetSize: 6.5, // 숨은 물건 크기 (vmin). 클수록 쉬움
  coverChance: 0.5, // 숨은 물건 위에 잡동사니가 살짝 겹칠 확률
  hitRadius: 6, // 이 거리 안을 누르면 찾은 것으로 친다 (vmin)
};

// 그림이 준비되면 이모지 대신 경로를 넣는다. 예: dove: 'images/dove.png'
const ASSETS = {
  moon: '🌙',
  baby: '👶',
  mary: '👩',
  joseph: '🧔',
  cow: '🐄',
  sheep: '🐑',
  star: '⭐',
  gift: '🎁',
  dove: '🕊️',
  lamp: '🪔',
  trumpet: '🎺',
  bell: '🔔',
  mouse: '🐭',
  candle: '🕯️',
  crown: '👑',
  key: '🗝️',
  clutter: ['🌾', '🌾', '🌾', '🪵', '🪣', '🧺', '🍂', '🪨', '🌿', '🥕', '🐓', '🐈', '🪶'],
};

// 판마다 이 중에서 CONFIG.targets 개를 골라 숨긴다. 잡동사니(clutter)와 겹치지 않는 그림이어야 한다.
const HIDDEN = [
  { key: 'star', name: '별' },
  { key: 'gift', name: '예물' },
  { key: 'dove', name: '비둘기' },
  { key: 'lamp', name: '등잔' },
  { key: 'trumpet', name: '나팔' },
  { key: 'bell', name: '종' },
  { key: 'mouse', name: '생쥐' },
  { key: 'candle', name: '촛불' },
  { key: 'crown', name: '왕관' },
  { key: 'key', name: '열쇠' },
];

const $ = (id) => document.getElementById(id);
const el = {
  timer: $('timer'),
  time: $('time'),
  gaugeFill: $('gaugeFill'),
  gaugeText: $('gaugeText'),
  scene: $('scene'),
  props: $('props'),
  wants: $('wants'),
  intro: $('intro'),
  countdown: $('countdown'),
  result: $('result'),
  foundCount: $('foundCount'),
};

let state = null;

function newState() {
  return {
    targets: [],
    found: 0,
    running: false,
    endsAt: 0,
    lastFoundAt: 0,
    timerId: 0,
  };
}

const vmin = () => Math.min(window.innerWidth, window.innerHeight) / 100;
const between = ([min, max]) => min + Math.random() * (max - min);

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- 장면 만들기 ----------

// 창문, 그리고 구유·아기·가족·동물을 한데 묶은 영역(장면 기준 px). 이 둘레에는 아무것도 놓지 않는다.
// 인물 사이 빈틈에 물건이 놓여 아기 예수님을 가리지 않도록 가운데 무리는 하나로 묶는다.
function keepClearRects(padding) {
  const scene = el.scene.getBoundingClientRect();
  const toScene = (r) => ({
    left: r.left - scene.left - padding,
    right: r.right - scene.left + padding,
    top: r.top - scene.top - padding,
    bottom: r.bottom - scene.top + padding,
  });
  const holy = [...el.scene.querySelectorAll('.holy *')].map((node) => node.getBoundingClientRect());
  const group = {
    left: Math.min(...holy.map((r) => r.left)),
    right: Math.max(...holy.map((r) => r.right)),
    top: Math.min(...holy.map((r) => r.top)),
    bottom: Math.max(...holy.map((r) => r.bottom)),
  };
  return [toScene(group), toScene(el.scene.querySelector('.window').getBoundingClientRect())];
}

// 장면을 칸으로 나눈 뒤, 숨은 물건을 서로 떨어진 칸에 놓고 나머지 칸을 잡동사니로 채운다.
function buildScene() {
  const w = el.scene.clientWidth;
  const h = el.scene.clientHeight;
  const cell = CONFIG.cellSize * vmin();
  const cols = Math.max(1, Math.floor(w / cell));
  const rows = Math.max(1, Math.floor(h / cell));
  const clear = keepClearRects(cell * 0.35);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * 100;
      const y = ((r + 0.5) / rows) * 100;
      const px = (x / 100) * w;
      const py = (y / 100) * h;
      const blocked = clear.some((z) => px >= z.left && px <= z.right && py >= z.top && py <= z.bottom);
      if (!blocked) cells.push({ c, r, x, y });
    }
  }

  const targetCells = [];
  for (const cell of shuffle(cells)) {
    if (targetCells.length === CONFIG.targets) break;
    const farEnough = targetCells.every((t) => Math.max(Math.abs(t.c - cell.c), Math.abs(t.r - cell.r)) >= 2);
    if (farEnough) targetCells.push(cell);
  }

  el.props.replaceChildren();
  const jitter = () => (Math.random() - 0.5) * (50 / Math.max(cols, rows));
  for (const cell of cells) {
    if (targetCells.includes(cell) || Math.random() > CONFIG.clutterChance) continue;
    placeProp(Game.randomOf(ASSETS.clutter), cell.x + jitter(), cell.y + jitter(), between(CONFIG.clutterSize), 'prop');
  }

  const picked = shuffle(HIDDEN).slice(0, targetCells.length);
  state.targets = picked.map((info, i) => {
    const { x, y } = targetCells[i];
    const node = placeProp(ASSETS[info.key], x, y, CONFIG.targetSize, 'target');
    if (Math.random() < CONFIG.coverChance) cover(x, y);
    return { ...info, x, y, node, found: false };
  });
}

function placeProp(value, x, y, size, className) {
  const node = document.createElement('div');
  node.className = className;
  node.append(Game.sprite(value));
  node.style.left = x + '%';
  node.style.top = y + '%';
  node.style.fontSize = size + 'vmin';
  node.style.setProperty('--tilt', (Math.random() - 0.5) * 60 + 'deg');
  el.props.append(node);
  return node;
}

// 숨은 물건 한쪽 모서리를 잡동사니로 살짝 가린다.
function cover(x, y) {
  const w = el.scene.clientWidth;
  const h = el.scene.clientHeight;
  const offset = CONFIG.targetSize * 0.55 * vmin();
  const dx = (Math.random() < 0.5 ? -1 : 1) * (offset / w) * 100;
  const dy = (Math.random() < 0.5 ? -1 : 1) * (offset / h) * 100;
  placeProp(Game.randomOf(ASSETS.clutter), x + dx, y + dy, 8, 'prop cover');
}

function buildWants() {
  el.wants.replaceChildren(
    ...state.targets.map((target) => {
      const slot = document.createElement('div');
      slot.className = 'want';
      slot.append(Game.sprite(ASSETS[target.key]));
      const name = document.createElement('span');
      name.className = 'want-name';
      name.textContent = target.name;
      slot.append(name);
      target.slot = slot;
      return slot;
    }),
  );
}

// ---------- 찾기 ----------

function tap(e) {
  if (!state || !state.running) return;
  const rect = el.scene.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let nearest = null;
  let nearestDist = CONFIG.hitRadius * vmin();
  for (const target of state.targets) {
    if (target.found) continue;
    const dist = Math.hypot((target.x / 100) * rect.width - x, (target.y / 100) * rect.height - y);
    if (dist <= nearestDist) {
      nearest = target;
      nearestDist = dist;
    }
  }

  if (nearest) found(nearest);
  else miss(x, y);
}

function found(target) {
  target.found = true;
  target.node.classList.remove('hint');
  target.node.classList.add('found');
  target.slot.classList.add('found');
  state.found++;
  state.lastFoundAt = performance.now();
  Game.sound.play('catch');
  updateGauge();
  if (state.found === state.targets.length) finish(true);
}

function miss(x, y) {
  state.endsAt -= CONFIG.missPenaltySec * 1000;
  Game.sound.play('empty');
  const mark = document.createElement('div');
  mark.className = 'miss';
  mark.textContent = `✖ -${CONFIG.missPenaltySec}초`;
  mark.style.left = x + 'px';
  mark.style.top = y + 'px';
  el.scene.append(mark);
  setTimeout(() => mark.remove(), 900);
  tick();
}

// 한동안 못 찾으면 남은 물건 하나를 반짝여 준다.
function maybeHint(now) {
  if (now - state.lastFoundAt < CONFIG.hintAfterSec * 1000) return;
  const left = state.targets.filter((t) => !t.found);
  if (left.length === 0) return;
  const target = Game.randomOf(left);
  target.node.classList.remove('hint');
  void target.node.offsetWidth; // 애니메이션을 처음부터 다시 재생
  target.node.classList.add('hint');
  state.lastFoundAt = now;
}

// ---------- 게임 진행 ----------

function updateGauge() {
  const total = state.targets.length;
  el.gaugeFill.style.width = (state.found / total) * 100 + '%';
  el.gaugeText.textContent = `찾은 물건 ${state.found} / ${total}`;
}

function tick() {
  const now = performance.now();
  const left = Math.max(0, state.endsAt - now);
  el.time.textContent = Math.ceil(left / 1000);
  el.timer.classList.toggle('hurry', left < 10000);
  if (left <= 0) {
    finish(false);
    return;
  }
  maybeHint(now);
}

function startGame() {
  if (state) clearInterval(state.timerId);
  state = newState();

  el.timer.classList.remove('hurry');
  el.time.textContent = CONFIG.durationSec;
  el.intro.hidden = true;
  el.result.hidden = true;
  buildScene();
  buildWants();
  updateGauge();

  Game.countdown(el.countdown, () => {
    state.running = true;
    state.lastFoundAt = performance.now();
    state.endsAt = state.lastFoundAt + CONFIG.durationSec * 1000;
    state.timerId = setInterval(tick, 100);
  });
}

function finish(won) {
  if (!state.running) return;
  state.running = false;
  clearInterval(state.timerId);
  Game.sound.play(won ? 'success' : 'fail');
  el.result.classList.toggle('won', won);
  el.foundCount.textContent = state.found;
  // 못 찾은 물건은 어디 있었는지 보여 준다.
  for (const target of state.targets) {
    if (target.found) continue;
    target.node.classList.remove('hint'); // 다 사라진 힌트 반짝임이 동그라미를 가리지 않게
    target.node.classList.add('reveal');
  }
  setTimeout(() => {
    el.result.hidden = false;
  }, won ? 700 : 1500);
}

// ---------- 시작 ----------

Game.lockTouch();
Game.fillAssets(ASSETS);

Game.onTap(el.scene, tap);
Game.onTap($('startBtn'), startGame);
Game.onTap($('retryBtn'), startGame);
