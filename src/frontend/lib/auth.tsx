"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, email: string, password: string, role: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "defendai_user";

const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "u1",
    name: "Commander Hayes",
    email: "hayes@defendai.mil",
    password: "demo1234",
    role: "Fleet Commander",
    avatar: "CH",
  },
  {
    id: "u2",
    name: "Tech Sgt. Rivera",
    email: "rivera@defendai.mil",
    password: "demo1234",
    role: "Maintenance Tech",
    avatar: "TR",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 700));
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { error: "Invalid email or password." };
    const { password: _, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    return {};
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role: string) => {
    await new Promise((r) => setTimeout(r, 700));
    if (!name.trim() || !email.includes("@") || password.length < 8) {
      return { error: "Please fill all fields. Password must be ≥ 8 characters." };
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "Operator",
      avatar: name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    return {};
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
