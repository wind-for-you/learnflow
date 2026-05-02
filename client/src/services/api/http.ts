import axios from 'axios';
import type { ApiError } from '../../types';
import { unwrapEnvelope } from '../../utils/apiEnvelope';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      const reqPath = String(error.config?.url || '');
      if (reqPath.includes('/auth/login')) {
        // 登录接口返回 401：交给登录页展示，不清会话、不整页跳转
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (path.startsWith('/ops')) {
          window.location.href = '/ops/login';
        } else {
          window.location.href = '/login';
        }
      }
    }

    const code = error?.code;
    const msg = String(error?.message || '');
    const isTimeout = code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout');
    const isNetwork = code === 'ERR_NETWORK' || msg === 'Network Error';

    const apiError: ApiError = {
      error: error.response?.data?.error || 'Unknown Error',
      message:
        error.response?.data?.message ||
        (isTimeout ? '请求超时，请稍后重试' : isNetwork ? '网络异常，请检查连接与跨域配置' : '请求失败'),
      details: error.response?.data?.details,
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  },
);

export function unwrapResponse<T>(
  payload: any,
  selector?: (raw: any) => T,
): { data: T; message?: string } {
  return unwrapEnvelope<T>(payload, selector);
}
