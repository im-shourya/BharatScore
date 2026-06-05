'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Step = 'mobile' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  // Step 1: Send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.startsWith('+91') ? mobile : `+91${mobile}` }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || data?.message || 'Failed to send OTP');
        return;
      }

      setExpiresIn(data?.data?.expires_in || data?.expires_in || 300);
      setStep('otp');
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedMobile = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
      const res = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formattedMobile,
          otp,
          device_fingerprint: 'web-browser',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || data?.message || 'Invalid OTP');
        return;
      }

      // Extract token from response (handles both wrapped and unwrapped responses)
      const token = data?.data?.access_token || data?.access_token;
      const refreshToken = data?.data?.refresh_token || data?.refresh_token;

      if (token) {
        localStorage.setItem('access_token', token);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        router.push('/kyc');
      } else {
        setError('No access token received');
      }
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4">
      {/* Glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">BharatScore</h1>
          <p className="text-slate-400 mt-2">AI-Powered Credit Scoring</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">
            {step === 'mobile' ? 'Sign in to your account' : 'Enter verification code'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {step === 'mobile'
              ? 'Enter your mobile number to receive an OTP'
              : `OTP sent to +91${mobile.replace(/^\+91/, '')}. Check your backend terminal for the [DEV OTP] log.`}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'mobile' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+91</span>
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    value={mobile.replace(/^\+91/, '')}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || mobile.replace(/^\+91/, '').length !== 10}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Sending OTP...
                  </span>
                ) : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-1.5">
                  OTP Code
                </label>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                />
                <p className="text-xs text-slate-500 mt-1.5">Expires in {expiresIn}s</p>
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying...
                  </span>
                ) : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('mobile'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                ← Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Secured with AES-256-GCM encryption · DPDP compliant
        </p>
      </div>
    </div>
  );
}
