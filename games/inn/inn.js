// 방 있나요? (누가복음 2장): 여관 문을 두 개씩 열어 같은 그림 짝을 찾는다.
// 짝을 다 찾으면 마지막 문(마구간)이 열리고 아기 예수님을 만난다.

const CONFIG = {
  durationSec: 90,
  pairs: 6, // 카드 짝 수 (카드는 이 두 배). CARDS 수보다 많을 수 없다
  previewMs: 2000, // 시작할 때 모든 카드를 보여 주는 시간
  mismatchMs: 800, // 짝이 틀렸을 때 다시 닫히기까지
  finaleMs: 1800, // 마구간 문이 열리고 결과가 뜰 때까지
};

// 그림이 준비되면 이모지 대신 경로를 넣는다. 예: mary: 'images/mary.png'
const ASSETS = {
  door: '🚪',
  stable: '🛖',
  baby: '👶',
  mary: '👩',
  joseph: '🧔',
  angel: '👼',
  shepherd: '🧑‍🌾',
  sheep: '🐑',
  magi: '🤴',
  star: '⭐',
};

// 판마다 이 중에서 CONFIG.pairs 개를 골라 짝을 만든다.
const CARDS = [
  { key: 'mary', name: '마리아' },
  { key: 'joseph', name: '요셉' },
  { key: 'angel', name: '천사' },
  { key: 'shepherd', name: '목자' },
  { key: 'sheep', name: '양' },
  { key: 'magi', name: '동방박사' },
  { key: 'star', name: '별' },
];

const $ = (id) => document.getElementById(id);
const el = {
  timer: $('timer'),
  time: $('time'),
  gaugeFill: $('gaugeFill'),
  gaugeText: $('gaugeText'),
  field: $('field'),
  board: $('board'),
  finale: $('finale'),
  intro: $('intro'),
  countdown: $('countdown'),
  result: $('result'),
  pairCount: $('pairCount'),
};

let state = null;

