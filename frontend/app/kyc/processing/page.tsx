'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function ProcessingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'verified' | 'failed'>('processing');
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Poll KYC status every 3 seconds
    const interval = setInterval(async () => {
      setPollCount((c) => c + 1);

      try {
        const res = await fetch(`${API_URL}/api/v1/kyc/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearInterval(interval);
          router.push('/login');
          return;
        }

        const data = await res.json();
        const kycStatus = data?.data?.status || data?.status;

        if (kycStatus === 'aadhaar_verified' || kycStatus === 'fully_verified') {
          clearInterval(interval);
          setStatus('verified');
          setTimeout(() => router.push('/kyc'), 2500);
        }
      } catch {
        // Keep polling
      }
    }, 3000);

    // Stop after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStatus('failed');
    }, 120000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative text-center max-w-md">
        {status === 'processing' && (
          <>
            {/* Animated rings */}
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-indigo-400/30 animate-pulse" />
              <svg className="relative w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifying your Aadhaar</h2>
            <p className="text-slate-400 mb-4">
              Fetching and encrypting your KYC data from DigiLocker...
            </p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-4">
              Checking status... ({pollCount})
            </p>
          </>
        )}

        {status === 'verified' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">KYC Verified!</h2>
            <p className="text-slate-400">Your Aadhaar has been verified successfully. Redirecting...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Timed Out</h2>
            <p className="text-slate-400 mb-6">
              It&apos;s taking longer than expected. Your KYC may still complete in the background.
            </p>
            <button
              onClick={() => router.push('/kyc')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
            >
              Check Status
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function KycProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
