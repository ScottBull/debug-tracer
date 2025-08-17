/**
 * TypeScript definitions for browser version
 */

export interface DebugConfig {
  enabled?: boolean;
  namespaces?: string[];
  fileOutput?: {
    enabled: boolean;
  };
}

export interface DebugFileEntry {
  timestamp: string;
  namespace: string;
  message: string;
  data?: any;
}

export declare class DebugTracer {
  constructor(config?: DebugConfig);
  
  namespace(name: string): (...args: any[]) => void;
  log(namespace: string, ...args: any[]): void;
  enable(namespace?: string): void;
  disable(namespace?: string): void;
  status(): {
    enabled: boolean;
    namespaces: string[];
    bufferSize: number;
  };
  getLogs(): DebugFileEntry[];
  clearLogs(): void;
  destroy(): void;
}

export default DebugTracer;