/**
 * Tetris Game Engine
 */
class TetrisGame {
  constructor(mainCanvas, nextCanvas, holdCanvas, updateScoreCb, gameOverCb) {
    this.canvas = mainCanvas;
    this.ctx = mainCanvas.getContext('2d');
    this.nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
    this.holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;

    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.cols = 10;
    this.rows = 20;
    this.blockSize = 24; // 240x480 canvas

    this.canvas.width = this.cols * this.blockSize;
    this.canvas.height = this.rows * this.blockSize;

    if (nextCanvas) {
      nextCanvas.width = 96;
      nextCanvas.height = 96;
    }
    if (holdCanvas) {
      holdCanvas.width = 96;
      holdCanvas.height = 96;
    }

    this.SHAPES = {
      I: { color: '#00f3ff', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
      J: { color: '#0055ff', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
      L: { color: '#ffaa00', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
      O: { color: '#ffea00', matrix: [[1,1],[1,1]] },
      S: { color: '#00ff66', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
      T: { color: '#b026ff', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
      Z: { color: '#ff0055', matrix: [[1,1,0],[0,1,1],[0,0,0]] }
    };

    this.board = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isRunning = false;
    this.isPaused = false;

    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;

    this.dropCounter = 0;
    this.dropInterval = 800; // ms
    this.lastTime = 0;
    this.animId = null;

    this.clearingRows = [];

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused) return;

      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A':
          this.move(-1);
          break;
        case 'ArrowRight': case 'd': case 'D':
          this.move(1);
          break;
        case 'ArrowDown': case 's': case 'S':
          this.drop();
          break;
        case 'ArrowUp': case 'w': case 'W': case 'x': case 'X':
          this.rotatePiece();
          break;
        case ' ':
          this.hardDrop();
          break;
        case 'c': case 'C': case 'Shift':
          this.doHold();
          break;
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  handleTouch(action) {
    if (!this.isRunning || this.isPaused) return;
    if (action === 'left') this.move(-1);
    if (action === 'right') this.move(1);
    if (action === 'down') this.drop();
    if (action === 'rotate') this.rotatePiece();
    if (action === 'harddrop') this.hardDrop();
    if (action === 'hold') this.doHold();
  }

  start() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 800;
    this.holdPiece = null;
    this.canHold = true;
    this.updateScore(this.score);

    this.nextPiece = this.generatePiece();
    this.spawnPiece();

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    if (this.animId) cancelAnimationFrame(this.animId);
    this.gameLoop(performance.now());
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; this.lastTime = performance.now(); }
  stop() { this.isRunning = false; if (this.animId) cancelAnimationFrame(this.animId); }
  destroy() { this.stop(); window.removeEventListener('keydown', this.handleKeyDown); }

  generatePiece() {
    const keys = Object.keys(this.SHAPES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const shape = this.SHAPES[key];
    return {
      key: key,
      color: shape.color,
      matrix: shape.matrix.map(row => [...row]),
      x: Math.floor((this.cols - shape.matrix[0].length) / 2),
      y: 0
    };
  }

  spawnPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generatePiece();
    this.canHold = true;

    if (this.collide(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
      // Game Over
      this.isRunning = false;
      audioManager.playGameOver();
      this.gameOverCb(this.score);
    }
  }

  doHold() {
    if (!this.canHold) return;
    audioManager.playRotate();
    if (!this.holdPiece) {
      this.holdPiece = {
        key: this.currentPiece.key,
        color: this.SHAPES[this.currentPiece.key].color,
        matrix: this.SHAPES[this.currentPiece.key].matrix.map(r => [...r])
      };
      this.spawnPiece();
    } else {
      const tempKey = this.currentPiece.key;
      this.currentPiece = {
        key: this.holdPiece.key,
        color: this.SHAPES[this.holdPiece.key].color,
        matrix: this.SHAPES[this.holdPiece.key].matrix.map(r => [...r]),
        x: Math.floor((this.cols - this.SHAPES[this.holdPiece.key].matrix[0].length) / 2),
        y: 0
      };
      this.holdPiece = {
        key: tempKey,
        color: this.SHAPES[tempKey].color,
        matrix: this.SHAPES[tempKey].matrix.map(r => [...r])
      };
    }
    this.canHold = false;
  }

  collide(x, y, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
          if (newY >= 0 && this.board[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  }

  move(dir) {
    if (!this.collide(this.currentPiece.x + dir, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x += dir;
      audioManager.playMove();
    }
  }

  rotatePiece() {
    const matrix = this.currentPiece.matrix;
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        rotated[c][N - 1 - r] = matrix[r][c];
      }
    }

    // Wall Kick checks
    let offset = 0;
    if (!this.collide(this.currentPiece.x, this.currentPiece.y, rotated)) {
      this.currentPiece.matrix = rotated;
      audioManager.playRotate();
    } else if (!this.collide(this.currentPiece.x - 1, this.currentPiece.y, rotated)) {
      this.currentPiece.x -= 1;
      this.currentPiece.matrix = rotated;
      audioManager.playRotate();
    } else if (!this.collide(this.currentPiece.x + 1, this.currentPiece.y, rotated)) {
      this.currentPiece.x += 1;
      this.currentPiece.matrix = rotated;
      audioManager.playRotate();
    }
  }

  drop() {
    if (!this.collide(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y += 1;
    } else {
      this.lockPiece();
    }
    this.dropCounter = 0;
  }

  hardDrop() {
    while (!this.collide(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y += 1;
    }
    audioManager.playDrop();
    this.lockPiece();
  }

  lockPiece() {
    const { x, y, matrix, color } = this.currentPiece;
    matrix.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== 0 && y + r >= 0) {
          this.board[y + r][x + c] = color;
        }
      });
    });

    this.checkLines();
    this.spawnPiece();
  }

  checkLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(this.cols).fill(0));
        cleared++;
        r++; // check same row index again
      }
    }

