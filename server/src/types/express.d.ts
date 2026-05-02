/**
 * 与 @types/passport 合并：Passport 将 req.user 标为 Express.User，须在此接口上声明字段。
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface augmentation
    interface User {
      id: string;
      email: string;
      name: string;
      role: 'USER' | 'ADMIN';
      isActive: boolean;
      avatar?: string | null;
    }
  }
}

export {};
