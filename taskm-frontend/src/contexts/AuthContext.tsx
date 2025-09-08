import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  registrationSuccess: boolean;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'REGISTER_SUCCESS' }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

export const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string | undefined, email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
} | null>(null);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null, registrationSuccess: false };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        loading: false,
        initialized: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        registrationSuccess: false,
      };
    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.payload, registrationSuccess: false };
    case 'REGISTER_SUCCESS':
      return { ...state, loading: false, registrationSuccess: true, error: null };
    case 'LOGOUT':
      return { ...state, user: null, token: null, error: null, initialized: true, registrationSuccess: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null, registrationSuccess: false };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    loading: false,
    initialized: false,
    error: null,
    registrationSuccess: false,
  });

  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as any;
        if (error.response && error.response.status === 401) {
          if (originalRequest?.url && String(originalRequest.url).includes('/api/refresh')) {
            dispatch({ type: 'LOGOUT' });
            return Promise.reject(error);
          }
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            try {
              const refreshRes = await axios.post('/api/refresh', {}, { withCredentials: true, timeout: 5000 });
              const newToken = refreshRes.data.token;
              localStorage.setItem('token', newToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            } catch (refreshErr) {
              dispatch({ type: 'LOGOUT' });
              return Promise.reject(refreshErr);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(resInterceptor);
    };
  }, [state.token]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await axios.post('/api/refresh', {}, { withCredentials: true, timeout: 5000 });
        const { token, user } = res.data;
        if (token && user) {
          localStorage.setItem('token', token);
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
        }
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await axios.post('/api/login', { email, password }, { withCredentials: true });
      const { token, user, refreshToken } = res.data;
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        dispatch({ type: 'AUTH_ERROR', payload: error.response?.data?.message || 'Login failed' });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: 'Login failed' });
      }
    }
  };

  const register = async (name: string, username: string | undefined, email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      await axios.post('/api/register', { name, username, email, password }, { withCredentials: true });
      dispatch({ type: 'REGISTER_SUCCESS' });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        dispatch({ type: 'AUTH_ERROR', payload: error.response?.data?.message || 'Registration failed' });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: 'Registration failed' });
      }
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout', {}, { withCredentials: true });
    } catch {}
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };

  const resetPassword = async () => {
    dispatch({ type: 'AUTH_START' });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      dispatch({ type: 'CLEAR_ERROR' });
    } catch {
      dispatch({ type: 'AUTH_ERROR', payload: 'Password reset failed' });
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
