/**
 * Pac-Man Game Engine
 */
class PacManGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.TILE = 20;
    this.COLS = 21;
    this.ROWS = 23;
    this.canvas.width = this.COLS * this.TILE;
    this.canvas.height = this.ROWS * this.TILE + 40;

    // Map: 0=empty, 1=wall, 2=dot, 3=power
    this.baseMap = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
      [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
      [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
      [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
      [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
      [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
      [1,1,1,1,2,1,0,1,1,0,0,0,1,1,0,1,2,1,1,1,1],
      [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
      [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
      [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
      [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
      [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
      [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
      [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
      [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    this.map = [];
    this.totalDots = 0;
    this.dotsEaten = 0;
    this.score = 0;
    this.lives = 3;
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;

    this.pacman = { x: 10, y: 15, dx: 0, dy: 0, nextDx: 0, nextDy: 0, mouthAngle: 0, mouthDir: 1 };
    this.ghosts = [];
    this.powerMode = false;
    this.powerTimer = 0;
    this.frameCount = 0;

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { this.pacman.nextDx = -1; this.pacman.nextDy = 0; }
      if (e.key === 'ArrowRight' || e.key === 'd') { this.pacman.nextDx = 1; this.pacman.nextDy = 0; }
      if (e.key === 'ArrowUp' || e.key === 'w') { this.pacman.nextDx = 0; this.pacman.nextDy = -1; }
      if (e.key === 'ArrowDown' || e.key === 's') { this.pacman.nextDx = 0; this.pacman.nextDy = 1; }
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  handleTouch(action) {
    if (action === 'left') { this.pacman.nextDx = -1; this.pacman.nextDy = 0; }
    if (action === 'right') { this.pacman.nextDx = 1; this.pacman.nextDy = 0; }
    if (action === 'up') { this.pacman.nextDx = 0; this.pacman.nextDy = -1; }
    if (action === 'down') { this.pacman.nextDx = 0; this.pacman.nextDy = 1; }
  }

  initMap() {
    this.map = this.baseMap.map(row => [...row]);
    this.totalDots = 0;
    this.dotsEaten = 0;
    for (let r = 0; r < this.ROWS; r++)
      for (let c = 0; c < this.COLS; c++)
        if (this.map[r][c] === 2 || this.map[r][c] === 3) this.totalDots++;
  }

  initGhosts() {
    const colors = ['#ff0055', '#ff8800', '#ff88ff', '#00f3ff'];
    this.ghosts = colors.map((color, i) => ({
      x: 9 + i, y: 10, dx: i % 2 === 0 ? 1 : -1, dy: 0, color, scared: false, moveTimer: 0, speed: 12
    }));
  }

  start() {
    this.score = 0; this.lives = 3; this.powerMode = false; this.powerTimer = 0;
    this.pacman = { x: 10, y: 17, dx: 0, dy: 0, nextDx: -1, nextDy: 0, mouthAngle: 0, mouthDir: 1 };
    this.frameCount = 0;
    this.updateScore(this.score);
    this.initMap();
    this.initGhosts();
    this.isRunning = true; this.isPaused = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() { this.stop(); window.removeEventListener('keydown', this.handleKeyDown); }

  isWall(r, c) {
    if (r < 0 || r >= this.ROWS || c < 0 || c >= this.COLS) return true;
    return this.map[r][c] === 1;
  }

  update() {
    this.frameCount++;
    this.pacman.mouthAngle += 0.15 * this.pacman.mouthDir;
    if (this.pacman.mouthAngle > 0.35) this.pacman.mouthDir = -1;
    if (this.pacman.mouthAngle < 0.02) this.pacman.mouthDir = 1;

    if (this.powerMode) {
      this.powerTimer--;
      if (this.powerTimer <= 0) { this.powerMode = false; this.ghosts.forEach(g => g.scared = false); }
    }

    // Pacman movement every 8 frames
    if (this.frameCount % 8 === 0) {
      const nx = this.pacman.x + this.pacman.nextDx;
      const ny = this.pacman.y + this.pacman.nextDy;
      if (!this.isWall(ny, nx)) { this.pacman.dx = this.pacman.nextDx; this.pacman.dy = this.pacman.nextDy; }

      const mx = this.pacman.x + this.pacman.dx;
      const my = this.pacman.y + this.pacman.dy;
      if (!this.isWall(my, mx)) {
        this.pacman.x = (mx + this.COLS) % this.COLS;
        this.pacman.y = (my + this.ROWS) % this.ROWS;
      }

      const cell = this.map[this.pacman.y][this.pacman.x];
      if (cell === 2) {
        this.map[this.pacman.y][this.pacman.x] = 0;
        this.score += 10; this.dotsEaten++;
        this.updateScore(this.score);
        audioManager.playTone(440, 'sine', 0.05, 0.04);
      } else if (cell === 3) {
        this.map[this.pacman.y][this.pacman.x] = 0;
        this.score += 50; this.dotsEaten++;
        this.powerMode = true; this.powerTimer = 180;
        this.ghosts.forEach(g => g.scared = true);
        this.updateScore(this.score);
        audioManager.playPowerup();
      }

      if (this.dotsEaten >= this.totalDots) {
        this.initMap(); this.initGhosts();
        audioManager.playLineClear();
      }
    }

    // Ghost movement
    this.ghosts.forEach(ghost => {
      ghost.moveTimer++;
      const spd = ghost.scared ? 18 : ghost.speed;
      if (ghost.moveTimer < spd) return;
      ghost.moveTimer = 0;

      const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
      const valid = dirs.filter(d => !this.isWall(ghost.y+d.dy, ghost.x+d.dx) && !(d.dx===-ghost.dx && d.dy===-ghost.dy));
      let chosen;
      if (!ghost.scared && Math.random() < 0.7) {
        chosen = valid.reduce((best, d) => {
          const nx = ghost.x+d.dx, ny = ghost.y+d.dy;
          const dist = Math.abs(nx-this.pacman.x) + Math.abs(ny-this.pacman.y);
          return dist < best.dist ? {d, dist} : best;
        }, {d: valid[0]||dirs[0], dist: 9999}).d;
      } else {
        chosen = valid.length > 0 ? valid[Math.floor(Math.random()*valid.length)] : {dx:ghost.dx, dy:ghost.dy};
      }
      if (chosen) {
        ghost.dx = chosen.dx; ghost.dy = chosen.dy;
        const nx = ghost.x + ghost.dx, ny = ghost.y + ghost.dy;
        if (!this.isWall(ny, nx)) { ghost.x = (nx+this.COLS)%this.COLS; ghost.y = (ny+this.ROWS)%this.ROWS; }
      }

      // Ghost vs Pacman
      if (ghost.x === this.pacman.x && ghost.y === this.pacman.y) {
        if (ghost.scared) {
          ghost.scared = false; ghost.x = 10; ghost.y = 10;
          this.score += 200; this.updateScore(this.score); audioManager.playScore();
        } else {
          this.lives--;
          audioManager.playGameOver();
          if (this.lives <= 0) { this.handleGameOver(); return; }
          this.pacman.x = 10; this.pacman.y = 17; this.pacman.dx = 0; this.pacman.dy = 0;
          this.updateScore(this.score);
        }
      }
    });
  }

  handleGameOver() {
    this.isRunning = false;
    this.gameOverCb(this.score);
  }

  gameLoop() {
    if (!this.isRunning) return;
    if (!this.isPaused) { this.update(); this.draw(); }
    this.animId = requestAnimationFrame(() => this.gameLoop());
  }

  draw() {
    this.ctx.fillStyle = '#060810';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const T = this.TILE;

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const cell = this.map[r][c];
        const x = c * T, y = r * T;
        if (cell === 1) {
          this.ctx.fillStyle = '#1a2a7c'; this.ctx.shadowColor = '#00f3ff'; this.ctx.shadowBlur = 3;
          this.ctx.fillRect(x+1, y+1, T-2, T-2); this.ctx.shadowBlur = 0;
        } else if (cell === 2) {
          this.ctx.fillStyle = '#ffbe0c'; this.ctx.beginPath();
          this.ctx.arc(x+T/2, y+T/2, 2.5, 0, Math.PI*2); this.ctx.fill();
        } else if (cell === 3) {
          const pulse = 0.6 + 0.4*Math.sin(this.frameCount*0.15);
          this.ctx.fillStyle = `rgba(255, 190, 12, ${pulse})`;
          this.ctx.shadowColor = '#ffbe0c'; this.ctx.shadowBlur = 8;
          this.ctx.beginPath(); this.ctx.arc(x+T/2, y+T/2, 6, 0, Math.PI*2); this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }
    }

    // Pac-Man
    const px = this.pacman.x*T+T/2, py = this.pacman.y*T+T/2;
    let angle = 0;
    if (this.pacman.dx === 1) angle = 0;
    else if (this.pacman.dx === -1) angle = Math.PI;
    else if (this.pacman.dy === -1) angle = -Math.PI/2;
    else if (this.pacman.dy === 1) angle = Math.PI/2;

    this.ctx.fillStyle = '#ffea00'; this.ctx.shadowColor = '#ffea00'; this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);
    this.ctx.arc(px, py, T/2-2, angle + this.pacman.mouthAngle, angle + Math.PI*2 - this.pacman.mouthAngle);
    this.ctx.closePath(); this.ctx.fill(); this.ctx.shadowBlur = 0;

    // Ghosts
    this.ghosts.forEach(g => {
      const gx = g.x*T, gy = g.y*T;
      this.ctx.fillStyle = g.scared ? '#4444ff' : g.color;
      this.ctx.shadowColor = g.scared ? '#4444ff' : g.color; this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(gx+T/2, gy+T/2-2, T/2-2, Math.PI, 0);
      this.ctx.lineTo(gx+T-2, gy+T-2);
      for (let i = 0; i < 3; i++) {
        this.ctx.lineTo(gx+T-2-i*(T/3), gy+T-2-(i%2===0?4:0));
      }
      this.ctx.lineTo(gx+2, gy+T-2);
      this.ctx.closePath(); this.ctx.fill(); this.ctx.shadowBlur = 0;
      // Eyes
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath(); this.ctx.arc(gx+T/2-4, gy+T/2-4, 3, 0, Math.PI*2); this.ctx.fill();
      this.ctx.beginPath(); this.ctx.arc(gx+T/2+4, gy+T/2-4, 3, 0, Math.PI*2); this.ctx.fill();
    });

    // HUD
    this.ctx.fillStyle = '#ffea00'; this.ctx.font = '14px Outfit, sans-serif';
    this.ctx.fillText(`❤️ ${'♥'.repeat(this.lives)}`, 8, this.canvas.height-10);
    if (this.powerMode) {
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.fillText('POWER MODE!', this.canvas.width/2-50, this.canvas.height-10);
    }
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.fillText(`Dots: ${this.dotsEaten}/${this.totalDots}`, this.canvas.width-130, this.canvas.height-10);
  }
}
