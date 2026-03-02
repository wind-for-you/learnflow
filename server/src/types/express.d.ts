/**
 * 扩展 Express Request，使 req.user 与 JWT 认证后的用户形状一致。
 * 与 @types/passport 的 Express.User 合并后，请求中 user 为本形状。
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: 'USER' | 'ADMIN';
      };
    }
  }
}

export {};
