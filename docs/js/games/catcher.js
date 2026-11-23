/**
 * Coin Catcher Game Engine
 */
class CatcherGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.canvas.width = 400;
    this.canvas.height = 500;

    this.basket = { x: 160, y: 440, width: 80, height: 20, speed: 8 };
    this.items = [];
    this.floatingTexts = [];
    this.particles = [];

    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 45; // frames

    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;

    this.keys = { left: false, right: false };

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    };
    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    };

    this.handleMouseMove = (e) => {
      if (!this.isRunning || this.isPaused) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.basket.x = Math.max(0, Math.min(this.canvas.width - this.basket.width, mouseX - this.basket.width / 2));
    };

    this.handleTouchMove = (e) => {
      if (!this.isRunning || this.isPaused || !e.touches[0]) return;
      const rect = this.canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      this.basket.x = Math.max(0, Math.min(this.canvas.width - this.basket.width, touchX - this.basket.width / 2));
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: true });
  }

  handleTouch(action) {
    if (action === 'left') this.basket.x = Math.max(0, this.basket.x - 30);
    if (action === 'right') this.basket.x = Math.min(this.canvas.width - this.basket.width, this.basket.x + 30);
  }

  start() {
    this.basket.x = (this.canvas.width - this.basket.width) / 2;
    this.items = [];
    this.floatingTexts = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.spawnTimer = 0;
    this.updateScore(this.score, this.lives, this.combo);

    this.isRunning = true;
    this.isPaused = false;

    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
  }

  spawnItem() {
    const types = [
      { type: 'coin', color: '#ffbe0c', radius: 12, speed: 3.5, points: 10 },
      { type: 'diamond', color: '#00f3ff', radius: 10, speed: 4.5, points: 50 },
      { type: 'heart', color: '#ff0055', radius: 11, speed: 3.0, points: 0 },
      { type: 'bomb', color: '#444444', radius: 14, speed: 4.0, points: -20 }
    ];

    const rand = Math.random();
    let selected = types[0]; // Coin 60%
    if (rand > 0.85) selected = types[1]; // Diamond 15%
    else if (rand > 0.75) selected = types[2]; // Heart 10%
    else if (rand > 0.60) selected = types[3]; // Bomb 15%

    this.items.push({
      x: Math.random() * (this.canvas.width - 40) + 20,
      y: -20,
      ...selected
    });
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({ text, x, y, color, opacity: 1.0, vy: -1.5 });
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color, life: 1.0, size: Math.random() * 4 + 2
      });
    }
  }

  update() {
    // Keyboard basket move
    if (this.keys.left) this.basket.x = Math.max(0, this.basket.x - this.basket.speed);
    if (this.keys.right) this.basket.x = Math.min(this.canvas.width - this.basket.width, this.basket.x + this.basket.speed);

    // Spawn items
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(25, 45 - Math.floor(this.score / 200));
    }

    // Update Items
    this.items.forEach(item => {
      item.y += item.speed + (this.score / 500);

      // Check Collision with Basket
      if (
        item.y + item.radius >= this.basket.y &&
        item.y - item.radius <= this.basket.y + this.basket.height &&
        item.x + item.radius >= this.basket.x &&
        item.x - item.radius <= this.basket.x + this.basket.width
      ) {
        item.caught = true;

        if (item.type === 'coin' || item.type === 'diamond') {
          this.combo++;
          const multiplier = this.combo >= 5 ? 2 : 1;
          const pts = item.points * multiplier;
          this.score += pts;
          this.addFloatingText(`+${pts}${multiplier > 1 ? ' COMBO!' : ''}`, item.x, item.y, item.color);
          this.createParticles(item.x, item.y, item.color);
          audioManager.playScore();
        } else if (item.type === 'heart') {
          this.lives = Math.min(5, this.lives + 1);
          this.addFloatingText('+1 LIFE!', item.x, item.y, '#ff0055');
          this.createParticles(item.x, item.y, '#ff0055');
          audioManager.playPowerup();
        } else if (item.type === 'bomb') {
          this.lives -= 1;
          this.combo = 0;
          this.addFloatingText('-1 LIFE!', item.x, item.y, '#ff0000');
          this.createParticles(item.x, item.y, '#ff0000');
          audioManager.playGameOver();
          if (this.lives <= 0) {
            this.handleGameOver();
            return;
          }
        }
        this.updateScore(this.score, this.lives, this.combo);
      } else if (item.y > this.canvas.height + 20) {
        item.out = true;
        if (item.type === 'coin' || item.type === 'diamond') {
          this.combo = 0; // Reset combo on missed coin
          this.updateScore(this.score, this.lives, this.combo);
        }
      }
    });

    this.items = this.items.filter(i => !i.caught && !i.out);

    // Update Floating Texts
    this.floatingTexts.forEach(ft => {
      ft.y += ft.vy;
      ft.opacity -= 0.02;
    });
    this.floatingTexts = this.floatingTexts.filter(ft => ft.opacity > 0);

    // Update Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  handleGameOver() {
    this.isRunning = false;
    audioManager.playGameOver();
    this.gameOverCb(this.score);
  }

  gameLoop() {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      this.update();
      this.draw();
    }

    this.animId = requestAnimationFrame(() => this.gameLoop());
  }

  draw() {
    // Clear Background
    this.ctx.fillStyle = '#0d111e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Basket
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.roundRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Basket Inner Detail
    this.ctx.fillStyle = '#0d111e';
    this.ctx.fillRect(this.basket.x + 4, this.basket.y + 4, this.basket.width - 8, 4);

    // Draw Items
    this.items.forEach(item => {
      this.ctx.save();
      this.ctx.fillStyle = item.color;
      this.ctx.shadowColor = item.color;
      this.ctx.shadowBlur = 10;

      if (item.type === 'coin') {
        this.ctx.beginPath();
        this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#0d111e';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('$', item.x, item.y);
      } else if (item.type === 'diamond') {
        this.ctx.beginPath();
        this.ctx.moveTo(item.x, item.y - item.radius);
        this.ctx.lineTo(item.x + item.radius, item.y);
        this.ctx.lineTo(item.x, item.y + item.radius);
        this.ctx.lineTo(item.x - item.radius, item.y);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (item.type === 'heart') {
        this.ctx.beginPath();
        this.ctx.arc(item.x - 5, item.y - 4, 6, 0, Math.PI * 2);
        this.ctx.arc(item.x + 5, item.y - 4, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(item.x - 11, item.y - 2);
        this.ctx.lineTo(item.x, item.y + 10);
        this.ctx.lineTo(item.x + 11, item.y - 2);
        this.ctx.fill();
      } else if (item.type === 'bomb') {
        this.ctx.fillStyle = '#ff0055';
        this.ctx.beginPath();
        this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💣', item.x, item.y);
      }

      this.ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // Draw Floating Text
    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = ft.opacity;
      this.ctx.font = 'bold 16px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;
  }
}
