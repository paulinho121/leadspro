import React from 'react';
import { LayoutDashboard, Search, Database, TrendingUp, Menu } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setSidebarOpen } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-50 md:hidden pb-safe px-4">
      <MobileNavItem icon={<LayoutDashboard size={22} />} label="Home" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} />
      <MobileNavItem icon={<Search size={22} />} label="Busca" active={activeTab === 'discovery'} onClick={() => { setActiveTab('discovery'); setSidebarOpen(false); }} />
      <MobileNavItem icon={<Database size={22} />} label="Lab" active={activeTab === 'lab'} onClick={() => { setActiveTab('lab'); setSidebarOpen(false); }} />
      <MobileNavItem icon={<TrendingUp size={22} />} label="Vendas" active={activeTab === 'pipeline'} onClick={() => { setActiveTab('pipeline'); setSidebarOpen(false); }} />
      <MobileNavItem icon={<Menu size={22} />} label="Menu" active={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} />
    </nav>
  );
};

const MobileNavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active-scale ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}
  >
    <div className={`transition-all duration-300 ${active ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
    {active && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_4px_10px_var(--color-primary)] animate-in slide-in-from-top-1" />}
  </button>
);
