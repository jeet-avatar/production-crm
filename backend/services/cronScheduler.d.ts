declare class CronScheduler {
    private jobs;
    constructor();
    private setupJobs;
    start(): void;
    stop(): void;
    getStatus(): Record<string, string>;
    startJob(jobName: string): void;
    stopJob(jobName: string): void;
}
export declare const cronScheduler: CronScheduler;
export {};
//# sourceMappingURL=cronScheduler.d.ts.map