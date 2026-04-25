import { api, unwrapResponse } from './http';

export const achievementApi = {
  getAchievements: async (): Promise<{
    achievements: Array<{
      id: string;
      key: string;
      title: string;
      description: string;
      icon: string;
      condition: string;
      category: string;
      unlocked: boolean;
      unlockedAt: string | null;
    }>;
    unlockedCount: number;
    totalCount: number;
  }> => {
    const response = await api.get('/achievements');
    return unwrapResponse<any>(response.data).data;
  },

  checkAchievements: async (): Promise<{
    newlyUnlocked: Array<{ key: string; title: string; icon: string }>;
  }> => {
    const response = await api.post('/achievements/check');
    return unwrapResponse<any>(response.data).data;
  },
};
