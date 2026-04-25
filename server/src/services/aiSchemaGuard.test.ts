import { ensureStructuredReviewSummary } from './aiSchemaGuard';

describe('ensureStructuredReviewSummary', () => {
  it('fills defaults when input is empty', () => {
    const result = ensureStructuredReviewSummary(undefined);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.highlights.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.isFallback).toBe(false);
  });

  it('keeps valid fields and removes invalid list items', () => {
    const result = ensureStructuredReviewSummary({
      summary: '  本周表现稳定  ',
      highlights: ['完成3天打卡', '', 1 as unknown as string],
      suggestions: ['下周保持节奏'],
      isFallback: true,
    });

    expect(result.summary).toBe('本周表现稳定');
    expect(result.highlights).toEqual(['完成3天打卡']);
    expect(result.suggestions).toEqual(['下周保持节奏']);
    expect(result.isFallback).toBe(true);
  });
});
