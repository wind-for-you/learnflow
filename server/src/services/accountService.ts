import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../shared/prisma';
import { NotFoundError } from '../shared/errors';

export const ACCOUNT_EXPORT_VERSION = 1 as const;

/** 释放原邮箱唯一约束，占位邮箱需全局唯一 */
export function tombstoneEmailForUser(userId: string): string {
  return `deleted.${userId}.${Date.now()}@account-closed.invalid`;
}

export async function buildAccountExportJson(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      createdAt: true,
      deletedAt: true,
      goals: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          targetDate: true,
          status: true,
          progress: true,
          createdAt: true,
          updatedAt: true,
          plans: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              goalId: true,
              title: true,
              durationWeeks: true,
              mermaidCode: true,
              content: true,
              progress: true,
              createdAt: true,
              updatedAt: true,
              tasks: {
                orderBy: [{ week: 'asc' }, { day: 'asc' }],
                select: {
                  id: true,
                  planId: true,
                  title: true,
                  week: true,
                  day: true,
                  completed: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
              aiTaskCompletions: {
                select: {
                  id: true,
                  planId: true,
                  taskKey: true,
                  completed: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      checkins: {
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          duration: true,
          notes: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          period: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      achievements: {
        select: {
          id: true,
          unlockedAt: true,
          achievement: {
            select: {
              key: true,
              title: true,
              description: true,
              icon: true,
              category: true,
              condition: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  const { deletedAt: _d, ...userRest } = user;

  return {
    exportVersion: ACCOUNT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    user: userRest,
  };
}

/**
 * 软删：标记删除时间、停用、匿名化邮箱与显示名、重置密码（数据保留，关联 onDelete 不触发）
 */
export async function softDeleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return;
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), saltRounds);

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      isActive: false,
      email: tombstoneEmailForUser(userId),
      name: '已删除用户',
      password: randomPassword,
    },
  });
}
