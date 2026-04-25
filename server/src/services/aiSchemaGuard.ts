import { StructuredReviewSummary } from './aiReviewService';

export function ensureStructuredReviewSummary(
  input: Partial<StructuredReviewSummary> | null | undefined,
): StructuredReviewSummary {
  const summary =
    typeof input?.summary === 'string' && input.summary.trim().length > 0
      ? input.summary.trim()
      : '已生成学习复盘摘要';

  const normalizeList = (value: unknown, fallback: string[]): string[] => {
    if (!Array.isArray(value)) return fallback;
    const cleaned = value
      .filter((v) => typeof v === 'string')
      .map((v) => (v as string).trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  };

  return {
    summary,
    highlights: normalizeList(input?.highlights, ['完成了本周期的学习记录沉淀。']),
    suggestions: normalizeList(input?.suggestions, ['保持稳定节奏，并在下周期持续复盘。']),
    isFallback: Boolean(input?.isFallback),
  };
}
