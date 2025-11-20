import hey from "#utils/core/logger";

export class ProgressTracker {
  constructor(total, operation = "Processing") {
    this.total = total;
    this.current = 0;
    this.operation = operation;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.updateInterval = 1000;
  }

  increment(amount = 1, message = null) {
    this.current += amount;
    this.logProgress(message);
  }

  setProgress(current, message = null) {
    this.current = current;
    this.logProgress(message);
  }

  logProgress(message = null) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    const percentage = Math.round((this.current / this.total) * 100);
    const elapsed = now - this.startTime;
    const estimatedTotal = (elapsed / this.current) * this.total;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    const progressBar = this.createProgressBar(percentage);
    const timeInfo = this.formatTime(remaining);

    const logMessage = message 
      ? `${this.operation}: ${message}`
      : `${this.operation}: ${this.current}/${this.total}`;

    hey.info(`${logMessage} ${progressBar} ${percentage}% (${timeInfo} remaining)`);
    
    this.lastUpdate = now;
  }

  createProgressBar(percentage) {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  formatTime(ms) {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  complete(message = null) {
    const totalTime = Date.now() - this.startTime;
    const finalMessage = message || `${this.operation} completed`;
    
    hey.success(`✅ ${finalMessage} in ${this.formatTime(totalTime)}`);
  }
} 