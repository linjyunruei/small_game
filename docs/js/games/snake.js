/**
 * Snake Game Engine
 */
class SnakeGame {
  constructor(canvas, updateScoreCb, gameOverCb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateScore = updateScoreCb;
    this.gameOverCb = gameOverCb;

    this.gridSize = 20;
    this.tileCount = 20;
    this.canvas.width = 400;
    this.canvas.height = 400;

    this.snake = [];
    this.dir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.food = null;
    this.foodType = 'apple'; // 'apple', 'golden', 'ice'
    this.score = 0;
    this.speed = 120; // ms per tick
    this.isRunning = false;
    this.isPaused = false;
    this.timer = null;
    this.particles = [];

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning || this.isPaused) return;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown': case 's': case 'S':
          if (this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
          break;
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  handleTouch(action) {
    if (!this.isRunning || this.isPaused) return;
    if (action === 'up' && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (action === 'down' && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (action === 'left' && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (action === 'right' && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
  }

  start() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    this.dir = { x: 0, y: -1 };
    this.nextDir = { x: 0, y: -1 };
    this.score = 0;
    this.speed = 120;
    this.updateScore(this.score);
    this.spawnFood();
    this.isRunning = true;
    this.isPaused = false;
    this.particles = [];

    if (this.timer) clearInterval(this.timer);
    this.runLoop();
  }

  runLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.isPaused && this.isRunning) {
        this.update();
        this.draw();
      }
    }, this.speed);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
  }

  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  spawnFood() {
    let valid = false;
    let newFood = { x: 0, y: 0 };
    while (!valid) {
      newFood.x = Math.floor(Math.random() * this.tileCount);
      newFood.y = Math.floor(Math.random() * this.tileCount);
      valid = !this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    this.food = newFood;

    const rand = Math.random();
    if (rand < 0.15) this.foodType = 'golden'; // 15% chance
    else if (rand < 0.3) this.foodType = 'ice';  // 15% chance
    else this.foodType = 'apple';
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: (x + 0.5) * this.gridSize,
        y: (y + 0.5) * this.gridSize,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: color,
        life: 1.0
      });
    }
  }

  update() {
    this.dir = { ...this.nextDir };
    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y
    };

    // Wall Collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.handleGameOver();
      return;
    }

    // Self Collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.handleGameOver();
      return;
    }

    this.snake.unshift(head);

    // Food Collision
    if (head.x === this.food.x && head.y === this.food.y) {
      let color = '#ff0055';
      if (this.foodType === 'apple') {
        this.score += 10;
        color = '#ff3366';
        audioManager.playScore();
      } else if (this.foodType === 'golden') {
        this.score += 30;
        color = '#ffbe0c';
        audioManager.playPowerup();
      } else if (this.foodType === 'ice') {
        this.score += 10;
        color = '#00f3ff';
        this.speed = Math.min(200, this.speed + 15); // Slow down slightly
        this.runLoop();
        audioManager.playPowerup();
      }

      // Slightly increase speed over time
      if (this.foodType !== 'ice' && this.speed > 60) {
        this.speed -= 2;
        this.runLoop();
      }

      this.updateScore(this.score);
      this.createParticles(this.food.x, this.food.y, color);
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    // Update Particles
    this.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.08;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  handleGameOver() {
    this.isRunning = false;
    clearInterval(this.timer);
    audioManager.playGameOver();
    this.gameOverCb(this.score);
  }

  draw() {
    this.ctx.fillStyle = '#0d111e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid Lines (Subtle)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.tileCount; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvas.height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvas.width, i * this.gridSize);
      this.ctx.stroke();
    }

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // Draw Food
    const fx = this.food.x * this.gridSize + this.gridSize / 2;
    const fy = this.food.y * this.gridSize + this.gridSize / 2;
    const radius = this.gridSize / 2 - 2;

    this.ctx.save();
    if (this.foodType === 'apple') {
      this.ctx.fillStyle = '#ff0055';
      this.ctx.shadowColor = '#ff0055';
    } else if (this.foodType === 'golden') {
      this.ctx.fillStyle = '#ffbe0c';
      this.ctx.shadowColor = '#ffbe0c';
    } else {
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.shadowColor = '#00f3ff';
    }
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Draw Snake
    this.snake.forEach((seg, idx) => {
      const x = seg.x * this.gridSize + 1;
      const y = seg.y * this.gridSize + 1;
      const size = this.gridSize - 2;

      this.ctx.save();
      if (idx === 0) {
        // Head
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 6);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#0d111e';
        this.ctx.shadowBlur = 0;
        const eyeOffset = 4;
        this.ctx.beginPath();
        this.ctx.arc(x + eyeOffset + 2, y + eyeOffset + 2, 2, 0, Math.PI * 2);
        this.ctx.arc(x + size - eyeOffset - 2, y + eyeOffset + 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Body with gradient tint based on distance from head
        const ratio = idx / this.snake.length;
        const greenVal = Math.floor(255 - ratio * 100);
        this.ctx.fillStyle = `rgb(0, ${greenVal}, ${Math.floor(200 - ratio * 50)})`;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 4);
        this.ctx.fill();
      }
      this.ctx.restore();
    });
  }
}
