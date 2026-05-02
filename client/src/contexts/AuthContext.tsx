import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthResponse, LoginCredentials, RegisterCredentials, ApiError } from '../types';
import { authApi } from '../services/api';
import { flushQueue, track } from '../utils/productAnalytics';

// 认证状态类型
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// 认证操作类型
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// 认证上下文类型
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  /** 仅清除本地会话（不请求 /logout），用于账号已注销后避免 403 */
  exitSessionSilently: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

// 初始状态
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// 认证 Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        token: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    default:
      return state;
  }
}

// 创建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 组件
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }

    if (!userStr) {
      console.log('有token但没有user，尝试从API获取用户信息...');
    }

    try {
      const response = await authApi.me();
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token,
        },
      });
      console.log('✅ 认证检查成功，用户信息已更新');
      track('auth_session_restored', {});
    } catch (error) {
      console.error('认证检查失败:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response: AuthResponse = await authApi.login(credentials);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
      track('login_success', { method: 'password' });
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({
        type: 'AUTH_ERROR',
        payload: apiError.message || '登录失败',
      });
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response: AuthResponse = await authApi.register(credentials);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
      track('register_success', {});
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({
        type: 'AUTH_ERROR',
        payload: apiError.message || '注册失败',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    void flushQueue().finally(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      authApi.logout().catch(console.error);
      dispatch({ type: 'AUTH_LOGOUT' });
    });
  }, []);

  const exitSessionSilently = useCallback(() => {
    void flushQueue().finally(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'AUTH_LOGOUT' });
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  useEffect(() => {
    if (state.user && state.token && state.isAuthenticated) {
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  }, [state.user, state.token, state.isAuthenticated]);

  // 组件挂载时检查认证状态
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  // 监听 storage 事件（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token') {
        if (!event.newValue) {
          // 令牌被删除，登出
          dispatch({ type: 'AUTH_LOGOUT' });
        } else if (event.newValue !== state.token) {
          // 令牌发生变化，重新检查认证
          checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [state.token]);

  // 处理 OAuth 回调
  useEffect(() => {
    const handleOAuthCallback = () => {
      console.log('=== 前端 OAuth 回调处理开始 ===');
      console.log('当前URL:', window.location.href);
      
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      console.log('URL参数:', {
        token: token ? `${token.substring(0, 20)}...` : null,
        error
      });

      if (token) {
        // OAuth 成功，保存令牌并检查用户信息
        console.log('✅ 收到OAuth token，保存到localStorage');
        localStorage.setItem('token', token);
        
        console.log('开始检查用户认证状态...');
        checkAuth();
        
        // 清理 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('URL参数已清理');
      } else if (error) {
        // OAuth 失败
        console.log('❌ OAuth 失败，错误类型:', error);
        const errorMessages: Record<string, string> = {
          oauth_failed: 'OAuth 认证失败',
          server_error: '服务器错误，请稍后重试',
        };
        
        const errorMessage = errorMessages[error] || 'OAuth 认证出现未知错误';
        console.log('显示错误消息:', errorMessage);
        
        dispatch({
          type: 'AUTH_ERROR',
          payload: errorMessage,
        });
        
        // 清理 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('URL参数已清理');
      } else {
        console.log('⚠️ 既没有token也没有error参数');
      }
      
      console.log('=== 前端 OAuth 回调处理完成 ===');
    };

    // 检查是否是 OAuth 回调页面
    if (window.location.pathname === '/auth/callback') {
      console.log('检测到OAuth回调页面，开始处理...');
      handleOAuthCallback();
    }
  }, [checkAuth]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      exitSessionSilently,
      clearError,
      updateUser,
      checkAuth,
    }),
    [state, login, register, logout, exitSessionSilently, clearError, updateUser, checkAuth],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// 自定义 Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

// 导出上下文（用于测试）
export { AuthContext };
