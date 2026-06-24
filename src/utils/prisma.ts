import { PrismaClient } from '@prisma/client'

/**
 * Prisma 客户端单例
 * 全局只维护一个 PrismaClient 实例，避免开发环境热重载时创建多个连接
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
