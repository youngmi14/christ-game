// 베드로의 그물 (요한복음 21장): 배 오른편 물고기 떼를 눌러 그물을 던지고, 60초 안에 153마리를 잡는다.

const CONFIG = {
  durationSec: 60,
  fishToWin: 153, // 요한복음 21:11
  schools: 5, // 동시에 헤엄치는 물고기 떼 수
  schoolSize: [4, 8], // 한 떼의 물고기 수 (최소, 최대)
  netRadius: 10, // 그물 반지름 (vmin). 클수록 쉬움
  castMs: 250, // 그물이 날아가 펼쳐지는 시간
  reloadMs: 700, // 다시 던질 수 있을 때까지
  boatX: 22, // 배 위치 (바다 너비 %). 물고기는 이보다 오른쪽에만 산다
  hintMs: 3000,
};

// 그림 파일 경로 (이모지 글자를 넣어도 동작한다)
const IMG = '../../assets/fluent/';
const ASSETS = {
  fish: IMG + 'fish.png',
  fishFacesLeft: true, // 물고기 그림이 오른쪽을 보고 있으면 false
  boat: IMG + 'sailboat.png',
  fire: IMG + 'fire.png',
  bread: IMG + 'bread.png',
  tap: IMG + 'tap.png',
};

const $ = (id) => document.getElementById(id);
const el = {
  timer: $('timer'),
  time: $('time'),
  gaugeFill: $('gaugeFill'),
  gaugeText: $('gaugeText'),
  sea: $('sea'),
  fishLayer: $('fishLayer'),
  rope: $('rope'),
  ropeLine: $('ropeLine'),
  net: $('net'),
  hint: $('hint'),
  intro: $('intro'),
  countdown: $('countdown'),
  result: $('result'),
  caughtCount: $('caughtCount'),
};

let state = null;
const sea = { w: 0, h: 0, vmin: 0 };

function newState() {
  return {
    caught: 0,
    schools: [],
    running: false,
    endsAt: 0,
    reloadAt: 0,
    nextSpawnAt: 0,
    lastFrame: performance.now(),
    timerId: 0,
    rafId: 0,
    hintTimer: 0,
  };
}

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function measure() {
  sea.w = el.sea.clientWidth;
  sea.h = el.sea.clientHeight;
  sea.vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
}

const boatPx = () => (sea.w * CONFIG.boatX) / 100;

// 물고기가 헤엄칠 수 있는 가로 범위: 배 오른편부터 바다 끝까지
function fishZone() {
  return [boatPx() + 14 * sea.vmin, sea.w - 8 * sea.vmin];
}

// ---------- 물고기 떼 ----------

function spawnSchool() {
  const [minX, maxX] = fishZone();
  const spread = 7 * sea.vmin;
  const school = {
    x: minX + Math.random() * (maxX - minX),
    y: sea.h * (0.2 + Math.random() * 0.68),
    vx: (Math.random() < 0.5 ? -1 : 1) * sea.vmin * (4 + Math.random() * 6),
    fish: [],
  };
  const size = randInt(...CONFIG.schoolSize);
  for (let i = 0; i < size; i++) {
    const node = Game.sprite(ASSETS.fish, 'fish');
    el.fishLayer.append(node);
    school.fish.push({
      node,
      dx: (Math.random() * 2 - 1) * spread,
      dy: (Math.random() * 2 - 1) * spread * 0.5,
      phase: Math.random() * Math.PI * 2,
      x: 0,
      y: 0,
    });
  }
  state.schools.push(school);
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  const [minX, maxX] = fishZone();

  for (const school of state.schools) {
    school.x += school.vx * dt;
    if ((school.x < minX && school.vx < 0) || (school.x > maxX && school.vx > 0)) {
      school.vx *= -1;
    }
    const swimmingRight = school.vx > 0;
    const flip = swimmingRight === ASSETS.fishFacesLeft ? -1 : 1;
    for (const f of school.fish) {
      f.x = school.x + f.dx + Math.sin(now / 300 + f.phase) * 0.6 * sea.vmin;
      f.y = school.y + f.dy + Math.cos(now / 450 + f.phase) * 0.8 * sea.vmin;
      f.node.style.transform = `translate(${f.x}px, ${f.y}px) translate(-50%, -50%) scaleX(${flip})`;
    }
  }

  if (state.running && state.schools.length < CONFIG.schools && now >= state.nextSpawnAt) {
    spawnSchool();
    state.nextSpawnAt = now + 400;
  }
  state.rafId = requestAnimationFrame(frame);
}

// ---------- 그물 던지기 ----------

function cast(e) {
  const now = performance.now();
  if (!state || !state.running || now < state.reloadAt) return;
  state.reloadAt = now + CONFIG.reloadMs;

  const rect = el.sea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (y < 0) return;

  Game.sound.play('cast');
  hideHint();
  throwNet(x, y);
  setTimeout(() => land(x, y), CONFIG.castMs);
}

