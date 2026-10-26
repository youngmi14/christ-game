// 예수님을 만나러 가요 (마태복음 2장): 낙타를 좌우로 끌어 떨어지는 장애물을 피하고,
// 황금·유향·몰약을 모아 베들레헴에 도착한다.

const CONFIG = {
  journeySec: 45, // 베들레헴까지 걸리는 시간
  hearts: 3,
  invincibleMs: 1200, // 부딪힌 뒤 깜빡이며 다치지 않는 시간
  fallSec: [2.2, 1.4], // 장애물이 위에서 아래까지 떨어지는 시간 (처음 → 마지막)
  spawnEvery: [0.6, 0.3], // 장애물이 나오는 간격(초) (처음 → 마지막)
  giftAt: [0.08, 0.18, 0.28, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88], // 진행률이 이만큼일 때 아직 못 모은 예물이 떨어진다
  camelSize: 14, // vmin
  itemSize: 9, // vmin
  hitRatio: 0.6, // 부딪힘 판정 (작을수록 너그러움)
  arriveMs: 2000, // 마구간이 나타나고 결과가 뜰 때까지
};

// 그림이 준비되면 이모지 대신 경로를 넣는다. 예: camel: 'images/camel.png'
const ASSETS = {
  camel: '🐫',
  star: '⭐',
  heart: '❤️',
  stable: '🛖',
  baby: '👶',
  gold: '👑',
  incense: '🏺',
  myrrh: '🫙',
  obstacles: ['🪨', '🌵', '🌪️'],
};

const GIFTS = [
  { key: 'gold', name: '황금' },
  { key: 'incense', name: '유향' },
  { key: 'myrrh', name: '몰약' },
];

const $ = (id) => document.getElementById(id);
const el = {
  hearts: $('hearts'),
  gaugeFill: $('gaugeFill'),
  field: $('field'),
  items: $('items'),
  stable: $('stable'),
  lead: $('lead'),
  followers: [$('follower1'), $('follower2')],
  dragHint: $('dragHint'),
  intro: $('intro'),
  countdown: $('countdown'),
  result: $('result'),
  loseText: $('loseText'),
};

let state = null;
const field = { w: 0, h: 0, vmin: 0 };

function newState() {
  return {
    elapsed: 0,
    running: false,
    arriving: false,
    hearts: CONFIG.hearts,
    gifts: new Set(),
    items: [],
    targetX: 0,
    leadX: 0,
    followerX: [0, 0],
    invincibleUntil: 0,
    nextSpawnAt: 0.5,
    nextGift: 0,
    lastFrame: performance.now(),
    rafId: 0,
    hintTimer: 0,
  };
}

const lerp = ([from, to], t) => from + (to - from) * t;
const progress = () => Math.min(1, state.elapsed / CONFIG.journeySec);

function measure() {
  field.w = el.field.clientWidth;
  field.h = el.field.clientHeight;
  field.vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
}

const camelPx = () => CONFIG.camelSize * field.vmin;
const itemPx = () => CONFIG.itemSize * field.vmin;
// 맨 앞 낙타의 중심 y (CSS 의 .camel.lead bottom: 16% 와 맞춘다)
const leadY = () => field.h * 0.84 - camelPx() / 2;

// ---------- 떨어지는 것들 ----------

function spawnItem(kind, value, x, fallSec) {
  const node = Game.sprite(value, 'item ' + kind);
  el.items.append(node);
  const item = {
    node,
    kind,
    x,
    y: -itemPx(),
    vy: field.h / fallSec,
    angle: 0,
    spin: kind === 'obstacle' ? (Math.random() * 2 - 1) * 120 : 0,
  };
  state.items.push(item);
  return item;
}

function randomX() {
  const margin = itemPx() / 2;
  return margin + Math.random() * (field.w - 2 * margin);
}

function spawnObstacle() {
  spawnItem('obstacle', Game.randomOf(ASSETS.obstacles), randomX(), lerp(CONFIG.fallSec, progress()));
}

// 아직 못 모은 예물을 차례대로 떨어뜨린다. 셋 다 모았으면 더 나오지 않는다.
function spawnGift() {
  const gift = GIFTS.find((g) => !state.gifts.has(g.key));
  if (!gift) return;
  const item = spawnItem('gift', ASSETS[gift.key], randomX(), CONFIG.fallSec[0] * 1.15);
  item.gift = gift;
}

function removeItem(item) {
  item.node.remove();
  state.items.splice(state.items.indexOf(item), 1);
}

// ---------- 부딪힘 ----------

function touchesLead(item) {
  const reach = ((camelPx() + itemPx()) / 2) * CONFIG.hitRatio;
  return Math.hypot(item.x - state.leadX, item.y - leadY()) < reach;
}

function collect(item) {
  state.gifts.add(item.gift.key);
  document.querySelector(`.slot[data-gift="${item.gift.key}"]`).classList.add('got');
  Game.sound.play('catch');
  popup(`${item.gift.name}!`, 'gift');
  removeItem(item);
}

function hurt(item, now) {
  removeItem(item);
  if (now < state.invincibleUntil) return;
  state.hearts--;
  state.invincibleUntil = now + CONFIG.invincibleMs;
  renderHearts();
  Game.sound.play('wrong');
  el.lead.classList.add('hurt');
  setTimeout(() => el.lead.classList.remove('hurt'), CONFIG.invincibleMs);
  restartClass(el.field, 'shake');
  if (state.hearts <= 0) finish(false, '길이 너무 험했어요.<br>다시 도전해 볼까요?');
}

function restartClass(node, className) {
  node.classList.remove(className);
  void node.offsetWidth; // 애니메이션을 처음부터 다시 재생
  node.classList.add(className);
}

