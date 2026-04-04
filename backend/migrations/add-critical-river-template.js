"use strict";
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
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Starting Critical River template migration...');
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../NetSuite-FINAL-All-Variables.html'), 'utf-8');
    const user = await prisma.user.findFirst({
        where: {
            email: 'jeetnair.in@gmail.com'
        }
    });
    if (!user) {
        throw new Error('User jeetnair.in@gmail.com not found in production database');
    }
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    const existingTemplate = await prisma.emailTemplate.findFirst({
        where: {
            userId: user.id,
            name: 'Critical River - NetSuite AI Automation'
        }
    });
    if (existingTemplate) {
        console.log('⚠️  Template already exists. Updating...');
        const updated = await prisma.emailTemplate.update({
            where: { id: existingTemplate.id },
            data: {
                subject: 'Transform Your NetSuite Operations - Cut Month-End Close Time by 50%',
                htmlContent: htmlContent,
                textContent: 'Transform Your NetSuite Operations with AI-powered automation. Watch our personalized video to see how we can help.',
                variables: [
                    'firstName',
                    'companyName',
                    'contactId',
                    'email',
                    'senderName',
                    'calendarLink',
                    'VIDEO_URL'
                ],
                isShared: true,
                updatedAt: new Date()
            }
        });
        console.log(`✅ Template updated successfully!`);
        console.log(`   - ID: ${updated.id}`);
        console.log(`   - Name: ${updated.name}`);
        console.log(`   - Link: https://brandmonkz.com/email-templates/${updated.id}`);
        return updated;
    }
    console.log('📝 Creating new template...');
    const template = await prisma.emailTemplate.create({
        data: {
            userId: user.id,
            name: 'Critical River - NetSuite AI Automation',
            subject: 'Transform Your NetSuite Operations - Cut Month-End Close Time by 50%',
            htmlContent: htmlContent,
            textContent: 'Transform Your NetSuite Operations with AI-powered automation. Watch our personalized video to see how we can help.',
            variables: [
                'firstName',
                'companyName',
                'contactId',
                'email',
                'senderName',
                'calendarLink',
                'VIDEO_URL'
            ],
            isShared: true,
            isActive: true
        }
    });
    console.log('✅ Migration completed successfully!');
    console.log(`   - Template ID: ${template.id}`);
    console.log(`   - Template Name: ${template.name}`);
    console.log(`   - View at: https://brandmonkz.com/email-templates/${template.id}`);
    console.log(`   - Variables: ${JSON.stringify(template.variables)}`);
    return template;
}
main()
    .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=add-critical-river-template.js.map