/**
 * Arcade Hub UI Controller & Game Launcher Manager (15 Games)
 */

const GAMES_DATA = [
  // ── 格子碰撞類 ──
  { id: 'snake',     title: '貪吃蛇 (Snake)',          category: 'grid',   categoryName: '格子碰撞', icon: '🐍', description: '經典吞食蘋果格子遊戲，有3種特殊食物，速度隨分數提升！', classRef: SnakeGame },
  { id: 'tetris',    title: '俄羅斯方塊 (Tetris)',       category: 'grid',   categoryName: '格子碰撞', icon: '🧱', description: '7種 Tetromino 下落堆疊，Ghost 陰影預覽與 Hold 暫存功能。', classRef: TetrisGame },
  { id: 'game2048',  title: '2048',                    category: 'grid',   categoryName: '格子碰撞', icon: '🔢', description: '上下左右滑動合併數字方塊，挑戰湊出 2048！', classRef: Game2048 },

  // ── 物件互動類 ──
  { id: 'flappy',    title: '飛翔小鳥 (Flappy Bird)',   category: 'action', categoryName: '物件互動', icon: '🐦', description: '點擊拍翅對抗物理重力，靈巧穿越障礙管線衝高分！', classRef: FlappyGame },
  { id: 'catcher',   title: '接金幣 (Coin Catcher)',    category: 'action', categoryName: '物件互動', icon: '🪙', description: '控制籃子接金幣鑽石，避開炸彈，5連擊開啟 2x 加倍！', classRef: CatcherGame },
  { id: 'invaders',  title: '太空侵略者 (Space Invaders)', category: 'action', categoryName: '物件互動', icon: '🚀', description: '擊退外星人大軍！UFO 特別獎勵 +100，掩體可逐漸損壞。', classRef: InvadersGame },
  { id: 'dino',      title: '恐龍跳一跳 (Dino Runner)', category: 'action', categoryName: '物件互動', icon: '🦖', description: '跳躍/蹲下躲避仙人掌與飛龍，速度越跑越快，日夜循環！', classRef: DinoGame },
  { id: 'fruitninja',title: '水果忍者 (Fruit Ninja)',   category: 'action', categoryName: '物件互動', icon: '🍉', description: '滑鼠拖曳劃過切開水果，勿切炸彈，汁液粒子爆飛！', classRef: FruitNinjaGame },
  { id: 'pacman',    title: '小精靈 (Pac-Man)',         category: 'action', categoryName: '物件互動', icon: '🟡', description: '吃掉迷宮中所有豆豆，能量大豆讓鬼魂變藍可反殺！', classRef: PacManGame },

  // ── 邏輯棋牌類 ──
  { id: 'tictactoe', title: '井字棋 (Tic-Tac-Toe)',     category: 'logic',  categoryName: '邏輯棋牌', icon: '❌', description: '雙人對決或與 Unbeatable Minimax AI 進行棋盤對戰。', classRef: TicTacToeGame },
  { id: 'sudoku',    title: '數獨 (Sudoku)',             category: 'logic',  categoryName: '邏輯棋牌', icon: '🧩', description: '9x9 數字邏輯挑戰，衝突高亮、筆記模式、計時與提示。', classRef: SudokuGame },
  { id: 'gomoku',    title: '五子棋 (Gomoku)',           category: 'logic',  categoryName: '邏輯棋牌', icon: '⚫', description: '15x15 棋盤黑白對弈，雙人或挑戰五子棋貪心 AI！', classRef: GomokuGame },
  { id: 'minesweeper',title: '踩地雷 (Minesweeper)',    category: 'logic',  categoryName: '邏輯棋牌', icon: '💣', description: '左鍵翻開、右鍵插旗，首次點擊保證安全，空白自動擴散！', classRef: MinesweeperGame },
  { id: 'hangman',   title: '吊死鬼猜單字 (Hangman)',   category: 'logic',  categoryName: '邏輯棋牌', icon: '🔤', description: '逐字母猜英文單字，錯7次即失敗，涵蓋動物、科技、水果、國家！', classRef: HangmanGame },
  { id: 'match3',    title: '消消樂 (Match-3 Gems)',    category: 'logic',  categoryName: '邏輯棋牌', icon: '💎', description: '拖曳交換相鄰寶石三消連擊，30步內盡量衝高分！', classRef: Match3Game },
];

