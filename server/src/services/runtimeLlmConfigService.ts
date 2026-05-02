import { LlmProfileChannel } from '@prisma/client';
import prisma from '../shared/prisma';
import { ensureLlmProviderProfiles } from './llmProfileSeed';

const DASHSCOPE_DEFAULT_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export interface ResolvedLlmRuntime {
  apiKey: string;
  baseURL: string;
  model: string;
  timeoutMs: number;
  channel: LlmProfileChannel;
  profileSlug: string;
  profileLabel: string;
}

function resolveDashscopeKey(): string {
  return (process.env.DASHSCOPE_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
}

function resolveOpenrouterKey(): string {
  return (process.env.OPENROUTER_API_KEY || '').trim();
}

/**
 * 解析当前默认启用的 LLM 运行时（密钥仅来自环境变量；DB 覆盖 baseUrl/model/timeout）
 */
export async function resolveDefaultLlmRuntime(): Promise<ResolvedLlmRuntime | null> {
  await ensureLlmProviderProfiles();

  const profiles = await prisma.llmProviderProfile.findMany({
    where: { enabled: true },
    orderBy: { slug: 'asc' },
  });

  const def =
    profiles.find((p) => p.isDefault) ||
    profiles.find((p) => p.slug === 'dashscope-default') ||
    profiles[0];

  if (!def) {
    return null;
  }

  if (def.channel === LlmProfileChannel.DASHSCOPE) {
    const apiKey = resolveDashscopeKey();
    const baseURL =
      def.baseUrl?.trim() ||
      process.env.DASHSCOPE_BASE_URL?.trim() ||
      process.env.OPENROUTER_BASE_URL?.trim() ||
      DASHSCOPE_DEFAULT_BASE;
    const model =
      def.model?.trim() ||
      process.env.DASHSCOPE_MODEL?.trim() ||
      process.env.OPENROUTER_MODEL?.trim() ||
      'qwen-plus';
    const timeoutMs = Math.min(120000, Math.max(3000, def.timeoutMs || 20000));
    return {
      apiKey,
      baseURL,
      model,
      timeoutMs,
      channel: def.channel,
      profileSlug: def.slug,
      profileLabel: def.label,
    };
  }

  const apiKey = resolveOpenrouterKey();
  const baseURL =
    def.baseUrl?.trim() ||
    process.env.OPENROUTER_BASE_URL?.trim() ||
    'https://openrouter.ai/api/v1';
  const model =
    def.model?.trim() || process.env.OPENROUTER_MODEL?.trim() || 'qwen3.6-plus';
  const timeoutMs = Math.min(120000, Math.max(3000, def.timeoutMs || 20000));
  return {
    apiKey,
    baseURL,
    model,
    timeoutMs,
    channel: def.channel,
    profileSlug: def.slug,
    profileLabel: def.label,
  };
}

export function envKeyConfiguredForChannel(channel: LlmProfileChannel): boolean {
  if (channel === LlmProfileChannel.DASHSCOPE) {
    return Boolean(resolveDashscopeKey());
  }
  return Boolean(resolveOpenrouterKey());
}
