import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Role = 'CITIZEN' | 'REGISTRAR' | null;

interface User {
  phone: string;
  role: Role;
  name: string;
  aadhar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, role: Role, name: string, aadhar?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (phone: string, role: Role, name: string, aadhar?: string) => {
    setIsLoading(true);
    // Simulate network delay for OTP Demo login
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser({ phone, role, name, aadhar });
        setIsLoading(false);
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
