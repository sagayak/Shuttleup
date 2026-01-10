
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    username: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: formData.fullName,
              username: formData.username
            }
          }
        });
        
        if (signUpError) throw signUpError;

        // Fallback: If for some reason the database trigger didn't fire (rare), 
        // we could try to create the profile manually if the session exists, 
        // but typically we wait for verification.
        
        setIsVerificationSent(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isVerificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Check your email</h2>
          <p className="text-slate-500 mb-8">We've sent a verification link to <span className="font-bold text-slate-900">{formData.email}</span>. Please click the link to activate your account.</p>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-700 mb-8">
            <p className="font-bold mb-1">SuperAdmin Setup Note:</p>
            If you are setting up the SuperAdmin account, after signing up, please run the SQL provided in the instructions to confirm your email and promote your account.
          </div>
          <button 
            onClick={() => setIsVerificationSent(false)}
            className="text-blue-600 font-bold hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Branding Side */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-16 flex-col justify-between text-white relative">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <svg className="w-96 h-96" viewBox="0 0 200 200" fill="currentColor"><path d="M100 0L129.389 70.611L200 100L129.389 129.389L100 200L70.611 129.389L0 100L70.611 70.611L100 0Z" /></svg>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bebas text-3xl rotate-12">S</div>
          <span className="text-3xl font-bold tracking-tighter">ShuttleUp</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-6xl font-bebas leading-[0.9] tracking-wider uppercase">Your Game,<br/>Better Organized.</h1>
          <p className="text-blue-100 text-lg max-w-md">Professional tournament management, live scoring, and real-time standings for badminton enthusiasts.</p>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-xs font-bold uppercase tracking-widest">Live Updates</div>
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-xs font-bold uppercase tracking-widest">Credit System</div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white md:bg-slate-50">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl md:shadow-xl border border-slate-100 animate-in slide-in-from-bottom-12 duration-700">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-slate-500 mb-8">{isLogin ? 'Enter your details to manage your tournaments.' : 'Join the elite community of badminton players.'}</p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-in fade-in zoom-in duration-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                    <input 
                      required
                      type="text" 
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Get Started')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
              className="text-slate-600 font-bold hover:text-blue-600 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
