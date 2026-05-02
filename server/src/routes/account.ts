import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { buildAccountExportJson, softDeleteUserAccount } from '../services/accountService';

const router = Router();

const DELETE_CONFIRM = 'DELETE_MY_ACCOUNT';

/**
 * GET /api/account/export
 * 导出当前用户核心学习数据为 JSON（不含密码哈希）
 */
router.get('/export', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payload = await buildAccountExportJson(req.user!.id);
    const safeName = `learnflow-export-${req.user!.id.slice(0, 8)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('账户导出错误:', error);
    res.status(500).json({
      error: 'Server Error',
      message: '导出失败',
    });
  }
});

/**
 * DELETE /api/account
 * 软删当前账号（需显式确认文案）
 */
router.delete(
  '/',
  requireAuth,
  [body('confirm').equals(DELETE_CONFIRM).withMessage('确认文案不正确')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: '请确认删除操作',
          details: errors.array(),
        });
        return;
      }

      await softDeleteUserAccount(req.user!.id);

      res.json({
        message: '账号已注销，数据已按策略保留或匿名化',
      });
    } catch (error) {
      console.error('账户注销错误:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '注销失败',
      });
    }
  }
);

export default router;
