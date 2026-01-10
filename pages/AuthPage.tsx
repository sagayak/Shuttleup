
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [siteUrl, setSiteUrl] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '', 
    fullName: '',
    username: ''
  });

  useEffect(() => {
    setSiteUrl(window.location.origin);
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        // signInWithOtp triggers the "Magic Link" email template
        const { error } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            shouldCreateUser: false,
            // Removing emailRedirectTo for pure OTP flow
          }
        });
        if (error) throw error;
        setShowOtpInput(true);
        setCooldown(60);
      } else {
        // signUp triggers the "Confirm Signup" email template
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password || 'TempPass123!', 
          options: {
            data: {
              full_name: formData.fullName,
              username: formData.username
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            setErrorMsg("This email is already registered. Please Sign In instead.");
            setLoading(false);
            return;
          }
          throw error;
        }
        
        setShowOtpInput(true);
        setCooldown(60);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // type: 'signup' is for new accounts (Confirm Signup template)
      // type: 'email' is for existing accounts (Magic Link template)
      const { error, data } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: isLogin ? 'email' : 'signup',
      });

      if (error) throw error;
      
      if (data.session) {
        onAuthSuccess();
      } else {
        setErrorMsg("Verification successful. Redirecting...");
        setTimeout(() => onAuthSuccess(), 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message === 'Token has expired' ? 'Code expired. Please resend.' : err.message);
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
          <span className="text-3xl font-bold tracking-tighter">ShuttleUp</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-6xl font-bebas leading-[0.9] tracking-wider uppercase">Your Game,<br/>Better Organized.</h1>
          <p className="text-blue-100 text-lg max-w-md">Professional tournament management, live scoring, and real-time standings for badminton enthusiasts.</p>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-xs font-bold uppercase tracking-widest">OTP Secure</div>
          <div className="px-4 py-2 bg-blue-500/30 rounded-full border border-blue-400/30 text-xs font-bold uppercase tracking-widest">Realtime Sync</div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white md:bg-slate-50">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl md:shadow-xl border border-slate-100 animate-in slide-in-from-bottom-12 duration-700">
          {!showOtpInput ? (
            <>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-slate-500 mb-8">{isLogin ? 'Enter your email to receive a login code.' : 'Join the elite community of badminton players.'}</p>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-in fade-in zoom-in duration-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
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

                {!isLogin && (
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
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending Code...' : 'Get Verification Code'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                <button 
                  onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); setShowOtpInput(false); }}
                  className="text-slate-600 font-bold hover:text-blue-600 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </>
          ) : (
            <div className="animate-in zoom-in duration-300">
              <button 
                onClick={() => setShowOtpInput(false)}
                className="mb-8 flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Change Email
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Verify Code</h2>
                <p className="text-slate-500">Sent to <span className="font-bold text-slate-900">{formData.email}</span></p>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-2 px-4 py-1 bg-blue-50 rounded-full inline-block">
                  {isLogin ? 'Login Template' : 'Signup Template'}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-4xl tracking-[0.5em] font-bebas py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-0 outline-none transition-all"
                    placeholder="000000"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || otp.length < 6}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Complete Verification'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button 
                  disabled={cooldown > 0}
                  onClick={() => handleSendOtp()}
                  className={`text-sm font-bold ${cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Didn\'t receive the code? Resend'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Setup Instruction Helper */}
        <div className="mt-8 w-full max-w-md bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
           <div className="flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex flex-shrink-0 items-center justify-center text-amber-600 font-bold text-xl">!</div>
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Critical Supabase Setting</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  To remove the <strong>"Follow this link"</strong> text, you must edit <strong>BOTH</strong> "Confirm Signup" and "Magic Link" templates in your Supabase dashboard. 
                  Make sure to clear the <strong>HTML version</strong> entirely and just put: <br/>
                  <code className="bg-white/50 px-1 rounded font-bold">Your code is &#123;&#123; .Token &#125;&#125;</code>
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
