(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const energyEl = document.getElementById('energy');
  const starsEl = document.getElementById('stars');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const soundButton = document.getElementById('soundButton');
  const shop = document.getElementById('shop');
  const purchaseStatus = document.getElementById('purchaseStatus');

  const state = {
    score: 0,
    best: Number(localStorage.getItem('gellyBest') || 0),
    energy: Number(localStorage.getItem('gellyEnergy') || 10),
    stars: Number(localStorage.getItem('gellyStars') || 0),
    running: false,
    paused: false,
    sound: true,
    timeLeft: 35,
    spawnTimer: 0,
    player: { x: 450, y: 456, width: 120, height: 28 },
    drops: [],
    particles: [],
    lastTime: 0
  };

  const colors = ['#75f4d4', '#ff8fab', '#ffd166', '#91a7ff', '#c77dff'];

  function saveProgress() {
    localStorage.setItem('gellyBest', String(state.best));
    localStorage.setItem('gellyEnergy', String(state.energy));
    localStorage.setItem('gellyStars', String(state.stars));
  }

  function updateStats() {
    scoreEl.textContent = state.score;
    bestEl.textContent = state.best;
    energyEl.textContent = state.energy;
    starsEl.textContent = state.stars;
  }

  function resizePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    state.player.x = Math.max(state.player.width / 2, Math.min(canvas.width - state.player.width / 2, x));
  }

  function spawnDrop() {
    const special = Math.random() < 0.12;
    state.drops.push({
      x: 35 + Math.random() * (canvas.width - 70),
      y: -30,
      r: special ? 18 : 14 + Math.random() * 7,
      speed: 150 + Math.random() * 170,
      color: special ? '#ffffff' : colors[Math.floor(Math.random() * colors.length)],
      special,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function addParticles(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
      state.particles.push({ x, y, vx: (Math.random() - .5) * 170, vy: (Math.random() - .5) * 170, life: .55, color });
    }
  }

  function beep(frequency = 520) {
    if (!state.sound) return;
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.04, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .09);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + .1);
    } catch (_) { /* Sound is optional. */ }
  }

  function startGame() {
    if (state.energy <= 0) {
      overlayTitle.textContent = 'Out of Energy';
      overlayText.textContent = 'Open the shop to buy a consumable energy pack.';
      startButton.textContent = 'Open Shop';
      startButton.dataset.action = 'shop';
      return;
    }

    state.energy -= 1;
    state.score = 0;
    state.timeLeft = 35;
    state.drops = [];
    state.particles = [];
    state.running = true;
    state.paused = false;
    state.lastTime = performance.now();
    pauseButton.disabled = false;
    pauseButton.textContent = 'Pause';
    overlay.hidden = true;
    saveProgress();
    updateStats();
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    pauseButton.disabled = true;
    const earned = Math.floor(state.score / 10);
    state.stars += earned;
    if (state.score > state.best) state.best = state.score;
    saveProgress();
    updateStats();
    overlayTitle.textContent = 'Round Complete';
    overlayText.textContent = `Score: ${state.score}. You earned ${earned} stars.`;
    startButton.textContent = state.energy > 0 ? 'Play Again' : 'Open Shop';
    startButton.dataset.action = state.energy > 0 ? 'play' : 'shop';
    overlay.hidden = false;
  }

  function update(dt) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) return endGame();

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnDrop();
      state.spawnTimer = Math.max(.22, .65 - state.score * .002);
    }

    const catchY = state.player.y;
    state.drops.forEach(drop => {
      drop.y += drop.speed * dt;
      drop.wobble += dt * 4;
      drop.x += Math.sin(drop.wobble) * 20 * dt;

      const withinX = Math.abs(drop.x - state.player.x) < state.player.width / 2 + drop.r;
      const withinY = drop.y + drop.r > catchY - state.player.height / 2 && drop.y - drop.r < catchY + state.player.height / 2;
      if (!drop.caught && withinX && withinY) {
        drop.caught = true;
        const points = drop.special ? 25 : 10;
        state.score += points;
        if (drop.special) state.stars += 2;
        addParticles(drop.x, drop.y, drop.color);
        beep(drop.special ? 780 : 540);
        updateStats();
      }
    });
    state.drops = state.drops.filter(drop => !drop.caught && drop.y < canvas.height + 50);

    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
    });
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#28356c');
    g.addColorStop(1, '#12182f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = .18;
    for (let i = 0; i < 20; i += 1) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc((i * 83) % canvas.width, 70 + (i * 47) % 330, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    drawBackground();

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '700 22px Segoe UI, sans-serif';
    ctx.fillText(`Time: ${Math.max(0, Math.ceil(state.timeLeft))}`, 24, 36);

    state.drops.forEach(drop => {
      const grad = ctx.createRadialGradient(drop.x - 6, drop.y - 8, 2, drop.x, drop.y, drop.r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.25, drop.color);
      grad.addColorStop(1, drop.special ? '#78fff1' : '#3e4b86');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.arc(drop.x - drop.r * .28, drop.y - drop.r * .3, drop.r * .2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#7c6cff';
    roundRect(state.player.x - state.player.width / 2, state.player.y - state.player.height / 2, state.player.width, state.player.height, 14);
    ctx.fill();
    ctx.fillStyle = '#75f4d4';
    roundRect(state.player.x - 34, state.player.y - 7, 68, 8, 4);
    ctx.fill();

    state.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / .55);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 5, 5);
    });
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(.035, (now - state.lastTime) / 1000);
    state.lastTime = now;
    if (!state.paused) update(dt);
    draw();
    if (state.running) requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  async function requestStorePurchase(productId) {
    purchaseStatus.textContent = 'Opening store purchase...';

    // Microsoft Store / host integration hook.
    // A packaging host can expose window.GellyStore.purchaseConsumable(productId).
    if (window.GellyStore && typeof window.GellyStore.purchaseConsumable === 'function') {
      try {
        const result = await window.GellyStore.purchaseConsumable(productId);
        if (!result || !result.success) throw new Error('Purchase was not completed.');
        grantProduct(productId);
        purchaseStatus.textContent = 'Purchase completed. Items added.';
      } catch (error) {
        purchaseStatus.textContent = error.message || 'Purchase was cancelled.';
      }
      return;
    }

    // Browser preview mode: no real charge is made.
    purchaseStatus.textContent = 'Preview mode: no real payment was made. Test items were added.';
    grantProduct(productId);
  }

  function grantProduct(productId) {
    if (productId === 'gelly_hanuu_boost_5') {
      state.energy += 50;
      state.stars += 100;
    } else if (productId === 'gelly_hanuu_boost_10') {
      state.energy += 120;
      state.stars += 300;
    }
    saveProgress();
    updateStats();
  }

  startButton.addEventListener('click', () => {
    if (startButton.dataset.action === 'shop') {
      shop.hidden = false;
      shop.scrollIntoView({ behavior: 'smooth' });
    } else startGame();
  });
  pauseButton.addEventListener('click', togglePause);
  soundButton.addEventListener('click', () => {
    state.sound = !state.sound;
    soundButton.textContent = `Sound: ${state.sound ? 'On' : 'Off'}`;
  });
  document.getElementById('shopButton').addEventListener('click', () => { shop.hidden = false; });
  document.getElementById('closeShopButton').addEventListener('click', () => { shop.hidden = true; });
  document.querySelectorAll('[data-product]').forEach(button => {
    button.addEventListener('click', () => requestStorePurchase(button.dataset.product));
  });
  canvas.addEventListener('mousemove', resizePointer);
  canvas.addEventListener('touchmove', event => { event.preventDefault(); resizePointer(event); }, { passive: false });
  document.addEventListener('keydown', event => {
    const step = 42;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') state.player.x -= step;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') state.player.x += step;
    state.player.x = Math.max(state.player.width / 2, Math.min(canvas.width - state.player.width / 2, state.player.x));
    if (event.key === ' ' && state.running) togglePause();
  });

  const privacyDialog = document.getElementById('privacyDialog');
  document.getElementById('privacyButton').addEventListener('click', () => privacyDialog.showModal());
  document.getElementById('closePrivacyButton').addEventListener('click', () => privacyDialog.close());

  updateStats();
  draw();
})();
