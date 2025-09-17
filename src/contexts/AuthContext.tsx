import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
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

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      // First check if we have the user in auth.users with email
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authUser && !authError) {
        const userObj = {
          id: authUser.id,
          username: authUser.email?.split('@')[0] || 'user',
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name
        };
        setUser(userObj);
        localStorage.setItem('auth_user', JSON.stringify(userObj));
        return userObj;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;
    
    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('Auth timeout - setting loading to false');
            setLoading(false);
          }
        }, 3000); // 3 second timeout
        
        // First check Supabase auth session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (currentSession && mounted) {
          console.log('Found active session:', currentSession.user.id);
          setSession(currentSession);
          await fetchUserProfile(currentSession.user.id);
        } else {
          console.log('No active session found');
        }
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log('Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Delay initial auth check to avoid race conditions
    const timer = setTimeout(() => {
      if (mounted) initializeAuth();
    }, 100);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Always update the session state
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          // Explicitly set user to null when no session
          setUser(null);
          localStorage.removeItem('auth_user');
        }
        
        // Always set loading to false after auth state change
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (username: string, password: string, metadata?: { full_name?: string }) => {
    try {
      // First try Supabase auth signup with email format
      const email = `${username}@interactive-link.app`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: metadata?.full_name
          }
        }
      });

      if (!authError && authData.user) {
        // Create entry in custom users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            username,
            full_name: metadata?.full_name || null,
            password_hash: 'supabase_auth' // Indicator that auth is handled by Supabase
          });

        if (!userError) {
          await fetchUserProfile(authData.user.id);
          toast.success('Account created successfully!');
          return { error: null };
        }
      }

      // Fallback to custom RPC if Supabase auth fails
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
      if (result?.success && result?.user) {
        setUser(result.user);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
        toast.success('Account created successfully!');
        return { error: null };
      }

      return { error: result?.error || 'Registration failed' };
    } catch (error) {
      toast.error(`Registration failed: ${error}`);
      return { error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // First try Supabase auth
      const email = `${username}@interactive-link.app`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!authError && authData.user) {
        await fetchUserProfile(authData.user.id);
        toast.success('Logged in successfully!');
        return { error: null };
      }

      // Fallback to custom RPC
      const { data, error } = await supabase.rpc('login_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        toast.error(`Login failed: ${error.message}`);
        return { error };
      }

      const result = data as any;
      if (result?.success && result?.user) {
        setUser(result.user);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
        toast.success('Logged in successfully!');
        return { error: null };
      }

      return { error: result?.error || 'Invalid username or password' };
    } catch (error) {
      toast.error(`Login failed: ${error}`);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase auth
      await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_user');
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};