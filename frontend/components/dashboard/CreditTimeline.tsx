'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', score: 300 },
  { name: 'Feb', score: 380 },
  { name: 'Mar', score: 450 },
  { name: 'Apr', score: 600 }, // Simulated jump
  { name: 'May', score: 620 },
  { name: 'Jun', score: 650 },
  { name: 'Jul', score: 680 },
  { name: 'Aug', score: 700 },
  { name: 'Sep', score: 720 },
];

export default function CreditTimeline() {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg text-slate-900">Credit Timeline</h3>
        <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
          <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-md transition">1M</button>
          <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-md transition">3M</button>
          <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-md transition">6M</button>
          <button className="px-3 py-1 text-xs font-medium bg-white shadow-sm text-slate-900 rounded-md">All</button>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
               dataKey="name" 
               axisLine={false} 
               tickLine={false} 
               tick={{ fontSize: 12, fill: '#64748b' }} 
               dy={10}
            />
            <YAxis 
               axisLine={false} 
               tickLine={false} 
               tick={{ fontSize: 12, fill: '#64748b' }} 
               domain={[-100, 800]} 
               ticks={[-100, 200, 350, 400, 500, 750, 800]}
            />
            <Tooltip 
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
               type="monotone" 
               dataKey="score" 
               stroke="#3b82f6" 
               strokeWidth={3}
               fillOpacity={1} 
               fill="url(#colorScore)" 
               activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
