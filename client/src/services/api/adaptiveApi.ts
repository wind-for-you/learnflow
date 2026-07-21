import type { AdaptiveSuggestion } from '../../types';
import { api, unwrapResponse } from './http';

export const adaptiveApi = {
  analyze: async (planId: string): Promise<AdaptiveSuggestion> => {
    const response = await api.post(`/adaptive/${planId}/analyze`, {});
    const parsed = unwrapResponse<{ suggestion: AdaptiveSuggestion }>(response.data, (raw) => ({
      suggestion: raw.suggestion,
    }));
    return parsed.data.suggestion;
  },
};
