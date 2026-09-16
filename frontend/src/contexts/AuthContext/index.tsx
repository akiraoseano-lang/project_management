import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";

import {
    getMe,
    login,
    logout,
    register
} from "../../api/auth";

import type {
    LoginRequest,
    RegisterRequest,
    User
} from "../../types/auth";


interface AuthContextValue {
    user: User | null;
    loading: boolean,
    isAuthenticated: boolean;

    loginUser: (data: LoginRequest) => Promise<void>;
    registerUser: (data: RegisterRequest) => Promise<void>;
    logoutUser: () => Promise<void>;
    checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
    undefined
);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({
    children,
}: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = useCallback(async () => {
        try {
            const currentUser = await getMe();

            setUser(currentUser);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try{
                await checkSession();
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, [checkSession]);

    const loginUser = async (
        data: LoginRequest,
    ): Promise<void> => {
        await login(data);

        const currentUser = await getMe();

        setUser(currentUser);
    };

    const registerUser = async (
        data: RegisterRequest,
    ): Promise<void> => {
        await register(data);

        const currentUser = await getMe();

        setUser(currentUser);
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
        isAuthenticated: user != null,

        loginUser,
        registerUser,
        logoutUser,
        checkSession
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}