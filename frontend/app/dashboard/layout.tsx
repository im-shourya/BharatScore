import Link from 'next/link';
import { 
  LayoutDashboard, 
  BarChart3, 
  History, 
  ThumbsUp, 
  Settings, 
  HelpCircle, 
  LogOut,
  Rocket
} from 'lucide-react';
import ProfileTopbar from '@/components/dashboard/ProfileTopbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#F3F6F8] font-sans text-slate-800 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
              C
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">BharatScore</span>
          </div>

          {/* Navigation */}
          <nav className="px-4 space-y-1 mt-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium transition shadow-md shadow-blue-500/20">
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition">
              <BarChart3 className="w-5 h-5" />
              Score Details
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition">
              <History className="w-5 h-5" />
              Activity History
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition">
              <ThumbsUp className="w-5 h-5" />
              Recommendations
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition mt-4 border-t border-slate-100 pt-5">
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>
        </div>

        <div className="px-4 pb-6 mt-10">
          <nav className="space-y-1 mb-6">
            <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-slate-900 rounded-xl font-medium transition text-sm">
              <HelpCircle className="w-5 h-5" />
              Help Center
            </Link>
            <Link href="/login" className="flex items-center gap-3 px-4 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-medium transition text-sm">
              <LogOut className="w-5 h-5" />
              Sign Out
            </Link>
          </nav>

          {/* Go Pro Card */}
          <div className="bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-2xl p-5 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 transform -translate-y-10 border-4 border-white">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div className="-mt-8">
              <h4 className="font-bold text-slate-900 mb-1">Go Pro!</h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Get advanced analytics and smarter tips to improve your credit faster.
              </p>
              <button className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-600/20">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-20 bg-white/50 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Topbar Search and Profile (mock) */}
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <div className="relative">
               <input type="text" placeholder="Search (⌘K)" className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm outline-none w-64 focus:bg-white focus:ring-2 focus:ring-blue-100 transition" />
               <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
            <ProfileTopbar />
          </div>
        </div>
        <div className="p-8">
          {children}
        </div>
      </main>
      
    </div>
  );
}
