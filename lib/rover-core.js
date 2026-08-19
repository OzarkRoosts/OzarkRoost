/**
 * Rover Core — provider-independent autonomous work engine.
 * External LLMs are optional accelerators; the site must remain useful without them.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RoverCore {
  constructor({ providers = [], logger = console, maxRetries = 2 } = {}) {
    this.providers = providers.filter(Boolean);
    this.logger = logger;
    this.maxRetries = maxRetries;
    this.disabledUntil = new Map();
    this.completed = new Set();
  }

  _availableProviders() {
    const now = Date.now();
    return this.providers.filter((p) => !this.disabledUntil.get(p.name) || this.disabledUntil.get(p.name) <= now);
  }

  _disable(name, ms) {
    this.disabledUntil.set(name, Date.now() + ms);
  }

  async run(task, fallback) {
    const key = task.id || task.key || task.name;
    if (key && this.completed.has(key)) return { ok: true, skipped: true, reason: 'already-completed' };

    for (const provider of this._availableProviders()) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        try {
          const result = await provider.run(task);
          if (result !== undefined && result !== null) {
            if (key) this.completed.add(key);
            return { ok: true, provider: provider.name, result };
          }
        } catch (err) {
          const status = Number(err?.status || err?.statusCode || 0);
          const message = err?.message || String(err);
          this.logger.warn(`[Rover] ${provider.name} failed: ${status || 'error'} ${message}`);

          // Invalid credentials: don't hammer the provider.
          if (status === 401 || status === 403) {
            this._disable(provider.name, 60 * 60 * 1000);
            break;
          }
          // Rate limits: honor Retry-After when supplied, otherwise back off.
          if (status === 429) {
            const retry = Number(err?.retryAfterMs || 0) || Math.min(15 * 60 * 1000, 30_000 * (attempt + 1));
            this._disable(provider.name, retry);
            break;
          }
          if (attempt < this.maxRetries) await sleep(500 * (attempt + 1));
        }
      }
    }

    // Deterministic fallback keeps business operations moving without AI.
    if (typeof fallback === 'function') {
      const result = await fallback(task);
      if (key) this.completed.add(key);
      return { ok: true, provider: 'rover-fallback', result };
    }

    return { ok: false, provider: null, error: 'No available provider and no fallback' };
  }
}

module.exports = { RoverCore };
