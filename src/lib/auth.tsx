import * as React from "react";
import { getUsers, getUserRoles, getUserShopAssignments, getPermissions } from "./database";
import type { User, RoleType, PermissionKey } from "@/types";

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasRole: (role: RoleType) => boolean;
  getUserRole: () => RoleType | null;
  hasPermission: (permission: PermissionKey, shopId?: string) => boolean;
  getUserShopIds: () => string[];
  isShopAccessible: (shopId: string) => boolean;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

const AUTH_KEY = "erp_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const userId = JSON.parse(stored);
        return getUsers().find(u => u._id === userId) || null;
      } catch { return null; }
    }
    return null;
  });

  const login = (email: string, password: string): boolean => {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password && u.isActive);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(user._id));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const getUserRole = (): RoleType | null => {
    if (!currentUser) return null;
    const roles = getUserRoles();
    const userRole = roles.find(r => r.userId === currentUser._id);
    return userRole?.role || null;
  };

  const hasRole = (role: RoleType): boolean => {
    return getUserRole() === role;
  };

  const hasPermission = (permission: PermissionKey, shopId?: string): boolean => {
    if (!currentUser) return false;
    const role = getUserRole();
    if (role === 'super_admin') return true;
    if (role === 'manager') {
      // Managers can view everything by default
      if (permission.startsWith('view_')) return true;
      // For other permissions, check explicit grants
    }
    const perms = getPermissions();
    return perms.some(p => {
      if (p.userId !== currentUser._id) return false;
      if (p.permission !== permission) return false;
      if (shopId && p.shopId && p.shopId !== shopId) return false;
      if (shopId && !p.shopId) return true; // global permission
      if (!shopId && p.shopId) return true; // has at least one scoped permission
      return true;
    });
  };

  const getUserShopIds = (): string[] => {
    if (!currentUser) return [];
    const role = getUserRole();
    if (role === 'super_admin' || role === 'manager') return []; // empty means all
    const assignments = getUserShopAssignments();
    return assignments.filter(a => a.userId === currentUser._id).map(a => a.shopId);
  };

  const isShopAccessible = (shopId: string): boolean => {
    if (!currentUser) return false;
    const role = getUserRole();
    if (role === 'super_admin' || role === 'manager') return true;
    const shopIds = getUserShopIds();
    return shopIds.includes(shopId);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, hasRole, getUserRole, hasPermission, getUserShopIds, isShopAccessible }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
