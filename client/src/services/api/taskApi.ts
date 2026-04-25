import type { Task, TaskFormData } from '../../types';
import { api, unwrapResponse } from './http';

export const taskApi = {
  getTasks: async (params?: {
    planId?: string;
    week?: number;
    completed?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    tasks: Task[];
    pagination: any;
  }> => {
    const response = await api.get('/tasks', { params });
    const { data } = unwrapResponse<{ tasks: Task[]; pagination: any }>(
      response.data,
      (raw) => ({ tasks: raw.tasks || [], pagination: raw.pagination }),
    );
    return data;
  },

  getTask: async (id: string): Promise<{ task: Task }> => {
    const response = await api.get(`/tasks/${id}`);
    const { data } = unwrapResponse<{ task: Task }>(response.data, (raw) => ({ task: raw.task }));
    return data;
  },

  createTask: async (data: TaskFormData): Promise<{ task: Task; message: string }> => {
    const response = await api.post('/tasks', data);
    const parsed = unwrapResponse<{ task: Task }>(response.data, (raw) => ({ task: raw.task }));
    return { task: parsed.data.task, message: parsed.message || '任务创建成功' };
  },

  updateTask: async (
    id: string,
    data: Partial<TaskFormData>,
  ): Promise<{ task: Task; message: string }> => {
    const response = await api.put(`/tasks/${id}`, data);
    const parsed = unwrapResponse<{ task: Task }>(response.data, (raw) => ({ task: raw.task }));
    return { task: parsed.data.task, message: parsed.message || '任务更新成功' };
  },

  toggleTask: async (
    id: string,
    completed: boolean,
  ): Promise<{ task: Task; message: string }> => {
    const response = await api.patch(`/tasks/${id}`, { completed });
    const parsed = unwrapResponse<{ task: Task }>(response.data, (raw) => ({ task: raw.task }));
    return { task: parsed.data.task, message: parsed.message || (completed ? '任务已完成' : '任务标记为未完成') };
  },

  deleteTask: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/tasks/${id}`);
    const parsed = unwrapResponse<unknown>(response.data);
    return { message: parsed.message || '任务删除成功' };
  },

  getWeeklyTasks: async (
    week: number,
    planId?: string,
  ): Promise<{
    week: number;
    tasks: Task[];
    tasksByDay: Record<number, Task[]>;
    summary: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    };
  }> => {
    const params = planId ? { planId } : undefined;
    const response = await api.get(`/tasks/weekly/${week}`, { params });
    return unwrapResponse<any>(response.data).data;
  },
};
