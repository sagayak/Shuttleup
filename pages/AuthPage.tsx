
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
   * Supabase Auth requires an email format.
   * We use [username]@shuttle.com internally.
   * Standard domains like .com are less likely to be blocked by validators.
   */
  const getSyntheticIdentity = (username: string) => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean || clean.length < 3) return null;
    return `${clean}@shuttle.com`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const syntheticEmail = getSyntheticIdentity(formData.username);

    if (!syntheticEmail) {
      setErrorMsg("Username must be at least 3 letters or numbers.");
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
        
        // SignUp with synthetic identity
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
        
        // If signUp succeeded, it might not return a session if confirmation is on.
        // We attempt a manual sign-in immediately.
        if (data.session) {
          onAuthSuccess();
        } else {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: formData.password,
          });
          if (loginError) {
            // If even manual login fails after signup, something is wrong with the session.
            throw new Error("Profile created successfully! Please Log In now.");
          }
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      console.error("Auth System Error:", err);
      let msg = err.message || "Connection failed. Try again.";
      
      // MAPPING: Hide all "Email" terminology from the user.
      if (msg.toLowerCase().includes("email")) {
        if (msg.toLowerCase().includes("invalid")) {
          setErrorMsg("Username format is not allowed. Use letters and numbers only.");
        } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("taken")) {
          setErrorMsg("This username is already taken.");
        } else {
          setErrorMsg("There was a problem with your username. Please try a different one.");
        }
      } else if (msg.toLowerCase().includes("invalid login")) {
        setErrorMsg("Incorrect username or password.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Brand Side */}
      <div className="hidden md:flex md:w-5/12 bg-blue-600 p-12 flex-col justify-between text-white relative">
        <div className="absolute top-0 right-0 p-20 opacity-10">
          <svg className="w-80 h-80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bebas text-2xl rotate-12 shadow-lg">S</div>
          <span className="text-2xl font-bold tracking-tight">ShuttleUp</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-6xl font-bebas leading-tight tracking-wider uppercase">Your Court.<br/>No Compromise.</h1>
          <p className="mt-4 text-blue-100 text-sm max-w-xs font-medium opacity-80">
            The world's most robust badminton tournament engine. Powered by pure username authentication.
          </p>
        </div>
        <div className="flex gap-2 relative z-10">
          <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[8px] font-bold uppercase tracking-widest">v1.8 Stable</div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Profile'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {mode === 'login' ? 'Sign in with your unique username.' : 'Pick a username and start competing.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in-95">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {mode === 'signup' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
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
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setFormData({...formData, username: val});
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-mono text-sm"
                placeholder="smash_king_99"
              />
              <p className="mt-2 text-[9px] text-slate-400 ml-1 italic">Username must be letters and numbers only.</p>
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
                  <span>Verifying...</span>
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
                New player? <span className="text-blue-600 font-bold group-hover:underline">Join ShuttleUp</span>
              </button>
            ) : (
              <button 
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-medium group"
              >
                Already registered? <span className="text-blue-600 font-bold group-hover:underline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
