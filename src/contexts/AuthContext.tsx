import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'member' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string, userEmail?: string) => {
    // Prevent duplicate fetches for the same user
    if (fetchingRef.current && lastUserIdRef.current === userId) return;
    fetchingRef.current = true;
    lastUserIdRef.current = userId;

    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      let profileData = profileResult.data;

      // If no profile found by user_id, try to find by email and link it
      if (!profileData && userEmail) {
        const { data: emailProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .is('user_id', null)
          .maybeSingle();

        if (emailProfile) {
          // Link the imported profile to this auth user
          const { data: updated } = await supabase
            .from('profiles')
            .update({ user_id: userId })
            .eq('id', emailProfile.id)
            .select('*')
            .single();
          profileData = updated || emailProfile;
        }
      }

      // If still no profile found, try matching by name from auth metadata
      if (!profileData) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userName = authUser?.user_metadata?.name;
        if (userName) {
          const { data: nameProfile } = await supabase
            .from('profiles')
            .select('*')
            .ilike('name', userName)
            .is('user_id', null)
            .maybeSingle();

          if (nameProfile) {
            const { data: updated } = await supabase
              .from('profiles')
              .update({ user_id: userId, email: userEmail || null })
              .eq('id', nameProfile.id)
              .select('*')
              .single();
            profileData = updated || nameProfile;
          }
        }
      }

      setRole(roleResult.data?.role as UserRole ?? 'member');
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRole('member');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialSessionHandled = false;

    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event, session?.user?.id);

        if (event === 'INITIAL_SESSION') {
          // This fires once on page load - use it as our source of truth
          initialSessionHandled = true;
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserData(session.user.id, session.user.email);
          } else {
            setLoading(false);
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserData(session.user.id, session.user.email);
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Just update the session, don't re-fetch user data
          setSession(session);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setProfile(null);
          lastUserIdRef.current = null;
          setLoading(false);
          return;
        }
      }
    );

    // Fallback: if INITIAL_SESSION doesn't fire within 2 seconds
    const timeout = setTimeout(() => {
      if (!initialSessionHandled && mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserData(session.user.id, session.user.email);
          } else {
            setLoading(false);
          }
        });
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signUp, signOut }}>
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
