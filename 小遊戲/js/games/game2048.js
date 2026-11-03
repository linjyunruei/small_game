/**
 * 2048 Game Engine
 */
class Game2048 {
  constructor(containerEl, updateScoreCb, gameOverCb) {
    this.container = containerEl;
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.size = 4;
    this.grid = [];
    this.score = 0;
    this.best = storageManager.getHighScore('2048');
    this.isRunning = false;
    this.isPaused = false;
    this.moving = false;
    // Touch swipe tracking
    this.touchStartX = 0; this.touchStartY = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused || this.moving) return;
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
                    w: 'up', s: 'down', a: 'left', d: 'right' };
      if (map[e.key]) { e.preventDefault(); this.move(map[e.key]); }
    };
    this.handleTouchStart = (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    };
    this.handleTouchEnd = (e) => {
      if (!this.isRunning || this.isPaused) return;
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) { this.move(dx > 0 ? 'right' : 'left'); }
      else { this.move(dy > 0 ? 'down' : 'up'); }
    };
    window.addEventListener('keydown', this.handleKeyDown);
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  handleTouch(action) {
    if (!this.isRunning || this.isPaused) return;
    this.move(action);
  }

  start() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.score = 0;
    this.moving = false;
    this.addTile(); this.addTile();
    this.isRunning = true; this.isPaused = false;
    this.render();
    this.updateScore(this.score);
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; }
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
    this.container.innerHTML = '';
  }

  addTile() {
    const empty = [];
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        if (this.grid[r][c] === 0) empty.push([r, c]);
    if (empty.length === 0) return false;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  slideRow(row) {
    let arr = row.filter(v => v !== 0);
    let merged = false;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i+1]) {
        arr[i] *= 2; arr.splice(i+1, 1); this.score += arr[i]; merged = true;
      }
    }
    while (arr.length < this.size) arr.push(0);
    return { row: arr, merged };
  }

  move(dir) {
    const prev = JSON.stringify(this.grid);
    let anyMerged = false;

    if (dir === 'left') {
      for (let r = 0; r < this.size; r++) {
        const { row, merged } = this.slideRow(this.grid[r]);
        this.grid[r] = row; if (merged) anyMerged = true;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < this.size; r++) {
        const { row, merged } = this.slideRow([...this.grid[r]].reverse());
        this.grid[r] = row.reverse(); if (merged) anyMerged = true;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < this.size; c++) {
        let col = this.grid.map(r => r[c]);
        const { row, merged } = this.slideRow(col);
        row.forEach((v, r) => this.grid[r][c] = v); if (merged) anyMerged = true;
      }
    } else if (dir === 'down') {
      for (let c = 0; c < this.size; c++) {
        let col = this.grid.map(r => r[c]).reverse();
        const { row, merged } = this.slideRow(col);
        row.reverse().forEach((v, r) => this.grid[r][c] = v); if (merged) anyMerged = true;
      }
    }

    const changed = JSON.stringify(this.grid) !== prev;
    if (changed) {
      this.addTile();
      if (anyMerged) audioManager.playScore();
      else audioManager.playMove();
      this.updateScore(this.score);
      storageManager.setHighScore('2048', this.score);
      this.best = storageManager.getHighScore('2048');

      // Check 2048
      if (this.grid.some(row => row.some(v => v >= 2048))) {
        this.isRunning = false;
        audioManager.playWin();
        this.render();
        this.gameOverCb(this.score);
        return;
      }

      // Check game over
      if (!this.hasMoves()) {
        this.isRunning = false;
        audioManager.playGameOver();
        this.render();
        this.gameOverCb(this.score);
        return;
      }
    }
    this.render();
  }

  hasMoves() {
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return true;
        if (c+1 < this.size && this.grid[r][c] === this.grid[r][c+1]) return true;
        if (r+1 < this.size && this.grid[r][c] === this.grid[r+1][c]) return true;
      }
    return false;
  }

  getTileColor(val) {
    const colors = {
      0:'#1a1f38', 2:'#2d3580', 4:'#3a42a0', 8:'#00a8ff', 16:'#00c4cc',
      32:'#00ff88', 64:'#b026ff', 128:'#ff6600', 256:'#ff0055', 512:'#ffbe0c',
      1024:'#ff0099', 2048:'#00f3ff'
    };
    return colors[val] || '#ffffff';
  }

  render() {
    this.container.innerHTML = `
      <div class="g2048-wrapper">
        <div class="g2048-grid" id="grid-2048">
          ${this.grid.map((row, r) => row.map((val, c) => `
            <div class="g2048-cell" style="background:${this.getTileColor(val)}; ${val >= 8 ? 'color:#fff;' : 'color:#eee;'} ${val > 0 ? 'box-shadow: 0 0 12px ' + this.getTileColor(val) + ';' : ''}">
              ${val > 0 ? val : ''}
            </div>
          `).join('')).join('')}
        </div>
        <p class="g2048-hint">↑ ↓ ← → 方向鍵或滑動移動方塊合併至 <strong>2048</strong>！</p>
      </div>
    `;
  }
}
