"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICodeOrchestrator = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
class AICodeOrchestrator {
    constructor() {
        this.basePath = process.env.PROJECT_ROOT || '/var/www/crm-backend';
    }
    async analyzeCommand(request) {
        const systemPrompt = `You are an expert full-stack developer assistant with access to a CRM application codebase.

**Your Role:**
- Analyze user requests and generate precise code changes
- Understand React/TypeScript frontend and Node.js/Express backend
- Work with PostgreSQL/Prisma for database operations
- Follow existing code patterns and styling (Tailwind CSS)

**Current Context:**
- Page: ${request.currentPage}
- Page Type: ${request.pageContext.pageType}
- Current Tab: ${request.pageContext.tab}

**Instructions:**
1. Analyze the user's request carefully
2. Determine which files need to be modified
3. Generate complete, production-ready code
4. Return your response in JSON format with code changes

**Response Format:**
{
  "analysis": "Brief explanation of what you'll do",
  "codeChanges": [
    {
      "filePath": "frontend/src/pages/...",
      "description": "What this change does",
      "changeType": "add" | "modify" | "delete",
      "newCode": "Complete code to add/modify"
    }
  ],
  "additionalSteps": ["Any manual steps needed"],
  "impact": "Expected impact of changes"
}

**Important:**
- Only suggest changes you're confident about
- Provide complete code, not snippets
- Follow TypeScript best practices
- Maintain existing styling patterns
- Include error handling`;
        try {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    ...request.conversationHistory.map(msg => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    })),
                    {
                        role: 'user',
                        content: `${request.command}\n\nPage Context: ${JSON.stringify(request.pageContext, null, 2)}`
                    }
                ]
            });
            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type');
            }
            let aiResponse;
            try {
                const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) ||
                    content.text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text;
                aiResponse = JSON.parse(jsonStr);
            }
            catch {
                return {
                    response: content.text,
                    codeChanges: undefined
                };
            }
            let userResponse = `📝 **Analysis:**\n${aiResponse.analysis}\n\n`;
            if (aiResponse.codeChanges && aiResponse.codeChanges.length > 0) {
                userResponse += `🔧 **Proposed Changes:**\n`;
                aiResponse.codeChanges.forEach((change, index) => {
                    userResponse += `${index + 1}. ${change.description} (${change.filePath})\n`;
                });
                userResponse += `\n✅ Click "Apply Changes" to proceed or "Reject" to cancel.`;
            }
            if (aiResponse.additionalSteps && aiResponse.additionalSteps.length > 0) {
                userResponse += `\n\n⚠️ **Additional Steps:**\n`;
                aiResponse.additionalSteps.forEach((step) => {
                    userResponse += `• ${step}\n`;
                });
            }
            return {
                response: userResponse,
                codeChanges: aiResponse.codeChanges
            };
        }
        catch (error) {
            console.error('AI Analysis Error:', error);
            throw new Error(`Failed to analyze command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async applyChanges(changes, currentPage) {
        const filesModified = [];
        try {
            await this.createBackup();
            for (const change of changes) {
                const fullPath = path_1.default.join(this.basePath, change.filePath);
                if (change.changeType === 'add' || change.changeType === 'modify') {
                    await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
                    await promises_1.default.writeFile(fullPath, change.newCode, 'utf-8');
                    filesModified.push(change.filePath);
                }
                else if (change.changeType === 'delete') {
                    await promises_1.default.unlink(fullPath);
                    filesModified.push(change.filePath);
                }
            }
            const commitMessage = `AI Code Assistant: ${changes[0].description} (${currentPage})`;
            const commitHash = await this.gitCommit(filesModified, commitMessage);
            const hasFrontendChanges = filesModified.some(f => f.includes('frontend'));
            if (hasFrontendChanges) {
                await this.buildFrontend();
            }
            const hasBackendChanges = filesModified.some(f => f.includes('backend'));
            if (hasBackendChanges) {
                await this.restartBackend();
            }
            return {
                success: true,
                message: `Successfully applied ${changes.length} code change(s)`,
                filesModified,
                commitHash
            };
        }
        catch (error) {
            await this.rollback();
            throw new Error(`Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupBranch = `ai-backup-${timestamp}`;
        await execAsync(`cd ${this.basePath} && git branch ${backupBranch}`, {
            cwd: this.basePath
        });
    }
    async gitCommit(files, message) {
        try {
            for (const file of files) {
                await execAsync(`cd ${this.basePath} && git add ${file}`, {
                    cwd: this.basePath
                });
            }
            await execAsync(`cd ${this.basePath} && git commit -m "${message}\n\n🤖 Generated with AI Code Assistant\nCo-Authored-By: Claude <noreply@anthropic.com>"`, {
                cwd: this.basePath
            });
            const { stdout } = await execAsync(`cd ${this.basePath} && git rev-parse --short HEAD`, {
                cwd: this.basePath
            });
            return stdout.trim();
        }
        catch (error) {
            console.error('Git commit error:', error);
            throw error;
        }
    }
    async buildFrontend() {
        try {
            await execAsync('cd frontend && npm run build', {
                cwd: this.basePath,
                timeout: 120000
            });
        }
        catch (error) {
            console.error('Frontend build error:', error);
        }
    }
    async restartBackend() {
        try {
            await execAsync('cd backend && npm run build', {
                cwd: this.basePath,
                timeout: 60000
            });
        }
        catch (error) {
            console.error('Backend build error:', error);
        }
    }
    async rollback() {
        try {
            await execAsync(`cd ${this.basePath} && git reset --hard HEAD~1`, {
                cwd: this.basePath
            });
        }
        catch (error) {
            console.error('Rollback error:', error);
        }
    }
    async readFile(filePath) {
        const fullPath = path_1.default.join(this.basePath, filePath);
        return await promises_1.default.readFile(fullPath, 'utf-8');
    }
    async listFiles(dirPath) {
        const fullPath = path_1.default.join(this.basePath, dirPath);
        const entries = await promises_1.default.readdir(fullPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile())
            .map(entry => entry.name);
    }
}
exports.AICodeOrchestrator = AICodeOrchestrator;
exports.default = new AICodeOrchestrator();
//# sourceMappingURL=ai-code-orchestrator.service.js.map