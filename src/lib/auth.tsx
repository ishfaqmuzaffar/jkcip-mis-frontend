"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  canWrite: boolean;
  canReview: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("jkcip_token");
    const storedUser = localStorage.getItem("jkcip_user");
    if (stored && storedUser) {
      try {
        setToken(stored);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("jkcip_token");
        localStorage.removeItem("jkcip_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    // Handle all common NestJS token field names
    const access_token = (response as any).access_token || (response as any).accessToken || (response as any).token || (response as any).jwt;

    if (!access_token) throw new Error("No token received from server");
    localStorage.setItem("jkcip_token", access_token);
    setToken(access_token);

    // Fetch profile
    try {
      const profile = await authApi.me();
      localStorage.setItem("jkcip_user", JSON.stringify(profile));
      setUser(profile);
    } catch {
      // If /auth/me fails, try to use user from login response
      if (response.user) {
        localStorage.setItem("jkcip_user", JSON.stringify(response.user));
        setUser(response.user);
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("jkcip_token");
    localStorage.removeItem("jkcip_user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const isAdmin = hasRole("SUPER_ADMIN", "ADMIN");
  const canWrite = hasRole("SUPER_ADMIN", "ADMIN", "DEPARTMENT_OFFICER", "DATA_ENTRY");
  const canReview = hasRole("SUPER_ADMIN", "ADMIN", "DEPARTMENT_OFFICER");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        hasRole,
        isAdmin,
        canWrite,
        canReview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
