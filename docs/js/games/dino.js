/**
 * Chrome Dino Runner Game Engine
 */
class DinoGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.canvas.width = 480;
    this.canvas.height = 260;

    this.GROUND_Y = 200;
    this.dino = { x: 60, y: this.GROUND_Y, w: 44, h: 50, vy: 0, ducking: false, legFrame: 0, legTimer: 0 };
    this.obstacles = [];
    this.clouds = [{x:150,y:60},{x:300,y:45},{x:420,y:70}];
    this.score = 0;
    this.speed = 5;
    this.spawnTimer = 0;
    this.spawnInterval = 90;
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;
    this.isDay = true;
    this.dayTimer = 0;
    this.frameCount = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused) return;
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') { e.preventDefault(); this.jump(); }
      if (e.key === 'ArrowDown' || e.key === 's') this.duck(true);
    };
    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowDown' || e.key === 's') this.duck(false);
    };
    this.handleTap = () => { if (this.isRunning && !this.isPaused) this.jump(); };
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousedown', this.handleTap);
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump(); }, { passive: false });
  }

  handleTouch(action) {
    if (action === 'up') this.jump();
    if (action === 'down') this.duck(true);
  }

  jump() {
    if (this.dino.y >= this.GROUND_Y && !this.dino.ducking) {
      this.dino.vy = -14;
      audioManager.playTone(330, 'triangle', 0.1, 0.07);
    }
  }

  duck(isDucking) {
    if (isDucking && this.dino.y >= this.GROUND_Y) {
      this.dino.ducking = true;
      this.dino.h = 30;
    } else {
      this.dino.ducking = false;
      this.dino.h = 50;
    }
  }

  start() {
    this.dino.y = this.GROUND_Y; this.dino.vy = 0; this.dino.ducking = false; this.dino.h = 50;
    this.obstacles = []; this.score = 0; this.speed = 5;
    this.spawnTimer = 0; this.spawnInterval = 90;
    this.frameCount = 0; this.dayTimer = 0; this.isDay = true;
    this.isRunning = true; this.isPaused = false;
    this.updateScore(0);
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
    this.canvas.removeEventListener('mousedown', this.handleTap);
  }

  spawnObstacle() {
    const type = Math.random() < 0.2 && this.score > 200 ? 'pterodactyl' : 'cactus';
    if (type === 'cactus') {
      const h = 30 + Math.floor(Math.random() * 3) * 15;
      this.obstacles.push({ x: this.canvas.width + 20, y: this.GROUND_Y + 50 - h, w: 24, h, type });
    } else {
      const flyY = this.GROUND_Y - 40 - Math.random() * 30;
      this.obstacles.push({ x: this.canvas.width + 20, y: flyY, w: 40, h: 28, type, frame: 0, frameTimer: 0 });
    }
  }

  update() {
    this.frameCount++;
    this.dayTimer++;
    if (this.dayTimer > 500) { this.isDay = !this.isDay; this.dayTimer = 0; }

    // Dino physics
    if (this.dino.y < this.GROUND_Y) {
      this.dino.vy += 0.7;
      this.dino.y += this.dino.vy;
    }
    if (this.dino.y >= this.GROUND_Y) { this.dino.y = this.GROUND_Y; this.dino.vy = 0; }

    // Leg animation
    this.dino.legTimer++;
    if (this.dino.legTimer > 8) { this.dino.legFrame = 1 - this.dino.legFrame; this.dino.legTimer = 0; }

    // Obstacles
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      this.spawnInterval = 60 + Math.floor(Math.random() * 50);
    }
    this.obstacles.forEach(ob => {
      ob.x -= this.speed;
      if (ob.type === 'pterodactyl') {
        ob.frameTimer++;
        if (ob.frameTimer > 12) { ob.frame = 1 - ob.frame; ob.frameTimer = 0; }
      }
    });
    this.obstacles = this.obstacles.filter(ob => ob.x + ob.w > 0);

    // Score & speed
    if (this.frameCount % 6 === 0) {
      this.score++;
      this.updateScore(this.score);
      this.speed = 5 + Math.floor(this.score / 100) * 0.5;
    }

    // Clouds
    this.clouds.forEach(c => { c.x -= 0.8; if (c.x < -80) c.x = this.canvas.width + 60; });

    // Collision
    const dHitbox = { x: this.dino.x + 6, y: this.dino.y + 50 - this.dino.h + 4, w: this.dino.w - 12, h: this.dino.h - 8 };
    for (const ob of this.obstacles) {
      if (dHitbox.x < ob.x + ob.w - 4 && dHitbox.x + dHitbox.w > ob.x + 4 &&
          dHitbox.y < ob.y + ob.h - 4 && dHitbox.y + dHitbox.h > ob.y + 4) {
        this.handleGameOver(); return;
      }
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

  draw() {
    const ctx = this.ctx;
    // Sky
    if (this.isDay) {
      ctx.fillStyle = '#f0f4ff'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // Sun
      ctx.fillStyle = '#ffea00'; ctx.shadowColor = '#ffea00'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(420, 40, 22, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#060810'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // Moon & stars
      ctx.fillStyle = '#ddeeff'; ctx.beginPath(); ctx.arc(420, 40, 18, 0, Math.PI*2); ctx.fill();
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect((i*83+7)%this.canvas.width, (i*59+13)%120, 2, 2);
      }
    }

    // Clouds
    ctx.fillStyle = this.isDay ? 'rgba(200,210,255,0.7)' : 'rgba(100,120,180,0.4)';
    this.clouds.forEach(c => {
      ctx.beginPath(); ctx.arc(c.x, c.y, 18, 0, Math.PI*2);
      ctx.arc(c.x+20, c.y-8, 14, 0, Math.PI*2);
      ctx.arc(c.x+40, c.y, 18, 0, Math.PI*2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = this.isDay ? '#888a90' : '#2a3040';
    ctx.fillRect(0, this.GROUND_Y + 50, this.canvas.width, 4);
    ctx.fillStyle = this.isDay ? '#aab0b8' : '#1e2535';
    ctx.fillRect(0, this.GROUND_Y + 54, this.canvas.width, 20);

    // Dino
    const dx = this.dino.x, dy = this.dino.y + 50 - this.dino.h;
    const dw = this.dino.w, dh = this.dino.h;
    ctx.fillStyle = this.isDay ? '#555' : '#aac';
    // Body
    ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh - 8, 8); ctx.fill();
    // Head
    ctx.fillRect(dx + 20, dy - 16, 20, 20);
    // Eye
    ctx.fillStyle = '#fff'; ctx.fillRect(dx+32, dy-13, 6, 6);
    ctx.fillStyle = '#333'; ctx.fillRect(dx+34, dy-11, 3, 3);
    // Mouth
    ctx.fillStyle = this.isDay ? '#555' : '#aac';
    ctx.fillRect(dx+36, dy-5, 8, 4);
    // Legs
    if (!this.dino.ducking) {
      ctx.fillStyle = this.isDay ? '#444' : '#99b';
      if (this.dino.y < this.GROUND_Y) {
        ctx.fillRect(dx+6, dy+dh-12, 10, 14);
        ctx.fillRect(dx+22, dy+dh-12, 10, 14);
      } else if (this.dino.legFrame === 0) {
        ctx.fillRect(dx+6, dy+dh-12, 10, 18); ctx.fillRect(dx+22, dy+dh-20, 10, 12);
      } else {
        ctx.fillRect(dx+6, dy+dh-20, 10, 12); ctx.fillRect(dx+22, dy+dh-12, 10, 18);
      }
    } else {
      ctx.fillRect(dx+2, dy+dh-6, 14, 10); ctx.fillRect(dx+18, dy+dh-6, 14, 10);
    }
    // Tail
    ctx.fillStyle = this.isDay ? '#555' : '#aac';
    ctx.beginPath(); ctx.moveTo(dx, dy+10); ctx.lineTo(dx-12, dy+20); ctx.lineTo(dx, dy+22); ctx.fill();

    // Obstacles
    this.obstacles.forEach(ob => {
      if (ob.type === 'cactus') {
        ctx.fillStyle = '#2d6a2d'; ctx.shadowColor = '#2d6a2d'; ctx.shadowBlur = 4;
        ctx.fillRect(ob.x+8, ob.y, 8, ob.h);
        ctx.fillRect(ob.x, ob.y + ob.h*0.3, ob.w, 8);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#8B4513'; ctx.shadowColor = '#cc6622'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.ellipse(ob.x+20, ob.y+14, 20, 14, 0, 0, Math.PI*2); ctx.fill();
        // Wings
        const wingUp = ob.frame === 0;
        ctx.beginPath();
        if (wingUp) { ctx.moveTo(ob.x+20, ob.y+8); ctx.lineTo(ob.x, ob.y-8); ctx.lineTo(ob.x+20, ob.y+8); }
        else { ctx.moveTo(ob.x+20, ob.y+8); ctx.lineTo(ob.x, ob.y+16); ctx.lineTo(ob.x+20, ob.y+8); }
        ctx.lineTo(ob.x+40, wingUp ? ob.y-8 : ob.y+16); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }
}
