
import React, { useState, useEffect } from 'react';
import { Profile, Tournament } from '../types';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  profile: Profile | null;
  onNavigate: (page: string, params?: any) => void;
  onRefreshProfile: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, onNavigate, onRefreshProfile }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(200);
  
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
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTournaments(data);
    setLoading(false);
  };

  const finalizeCreditAddition = async (amount: number) => {
    if (!profile) {
      alert("Error: No profile loaded.");
      return;
    }

    setLoading(true);
    const mockPaymentId = `DEV_INSTANT_${Date.now()}`;
    
    console.log(`💎 Instantly adding ${amount} credits for user ${profile.id}`);

    try {
      const { data, error } = await supabase.rpc('add_credits_after_payment', {
        user_uuid: profile.id,
        topup_amount: Math.floor(amount),
        payment_id: mockPaymentId
      });

      if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
      }
      
      console.log("✅ Credits added successfully.");
      onRefreshProfile(); // Immediate UI update
      setIsTopUpOpen(false);
    } catch (err: any) {
      alert(`Failed to add credits: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (profile.credits < 200) {
      alert('Insufficient credits! You need 200 credits to host a tournament.');
      setIsTopUpOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { data: creditSuccess, error: creditError } = await supabase.rpc('deduct_credits_for_tournament', {
        user_uuid: profile.id,
        cost: 200
      });

      if (creditError) throw creditError;

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
      
      onRefreshProfile();
      setIsCreating(false);
      onNavigate('tournament', { id: data.id });
    } catch (err: any) {
      alert("Error creating tournament: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero / Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200/50">
          <h2 className="text-3xl font-bebas tracking-wide mb-1 uppercase tracking-widest">WELCOME BACK,</h2>
          <p className="text-xl font-bold opacity-90">{profile?.full_name}</p>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">User ID</p>
              <p className="text-2xl font-mono">#{profile?.user_numeric_id || '----'}</p>
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
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Live Now</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-5xl font-bebas text-red-500">03</span>
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          </div>
          <p className="mt-4 text-slate-500 text-sm">Tournaments active right now.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded uppercase tracking-tighter">Instant Mode</div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Your Balance</p>
          <p className="mt-4 text-5xl font-bebas text-slate-900">₹{profile?.credits || 0}</p>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => finalizeCreditAddition(200)}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 rounded-xl text-xs font-bold text-white hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-100 disabled:opacity-50"
            >
              + Add 200 Instantly
            </button>
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              More
            </button>
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="lg:col-span-3 space-y-6">
        <h3 className="text-2xl font-bold text-slate-900">Active Tournaments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && tournaments.length === 0 ? (
            <div className="col-span-full py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tournaments.length > 0 ? (
            tournaments.map((t) => (
              <div 
                key={t.id} 
                onClick={() => onNavigate('tournament', { id: t.id })}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {t.format}
                  </span>
                  <span className="text-slate-400 font-mono text-xs font-bold">#{t.tournament_numeric_id}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{t.name}</h4>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t.location || 'Location TBA'}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <p className="font-bold">No active tournaments</p>
            </div>
          )}
        </div>
      </section>

      {/* Host Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Host New Tournament</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateTournament} className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3 mb-4 border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">₹</div>
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Hosting Fee</p>
                  <p className="text-sm font-bold">200 Credits required</p>
                </div>
              </div>
              <input required type="text" value={newTournament.name} onChange={e => setNewTournament({...newTournament, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3" placeholder="Tournament Name" />
              <div className="grid grid-cols-2 gap-4">
                <select value={newTournament.format} onChange={e => setNewTournament({...newTournament, format: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <option value="knockout">Knockout</option>
                  <option value="league">League</option>
                </select>
                <input required type="datetime-local" onChange={e => setNewTournament({...newTournament, start_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3" />
              </div>
              <button disabled={loading} type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl">
                {loading ? 'Processing...' : 'Confirm & Host (200 Credits)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Test Credits</h3>
              <p className="text-slate-500 mb-8 text-sm">Add credits instantly for testing.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[200, 500, 1000, 2000].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-4 rounded-2xl border-2 font-bold transition-all ${topUpAmount === amt ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-600'}`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => finalizeCreditAddition(topUpAmount)}
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
              >
                {loading ? 'Adding...' : `Add ₹${topUpAmount} Instantly`}
              </button>
              <button onClick={() => setIsTopUpOpen(false)} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
