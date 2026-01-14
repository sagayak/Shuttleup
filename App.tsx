
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TournamentView from './pages/TournamentView';
import ScoringView from './pages/ScoringView';
import Navbar from './components/Navbar';

type AppState = 'initializing' | 'unauthenticated' | 'loading_profile' | 'no_profile' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('initializing');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [currentPage, setCurrentPage] = useState<{ name: string; params?: any }>({ name: 'dashboard' });

  const fetchInProgress = useRef(false);
  const SUPER_PIN = "31218";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        setSession(null);
        setProfile(null);
        setAppState('unauthenticated');
      } else {
        setSession(newSession);
        fetchProfile(newSession.user.id);
      }
    });

    const checkInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        setSession(initialSession);
        fetchProfile(initialSession.user.id);
      } else {
        setAppState('unauthenticated');
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    setAppState('loading_profile');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) { 
          setAppState('no_profile');
        } else {
          setAppState('no_profile');
        }
      } else if (data) {
        setProfile(data);
        setIsPinVerified(data.role !== 'superadmin');
        setAppState('ready');
      }
    } catch (err) {
      setAppState('no_profile');
    } finally {
      fetchInProgress.current = false;
    }
  };

  const initializeProfile = async () => {
    if (!session?.user) return;
    setAppState('loading_profile');
    
    try {
      // CRITICAL: We MUST include the 'email' field here.
      // The profiles table has a NOT NULL constraint on email.
      // Even though we use a synthetic username@shuttle.com identity, 
      // the database still requires it to be stored.
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || 'Player',
        username: session.user.user_metadata?.username || `u_${session.user.id.substring(0, 8)}`,
        email: session.user.email, // Passing synthetic identity to DB
        role: 'player',
        credits: 0
      });

      if (error) throw error;
      await fetchProfile(session.user.id);
    } catch (err: any) {
      alert("Profile Sync Failed: " + err.message);
      setAppState('no_profile');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === SUPER_PIN) {
      setIsPinVerified(true);
    } else {
      alert("Invalid Super PIN.");
      setPinInput('');
    }
  };

  const navigateTo = (pageName: string, params?: any) => {
    setCurrentPage({ name: pageName, params });
    window.scrollTo(0, 0);
  };

  if (appState === 'initializing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-400 font-medium">Booting ShuttleUp...</p>
      </div>
    );
  }

  if (appState === 'unauthenticated') {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  if (appState === 'loading_profile') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-6"></div>
        <h2 className="text-xl font-bold text-slate-900">Identifying Player...</h2>
      </div>
    );
  }

  if (appState === 'no_profile') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Finalizing Profile</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">We're setting up your court credentials. This will only take a second.</p>
          <button 
            onClick={initializeProfile} 
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (profile?.role === 'superadmin' && !isPinVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-10 shadow-2xl text-center">
          <h2 className="text-2xl font-bold mb-8 text-slate-900">Admin Security</h2>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              autoFocus
              type="password"
              placeholder="•••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500"
              maxLength={5}
            />
            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/10">Unlock System</button>
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
