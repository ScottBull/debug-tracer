/**
 * Debug Tracer - Simple, powerful debug logging for Node.js and browsers
 */
import { FileMode } from './fileWriter';
export type { FileMode, DebugFileEntry } from './fileWriter';
export interface DebugConfig {
    enabled?: boolean;
    namespaces?: string[];
    fileOutput?: {
        enabled: boolean;
        path?: string;
        mode?: FileMode;
    };
}
export declare class DebugTracer {
    private enabledNamespaces;
    private globalEnabled;
    private fileWriter;
    constructor(config?: DebugConfig);
    private parseEnvConfig;
    /**
     * Create a logger for a specific namespace
     */
    namespace(name: string): (...args: any[]) => void;
    /**
     * Log a message with a namespace
     */
    log(namespace: string, ...args: any[]): void;
    /**
     * Check if logging is enabled for a namespace
     */
    private shouldLog;
    /**
     * Enable debugging for a namespace or all namespaces
     */
    enable(namespace?: string): void;
    /**
     * Disable debugging for a namespace or all namespaces
     */
    disable(namespace?: string): void;
    /**
     * Get current debug status
     */
    status(): {
        enabled: boolean;
        namespaces: string[];
        fileOutput: {
            path: string;
            mode: FileMode;
            bufferSize: number;
        } | undefined;
    };
    /**
     * Set request ID for correlation (useful for tracing requests)
     */
    setRequestId(requestId: string | null): void;
    /**
     * Flush any pending file writes
     */
    flush(): void;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export declare function createDebugger(config?: DebugConfig): DebugTracer;
declare const defaultDebugger: DebugTracer;
export default defaultDebugger;
