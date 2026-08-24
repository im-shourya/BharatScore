import React from 'react';

export default function ScoreGauge({ score = 720, change = 8 }) {
  // Simple SVG Gauge Math
  const minScore = 300;
  const maxScore = 850;
  const clampedScore = Math.min(Math.max(score, minScore), maxScore);
  const percentage = (clampedScore - minScore) / (maxScore - minScore);
  
  // 180 degrees arc
  const radius = 120;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="bg-[#121A2F] text-white rounded-[24px] p-6 relative overflow-hidden h-full flex flex-col justify-between shadow-xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/4"></div>
      
      <div className="relative z-10 flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg tracking-wide text-slate-100">Credit Score Overview</h3>
        <button className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-4">
        <div className="relative w-[280px] h-[160px] flex justify-center overflow-hidden">
          {/* Gauge SVG */}
          <svg width="280" height="160" viewBox="0 0 280 160" className="overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />   {/* Pink */}
                <stop offset="25%" stopColor="#f97316" />  {/* Orange */}
                <stop offset="50%" stopColor="#eab308" />  {/* Yellow */}
                <stop offset="75%" stopColor="#84cc16" />  {/* Light Green */}
                <stop offset="100%" stopColor="#22c55e" /> {/* Green */}
              </linearGradient>
            </defs>
            
            {/* Background Track */}
            <path
              d="M 20 140 A 120 120 0 0 1 260 140"
              fill="none"
              stroke="#1e293b"
              strokeWidth="24"
              strokeLinecap="round"
            />
            
            {/* Colored Arc */}
            <path
              d="M 20 140 A 120 120 0 0 1 260 140"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Indicator Dot */}
            <g style={{
               transform: `rotate(${percentage * 180}deg)`,
               transformOrigin: '140px 140px',
               transition: 'transform 1s ease-out'
            }}>
               <circle cx="40" cy="140" r="8" fill="white" className="drop-shadow-md" />
               <circle cx="40" cy="140" r="4" fill="#f97316" />
            </g>

            {/* Scale Markers */}
            <text x="20" y="160" fill="#64748b" fontSize="12" fontWeight="500" textAnchor="middle">200</text>
            <text x="55" y="70" fill="#64748b" fontSize="12" fontWeight="500" textAnchor="middle">350</text>
            <text x="140" y="30" fill="#64748b" fontSize="12" fontWeight="500" textAnchor="middle">500</text>
            <text x="225" y="70" fill="#64748b" fontSize="12" fontWeight="500" textAnchor="middle">650</text>
            <text x="260" y="160" fill="#64748b" fontSize="12" fontWeight="500" textAnchor="middle">800</text>
          </svg>

          {/* Inner Text */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center flex flex-col items-center">
             <div className="bg-slate-800/50 backdrop-blur border border-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full mb-1">
               +{change}
             </div>
             <div className="text-5xl font-bold text-white tracking-tight leading-none mb-1">{score}</div>
          </div>
        </div>
        
        <p className="text-slate-400 text-sm mt-4 text-center">
          Based on <span className="font-semibold text-slate-300">TransUnion</span> data
        </p>
        <div className="mt-2 text-sm text-slate-400">
           <span className="font-bold text-white">40</span> pts more to reach <span className="text-white">Very Good</span>
        </div>
        <div className="mt-4 bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border border-blue-500/30">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
          Good
        </div>
      </div>

      <div className="relative z-10 mt-6 pt-4 border-t border-slate-800 flex justify-between items-center w-full">
        <span className="text-sm font-medium text-slate-300 hover:text-white cursor-pointer transition">View Score Changes</span>
        <button className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
           </svg>
        </button>
      </div>
    </div>
  );
}
