import type { VideoResource } from '../../types';
import { api, unwrapResponse } from './http';

export const videoResourceApi = {
  listByTask: async (taskId: string): Promise<{ videos: VideoResource[] }> => {
    const response = await api.get('/video-resources', { params: { taskId } });
    const { data } = unwrapResponse<{ videos: VideoResource[] }>(response.data, (raw) => ({
      videos: raw.videos || [],
    }));
    return data;
  },

  createEmbed: async (payload: {
    url: string;
    title?: string;
    taskId?: string;
    planId?: string;
    goalId?: string;
  }): Promise<{ video: VideoResource; message?: string }> => {
    const response = await api.post('/video-resources', payload);
    const { data, message } = unwrapResponse<{ video: VideoResource }>(response.data, (raw) => ({
      video: raw.video,
    }));
    return { video: data.video, message };
  },

  update: async (
    id: string,
    payload: { url?: string; title?: string },
  ): Promise<{ video: VideoResource; message?: string }> => {
    const response = await api.put(`/video-resources/${id}`, payload);
    const { data, message } = unwrapResponse<{ video: VideoResource }>(response.data, (raw) => ({
      video: raw.video,
    }));
    return { video: data.video, message };
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/video-resources/${id}`);
  },
};
