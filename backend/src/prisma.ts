/**
 * Shared Prisma Client Instance
 *
 * Centralized Prisma Client to prevent connection pool exhaustion
 * and avoid circular dependency issues.
 *
 * DO NOT create new PrismaClient() instances in other files.
 * Always import prisma from this module.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };
