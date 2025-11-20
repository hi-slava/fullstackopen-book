import hey from "#utils/core/logger";

export class AsyncProcessor {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 3;
    this.rateLimit = options.rateLimit || 1000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
  }

  /**
   * Process items with controlled concurrency and progress tracking
   */
  async processWithProgress(items, processor, progressTracker) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.processWithRetry(async () => {
          return await processor(items[i]);
        });
        results.push(result);
        progressTracker.increment(1, `Processed ${i + 1}/${items.length}`);
      } catch (error) {
        errors.push({ item: items[i], error });
        progressTracker.increment(1, `Failed ${i + 1}/${items.length}`);
      }
      
      // Rate limiting
      if (this.rateLimit > 0 && i < items.length - 1) {
        await this.sleep(this.rateLimit);
      }
    }

    return { results, errors };
  }

  /**
   * Process with retry logic
   */
  async processWithRetry(processor) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await processor();
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        hey.warn(`Attempt ${attempt} failed, retrying in ${this.retryDelay}ms: ${error.message}`);
        await this.sleep(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Specialized processors for common operations
 */
export class WebScraper extends AsyncProcessor {
  constructor(options = {}) {
    super({
      maxConcurrency: 2,
      rateLimit: 1500,
      ...options
    });
  }
}

export class FileProcessor extends AsyncProcessor {
  constructor(options = {}) {
    super({
      maxConcurrency: 5,
      rateLimit: 0,
      retryAttempts: 1,
      ...options
    });
  }
} 