'use client';

import React, { useEffect, useState } from 'react';
import { scoringService } from '@/services/api';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import MetricCard from '@/components/dashboard/MetricCard';
import CreditTimeline from '@/components/dashboard/CreditTimeline';
import RecommendationsList from '@/components/dashboard/RecommendationsList';
import { CreditCard, PieChart, Activity, Clock, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const fetchScore = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const data = await scoringService.getScore(token);
      setScoreData(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch score data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const handleCalculateScore = async () => {
    setCalculating(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      await scoringService.calculateScore(token);
      // Wait a bit for backend to process, then refetch
      setTimeout(fetchScore, 1000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to calculate score.');
    } finally {
      setCalculating(false);
    }
  };

  const currentScore = scoreData?.latest_score || 300;
  const scoreChange = scoreData?.score_change || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Area with Calculate Button */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your BharatScore Overview</h1>
          <p className="text-sm text-slate-500">Track and manage your AI-driven credit profile</p>
        </div>
        <button
          onClick={handleCalculateScore}
          disabled={calculating || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-200"
        >
          <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculating AI Score...' : 'Calculate Score'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gauge Section (Takes up 4 cols on large screens) */}
        <div className="lg:col-span-4 h-[420px]">
          {loading ? (
             <div className="bg-[#121A2F] text-white rounded-[24px] p-6 h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
             </div>
          ) : (
            <ScoreGauge score={currentScore} change={scoreChange} />
          )}
        </div>

        {/* Metrics Grid (Takes up 8 cols on large screens) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 h-[420px]">
          <MetricCard
            title="Payment History"
            value="98% Ontime"
            subtitle="Late payments hurt credit score"
            icon={<CreditCard className="w-6 h-6" />}
          />
          <MetricCard
            title="Credit Usage"
            value="50% Usage"
            subtitle="How much credit you use vs. limit"
            icon={<PieChart className="w-6 h-6" />}
          />
          <MetricCard
            title="Credit Inquires"
            value="2"
            subtitle="Credit checks may cause a dip."
            icon={<Activity className="w-6 h-6" />}
          />
          <MetricCard
            title="Account Age"
            value="5.2 Yrs"
            subtitle="Older accounts show stability."
            icon={<Clock className="w-6 h-6" />}
          />
        </div>

      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recommendations */}
        <div className="lg:col-span-4 h-[400px]">
          <RecommendationsList />
        </div>

        {/* Timeline */}
        <div className="lg:col-span-8 h-[400px]">
          <CreditTimeline />
        </div>

      </div>

    </div>
  );
}