function throwNet(x, y) {
  const size = 2 * CONFIG.netRadius * sea.vmin + 'px';
  Object.assign(el.net.style, { left: x + 'px', top: y + 'px', width: size, height: size });
  el.ropeLine.setAttribute('x1', boatPx());
  el.ropeLine.setAttribute('y1', -2 * sea.vmin);
  el.ropeLine.setAttribute('x2', x);
  el.ropeLine.setAttribute('y2', y);
  for (const node of [el.net, el.rope]) {
    node.classList.remove('thrown');
    void node.getBoundingClientRect(); // 애니메이션을 처음부터 다시 재생
    node.classList.add('thrown');
  }
}

function land(x, y) {
  if (!state.running) return;
  const radius = CONFIG.netRadius * sea.vmin;
  const caught = [];
  for (const school of state.schools) {
    school.fish = school.fish.filter((f) => {
      const inNet = Math.hypot(f.x - x, f.y - y) <= radius;
      if (inNet) caught.push(f);
      return !inNet;
    });
  }
  state.schools = state.schools.filter((school) => school.fish.length > 0);

  if (caught.length === 0) {
    Game.sound.play('empty');
    popup(x, y, '텅~', 'empty');
    if (x < boatPx() + 4 * sea.vmin) showHint('오른편에 던져 보세요! ➡️', 1500);
    return;
  }

  Game.sound.play('catch');
  caught.forEach(haul);
  state.caught += caught.length;
  popup(x, y, `+${caught.length}`);
  updateGauge();
  if (state.caught >= CONFIG.fishToWin) finish(true);
}

// 잡힌 물고기는 배로 끌려 올라간다.
function haul(f) {
  f.node.classList.add('hauled');
  f.node.style.transform = `translate(${boatPx()}px, ${-3 * sea.vmin}px) translate(-50%, -50%) scale(0.3)`;
  setTimeout(() => f.node.remove(), 500);
}

function popup(x, y, text, className = '') {
  const node = document.createElement('div');
  node.className = ('popup ' + className).trim();
  node.textContent = text;
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  el.sea.append(node);
  setTimeout(() => node.remove(), 1000);
}

function showHint(text, ms) {
  el.hint.textContent = text;
  el.hint.hidden = false;
  clearTimeout(state.hintTimer);
  state.hintTimer = setTimeout(hideHint, ms);
}

function hideHint() {
  clearTimeout(state.hintTimer);
  el.hint.hidden = true;
}

// ---------- 게임 진행 ----------

function updateGauge() {
  const shown = Math.min(state.caught, CONFIG.fishToWin);
  el.gaugeFill.style.width = (shown / CONFIG.fishToWin) * 100 + '%';
  el.gaugeText.textContent = `${shown} / ${CONFIG.fishToWin}마리`;
}

function tick() {
  const left = Math.max(0, state.endsAt - performance.now());
  el.time.textContent = Math.ceil(left / 1000);
  el.timer.classList.toggle('hurry', left < 10000);
  if (left <= 0) finish(false);
}

function startGame() {
  if (state) {
    clearInterval(state.timerId);
    cancelAnimationFrame(state.rafId);
    clearTimeout(state.hintTimer);
  }
  state = newState();

  measure();
  el.fishLayer.replaceChildren();
  el.timer.classList.remove('hurry');
  el.time.textContent = CONFIG.durationSec;
  updateGauge();
  for (let i = 0; i < CONFIG.schools; i++) spawnSchool();
  state.rafId = requestAnimationFrame(frame);

  el.intro.hidden = true;
  el.result.hidden = true;
  Game.countdown(el.countdown, () => {
    state.running = true;
    state.endsAt = performance.now() + CONFIG.durationSec * 1000;
    state.timerId = setInterval(tick, 100);
    showHint('오른편에 던져라! ➡️', CONFIG.hintMs);
  });
}

function finish(won) {
  state.running = false;
  clearInterval(state.timerId);
  hideHint();
  Game.sound.play(won ? 'success' : 'fail');

  el.result.classList.toggle('won', won);
  el.caughtCount.textContent = state.caught;
  // 마지막으로 끌어 올리는 모습을 잠깐 보여 준 뒤 결과를 띄운다.
  setTimeout(() => {
    el.result.hidden = false;
  }, 600);
}

// ---------- 시작 ----------

document.documentElement.style.setProperty('--boat-x', CONFIG.boatX + '%');
document.documentElement.style.setProperty('--net-ms', CONFIG.castMs + CONFIG.reloadMs + 'ms');
Game.lockTouch();
Game.fillAssets(ASSETS);
window.addEventListener('resize', measure);

Game.onTap(el.sea, cast);
Game.onTap($('startBtn'), startGame);
Game.onTap($('retryBtn'), startGame);
