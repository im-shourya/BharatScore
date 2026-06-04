'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type KycState = 'loading' | 'ready' | 'initiating' | 'already_verified' | 'error';

interface KycStatus {
  status: string;
  verified_at: string | null;
  fields_verified: string[];
}

export default function KycPage() {
  const router = useRouter();
  const [state, setState] = useState<KycState>('loading');
  const [error, setError] = useState('');
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);

  // Check auth and KYC status on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Check current KYC status
    fetch(`${API_URL}/api/v1/kyc/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const status = data?.data || data;
        setKycStatus(status);

        if (status?.status === 'fully_verified') {
          setState('already_verified');
        } else {
          setState('ready');
        }
      })
      .catch(() => {
        setState('ready'); // Proceed even if status check fails
      });
  }, [router]);

  // Initiate KYC
  async function handleInitiateKyc() {
    setState('initiating');
    setError('');

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/kyc/initiate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || data?.message || 'Failed to initiate KYC';
        setError(errMsg);
        setState('error');
        return;
      }

      // Extract auth_url (handles both wrapped and unwrapped response)
      const authUrl = data?.data?.auth_url || data?.auth_url;

      if (authUrl) {
        // Redirect user to DigiLocker login page
        window.location.href = authUrl;
      } else {
        setError('No auth URL received from server');
        setState('error');
      }
    } catch {
      setError('Network error. Is the backend running?');
      setState('error');
    }
  }

  function getStatusBadge(status: string) {
    const map: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending' },
      aadhaar_verified: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Aadhaar Verified' },
      pan_verified: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'PAN Verified' },
      fully_verified: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Fully Verified' },
      failed: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Failed' },
    };
    const badge = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Identity Verification</h1>
          <p className="text-slate-400 mt-2">Complete your KYC using DigiLocker</p>
        </div>

        {/* Status card */}
        {kycStatus && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Current Status</h3>
              {getStatusBadge(kycStatus.status)}
            </div>
            {kycStatus.fields_verified.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {kycStatus.fields_verified.map((field) => (
                  <span key={field} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-slate-300">
                    <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {field}
                  </span>
                ))}
              </div>
            )}
            {kycStatus.verified_at && (
              <p className="text-xs text-slate-500 mt-3">
                Verified at: {new Date(kycStatus.verified_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Main action card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {state === 'already_verified' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">KYC Complete</h2>
              <p className="text-slate-400 text-sm mb-6">Your identity has been fully verified.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
              >
                Go to Dashboard →
              </button>
            </div>
          ) : (
            <>
              {/* DigiLocker info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Connect with DigiLocker</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Securely verify your Aadhaar through the Government of India&apos;s DigiLocker platform. Your data is encrypted end-to-end.
                  </p>
                </div>
              </div>

              {/* What happens */}
              <div className="space-y-3 mb-6">
                {[
                  'You will be redirected to DigiLocker (meripehchaan.gov.in)',
                  'Login with your Aadhaar number and OTP',
                  'Select documents to share and click Allow',
                  'Your data is fetched, encrypted, and stored securely',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-300">{text}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleInitiateKyc}
                disabled={state === 'initiating'}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                {state === 'initiating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Connecting to DigiLocker...
                  </span>
                ) : (
                  '🔐 Verify with DigiLocker'
                )}
              </button>

              {state === 'error' && (
                <button
                  onClick={() => setState('ready')}
                  className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Try again
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              router.push('/login');
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
