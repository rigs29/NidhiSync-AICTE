import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, TokenResponse, DemoPersona, SignupRequest, SignupResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<SignupResponse>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<SignupResponse>;
  loginAsPersona: (persona: DemoPersona) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aicte_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aicte_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem('aicte_token'));

  const saveAuthSession = (data: TokenResponse) => {
    localStorage.setItem('aicte_token', data.access_token);
    const userData: User = {
      id: 0, // Enriched on /me call
      name: data.name,
      email: data.email,
      role: data.role,
      institution_id: data.institution_id,
      institution_name: data.institution_name,
      is_active: true,
    };
    localStorage.setItem('aicte_user', JSON.stringify(userData));
    setToken(data.access_token);
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      localStorage.setItem('aicte_user', JSON.stringify(me));
    } catch (err) {
      console.error('Failed to sync user profile:', err);
    }
  };

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aicte_token');
      if (storedToken) {
        try {
          const me = await api.get<User>('/auth/me');
          if (active) {
            setUser(me);
            localStorage.setItem('aicte_user', JSON.stringify(me));
          }
        } catch (err: any) {
          // Resilient session handling: only clear token if server explicitly rejects with 401
          if (err?.status === 401) {
            if (active) {
              localStorage.removeItem('aicte_token');
              localStorage.removeItem('aicte_user');
              setToken(null);
              setUser(null);
            }
          } else {
            console.warn('Network hiccup during session refresh; retaining active session:', err);
          }
        }
      }
      if (active) {
        setIsLoading(false);
      }
    };
    initAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<TokenResponse>('/auth/login', { email, password });
    saveAuthSession(res);
    await refreshUser();
  };

  const signup = async (data: SignupRequest): Promise<SignupResponse> => {
    return await api.post<SignupResponse>('/auth/signup', data);
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await api.post<TokenResponse>('/auth/verify-otp', { email, otp });
    saveAuthSession(res);
    await refreshUser();
  };

  const resendOtp = async (email: string): Promise<SignupResponse> => {
    return await api.post<SignupResponse>('/auth/resend-otp', { email });
  };

  const loginAsPersona = async (persona: DemoPersona) => {
    await login(persona.email, persona.password);
  };

  const logout = () => {
    localStorage.removeItem('aicte_token');
    localStorage.removeItem('aicte_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        verifyOtp,
        resendOtp,
        loginAsPersona,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

