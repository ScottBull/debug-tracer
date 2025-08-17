"use strict";
/**
 * Debug Tracer - Simple, powerful debug logging for Node.js and browsers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugTracer = void 0;
exports.createDebugger = createDebugger;
const fileWriter_1 = require("./fileWriter");
class DebugTracer {
    constructor(config) {
        this.enabledNamespaces = new Set();
        this.fileWriter = null;
        // Initialize from environment or config
        const envDebug = process.env.DEBUG || '';
        const envConfig = this.parseEnvConfig(envDebug);
        // Config takes precedence over environment
        this.globalEnabled = config?.enabled ?? envConfig.enabled;
        if (config?.namespaces) {
            config.namespaces.forEach(ns => this.enabledNamespaces.add(ns));
        }
        else if (envConfig.namespaces) {
            envConfig.namespaces.forEach(ns => this.enabledNamespaces.add(ns));
        }
        // Initialize file writer if needed
        const fileConfig = config?.fileOutput;
        if (fileConfig?.enabled || process.env.DEBUG_FILE === 'true') {
            this.fileWriter = new fileWriter_1.DebugFileWriter({
                path: fileConfig?.path || process.env.DEBUG_FILE_PATH,
                mode: fileConfig?.mode || process.env.DEBUG_FILE_MODE
            });
        }
    }
    parseEnvConfig(envDebug) {
        if (!envDebug || envDebug === 'false') {
            return { enabled: false };
        }
        if (envDebug === 'true' || envDebug === '*' || envDebug === '1') {
            return { enabled: true };
        }
        // Specific namespaces
        return {
            enabled: true,
            namespaces: envDebug.split(',').map(s => s.trim()).filter(Boolean)
        };
    }
    /**
     * Create a logger for a specific namespace
     */
    namespace(name) {
        return (...args) => this.log(name, ...args);
    }
    /**
     * Log a message with a namespace
     */
    log(namespace, ...args) {
        if (!this.shouldLog(namespace))
            return;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${namespace}]`, ...args);
        // Write to file if enabled
        if (this.fileWriter) {
            const message = typeof args[0] === 'string' ? args[0] : String(args[0]);
            const data = args.length > 1 ?
                (args.length === 2 ? args[1] : args.slice(1)) :
                undefined;
            this.fileWriter.write(namespace, message, data);
        }
    }
    /**
     * Check if logging is enabled for a namespace
     */
    shouldLog(namespace) {
        if (!this.globalEnabled)
            return false;
        if (this.enabledNamespaces.size === 0)
            return true; // All namespaces enabled
        return this.enabledNamespaces.has(namespace);
    }
    /**
     * Enable debugging for a namespace or all namespaces
     */
    enable(namespace) {
        if (namespace) {
            this.enabledNamespaces.add(namespace);
            console.log(`[DebugTracer] Enabled namespace: ${namespace}`);
        }
        else {
            this.globalEnabled = true;
            this.enabledNamespaces.clear(); // Clear means all enabled
            console.log('[DebugTracer] Enabled all namespaces');
        }
    }
    /**
     * Disable debugging for a namespace or all namespaces
     */
    disable(namespace) {
        if (namespace) {
            this.enabledNamespaces.delete(namespace);
            console.log(`[DebugTracer] Disabled namespace: ${namespace}`);
        }
        else {
            this.globalEnabled = false;
            console.log('[DebugTracer] Disabled all namespaces');
        }
    }
    /**
     * Get current debug status
     */
    status() {
        return {
            enabled: this.globalEnabled,
            namespaces: Array.from(this.enabledNamespaces),
            fileOutput: this.fileWriter?.getConfig()
        };
    }
    /**
     * Set request ID for correlation (useful for tracing requests)
     */
    setRequestId(requestId) {
        this.fileWriter?.setRequestId(requestId);
    }
    /**
     * Flush any pending file writes
     */
    flush() {
        this.fileWriter?.flush();
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.fileWriter?.destroy();
    }
}
exports.DebugTracer = DebugTracer;
// Convenience function to create a debug instance
function createDebugger(config) {
    return new DebugTracer(config);
}
// Default export for simple usage
const defaultDebugger = new DebugTracer();
exports.default = defaultDebugger;
