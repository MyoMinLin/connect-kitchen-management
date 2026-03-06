import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export type UserRole = 'Admin' | 'Kitchen' | 'Waiter';

interface User {
    id: string;
    role: UserRole;
    username: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const decoded = jwtDecode<{ user: User; exp: number }>(token);

            // If already expired on load/reload, log out immediately
            if (decoded.exp * 1000 <= Date.now()) {
                logout();
                setIsLoading(false);
                return;
            }

            setUser(decoded.user);

            // Schedule logout exactly when the token expires
            const msUntilExpiry = decoded.exp * 1000 - Date.now();
            const expiryTimer = setTimeout(() => {
                logout();
            }, msUntilExpiry);

            // Safety-net interval (handles browser wake-from-sleep past the timer)
            const intervalTimer = setInterval(() => {
                if (decoded.exp * 1000 <= Date.now()) {
                    logout();
                }
            }, 60_000);

            setIsLoading(false);

            return () => {
                clearTimeout(expiryTimer);
                clearInterval(intervalTimer);
            };
        } catch (error) {
            console.error('Invalid token:', error);
            logout();
            setIsLoading(false);
        }
    }, [token, logout]);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
