import { LlmProfileChannel } from '@prisma/client';
import prisma from '../shared/prisma';

/**
 * 确保存在默认可切换的 LLM Profile（无则插入；已有则不改写用户配置）
 */
export async function ensureLlmProviderProfiles(): Promise<void> {
  const n = await prisma.llmProviderProfile.count();
  if (n > 0) {
    return;
  }

  await prisma.llmProviderProfile.createMany({
    data: [
      {
        slug: 'dashscope-default',
        label: '阿里百炼（默认）',
        channel: LlmProfileChannel.DASHSCOPE,
        baseUrl: null,
        model: null,
        timeoutMs: 45000,
        enabled: true,
        isDefault: true,
      },
      {
        slug: 'openrouter-compat',
        label: 'OpenRouter 兼容',
        channel: LlmProfileChannel.OPENROUTER_COMPAT,
        baseUrl: null,
        model: null,
        timeoutMs: 60000,
        enabled: true,
        isDefault: false,
      },
    ],
  });
}
