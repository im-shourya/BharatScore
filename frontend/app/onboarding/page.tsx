'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '@/services/api';
import { User, Calendar } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically calculate age
  const age = useMemo(() => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return null;

    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      a--;
    }
    return a >= 0 ? a : null;
  }, [dob]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob || age === null || age < 18) {
      setError('Please provide a valid Name and Date of Birth (must be 18+).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token') || 'mock-token';
      await userService.updateProfile(token, { name, dob });
      // Redirect to Digilocker KYC after successfully saving profile
      router.push('/kyc/digilocker');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 pb-10 rounded-b-[40px] text-center shadow-md">
          <h1 className="text-2xl font-bold mb-2">Almost there!</h1>
          <p className="text-blue-100 text-sm">We need a few more details to generate your credit profile.</p>
        </div>

        {/* Form */}
        <div className="p-8 -mt-6 bg-white mx-4 rounded-3xl shadow-lg border border-slate-50 relative z-10 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">Full Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3.5 pl-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">Date of Birth</label>
              <div className="relative mb-2">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="date"
                  value={dob}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full p-3.5 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition appearance-none"
                  required
                />
              </div>
              
              {/* Reactive Age Display */}
              {age !== null && (
                <div className="flex items-center gap-2 mt-2 px-1 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-600">Calculated Age: <strong className="text-slate-900">{age} years</strong></span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name || !dob}
              className="w-full py-4 mt-4 bg-slate-900 text-white rounded-xl font-semibold text-[15px] shadow-lg disabled:opacity-50 hover:bg-black transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Continue'}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
