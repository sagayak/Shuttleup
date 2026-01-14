
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '', 
    fullName: ''
  });

  /**
   * Supabase Auth requires an email-formatted string.
   * We generate a synthetic identity: u_[username]@identity.shuttleup.com
   * This is never shown to the user.
   */
  const getSyntheticIdentity = (username: string) => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean || clean.length < 3) return null;
    return `u_${clean}@identity.shuttleup.com`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const syntheticEmail = getSyntheticIdentity(formData.username);

    if (!syntheticEmail) {
      setErrorMsg("Username must be at least 3 letters/numbers.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: formData.password,
        });
        if (error) throw error;
        onAuthSuccess();
      } 
      else {
        if (!formData.fullName.trim()) throw new Error("Full Name is required.");
        
        const { data, error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              username: formData.username.trim().toLowerCase()
            }
          }
        });
        
        if (error) throw error;
        
        if (data.session) {
          onAuthSuccess();
        } else {
          // If auto-login didn't happen, try once more
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: formData.password,
          });
          if (loginError) throw new Error("Registration complete. Please sign in.");
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      console.error("Auth Failure:", err.message);
      if (err.message.toLowerCase().includes("invalid login")) {
        setErrorMsg("Incorrect username or password.");
      } else if (err.message.toLowerCase().includes("already registered")) {
        setErrorMsg("That username is taken.");
      } else if (err.message.toLowerCase().includes("validate email")) {
        setErrorMsg("Invalid characters in username. Use letters and numbers only.");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Brand Column */}
      <div className="hidden md:flex md:w-5/12 bg-blue-600 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bebas text-2xl rotate-12 shadow-lg">S</div>
          <span className="text-2xl font-bold tracking-tight">ShuttleUp</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bebas tracking-wider uppercase leading-none">Your Identity.<br/>The Court.</h1>
          <p className="text-blue-100 text-sm opacity-80 font-medium">Badminton management reimagined for the modern player.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-blue-500/30 rounded-full border border-blue-400/30 text-[8px] font-bold uppercase tracking-widest">Pure Username Auth</div>
        </div>
      </div>

      {/* Auth Column */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-4">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">Access your tournaments with your username.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold flex items-center gap-2 border border-red-100">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                  placeholder="e.g. Lin Dan"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
              <input 
                required
                type="text" 
                autoCapitalize="none"
                value={formData.username}
                onChange={e => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setFormData({...formData, username: val});
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-mono text-sm"
                placeholder="badminton_pro"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrorMsg(null); }}
              className="text-slate-500 text-xs font-medium hover:text-blue-600"
            >
              {mode === 'login' ? "Don't have a profile? Register" : "Already have a profile? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
