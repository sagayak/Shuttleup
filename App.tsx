
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TournamentView from './pages/TournamentView';
import ScoringView from './pages/ScoringView';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [currentPage, setCurrentPage] = useState<{ name: string; params?: any }>({ name: 'dashboard' });

  const fetchInProgress = useRef(false);
  const SUPER_PIN = "31218";

  useEffect(() => {
    let timeout: any;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log("Auth Event:", _event);
      setSession(newSession);
      if (newSession) {
        // Start a timer for slow loading detection
        timeout = setTimeout(() => setSlowLoad(true), 5000);
        await fetchProfile(newSession.user.id);
        clearTimeout(timeout);
        setSlowLoad(false);
      } else {
        setProfile(null);
        setIsPinVerified(false);
        setProfileError(false);
        setLoading(false);
        setSlowLoad(false);
      }
    });

    const checkInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        timeout = setTimeout(() => setSlowLoad(true), 5000);
        await fetchProfile(initialSession.user.id);
        clearTimeout(timeout);
        setSlowLoad(false);
      } else {
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    try {
      setLoading(true);
      setProfileError(false);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("Profile fetch error:", error.message);
        if (error.code === 'PGRST116' || error.message.includes('not found')) { 
          setProfileError(true);
        }
        // If it's a genuine error and not just "not found", we still stop loading
        setLoading(false);
      } else {
        setProfile(data);
        setProfileError(false);
        if (data.role !== 'superadmin') {
          setIsPinVerified(true);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setLoading(false);
    } finally {
      fetchInProgress.current = false;
    }
  };

  const createMissingProfile = async () => {
    if (!session?.user) return;
    setLoading(true);
    setProfileError(false);
    try {
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || 'New Player',
        username: session.user.user_metadata?.username || `user_${session.user.id.substring(0, 8)}`,
        email: session.user.email,
        role: 'player',
        credits: 0
      });

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
      
      // Successfully created or already existed
      await fetchProfile(session.user.id);
    } catch (err: any) {
      alert("Profile initialization failed: " + err.message);
      setProfileError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === SUPER_PIN) {
      setIsPinVerified(true);
    } else {
      alert("Invalid Super PIN. Access Denied.");
      setPinInput('');
    }
  };

  const navigateTo = (pageName: string, params?: any) => {
    setCurrentPage({ name: pageName, params });
    window.scrollTo(0, 0);
  };

  // 1. Auth check
  if (!session && !loading) {
    return <AuthPage onAuthSuccess={() => navigateTo('dashboard')} />;
  }

  // 2. Profile Error state (Missing Record)
  if (profileError && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Complete Setup</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">We need to create a profile entry for your account to track your credits and tournaments.</p>
          <button onClick={createMissingProfile} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mb-4 shadow-lg shadow-blue-100 active:scale-95 transition-all">
            Initialize Profile
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 text-xs hover:text-red-500">Logout</button>
        </div>
      </div>
    );
  }

  // 3. Loading state (Syncing)
  if (loading || (!profile && session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-900 font-bold text-lg">Syncing shuttleUp...</p>
        <p className="text-slate-400 text-sm mt-1">Retrieving your stats & credits</p>
        
        {slowLoad && (
          <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs text-center animate-in fade-in slide-in-from-bottom-4">
            <p className="text-xs text-slate-500 mb-4">Taking longer than expected?</p>
            <button 
              onClick={createMissingProfile}
              className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Force Sync Profile
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-[10px] text-blue-600 font-bold underline"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. SuperAdmin check
  if (profile?.role === 'superadmin' && !isPinVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-10 shadow-2xl text-center">
          <h2 className="text-2xl font-bold mb-8">SuperAdmin PIN</h2>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              autoFocus
              type="password"
              placeholder="•••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none"
              maxLength={5}
            />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">Verify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar profile={profile} onNavigate={navigateTo} />
      <main className="flex-grow container mx-auto px-4 py-8 pb-24 md:pb-8">
        {currentPage.name === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            onNavigate={navigateTo} 
            onRefreshProfile={() => fetchProfile(session.user.id)} 
          />
        )}
        {currentPage.name === 'tournament' && (
          <TournamentView 
            tournamentId={currentPage.params.id} 
            profile={profile} 
            onNavigate={navigateTo} 
          />
        )}
        {currentPage.name === 'scoring' && (
          <ScoringView 
            matchId={currentPage.params.id} 
            onNavigate={navigateTo} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
