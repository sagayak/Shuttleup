
import React, { useState, useEffect } from 'react';
import { Profile, Tournament } from '../types';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  profile: Profile | null;
  onNavigate: (page: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, onNavigate }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    format: 'knockout',
    start_date: '',
    location: '',
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTournaments(data);
    setLoading(false);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (profile.credits < 200) {
      alert('Insufficient credits! You need 200 credits to host a tournament.');
      return;
    }

    setLoading(true);
    try {
      // 1. Deduct credits via RPC
      const { data: creditSuccess, error: creditError } = await supabase.rpc('deduct_credits_for_tournament', {
        user_uuid: profile.id,
        cost: 200
      });

      if (creditError || !creditSuccess) throw new Error(creditError?.message || 'Failed to deduct credits');

      // 2. Insert Tournament
      const { data, error } = await supabase
        .from('tournaments')
        .insert([{
          name: newTournament.name,
          format: newTournament.format,
          organizer_id: profile.id,
          location: newTournament.location,
          start_date: new Date(newTournament.start_date).toISOString(),
          end_date: new Date(new Date(newTournament.start_date).getTime() + 86400000).toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      
      setIsCreating(false);
      fetchTournaments();
      onNavigate('tournament', { id: data.id });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero / Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200/50">
          <h2 className="text-3xl font-bebas tracking-wide mb-1">WELCOME BACK,</h2>
          <p className="text-xl font-bold opacity-90">{profile?.full_name}</p>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-70">User ID</p>
              <p className="text-2xl font-mono">#{profile?.user_numeric_id}</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 active:scale-95 transition-all"
            >
              Host New
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Live Matches</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-5xl font-bebas text-red-500">03</span>
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          </div>
          <p className="mt-4 text-slate-500 text-sm">Tournaments happening now across the platform.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Your Balance</p>
          <p className="mt-4 text-5xl font-bebas text-slate-900">₹{profile?.credits}</p>
          <button className="mt-4 w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Top Up Credits
          </button>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Tournament List */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">Active Tournaments</h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-200 rounded-lg"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg></button>
              <button className="p-2 bg-white border border-slate-200 rounded-lg"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <p>Loading tournaments...</p>
            ) : tournaments.length > 0 ? (
              tournaments.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => onNavigate('tournament', { id: t.id })}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {t.format}
                    </span>
                    <span className="text-slate-400 font-mono text-xs">#{t.tournament_numeric_id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{t.name}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {t.location}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(t.start_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">T{i}</div>)}
                      <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] text-slate-400 font-bold">+12</div>
                    </div>
                    {t.is_locked && <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> Locked</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <p>No tournaments found. Create your first one!</p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Quick Links / Standings */}
        <section className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h4 className="text-lg font-bold mb-4">Upcoming Duties</h4>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-blue-600 font-bold uppercase mb-1">Umpiring Duty</p>
                <p className="text-sm font-bold">Team Alpha vs Team Beta</p>
                <p className="text-xs text-slate-400 mt-1">Court 1 • 02:30 PM</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-amber-600 font-bold uppercase mb-1">Your Match</p>
                <p className="text-sm font-bold">Shuttle Squad vs You</p>
                <p className="text-xs text-slate-400 mt-1">Court 3 • 04:00 PM</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Host New Tournament</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTournament} className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Hosting Fee</p>
                  <p className="text-sm font-bold">200 Credits will be deducted</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tournament Name</label>
                <input 
                  required
                  type="text" 
                  value={newTournament.name}
                  onChange={e => setNewTournament({...newTournament, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="e.g. Summer Smash 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Format</label>
                  <select 
                    value={newTournament.format}
                    onChange={e => setNewTournament({...newTournament, format: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  >
                    <option value="knockout">Knockout</option>
                    <option value="league">League</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                  <input 
                    required
                    type="datetime-local" 
                    onChange={e => setNewTournament({...newTournament, start_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Location</label>
                <input 
                  required
                  type="text" 
                  value={newTournament.location}
                  onChange={e => setNewTournament({...newTournament, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none" 
                  placeholder="Stadium or City"
                />
              </div>

              <button 
                disabled={loading}
                type="submit" 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Tournament'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
