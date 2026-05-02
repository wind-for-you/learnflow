import type {
  AdminOverview,
  AdminUserListItem,
  AuditLogEntry,
  LlmActivePreview,
  LlmProfileAdminRow,
} from '../../types';
import { api, unwrapResponse } from './http';

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const adminApi = {
  getOverview: async (): Promise<AdminOverview> => {
    const response = await api.get('/admin/overview');
    return unwrapResponse<AdminOverview>(response.data, (raw) => raw).data;
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'USER' | 'ADMIN';
    isActive?: boolean;
    sortBy?: 'createdAt' | 'name' | 'email' | 'role';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: AdminUserListItem[]; pagination: PaginationResult }> => {
    const response = await api.get('/admin/users', { params });
    return unwrapResponse<{ users: AdminUserListItem[]; pagination: PaginationResult }>(
      response.data,
      (raw) => ({ users: raw.users || [], pagination: raw.pagination }),
    ).data;
  },

  updateUserRole: async (userId: string, role: 'USER' | 'ADMIN'): Promise<AdminUserListItem> => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return unwrapResponse<{ user: AdminUserListItem }>(response.data, (raw) => ({ user: raw.user })).data.user;
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<AdminUserListItem> => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return unwrapResponse<{ user: AdminUserListItem }>(response.data, (raw) => ({ user: raw.user })).data.user;
  },

  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    startAt?: string;
    endAt?: string;
  }): Promise<{ logs: AuditLogEntry[]; pagination: PaginationResult }> => {
    const response = await api.get('/admin/audit-logs', { params });
    return unwrapResponse<{ logs: AuditLogEntry[]; pagination: PaginationResult }>(
      response.data,
      (raw) => ({ logs: raw.logs || [], pagination: raw.pagination }),
    ).data;
  },

  getLlmProfiles: async (): Promise<{
    profiles: LlmProfileAdminRow[];
    activePreview: LlmActivePreview | null;
  }> => {
    const response = await api.get('/admin/llm-profiles');
    return unwrapResponse<{ profiles: LlmProfileAdminRow[]; activePreview: LlmActivePreview | null }>(
      response.data,
      (raw) => ({
        profiles: raw.profiles || [],
        activePreview: raw.activePreview ?? null,
      }),
    ).data;
  },

  patchLlmProfile: async (
    id: string,
    body: Partial<{
      label: string;
      baseUrl: string | null;
      model: string | null;
      timeoutMs: number;
      enabled: boolean;
    }>,
  ): Promise<LlmProfileAdminRow> => {
    const response = await api.patch(`/admin/llm-profiles/${id}`, body);
    return unwrapResponse<{ profile: LlmProfileAdminRow }>(response.data, (raw) => ({
      profile: raw.profile,
    })).data.profile;
  },

  setDefaultLlmProfile: async (id: string): Promise<void> => {
    await api.post(`/admin/llm-profiles/${id}/set-default`);
  },

  exportAuditLogsCsv: async (params?: {
    action?: string;
    startAt?: string;
    endAt?: string;
  }): Promise<Blob> => {
    const response = await api.get('/admin/audit-logs/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
