
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
        if (error.code === 'PGRST116' || error.message.includes('not found')) { 
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
      fetchProfile(session.user.id);
    } catch (err: any) {
      alert("Manual creation failed: " + err.message);
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

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">Syncing ShuttleUp...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuthSuccess={() => navigateTo('dashboard')} />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Sync Required</h2>
          <button onClick={createMissingProfile} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mb-4">
            Initialize Profile
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 text-xs">Logout</button>
        </div>
      </div>
    );
  }

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
