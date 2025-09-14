import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        // If we have a session, fetch user profile from our custom users table
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data: userData, error } = await supabase
                .from('users')
                .select('id, username, full_name')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (userData && !error) {
                setUser(userData);
                localStorage.setItem('auth_user', JSON.stringify(userData));
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
            }
          }, 0);
        } else {
          setUser(null);
          localStorage.removeItem('auth_user');
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        // User profile will be fetched by the auth state listener
      } else {
        // Check for stored user session as fallback for custom auth
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            localStorage.removeItem('auth_user');
          }
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};