import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  dbReady: boolean;
  logout: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'tshehlap@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const TIMEOUT_SECONDS = Number(import.meta.env.VITE_SESSION_TIMEOUT_SECONDS) || 300;
  const GRACE_SECONDS = Number(import.meta.env.VITE_SESSION_GRACE_PERIOD_SECONDS) || 30;
  const INACTIVITY_LIMIT = TIMEOUT_SECONDS * 1000;
  const WARNING_PERIOD = GRACE_SECONDS * 1000;

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      // Only reset if modal isn't showing. 
      // If modal is showing, user MUST click the modal buttons.
      if (!showTimeoutModal) {
        setLastActivity(Date.now());
      }
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;

      if (inactiveTime >= INACTIVITY_LIMIT && !showTimeoutModal) {
        setShowTimeoutModal(true);
      }

      if (inactiveTime >= INACTIVITY_LIMIT + WARNING_PERIOD) {
        logout();
      }
    }, 1000);

    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [user, lastActivity, showTimeoutModal]);

  const resetInactivityTimer = () => {
    setLastActivity(Date.now());
    setShowTimeoutModal(false);
  };

  useEffect(() => {
    // Test connection and check for schema
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error && error.message.includes('relation "public.profiles" does not exist')) {
          setDbReady(false);
          console.error('CRITICAL: The "profiles" table is missing. Please run the SQL in supabase-schema.sql in your Supabase SQL Editor.');
          toast.error('Database setup incomplete. Please run the SQL schema in your Supabase dashboard.', {
            duration: Infinity,
            action: {
              label: 'How to fix',
              onClick: () => window.open('https://supabase.com/dashboard', '_blank')
            }
          });
        }
      } catch (err) {
        console.error('Supabase connection test failed:', err);
      }
    };

    testConnection();

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Profile not found
          // If we've retried a few times and it's still not there, create it manually
          if (retryCount >= 3) {
            console.log('Profile still missing after retries, creating manually...');
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: userData.user.email,
                  full_name: userData.user.user_metadata?.full_name || 'User',
                  role: userData.user.user_metadata?.role || 'TENANT'
                })
                .select()
                .single();
              
              if (createError) {
                console.error('Manual profile creation failed:', createError.message);
              } else if (newProfile) {
                console.log('Profile created manually successfully');
                setProfile({
                  uid: newProfile.id,
                  email: newProfile.email,
                  role: newProfile.role,
                  fullName: newProfile.full_name,
                  phone: newProfile.phone,
                  idNumber: newProfile.id_number,
                  createdAt: new Date(newProfile.created_at).getTime(),
                  updatedAt: new Date(newProfile.updated_at).getTime(),
                });
                return;
              }
            }
          } else {
            // Retry logic for trigger delay
            console.log(`Profile not found, retrying... (${retryCount + 1}/3)`);
            setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
            return;
          }
        }
        console.warn('Error fetching profile:', error.message);
        setProfile(null);
        return;
      }

      if (data) {
        const profileData = {
          uid: data.id,
          email: data.email,
          role: data.role,
          fullName: data.full_name,
          phone: data.phone,
          idNumber: data.id_number,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime(),
        } as UserProfile;

        setProfile(profileData);

        // Auto-promote bootstrap admin
        if (data.email?.toLowerCase() === ADMIN_EMAIL && data.role !== 'ADMIN') {
          await supabase
            .from('profiles')
            .update({ role: 'ADMIN' })
            .eq('id', userId);
        }
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, dbReady, logout, resetInactivityTimer }}>
      {children}
      {showTimeoutModal && (
        <SessionTimeoutModal 
          onStay={() => resetInactivityTimer()} 
          onLogout={() => logout()} 
          timeoutSeconds={TIMEOUT_SECONDS}
          graceSeconds={GRACE_SECONDS}
        />
      )}
    </AuthContext.Provider>
  );
}

function SessionTimeoutModal({ onStay, onLogout, timeoutSeconds, graceSeconds }: { onStay: () => void, onLogout: () => void, timeoutSeconds: number, graceSeconds: number }) {
  const [timeLeft, setTimeLeft] = useState(graceSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeoutSeconds / 60);
  const seconds = timeoutSeconds % 60;
  const timeStr = minutes > 0 
    ? `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} seconds` : ''}`
    : `${seconds} seconds`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card p-6 rounded-xl shadow-lg max-w-sm w-full mx-4 space-y-4 border animate-in fade-in zoom-in duration-200">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-2">
            <span className="text-xl font-bold">{timeLeft}</span>
          </div>
          <h3 className="text-xl font-bold">Session Timeout</h3>
          <p className="text-muted-foreground text-sm">
            You have been inactive for {timeStr}. You will be logged out in {timeLeft} seconds.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
          >
            Logout
          </button>
          <button
            onClick={onStay}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
