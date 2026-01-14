
import React, { useState, useEffect } from 'react';
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
  const [profileError, setProfileError] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [currentPage, setCurrentPage] = useState<{ name: string; params?: any }>({ name: 'dashboard' });

  const SUPER_PIN = "31218";

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsPinVerified(false);
        setLoading(false);
        setProfileError(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      setProfileError(false);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          console.warn('Profile record missing in database.');
          setProfileError(true);
        }
        throw error;
      }
      
      setProfile(data);
      if (data.role !== 'superadmin') {
        setIsPinVerified(true);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMissingProfile = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || 'New Player',
        username: session.user.user_metadata?.username || `user_${session.user.id.substring(0, 8)}`,
        email: session.user.email,
        role: 'player',
        credits: 0
      });

      if (error) throw error;
      window.location.reload(); // Refresh to fetch newly created profile
    } catch (err: any) {
      alert("Manual creation failed: " + err.message + "\n\nPlease ensure you have run the schema.txt SQL in your Supabase dashboard.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">Syncing with ShuttleUp Cloud...</p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!session) {
    return <AuthPage onAuthSuccess={() => navigateTo('dashboard')} />;
  }

  // Profile Missing Guard (Diagnostic Screen)
  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-red-100 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Missing</h2>
          <p className="text-slate-500 mb-6 text-sm">
            You are logged in via Auth, but your <strong>Profile record</strong> is missing. 
            This happens if you signed up before the database schema was applied.
          </p>
          
          <div className="space-y-3 mb-8">
            <button 
              onClick={createMissingProfile}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all"
            >
              Manual Sync (Fix it for me)
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            >
              Check Again
            </button>
          </div>

          <p className="text-slate-400 text-xs mb-4">Or manually run this SQL for User ID: <code className="bg-slate-100 p-1 rounded font-mono text-[10px] select-all">{session.user.id}</code></p>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-slate-400 text-xs hover:text-red-500 font-bold"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // SuperAdmin PIN Guard
  if (profile?.role === 'superadmin' && !isPinVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-10 shadow-2xl text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-12">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">SuperAdmin Access</h2>
          <p className="text-slate-500 mb-8 text-sm">This account requires a security PIN to proceed.</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              autoFocus
              type="password"
              placeholder="Enter 5-digit PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-all"
              maxLength={5}
            />
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all"
            >
              Verify PIN
            </button>
          </form>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="mt-6 text-slate-400 text-sm font-medium hover:text-slate-600"
          >
            Logout and switch account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar profile={profile} onNavigate={navigateTo} />
      
      <main className="flex-grow container mx-auto px-4 py-8 pb-24 md:pb-8">
        {currentPage.name === 'dashboard' && (
          <Dashboard profile={profile} onNavigate={navigateTo} />
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

      {/* Mobile Sticky Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50">
        <button onClick={() => navigateTo('dashboard')} className="flex flex-col items-center">
          <svg className={`w-6 h-6 ${currentPage.name === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className={`text-[10px] mt-1 font-bold ${currentPage.name === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>HOME</span>
        </button>
        <button className="flex flex-col items-center">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[10px] mt-1 font-bold text-slate-400">TOURNAMENTS</span>
        </button>
        <button className="flex flex-col items-center">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] mt-1 font-bold text-slate-400">PROFILE</span>
        </button>
      </div>
    </div>
  );
};

export default App;
