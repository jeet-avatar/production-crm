import { User } from '@prisma/client';
interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
export declare class AuthUtils {
    private static readonly JWT_SECRET;
    private static readonly JWT_EXPIRE;
    private static readonly BCRYPT_ROUNDS;
    static generateToken(user: User): string;
    static verifyToken(token: string): TokenPayload;
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static generateRandomPassword(length?: number): string;
    static extractTokenFromHeader(authHeader: string | undefined): string | null;
}
export { TokenPayload };
//# sourceMappingURL=auth.d.ts.map