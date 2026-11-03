/**
 * Space Invaders Game Engine
 */
class InvadersGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.canvas.width = 480;
    this.canvas.height = 540;

    this.player = { x: 220, y: 490, w: 40, h: 24, speed: 5 };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.shields = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;
    this.shootCooldown = 0;
    this.enemyDir = 1;
    this.enemyShootTimer = 0;
    this.enemyShootInterval = 80;
    this.keys = { left: false, right: false, space: false };
    this.ufo = null;
    this.ufoTimer = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); this.keys.space = true; }
    };
    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp') this.keys.space = false;
    };
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleTouch(action) {
    if (action === 'left') this.player.x = Math.max(0, this.player.x - 20);
    if (action === 'right') this.player.x = Math.min(this.canvas.width - this.player.w, this.player.x + 20);
    if (action === 'up') this.shoot();
  }

  initEnemies() {
    this.enemies = [];
    const types = ['squid', 'crab', 'octopus'];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 11; col++) {
        this.enemies.push({
          x: 40 + col * 38, y: 60 + row * 36,
          w: 28, h: 20,
          type: types[Math.min(row, 2)],
          alive: true, frame: 0, frameTimer: 0
        });
      }
    }
    this.enemyDir = 1;
    this.enemySpeed = 0.8 + this.wave * 0.3;
  }

  initShields() {
    this.shields = [];
    for (let i = 0; i < 4; i++) {
      for (let bx = 0; bx < 4; bx++) {
        for (let by = 0; by < 3; by++) {
          this.shields.push({ x: 60 + i * 110 + bx * 12, y: 420 + by * 8, w: 10, h: 7, hp: 3 });
        }
      }
    }
  }

  start() {
    this.score = 0; this.lives = 3; this.wave = 1;
    this.bullets = []; this.enemyBullets = [];
    this.particles = []; this.ufo = null; this.ufoTimer = 0;
    this.player.x = 220;
    this.updateScore(this.score);
    this.initEnemies();
    this.initShields();
    this.isRunning = true; this.isPaused = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() { this.stop(); window.removeEventListener('keydown', this.handleKeyDown); window.removeEventListener('keyup', this.handleKeyUp); }

  shoot() {
    if (this.shootCooldown > 0) return;
    this.bullets.push({ x: this.player.x + this.player.w / 2, y: this.player.y, speed: 10 });
    audioManager.playTone(880, 'square', 0.06, 0.08);
    this.shootCooldown = 20;
  }

  update() {
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Player
    if (this.keys.left) this.player.x = Math.max(0, this.player.x - this.player.speed);
    if (this.keys.right) this.player.x = Math.min(this.canvas.width - this.player.w, this.player.x + this.player.speed);
    if (this.keys.space) this.shoot();

    // Player bullets
    this.bullets.forEach(b => b.y -= b.speed);
    this.bullets = this.bullets.filter(b => b.y > 0);

    // Enemy movement
    let hitWall = false;
    const alive = this.enemies.filter(e => e.alive);
    alive.forEach(e => {
      e.x += this.enemySpeed * this.enemyDir;
      e.frameTimer++;
      if (e.frameTimer > 30) { e.frame = 1 - e.frame; e.frameTimer = 0; }
      if (e.x <= 0 || e.x + e.w >= this.canvas.width) hitWall = true;
    });
    if (hitWall) {
      this.enemyDir *= -1;
      alive.forEach(e => { e.y += 12; });
    }

    // Enemy reaches bottom - game over
    if (alive.some(e => e.y + e.h >= this.player.y)) {
      this.handleGameOver(); return;
    }

    // Enemy shooting
    this.enemyShootTimer++;
    if (this.enemyShootTimer >= this.enemyShootInterval) {
      this.enemyShootTimer = 0;
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        this.enemyBullets.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h, speed: 3 });
      }
    }
    this.enemyBullets.forEach(b => b.y += b.speed);
    this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height);

    // UFO
    this.ufoTimer++;
    if (this.ufoTimer > 400 && !this.ufo) { this.ufo = { x: -40, y: 30, speed: 2 }; this.ufoTimer = 0; }
    if (this.ufo) {
      this.ufo.x += this.ufo.speed;
      if (this.ufo.x > this.canvas.width + 50) this.ufo = null;
    }

    // Bullet vs Enemy collision
    this.bullets.forEach(b => {
      this.enemies.forEach(e => {
        if (!e.alive) return;
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.alive = false;
          b.dead = true;
          const pts = e.type === 'squid' ? 30 : e.type === 'crab' ? 20 : 10;
          this.score += pts;
          this.updateScore(this.score);
          this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#00f3ff');
          audioManager.playScore();
        }
      });
      // Bullet vs UFO
      if (this.ufo && b.x > this.ufo.x && b.x < this.ufo.x + 40 && b.y > this.ufo.y - 10 && b.y < this.ufo.y + 10) {
        b.dead = true; this.score += 100; this.updateScore(this.score);
        this.spawnParticles(this.ufo.x + 20, this.ufo.y, '#ffbe0c'); this.ufo = null; audioManager.playPowerup();
      }
      // Bullet vs Shield
      this.shields.forEach(s => {
        if (s.hp <= 0) return;
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          b.dead = true; s.hp--;
        }
      });
    });
    this.bullets = this.bullets.filter(b => !b.dead);

    // Enemy bullet vs player
    this.enemyBullets.forEach(b => {
      if (b.x > this.player.x && b.x < this.player.x + this.player.w && b.y > this.player.y && b.y < this.player.y + this.player.h) {
        b.dead = true; this.lives--;
        this.spawnParticles(this.player.x + this.player.w / 2, this.player.y, '#ff0055');
        audioManager.playGameOver();
        if (this.lives <= 0) { this.handleGameOver(); return; }
        this.updateScore(this.score);
      }
      this.shields.forEach(s => {
        if (s.hp <= 0) return;
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) { b.dead = true; s.hp--; }
      });
    });
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);

    // Wave clear
    if (alive.length === 0) {
      this.wave++;
      this.initEnemies();
      this.initShields();
      audioManager.playLineClear();
    }

    // Particles
    this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.06; });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, color, life: 1 });
    }
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

  drawEnemy(e) {
    this.ctx.fillStyle = e.type === 'squid' ? '#ff0055' : e.type === 'crab' ? '#00f3ff' : '#00ff66';
    this.ctx.shadowColor = this.ctx.fillStyle;
    this.ctx.shadowBlur = 6;
    const x = e.x, y = e.y, w = e.w, h = e.h;
    if (e.type === 'squid') {
      this.ctx.fillRect(x+8, y, w-16, h*0.5);
      this.ctx.fillRect(x+4, y+h*0.5, w-8, h*0.4);
      if (e.frame === 0) { this.ctx.fillRect(x, y+h*0.7, 6, h*0.3); this.ctx.fillRect(x+w-6, y+h*0.7, 6, h*0.3); }
      else { this.ctx.fillRect(x+4, y+h*0.8, 6, h*0.2); this.ctx.fillRect(x+w-10, y+h*0.8, 6, h*0.2); }
    } else if (e.type === 'crab') {
      this.ctx.fillRect(x+6, y, w-12, h*0.6);
      this.ctx.fillRect(x+2, y+h*0.6, w-4, h*0.4);
      if (e.frame === 0) { this.ctx.fillRect(x, y+h*0.2, 6, h*0.5); this.ctx.fillRect(x+w-6, y+h*0.2, 6, h*0.5); }
      else { this.ctx.fillRect(x-4, y+h*0.4, 6, h*0.4); this.ctx.fillRect(x+w-2, y+h*0.4, 6, h*0.4); }
    } else {
      this.ctx.beginPath();
      this.ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
      this.ctx.fill();
      if (e.frame === 0) { this.ctx.fillRect(x+4, y-4, 6, 6); this.ctx.fillRect(x+w-10, y-4, 6, 6); }
    }
    this.ctx.shadowBlur = 0;
  }

  draw() {
    this.ctx.fillStyle = '#060810';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 73 + 11) % this.canvas.width;
      const sy = (i * 137 + 29) % this.canvas.height;
      this.ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Shields
    this.shields.forEach(s => {
      if (s.hp <= 0) return;
      this.ctx.fillStyle = `rgba(0, 255, 102, ${s.hp / 3})`;
      this.ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    // UFO
    if (this.ufo) {
      this.ctx.fillStyle = '#ff0055'; this.ctx.shadowColor = '#ff0055'; this.ctx.shadowBlur = 10;
      this.ctx.beginPath(); this.ctx.ellipse(this.ufo.x+20, this.ufo.y, 20, 10, 0, 0, Math.PI*2); this.ctx.fill();
      this.ctx.fillStyle = '#ff6688';
      this.ctx.beginPath(); this.ctx.ellipse(this.ufo.x+20, this.ufo.y-6, 10, 6, 0, 0, Math.PI*2); this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // Enemies
    this.enemies.filter(e => e.alive).forEach(e => this.drawEnemy(e));

    // Player
    this.ctx.fillStyle = '#00f3ff'; this.ctx.shadowColor = '#00f3ff'; this.ctx.shadowBlur = 10;
    this.ctx.fillRect(this.player.x+14, this.player.y-10, 12, 10);
    this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
    this.ctx.shadowBlur = 0;

    // Player bullets
    this.ctx.fillStyle = '#00f3ff'; this.ctx.shadowColor = '#00f3ff'; this.ctx.shadowBlur = 6;
    this.bullets.forEach(b => { this.ctx.fillRect(b.x-2, b.y, 4, 12); });
    this.ctx.shadowBlur = 0;

    // Enemy bullets
    this.ctx.fillStyle = '#ff0055';
    this.enemyBullets.forEach(b => { this.ctx.fillRect(b.x-2, b.y, 4, 10); });

    // Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life;
      this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2); this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    // HUD
    this.ctx.fillStyle = '#00f3ff'; this.ctx.font = '14px Outfit, sans-serif';
    this.ctx.fillText(`❤️ ${'♥'.repeat(this.lives)}`, 10, 530);
    this.ctx.fillText(`Wave ${this.wave}`, this.canvas.width/2-30, 530);
    this.ctx.fillText(`Enemies: ${this.enemies.filter(e => e.alive).length}`, this.canvas.width-120, 530);
  }
}
