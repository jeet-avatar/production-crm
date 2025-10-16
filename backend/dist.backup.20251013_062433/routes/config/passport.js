"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const app_1 = require("../app");
const logger_1 = require("../utils/logger");
// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}
if (!process.env.GOOGLE_CALLBACK_URL) {
    throw new Error('GOOGLE_CALLBACK_URL environment variable is required');
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
// Configure Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const googleId = profile.id;
        if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
        }
        // Check if user already exists
        let user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (user) {
            // Update last login
            user = await app_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    // Update Google ID if not set
                    ...(user.passwordHash === null && { passwordHash: `google:${googleId}` })
                },
            });
            logger_1.logger.info(`Google OAuth login: ${email}`);
            return done(null, user);
        }
        // Create new user
        user = await app_1.prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                passwordHash: `google:${googleId}`, // Store Google ID as password hash for OAuth users
                role: 'USER',
                isActive: true,
            },
        });
        logger_1.logger.info(`New user created via Google OAuth: ${email}`);
        return done(null, user);
    }
    catch (error) {
        logger_1.logger.error('Error in Google OAuth strategy:', error);
        return done(error, undefined);
    }
}));
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from session
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await app_1.prisma.user.findUnique({
            where: { id },
        });
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;
