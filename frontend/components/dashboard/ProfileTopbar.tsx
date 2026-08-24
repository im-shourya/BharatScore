'use client';

import React, { useEffect, useState } from 'react';
import { userService } from '@/services/api';
import { Copy, Check } from 'lucide-react';

export default function ProfileTopbar() {
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token') || 'mock-token';
        const data = await userService.getProfile(token);
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);

  const handleCopy = () => {
    if (profile?.bank_id) {
      navigator.clipboard.writeText(profile.bank_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {profile?.bank_id && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <span className="text-indigo-400">Bank ID:</span>
          <span className="font-mono tracking-tight">{profile.bank_id}</span>
          <button 
            onClick={handleCopy}
            className="ml-1 p-1 hover:bg-indigo-100 rounded-md transition text-indigo-500"
            title="Copy Bank ID"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
      <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center">
        <span className="text-xl">👩‍💻</span>
      </div>
    </div>
  );
}