class ArcadeApp {
  constructor() {
    this.activeGameId = null;
    this.currentGameInstance = null;
    this.currentFilter = 'all';

    this.initDOM();
    this.bindEvents();
    this.renderCatalog();
    this.updateSoundBtnUI();
  }

  initDOM() {
    this.gamesGridEl = document.getElementById('games-grid');
    this.filterBtns = document.querySelectorAll('.tab-btn');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.modalEl = document.getElementById('game-modal');
    this.closeModalBtn = document.getElementById('close-modal-btn');
    this.pauseModalBtn = document.getElementById('pause-modal-btn');
    this.restartModalBtn = document.getElementById('restart-modal-btn');
    this.pauseOverlayEl = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('resume-btn');
    this.quitBtn = document.getElementById('quit-btn');
    this.gameViewportEl = document.getElementById('game-viewport');
    this.scoreTextEl = document.getElementById('score-text');
    this.highScoreTextEl = document.getElementById('highscore-text');
    this.modalTitleEl = document.getElementById('modal-game-title');
    this.touchControlsEl = document.getElementById('touch-controls');
  }

  bindEvents() {
    // Sound toggle
    this.soundToggleBtn.addEventListener('click', () => {
      const isMuted = audioManager.toggleMute();
      this.updateSoundBtnUI();
      audioManager.playClick();
    });

    // Category filter tabs
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderCatalog();
        audioManager.playClick();
      });
    });

    // Modal controls
    this.closeModalBtn.addEventListener('click', () => this.closeGame());
    this.pauseModalBtn.addEventListener('click', () => this.togglePause());
    this.restartModalBtn.addEventListener('click', () => this.restartGame());
    this.resumeBtn.addEventListener('click', () => this.togglePause());
    this.quitBtn.addEventListener('click', () => this.closeGame());

    // Touch D-Pad delegation
    this.touchControlsEl.querySelectorAll('.dpad-btn, .action-touch-btn').forEach(btn => {
      const triggerAction = (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        if (this.currentGameInstance && typeof this.currentGameInstance.handleTouch === 'function') {
          this.currentGameInstance.handleTouch(action);
        }
      };
      btn.addEventListener('touchstart', triggerAction, { passive: false });
      btn.addEventListener('click', triggerAction);
    });
  }

  updateSoundBtnUI() {
    if (audioManager.muted) {
      this.soundToggleBtn.innerHTML = '🔇 靜音';
      this.soundToggleBtn.style.color = '#8a96b8';
    } else {
      this.soundToggleBtn.innerHTML = '🔊 音效';
      this.soundToggleBtn.style.color = '#00f3ff';
    }
  }

  renderCatalog() {
    this.gamesGridEl.innerHTML = '';
    const filtered = GAMES_DATA.filter(g => this.currentFilter === 'all' || g.category === this.currentFilter);

    filtered.forEach(game => {
      const highScore = storageManager.getHighScore(game.id);
      const card = document.createElement('div');
      card.className = 'game-card';

      let catClass = 'cat-grid';
      if (game.category === 'action') catClass = 'cat-action';
      if (game.category === 'logic') catClass = 'cat-logic';

      card.innerHTML = `
        <div>
          <div class="card-header">
            <div class="game-icon-wrapper">${game.icon}</div>
            <span class="category-badge ${catClass}">${game.categoryName}</span>
          </div>
          <div class="card-body">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
          </div>
        </div>
        <div class="card-footer">
          <div>
            <span class="highscore-label">最高紀錄</span>
            <span class="highscore-value">${highScore}</span>
          </div>
          <button class="play-btn" data-id="${game.id}">開始遊戲 🎮</button>
        </div>
      `;

      card.querySelector('.play-btn').addEventListener('click', () => {
        audioManager.playClick();
        this.launchGame(game.id);
      });

      this.gamesGridEl.appendChild(card);
    });
  }

  launchGame(gameId) {
    const gameData = GAMES_DATA.find(g => g.id === gameId);
    if (!gameData) return;

    this.activeGameId = gameId;
    this.modalTitleEl.innerText = gameData.title;
    this.pauseOverlayEl.classList.remove('active');
    this.gameViewportEl.innerHTML = '';

    const currentHighScore = storageManager.getHighScore(gameId);
    this.highScoreTextEl.innerText = currentHighScore;
    this.scoreTextEl.innerText = '0';

    // Helper: standard score/gameover callbacks for canvas games
    const makeScoreCb = (extra) => (score, a, b) => {
      let text = score;
      if (a !== undefined) text += ` | ❤️ x${a}`;
      if (b !== undefined && b > 1) text += ` | 🔥 x${b}`;
      if (extra) text = extra(score, a, b);
      this.scoreTextEl.innerText = text;
    };

    const makeGameOverCb = (label) => (finalScore) => {
      const isNew = storageManager.setHighScore(gameId, typeof finalScore === 'number' ? finalScore : 0);
      if (isNew && typeof finalScore === 'number') {
        this.highScoreTextEl.innerText = finalScore;
        alert(`🎉 恭喜破個人紀錄！${label || ''}得分：${finalScore}`);
      } else {
        alert(finalScore); // string message case (minesweeper, hangman, etc.)
      }
      this.renderCatalog();
    };

    // ─── Canvas-based single-canvas games ───────────────────────────
    const singleCanvasGames = ['snake', 'flappy', 'catcher', 'invaders', 'dino', 'fruitninja', 'match3'];
    if (singleCanvasGames.includes(gameId)) {
      const canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      this.gameViewportEl.appendChild(canvas);

      let scoreCb;
      if (gameId === 'catcher') {
        scoreCb = (score, lives, combo) => {
          let text = score;
          if (lives !== undefined) text += ` | ❤️ x${lives}`;
          if (combo !== undefined && combo > 1) text += ` | 🔥 x${combo}`;
          this.scoreTextEl.innerText = text;
        };
      } else {
        scoreCb = (score) => { this.scoreTextEl.innerText = score; };
      }

      const gameOverCb = (finalScore) => {
        const isNew = storageManager.setHighScore(gameId, typeof finalScore === 'number' ? finalScore : 0);
        if (isNew && typeof finalScore === 'number') {
          this.highScoreTextEl.innerText = finalScore;
          alert(`🎉 恭喜刷破個人高分紀錄！得分：${finalScore}`);
        } else if (typeof finalScore === 'string') {
          alert(finalScore);
        }
        this.renderCatalog();
      };

      this.currentGameInstance = new gameData.classRef(canvas, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── Pac-Man (canvas) ───────────────────────────────────────────
    } else if (gameId === 'pacman') {
      const canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      this.gameViewportEl.appendChild(canvas);
      const scoreCb = (score) => { this.scoreTextEl.innerText = score; };
      const gameOverCb = (finalScore) => {
        storageManager.setHighScore(gameId, finalScore);
        this.highScoreTextEl.innerText = storageManager.getHighScore(gameId);
        alert(`Game Over! 得分：${finalScore}`);
        this.renderCatalog();
      };
      this.currentGameInstance = new PacManGame(canvas, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── Gomoku (canvas) ────────────────────────────────────────────
    } else if (gameId === 'gomoku') {
      const canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      this.gameViewportEl.appendChild(canvas);
      const scoreCb = (msg) => { this.scoreTextEl.innerText = msg; };
      const gameOverCb = (msg) => { alert(msg); this.renderCatalog(); };
      this.currentGameInstance = new GomokuGame(canvas, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── Tetris (canvas + side panels) ──────────────────────────────
    } else if (gameId === 'tetris') {
      const wrap = document.createElement('div');
      wrap.className = 'tetris-container';
      wrap.innerHTML = `
        <canvas id="tetris-main-canvas"></canvas>
        <div class="tetris-side-panel">
          <div class="preview-box"><h4>Hold 暫存 (Shift)</h4><canvas id="tetris-hold-canvas"></canvas></div>
          <div class="preview-box"><h4>Next 下一個</h4><canvas id="tetris-next-canvas"></canvas></div>
        </div>
      `;
      this.gameViewportEl.appendChild(wrap);
      const mainC = wrap.querySelector('#tetris-main-canvas');
      const nextC = wrap.querySelector('#tetris-next-canvas');
      const holdC = wrap.querySelector('#tetris-hold-canvas');
      const scoreCb = (score) => { this.scoreTextEl.innerText = score; };
      const gameOverCb = (finalScore) => {
        const isNew = storageManager.setHighScore(gameId, finalScore);
        if (isNew) { this.highScoreTextEl.innerText = finalScore; alert(`🎉 俄羅斯方塊最高紀錄！得分：${finalScore}`); }
        this.renderCatalog();
      };
      this.currentGameInstance = new TetrisGame(mainC, nextC, holdC, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── 2048 (DOM) ─────────────────────────────────────────────────
    } else if (gameId === 'game2048') {
      const container = document.createElement('div');
      this.gameViewportEl.appendChild(container);
      const scoreCb = (score) => { this.scoreTextEl.innerText = score; };
      const gameOverCb = (finalScore) => {
        const isNew = storageManager.setHighScore(gameId, finalScore);
        if (isNew) { this.highScoreTextEl.innerText = finalScore; }
        alert(finalScore >= 2048 ? `🎉 你達成了 2048！得分：${finalScore}` : `遊戲結束！最終得分：${finalScore}`);
        this.renderCatalog();
      };
      this.currentGameInstance = new Game2048(container, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── DOM-based: Minesweeper, Hangman ────────────────────────────
    } else if (gameId === 'minesweeper') {
      const container = document.createElement('div');
      this.gameViewportEl.appendChild(container);
      const scoreCb = (info) => { this.scoreTextEl.innerText = info; };
      const gameOverCb = (msg) => { alert(msg); this.renderCatalog(); };
      this.currentGameInstance = new MinesweeperGame(container, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    } else if (gameId === 'hangman') {
      const container = document.createElement('div');
      this.gameViewportEl.appendChild(container);
      const scoreCb = (info) => { this.scoreTextEl.innerText = info; };
      const gameOverCb = (msg) => { alert(msg); this.renderCatalog(); };
      this.currentGameInstance = new HangmanGame(container, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── Tic-Tac-Toe (DOM) ──────────────────────────────────────────
    } else if (gameId === 'tictactoe') {
      const container = document.createElement('div');
      this.gameViewportEl.appendChild(container);
      const scoreCb = (info) => { this.scoreTextEl.innerText = `X: ${info.xWins} | O: ${info.oWins} | 平局: ${info.draws}`; };
      const gameOverCb = (msg) => { alert(msg); this.renderCatalog(); };
      this.currentGameInstance = new TicTacToeGame(container, scoreCb, gameOverCb);
      this.currentGameInstance.start();

    // ─── Sudoku (DOM) ───────────────────────────────────────────────
    } else if (gameId === 'sudoku') {
      const container = document.createElement('div');
      this.gameViewportEl.appendChild(container);
      const scoreCb = (time, mistakes) => { this.scoreTextEl.innerText = `⏱️ ${time}  ❌ ${mistakes}/${3}`; };
      const gameOverCb = (msg) => { alert(msg); this.renderCatalog(); };
      this.currentGameInstance = new SudokuGame(container, scoreCb, gameOverCb);
      this.currentGameInstance.start();
    }

    this.modalEl.classList.add('active');
  }

  togglePause() {
    if (!this.currentGameInstance) return;
    audioManager.playClick();

    if (this.currentGameInstance.isPaused) {
      this.currentGameInstance.resume();
      this.pauseOverlayEl.classList.remove('active');
    } else {
      this.currentGameInstance.pause();
      this.pauseOverlayEl.classList.add('active');
    }
  }

  restartGame() {
    if (!this.currentGameInstance) return;
    audioManager.playClick();
    this.pauseOverlayEl.classList.remove('active');
    this.currentGameInstance.start();
  }

  closeGame() {
    if (this.currentGameInstance) {
      this.currentGameInstance.destroy();
      this.currentGameInstance = null;
    }
    this.modalEl.classList.remove('active');
    this.pauseOverlayEl.classList.remove('active');
    this.renderCatalog();
    audioManager.playClick();
  }
}

// Initialize Arcade App when DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  window.arcadeApp = new ArcadeApp();
});
