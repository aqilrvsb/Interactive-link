import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (username: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (username: string, password: string, metadata?: { full_name?: string }) => {
    try {
      const { data, error } = await supabase.rpc('register_user', {
        p_username: username,
        p_password: password,
        p_full_name: metadata?.full_name || null
      });

      if (error) {
        toast.error(`Registration failed: ${error.message}`);
        return { error };
      }

      const result = data as any;
      if (result?.error) {
        toast.error(result.error);
        return { error: result.error };
      }

      if (result?.success) {
        const newUser = result.user;
        setUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        toast.success('Account created successfully!');
        return { error: null };
      }

      toast.error('Registration failed - unexpected response');
      return { error: 'Unknown error occurred' };
    } catch (error) {
      toast.error(`Registration failed: ${error}`);
      return { error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('login_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        toast.error(`Login failed: ${error.message}`);
        return { error };
      }

      const result = data as any;
      if (result?.error) {
        toast.error(result.error);
        return { error: result.error };
      }

      if (result?.success) {
        const loggedInUser = result.user;
        setUser(loggedInUser);
        localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
        toast.success('Welcome back!');
        return { error: null };
      }

      toast.error('Login failed - unexpected response');
      return { error: 'Unknown error occurred' };
    } catch (error) {
      toast.error(`Login failed: ${error}`);
      return { error };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    toast.success('Signed out successfully');
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};