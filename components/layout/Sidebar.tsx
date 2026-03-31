import React, { useState } from 'react';
import {
  BrainCircuit, LayoutDashboard, Search, Database, Archive, Rocket,
  TrendingUp, Megaphone, BarChart3, ShieldCheck, Activity, LifeBuoy,
  X, Menu, LogOut, ChevronRight, Globe, DollarSign as MoneyIcon, ArrowUpRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useBranding } from '../BrandingProvider';
import { I18nService } from '../../services/i18nService';

interface SidebarProps {
  isMaster: boolean;
  userName: string;
  unreadCount: number;
  showSupport: boolean;
  setShowSupport: (show: boolean) => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMaster,
  userName,
  unreadCount,
  showSupport,
  setShowSupport,
  onSignOut
}) => {
  const { config } = useBranding();
  const { 
    activeTab, setActiveTab, 
    isSidebarOpen, setSidebarOpen, 
    userTenantId, tenantPlan, creditBalance 
  } = useStore();
  
  const [showAccountCard, setShowAccountCard] = useState(false);

  return (
    <aside className={`glass border-r border-slate-200 dark:border-white/10 transition-all duration-500 ease-in-out z-[100] flex flex-col 
      fixed md:relative inset-y-0 left-0 
      ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-72 md:w-20'}`}>

      <div className="p-6 flex items-center gap-4 group cursor-pointer overflow-hidden" onClick={() => setActiveTab('dashboard')}>
        <div className="bg-primary/10 p-2 rounded-2xl group-hover:scale-110 group-hover:bg-primary/20 border border-primary/20 transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] flex items-center justify-center shrink-0">
          <BrainCircuit className="text-primary" size={30} />
        </div>
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 md:hidden invisible w-0'}`}>
          <h1 className="text-[22px] font-black tracking-wider leading-none uppercase italic text-slate-900 dark:text-white drop-shadow-lg">
            LeadMatrix
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        <NavItem icon={<BrainCircuit size={20} className="text-primary" />} label={I18nService.t('Agente Matrix')} active={activeTab === 'agent'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('agent'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        <NavItem icon={<LayoutDashboard size={20} />} label={I18nService.t('Dashboard')} active={activeTab === 'dashboard'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        
        {config.enabledFeatures?.discovery !== false && (
          <NavItem icon={<Search size={20} />} label={I18nService.t('Extração')} active={activeTab === 'discovery'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('discovery'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}
        
        {config.enabledFeatures?.lab !== false && (
          <NavItem icon={<Database size={20} />} label={I18nService.t('Laboratório')} active={activeTab === 'lab'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('lab'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.leadAdmin !== false && (
          <NavItem icon={<Archive size={20} />} label={I18nService.t('Adm. Leads')} active={activeTab === 'leadAdmin'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('leadAdmin'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.enriched !== false && (
          <NavItem icon={<Rocket size={20} />} label={I18nService.t('Qualificados')} active={activeTab === 'enriched'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('enriched'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.pipeline !== false && (
          <NavItem icon={<TrendingUp size={20} />} label={I18nService.t('Pipeline')} active={activeTab === 'pipeline'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('pipeline'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.automation !== false && (
          <NavItem icon={<Megaphone size={20} />} label={I18nService.t('Automação')} active={activeTab === 'automation'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('automation'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.monitor !== false && (
          <NavItem icon={<BarChart3 size={20} />} label={I18nService.t('Monitor')} active={activeTab === 'monitor'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('monitor'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}

        {config.enabledFeatures?.billing !== false && (
          <NavItem icon={<MoneyIcon size={20} />} label={I18nService.t('Faturamento')} active={activeTab === 'billing'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('billing'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        )}


        <div className="pt-8 pb-4">
          {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">Sistemas</p>}
          <div className="h-px bg-slate-200 dark:bg-white/10 mx-4 mb-4"></div>
        </div>

        <NavItem icon={<Globe size={20} className="text-secondary" />} label="Landing Page" active={activeTab === 'landing'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('landing'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
        <NavItem icon={<ShieldCheck size={20} />} label={I18nService.t('Branding')} active={activeTab === 'partner'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('partner'); if (window.innerWidth < 768) setSidebarOpen(false); }} />

        {isMaster && (
          <>
            <NavItem icon={<Activity size={20} />} label="Histórico" active={activeTab === 'history'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('history'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
            <NavItem icon={<ShieldCheck className="text-primary" size={20} />} label="Master" active={activeTab === 'master'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('master'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          </>
        )}

        <div className="pt-2">
          <NavItem icon={<LifeBuoy size={20} className="text-primary" />} label="Suporte" active={showSupport} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => setShowSupport(true)} />
        </div>
      </nav>

      <div className="p-4 mt-auto">
        {showAccountCard && (
          <div
            className={`fixed z-[100] animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4 duration-300`}
            style={{
              bottom: '88px',
              left: window.innerWidth < 768 ? '8px' : (isSidebarOpen ? '296px' : '88px'),
              right: window.innerWidth < 768 ? '8px' : 'auto',
              width: window.innerWidth < 768 ? 'auto' : '320px'
            }}
          >
            <div className="glass-strong border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group backdrop-blur-3xl">
              {/* Background Decor */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-all duration-500"></div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Sessão do Operador</h3>
                <button onClick={() => setShowAccountCard(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="text-xl font-black text-primary uppercase">{userName.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Identidade</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{userName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ID Neural</p>
                    <p className="text-[10px] font-mono text-primary font-bold">
                      #{userTenantId ? userTenantId.split('-')[0].toUpperCase() : 'DE-ROOT'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onSignOut}
                  className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-red-500/20 flex items-center justify-center gap-2"
                >
                  <LogOut size={14} /> Encerrar Conexão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Widget - Monetização */}
        {isSidebarOpen && (
          <div className="mx-4 mb-4 p-5 glass-strong border border-primary/20 rounded-[2rem] bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden group/plan">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover/plan:bg-primary/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Assinatura Atual</p>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${tenantPlan === 'free' ? 'bg-slate-800 text-slate-400' : 'bg-primary text-slate-900 animate-pulse'}`}>
                  {tenantPlan.toUpperCase()}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-white italic leading-none mb-1">LeadMatrix {tenantPlan === 'enterprise' ? 'Infinity' : tenantPlan === 'pro' ? 'Expert' : 'Starter'}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{creditBalance.toLocaleString()} créditos</p>
                </div>
                {tenantPlan === 'free' && (
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="p-2 bg-primary text-slate-900 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    <ArrowUpRight size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          onClick={() => setShowAccountCard(!showAccountCard)}
          className={`glass-strong border border-white/5 rounded-[2rem] p-4 premium-card group cursor-pointer relative overflow-hidden transition-all duration-300 hover:border-primary/30 ${showAccountCard ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
        >
          <div className={`flex items-center gap-4 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'justify-center'}`}>
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-2xl bg-primary p-[2px]"
                style={{ boxShadow: `0 0 15px ${config.colors.primary}4d` }}
              >
                <div className="w-full h-full rounded-[14px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tighter transition-colors">
                  {userName.slice(0, 2)}
                </div>
              </div>
              {!isSidebarOpen && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
              )}
            </div>

            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{userName.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">Sessão Ativa</p>
              </div>
            )}

            {isSidebarOpen && (
              <div className="p-2 text-slate-500 group-hover:text-primary transition-colors">
                <ChevronRight size={14} className={`transition-transform duration-300 ${showAccountCard ? 'rotate-90' : ''}`} />
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="absolute -right-3 top-24 bg-primary text-slate-900 p-2 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 z-[110] flex"
      >
        {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
      </button>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded: boolean;
  primaryColor: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, expanded, primaryColor, onClick }) => (
  <button
    onClick={onClick}
    title={!expanded ? label : undefined}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 relative group ${active
      ? 'bg-primary/10 text-primary'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5'
      }`}
  >
    <div
      className="transition-all duration-500 group-hover:scale-110 relative"
      style={{ filter: active ? `drop-shadow(0 0 8px ${primaryColor}80)` : 'none' }}
    >
      {icon}
      {active && !expanded && (
        <span
          className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: primaryColor, boxShadow: `0 0 6px ${primaryColor}` }}
        />
      )}
    </div>
    {expanded && (
      <span className={`text-sm font-bold tracking-tight transition-all duration-500 ${active ? 'text-slate-900 dark:text-white' : ''}`}>
        {label}
      </span>
    )}
    {active && expanded && (
      <div
        className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
        style={{ boxShadow: `0 0 15px ${primaryColor}` }}
      ></div>
    )}
  </button>
);
