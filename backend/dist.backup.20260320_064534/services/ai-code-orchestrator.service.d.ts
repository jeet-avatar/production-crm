interface CodeChange {
    filePath: string;
    originalCode: string;
    newCode: string;
    description: string;
    changeType: 'add' | 'modify' | 'delete';
}
interface AnalyzeRequest {
    command: string;
    currentPage: string;
    pageContext: any;
    conversationHistory: any[];
}
export declare class AICodeOrchestrator {
    private basePath;
    analyzeCommand(request: AnalyzeRequest): Promise<{
        response: string;
        codeChanges?: CodeChange[];
    }>;
    applyChanges(changes: CodeChange[], currentPage: string): Promise<{
        success: boolean;
        message: string;
        filesModified: string[];
        commitHash: string;
    }>;
    private createBackup;
    private gitCommit;
    private buildFrontend;
    private restartBackend;
    private rollback;
    readFile(filePath: string): Promise<string>;
    listFiles(dirPath: string): Promise<string[]>;
}
declare const _default: AICodeOrchestrator;
export default _default;
//# sourceMappingURL=ai-code-orchestrator.service.d.ts.map