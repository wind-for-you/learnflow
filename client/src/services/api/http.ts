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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    const apiError: ApiError = {
      error: error.response?.data?.error || 'Unknown Error',
      message: error.response?.data?.message || '请求失败',
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
