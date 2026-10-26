// 오병이어 나눠주기: 줄 선 사람이 원하는 음식(빵/물고기)을 골라 주며 60초 안에 오천 명을 먹인다.

const CONFIG = {
  durationSec: 60,
  servingsToWin: 40, // 이만큼 맞게 주면 게이지가 가득 찬다 (난이도는 여기서 조절)
  totalPeople: 5000, // 게이지에 보여 줄 숫자
  stunMs: 1000,
  visibleInLine: 4,
  maxSitters: 60,
};

// 그림 파일 경로 (이모지 글자를 넣어도 동작한다)
const IMG = '../../assets/fluent/';
const ASSETS = {
  bread: IMG + 'bread.png',
  fish: IMG + 'fish.png',
  basket: IMG + 'basket.png',
  happy: IMG + 'yum.png',
  dizzy: IMG + 'dizzy.png',
  cloud: IMG + 'cloud.png',
  people: ['boy', 'girl', 'man', 'woman', 'old-man', 'old-woman', 'man-beard', 'woman-blonde', 'person', 'man-curly', 'woman-curly', 'child']
    .map((name) => IMG + name + '.png'),
};

const ITEMS = ['bread', 'fish'];

// 줄 선 자리별 위치 (bottom: 들판 아래에서 %, x: 가운데에서 vmin).
// 앞사람(0)이 가장 크고, 뒤로 갈수록 작아지며 언덕 위로 올라간다. 마지막 칸은 새로 들어오는 자리라 투명.
const SLOTS = [
  { bottom: 2, x: 0, scale: 1 },
  { bottom: 30, x: -15, scale: 0.6 },
  { bottom: 48, x: 11, scale: 0.42 },
  { bottom: 60, x: -6, scale: 0.3 },
  { bottom: 68, x: 3, scale: 0.22 },
];

const $ = (id) => document.getElementById(id);
const el = {
  timer: $('timer'),
  time: $('time'),
  gaugeFill: $('gaugeFill'),
  gaugeText: $('gaugeText'),
  queue: $('queue'),
  crowd: $('crowd'),
  controls: $('controls'),
  intro: $('intro'),
  countdown: $('countdown'),
  result: $('result'),
  baskets: $('baskets'),
  servedCount: $('servedCount'),
};

let state = null;

function newState() {
  return {
    served: 0,
    queue: [],
    recentWants: [],
    running: false,
    endsAt: 0,
    stunnedUntil: 0,
    stunTimer: 0,
    timerId: 0,
    leaveSide: 1,
  };
}

const { randomOf, formatCount } = Game;

// ---------- 줄 선 사람들 ----------

function pickWant() {
  // 같은 음식이 세 번까지만 이어지게 해서, 매번 말풍선을 보고 고르게 만든다.
  const recent = state.recentWants;
  let want = randomOf(ITEMS);
  if (recent.length === 3 && recent.every((w) => w === want)) {
    want = want === 'bread' ? 'fish' : 'bread';
  }
  recent.push(want);
  if (recent.length > 3) recent.shift();
  return want;
}

function makePerson() {
  const want = pickWant();
  const node = document.createElement('div');
  node.className = 'person';
  const face = document.createElement('div');
  face.className = 'face';
  face.append(Game.sprite(randomOf(ASSETS.people)));
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.append(Game.sprite(ASSETS[want]));
  node.append(face, bubble);
  el.queue.append(node);
  return { want, node, bubble };
}

function fillQueue() {
  while (state.queue.length < CONFIG.visibleInLine + 1) {
    state.queue.push(makePerson());
  }
}

function layoutQueue() {
  state.queue.forEach((person, i) => {
    const slot = SLOTS[Math.min(i, SLOTS.length - 1)];
    const style = person.node.style;
    style.bottom = slot.bottom + '%';
    style.transform = `translateX(calc(-50% + ${slot.x}vmin)) scale(${slot.scale})`;
    style.zIndex = String(SLOTS.length - i);
    style.opacity = i < CONFIG.visibleInLine ? '1' : '0';
    person.node.classList.toggle('is-front', i === 0);
  });
}

