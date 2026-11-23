/**
 * Hangman (吊死鬼猜單字) Game Engine
 */
class HangmanGame {
  constructor(containerEl, updateScoreCb, gameOverCb) {
    this.container = containerEl;
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.wordBank = {
      animals: ['ELEPHANT','GIRAFFE','PENGUIN','DOLPHIN','CHEETAH','GORILLA','LEOPARD','OCTOPUS','FLAMINGO','SQUIRREL'],
      tech:    ['JAVASCRIPT','ALGORITHM','DATABASE','COMPILER','INTERFACE','FRAMEWORK','VARIABLE','FUNCTION','PROTOCOL','RECURSIVE'],
      fruits:  ['STRAWBERRY','BLUEBERRY','PINEAPPLE','WATERMELON','RASPBERRY','BLACKBERRY','TANGERINE','PERSIMMON'],
      countries:['AUSTRALIA','SWITZERLAND','ARGENTINA','THAILAND','CAMBODIA','SINGAPORE','INDONESIA','PHILIPPINES']
    };

    this.word = '';
    this.hint = '';
    this.category = '';
    this.guessed = new Set();
    this.maxWrong = 7;
    this.wrongCount = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) this.guess(key);
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  start() {
    const cats = Object.keys(this.wordBank);
    this.category = cats[Math.floor(Math.random() * cats.length)];
    const words = this.wordBank[this.category];
    this.word = words[Math.floor(Math.random() * words.length)];
    this.guessed = new Set();
    this.wrongCount = 0;
    this.isRunning = true; this.isPaused = false;
    this.updateScore(`類別：${this.category}  錯誤：${this.wrongCount}/${this.maxWrong}`);
    this.render();
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  stop() { this.isRunning = false; }
  destroy() { this.stop(); window.removeEventListener('keydown', this.handleKeyDown); this.container.innerHTML = ''; }

  guess(letter) {
    if (this.guessed.has(letter) || !this.isRunning) return;
    this.guessed.add(letter);
    if (!this.word.includes(letter)) {
      this.wrongCount++;
      audioManager.playGameOver();
    } else {
      audioManager.playScore();
    }
    this.updateScore(`類別：${this.category}  錯誤：${this.wrongCount}/${this.maxWrong}`);

    const won = this.word.split('').every(l => this.guessed.has(l));
    if (won) {
      this.isRunning = false;
      this.render();
      audioManager.playWin();
      this.gameOverCb(`🎉 猜對了！單字是 "${this.word}"`);
      return;
    }
    if (this.wrongCount >= this.maxWrong) {
      this.isRunning = false;
      this.render();
      audioManager.playGameOver();
      this.gameOverCb(`😢 失敗！正確答案是 "${this.word}"`);
      return;
    }
    this.render();
  }

  drawHangman(wrong) {
    const size = 160;
    // Build SVG hangman progressively
    const parts = [
      `<line x1="10" y1="150" x2="130" y2="150" stroke="#00f3ff" stroke-width="4"/>`, // base
      `<line x1="40" y1="150" x2="40" y2="10" stroke="#00f3ff" stroke-width="4"/>`,    // pole
      `<line x1="40" y1="10" x2="90" y2="10" stroke="#00f3ff" stroke-width="4"/>`,     // top
      `<line x1="90" y1="10" x2="90" y2="30" stroke="#ff0055" stroke-width="3"/>`,     // rope
      `<circle cx="90" cy="42" r="14" fill="none" stroke="#ffbe0c" stroke-width="3"/>`, // head
      `<line x1="90" y1="56" x2="90" y2="100" stroke="#ffbe0c" stroke-width="3"/>`,   // body
      `<line x1="90" y1="70" x2="70" y2="88" stroke="#ffbe0c" stroke-width="3"/> <line x1="90" y1="70" x2="110" y2="88" stroke="#ffbe0c" stroke-width="3"/>`, // arms
      `<line x1="90" y1="100" x2="72" y2="130" stroke="#ffbe0c" stroke-width="3"/> <line x1="90" y1="100" x2="108" y2="130" stroke="#ffbe0c" stroke-width="3"/>`, // legs
    ];
    const visible = parts.slice(0, wrong + 1);
    return `<svg width="${size}" height="160" xmlns="http://www.w3.org/2000/svg">${visible.join('')}</svg>`;
  }

  render() {
    const displayWord = this.word.split('').map(l => this.guessed.has(l) ? l : '_').join(' ');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    this.container.innerHTML = `
      <div class="hangman-wrapper">
        <div class="hangman-drawing">${this.drawHangman(this.wrongCount)}</div>
        <div class="hangman-word">${displayWord}</div>
        <div class="hangman-keyboard">
          ${alphabet.map(l => {
            const used = this.guessed.has(l);
            const correct = used && this.word.includes(l);
            const wrong = used && !this.word.includes(l);
            return `<button class="hk-btn ${correct?'correct':''} ${wrong?'wrong':''}" data-l="${l}" ${used?'disabled':''}>${l}</button>`;
          }).join('')}
        </div>
        <p class="hangman-cat">🏷️ 類別：<strong>${this.category.toUpperCase()}</strong></p>
      </div>
    `;

    this.container.querySelectorAll('.hk-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => this.guess(btn.dataset.l));
    });
  }
}
