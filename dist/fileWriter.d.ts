/**
 * File writer for debug logs
 */
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
export declare class DebugFileWriter {
    private path;
    private mode;
    private buffer;
    private maxBufferSize;
    private flushInterval;
    private fileStream;
    private currentRequestId;
    constructor(config?: FileWriterConfig);
    private initializeFile;
    write(namespace: string, message: string, data?: any): void;
    private shouldWrite;
    private processData;
    private truncate;
    flush(): void;
    setRequestId(requestId: string | null): void;
    getConfig(): {
        path: string;
        mode: FileMode;
        bufferSize: number;
    };
    destroy(): void;
}
