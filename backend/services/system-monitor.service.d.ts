declare class SystemMonitorService {
    private readonly supermemoryEnabled;
    private healthCheckInterval;
    private lastKnownGoodConfig;
    constructor();
    initialize(): void;
    private startHealthChecks;
    private performHealthCheck;
    private checkAPIHealth;
    private checkPM2Status;
    private checkMemoryUsage;
    private validatePM2Configuration;
    private logSystemEvent;
    private sendToSuperMemory;
    logDeployment(details: Record<string, any>): Promise<void>;
    logAPIError(error: Error, context: Record<string, any>): Promise<void>;
    shutdown(): void;
}
export declare const systemMonitor: SystemMonitorService;
export {};
//# sourceMappingURL=system-monitor.service.d.ts.map