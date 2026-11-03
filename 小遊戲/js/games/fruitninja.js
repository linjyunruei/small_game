/**
 * Fruit Ninja Game Engine
 */
class FruitNinjaGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.canvas.width = 480;
    this.canvas.height = 520;

    this.fruits = [];
    this.slashes = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.spawnTimer = 0;
    this.spawnInterval = 55;
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;
    this.mouseTrail = [];
    this.isSlicing = false;
    this.frameCount = 0;

    this.FRUIT_DATA = [
      { name: 'watermelon', emoji: '🍉', color: '#ff3366', inner: '#55cc44', score: 15 },
      { name: 'orange',     emoji: '🍊', color: '#ff8800', inner: '#ffcc44', score: 10 },
      { name: 'banana',     emoji: '🍌', color: '#ffea00', inner: '#ffe066', score: 10 },
      { name: 'strawberry', emoji: '🍓', color: '#ff0055', inner: '#ff6688', score: 12 },
      { name: 'apple',      emoji: '🍎', color: '#ff0000', inner: '#ff5555', score: 10 },
      { name: 'grape',      emoji: '🍇', color: '#8800cc', inner: '#cc66ff', score: 8  },
      { name: 'bomb',       emoji: '💣', color: '#333',    inner: '#666',    score: -1 },
    ];

    this.bindEvents();
  }

  bindEvents() {
    this.handleMouseDown = (e) => {
      this.isSlicing = true;
      this.mouseTrail = [];
    };
    this.handleMouseUp = () => { this.isSlicing = false; this.mouseTrail = []; };
    this.handleMouseMove = (e) => {
      if (!this.isRunning || this.isPaused || !this.isSlicing) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / rect.width, sy = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
      this.mouseTrail.push({ x: mx, y: my, t: Date.now() });
      if (this.mouseTrail.length > 18) this.mouseTrail.shift();
      this.checkSlice(mx, my);
    };
    this.handleTouchStart = (e) => {
      this.isSlicing = true; this.mouseTrail = [];
    };
    this.handleTouchEnd = () => { this.isSlicing = false; this.mouseTrail = []; };
    this.handleTouchMove = (e) => {
      if (!this.isRunning || this.isPaused) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / rect.width, sy = this.canvas.height / rect.height;
      const mx = (e.touches[0].clientX - rect.left) * sx, my = (e.touches[0].clientY - rect.top) * sy;
      this.mouseTrail.push({ x: mx, y: my, t: Date.now() });
      if (this.mouseTrail.length > 18) this.mouseTrail.shift();
      this.isSlicing = true;
      this.checkSlice(mx, my);
    };

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
  }

  start() {
    this.fruits = []; this.slashes = []; this.particles = [];
    this.score = 0; this.lives = 3;
    this.spawnTimer = 0; this.frameCount = 0;
    this.isRunning = true; this.isPaused = false;
    this.updateScore(this.score, this.lives);
    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() {
    this.stop();
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
  }

  spawnFruit() {
    const fd = this.FRUIT_DATA;
    // 15% bomb chance
    const isBomb = Math.random() < 0.15;
    const data = isBomb ? fd[fd.length - 1] : fd[Math.floor(Math.random() * (fd.length - 1))];
    const x = 80 + Math.random() * (this.canvas.width - 160);
    const vy = -(13 + Math.random() * 6);
    const vx = (Math.random() - 0.5) * 4;
    const radius = data.name === 'watermelon' ? 34 : 26;
    this.fruits.push({ x, y: this.canvas.height + 40, vx, vy, radius, ...data, sliced: false, rotation: 0, rotSpeed: (Math.random()-0.5)*0.08 });
  }

  checkSlice(mx, my) {
    this.fruits.forEach(fruit => {
      if (fruit.sliced) return;
      const dist = Math.hypot(mx - fruit.x, my - fruit.y);
      if (dist < fruit.radius) {
        fruit.sliced = true;
        if (fruit.name === 'bomb') {
          this.lives--;
          audioManager.playGameOver();
          this.spawnParticles(fruit.x, fruit.y, '#ff0000', 12);
          if (this.lives <= 0) { this.handleGameOver(); return; }
        } else {
          this.score += fruit.score;
          audioManager.playScore();
          this.spawnParticles(fruit.x, fruit.y, fruit.color, 10);
          this.spawnParticles(fruit.x, fruit.y, fruit.inner, 6);
        }
        this.slashes.push({ x: mx, y: my, life: 1.0, color: fruit.name === 'bomb' ? '#ff0055' : '#fff' });
        this.updateScore(this.score, this.lives);
      }
    });
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-2, color, life: 1.0, size: 3 + Math.random()*4 });
    }
  }

  update() {
    this.frameCount++;
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnFruit();
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(35, 55 - Math.floor(this.score / 100) * 3);
    }

    this.fruits.forEach(f => {
      f.vy += 0.35; // gravity
      f.x += f.vx;
      f.y += f.vy;
      f.rotation += f.rotSpeed;
    });

    // Fruit fell off bottom = lose life
    const lost = this.fruits.filter(f => !f.sliced && f.y > this.canvas.height + 60);
    if (lost.length > 0) {
      this.lives -= lost.length;
      audioManager.playGameOver();
      this.updateScore(this.score, this.lives);
      if (this.lives <= 0) { this.handleGameOver(); return; }
    }
    this.fruits = this.fruits.filter(f => f.y <= this.canvas.height + 60);

    // Particles
    this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04; });
    this.particles = this.particles.filter(p => p.life > 0);

    // Slashes
    this.slashes.forEach(s => { s.life -= 0.08; });
    this.slashes = this.slashes.filter(s => s.life > 0);
  }

  handleGameOver() {
    this.isRunning = false;
    audioManager.playGameOver();
    this.gameOverCb(this.score);
  }

  gameLoop() {
    if (!this.isRunning) return;
    if (!this.isPaused) { this.update(); this.draw(); }
    this.animId = requestAnimationFrame(() => this.gameLoop());
  }

  draw() {
    const ctx = this.ctx;
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bg.addColorStop(0, '#0a0c14'); bg.addColorStop(1, '#1a0a20');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Sword trail
    if (this.isSlicing && this.mouseTrail.length > 2) {
      ctx.save();
      for (let i = 1; i < this.mouseTrail.length; i++) {
        const a = this.mouseTrail[i-1], b = this.mouseTrail[i];
        const alpha = i / this.mouseTrail.length;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = alpha * 8;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 15 * alpha;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }

    // Fruits
    this.fruits.forEach(f => {
      if (f.sliced) return;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.shadowColor = f.color; ctx.shadowBlur = 10;
      ctx.font = `${f.radius * 1.7}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
    });

    // Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // Slash effects
    this.slashes.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${s.life})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, 10 * s.life, 0, Math.PI*2); ctx.fill();
    });

    // HUD lives
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('❤️'.repeat(this.lives), 10, 10);

    // Score
    ctx.fillStyle = '#ffbe0c'; ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.score} pts`, this.canvas.width - 10, 14);
    ctx.textAlign = 'left';
  }
}
