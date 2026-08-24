import React from 'react';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function RecommendationsList() {
  const recommendations = [
    {
      title: 'Reduce Credit Usage',
      impact: 'Medium Impact',
      description: 'Pay down one credit card to reduce usage below 30%',
      actionText: 'View Cards to Target',
      icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
      bgIcon: 'bg-orange-50',
      badgeColor: 'bg-orange-100 text-orange-700',
    },
    {
      title: 'Keep Oldest Account Open',
      impact: 'High Impact',
      description: 'Closing your oldest account will reduce your credit age significantly.',
      actionText: 'View Account Details',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      bgIcon: 'bg-emerald-50',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    }
  ];

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg text-slate-900">Recommendations</h3>
        <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
           </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition bg-slate-50/50">
            <div className="flex items-start gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rec.bgIcon}`}>
                {rec.icon}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm mb-1">{rec.title}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${rec.badgeColor}`}>
                  {rec.impact}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3 mb-4 leading-relaxed">
              {rec.description}
            </p>
            <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 bg-white border border-slate-200 py-2.5 px-4 rounded-xl hover:bg-slate-50 transition">
              {rec.actionText}
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
