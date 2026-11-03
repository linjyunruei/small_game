/**
 * Minesweeper Game Engine
 */
class MinesweeperGame {
  constructor(containerEl, updateScoreCb, gameOverCb) {
    this.container = containerEl;
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.ROWS = 9; this.COLS = 9; this.MINES = 10;
    this.board = [];
    this.revealed = [];
    this.flagged = [];
    this.firstClick = true;
    this.gameOver = false;
    this.won = false;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isRunning = false;
    this.isPaused = false;
  }

  start() {
    this.board = Array.from({length:this.ROWS}, () => Array(this.COLS).fill(0));
    this.revealed = Array.from({length:this.ROWS}, () => Array(this.COLS).fill(false));
    this.flagged = Array.from({length:this.ROWS}, () => Array(this.COLS).fill(false));
    this.firstClick = true; this.gameOver = false; this.won = false;
    this.timerSeconds = 0;
    this.stopTimer();
    this.isRunning = true; this.isPaused = false;
    this.render();
    this.updateScore(`💣 ${this.MINES}  ⏱️ 00:00`);
  }

  pause() { this.isPaused = true; this.stopTimer(); }
  resume() { this.isPaused = false; this.startTimer(); }
  stop() { this.isRunning = false; this.stopTimer(); }
  destroy() { this.stopTimer(); this.container.innerHTML = ''; }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.isRunning && !this.gameOver) {
        this.timerSeconds++;
        const mm = String(Math.floor(this.timerSeconds/60)).padStart(2,'0');
        const ss = String(this.timerSeconds%60).padStart(2,'0');
        const remaining = this.MINES - this.flagged.flat().filter(f=>f).length;
        this.updateScore(`💣 ${remaining}  ⏱️ ${mm}:${ss}`);
      }
    }, 1000);
  }

  stopTimer() { if (this.timerInterval) clearInterval(this.timerInterval); }

  placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < this.MINES) {
      const r = Math.floor(Math.random()*this.ROWS);
      const c = Math.floor(Math.random()*this.COLS);
      if (this.board[r][c] !== -1 && !(Math.abs(r-safeR) <= 1 && Math.abs(c-safeC) <= 1)) {
        this.board[r][c] = -1; placed++;
      }
    }
    // Calculate numbers
    for (let r = 0; r < this.ROWS; r++)
      for (let c = 0; c < this.COLS; c++)
        if (this.board[r][c] !== -1) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r+dr, nc = c+dc;
              if (nr>=0 && nr<this.ROWS && nc>=0 && nc<this.COLS && this.board[nr][nc]===-1) count++;
            }
          this.board[r][c] = count;
        }
  }

  reveal(r, c) {
    if (r<0||r>=this.ROWS||c<0||c>=this.COLS) return;
    if (this.revealed[r][c] || this.flagged[r][c]) return;

    if (this.firstClick) {
      this.placeMines(r, c);
      this.firstClick = false;
      this.startTimer();
    }

    this.revealed[r][c] = true;
    audioManager.playClick();

    if (this.board[r][c] === -1) {
      // Reveal all mines
      for (let rr = 0; rr < this.ROWS; rr++)
        for (let cc = 0; cc < this.COLS; cc++)
          if (this.board[rr][cc] === -1) this.revealed[rr][cc] = true;
      this.gameOver = true; this.isRunning = false;
      this.stopTimer();
      audioManager.playGameOver();
      this.render();
      this.gameOverCb('💥 踩到地雷了！');
      return;
    }

    if (this.board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          this.reveal(r+dr, c+dc);
    }

    this.checkWin();
    this.render();
  }

  flag(r, c) {
    if (this.revealed[r][c] || this.gameOver) return;
    this.flagged[r][c] = !this.flagged[r][c];
    audioManager.playClick();
    this.render();
  }

  checkWin() {
    let unrevealed = 0;
    for (let r = 0; r < this.ROWS; r++)
      for (let c = 0; c < this.COLS; c++)
        if (!this.revealed[r][c]) unrevealed++;
    if (unrevealed === this.MINES) {
      this.won = true; this.gameOver = true; this.isRunning = false;
      this.stopTimer();
      audioManager.playWin();
      this.render();
      this.gameOverCb(`🎉 成功排除地雷！用時 ${this.timerSeconds} 秒`);
    }
  }

  numColor(n) {
    const colors = ['','#2196F3','#4CAF50','#f44336','#9C27B0','#FF5722','#00BCD4','#000','#808080'];
    return colors[n] || '#fff';
  }

  render() {
    this.container.innerHTML = `
      <div class="ms-wrapper">
        <div class="ms-grid">
          ${this.board.map((row, r) => row.map((val, c) => {
            const rev = this.revealed[r][c];
            const flag = this.flagged[r][c];
            let content = '';
            let cls = 'ms-cell';
            if (rev) {
              cls += ' ms-revealed';
              if (val === -1) { content = '💣'; cls += ' ms-mine'; }
              else if (val > 0) { content = `<span style="color:${this.numColor(val)};font-weight:900;">${val}</span>`; }
            } else if (flag) {
              content = '🚩'; cls += ' ms-flagged';
            }
            return `<div class="${cls}" data-r="${r}" data-c="${c}">${content}</div>`;
          }).join('')).join('')}
        </div>
        <p class="ms-hint">左鍵翻開 | 右鍵/長按插旗 🚩</p>
      </div>
    `;

    this.container.querySelectorAll('.ms-cell').forEach(cell => {
      const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
      cell.addEventListener('click', () => { if (!this.gameOver) this.reveal(r, c); });
      cell.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!this.gameOver) this.flag(r, c); });
      // Long press for mobile
      let longPressTimer;
      cell.addEventListener('touchstart', () => { longPressTimer = setTimeout(() => this.flag(r, c), 500); }, {passive:true});
      cell.addEventListener('touchend', () => clearTimeout(longPressTimer), {passive:true});
    });
  }
}
