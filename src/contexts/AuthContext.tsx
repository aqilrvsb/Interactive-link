import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface CustomUser {
  id: string;
  username: string;
  full_name?: string;
}

interface AuthContextType {
  user: CustomUser | null;
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
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (username: string, password: string, metadata?: { full_name?: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('register_user', {
        p_username: username,
        p_password: password,
        p_full_name: metadata?.full_name
      });
      
      // Type assertion to handle Supabase's Json type
      const result = data as any;
      
      if (result?.error) {
        toast.error(result.error);
        return { error: new Error(result.error) };
      }
      
      if (result?.success && result?.user) {
        const customUser: CustomUser = {
          id: result.user.id,
          username: result.user.username,
          full_name: result.user.full_name
        };
        setUser(customUser);
        localStorage.setItem('auth_user', JSON.stringify(customUser));
        toast.success('Account created successfully!');
        return { error: null };
      }
      
      return { error: new Error('Unknown error during signup') };
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('login_user', {
        p_username: username,
        p_password: password
      });
      
      // Type assertion to handle Supabase's Json type
      const result = data as any;
      
      if (result?.error) {
        toast.error(result.error);
        return { error: new Error(result.error) };
      }
      
      if (result?.success && result?.user) {
        const customUser: CustomUser = {
          id: result.user.id,
          username: result.user.username,
          full_name: result.user.full_name
        };
        setUser(customUser);
        localStorage.setItem('auth_user', JSON.stringify(customUser));
        toast.success('Welcome back!');
        return { error: null };
      }
      
      return { error: new Error('Invalid username or password') };
    } catch (error: any) {
      toast.error(error.message || 'Login failed'); 
      return { error };
    } finally {
      setLoading(false);
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