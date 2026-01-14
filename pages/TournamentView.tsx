
import React, { useState, useEffect } from 'react';
import { Tournament, Team, Match, Profile, TeamMember } from '../types';
import { supabase } from '../supabaseClient';

interface TournamentViewProps {
  tournamentId: string;
  profile: Profile | null;
  onNavigate: (page: string, params?: any) => void;
}

const TournamentView: React.FC<TournamentViewProps> = ({ tournamentId, profile, onNavigate }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'teams' | 'matches' | 'standings'>('info');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Member management state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTournamentData();

    // Real-time subscription for matches
    const matchChannel = supabase
      .channel(`matches-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, () => {
        fetchMatches();
      })
      .subscribe();

    // Real-time subscription for team members
    const memberChannel = supabase
      .channel(`members-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        fetchTeamMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    setLoading(true);
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    if (tData) setTournament(tData);
    
    await Promise.all([fetchTeams(), fetchMatches(), fetchTeamMembers()]);
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId);
    if (data) setTeams(data);
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .in('team_id', teams.map(t => t.id).length > 0 ? teams.map(t => t.id) : [tournamentId]); // Fallback check
    
    // Better query if teams are already loaded
    const { data: directData } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .filter('team_id', 'in', `(${teams.map(t => t.id).join(',')})`);

    const finalData = directData || data;

    if (finalData) {
      const grouped = (finalData as any[]).reduce((acc: any, curr) => {
        if (!acc[curr.team_id]) acc[curr.team_id] = [];
        acc[curr.team_id].push(curr);
        return acc;
      }, {});
      setTeamMembers(grouped);
    }
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

  const searchPlayers = async () => {
    if (memberSearchQuery.length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${memberSearchQuery}%,full_name.ilike.%${memberSearchQuery}%,user_numeric_id.eq.${parseInt(memberSearchQuery) || 0}`)
      .limit(5);
    
    if (data) setSearchResults(data);
    setSearching(false);
  };

  const handleAddMember = async (teamId: string, profileId: string) => {
    const { error } = await supabase.from('team_members').insert([{
      team_id: teamId,
      profile_id: profileId
    }]);

    if (error) {
      if (error.code === '23505') alert("Player is already in this team.");
      else alert(error.message);
    } else {
      setIsMemberModalOpen(null);
      setMemberSearchQuery('');
      setSearchResults([]);
      fetchTeamMembers();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this player from the team?")) return;
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) alert(error.message);
    else fetchTeamMembers();
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
    if (!window.confirm("Are you sure? Locking is irreversible and will prevent further roster changes.")) return;
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
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> 
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.length > 0 ? teams.map(t => (
                <div key={t.id} className="bg-white rounded-3xl border border-slate-100 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-800">{t.name}</p>
                    </div>
                    {isOrganizer && !tournament.is_locked && (
                      <button 
                        onClick={() => setIsMemberModalOpen(t.id)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Player
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 flex-grow min-h-[120px] space-y-2">
                    {teamMembers[t.id]?.length > 0 ? (
                      teamMembers[t.id].map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {m.profile?.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{m.profile?.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">#{m.profile?.user_numeric_id}</p>
                            </div>
                          </div>
                          {isOrganizer && !tournament.is_locked && (
                            <button 
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                        <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <p className="text-xs font-medium">No players yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                   <p className="font-medium italic">No teams registered in this tournament.</p>
                </div>
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

      {/* Member Selection Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">Add Player to Roster</h3>
              <button onClick={() => { setIsMemberModalOpen(null); setMemberSearchQuery(''); setSearchResults([]); }} className="text-slate-400">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Search by ID or Username</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. 5001 or john_doe"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && searchPlayers()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button 
                    onClick={searchPlayers}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-sm"
                  >
                    Find
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {searching ? (
                  <div className="py-8 text-center text-slate-400 text-sm italic">Searching database...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <button 
                      key={user.id}
                      onClick={() => handleAddMember(isMemberModalOpen, user.id)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm">
                          {user.full_name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 group-hover:text-blue-700">{user.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono tracking-tighter">@{user.username} • #{user.user_numeric_id}</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-blue-200 flex items-center justify-center text-blue-600 bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                        +
                      </div>
                    </button>
                  ))
                ) : memberSearchQuery ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No players found matching "{memberSearchQuery}"</div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-sm">Enter a name or numeric ID to start.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentView;
