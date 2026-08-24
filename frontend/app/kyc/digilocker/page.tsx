'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '@/services/api';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export default function DigiLockerMockPage() {
  const router = useRouter();
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      // Call the backend endpoint to initiate/mock KYC
      await userService.initiateKyc(token, aadhaar);
      
      setSuccess(true);
      
      // Redirect to dashboard after a brief success message
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with DigiLocker');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header - DigiLocker Branding Mock */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 pb-10 text-center shadow-md relative">
          <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-1">DigiLocker Verification</h1>
          <p className="text-teal-50 text-sm">Official Govt. ID linking for BharatScore</p>
        </div>

        {/* Form */}
        <div className="p-8 -mt-6 bg-white mx-4 rounded-3xl shadow-lg border border-slate-50 relative z-10 mb-8">
          
          {success ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Verification Successful</h2>
              <p className="text-slate-500 mb-6">Your DigiLocker documents have been securely linked.</p>
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <form onSubmit={handleKyc} className="space-y-5">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm text-slate-600">
                Please enter your 12-digit Aadhaar number to fetch your verified documents from DigiLocker.
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Aadhaar Number</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition text-center tracking-widest font-mono text-lg"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || aadhaar.length !== 12}
                className="w-full py-4 mt-4 bg-teal-600 text-white rounded-xl font-semibold text-[15px] shadow-lg shadow-teal-200 disabled:opacity-50 hover:bg-teal-700 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Authenticate & Link <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
        
        <div className="text-center pb-6 text-xs text-slate-400 font-medium">
          Secured by DigiLocker API • Govt. of India
        </div>
      </div>
    </div>
  );
}
