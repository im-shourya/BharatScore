'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function FailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get('reason') || 'UNKNOWN';

  const reasonMap: Record<string, { title: string; description: string }> = {
    SESSION_EXPIRED: {
      title: 'Session Expired',
      description: 'Your KYC session has expired. Please try again.',
    },
    CONSENT_FAILED: {
      title: 'Consent Denied',
      description: 'You declined to share documents on DigiLocker. KYC requires Aadhaar access.',
    },
    UNKNOWN: {
      title: 'Verification Failed',
      description: 'Something went wrong during the verification process.',
    },
  };

  const info = reasonMap[reason] || { title: reason, description: 'Please try the verification again.' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{info.title}</h2>
        <p className="text-slate-400 mb-8">{info.description}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/kyc')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KycFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}
