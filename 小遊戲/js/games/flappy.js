/**
 * Flappy Bird Game Engine
 */
class FlappyGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.canvas.width = 360;
    this.canvas.height = 500;

    this.bird = { x: 80, y: 250, radius: 14, velocity: 0, gravity: 0.45, flapForce: -8.5, rotation: 0 };
    this.pipes = [];
    this.pipeWidth = 52;
    this.pipeGap = 130;
    this.pipeSpawnTimer = 0;
    this.pipeSpawnInterval = 90; // frames

    this.score = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;
    this.particles = [];

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.flap();
      }
    };
    this.handleClick = () => {
      this.flap();
    };

    window.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('mousedown', this.handleClick);
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.flap(); }, { passive: false });
  }

  handleTouch(action) {
    if (action === 'flap') this.flap();
  }

  start() {
    this.bird = { x: 80, y: 250, radius: 14, velocity: 0, gravity: 0.45, flapForce: -8.5, rotation: 0 };
    this.pipes = [];
    this.particles = [];
    this.pipeSpawnTimer = 0;
    this.score = 0;
    this.updateScore(this.score);

    this.isRunning = true;
    this.isPaused = false;

    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  flap() {
    if (!this.isRunning || this.isPaused) return;
    this.bird.velocity = this.bird.flapForce;
    audioManager.playTone(550, 'sine', 0.08, 0.08);

    // Create feather particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.bird.x - 10,
        y: this.bird.y + (Math.random() - 0.5) * 10,
        vx: -Math.random() * 3 - 1,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        size: Math.random() * 4 + 2
      });
    }
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('mousedown', this.handleClick);
  }

  spawnPipe() {
    const minTop = 60;
    const maxTop = this.canvas.height - this.pipeGap - 100;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    this.pipes.push({
      x: this.canvas.width,
      top: topHeight,
      bottom: this.canvas.height - topHeight - this.pipeGap,
      passed: false
    });
  }

  update() {
    // Update Bird
    this.bird.velocity += this.bird.gravity;
    this.bird.y += this.bird.velocity;
    this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.velocity * 0.08));

    // Floor & Ceiling Collision
    if (this.bird.y - this.bird.radius <= 0 || this.bird.y + this.bird.radius >= this.canvas.height - 30) {
      this.handleGameOver();
      return;
    }

    // Pipes Spawning & Movement
    this.pipeSpawnTimer++;
    if (this.pipeSpawnTimer >= this.pipeSpawnInterval) {
      this.spawnPipe();
      this.pipeSpawnTimer = 0;
    }

    this.pipes.forEach(pipe => {
      pipe.x -= 2.5;

      // Check Pass
      if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
        pipe.passed = true;
        this.score += 1;
        this.updateScore(this.score);
        audioManager.playScore();
      }

      // Check Pipe Collision
      if (
        this.bird.x + this.bird.radius > pipe.x &&
        this.bird.x - this.bird.radius < pipe.x + this.pipeWidth
      ) {
        if (
          this.bird.y - this.bird.radius < pipe.top ||
          this.bird.y + this.bird.radius > this.canvas.height - pipe.bottom
        ) {
          this.handleGameOver();
        }
      }
    });

    // Filter offscreen pipes
    this.pipes = this.pipes.filter(p => p.x + this.pipeWidth > -20);

    // Update Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
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
    // Dynamic Sky Gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0c1022');
    gradient.addColorStop(1, '#1b264f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Cityscape/Buildings Silhouette
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(0, 380, 50, 90);
    this.ctx.fillRect(70, 340, 60, 130);
    this.ctx.fillRect(150, 360, 70, 110);
    this.ctx.fillRect(240, 320, 50, 150);
    this.ctx.fillRect(310, 370, 40, 100);

    // Draw Ground
    this.ctx.fillStyle = '#00ff66';
    this.ctx.shadowColor = '#00ff66';
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 4);
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#111a2e';
    this.ctx.fillRect(0, this.canvas.height - 26, this.canvas.width, 26);

    // Draw Pipes
    this.pipes.forEach(pipe => {
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.shadowColor = '#00f3ff';
      this.ctx.shadowBlur = 10;

      // Top Pipe
      this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.top);
      this.ctx.fillRect(pipe.x - 4, pipe.top - 16, this.pipeWidth + 8, 16);

      // Bottom Pipe
      const bottomY = this.canvas.height - pipe.bottom;
      this.ctx.fillRect(pipe.x, bottomY, this.pipeWidth, pipe.bottom);
      this.ctx.fillRect(pipe.x - 4, bottomY, this.pipeWidth + 8, 16);

      this.ctx.shadowBlur = 0;
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = '#ffbe0c';
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // Draw Bird
    this.ctx.save();
    this.ctx.translate(this.bird.x, this.bird.y);
    this.ctx.rotate(this.bird.rotation);

    this.ctx.fillStyle = '#ffbe0c';
    this.ctx.shadowColor = '#ffbe0c';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.bird.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Beak
    this.ctx.fillStyle = '#ff0055';
    this.ctx.beginPath();
    this.ctx.moveTo(6, -2);
    this.ctx.lineTo(16, 2);
    this.ctx.lineTo(6, 6);
    this.ctx.closePath();
    this.ctx.fill();

    // Eye
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(4, -5, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0d111e';
    this.ctx.beginPath();
    this.ctx.arc(5, -5, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Wing
    this.ctx.fillStyle = '#e6a100';
    this.ctx.beginPath();
    this.ctx.ellipse(-4, 4, 7, 4, Math.PI / 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}
