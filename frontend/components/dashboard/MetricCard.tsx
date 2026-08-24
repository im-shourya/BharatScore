import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

export default function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
           </svg>
        </button>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-500 mb-1">{title}</h4>
        <div className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{value}</div>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
