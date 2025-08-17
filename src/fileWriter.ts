/**
 * File writer for debug logs
 */

import * as fs from 'fs';
import * as path from 'path';

export type FileMode = 'minimal' | 'detailed' | 'full';

export interface DebugFileEntry {
  timestamp: string;
  namespace: string;
  message: string;
  data?: any;
  metadata?: {
    requestId?: string;
  };
}

export interface FileWriterConfig {
  path?: string;
  mode?: FileMode;
  maxBufferSize?: number;
}

export class DebugFileWriter {
  private path: string;
  private mode: FileMode;
  private buffer: DebugFileEntry[] = [];
  private maxBufferSize: number;
  private flushInterval: NodeJS.Timeout | null = null;
  private fileStream: fs.WriteStream | null = null;
  private currentRequestId: string | null = null;

  constructor(config?: FileWriterConfig) {
    this.path = config?.path || '/tmp/debug-tracer.log';
    this.mode = config?.mode || 'minimal';
    this.maxBufferSize = config?.maxBufferSize || 100;

    this.initializeFile();
    
    // Auto-flush every second
    this.flushInterval = setInterval(() => this.flush(), 1000);
  }

  private initializeFile() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create write stream with append mode
      this.fileStream = fs.createWriteStream(this.path, { flags: 'a' });
      
      // Write header line
      this.fileStream.write(`\n--- Debug session started at ${new Date().toISOString()} ---\n`);
    } catch (error) {
      console.error('[DebugFileWriter] Failed to initialize file:', error);
      this.fileStream = null;
    }
  }

  write(namespace: string, message: string, data?: any) {
    if (!this.shouldWrite(namespace, data)) return;

    const entry: DebugFileEntry = {
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

  private shouldWrite(namespace: string, data?: any): boolean {
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

  private processData(data: any): any {
    if (this.mode === 'minimal') {
      // Extract only essential fields
      if (typeof data === 'object' && data !== null) {
        const essential: any = {};
        ['duration', 'elapsed', 'timing', 'error', 'status', 'count'].forEach(key => {
          if (key in data) essential[key] = data[key];
        });
        return Object.keys(essential).length > 0 ? essential : undefined;
      }
    } else if (this.mode === 'detailed') {
      // Truncate large data
      return this.truncate(data);
    }
    // full mode: return as-is
    return data;
  }

  private truncate(data: any, maxDepth = 3, currentDepth = 0): any {
    if (currentDepth >= maxDepth) return '[truncated]';
    
    if (Array.isArray(data)) {
      return data.slice(0, 5).map(item => this.truncate(item, maxDepth, currentDepth + 1));
    }
    
    if (typeof data === 'object' && data !== null) {
      const truncated: any = {};
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
    if (this.buffer.length === 0 || !this.fileStream) return;

    try {
      // Write each entry as a JSON line
      this.buffer.forEach(entry => {
        this.fileStream!.write(JSON.stringify(entry) + '\n');
      });
      
      this.buffer = [];
    } catch (error) {
      console.error('[DebugFileWriter] Failed to flush:', error);
    }
  }

  setRequestId(requestId: string | null) {
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