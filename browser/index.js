/**
 * Debug Tracer - Browser implementation
 */

class DebugTracer {
  constructor(config = {}) {
    this.enabledNamespaces = new Set();
    this.globalEnabled = config.enabled ?? this.parseEnvConfig();
    this.buffer = [];
    this.maxBufferSize = 100;
    
    if (config.namespaces) {
      config.namespaces.forEach(ns => this.enabledNamespaces.add(ns));
    }

    // Set up localStorage writing
    this.fileOutput = config.fileOutput || {};
    if (this.fileOutput.enabled) {
      this.startFileWriter();
    }

    // Expose global methods in development
    if (typeof window !== 'undefined' && !window.debugTracer) {
      window.debugTracer = this;
      window.enableDebug = (ns) => this.enable(ns);
      window.disableDebug = (ns) => this.disable(ns);
      window.debugStatus = () => this.status();
    }
  }

  parseEnvConfig() {
    // Check URL params for debug flag
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const debug = params.get('debug');
      if (debug === 'true' || debug === '1') return true;
    }
    return false;
  }

  namespace(name) {
    return (...args) => this.log(name, ...args);
  }

  log(namespace, ...args) {
    if (!this.shouldLog(namespace)) return;

    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] [${namespace}]`, ...args);
    
    // Write to buffer for localStorage
    if (this.fileOutput.enabled) {
      this.writeToBuffer(namespace, args);
    }
  }

  shouldLog(namespace) {
    if (!this.globalEnabled) return false;
    if (this.enabledNamespaces.size === 0) return true;
    return this.enabledNamespaces.has(namespace);
  }

  writeToBuffer(namespace, args) {
    const entry = {
      timestamp: new Date().toISOString(),
      namespace,
      message: typeof args[0] === 'string' ? args[0] : String(args[0]),
      data: args.length > 1 ? (args.length === 2 ? args[1] : args.slice(1)) : undefined
    };

    this.buffer.push(entry);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flushToLocalStorage();
    }
  }

  flushToLocalStorage() {
    if (this.buffer.length === 0) return;

    try {
      const key = 'debug_tracer_logs';
      const existing = localStorage.getItem(key);
      let logs = existing ? JSON.parse(existing) : [];
      
      logs = logs.concat(this.buffer);
      
      // Keep only recent entries (max 500)
      if (logs.length > 500) {
        logs = logs.slice(-500);
      }

      localStorage.setItem(key, JSON.stringify(logs, null, 2));
      this.buffer = [];
    } catch (error) {
      console.error('[DebugTracer] Failed to write to localStorage:', error);
    }
  }

  startFileWriter() {
    // Flush every second
    this.flushInterval = setInterval(() => this.flushToLocalStorage(), 1000);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushToLocalStorage());
  }

  enable(namespace) {
    if (namespace) {
      this.enabledNamespaces.add(namespace);
      console.log(`[DebugTracer] Enabled namespace: ${namespace}`);
    } else {
      this.globalEnabled = true;
      this.enabledNamespaces.clear();
      console.log('[DebugTracer] Enabled all namespaces');
    }
  }

  disable(namespace) {
    if (namespace) {
      this.enabledNamespaces.delete(namespace);
      console.log(`[DebugTracer] Disabled namespace: ${namespace}`);
    } else {
      this.globalEnabled = false;
      console.log('[DebugTracer] Disabled all namespaces');
    }
  }

  status() {
    return {
      enabled: this.globalEnabled,
      namespaces: Array.from(this.enabledNamespaces),
      bufferSize: this.buffer.length
    };
  }

  getLogs() {
    try {
      const logs = localStorage.getItem('debug_tracer_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem('debug_tracer_logs');
    this.buffer = [];
    console.log('[DebugTracer] Logs cleared');
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushToLocalStorage();
  }
}

// Export for various module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugTracer;
  module.exports.DebugTracer = DebugTracer;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return DebugTracer; });
} else if (typeof window !== 'undefined') {
  window.DebugTracer = DebugTracer;
}