    if (cleared > 0) {
      const lineScores = [0, 100, 300, 500, 800];
      this.score += lineScores[cleared] * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 800 - (this.level - 1) * 70);

      this.updateScore(this.score);
      audioManager.playLineClear();
    }
  }

  getGhostY() {
    let ghostY = this.currentPiece.y;
    while (!this.collide(this.currentPiece.x, ghostY + 1, this.currentPiece.matrix)) {
      ghostY++;
    }
    return ghostY;
  }

  gameLoop(time) {
    if (!this.isRunning) return;
    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    if (!this.isPaused) {
      this.dropCounter += deltaTime;
      if (this.dropCounter > this.dropInterval) {
        this.drop();
      }
      this.draw();
    }

    this.animId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  drawPreview(ctx, piece) {
    if (!ctx) return;
    ctx.fillStyle = '#0d111e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!piece) return;

    const matrix = piece.matrix;
    const size = 20;
    const offsetX = (ctx.canvas.width - matrix[0].length * size) / 2;
    const offsetY = (ctx.canvas.height - matrix.length * size) / 2;

    matrix.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== 0) {
          ctx.fillStyle = piece.color;
          ctx.beginPath();
          ctx.roundRect(offsetX + c * size, offsetY + r * size, size - 2, size - 2, 3);
          ctx.fill();
        }
      });
    });
  }

  draw() {
    // Clear Background
    this.ctx.fillStyle = '#0d111e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid Lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.ctx.strokeRect(c * this.blockSize, r * this.blockSize, this.blockSize, this.blockSize);
      }
    }

    // Draw Placed Board Blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== 0) {
          this.ctx.fillStyle = this.board[r][c];
          this.ctx.shadowColor = this.board[r][c];
          this.ctx.shadowBlur = 4;
          this.ctx.beginPath();
          this.ctx.roundRect(c * this.blockSize + 1, r * this.blockSize + 1, this.blockSize - 2, this.blockSize - 2, 4);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }
    }

    if (this.currentPiece) {
      // Draw Ghost Piece
      const ghostY = this.getGhostY();
      this.currentPiece.matrix.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val !== 0) {
            const gx = (this.currentPiece.x + c) * this.blockSize;
            const gy = (ghostY + r) * this.blockSize;
            this.ctx.strokeStyle = this.currentPiece.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 4]);
            this.ctx.strokeRect(gx + 2, gy + 2, this.blockSize - 4, this.blockSize - 4);
            this.ctx.setLineDash([]);
          }
        });
      });

      // Draw Current Active Piece
      this.currentPiece.matrix.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val !== 0) {
            const px = (this.currentPiece.x + c) * this.blockSize;
            const py = (this.currentPiece.y + r) * this.blockSize;
            this.ctx.fillStyle = this.currentPiece.color;
            this.ctx.shadowColor = this.currentPiece.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.roundRect(px + 1, py + 1, this.blockSize - 2, this.blockSize - 2, 4);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
          }
        });
      });
    }

    // Draw Previews
    this.drawPreview(this.nextCtx, this.nextPiece);
    this.drawPreview(this.holdCtx, this.holdPiece);
  }
}
