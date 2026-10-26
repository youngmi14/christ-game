// 모든 게임이 같이 쓰는 도우미: 이모지/이미지 그리기, 효과음, 아이패드 터치 설정
(function () {
  const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

  // 에셋 값이 이미지 경로면 <img>, 아니면 이모지 글자로 그린다.
  // 그래서 각 게임의 ASSETS 값만 '🍞' → 'images/bread.png' 로 바꾸면 그림이 교체된다.
  function sprite(value, className = '') {
    let node;
    if (IMAGE_RE.test(value)) {
      node = document.createElement('img');
      node.src = value;
      node.alt = '';
      node.draggable = false;
    } else {
      node = document.createElement('span');
      node.textContent = value;
    }
    node.className = ('sprite ' + className).trim();
    return node;
  }

  function setSprite(parent, value) {
    parent.replaceChildren(sprite(value));
  }

  // HTML 안의 <span data-asset="bread"></span> 자리를 ASSETS 값으로 채운다.
  function fillAssets(assets, root = document) {
    root.querySelectorAll('[data-asset]').forEach((node) => {
      setSprite(node, assets[node.dataset.asset]);
    });
  }

  // 효과음은 기본으로 소리를 합성해서 낸다. 파일을 구하면 files 에 경로를 넣어 교체한다.
  // 예: Game.sound.files.wrong = '../../assets/sfx/wrong.mp3';
  const SYNTH = {
    // [주파수, 시작(초), 길이(초), 파형, 볼륨]
    correct: [[880, 0, 0.08], [1320, 0.07, 0.12]],
    wrong: [[880, 0, 0.5, 'square', 0.12]],
    tick: [[660, 0, 0.12]],
    go: [[990, 0, 0.3]],
    success: [[523, 0, 0.15], [659, 0.13, 0.15], [784, 0.26, 0.15], [1047, 0.39, 0.45]],
    fail: [[392, 0, 0.2], [330, 0.18, 0.2], [262, 0.36, 0.45]],
    cast: [[520, 0, 0.06, 'triangle'], [390, 0.05, 0.08, 'triangle']],
    catch: [[784, 0, 0.07], [988, 0.06, 0.07], [1319, 0.12, 0.14]],
    empty: [[196, 0, 0.18, 'triangle', 0.25]],
  };

  const sound = {
    ctx: null,
    files: {},

    // iPad Safari 는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있어서, 터치할 때마다 깨워 둔다.
    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    play(name) {
      const file = this.files[name];
      if (file) {
        new Audio(file).play().catch(() => {});
        return;
      }
      if (!this.ctx || !SYNTH[name]) return;
      const t0 = this.ctx.currentTime;
      for (const [freq, start, dur, type = 'sine', vol = 0.2] of SYNTH[name]) {
        tone(this.ctx, freq, t0 + start, dur, type, vol);
      }
    },
  };

  function tone(ctx, freq, at, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.01);
    gain.gain.setValueAtTime(vol, at + dur - 0.03);
    gain.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  // click 대신 pointerdown 을 써서 누르는 즉시 반응하게 한다.
  function onTap(node, handler) {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sound.unlock();
      node.classList.add('pressed');
      setTimeout(() => node.classList.remove('pressed'), 120);
      handler(e);
    });
  }

  // 게임 화면에서 확대, 스크롤, 길게 눌러 선택하기 등을 막는다.
  function lockTouch() {
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  // 3, 2, 1, 시작! 을 보여 준 뒤 done 을 부른다. overlay 안에 .countdown-text 가 있어야 한다.
  function countdown(overlay, done) {
    const text = overlay.querySelector('.countdown-text');
    const steps = ['3', '2', '1', '시작!'];
    let i = 0;
    overlay.hidden = false;

    const next = () => {
      if (i === steps.length) {
        overlay.hidden = true;
        done();
        return;
      }
      const isLast = i === steps.length - 1;
      text.textContent = steps[i];
      text.classList.remove('pop');
      void text.offsetWidth; // 애니메이션을 처음부터 다시 재생
      text.classList.add('pop');
      sound.play(isLast ? 'go' : 'tick');
      i++;
      setTimeout(next, isLast ? 500 : 700);
    };
    next();
  }

  const randomOf = (list) => list[Math.floor(Math.random() * list.length)];
  const formatCount = (n) => n.toLocaleString('ko-KR');

  window.Game = { sprite, setSprite, fillAssets, sound, onTap, lockTouch, countdown, randomOf, formatCount };
})();
