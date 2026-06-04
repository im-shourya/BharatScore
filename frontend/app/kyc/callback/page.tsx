'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function KycCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');

  useEffect(() => {
    const success = searchParams.get('success');
    const id = searchParams.get('id'); // Setu session ID
    const scope = searchParams.get('scope'); // ADHAR+PANCR
    const kycSessionId = searchParams.get('kycSessionId'); // our session ID
    const errCode = searchParams.get('errCode');

    if (!kycSessionId) {
      setStatus('failed');
      return;
    }

    // Forward to NestJS backend callback handler
    const backendCallback =
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/kyc/callback` +
      `?success=${success}&id=${id}&scope=${scope ?? ''}&kycSessionId=${kycSessionId}` +
      (errCode ? `&errCode=${errCode}` : '');

    fetch(backendCallback)
      .then((res) => {
        if (res.ok || res.redirected) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [searchParams, router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      {status === 'processing' && (
        <>
          <div style={{ fontSize: 48 }}>⏳</div>
          <h2>Verifying your Aadhaar...</h2>
          <p style={{ color: '#666' }}>Please wait while we complete your KYC</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2>KYC Verified Successfully!</h2>
          <p style={{ color: '#666' }}>Redirecting to dashboard...</p>
        </>
      )}
      {status === 'failed' && (
        <>
          <div style={{ fontSize: 48 }}>❌</div>
          <h2>KYC Verification Failed</h2>
          <p style={{ color: '#666' }}>Please try again</p>
          <button
            onClick={() => router.push('/kyc')}
            style={{
              marginTop: 16,
              padding: '10px 24px',
              background: '#4F46E5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}

export default function KycCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
          }}
        >
          Loading...
        </div>
      }
    >
      <KycCallbackContent />
    </Suspense>
  );
}
