
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getMe,
  login,
  logout,
  register,
} from "../../api/auth";

import type {
  LoginRequest,
  RegisterRequest,
  User,
} from "../../types/auth";

type AuthUser = User & {
  profile_photo_signed_url?: string | null;
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  loginUser: (data: LoginRequest) => Promise<void>;
  registerUser: (data: RegisterRequest) => Promise<void>;
  logoutUser: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const currentUser = await getMe();
    setUser(currentUser);
  }, []);

  const checkSession = useCallback(async () => {
    try {
      await refreshUser();
    } catch {
      setUser(null);
    }
  }, [refreshUser]);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await getMe();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  const loginUser = async (data: LoginRequest): Promise<void> => {
    await login(data);
    await refreshUser();
  };

  const registerUser = async (
    data: RegisterRequest,
  ): Promise<void> => {
    await register(data);
    await refreshUser();
  };

  const logoutUser = async (): Promise<void> => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: user !== null,
    loginUser,
    registerUser,
    logoutUser,
    checkSession,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
