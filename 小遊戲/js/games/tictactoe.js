/**
 * Tic-Tac-Toe Engine with Minimax AI
 */
class TicTacToeGame {
  constructor(containerEl, updateScoreCb, gameOverCb) {
    this.container = containerEl;
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.mode = 'ai'; // 'pvp' or 'ai'
    this.difficulty = 'hard'; // 'easy' or 'hard' (minimax)
    this.isGameOver = false;
    this.winningCombo = null;

    this.stats = { xWins: 0, oWins: 0, draws: 0 };
  }

  setMode(mode, difficulty = 'hard') {
    this.mode = mode;
    this.difficulty = difficulty;
    this.reset();
  }

  start() {
    this.reset();
  }

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.isGameOver = false;
    this.winningCombo = null;
    this.render();
  }

  pause() {}
  resume() {}
  stop() {}
  destroy() {
    this.container.innerHTML = '';
  }

  makeMove(index) {
    if (this.board[index] || this.isGameOver) return;

    this.board[index] = this.currentPlayer;
    audioManager.playClick();

    const winnerInfo = this.checkWinner(this.board);
    if (winnerInfo) {
      this.handleEndGame(winnerInfo);
      return;
    }

    if (this.board.every(cell => cell !== null)) {
      this.handleEndGame({ winner: 'draw' });
      return;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.render();

    if (this.mode === 'ai' && this.currentPlayer === 'O' && !this.isGameOver) {
      setTimeout(() => this.aiMove(), 350);
    }
  }

  aiMove() {
    let bestIndex;
    if (this.difficulty === 'easy') {
      const emptyIndices = this.board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
      bestIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    } else {
      bestIndex = this.getBestMove();
    }

    if (bestIndex !== undefined) {
      this.makeMove(bestIndex);
    }
  }

  getBestMove() {
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) {
        this.board[i] = 'O';
        let score = this.minimax(this.board, 0, false);
        this.board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }

  minimax(board, depth, isMaximizing) {
    const info = this.checkWinner(board);
    if (info) {
      if (info.winner === 'O') return 10 - depth;
      if (info.winner === 'X') return depth - 10;
      if (info.winner === 'draw') return 0;
    }
    if (board.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          let score = this.minimax(board, depth + 1, false);
          board[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          let score = this.minimax(board, depth + 1, true);
          board[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  checkWinner(b) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (let line of lines) {
      const [a, bIdx, c] = line;
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a], combo: line };
      }
    }
    if (b.every(cell => cell !== null)) return { winner: 'draw' };
    return null;
  }

  handleEndGame(info) {
    this.isGameOver = true;
    if (info.winner === 'X') {
      this.stats.xWins++;
      audioManager.playWin();
    } else if (info.winner === 'O') {
      this.stats.oWins++;
      audioManager.playGameOver();
    } else {
      this.stats.draws++;
      audioManager.playScore();
    }
    this.winningCombo = info.combo || null;
    this.render();

    const resultMsg = info.winner === 'draw' ? 'Draw' : `${info.winner} Wins!`;
    this.updateScore(this.stats);
    this.gameOverCb(resultMsg);
  }

  render() {
    this.container.innerHTML = `
      <div class="ttt-board">
        ${this.board.map((cell, idx) => {
          const isWinCell = this.winningCombo && this.winningCombo.includes(idx);
          let content = '';
          if (cell === 'X') content = '<span class="ttt-x">X</span>';
          if (cell === 'O') content = '<span class="ttt-o">O</span>';
          return `<button class="ttt-cell ${isWinCell ? 'win-cell' : ''}" data-index="${idx}">${content}</button>`;
        }).join('')}
      </div>
    `;

    const buttons = this.container.querySelectorAll('.ttt-cell');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.makeMove(idx);
      });
    });
  }
}
