'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'mobile' | 'otp' | 'success'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    if (mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authService.sendOtp(mobile);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp() {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authService.verifyOtp(mobile, otpString);
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        setStep('success');
      } else {
        setError('Verification failed.');
      }
    } catch (err: any) {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-verify when OTP is full
  useEffect(() => {
    if (step === 'otp' && otp.join('').length === 6) {
      // Small delay for UX
      const timer = setTimeout(() => {
        handleVerifyOtp();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [otp, step]);

  const onExplore = () => {
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-gray-900">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-[400px] h-[800px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col border-[8px] border-gray-900">
        
        {/* iOS Status Bar Mock */}
        <div className="h-12 w-full flex justify-between items-center px-6 text-sm font-semibold pt-2">
          <span>9:41</span>
          <div className="flex gap-2 items-center">
            <div className="w-4 h-3 bg-black rounded-[2px]"></div>
            <div className="w-4 h-3 bg-black rounded-[2px] opacity-80"></div>
            <div className="w-6 h-3 border border-black rounded-[4px] relative">
               <div className="absolute top-[2px] bottom-[2px] left-[2px] right-[4px] bg-black rounded-[2px]"></div>
            </div>
          </div>
        </div>

        {/* Dynamic Island Mock */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-50"></div>

        <div className="px-6 pt-4 pb-6 flex-1 flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => step === 'otp' ? setStep('mobile') : null}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
              disabled={step === 'mobile' || step === 'success'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
               <span className="text-emerald-500">◆</span> BharatScore
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>

          {step === 'mobile' && (
            <div className="flex-1 flex flex-col">
              <h1 className="text-[32px] font-bold leading-tight mb-3">Welcome</h1>
              <p className="text-gray-500 mb-6">Enter your mobile number to get started.</p>
              
              <form onSubmit={handleSendOtp} className="flex-1 flex flex-col">
                <div className="mb-auto">
                  <div className="relative mb-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-500">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full h-14 pl-14 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-lg font-medium outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || mobile.length < 10}
                  className="w-full h-14 bg-black text-white rounded-full font-medium text-lg mt-8 disabled:opacity-50 hover:bg-gray-900 transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </form>
            </div>
          )}

          {step === 'otp' && (
            <div className="flex-1 flex flex-col relative">
              <h1 className="text-[32px] font-bold leading-tight mb-3">We just sent an SMS</h1>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-1">
                Enter the six digit security code we sent to +91 {mobile}
              </p>
              <button onClick={() => setStep('mobile')} className="text-orange-500 font-medium text-[15px] mb-8 text-left hover:underline">
                Edit Number
              </button>

              <div className="flex justify-between gap-2 mb-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={cn(
                      "w-[46px] h-[52px] rounded-xl border-2 text-center text-2xl font-semibold outline-none transition-all",
                      digit ? "border-emerald-500 text-black bg-white" : "border-gray-200 bg-gray-50 text-gray-900 focus:border-black"
                    )}
                  />
                ))}
              </div>
              
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              
              <p className="text-center text-gray-400 text-sm mt-6 mb-8">
                For dev testing, use <span className="font-bold text-gray-600">123456</span>
              </p>

              <div className="mt-auto flex flex-col gap-6">
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-14 bg-[#1A1A1A] text-white rounded-full font-semibold text-[17px] shadow-[0_8px_16px_-4px_rgba(0,0,0,0.3)] disabled:opacity-50 hover:bg-black transition flex items-center justify-center"
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>

                <p className="text-center text-gray-500 text-sm">
                  Didn't receive the code? <button className="font-semibold text-black hover:underline">Send Again</button>
                </p>
              </div>
            </div>
          )}

          {/* Success Modal Overlay */}
          {step === 'success' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-end justify-center rounded-[32px]">
              <div className="bg-white w-[90%] rounded-3xl p-8 flex flex-col items-center mb-10 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center absolute right-6 top-6 cursor-pointer hover:bg-gray-200 transition" onClick={onExplore}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L13 13M1 13L13 1" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                
                <h2 className="text-2xl font-bold mt-2 mb-2">Verified!</h2>
                <p className="text-gray-500 text-center mb-8">Your phone number verification has been complete</p>
                
                {/* Illustration Placeholder */}
                <div className="w-full aspect-video bg-blue-100 rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-blue-200/50"></div>
                   <div className="w-16 h-16 bg-white rounded-2xl shadow-lg z-10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                   </div>
                   {/* Decorative elements to look like the illustration */}
                   <div className="absolute -bottom-10 right-4 w-32 h-40 bg-orange-400 rounded-t-full rounded-bl-full"></div>
                </div>

                <button
                  onClick={onExplore}
                  className="w-full h-14 bg-[#1A1A1A] text-white rounded-full font-semibold text-[17px] shadow-lg hover:bg-black transition"
                >
                  Let's Explore
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Home Indicator */}
        <div className="h-8 w-full flex items-center justify-center pb-2">
          <div className="w-1/3 h-1 bg-black rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
