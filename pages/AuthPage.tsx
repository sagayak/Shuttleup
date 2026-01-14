
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
   * We generate a synthetic identity: [username]@shuttleup.com
   * This is never shown to the user in the UI.
   */
  const getSyntheticIdentity = (username: string) => {
    // Strictly alphanumeric for the local part to ensure max compatibility
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean || clean.length < 3) return null;
    return `${clean}@shuttleup.com`;
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
          // Attempt manual login if session wasn't returned immediately
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: formData.password,
          });
          if (loginError) throw new Error("Account created! Please try to log in now.");
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      console.error("Auth Failure Trace:", err);
      let rawMessage = err.message || "An unexpected error occurred.";
      
      // INTERCEPTOR: If the server says "email", we translate it to "username" for the user.
      if (rawMessage.toLowerCase().includes("email")) {
        if (rawMessage.toLowerCase().includes("invalid")) {
          setErrorMsg("Username format is invalid. Use letters and numbers only.");
        } else if (rawMessage.toLowerCase().includes("already registered")) {
          setErrorMsg("This username is already taken. Try another.");
        } else {
          setErrorMsg("There was a problem with your identifier. Please try a different username.");
        }
      } else if (rawMessage.toLowerCase().includes("invalid login")) {
        setErrorMsg("Incorrect username or password.");
      } else {
        setErrorMsg(rawMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Dynamic Brand Sidebar */}
      <div className="hidden md:flex md:w-[45%] bg-blue-600 p-16 flex-col justify-between text-white relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 border-[40px] border-white rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white rounded-full"></div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-bebas text-3xl rotate-6 shadow-2xl">S</div>
          <span className="text-3xl font-bold tracking-tight">ShuttleUp</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-bebas tracking-widest uppercase leading-[0.9] mb-6">Master<br/>The Court.</h1>
          <p className="text-blue-100 text-lg opacity-90 max-w-sm font-medium leading-relaxed">
            Connect, compete, and climb the ranks with the world's most intuitive badminton engine.
          </p>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex -space-x-3">
            {[1,2,3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-400 flex items-center justify-center text-[10px] font-bold">P{i}</div>
            ))}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-60">Joined 2.4k+ Players</span>
        </div>
      </div>

      {/* Auth Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 md:bg-white">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
              {mode === 'login' ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-slate-500 font-medium">
              {mode === 'login' ? 'Sign in to access your tournament dashboard.' : 'Create your unique player identity today.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-8 p-5 bg-red-50 text-red-700 rounded-[2rem] text-xs font-bold flex items-center gap-4 border border-red-100 animate-in fade-in zoom-in-95">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </div>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {mode === 'signup' && (
              <div className="animate-in slide-in-from-top-4 duration-300">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-transparent rounded-3xl px-6 py-5 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-semibold text-slate-800 shadow-sm"
                  placeholder="e.g. Viktor Axelsen"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                required
                type="text" 
                autoCapitalize="none"
                value={formData.username}
                onChange={e => {
                  // Instant cleaning to prevent any illegal characters
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setFormData({...formData, username: val});
                }}
                className="w-full bg-slate-50 border-2 border-transparent rounded-3xl px-6 py-5 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-mono text-sm shadow-sm"
                placeholder="smash_pro_23"
              />
              <p className="mt-2 text-[10px] text-slate-400 ml-1">Only letters and numbers allowed.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border-2 border-transparent rounded-3xl px-6 py-5 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-lg shadow-2xl hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Profile'
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            {mode === 'login' ? (
              <button 
                onClick={() => { setMode('signup'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-semibold group"
              >
                Don't have an account? <span className="text-blue-600 font-bold group-hover:underline decoration-2">Register Now</span>
              </button>
            ) : (
              <button 
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-semibold group"
              >
                Already have a profile? <span className="text-blue-600 font-bold group-hover:underline decoration-2">Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
