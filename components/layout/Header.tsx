import React from 'react';
import { Menu, DollarSign as MoneyIcon, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { I18nService } from '../../services/i18nService';

interface HeaderProps {
  userName: string;
  unreadCount: number;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  userName, 
  unreadCount, 
  showNotifications, 
  setShowNotifications 
}) => {
  const { activeTab, setActiveTab, setSidebarOpen, creditBalance } = useStore();

  const getPageTitle = (tab: string) => {
    switch(tab) {
      case 'dashboard': return I18nService.t('Dashboard');
      case 'discovery': return I18nService.t('Extração');
      case 'lab': return I18nService.t('Laboratório');
      case 'enriched': return I18nService.t('Leads Qualificados');
      case 'leadAdmin': return I18nService.t('Adm. Leads');
      case 'partner': return I18nService.t('Branding');
      case 'master': return I18nService.t('Master');
      case 'history': return I18nService.t('Histórico');
      case 'agent': return I18nService.t('Agente Matrix');
      default: return I18nService.t('Dashboard');
    }
  };

  return (
    <header className="h-16 md:h-24 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 md:px-10 relative z-40 backdrop-blur-xl shrink-0 bg-background/50">
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-3 bg-surface/50 rounded-2xl md:hidden text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-base md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          {getPageTitle(activeTab)}
        </h2>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <div
          onClick={() => setActiveTab('billing')}
          className="flex items-center gap-4 px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20 transition-all group/wallet cursor-pointer hover:bg-primary/20 shadow-lg shadow-primary/5 active:scale-95"
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Saldo Matrix</span>
            <span className="text-[7px] text-primary/60 font-bold uppercase tracking-widest leading-none">Créditos Ativos</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 transition-colors">
            <MoneyIcon size={14} className="text-primary animate-pulse" />
            <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">$ {creditBalance.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-2xl">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{userName.split(' ')[0].toUpperCase()}</span>
            <span className="text-[7px] text-emerald-500/60 font-bold uppercase tracking-[0.2em]">Conectado</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('billing')}
          className="flex md:hidden items-center gap-1.5 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 active:scale-95 transition-all"
        >
          <MoneyIcon size={14} className="text-primary" />
          <span className="text-xs font-black text-white">{creditBalance.toLocaleString()}</span>
        </button>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative group p-2.5 rounded-xl transition-all border ${showNotifications ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
        >
          <Bell size={18} className={showNotifications ? 'text-primary' : 'text-slate-400'} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-slate-950 animate-pulse shadow-lg" />
          )}
        </button>
      </div>
    </header>
  );
};