function newState() {
  return {
    cards: [],
    open: [],
    matched: 0,
    running: false,
    locked: true,
    endsAt: 0,
    timerId: 0,
  };
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- 카드 깔기 ----------

function makeCard(info) {
  const node = document.createElement('button');
  node.className = 'tile';
  node.innerHTML = `
    <div class="tile-inner">
      <div class="tile-back"></div>
      <div class="tile-face"><span class="tile-name"></span></div>
    </div>`;
  node.querySelector('.tile-back').append(Game.sprite(ASSETS.door));
  node.querySelector('.tile-face').prepend(Game.sprite(ASSETS[info.key]));
  node.querySelector('.tile-name').textContent = info.name;

  const card = { key: info.key, node, open: false, matched: false };
  Game.onTap(node, () => flip(card));
  return card;
}

function buildBoard() {
  const picked = shuffle(CARDS).slice(0, CONFIG.pairs);
  state.cards = shuffle([...picked, ...picked]).map(makeCard);
  el.board.replaceChildren(...state.cards.map((card) => card.node));
  layoutBoard();
}

// 화면에 가장 크게 들어가는 줄 수를 찾는다. (가로 화면 4×3, 세로 화면 3×4 처럼)
function layoutBoard() {
  const total = CONFIG.pairs * 2;
  const gap = Math.min(window.innerWidth, window.innerHeight) * 0.02;
  const width = el.field.clientWidth - gap * 2;
  const height = el.field.clientHeight - gap * 2;
  let best = { cols: 1, tileW: 0 };
  for (let cols = 2; cols <= total; cols++) {
    const rows = Math.ceil(total / cols);
    const tileW = Math.min(
      (width - gap * (cols - 1)) / cols,
      ((height - gap * (rows - 1)) / rows) * 0.75,
    );
    if (tileW > best.tileW) best = { cols, tileW };
  }
  el.board.style.setProperty('--tile-w', Math.floor(best.tileW) + 'px');
  el.board.style.setProperty('--gap', gap + 'px');
  el.board.style.gridTemplateColumns = `repeat(${best.cols}, var(--tile-w))`;
}

// ---------- 카드 뒤집기 ----------

function flip(card) {
  if (!state.running || state.locked || card.open || card.matched) return;
  card.open = true;
  card.node.classList.add('open');
  Game.sound.play('tick');
  state.open.push(card);
  if (state.open.length < 2) return;

  const [a, b] = state.open;
  state.open = [];
  if (a.key === b.key) {
    match(a, b);
  } else {
    miss(a, b);
  }
}

function match(a, b) {
  for (const card of [a, b]) {
    card.matched = true;
    card.node.classList.add('matched');
  }
  state.matched++;
  Game.sound.play('catch');
  updateGauge();
  if (state.matched === CONFIG.pairs) win();
}

// 틀린 두 카드에 '방이 없어요!' 를 붙였다가 다시 닫는다. 그림은 가리지 않아서 기억할 수 있다.
function miss(a, b) {
  state.locked = true;
  Game.sound.play('empty');
  for (const card of [a, b]) card.node.classList.add('nope');
  setTimeout(() => {
    for (const card of [a, b]) {
      card.open = false;
      card.node.classList.remove('open', 'nope');
    }
    state.locked = false;
  }, CONFIG.mismatchMs);
}

// ---------- 게임 진행 ----------

function updateGauge() {
  el.gaugeFill.style.width = (state.matched / CONFIG.pairs) * 100 + '%';
  el.gaugeText.textContent = `찾은 짝 ${state.matched} / ${CONFIG.pairs}`;
}

function tick() {
  const left = Math.max(0, state.endsAt - performance.now());
  el.time.textContent = Math.ceil(left / 1000);
  el.timer.classList.toggle('hurry', left < 10000);
  if (left <= 0) lose();
}

// 처음에 모든 카드를 잠깐 보여 준 뒤 닫고, 그때부터 시간이 흐른다.
function preview(done) {
  state.cards.forEach((card) => card.node.classList.add('open'));
  el.gaugeText.textContent = '잘 기억하세요! 👀';
  setTimeout(() => {
    state.cards.forEach((card) => card.node.classList.remove('open'));
    updateGauge();
    done();
  }, CONFIG.previewMs);
}

function startGame() {
  if (state) clearInterval(state.timerId);
  state = newState();

  el.finale.hidden = true;
  el.finale.querySelector('.tile').classList.remove('open');
  el.board.classList.remove('done');
  el.timer.classList.remove('hurry');
  el.time.textContent = CONFIG.durationSec;
  updateGauge();
  el.intro.hidden = true;
  el.result.hidden = true;
  buildBoard();

  Game.countdown(el.countdown, () => {
    state.running = true;
    preview(() => {
      state.locked = false;
      state.endsAt = performance.now() + CONFIG.durationSec * 1000;
      state.timerId = setInterval(tick, 100);
    });
  });
}

function stop() {
  state.running = false;
  clearInterval(state.timerId);
}

// 짝을 다 찾으면 카드가 물러나고, 가운데에서 마구간 문이 열린다.
function win() {
  stop();
  setTimeout(() => {
    el.board.classList.add('done');
    el.finale.hidden = false;
    setTimeout(() => {
      el.finale.querySelector('.tile').classList.add('open');
      Game.sound.play('success');
    }, 400);
    setTimeout(() => {
      el.result.classList.add('won');
      el.result.hidden = false;
    }, CONFIG.finaleMs);
  }, 500);
}

function lose() {
  stop();
  Game.sound.play('fail');
  el.pairCount.textContent = state.matched;
  el.result.classList.remove('won');
  el.result.hidden = false;
}

// ---------- 시작 ----------

Game.lockTouch();
Game.fillAssets(ASSETS);
window.addEventListener('resize', () => state && layoutBoard());

Game.onTap($('startBtn'), startGame);
Game.onTap($('retryBtn'), startGame);
