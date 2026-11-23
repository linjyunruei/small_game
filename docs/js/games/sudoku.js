/**
 * Sudoku Game Engine with Solver & Puzzle Generator
 */
class SudokuGame {
  constructor(containerEl, updateScoreCb, gameOverCb) {
    this.container = containerEl;
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.grid = Array(81).fill(0);
    this.initialGrid = Array(81).fill(0);
    this.solution = Array(81).fill(0);
    this.notes = Array.from({ length: 81 }, () => new Set());

    this.selectedIndex = -1;
    this.isNoteMode = false;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.difficulty = 'easy'; // easy, medium, hard
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isGameOver = false;

    // Built-in Puzzles collection for instant load
    this.puzzles = {
      easy: [
        {
          puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
          solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
        },
        {
          puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
          solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
        }
      ],
      medium: [
        {
          puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
          solution: "245981376169273584837564219976135428513428697482796135351697842728349961694812753"
        }
      ],
      hard: [
        {
          puzzle: "000000012000000003002300400001800005060070800000009000008500000900040500470006001",
          solution: "683457912415928763792316458241835697569174823378269145138592674926741538475836291"
        }
      ]
    };
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    this.start();
  }

  start() {
    this.stopTimer();
    this.timerSeconds = 0;
    this.mistakes = 0;
    this.isGameOver = false;
    this.notes = Array.from({ length: 81 }, () => new Set());

    const pool = this.puzzles[this.difficulty] || this.puzzles.easy;
    const item = pool[Math.floor(Math.random() * pool.length)];

    this.initialGrid = item.puzzle.split('').map(c => parseInt(c, 10));
    this.grid = [...this.initialGrid];
    this.solution = item.solution.split('').map(c => parseInt(c, 10));

    this.selectedIndex = this.initialGrid.findIndex(val => val === 0);
    this.startTimer();
    this.render();
    this.updateScore(this.getFormattedTime(), this.mistakes);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateScore(this.getFormattedTime(), this.mistakes);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  getFormattedTime() {
    const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
    const secs = (this.timerSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  pause() { this.stopTimer(); }
  resume() { this.startTimer(); }
  stop() { this.stopTimer(); }
  destroy() { this.stopTimer(); this.container.innerHTML = ''; }

  selectCell(index) {
    this.selectedIndex = index;
    audioManager.playClick();
    this.render();
  }

  inputNumber(num) {
    if (this.selectedIndex < 0 || this.isGameOver) return;
    if (this.initialGrid[this.selectedIndex] !== 0) return; // Cannot edit initial clues

    if (this.isNoteMode) {
      const currentNotes = this.notes[this.selectedIndex];
      if (currentNotes.has(num)) currentNotes.delete(num);
      else currentNotes.add(num);
      audioManager.playClick();
    } else {
      this.notes[this.selectedIndex].clear();
      this.grid[this.selectedIndex] = num;

      if (num !== 0 && num !== this.solution[this.selectedIndex]) {
        // Mistake!
        this.mistakes++;
        audioManager.playGameOver();
        if (this.mistakes >= this.maxMistakes) {
          this.isGameOver = true;
          this.stopTimer();
          this.gameOverCb('Game Over (Too Many Mistakes)');
          return;
        }
      } else if (num !== 0) {
        audioManager.playScore();
      }

      this.checkCompletion();
    }

    this.render();
    this.updateScore(this.getFormattedTime(), this.mistakes);
  }

  giveHint() {
    if (this.selectedIndex < 0 || this.isGameOver) return;
    if (this.grid[this.selectedIndex] === this.solution[this.selectedIndex]) return;

    this.grid[this.selectedIndex] = this.solution[this.selectedIndex];
    this.notes[this.selectedIndex].clear();
    audioManager.playPowerup();
    this.checkCompletion();
    this.render();
  }

  erase() {
    if (this.selectedIndex < 0 || this.isGameOver) return;
    if (this.initialGrid[this.selectedIndex] !== 0) return;
    this.grid[this.selectedIndex] = 0;
    this.notes[this.selectedIndex].clear();
    audioManager.playClick();
    this.render();
  }

  toggleNoteMode() {
    this.isNoteMode = !this.isNoteMode;
    audioManager.playClick();
    this.render();
  }

  checkCompletion() {
    if (this.grid.every((val, idx) => val === this.solution[idx])) {
      this.isGameOver = true;
      this.stopTimer();
      audioManager.playWin();
      this.gameOverCb(`Solved in ${this.getFormattedTime()}!`);
    }
  }

  render() {
    const selectedVal = this.selectedIndex >= 0 ? this.grid[this.selectedIndex] : 0;
    const selRow = Math.floor(this.selectedIndex / 9);
    const selCol = this.selectedIndex % 9;
    const selBox = Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3);

    this.container.innerHTML = `
      <div class="sudoku-wrapper">
        <div class="sudoku-grid">
          ${this.grid.map((val, idx) => {
            const r = Math.floor(idx / 9);
            const c = idx % 9;
            const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);

            const isInitial = this.initialGrid[idx] !== 0;
            const isSelected = idx === this.selectedIndex;
            const isSameVal = selectedVal > 0 && val === selectedVal;
            const isRelated = (r === selRow || c === selCol || b === selBox) && !isSelected;
            const isError = val > 0 && !isInitial && val !== this.solution[idx];

            let classes = ['sudoku-cell'];
            if (isInitial) classes.push('initial');
            if (isSelected) classes.push('selected');
            if (isSameVal) classes.push('same-num');
            if (isRelated) classes.push('related');
            if (isError) classes.push('error');

            let content = '';
            if (val > 0) {
              content = `<span class="cell-num">${val}</span>`;
            } else if (this.notes[idx].size > 0) {
              content = `<div class="notes-grid">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<span>${this.notes[idx].has(n) ? n : ''}</span>`).join('')}
              </div>`;
            }

            return `<div class="${classes.join(' ')}" data-index="${idx}">${content}</div>`;
          }).join('')}
        </div>

        <div class="sudoku-controls">
          <button class="sudoku-btn ${this.isNoteMode ? 'active' : ''}" id="btn-note">✏️ Note (${this.isNoteMode ? 'ON' : 'OFF'})</button>
          <button class="sudoku-btn" id="btn-erase">🧹 Erase</button>
          <button class="sudoku-btn" id="btn-hint">💡 Hint</button>
        </div>

        <div class="sudoku-numpad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="numpad-btn" data-num="${n}">${n}</button>`).join('')}
        </div>
      </div>
    `;

    // Event Bindings
    this.container.querySelectorAll('.sudoku-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const idx = parseInt(cell.dataset.index, 10);
        this.selectCell(idx);
      });
    });

    this.container.querySelectorAll('.numpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num, 10);
        this.inputNumber(num);
      });
    });

    const noteBtn = this.container.querySelector('#btn-note');
    if (noteBtn) noteBtn.addEventListener('click', () => this.toggleNoteMode());

    const eraseBtn = this.container.querySelector('#btn-erase');
    if (eraseBtn) eraseBtn.addEventListener('click', () => this.erase());

    const hintBtn = this.container.querySelector('#btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => this.giveHint());
  }
}
