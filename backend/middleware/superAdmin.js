"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = void 0;
const app_1 = require("../app");
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
if (!SUPER_ADMIN_EMAIL) {
    console.error('❌ SECURITY ERROR: SUPER_ADMIN_EMAIL environment variable is not set');
    console.error('   Please set SUPER_ADMIN_EMAIL in your .env file');
}
const requireSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                role: true,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'Access denied - User not found' });
        }
        if (user.role !== 'SUPER_ADMIN') {
            console.warn(`⚠️  Unauthorized super admin access attempt by ${user.email} (role: ${user.role})`);
            return res.status(403).json({
                error: 'Access denied - Super admin role required',
            });
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=superAdmin.js.map