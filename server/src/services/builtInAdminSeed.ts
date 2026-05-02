import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../shared/prisma';

/** 内置管理员（可通过环境变量覆盖，生产务必改密） */
export const BUILTIN_ADMIN_EMAIL = (
  process.env.BUILTIN_ADMIN_EMAIL || 'admin@learnflow.com'
).trim().toLowerCase();

const BUILTIN_ADMIN_PASSWORD = process.env.BUILTIN_ADMIN_PASSWORD || 'LearnFlow@9527';
const BUILTIN_ADMIN_NAME = process.env.BUILTIN_ADMIN_NAME || 'LearnFlow 内置管理员';

/**
 * 确保存在内置管理员：不存在则创建（bcrypt 密码）；已存在则仅校正 role/active/deleted，不覆盖密码。
 * 若需强制重置内置账号密码，设置环境变量 BUILTIN_ADMIN_FORCE_PASSWORD_RESET=true 后重启一次。
 */
export async function ensureBuiltInAdmin(): Promise<void> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const hashedPassword = await bcrypt.hash(BUILTIN_ADMIN_PASSWORD, saltRounds);
  const forcePwd = process.env.BUILTIN_ADMIN_FORCE_PASSWORD_RESET === 'true';

  const existing = await prisma.user.findUnique({
    where: { email: BUILTIN_ADMIN_EMAIL },
    select: { id: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: BUILTIN_ADMIN_EMAIL,
        name: BUILTIN_ADMIN_NAME,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    return;
  }

  await prisma.user.update({
    where: { email: BUILTIN_ADMIN_EMAIL },
    data: {
      role: Role.ADMIN,
      isActive: true,
      deletedAt: null,
      ...(forcePwd ? { password: hashedPassword } : {}),
    },
  });
}
