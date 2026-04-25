import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../../types';
import { api, unwrapResponse } from './http';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    const { data, message } = unwrapResponse<AuthResponse>(response.data, (raw) => ({
      user: raw.user,
      token: raw.token,
      message: raw.message || '登录成功',
    }));
    return { ...data, message: message || data.message || '登录成功' };
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    const { data, message } = unwrapResponse<AuthResponse>(response.data, (raw) => ({
      user: raw.user,
      token: raw.token,
      message: raw.message || '注册成功',
    }));
    return { ...data, message: message || data.message || '注册成功' };
  },

  me: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    const { data } = unwrapResponse<{ user: User }>(response.data, (raw) => ({ user: raw.user }));
    return data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/auth/logout');
    const { message } = unwrapResponse<unknown>(response.data);
    return { message: message || '登出成功' };
  },

  googleLogin: (): void => {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  },

  githubLogin: (): void => {
    window.location.href = `${api.defaults.baseURL}/auth/github`;
  },

  updateProfile: async (data: { name?: string; avatar?: string }): Promise<{ user: User; message: string }> => {
    const response = await api.put('/auth/profile', data);
    const { data: userData, message } = unwrapResponse<{ user: User; message?: string }>(
      response.data,
      (raw) => ({ user: raw.user, message: raw.message }),
    );
    return { user: userData.user, message: message || userData.message || '资料更新成功' };
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.put('/auth/password', data);
    const { message } = unwrapResponse<unknown>(response.data);
    return { message: message || '密码修改成功' };
  },
};
