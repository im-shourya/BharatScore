'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * This page is NOT used in the normal flow.
 * 
 * The DigiLocker redirect goes to: DIGILOCKER_REDIRECT_URI (which is the BACKEND callback)
 * e.g., https://your-ngrok.ngrok.io/api/v1/kyc/callback?success=True&id=xxx&kycSessionId=xxx
 * 
 * The BACKEND then processes the callback and does res.redirect() to:
 * - /kyc/processing?userId=xxx (on success)
 * - /kyc/failed?reason=xxx (on failure)
 * 
 * This frontend callback page is a fallback in case DIGILOCKER_REDIRECT_URI
 * is set to point at the frontend instead of the backend.
 */
function KycCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const kycSessionId = searchParams.get('kycSessionId');
    const errCode = searchParams.get('errCode');
    const reason = searchParams.get('reason');

    // If we got redirected here from the backend with a reason, handle it
    if (reason) {
      router.replace(`/kyc/failed?reason=${reason}`);
      return;
    }

    // If DigiLocker redirected here directly (frontend-as-redirect mode),
    // forward to backend
    if (kycSessionId) {
      const id = searchParams.get('id');
      const scope = searchParams.get('scope');
      const backendUrl =
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/kyc/callback` +
        `?success=${success}&id=${id}&scope=${scope ?? ''}&kycSessionId=${kycSessionId}` +
        (errCode ? `&errCode=${errCode}` : '');

      // Navigate the browser to backend — which will then redirect back to frontend
      window.location.href = backendUrl;
      return;
    }

    // No valid params — redirect to KYC page
    router.replace('/kyc');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <svg className="animate-spin h-8 w-8 text-indigo-400 mb-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-slate-400">Processing DigiLocker response...</p>
    </div>
  );
}

export default function KycCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <KycCallbackContent />
    </Suspense>
  );
}
