
import React, { useState, useEffect } from 'react';
import { Tournament, Team, Match, Profile } from '../types';
import { supabase } from '../supabaseClient';

interface TournamentViewProps {
  tournamentId: string;
  profile: Profile | null;
  onNavigate: (page: string, params?: any) => void;
}

const TournamentView: React.FC<TournamentViewProps> = ({ tournamentId, profile, onNavigate }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'teams' | 'matches' | 'standings'>('info');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchTournamentData();

    // Real-time subscription for matches
    const matchChannel = supabase
      .channel(`matches-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    setLoading(true);
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    if (tData) setTournament(tData);
    
    await Promise.all([fetchTeams(), fetchMatches()]);
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId);
    if (data) setTeams(data);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches')
      .select('*, team_a:team_a_id(*), team_b:team_b_id(*)')
      .eq('tournament_id', tournamentId)
      .order('match_order');
    if (data) setMatches(data);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from('teams').insert([{
      name: newTeamName,
      tournament_id: tournamentId
    }]);
    
    if (error) alert(error.message);
    else {
      setNewTeamName('');
      setIsAddingTeam(false);
      fetchTeams();
    }
  };

  const handleGenerateMatch = async () => {
    if (teams.length < 2) {
      alert("Need at least 2 teams to generate a match.");
      return;
    }
    
    const { error } = await supabase.from('matches').insert([{
      tournament_id: tournamentId,
      match_order: matches.length + 1,
      team_a_id: teams[0].id,
      team_b_id: teams[1].id,
      status: 'scheduled',
      max_points: 21
    }]);

    if (error) alert(error.message);
    else fetchMatches();
  };

  const handleLock = async () => {
    if (!window.confirm("Are you sure? Locking is irreversible and will prevent further team/member changes.")) return;
    const { error } = await supabase.from('tournaments').update({ is_locked: true }).eq('id', tournamentId);
    if (error) alert(error.message);
    else fetchTournamentData();
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!tournament) return <div>Tournament not found.</div>;

  const isOrganizer = profile?.id === tournament.organizer_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center font-bebas text-4xl text-blue-600">
            {tournament.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">{tournament.name}</h1>
              {tournament.is_locked && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> 
                  Locked
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium">#{tournament.tournament_numeric_id} • {tournament.format} • {tournament.location}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {isOrganizer && !tournament.is_locked && (
            <button 
              onClick={handleLock}
              className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors"
            >
              Lock Tournament
            </button>
          )}
          <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
            Share Link
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-8">
        {['info', 'teams', 'matches', 'standings'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Match Schedule</h3>
              {isOrganizer && (
                <button 
                  onClick={handleGenerateMatch}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  + Create Sample Match
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.length > 0 ? matches.map((m: any) => (
                <div key={m.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Match #{m.match_order}</span>
                      {m.status === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                      {m.status === 'scheduled' && <span className="text-[10px] text-slate-400 font-bold uppercase">Scheduled</span>}
                    </div>
                    <div className="flex items-center justify-between pr-8">
                      <div className="text-center w-1/2">
                        <p className="font-bold text-slate-800 truncate">{m.team_a?.name || 'Team A'}</p>
                        <p className="text-4xl font-bebas text-blue-600">{m.score_a}</p>
                      </div>
                      <div className="text-slate-200 font-bebas text-2xl px-4">VS</div>
                      <div className="text-center w-1/2">
                        <p className="font-bold text-slate-800 truncate">{m.team_b?.name || 'Team B'}</p>
                        <p className="text-4xl font-bebas text-red-600">{m.score_b}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <button 
                      onClick={() => onNavigate('scoring', { id: m.id })}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Open Scorer"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                   <p className="font-medium">No matches yet. Click "+ Create Sample Match" to begin.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Participating Teams ({teams.length})</h3>
              {isOrganizer && !tournament.is_locked && (
                <div className="flex gap-2">
                  {isAddingTeam ? (
                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                      <input 
                        type="text" 
                        autoFocus
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                        placeholder="Team Name"
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button onClick={handleAddTeam} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
                      <button onClick={() => setIsAddingTeam(false)} className="text-slate-400 p-2">✕</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingTeam(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
                    >
                      + Add Team
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {teams.length > 0 ? teams.map(t => (
                <div key={t.id} className="aspect-square bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center p-4 text-center shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-slate-50 rounded-full mb-3 flex items-center justify-center text-slate-300 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {t.name.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-800 text-sm truncate w-full">{t.name}</p>
                </div>
              )) : (
                <div className="col-span-full py-10 text-center text-slate-400 italic">No teams registered yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xl font-bold">Details</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Organizer</label>
                  <p className="font-bold text-slate-800">Tournament ID #{tournament.tournament_numeric_id}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Schedule</label>
                  <p className="font-bold text-slate-800">{new Date(tournament.start_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Venue</label>
                  <p className="font-bold text-slate-800">{tournament.location || 'Not Specified'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Rules</label>
                  <button className="text-blue-600 font-bold flex items-center gap-1">View Rulebook <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></button>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
               <h3 className="text-xl font-bebas tracking-wide mb-4">TOURNAMENT MAP</h3>
               <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                  <p className="text-slate-500 text-xs">Google Maps Integration</p>
               </div>
               <p className="text-sm opacity-60 leading-relaxed mb-6 font-medium">Tournament location is verified at {tournament.location}.</p>
               <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors">Navigate to Venue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentView;
