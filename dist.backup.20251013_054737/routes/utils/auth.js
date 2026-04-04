"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthUtils {
    /**
     * Generate JWT token
     */
    static generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRE,
            issuer: 'crm-api',
            audience: 'crm-client',
        });
    }
    /**
     * Verify JWT token
     */
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET, {
                issuer: 'crm-api',
                audience: 'crm-client',
            });
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    /**
     * Hash password
     */
    static async hashPassword(password) {
        return await bcryptjs_1.default.hash(password, this.BCRYPT_ROUNDS);
    }
    /**
     * Compare password with hash
     */
    static async comparePassword(password, hash) {
        return await bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Generate random password
     */
    static generateRandomPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}
exports.AuthUtils = AuthUtils;
AuthUtils.JWT_SECRET = process.env.JWT_SECRET;
AuthUtils.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
AuthUtils.BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12');
