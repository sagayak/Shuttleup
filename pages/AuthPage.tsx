
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
   * Supabase Auth requires an email-formatted string for the 'email' field.
   * We convert the user's username into an internal email format.
   * We aggressively sanitize to ensure it passes all regex checks.
   */
  const getInternalEmail = (username: string) => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean || clean.length < 3) return null;
    return `${clean}@shuttleup.internal`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const internalEmail = getInternalEmail(formData.username);

    if (!internalEmail) {
      setErrorMsg("Username must be at least 3 alphanumeric characters.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password: formData.password,
        });
        if (error) throw error;
        onAuthSuccess();
      } 
      else {
        if (!formData.fullName.trim()) throw new Error("Please enter your full name.");
        
        // Sign up with internal email and store the real username in metadata
        const { data, error } = await supabase.auth.signUp({
          email: internalEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              username: formData.username.trim().toLowerCase()
            }
          }
        });
        
        if (error) throw error;
        
        // In most Supabase configs, signUp logs you in automatically if email confirm is off.
        // If it doesn't, we try to log in immediately.
        if (data.session) {
          onAuthSuccess();
        } else {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: internalEmail,
            password: formData.password,
          });
          if (loginError) throw new Error("Account created but auto-login failed. Try logging in.");
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.message.includes("Invalid login credentials")) {
        setErrorMsg("Incorrect username or password.");
      } else if (err.message.includes("User already registered")) {
        setErrorMsg("This username is already taken.");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Visual Branding Side */}
      <div className="hidden md:flex md:w-5/12 bg-blue-600 p-12 flex-col justify-between text-white relative">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <svg className="w-96 h-96" viewBox="0 0 200 200" fill="currentColor"><path d="M100 0L129.389 70.611L200 100L129.389 129.389L100 200L70.611 129.389L0 100L70.611 70.611L100 0Z" /></svg>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bebas text-2xl rotate-12 shadow-lg">S</div>
          <span className="text-2xl font-bold tracking-tight text-white">ShuttleUp</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bebas leading-tight tracking-wider uppercase">Your Court.<br/>Your Legacy.</h1>
          <p className="text-blue-100 text-sm max-w-xs opacity-80 font-medium">The most advanced badminton management platform for players and organizers.</p>
        </div>

        <div className="flex gap-2">
          <div className="px-3 py-1 bg-blue-500/30 rounded-full border border-blue-400/30 text-[8px] font-bold uppercase tracking-widest">v1.5 Stable</div>
          <div className="px-3 py-1 bg-blue-500/30 rounded-full border border-blue-400/30 text-[8px] font-bold uppercase tracking-widest">Live Scoring</div>
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white md:bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl md:shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Join ShuttleUp'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {mode === 'login' ? 'Login with your unique username.' : 'Create your player identity today.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in-95">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {mode === 'signup' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  placeholder="e.g. Viktor Axelsen"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                required
                type="text" 
                autoCapitalize="none"
                autoComplete="username"
                value={formData.username}
                onChange={e => {
                  // Only allow alphanumeric and underscores, no spaces
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setFormData({...formData, username: val});
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-mono text-sm"
                placeholder="smash_master_99"
              />
              <p className="mt-2 text-[9px] text-slate-400 ml-1">Must be lowercase, no spaces.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                required
                type="password" 
                autoComplete={mode === 'login' ? "current-password" : "new-password"}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Profile'
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            {mode === 'login' ? (
              <button 
                onClick={() => { setMode('signup'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-medium group"
              >
                Don't have an account? <span className="text-blue-600 font-bold group-hover:underline">Get started</span>
              </button>
            ) : (
              <button 
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-medium group"
              >
                Already registered? <span className="text-blue-600 font-bold group-hover:underline">Sign in here</span>
              </button>
            )}
          </div>
        </div>
        
        <p className="mt-10 text-slate-300 text-[9px] font-bold uppercase tracking-[0.2em] text-center">
          Secure Badminton Management Engine
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
