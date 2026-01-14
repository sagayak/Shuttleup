
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

  // Supabase Auth requires an email format. 
  // We map the username to an internal domain for compatibility.
  const getInternalEmail = (username: string) => {
    const cleanUsername = username.trim().toLowerCase();
    return `${cleanUsername}@shuttleup.app`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const internalEmail = getInternalEmail(formData.username);

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
        if (formData.username.length < 3) throw new Error("Username must be at least 3 characters.");
        
        const { data, error } = await supabase.auth.signUp({
          email: internalEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              username: formData.username.trim()
            }
          }
        });
        
        if (error) throw error;
        
        // If signup is successful, Supabase usually logs the user in immediately 
        // if email confirmation is disabled. If not, we still call success
        // because the App.tsx listener will handle the session state.
        if (data.session) {
          onAuthSuccess();
        } else {
          // If for some reason a session isn't created, try logging in immediately
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: internalEmail,
            password: formData.password,
          });
          if (loginError) throw new Error("Account created but auto-login failed. Please try logging in.");
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.message.includes("Invalid login credentials")) {
        setErrorMsg("Invalid username or password.");
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
      {/* Branding Side */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-16 flex-col justify-between text-white relative">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <svg className="w-96 h-96" viewBox="0 0 200 200" fill="currentColor"><path d="M100 0L129.389 70.611L200 100L129.389 129.389L100 200L70.611 129.389L0 100L70.611 70.611L100 0Z" /></svg>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bebas text-3xl rotate-12 shadow-lg">S</div>
          <span className="text-3xl font-bold tracking-tighter text-white">ShuttleUp</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-6xl font-bebas leading-[0.9] tracking-wider uppercase">Master<br/>The Court.</h1>
          <p className="text-blue-100 text-lg max-w-md">Professional tournament management and live scoring simplified for the next generation of players.</p>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-[10px] font-bold uppercase tracking-widest">Username Auth</div>
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-[10px] font-bold uppercase tracking-widest">Instant Sync</div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white md:bg-slate-50">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl md:shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-slate-500 text-sm">
              {mode === 'login' ? 'Enter your username to access your dashboard.' : 'Pick a unique username to join the community.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {mode === 'signup' && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Display Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
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
                onChange={e => setFormData({...formData, username: e.target.value.replace(/\s+/g, '')})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                placeholder="shuttle_master"
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
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                mode === 'login' ? 'Login' : 'Get Started'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            {mode === 'login' ? (
              <button 
                onClick={() => { setMode('signup'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-medium hover:text-blue-600 transition-colors"
              >
                New to ShuttleUp? <span className="text-blue-600 font-bold">Create an account</span>
              </button>
            ) : (
              <button 
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-slate-500 text-sm font-medium hover:text-blue-600 transition-colors"
              >
                Already have an account? <span className="text-blue-600 font-bold">Sign in here</span>
              </button>
            )}
          </div>
        </div>
        
        <p className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
          Secure Player Authentication • Version 1.2
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