function popup(text, className) {
  const node = document.createElement('div');
  node.className = 'popup ' + className;
  node.textContent = text;
  node.style.left = state.leadX + 'px';
  node.style.top = leadY() - camelPx() * 0.6 + 'px';
  el.field.append(node);
  setTimeout(() => node.remove(), 1000);
}

// ---------- 매 프레임 ----------

function frame(now) {
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  if (state.running && !state.arriving) advanceJourney(dt);
  moveCaravan(dt);
  moveItems(dt, now);

  state.rafId = requestAnimationFrame(frame);
}

function advanceJourney(dt) {
  state.elapsed += dt;
  const p = progress();
  el.gaugeFill.style.width = p * 100 + '%';

  while (state.elapsed >= state.nextSpawnAt) {
    spawnObstacle();
    state.nextSpawnAt += lerp(CONFIG.spawnEvery, p);
  }
  if (state.nextGift < CONFIG.giftAt.length && p >= CONFIG.giftAt[state.nextGift]) {
    spawnGift();
    state.nextGift++;
  }
  if (p >= 1) arrive();
}

// 맨 앞 낙타는 손가락을 빠르게 따라가고, 뒤의 낙타들은 앞 낙타를 천천히 따라간다.
function moveCaravan(dt) {
  const half = camelPx() / 2;
  const target = Math.max(half, Math.min(field.w - half, state.targetX));
  state.leadX += (target - state.leadX) * Math.min(1, dt * 14);
  let ahead = state.leadX;
  state.followerX = state.followerX.map((x) => {
    const next = x + (ahead - x) * Math.min(1, dt * 6);
    ahead = next;
    return next;
  });

  el.lead.style.transform = `translateX(${state.leadX}px) translateX(-50%)`;
  el.followers.forEach((node, i) => {
    node.style.transform = `translateX(${state.followerX[i]}px) translateX(-50%) scale(${0.8 - i * 0.12})`;
  });
}

function moveItems(dt, now) {
  for (const item of [...state.items]) {
    item.y += item.vy * dt;
    item.angle += item.spin * dt;
    item.node.style.transform =
      `translate(${item.x}px, ${item.y}px) translate(-50%, -50%) rotate(${item.angle}deg)`;

    if (state.running && !state.arriving && touchesLead(item)) {
      if (item.kind === 'gift') collect(item);
      else hurt(item, now);
      if (!state.running) return;
    } else if (item.y > field.h + itemPx()) {
      removeItem(item);
    }
  }
}

// ---------- 도착 ----------

function arrive() {
  state.arriving = true;
  for (const item of [...state.items]) {
    if (item.kind === 'obstacle') removeItem(item);
  }
  state.targetX = field.w / 2;
  el.stable.classList.add('shown');
  el.field.classList.remove('moving');

  const allGifts = state.gifts.size === GIFTS.length;
  setTimeout(() => {
    if (allGifts) {
      finish(true);
    } else {
      const missing = GIFTS.filter((g) => !state.gifts.has(g.key)).map((g) => g.name).join(', ');
      finish(false, `베들레헴에 도착했지만<br>예물을 다 모으지 못했어요.<br>빠진 예물: <b>${missing}</b>`);
    }
  }, CONFIG.arriveMs);
}

function finish(won, loseMessage = '') {
  state.running = false;
  el.field.classList.remove('moving');
  clearTimeout(state.hintTimer);
  el.dragHint.hidden = true;
  Game.sound.play(won ? 'success' : 'fail');
  el.result.classList.toggle('won', won);
  el.loseText.innerHTML = loseMessage;
  setTimeout(() => {
    el.result.hidden = false;
  }, won ? 0 : 600);
}

// ---------- 화면 갱신 ----------

function renderHearts() {
  el.hearts.replaceChildren();
  for (let i = 0; i < CONFIG.hearts; i++) {
    const heart = Game.sprite(ASSETS.heart);
    heart.classList.toggle('lost', i >= state.hearts);
    el.hearts.append(heart);
  }
}

// ---------- 조작: 화면 아무 곳이나 좌우로 끌기 ----------

function steer(e) {
  if (!state || !state.running || state.arriving) return;
  state.targetX = e.clientX - el.field.getBoundingClientRect().left;
}

el.field.addEventListener('pointerdown', steer);
el.field.addEventListener('pointermove', steer);

// ---------- 시작 ----------

function startGame() {
  if (state) {
    cancelAnimationFrame(state.rafId);
    clearTimeout(state.hintTimer);
  }
  state = newState();

  measure();
  el.items.replaceChildren();
  el.stable.classList.remove('shown');
  document.querySelectorAll('.slot').forEach((slot) => slot.classList.remove('got'));
  el.gaugeFill.style.width = '0%';
  renderHearts();
  state.targetX = state.leadX = field.w / 2;
  state.followerX = [field.w / 2, field.w / 2];
  state.rafId = requestAnimationFrame(frame);

  el.intro.hidden = true;
  el.result.hidden = true;
  Game.countdown(el.countdown, () => {
    state.running = true;
    state.lastFrame = performance.now();
    el.field.classList.add('moving');
    el.dragHint.hidden = false;
    state.hintTimer = setTimeout(() => {
      el.dragHint.hidden = true;
    }, 2500);
  });
}

document.documentElement.style.setProperty('--camel-size', CONFIG.camelSize + 'vmin');
document.documentElement.style.setProperty('--item-size', CONFIG.itemSize + 'vmin');
Game.lockTouch();
Game.fillAssets(ASSETS);
window.addEventListener('resize', measure);

Game.onTap($('startBtn'), startGame);
Game.onTap($('retryBtn'), startGame);
