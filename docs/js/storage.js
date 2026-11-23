/**
 * Storage Manager for Arcade High Scores & Statistics
 */
class ArcadeStorage {
  constructor() {
    this.prefix = 'arcade_hub_';
  }

  getHighScore(gameId) {
    const val = localStorage.getItem(this.prefix + 'score_' + gameId);
    return val ? parseInt(val, 10) : 0;
  }

  setHighScore(gameId, score) {
    const current = this.getHighScore(gameId);
    if (score > current) {
      localStorage.setItem(this.prefix + 'score_' + gameId, score);
      return true; // New High Score!
    }
    return false;
  }

  getStats(gameId) {
    const raw = localStorage.getItem(this.prefix + 'stats_' + gameId);
    return raw ? JSON.parse(raw) : { played: 0, wins: 0, losses: 0 };
  }

  saveStats(gameId, stats) {
    localStorage.setItem(this.prefix + 'stats_' + gameId, JSON.stringify(stats));
  }

  recordGame(gameId, isWin = false) {
    const stats = this.getStats(gameId);
    stats.played += 1;
    if (isWin) stats.wins += 1;
    else stats.losses += 1;
    this.saveStats(gameId, stats);
  }
}

const storageManager = new ArcadeStorage();
