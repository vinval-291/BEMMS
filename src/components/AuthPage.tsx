import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { INSTITUTION_NAME } from '../constants';
import { Shield, AlertCircle, MailCheck } from 'lucide-react';

export default function AuthPage() {
  const { loginWithGoogle, loginWithEmail, authError, setAuthError } = useApp();
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAuthError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(trimmedEmail, password);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sends a reset link. Completing a reset also marks the address verified,
   * which is what restores password sign-in for anyone whose password Firebase
   * removed when they first signed in with Google.
   */
  const handleForgotPassword = async () => {
    setFormError(null);
    setAuthError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Enter your hospital email address first, then choose "Forgot password".');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail.toLowerCase());
      setNotice(
        `If ${trimmedEmail.toLowerCase()} is registered, a password reset link is on its way. Opening it also confirms your address, so you can use both the password and Google sign-in afterwards.`
      );
    } catch (err: any) {
      console.error('Password reset request failed:', err);
      // Do not disclose whether the address exists.
      setNotice(
        `If ${trimmedEmail.toLowerCase()} is registered, a password reset link is on its way.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    setFormError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
      {/* Mesh and clinical backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-950/25 via-slate-900/50 to-slate-950 opacity-100 z-0"></div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-500"></div>

      {/* Main Container */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10 relative backdrop-blur-md">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-4 animate-pulse">
            <Shield className="w-8 h-8" id="auth-shield-icon" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">BEMMS</h1>
          <p className="text-teal-400 font-mono text-[10px] uppercase tracking-widest mb-2 font-semibold">{INSTITUTION_NAME}</p>
          <p className="text-slate-400 text-xs">
            Clinical Engineering Work Done Book &amp; Medical Device Maintenance Registry
          </p>
        </div>

        {/* Form and Global Auth Error Notification */}
        {(authError || formError) && (
          <div id="auth-error-notification" className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start space-x-2.5 animate-face-in">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-all">{formError || authError}</span>
          </div>
        )}

        {/* Reset-link confirmation */}
        {notice && (
          <div className="mb-5 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-100 flex items-start space-x-2.5">
            <MailCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{notice}</span>
          </div>
        )}

        {/* Credentials Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-5">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Hospital email address</label>
            <input
              type="email"
              disabled={loading}
              placeholder="e.g. engineer.name@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[10px] font-mono text-teal-400 hover:text-teal-300 hover:underline transition disabled:opacity-50 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              disabled={loading}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl transition duration-200 shadow-md shadow-teal-950/20 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Securing Session...' : 'Sign In with Email & Password'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <span className="relative px-3 bg-slate-900 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            OR AUTHORIZED OAUTH
          </span>
        </div>

        {/* Action Button: Google OAuth */}
        <div className="space-y-4 mb-4 shrink-0">
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800/45 text-slate-300 font-medium rounded-xl transition duration-200 text-xs flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 1.413 15.465 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.814 11.57-11.79 0-.79-.085-1.39-.188-1.925H12.24z"/>
            </svg>
            <span>{loading ? 'Verifying account...' : 'Log In with Google Workspace'}</span>
          </button>
          
          <p className="text-center text-[10px] text-slate-500 leading-relaxed font-mono">
            Staff access accounts are generated dynamically and securely by an Admin or HOD.
          </p>
        </div>

        {/* Footer info block */}
        <div className="text-center mt-6 pt-5 border-t border-slate-800/50 flex flex-col items-center justify-center space-y-2.5 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit-compliant. ISO 13485 &amp; HIPAA Shield Certified.</span>
          </div>
          <div className="pt-2 text-slate-400 border-t border-slate-800/40 w-full text-center text-[10px]">
            <span>Product of </span>
            <a 
              href="https://www.linkedin.com/in/kuteyi-oluwaloye-vincent/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-teal-400 hover:text-teal-300 font-bold hover:underline transition"
            >
              V-Tech
            </a>
            <span className="block text-[9px] text-slate-600 mt-0.5">App created and developed by V-Tech</span>
          </div>
        </div>

      </div>
    </div>
  );
}