// 다 먹은 사람은 웃으며 옆으로 빠지고, 언덕 위에 앉은 사람이 하나 늘어난다.
function leave(person) {
  Game.setSprite(person.bubble, ASSETS.happy);
  state.leaveSide *= -1;
  person.node.classList.replace('is-front', 'leaving');
  person.node.style.transform = `translateX(calc(-50% + ${state.leaveSide * 45}vw)) scale(0.8)`;
  person.node.style.opacity = '0';
  setTimeout(() => person.node.remove(), 400);
}

function seatInCrowd() {
  if (el.crowd.childElementCount >= CONFIG.maxSitters) return;
  const sitter = Game.sprite(randomOf(ASSETS.people), 'sitter');
  const onLeft = Math.random() < 0.5;
  sitter.style.left = (onLeft ? 2 + Math.random() * 20 : 78 + Math.random() * 18) + '%';
  sitter.style.bottom = 4 + Math.random() * 50 + '%';
  el.crowd.append(sitter);
}

// ---------- 게임 진행 ----------

function serve(item) {
  if (!state || !state.running) return;
  if (performance.now() < state.stunnedUntil) return;

  const front = state.queue[0];
  if (item !== front.want) {
    miss(front);
    return;
  }

  Game.sound.play('correct');
  state.queue.shift();
  leave(front);
  state.served++;
  seatInCrowd();
  updateGauge();

  if (state.served >= CONFIG.servingsToWin) {
    finish(true);
    return;
  }
  fillQueue();
  layoutQueue();
}

function miss(front) {
  Game.sound.play('wrong');
  state.stunnedUntil = performance.now() + CONFIG.stunMs;
  el.controls.classList.add('stunned');
  front.bubble.classList.remove('shake');
  void front.bubble.offsetWidth; // 애니메이션을 처음부터 다시 재생
  front.bubble.classList.add('shake');
  clearTimeout(state.stunTimer);
  state.stunTimer = setTimeout(() => el.controls.classList.remove('stunned'), CONFIG.stunMs);
}

function updateGauge() {
  const ratio = Math.min(1, state.served / CONFIG.servingsToWin);
  el.gaugeFill.style.width = ratio * 100 + '%';
  el.gaugeText.textContent =
    `${formatCount(Math.round(ratio * CONFIG.totalPeople))} / ${formatCount(CONFIG.totalPeople)}명`;
}

function tick() {
  const left = Math.max(0, state.endsAt - performance.now());
  el.time.textContent = Math.ceil(left / 1000);
  el.timer.classList.toggle('hurry', left < 10000);
  if (left <= 0) finish(false);
}

function startGame() {
  if (state) clearInterval(state.timerId);
  state = newState();

  el.queue.replaceChildren();
  el.crowd.replaceChildren();
  el.controls.classList.remove('stunned');
  el.timer.classList.remove('hurry');
  el.time.textContent = CONFIG.durationSec;
  updateGauge();
  fillQueue();
  layoutQueue();

  el.intro.hidden = true;
  el.result.hidden = true;
  Game.countdown(el.countdown, () => {
    state.running = true;
    state.endsAt = performance.now() + CONFIG.durationSec * 1000;
    state.timerId = setInterval(tick, 100);
  });
}

function finish(won) {
  state.running = false;
  clearInterval(state.timerId);
  clearTimeout(state.stunTimer);
  el.controls.classList.remove('stunned');
  Game.sound.play(won ? 'success' : 'fail');

  el.result.classList.toggle('won', won);
  if (won) {
    el.baskets.replaceChildren();
    for (let i = 0; i < 12; i++) {
      const basket = Game.sprite(ASSETS.basket);
      basket.style.animationDelay = 0.4 + i * 0.08 + 's';
      el.baskets.append(basket);
    }
  } else {
    el.servedCount.textContent =
      formatCount(Math.round((state.served / CONFIG.servingsToWin) * CONFIG.totalPeople));
  }
  // 마지막 사람이 빠지는 모습을 잠깐 보여 준 뒤 결과를 띄운다.
  setTimeout(() => {
    el.result.hidden = false;
  }, 450);
}

// ---------- 시작 ----------

document.documentElement.style.setProperty('--stun-ms', CONFIG.stunMs + 'ms');
Game.lockTouch();
Game.fillAssets(ASSETS);

for (const button of document.querySelectorAll('.give')) {
  Game.onTap(button, () => serve(button.dataset.item));
}
Game.onTap($('startBtn'), startGame);
Game.onTap($('retryBtn'), startGame);
