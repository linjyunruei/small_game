/**
 * Gomoku (五子棋) Game Engine
 */
class GomokuGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;
    this.SIZE = 15;
    this.TILE = 30;
    const pad = this.TILE;
    this.canvas.width = (this.SIZE - 1) * this.TILE + pad * 2;
    this.canvas.height = (this.SIZE - 1) * this.TILE + pad * 2;
    this.PAD = pad;
    this.board = [];
    this.currentPlayer = 1; // 1=black, 2=white
    this.mode = 'ai'; // 'pvp' or 'ai'
    this.isRunning = false;
    this.isPaused = false;
    this.winLine = null;
    this.moveCount = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.handleClick = (e) => {
      if (!this.isRunning || this.isPaused) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const c = Math.round((mx - this.PAD) / this.TILE);
      const r = Math.round((my - this.PAD) / this.TILE);
      if (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE) {
        this.placeStone(r, c);
      }
    };
    this.canvas.addEventListener('click', this.handleClick);
  }

  handleTouch(action) {}

  start() {
    this.board = Array.from({length:this.SIZE}, () => Array(this.SIZE).fill(0));
    this.currentPlayer = 1; this.winLine = null; this.moveCount = 0;
    this.isRunning = true; this.isPaused = false;
    this.updateScore('⚫ 黑棋先手');
    this.draw();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; }
  destroy() { this.stop(); this.canvas.removeEventListener('click', this.handleClick); }

  placeStone(r, c) {
    if (this.board[r][c] !== 0) return;
    this.board[r][c] = this.currentPlayer;
    this.moveCount++;
    audioManager.playClick();
    this.draw();

    const winner = this.checkWinner(r, c, this.currentPlayer);
    if (winner) {
      this.isRunning = false;
      audioManager.playWin();
      const name = this.currentPlayer === 1 ? '⚫ 黑棋' : '⚪ 白棋';
      this.gameOverCb(`${name} 獲勝！`);
      return;
    }

    if (this.moveCount === this.SIZE * this.SIZE) {
      this.isRunning = false;
      audioManager.playScore();
      this.gameOverCb('平局！');
      return;
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.updateScore(this.currentPlayer === 1 ? '⚫ 黑棋落子' : '⚪ 白棋落子');

    if (this.mode === 'ai' && this.currentPlayer === 2) {
      setTimeout(() => this.aiMove(), 200);
    }
  }

  aiMove() {
    if (!this.isRunning) return;
    let best = -Infinity, bestR = -1, bestC = -1;
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (this.board[r][c] !== 0) continue;
        const score = this.evalPos(r, c, 2) * 1.1 + this.evalPos(r, c, 1);
        if (score > best) { best = score; bestR = r; bestC = c; }
      }
    }
    if (bestR >= 0) this.placeStone(bestR, bestC);
  }

  evalPos(r, c, player) {
    this.board[r][c] = player;
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    dirs.forEach(([dr, dc]) => {
      let count = 1, openEnds = 0;
      for (let dir = -1; dir <= 1; dir += 2) {
        let nr = r+dr*dir, nc = c+dc*dir;
        while (nr>=0&&nr<this.SIZE&&nc>=0&&nc<this.SIZE&&this.board[nr][nc]===player) { count++; nr+=dr*dir; nc+=dc*dir; }
        if (nr>=0&&nr<this.SIZE&&nc>=0&&nc<this.SIZE&&this.board[nr][nc]===0) openEnds++;
      }
      const vals = [0, 10, 100, 1000, 10000, 100000];
      score += (vals[Math.min(count,5)] || 0) * (openEnds > 0 ? 1 : 0.5);
    });
    this.board[r][c] = 0;
    return score;
  }

  checkWinner(r, c, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let cells = [[r, c]];
      for (let dir = -1; dir <= 1; dir += 2) {
        let nr = r+dr*dir, nc = c+dc*dir;
        while (nr>=0&&nr<this.SIZE&&nc>=0&&nc<this.SIZE&&this.board[nr][nc]===player) {
          cells.push([nr, nc]); nr+=dr*dir; nc+=dc*dir;
        }
      }
      if (cells.length >= 5) { this.winLine = cells; return true; }
    }
    return false;
  }

  draw() {
    const ctx = this.ctx, T = this.TILE, P = this.PAD, S = this.SIZE;
    // Background
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Wood texture feel
    const grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    grad.addColorStop(0, '#2a1e0a'); grad.addColorStop(1, '#1a1208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(200, 160, 80, 0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < S; i++) {
      ctx.beginPath(); ctx.moveTo(P + i*T, P); ctx.lineTo(P + i*T, P + (S-1)*T); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P, P + i*T); ctx.lineTo(P + (S-1)*T, P + i*T); ctx.stroke();
    }

    // Star points
    ctx.fillStyle = 'rgba(200,160,80,0.8)';
    [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].forEach(([r, c]) => {
      ctx.beginPath(); ctx.arc(P+c*T, P+r*T, 4, 0, Math.PI*2); ctx.fill();
    });

    // Stones
    this.board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === 0) return;
        const x = P+c*T, y = P+r*T;
        const g = ctx.createRadialGradient(x-3, y-3, 2, x, y, T/2-2);
        if (cell === 1) { g.addColorStop(0,'#666'); g.addColorStop(1,'#111'); }
        else { g.addColorStop(0,'#fff'); g.addColorStop(1,'#bbb'); }
        ctx.fillStyle = g;
        ctx.shadowColor = cell===1?'#000':'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(x, y, T/2-2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    // Win line highlight
    if (this.winLine) {
      this.winLine.forEach(([r, c]) => {
        ctx.fillStyle = 'rgba(255,190,12,0.5)';
        ctx.shadowColor = '#ffbe0c'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(P+c*T, P+r*T, T/2-2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }
  }
}
