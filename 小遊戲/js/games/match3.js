/**
 * Match-3 Gems (消消樂) Game Engine
 */
class Match3Game {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.COLS = 8; this.ROWS = 8;
    this.TILE = 50;
    this.canvas.width = this.COLS * this.TILE;
    this.canvas.height = this.ROWS * this.TILE + 40;

    this.GEM_COLORS = ['#ff0055', '#00f3ff', '#ffbe0c', '#00ff66', '#b026ff', '#ff6600'];
    this.GEM_EMOJIS = ['🔴','🔵','🟡','🟢','🟣','🟠'];

    this.grid = [];
    this.score = 0;
    this.moves = 30;
    this.selected = null;
    this.animating = false;
    this.isRunning = false;
    this.isPaused = false;
    this.particles = [];
    this.animId = null;
    this.touchStart = null;

    this.bindEvents();
  }

  bindEvents() {
    this.handleClick = (e) => {
      if (!this.isRunning || this.isPaused || this.animating) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const c = Math.floor(mx / this.TILE);
      const r = Math.floor(my / this.TILE);
      if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) this.selectCell(r, c);
    };
    this.handleTouchStart = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.touchStart = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    };
    this.handleTouchEnd = (e) => {
      if (!this.isRunning || this.isPaused || !this.touchStart) return;
      const rect = this.canvas.getBoundingClientRect();
      const ex = e.changedTouches[0].clientX - rect.left;
      const ey = e.changedTouches[0].clientY - rect.top;
      const dx = ex - this.touchStart.x, dy = ey - this.touchStart.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        this.handleClick({ clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY });
      } else if (this.selected) {
        const { r, c } = this.selected;
        if (Math.abs(dx) > Math.abs(dy)) this.swap(r, c, r, c + (dx > 0 ? 1 : -1));
        else this.swap(r, c, r + (dy > 0 ? 1 : -1), c);
        this.selected = null;
      }
    };
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  start() {
    this.score = 0; this.moves = 30; this.selected = null;
    this.animating = false; this.particles = [];
    this.grid = Array.from({ length: this.ROWS }, () =>
      Array.from({ length: this.COLS }, () => Math.floor(Math.random() * this.GEM_COLORS.length))
    );
    // Clear initial matches
    let maxTries = 20;
    while (this.findMatches().length > 0 && maxTries-- > 0) {
      this.grid = Array.from({ length: this.ROWS }, () =>
        Array.from({ length: this.COLS }, () => Math.floor(Math.random() * this.GEM_COLORS.length))
      );
    }
    this.isRunning = true; this.isPaused = false;
    this.updateScore(this.score);
    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() {
    this.stop();
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  selectCell(r, c) {
    if (!this.selected) {
      this.selected = { r, c };
      audioManager.playClick();
    } else {
      const { r: sr, c: sc } = this.selected;
      if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
        this.swap(sr, sc, r, c);
        this.selected = null;
      } else {
        this.selected = { r, c };
        audioManager.playClick();
      }
    }
  }

  swap(r1, c1, r2, c2) {
    if (r2 < 0 || r2 >= this.ROWS || c2 < 0 || c2 >= this.COLS) return;
    const tmp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tmp;

    const matches = this.findMatches();
    if (matches.length === 0) {
      // Swap back
      const tmp2 = this.grid[r1][c1];
      this.grid[r1][c1] = this.grid[r2][c2];
      this.grid[r2][c2] = tmp2;
      audioManager.playGameOver();
    } else {
      this.moves--;
      this.animating = true;
      audioManager.playMove();
      this.processMatches();
    }
  }

  findMatches() {
    const matched = new Set();
    // Horizontal
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS - 2; c++) {
        const v = this.grid[r][c];
        if (v === this.grid[r][c+1] && v === this.grid[r][c+2]) {
          let len = 3;
          while (c+len < this.COLS && this.grid[r][c+len] === v) len++;
          for (let i = 0; i < len; i++) matched.add(`${r},${c+i}`);
        }
      }
    }
    // Vertical
    for (let c = 0; c < this.COLS; c++) {
      for (let r = 0; r < this.ROWS - 2; r++) {
        const v = this.grid[r][c];
        if (v === this.grid[r+1][c] && v === this.grid[r+2][c]) {
          let len = 3;
          while (r+len < this.ROWS && this.grid[r+len][c] === v) len++;
          for (let i = 0; i < len; i++) matched.add(`${r+i},${c}`);
        }
      }
    }
    return [...matched].map(s => { const [r,c] = s.split(','); return {r:+r, c:+c}; });
  }

  processMatches() {
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.animating = false;
      this.updateScore(this.score);
      if (this.moves <= 0) {
        this.isRunning = false;
        audioManager.playGameOver();
        this.gameOverCb(this.score);
      }
      return;
    }

    matches.forEach(({ r, c }) => {
      const color = this.GEM_COLORS[this.grid[r][c]];
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: c * this.TILE + this.TILE/2, y: r * this.TILE + this.TILE/2,
          vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
          color, life: 1.0, size: 4
        });
      }
      this.grid[r][c] = -1;
    });

    this.score += matches.length * 10;
    audioManager.playLineClear();

    // Gravity: drop down
    setTimeout(() => {
      for (let c = 0; c < this.COLS; c++) {
        let empty = this.ROWS - 1;
        for (let r = this.ROWS - 1; r >= 0; r--) {
          if (this.grid[r][c] !== -1) { this.grid[empty][c] = this.grid[r][c]; if (empty !== r) this.grid[r][c] = -1; empty--; }
        }
        for (let r = empty; r >= 0; r--) { this.grid[r][c] = Math.floor(Math.random() * this.GEM_COLORS.length); }
      }
      setTimeout(() => this.processMatches(), 200);
    }, 300);
  }

  gameLoop() {
    if (!this.isRunning) return;
    if (!this.isPaused) {
      this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.06; });
      this.particles = this.particles.filter(p => p.life > 0);
      this.draw();
    }
    this.animId = requestAnimationFrame(() => this.gameLoop());
  }

  draw() {
    const ctx = this.ctx, T = this.TILE;
    ctx.fillStyle = '#0d111e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const val = this.grid[r][c];
        const x = c * T, y = r * T;

        // Cell BG
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.fillRect(x+1, y+1, T-2, T-2);
        ctx.strokeRect(x+1, y+1, T-2, T-2);

        if (val < 0) continue;

        const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
        const color = this.GEM_COLORS[val];

        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 18 : 8;
        if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; }

        const pad = isSelected ? 4 : 6;
        ctx.beginPath();
        ctx.roundRect(x+pad, y+pad, T-pad*2, T-pad*2, 10);
        ctx.fill();
        if (isSelected) ctx.stroke();
        ctx.restore();

        // Gem label
        ctx.font = `${T * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.GEM_EMOJIS[val], x + T/2, y + T/2);
      }
    }

    // Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = '#00f3ff'; ctx.font = '14px Outfit, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`💎 剩餘步數：${this.moves}`, 10, this.canvas.height - 12);
    ctx.textAlign = 'right';
    ctx.fillText(`得分：${this.score}`, this.canvas.width - 10, this.canvas.height - 12);
    ctx.textAlign = 'left';
  }
}
