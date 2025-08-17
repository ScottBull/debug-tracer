"use strict";
/**
 * File writer for debug logs
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugFileWriter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DebugFileWriter {
    constructor(config) {
        this.buffer = [];
        this.flushInterval = null;
        this.fileStream = null;
        this.currentRequestId = null;
        this.path = config?.path || '/tmp/debug-tracer.log';
        this.mode = config?.mode || 'minimal';
        this.maxBufferSize = config?.maxBufferSize || 100;
        this.initializeFile();
        // Auto-flush every second
        this.flushInterval = setInterval(() => this.flush(), 1000);
    }
    initializeFile() {
        try {
            const dir = path.dirname(this.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Create write stream with append mode
            this.fileStream = fs.createWriteStream(this.path, { flags: 'a' });
            // Write header line
            this.fileStream.write(`\n--- Debug session started at ${new Date().toISOString()} ---\n`);
        }
        catch (error) {
            console.error('[DebugFileWriter] Failed to initialize file:', error);
            this.fileStream = null;
        }
    }
    write(namespace, message, data) {
        if (!this.shouldWrite(namespace, data))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            namespace,
            message,
        };
        // Add data based on mode
        if (data !== undefined) {
            entry.data = this.processData(data);
        }
        // Add metadata
        if (this.currentRequestId) {
            entry.metadata = { requestId: this.currentRequestId };
        }
        this.buffer.push(entry);
        // Auto-flush if buffer is full
        if (this.buffer.length >= this.maxBufferSize) {
            this.flush();
        }
    }
    shouldWrite(namespace, data) {
        switch (this.mode) {
            case 'minimal':
                // Only write timing/performance data
                return namespace === 'performance' ||
                    namespace === 'timing' ||
                    (data && typeof data === 'object' && ('duration' in data || 'elapsed' in data));
            case 'detailed':
                // Skip very verbose namespaces
                return !['trace', 'verbose', 'debug'].includes(namespace);
            case 'full':
                // Write everything
                return true;
            default:
                return true;
        }
    }
    processData(data) {
        if (this.mode === 'minimal') {
            // Extract only essential fields
            if (typeof data === 'object' && data !== null) {
                const essential = {};
                ['duration', 'elapsed', 'timing', 'error', 'status', 'count'].forEach(key => {
                    if (key in data)
                        essential[key] = data[key];
                });
                return Object.keys(essential).length > 0 ? essential : undefined;
            }
        }
        else if (this.mode === 'detailed') {
            // Truncate large data
            return this.truncate(data);
        }
        // full mode: return as-is
        return data;
    }
    truncate(data, maxDepth = 3, currentDepth = 0) {
        if (currentDepth >= maxDepth)
            return '[truncated]';
        if (Array.isArray(data)) {
            return data.slice(0, 5).map(item => this.truncate(item, maxDepth, currentDepth + 1));
        }
        if (typeof data === 'object' && data !== null) {
            const truncated = {};
            let count = 0;
            for (const [key, value] of Object.entries(data)) {
                if (count++ > 10) {
                    truncated['...'] = 'truncated';
                    break;
                }
                truncated[key] = this.truncate(value, maxDepth, currentDepth + 1);
            }
            return truncated;
        }
        if (typeof data === 'string' && data.length > 200) {
            return data.substring(0, 200) + '...[truncated]';
        }
        return data;
    }
    flush() {
        if (this.buffer.length === 0 || !this.fileStream)
            return;
        try {
            // Write each entry as a JSON line
            this.buffer.forEach(entry => {
                this.fileStream.write(JSON.stringify(entry) + '\n');
            });
            this.buffer = [];
        }
        catch (error) {
            console.error('[DebugFileWriter] Failed to flush:', error);
        }
    }
    setRequestId(requestId) {
        this.currentRequestId = requestId;
    }
    getConfig() {
        return {
            path: this.path,
            mode: this.mode,
            bufferSize: this.buffer.length
        };
    }
    destroy() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = null;
        }
    }
}
exports.DebugFileWriter = DebugFileWriter;
