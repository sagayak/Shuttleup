
import React, { useState, useEffect, useCallback } from 'react';
import { Match, Team } from '../types';
import { supabase } from '../supabaseClient';

interface ScoringViewProps {
  matchId: string;
  onNavigate: (page: string, params?: any) => void;
}

const ScoringView: React.FC<ScoringViewProps> = ({ matchId, onNavigate }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchMatchDetails();

    // Setup Realtime Subscription
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
        setMatch(payload.new as Match);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const fetchMatchDetails = async () => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, team_a:team_a_id(*), team_b:team_b_id(*)')
      .eq('id', matchId)
      .single();

    if (matchData) {
      setMatch(matchData);
      setTeamA(matchData.team_a);
      setTeamB(matchData.team_b);
    }
    setLoading(false);
  };

  const updateScore = async (side: 'a' | 'b', delta: number) => {
    if (!match) return;

    // Haptic Feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    const newScoreA = side === 'a' ? Math.max(0, match.score_a + delta) : match.score_a;
    const newScoreB = side === 'b' ? Math.max(0, match.score_b + delta) : match.score_b;

    // Push to history for undo
    setHistory([...history, { a: match.score_a, b: match.score_b }]);

    const { error } = await supabase
      .from('matches')
      .update({ score_a: newScoreA, score_b: newScoreB, status: 'live' })
      .eq('id', matchId);

    if (error) console.error('Score update failed', error);
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(history.slice(0, -1));

    await supabase
      .from('matches')
      .update({ score_a: lastState.a, score_b: lastState.b })
      .eq('id', matchId);
  };

  if (loading || !match) return <div>Loading scorer...</div>;

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 flex items-center justify-between text-white border-b border-slate-800">
        <button onClick={() => onNavigate('tournament', { id: match.tournament_id })} className="flex items-center gap-2">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           <span className="font-bold">Match #{match.match_order}</span>
        </button>
        <div className="px-3 py-1 bg-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">Live</div>
        <button onClick={handleUndo} className="p-2 bg-slate-800 rounded-lg active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>
      </div>

      {/* Main Scoreboard */}
      <div className="flex-grow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Team A */}
        <div 
          onClick={() => updateScore('a', 1)}
          className="flex-1 flex flex-col items-center justify-center p-8 active:bg-blue-600/10 transition-colors cursor-pointer"
        >
          <h2 className="text-xl text-slate-400 font-bold mb-4 uppercase tracking-widest">{teamA?.name || 'Team A'}</h2>
          <div className="text-[12rem] font-bebas text-white leading-none">{match.score_a}</div>
          <div className="mt-8 flex gap-4">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <div className="w-4 h-4 rounded-full bg-slate-800"></div>
          </div>
        </div>

        {/* Team B */}
        <div 
          onClick={() => updateScore('b', 1)}
          className="flex-1 flex flex-col items-center justify-center p-8 active:bg-red-600/10 transition-colors cursor-pointer"
        >
          <h2 className="text-xl text-slate-400 font-bold mb-4 uppercase tracking-widest">{teamB?.name || 'Team B'}</h2>
          <div className="text-[12rem] font-bebas text-white leading-none">{match.score_b}</div>
          <div className="mt-8 flex gap-4">
            <div className="w-4 h-4 rounded-full bg-slate-800"></div>
            <div className="w-4 h-4 rounded-full bg-slate-800"></div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 bg-slate-950 flex items-center justify-around border-t border-slate-800">
        <button onClick={(e) => { e.stopPropagation(); updateScore('a', -1); }} className="px-8 py-4 bg-slate-800 rounded-2xl text-white font-bold">-1 PT (A)</button>
        <div className="text-slate-500 text-sm font-bold uppercase tracking-widest">Set {match.current_set} • Max {match.max_points}</div>
        <button onClick={(e) => { e.stopPropagation(); updateScore('b', -1); }} className="px-8 py-4 bg-slate-800 rounded-2xl text-white font-bold">-1 PT (B)</button>
      </div>

      <div className="p-6 bg-slate-900 pb-12">
        <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-900/40">Finish Match</button>
      </div>
    </div>
  );
};

export default ScoringView;
