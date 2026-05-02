import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import prisma from '../shared/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { ensureLlmProviderProfiles } from '../services/llmProfileSeed';
import {
  envKeyConfiguredForChannel,
  resolveDefaultLlmRuntime,
} from '../services/runtimeLlmConfigService';

const router = Router();

router.get('/llm-profiles', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  await ensureLlmProviderProfiles();
  const rows = await prisma.llmProviderProfile.findMany({ orderBy: { slug: 'asc' } });
  const active = await resolveDefaultLlmRuntime();

  res.json({
    success: true,
    data: {
      profiles: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        label: p.label,
        channel: p.channel,
        baseUrl: p.baseUrl,
        model: p.model,
        timeoutMs: p.timeoutMs,
        enabled: p.enabled,
        isDefault: p.isDefault,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        envKeyConfigured: envKeyConfiguredForChannel(p.channel),
      })),
      activePreview: active
        ? {
            profileSlug: active.profileSlug,
            profileLabel: active.profileLabel,
            channel: active.channel,
            baseURL: active.baseURL,
            model: active.model,
            timeoutMs: active.timeoutMs,
            hasApiKey: Boolean(active.apiKey),
          }
        : null,
    },
  });
});

router.patch(
  '/llm-profiles/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.llmProviderProfile.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: '配置不存在' });
      return;
    }

    const { label, baseUrl, model, timeoutMs, enabled } = req.body as {
      label?: string;
      baseUrl?: string | null;
      model?: string | null;
      timeoutMs?: number;
      enabled?: boolean;
    };

    if (label !== undefined && (typeof label !== 'string' || label.length < 1 || label.length > 120)) {
      res.status(400).json({ error: 'Validation Error', message: 'label 长度 1–120' });
      return;
    }
    if (
      timeoutMs !== undefined &&
      (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs < 3000 || timeoutMs > 120000)
    ) {
      res.status(400).json({ error: 'Validation Error', message: 'timeoutMs 须在 3000–120000' });
      return;
    }

    const nextEnabled = enabled !== undefined ? Boolean(enabled) : existing.enabled;
    if (existing.isDefault && !nextEnabled) {
      res.status(400).json({ error: 'Bad Request', message: '不能停用当前默认 Profile，请先切换默认' });
      return;
    }

    const normalizedBase =
      baseUrl === undefined
        ? undefined
        : baseUrl === null || (typeof baseUrl === 'string' && baseUrl.trim() === '')
          ? null
          : String(baseUrl).trim();
    const normalizedModel =
      model === undefined
        ? undefined
        : model === null || (typeof model === 'string' && model.trim() === '')
          ? null
          : String(model).trim();

    const updated = await prisma.llmProviderProfile.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(normalizedBase !== undefined ? { baseUrl: normalizedBase } : {}),
        ...(normalizedModel !== undefined ? { model: normalizedModel } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(enabled !== undefined ? { enabled: nextEnabled } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'admin.llm_profile.updated',
        targetType: 'llm_provider_profile',
        targetId: id,
        metadata: { slug: updated.slug, channel: updated.channel },
      },
    });

    res.json({
      success: true,
      data: {
        profile: {
          ...updated,
          envKeyConfigured: envKeyConfiguredForChannel(updated.channel),
        },
      },
    });
  },
);

router.post(
  '/llm-profiles/:id/set-default',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const id = req.params.id as string;
    const target = await prisma.llmProviderProfile.findUnique({ where: { id } });
    if (!target || !target.enabled) {
      res.status(400).json({ error: 'Bad Request', message: '目标不存在或未启用' });
      return;
    }

    await prisma.$transaction([
      prisma.llmProviderProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.llmProviderProfile.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'admin.llm_profile.default_changed',
        targetType: 'llm_provider_profile',
        targetId: id,
        metadata: { slug: target.slug, channel: target.channel },
      },
    });

    const rows = await prisma.llmProviderProfile.findMany({ orderBy: { slug: 'asc' } });
    res.json({ success: true, data: { profiles: rows } });
  },
);

export default router;
